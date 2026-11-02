"""Reproducible, small production teaching assets. Never train on illustrations.

Run from any directory: python tools/operations/prepare-production.py [pr1 ... pr5]
All random generators and source files are recorded. Existing source files are
read unchanged. Exported networks use the shared asset-contract.json schema.
See production-asset-schema.md for CRM/PCA and windowed monitoring formulas.
"""
from pathlib import Path
import copy
import hashlib
import json
import re
import sys
import urllib.request

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw
from scipy.optimize import linprog, nnls
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.preprocessing import StandardScaler
import torch
from torch import nn

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'tools/operations/source-data/production'
CACHE = ROOT / '.artifacts/operations-research/production'
OUT = ROOT / 'assets/operations/data'
SEED = 20261103
torch.set_num_threads(2)
torch.manual_seed(SEED)
np.random.seed(SEED)
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)


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


def save(case):
    path = OUT / (case['id'] + '.json')
    path.write_text(json.dumps(finite_json(case), ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    result = {k: case['validation'][k] for k in ['metric', 'baseline', 'model', 'n']}
    print(case['id'], 'saved', path.stat().st_size, 'bytes', json.dumps(finite_json(result), ensure_ascii=True), flush=True)


def source_file(name, url):
    p = RAW / name
    if p.exists():
        return p
    p = CACHE / name
    if not p.exists():
        req = urllib.request.Request(url, headers={'User-Agent': 'ProductionTeachingData/1.0'})
        with urllib.request.urlopen(req, timeout=45) as response:
            p.write_bytes(response.read())
    return p


def provenance(files, **extra):
    return dict(seed=SEED, preparationScript='tools/operations/prepare-production.py',
                runtime=dict(python=sys.version.split()[0], numpy=np.__version__, torch=torch.__version__),
                sources=[dict(file=p.name, sha256=hashlib.sha256(p.read_bytes()).hexdigest(), bytes=p.stat().st_size) for p in files],
                sourceIndex='tools/operations/source-data/production/source-index.json',
                illustrationsUsedForTraining=False, **extra)


def np_softmax(a):
    a = np.asarray(a, dtype=float)
    b = np.exp(a - a.max(axis=-1, keepdims=True))
    return b / b.sum(axis=-1, keepdims=True)


def metrics(y, p):
    y, p = np.asarray(y).astype(int), np.asarray(p).astype(int)
    return dict(accuracy=accuracy_score(y, p), macroF1=f1_score(y, p, average='macro', zero_division=0),
                precision=precision_score(y, p, zero_division=0) if set(np.unique(y)) <= {0, 1} else None,
                recall=recall_score(y, p, zero_division=0) if set(np.unique(y)) <= {0, 1} else None,
                confusion=confusion_matrix(y, p).tolist())


def train_torch(net, X, Y, VX, VY, classification=False, epochs=200, batch=128, lr=.005):
    X = torch.tensor(np.asarray(X), dtype=torch.float32)
    Y = torch.tensor(np.asarray(Y), dtype=torch.long if classification else torch.float32)
    VX = torch.tensor(np.asarray(VX), dtype=torch.float32)
    VY = torch.tensor(np.asarray(VY), dtype=Y.dtype)
    if classification:
        counts = np.bincount(Y.numpy(), minlength=4)
        loss_fn = nn.CrossEntropyLoss(weight=torch.tensor(len(Y) / np.maximum(counts, 1) / 4, dtype=torch.float32))
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
    return finite_json(dict(type='cnn', name='小型示功图CNN', dims=[1, 32, 32], layers=layers, classification='logits'))


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


def pr1():
    path = source_file('dynacard-example_cards.json', 'https://raw.githubusercontent.com/vamseeachanta/digitalmodel/main/src/digitalmodel/marine_ops/artificial_lift/dynacard/data/example_cards.json')
    cards = [c for c in json.loads(path.read_text(encoding='utf-8'))['cards'] if c['source'] == 'field-archive-digitized']
    names = ['BUTTERFLY', 'INCOMPLETE_FILLAGE', 'FILLAGE_COLLAPSE', 'FULL_CARD']
    cn = ['蝴蝶形', '充满不足', '充满塌陷', '饱满卡']
    groups = np.asarray([re.search(r'-w(\d+)-', c['id']).group(1) for c in cards])
    group_order = np.asarray(sorted(set(groups)))
    np.random.default_rng(SEED).shuffle(group_order)
    train_groups, check_groups, test_groups = group_order[:36], group_order[36:48], group_order[48:]
    train, check, test = [np.flatnonzero(np.isin(groups, g)) for g in (train_groups, check_groups, test_groups)]
    images, shape_features = [], []
    feature_names = ['marker_density', 'x_mean', 'y_mean', 'x_sd', 'y_sd', 'xy_covariance', 'x_skew', 'y_skew',
                     'bottom_left_fraction', 'bottom_right_fraction', 'top_left_fraction', 'top_right_fraction',
                     'x_q10', 'x_q50', 'x_q90', 'y_q10', 'y_q50', 'y_q90']
    for c in cards:
        x, y = np.asarray(c['position'], float), np.asarray(c['load'], float)
        x = (x-x.min()) / max(np.ptp(x), 1e-8)
        y = (y-y.min()) / max(np.ptp(y), 1e-8)
        # Archive points are unordered digitized markers: never join them into a fake trace.
        im = Image.new('L', (32, 32), 0)
        draw = ImageDraw.Draw(im)
        for xx, yy in zip(x, y):
            px, py = 1 + 29*xx, 30 - 29*yy
            draw.ellipse((px-.65, py-.65, px+.65, py+.65), fill=255)
        raster = np.asarray(im, float) / 255
        images.append(raster[None])
        xx, yy = x-x.mean(), y-y.mean()
        shape_features.append([raster.mean(), x.mean(), y.mean(), x.std(), y.std(), np.mean(xx*yy), np.mean(xx**3), np.mean(yy**3),
                              *[np.mean(((x>=.5)==qx) & ((y>=.5)==qy)) for qy in [False, True] for qx in [False, True]],
                              *np.quantile(x, [.1, .5, .9]), *np.quantile(y, [.1, .5, .9])])
    X, features = np.asarray(images, 'f4'), np.asarray(shape_features)
    Y = np.asarray([names.index(c['phenomenon']) for c in cards])
    existing = None
    if '--reuse-pr1-model' in sys.argv:
        existing = json.loads((OUT/'pr1.json').read_text(encoding='utf-8'))
        expected_sha = existing['provenance']['sources'][0]['sha256']
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected_sha:
            raise ValueError('Cannot reuse frozen pr1 model with different source cards')
        if set(existing['validation']['split']['testGroups']) != set(test_groups):
            raise ValueError('Cannot reuse frozen pr1 model with a different test split')
        model = copy.deepcopy(existing['model'])
        baseline_model = copy.deepcopy(existing['baselineModel'])
        history = copy.deepcopy(existing['provenance'].get('trainingHistory', []))
        logits = np.stack([cnn_numpy(model, image.ravel()) for image in X])
        shape_z = (features-baseline_model['mean'])/baseline_model['scale']
        baseline_logits = shape_z @ np.asarray(baseline_model['weight']).reshape(4,18).T + baseline_model['bias']
    else:
        shape_scale = StandardScaler().fit(features[train])
        logistic = LogisticRegression(C=1, max_iter=1500, class_weight='balanced', random_state=SEED).fit(shape_scale.transform(features[train]), Y[train])
        torch.manual_seed(SEED + 1)
        net = nn.Sequential(nn.Conv2d(1, 4, 3, stride=2, padding=1), nn.ReLU(),
                            nn.Conv2d(4, 6, 3, stride=2, padding=1), nn.ReLU(), nn.Flatten(), nn.Linear(6*8*8, 4))
        history = train_torch(net, X[train], Y[train], X[check], Y[check], classification=True, epochs=241, batch=64, lr=.006)
        model = export_cnn(net)
        with torch.no_grad():
            logits = net(torch.tensor(X)).numpy()
        baseline_logits = logistic.decision_function(shape_scale.transform(features))
        baseline_model = finite_json(dict(type='shape-logistic', name='形状特征逻辑回归', featureNames=feature_names,
                                          mean=shape_scale.mean_, scale=shape_scale.scale_, weight=logistic.coef_.ravel(), bias=logistic.intercept_, classes=names))
    # Fixed, label-stratified display selection from held-out groups; no selection by correctness.
    selected_by_class = []
    for cls in range(4):
        ids = sorted([i for i in test if Y[i] == cls], key=lambda i: cards[i]['id'])
        if len(ids) < 3:
            raise ValueError('Need at least three held-out cards for every original shape class')
        selected_by_class.append(ids[:3])
    # Interleave classes so the first visible choices/parity cases already differ.
    selected = [selected_by_class[cls][rank] for rank in range(3) for cls in range(4)]
    evaluation = [dict(id=cards[i]['id'], group='w'+groups[i], target=Y[i], logits=logits[i], baselineLogits=baseline_logits[i]) for i in test]
    validation = dict(split=dict(trainCards=len(train), checkCards=len(check), testCards=len(test), trainGroups=train_groups, checkGroups=check_groups, testGroups=test_groups),
                      metric='accuracy', baseline=accuracy_score(Y[test], baseline_logits[test].argmax(1)), model=accuracy_score(Y[test], logits[test].argmax(1)), n=len(test),
                      modelMetrics=metrics(Y[test], logits[test].argmax(1)), baselineMetrics=metrics(Y[test], baseline_logits[test].argmax(1)),
                      boundary='按-wNN-标记保守分组；数字化形状标签，无现场故障验证；未按测试成绩选择卡片')
    if existing is not None:
        if abs(validation['model']-existing['validation']['model']) > 1e-7 or abs(validation['baseline']-existing['validation']['baseline']) > 1e-7:
            raise AssertionError('Frozen inference changed the established held-out metrics')
        validation = copy.deepcopy(existing['validation'])
    records = []
    for i in selected:
        c = cards[i]
        records.append(dict(id=c['id'], kind='digitized-reference', split='held-out', sourceId=c['id'],
                            unit='归一化形状，无物理单位', scope='12张展示按四类各取3张；指标与门槛覆盖全部55张留出图，不代表现场故障原因',
                            input=X[i].ravel(), target=Y[i], baseline=baseline_logits[i],
                            shapeFeatures=features[i], modelPrediction=logits[i],
                            display=dict(position=c['position'], load=c['load'], image=X[i].ravel(), width=32, height=32,
                                         classNames=cn, classKeys=names, group='w'+groups[i], render='markers',
                                         source=c['source'], units=c['units'], observedLabel=cn[Y[i]], phenomenon=c['phenomenon'],
                                         name=cn[Y[i]]+' · '+c['id'], sourceIdIsNotClass=True)))
    parity = [dict(recordIndex=i, expected=cnn_numpy(model, r['input']), stage='logits before softmax/acceptance threshold', tolerance=1e-5) for i,r in enumerate(records[:3])]
    save(dict(id='pr1', unit='归一化形状', source=dict(title='digitalmodel · dynacard example library',
              url='https://github.com/vamseeachanta/digitalmodel/issues/1288', license='代码库MIT；原始私人档案的独立数据授权声明未找到'),
              scope='12张示范覆盖四类各3张；完整55张按井留出图用于固定模型评价与门槛覆盖统计，不代表现场故障识别率', model=model,
              baselineModel=baseline_model, records=records, classes=names, classNames=cn, parity=parity, evaluation=evaluation,
              evaluationScope=dict(n=len(test), classCounts=np.bincount(Y[test],minlength=4), thresholdPopulation='all 55 held-out cards',
                                   acceptance='softmax(logits).max() >= threshold', agreement='argmax(logits) equals target among accepted cards; null if none accepted'),
              validation=validation,
              provenance=provenance([path], counts=dict(archiveCards=len(cards), displayedHeldOut=len(records), evaluatedHeldOut=len(test), displayClassCounts=[3,3,3,3], allSources=dict(archive=245, measured=3, synthetic=98)),
                                    assumptions=['只训练field-archive-digitized；实测地面卡和synthetic-verified不混入验证', '将无序档案标记画为点，不伪造连线', '所有形状缩放为0..1，不能计算实际载荷/冲程/功', '按原始phenomenon分层，每类选源ID字典序前3张；不按预测得分或正确性选图', '源卡片ID的butterfly前缀不是类别，显示采用原始phenomenon映射', 'evaluation保留全部55张冻结模型logits；门槛统计不得只用当前卡片或12张展示图'],
                                    frozenWeightsReused=existing is not None, trainingHistory=history)))


def pr2():
    path = RAW / 'sodir-volve-production-monthly.csv'
    if not path.exists():
        full = source_file('sodir-field-production-monthly.csv', 'https://factpages.sodir.no/public?/Factpages/external/tableview/field_production_monthly&rs:Command=Render&rc:Toolbar=false&rc:Parameters=f&IpAddress=not_used&CultureCode=en&rs:Format=CSV&Top100=false')
        df = pd.read_csv(full)
        df[df.prfInformationCarrier == 'VOLVE'].to_csv(path, index=False)
    df = pd.read_csv(path).sort_values(['prfYear','prfMonth']).reset_index(drop=True)
    dates = pd.to_datetime(dict(year=df.prfYear, month=df.prfMonth, day=1)).dt.strftime('%Y-%m-%d').tolist()
    oil = df.prfPrdOilNetMillSm3.to_numpy(float) * 1e6
    active = np.flatnonzero(np.asarray(dates) <= '2016-09-01')
    target_ids = np.arange(12, len(active))
    X = np.stack([oil[t-12:t,None] for t in target_ids])
    Y = oil[target_ids,None]
    train = np.flatnonzero(np.asarray([dates[t] for t in target_ids]) <= '2013-12-01')
    check = np.flatnonzero((np.asarray([dates[t] for t in target_ids]) >= '2014-01-01') & (np.asarray([dates[t] for t in target_ids]) <= '2014-12-01'))
    test = np.flatnonzero(np.asarray([dates[t] for t in target_ids]) >= '2015-01-01')
    mean, scale = np.array([oil[:71].mean()]), np.array([oil[:71].std()])
    out_mean, out_scale = Y[train].mean(0), Y[train].std(0)
    torch.manual_seed(SEED + 2)
    net = GRUNet(1, 8, 1)
    history = train_torch(net, (X[train]-mean)/scale, (Y[train]-out_mean)/out_scale,
                          (X[check]-mean)/scale, (Y[check]-out_mean)/out_scale, epochs=401, batch=64, lr=.008)
    model = export_gru(net, mean, scale, out_mean, out_scale, '过去12个月的小型GRU')
    predicted = predict_gru(net, X, mean, scale, out_mean, out_scale)[:,0]
    persistence = X[:,-1,0]
    decline = []
    for seq in X[:,:,0]:
        slope, intercept = np.polyfit(np.arange(12), np.log(np.maximum(seq, 1)), 1)
        slope = min(float(slope), 0.)
        intercept = np.log(np.maximum(seq, 1)).mean() - slope*5.5
        decline.append(np.exp(intercept+slope*12))
    decline = np.asarray(decline)
    selected = test[np.unique(np.linspace(0, len(test)-1, 16).round().astype(int))]
    records = []
    for i in selected:
        t = target_ids[i]
        records.append(dict(id='VOLVE-'+dates[t][:7], kind='derived-field', split='held-out', sourceId='VOLVE/3420717/'+dates[t],
                            unit='Sm³/月', scope='真实油田月度可销售产油体积；非单井日率或措施因果效果', input=X[i], target=float(Y[i,0]), baseline=float(persistence[i]),
                            baselines=dict(persistence=persistence[i], decline=decline[i]), modelPrediction=predicted[i],
                            display=dict(x=list(range(-12,0)), timestamps=dates[t-12:t], history=oil[t-12:t],
                                         features=['oilSm3Month'], historySeries=[dict(name='历史月产油量', values=oil[t-12:t], unit='Sm³/月')],
                                         future=dict(x=[0], timestamps=[dates[t]], target=[oil[t]], model=[predicted[i]], persistence=[persistence[i]], decline=[decline[i]]),
                                         originalOilMillionSm3=float(df.prfPrdOilNetMillSm3.iloc[t]), targetMonth=dates[t], trainingCutoff='2013-12-01', unit='Sm³/月')))
    save(dict(id='pr2', unit='Sm³/月', source=dict(title='Sodir FactPages · Monthly saleable field production',
              url='https://factpages.sodir.no/en/field/TableView/Production/Saleable/Monthly', license='NLOD 2.0'),
              scope='Volve油田月度可销售产油量的一月滚动预测；不声称预知停产/作业', model=model,
              baselineModel=dict(type='persistence-and-local-exponential-decline', lookback=12, formula='last value; log-linear fit on last12 positive-clamped monthly volumes with nonpositive slope'),
              records=records, parity=[dict(recordIndex=i, expected=gru_numpy(model,r['input']), stage='physical model output after fixed output transform; before UI', tolerance=.1) for i,r in enumerate(records[:3])],
              validation=dict(split=dict(trainTargetMonths=[dates[target_ids[train[0]]],dates[target_ids[train[-1]]]], checkTargetMonths=[dates[target_ids[check[0]]],dates[target_ids[check[-1]]]], testTargetMonths=[dates[target_ids[test[0]]],dates[target_ids[test[-1]]]], trainWindows=len(train), checkWindows=len(check), testWindows=len(test)),
                              metric='MAE', unit='Sm³/月', baseline=np.mean(np.abs(persistence[test]-Y[test,0])), model=np.mean(np.abs(predicted[test]-Y[test,0])), n=len(test),
                              declineMAE=np.mean(np.abs(decline[test]-Y[test,0])), modelRMSE=np.sqrt(np.mean((predicted[test]-Y[test,0])**2)),
                              boundary='目标月份按时间前后分区；固定训练权重；滚动输入可包含已观察到的更早测试月份；只评价至2016-09，后续停产零值另存'),
              provenance=provenance([path], counts=dict(sourceMonths=len(df), activeMonths=len(active), displayedHeldOut=len(records)),
                                    assumptions=['原油量million Sm³/month乘10^6，未换算成日率', '标准化仅用至2013-12训练历史', '无事件、压力或未来产量输入', '早停只用2014检查段，不按测试结果选模型'],
                                    shutdownMonths=[dict(month=dates[t],oilSm3=oil[t]) for t in range(len(active),len(df))], trainingHistory=history)))


def crm_filter(injection, time, tau):
    state = np.empty_like(injection)
    state[0] = injection[0]
    for t in range(1,len(time)):
        a = np.exp(-(time[t]-time[t-1])/tau)
        state[t] = a*state[t-1]+(1-a)*injection[t]
    return state


def crm_production(model, state, injection, dt):
    a = np.exp(-dt/np.asarray(model['taus']))
    future = a[:,None]*np.asarray(state)+(1-a[:,None])*np.asarray(injection)[None,:]
    return np.asarray(model['offsets'])+np.sum(np.asarray(model['gains'])*future,axis=1)


def capped_equal(budget, upper):
    upper = np.asarray(upper,float)
    low, high = 0., max(upper)+budget
    for _ in range(70):
        mid=(low+high)/2
        if np.minimum(upper,mid).sum() < budget: low=mid
        else: high=mid
    return np.minimum(upper,(low+high)/2)


def crm_greedy(model, inp):
    """Independent exact solution of the same linear bounded allocation."""
    marginal = ((1-np.exp(-inp['planningDt']/np.asarray(model['taus'])))[:,None]*np.asarray(model['gains'])).sum(0)
    q=np.asarray(inp['lower'],float).copy()
    remain=max(0.,min(inp['budget'],sum(inp['upper']))-q.sum())
    for j in np.argsort(-marginal,kind='stable'):
        add=min(remain,inp['upper'][j]-q[j]);q[j]+=add;remain-=add
    production=crm_production(model,inp['state'],q,inp['planningDt'])
    return dict(allocation=q,production=production,objective=production.sum(),used=q.sum(),feasible=bool(q.sum()<=inp['budget']+1e-7 and np.all(q<=np.asarray(inp['upper'])+1e-7)))


def pr3():
    base='https://raw.githubusercontent.com/frank1010111/pywaterflood/master/testing/data/'
    files=[source_file('pywaterflood-'+n,base+n) for n in ['injection.csv','production.csv','time.csv']]
    inj, prod, time=[np.loadtxt(p,delimiter=',') for p in files]
    flow_scale=float(np.median(inj[:208]))
    inj, prod=inj/flow_scale,prod/flow_scale
    train=np.arange(12,208);check=np.arange(208,253);test=np.arange(253,298)
    grid=[15.,30.,60.,120.,240.,480.]
    gains,taus,offsets,grid_evidence=[],[],[],[]
    for j in range(4):
        candidates=[]
        for tau in grid:
            f=crm_filter(inj,time,tau)
            A=np.column_stack([np.ones(len(f)),f])
            coef,_=nnls(A[train],prod[train,j])
            error=float(np.mean(np.abs(A[check]@coef-prod[check,j])))
            candidates.append((error,tau,coef))
        error,tau,coef=min(candidates,key=lambda q:q[0])
        taus.append(tau);offsets.append(coef[0]);gains.append(coef[1:]);grid_evidence.append([dict(tau=q[1],checkMAE=q[0]) for q in candidates])
    model=finite_json(dict(type='crm',name='非负指数滞后CRM代理＋线性约束配注',nInjectors=5,nProducers=4,
                           flowScale=flow_scale,unit='训练注水中位数归一化流量',sourceFlowUnit='原始流量单位，物理单位未说明',timeUnit='源时间单位，物理单位未说明',
                           planningDt=float(np.median(np.diff(time[:208]))),taus=taus,gains=gains,offsets=offsets,
                           allocationObjective='maximize sum of predicted total liquid; no oil split or incremental-oil claim',
                           formula='s_j,next=a_j*s_j+(1-a_j)*q; a_j=exp(-dt/tau_j); p_j=b_j+sum_i G_ji*s_ji,next'))
    states=np.stack([crm_filter(inj,time,tau) for tau in taus],axis=1)
    fitted=np.asarray(offsets)[None,:]+np.einsum('tji,ji->tj',states,np.asarray(gains))
    baseline=np.vstack([prod[0],prod[:-1]])
    records=[]
    for t in [253,260,267,274,281,288,296]:
        current=inj[t]
        upper=np.maximum(np.quantile(inj[:208],.9,axis=0),current*1.5)
        budget=float(current.sum())
        inp=finite_json(dict(state=states[t],currentInjection=current,planningDt=model['planningDt'],budget=budget,lower=[0.]*5,upper=upper))
        marginal=((1-np.exp(-inp['planningDt']/np.asarray(taus)))[:,None]*np.asarray(gains)).sum(0)
        solved=linprog(-marginal,A_ub=np.ones((1,5)),b_ub=[budget],bounds=list(zip(inp['lower'],inp['upper'])),method='highs')
        if not solved.success:raise RuntimeError(solved.message)
        eq=capped_equal(budget,upper)
        predicted=crm_production(model,inp['state'],solved.x,inp['planningDt'])
        sl=max(0,t-23)
        records.append(dict(id=f'CRM-{t:03d}',kind='published-simulation',split='held-out',sourceId=f'pywaterflood/testing/data row {t}',
                            unit='训练注水中位数归一化流量',scope='合成历史拟合的总液代理；新方案无独立反事实真值',input=inp,target=None,baseline=eq,
                            modelPrediction=dict(allocation=solved.x,production=predicted,objective=predicted.sum()),
                            evidence=dict(historicalPrediction=fitted[t],historicalObserved=prod[t],historicalActualInjection=inj[t]),
                            display=dict(x=time[sl:t+1],timestamps=time[sl:t+1],historyInjection=inj[sl:t+1],historyProduction=prod[sl:t+1],
                                         injectionNames=[f'注水井 I{i+1}' for i in range(5)],producerNames=[f'生产井 P{j+1}' for j in range(4)],
                                         currentInjection=current,baselineProduction=crm_production(model,inp['state'],eq,inp['planningDt']),
                                         baselineAllocation=eq,optimizedAllocation=solved.x,optimizedProduction=predicted,unit='归一化总液/注水流量',sourceFlowScale=flow_scale,
                                         capacityIsScenario=True)))
    parity=[]
    for i,r in enumerate(records[:3]):
        expected=crm_greedy(model,r['input'])
        if np.max(np.abs(expected['allocation']-r['modelPrediction']['allocation']))>1e-6:raise AssertionError('CRM LP/greedy mismatch')
        parity.append(dict(recordIndex=i,expected=expected,stage='default allocation; independent greedy optimum versus scipy linprog',tolerance=1e-6))
    save(dict(id='pr3',unit='训练注水中位数归一化流量',source=dict(title='pywaterflood · synthetic waterflood tutorial',url='https://pywaterflood.readthedocs.io/en/v0.3.1/user-guide/7-minutes-to-pywaterflood.html',license='BSD-2-Clause repository; explicitly synthetic'),
              scope='实际NNLS拟合与实际有界线性优化；优化总液代理，不预测已证实增油',model=model,
              baselineModel=dict(type='capped-equal-allocation',name='同预算、同上限均分配注',formula='q_i=min(cap_i,lambda), choose lambda so sum(q)=min(budget,sum(cap))'),records=records,parity=parity,
              validation=dict(split=dict(trainRows=[12,207],checkRows=[208,252],testRows=[253,297]),metric='MAE of field-total liquid',unit='归一化源流量',
                              baseline=np.mean(np.abs(baseline[test].sum(1)-prod[test].sum(1))),model=np.mean(np.abs(fitted[test].sum(1)-prod[test].sum(1))),n=len(test),
                              producerMAE=np.mean(np.abs(fitted[test]-prod[test]),axis=0),
                              boundary='历史检验使用当时已知注水；它只验证代理的历史预测，不验证优化配注的反事实效果'),
              provenance=provenance(files,counts=dict(rows=len(time),injectors=5,producers=4),
                                    assumptions=['每个生产井共享一项指数时间常数，非负截距及5项非负增益', 'tau由检查段MAE选择，测试段未用于选参', '流量共同除以训练前208行注水中位数', '总水量与单井上限为教学场景；没有实测破裂压力', '线性总液目标可能将水集中到较高边际响应井；不使用油相收益'],lagGridEvidence=grid_evidence)))


def esp_episode(seed,mode,steps=240):
    rng=np.random.default_rng(seed)
    t=np.arange(steps)
    frequency=np.full(steps,49.+rng.uniform(-1,1))
    frequency[55:]+=3.;frequency[112:]-=2.;frequency[182:]+=1.5
    frequency+=.12*np.sin(t/20)
    load=rng.uniform(-1.5,1.5)
    current=np.empty(steps);temperature=np.empty(steps);pressure=np.empty(steps)
    current[0]=35.+load;temperature[0]=66.+.6*load;pressure[0]=3.8
    for k in range(1,steps):
        desired=35.+load+.85*(frequency[k]-49.)+.45*np.sin(k/30)
        current[k]=.78*current[k-1]+.22*desired+rng.normal(0,.14)
        equilibrium=66.+.7*(current[k]-35.)
        temperature[k]=.96*temperature[k-1]+.04*equilibrium+rng.normal(0,.045)
        pressure[k]=.72*pressure[k-1]+.28*(3.8+.11*(frequency[k]-49.)) +rng.normal(0,.012)
    onset=150 if mode!='normal' else None
    ramp=np.maximum(t-150,0)/60
    if mode=='current-drift':current+=3.2*ramp;temperature+=2.0*ramp
    elif mode=='pressure-drift':pressure-=.55*ramp
    elif mode=='thermal-drift':temperature+=6.0*ramp
    elif mode=='sensor-drift':current+=2.6*ramp
    arr=np.column_stack([current,temperature,pressure,frequency])
    truth=(t>=150).astype(int) if mode!='normal' else np.zeros(steps,int)
    phases=['正常调频' if k<150 or mode=='normal' else '仿真持续偏移' for k in t]
    return dict(seed=seed,mode=mode,values=arr,truth=truth,phases=phases,onset=onset)


def causal_windows(arr,lookback=12,outputs=3):
    return np.stack([arr[t-lookback:t] for t in range(lookback,len(arr))]),arr[lookback:,:outputs]


def persistent_alarm(score,threshold,persistence=3):
    flags=np.zeros(len(score),int);run=0
    for i,s in enumerate(score):
        run=run+1 if s is not None and s>threshold else 0
        flags[i]=int(run>=persistence)
    return flags


def pr4():
    train_episodes=[esp_episode(SEED+100+i,'normal') for i in range(16)]
    check_episodes=[esp_episode(SEED+200+i,'normal') for i in range(4)]
    modes=['normal','current-drift','pressure-drift','thermal-drift','sensor-drift','normal']*2
    test_episodes=[esp_episode(SEED+300+i,m) for i,m in enumerate(modes)]
    X,Y=[np.concatenate(v) for v in zip(*[causal_windows(e['values']) for e in train_episodes])]
    VX,VY=[np.concatenate(v) for v in zip(*[causal_windows(e['values']) for e in check_episodes])]
    train_values=np.concatenate([e['values'] for e in train_episodes])
    mean,scale=train_values.mean(0),train_values.std(0)
    out_mean,out_scale=Y.mean(0),Y.std(0)
    torch.manual_seed(SEED+4)
    net=GRUNet(4,8,3)
    history=train_torch(net,(X-mean)/scale,(Y-out_mean)/out_scale,(VX-mean)/scale,(VY-out_mean)/out_scale,epochs=301,batch=128,lr=.006)
    pred=predict_gru(net,X,mean,scale,out_mean,out_scale)
    residual_scale=np.maximum((Y-pred).std(0),[.05,.02,.005])
    normal_scores=np.sqrt(np.mean(((Y-pred)/residual_scale)**2,axis=1))
    threshold=float(np.quantile(normal_scores,.995))
    baseline_threshold=float(np.quantile(train_values[:,0],.995))
    model=export_gru(net,mean,scale,out_mean,out_scale,'ESP仿真多通道一步GRU')
    model['monitor']=finite_json(dict(lookback=12,outputFeatures=['current_A','temperature_C','pressure_MPa'],residualScale=residual_scale,
                                      formula='sqrt(mean(((observed_next-predicted_next)/residualScale)^2))',threshold=threshold,persistence=3,thresholdCalibration='99.5th percentile training-normal residual score'))
    records=[];all_y=[];all_p=[];all_b=[];mae=[];base_mae=[];delays=[]
    for i,e in enumerate(test_episodes):
        xx,yy=causal_windows(e['values']);yp=predict_gru(net,xx,mean,scale,out_mean,out_scale)
        ss=np.sqrt(np.mean(((yy-yp)/residual_scale)**2,axis=1))
        scores=[None]*12+ss.tolist()
        alarms=persistent_alarm(scores,threshold,3)
        baseline_alarms=(e['values'][:,0]>baseline_threshold).astype(int)
        all_y.extend(e['truth'][12:]);all_p.extend(alarms[12:]);all_b.extend(baseline_alarms[12:])
        mae.extend(np.abs(yp[:,0]-yy[:,0]));base_mae.extend(np.abs(e['values'][11:-1,0]-yy[:,0]))
        hits=np.flatnonzero((alarms==1)&(np.arange(240)>=150))
        delay=int(hits[0]-150) if e['onset'] is not None and len(hits) else None
        if e['onset'] is not None:delays.append(dict(episode=i,mode=e['mode'],delayMinutes=delay))
        anchor=180
        pred_full=[[None]*3 for _ in range(12)]+yp.tolist()
        records.append(dict(id=f'ESP-SIM-{i:02d}',kind='controlled-synthetic',split='held-out',sourceId=f'generator seed {e["seed"]}',
                            unit='A / °C / MPa / Hz；时间min',scope='显式受控仿真；异常标签为注入偏移，不代表确认故障或现场提前量',
                            input=e['values'][anchor-12:anchor],target=e['values'][anchor,:3],baseline=e['values'][anchor-1,:3],modelPrediction=yp[anchor-12],
                            display=dict(x=np.arange(240),timestamps=np.arange(240),features=['current_A','temperature_C','pressure_MPa','frequency_Hz'],
                                         featureNames=['电流','温度','压力','频率'],units=['A','°C','MPa','Hz'],channels=e['values'],modelForecast=pred_full,
                                         baselineForecast=[[None]*3]+e['values'][:-1,:3].tolist(),scores=scores,modelAlarm=alarms,baselineAlarm=baseline_alarms,
                                         truth=e['truth'],phases=e['phases'],onsetMinute=e['onset'],selectedIndex=anchor,seed=e['seed'],mode=e['mode'],dtMinutes=1,
                                         defaultThreshold=threshold,defaultPersistence=3,detectionDelayMinutes=delay,unit='min')))
    source=RAW/'espset-context-counts.json'
    context_counts=dict(samples=6032,devices=11,labels={'Normal':4801,'Unbalance':576,'Faulty sensor':295,'Rubbing':290,'Misalignment':70})
    if source.exists():
        context=json.loads(source.read_text(encoding='utf-8'))
        context_counts={k:context[k] for k in ['samples','devices','labels']}
    elif (CACHE/'ESPset-features.csv').exists():
        source=CACHE/'ESPset-features.csv'
        context=pd.read_csv(source,sep=';');context_counts=dict(samples=len(context),devices=context.esp_id.nunique(),labels=context.label.value_counts().to_dict())
    save(dict(id='pr4',unit='A / °C / MPa / Hz；min',source=dict(title='主时序：本课显式ESP运行仿真；背景：ESPset v3',
              url='https://data.mendeley.com/datasets/m268jsw339/3',license='ESPset数据CC BY 4.0；仿真独立生成并公开种子/公式'),
              scope='完整运行片段留出；时间序列由仿真器生成，ESPset没有被排序成时间序列',model=model,
              baselineModel=dict(type='single-current-threshold',name='正常电流固定上限',threshold=baseline_threshold,featureIndex=0),records=records,
              parity=[dict(recordIndex=i,expected=gru_numpy(model,r['input']),stage='physical next-point prediction for selectedIndex; no monitor threshold',tolerance=1e-5) for i,r in enumerate(records[:3])],
              validation=dict(split=dict(trainEpisodes=16,checkEpisodes=4,testEpisodes=12,pointsPerEpisode=240,lookback=12),metric='F1（仿真逐点异常）',
                              baseline=f1_score(all_y,all_b,zero_division=0),model=f1_score(all_y,all_p,zero_division=0),n=len(all_y),
                              modelMetrics=metrics(all_y,all_p),baselineMetrics=metrics(all_y,all_b),currentForecastMAE_A=np.mean(mae),currentPersistenceMAE_A=np.mean(base_mae),delays=delays,
                              boundary='训练/检查仅正常独立片段；门槛来自训练正常分数；仿真异常检出延迟，不是现场故障提前时间'),
              provenance=provenance([source] if source.exists() else [],counts=dict(trainWindows=len(X),checkWindows=len(VX),testEpisodes=12,realESPsetContext=context_counts),
                                    assumptions=['频率分段变化和一阶电流/温度/压力响应见本脚本esp_episode', '异常为从150min起加到观测通道的受控线性偏移；并非物理失效机理仿真', '每个12点历史窗口重置GRU隐藏状态；不读取目标时刻频率或传感器', 'ESPset仅提供设备/振动类别背景，不校准模拟电流/压力/温度', '模拟训练尺度与阈值只来自训练正常片段'],trainingHistory=history)))


def pca_window(values,t,lookback=12):
    window=values[t-lookback+1:t+1]
    return (window-window[0]).ravel()


def pca_score(model,x):
    z=(np.asarray(x)-model['mean'])/model['scale']
    components=np.asarray(model['components']).reshape(model['nComponents'],model['inputSize'])
    reconstruction=(z@components.T)@components
    return float(np.sqrt(np.mean((z-reconstruction)**2)))


def pr5():
    names=['WELL-00001_20170226130146','WELL-00021_20180611011218']
    channels=['P-TPT','P-MON-CKP','T-TPT'];units=['MPa','MPa','°C']
    data=[];files=[]
    metadata_path=RAW/'3w-minute-source-metadata.json'
    metadata=json.loads(metadata_path.read_text(encoding='utf-8')) if metadata_path.exists() else None
    for n in names:
        minute=RAW/('3w-scaling-'+n+'-minute.csv')
        if minute.exists():
            frame=pd.read_csv(minute)
            values=frame[channels].to_numpy(float)
            truth=[None if pd.isna(k) else int(k) for k in frame['class']]
            timestamps=frame['timestamp'].tolist()
            if metadata is None:raise ValueError('Tracked 3W minute snapshots require exact-onset metadata')
            exact=metadata['sources'][n]['exactOnsets']
            files.append(minute)
        else:
            f=source_file('3w-scaling-'+n+'.parquet','https://raw.githubusercontent.com/petrobras/3W/main/dataset/7/'+n+'.parquet')
            raw=pd.read_parquet(f)
            d=raw[channels].resample('1min').median()
            lab=raw['class'].resample('1min').agg(lambda a:a.mode().iloc[-1] if len(a.mode()) else pd.NA)
            values=d.to_numpy(float)
            truth=[None if pd.isna(k) else int(k) for k in lab]
            timestamps=[str(t) for t in d.index]
            exact={str(c):str(raw.index[np.flatnonzero((raw['class']==c).fillna(False).to_numpy())[0]]) for c in [0,107,7]}
            files.append(f)
        values[:,:2]/=1e6
        data.append(dict(values=values,labels=truth,timestamps=timestamps,name=n,exactOnsets=exact))
    if metadata_path.exists():files.append(metadata_path)
    train_data,test_data=data
    normal=np.flatnonzero(np.asarray([a==0 for a in train_data['labels']]))
    split=normal[0]+int(len(normal)*.75)
    tr=np.arange(normal[0]+11,split)
    va=np.arange(split+11,normal[-1]+1)
    X=np.stack([pca_window(train_data['values'],t) for t in tr])
    mean=X.mean(0);scale=X.std(0);scale[scale<1e-7]=1.
    z=(X-mean)/scale
    pca=PCA(n_components=5,svd_solver='full').fit(z)
    model=finite_json(dict(type='pca',name='因果12min多通道PCA残差',lookback=12,nFeatures=3,inputSize=36,nComponents=5,
                           features=channels,featureUnits=units,preprocessing='within each window subtract its first row; flatten time-major; train-only mean/scale',
                           mean=mean,scale=scale,components=pca.components_.ravel(),explainedVarianceRatio=pca.explained_variance_ratio_,
                           scoreFormula='sqrt(mean((z-(z@C.T)@C)^2))',threshold=None,thresholdCalibration='99.5th percentile source-well training-normal score'))
    train_scores=np.asarray([pca_score(model,x) for x in X]);threshold=float(np.quantile(train_scores,.995));model['threshold']=threshold
    single_scale=float(np.std(X.reshape(-1,12,3)[:,-1,1]));single_scale=max(single_scale,1e-8)
    baseline_train=np.abs(X.reshape(-1,12,3)[:,-1,1])/single_scale
    baseline_threshold=float(np.quantile(baseline_train,.995))
    all_y=[];all_p=[];all_b=[]
    scores=[None]*len(test_data['labels']);base_scores=[None]*len(test_data['labels'])
    for t in range(11,len(scores)):
        x=pca_window(test_data['values'],t)
        scores[t]=pca_score(model,x)
        base_scores[t]=abs(x.reshape(12,3)[-1,1])/single_scale
        if test_data['labels'][t] in [0,107,7]:
            all_y.append(int(test_data['labels'][t] in [107,7]));all_p.append(int(scores[t]>threshold));all_b.append(int(base_scores[t]>baseline_threshold))
    records=[]
    for anchor in [180,300,360,450,550,650,750,775]:
        start=max(0,anchor-89);end=min(len(scores),start+180)
        x=pca_window(test_data['values'],anchor)
        records.append(dict(id=f'3W-00021-m{anchor:04d}',kind='field',split='held-out',sourceId=test_data['name']+'.parquet / minute '+str(anchor),
                            unit='窗口压力差MPa / 温度差°C；分数无量纲；时间min',scope='另一口实测井的节流嘴结垢标签；107已是发展过程，不是事件前预测',
                            input=x,target=test_data['labels'][anchor],baseline=base_scores[anchor],modelPrediction=scores[anchor],
                            display=dict(x=list(range(start,end)),timestamps=test_data['timestamps'][start:end],channels=test_data['values'][start:end],features=channels,
                                         featureNames=['水下树压力','节流嘴上游压力','水下树温度'],units=units,labels=test_data['labels'][start:end],
                                         scores=scores[start:end],baselineScores=base_scores[start:end],selectedIndex=anchor-start,sourceMinute=anchor,
                                         firstWindowReference=test_data['values'][anchor-11],inputWindow=test_data['values'][anchor-11:anchor+1],
                                         defaultThreshold=threshold,baselineThreshold=baseline_threshold,exactOnsets=test_data['exactOnsets'],
                                         unit='min；压力MPa、温度°C',timestampTimezone='原始文件未声明时区')))
    check_scores=np.asarray([pca_score(model,pca_window(train_data['values'],t)) for t in va])
    save(dict(id='pr5',unit='无量纲重建残差；MPa / °C / min',source=dict(title='Petrobras · 3W Dataset 2.0.0 real choke-scaling windows',url='https://github.com/petrobras/3W',license='数据CC BY 4.0；工具Apache-2.0'),
              scope='PCA只拟合WELL-00001正常历史；WELL-00021整井留出，未用其统计量调尺度或门槛',model=model,
              baselineModel=dict(type='single-pressure-window-change',name='单节流嘴上游压力11min变化',feature='P-MON-CKP',window=12,scale=single_scale,threshold=baseline_threshold,
                                 formula='abs(last_pressure-first_window_pressure)/trainNormalChangeSD'),records=records,
              parity=[dict(recordIndex=i,expected=pca_score(model,r['input']),stage='standardized reconstruction RMS before threshold',tolerance=1e-6) for i,r in enumerate(records[:3])],
              validation=dict(split=dict(trainWell=train_data['name'],trainNormalEndMinutes=[int(tr[0]),int(tr[-1])],checkNormalEndMinutes=[int(va[0]),int(va[-1])],
                                         trainWindows=len(tr),checkWindows=len(va),testWell=test_data['name']),metric='F1（107/7视为事件发展）',baseline=f1_score(all_y,all_b,zero_division=0),
                              model=f1_score(all_y,all_p,zero_division=0),n=len(all_y),modelMetrics=metrics(all_y,all_p),baselineMetrics=metrics(all_y,all_b),
                              sourceCheckNormalAlarmRate=np.mean(check_scores>threshold),
                              boundary='整井留出且尺度/门槛固定；只与专家0/107/7阶段比较；PCA残差不证明沉积原因，未调测试门槛强求提升'),
              provenance=provenance(files,counts=dict(trainRawSeconds=76633,testRawSeconds=46574,trainMinuteRows=len(train_data['labels']),testMinuteRows=len(test_data['labels'])),
                                    assumptions=['分钟通道中位数，非缺失标签众数；精确起点回到秒级源索引', '压力Pa除10^6到MPa，温度原为°C', '每个12min窗口减去自身第一行，移除井间绝对压力基准；不拟合测试井标准化', '训练/检查正常窗口边界间隔11min，避免共享窗口', 'class和state仅用于训练正常选择/评价，不入模型', 'QGL及P-PDG在选定文件全零，排除；无结蜡标签'],exactOnsets={d['name']:d['exactOnsets'] for d in data})))


if __name__ == '__main__':
    requested=[arg for arg in sys.argv[1:] if arg != '--reuse-pr1-model'] or ['pr1','pr2','pr3','pr4','pr5']
    builders=dict(pr1=pr1,pr2=pr2,pr3=pr3,pr4=pr4,pr5=pr5)
    for case_id in requested:
        if case_id not in builders:raise SystemExit('Unknown production case '+case_id)
        print('Preparing',case_id,flush=True)
        builders[case_id]()
