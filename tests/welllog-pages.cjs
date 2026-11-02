'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const packages=[['w1','welllog-layer','w1-layer-case'],['w2','welllog-w2','w2-porosity-case'],['w3','welllog-w3','w3-fracture-case'],['w4','welllog-w4','w4-lithology-case'],['w5','welllog-w5','w5-repair-case']];
const sections={background:'background.html',workflow:'workflow.html',demo:'identify.html'};
const plain=x=>JSON.parse(JSON.stringify(x));
function page(folder,part){
 const outer=new JSDOM('<!doctype html><iframe title="lesson"></iframe>',{url:'https://welllog.test/',runScripts:'outside-only'});
 const frame=outer.window.document.querySelector('iframe'),w=frame.contentWindow,doc=w.document,messages=[],scrolls=[];
 outer.window.postMessage=data=>messages.push(plain(data));
 doc.open();doc.write(read(folder+'/demo/'+sections[part]));doc.close();
 w.scrollTo=(x,y)=>scrolls.push([x,y]);
 w.eval(read(folder+'/assets/config.js'));
 for(const name of ['content','data','models','core','lessons'])w.eval(read('assets/welllog/'+name+'.js'));
 w.eval(read(folder+'/assets/client.js'));
 return {w,doc,frame,messages,scrolls,shared:values=>w.dispatchEvent(new w.MessageEvent('message',{source:outer.window,data:{__lessonSharedState:values}})),close:()=>{w.WelllogLesson?.dispose();outer.window.close();}};
}
test('each welllog case is three fixed M2-template documents with an isolated manifest',()=>{
 for(const [scene,id,folder] of packages){
  const manifest=JSON.parse(read(folder+'/case.json'));
  assert.equal(manifest.id,id);assert.equal(manifest.sceneId,scene);assert.equal(manifest.lessonProtocol,'field-pages-v2');
  assert.equal(manifest.sourcePackage,folder);assert.equal(manifest.tabs.background.sections.length,5);
  assert.deepEqual(manifest.tabs.workflow.steps.map(v=>v.number),['01','02','03','03','04','05']);
  assert.ok(read(folder+'/README.md').includes('#/scene/'+scene+'?case='+id+'&tab=demo'));
  for(const [part,file] of Object.entries(sections)){
   const html=read(folder+'/demo/'+file),dom=new JSDOM(html),doc=dom.window.document;
   assert.equal(doc.body.dataset.section,part);assert.equal(doc.querySelectorAll('main.lesson').length,1);
   assert.equal(doc.querySelectorAll('.intro').length,1);
   assert.ok(doc.querySelector('link[href^="../../m2-gas-case/assets/lesson.css"]'));
   assert.equal(doc.querySelectorAll('iframe,.case-nav,.wl-crosslinks,.tabs,.wl-intro').length,0);
   if(part==='background'){
    assert.deepEqual([...doc.querySelectorAll('.chapter>div>h2')].map(v=>v.textContent),['真实背景','技术前沿','示例数据','技术难度与参考方向','术语对照表']);
    assert.equal(doc.querySelectorAll('.professional-concept').length,3);
    assert.deepEqual([...doc.querySelectorAll('.concept-heading>span')].map(v=>v.textContent),['A','B','C']);
    const figs=[...doc.querySelectorAll('.professional-concept svg')];assert.equal(figs.length,3);
    assert.equal(new Set(figs.map(v=>v.getAttribute('aria-label'))).size,3,scene+' has distinct professional diagrams');
    assert.ok(doc.querySelectorAll('.research').length>=2);assert.ok(doc.querySelectorAll('.glossary tbody tr').length>=10);
   }else if(part==='workflow'){
    assert.ok(doc.querySelector('.scenario'));assert.ok(doc.querySelector('.sample-toolbar'));
    assert.deepEqual([...doc.querySelectorAll('.flow-nav button>span')].map(v=>v.textContent),['01','02','03','03','04','05']);
    assert.equal(doc.querySelectorAll('.flow-nav [data-flow-part="traditional"]').length,1);
    assert.equal(doc.querySelectorAll('.flow-nav [data-flow-part="ai"]').length,1);
    assert.ok(doc.querySelector('.flow-layout .flow-explain'));assert.ok(doc.querySelector('.flow-layout .flow-stage svg'));
   }else{
    assert.equal(doc.querySelectorAll('.guide-chapter').length,3);
    assert.deepEqual([...doc.querySelectorAll('.guide-chapter>header .mini')].map(v=>v.textContent),['引入的智能化方法是什么？','为什么加入此方法有作用？','在效果上怎么样？']);
    for(const chapter of doc.querySelectorAll('.guide-chapter'))assert.ok(chapter.querySelector('svg'),scene+' '+chapter.id+' contains visual evidence');
   }
   for(const el of doc.querySelectorAll('script[src],link[href],svg image[href]')){
    const value=el.getAttribute('src')||el.getAttribute('href');
    if(/^(https?:|data:|#)/.test(value))continue;
    const target=path.resolve(root,folder,'demo',value.split('?')[0]);
    assert.ok(fs.existsSync(target),folder+'/'+file+' missing '+value);
   }
   dom.window.close();
  }
 }
});
test('registry uses the M2 sandbox and iframe sizing for all five stable case IDs',()=>{
 const dom=new JSDOM('<!doctype html><main></main>',{url:'https://welllog.test/',runScripts:'outside-only'}),w=dom.window;
 try{
  w.eval(read('assets/core/registry.js'));w.eval(read('assets/cases/welllog.case.js'));
  for(const [scene,id,folder] of packages){
   const def=w.Cases.get(id);assert.equal(def.sceneId,scene);assert.equal(def.lessonProtocol,'field-pages-v2');
   for(const [part,file] of Object.entries(sections)){
    const host=w.document.createElement('section');w.document.body.append(host);def.tabs[part].mount(host);
    const f=host.querySelector('iframe');assert.ok(f);assert.ok(f.getAttribute('src').startsWith(folder+'/demo/'+file));
    assert.equal(f.getAttribute('sandbox'),'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads');
    assert.equal(f.getAttribute('referrerpolicy'),'no-referrer');
    assert.equal(f.style.height,'1040px');assert.equal(f.style.borderTopWidth,'0px');
    w.dispatchEvent(new w.MessageEvent('message',{source:f.contentWindow,data:{__lessonHeight:1800}}));assert.equal(f.style.height,'1802px');
    def.tabs[part].unmount();assert.equal(host.querySelector('iframe'),null);host.remove();
   }
  }
 }finally{dom.window.close();}
});
test('initial frame identity preserves the requested section and requests parent state',()=>{
 for(const [,id,folder] of packages)for(const part of ['workflow','demo']){
  const p=page(folder,part);try{
   assert.equal(p.w.WelllogLesson.section,part);assert.equal(p.w.WelllogLesson.caseId,id);
   assert.deepEqual(p.messages.filter(v=>v.__lessonSection),[{__lessonSection:part}]);
   assert.equal(p.messages.filter(v=>v.__lessonStateRequest).length,1);
   assert.equal(p.messages.filter(v=>v.__lessonNavigate).length,0);
   p.doc.querySelector('[data-go]').click();
   assert.equal(p.messages.at(-1).__lessonNavigate,part==='workflow'?'demo':'workflow');
   p.w.dispatchEvent(new p.w.MessageEvent('message',{source:p.w.parent,data:{__m1ScrollToTop:true}}));
   assert.deepEqual(p.scrolls,[[0,0]]);
  }finally{p.close();}
 }
});
test('record and parameters travel between fixed documents without replacing the dragged slider',()=>{
 const a=page('w2-porosity-case','background'),b=page('w2-porosity-case','demo');
 try{
  const initial=a.w.WelllogLesson.current().prediction.slice();
  a.shared({recordId:'WL-116',factor:1.1,point:60});b.shared(a.w.WelllogLesson.snapshot());
  assert.equal(a.doc.querySelector('#sample-select').value,'WL-116');
  assert.equal(b.doc.querySelector('#sample-select').value,'WL-116');
  assert.equal(b.w.WelllogLesson.state.point,60);assert.equal(b.w.WelllogLesson.state.factor,1.1);
  const slider=b.doc.querySelector('[data-wl-control="factor"]'),messages=b.messages.length;
  slider.value='1.2';slider.dispatchEvent(new b.w.Event('input',{bubbles:true}));
  assert.equal(b.doc.querySelector('[data-wl-control="factor"]'),slider);
  const update=b.messages.slice(messages).find(v=>v.__lessonStateUpdate);assert.ok(update);
  assert.equal(update.__lessonStateUpdate.recordId,'WL-116');assert.equal(update.__lessonStateUpdate.factor,1.2);
  a.shared(update.__lessonStateUpdate);assert.equal(a.w.WelllogLesson.state.factor,1.2);
  assert.ok(a.w.WelllogLesson.current().prediction.some((v,i)=>Math.abs(v-initial[i])>.001));
  const count=a.messages.filter(v=>v.__lessonStateUpdate).length;a.shared(b.w.WelllogLesson.snapshot());
  assert.equal(a.messages.filter(v=>v.__lessonStateUpdate).length,count,'restoring shared state must not echo updates');
 }finally{a.close();b.close();}
});
test('workflow has a six-card paired comparison with functioning previous and next controls',()=>{
 const p=page('w1-layer-case','workflow');try{
  p.doc.querySelector('[data-step="2"]').click();assert.equal(p.w.WelllogLesson.state.step,2);
  assert.equal(p.doc.querySelector('#flow-layout').dataset.focus,'comparison');
  assert.ok(p.doc.querySelector('#flow-counter').textContent.includes('传统处理'));
  p.doc.querySelector('#flow-next').click();assert.equal(p.w.WelllogLesson.state.step,3);
  assert.ok(p.doc.querySelector('#flow-counter').textContent.includes('AI处理'));
  assert.ok(p.doc.querySelector('#flow-visual .wl-window'));
  p.doc.querySelector('#flow-prev').click();assert.equal(p.w.WelllogLesson.state.step,2);
  p.shared({step:4,recordId:'WL-116',threshold:.8});
  assert.equal(p.doc.querySelector('#flow-layout').dataset.focus,'results');
  assert.ok(p.doc.querySelector('#flow-visual .guide-result-bars'));
  assert.equal(p.doc.querySelector('#sample-select').value,'WL-116');
 }finally{p.close();}
});
test('W3 why reads the current 5x5 neighborhood and effects compare the full image',()=>{
 const p=page('w3-fracture-case','demo');try{
  const why=p.doc.querySelector('[data-wl-why]'),svg=why.querySelector('.wl-neighborhood');
  assert.ok(svg);assert.equal(why.querySelectorAll('.wl-three').length,0);
  assert.equal(p.doc.querySelectorAll('[data-wl-effect] .wl-three .wl-image').length,3);
  const location=[...svg.querySelectorAll('text')].find(v=>v.textContent.startsWith('当前位置')).textContent;
  const match=/当前位置 x=(\d+)，y=(\d+)/.exec(location);assert.ok(match);
  const x=Number(match[1]),y=Number(match[2]),o=p.w.WelllogLesson.current();
  const numbers=[...svg.querySelectorAll('text')].map(v=>v.textContent).filter(v=>/^\d\.\d{2}$/.test(v));
  assert.equal(numbers.length,25);
  let k=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)assert.equal(numbers[k++],o.pixels[(y+dy)*o.record.width+x+dx].toFixed(2));
  const old=svg.innerHTML;p.w.WelllogLesson.update({exposure:1.2});
  assert.notEqual(p.doc.querySelector('[data-wl-why] .wl-neighborhood').innerHTML,old);
  assert.ok(p.w.WelllogLesson.current().metrics.fp+p.w.WelllogLesson.current().metrics.fn>0);
 }finally{p.close();}
});
test('W5 explains and scores a cropped masking ROI while hidden originals stay outside input',()=>{
 const p=page('w5-repair-case','demo');try{
  p.shared({gapStart:100,gapLength:12,recordId:'WL-116'});
  const o=p.w.WelllogLesson.current();
  assert.equal(o.observed.filter(v=>v===null).length,12);
  assert.equal(p.doc.querySelector('[data-wl-control="gapStart"]').value,'100');
  const charts=[...p.doc.querySelectorAll('[data-wl-effect] .wl-chart')];
  assert.equal(charts.length,1);assert.ok(charts[0].textContent.includes('GR 缺口'));
  assert.ok(charts[0].textContent.includes(o.record.depth[92].toFixed(1)+'–'+o.record.depth[119].toFixed(1)));
  assert.ok(p.doc.querySelector('[data-wl-why]').textContent.includes('缺口内GR隐藏')||p.doc.querySelector('[data-wl-why] svg[aria-label*="GR隐藏"]'));
  const before=o.prediction.slice(),record=o.record,saved=record.curves.map(v=>v[0]);
  for(let i=100;i<112;i++)record.curves[i][0]+=500;
  p.w.WelllogLesson.refresh();const after=p.w.WelllogLesson.current();
  for(let i=100;i<112;i++)assert.equal(after.prediction[i],before[i]);
  record.curves.forEach((v,i)=>v[0]=saved[i]);
 }finally{p.close();}
});
