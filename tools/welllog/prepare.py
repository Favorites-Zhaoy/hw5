"""Deterministic synthetic well-log teaching experiments; no field performance claims."""
from pathlib import Path
import json, hashlib, warnings
import numpy as np
from PIL import Image
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, accuracy_score
warnings.filterwarnings('ignore')
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/welllog';OUT.mkdir(parents=True,exist_ok=True)
(OUT/'images').mkdir(exist_ok=True)
SEED=20261102
rng=np.random.default_rng(SEED)

def well(seed):
 r=np.random.default_rng(seed);n=180;depth=np.arange(n)*.5+2400;cuts=[0,31,65,94,128,151,n];classes=[0,1,2,0,1,2];fac=np.zeros(n,dtype=int)
 for j in range(6):fac[cuts[j]:cuts[j+1]]=classes[(j+seed)%6]
 x=np.arange(n);phi=np.clip(.16+.065*np.sin(x/11+seed*.13)+r.normal(0,.008,n),.045,.29)
 clay=np.array([.12,.78,.25])[fac]+.05*np.sin(x/17)
 gr=np.array([40,115,62])[fac]+6*np.sin(x/8)+r.normal(0,5,n)
 den=2.66-1.45*phi+.17*clay+r.normal(0,.012,n)
 nphi=phi+.18*clay+r.normal(0,.011,n)
 rt=np.exp(2.8-7*phi-1.5*clay+np.array([.4,-.2,1.0])[fac]+r.normal(0,.09,n))
 return dict(id='WL-'+str(seed),depth=depth.tolist(),curves=np.array([gr,den,nphi,np.log10(rt)]).T.tolist(),lithology=fac.tolist(),porosity=phi.tolist(),boundaries=cuts[1:-1],split='training' if seed<113 else 'validation' if seed<115 else 'held-out-well')
wells=[well(i) for i in range(101,117)]
train=wells[:12];test=wells[14:]
def arr(w):return np.array(w['curves'])
def window(a,i,k=2):return a[np.clip(np.arange(i-k,i+k+1),0,len(a)-1)].reshape(-1)
def export(m,scaler,kind,ys=None):
 return dict(kind=kind,activation=m.activation,output=m.out_activation_,weights=[a.tolist() for a in m.coefs_],bias=[a.tolist() for a in m.intercepts_],mean=scaler.mean_.tolist(),scale=scaler.scale_.tolist(),targetMean=ys.mean_.tolist() if ys else None,targetScale=ys.scale_.tolist() if ys else None)
models={};data={'kind':'synthetic-teaching','seed':SEED,'source':'tools/welllog/prepare.py','features':['GR / API','RHOB / g/cm³','NPHI / v/v','log10(RT / Ω·m)'],'lithologies':['砂岩','泥岩','灰岩'],'trainingIds':[x['id'] for x in train],'validationIds':[x['id'] for x in wells[12:14]],'records':test,'metrics':{}}

X=np.array([window(arr(w),i,2) for w in train for i in range(180)]);y=np.array([int(min(abs(i-b) for b in w['boundaries'])<=1) for w in train for i in range(180)])
sc=StandardScaler().fit(X);z=sc.transform(X);positive=np.where(y==1)[0];ix=np.r_[np.arange(len(y)),np.tile(positive,5)]
m=MLPClassifier(hidden_layer_sizes=(18,8),activation='tanh',max_iter=500,random_state=11,alpha=.015).fit(z[ix],y[ix]);models['w1']=export(m,sc,'window-boundary-mlp')
for w in test:w['boundaryProbability']=m.predict_proba(sc.transform(np.array([window(arr(w),i,2) for i in range(180)])))[:,1].tolist()
print('w1 fitted',flush=True)

X=np.concatenate([arr(w) for w in train]);y=np.concatenate([w['porosity'] for w in train]).reshape(-1,1)
sc=StandardScaler().fit(X);ys=StandardScaler().fit(y);m=MLPRegressor(hidden_layer_sizes=(16,8),activation='tanh',max_iter=800,random_state=22,alpha=.05).fit(sc.transform(X),ys.transform(y).ravel());models['w2']=export(m,sc,'multicurve-porosity-mlp',ys)
xt=np.concatenate([arr(w) for w in test]);yt=np.concatenate([w['porosity'] for w in test]);pred=np.clip(ys.inverse_transform(m.predict(sc.transform(xt)).reshape(-1,1)).ravel(),.01,.4);baseline=np.clip((2.65-xt[:,1])/(2.65-1),.01,.4)
data['metrics']['w2']={'baselineMAE':float(mean_absolute_error(yt,baseline)),'modelMAE':float(mean_absolute_error(yt,pred)),'count':len(yt)}
for j,w in enumerate(test):w['porosityPrediction']=pred[j*180:(j+1)*180].tolist()
print('w2 fitted',data['metrics']['w2'],flush=True)

y=np.concatenate([w['lithology'] for w in train]);sc=StandardScaler().fit(X);m=MLPClassifier(hidden_layer_sizes=(14,7),activation='tanh',max_iter=500,random_state=44,alpha=.025).fit(sc.transform(X),y);models['w4']=export(m,sc,'multicurve-lithology-mlp')
yt=np.concatenate([w['lithology'] for w in test]);pred=m.predict(sc.transform(xt));baseline=np.where(xt[:,0]>85,1,np.where(xt[:,0]<55,0,2))
data['metrics']['w4']={'baselineAccuracy':float(accuracy_score(yt,baseline)),'modelAccuracy':float(accuracy_score(yt,pred)),'count':len(yt)}
for w in test:w['lithologyProbability']=m.predict_proba(sc.transform(arr(w))).tolist()
print('w4 fitted',data['metrics']['w4'],flush=True)

