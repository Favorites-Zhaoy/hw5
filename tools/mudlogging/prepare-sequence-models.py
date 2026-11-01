"""TS assignments: causal GRU gas forecasting and ordered LSTM ROP regression.

Retains the original sensor rows, chronological / well splits and historical
models. Fixed settings are chosen before evaluation, never from test outcomes.
Windows stop at gaps and never read records after their prediction target.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.nn.utils.rnn import pack_padded_sequence

HERE = Path(__file__).resolve().parent
torch.set_num_threads(2)
torch.use_deterministic_algorithms(True)
torch.backends.mkldnn.enabled = False
WINDOW = 12


def sha_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def transform(values, case):
    a = np.asarray(values, dtype='float64')
    if case == 'm2':
        return np.stack([np.log1p(a[:, 0]*1000), a[:, 1]/30, np.maximum(a[:, 2], 0)/100,
                         a[:, 3]/60, np.log1p(np.maximum(a[:, 4], 0)), np.log1p(np.maximum(a[:, 5], 0))], 1).astype('float32')
    return np.stack([np.log1p(a[:, 0]), a[:, 1]/100, np.log1p(a[:, 2]), a[:, 3]/30], 1).astype('float32')


class SequenceModel(nn.Module):
    def __init__(self, cell, width, hidden, output):
        super().__init__()
        self.rnn = (nn.GRU if cell == 'gru' else nn.LSTM)(width, hidden, batch_first=True)
        self.head = nn.Linear(hidden, output)

    def forward(self, x, lengths):
        _, state = self.rnn(pack_padded_sequence(x, lengths.cpu(), batch_first=True, enforce_sorted=False))
        hidden = state[0] if isinstance(state, tuple) else state
        return self.head(hidden[-1])


def prepare(case):
    original_file = HERE/'real-data'/f'{case}.json'
    data = json.loads(original_file.read_text(encoding='utf-8'))
    rows, by_well, positions = [], {}, {}
    for r in data['records']:
        for i in range(len(r['depth'])):
            ordinal = len(by_well.setdefault(r['well'], []))
            if case == 'm2':
                axis = int(np.datetime64(r['timeUTC'][i].replace('+00:00', ''), 's').astype('int64'))
                values = [r[k][i] for k in ['gas', 'flow', 'wob', 'rpm', 'torque', 'rop']]
                source_id = r['well']+':UTC:'+r['timeUTC'][i]
                split = r['split']
            else:
                axis = r['depth'][i]
                values = [r[k][i] for k in ['wob', 'rpm', 'torque', 'flow']]
                source_id = r['rawRowIds'][i]
                split = 'test' if r['well']=='15/9-F-5' else 'train' if ordinal<794 else 'validation'
            positions[(r['id'], i)] = len(rows)
            by_well[r['well']].append(len(rows))
            rows.append(dict(record=r['id'], index=i, axis=axis, values=values, sourceId=source_id, well=r['well'], split=split, rop=r['rop'][i]))

    gap = 60 if case=='m2' else 2
    sequences = [None]*len(rows)
    for indices in by_well.values():
        start = 0
        for n, index in enumerate(indices):
            if n and rows[index]['axis']-rows[indices[n-1]]['axis']>gap:
                start = n
            end = n if case=='m2' else n+1
            sequences[index] = indices[max(start, end-WINDOW):end]
            if case=='m2' and n==start:
                sequences[index] = []

    raw_values = [r['values'] for r in rows]
    features = transform(raw_values, case)
    fit_mask = np.array([r['split']=='train' for r in rows])
    mean, std = features[fit_mask].mean(0), features[fit_mask].std(0).clip(.001)
    z = ((features-mean)/std).astype('float32')
    targets = z if case=='m2' else np.log(np.array([r['rop'] for r in rows], dtype='float32'))[:, None]
    valid = [i for i, seq in enumerate(sequences) if seq]
    lengths = torch.tensor([len(sequences[i]) for i in valid], dtype=torch.int64)
    x = np.zeros((len(valid), WINDOW, z.shape[1]), dtype='float32')
    for n, i in enumerate(valid):
        x[n, :len(sequences[i])] = z[sequences[i]]
    xt, yt = torch.from_numpy(x), torch.from_numpy(targets[valid])
    train = torch.tensor([rows[i]['split']=='train' for i in valid])
    settings = dict(seed=1722 if case=='m2' else 1724, epochs=120 if case=='m2' else 180, learningRate=.004,
                    cellType='gru' if case=='m2' else 'lstm', hiddenSize=12, window=WINDOW, maxGap=gap,
                    includeCurrent=case=='m4', selection='Fixed before evaluation; no validation/test hyperparameter selection.')
    torch.manual_seed(settings['seed'])
    net = SequenceModel(settings['cellType'], z.shape[1], 12, targets.shape[1])
    if case=='m4':
        nn.init.constant_(net.head.bias, float(yt[train].mean()))
    optimizer = torch.optim.Adam(net.parameters(), lr=settings['learningRate'])
    for epoch in range(settings['epochs']):
        optimizer.zero_grad()
        loss = nn.functional.mse_loss(net(xt[train], lengths[train]), yt[train])
        loss.backward()
        nn.utils.clip_grad_norm_(net.parameters(), 1)
        optimizer.step()
        if (epoch+1)%40==0:
            print(case, 'epoch', epoch+1, 'trainingMSE', round(loss.item(), 6), flush=True)
    net.eval()
    with torch.no_grad():
        predicted = net(xt, lengths).numpy()

    predictions = [None]*len(rows)
    errors = [None]*len(rows)
    for n, i in enumerate(valid):
        predictions[i] = predicted[n].tolist()
        errors[i] = float(np.sqrt(((predicted[n]-targets[i])**2).mean()))
    payload = dict(kind='gru-forecast' if case=='m2' else 'lstm-rop', domain='ts', name=f'Volve-{case}-{settings["cellType"].upper()}-2.0.2',
                   **settings, inputSize=z.shape[1], mean=mean.tolist(), std=std.tolist(),
                   cell={k: getattr(net.rnn, v).detach().numpy().tolist() for k, v in [('weightIH','weight_ih_l0'),('weightHH','weight_hh_l0'),('biasIH','bias_ih_l0'),('biasHH','bias_hh_l0')]},
                   head=dict(weight=net.head.weight.detach().numpy().tolist(), bias=net.head.bias.detach().numpy().tolist()),
                   output='next-minute six standardized channels' if case=='m2' else 'current log(ROP_mh), conditioned on ordered operating history',
                   backend='Actual causal recurrent-cell forward in browser JavaScript', framework='PyTorch '+torch.__version__)
    metrics = {}
    for split in sorted(set(rows[i]['split'] for i in valid)):
        ids = [i for i in valid if rows[i]['split']==split]
        if case=='m2':
            persistence = [float(np.sqrt(((z[sequences[i][-1]]-targets[i])**2).mean())) for i in ids]
            metrics[split] = dict(count=len(ids), meanPredictionRMS=float(np.mean([errors[i] for i in ids])),
                                  meanPersistenceRMS=float(np.mean(persistence)), definition='Mean per-minute six-channel RMS in training-standardized space, not event accuracy.')
        else:
            observed = np.array([rows[i]['rop'] for i in ids])
            estimated = np.exp([predictions[i][0] for i in ids])
            reference = data['model']['heldoutROP']['constantTrainMedian_mh']
            metrics[split] = dict(count=len(ids), mae_mh=float(np.abs(estimated-observed).mean()), constantTrainMedian_mh=reference,
                                  constantMAE_mh=float(np.abs(reference-observed).mean()), definition='Observed ROP on the same frozen well/depth split, not geological boundary accuracy.')
    payload['metrics'] = metrics
    if case=='m2':
        payload.update(thresholdTrainingP95=float(np.quantile([errors[i] for i in valid if rows[i]['split']=='train'], .95)),
                       trainingDays=data['model']['trainingDays'], validationDay=data['model']['validationDay'], testDay=data['model']['testDay'])
        data['label_origin'] = 'No independent gas-event labels. GRU prediction residual is not an oil/gas discovery.'
    else:
        payload.update(trainingWell='15/9-F-1-C', trainRows=794, validationRows=265, testWell='15/9-F-5', heldoutROP=metrics['test'], validationROP=metrics['validation'])

    checkpoint = HERE/'checkpoints'/f'{case}-{settings["cellType"]}-real.pt'
    torch.save(dict(state_dict=net.state_dict(), settings=settings, mean=mean, std=std), checkpoint)
    payload['checkpointSha256'] = sha_file(checkpoint)
    payload['sha256'] = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    for r in data['records']:
        first = positions[(r['id'], 0)]
        indices = by_well[r['well']]
        first_n = indices.index(first)
        prior = indices[max(0, first_n-WINDOW):first_n]
        r['sequenceContext'] = [dict(axis=rows[i]['axis'], values=rows[i]['values'], sourceId=rows[i]['sourceId']) for i in prior]
        seq_indices = [positions[(r['id'], i)] for i in range(len(r['depth']))]
        r['sequenceLength'] = [len(sequences[i]) for i in seq_indices]
        if case=='m2':
            r['predictionError'] = [None if errors[i] is None else round(errors[i], 8) for i in seq_indices]
            r.pop('novelty', None)
        else:
            r['predictedROP'] = [round(float(np.exp(predictions[i][0])), 8) for i in seq_indices]
    original = json.loads(original_file.read_text(encoding='utf-8'))
    preparation = dict(script='tools/mudlogging/prepare-sequence-models.py', scriptSha256=sha_file(Path(__file__)), sourceDatasetSha256=sha_file(original_file),
                       chronology='Only earlier observations enter M2; M4 includes current operating fields and earlier depth records. Never future rows. Stop at gaps, no interpolation.',
                       normalizationIds=[r['sourceId'] for r in rows if r['split']=='train'],
                       fitIds=[r['sourceId'] for i, r in enumerate(rows) if r['split']=='train' and sequences[i]], validationIds=[r['sourceId'] for r in rows if r['split']=='validation'],
                       testIds=[r['sourceId'] for r in rows if r['split'] in ['test','chronological-test']])
    fixtures = []
    for i in [valid[n] for n in np.linspace(0, len(valid)-1, 10, dtype=int)]:
        fixtures.append(dict(recordId=rows[i]['record'], index=rows[i]['index'], inputIds=[rows[j]['sourceId'] for j in sequences[i]], output=predictions[i]))
    data.update(version='2.0.2', model=payload, modelSha256=payload['sha256'], modelPreparation=preparation, sequenceFixtures=fixtures,
                historicalModel=dict(sourceFile=f'tools/mudlogging/real-data/{case}.json', sourceSha256=sha_file(original_file), modelSha256=original['modelSha256'], metrics=original['model'].get('heldoutROP')))
    target = HERE/'real-data'/('m2-gru.json' if case=='m2' else 'm4-lstm.json')
    target.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8', newline='\n')
    print(case, json.dumps(dict(model=payload['name'], metrics=metrics, records=len(rows), validPredictions=len(valid))), flush=True)


if __name__=='__main__':
    prepare('m2')
    prepare('m4')
