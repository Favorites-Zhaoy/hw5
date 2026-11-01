"""Export frozen V1 weights, then verify every held-out input with ORT CPU.

No training or test-set tuning occurs here. M5 uses batch=1 without padding;
this is equivalent to the original packed GRU at the actual sentence length.
"""
import ast
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
import onnx
import onnxruntime as ort
import torch
from torch import nn
from torch.nn import functional as F

HERE = Path(__file__).resolve().parent
OUT = HERE / 'browser-models'
OUT.mkdir(exist_ok=True)
source = ast.parse((HERE / 'prepare-experiments.py').read_text(encoding='utf-8'))
classes = [n for n in source.body if isinstance(n, ast.ClassDef)]
exec(compile(ast.Module(body=classes, type_ignores=[]), '<frozen-architecture>', 'exec'))
torch.set_num_threads(2)


class SingleText(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, x):
        _, h = self.model.gru(self.model.embedding(x))
        return self.model.head(torch.cat([h[-2], h[-1]], 1)).softmax(1)


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def export(case):
    data = json.loads((HERE / 'experiments' / (case + '.json')).read_text(encoding='utf-8'))
    checkpoint = HERE / 'checkpoints' / (case + '.pt')
    assert sha(checkpoint) == data['weightsSha256']
    inputs = []
    if case == 'm3':
        model = UNet()
        for r in data['records']:
            raw = np.array(Image.open(HERE / 'experiments/m3-images' / (r['id'] + '.png')))
            x = np.clip(raw.astype(np.float32) / 255 / r['exposureEstimate'], 0, 1).transpose(2, 0, 1)[None]
            inputs.append(x)
    elif case == 'm5':
        model = TextGRU(len(data['vocabulary']) + 2)
        inputs = [np.array([[data['vocabulary'].get(c, 1) for c in r['note'][:96]]], dtype=np.int64) for r in data['records']]
    else:
        model = Temporal(6 if case == 'm2' else 5, k=3 if case == 'm2' else 5, causal=case == 'm2')
        mean = np.array(data['normalization']['mean'], dtype=np.float32)[:, None]
        std = np.array(data['normalization']['std'], dtype=np.float32)[:, None]
        for r in data['records']:
            x = np.stack([np.log1p(r['gas']), r['c2'], r['c3'], r['alignedPump'], np.array(r['flow']) / 24, np.array(r['rop']) / 15]) if case == 'm2' else np.stack([np.log(r['drillTime']), np.array(r['wob']) / 85, np.array(r['rpm']) / 110, np.array(r['flow']) / 25, np.array(r['footage']) / 1000])
            inputs.append(((x.astype(np.float32) - mean) / std)[None])
    model.load_state_dict(torch.load(checkpoint, map_location='cpu', weights_only=True))
    model.eval()
    wrapper = SingleText(model).eval() if case == 'm5' else model
    target = OUT / (case + '.onnx')
    dynamic = {'input': {1: 'characters'}} if case == 'm5' else None
    torch.onnx.export(wrapper, torch.from_numpy(inputs[0]), target, input_names=['input'], output_names=['output'], opset_version=17, dynamo=False, dynamic_axes=dynamic)
    onnx.checker.check_model(str(target))
    session = ort.InferenceSession(str(target), providers=['CPUExecutionProvider'])
    max_error = 0.0
    decisions_equal = True
    for x, r in zip(inputs, data['records']):
        with torch.no_grad():
            reference = wrapper(torch.from_numpy(x)).numpy()
        actual = session.run(None, {'input': x})[0]
        max_error = max(max_error, float(np.max(np.abs(reference - actual))))
        assert np.allclose(actual, reference, atol=3e-5), (case, r['id'], max_error)
        if case == 'm5':
            decisions_equal &= int(actual.argmax()) == r['prediction']
    assert decisions_equal
    return dict(file=target.name, sha256=sha(target), checkpointSha256=sha(checkpoint), bytes=target.stat().st_size,
                testInputs=len(inputs), maxAbsoluteError=max_error, inputDtype='int64' if case == 'm5' else 'float32',
                output='probabilities' if case == 'm5' else 'logits', architecture=data['method']['model'],
                scope='Original synthetic teaching distribution; no field-performance claim.',
                testOutputChecksum=hashlib.sha256(b''.join(session.run(None, {'input': x})[0].tobytes() for x in inputs)).hexdigest())


if __name__ == '__main__':
    manifest = dict(version='2.0.0', opset=17, torch=torch.__version__, onnxruntime=ort.__version__, models={})
    for case in ['m2', 'm3', 'm4', 'm5']:
        manifest['models'][case] = export(case)
        print(case, manifest['models'][case], flush=True)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
