'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const files = {background:'background.html',workflow:'workflow.html',demo:'identify.html'};
const source = {window:{}};
vm.createContext(source);
const runtime=['assets/shared-perforation/data.js','assets/shared-perforation/core.js','assets/completion/content.js','assets/completion/data.js','assets/completion/core.js','assets/completion/lessons.js'];
for (const file of runtime) vm.runInContext(read(file),source);
const content = source.window.COMPLETION_CONTENT;

function fixture(c,part){
 const html = read(c.caseId+'-case/demo/'+files[part]);
 const dom = new JSDOM(html,{url:'https://completion.test/'+c.caseId+'-case/demo/'+files[part],runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,messages=[],host={postMessage:value=>messages.push(value)},scrolls=[];
 Object.defineProperty(w,'parent',{value:host});
 w.scrollTo=(...args)=>scrolls.push(args);
 w.URL.createObjectURL=()=> 'blob:completion-package-test';w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){};
 for(const file of runtime)w.eval(read(file));
 w.eval(read(c.caseId+'-case/assets/config.js'));
 w.eval(read(c.caseId+'-case/assets/lesson-client.js'));
 const receive = value => w.dispatchEvent(new w.MessageEvent('message',{source:host,data:value}));
 return {w,messages,scrolls,receive,close:()=>dom.window.close()};
}

test('four packages use the actual M2 stylesheet and three distinct fixed HTML documents',()=>{
 const css=read('m2-gas-case/assets/lesson.css').replace(/\r\n/g,'\n');
 for(const c of content){
  const folder=c.caseId+'-case',manifest=JSON.parse(read(folder+'/case.json'));
  assert.equal(manifest.lessonProtocol,'field-pages-v2');
  assert.equal(read(folder+'/assets/lesson.css').replace(/\r\n/g,'\n'),css,c.id+' changed the reference template');
  assert.ok(read(folder+'/README.md').includes('不宣称可脱离课程根目录作为独立 ZIP'));
  const seen=new Set();
  for(const [part,file] of Object.entries(files)){
   const html=read(folder+'/demo/'+file),dom=new JSDOM(html),d=dom.window.document;
   seen.add(html);assert.equal(d.body.dataset.section,part);assert.equal(d.querySelectorAll('main.lesson').length,1);
   assert.equal(d.querySelectorAll('.intro h1').length,1);
   assert.equal(d.querySelectorAll('.tabbar,.case-nav,.cmp-crosslinks,.lesson-tabs,.hero').length,0);
   for(const el of d.querySelectorAll('script[src],link[rel=stylesheet]')){
    const attr=el.getAttribute(el.tagName==='SCRIPT'?'src':'href');
    assert.ok(!/^https?:/i.test(attr),'runtime dependency must be local');
    assert.ok(fs.existsSync(path.resolve(root,folder,'demo',attr.split('?')[0])),attr);
   }
   if(part==='background'){
    assert.deepEqual(Array.from(d.querySelectorAll('.chapter h2'),x=>x.textContent),['真实背景','技术前沿','示例数据','技术难度与参考方向','术语对照表']);
    assert.deepEqual(Array.from(d.querySelectorAll('.concept-heading>span'),x=>x.textContent),['A','B','C']);
    assert.equal(d.querySelectorAll('.professional-grid>.professional-svg').length,0);
    assert.equal(d.querySelectorAll('.professional-grid svg').length,3);
    assert.equal(d.querySelectorAll('.research').length,c.papers.length);assert.ok(d.querySelectorAll('.glossary tbody tr').length>=10);
   }else if(part==='workflow'){
    assert.deepEqual(Array.from(d.querySelectorAll('.flow-nav button>span'),x=>x.textContent),['01','02','03','03','04','05']);
    assert.equal(d.querySelectorAll('.scenario').length,1);assert.equal(d.querySelectorAll('.sample-toolbar').length,1);
    assert.equal(d.querySelectorAll('[data-flow-part=traditional]').length,1);assert.equal(d.querySelectorAll('[data-flow-part=ai]').length,1);
   }else{
    assert.equal(d.querySelectorAll('.guide-chapter').length,3);
    assert.deepEqual(Array.from(d.querySelectorAll('.guide-chapter>header .mini'),x=>x.textContent),['引入的智能化方法是什么？','为什么加入此方法有作用？','在效果上怎么样？']);
    for(const chapter of d.querySelectorAll('.guide-chapter'))assert.ok(chapter.querySelector('svg,.guide-result-bars'));
   }
   assert.ok(!/NaN|undefined|Infinity/.test(d.querySelector('main').innerHTML),c.id+' '+part);
   dom.window.close();
  }
  assert.equal(seen.size,3,c.id+' documents must be distinct');
 }
});

test('hydrated documents keep their identity while shared records and parameters continue across all pages',()=>{
 for(const c of content){
  const a=fixture(c,'workflow'),b=fixture(c,'demo'),bg=fixture(c,'background');
  try{
   assert.equal(a.w.CompletionPage.section,'workflow');assert.equal(b.w.CompletionPage.section,'demo');
   assert.ok(a.messages.some(x=>x.__lessonSection==='workflow'));assert.ok(b.messages.some(x=>x.__lessonSection==='demo'));
   assert.ok(a.messages.some(x=>x.__lessonStateRequest===true));
   const input=a.w.document.querySelector('[data-cmp-control]'),key=input.dataset.cmpControl;
   input.focus();input.value=input.min;input.dispatchEvent(new a.w.Event('input',{bubbles:true}));
   assert.strictEqual(a.w.document.querySelector('[data-cmp-control]'),input,'moving a slider must preserve its DOM node');
   assert.strictEqual(a.w.document.activeElement,input);
   const select=a.w.document.querySelector('[data-cmp-record]');select.value='2';select.dispatchEvent(new a.w.Event('change',{bubbles:true}));
   const patch=a.messages.filter(x=>x.__lessonStateUpdate).at(-1).__lessonStateUpdate;
   assert.equal(patch.record,2);assert.equal(patch[key],Number(input.min));assert.equal(patch.caseId,c.caseId);
   b.receive({__lessonSharedState:patch});bg.receive({__lessonSharedState:patch});
   for(const f of [b,bg]){assert.equal(f.w.document.querySelector('[data-cmp-record]').value,'2');assert.equal(f.w.CompletionPage.state[key],Number(input.min));for(const name of Object.keys(f.w.CompletionPage.state))assert.equal(f.w.CompletionPage.state[name],patch[name],c.id+' shared '+name);}
   assert.equal(b.w.document.body.dataset.section,'demo');assert.equal(bg.w.document.body.dataset.section,'background');
   assert.equal(b.messages.filter(x=>x.__lessonStateUpdate).length,0,'restoring shared state must not echo it');
   assert.equal(b.messages.filter(x=>x.__lessonNavigate).length,0,'restoring state must not navigate back to background');
   b.w.document.querySelector('[data-go=workflow]').click();assert.equal(b.messages.at(-1).__lessonNavigate,'workflow');
   b.receive({__lessonScrollToTop:true});assert.deepEqual(b.scrolls.at(-1),[0,0]);
   const snapshot=b.w.CompletionPage.snapshot();assert.equal(snapshot.record.id,patch.recordId);assert.equal(snapshot.dataKind,'synthetic-teaching');assert.ok(snapshot.model);
   assert.ok(!/NaN|undefined|Infinity/.test(b.w.document.querySelector('main').innerHTML));
  }finally{a.close();b.close();bg.close();}
 }
});

test('every workflow card renders its calculation and preserves matching output within the template',()=>{
 for(const c of content){const f=fixture(c,'workflow');try{
  const root=f.w.document;
  for(let i=0;i<6;i++){
   root.querySelector('[data-cmp-step="'+i+'"]').click();
   assert.equal(f.w.CompletionPage.state.step,i);
   assert.equal(root.querySelectorAll('.flow-nav [aria-pressed=true]').length,1);
   assert.ok(root.querySelector('[data-cmp-render=step-visual]').innerHTML.length>100);
   assert.ok(root.querySelector('[data-cmp-render=step-output]').textContent.length>3);
   assert.ok(!/NaN|undefined|Infinity/.test(root.querySelector('main').innerHTML),c.id+' step '+i);
  }
  assert.equal(root.querySelector('[data-cmp-next]').disabled,true);
  root.querySelector('[data-cmp-prev]').click();assert.equal(f.w.CompletionPage.state.step,4);
 }finally{f.close();}}
});

test('registry mounts matching sandboxed package frames and accepts heights only from its own frame',()=>{
 const dom=new JSDOM('<!doctype html><body><div id="root"></div></body>',{url:'https://completion.test/',runScripts:'outside-only'}),w=dom.window;
 try{
  w.Cases={list:[],register(c){this.list.push(c);}};
  for(const file of runtime)w.eval(read(file));
  w.eval(read('assets/cases/completion.case.js'));
  assert.equal(w.Cases.list.length,4);
  for(const c of w.Cases.list){assert.equal(c.lessonProtocol,'field-pages-v2');for(const part of Object.keys(files)){
   const tab=c.tabs[part];tab.mount(w.document.getElementById('root'));
   const frame=w.document.querySelector('iframe');assert.ok(frame.src.includes(c.id+'-case/demo/'+files[part]));
   assert.equal(frame.getAttribute('sandbox'),'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads');
   w.dispatchEvent(new w.MessageEvent('message',{source:w,data:{__lessonHeight:3000}}));assert.equal(frame.style.height,'1040px');
   w.dispatchEvent(new w.MessageEvent('message',{source:frame.contentWindow,data:{__lessonHeight:3000}}));assert.equal(frame.style.height,'3002px');
   w.dispatchEvent(new w.MessageEvent('message',{source:frame.contentWindow,data:{__lessonHeight:Infinity}}));assert.equal(frame.style.height,'3002px');
   tab.unmount();assert.equal(w.document.querySelectorAll('iframe').length,0);
  }}
 }finally{dom.window.close();}
});
