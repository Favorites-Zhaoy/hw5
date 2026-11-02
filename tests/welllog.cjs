const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
function app(){
 const dom=new JSDOM('<!doctype html><main id="root"></main>',{url:'https://welllog.test/',runScripts:'outside-only'}),w=dom.window;
 for(const f of ['assets/core/registry.js',...['content','data','models','core','stage','lessons'].map(n=>'assets/welllog/'+n+'.js'),'assets/cases/welllog.case.js'])w.eval(read(f));
 return {w,doc:w.document,close:()=>dom.window.close()};
}
test('five field lessons retain their task domains, five chapters and paired step 03',()=>{
 const a=app();try{
  assert.equal(a.w.WELLLOG_CONTENT.length,5);
  for(const [i,c] of a.w.WELLLOG_CONTENT.entries()){
   const def=a.w.Cases.get(c.caseId);assert.equal(def.sceneId,'w'+(i+1));assert.equal(def.lessonProtocol,'field-pages-v2');
   assert.deepEqual(plain(c.methods),[['ts'],['ts','opt'],['cv'],['ts'],['ts']][i]);
   assert.equal(def.tabs.background.sections.length,5);assert.deepEqual(plain(def.tabs.workflow.steps.map(v=>v.number)),['01','02','03','03','04','05']);
   assert.ok(c.papers.length>=2);assert.ok(c.terms.length>=10);assert.ok(c.difficulty.length>30);
   const el=a.doc.createElement('section'),un=a.w.WelllogLessons.mount(c,'background',el);
   const figures=[...el.querySelectorAll('.wl-professional-concept svg')];assert.equal(figures.length,3);
   assert.equal(new Set(figures.map(v=>v.getAttribute('aria-label'))).size,3,c.id+' has complementary professional figures');
   assert.equal(el.querySelectorAll('.wl-chapter').length,5);assert.equal(el.querySelector('iframe'),null);un();
  }
  assert.equal(a.w.Cases.get('welllog-layer').sceneId,'w1');
 }finally{a.close();}
});
test('training provenance and frozen weights have independently checkable hashes and isolated test IDs',()=>{
 const a=app();try{
  const D=a.w.WELLLOG_DATA,P=JSON.parse(read('assets/welllog/provenance.json'));
  assert.equal(D.kind,'synthetic-teaching');assert.equal(D.trainingIds.length,12);assert.equal(D.validationIds.length,2);
  for(const r of D.records){assert.ok(!D.trainingIds.includes(r.id));assert.ok(!D.validationIds.includes(r.id));assert.equal(r.split,'held-out-well');}
  const raw=read('assets/welllog/models.js').replace(/^window.WELLLOG_MODELS=/,'').replace(/;\s*$/,'');
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),D.modelSha256);assert.equal(P.modelSha256,D.modelSha256);
  assert.equal(crypto.createHash('sha256').update(read('tools/welllog/prepare.py')).digest('hex'),D.generatorSha256);
  assert.equal(a.w.WELLLOG_MODELS.w3.trainingSeeds.length,40);for(const im of D.images)assert.ok(!a.w.WELLLOG_MODELS.w3.trainingSeeds.includes(Number(im.id.split('-')[1])));
 }finally{a.close();}
});
test('w1 emits probability-derived spaced candidate boundaries, without reading labels for inference',()=>{
 const a=app();try{
  const U=a.w.WelllogMath,D=a.w.WELLLOG_DATA,before=JSON.stringify(D.records);
  const out=U.evaluate('w1',0,{threshold:.5,thickness:4});assert.ok(out.prediction.length>0);
  assert.ok(Math.max(...out.scores.map((v,i)=>Math.abs(v-D.records[0].boundaryProbability[i])))<1e-9);
  for(let i=0;i<out.prediction.length;i++){const p=out.prediction[i];assert.ok(out.scores[p]>=.5);if(i)assert.ok(p-out.prediction[i-1]>=8);}
  const original=D.records[0].boundaries;D.records[0].boundaries=[2,3,4];assert.deepEqual(plain(U.evaluate('w1',0,{}).prediction),plain(out.prediction));D.records[0].boundaries=original;
  assert.equal(JSON.stringify(D.records),before);
 }finally{a.close();}
});
test('w2 and w4 calculate multicurve results and preserve original measurements',()=>{
 const a=app();try{
  const U=a.w.WelllogMath,D=a.w.WELLLOG_DATA,before=JSON.stringify(D.records);
  for(let r=0;r<2;r++){
   const phi=U.evaluate('w2',r,{});assert.ok(phi.metrics.mae<phi.metrics.baselineMAE);assert.ok(phi.prediction.every(Number.isFinite));
   assert.ok(Math.max(...phi.prediction.map((v,i)=>Math.abs(v-D.records[r].porosityPrediction[i])))<1e-9);
   assert.ok(U.evaluate('w2',r,{factor:1.2}).prediction.some((v,i)=>Math.abs(v-phi.prediction[i])>1e-6));
   const lith=U.evaluate('w4',r,{});for(let i=0;i<lith.scores.length;i++){
    assert.ok(Math.abs(lith.scores[i].reduce((s,v)=>s+v,0)-1)<1e-10);assert.equal(lith.prediction[i],lith.scores[i].indexOf(Math.max(...lith.scores[i])));
    for(let k=0;k<3;k++)assert.ok(Math.abs(lith.scores[i][k]-D.records[r].lithologyProbability[i][k])<1e-9);
   }
   const saved=JSON.parse(U.export(D.records[r]&&a.w.WELLLOG_CONTENT[1],phi,{record:r}));assert.equal(saved.sourceId,D.records[r].id);assert.deepEqual(saved.prediction,plain(phi.prediction));
  }
  assert.equal(JSON.stringify(D.records),before);
 }finally{a.close();}
});
test('w3 browser convolutions reproduce independent PyTorch probabilities and retain real model errors',()=>{
 const a=app();try{
  const U=a.w.WelllogMath,D=a.w.WELLLOG_DATA,before=JSON.stringify(D.images);
  for(let i=0;i<D.images.length;i++){
   const out=U.evaluate('w3',i,{exposure:1,threshold:.5,dark:.36});
   const maxdiff=Math.max(...out.scores.map((v,k)=>Math.abs(v-D.images[i].probability[k])));assert.ok(maxdiff<.0001,'JS/PyTorch maxdiff '+maxdiff);
   assert.ok(out.metrics.iou>out.baselineMetrics.iou);assert.ok(out.metrics.fp+out.metrics.fn>0);
   const changed=U.evaluate('w3',i,{exposure:1.2,threshold:.5,dark:.36});assert.ok(changed.scores.some((v,k)=>Math.abs(v-out.scores[k])>.001));
   const higher=U.evaluate('w3',i,{threshold:.8});assert.ok(higher.prediction.reduce((s,v)=>s+v,0)<=out.prediction.reduce((s,v)=>s+v,0));
  }
  assert.equal(JSON.stringify(D.images),before);
 }finally{a.close();}
});
test('w5 never reads hidden GR as model input, and reconstructs through the five-dimensional bottleneck',()=>{
 const a=app();try{
  const U=a.w.WelllogMath,D=a.w.WELLLOG_DATA,m=a.w.WELLLOG_MODELS.w5,s={gapStart:68,gapLength:18};
  assert.deepEqual(plain(m.weights.map(l=>[l.length,l[0].length])),[[20,12],[12,5],[5,12],[12,20]]);
  const r=D.records[0],before=JSON.stringify(r),out=U.evaluate('w5',0,s),saved=r.curves.map(row=>row[0]);
  for(let i=68;i<86;i++)assert.ok(Math.abs(out.prediction[i]-r.maskedReference.prediction[i-68])<1e-8);
  for(let i=68;i<86;i++){assert.equal(out.observed[i],null);r.curves[i][0]+=500;}
  const withoutTruth=U.evaluate('w5',0,s);
  for(let i=68;i<86;i++){assert.equal(withoutTruth.prediction[i],out.prediction[i]);assert.equal(withoutTruth.baseline[i],out.baseline[i]);}
  r.curves.forEach((row,i)=>row[0]=saved[i]);assert.equal(JSON.stringify(r),before);assert.ok(Number.isFinite(out.metrics.mae));
  const longer=U.evaluate('w5',0,{gapStart:60,gapLength:28});assert.equal(longer.observed.filter(v=>v===null).length,28);
  for(let i=0;i<180;i++)if(!out.mask[i])assert.equal(out.prediction[i],r.curves[i][0]);
 }finally{a.close();}
});
test('native tabs share one case state, synchronize mounted roots and preserve dragged range DOM',()=>{
 const a=app();try{
  const c=a.w.WELLLOG_CONTENT[1],roots=['background','workflow','demo'].map(part=>{const el=a.doc.createElement('section');a.doc.body.append(el);return {el,part,un:a.w.WelllogLessons.mount(c,part,el)};});
  const control=roots[2].el.querySelector('[data-wl-control="factor"]');control.value='1.2';control.dispatchEvent(new a.w.Event('input',{bubbles:true}));
  assert.equal(roots[2].el.querySelector('[data-wl-control="factor"]'),control);
  for(const {el} of roots)assert.equal(el.querySelector('[data-wl-control="factor"]').value,'1.2');
  assert.equal(a.w.WelllogLessons.sessions.w2.state.factor,1.2);roots[0].un();assert.equal(a.w.WelllogLessons.sessions.w2.roots.length,2);
  control.value='1.1';control.dispatchEvent(new a.w.Event('input',{bubbles:true}));assert.equal(roots[1].el.querySelector('[data-wl-control="factor"]').value,'1.1');
  roots[1].un();roots[2].un();assert.equal(a.w.WelllogLessons.sessions.w2.state.factor,1.1);
 }finally{a.close();}
});
test('w3 why uses the actual local neighborhood while effects show full-image comparisons',()=>{
 const a=app();try{
  const el=a.doc.createElement('section'),c=a.w.WELLLOG_CONTENT[2],un=a.w.WelllogLessons.mount(c,'demo',el);
  assert.equal(el.querySelectorAll('.wl-demo-chapter').length,3);
  assert.ok(el.querySelector('[data-wl-why] .wl-neighborhood'));
  assert.equal(el.querySelectorAll('[data-wl-why] .wl-three').length,0);
  assert.equal(el.querySelectorAll('[data-wl-effect] .wl-three .wl-image').length,3);un();
 }finally{a.close();}
});
test('welllog homepage reuses the mudlogging illustration map and highlights case pictures by method',()=>{
 const a=app();try{const w=a.w;w.eval(read('assets/data.js'));w.eval(read('assets/core/kit.js'));w.HTMLElement.prototype.scrollIntoView=function(){};const root=a.doc.getElementById('root'),ctx={stage:w.ATLAS.index.byStage.welllog,atlas:w.ATLAS,cases:w.Cases,K:w.K,query:{}};root.innerHTML=w.WelllogStage.render(ctx);assert.ok(!root.innerHTML.includes('undefined'),'every image hotspot has its own overlay');const host=root.querySelector('[data-welllog-stage]'),binding=w.WelllogStage.bind(host,ctx);assert.equal(host.querySelectorAll('.wmap-base').length,1);assert.match(host.querySelector('.wmap-base').getAttribute('src'),/welllog-process.webp$/);assert.equal(host.querySelectorAll('[data-wmap-spot]').length,5);host.querySelector('[data-wmap-method-button="cv"]').click();assert.deepEqual([...host.querySelectorAll('.wmap-spot.is-relevant')].map(v=>v.dataset.wmapSpot),['w3']);host.querySelector('[data-wmap-method-button="ts"]').click();assert.equal(host.querySelectorAll('.wmap-spot.is-relevant').length,4);binding.destroy();}finally{a.close();}
});
