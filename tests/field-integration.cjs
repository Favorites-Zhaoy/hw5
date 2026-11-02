// Exercise the actual index and router, not a separate list of demo scripts.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function app(hash,stored){
 const dom=new JSDOM(read('index.html'),{url:'https://field-course.test/'+hash,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,errors=[],scrolls=[];
 w.scrollTo=(...args)=>scrolls.push(args);w.HTMLElement.prototype.scrollIntoView=function(){};
 w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 w.SVGElement.prototype.pauseAnimations=function(){};w.SVGElement.prototype.unpauseAnimations=function(){};
 w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 w.addEventListener('error',e=>errors.push(e.error||e.message));
 if(stored)w.localStorage.setItem('atlas.casepack.v2',stored);
 const scripts=Array.from(w.document.querySelectorAll('script[src]'),s=>s.getAttribute('src').split('?')[0]);
 for(const script of scripts)w.eval(read(script));
 return {w,errors,scrolls,scripts,go(route){w.history.replaceState(null,'',route);w.dispatchEvent(new w.Event('hashchange'));},close(){dom.window.close();}};
}
test('the index loads ten current field lessons and one maintained welllog-layer implementation',()=>{
 const f=app('#/stage/drilling');try{
  assert.ok(!f.scripts.includes('assets/cases/welllog-layer.case.js'));
  assert.ok(!f.scripts.includes('assets/cases/welllog-layer.demo.js'));
  for(const [stage,prefix] of [['drilling','d'],['welllog','w']]){
   f.go('#/stage/'+stage);assert.ok(f.w.document.querySelector('[data-'+stage+'-stage]'));
   for(let i=1;i<=5;i++){
    const id=prefix+i,c=f.w.Cases.byScene(id);assert.ok(c,id);assert.equal(c.lessonProtocol,'field-pages-v2');
    assert.equal(c.tabs.background.sections.length,5);assert.equal(c.tabs.workflow.steps.length,6);
    assert.ok(f.w.ATLAS.index.byScene[id].demo);assert.equal(f.w.Cases.validate(c).filter(v=>v.level==='error').length,0);
    assert.ok(f.w.document.querySelector('a[href*="/scene/'+id+'"]'),id+' has a topic-page entrance');
   }
  }
  assert.equal(f.w.Cases.bySceneAll('w1').length,1);assert.equal(f.w.Cases.byScene('w1').id,'welllog-layer');assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
test('all ten routes open three distinct case documents through the same outer tabs as mudlogging',()=>{
 const f=app('#/');try{
  for(const prefix of ['d','w'])for(let i=1;i<=5;i++){
   const id=prefix+i;f.go('#/scene/'+id+'?tab=bg');
   const doc=f.w.document,background=doc.querySelector('#case-bg-root iframe');assert.ok(background);
   assert.equal(doc.querySelectorAll('#tabs').length,1);assert.match(background.getAttribute('src'),/\/demo\/background\.html\?/);
   doc.querySelector('#tabs [data-tab="flow"]').click();const flow=doc.querySelector('#case-flow-root iframe');assert.match(flow.getAttribute('src'),/\/demo\/workflow\.html\?/);
   const before=f.scrolls.length;doc.querySelector('#tabs [data-tab="demo"]').click();assert.ok(f.scrolls.length>before);
   const demo=doc.querySelector('#case-demo-root iframe');assert.ok(demo);assert.match(demo.getAttribute('src'),/\/demo\/identify\.html\?/);
   const sources=[background,flow,demo].map(frame=>frame.getAttribute('src').split('?')[0]);assert.equal(new Set(sources).size,3);
   for(const source of sources){assert.ok(fs.existsSync(path.join(root,source)));const page=read(source);assert.ok(page.includes('class="lesson'));assert.ok(!page.includes('<iframe'));assert.ok(!page.includes('class="drl-crosslinks"'));}
   assert.ok(!doc.querySelector('.case-switch'));
  }
  f.go('#/stage/mudlogging');assert.ok(f.w.document.querySelector('[data-ml-stage]'));assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
test('an archived same-ID welllog example cannot replace the current three-document case',()=>{
 const stored=JSON.stringify([{v:2,pkg:{id:'welllog-layer',sceneId:'w1',tabs:{}},meta:{id:'welllog-layer',sceneId:'w1',version:'0.1',title:'Old welllog demo'},files:[]}]);
 const f=app('#/scene/w1?case=welllog-layer&tab=3',stored);try{
  assert.equal(f.w.Cases.get('welllog-layer').lessonProtocol,'field-pages-v2');
  assert.match(f.w.document.querySelector('#case-demo-root iframe').getAttribute('src'),/^w1-layer-case\/demo\/identify\.html/);
  assert.equal(f.w.localStorage.getItem('atlas.casepack.v2'),stored);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
