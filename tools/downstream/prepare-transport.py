"""Reproducible downstream transport teaching assets. Primary sources and limitations
are in research-transport.json and source-data/transport/source-index.json.
Run: python tools/downstream/prepare-transport.py [t1 ... t5]
No source images, coordinates or ground-truth arrays are replaced by illustrations.
"""
from pathlib import Path
import copy,hashlib,json,sys,re,xml.etree.ElementTree as ET
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from scipy.optimize import minimize_scalar
from sklearn.metrics import accuracy_score,f1_score,confusion_matrix
import torch
from torch import nn
ROOT=Path(__file__).resolve().parents[2]
RAW=ROOT/'tools/downstream/source-data/transport';OUT=ROOT/'assets/downstream/data'
OUT.mkdir(parents=True,exist_ok=True)
SEED=20261103;torch.set_num_threads(2);np.random.seed(SEED);torch.manual_seed(SEED)
def finite_json(v):
    if isinstance(v, dict):
        return {str(k): finite_json(x) for k, x in v.items()}
    if isinstance(v, (list, tuple, np.ndarray)):
        return [finite_json(x) for x in v]
    if isinstance(v, (np.bool_, bool)):
        return bool(v)
    if isinstance(v, (np.integer, int)):
        return int(v)
    if isinstance(v, (np.floating, float)):
        if not np.isfinite(v):
            raise ValueError(f'Non-finite JSON value: {v}')
        return round(float(v), 8)
    return v

def np_softmax(a):
    a = np.asarray(a, dtype=float)
    b = np.exp(a - a.max(axis=-1, keepdims=True))
    return b / b.sum(axis=-1, keepdims=True)

def train_torch(net, X, Y, VX, VY, classification=False, epochs=200, batch=128, lr=.005):
    X = torch.tensor(np.asarray(X), dtype=torch.float32)
    Y = torch.tensor(np.asarray(Y), dtype=torch.long if classification else torch.float32)
    VX = torch.tensor(np.asarray(VX), dtype=torch.float32)
    VY = torch.tensor(np.asarray(VY), dtype=Y.dtype)
    if classification:
        counts = np.bincount(Y.numpy(), minlength=int(Y.max())+1)
        loss_fn = nn.CrossEntropyLoss(weight=torch.tensor(len(Y) / np.maximum(counts, 1) / len(counts), dtype=torch.float32))
    else:
        loss_fn = nn.MSELoss()
    opt = torch.optim.Adam(net.parameters(), lr=lr, weight_decay=1e-4)
    best, best_value, history = None, float('inf'), []
    gen = torch.Generator().manual_seed(SEED + len(X))
    for epoch in range(epochs):
        net.train()
        ix = torch.randperm(len(X), generator=gen)[:min(batch, len(X))]
        opt.zero_grad()
        loss = loss_fn(net(X[ix]), Y[ix])
        loss.backward()
        opt.step()
        if epoch % 10 == 0 or epoch == epochs - 1:
            net.eval()
            with torch.no_grad():
                value = float(loss_fn(net(VX), VY))
            history.append(dict(step=epoch, training=float(loss.detach()), validation=value))
            if value < best_value:
                best_value, best = value, copy.deepcopy(net.state_dict())
    net.load_state_dict(best)
    net.eval()
    return history

def export_cnn(net):
    layers = []
    for layer in net:
        if isinstance(layer, nn.Conv2d):
            layers.append(dict(type='conv2d', **{'in': layer.in_channels, 'out': layer.out_channels},
                               kernel=layer.kernel_size[0], stride=layer.stride[0], padding=layer.padding[0],
                               weight=layer.weight.detach().numpy().ravel(), bias=layer.bias.detach().numpy(), activation='relu'))
        elif isinstance(layer, nn.Flatten):
            layers.append(dict(type='flatten'))
        elif isinstance(layer, nn.Linear):
            layers.append(dict(type='dense', **{'in': layer.in_features, 'out': layer.out_features},
                               weight=layer.weight.detach().numpy().ravel(), bias=layer.bias.detach().numpy(), activation='linear'))
    return finite_json(dict(type='cnn', name='小型示功图CNN', dims=[net[0].in_channels, 32, 32], layers=layers, classification='logits'))

def cnn_numpy(model, x):
    """Independent NumPy inference over the rounded exported weights."""
    a = np.asarray(x, dtype=float).reshape(model['dims'])
    for layer in model['layers']:
        if layer['type'] == 'conv2d':
            k, stride, pad = layer['kernel'], layer['stride'], layer['padding']
            w = np.asarray(layer['weight']).reshape(layer['out'], layer['in'], k, k)
            aa = np.pad(a, ((0, 0), (pad, pad), (pad, pad)))
            win = np.lib.stride_tricks.sliding_window_view(aa, (k, k), axis=(1, 2))[:, ::stride, ::stride]
            a = np.einsum('cxyij,ocij->oxy', win, w) + np.asarray(layer['bias'])[:, None, None]
        elif layer['type'] == 'flatten':
            a = a.ravel()
        else:
            a = np.asarray(layer['weight']).reshape(layer['out'], layer['in']) @ a + layer['bias']
        if layer.get('activation') == 'relu':
            a = np.maximum(a, 0)
    return a

