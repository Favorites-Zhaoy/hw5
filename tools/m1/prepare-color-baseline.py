"""Fixed conventional-vision comparison; same photos, crops and groups as the CNN."""
import base64
import hashlib
import io
import json
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
export = "const fs=require('fs'),vm=require('vm'),c={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),c);process.stdout.write(JSON.stringify(c.window.M1_DATA));"
data = json.loads(subprocess.check_output(['node', '-e', export, str(ROOT / 'tools/m1/runtime/data.js')], text=True, encoding='utf-8'))
samples = data['samples']
classes = [c['id'] for c in data['classes']]
features = []
for sample in samples:
    raw = base64.b64decode(sample['image'].split(',')[1])
    assert hashlib.sha256(raw).hexdigest() == sample['sha256']
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    w, h = im.size
    pixels = np.asarray(im.crop((round(.14*w), round(.14*h), round(.86*w), round(.86*h))).resize((224, 224), Image.Resampling.BILINEAR))
    features.append(np.concatenate([np.bincount((pixels[:, :, c] // 64).ravel(), minlength=4) / (224*224) for c in range(3)]))
x = np.asarray(features)
y = np.asarray([classes.index(s['classId']) for s in samples])
train = [i for i, s in enumerate(samples) if s['split'] == 'reference']
test = [i for i, s in enumerate(samples) if s['split'] == 'test']
records, folds = {}, []
def predict(query, fit, group):
    centers = np.asarray([x[[i for i in fit if y[i] == c]].mean(0) for c in range(3)])
    for i in query:
        distance = np.square(centers - x[i]).sum(1)
        s = samples[i]
        records[s['id']] = dict(sha256=s['sha256'], prediction=classes[int(distance.argmin())],
            distances=[round(float(v), 8) for v in distance], histogram=[round(float(v), 8) for v in x[i]],
            fold=group, fitCount=len(fit))
for group in sorted({samples[i]['group'] for i in train}):
    fit = [i for i in train if samples[i]['group'] != group]
    query = [i for i in train if samples[i]['group'] == group]
    predict(query, fit, group)
    folds.append(dict(group=group, fitIds=[samples[i]['id'] for i in fit], queryIds=[samples[i]['id'] for i in query]))
predict(test, train, 'holdout')
def metrics(indices):
    matrix = np.zeros((3, 3), dtype=int)
    for i in indices:
        matrix[y[i], classes.index(records[samples[i]['id']]['prediction'])] += 1
    f1 = []
    for c in range(3):
        tp = matrix[c, c]
        denominator = matrix[c].sum() + matrix[:, c].sum()
        f1.append(float(2*tp/denominator) if denominator else 0)
    return dict(count=len(indices), accuracy=round(float(np.trace(matrix)/len(indices)), 8),
        macroF1=round(float(np.mean(f1)), 8), matrix=matrix.tolist())
result = dict(version='3.0.0', sourceCommit=data['source']['commit'], classes=classes,
    method=dict(name='RGB histogram nearest class centroid', dimensions=12, binsPerChannel=4,
        distance='squared Euclidean', roiFraction=.72, input=[224,224],
        note='Conventional image-feature baseline, not measured human expert performance; no test-based selection.'),
    folds=folds, metrics=dict(validation=metrics(train), test=metrics(test)), samples=records)
(ROOT / 'tools/m1/runtime/color-baseline.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(json.dumps(result['metrics']))

provenance_path = ROOT / 'm1-cuttings-case/provenance.json'
if provenance_path.exists():
    provenance = json.loads(provenance_path.read_text(encoding='utf-8'))
    provenance['conventionalComparison'] = dict(version=result['version'], method=result['method'], metrics=result['metrics'],
        protocol='Same original photos, center crop, 224 RGB resize, outer split and group-exclusion folds as the CNN; not a human-performance measurement.')
    provenance_path.write_text(json.dumps(provenance, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
