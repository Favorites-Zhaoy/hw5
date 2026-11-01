"""Task-specific M4 regressor, with the original well split kept frozen.

Fit logROP from four tabular operating channels. Hyperparameters are fixed
before evaluation; neither validation nor test scores select settings.
The historical MLP data/model are preserved as an explicit comparison.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
import sklearn
from sklearn.ensemble import RandomForestRegressor

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'real-data/m4.json'
original = json.loads(SOURCE.read_text(encoding='utf-8'))
data = json.loads(SOURCE.read_text(encoding='utf-8'))
train_records = [r for r in data['records'] if r['well'] == '15/9-F-1-C']
test_records = [r for r in data['records'] if r['well'] == '15/9-F-5']


def inputs(records):
    return np.array([[r['wob'][i], r['rpm'][i], r['torque'][i], r['flow'][i]] for r in records for i in range(len(r['depth']))], dtype='float32')


def target(records):
    return np.array([v for r in records for v in r['rop']], dtype='float64')


x, y = inputs(train_records), target(train_records)
split = original['model']['trainRows']
assert split == 794 and len(y) == 1059
fit_ids = [v for r in train_records for v in r['rawRowIds']][:split]
test_ids = [v for r in test_records for v in r['rawRowIds']]
assert not set(fit_ids) & set(test_ids)
model = RandomForestRegressor(n_estimators=100, max_depth=5, min_samples_leaf=8, max_features=1.0, bootstrap=True, random_state=1724, n_jobs=1)
model.fit(x[:split], np.log(y[:split]))
trees = []
for estimator in model.estimators_:
    tree = estimator.tree_
    trees.append([[int(tree.feature[i]), float(tree.threshold[i]), int(tree.children_left[i]), int(tree.children_right[i]), float(tree.value[i, 0, 0])] for i in range(tree.node_count)])
payload = dict(kind='random-forest-regressor', name='Volve-ROP-RandomForest-2.0.1', inputFields=['WOB_kN', 'RPM', 'torque_kNm', 'flow_Ls'], output='mean tree log(ROP_mh), then exp', trees=trees, treeCount=len(trees), featureImportances=model.feature_importances_.tolist(), hyperparameters=model.get_params(), trainingWell='15/9-F-1-C', trainRows=split, validationRows=len(y)-split, testWell='15/9-F-5', seed=1724, sklearn=sklearn.__version__, backend='Exact float32-input tree traversal and mean logROP in JavaScript')
payload['sha256'] = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def evaluate(features, observed):
    prediction = np.exp(model.predict(features))
    return dict(count=len(observed), mae_mh=float(np.abs(prediction-observed).mean()))


payload['validationROP'] = evaluate(x[split:], y[split:])
test_y = target(test_records)
payload['heldoutROP'] = dict(**evaluate(inputs(test_records), test_y), constantTrainMedian_mh=original['model']['heldoutROP']['constantTrainMedian_mh'], constantMAE_mh=original['model']['heldoutROP']['constantMAE_mh'], definition='Same independent F-5 well; observed ROP regression, not geological boundary accuracy.')
for r in data['records']:
    r['predictedROP'] = np.exp(model.predict(inputs([r]))).tolist()
data.update(version='2.0.1', model=payload, modelSha256=payload['sha256'], referenceMLP=dict(sourceFile='tools/mudlogging/real-data/m4.json', sourceSha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(), modelSha256=original['modelSha256'], heldoutROP=original['model']['heldoutROP']), modelPreparation=dict(script='tools/mudlogging/prepare-drilling-forest.py', sourceDatasetSha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(), selection='Chosen for the tabular operating-response task. No settings selected using held-out F-5 outcomes.', fitIds=fit_ids, validationIds=[v for r in train_records for v in r['rawRowIds']][split:], testIds=test_ids))
(HERE/'real-data/m4-forest.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8', newline='\n')
print(json.dumps(dict(model=payload['name'], validation=payload['validationROP'], test=payload['heldoutROP'], originalMLP=data['referenceMLP']['heldoutROP'], nodes=sum(len(t) for t in trees)), ensure_ascii=False))
