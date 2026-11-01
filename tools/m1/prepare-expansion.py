"""Three fixed RGB experiments, sharing the original 24-photo holdout.

Adds every eligible same-class well-2 photograph outside frozen test groups.
No test score selects a setting. Exposure augmentation is fixed at .8 / 1.2.
"""
import base64
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import subprocess
import numpy as np
from PIL import Image, ImageEnhance
import requests
import torch
from torchvision.models import resnet18, ResNet18_Weights
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import confusion_matrix, f1_score

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'tools/m1/expansion'
(OUT/'images').mkdir(parents=True,exist_ok=True)
js="const fs=require('fs'),vm=require('vm'),c={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),c);process.stdout.write(JSON.stringify(c.window.M1_DATA));"
data=json.loads(subprocess.check_output(['node','-e',js,str(ROOT/'tools/m1/runtime/data.js')],encoding='utf-8'))
old=json.loads((ROOT/'tools/m1/runtime/resnet-results.json').read_text(encoding='utf-8'))
pin=data['source']['commit'];classes=[c['id'] for c in data['classes']]
tree_cache=ROOT/'.artifacts/v2-research/M1-tree.json'
if tree_cache.exists():tree=json.loads(tree_cache.read_text(encoding='utf-8'))['tree']
else:
    response=requests.get(f'https://api.github.com/repos/nature9420/-ResNet-HMM-Lithology/git/trees/{pin}?recursive=1',timeout=60);response.raise_for_status();tree=response.json()['tree']
labelled=[x for x in tree if '/labeled_dataset/' in x['path'] and x['type']=='blob']
lookup={('/'.join(x['path'].split('/')[:2]),x['path'].split('/')[-1]):x for x in labelled}
mapping={}
for s in data['samples']:
    parts=s['sourcePath'].split('/');code=lookup[('/'.join(parts[:2]),parts[-1])]['path'].split('/')[3]
    if code in mapping:assert mapping[code]==s['classId']
    mapping[code]=s['classId']
test_groups={s['group'] for s in data['samples'] if s['split']=='test'}
existing={s['sourcePath'] for s in data['samples']};extra=[]
for x in labelled:
    parts=x['path'].split('/');code=parts[3]
    if code not in mapping:continue
    depth=int(parts[-1].split('.')[0]);well=parts[1].split('-')[-1];p='/'.join(parts[:2]+[parts[-1]]);group=f'well{well}-depth20-{depth//20*20}'
    if well=='2' and group not in test_groups and p not in existing:
        extra.append(dict(id='w2-'+str(depth),sourcePath=p,classId=mapping[code],group=group,depth=depth,well=well,blob=x['sha'],labelFolderPath=x['path']))
assert len(extra)==32


def fetch(s):
    url=f'https://raw.githubusercontent.com/nature9420/-ResNet-HMM-Lithology/{pin}/'+s['sourcePath'];dest=OUT/'images'/(s['id']+'.jpg')
    if not dest.exists():
        response=requests.get(url,timeout=60);response.raise_for_status();dest.write_bytes(response.content)
    raw=dest.read_bytes();assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==s['blob']
    s.update(source_url=url,sha256=hashlib.sha256(raw).hexdigest(),file='images/'+dest.name)
    return Image.open(io.BytesIO(raw)).convert('RGB')


extra_images=list(concurrent.futures.ThreadPoolExecutor(6).map(fetch,extra))
original_images=[Image.open(io.BytesIO(base64.b64decode(s['image'].split(',')[1]))).convert('RGB') for s in data['samples']]
train=[i for i,s in enumerate(data['samples']) if s['split']=='reference'];test=[i for i,s in enumerate(data['samples']) if s['split']=='test']
images=original_images+extra_images;samples=data['samples']+extra;train_expanded=train+list(range(len(data['samples']),len(samples)))
assert not {samples[i]['group'] for i in train_expanded}&test_groups
augmented=[ImageEnhance.Brightness(images[i]).enhance(factor) for factor in [.8,1.2] for i in train_expanded]
all_images=images+augmented
torch.set_num_threads(4);torch.manual_seed(42);np.random.seed(42)
net=resnet18(weights=ResNet18_Weights.IMAGENET1K_V1).eval();encoder=torch.nn.Sequential(*list(net.children())[:-2]);mean=np.array([.485,.456,.406],dtype='float32')[:,None,None];std=np.array([.229,.224,.225],dtype='float32')[:,None,None]