# Masked denoising autoencoder: 20 inputs -> 12 -> 5 bottleneck -> 12 -> 20 reconstruction.
X=np.array([window(arr(w),i,2) for w in train for i in range(180)]);sc=StandardScaler().fit(X);clean=sc.transform(X);noisy=np.tile(clean,(6,1));target=np.tile(clean,(6,1));mask=np.zeros(noisy.shape,dtype=bool)
# Match the teaching task: a missing GR block while the three auxiliary logs remain visible.
# Include fully missing and edge-window GR patterns, using training wells only.
grcols=np.arange(0,20,4)
for j in range(len(noisy)):
 if j<len(clean)*3:mask[j,grcols]=True
 else:mask[j,grcols]=rng.random(5)<.65
noisy[mask]=0;noisy+=rng.normal(0,.02,noisy.shape)
m=MLPRegressor(hidden_layer_sizes=(12,5,12),activation='tanh',max_iter=1000,random_state=55,alpha=.03).fit(noisy,target);models['w5']=export(m,sc,'masked-denoising-autoencoder')
models['w5']['trainingMask']='GR block/edge masks; three auxiliary channels remain visible'
for w in test:
 a=arr(w);z=sc.transform(np.array([window(a,i,2) for i in range(180)]))
 for i in range(68,86):
  for d in range(-2,3):
   if 68<=max(0,min(179,i+d))<86:z[i,(d+2)*4]=0
 p=m.predict(z[68:86])[:,8]*sc.scale_[8]+sc.mean_[8]
 w['maskedReference']={'start':68,'length':18,'prediction':p.tolist(),'source':'sklearn.MLPRegressor.predict; test forward only'}
print('w5 fitted',flush=True)

import torch
from torch import nn
torch.set_num_threads(2);torch.manual_seed(SEED)
H,W=64,80
def image(seed):
 r=np.random.default_rng(seed);yy,xx=np.mgrid[:H,:W];a=.63+.09*np.sin(yy*.4)+.06*np.sin(xx*.15)+r.normal(0,.035,(H,W));truth=np.zeros((H,W),np.float32)
 for k in range(2):
  center=17+k*27+r.uniform(-4,4)+r.uniform(5,10)*np.sin(xx[0]/W*2*np.pi+r.uniform(0,6))
  line=np.abs(yy-center)<1.25;truth[line]=1;a[line]-=.38
 # Narrow acquisition stripe and broad dark bedding are deliberate distractors.
 for col in r.choice(np.arange(5,W-5),2,replace=False):a[:,col:col+2]-=.25
 bed=r.integers(10,H-10);a[bed:bed+5]-=.13
 return np.clip(a,.03,.98).astype(np.float32),truth
train_images=[image(200+i) for i in range(40)];tx=torch.tensor(np.stack([a for a,b in train_images]))[:,None];ty=torch.tensor(np.stack([b for a,b in train_images]))[:,None]
net=nn.Sequential(nn.Conv2d(1,6,3,padding=1),nn.ReLU(),nn.Conv2d(6,6,3,padding=1),nn.ReLU(),nn.Conv2d(6,1,1))
opt=torch.optim.Adam(net.parameters(),lr=.015);lossfun=nn.BCEWithLogitsLoss(pos_weight=torch.tensor([4.]))
for epoch in range(90):
 opt.zero_grad();loss=lossfun(net(tx),ty);loss.backward();opt.step()
 if epoch%30==0:print('w3 CNN epoch',epoch,float(loss.detach()),flush=True)
records=[]
with torch.no_grad():
 for seed in [301,302]:
  a,y=image(seed);p=torch.sigmoid(net(torch.tensor(a)[None,None]))[0,0].numpy();Image.fromarray(np.uint8(np.round(a*255))).save(OUT/'images'/('IMG-'+str(seed)+'.png'));records.append(dict(id='IMG-'+str(seed),width=W,height=H,pixels=a.round(6).ravel().tolist(),truth=y.astype(int).ravel().tolist(),probability=p.round(6).ravel().tolist(),split='held-out-image'))
layers=[]
for l in net:
 if isinstance(l,nn.Conv2d):layers.append(dict(weights=l.weight.detach().numpy().tolist(),bias=l.bias.detach().numpy().tolist(),kernel=l.kernel_size[0],padding=l.padding[0]))
models['w3']={'kind':'shallow-fully-convolutional-segmentation','layers':layers,'activation':'relu-relu-sigmoid','architecture':'1→6 (3×3) →6 (3×3) →1 (1×1)','trainingImages':40,'trainingSeeds':list(range(200,240)),'epochs':90}
data['images']=records
for key,value in models.items():
 value['generatorSeed']=SEED
 value['seed']={'w1':11,'w2':22,'w3':SEED,'w4':44,'w5':55}[key]
raw=json.dumps(models,separators=(',',':'),ensure_ascii=False);data['modelSha256']=hashlib.sha256(raw.encode()).hexdigest();data['generatorSha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
(OUT/'models.js').write_text('window.WELLLOG_MODELS='+raw+';\n',encoding='utf-8')
(OUT/'data.js').write_text('window.WELLLOG_DATA='+json.dumps(data,separators=(',',':'),ensure_ascii=False)+';\n',encoding='utf-8')
(OUT/'provenance.json').write_text(json.dumps({'kind':data['kind'],'seed':SEED,'trainingWells':data['trainingIds'],'validationWells':data['validationIds'],'testWells':[x['id'] for x in test],'trainingImages':list(range(200,240)),'testImages':[301,302],'modelSha256':data['modelSha256'],'generatorSha256':data['generatorSha256'],'metrics':data['metrics'],'claim':'Synthetic teaching only. Models fitted without test wells/images; not field validation.'},indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('exported',data['metrics'],flush=True)
