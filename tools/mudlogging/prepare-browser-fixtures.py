"""Small cross-browser fixtures, independently evaluated by ONNX Runtime CPU."""
import base64
import json
from pathlib import Path
import numpy as np
from PIL import Image
import onnxruntime as ort

HERE=Path(__file__).resolve().parent
manifest=json.loads((HERE/'browser-models/manifest.json').read_text(encoding='utf-8'))
cases=[]
m3=json.loads((HERE/'experiments/m3.json').read_text(encoding='utf-8'))
session=ort.InferenceSession(str(HERE/'browser-models/m3.onnx'),providers=['CPUExecutionProvider'])
sample=m3['records'][2]
raw=np.array(Image.open(HERE/'experiments/m3-images'/(sample['id']+'.png'))).astype('float64')
for exposure,correct in [(1,True),(1.7,False)]:
    image=np.clip(np.round(raw*exposure),0,255)
    estimate=image[59:63,3:15].mean()/255/.8 if correct else 1
    x=np.clip(image/255/estimate,0,1).transpose(2,0,1)[None].astype('float32')
    logits=session.run(None,{'input':x})[0]
    probability=(1/(1+np.exp(-logits))).astype('float32')
    cases.append(dict(name=f'M3 {sample["id"]}: exposure={exposure}, correction={correct}',model='m3',dtype='float32',dims=list(x.shape),input=base64.b64encode(x.tobytes()).decode(),expected=base64.b64encode(probability.tobytes()).decode(),sigmoid=True,tolerance=1e-5))
m5=json.loads((HERE/'experiments/m5.json').read_text(encoding='utf-8'))
session=ort.InferenceSession(str(HERE/'browser-models/m5.onnx'),providers=['CPUExecutionProvider'])
failure=next(r for r in m5['records'] if r['prediction']!=r['truth'])
notes=[m5['records'][0]['note'],'井段2400—2410m，全烃峰值1.20%，接单根停泵后恢复钻进，未见气测异常。',failure['note']]
for note in notes:
    x=np.array([[m5['vocabulary'].get(c,1) for c in note[:96]]],dtype='int64');expected=session.run(None,{'input':x})[0]
    cases.append(dict(name='M5 '+note,model='m5',dtype='int64',dims=list(x.shape),input=x.ravel().tolist(),expected=base64.b64encode(expected.astype('float32').tobytes()).decode(),sigmoid=False,tolerance=2e-6))
target=HERE.parent/'browser-fixtures.js'
target.write_text('window.PETRO_BROWSER_FIXTURES='+json.dumps(dict(models={k:manifest['models'][k]['sha256'] for k in ['m3','m5']},cases=cases),ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('fixtures',len(cases),target.stat().st_size)

# Independent preprocessing fixture used by the actual-page DOM regression.
rgba=np.array(Image.open(HERE/'experiments/m3-images'/(sample['id']+'.png')).convert('RGBA'))
prepared=[]
import hashlib
for exposure,correct in [(1,True),(1.8,False)]:
    pixels=np.clip(np.floor(rgba[:,:,:3].astype('float64')*exposure+.5),0,255)
    estimate=pixels[59:63,3:15].mean()/255/.8 if correct else 1
    x=np.clip(pixels/255/estimate,0,1).astype('float32')
    yy,xx=np.mgrid[:64,:64];roi=(xx-31.5)**2+(yy-29)**2<27**2
    v=x.astype('float64');mask=(roi&(v[:,:,0]>.4)&(v[:,:,1]>.45)&(v[:,:,0]>1.25*v[:,:,2])).astype('uint8')
    prepared.append(dict(exposure=exposure,correct=correct,estimate=float(estimate),inputSha256=hashlib.sha256(x.transpose(2,0,1).copy().tobytes()).hexdigest(),baselineSha256=hashlib.sha256(mask.ravel().tobytes()).hexdigest(),roiCount=int(roi.sum())))
(HERE/'browser-models/m3-preprocess.json').write_text(json.dumps(dict(sampleId=sample['id'],rgba=base64.b64encode(rgba.tobytes()).decode(),cases=prepared),separators=(',',':')),encoding='utf-8')
