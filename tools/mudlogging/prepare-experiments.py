"""Reproducible synthetic teaching experiments; no field-performance claims.

Four configurations and their conventional baselines are fixed before fitting.
Splits are by simulated well / tray / sentence template, never random pixels.
The browser displays these actual held-out outputs, not invented predictions.
"""
import base64
import hashlib
import json
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
import sklearn
from sklearn.metrics import confusion_matrix, f1_score
import torch
from torch import nn
from torch.nn import functional as F

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tools/mudlogging/experiments'
WEIGHTS = ROOT / 'tools/mudlogging/checkpoints'
OUT.mkdir(exist_ok=True)
WEIGHTS.mkdir(exist_ok=True)
torch.set_num_threads(2)
torch.use_deterministic_algorithms(True)
CONFIG = {
    'm2': dict(seed=1702, epochs=100, lr=.005, model='Causal 1D CNN: 6→24→24→24→3; kernel 3, dilations 1/2/4', baseline='TG > 2 × first-12-point median; a lag-aligned pump-off in the previous 8 points means connection gas'),
    'm3': dict(seed=1703, epochs=55, lr=.003, model='Tiny U-Net: 3→8→16→32→16→8→1, two pooling levels, skip concatenations', baseline='After identical exposure correction: R > .40, G > .45, R > 1.25 × B inside sample ROI'),
    'm4': dict(seed=1704, epochs=120, lr=.004, model='1D CNN: 5→24→24→24→3; kernel 5, symmetric dilations 1/2/4', baseline='Drilling-time thresholds 4.1 and 6.7 min/m; both methods use the same four-point minimum-run filter'),
    'm5': dict(seed=1705, epochs=32, lr=.004, model='Character embedding 24 → bidirectional GRU 24×2 → linear 4', baseline='Literal keyword order: 接单根/停泵, 全烃升高/气测异常/气测显示, 钻时/钻速, otherwise normal; no negation handling'),
}
(OUT / 'protocol.json').write_text(json.dumps(CONFIG, ensure_ascii=False, indent=2), encoding='utf-8')


def seed(n):
    random.seed(n); np.random.seed(n); torch.manual_seed(n)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rounded(a, digits=4):
    return np.round(np.asarray(a), digits).tolist()


def scores(y, p, labels):
    y, p = np.asarray(y).ravel(), np.asarray(p).ravel()
    m = confusion_matrix(y, p, labels=range(len(labels)))
    return dict(count=len(y), correct=int((y == p).sum()), accuracy=float((y == p).mean()),
                macroF1=float(f1_score(y, p, labels=range(len(labels)), average='macro', zero_division=0)), matrix=m.tolist())


def save(case, data, model):
    path = WEIGHTS / (case + '.pt')
    torch.save(model.state_dict(), path)
    data.update(version='1.0.0', created='2026-11-01', kind='synthetic-teaching',
                method=CONFIG[case], parameterCount=sum(p.numel() for p in model.parameters()),
                weightsSha256=sha(path), generatorSha256=sha(Path(__file__)),
                runtime=dict(torch=torch.__version__, numpy=np.__version__, sklearn=sklearn.__version__),
                disclosure='Synthetic generator labels; no field data, no expert-performance or inference-time benchmark. Fixed held-out result replay.')
    (OUT / (case + '.json')).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(case, json.dumps(data['metrics'], ensure_ascii=False), flush=True)


