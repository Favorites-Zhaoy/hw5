"""Reproduce r1..r5 CPU teaching assets; no network and no shared UI writes.

Uses tracked source snapshots and the repository's existing NumPy/PyTorch export
helpers. See source-data/refining/README.md for exact runtime and NLP schemas.
Run: python -X utf8 tools/downstream/prepare-refining.py [--cases r1 r2 ...]
"""
from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import importlib.util
import itertools
import json
import math
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import torch
from torch import nn

BASE = Path(__file__).resolve().parents[2]
SRC = BASE / "tools/downstream/source-data/refining"
OUT = BASE / "assets/downstream/data"
SEED = 20261103
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("operations_export_helpers", BASE / "tools/operations/prepare-eor.py")
O = importlib.util.module_from_spec(spec)
spec.loader.exec_module(O)


def source(title, url, license):
    return {"title": title, "url": url, "license": license}


SOURCES = {
    "r1": source("原创受控馏分分割模型；IDAES蒸馏约束建模背景", "https://idaes-examples.readthedocs.io/en/latest/docs/flowsheets/hda_flowsheet_with_distillation_doc.html", "原创教学模拟，无外部数据复制；IDAES仅作方法背景，未复现其流程模型。"),
    "r2": source("ML-PSE · FCCU normal-operation simulation trajectories", "https://github.com/ML-PSE/Fluid-Catalytic-Cracking-Unit-Dataset-for-Process-Monitoring-Evaluation", "MIT; Copyright2023 Ankur Kumar; LICENSE snapshot retained."),
    "r3": source("Karapalidou et al. · Bearing vibration metrics", "https://zenodo.org/records/7589904", "CC BY4.0; DOI10.5281/zenodo.7589904"),
    "r4": source("原创受控LIMS审核文本、规则与分配任务", "https://pubmed.ncbi.nlm.nih.gov/12123149/", "原创受控教学语料；链接为否定范围方法背景，非现场LIMS数据，未复制论文文本。"),
    "r5": source("Kim & Kwon · Synthetic29-day debutanizer demonstration", "https://github.com/Danny-Taehyun-Kim/debutanizer-hybrid-model", "MIT; original LICENSE and explicit synthetic-data documentation retained."),
}


def read_csv(name):
    with (SRC / name).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def meta(cid, counts, assumptions):
    return {"seed": SEED + 100 + int(cid[1:]), "sources": [SOURCES[cid]], "counts": counts,
            "assumptions": assumptions, "preparationScript": "tools/downstream/prepare-refining.py",
            "sourceIndex": "tools/downstream/source-data/refining/source-index.json", "rawFilesModified": False}


def mlp_export(network, xm, xs, ym, ys, name):
    return {"type": "mlp", "name": name, "mean": xm, "scale": xs,
            "layers": [O.dense_export(network[0], "tanh"), O.dense_export(network[2], "tanh"), O.dense_export(network[4])],
            "outputMean": ym, "outputScale": ys}


def toy_distillation(x):
    x = np.asarray(x, dtype=float)
    one = x.ndim == 1
    x = np.atleast_2d(x)
    t1, t2, reflux, heavy = x.T
    boiling = np.array([110, 165, 220, 280, 335, 390, 470.0])
    base = np.array([.12, .16, .18, .18, .16, .12, .08])
    weights = base[None] * np.exp((heavy[:, None] - .4) * (boiling[None] - 280) / 100)
    weights /= weights.sum(axis=1, keepdims=True)
    width = 26 / (1 + .55 * reflux)
    low = O.sigmoid((t1[:, None] - boiling) / width[:, None])
    high = O.sigmoid((t2[:, None] - boiling) / width[:, None])
    light = np.sum(weights * low, axis=1)
    middle = np.sum(weights * (high - low), axis=1)
    residue = 1 - light - middle
    overlap = np.sum(weights * (4 * low * (1 - low) + 4 * high * (1 - high)) / 2, axis=1)
    duty = 1 + .18 * reflux + .0012 * (t2 - 300) + .001 * (t1 - 150)
    result = np.stack([100 * light, 100 * middle, 100 * residue, 100 * overlap, duty], axis=1)
    return result[0] if one else result


