"""Reproducible fixed ResNet-18 transfer experiment; no network call at site runtime.

Original JPEGs and splits are immutable. A frozen ImageNet encoder is followed
by a standardized, class-balanced multinomial logistic classification head.
Each training query is predicted by a head fitted without its entire 20 m group.
The held-out set uses the head fitted on all 42 training images.
"""
import base64
import hashlib
import io
import json
import sys
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / '.artifacts' / 'm1-resnet'
WORK.mkdir(parents=True, exist_ok=True)
# Read the tracked immutable dataset directly, so a fresh clone is reproducible.
export_js = "const fs=require('fs'),vm=require('vm'),c={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),c);process.stdout.write(JSON.stringify(c.window.M1_DATA));"
DATA = json.loads(subprocess.check_output(['node', '-e', export_js, str(ROOT / 'tools/m1/runtime/data.js')], text=True, encoding='utf-8'))
SAMPLES = DATA['samples']
CLASSES = [c['id'] for c in DATA['classes']]
images, audit = [], {}
for sample in SAMPLES:
    raw = base64.b64decode(sample['image'].split(',')[1])
    assert hashlib.sha256(raw).hexdigest() == sample['sha256']
    with Image.open(io.BytesIO(raw)) as im:
        image = im.convert('RGB')
    width, height = image.size
    roi = [round(width * .14), round(height * .14), round(width * .86), round(height * .86)]
    gray = np.asarray(image.convert('L'), dtype=np.float32)
    audit[sample['id']] = dict(width=width, height=height, bytes=len(raw), roi=roi,
        brightness=round(float(gray.mean()), 2), contrast=round(float(gray.std()), 2),
        histogram=np.bincount((gray.astype(np.uint8) // 16).ravel(), minlength=16).tolist())
    images.append(image.crop(roi).resize((224, 224), Image.Resampling.BILINEAR))
(ROOT / 'tools/m1/runtime/data-audit.json').write_text(json.dumps(audit, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('AUDIT: original bytes, dimensions and source metadata verified for 66 images', flush=True)
if '--audit-only' in sys.argv:
    raise SystemExit(0)

import torch
import torchvision
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.preprocessing import StandardScaler
from torchvision.models import ResNet18_Weights, resnet18

torch.set_num_threads(4)
torch.manual_seed(42)
np.random.seed(42)
weights = ResNet18_Weights.IMAGENET1K_V1
net = resnet18(weights=weights).eval()
for parameter in net.parameters():
    parameter.requires_grad_(False)
encoder = torch.nn.Sequential(*list(net.children())[:-2])
mean = np.asarray([.485, .456, .406], dtype=np.float32)[:, None, None]
std = np.asarray([.229, .224, .225], dtype=np.float32)[:, None, None]
tensors = torch.from_numpy(np.stack([(np.asarray(im, dtype=np.float32).transpose(2, 0, 1) / 255 - mean) / std for im in images]))
maps = []
with torch.no_grad():
    for start in range(0, len(SAMPLES), 6):
        maps.append(encoder(tensors[start:start + 6]).numpy())
        print('ENCODE:', min(start + 6, len(SAMPLES)), '/', len(SAMPLES), flush=True)
maps = np.concatenate(maps)
features = maps.mean(axis=(2, 3)).astype(np.float64)
labels = np.asarray([CLASSES.index(s['classId']) for s in SAMPLES])
train = np.asarray([i for i, s in enumerate(SAMPLES) if s['split'] == 'reference'])
test = np.asarray([i for i, s in enumerate(SAMPLES) if s['split'] == 'test'])
groups = sorted({SAMPLES[i]['group'] for i in train})
records, folds, heads = {}, [], {}

def fit(indices):
    scale = StandardScaler().fit(features[indices])
    head = LogisticRegression(C=1., class_weight='balanced', max_iter=2000,
        tol=1e-7, solver='lbfgs', random_state=42).fit(scale.transform(features[indices]), labels[indices])
    assert head.classes_.tolist() == [0, 1, 2]
    return scale, head

def predict(indices, reference, fold):
    scale, head = fit(reference)
    heads[fold + '_weight'] = head.coef_ / scale.scale_[None, :]
    heads[fold + '_bias'] = head.intercept_ - (head.coef_ * scale.mean_[None, :] / scale.scale_[None, :]).sum(axis=1)
    scores = head.predict_proba(scale.transform(features[indices]))
    for n, index in enumerate(indices):
        effective = head.coef_ / scale.scale_[None, :]
        response = np.maximum(np.einsum('ck,khw->chw', effective, maps[index]), 0)
        peaks = response.max(axis=(1, 2), keepdims=True)
        encoded = np.rint(response / np.maximum(peaks, 1e-12) * 255).astype(np.uint8)
        # Verify the class activation calculation against actual autograd.
        if index == int(train[0]):
            layer = torch.tensor(maps[index:index+1], dtype=torch.float64, requires_grad=True)
            logits = torch.nn.functional.linear(layer.mean((2, 3)), torch.tensor(effective), torch.tensor(heads[fold + '_bias']))
            grad = torch.autograd.grad(logits[0, 0], layer)[0]
            direct = torch.relu((grad.mean((2, 3), keepdim=True) * layer).sum(1))[0].detach().numpy()
            direct = np.rint(direct / max(float(direct.max()), 1e-12) * 255).astype(np.uint8)
            assert np.abs(direct.astype(int) - encoded[0].astype(int)).max() <= 1
        sample = SAMPLES[index]
        records[sample['id']] = dict(sha256=sample['sha256'],
            scores=[round(float(v), 8) for v in scores[n]],
            prediction=CLASSES[int(scores[n].argmax())],
            cam=base64.b64encode(encoded.tobytes()).decode('ascii'),
            fold=fold, fitCount=len(reference))
    return scores

for group in groups:
    query = [int(i) for i in train if SAMPLES[i]['group'] == group]
    reference = [int(i) for i in train if SAMPLES[i]['group'] != group]
    predict(query, reference, group)
    folds.append(dict(group=group, queryIds=[SAMPLES[i]['id'] for i in query], fitIds=[SAMPLES[i]['id'] for i in reference]))
    print('FOLD:', group, 'fit', len(reference), 'predict', len(query), flush=True)
predict(test.tolist(), train.tolist(), 'holdout')
def metric(indices):
    truth = labels[indices]
    prediction = [CLASSES.index(records[SAMPLES[i]['id']]['prediction']) for i in indices]
    return dict(count=len(indices), accuracy=round(float(accuracy_score(truth, prediction)), 8),
        macroF1=round(float(f1_score(truth, prediction, average='macro', zero_division=0)), 8),
        matrix=confusion_matrix(truth, prediction, labels=[0, 1, 2]).tolist())

weight_file = Path(torch.hub.get_dir()) / 'checkpoints' / weights.url.rsplit('/', 1)[1]
result = dict(version='2.0.0', sourceCommit=DATA['source']['commit'], classes=CLASSES,
    method=dict(backbone='ResNet-18', weights='IMAGENET1K_V1', weightsUrl=weights.url,
        weightsSha256=hashlib.sha256(weight_file.read_bytes()).hexdigest(),
        encoderFrozen=True, head='StandardScaler + multinomial logistic regression',
        C=1, classWeight='balanced', seed=42, maxIter=2000, tolerance=1e-7,
        input=[224, 224], roiFraction=.72, mean=[.485, .456, .406], std=[.229, .224, .225],
        cam='Grad-CAM on layer4; class logit gradients; independent image/class normalization; uint8 7x7',
        torch=torch.__version__, torchvision=torchvision.__version__),
    folds=folds, metrics=dict(validation=metric(train), test=metric(test)), samples=records)
(ROOT / 'tools/m1/runtime/resnet-results.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
np.savez_compressed(WORK / 'features-and-heads.npz', features=features, maps=maps, **heads)
print(json.dumps(result['metrics'], ensure_ascii=False), flush=True)
print('DONE: measured class scores and class-specific maps saved; source labels unchanged', flush=True)
