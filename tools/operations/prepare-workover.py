"""Build wo1-wo5 teaching assets from tracked, frozen primary-source snapshots.

Run from anywhere: python tools/operations/prepare-workover.py [--only wo3]
Dependencies: numpy, scipy, scikit-learn, torch (CPU). No network or deletes.
Inputs live in tools/operations/source-data/workover/ with source-index.json.
No untracked .artifacts cache is required. Published plan snapshots omit all
local-review sourceDescriptionSnippet fields; numerical inputs are preserved.

Exact inference conventions supplement asset-contract.json:
* CNN record.input is ALREADY standardized by the exported training-only
  inputNormalization. OIHW convolution is PyTorch cross-correlation, zero padding.
* MLP/GRU record.input is RAW; apply (x-model.mean)/model.scale first.
* Native output = raw head output * outputScale + outputMean. parity.expected
  is native output; parity.expectedRaw is the pre-affine network/solver output.
* TF-IDF: lowercase ASCII words, unique CN query expansions, natural-log smoothed
  idf=log((1+n)/(1+df))+1; raw term frequency, then L2 normalization. Cosine is
  the dot product of normalized query and document vectors, NOT a probability.
* KG output: 1 satisfies stated constraints, 0 excluded, -1 required evidence
  missing. Actual basket barrel OD is not asserted to be complete assembly OD.
* wo4 AR input at t: current known phase one-hot (3), previous 1/2 samples minus
  their phase training means (6; zero when previous phase differs), elapsed
  phase age/80 (1). Predict current P/T/load. No current sensor value enters X.
  z=(observed-predicted)/trainingResidualSD[phase]; EWMA is causal and reset at
  phase changes. Score=max(abs(EWMA_z)), alarm after 3 consecutive scores>=2.5.
* wo5 GRU consumes at most 6 strictly earlier submitted plans as [estimatedDays,
  gap since the preceding historical submission in days]. It NEVER consumes
  current target, future record, or gap to a not-yet-submitted target plan.
  Its native expected[1] is P50 in days. The first27 eligible validation rows
  select the checkpoint; the following27 independent CHECK rows calibrate a
  symmetric absolute-P50-error range. TEST56 is never used for either choice.

Small models are selected on validation only. Held-out scores are retained even
when worse than the independent baseline. Generated data are explicitly synthetic.
"""
from __future__ import annotations

import argparse
import copy
import csv
import datetime as dt
import hashlib
import json
import math
import re
from collections import Counter
from pathlib import Path