def r1():
    rng = O.seed(SEED + 101)
    x, groups = [], []
    for group, heavy in enumerate([.20, .25, .30, .35, .40, .45, .50, .55, .60]):
        for _ in range(120):
            x.append([rng.uniform(150, 220), rng.uniform(300, 370), rng.uniform(.5, 4), heavy])
            groups.append(group)
    x, groups = np.asarray(x), np.array(groups)
    y = toy_distillation(x)
    train = np.flatnonzero(np.isin(groups, [0, 2, 3, 5, 6, 8]))
    val, test = np.flatnonzero(groups == 4), np.flatnonzero(np.isin(groups, [1, 7]))
    xm, xs = O.scale_fit(x[train]); ym, ys = O.scale_fit(y[train])
    network = nn.Sequential(nn.Linear(4, 18), nn.Tanh(), nn.Linear(18, 14), nn.Tanh(), nn.Linear(14, 5))
    training = O.train_loop(network, [(x - xm) / xs], (y - ym) / ys, train, val, epochs=1100, patience=100, lr=.005)
    with torch.no_grad(): pred = network(torch.tensor((x - xm) / xs, dtype=torch.float32)).numpy() * ys + ym
    model = mlp_export(network, xm, xs, ym, ys, "4→18→14→5 controlled fraction-split response MLP")
    names = ["轻馏分wt%", "中馏分wt%", "重馏分wt%", "切割交叠指标", "相对热负荷"]
    records = []
    for n, i in enumerate(test[np.linspace(0, len(test) - 1, 6, dtype=int)]):
        records.append({"id": f"split-{n+1}", "kind": "controlled-synthetic", "scope": "Reduced toy split, no vacuum-system or plant validation", "sourceId": f"seed{SEED+101}/feed-group{groups[i]}/row{i}", "split": "held-out", "input": x[i], "target": y[i], "baseline": y[i], "_torchReference": pred[i],
                        "display": {"conditions": {"cut1_C": x[i, 0], "cut2_C": x[i, 1], "reflux": x[i, 2], "heavyIndex": x[i, 3]}, "outputNames": names, "reference": y[i], "baselineName": "独立解析玩具模型", "warning": "不含真空系统、塔板MESH或现场验证；相对热负荷不是kWh。"}})
    return O.add_parity({"id": "r1", "unit": "wt% / 无量纲", "source": SOURCES["r1"], "scope": "常减压背景下的受控馏分切割与回流教学代理；非工业装置模型。", "model": model, "records": records,
                        "physics": {"boiling_C": [110,165,220,280,335,390,470], "baseWeights": [.12,.16,.18,.18,.16,.12,.08], "formula": "w_i=normalize(base_i*exp((heavyIndex-.4)*(B_i-280)/100)); s=26/(1+.55R); f1=sigmoid((cut1-B)/s); f2=sigmoid((cut2-B)/s); light=sum(w*f1); middle=sum(w*(f2-f1)); heavy=1-light-middle; overlap=100*sum(w*(4*f1*(1-f1)+4*f2*(1-f2))/2); relativeDuty=1+.18R+.0012*(cut2-300)+.001*(cut1-150)", "inputNames": ["cut1_C","cut2_C","reflux","heavyIndex"], "outputNames": names},
                        "optimization": {"variables": [0,1,2], "ranges": [[150,220],[300,370],[.5,4]], "steps": [13,13,11], "objectiveIndex": 1, "defaultOverlapCap": 25, "defaultDutyCap": 1.65, "constraints": ["cut2-cut1>=100 C", "predicted overlap<=cap", "predicted relativeDuty<=cap", "all fractions>=0 and sum approximately100"], "requiredRecheck": "toy_distillation formula checks the final candidate; no facility energy-saving claim"},
                        "validation": {"split": "6 feed-heavy-index groups train720; group.40 validate120; groups.25/.55 test240; all operating samples in a feed group stay together", "metric": "mean absolute normalized response error (%)", "baseline": 0, "model": float(np.mean(np.abs((pred[test]-y[test])/ys))*100), "perOutputMAE": np.mean(np.abs(pred[test]-y[test]),axis=0), "n": len(test), "training": training, "boundary": "Labels come from the declared toy equations; exact reference has zero label error by construction."},
                        "provenance": meta("r1", {"simulationRows": len(x),"test":len(test)}, ["independently generated synthetic data", "no true-vacuum-system or plant validation", "heat metric is relative only"])})


def fcc_arrays():
    results = []
    for name, run in [("FCC-NOC_varyingFeedFlow_outputs.csv","varying7d"),("FCC-NOC_stableFeedFlow_outputs.csv","stable2d")]:
        raw = np.loadtxt(SRC / name, delimiter=",")
        # Original minute sampling retained at every5th source row, no interpolation.
        a = raw[::5]
        inputs = a[:, [1,10,11,24,39]]
        targets = 100 * a[:, [34,35,36,37,38]] / (60 * a[:, 1,None])
        results.append((run, a[:,0], inputs, targets, np.arange(len(raw))[::5] + 1))
    return results