class GRUNet(nn.Module):
    def __init__(self, features, hidden, outputs):
        super().__init__()
        self.gru = nn.GRU(features, hidden, batch_first=True)
        self.head = nn.Linear(hidden, outputs)

    def forward(self, x):
        _, h = self.gru(x)
        return self.head(h[-1])

def export_gru(net, mean, scale, out_mean, out_scale, name):
    g = net.gru
    return finite_json(dict(type='gru', name=name, inputSize=g.input_size, hiddenSize=g.hidden_size,
                            mean=mean, scale=scale,
                            weightIH=g.weight_ih_l0.detach().numpy().ravel(), weightHH=g.weight_hh_l0.detach().numpy().ravel(),
                            biasIH=g.bias_ih_l0.detach().numpy(), biasHH=g.bias_hh_l0.detach().numpy(),
                            head=dict(weight=net.head.weight.detach().numpy().ravel(), bias=net.head.bias.detach().numpy()),
                            outputMean=out_mean, outputScale=out_scale,
                            note='single layer; zero hidden for every supplied history window; r,z,n PyTorch gate order'))

def gru_numpy(model, x):
    """Independent inference with PyTorch's reset-after-affine GRU formula."""
    n, hsize = model['inputSize'], model['hiddenSize']
    a = (np.asarray(x, dtype=float) - model['mean']) / model['scale']
    ih = np.asarray(model['weightIH']).reshape(3 * hsize, n)
    hh = np.asarray(model['weightHH']).reshape(3 * hsize, hsize)
    h = np.zeros(hsize)
    for row in a:
        gi = ih @ row + model['biasIH']
        gh = hh @ h + model['biasHH']
        r = 1 / (1 + np.exp(-np.clip(gi[:hsize] + gh[:hsize], -60, 60)))
        z = 1 / (1 + np.exp(-np.clip(gi[hsize:2*hsize] + gh[hsize:2*hsize], -60, 60)))
        candidate = np.tanh(gi[2*hsize:] + r * gh[2*hsize:])
        h = (1 - z) * candidate + z * h
    o = len(model['outputMean'])
    raw = np.asarray(model['head']['weight']).reshape(o, hsize) @ h + model['head']['bias']
    return raw * model['outputScale'] + model['outputMean']

def predict_gru(net, X, mean, scale, out_mean, out_scale):
    a = (np.asarray(X) - mean) / scale
    with torch.no_grad():
        return net(torch.tensor(a, dtype=torch.float32)).numpy() * out_scale + out_mean


def provenance(files, **extra):
    return dict(seed=SEED,preparationScript='tools/downstream/prepare-transport.py',
                sources=[dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size) for p in files],
                sourceIndex='tools/downstream/source-data/transport/source-index.json',illustrationsUsedForTraining=False,**extra)