class Temporal(nn.Module):
    def __init__(self, channels, k=3, causal=False):
        super().__init__(); self.causal, self.k = causal, k
        self.layers = nn.ModuleList([nn.Conv1d(channels if i == 0 else 24, 24, k, dilation=d) for i, d in enumerate([1, 2, 4])])
        self.head = nn.Conv1d(24, 3, 1)

    def forward(self, x):
        for i, layer in enumerate(self.layers):
            p = (self.k - 1) * 2**i
            x = F.relu(layer(F.pad(x, (p, 0) if self.causal else (p//2, p//2))))
        return self.head(x)


def temporal_fit(case, x, y, train_count, val_count, model):
    x = np.asarray(x, dtype=np.float32); y = np.asarray(y, dtype=np.int64)
    mean = x[:train_count].mean((0, 2), keepdims=True)
    std = x[:train_count].std((0, 2), keepdims=True).clip(.0001)
    xt, yt = torch.from_numpy((x-mean)/std), torch.from_numpy(y)
    opt = torch.optim.Adam(model.parameters(), lr=CONFIG[case]['lr'])
    weight = torch.tensor(np.bincount(y[:train_count].ravel(), minlength=3)**-.5, dtype=torch.float32)
    for _ in range(CONFIG[case]['epochs']):
        model.train(); opt.zero_grad(); loss=F.cross_entropy(model(xt[:train_count]), yt[:train_count], weight=weight)
        loss.backward(); opt.step()
    model.eval()
    with torch.no_grad():
        probabilities = model(xt).softmax(1).numpy()
        val_loss = F.cross_entropy(model(xt[train_count:train_count+val_count]), yt[train_count:train_count+val_count]).item()
    return probabilities, dict(mean=rounded(mean.ravel(), 8), std=rounded(std.ravel(), 8), validationLoss=val_loss)


def gas():
    seed(CONFIG['m2']['seed']); rng=np.random.default_rng(1702); x=[]; y=[]; records=[]; lag=6
    for well in range(30):
        n=96; t=np.arange(n); b=rng.uniform(.22,.5); gas=b+.05*np.sin(t/15)+rng.normal(0,.025,n)
        c2=np.clip(rng.normal(.045,.012,n),.005,.2); c3=np.clip(rng.normal(.017,.006,n),.002,.1)
        pump=np.ones(n); label=np.zeros(n,dtype=int)
        for stop in [int(rng.integers(12,22)),int(rng.integers(54,63))]:
            pump[stop:stop+3]=0; center=stop+lag+3
            shape=np.exp(-.5*((t-center)/2.1)**2); gas+=rng.uniform(.7,1.8)*shape
            label[(t>=center-3)&(t<=center+4)]=1
        for begin in [int(rng.integers(31,38)),int(rng.integers(75,79))]:
            end=begin+int(rng.integers(9,14)); ix=(t>=begin)&(t<end)
            gas[ix]+=rng.uniform(.30,.75); c2[ix]+=rng.uniform(.07,.13); c3[ix]+=.04
            label[ix]=2
        flow=24*pump+rng.normal(0,.3,n)*pump
        rop=np.clip(rng.normal(13,1.8,n),7,20)*pump
        depth=2400+np.cumsum(rop/60)
        aligned=np.r_[np.ones(lag),pump[:-lag]]
        baseline=np.zeros(n,dtype=int); high=gas>2*np.median(gas[:12])
        for j in range(n):
            if high[j]: baseline[j]=1 if np.any(aligned[max(0,j-8):j+1]<.5) else 2
        inputs=np.stack([np.log1p(gas),c2,c3,aligned,flow/24,rop/15]); x.append(inputs); y.append(label)
        records.append(dict(id=f'G-{well+1:02}', well=f'合成井 G-{well+1:02}', lagMinutes=lag,
            time=t.tolist(), depth=rounded(depth,2), gas=rounded(gas), c2=rounded(c2), c3=rounded(c3),
            pump=pump.tolist(), alignedPump=aligned.tolist(), flow=rounded(flow), rop=rounded(rop), truth=label.tolist(), baseline=baseline.tolist()))
    model=Temporal(6,causal=True); prob,normalization=temporal_fit('m2',x,y,20,4,model)
    for i,r in enumerate(records):r.update(scores=rounded(prob[i].T,6),prediction=prob[i].argmax(0).tolist())
    labels=['背景','接单根气','持续气测显示']; metrics={}
    for name,start,end in [('validation',20,24),('test',24,30)]:
        truth=[v for r in records[start:end] for v in r['truth']]
        metrics[name]={k:scores(truth,[v for r in records[start:end] for v in r[k]],labels) for k in ['baseline','prediction']}
    save('m2',dict(labels=labels, split=dict(train=20,validation=4,test=6,unit='模拟井',pointsPerWell=96),
         normalization=normalization, metrics=metrics, records=records[24:], trainIds=[r['id'] for r in records[:20]],validationIds=[r['id'] for r in records[20:24]]),model)


class UNet(nn.Module):
    def __init__(self):
        super().__init__()
        def block(a,b):return nn.Sequential(nn.Conv2d(a,b,3,padding=1),nn.ReLU(),nn.Conv2d(b,b,3,padding=1),nn.ReLU())
        self.e1=block(3,8);self.e2=block(8,16);self.bottom=block(16,32);self.d2=block(48,16);self.d1=block(24,8);self.head=nn.Conv2d(8,1,1)
    def forward(self,x):
        a=self.e1(x);b=self.e2(F.max_pool2d(a,2));c=self.bottom(F.max_pool2d(b,2))
        d=self.d2(torch.cat([F.interpolate(c,size=b.shape[-2:],mode='nearest'),b],1))
        return self.head(self.d1(torch.cat([F.interpolate(d,size=a.shape[-2:],mode='nearest'),a],1)))


def packed(mask):return base64.b64encode(np.packbits(np.asarray(mask,dtype=np.uint8).ravel())).decode()


def fluorescence():
    seed(CONFIG['m3']['seed']); rng=np.random.default_rng(1703); xs=[];ys=[];samples=[]
    images=OUT/'m3-images'; images.mkdir(exist_ok=True)
    for tray in range(30):
        tray_hue=rng.uniform(.85,1.1)
        for take in range(4):
            size=64; yy,xx=np.mgrid[:size,:size]; roi=((xx-31.5)**2+(yy-29)**2<27**2)
            grain=np.zeros((size,size),bool)
            for _ in range(40):
                cx,cy=rng.uniform(8,56,2);rx,ry=rng.uniform(2,6,2)
                grain|=((xx-cx)/rx)**2+((yy-cy)/ry)**2<1
            grain&=roi; target=np.zeros_like(grain); mineral=np.zeros_like(grain)
            for _ in range(int(rng.integers(2,7))):
                cx,cy=rng.uniform(12,52,2);rx,ry=rng.uniform(4,12,2)
                target|=((xx-cx)/rx)**2+((yy-cy)/ry)**2<1
            target&=grain
            for _ in range(int(rng.integers(5,14))):
                cx,cy=rng.uniform(8,56,2);mineral|=(xx-cx)**2+(yy-cy)**2<rng.uniform(2,4)**2
            mineral&=grain&~target
            rgb=np.clip(rng.normal(.035,.012,(size,size,3)),0,1)
            texture=rng.uniform(.7,1.15,(size,size,1));rgb[grain]=np.array([.075,.09,.12])*texture[grain]
            strength=rng.uniform(.28,.87)
            rgb[target]=np.array([strength*.90,strength, strength*.22])*texture[target]*tray_hue
            rgb[mineral]=np.array([.13,.52,.87])*texture[mineral]
            rgb[59:63,3:15]=.8; exposure=rng.uniform(.65,1.35)
            raw=(np.clip(rgb*exposure+rng.normal(0,.008,rgb.shape),0,1)*255).round().astype('uint8')
            exposure_est=raw[59:63,3:15].mean()/255/.8
            corrected=np.clip(raw/255/exposure_est,0,1)
            baseline=(corrected[:,:,0]>.40)&(corrected[:,:,1]>.45)&(corrected[:,:,0]>1.25*corrected[:,:,2])&roi
            xs.append(corrected.transpose(2,0,1));ys.append(target.astype('float32'))
            sample=dict(id=f'F-{tray+1:02}-{take+1}',tray=f'T-{tray+1:02}',roi=packed(roi),truth=packed(target),baseline=packed(baseline),interference=packed(mineral),exposure=float(exposure),exposureEstimate=float(exposure_est))
            if tray>=24:
                filename=sample['id']+'.png';Image.fromarray(raw).save(images/filename);sample.update(image='images/'+filename,imageSha256=sha(images/filename))
            samples.append(sample)
    x=torch.tensor(np.array(xs),dtype=torch.float32);y=torch.tensor(np.array(ys)[:,None],dtype=torch.float32)
    model=UNet();opt=torch.optim.Adam(model.parameters(),lr=CONFIG['m3']['lr'])
    for _ in range(CONFIG['m3']['epochs']):
        model.train()
        for batch in torch.randperm(80).split(16):
            opt.zero_grad();logit=model(x[batch]);p=logit.sigmoid();b=y[batch]
            loss=F.binary_cross_entropy_with_logits(logit,b,pos_weight=torch.tensor(2.))+(1-(2*(p*b).sum()+1)/(p.sum()+b.sum()+1))
            loss.backward();opt.step()
    model.eval()
    with torch.no_grad():q=(model(x).sigmoid()[:,0].numpy()*255).round().astype('uint8')
    pred=(q>=128)&np.array([np.unpackbits(np.frombuffer(base64.b64decode(s['roi']),dtype='uint8')).reshape(64,64).astype(bool) for s in samples])
    def metrics(begin,end):
        target=np.array(ys[begin:end],dtype=bool);base=np.array([np.unpackbits(np.frombuffer(base64.b64decode(s['baseline']),dtype='uint8')).reshape(64,64).astype(bool) for s in samples[begin:end]])
        def measure(p):
            tp=int((p&target).sum());fp=int((p&~target).sum());fn=int((~p&target).sum())
            return dict(tp=tp,fp=fp,fn=fn,iou=tp/(tp+fp+fn),dice=2*tp/(2*tp+fp+fn),count=end-begin)
        return dict(baseline=measure(base),prediction=measure(pred[begin:end]))
    for i,s in enumerate(samples):
        if i>=96:s.update(probability=base64.b64encode(q[i].tobytes()).decode(),prediction=packed(pred[i]))
    save('m3',dict(labels=['背景与干扰','目标荧光'],split=dict(train=80,validation=16,test=24,unit='图像；按样品盘划分',trainGroups=20,validationGroups=4,testGroups=6),
         imageSize=[64,64],metrics=dict(validation=metrics(80,96),test=metrics(96,120)),records=samples[96:],trainIds=[s['id'] for s in samples[:80]],validationIds=[s['id'] for s in samples[80:96]]),model)


def clean_runs(labels, minimum=4):
    a=np.asarray(labels).copy();start=0
    while start<len(a):
        end=start+1
        while end<len(a) and a[end]==a[start]:end+=1
        if end-start<minimum and start>0:a[start:end]=a[start-1]
        start=end
    return a


def boundaries(a):return np.where(np.diff(a)!=0)[0]+1


def boundary_score(truth,pred,tolerance=2):
    matched=0;total=0;gold=0;errors=[]
    for y,p in zip(truth,pred):
        a=list(boundaries(y));b=list(boundaries(p));gold+=len(a);total+=len(b);pairs=sorted((abs(i-j),i,j) for i in a for j in b)
        used_a=set();used_b=set()
        for d,i,j in pairs:
            if d<=tolerance and i not in used_a and j not in used_b:matched+=1;errors.append(d);used_a.add(i);used_b.add(j)
    return dict(matched=matched,predicted=total,reference=gold,f1=2*matched/(total+gold) if total+gold else 1,toleranceM=tolerance,meanErrorM=float(np.mean(errors)) if errors else None)


def drill():
    seed(CONFIG['m4']['seed']);rng=np.random.default_rng(1704);x=[];y=[];records=[]
    for well in range(30):
        n=128;label=[];old=-1
        while len(label)<n:
            current=int(rng.choice([j for j in range(3) if j!=old]));label.extend([current]*int(rng.integers(16,32)));old=current
        label=np.array(label[:n]);t=np.arange(n);wob=np.full(n,rng.uniform(75,100));rpm=np.full(n,rng.uniform(100,125))
        for begin in [int(rng.integers(15,35)),int(rng.integers(65,85))]:
            length=int(rng.integers(15,30));wob[begin:begin+length]*=rng.uniform(.62,.76);rpm[begin:begin+length]*=rng.uniform(.7,.85)
        wob+=rng.normal(0,2,n);rpm+=rng.normal(0,2,n);flow=25+rng.normal(0,.5,n)
        footage=np.linspace(100,228,n);factor=np.power(wob/85,.8)*np.power(rpm/110,.6)
        rop=np.take([20.,12.,7.],label)*factor*(1-.0004*footage)+rng.normal(0,.35,n)
        dt=60/np.maximum(rop,2);baseline=clean_runs(np.digitize(dt,[4.1,6.7]))
        x.append(np.stack([np.log(dt),wob/85,rpm/110,flow/25,footage/1000]));y.append(label)
        records.append(dict(id=f'D-{well+1:02}',well=f'合成井 D-{well+1:02}',depth=(2600+t).tolist(),drillTime=rounded(dt),wob=rounded(wob),rpm=rounded(rpm),flow=rounded(flow),footage=rounded(footage),normalizedTime=rounded(dt*factor),truth=label.tolist(),baseline=baseline.tolist()))
    model=Temporal(5,k=5);prob,normalization=temporal_fit('m4',x,y,20,4,model)
    for i,r in enumerate(records):r.update(scores=rounded(prob[i].T,6),prediction=clean_runs(prob[i].argmax(0)).tolist())
    labels=['较易钻段','中等可钻段','较难钻段'];metrics={}
    for name,start,end in [('validation',20,24),('test',24,30)]:
        truth=[r['truth'] for r in records[start:end]]
        metrics[name]={k:{**scores(truth,[r[k] for r in records[start:end]],labels),'boundary':boundary_score(truth,[r[k] for r in records[start:end]])} for k in ['baseline','prediction']}
    save('m4',dict(labels=labels,split=dict(train=20,validation=4,test=6,unit='模拟井',pointsPerWell=128),metrics=metrics,normalization=normalization,records=records[24:],trainIds=[r['id'] for r in records[:20]],validationIds=[r['id'] for r in records[20:24]]),model)


# Templates are partitioned before fitting. Different numbers alone do not count as unseen language.
TRAIN_TEXT=[
 ['本段正常钻进，参数平稳，气测未见异常。','未见气测异常，钻进过程平稳。','接单根作业已结束，全烃没有升高，当前循环稳定。','钻速正常，无持续气测显示。','未见停泵现象，当前全烃稳定。','气测显示不明显，参数保持稳定。','没有钻时突变，气测未见异常。','全烃没有升高，钻进平稳。'],
 ['停泵接单根后恢复循环，出现短时气峰，随后回落。','接单根后全烃升高，但很快恢复背景。','气测异常仅表现为接单根后的短峰。','循环恢复后气体短暂增加，与接单根对应。','气测显示为停泵后的短时回返峰。','完成接单根，返出短峰，随后回落至背景。','停泵记录与短气峰对应，未形成持续显示。','全烃升高后迅速回落，该短峰发生在接单根之后。'],
 ['循环正常，全烃持续升高，组分同步增加。','未停泵接单根，全烃升高持续多点。','气测异常持续，排量保持稳定。','气测显示与持续钻进对应，非接单根短峰。','并非停泵后的孤立峰，气体持续增加。','全烃升高并伴重组分增加，正常循环。','未见接单根，当前气测显示持续增强。','恢复循环后气体仍然持续升高，并未回到背景。'],
 ['气测未见异常，钻时增大，钻压已降低。','钻速下降，气测稳定，需对照工况。','钻时发生突变，但没有气测异常。','气测正常，转速调低后钻时增加。','没有气测显示，钻速明显变化。','排量平稳，钻压改变，钻时随之变化。','无持续气测显示，当前钻速下降。','钻时延长而全烃没有升高，发生了钻压调整。']
]
VAL_TEXT=[['气测没有异常，钻进各项参数稳定。','当前无全烃升高，循环平稳。'],['接单根之后出现气测显示，短峰随即回落。','停泵后返出短气峰，随后恢复背景。'],['排量未变，气体持续升高，没有接单根。','正常钻进中出现持续气测异常。'],['气体稳定但钻速变慢，钻压有所减小。','钻时明显增大，未伴随全烃升高。']]
TEST_TEXT=[['钻进平稳，全烃并没有升高，未出现气测异常。','接单根已完成一段时间，气测没有异常，当前状态稳定。','没有持续气测显示，钻速保持正常。','气测正常且钻进参数平稳，未见钻时变化。'],['接单根后见到气体短峰，恢复循环后很快回落。','停泵接单根结束，气测显示短时升高，随即返回背景。','短气峰出现在接单根之后，并未持续升高。','与停泵记录对应的全烃升高是短时的，随后回落。'],['没有接单根，全烃却连续升高，重组分也增加。','气测异常多点持续，正常循环并未停泵。','并非接单根短峰，全烃升高在循环恢复后仍然持续。','气测显示持续增强，排量稳定，未见停泵记录。'],['钻压下调后钻时延长，气测没有异常。','气测显示并不明显，钻速却在转速调低后下降。','全烃没有升高，但钻时出现变化，工况同时改变。','无接单根短峰，气测稳定，当前钻速已经下降。']]


class TextGRU(nn.Module):
    def __init__(self,vocab):
        super().__init__();self.embedding=nn.Embedding(vocab,24,padding_idx=0);self.gru=nn.GRU(24,24,batch_first=True,bidirectional=True);self.head=nn.Linear(48,4)
    def forward(self,x,lengths):
        z=nn.utils.rnn.pack_padded_sequence(self.embedding(x),lengths.cpu(),batch_first=True,enforce_sorted=False)
        _,h=self.gru(z);return self.head(torch.cat([h[-2],h[-1]],1))


def report():
    seed(CONFIG['m5']['seed']);rng=np.random.default_rng(1705);all_records=[]
    for split,templates,repeats in [('train',TRAIN_TEXT,36),('validation',VAL_TEXT,10),('test',TEST_TEXT,10)]:
        for category,group in enumerate(templates):
            for ti,text in enumerate(group):
                for repeat in range(repeats):
                    depth=int(rng.integers(2400,2750));end=depth+int(rng.integers(3,15));gas=round(float(rng.uniform(.3,2.7)),2)
                    prefix=['交班记载：','井段记录：','现场描述：','作业摘要：'][repeat%4]
                    note=prefix+text+f'对应井段{depth}—{end}m。'
                    baseline=1 if any(k in note for k in ['接单根','停泵']) else 2 if any(k in note for k in ['全烃升高','气测异常','气测显示']) else 3 if any(k in note for k in ['钻时','钻速']) else 0
                    rid=f'R-{len(all_records)+1:04}'
                    facts=[dict(id=rid+'-01',key='井段',value=f'{depth}—{end} m'),dict(id=rid+'-02',key='全烃峰值',value=f'{gas:.2f} %'),dict(id=rid+'-03',key='原始记录',value=note)]
                    all_records.append(dict(id=rid,split=split,templateId=f'{split}-{category}-{ti}',note=note,truth=category,baseline=baseline,facts=facts,depth=[depth,end],gasPeak=gas))
    train=[r for r in all_records if r['split']=='train'];vocab={c:i+2 for i,c in enumerate(sorted(set(''.join(r['note'] for r in train))))}
    def encode(records):
        lengths=torch.tensor([min(len(r['note']),96) for r in records]);a=np.zeros((len(records),96),dtype='int64')
        for i,r in enumerate(records):a[i,:lengths[i]]= [vocab.get(c,1) for c in r['note'][:96]]
        return torch.tensor(a),lengths
    xx,ll=encode(all_records);yy=torch.tensor([r['truth'] for r in all_records]);model=TextGRU(len(vocab)+2);opt=torch.optim.Adam(model.parameters(),lr=CONFIG['m5']['lr'])
    for _ in range(CONFIG['m5']['epochs']):
        model.train()
        for batch in torch.randperm(len(train)).split(64):
            opt.zero_grad();loss=F.cross_entropy(model(xx[batch],ll[batch]),yy[batch]);loss.backward();opt.step()
    model.eval()
    with torch.no_grad():prob=model(xx,ll).softmax(1).numpy()
    for r,p in zip(all_records,prob):r.update(scores=rounded(p,6),prediction=int(p.argmax()))
    labels=['平稳记录','接单根记录','持续气测显示','钻时变化'];metrics={}
    for split in ['validation','test']:
        rows=[r for r in all_records if r['split']==split];metrics[split]={k:scores([r['truth'] for r in rows],[r[k] for r in rows],labels) for k in ['baseline','prediction']}
    tests=[r for r in all_records if r['split']=='test'];validation=[r for r in all_records if r['split']=='validation']
    save('m5',dict(labels=labels,split=dict(train=len(train),validation=len(validation),test=len(tests),unit='语句；模板组隔离',trainGroups=32,validationGroups=8,testGroups=16),
        metrics=metrics,records=tests,vocabulary=vocab,trainTemplateIds=sorted(set(r['templateId'] for r in train)),validationTemplateIds=sorted(set(r['templateId'] for r in validation)),
        generation='BiGRU classifies notes; facts are retrieved by immutable record ID and assembled by deterministic templates. No LLM or free-form geological conclusion.'),model)


if __name__=='__main__':
    import sys
    selected=sys.argv[1:] or ['m2','m3','m4','m5']
    for case,fn in [('m2',gas),('m3',fluorescence),('m4',drill),('m5',report)]:
        if case in selected:fn()
