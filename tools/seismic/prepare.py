"""Small, independently fitted teaching models. Never train on generated artwork.
Run fetch-data.py first. Field observations, published synthetic benchmarks, and
controlled teaching derivatives have different, explicit provenance.
"""
from pathlib import Path
import copy, hashlib, io, json, tarfile, sys
import numpy as np
from PIL import Image
from scipy.io import loadmat
from scipy.signal import convolve
from scipy.ndimage import gaussian_filter1d
import torch
from torch import nn
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
import sklearn, scipy, PIL
from fault_calibration import calibrate

ROOT=Path(__file__).resolve().parents[2];RAW=ROOT/'.artifacts/seismic-data';OUT=ROOT/'assets/seismic'
SEED=20261102;np.random.seed(SEED);torch.manual_seed(SEED);torch.set_num_threads(4)
rng=np.random.default_rng(SEED);data={};models={};audit={'seed':SEED,'illustrationsUsedForTraining':False,'runtime':{'python':sys.version.split()[0],'numpy':np.__version__,'torch':torch.__version__,'sklearn':sklearn.__version__,'scipy':scipy.__version__,'Pillow':PIL.__version__},'datasets':{}}

def rounded(a,n=6):return np.round(np.asarray(a),n).tolist()
def make_net(dim,cin,hidden,cout,k=3):
    Conv={1:nn.Conv1d,2:nn.Conv2d,3:nn.Conv3d}[dim]
    return nn.Sequential(Conv(cin,hidden,k,padding=k//2),nn.ReLU(),Conv(hidden,hidden,k,padding=k//2),nn.ReLU(),Conv(hidden,cout,1))
def export_net(model,name):
    layers=[]
    for layer in model:
        if not isinstance(layer,(nn.Conv1d,nn.Conv2d,nn.Conv3d)):continue
        k=list(layer.kernel_size);k=([1,k[0],1] if len(k)==1 else [1]+k if len(k)==2 else k)
        layers.append(dict(out=layer.out_channels,kernel=k,activation='relu',weight=rounded(layer.weight.detach().numpy().ravel(),8),bias=rounded(layer.bias.detach().numpy(),8)))
    layers[-1]['activation']='linear'
    return dict(name=name,layers=layers)
def fit(model,X,Y,loss_fn,steps,batch=4,lr=.003,val=None):
    X=torch.tensor(np.asarray(X),dtype=torch.float32);Y=torch.tensor(np.asarray(Y),dtype=torch.long if isinstance(loss_fn,nn.CrossEntropyLoss) else torch.float32)
    opt=torch.optim.Adam(model.parameters(),lr=lr);history=[];best=None;best_loss=float('inf')
    for step in range(steps):
        ix=torch.randint(len(X),(min(batch,len(X)),));opt.zero_grad();loss=loss_fn(model(X[ix]),Y[ix]);loss.backward();opt.step()
        if step%40==0 or step==steps-1:
            with torch.no_grad():
                vl=float(loss_fn(model(torch.tensor(val[0],dtype=torch.float32)),torch.tensor(val[1],dtype=Y.dtype))) if val else float(loss)
            history.append([step,round(float(loss.detach()),6),round(vl,6)]);print('step',step,'loss',round(float(loss.detach()),5),'check',round(vl,5),flush=True)
            if vl<best_loss:best_loss=vl;best=copy.deepcopy(model.state_dict())
    model.load_state_dict(best);model.eval();return history
def expected(model,x,count=24):
    with torch.no_grad():return rounded(model(torch.tensor(x,dtype=torch.float32)).numpy().ravel()[:count],7)
def provenance(file,kind):return dict(source=file,license='CC BY-NC 4.0' if file.startswith('fault-') else 'CC BY 4.0',kind=kind)

print('S1: three training volumes; volume 3 checks; volumes 10/11/12 held out.',flush=True)
vols={i:np.clip(np.fromfile(RAW/f'fault-seis-{i}.dat',dtype='<f4').reshape(128,128,128)/3,-2,2).astype('f4') for i in [0,1,2,3,10,11,12]}
labels={i:(np.fromfile(RAW/f'fault-fault-{i}.dat',dtype='<f4').reshape(128,128,128)>.5).astype('f4') for i in vols}
def fault_windows(number,count):
    a,b=vols[number],labels[number];X=[];Y=[];coords=np.argwhere(b)
    for j in range(count):
        center=coords[rng.integers(len(coords))] if j%2==0 else rng.integers([4,32,32],[124,96,96]);start=np.clip(center-[4,32,32],[0,0,0],[120,64,64]);d,y,x=start;X.append(a[d:d+8,y:y+64,x:x+64][None]);Y.append(b[d:d+8,y:y+64,x:x+64][None])
    return X,Y
X=[];Y=[]
for i in [0,1,2]:a,b=fault_windows(i,18);X+=a;Y+=b
V,W=fault_windows(3,4);net=make_net(3,1,4,1);history=fit(net,X,Y,nn.BCEWithLogitsLoss(pos_weight=torch.tensor([12.])),161,batch=2,lr=.003,val=(np.array(V),np.array(W)))
models['s1']=export_net(net,'small-3d-fault-cnn');models['s1']['attributeCalibration']=calibrate(RAW);records=[]
for i in [10,11,12]:
    pos=np.argwhere(labels[i]);center=pos[np.argmin(((pos-[64,64,64])**2).sum(1))];d,y,x=np.clip(center-[4,32,32],[0,0,0],[120,64,64]);cube=vols[i][d:d+8,y:y+64,x:x+64];truth=labels[i][d:d+8,y:y+64,x:x+64]
    records.append(dict(id=f'FAULT-{i:02d}',w=64,h=64,d=8,origin=[int(d),int(y),int(x)],volume=rounded(cube.ravel()),truth=truth.astype('u1').ravel().tolist(),expected=expected(net,cube[None,None]),**provenance(f'fault-seis-{i}.dat','published-synthetic'),coordinateSystem='Source array axes 0/1/2; local voxels, not geographic XYZ',scope='含参考断层的局部窗口；不代表全体随机抽样评价'))
data['s1']=dict(records=records,counts=dict(trainVolumes=3,checkVolumes=1,testVolumes=3,trainingWindows=len(X),window=[8,64,64]),split={'train':[0,1,2],'check':[3],'test':[10,11,12]})
audit['datasets']['s1']=dict(loss=history,labelOrigin='FaultSeg3D author forward-model labels',selection='Held-out windows centered on a reference fault near the cube center; no selection by model score.',attributeCalibration=models['s1']['attributeCalibration'])

print('S2 and S5: F3 paired field amplitudes and interpreted masks.',flush=True)
train=[100,140,180,220,260,300,340,380];check=[440];test=[540,600,680]
with tarfile.open(RAW/'f3-masks.tar.gz') as archive:
    f3={};mask={}
    for i in train+check+test:
        f3[i]=np.clip(np.asarray(Image.open(RAW/f'f3-inline-{i}.tiff'),dtype='f4')[::4,::6]/15000,-3,3)
        mask[i]=np.asarray(Image.open(archive.extractfile(f'masks/inline_{i}_mask.png')),dtype='i8')[::4,::6]
def position(a):return np.broadcast_to(np.linspace(0,1,len(a),dtype='f4')[:,None],a.shape).copy()
def facies_input(i):return np.stack([f3[i],position(f3[i])])
X=[];Y=[]
for i in train:
    a,b=facies_input(i),mask[i]
    for j in range(12):
        y=rng.integers(0,a.shape[1]-48);x=rng.integers(0,a.shape[2]-64);X.append(a[:,y:y+48,x:x+64]);Y.append(b[y:y+48,x:x+64])
all_y=np.concatenate([mask[i].ravel() for i in train]);freq=np.bincount(all_y,minlength=10);weight=1/np.sqrt(np.maximum(freq,1));weight=weight/weight.mean()
net=make_net(2,2,10,10);history=fit(net,X,Y,nn.CrossEntropyLoss(weight=torch.tensor(weight,dtype=torch.float32)),361,batch=6,lr=.006,val=(np.stack([facies_input(440)]),np.stack([mask[440]])))
models['s2']=export_net(net,'f3-local-reflection-cnn');models['s2']['classes']=10;models['s2']['input']='amplitude and normalized vertical-image position; both also available to baseline'
linearX=np.concatenate([facies_input(i).reshape(2,-1).T for i in train]);sel=rng.choice(len(linearX),min(40000,len(linearX)),replace=False);linear=LogisticRegression(C=20,max_iter=1600,class_weight='balanced').fit(linearX[sel],all_y[sel]);models['s2']['linear']=dict(weight=rounded(linear.coef_),bias=rounded(linear.intercept_))
records=[]
for i in test:
    a=f3[i];records.append(dict(id=f'F3-IL-{i}',inline=i,w=a.shape[1],h=a.shape[0],signal=rounded(a.ravel()),truth=mask[i].ravel().tolist(),expected=expected(net,facies_input(i)[None]),**provenance(f'f3-inline-{i}.tiff','field-interpretation'),scope='F3工区内、远离训练剖面的解释标签一致性；不是独立沉积相验证',coordinateSystem='Source TIFF rows every 4, columns every 6; axes remain image coordinates'))
data['s2']=dict(records=records,counts=dict(trainInlines=len(train),checkInlines=1,testInlines=len(test),classes=10,trainingWindows=len(X)),split=dict(train=train,check=check,test=test),classNames=[f'解释类 {i}' for i in range(10)])
audit['datasets']['s2']=dict(loss=history,labels='10 interpreted horizon intervals in the original v2 mask, not the different six-class F3 benchmark.',auxiliaryInput='Normalized image-row position is an explicit same-survey stratigraphic prior. Baseline receives the same two pointwise inputs; neural model also sees a 5x5 neighborhood.')

print('S3: controlled TS calibration and separate real field observations.',flush=True)
def synthetic_shot(seed,H=256,W=48):
    r=np.random.default_rng(seed);offset=np.abs(np.arange(W)-(W-1)/2);arrival=(48+offset*2+r.normal(0,1,W)).astype(int);a=r.normal(0,.10,(H,W));t=np.arange(H)
    for x,t0 in enumerate(arrival):
        q=t-t0;env=np.where(q>=0,1-np.exp(-np.maximum(q,0)/5),0);a[:,x]+=env*(np.sin(q*.55)+.55*np.sin(q*.23+.6))+r.normal(0,.06,H)
    a/=np.maximum(np.percentile(np.abs(a),95,axis=0),.01)
    return a.astype('f4'),arrival
def trace_features(a):
    a=np.asarray(a);energy=np.sqrt(np.maximum(0,np.convolve(a*a,np.ones(9),'full')[:len(a)])/np.minimum(np.arange(len(a))+1,9));return np.stack([a,energy]).astype('f4')
X=[];Y=[]
for seed in range(12):
    a,t0=synthetic_shot(SEED+seed)
    for x in range(a.shape[1]):X.append(trace_features(a[:,x]));Y.append((np.arange(len(a))>=t0[x])[None].astype('f4'))
va,vt=synthetic_shot(SEED+50);vx=np.stack([trace_features(va[:,i]) for i in range(48)]);vy=np.stack([(np.arange(256)>=vt[i])[None] for i in range(48)]).astype('f4')
net=make_net(1,2,8,1,k=9);history=fit(net,X,Y,nn.BCEWithLogitsLoss(),161,batch=32,lr=.003,val=(vx,vy));models['s3']=export_net(net,'temporal-arrival-cnn')
records=[];field=loadmat(RAW/'Ithra_field_Dataset.mat')['csg_ff']
for shot in [20,60,100]:
    a=field[:,:64,shot].astype('f4');a/=np.maximum(np.percentile(np.abs(a),95,axis=0),.00001)
    records.append(dict(id=f'ITHRA-SHOT-{shot}',w=64,h=len(a),signal=rounded(a.ravel()),reference=None,expected=expected(net,trace_features(a[:,0])[None]),source='Ithra_field_Dataset.mat',license='CC BY 4.0',kind='field-unlabelled',sampleStep=1,sampleOffset=0,sampleUnit='source sample; no time interval in this MAT',scope='实测炮集；该文件没有独立参考到时，故不报告拾取准确率',coordinateSystem='Source sample index and receiver-column index; sample interval not supplied'))
for j in range(3):
    a,t0=synthetic_shot(SEED+100+j);records.append(dict(id=f'TS-CAL-{j+1}',w=a.shape[1],h=len(a),signal=rounded(a.ravel()),reference=t0.tolist(),expected=expected(net,trace_features(a[:,0])[None]),source=f'controlled generator seed {SEED+100+j}',license='Project teaching derivative',kind='controlled-synthetic',sampleStep=1,sampleOffset=0,sampleUnit='sample (no field time unit)',scope='独立种子的受控校准炮集；到时来自生成器，不是现场精度'))
data['s3']=dict(records=records,counts=dict(trainingSyntheticShots=12,trainingTraces=len(X),checkSyntheticShots=1,fieldFileShape=list(field.shape),displayFieldShots=3,testSyntheticShots=3),split=dict(trainSeeds=list(range(SEED,SEED+12)),checkSeeds=[SEED+50],testSeeds=[SEED+100+j for j in range(3)]))
audit['datasets']['s3']=dict(loss=history,fieldLabelStatus='The source MAT contains only csg_ff and no independent arrival labels or sampling interval.',modelTraining='Controlled synthetic onset signals; field application is an out-of-domain qualitative comparison.')

print('S4: field logs -> explicitly derived 1-D response; whole-well holdout.',flush=True)
def read_las(name):
    lines=(RAW/(name+'.las')).read_text().splitlines();c=next(i for i,s in enumerate(lines) if s.lower().startswith('~curve'));e=next(i for i in range(c+1,len(lines)) if lines[i].startswith('~'));start=next(i for i,s in enumerate(lines) if s.lower().startswith('~ascii'))
    names=[s.split('.')[0].strip() for s in lines[c+1:e] if s.strip() and not s.startswith('#')];a=np.loadtxt(io.StringIO('\n'.join(lines[start+1:])));v={k:a[:,names.index(k)] for k in ['DEPT','DTC','RHOB','NPHI']}
    valid=(v['DTC']>40)&(v['DTC']<220)&(v['RHOB']>1.4)&(v['RHOB']<3.2)&(v['NPHI']>=0)&(v['NPHI']<=.6);ix=np.where(valid)[0];runs=np.split(ix,np.where(np.diff(ix)>1)[0]+1);keep=max(runs,key=len);v={k:a[keep,names.index(k)] for k in v}
    dt=np.r_[0,2*np.diff(v['DEPT'])*(v['DTC'][1:]+v['DTC'][:-1])/2*1e-6/.3048];time=np.cumsum(dt);grid=np.arange(0,time[-1],.002);depth=np.interp(grid,time,v['DEPT']);rho=np.interp(grid,time,v['RHOB']);vp=304800/np.interp(grid,time,v['DTC']);z=rho*vp/10000;phi=np.interp(grid,time,v['NPHI']);reflect=np.r_[0,np.diff(z)/(z[1:]+z[:-1])];t=np.arange(-.064,.066,.002);wavelet=(1-2*(np.pi*25*t)**2)*np.exp(-(np.pi*25*t)**2);signal=convolve(reflect,wavelet,mode='same');prior=gaussian_filter1d(z,18);gradient=np.gradient(prior);rms=np.sqrt(gaussian_filter1d(signal**2,3))
    offsets=[-8,-4,-2,-1,0,1,2,4,8];features=np.column_stack([np.take(signal,np.clip(np.arange(len(signal))+k,0,len(signal)-1)) for k in offsets]+[prior,gradient,rms]);return dict(name=name,signal=signal,prior=prior,features=features,reference=phi,depth=depth,time=grid*1000,rawRows=len(a),validRows=int(valid.sum()),usedRows=len(keep))
trainW=['15_9-13','15_9-14','15_9-15'];testW=['15_9-17','16_1-2','16_10-1'];wells={k:read_las(k) for k in trainW+testW};X=np.concatenate([wells[k]['features'] for k in trainW]);Y=np.concatenate([wells[k]['reference'] for k in trainW]);sc=StandardScaler().fit(X);reg=MLPRegressor(hidden_layer_sizes=(24,12),activation='tanh',alpha=.05,max_iter=700,random_state=SEED,early_stopping=True).fit(sc.transform(X),Y);lin=Ridge(alpha=5).fit(sc.transform(X),Y)
layers=[dict(weight=rounded(w.T.ravel(),8),bias=rounded(b,8),activation='tanh' if j<len(reg.coefs_)-1 else 'linear') for j,(w,b) in enumerate(zip(reg.coefs_,reg.intercepts_))];models['s4']=dict(name='well-constrained-waveform-mlp',mean=rounded(sc.mean_,12),scale=rounded(sc.scale_,12),layers=layers,linear=dict(weight=rounded(lin.coef_,8),bias=float(lin.intercept_)))
records=[]
for name in testW:
    v=wells[name];n=min(220,len(v['signal']));start=max(0,(len(v['signal'])-n)//2);sl=slice(start,start+n)
    records.append(dict(id=name.replace('_','/'),well=name,w=1,h=n,signal=rounded(v['signal'][sl]),prior=rounded(v['prior'][sl]),features=rounded(v['features'][sl],10),reference=rounded(v['reference'][sl]),depth=rounded(v['depth'][sl],3),time=rounded(v['time'][sl],3),expected=rounded(reg.predict(sc.transform(v['features'][sl])),7),source=name+'.las',license='NLOD 2.0 raw logs',kind='field-log-derived-response',scope='实测井曲线＋简化派生响应；整井留出，不代表实际井震反演验证',coordinateSystem='MD in m; relative two-way time in ms from top of continuous valid interval; 2 ms grid'))
data['s4']=dict(records=records,counts=dict(trainWells=3,testWells=3,trainingSamples=len(Y)),split=dict(train=trainW,test=testW),assumptions='Vp=304800/DTC (m/s); rho in g/cm3; normal-incidence 1-D reflectivity; 25 Hz Ricker; dt=2 ms; 36 ms low-frequency impedance prior; NPHI target excluded from all inputs.')
audit['datasets']['s4']=dict(wells={k:{x:v for x,v in w.items() if x in ['rawRows','validRows','usedRows']} for k,w in wells.items()},trainingLoss=float(reg.loss_),target='NPHI apparent neutron porosity, m3/m3',excluded='Missing or outside DTC 40..220 us/ft, RHOB 1.4..3.2 g/cm3, NPHI 0..0.6; use longest consecutive valid interval, no filling across gaps.')

print('S5: full-resolution F3 crops, controlled noise, residual CNN.',flush=True)
rng=np.random.default_rng(SEED+5);torch.manual_seed(SEED+5)
f3_noise={i:np.clip(np.asarray(Image.open(RAW/f'f3-inline-{i}.tiff'),dtype='f4')/15000,-3,3) for i in train+check+test}
X=[];Y=[]
for i in train:
    a=f3_noise[i]
    for j in range(18):
        y=rng.integers(0,len(a)-48);x=rng.integers(0,a.shape[1]-64);ref=a[y:y+48,x:x+64];noise=rng.normal(0,rng.uniform(.08,.4),ref.shape).astype('f4');X.append((ref+noise)[None]);Y.append(noise[None])
validation=f3_noise[440][180:308,300:460];noise=rng.normal(0,.2,validation.shape).astype('f4');net=make_net(2,1,10,1);history=fit(net,X,Y,nn.MSELoss(),201,batch=6,lr=.002,val=((validation+noise)[None,None],noise[None,None]));models['s5']=export_net(net,'small-residual-denoising-cnn');records=[]
for j,i in enumerate(test):
    a=f3_noise[i][180:308,300:460];noise=np.random.default_rng(SEED+500+j).normal(size=a.shape).astype('f4');records.append(dict(id=f'F3-NOISE-IL-{i}',inline=i,w=a.shape[1],h=a.shape[0],origin=[180,300],signal=rounded(a.ravel()),unitNoise=rounded(noise.ravel()),seed=SEED+500+j,expected=expected(net,(a+.2*noise)[None,None]),source=f'f3-inline-{i}.tiff',license='CC BY 4.0 source; controlled noise derivative',kind='field-controlled-noise',scope='全分辨率F3窗口；原剖面不是无噪真值，只测受控加噪的去除与相对保真',coordinateSystem='Full-resolution source TIFF crop: rows 180..307, columns 300..459; original image-pixel coordinates, no decimation'))
data['s5']=dict(records=records,counts=dict(trainInlines=8,checkInlines=1,testInlines=3,trainingWindows=len(X)),split=dict(train=train,check=check,test=test))
audit['datasets']['s5']=dict(loss=history,modelSeed=SEED+5,selection='Full-resolution 128x160 crop at source row 180, column 300; deliberately separate from decimated S2 classification overview.',noise='Independent zero-mean Gaussian noise, training sigma .08.. .4; browser multiplies saved independent unit-noise arrays by its actual slider setting.',reference='Field F3 image remains a noisy processed reference, not a clean ground truth.')

for key,model in models.items():model['sha256']=hashlib.sha256(json.dumps(model,sort_keys=True).encode()).hexdigest()
payload=json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False);model_payload=json.dumps(models,ensure_ascii=False,separators=(',',':'),allow_nan=False)
(OUT/'data.js').write_text('(function(g){g.SEISMIC_DATA='+payload+';})(window);\n',encoding='utf8',newline='\n');(OUT/'models.js').write_text('(function(g){g.SEISMIC_MODELS='+model_payload+';})(window);\n',encoding='utf8');audit['dataSHA256']=hashlib.sha256(payload.encode()).hexdigest();audit['modelSHA256']={k:v['sha256'] for k,v in models.items()};(OUT/'provenance.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8',newline='\n');print('Saved',len(payload),'data bytes and',len(model_payload),'model bytes.',flush=True)