def save(c):
    p=OUT/(c['id']+'.json');p.write_text(json.dumps(finite_json(c),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    v=c['validation'];print(c['id'],p.stat().st_size,'bytes',json.dumps(finite_json({k:v[k] for k in ['metric','baseline','model','n']}),ensure_ascii=True),flush=True)


def cm(y,p):
    return dict(accuracy=accuracy_score(y,p),macroF1=f1_score(y,p,average='macro',zero_division=0),confusion=confusion_matrix(y,p).tolist())


def source(title,url,license):return dict(title=title,url=url,license=license)


def leak_episode(seed,cls):
    r=np.random.default_rng(seed);dt=.05;t=np.arange(96)*dt
    L,c=1200.,1000.;position=float(r.uniform(150,1050));onset=.8
    p0=r.uniform(.9,1.1);q0=r.uniform(85,115)
    left=np.full(96,p0);right=np.full(96,p0-.035)
    qin=q0+1.5*np.sin(t*1.2);qout=qin.copy();acoustic=.25+r.normal(0,.04,96)
    step=lambda arrival:(1+np.tanh((t-arrival)/.045))/2
    if cls==1:
        amp=r.uniform(.012,.035);shift=step(onset)
        left-=amp*shift;right-=amp*step(onset+.03)
        qin+=r.uniform(8,18)*shift;qout+=r.uniform(8,18)*step(onset+.08)
        acoustic+=.4*np.exp(-((t-onset)/.18)**2)
    elif cls==2:
        loss=r.uniform(1,9);amp=.007+.003*loss
        left-=amp*step(onset+position/c);right-=amp*step(onset+(L-position)/c)
        qout-=loss*step(onset);acoustic+=.12+.07*loss*step(onset)
    left+=r.normal(0,.0007,96);right+=r.normal(0,.0007,96)
    qin+=r.normal(0,.8,96);qout+=r.normal(0,.8,96)
    return dict(seed=seed,cls=cls,t=t,values=np.column_stack([left,right,qin,qout,acoustic]),position=position if cls==2 else None)


def localization(channels,dt=.05,L=1200.,c=1000.,manual=False):
    a,b=np.diff(np.asarray(channels)[:,:2],axis=0).T
    maxlag=int(L/c/dt)
    if manual:
        lags=np.arange(-maxlag,maxlag+1)
        corr=np.array([sum(a[k]*b[k-lag] for k in range(len(a)) if 0<=k-lag<len(b)) for lag in lags])
    else:
        full=np.correlate(a,b,'full');all_lags=np.arange(-len(a)+1,len(a));keep=np.abs(all_lags)<=maxlag
        lags,corr=all_lags[keep],full[keep]
    lag=int(lags[np.argmax(corr)]);x=(L+c*lag*dt)/2
    return dict(positionM=float(np.clip(x,0,L)),lagSamples=lag,lagSeconds=lag*dt)


def t1():
    eps=[leak_episode(SEED+1000+i,i%3) for i in range(180)]
    X=np.array([e['values'] for e in eps]);Y=np.array([e['cls'] for e in eps])
    tr=np.arange(120);va=np.arange(120,144);te=np.arange(144,180)
    mean=X[tr].reshape(-1,5).mean(0);scale=X[tr].reshape(-1,5).std(0)
    torch.manual_seed(SEED+101);net=GRUNet(5,8,3)
    hist=train_torch(net,(X[tr]-mean)/scale,Y[tr],(X[va]-mean)/scale,Y[va],classification=True,epochs=281,batch=36,lr=.007)
    m=export_gru(net,mean,scale,[0]*3,[1]*3,'压力—流量—声学GRU事件筛查')
    m['localization']=dict(lengthM=1200,waveSpeedMPerS=1000,dtSeconds=.05,signal='first differences of pressure channels 0 and 1',
                           formula='lag=argmax sum(dPleft[k]*dPright[k-lag]); x=(L+c*lag*dt)/2; only interpret when leak candidate')
    logits=predict_gru(net,X,mean,scale,np.zeros(3),np.ones(3));baseline=[]
    for e in eps:
        v=e['values'];balance=float(np.mean(v[-20:,2]-v[-20:,3]));drop=float(np.mean(v[:10,0])-np.mean(v[-20:,0]))
        baseline.append(2 if balance>5 else 1 if drop>.015 else 0)
    baseline=np.array(baseline);records=[]
    for i in te[:12]:
        e=eps[i];loc=localization(e['values']);pick=np.argmin(np.diff(e['values'][:,0]))-np.argmin(np.diff(e['values'][:,1]));base_x=float(np.clip((1200+1000*pick*.05)/2,0,1200))
        records.append(dict(id=f'LEAK-SIM-{i:03d}',sourceId=f'controlled episode seed {e["seed"]}',kind='controlled-synthetic',split='held-out',
                            unit='MPa / m³/h / relative acoustic energy; s; location m',scope='受控双端液体管道响应；不代表GPLA实测泄漏/正常识别或现场定位',
                            input=e['values'],target=e['cls'],baseline=int(baseline[i]),modelPrediction=logits[i],
                            display=dict(x=e['t'],channels=e['values'],features=['P_left','P_right','Q_in','Q_out','acousticEnergy'],units=['MPa','MPa','m³/h','m³/h','相对量'],
                                         classNames=['正常','调阀扰动','泄漏'],trueLeakPositionM=e['position'],localization=loc,baselinePositionM=base_x,
                                         pipelineLengthM=1200,waveSpeedMPerS=1000,dtSeconds=.05,seed=e['seed'],leakOnsetS=.8 if e['cls']==2 else None)))
    loc_model=[];loc_base=[]
    for i in te[Y[te]==2]:
        e=eps[i];a=localization(e['values'])['positionM'];v=e['values'];lag=np.argmin(np.diff(v[:,0]))-np.argmin(np.diff(v[:,1]));b=np.clip((1200+1000*lag*.05)/2,0,1200)
        loc_model.append(abs(a-e['position']));loc_base.append(abs(b-e['position']))
    gpla=RAW/'gpla-label.csv';labels=np.loadtxt(gpla) if gpla.exists() else np.repeat(np.arange(1,13),57)
    save(dict(id='t1',unit='MPa / m³/h / s / m',source=source('受控压力流量时序；GPLA-12仅提供实测声学研究背景','https://github.com/Deep-AI-Application-DAIP/acoustic-leakage-dataset-GPLA-12','GPLA代码库EPL-2.0；本课时序独立生成、参数公开'),
              scope='分类与定位都在可复现仿真片段上检验，真实GPLA没有正常/位置真值',model=m,records=records,classes=['normal','valve','leak'],
              baselineModel=dict(type='balance-pressure-rule',balanceThresholdM3H=5,pressureDropMPa=.015),
              evaluation=[dict(id=f'LEAK-SIM-{i:03d}',target=Y[i],logits=logits[i],baseline=int(baseline[i])) for i in te],
              parity=[dict(recordIndex=i,expected=gru_numpy(m,r['input']),tolerance=1e-5) for i,r in enumerate(records[:3])],
              localizationParity=[dict(recordIndex=i,expected=localization(r['input'],manual=True)) for i,r in enumerate(records[:3])],
              validation=dict(split=dict(trainEpisodes=120,checkEpisodes=24,testEpisodes=36),metric='accuracy（仿真事件）',baseline=accuracy_score(Y[te],baseline[te]),model=accuracy_score(Y[te],logits[te].argmax(1)),n=36,
                              modelMetrics=cm(Y[te],logits[te].argmax(1)),baselineMetrics=cm(Y[te],baseline[te]),localizationMAE_m=np.mean(loc_model),baselineLocalizationMAE_m=np.mean(loc_base),
                              boundary='定位误差只在12个真实标签为泄漏的受控片段统计，不称现场定位精度；波速和同步被设为已知'),
              provenance=provenance([gpla] if gpla.exists() else [],counts=dict(realGPLAContextSamples=len(labels),realGPLAAllAreLeakage=True,syntheticEpisodes=180),
                                    assumptions=['L1200m,c1000m/s,dt0.05s为液体负压波教学设定，不取自GPLA', 'GPLA标签是压力/噪声/麦克风组合，不能制造正常类或位置标签', '不同episode seed整段分组；没有同片段点跨训练测试'],trainingHistory=hist)))


def corrosion_patch(instance,k):
    r=np.random.default_rng(SEED+int(instance['map'])*10000+int(instance['instance'])*100+k+['simple','average','advanced'].index(instance['level'])*1000)
    pts=np.array(instance['defects'],float);positive=k%2==0
    if positive:center=pts[r.integers(len(pts))]
    else:
        low,high=pts.min(0)-40,pts.max(0)+40
        for _ in range(200):
            center=r.uniform(low,high)
            if np.min(np.max(np.abs(pts-center),axis=1))>20:break
    xy=pts-center+16;inside=xy[(xy[:,0]>=0)&(xy[:,0]<32)&(xy[:,1]>=0)&(xy[:,1]<32)].astype(int)
    mask=np.zeros((32,32));mask[inside[:,1],inside[:,0]]=1
    response=gaussian_filter(mask,1.2)
    if response.max()>0:response/=response.max()
    yy,xx=np.mgrid[:32,:32];img=.72+r.uniform(-.08,.08)+r.uniform(-.1,.1)*(xx/32)+r.normal(0,.065,(32,32))
    img-=r.uniform(.28,.40)*response
    if k%3==0:img+=.09*np.sin(yy*.8+r.uniform(0,6))
    return np.clip(img,0,1).astype('f4'),int(mask.sum()>0),dict(center=center,points=inside,mask=mask)


def thickness_series(seed):
    r=np.random.default_rng(seed);t=np.arange(16,dtype=float);initial=r.uniform(7.7,9.3);rate=r.uniform(.07,.29);accel=r.uniform(.001,.009)
    true=initial-rate*t-accel*t*t;observed=true+r.normal(0,.035,16)
    return np.column_stack([observed,t]),true


def t2():
    p=RAW/'corrosion-coordinate-snapshot.json';snap=json.loads(p.read_text(encoding='utf-8'));images=[];targets=[];meta=[]
    for item in snap['instances']:
        for k in range(8):
            im,y,geom=corrosion_patch(item,k);images.append(im[None]);targets.append(y);meta.append((item,k,geom))
    X=np.array(images);Y=np.array(targets)
    tr=np.array([i for i,(it,k,g) in enumerate(meta) if it['map']==1 and it['instance']<=6]);va=np.array([i for i,(it,k,g) in enumerate(meta) if it['map']==1 and it['instance']>6]);te=np.array([i for i,(it,k,g) in enumerate(meta) if it['map']==2])
    torch.manual_seed(SEED+102);net=nn.Sequential(nn.Conv2d(1,4,3,2,1),nn.ReLU(),nn.Conv2d(4,6,3,2,1),nn.ReLU(),nn.Flatten(),nn.Linear(384,2))
    hist=train_torch(net,X[tr],Y[tr],X[va],Y[va],classification=True,epochs=241,batch=48,lr=.006);m=export_cnn(net);m['name']='公开缺陷位置派生受控检测图CNN';m['classes']=['background','defect']
    with torch.no_grad():logits=net(torch.tensor(X)).numpy()
    baseline=(np.quantile(X.reshape(len(X),-1),.1,axis=1)<.54).astype(int)
    histories=[thickness_series(SEED+4000+j) for j in range(68)];gx=[];gy=[];groups=[]
    for j,(a,true) in enumerate(histories):
        for t in range(6,16):gx.append(a[t-6:t]);gy.append([true[t]]);groups.append(j)
    gx=np.array(gx);gy=np.array(gy);groups=np.array(groups);gtr=np.flatnonzero(groups<48);gva=np.flatnonzero((groups>=48)&(groups<56));gte=np.flatnonzero(groups>=56)
    mean=gx[gtr].reshape(-1,2).mean(0);scale=gx[gtr].reshape(-1,2).std(0);ym=gy[gtr].mean(0);ys=gy[gtr].std(0)
    torch.manual_seed(SEED+202);gn=GRUNet(2,8,1)
    gh=train_torch(gn,(gx[gtr]-mean)/scale,(gy[gtr]-ym)/ys,(gx[gva]-mean)/scale,(gy[gva]-ym)/ys,epochs=301,batch=96,lr=.007)
    gm=export_gru(gn,mean,scale,ym,ys,'受控壁厚历时GRU：过去6次预测下一年')
    gp=predict_gru(gn,gx,mean,scale,ym,ys)[:,0];gb=gx[:,-1,0]
    selected=te[:12];records=[]
    for j,i in enumerate(selected):
        it,k,g=meta[i];a,true=histories[56+j];tx=a[5:11];ty=true[11];forecast=float(gru_numpy(gm,tx)[0]);current=float(a[10,0]);rate=current-forecast
        records.append(dict(id=f'{it["id"]}-patch{k}',kind='controlled-synthetic',split='held-out',sourceId=it['archiveMember'],unit='检测图灰度相对量；壁厚mm；时间year',
                            scope='公开缺陷坐标派生灰度检测图；壁厚时间史独立受控生成，未声称实测内检测深度/工程寿命',input=X[i].ravel(),target=int(Y[i]),baseline=int(baseline[i]),modelPrediction=logits[i],
                            secondaryInput=tx,secondaryTarget=float(ty),secondaryBaseline=current,secondaryPrediction=forecast,
                            display=dict(image=X[i].ravel(),width=32,height=32,channels=1,referenceMask=g['mask'].ravel(),referencePoints=g['points'],mapId=it['map'],
                                         classNames=['无坐标缺陷','坐标缺陷候选'],history=a[:11].tolist(),historyYears=a[:11,1],historyThicknessMm=a[:11,0],nextYear=11,nextThicknessMm=ty,
                                         predictedNextThicknessMm=forecast,currentThicknessMm=current,scenarioThresholdMm=4,modelRemainingYears=(current-4)/rate if rate>0 and current>4 else None,
                                         thicknessSource='independent controlled thinning trajectory, not repeat surveys of this published map')))
    save(dict(id='t2',unit='像素/相对灰度；mm；year',source=source('公开管道缺陷位置地图＋独立受控检测/减薄实验','https://zenodo.org/records/10809418','地图CC BY4.0；灰度响应与壁厚时间史为本课受控派生'),
              scope='CV识别与TS减薄预测均实际训练；物理壁厚和时间标签来自明确仿真，不是地图作者实测',model=m,secondaryModel=gm,records=records,
              parity=[dict(recordIndex=i,expected=cnn_numpy(m,r['input']),tolerance=1e-5) for i,r in enumerate(records[:3])],
              secondaryParity=[dict(recordIndex=i,expected=gru_numpy(gm,r['secondaryInput']),tolerance=1e-5) for i,r in enumerate(records[:3])],
              evaluation=[dict(id=f'{meta[i][0]["id"]}-{meta[i][1]}',target=int(Y[i]),logits=logits[i],baseline=int(baseline[i])) for i in te],
              validation=dict(split=dict(trainPatchGroups=18,checkPatchGroups=6,testPatchGroups=12,trainMap=1,testMap=2,trainTimeGroups=48,checkTimeGroups=8,testTimeGroups=12),
                              metric='accuracy（受控检测图）',baseline=accuracy_score(Y[te],baseline[te]),model=accuracy_score(Y[te],logits[te].argmax(1)),n=len(te),
                              secondaryMAE_mm=np.mean(np.abs(gp[gte]-gy[gte,0])),secondaryBaselineMAE_mm=np.mean(np.abs(gb[gte]-gy[gte,0])),secondaryN=len(gte),
                              boundary='位置地图无壁厚/时间；独立仿真阈值4mm仅供比较剩余时间，不能作为管道安全/维修期限'),
              provenance=provenance([p],counts=dict(sourceInstances=len(snap['instances']),patches=len(X),timeSeries=68),
                                    assumptions=['原坐标仅作空间模板，单位未说明；不是实测超声/MFL图', '低灰度响应与噪声由生成器明确设置；CNN输入不含坐标或参考掩膜', '两种模型分组独立，展示配对不声称同一现场缺陷匹配', '寿命情景=(current−threshold)/(current−oneYearPrediction)，正减薄才有定义'],trainingHistory=hist,secondaryTrainingHistory=gh)))


def dispatch(m,inp,independent=False):
    demand,ceiling=map(float,inp);stations=m['stations'];caps=[min(s['flowCap'],np.sqrt(max(0,ceiling-s['inletBar'])/s['pressureK'])) for s in stations]
    def power(q):return sum((s['idle'] if v>1e-7 else 0)+s['linear']*v+s['cubic']*v**3 for s,v in zip(stations,q))
    candidates=[]
    for a,b in [(1,0),(0,1),(1,1)]:
        if demand>caps[0]*a+caps[1]*b+1e-8:continue
        lo=max(0,demand-caps[1]*b);hi=min(caps[0]*a,demand)
        if lo>hi+1e-8:continue
        if hi-lo<1e-8:q1=lo
        elif independent:
            def derivative(x):return stations[0]['linear']+3*stations[0]['cubic']*x*x-stations[1]['linear']-3*stations[1]['cubic']*(demand-x)**2
            left,right=lo,hi
            for _ in range(80):
                mid=(left+right)/2
                if derivative(mid)<0:left=mid
                else:right=mid
            q1=(left+right)/2
        else:
            q1=minimize_scalar(lambda x:power([x,demand-x]),bounds=(lo+1e-8,hi-1e-8),method='bounded',options={'xatol':1e-10}).x
        for q in [[q1,demand-q1],[lo,demand-lo],[hi,demand-hi]]:
            candidates.append((power(q),q))
    if not candidates:return dict(feasible=False,allocation=[0,0],powerKW=None,capacities=caps,pressureBar=[s['inletBar'] for s in stations],shortfall=max(0,demand-sum(caps)))
    energy,q=min(candidates,key=lambda a:a[0]);press=[s['inletBar']+s['pressureK']*v*v for s,v in zip(stations,q)]
    return dict(feasible=True,allocation=q,powerKW=energy,capacities=caps,pressureBar=press,shortfall=0)


def t3():
    p=RAW/'GasLib-11.net';tree=ET.parse(p).getroot();ns={'g':'http://gaslib.zib.de/Gas'};cs=tree.findall('.//g:compressorStation',ns)
    ids=[x.attrib['id'] for x in cs];caps=[float(x.find('g:flowMax',ns).attrib['value']) for x in cs]
    m=dict(type='compressor-dispatch',name='两站并联代理：启停枚举＋一维凸优化',stations=[dict(id=ids[0],flowCap=caps[0],inletBar=45,pressureK=.00004,idle=180,linear=.35,cubic=.000006),dict(id=ids[1],flowCap=caps[1],inletBar=45,pressureK=.00007,idle=80,linear=.20,cubic=.000011)],
           formula='sum q=demand; 0<=q<=min(flowCap,sqrt((ceiling-inletBar)/pressureK)); power=sum(idle_if_on+linear*q+cubic*q^3)',
           flowUnit='10³ m³/h（GasLib源体积基准）',pressureUnit='bar',powerUnit='kW（声明的代理能耗系数）',scope='仅借用GasLib两站编号/流量界限；并联拓扑与压降/能耗关系是显式教学代理，非原11节点全网求解')
    records=[];vbase=[];vmodel=[]
    for j,d in enumerate([300,450,600,750,900,1200,1500]):
        inp=[d,70];sol=dispatch(m,inp);ind=dispatch(m,inp,True)
        if sol['feasible'] and abs(sol['powerKW']-ind['powerKW'])>1e-4:raise AssertionError('dispatch parity')
        caps=np.array(sol['capacities']);q=np.minimum(caps,d/2);remain=d-q.sum()
        for i in range(2):add=min(max(0,remain),caps[i]-q[i]);q[i]+=add;remain-=add
        bp=sum((s['idle'] if v>1e-7 else 0)+s['linear']*v+s['cubic']*v**3 for s,v in zip(m['stations'],q)) if remain<1e-7 else None
        if sol['feasible']:vbase.append(bp);vmodel.append(sol['powerKW'])
        records.append(dict(id=f'GASLIB-PROXY-{d}',sourceId='GasLib-11 / '+','.join(ids),kind='published-simulation',split='demonstration',unit='10³m³/h / bar / proxy kW',
                            scope=m['scope'],input=inp,target=None,baseline=dict(feasible=remain<1e-7,allocation=q,powerKW=bp),modelPrediction=sol,
                            display=dict(stationNames=ids,demand=d,pressureCeilingBar=70,baselineAllocation=q,optimizedAllocation=sol['allocation'],baselinePowerKW=bp,optimizedPowerKW=sol['powerKW'],
                                         feasible=sol['feasible'],capacities=sol['capacities'],shortfall=sol['shortfall'],sourceTopology='GasLib11',proxyTopology='two parallel compressor routes')))
    save(dict(id='t3',unit='10³m³/h / bar / proxy kW',source=source('GasLib-11公开测试网络的声明简化代理','https://gaslib.zib.de/testData.html','CC BY3.0；按源注释引用Pfetsch等Gas Network Optimization'),scope=m['scope'],model=m,records=records,
              parity=[dict(recordIndex=i,expected=dispatch(m,r['input'],True),tolerance=1e-4) for i,r in enumerate(records[:3])],
              validation=dict(split='7个预设需求情景，其中6个可行；不是训练/测试准确率',metric='mean feasible proxy power kW',baseline=np.mean(vbase),model=np.mean(vmodel),n=len(vmodel),boundary='独立二分导数法与SciPy有界求解相互核对；能耗为代理目标，保留不可行情景'),
              provenance=provenance([p],assumptions=['源网络确有2个压气站，flowMax均1100×1000m³/h', '本课显式改成两条并联支路；没有声称保留全网水力方程', 'inlet45bar、压降系数、idle/linear/cubic能耗系数是教学假设，不取自原压缩机性能图', '改变需求或压力上限时必须重新检查容量和总量，不能强行归一化不合理方案'])))


def meter_episode(seed):
    r=np.random.default_rng(seed);n=120;t=np.arange(n);truth=100+r.uniform(-10,10)+18*np.sin(t/17)+4*np.sin(t/5)
    slope=np.empty(n);bias=np.empty(n);slope[0]=r.uniform(-.08,.08);bias[0]=r.uniform(-2,2)
    for k in range(1,n):slope[k]=slope[k-1]+r.normal(0,.003);bias[k]=bias[k-1]+slope[k-1]
    reading=truth+bias+r.normal(0,.25,n);cal=(t%25==0);ref=truth+r.normal(0,.10,n);z=np.where(cal,reading-ref,np.nan)
    return dict(seed=seed,truth=truth,bias=bias,slope=slope,reading=reading,cal=cal,z=z)


def kalman(m,inp,scalar=False):
    reading=np.asarray(inp['reading']);obs=inp['calibrationResidual'];dt=inp['dtMinutes'];x=np.zeros(2);P=np.array(m['initialP'],float);result=[]
    if scalar:
        b=v=0.;p00,p01,p11=P[0,0],P[0,1],P[1,1]
        for y,z in zip(reading,obs):
            b+=dt*v;p00,p01,p11=p00+2*dt*p01+dt*dt*p11+m['q']*dt**3/3,p01+dt*p11+m['q']*dt*dt/2,p11+m['q']*dt
            if z is not None:
                old00,old01=p00,p01;s=p00+m['r'];k0=p00/s;k1=p01/s;err=z-b;b+=k0*err;v+=k1*err;p00-=k0*old00;p01-=k0*old01;p11-=k1*old01
            result.append([b,v,y-b])
    else:
        F=np.array([[1,dt],[0,1]]);Q=m['q']*np.array([[dt**3/3,dt**2/2],[dt**2/2,dt]]);H=np.array([1.,0.])
        for y,z in zip(reading,obs):
            x=F@x;P=F@P@F.T+Q
            if z is not None:
                K=P@H/(P[0,0]+m['r']);x=x+K*(z-x[0]);P=(np.eye(2)-np.outer(K,H))@P
            result.append([x[0],x[1],y-x[0]])
    return np.array(result)


def t4():
    train=[meter_episode(SEED+5000+i) for i in range(30)];tests=[meter_episode(SEED+5100+i) for i in range(12)]
    q=float(np.var(np.concatenate([np.diff(e['slope']) for e in train])));r=float(np.var(np.concatenate([(e['z']-e['bias'])[e['cal']] for e in train])))
    m=finite_json(dict(type='kalman-drift',name='稀疏标定下偏差—漂移Kalman校正',q=q,r=r,initialP=[[4,0],[0,.04]],state=['bias_m3h','slope_m3h_per_min'],
                       F='[[1,dt],[0,1]]',Q='q*[[dt^3/3,dt^2/2],[dt^2/2,dt]]',H=[1,0],formula='predict x,P; only when calibrationResidual!=null update z=reading-reference; corrected=reading-bias',dtMinutes=1))
    records=[];ae=[];be=[];rawerr=[]
    for i,e in enumerate(tests):
        inp=dict(dtMinutes=1,reading=e['reading'].tolist(),calibrationResidual=[float(z) if np.isfinite(z) else None for z in e['z']]);pred=kalman(m,inp);ind=kalman(m,inp,True)
        if np.max(np.abs(pred-ind))>1e-8:raise AssertionError('Kalman parity')
        hold=[];b=0.
        for z in inp['calibrationResidual']:
            if z is not None:b=z
            hold.append(b)
        baseline=e['reading']-hold;mask=~e['cal'];ae.extend(np.abs(pred[mask,2]-e['truth'][mask]));be.extend(np.abs(baseline[mask]-e['truth'][mask]));rawerr.extend(np.abs(e['reading'][mask]-e['truth'][mask]))
        records.append(dict(id=f'METER-SIM-{i:02d}',sourceId=f'controlled drift seed {e["seed"]}',kind='controlled-synthetic',split='held-out',unit='m³/h；min',scope='稀疏标定可用、其余真流量仅来自受控生成器；不是NIST实测计量历史',
                            input=inp,target=e['truth'],baseline=baseline,modelPrediction=pred[-1],
                            display=dict(x=list(range(120)),reading=e['reading'],reference=e['truth'],referenceOnlyAtCalibration=[float(e['reading'][k]-e['z'][k]) if e['cal'][k] else None for k in range(120)],
                                         corrected=pred[:,2],baseline=baseline,biasEstimate=pred[:,0],biasTruth=e['bias'],calibrationMask=e['cal'],selectedIndex=119,seed=e['seed'],unit='m³/h')))
    save(dict(id='t4',unit='m³/h；min',source=source('受控漂移/标定时序；NIST仅作可溯源校准原则背景','https://www.nist.gov/publications/gas-flow-standards-and-their-uncertainty','本课数据独立生成；NIST页面仅引用研究背景'),scope='实际递推校正；不给出交接计量认证或现场仪表精度',model=m,records=records,
              parity=[dict(recordIndex=i,expected=kalman(m,r['input'],True)[-1],tolerance=1e-7) for i,r in enumerate(records[:3])],
              validation=dict(split=dict(trainEpisodes=30,testEpisodes=12,minutesPerEpisode=120,calibrationEveryMinutes=25),metric='MAE（未标定时刻）',baseline=np.mean(be),model=np.mean(ae),n=len(ae),rawMAE=np.mean(rawerr),boundary='评价排除正在提供参考值的标定点；训练估计q/r，未用留出真值校正或选参'),
              provenance=provenance([],assumptions=['仅偏差和漂移状态，不处理未建模多相流、密度/组分换算', 'dt1min，每25min标定，读数/参考噪声由生成器定义', 'q由训练漂移增量估计，r由训练标定残差减真实偏差估计', 'reference曲线是评价真值，不送入非标定时刻的滤波器'])))


def t5():
    p=RAW/'liquid-snapshot-index.json';idx=json.loads(p.read_text(encoding='utf-8'));pixels=np.load(RAW/'liquid-pixels-64.npz')['images'];items=idx['items']
    # Sessions, rather than adjacent glass crops, stay together.
    sessions=np.array([it['group'][:-4] for it in items]);tr=np.flatnonzero(np.char.endswith(sessions,'08'));va=np.flatnonzero(np.char.endswith(sessions,'14')|np.char.endswith(sessions,'16'));te=np.flatnonzero(np.char.endswith(sessions,'13'))
    X=np.stack([np.asarray(Image.fromarray(im).resize((32,32),Image.Resampling.BILINEAR),dtype='f4').transpose(2,0,1)/255 for im in pixels]);Y=np.array([[it['fluidY']] for it in items],dtype='f4')
    ym=Y[tr].mean(0);ys=np.maximum(Y[tr].std(0),.01)
    torch.manual_seed(SEED+105);net=nn.Sequential(nn.Conv2d(3,4,3,2,1),nn.ReLU(),nn.Conv2d(4,6,3,2,1),nn.ReLU(),nn.Flatten(),nn.Linear(384,1))
    hist=train_torch(net,X[tr],(Y[tr]-ym)/ys,X[va],(Y[va]-ym)/ys,epochs=301,batch=48,lr=.004)
    m=export_cnn(net);m.update(name='真实透明容器像素液面行CNN',outputMean=ym.tolist(),outputScale=ys.tolist(),classification=None)
    with torch.no_grad():pred=(net(torch.tensor(X)).numpy()*ys+ym)[:,0]
    baseline=[]
    for im,it in zip(pixels,items):
        k=np.array(it['keypoints']).reshape(-1,3);top=int(np.clip(k[3,1]/4,0,62));bottom=int(np.clip(k[0,1]/4,top+1,63));gray=im.mean(2);edge=np.abs(np.diff(gray[:,16:48],axis=0)).mean(1)
        baseline.append((top+int(np.argmax(edge[top:max(top+1,bottom)]))+.5)/64)
    baseline=np.array(baseline);selected=te[np.unique(np.linspace(0,len(te)-1,12).round().astype(int))];records=[]
    for i in selected:
        it=items[i];k=np.array(it['keypoints']).reshape(-1,3);top=k[3,1]/256;bottom=k[0,1]/256;fill=float(np.clip((bottom-pred[i])/(bottom-top),0,1))
        records.append(dict(id='GLASS-'+it['id'],sourceId=it['file'],kind='field',split='held-out',unit='原256px图液面纵坐标比例；可见高度比例',scope='真实透明饮用容器液面代理；不是储罐现场、不可见罐内液位或泄漏真值',input=X[i].ravel(),target=float(Y[i,0]),baseline=float(baseline[i]),modelPrediction=float(pred[i]),
                            display=dict(image=pixels[i].ravel(),width=64,height=64,channels=3,pixelScale=255,sourceImageSHA256=it['originalSHA256'],
                                         calibrationTop=top,calibrationBottom=bottom,targetFluidY=Y[i,0],predictedFluidY=pred[i],baselineFluidY=baseline[i],targetFillHeight=it['fillHeightFraction'],predictedFillHeight=fill,
                                         group=sessions[i],file=it['file'],unit='液面y/256；高度比例，不是体积比例')))
    save(dict(id='t5',unit='px（原256px）/ 可见高度比例',source=source('Glasses-in-the-Wild · real visible liquid-level keypoints','https://zenodo.org/records/17288503','CC BY4.0；Adriaens、Lips、De Coster、Verleysen、wyffels，2025'),scope='真实照片像素→液面位置，手动标定上缘/底缘换算高度；无储罐泄漏标签',model=m,records=records,
              parity=[dict(recordIndex=i,expected=cnn_numpy(m,r['input'])*np.array(m['outputScale'])+np.array(m['outputMean']),tolerance=1e-6) for i,r in enumerate(records[:3])],
              evaluation=[dict(id=items[i]['id'],group=sessions[i],target=Y[i,0],prediction=pred[i],baseline=baseline[i]) for i in te],
              validation=dict(split=dict(trainSession='2024-12-16 08h',checkSessions=['14h','16h'],testSession='13h',trainImages=len(tr),checkImages=len(va),testImages=len(te)),metric='liquid-row MAE',unit='original256px',baseline=np.mean(np.abs(baseline[te]-Y[te,0]))*256,model=np.mean(np.abs(pred[te]-Y[te,0]))*256,n=len(te),
                              boundary='同一公开val源子集重新按拍摄时段分组，非原作者benchmark或跨设备/跨储罐验证；不得把高度比叫体积比'),
              provenance=provenance([p,RAW/'liquid-pixels-64.npz'],counts=dict(realSourceImages=310,retainedImages=len(items),heldOutDisplayed=len(records)),
                                    assumptions=['真实RGB图片256→64快照→32双线性输入，CHW/255；没有用标签绘制训练图', '目标fluid_level_y/256；底/口标定只用于输出高度换算，不作为像素网络输入', '同拍摄时段整组留出，仍仅为同一参与者/容器域的视觉示范', '未提供泄漏、雷达液位或容积标定，不制造这些结论'],trainingHistory=hist)))


if __name__=='__main__':
    funcs={'t1':t1,'t2':t2,'t3':t3,'t4':t4,'t5':t5}
    for case in sys.argv[1:] or funcs:
        if case not in funcs:raise SystemExit('Unknown transport case '+case)
        print('Preparing',case,flush=True);funcs[case]()
