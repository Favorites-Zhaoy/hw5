"""Resolve exact DOIs with the primary Crossref registry; no guessed metadata."""
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request
from pathlib import Path
import json
DOIS=['10.3390/rs17030387','10.1109/JSTARS.2024.3372138','10.1016/j.gexplo.2024.107393','10.1007/s12145-024-01611-0','10.1016/j.ijrmms.2025.106038','10.5194/se-14-1005-2023']
def fetch(doi):
    try:
        m=json.load(urlopen(Request('https://api.crossref.org/works/'+doi,headers={'User-Agent':'GeologyTeachingCitationCheck/1.0'}),timeout=35))['message']
        return dict(doi=doi,title=m.get('title',[''])[0],journal=m.get('container-title',[''])[0],authors=[a.get('given','')+' '+a.get('family','') for a in m.get('author',[])],date=m.get('published',{}).get('date-parts'),url=m.get('URL'),verifiedBy='Crossref primary DOI registry')
    except Exception as e:return dict(doi=doi,error=str(e))
with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(fetch,DOIS))
out=Path(__file__).resolve().parents[2]/'assets/geology/references.json'
out.write_text(json.dumps(dict(checked='2026-11-01',references=results),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(results,ensure_ascii=False))
