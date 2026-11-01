"""Pinned public Volve derivatives. Train small, auditable models offline only.

No geological boundary or gas-event labels are available. ROP is an observed
regression target; the gas autoencoder is unsupervised. Neither gives field F1.
Original sensor channels are kept separate from DrillDash's derived rig states.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd
import requests
import torch
from torch import nn

HERE = Path(__file__).resolve().parent
OUT = HERE / 'real-data'
RAW = OUT / 'raw'
RAW.mkdir(parents=True, exist_ok=True)
PIN = '76b94b76efe7eb0d66faabc11305906fd50d8ee8'
BASE = f'https://raw.githubusercontent.com/Sky370/DrillDash/{PIN}/'
LICENSE = 'Equinor Volve Open Data Licence; academic use. Mirror data attribution retained; see DATA-LICENSE.txt.'
WELLS = [('15/9-F-5', 'NA-NA-15-9-F-5/1'), ('15/9-F-1-C', 'Norway-Statoil-NO-15-9-F-1-C/3')]
torch.set_num_threads(2)
torch.manual_seed(1724)
torch.use_deterministic_algorithms(True)


def sha(data):
    return hashlib.sha256(data).hexdigest()


sources = []


def read_file(path, target=None):
    cache = HERE.parents[1] / '.artifacts/v2-research' / ('drilldash-' + path.replace('/', '_'))
    if cache.exists():
        content = cache.read_bytes()
    else:
        response = requests.get(BASE + path, timeout=90)
        response.raise_for_status()
        content = response.content
    sources.append(dict(url=BASE + path, sha256=sha(content), bytes=len(content), source_commit=PIN))
    if target:
        target.write_bytes(content)
    return content


def serial(a, decimals=5):
    return np.round(np.asarray(a, dtype='float64'), decimals).tolist()


def network_payload(model, mean, std):
    layers = []
    for layer in model:
        if isinstance(layer, nn.Linear):
            layers.append(dict(weight=layer.weight.detach().numpy().tolist(), bias=layer.bias.detach().numpy().tolist(), activation='linear'))
        elif isinstance(layer, nn.ReLU):
            layers[-1]['activation'] = 'relu'
    payload = dict(layers=layers, mean=mean.tolist(), std=std.tolist(), backend='Exact dense-layer forward pass in JavaScript; float64 accumulation / float32 trained weights')
    payload['sha256'] = sha(json.dumps(payload, sort_keys=True).encode())
    return payload


def fit_regression(data):
    fit = data[1].iloc[:int(len(data[1]) * .75)]
    validation = data[1].iloc[len(fit):]
    features = lambda d: np.stack([np.log1p(d.wob / 1000), d.rpm * 60 / 100, np.log1p(d.torque / 1000), d.flow_in * 1000 / 30], 1).astype('float32')
    x, y = features(fit), np.log(fit.rop.to_numpy() * 3600).astype('float32')[:, None]
    mean, std = x.mean(0), x.std(0).clip(.001)
    xt, yt = torch.from_numpy((x - mean) / std), torch.from_numpy(y)
    model = nn.Sequential(nn.Linear(4, 24), nn.ReLU(), nn.Linear(24, 24), nn.ReLU(), nn.Linear(24, 1))
    opt = torch.optim.Adam(model.parameters(), lr=.003)
    for _ in range(360):
        opt.zero_grad(); loss = nn.functional.mse_loss(model(xt), yt); loss.backward(); opt.step()
    model.eval()
    payload = network_payload(model, mean, std)
    payload.update(name='Volve-ROP-MLP-2.0', inputFields=['log1p(WOB_kN)', 'RPM/100', 'log1p(torque_kNm)', 'flow_Ls/30'], output='log(ROP_mh)', trainingWell='15/9-F-1-C', trainRows=len(fit), validationRows=len(validation), testWell='15/9-F-5', epochs=360, seed=1724)
    scores = []
    for d in data:
        with torch.no_grad():
            prediction = np.exp(model(torch.from_numpy((features(d) - mean) / std)).numpy().ravel())
        scores.append(prediction)
    reference = float(np.median(fit.rop * 3600))
    payload['heldoutROP'] = dict(count=len(data[0]), mae_mh=float(np.abs(scores[0] - data[0].rop.to_numpy() * 3600).mean()), constantTrainMedian_mh=reference, constantMAE_mh=float(np.abs(reference - data[0].rop.to_numpy() * 3600).mean()), definition='Observed ROP regression on a different well; not lithology or boundary accuracy.')
    return payload, scores


def main():
    catalog = json.loads(read_file('demo/store/catalog.json'))
    read_file('demo/DATA-LICENSE.txt', RAW / 'DATA-LICENSE.txt')
    frames, audits = [], []
    for well, folder in WELLS:
        import io
        content = read_file('demo/store/' + folder + '/depth_drilling.parquet', RAW / (well.replace('/', '-') + '-depth.parquet'))
        original = pd.read_parquet(io.BytesIO(content))
        required = ['md', 'rop', 'wob', 'rpm', 'torque', 'flow_in']
        good = np.isfinite(original[required]).all(axis=1) & (original.rop > 1 / 3600) & (original.rop <= 300 / 3600) & (original.wob > 2000) & (original.rpm >= 20 / 60) & (original.torque >= 0) & (original.flow_in > 0)
        d = original[good].copy().sort_values('md')
        assert d.md.is_unique and d.md.is_monotonic_increasing
        audits.append(dict(well=well, rawRows=len(original), validRows=len(d), excludedRows=int((~good).sum()), missing={k:int(original[k].isna().sum()) for k in required}, sourceUnits=dict(md='m MD', rop='m/s', wob='N', rpm='c/s', torque='N.m', flow_in='m3/s'), filter='finite; 1<ROP<=300 m/h; WOB>2 kN; RPM>=20; torque>=0; flow>0; no interpolation', aggregation='Mirror: median per 1 m MD bin in inferred drilling states. rop_calc and inferred geology are not used.'))
        frames.append(d)
    model, predictions = fit_regression(frames)
    records = []
    for (well, _), d, pred in zip(WELLS, frames, predictions):
        for start in range(0, len(d), 240):
            part = d.iloc[start:start+240]
            if len(part) < 15:
                continue
            records.append(dict(id=well.replace('/', '-') + '-' + str(int(part.md.iloc[0])), well=well, depth=serial(part.md, 1), rop=serial(part.rop * 3600), drillTime=serial(1 / (part.rop * 60)), wob=serial(part.wob / 1000), rpm=serial(part.rpm * 60), torque=serial(part.torque / 1000), flow=serial(part.flow_in * 1000), timeUTC=[pd.Timestamp(t, unit='ms', tz='UTC').isoformat() for t in part.t_first], predictedROP=serial(pred[start:start+len(part)]), split='independent-well-test' if well==WELLS[0][0] else 'fit-or-validation', rawRowIds=[f'{well}:MD:{m:.0f}' for m in part.md], hasGroundTruth=False))
    m4 = dict(version='2.0.0', kind='real-observation-derived', source_url='https://www.equinor.com/energy/volve-data-sharing', mirror=f'https://github.com/Sky370/DrillDash/tree/{PIN}/demo', license=LICENSE, label_origin='No independent geological boundary labels.', model=model, modelSha256=model['sha256'], audit=audits, records=records, sources=sources.copy(), calibration='N→kN /1000; c/s→r/min ×60; m/s→m/h ×3600; N.m→kN.m /1000; m3/s→L/s ×1000; drilling time=60/ROP only for positive active ROP. MD is not TVD.')
    (OUT / 'm4.json').write_text(json.dumps(m4, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('M4', [(a['well'],a['validRows']) for a in audits], model['heldoutROP'], flush=True)

    # M2: actual time-indexed F-1-C gas and simultaneously recorded surface channels.
    import io
    folder = WELLS[1][1]
    content = read_file('demo/store/' + folder + '/drilling.parquet')
    raw = pd.read_parquet(io.BytesIO(content))
    needed = ['t', 'hole_depth', 'gas', 'flow_in', 'wob', 'rpm', 'torque', 'rop']
    raw = raw[needed].copy()
    raw['minute'] = pd.to_datetime(raw.t, unit='ms', utc=True).dt.floor('min')
    grouped = raw.groupby('minute')[needed].median()
    count = raw.groupby('minute').size()
    valid = np.isfinite(grouped[needed]).all(axis=1) & (grouped.hole_depth > 0) & (grouped.gas >= 0) & (grouped.flow_in >= 0)
    grouped = grouped[valid]
    grouped['count'] = count[valid]
    grouped.to_csv(RAW / '15-9-F-1-C-minute-observations.csv', index_label='UTC')
    days = sorted(set(grouped.index.date)); assert len(days) >= 3
    train_days = days[:max(1, len(days)-2)]
    mask = np.array([d in train_days for d in grouped.index.date])
    features = np.stack([np.log1p(grouped.gas * 1000), grouped.flow_in * 1000 / 30, np.maximum(grouped.wob,0) / 100000, grouped.rpm, np.log1p(np.maximum(grouped.torque,0) / 1000), np.log1p(np.maximum(grouped.rop,0) * 3600)], 1).astype('float32')
    mean, std = features[mask].mean(0), features[mask].std(0).clip(.001)
    xt = torch.from_numpy((features[mask] - mean) / std)
    torch.manual_seed(1722)
    ae = nn.Sequential(nn.Linear(6,12),nn.ReLU(),nn.Linear(12,3),nn.ReLU(),nn.Linear(3,12),nn.ReLU(),nn.Linear(12,6))
    opt = torch.optim.Adam(ae.parameters(), lr=.003)
    for _ in range(260):
        opt.zero_grad();loss=nn.functional.mse_loss(ae(xt),xt);loss.backward();opt.step()
    ae.eval()
    with torch.no_grad():
        z=(features-mean)/std;reconstruction=ae(torch.from_numpy(z)).numpy();residual=np.sqrt(((reconstruction-z)**2).mean(1))
    gas_model=network_payload(ae,mean,std)
    gas_model.update(name='Volve-multichannel-autoencoder-2.0', trainingDays=[str(d) for d in train_days], validationDay=str(days[-2]), testDay=str(days[-1]), epochs=260, seed=1722, thresholdTrainingP95=float(np.quantile(residual[mask],.95)), inputFields=['log1p(TG_Euc*1000)','flow_Ls/30','max(WOB_N,0)/100000','RPM_c/s','log1p(max(torque_Nm,0)/1000)','log1p(max(ROP_ms,0)*3600)'])
    records=[]
    for day in days:
        indices=np.flatnonzero(np.array(grouped.index.date)==day)
        for start in range(0,len(indices),240):
            ix=indices[start:start+240];p=grouped.iloc[ix]
            if len(p)<20:continue
            records.append(dict(id='V-F1C-'+str(day)+'-'+str(start//240+1),well='15/9-F-1-C',timeUTC=[x.isoformat() for x in p.index],time=serial((p.index-p.index[0]).total_seconds()/60,1),depth=serial(p.hole_depth),gas=serial(p.gas,9),flow=serial(p.flow_in*1000),wob=serial(p.wob/1000),rpm=serial(p.rpm*60),torque=serial(p.torque/1000),rop=serial(p.rop*3600),novelty=serial(residual[ix]),rawCount=p['count'].astype(int).tolist(),split='train' if day in train_days else 'validation' if day==days[-2] else 'chronological-test',hasGroundTruth=False))
    # Preserve channel units as stated in the source log; Euc is not a % calibration.
    unit_info=[dict(gid=log['gid'],channels=[c for c in log['channels'] if c['mnem'] in ['TOTGAS','WOB','WOB_AVG','SURF_RPM','ROP_AVG','FLOWIN','TORQUE_AVG','TORQUE']]) for w in catalog['wells'] if w['id'].endswith('15-9-F-1-C') for z in w['wellbores'] for log in z['logs']]
    m2=dict(version='2.0.0',kind='real-observation-derived',source_url='https://www.equinor.com/energy/volve-data-sharing',mirror=m4['mirror'],license=LICENSE,label_origin='No independent gas-event labels; autoencoder novelty is not an oil/gas discovery.',model=gas_model,modelSha256=gas_model['sha256'],sources=sources[-1:],records=records,sourceUnits=unit_info,audit=dict(rawRows=len(raw),minuteRows=len(grouped),excludedMinutes=int((~valid).sum()),aggregation='UTC 1-minute medians, original sample counts retained; no missing-minute interpolation',missing={k:int(raw[k].isna().sum()) for k in needed},gasUnit='Euc (source mnemonic TOTGAS); do not relabel as %',pump='Not measured as a discrete state here; flow>1 L/s is an explicitly derived circulation flag.',lag='Unknown true field lag. Slider is an assumed alignment experiment, not a calibrated correction.'))
    (OUT / 'm2.json').write_text(json.dumps(m2,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print('M2',len(grouped),len(records),'days',days,'train',train_days,flush=True)
    manifest=dict(version='2.0.0',sources=sources,official='https://www.equinor.com/energy/volve-data-sharing',mirrorCommit=PIN,downloaded='2026-11-01',m4Model=model['sha256'],m2Model=gas_model['sha256'])
    (OUT / 'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')


if __name__=='__main__':
    main()