def r2():
    O.seed(SEED + 102)
    x,y,metadata=[],[],[]
    for run,t,inputs,targets,rows in fcc_arrays():
        for j in range(7,len(t)):
            x.append(inputs[j-7:j+1]);y.append(targets[j]);metadata.append({"run":run,"t":t,"inputs":inputs,"targets":targets,"rows":rows,"j":j})
    x,y=np.asarray(x),np.asarray(y)
    train=np.array([i for i,m in enumerate(metadata) if m['run']=='varying7d' and m['t'][m['j']]<=5760])
    val=np.array([i for i,m in enumerate(metadata) if m['run']=='varying7d' and 5760<m['t'][m['j']]<=7200])
    test=np.array([i for i,m in enumerate(metadata) if m['run']=='varying7d' and m['t'][m['j']]>7200])
    transfer=np.array([i for i,m in enumerate(metadata) if m['run']=='stable2d'])
    xm,xs=O.scale_fit(x[train]);ym,ys=O.scale_fit(y[train])
    net=O.SmallGRU(5,8)
    # Multi-output GRU uses the same standard gate schema; replace only the head.
    net.head=nn.Linear(8,5)
    training=O.train_loop(net,[(x-xm)/xs],(y-ym)/ys,train,val,epochs=600,patience=70,lr=.004)
    with torch.no_grad():p=net(torch.tensor((x-xm)/xs,dtype=torch.float32)).numpy()*ys+ym
    baseline=np.array([m['targets'][m['j']-1] for m in metadata])
    model=O.export_gru(net,xm,xs,ym,ys,"FCC five-product yield GRU,8×5 history→5 outputs")
    model.update({"inputNames":["feed_lb_s","reactor_F","regenerator_F","regenerated_catalyst_lb_min","reflux_lb_min"],"outputNames":["LPG","LN","HN","LCO","Slurry"]})
    chosen=list(test[np.linspace(0,len(test)-1,3,dtype=int)])+list(transfer[np.linspace(0,len(transfer)-1,3,dtype=int)])
    records=[]
    for i in chosen:
        m=metadata[i];j=m['j'];ix=np.arange(max(7,j-20),min(len(m['t']),j+21),2)
        full_index=[k for k,z in enumerate(metadata) if z['run']==m['run'] and z['j'] in ix]
        records.append({"id":f"FCC-{m['run']}-m{int(m['t'][j])}","kind":"published-simulation","scope":"Public simulated FCC operating trajectory; conditional response, not causal plant validation","sourceId":f"{m['run']}/original-row-{int(m['rows'][j])}","split":"held-out","input":x[i],"target":y[i],"baseline":baseline[i],"_torchReference":p[i],"display":{"sourceRun":m['run'],"minute":m['t'][j],"sourceRow":int(m['rows'][j]),"historyMinutes":m['t'][j-7:j+1],"historyInputs":x[i],"inputNames":model['inputNames'],"inputUnits":["lb/s","F","F","lb/min","lb/min"],"productNames":model['outputNames'],"seriesMinutes":[metadata[k]['t'][metadata[k]['j']] for k in full_index],"actualSeries":y[full_index],"predictedSeries":p[full_index],"baselineName":"previous measured/simulated5-minute product yields","catalystOilRatio":x[i,-1,3]/(60*x[i,-1,0]),"yieldFormula":"100*product_lb_min/(60*feed_lb_s)","warning":"LN/HN是轻/重石脑油，非成品汽油；未提供干气收率。"}})
    stats=lambda ids:{"n":len(ids),"modelMAE":float(np.mean(np.abs(p[ids]-y[ids]))),"baselineMAE":float(np.mean(np.abs(baseline[ids]-y[ids])))}
    return O.add_parity({"id":"r2","unit":"wt% product yield","source":SOURCES['r2'],"scope":"真实时间顺序的公开FCC仿真，多产品收率回归与有边界条件候选。","model":model,"records":records,
                        "optimization":{"controlIndices":[1,3],"controlNames":["reactor_F","regenerated_catalyst_lb_min"],"ranges":[[float(x[train,:,k].min()),float(x[train,:,k].max())] for k in [1,3]],"steps":[13,13],"productWeights":[.7,1,.8,.6,.1],"defaultSlurryCap":3.0,"defaultLPGCap":35,"constraints":["controls inside training support","all yields>=0","sum selected yields<=100.5 wt%","Slurry<=selected cap; LPG<=selected cap"],"candidateUpdate":"Change the last input row only, keep the earlier context fixed. Output is current conditional surrogate response, not instant physical intervention truth.","boundary":"A conditional prediction score is not confirmed process improvement; candidates require simulator/engineer verification."},
                        "validation":{"split":{"train":"varying-feed first4days","validation":"varying-feed day5","test":"varying-feed days6-7","transfer":"entire separate stable-feed2day simulation","counts":[len(train),len(val),len(test),len(transfer)]},"metric":"MAE across5 product yields in percentage points","baseline":stats(test)['baselineMAE'],"model":stats(test)['modelMAE'],"n":len(test),"perOutputMAE":np.mean(np.abs(p[test]-y[test]),axis=0),"details":{"timeTest":stats(test),"separateTrajectory":stats(transfer)},"training":training,"boundary":"Actual simulation minute indices retained. No random windows, no product flows in network inputs; current process conditions are available for same-time soft prediction."},
                        "provenance":meta('r2',{'originalMinutes':12960,'retainedEveryMinutes':5,'windows':len(x)},['source signals1,10,11,24,39; product34..38','feed lb/s vs product lb/min converted explicitly','not industrial measurements','two trajectories share model and some initial conditions'])})