import numpy as np
from scipy import signal
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
import torch
from torch import nn

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / 'tools/operations/source-data/workover'
OUT = ROOT / 'assets/operations/data'
SEED = 20261103
torch.set_num_threads(2)
torch.use_deterministic_algorithms(True)


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def clean(obj):
    if isinstance(obj, np.ndarray):
        return clean(obj.tolist())
    if isinstance(obj, torch.Tensor):
        return clean(obj.detach().cpu().numpy())
    if isinstance(obj, dict):
        return {str(k): clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [clean(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        if not math.isfinite(float(obj)):
            raise ValueError(f'Non-finite exported number: {obj}')
        return float(f'{float(obj):.9g}')
    return obj


def save(payload):
    OUT.mkdir(parents=True, exist_ok=True)
    payload = clean(payload)
    # Independent NumPy forward pass on the actually serialized coefficients,
    # rather than relying on a second call to the training PyTorch model.
    maximum_error = 0.
    for check in payload['parity']:
        raw, native = numpy_inference(payload['model'], payload['records'][check['recordIndex']]['input'])
        previous = np.asarray(check['expected'], dtype=float)
        err = float(np.max(np.abs(native-previous)))
        maximum_error = max(maximum_error, err)
        check['trainingBackendExpected'] = check['expected']
        check['expected'] = clean(native)
        check['expectedRaw'] = clean(raw)
        check['independentNumpyMaxAbsDifference'] = err
    if maximum_error > 2e-4:
        raise ValueError(f"{payload['id']} serialization parity failed: {maximum_error}")
    payload['provenance']['serializationParity'] = {'implementation':'independent NumPy forward pass on exported coefficients',
        'maxAbsDifference':maximum_error,'tolerance':2e-4,'records':len(payload['parity'])}
    raw_inputs = {'wo1':['bsee-workover-plan-sequences.json'], 'wo3':['mendeley-selected-manifest.json'],
                  'wo5':['bsee-workover-plan-sequences.json']}.get(payload['id'], [])
    payload['provenance']['inputFiles'] = [{'path':'tools/operations/source-data/workover/'+name,
        'sha256':hashlib.sha256((RAW/name).read_bytes()).hexdigest()} for name in raw_inputs]
    path = OUT / (payload['id'] + '.json')
    with path.open('w', encoding='utf-8', newline='\n') as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
        handle.write('\n')
    brief={k:payload['validation'].get(k) for k in ['metric','baseline','model','n']}
    print(payload['id'], 'bytes=', path.stat().st_size,
          'validation=', json.dumps(brief, ensure_ascii=True),
          'parityMaxError=', maximum_error, flush=True)


def source(title, url, license):
    return dict(title=title, url=url, license=license)


def provenance(sources, counts, assumptions):
    return {'seed': SEED, 'sources': sources, 'counts': counts,
            'assumptions': assumptions, 'preparationScript': 'tools/operations/prepare-workover.py',
            'versions': {'numpy': np.__version__, 'torch': torch.__version__},
            'parityConvention': 'expected = expectedRaw * outputScale + outputMean; before UI settings'}


def plans():
    return load(RAW / 'bsee-workover-plan-sequences.json')['records']


def dense(layer, activation='linear'):
    return {'type': 'dense', 'in': layer.in_features, 'out': layer.out_features,
            'weight': layer.weight.detach().numpy().reshape(-1),
            'bias': layer.bias.detach().numpy(), 'activation': activation}


def affine_output(raw, model):
    return np.asarray(raw) * np.asarray(model['outputScale']) + np.asarray(model['outputMean'])


def numpy_inference(model, inp):
    """Independent inference using only exported JSON, not fitted estimators."""
    typ=model['type']
    if typ=='tfidf':
        raw=np.asarray(model['documentVectors'],float)@np.asarray(inp,float)
        return raw,raw
    if typ=='kg':
        raw=np.asarray([kg_check(t,inp)[0] for t in model['tools']],float)
        return raw,raw
    if typ=='gru':
        x=(np.asarray(inp,float)-np.asarray(model['mean']))/np.asarray(model['scale'])
        size=model['hiddenSize'];ih=np.asarray(model['weightIH']).reshape(3*size,model['inputSize'])
        hh=np.asarray(model['weightHH']).reshape(3*size,size);bi=np.asarray(model['biasIH']);bh=np.asarray(model['biasHH'])
        h=np.zeros(size)
        for row in x:
            gi=ih@row+bi;gh=hh@h+bh
            r=1/(1+np.exp(-np.clip(gi[:size]+gh[:size],-700,700)))
            z=1/(1+np.exp(-np.clip(gi[size:2*size]+gh[size:2*size],-700,700)))
            candidate=np.tanh(gi[2*size:]+r*gh[2*size:])
            h=(1-z)*candidate+z*h
        head=model['head'];out_count=len(head['bias'])
        raw=np.asarray(head['weight']).reshape(out_count,size)@h+np.asarray(head['bias'])
        return raw,affine_output(raw,model)
    if typ=='cnn':
        x=np.asarray(inp,float).reshape(model['dims'])
    elif typ=='mlp':
        x=(np.asarray(inp,float)-np.asarray(model['mean']))/np.asarray(model['scale'])
    else:raise ValueError(typ)
    for layer in model['layers']:
        lt=layer['type']
        if lt=='flatten':x=x.reshape(-1);continue
        if lt=='dense':
            weight=np.asarray(layer['weight']).reshape(len(layer['bias']),-1)
            x=weight@x.reshape(-1)+np.asarray(layer['bias'])
        elif lt=='conv2d':
            kin=layer['in'];kout=layer['out'];kernel=layer['kernel'];stride=layer['stride'];padding=layer['padding']
            weight=np.asarray(layer['weight']).reshape(kout,kin,kernel,kernel)
            padded=np.pad(x,((0,0),(padding,padding),(padding,padding)))
            oh=(x.shape[1]+2*padding-kernel)//stride+1;ow=(x.shape[2]+2*padding-kernel)//stride+1
            out=np.empty((kout,oh,ow))
            for y in range(oh):
                for xx in range(ow):
                    patch=padded[:,y*stride:y*stride+kernel,xx*stride:xx*stride+kernel]
                    out[:,y,xx]=np.sum(weight*patch[None],axis=(1,2,3))+np.asarray(layer['bias'])
            x=out
        else:raise ValueError(lt)
        if layer.get('activation')=='relu':x=np.maximum(x,0)
        elif layer.get('activation')=='tanh':x=np.tanh(x)
    raw=x.reshape(-1)
    return raw,affine_output(raw,model)


def build_wo1():
    records = plans()
    # A small varied corpus selected by documented source terms, not by a score.
    pool = sorted(records, key=lambda r: (r['submittedAt'], r['planId']))
    selected, seen = [], set()
    concepts = ['pump', 'tubing', 'zonal isolation', 'SCSSV', 'gas lift', 'fishing',
                'cleanout', 'cement', 'packer', 'pressure', 'perforation', 'scale']
    for term in concepts:
        candidates = [r for r in pool if term in r['sourceTextKeywords'] and r['operationText'] not in seen]
        if candidates:
            row = candidates[0]
            selected.append(row)
            seen.add(row['operationText'])
    for row in pool:
        if len(selected) >= 20:
            break
        if row['operationText'] not in seen:
            selected.append(row)
            seen.add(row['operationText'])
    stop = ['workover', 'suboperations', 'source', 'text', 'mentions', 'not', 'recorded', 'describe', 'operation']
    vectorizer = TfidfVectorizer(lowercase=True, token_pattern=r'(?u)\b[a-z][a-z0-9]+\b',
                                 stop_words=stop, norm='l2', smooth_idf=True, sublinear_tf=False)
    vectors = vectorizer.fit_transform([r['operationText'] for r in selected]).toarray()
    vocab = vectorizer.get_feature_names_out().tolist()
    term_map = {'油管': ['tubing'], '更换': ['change'], '泵': ['pump'], '潜油电泵': ['esp', 'pump'],
                '套管': ['casing'], '压力': ['pressure'], '套压': ['casing', 'pressure'], '修复': ['repair'],
                '分层封隔': ['zonal', 'isolation'], '隔离': ['isolation'], '井下安全阀': ['scssv', 'sssv'],
                '清砂': ['desand', 'cleanout'], '清理': ['cleanout'], '水泥': ['cement'], '打捞': ['fishing'],
                '气举': ['gas', 'lift'], '封隔器': ['packer'], '堵塞器': ['plug']}
    queries = [
        ('q-tubing', '更换油管 泵', ['change', 'tubing', 'pump'], 'TUBING'),
        ('q-casing', '套管 压力 修复', ['casing', 'pressure', 'repair'], 'CASING'),
        ('q-isolation', '分层封隔', ['zonal', 'isolation'], 'ZONEISO')]
    docs, triples = [], []
    for i, row in enumerate(selected):
        docs.append({'id': row['planId'], 'text': row['operationText'], 'vector': vectors[i],
                     'wellApi': row['wellApi'], 'submittedAt': row['submittedAt'],
                     'suboperationCodes': row['suboperationCodes'], 'waterDepthFt': row['waterDepthFt'],
                     'shutInTubingPressurePsi': row['shutInTubingPressurePsi'], 'sourceUrl': row['sourceUrl']})
        triples.append([row['planId'], 'operatesOn', row['wellApi'], row['sourceUrl']])
        for code in row['suboperationCodes']:
            triples.append([row['planId'], 'includesSuboperation', code, row['sourceUrl']])
    examples, parity = [], []
    for qi, (qid, cn, terms, wanted_code) in enumerate(queries):
        qvec = vectorizer.transform([' '.join(terms)]).toarray()[0]
        scores = vectors @ qvec
        # Independent simple keyword-overlap reference, no IDF, no learned ranker.
        overlap = np.array([len(set(terms) & set(re.findall(r'[a-z]+', r['operationText'].lower())))
                            for r in selected], dtype=float)
        top = int(np.argmax(scores))
        examples.append({'id': qid, 'kind': 'derived-field', 'scope': 'source-grounded illustrative query; no relevance ground truth',
                         'sourceId': selected[top]['planId'], 'split': 'demonstration', 'input': qvec,
                         'target': None, 'baseline': overlap,
                         'display': {'query': cn, 'expandedTerms': terms, 'scores': scores,
                                     'documentIds': [r['planId'] for r in selected], 'topPlanId': selected[top]['planId'],
                                     'requestedSuboperationCode': wanted_code,
                                     'constraintResults': [{'planId': r['planId'],
                                         'requiredCode': wanted_code,
                                         'status': 'satisfied' if wanted_code in r['suboperationCodes'] else 'not-evidenced',
                                         'meaning': 'retrieval code filter, not physical compatibility'} for r in selected]}})
        expected = [sum(float(a) * float(b) for a, b in zip(qvec, dv)) for dv in vectors]
        assert np.max(np.abs(scores - np.asarray(expected))) < 1e-12
        parity.append({'recordIndex': qi, 'expected': expected, 'expectedRaw': expected})
    model = {'type': 'tfidf', 'name': 'TF-IDF cosine + explicit CN/EN query mapping + source entity graph',
             'vocabulary': vocab, 'idf': vectorizer.idf_, 'documentVectors': vectors, 'documents': docs,
             'queryTermMap': term_map, 'stopWords': stop, 'tokenPattern': '[a-z][a-z0-9]+',
             'termFrequency': 'raw counts', 'normalization': 'L2 query and document',
             'formula': 'idf[j]=ln((1+n)/(1+df[j]))+1; q=L2(tf*idf); score[d]=sum(q[j]*doc[d][j])',
             'entityTriples': triples,
             'constraints': [{'field': 'suboperationCodes', 'operator': 'includes', 'missing': 'not-evidenced'},
                             {'field': 'waterDepthFt', 'operator': 'optional numeric range', 'missing': 'unknown'},
                             {'field': 'shutInTubingPressurePsi', 'operator': 'optional numeric range', 'missing': 'unknown'}],
             'constraintBoundary': 'Filters source records only. No inferred wellbore dimensions, tool rating or success probability.'}
    bsee = source('BSEE eWell APM workover factual records', 'https://www.data.bsee.gov/Well/eWellAPM/Default.aspx',
                  'Federal factual data; third-party operator prose is not automatically openly licensed. Normalized factual text only.')
    return {'id': 'wo1', 'unit': 'cosine similarity (unitless)', 'source': bsee,
            'scope': '20 actual dated plan records from the 295-row teaching subset; normalized code/keyword text; retrieval examples are not independent relevance tests.',
            'model': model, 'records': examples,
            'validation': {'split': '20-document reference corpus; 3 constructed source-grounded example queries; no labelled relevance holdout',
                           'metric': 'No independent relevance accuracy asserted', 'baseline': None, 'model': None, 'n': 0,
                           'boundary': 'Numerical cosine parity is verified. Similarity is not plan effectiveness or field success.'},
            'parity': parity, 'provenance': provenance([bsee], {'corpus': len(docs), 'vocabulary': len(vocab), 'queries': 3},
                ['Fit IDF on reference documents only.', 'Only original normalized code/term facts are deployed; no long archival prose.',
                 'Entity triples use source row IDs and official linked suboperation codes.'])}


def kg_check(tool, inp):
    fish, well = inp['fish'], inp['well']
    checks = []
    def add(name, status, detail):
        checks.append({'name': name, 'status': status, 'detail': detail})
    def truth(value):
        return 'unknown' if value is None else 'pass' if value else 'fail'
    fam = tool['family']
    add('fish kind', truth(fish['kind'] == ('small_junk' if fam == 'junk_basket' else 'tubular')), 'family applicability')
    maxod = tool.get('assemblyODmm')
    if maxod is None:
        add('complete assembly clearance', 'unknown', 'catalog gives barrel OD; maximum complete assembly/shoe OD not verified')
        barrel = tool.get('barrelODmm')
        add('barrel clearance', truth(barrel + 2 * well['radialClearanceMm'] <= well['minimumIDmm']), 'barrel geometry only')
    else:
        add('assembly clearance', truth(maxod + 2 * well['radialClearanceMm'] <= well['minimumIDmm']),
            'assemblyOD + 2*radialClearance <= well minimum ID')
    if fam in ('overshot', 'spear'):
        key = 'outsideMm' if fam == 'overshot' else 'insideMm'
        accessible = 'outsideAccessible' if fam == 'overshot' else 'insideAccessible'
        val = fish.get(key)
        lo, hi = tool['catchRangeMm']
        add('catch dimension', 'unknown' if val is None else truth(lo <= val <= hi), f'{lo} <= {key} <= {hi} mm')
        add('accessible grip surface', truth(fish.get(accessible)), accessible)
    else:
        envelope = fish.get('maxEnvelopeMm')
        add('fish envelope', 'unknown' if envelope is None else truth(envelope <= tool['maxFishMm']), 'max envelope <= published/specified catch size')
        lo, hi = tool['holeRangeMm']
        add('applicable hole range', truth(lo <= well['minimumIDmm'] <= hi), 'catalog/teaching hole range')
    status = 0 if any(x['status'] == 'fail' for x in checks) else -1 if any(x['status'] == 'unknown' for x in checks) else 1
    return status, checks


def build_wo2():
    url = 'https://assets.nov.com/NCP4N68N/at/ww4s788t6pn6v6t97sjsp7x/Bowen_Reverse_Circulation_Junk_Baskets_Tool_Specification.pdf'
    tools = [
        {'id': 'DEMO-OS-80', 'family': 'overshot', 'kind': 'controlled-synthetic', 'assemblyODmm': 80., 'catchRangeMm': [55.,65.], 'dimensionOrigin': 'Explicit teaching dimensions; not an actual Bowen model.'},
        {'id': 'DEMO-OS-100', 'family': 'overshot', 'kind': 'controlled-synthetic', 'assemblyODmm': 100., 'catchRangeMm': [70.,90.], 'dimensionOrigin': 'Explicit teaching dimensions; not an actual Bowen model.'},
        {'id': 'DEMO-SP-40', 'family': 'spear', 'kind': 'controlled-synthetic', 'assemblyODmm': 40., 'catchRangeMm': [42.,52.], 'dimensionOrigin': 'Explicit teaching dimensions; not an actual Bowen model.'},
        {'id': 'DEMO-SP-48', 'family': 'spear', 'kind': 'controlled-synthetic', 'assemblyODmm': 48., 'catchRangeMm': [55.,70.], 'dimensionOrigin': 'Explicit teaching dimensions; not an actual Bowen model.'},
        {'id': 'DEMO-JB-90', 'family': 'junk_basket', 'kind': 'controlled-synthetic', 'assemblyODmm': 90., 'holeRangeMm': [95.,103.], 'maxFishMm': 55., 'dimensionOrigin': 'Explicit teaching full-assembly dimensions; not an actual catalog part.'}]
    for part, low, high, barrel, maximum in [('6635N',3.75,4.,3.625,2.25), ('7295N',4.125,4.5,4.,2.5), ('4448N',4.625,5.,4.5,3.0625)]:
        tools.append({'id': part, 'family': 'junk_basket', 'kind': 'published-catalog', 'assemblyODmm': None,
                      'barrelODmm': barrel * 25.4, 'holeRangeMm': [low*25.4,high*25.4], 'maxFishMm': maximum*25.4,
                      'originalInches': {'holeRange': [low,high], 'barrelOD': barrel, 'maxFishDiameter': maximum},
                      'dimensionOrigin': 'Actual NOV Bowen catalog dimensions, not full assembly maximum OD.', 'sourceUrl': url})
    def fish(kind='tubular', outside=60., inside=45., ext=True, interior=True, envelope=None):
        return {'kind':kind,'outsideMm':outside,'insideMm':inside,'outsideAccessible':ext,'insideAccessible':interior,'maxEnvelopeMm':envelope}
    scenarios = [
        ('pipe-clearance', fish(), 85.), ('pipe-tight', fish(), 65.),
        ('no-grip', fish(ext=False,interior=False),85.), ('inner-unknown',fish(inside=None,ext=False,interior=None),85.),
        ('junk-small',fish('small_junk',None,None,False,False,40.),100.),
        ('junk-too-large',fish('small_junk',None,None,False,False,65.),111.),
        ('junk-catalog-7295',fish('small_junk',None,None,False,False,50.),111.),
        ('junk-catalog-4448',fish('small_junk',None,None,False,False,70.),124.),
        ('pipe-large',fish(outside=78.,inside=60.),105.), ('pipe-no-space',fish(),42.)]
    recs, parity, baseline_violations = [], [], 0
    for i,(rid,f,wid) in enumerate(scenarios):
        inp = {'fish':f,'well':{'minimumIDmm':wid,'radialClearanceMm':2.}}
        results = [kg_check(t,inp) for t in tools]
        outputs = [r[0] for r in results]
        baseline = [1 if t['family']==('junk_basket' if f['kind']=='small_junk' else 'overshot') else 0 for t in tools]
        baseline_violations += sum(b==1 and y!=1 for b,y in zip(baseline,outputs))
        recs.append({'id':rid,'kind':'controlled-synthetic','scope':'constructed geometry; real catalog facts and teaching dimensions separately labelled',
                     'sourceId':'classroom-scenario-'+str(i+1),'split':'demonstration','input':inp,'target':outputs,'baseline':baseline,
                     'display':{'toolIds':[t['id'] for t in tools],'toolChecks':[{'toolId':t['id'],'result':r[0],'checks':r[1]} for t,r in zip(tools,results)],
                                'statusNames':{'1':'满足已列条件','0':'排除','-1':'缺必要证据'},
                                'note':'径向间隙2 mm是演示输入，非通用工程容差；真实打捞篮仅有筒体外径，完整总成通径尚缺证据。'}})
        if i<3: parity.append({'recordIndex':i,'expected':outputs,'expectedRaw':outputs})
    src = source('NOV Bowen reverse-circulation junk basket tool specification',url,'Manufacturer copyright; a few dimension facts cited; original classroom geometry; no catalog images redistributed.')
    return {'id':'wo2','unit':'mm; status 1/0/-1','source':src,
            'scope':'Dimensional source KG with explicit unknowns; not learned field recovery probability.',
            'model':{'type':'kg','name':'Source-traceable three-state dimensional constraints','tools':tools,
                     'statusEncoding':{'satisfied':1,'excluded':0,'missingEvidence':-1},
                     'formulaSchema':{'aggregation':'Any failed condition => 0; else any unknown required evidence => -1; else 1.',
                         'clearance':'full assembly OD + 2*explicit radial clearance <= minimum wellbore ID',
                         'overshot':'tubular AND external surface accessible AND outside diameter in stated catch range',
                         'spear':'tubular AND bore accessible AND inside diameter in stated catch range',
                         'basket':'small junk AND envelope<=max fish AND well ID within hole range; actual catalog additionally lacks complete assembly OD'},
                     'unitsConversion':'inches * 25.4 = mm exactly'},
            'records':recs,'validation':{'split':'10 constructed dimensional scenarios; no field training or success labels',
                'metric':'incompatible or unsupported recommendations by family-only baseline (count)',
                'baseline':baseline_violations,'model':0,'n':len(recs),
                'boundary':'Constraint consistency, not empirical recovery accuracy. Actual basket dimensions remain missing-evidence when total assembly OD is unverified.'},
            'parity':parity,'provenance':provenance([src,source('SLB overshot definition','https://glossary.slb.com/terms/o/overshot','Copyright; short factual summary only.')],
                {'tools':len(tools),'actualCatalogEntries':3,'explicitTeachingEntries':5,'scenarios':10},
                ['Catalog barrel OD must not be relabelled total assembly OD.', 'Spear/overshot numerical ranges are explicit teaching fixtures, not manufactured catalog models.'])}


def stft_image(trace):
    w = trace['waveform']
    y = np.asarray(w['values'],dtype=float)
    fs = 1./float(w['dt'])
    freq,times,z = signal.stft(y,fs=fs,window='hann',nperseg=64,noverlap=60,nfft=256,boundary=None,padded=False)
    times = times + float(w['t0'])
    fi = (freq>=80000)&(freq<=600000)
    ti = (times>=64e-6)&(times<=132e-6)
    db = 20*np.log10(np.maximum(np.abs(z[fi][:,ti]),1e-6))
    # Fixed -100..0 dB, NOT per-test-image min/max or a label-dependent window.
    db = np.clip(db,-100.,0.)
    freq_grid = np.linspace(freq[fi][0],freq[fi][-1],32)
    time_grid = np.linspace(times[ti][0],times[ti][-1],32)
    along_t = np.vstack([np.interp(time_grid,times[ti],row) for row in db])
    resized = np.vstack([np.interp(freq_grid,freq[fi],along_t[:,j]) for j in range(32)]).T
    return resized.astype(np.float32),time_grid*1e6,freq_grid/1000.


def echo_baseline(trace, fallback):
    w=trace['waveform'];y=np.asarray(w['values'],float);step=float(w['dt'])
    time=float(w['t0'])+step*np.arange(len(y));gate=(time>=94e-6)&(time<=140e-6)
    a=y[gate]-np.mean(y[gate]);a=a*np.hanning(len(a))
    ac=signal.correlate(a,a,mode='full')[len(a)-1:]
    vp=float(trace['interface']['vp'])
    lo=max(2,int(math.ceil((2*.006/vp)/step)));hi=min(len(ac)-2,int(math.floor((2*.020/vp)/step)))
    peaks,_=signal.find_peaks(ac)
    eligible=[int(k) for k in peaks if lo<=k<=hi and ac[k]>0]
    if not eligible:return float(fallback),{'valid':False,'fallback':'training median thickness','gateUs':[94.,140.]}
    k=max(eligible,key=lambda k:ac[k]);den=ac[k-1]-2*ac[k]+ac[k+1]
    delta=0.5*(ac[k-1]-ac[k+1])/den if abs(den)>1e-12 else 0.
    lag=float(k+np.clip(delta,-.5,.5));period=lag*step
    return vp*period*.5*1000.,{'valid':True,'lagSamples':lag,'echoSpacingUs':period*1e6,'steelVpMps':vp,
        'formula':'thickness_mm = vp_mps * lag_samples * dt_s / 2 * 1000','gateUs':[94.,140.],
        'boundary':'Autocorrelation peak may identify carrier/multiple rather than wall round-trip; keep errors visible.'}


class TinyCNN(nn.Module):
    def __init__(self):
        super().__init__();self.conv=nn.Conv2d(1,4,3,stride=2,padding=1)
        self.hidden=nn.Linear(4*16*16,12);self.head=nn.Linear(12,1)
    def forward(self,x):
        x=torch.relu(self.conv(x));x=x.flatten(1);return self.head(torch.relu(self.hidden(x)))


def build_wo3():
    torch.manual_seed(SEED+3)
    manifest=load(RAW/'mendeley-selected-manifest.json')
    source_hashes={item['sourceFileName']:item['sha256'] for item in manifest['files']}
    data=[]
    for row in manifest['metadata']:
        fid=row['file_ID'];file=RAW/'mendeley-json'/f'{fid}.json'
        assert hashlib.sha256(file.read_bytes()).hexdigest()==source_hashes[f'{fid}.json']
        trace=load(file)
        image,tgrid,fgrid=stft_image(trace)
        data.append({'id':fid,'trace':trace,'image':image,'timeGrid':tgrid,'frequencyGrid':fgrid,
                     'diameter':float(trace['interface']['outer_diameter']),
                     'thicknessMm':float(trace['interface']['thickness'])*1000.})
    data.sort(key=lambda r:(r['diameter'],r['thicknessMm'],r['id']))
    diameters=sorted(set(r['diameter'] for r in data))
    inds=[np.array([i for i,r in enumerate(data) if r['diameter']==d],dtype=int) for d in diameters]
    tr,va,te=inds
    raw=np.stack([r['image'] for r in data])[:,None]
    mean=float(raw[tr].mean());scale=max(float(raw[tr].std()),1e-6)
    x=(raw-mean)/scale;y=np.array([r['thicknessMm'] for r in data],np.float32)[:,None]
    ym=y[tr].mean(axis=0);ys=np.maximum(y[tr].std(axis=0),1e-6)
    xt=torch.tensor(x);yt=torch.tensor((y-ym)/ys)
    net=TinyCNN();opt=torch.optim.Adam(net.parameters(),lr=.002,weight_decay=.003)
    best=math.inf;state=None;history=[];best_epoch=0
    for epoch in range(1,401):
        net.train();opt.zero_grad();loss=nn.functional.mse_loss(net(xt[tr]),yt[tr]);loss.backward();opt.step()
        if epoch==1 or epoch%10==0:
            net.eval()
            with torch.no_grad():
                train_pred=net(xt[tr]).numpy()*ys+ym;val_pred=net(xt[va]).numpy()*ys+ym
                val=float(np.mean(np.abs(val_pred-y[va])))
            history.append({'epoch':epoch,'trainMAEmm':float(np.mean(np.abs(train_pred-y[tr]))),'validationMAEmm':val})
            if val<best:best=val;state=copy.deepcopy(net.state_dict());best_epoch=epoch
    net.load_state_dict(state);net.eval()
    with torch.no_grad():raw_pred=net(xt).numpy();pred=raw_pred*ys+ym
    base=[echo_baseline(r['trace'],float(np.median(y[tr]))) for r in data]
    layers=[{'type':'conv2d','in':1,'out':4,'kernel':3,'stride':2,'padding':1,
             'weight':net.conv.weight.detach().numpy().reshape(-1),'bias':net.conv.bias.detach().numpy(),'activation':'relu'},
            {'type':'flatten'},dense(net.hidden,'relu'),dense(net.head)]
    model={'type':'cnn','name':'Small 2D CNN STFT thickness regressor','dims':[1,32,32],'layers':layers,
           'outputMean':ym,'outputScale':ys,'outputNames':['thicknessMm'],
           'inputNormalization':{'mean':mean,'scale':scale,'fittedOn':'24 training-diameter STFT images only','inputAlreadyNormalized':True},
           'stft':{'sampleRateHz':2e6,'window':'Hann','windowSamples':64,'hopSamples':4,'nfft':256,
                   'frequencyCropHz':[80000,600000],'timeCropUs':[64,132],'logAmplitudeFloorDb':-100,
                   'imageSize':[32,32],'resampling':'linear in time and frequency'},
           'training':{'seed':SEED+3,'epochs':400,'bestValidationEpoch':best_epoch,'objective':'MSE in training-standardized thickness',
                       'optimizer':'Adam lr0.002 weight_decay0.003; validation selection every10 epochs','history':history}}
    chosen=te[np.linspace(0,len(te)-1,8).round().astype(int)]
    recs=[];parity=[]
    for idx in chosen:
        r=data[idx];w=r['trace']['waveform'];time=(float(w['t0'])+float(w['dt'])*np.arange(len(w['values'])))*1e6
        recs.append({'id':'comsol-'+r['id'],'kind':'published-simulation','scope':'published controlled COMSOL pipe simulation, not field casing scan',
                     'sourceId':r['id']+'.json','split':'held-out','input':x[idx].reshape(-1),'target':float(y[idx,0]),
                     'baseline':base[idx][0],'display':{'timeUs':time,'amplitude':w['values'],'image':r['image'].reshape(-1),
                         'imageWidth':32,'imageHeight':32,'timeGridUs':r['timeGrid'],'frequencyGridKHz':r['frequencyGrid'],
                         'imageUnit':'dB relative to normalized trace amplitude','outerDiameterMm':r['diameter']*1000.,
                         'baselineDetails':base[idx][1],'predictionMm':float(pred[idx,0]),'knownThicknessMm':float(y[idx,0]),
                         'sourceUrl':'https://data.mendeley.com/datasets/3bs65nzpv2/1'}})
        if len(recs)<=3:parity.append({'recordIndex':len(recs)-1,'expected':[float(pred[idx,0])],'expectedRaw':[float(raw_pred[idx,0])]})
    src=source('Diez, Viggen & Johansen: Simulated ultrasonic pulse-echo well-integrity dataset','https://data.mendeley.com/datasets/3bs65nzpv2/1','CC BY4.0; attribution and transformation notes retained.')
    return {'id':'wo3','unit':'mm','source':src,'scope':'Thickness regression on published simulations, diameter-group holdout; no field defect-class diagnosis.',
            'model':model,'records':recs,'validation':{'split':{'train':{'outerDiameterM':diameters[0],'n':len(tr)},'validation':{'outerDiameterM':diameters[1],'n':len(va)},'test':{'outerDiameterM':diameters[2],'n':len(te)}},
                'metric':'held-out thickness MAE (mm)','baseline':float(np.mean(np.abs(np.array([base[i][0] for i in te])-y[te,0]))),
                'model':float(np.mean(np.abs(pred[te,0]-y[te,0]))),'n':len(te),
                'baselineValidN':sum(base[i][1]['valid'] for i in te),'boundary':'24 synthetic test traces; field UT report is context only; model need not outperform baseline.',
                'allTest':{'sourceIds':[data[i]['id'] for i in te],'targetMm':y[te,0],'modelMm':pred[te,0],'baselineMm':[base[i][0] for i in te]}},
            'parity':parity,'provenance':provenance([src,source('Scientific Data descriptor','https://www.nature.com/articles/s41597-025-04851-x','CC BY article; source for physical units and model limits.')],
                {'all':72,'train':24,'validation':24,'test':24,'displayedTest':8},
                ['STFT normalization fitted on training diameter only.', 'Thickness targets never enter STFT construction or network inputs.',
                 'Fixed94-140us ringdown gate and6-20mm candidate echo interval are declared exercise priors, not chosen per target.',
                 'Echo/correlation ambiguity and held-out failures are retained.', 'BSEE Figure12 is recovered above-water structural casing and is NOT added as a training image.'])}


def make_episode(seed, name, kind='normal'):
    rng=np.random.default_rng(seed);n=240;phase=np.repeat(np.arange(3),80)
    centres=np.array([[3.2,.25,90.],[1.6,.10,150.],[4.6,2.4,125.]])
    offsets=rng.normal(size=3)*np.array([.07,.04,2.])
    jitter=np.zeros((n,3));noise_sd=np.array([.035,.022,.65])
    for i in range(1,n):jitter[i]=.62*jitter[i-1]+rng.normal(size=3)*noise_sd
    age=np.arange(n)%80
    drift=np.column_stack([.025*np.sin(age/14.),.018*np.sin(age/11.),1.1*np.sin(age/18.)])
    values=centres[phase]+offsets+jitter+drift
    events=[]
    if kind=='pressure-ramp':
        start,end=105,158;values[start:end,0]+=np.linspace(0,.9,end-start)
        events=[{'id':name+'-event','start':start,'end':end-1,'type':'injected pressure ramp'}]
    elif kind=='torque-step':
        start,end=182,219;values[start:end,1]+=1.0
        events=[{'id':name+'-event','start':start,'end':end-1,'type':'injected torque level step'}]
    elif kind=='load-drop':
        start,end=35,72;values[start:end,2]-=22.
        events=[{'id':name+'-event','start':start,'end':end-1,'type':'injected load level drop'}]
    elif kind=='brief-spike':
        start,end=128,130;values[start:end,0]+=1.8
        events=[{'id':name+'-event','start':start,'end':end-1,'type':'injected short sensor spike'}]
    elif kind=='combined-drift':
        start,end=171,222;ramp=np.linspace(0,1,end-start)
        values[start:end,0]+=.75*ramp;values[start:end,2]+=15*ramp
        events=[{'id':name+'-event','start':start,'end':end-1,'type':'injected two-channel drift'}]
    truth=np.zeros(n,dtype=int)
    for e in events:truth[e['start']:e['end']+1]=1
    return {'id':name,'seed':seed,'phase':phase,'values':values,'truth':truth,'events':events,'kind':kind}


def episode_features(ep, phase_means):
    xs=[]
    for t in range(2,len(ep['values'])):
        p=int(ep['phase'][t]);row=[float(p==k) for k in range(3)]
        for lag in [1,2]:
            prev=t-lag
            row.extend((ep['values'][prev]-phase_means[p]).tolist() if ep['phase'][prev]==p else [0.,0.,0.])
        row.append((t%80)/80.)
        xs.append(row)
    return np.asarray(xs,dtype=float),ep['values'][2:]


def monitor(scores,phase,threshold=2.5,persistence=3):
    alarms=np.zeros(len(scores),dtype=int);run=0
    for i,score in enumerate(scores):
        if i==0 or phase[i]!=phase[i-1]:run=0
        run=run+1 if score>=threshold else 0
        alarms[i]=int(run>=persistence)
    return alarms


def alarm_events(alarms):
    starts=[];prior=0
    for i,val in enumerate(alarms):
        if val and not prior:starts.append(i)
        prior=val
    return starts


def event_metrics(episodes,key):
    count=0;detected=0;false=0;delays=[]
    for ep in episodes:
        starts=alarm_events(ep[key]);matched=set()
        for ev in ep['events']:
            count+=1
            found=[s for s in starts if ev['start']<=s<=ev['end']]
            if found:detected+=1;delays.append(min(found)-ev['start']);matched.update(found)
        false+=sum(s not in matched for s in starts)
    return {'eventCount':count,'detected':detected,'eventRecall':detected/count if count else 0.,
            'falseAlarmEvents':false,'falseAlarmsPerEpisode':false/len(episodes),
            'meanDetectionDelayS':float(np.mean(delays)) if delays else None,'delaysS':delays,'episodeCount':len(episodes)}


def build_wo4():
    training=[make_episode(SEED+400+i,f'train-{i:02d}') for i in range(12)]
    vk=['normal','normal','pressure-ramp','torque-step','load-drop','brief-spike']
    validation=[make_episode(SEED+500+i,f'validation-{i:02d}',kind) for i,kind in enumerate(vk)]
    tk=['normal','normal','pressure-ramp','torque-step','load-drop','brief-spike','normal','combined-drift']
    test=[make_episode(SEED+600+i,f'test-{i:02d}',kind) for i,kind in enumerate(tk)]
    all_values=np.concatenate([e['values'] for e in training]);all_phase=np.concatenate([e['phase'] for e in training])
    phase_means=np.array([all_values[all_phase==p].mean(axis=0) for p in range(3)])
    train_xy=[episode_features(e,phase_means) for e in training]
    x=np.concatenate([a for a,b in train_xy]);y=np.concatenate([b for a,b in train_xy])
    xm=x.mean(axis=0);xs=np.maximum(x.std(axis=0),1e-6);ym=y.mean(axis=0);ys=np.maximum(y.std(axis=0),1e-6)
    reg=Ridge(alpha=4.).fit((x-xm)/xs,(y-ym)/ys)
    residual=y-(reg.predict((x-xm)/xs)*ys+ym)
    pp=np.concatenate([e['phase'][2:] for e in training]);rsd=np.array([np.maximum(residual[pp==p].std(axis=0),1e-6) for p in range(3)])
    gm=all_values.mean(axis=0);gs=np.maximum(all_values.std(axis=0),1e-6)
    alpha=.3;threshold=2.5;persistence=3
    for ep in training+validation+test:
        features,_=episode_features(ep,phase_means)
        pred=reg.predict((features-xm)/xs)*ys+ym
        forecast=np.vstack([phase_means[ep['phase'][0]],phase_means[ep['phase'][1]],pred])
        z=(ep['values']-forecast)/rsd[ep['phase']]
        smooth=np.zeros_like(z)
        for t in range(2,len(z)):
            previous=np.zeros(3) if t==2 or ep['phase'][t]!=ep['phase'][t-1] else smooth[t-1]
            smooth[t]=alpha*z[t]+(1-alpha)*previous
        score=np.max(np.abs(smooth),axis=1);score[:2]=0.
        baseline_score=np.max(np.abs((ep['values']-gm)/gs),axis=1)
        ep.update(features=features,forecast=forecast,residualZ=z,score=score,baselineScore=baseline_score,
                  alarm=monitor(score,ep['phase'],threshold,persistence),
                  baselineAlarm=monitor(baseline_score,ep['phase'],threshold,persistence))
    recs=[];parity=[];parity_monitor=[]
    for i,ep in enumerate(test):
        cursor=min(239,(ep['events'][0]['start']+12) if ep['events'] else 120)
        xcur=ep['features'][cursor-2];raw=reg.predict(((xcur-xm)/xs)[None])[0];expected=raw*ys+ym
        manual=np.array([sum(float(w)*float(v) for w,v in zip(row,(xcur-xm)/xs))+float(b)
                         for row,b in zip(reg.coef_,reg.intercept_)])
        assert np.max(np.abs(raw-manual))<1e-10
        recs.append({'id':ep['id'],'kind':'controlled-synthetic','scope':'controlled synthetic episode; injected labels, no field sensor record',
            'sourceId':f'generator-seed-{ep["seed"]}','split':'held-out','input':xcur,'target':ep['values'][cursor],
            'baseline':gm,'display':{'cursor':cursor,'timeS':np.arange(240),'channels':['pressureMPa','torqueKNm','loadKN'],
                'values':ep['values'],'phase':ep['phase'],'phaseNames':['循环（演示）','起下管柱（演示）','旋转处理（演示）'],
                'pointTruth':ep['truth'],'events':ep['events'],'forecast':ep['forecast'],'residualZ':ep['residualZ'],
                'scores':ep['score'],'baselineScores':ep['baselineScore'],'alarms':ep['alarm'],'baselineAlarms':ep['baselineAlarm'],
                'batchInputs':ep['features'],'batchInputStartIndex':2,'defaultThreshold':threshold,
                'parameterBoundary':'All levels and fault amplitudes are teaching fixtures, not operating limits.'}})
        if i<3:
            parity.append({'recordIndex':i,'expected':expected,'expectedRaw':raw})
            parity_monitor.append({'recordIndex':i,'cursor':cursor,'score':ep['score'][cursor],'alarm':ep['alarm'][cursor]})
    metrics=event_metrics(test,'alarm');bm=event_metrics(test,'baselineAlarm')
    src=source('Controlled classroom workover episode generator','https://www.bsee.gov/panel-investigation/investigation-of-march-25-2022-hydraulic-workover-unit-failure-fatality',
               'Sensor data are original controlled synthetic teaching fixtures. BSEE link supplies real context only, not the generated sensor data.')
    model={'type':'mlp','name':'Fitted phase-conditioned causal AR(2) + residual EWMA monitor','mean':xm,'scale':xs,
           'layers':[{'type':'dense','in':10,'out':3,'weight':reg.coef_.reshape(-1),'bias':reg.intercept_,'activation':'linear'}],
           'outputMean':ym,'outputScale':ys,'outputNames':['pressureMPa','torqueKNm','loadKN'],
           'featureSchema':['phase0','phase1','phase2','lag1PressureResidual','lag1TorqueResidual','lag1LoadResidual',
                            'lag2PressureResidual','lag2TorqueResidual','lag2LoadResidual','elapsedPhaseSamples/80'],
           'featureFormula':'lag residual=observed[t-lag]-phaseMeans[currentPhase] only if lag phase matches; else0; excludes current observed target',
           'phaseMeans':phase_means,'residualStdByPhase':rsd,'ridgeAlpha':4.,
           'monitor':{'alpha':alpha,'threshold':threshold,'persistence':persistence,'resetOnPhaseChange':True,
               'formula':'z_t=(observed_t-predicted_t)/trainingResidualSD[phase_t]; u_t=.3*z_t+.7*u_(t-1); score_t=max(abs(u_t)); alarm after3 consecutive score>=2.5',
               'calibration':'Phase means, X/Y scalers and residual SD use normal training episodes only. Threshold/persistence predeclared teaching settings.',
               'baselineFormula':'score=max(abs((observed-globalTrainingMean)/globalTrainingSD)); same persistence; phase-agnostic level envelope',
               'baselineMean':gm,'baselineScale':gs},
           'generator':{'samplesPerEpisode':240,'dtS':1,'phaseSamples':80,'normalNoiseAR':.62,
               'normalNoiseInnovationSD':[.035,.022,.65],'centres':[[3.2,.25,90.],[1.6,.10,150.],[4.6,2.4,125.]],
               'normalTrainingSeeds':[e['seed'] for e in training],'validationSeeds':[e['seed'] for e in validation],'testSeeds':[e['seed'] for e in test]}}
    return {'id':'wo4','unit':'MPa / kN·m / kN; score unitless','source':src,
            'scope':'Synthetic phase-labelled monitoring; labels do not establish physical fault diagnosis or field alert thresholds.',
            'model':model,'records':recs,'validation':{'split':'12 normal training,6 validation,8 held-out complete episodes; seeds and entire histories isolated',
                'metric':'held-out injected-event recall (0..1); false alarms and delays separately reported',
                'baseline':bm['eventRecall'],'model':metrics['eventRecall'],'n':metrics['eventCount'],
                'baselineDetails':bm,'modelDetails':metrics,
                'boundary':'Detection must begin inside the injected event; after-event starts count as false alarms, not advance warning. Simulated results only.',
                'validationEpisodes':{'baseline':event_metrics(validation,'baselineAlarm'),'model':event_metrics(validation,'alarm')}},
            'parity':parity,'parityMonitor':parity_monitor,'provenance':provenance([src],
                {'trainingEpisodes':12,'validationEpisodes':6,'testEpisodes':8,'pointsPerEpisode':240,'trainingForecastPoints':len(x),'testForecastPoints':8*238},
                ['No future sample, centered window or anomaly label enters model inputs.',
                 'Current phase is supplied process context, not inferred from injected labels.',
                 'Normal stage offsets and all magnitudes are declared generator fixtures, never field safety limits.',
                 'Brief spikes and any detector failures are retained.'])}


class TinyGRU(nn.Module):
    def __init__(self):
        super().__init__();self.gru=nn.GRU(2,8,batch_first=True);self.head=nn.Linear(8,3)
    def forward(self,x,lengths):
        outputs,_=self.gru(x)
        final=outputs[torch.arange(x.shape[0]),lengths-1]
        return self.head(final)


def build_wo5():
    torch.manual_seed(SEED+5)
    pp=plans();eligible=[]
    for row in pp:
        if row['historyCount']<2:continue
        times=[dt.datetime.fromisoformat(s) for s in row['priorSubmittedAt']]
        assert all(s<dt.datetime.fromisoformat(row['submittedAt']) for s in times)
        vals=row['priorEstimatedDays'];features=[]
        for i,v in enumerate(vals):
            gap=(times[i]-times[i-1]).total_seconds()/86400. if i else 0.
            features.append([float(v),gap])
        eligible.append({'row':row,'x':np.asarray(features[-6:],np.float32),'y':float(row['estimatedDays'])})
    tr=np.array([i for i,a in enumerate(eligible) if a['row']['temporalPartition']=='train']);va=np.array([i for i,a in enumerate(eligible) if a['row']['temporalPartition']=='validation']);te=np.array([i for i,a in enumerate(eligible) if a['row']['temporalPartition']=='test'])
    tune=va[:len(va)//2];check=va[len(va)//2:]
    assert len(tune)==27 and len(check)==27 and len(te)==56
    assert max(eligible[i]['row']['submittedAt'] for i in tune)<min(eligible[i]['row']['submittedAt'] for i in check)
    assert max(eligible[i]['row']['submittedAt'] for i in check)<min(eligible[i]['row']['submittedAt'] for i in te)
    train_inputs=np.concatenate([eligible[i]['x'] for i in tr]);xm=train_inputs.mean(axis=0);xs=np.maximum(train_inputs.std(axis=0),1e-6)
    y=np.array([a['y'] for a in eligible],np.float32);ym=np.array([y[tr].mean()]*3,np.float32);ys=np.array([max(float(y[tr].std()),1e-6)]*3,np.float32)
    padded=np.zeros((len(eligible),6,2),np.float32);lengths=[]
    for i,a in enumerate(eligible):
        length=len(a['x']);lengths.append(length);padded[i,:length]=(a['x']-xm)/xs
    tx=torch.tensor(padded);tl=torch.tensor(lengths);ty=torch.tensor((y-ym[0])/ys[0])[:,None];tau=torch.tensor([.1,.5,.9])[None]
    net=TinyGRU();opt=torch.optim.Adam(net.parameters(),lr=.003,weight_decay=.005)
    history=[];best=math.inf;state=None;best_epoch=0
    for epoch in range(1,501):
        net.train();opt.zero_grad();prediction=net(tx[tr],tl[tr]);error=ty[tr]-prediction
        pin=torch.maximum(tau*error,(tau-1)*error).mean()
        crossing=torch.relu(prediction[:,0]-prediction[:,1]).mean()+torch.relu(prediction[:,1]-prediction[:,2]).mean()
        loss=pin+.05*crossing;loss.backward();opt.step()
        if epoch==1 or epoch%10==0:
            net.eval()
            with torch.no_grad():
                vp=net(tx[tune],tl[tune]);err=ty[tune]-vp;vl=float(torch.maximum(tau*err,(tau-1)*err).mean())
                trainp=net(tx[tr],tl[tr]).numpy()*ys+ym;vp_native=vp.numpy()*ys+ym
            history.append({'epoch':epoch,'trainingMedianMAEDays':float(np.mean(np.abs(trainp[:,1]-y[tr]))),
                            'tuningMedianMAEDays':float(np.mean(np.abs(vp_native[:,1]-y[tune]))),'tuningPinballStandardized':vl})
            if vl<best:best=vl;state=copy.deepcopy(net.state_dict());best_epoch=epoch
    net.load_state_dict(state);net.eval()
    with torch.no_grad():raw=net(tx,tl).numpy();pred=raw*ys+ym
    last=np.array([a['row']['priorEstimatedDays'][-1] for a in eligible]);med=np.array([np.median(a['row']['priorEstimatedDays']) for a in eligible])
    baseq=np.array([np.quantile(a['row']['priorEstimatedDays'],[.1,.5,.9]) for a in eligible])
    err=y[te,None]-pred[te];pinball=float(np.mean(np.maximum(np.array([.1,.5,.9])*err,(np.array([.1,.5,.9])-1)*err)))
    coverage=float(np.mean((pred[te,0]<=y[te])&(y[te]<=pred[te,2])))
    # Independent CHECK: neither model fitting nor checkpoint selection sees these
    # outcomes. A higher empirical quantile is explicit; this is not a guarantee
    # of conditional80% coverage on a different future plan distribution.
    calibration_errors=np.abs(y[check]-pred[check,1])
    sorted_errors=np.sort(calibration_errors)
    order_index=int(math.ceil(.8*(len(check)-1)))
    halfwidth=float(sorted_errors[order_index])
    check_coverage=float(np.mean(calibration_errors<=halfwidth))
    test_coverage=float(np.mean(np.abs(y[te]-pred[te,1])<=halfwidth))
    calibration={'kind':'independent CHECK absolute-P50-residual range','unit':'days','centralOutputIndex':1,
        'centralFormula':'P50days = expected[1] = rawHead[1]*outputScale[1]+outputMean[1]',
        'rangeFormula':'[P50days-halfWidthDays, P50days+halfWidthDays]; no silent sorting or clipping',
        'halfWidthDays':halfwidth,'nominalResidualQuantile':.8,'method':'higher empirical quantile: sortedAbsResidual[ceil(0.8*(nCheck-1))]',
        'nCheck':len(check),'zeroBasedOrderIndex':order_index,'orderStatisticOneBased':order_index+1,
        'checkCoverage':check_coverage,'heldOutTestCoverage':test_coverage,'nTest':len(te),
        'checkSubmittedMin':min(eligible[i]['row']['submittedAt'] for i in check),
        'checkSubmittedMax':max(eligible[i]['row']['submittedAt'] for i in check),
        'checkPlanIds':[eligible[i]['row']['planId'] for i in check],
        'checkAbsoluteP50ResidualDays':calibration_errors,
        'boundary':'Empirical past CHECK-error range; not an assured80% conditional prediction interval or actual completion promise.'}
    model={'type':'gru','name':'Small causal GRU for next submitted plan estimated duration','inputSize':2,'hiddenSize':8,
           'mean':xm,'scale':xs,'weightIH':net.gru.weight_ih_l0.detach().numpy().reshape(-1),
           'weightHH':net.gru.weight_hh_l0.detach().numpy().reshape(-1),'biasIH':net.gru.bias_ih_l0.detach().numpy(),
           'biasHH':net.gru.bias_hh_l0.detach().numpy(),'head':{'weight':net.head.weight.detach().numpy().reshape(-1),'bias':net.head.bias.detach().numpy()},
           'outputMean':ym,'outputScale':ys,'outputNames':['P10days','P50days','P90days'],'quantileLevels':[.1,.5,.9],
           'centralOutputIndex':1,'uncertainty':calibration,
           'featureNames':['pastEstimatedDays','gapSincePreviousHistoricalSubmissionDays'],'maximumHistory':6,
           'formulaSchema':'PyTorch r,z,n GRU: r=sigmoid(W_ir*x+b_ir+W_hr*h+b_hr); z=sigmoid(W_iz*x+b_iz+W_hz*h+b_hz); n=tanh(W_in*x+b_in+r*(W_hn*h+b_hn)); h=(1-z)*n+z*h; initial h=0; head(final h); native=head*outputScale+outputMean.',
           'training':{'seed':SEED+5,'epochs':500,'bestValidationEpoch':best_epoch,'checkpointTuningRows':len(tune),'independentCheckRows':len(check),
                       'objective':'pinball quantiles0.1/0.5/0.9 +0.05 crossing penalty; first27 validation rows choose checkpoint, next27 calibrate only; no test selection',
                       'optimizer':'Adam lr0.003 weight_decay0.005','history':history},
           'evaluationProtocol':'Frozen weights. Earlier revealed validation/test labels may become history for subsequent predictions. No target/future/current-gap input. No hidden clipping or quantile sorting.'}
    chosen=te[np.linspace(0,len(te)-1,min(10,len(te))).round().astype(int)]
    recs=[];parity=[]
    for idx in chosen:
        a=eligible[idx];row=a['row']
        recs.append({'id':'plan-'+row['planId'],'kind':'derived-field','scope':'actual submitted-plan estimate history; not completed workover duration',
            'sourceId':row['planId'],'split':'held-out','input':a['x'],'target':a['y'],'baseline':float(med[idx]),
            'display':{'wellApi':row['wellApi'],'submittedAt':row['submittedAt'],'plannedStartDate':row['plannedStartDate'],
                'historySubmittedAt':row['priorSubmittedAt'],'historyEstimatedDays':row['priorEstimatedDays'],'historyPlanIds':row['priorPlanIds'],
                'operationText':row['operationText'],'sourceUrl':row['sourceUrl'],'predictionQuantilesDays':pred[idx],
                'pointPredictionDays':float(pred[idx,1]),'empiricalCheckErrorRangeDays':[float(pred[idx,1]-halfwidth),float(pred[idx,1]+halfwidth)],
                'lastValueBaselineDays':float(last[idx]),'historyMedianBaselineDays':float(med[idx]),'historyQuantilesDays':baseq[idx],
                'quantileCrossing':bool(pred[idx,0]>pred[idx,1] or pred[idx,1]>pred[idx,2]),
                'sameWellPlannedDateSourceRows':row['sameWellPlannedDateSourceRows'],'labelDefinition':'Submitted estimated duration; NOT achieved actual duration.'}})
        if len(recs)<=3:parity.append({'recordIndex':len(recs)-1,'expected':pred[idx],'expectedRaw':raw[idx]})
    src=source('BSEE eWell APM dated workover plans','https://www.data.bsee.gov/Well/eWellAPM/Default.aspx',
               'Public federal factual fields; normalized operation keywords; no long third-party procedural narratives deployed.')
    return {'id':'wo5','unit':'planned estimated days','source':src,
            'scope':'Predict next submitted administrative plan estimate, not actual completion. Date changes can still be job revisions.',
            'model':model,'records':recs,'validation':{'split':{'sourceRows':295,'wells':31,'eligibleHistoryRows':233,
                'train':len(tr),'validation':len(va),'checkpointTuning':len(tune),'independentCalibrationCheck':len(check),
                'test':len(te),'trainEndExclusive':'2021-08-26T09:36:02','validationEndExclusive':'2022-04-07T14:31:34'},
                'metric':'held-out planned-estimate P50 MAE (days)','baseline':float(np.mean(np.abs(med[te]-y[te]))),
                'model':float(np.mean(np.abs(pred[te,1]-y[te]))),'n':len(te),
                'lastValueBaselineMAE':float(np.mean(np.abs(last[te]-y[te]))),'pinballDays':pinball,
                'P10P90Coverage':coverage,'meanIntervalWidthDays':float(np.mean(pred[te,2]-pred[te,0])),
                'quantileCrossingCount':int(np.sum((pred[te,0]>pred[te,1])|(pred[te,1]>pred[te,2]))),
                'negativeMedianCount':int(np.sum(pred[te,1]<0)),
                'empiricalCheckErrorRange':calibration,
                'boundary':'56 next-plan estimates, not independent completed jobs; sampled repeated-plan wells are casing-repair heavy. Results need not improve on baselines.',
                'allTest':{'planIds':[eligible[i]['row']['planId'] for i in te],'targetDays':y[te],'modelQuantilesDays':pred[te],'historyMedianBaselineDays':med[te]}},
            'parity':parity,'provenance':dict(provenance([src],{'sourceRows':295,'wells':31,'trainForecasts':len(tr),
                'checkpointTuningForecasts':len(tune),'independentCalibrationCheck':len(check),'testForecasts':len(te),'displayedTest':len(recs)},
                ['Collapse same well+planned-start group to earliest source submission, not latest revision.',
                 'At least two strictly prior records required; at most six supplied to GRU.',
                 'X scalers fitted only on raw historical features of training examples; target affine fitted on training targets.',
                 'Gap feature describes past submissions only, never time to the future target submission.',
                 'Checkpoint selection uses first27 eligible validation rows only; next27 are independent CHECK calibration, not fitting/tuning.',
                 'Empirical CHECK absolute-error range is not a guaranteed conditional80% interval.',
                 'Temporal model scores and ranges describe submitted estimates, not schedule success or actual operation duration.']),
                rawQuantileDiagnostics={'sortedOrClipped':False,'P10P90HeldOutCoverage':coverage,
                    'crossingCount':int(np.sum((pred[te,0]>pred[te,1])|(pred[te,1]>pred[te,2]))),
                    'heldOutRawQuantileDays':pred[te],
                    'instruction':'Preserved for audit; default visualization uses P50 plus independent CHECK-error halfwidth instead.'})}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only',choices=['wo1','wo2','wo3','wo4','wo5'])
    args=parser.parse_args()
    builders={'wo1':build_wo1,'wo2':build_wo2,'wo3':build_wo3,'wo4':build_wo4,'wo5':build_wo5}
    for key,builder in builders.items():
        if args.only and key!=args.only:continue
        save(builder())


if __name__=='__main__':main()
