"""Fetch task-specific open geophysical examples. Large originals stay in ignored .artifacts.
No external code is executed. Downloads, licenses and SHA256s are retained in a manifest.
"""
from pathlib import Path
import concurrent.futures as futures
import hashlib, io, json, zipfile
import requests, fsspec

ROOT=Path(__file__).resolve().parents[2]
CACHE=ROOT/'.artifacts/seismic-data'
CACHE.mkdir(parents=True,exist_ok=True)
manifest=[]

def save(name,url,extra=None):
    target=CACHE/name
    if not target.exists():
        for attempt in range(4):
            try:
                r=requests.get(url,timeout=120);r.raise_for_status();payload=r.content
                if name.endswith('.dat') and len(payload)!=8388608:raise ValueError('Incomplete cube')
                if extra and extra.get('publisherSHA256') and hashlib.sha256(payload).hexdigest()!=extra['publisherSHA256']:raise ValueError('Publisher checksum mismatch')
                target.write_bytes(payload);break
            except requests.RequestException:
                if attempt==3:raise
                print('Retry',name,attempt+1,flush=True)
    record=dict(file=name,url=url,bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest())
    record.update(extra or {});manifest.append(record)
    print(name,record['bytes'],flush=True)
    return target

def repo_pin(repo,branch):
    existing=ROOT/'assets/seismic/sources.json'
    if existing.exists():
        prior=json.loads(existing.read_text(encoding='utf8'))
        for record in prior['sources']:
            if record.get('commit') and f'raw.githubusercontent.com/{repo}/' in record['url']:return record['commit']
    r=requests.get(f'https://api.github.com/repos/{repo}/commits/{branch}',timeout=40);r.raise_for_status()
    return r.json()['sha']

def fetch():
    fault_pin=repo_pin('xinwucwp/faultSeg','master')
    force_pin=repo_pin('bolgebrygg/Force-2020-Machine-Learning-competition','master')
    jobs=[]
    for number in [0,1,2,3,10,11,12]:
        for part in ['seis','fault']:
            name=f'fault-{part}-{number}.dat'
            url=f'https://raw.githubusercontent.com/xinwucwp/faultSeg/{fault_pin}/data/validation/{part}/{number}.dat'
            jobs.append((name,url,dict(dataset='FaultSeg3D',license='CC BY-NC 4.0',commit=fault_pin,kind='author-generated synthetic seismic and labels')))
    for name in ['15_9-13','15_9-14','15_9-15','15_9-17','16_1-2','16_10-1']:
        url=f'https://raw.githubusercontent.com/bolgebrygg/Force-2020-Machine-Learning-competition/{force_pin}/lithology_competition/data/las_files_Lithostrat_data/{name}.las'
        jobs.append((name+'.las',url,dict(dataset='FORCE2020',license='NLOD 2.0 (raw logs); CC BY 4.0 (interpreted labels)',commit=force_pin,kind='field well logs')))
    r=requests.get('https://data.mendeley.com/public-api/datasets/p8pbnyfybr/files',params={'folder_id':'root','version':1,'$start':0,'$limit':1000},headers={'Accept':'application/vnd.mendeley-public-dataset.1+json'},timeout=45);r.raise_for_status()
    for f in r.json():
        if f['filename']!='Synthetic_Dataset.mat':
            jobs.append((f['filename'],f['content_details']['download_url'],dict(dataset='Awais and Hanafy 2023',doi='10.17632/p8pbnyfybr.1',license='CC BY 4.0',kind='field shot gathers',publisherSHA256=f['content_details']['sha256_hash'])))
    with futures.ThreadPoolExecutor(6) as pool:
        for task in pool.map(lambda x:save(*x),jobs): pass
    # Range reads fetch complete individual TIFF members, rather than the 637 MB archive.
    url='https://zenodo.org/api/records/1471548/files/inlines.zip/content'
    with fsspec.open(url,mode='rb',block_size=256*1024).open() as remote:
        with zipfile.ZipFile(remote) as archive:
            for number in [100,140,180,220,260,300,340,380,440,540,600,680]:
                name=f'inlines/inline_{number}.tiff';target=CACHE/f'f3-inline-{number}.tiff'
                if not target.exists():target.write_bytes(archive.read(name))
                manifest.append(dict(file=target.name,url=url,member=name,bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),dataset='Netherlands F3 Interpretation v2',doi='10.5281/zenodo.1471548',license='CC BY 4.0',kind='field post-stack seismic'))
                print(target.name,flush=True)
    save('f3-masks.tar.gz','https://zenodo.org/api/records/1471548/files/masks.tar.gz/content',dict(dataset='Netherlands F3 Interpretation v2',license='CC BY 4.0',kind='interpreted seismic-facies intervals'))
    save('fault-utils.py.txt',f'https://raw.githubusercontent.com/xinwucwp/faultSeg/{fault_pin}/utils.py',dict(purpose='read-only byte-order and axis documentation'))
    (ROOT/'assets/seismic/sources.json').write_text(json.dumps(dict(sources=sorted(manifest,key=lambda x:x['file']),illustrationsAreNotObservations=True),ensure_ascii=False,indent=2),encoding='utf8')

if __name__=='__main__': fetch()