def r3():
    O.seed(SEED+103)
    rows=read_csv('bearing_vibration_metrics.csv')
    blocks={state:[(i,r) for i,r in enumerate(rows) if r['Bearing State']==state] for state in ['1','2','3']}
    x,y,meta_rows=[],[],[]
    for state,block in blocks.items():
        values=np.array([[float(r['V-RMS']),float(r['a-RMS']),float(r['Temperature'])] for _,r in block])
        for j in range(12,len(block),4):
            x.append(values[j-12:j]);y.append([values[j,0]]);meta_rows.append({'state':state,'j':j,'sourceRow':block[j][0]+1,'values':values})
    x,y=np.array(x),np.array(y)
    train=np.array([i for i,m in enumerate(meta_rows) if m['state']=='1' and m['j']<2000])
    val=np.array([i for i,m in enumerate(meta_rows) if m['state']=='1' and 2012<=m['j']<2600])
    test=np.array([i for i,m in enumerate(meta_rows) if m['state']=='1' and m['j']>=2612])
    xm,xs=O.scale_fit(x[train]);ym,ys=O.scale_fit(np.log(y[train]))
    net=O.SmallGRU(3,6)
    training=O.train_loop(net,[(x-xm)/xs],(np.log(y)-ym)/ys,train,val,epochs=700,patience=85,lr=.004)
    with torch.no_grad():p=np.exp(net(torch.tensor((x-xm)/xs,dtype=torch.float32)).numpy()*ys+ym)[:,0]
    baseline=x[:,-1,0];residual=y[:,0]-p
    threshold=float(np.quantile(np.abs(residual[val]),.95))
    model=O.export_gru(net,xm,xs,ym,ys,'Normal-bearing past12×3 GRU next-vibration predictor');model['outputTransform']='exp'
    model['inputNames']=['v_RMS_m_s','a_RMS_m_s2','temperature_C'];model['outputNames']=['next_v_RMS_m_s']
    records=[]
    selected=[test[len(test)//2]]
    for state in ['2','3']:
        ix=[i for i,m in enumerate(meta_rows) if m['state']==state]
        selected += [ix[len(ix)//3],ix[2*len(ix)//3]]
    for i in selected:
        m=meta_rows[i];same=[k for k,z in enumerate(meta_rows) if z['state']==m['state'] and abs(z['j']-m['j'])<=120]
        records.append({'id':f"bearing-state{m['state']}-row{m['sourceRow']}",'kind':'laboratory-measured','scope':'Bearing grease-state lab transfer; monitoring method only, no refinery failure/RUL truth','sourceId':f"zenodo7589904/source-row{m['sourceRow']}",'split':'held-out','input':x[i],'target':y[i,0],'baseline':baseline[i],'_torchReference':[p[i]],'display':{'state':m['state'],'stateMeaning':{'1':'sealed/recommended grease','2':'unsealed/no grease','3':'unsealed/excess grease'}[m['state']],'sourceRow':m['sourceRow'],'nominalStepMinutes':2,'historyRelativeMinutes':list(range(-24,0,2)),'series':{'relativeMinutes':[2*(meta_rows[k]['j']-m['j']) for k in same],'actual':y[same,0],'prediction':p[same],'residual':residual[same]},'warning':'原记录无实际日期时间；只使用块内次序与作者给定2分钟间隔，不把三种状态拼作一次退化过程。','baselineName':'last observed v-RMS'}})
    return O.add_parity({'id':'r3','unit':'m/s vibration velocity','source':SOURCES['r3'],'scope':'轴承实验时序监测方法迁移示例；无炼厂失效日期或剩余寿命证据。','model':model,'records':records,'alarm':{'absoluteResidualThreshold':threshold,'quantile':.95,'consecutive':3,'calibration':'normal-state validation block only','defaultMultiplier':1,'meaning':'sustained forecast mismatch for manual inspection, not confirmed failure'},'validation':{'split':{'train':'state1 positions<2000, windows12, stride4','validation':'state1 positions2012..2599','test':'state1 positions>=2612','transfer':'states2/3 never used to train or set threshold','counts':[len(train),len(val),len(test)]},'metric':'normal-test next-vibration MAE m/s','baseline':float(np.mean(np.abs(baseline[test]-y[test,0]))),'model':float(np.mean(np.abs(residual[test]))),'n':len(test),'normalTestThresholdExceedanceRate':float(np.mean(np.abs(residual[test])>threshold)),'training':training,'boundary':'Grease-state labels are operating-condition labels, not failure-time labels. No RUL or refinery field sensitivity claim.'},'provenance':meta('r3',{'sourceRows':len(rows),'normal':3296,'noGrease':2636,'excessGrease':2637},['units as deposited: v-RMS m/s, a-RMS m/s2, tempC','nominal2-minute order, no timestamps','windows never cross grease blocks or split purge gaps'])})


CLASSES=['affirmed-risk','negated-risk','uncertain']
PHRASES=[
 ['本次硫超限，建议复测。','未见硫超限，记录正常。','硫是否超限暂不能判定，等待复测。'],
 ['硫结果异常，需审核。','硫未超标，不支持异常结论。','硫数据存疑，请补充证据。'],
 ['sulfur above limit; review required.','sulfur not above limit; no anomaly detected.','sulfur uncertain; repeat assay pending.'],
 ['检测提示硫超标，安排核查。','检测没有发现硫异常。','检测结果尚不能确认，留待审核。'],
 ['确认硫异常，需复核报告。','复核未检出超限，暂记正常。','无法确认是否异常，报告待签。'],
 ['sulfur exceeds limit, confirm review.','no sulfur exceedance was found.','unable to confirm sulfur status; evidence missing.'],
 ['本批硫指标超出范围，转审核。','本批未发现硫超限，无异常证据。','硫指标待确认，不能下结论。'],
 ['sulfur abnormal result requires checking.','sulfur remains within limit, no abnormality.','review pending: sulfur conclusion is uncertain.']]


EXTRACTOR={
 'normalization':'NFKC,lowercase; keep whitespace for field patterns',
 'patterns':[
  {'field':'sampleId','pattern':r'(?:样品|sample)\s*(?:id|编号)?\s*[:：#]?\s*([a-z]{1,8}-?\d+)','valueGroup':1},
  {'field':'sulfur','pattern':r'(?:硫含量|硫|sulfur)\s*[:：=]?\s*([+-]?\d+(?:\.\d+)?)\s*(mg\s*/\s*kg|ppm|wt%|质量%|%)','valueGroup':1,'unitGroup':2},
  {'field':'density','pattern':r'(?:密度|density)\s*[:：=]?\s*([+-]?\d+(?:\.\d+)?)\s*(kg\s*/\s*m3|g\s*/\s*cm3)','valueGroup':1,'unitGroup':2},
  {'field':'flashPoint','pattern':r'(?:闪点|flash\s*point)\s*[:：=]?\s*([+-]?\d+(?:\.\d+)?)\s*(°c|degc|c)','valueGroup':1,'unitGroup':2}],
 'unitRules':{'sulfur':{'mg/kg':1,'ppm':1,'wt%':10000,'质量%':10000},'density':{'kg/m3':1,'g/cm3':1000},'flashPoint':{'°c':1,'degc':1,'c':1}},
 'negationCues':['未见','未发现','未检出','未超标','没有发现','no ','not ','within limit'],
 'uncertaintyCues':['待确认','待签','存疑','不能判定','无法确认','不能确认','不能下结论','uncertain','pending','unable to confirm'],
 'negationScope':{'delimiterPattern':'[。；;!?！？]','fieldKeywords':['硫','sulfur'],'rule':'retain negation cues only in a clause containing sulfur/硫; keep evidence separate from classifier logits'},
 'demoLimits':{'sulfurMax_mg_kg':10,'flashMin_C':60,'densityRange_kg_m3':[700,900]},
 'boundary':'Demo audit limits are classroom assumptions, not legal product specifications. Unspecified % basis is unresolved, not automatically wt%.'}
REVIEWERS=[{'id':'lab','name':'实验复核','skills':['chem','unit'],'capacity':12,'costPerMinute':1},
           {'id':'lims','name':'LIMS审核','skills':['data','unit'],'capacity':10,'costPerMinute':1.15},
           {'id':'process','name':'工艺审核','skills':['process','chem'],'capacity':10,'costPerMinute':1.2}]


def normalize_text(text, remove_space=True):
    text=unicodedata.normalize('NFKC',text).lower()
    return re.sub(r'\s+','',text) if remove_space else text


def grams(text):
    chars=list(normalize_text(text));return chars+[''.join(chars[i:i+2]) for i in range(len(chars)-1)]


def text_features(text,vocabulary,idf):
    counts=collections.Counter(grams(text));v=np.array([counts[t]*idf[i] for i,t in enumerate(vocabulary)],dtype=float)
    return v/max(np.linalg.norm(v),1e-12)


def parse_lims(text, assertion):
    text=normalize_text(text,False);fields={};issues=[]
    for rule in EXTRACTOR['patterns']:
        match=re.search(rule['pattern'],text,re.I)
        if not match:continue
        field=rule['field']
        if field=='sampleId':fields[field]=match.group(1);continue
        rawunit=re.sub(r'\s+','',match.group(rule['unitGroup']));value=float(match.group(rule['valueGroup']))
        multiplier=EXTRACTOR['unitRules'][field].get(rawunit)
        fields[field]={'rawValue':value,'rawUnit':rawunit,'normalizedValue':None if multiplier is None else value*multiplier}
        if multiplier is None:issues.append('unit_basis_unknown')
    sulfur=fields.get('sulfur',{}).get('normalizedValue')
    if sulfur is None:issues.append('missing_sulfur_evidence')
    elif sulfur>10:issues.append('sulfur_limit')
    if fields.get('flashPoint',{}).get('normalizedValue',100)<60:issues.append('flash_low')
    density=fields.get('density',{}).get('normalizedValue')
    if density is not None and not 700<=density<=900:issues.append('density_range')
    clauses=[part for part in re.split(EXTRACTOR['negationScope']['delimiterPattern'],text) if '硫' in part or 'sulfur' in part]
    negation=[cue for cue in EXTRACTOR['negationCues'] if any(cue in part for part in clauses)]
    uncertain=[cue for cue in EXTRACTOR['uncertaintyCues'] if cue in text]
    if sulfur is not None and sulfur>10 and (assertion==1 or negation):issues.append('assertion_numeric_conflict')
    if assertion==2 or uncertain:issues.append('uncertain_assertion')
    return {'fields':fields,'issues':issues,'assertion':CLASSES[assertion],'cueEvidence':{'negation':negation,'uncertain':uncertain}}


def review_tasks(parsed):
    tasks=[{'id':'identity','minutes':3,'risk':1,'skill':'data'}]
    if any(k!='sampleId' for k in parsed['fields']):tasks.append({'id':'unit','minutes':4,'risk':2,'skill':'unit'})
    if any(k in parsed['issues'] for k in ['sulfur_limit','flash_low','density_range']):tasks.append({'id':'retest','minutes':10,'risk':5,'skill':'chem'})
    if any(k in parsed['issues'] for k in ['assertion_numeric_conflict','uncertain_assertion']):tasks.append({'id':'context','minutes':8,'risk':4,'skill':'process'})
    if any(k in parsed['issues'] for k in ['missing_sulfur_evidence','unit_basis_unknown']):tasks.append({'id':'evidence','minutes':6,'risk':3,'skill':'data'})
    tasks.append({'id':'report','minutes':4,'risk':1,'skill':'data'})
    return tasks


def assign_exact(tasks,reviewers=REVIEWERS):
    best=None
    for assign in itertools.product(range(-1,len(reviewers)),repeat=len(tasks)):
        loads=[0]*len(reviewers);risk=0;cost=0;valid=True
        for task,k in zip(tasks,assign):
            if k<0:continue
            if task['skill'] not in reviewers[k]['skills']:valid=False;break
            loads[k]+=task['minutes'];risk+=task['risk'];cost+=task['minutes']*reviewers[k]['costPerMinute']
        if not valid or any(load>person['capacity'] for load,person in zip(loads,reviewers)):continue
        score=(risk,-cost)
        if best is None or score>best['score']:best={'score':score,'assignment':list(assign),'loads':loads,'coveredRisk':risk,'cost':cost,'tasks':tasks}
    best.pop('score');return best


def r4():
    rng=O.seed(SEED+104);notes=[]
    for family,phrases in enumerate(PHRASES):
        for label,phrase in enumerate(phrases):
            for replicate in range(16):
                sulfur=int(rng.choice([5,8,12,15,30,40]));unit=str(rng.choice(['mg/kg','ppm','wt%','%']))
                raw=f'{sulfur/10000:.4f}' if unit=='wt%' else str(sulfur)
                density=round(rng.uniform(.76,.89),3);flash=int(rng.integers(45,85))
                # The identifier must not encode the assertion label.
                sample_number=int(rng.integers(100000,999999))
                text=f"样品 S{sample_number}：硫含量 {raw} {unit}；密度 {density} g/cm3；闪点 {flash} °C。{phrase}"
                notes.append({'id':f'LIMS-{family}-{label}-{replicate}','family':family,'text':text,'label':label})
    train=np.array([i for i,n in enumerate(notes) if n['family']<5]);val=np.array([i for i,n in enumerate(notes) if n['family']==5]);test=np.array([i for i,n in enumerate(notes) if n['family']>=6])
    df=collections.Counter()
    for i in train:df.update(set(grams(notes[i]['text'])))
    vocabulary=sorted(df,key=lambda t:(-df[t],t))[:260];idf=np.array([np.log((len(train)+1)/(df[t]+1))+1 for t in vocabulary])
    x=np.array([text_features(n['text'],vocabulary,idf) for n in notes]);labels=np.array([n['label'] for n in notes]);target=torch.tensor(labels,dtype=torch.long)
    net=nn.Sequential(nn.Linear(len(vocabulary),28),nn.Tanh(),nn.Linear(28,14),nn.Tanh(),nn.Linear(14,3));opt=torch.optim.Adam(net.parameters(),lr=.01);tx=torch.tensor(x,dtype=torch.float32)
    best=float('inf');state=None;selected_epoch=0
    for epoch in range(320):
        opt.zero_grad();loss=nn.functional.cross_entropy(net(tx[train]),target[train]);loss.backward();opt.step()
        with torch.no_grad():vl=nn.functional.cross_entropy(net(tx[val]),target[val]).item()
        if vl<best:best=vl;state={k:v.detach().clone() for k,v in net.state_dict().items()};selected_epoch=epoch+1
    net.load_state_dict(state)
    with torch.no_grad():logits=net(tx).numpy()
    model=mlp_export(net,np.zeros(len(vocabulary)),np.ones(len(vocabulary)),np.zeros(3),np.ones(3),'Character TF-IDF→28→14→3 assertion classifier')
    predictions=logits.argmax(axis=1)
    # One per assertion in each held-out wording family, no easiest-example filter.
    selected=[next(i for i in test if notes[i]['family']==f and notes[i]['label']==k) for f in [6,7] for k in [0,1,2]]
    records=[]
    for i in selected:
        n=notes[i];parsed=parse_lims(n['text'],int(predictions[i]));tasks=review_tasks(parsed)
        records.append({'id':n['id'],'kind':'controlled-synthetic','scope':'Synthetic audit wording and classroom numeric limits, no actual product release decision','sourceId':f"controlled-template-family{n['family']}/{n['id']}",'split':'held-out','input':x[i],'target':int(labels[i]),'baseline':0,'_torchReference':logits[i],'display':{'text':n['text'],'goldAssertion':CLASSES[labels[i]],'parsedReference':parsed,'reviewTasks':tasks,'assignmentReference':assign_exact(tasks),'baselineName':'always affirmed-risk majority/tie baseline','warning':'默认解析与最优分配仅供核对；编辑文本后必须重新分词、推理、抽取、生成任务和求解。'}})
    corpus={'kind':'independently-authored controlled synthetic','notes':notes,'splitRule':'family<5 train; family5 validate; family6/7 held out'}
    O.write(SRC/'lims-controlled-corpus.json',corpus)
    return O.add_parity({'id':'r4','unit':'assertion class / mg/kg / minutes','source':SOURCES['r4'],'scope':'可改文本的字符NLP、单位审核和有容量技能约束的任务分配；非现场合规判定。','model':model,'records':records,
                        'textPipeline':{'normalization':'NFKC,lowercase,remove-all-whitespace','ngrams':[1,2],'vocabulary':vocabulary,'idf':idf,'tf':'raw-count','norm':'l2','idfFormula':'log((N_train+1)/(df_train+1))+1','classes':CLASSES,'trainDocuments':len(train),'vectorization':'Unicode code points (JS Array.from), unigrams then adjacent bigrams; unknown grams ignored; zero norm stays zero','output':'OperationsMath.mlp outputs3logits; argmax maps to classes; scores are not calibrated compliance probability'},'extractor':EXTRACTOR,
                        'optimization':{'reviewers':REVIEWERS,'taskTemplates':{'identity':{'minutes':3,'risk':1,'skill':'data'},'unit':{'minutes':4,'risk':2,'skill':'unit'},'retest':{'minutes':10,'risk':5,'skill':'chem'},'context':{'minutes':8,'risk':4,'skill':'process'},'evidence':{'minutes':6,'risk':3,'skill':'data'},'report':{'minutes':4,'risk':1,'skill':'data'}},'taskRules':{'identity':'always','unit':'any extracted measurement','retest':'sulfur_limit or flash_low or density_range','context':'assertion_numeric_conflict or uncertain_assertion','evidence':'missing_sulfur_evidence or unit_basis_unknown','report':'always'},'objective':'lexicographic maximize covered risk, then minimize sum minutes*reviewer.costPerMinute','constraints':['each task assigned at most once','required skill present','per-reviewer total minutes<=capacity'],'unassigned':'allowed and visibly retained; never claim all tasks reviewed','independentReference':'Python exhaustive enumeration over(-1,0,1,2)^taskCount; -1 means unassigned'},
                        'validation':{'split':'template-family groups train5×3×16=240; validate1×3×16=48; heldout2×3×16=96; no row-random split','metric':'assertion accuracy on unseen wording families','baseline':float(np.mean(labels[test]==0)),'model':float(np.mean(predictions[test]==labels[test])),'n':len(test),'selectedEpoch':selected_epoch,'confusion':[[int(np.sum((labels[test]==a)&(predictions[test]==b))) for b in range(3)] for a in range(3)],'boundary':'Synthetic wording and cases; status label is textual assertion, not numeric quality truth. Numeric contradictions intentionally remain review tasks.'},'provenance':meta('r4',{'controlledDocuments':len(notes),'vocabulary':len(vocabulary)},['train-only IDF and vocabulary','no pretrained or hosted NLP inference','number values sampled independently from assertion to prevent numeric shortcut','SI conversion not legal specification','assignment risk/minutes/capacities are teaching values'])})


def r5():
    O.seed(SEED+105);rows=read_csv('debutanizer_synthetic_29days.csv')
    names=['Feed_C2_mol%','Feed_C3_mol%','Feed_nC4_mol%','F_kmolh','PIC3000_barg','RD_ratio']
    values=np.array([[float(r[k]) for k in names] for r in rows]);targets=np.array([float(r['LPG_TVP_kgcm2']) for r in rows])
    js=np.arange(2,len(rows));x=np.array([values[j-2:j+1] for j in js]);y=targets[js,None]
    train=np.flatnonzero(js<20);val=np.flatnonzero((js>=20)&(js<24));test=np.flatnonzero(js>=24)
    xm,xs=O.scale_fit(x[train]);ym,ys=O.scale_fit(y[train]);net=O.SmallGRU(6,5)
    training=O.train_loop(net,[(x-xm)/xs],(y-ym)/ys,train,val,epochs=650,patience=90,lr=.006)
    with torch.no_grad():p=(net(torch.tensor((x-xm)/xs,dtype=torch.float32)).numpy()*ys+ym)[:,0]
    bxm,bxs=O.scale_fit(x[train,-1,:]);bz=(x[:,-1,:]-bxm)/bxs
    coef=np.linalg.solve(bz[train].T@bz[train]+np.eye(bz.shape[1]),bz[train].T@((y[train]-ym)/ys))
    baseline=(bz@coef*ys+ym)[:,0]
    baseline_model={'type':'mlp','name':'Training-only ridge on current process values','mean':bxm,'scale':bxs,'layers':[{'type':'dense','in':6,'out':1,'weight':coef.T.ravel(),'bias':[0],'activation':'linear'}],'outputMean':ym,'outputScale':ys}
    model=O.export_gru(net,xm,xs,ym,ys,'3-day process-variable GRU→LPG true vapor pressure')
    model['inputNames']=names;model['outputNames']=['LPG_TVP_kgcm2']
    records=[]
    for i in test:
        j=js[i]
        records.append({'id':f"LPG-{rows[j]['Date']}",'kind':'published-simulation','scope':'Public synthetic29-day demonstration, not actual plant quality measurements','sourceId':f"debutanizer_synthetic_29days.csv/row{j+2}",'split':'held-out','input':x[i],'target':y[i,0],'baseline':baseline[i],'_torchReference':[p[i]],'display':{'date':rows[j]['Date'],'regime':rows[j]['Regime'],'historyDates':[r['Date'] for r in rows[j-2:j+1]],'historyInputs':x[i],'inputNames':names,'inputUnits':['mol%','mol%','mol%','kmol/h','barg','ratio'],'series':{'dates':[rows[k]['Date'] for k in js],'actual':y[:,0],'prediction':p,'baseline':baseline},'qualityName':'LPG真蒸气压','qualityUnit':'kgf/cm²','baselineName':'training-only ridge on current process values','warning':'末5日是源作者模拟降负荷场景；日期顺序不证明真实过程动力学，不能改称辛烷值或厂测化验。'}})
    return O.add_parity({'id':'r5','unit':'kgf/cm² LPG true vapor pressure','source':SOURCES['r5'],'scope':'忠实保留公开合成日期与LPG蒸气压标签的时序软测量教学，非辛烷值或现场验证。','model':model,'baselineModel':baseline_model,'baselineInput':'last timestep only','records':records,'validation':{'split':{'train':'source dates2025-03-03..20,18 windows','validation':'2025-03-21..24,4 windows','test':'2025-03-25..29 turndown,5 windows','counts':[len(train),len(val),len(test)]},'metric':'TVP MAE kgf/cm²','baseline':float(np.mean(np.abs(y[test,0]-baseline[test]))),'model':float(np.mean(np.abs(y[test,0]-p[test]))),'n':len(test),'training':training,'boundary':'Only29 independently generated demonstration days; no proof of plant dynamics or out-of-domain generalization. No LPG composition or TVP target is used as input.'},'provenance':meta('r5',{'sourceDays':29,'usableWindows':27,'heldoutTurndownDays':5},['current process variables available for same-time quality soft sensing','previous2dated process snapshots, no fabricated subday interpolation','pressure barg, TVP kgf/cm2 unchanged','source generator is explicitly synthetic, not real plant measurements'])})


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--cases',nargs='+',choices=['r1','r2','r3','r4','r5'],default=['r1','r2','r3','r4','r5']);args=parser.parse_args()
    index=json.loads((SRC/'source-index.json').read_text(encoding='utf-8'))
    for item in index['requiredInputs']:
        p=SRC/item['file'];assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],item['file']
    summary=[]
    for cid in args.cases:
        payload=globals()[cid]();path=OUT/f'{cid}.json';O.write(path,payload)
        row={'id':cid,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'validation':payload['validation'],'records':len(payload['records'])};summary.append(row)
        print(json.dumps({k:v for k,v in row.items() if k!='validation'}|{'metric':payload['validation']['metric'],'baseline':payload['validation']['baseline'],'model':payload['validation']['model']},ensure_ascii=False),flush=True)
    summary_path=SRC/'preparation-summary.json'
    if summary_path.exists() and len(args.cases)<5:
        previous={item['id']:item for item in json.loads(summary_path.read_text(encoding='utf-8'))}
        previous.update({item['id']:item for item in summary});summary=[previous[k] for k in sorted(previous)]
    O.write(summary_path,summary)


if __name__=='__main__':main()
