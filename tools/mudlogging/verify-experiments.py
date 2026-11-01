"""Check saved model inference without fitting, choosing epochs or modifying results."""
import base64
import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
import torch

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('fixed_experiment', HERE / 'prepare-experiments.py')
experiment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(experiment)


def load(case, model):
    data = json.loads((HERE / 'experiments' / f'{case}.json').read_text(encoding='utf-8'))
    weight = HERE / 'checkpoints' / f'{case}.pt'
    assert experiment.sha(weight) == data['weightsSha256']
    assert experiment.sha(HERE / 'prepare-experiments.py') == data['generatorSha256']
    model.load_state_dict(torch.load(weight, map_location='cpu', weights_only=True))
    model.eval()
    return data


results = {}
with torch.no_grad():
    for case, channels, kernel, causal in [('m2', 6, 3, True), ('m4', 5, 5, False)]:
        model = experiment.Temporal(channels, k=kernel, causal=causal)
        data = load(case, model)
        inputs = []
        for r in data['records']:
            if case == 'm2':
                inputs.append(np.stack([np.log1p(r['gas']), r['c2'], r['c3'], r['alignedPump'], np.array(r['flow']) / 24, np.array(r['rop']) / 15]))
            else:
                inputs.append(np.stack([np.log(r['drillTime']), np.array(r['wob']) / 85, np.array(r['rpm']) / 110, np.array(r['flow']) / 25, np.array(r['footage']) / 1000]))
        x = np.array(inputs, dtype=np.float32)
        mean = np.array(data['normalization']['mean'], dtype=np.float32)[None, :, None]
        std = np.array(data['normalization']['std'], dtype=np.float32)[None, :, None]
        output = model(torch.tensor((x - mean) / std)).softmax(1).numpy().transpose(0, 2, 1)
        saved = np.array([r['scores'] for r in data['records']])
        # The exported source channels were rounded to four decimals. Require
        # both close scores and exactly the same final decisions after filtering.
        maximum = float(np.abs(output - saved).max())
        assert maximum < .003, (case, maximum)
        for r, p in zip(data['records'], output):
            labels = p.argmax(1)
            if case == 'm4':
                labels = experiment.clean_runs(labels)
            assert np.array_equal(labels, r['prediction']), r['id']
        results[case] = dict(records=len(output), maxScoreDifference=maximum, decisions='identical')

    model = experiment.UNet()
    data = load('m3', model)
    images = []
    for r in data['records']:
        image = HERE / 'experiments/m3-images' / Path(r['image']).name
        assert experiment.sha(image) == r['imageSha256']
        raw = np.array(Image.open(image), dtype=np.float32)
        images.append(np.clip(raw / 255 / r['exposureEstimate'], 0, 1).transpose(2, 0, 1))
    output = (model(torch.tensor(np.array(images))).sigmoid()[:, 0].numpy() * 255).round().astype('uint8')
    saved = np.array([np.frombuffer(base64.b64decode(r['probability']), dtype='uint8').reshape(64, 64) for r in data['records']])
    assert np.array_equal(output, saved), 'PNG-to-U-Net scores changed'
    results['m3'] = dict(records=len(output), quantizedPixelScores='identical')

    data = json.loads((HERE / 'experiments/m5.json').read_text(encoding='utf-8'))
    model = experiment.TextGRU(len(data['vocabulary']) + 2)
    data = load('m5', model)
    lengths = torch.tensor([min(len(r['note']), 96) for r in data['records']])
    x = np.zeros((len(lengths), 96), dtype='int64')
    for i, r in enumerate(data['records']):
        x[i, :lengths[i]] = [data['vocabulary'].get(c, 1) for c in r['note'][:96]]
    output = model(torch.tensor(x), lengths).softmax(1).numpy()
    saved = np.array([r['scores'] for r in data['records']])
    maximum = float(np.abs(output - saved).max())
    assert maximum < .000002
    assert np.array_equal(output.argmax(1), [r['prediction'] for r in data['records']])
    results['m5'] = dict(records=len(output), maxScoreDifference=maximum, decisions='identical')

print(json.dumps(results, ensure_ascii=False, indent=2))