def tensor(im):
    w,h=im.size;im=im.crop((round(.14*w),round(.14*h),round(.86*w),round(.86*h))).resize((224,224),Image.Resampling.BILINEAR)
    return (np.asarray(im,dtype='float32').transpose(2,0,1)/255-mean)/std


features=[]
with torch.no_grad():
    for start in range(0,len(all_images),8):
        x=torch.from_numpy(np.stack([tensor(im) for im in all_images[start:start+8]]));features.extend(encoder(x).mean((2,3)).numpy())
x=np.asarray(features,dtype='float64');y=np.array([classes.index(s['classId']) for s in samples]+[classes.index(samples[i]['classId']) for _ in [.8,1.2] for i in train_expanded])
experiments={};heads={}
for name,fit in [('expanded',train_expanded),('expanded-exposure',train_expanded+list(range(len(images),len(all_images))))]:
    scaler=StandardScaler().fit(x[fit]);head=LogisticRegression(C=1,class_weight='balanced',max_iter=2000,tol=1e-7,solver='lbfgs',random_state=42).fit(scaler.transform(x[fit]),y[fit]);scores=head.predict_proba(scaler.transform(x[test]));pred=scores.argmax(1);matrix=confusion_matrix(y[test],pred,labels=[0,1,2]);experiments[name]=dict(trainOriginalCount=len(train_expanded),fitViews=len(fit),accuracy=float((pred==y[test]).mean()),macroF1=float(f1_score(y[test],pred,average='macro',labels=[0,1,2],zero_division=0)),matrix=matrix.tolist(),samples={data['samples'][i]['id']:dict(prediction=classes[int(p.argmax())],scores=p.tolist()) for i,p in zip(test,scores)});heads[name+'_weight']=head.coef_/scaler.scale_[None,:];heads[name+'_bias']=head.intercept_-(head.coef_*scaler.mean_[None,:]/scaler.scale_[None,:]).sum(1)
np.savez_compressed(OUT/'heads.npz',**heads)
result=dict(version='2.0.0',kind='real-rgb-supplement',sourceCommit=pin,source_url=data['source']['repository'],license=data['source']['usage'],method='Frozen identical ResNet18 IMAGENET1K_V1, center72%→224; same StandardScaler+balanced multinomial logistic head C=1, seed42, max_iter2000,tol1e-7. Added all eligible same-class well2 photos outside original holdout groups. Fixed brightness .8 and1.2 only on fit originals.',label_origin='Inherit the exact labelled-folder code already verified for original66; original bytes match Git blob IDs. Source CSV contains damaged text, so labels are matched by original folder and filename, not guessed from corrupted CSV.',testIsBlind=False,scope='Historical fixed teaching holdout, not a new blind benchmark or independent-well performance.',originalTrainIds=[data['samples'][i]['id'] for i in train],testIds=[data['samples'][i]['id'] for i in test],testGroups=sorted(test_groups),additional=extra,experiments=experiments,original=old['metrics']['test'],encoderSha256=old['method']['weightsSha256'],headsSha256=hashlib.sha256((OUT/'heads.npz').read_bytes()).hexdigest())
(OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Original42',old['metrics']['test'],'Added32',[(k,{a:v[a] for a in ['fitViews','accuracy','macroF1','matrix']}) for k,v in experiments.items()],flush=True)
