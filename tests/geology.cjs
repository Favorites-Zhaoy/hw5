const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const site=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(site,p),'utf8');
function runtime(hash='#/stage/geology'){
  const dom=new JSDOM('<div id="view"></div>',{url:'http://localhost/'+hash,runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,errors=[];w.addEventListener('error',e=>errors.push(e.message));w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.Admin={loggedIn:()=>false};
  for(const p of ['assets/data.js','assets/core/registry.js','assets/core/kit.js','assets/geology/content.js','assets/geology/experiments.js','assets/geology/models.js','assets/geology/core.js','assets/geology/stage.js','assets/geology/teaching.js','assets/geology/lessons.js','assets/cases/geology.case.js','assets/core/shell.js'])w.eval(read(p));
  return {w,doc:w.document,close:()=>{w.close();assert.deepEqual(errors,[],'no uncaught page exceptions');}};
}
test('all four registered lessons honor their original method categories and three sections',()=>{
  const r=runtime();
  for(const c of r.w.GEOLOGY_CONTENT){const kase=r.w.Cases.get(c.caseId);assert.equal(kase.status,'ready');assert.deepEqual(Array.from(kase.methods),Array.from(r.w.ATLAS.index.byScene[c.id].methods));assert.ok(r.w.ATLAS.index.byScene[c.id].demo);assert.equal(kase.tabs.background.sections.length,5);assert.equal(kase.tabs.workflow.steps.length,6);assert.equal(r.w.Cases.validate(kase).filter(x=>x.level==='error').length,0);}
  r.doc.querySelector('[data-ml-method-button="nlp"]').click();assert.equal(r.doc.querySelectorAll('.ml-read-card').length,1);assert.ok(r.w.location.hash.includes('m=nlp'));assert.equal(r.doc.querySelectorAll('.ml-spot.is-relevant').length,1);r.doc.querySelector('[data-ml-method-button="cv"]').click();assert.equal(r.doc.querySelectorAll('.ml-read-card').length,3);assert.equal(r.doc.querySelectorAll('.ml-spot.is-relevant').length,3);r.close();
});
test('confidence filtering reports coverage without inflating the full-image score',()=>{
 const r=runtime(),{GeologyMath:U,GEOLOGY_DATA:D}=r.w;
 for(const t of D.g1.records){const lo=U.remote(t,.4),hi=U.remote(t,.9);assert.ok(hi.accepted<lo.accepted);assert.equal(lo.full,hi.full);assert.equal(lo.baseline,hi.baseline);assert.ok(lo.full>0&&lo.full<1);}
 r.close();
});
test('browser RF and IF forward passes reproduce Python outputs and respond to actual input changes',()=>{
 const r=runtime(),D=r.w.GEOLOGY_DATA,U=r.w.GeologyMath;
 for(const t of D.g1.records){const p=U.remoteRecord(t,1);p.scores.forEach((scores,i)=>{assert.equal(p.prediction[i],t.prediction[i]);scores.forEach((v,j)=>assert.ok(Math.abs(v-t.scores[i][j])<1e-7));});}
 for(const t of D.g2.records)for(const p of t.points)assert.ok(Math.abs(U.isolationScore(p.values)-p.score)<1e-7);
 const t=D.g1.records[0],before=JSON.stringify(t.bands),a=U.remoteRecord(t,1),b=U.remoteRecord(t,.6);assert.ok(a.prediction.some((v,i)=>v!==b.prediction[i]));assert.equal(JSON.stringify(t.bands),before);
 const block=D.g2.records[0],base=U.chemicalRecord(block,1),changed=U.chemicalRecord(block,1.25);assert.ok(base.points.some((p,i)=>Math.abs(p.score-changed.points[i].score)>.001));assert.equal(changed.points[0].sourceValues[0],block.points[0].values[0]);r.close();
});
test('the reference layout contains five named chapters, professional diagrams, verified research and two parts numbered 03',()=>{
 for(const id of ['g1','g2','g3','g4']){const r=runtime('#/scene/'+id+'?tab=bg'),d=r.doc;assert.deepEqual(Array.from(d.querySelectorAll('.geo-chapter-body>h2')).map(n=>n.textContent),['真实背景','技术前沿','示例数据','技术难度与参考方向','术语对照表']);assert.equal(d.querySelectorAll('.geo-professional-concept').length,3);assert.ok(d.querySelectorAll('.geo-research').length>=1);assert.equal(d.querySelectorAll('.geo-glossary tbody tr').length,10);d.querySelector('#tabs [data-tab="flow"]').click();assert.deepEqual(Array.from(d.querySelectorAll('.geo-steps .geo-step>b')).map(n=>n.textContent),['01','02','03','03','04','05']);r.close();}
});
test('DBSCAN distinguishes dense clusters, reachable borders and isolated noise',()=>{
 const r=runtime(),U=r.w.GeologyMath,points=[{x:0,y:0},{x:100,y:0},{x:0,y:100},{x:200,y:0},{x:1000,y:1000}];
 const z=U.dbscan(points,[true,true,true,true,true],3);assert.equal(z.count,1);assert.equal(z.labels[4],-1);assert.ok(z.labels.slice(0,4).every(v=>v===0));
 for(const t of r.w.GEOLOGY_DATA.g2.records){const z=U.chem(t,88,2,true);assert.ok(t.points.every((p,i)=>!p.road||!z.model[i]));assert.ok(z.metrics.fn>0,'keep real omissions');assert.ok(z.clusterCount>0);}
 r.close();
});
test('browser NLP inference reproduces the fitted Python probabilities and responds to edited text',()=>{
 const r=runtime(),D=r.w.GEOLOGY_DATA,U=r.w.GeologyMath;
 for(const t of D.g3.records){for(const variant of Object.values(t.variants)){assert.ok(variant.lines.length>=2,'actual vector polylines must be present');assert.ok(variant.lines.some(line=>Math.hypot(line.at(-1)[0]-line[0][0],line.at(-1)[1]-line[0][1])>50),'retained traces have substantial extent');}for(const l of t.labels){const p=U.nlp(l.legend);assert.equal(p.label,l.prediction);p.scores.forEach((s,i)=>assert.ok(Math.abs(s-l.nlpScores[i])<.00002));assert.ok(l.ocrScore>.7);assert.ok(Math.abs(l.ocrXY[0]-l.x)<5&&Math.abs(l.ocrXY[1]-l.y)<5);}}
 assert.equal(U.nlp('厚层浅灰色石灰岩').label,'灰岩单元');assert.equal(U.nlp('深灰色泥岩').label,'泥岩单元');assert.equal(U.nlp('浅黄色粗粒砂岩').label,'砂岩单元');r.close();
});
test('scale changes trace length and P21 while preserving directions; exports preserve provenance',()=>{
 const r=runtime(),D=r.w.GEOLOGY_DATA,U=r.w.GeologyMath,t=D.g4.records[0];const a=U.fractures(t,45,8,100,false),b=U.fractures(t,45,8,80,false);assert.equal(a.lines.length,b.lines.length);assert.ok(Math.abs(b.length/a.length-1.25)<1e-9);assert.ok(Math.abs(b.p21/a.p21-.8)<1e-9);assert.ok(a.metrics.f1<1);const f=U.exportData(r.w.GEOLOGY_CONTENT[3],t,{minlen:45,gap:8,ppm:100,excludeHorizontal:false});assert.ok(f.text.includes('image_angle_deg'));assert.ok(f.text.includes('synthetic-teaching'));r.close();
});
test('each lesson mounts all sections, shares controls across tabs, and disposes cleanly',()=>{
 for(const id of ['g1','g2','g3','g4']){const r=runtime('#/scene/'+id+'?tab=demo'),doc=r.doc;assert.ok(doc.querySelector('[data-geo-viz]'));assert.ok(!doc.body.textContent.includes('案例部分挂载失败'));
   if(id==='g3'){doc.querySelector('[data-geo-legend]').value='深灰色泥岩';doc.querySelector('[data-geo-analyze]').click();assert.ok(doc.querySelector('[data-geo-viz]').textContent.includes('泥岩单元'));}
   const record=doc.querySelector('[data-geo-control="record"]');record.value='1';record.dispatchEvent(new r.w.Event('change',{bubbles:true}));doc.querySelector('#tabs [data-tab="flow"]').click();doc.querySelector('.geo-steps [data-geo-step="3"]').click();assert.ok(doc.querySelector('[data-panel="flow"] [data-geo-viz]'));doc.querySelector('#tabs [data-tab="bg"]').click();assert.equal(doc.querySelectorAll('[data-panel="bg"] .geo-chapter').length,5);doc.querySelector('#tabs [data-tab="demo"]').click();assert.equal(doc.querySelector('[data-panel="demo"] [data-geo-control="record"]').value,'1');r.close();
 }
});
test('all locally referenced lesson assets exist and generated illustrations are never experiment inputs',()=>{
 const r=runtime(),doc=r.doc;for(const c of r.w.GEOLOGY_CONTENT)for(const ext of ['png','webp'])assert.ok(fs.existsSync(path.join(site,'assets/images/geology',c.image+'.'+ext)));const p=JSON.parse(read('assets/geology/provenance.json'));assert.equal(p.illustrationsUsedForEvaluation,false);for(const id of ['g1','g2','g3','g4'])for(const t of r.w.GEOLOGY_DATA[id].records){if(t.image)assert.ok(fs.existsSync(path.join(site,'assets/geology',t.image)));}r.close();
});
