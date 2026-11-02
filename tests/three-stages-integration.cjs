'use strict';
// Exercise the real portal loading order, picture entrances and outer-tab protocol.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const groups=[['cementing','cmap','c'],['completion','comap','co'],['perforation','pmap','p']];
function app(hash){
 const dom=new JSDOM(read('index.html'),{url:'https://course.test/'+hash,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,errors=[],scrolls=[];
 w.scrollTo=(...args)=>scrolls.push(args);w.HTMLElement.prototype.scrollIntoView=function(){};
 w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 w.SVGElement.prototype.pauseAnimations=function(){};w.SVGElement.prototype.unpauseAnimations=function(){};
 w.addEventListener('error',e=>errors.push(e.error||e.message));
 for(const script of w.document.querySelectorAll('script[src]'))w.eval(read(script.getAttribute('src').split('?')[0]));
 return {w,errors,scrolls,go(route){w.history.replaceState(null,'',route);w.dispatchEvent(new w.Event('hashchange'));},close(){dom.window.close();}};
}
test('three illustrated homepages retain the catalog domains and route every picture to one current case',()=>{
 const f=app('#/stage/cementing');try{
  for(const [stage,prefix,letter] of groups){
   f.go('#/stage/'+stage);const d=f.w.document,home=d.querySelector('[data-'+stage+'-stage]');assert.ok(home);
   assert.equal(home.querySelectorAll('[data-'+prefix+'-spot]').length,4);
   assert.equal(home.querySelectorAll('.'+prefix+'-read-card').length,4);
   assert.ok(home.querySelectorAll('svg.'+prefix+'-flows animateMotion').length>=8);
   const image=home.querySelector('[data-'+prefix+'-image]');assert.equal(image.getAttribute('src'),'assets/images/'+stage+'-process.webp');
   assert.match(image.getAttribute('srcset'),/-small\.webp 768w/);assert.equal(image.getAttribute('fetchpriority'),'high');
   for(let i=1;i<=4;i++){
    const id=letter+i,c=f.w.Cases.byScene(id),scene=f.w.ATLAS.index.byScene[id];
    assert.equal(c.lessonProtocol,'field-pages-v2');assert.equal(f.w.Cases.bySceneAll(id).length,1);
    assert.deepEqual(Array.from(c.methods),Array.from(scene.methods));assert.ok(scene.demo);
    assert.equal(f.w.Cases.validate(c).filter(v=>v.level==='error').length,0);
    const entrance=home.querySelector('[data-'+prefix+'-spot="'+id+'"]');
    assert.equal(entrance.getAttribute('href'),'#/scene/'+id+'?case='+c.id+'&tab=bg');
   }
  }assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
test('picture filters, pause, image failure and retry remain functional in all three stages',()=>{
 const f=app('#/');try{
  for(const [stage,prefix,letter] of groups){
   f.go('#/stage/'+stage);const d=f.w.document,home=d.querySelector('[data-'+stage+'-stage]'),map=home.querySelector('[data-'+prefix+'-map]'),image=home.querySelector('[data-'+prefix+'-image]');
   assert.ok(home.classList.contains('is-paused'));home.querySelector('[data-'+prefix+'-toggle]').click();assert.ok(home.classList.contains('is-playing'));
   for(const button of home.querySelectorAll('[data-'+prefix+'-method-button]')){
    button.click();const filter=button.getAttribute('data-'+prefix+'-method-button');
    for(let i=1;i<=4;i++){
     const id=letter+i,spot=home.querySelector('[data-'+prefix+'-spot="'+id+'"]'),relevant=!filter||f.w.ATLAS.index.byScene[id].methods.includes(filter);
     assert.equal(spot.classList.contains('is-dim'),!relevant);
    }
    assert.equal(home.querySelectorAll('.'+prefix+'-read-card').length,f.w.ATLAS.index.byStage[stage].scenes.filter(s=>!filter||s.methods.includes(filter)).length);
   }
   image.dispatchEvent(new f.w.Event('error'));assert.equal(map.getAttribute('data-'+prefix+'-image-state'),'error');
   const retry=home.querySelector('[data-'+prefix+'-image-retry]');assert.equal(retry.hidden,false);retry.click();
   assert.equal(map.getAttribute('aria-busy'),'true');assert.match(image.getAttribute('src'),/\?retry=/);
   image.dispatchEvent(new f.w.Event('load'));assert.equal(map.getAttribute('data-'+prefix+'-image-state'),'ready');assert.equal(retry.hidden,true);
  }assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
test('all twelve cases open distinct fixed documents with one outer navigation and reset at tab changes',()=>{
 const f=app('#/');try{
  for(const [, ,letter] of groups)for(let i=1;i<=4;i++){
   const id=letter+i;f.go('#/scene/'+id+'?tab=bg');const d=f.w.document,c=f.w.Cases.byScene(id),seen=[];
   for(const [key,file] of [['bg','background'],['flow','workflow'],['demo','identify']]){
    const before=f.scrolls.length;d.querySelector('#tabs [data-tab="'+key+'"]').click();assert.ok(f.scrolls.length>before);
    const frame=d.querySelector('#case-'+key+'-root iframe'),src=frame.getAttribute('src').split('?')[0];
    assert.equal(src,c.id+'-case/demo/'+file+'.html');seen.push(src);
    const html=read(src),page=new JSDOM(html);assert.equal(page.window.document.querySelectorAll('main.lesson').length,1);
    assert.equal(page.window.document.querySelectorAll('iframe,.case-nav,.case-tabs').length,0);page.window.close();
   }
   assert.equal(new Set(seen).size,3);assert.equal(d.querySelectorAll('#tabs').length,1);assert.equal(d.querySelectorAll('.case-switch').length,0);
  }assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
test('the outer portal carries current records between fixed documents and rejects unrelated window messages',()=>{
 const f=app('#/');try{
  for(const [, ,letter] of groups)for(let i=1;i<=4;i++){
   const id=letter+i;f.go('#/scene/'+id+'?tab=flow');const w=f.w,d=w.document,flow=d.querySelector('#case-flow-root iframe'),state={caseId:w.Cases.byScene(id).id,record:2,recordId:'teaching-check',step:3};
   w.dispatchEvent(new w.MessageEvent('message',{source:flow.contentWindow,data:{__lessonStateUpdate:state}}));
   d.querySelector('#tabs [data-tab="demo"]').click();const demo=d.querySelector('#case-demo-root iframe'),messages=[];
   demo.contentWindow.postMessage=payload=>messages.push(payload);
   w.dispatchEvent(new w.MessageEvent('message',{source:w,data:{__lessonStateUpdate:{record:99}}}));
   w.dispatchEvent(new w.MessageEvent('message',{source:demo.contentWindow,data:{__lessonStateRequest:true}}));
   assert.equal(messages.at(-1).__lessonSection,'demo');assert.deepEqual(messages.at(-1).__lessonSharedState,state);
   const before=f.scrolls.length;w.dispatchEvent(new w.MessageEvent('message',{source:demo.contentWindow,data:{__lessonNavigate:'background'}}));
   assert.equal(d.querySelector('#tabs .on').dataset.tab,'bg');assert.ok(f.scrolls.length>before);
  }assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});
