// Pure Node/VM checks. No browser, network, user storage or external test dependency.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const site = process.env.HW5_PORTAL_ROOT || path.resolve(__dirname,'..');
const read = name => fs.readFileSync(path.join(site,name),'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const entryHTML=read('m1-cuttings-case/demo/index.html');
function inlineCode(label){const match=new RegExp('<script data-m1="'+label+'">([\\s\\S]*?)<\\/script>').exec(entryHTML);assert.ok(match,'Missing inline script '+label);return match[1];}
const model = require(path.join(site,'tools/m1/runtime/model.js'));
const source = {window:{}};vm.runInNewContext(inlineCode('dataset'),source);
const data = plain(source.window.M1_DATA);
const base = read('tests/regression.cjs').split("test('all JavaScript files compile'")[0];
const support = {require,__dirname:path.join(site,'tests'),process,Buffer,Blob,TextEncoder,Event,console,setImmediate};
vm.createContext(support);vm.runInContext(base+'\nglobalThis.makeRuntime=runtime;globalThis.El=Element;',support);
function pixelImage(width=8,height=8,value=100){const rgba=new Uint8ClampedArray(width*height*4);for(let i=0;i<rgba.length;i+=4){rgba[i]=rgba[i+1]=rgba[i+2]=value;rgba[i+3]=255;}return rgba;}
function feature(value){return {vector:new Array(34).fill(value)};}
function packFiles(){
  const directory=path.join(site,'m1-cuttings-case');
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
  return walk(directory).filter(file=>path.basename(file)!=='case.json').map(file=>{const binary=file.endsWith('.webp'),payload=fs.readFileSync(file);return {name:path.relative(directory,file).replaceAll('\\','/'),size:payload.length,mime:binary?'image/webp':'text/plain',enc:binary?'dataurl':'text',data:binary?'data:image/webp;base64,'+payload.toString('base64'):payload.toString('utf8')};});
}

test('uniform pixels have correct color, texture and quality statistics',()=>{
  const result=model.extract(pixelImage(),8,8);assert.equal(result.vector.length,34);
  assert.ok(Math.abs(result.stats.brightness-100)<1e-9);assert.ok(result.stats.contrast<1e-6);
  assert.equal(result.stats.edges,0);assert.equal(result.stats.sharpness,0);
  for(let c=0;c<3;c++)assert.equal(result.vector[c*4+1],1);
  assert.equal(result.vector[20],1);assert.ok(result.vector.every(Number.isFinite));
});
test('kNN derives candidates from feature distances and handles tied votes',()=>{
  const refs=[{id:'a',classId:'sandstone',features:feature(0)},{id:'b',classId:'shale',features:feature(2)},{id:'c',classId:'shale',features:feature(3)}];
  const fit=model.fit(refs),query=feature(.1);
  assert.equal(model.predict(query,refs,{k:1},fit).classId,'sandstone');
  assert.equal(model.predict(query,refs,{k:2},fit).classId,'sandstone');
  const majority=model.predict(query,refs,{k:3},fit);assert.equal(majority.classId,'shale');assert.equal(majority.share,2/3);
  assert.ok(majority.neighbors[0].distance<majority.neighbors[1].distance);
});
test('evaluation counts a known error without changing model outputs',()=>{
  const refs=[{id:'r0',classId:'sandstone',features:feature(0)},{id:'r1',classId:'shale',features:feature(1)}];
  const tests=[{id:'t0',classId:'sandstone',features:feature(0)},{id:'t1',classId:'sandstone',features:feature(1)}];
  const result=model.evaluate(tests,refs,['sandstone','shale'],{k:1});
  assert.deepEqual(result.matrix,[[1,1],[0,0]]);assert.equal(result.accuracy,.5);assert.equal(result.hit,1);assert.ok(Number.isFinite(result.macroF1));
});
test('image disturbances clamp pixels and preserve alpha',()=>{
  const pixels=new Uint8ClampedArray([250,10,120,180]);
  const changed=model.disturb(pixels,50,1);assert.deepEqual([...changed],[255,60,170,180]);assert.deepEqual([...pixels],[250,10,120,180]);
});

test('Uniform LBP uses circular interpolation, preserves all eight bits and maps rotations consistently',()=>{
  assert.equal(model.uniformPattern(0).bin,0);assert.equal(model.uniformPattern(255).bin,8);
  assert.equal(model.uniformPattern(15).bin,4);assert.equal(model.uniformPattern(85).bin,9);
  for(let code=0;code<256;code++)assert.equal(model.uniformPattern(code).bin,model.uniformPattern(((code<<1)&255)|(code>>7)).bin);
  const gray=Float64Array.from([0,10,20,30,40,50,60,70,80]),pattern=model.localPattern(gray,3,1,1);
  assert.ok(Math.abs(pattern.samples[0]-(40-40*Math.SQRT1_2))<1e-10);assert.equal(pattern.ones,4);assert.equal(pattern.transitions,2);assert.equal(pattern.bin,4);
  const vector=model.extract(pixelImage(),8,8).vector;assert.equal(vector.slice(12,22).reduce((a,b)=>a+b,0),1);
});

test('grouped validation excludes the complete validation group and fits scales on each training fold',()=>{
  const training=[0,2,4,6,100,102].map((v,i)=>({id:'s'+i,classId:i%2?'shale':'sandstone',group:'g'+Math.floor(i/2),features:feature(v)}));
  const result=model.crossValidate(training,['sandstone','shale'],{k:1});assert.equal(result.count,6);assert.equal(result.folds.length,3);
  for(const fold of result.folds){assert.equal(fold.validationIds.length,2);for(const id of fold.trainingIds)assert.notEqual(training.find(s=>s.id===id).group,fold.group);}
  assert.ok(Math.abs(result.folds.find(f=>f.group==='g2').scale[0]-Math.sqrt(5))<1e-12);
  assert.throws(()=>model.crossValidate(training.slice(0,2),['sandstone','shale'],{k:1}),/至少需要两个组/);
});
test('the public subset preserves original image bytes, labels and disjoint depth groups',()=>{
  assert.equal(data.samples.length,66);assert.equal(data.samples.filter(s=>s.split==='reference').length,42);assert.equal(data.samples.filter(s=>s.split==='test').length,24);
  assert.equal(new Set(data.samples.map(s=>s.group)).size,17);
  const groupSets={reference:new Set(),test:new Set()},hashes=new Set();
  for(const s of data.samples){const bytes=Buffer.from(s.image.split(',')[1],'base64');assert.equal(bytes[0],255);assert.equal(bytes[1],216);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),s.sha256);assert.ok(!hashes.has(s.sha256));hashes.add(s.sha256);groupSets[s.split].add(s.group);assert.equal(s.well,'2');assert.ok(s.sourceUrl.includes(data.source.commit));assert.ok(Number.isFinite(s.depth));}
  for(const group of groupSets.test)assert.ok(!groupSets.reference.has(group));
  assert.equal(groupSets.test.size,5);assert.deepEqual(data.classes.map(c=>c.name),['细砂岩','页岩','灰质白云岩']);
  assert.equal(data.samples.reduce((n,s)=>n+(s.classId==='sandstone'),0),24);
});
test('the ready case has visuals in background, workflow and demo and cleans up its frame',()=>{
  const rt=support.makeRuntime(),c=rt.ctx.Cases.get('m1-cuttings-preview-local'),pkg=JSON.parse(read('m1-cuttings-case/case.json'));
  assert.equal(c.status,'ready');assert.equal(c.version,'1.6.2');assert.deepEqual(plain(c.tabs.background),pkg.tabs.background);
  assert.ok(pkg.tabs.background.sections.some(s=>s.html.includes('<svg')));assert.ok(pkg.tabs.workflow.metrics.html.includes('<svg'));
  assert.match(read('m1-cuttings-case/demo/index.html'),/id="processed-canvas"/);
  assert.equal(rt.ctx.Cases.validate(c).filter(x=>x.level==='error').length,0);
  const root=new support.El();c.tabs.demo.mount(root);const first=root.children[0];assert.ok(first.attributes.sandbox.includes('allow-downloads'));c.tabs.demo.mount(root);assert.equal(first.removed,true);c.tabs.demo.unmount();assert.equal(root.children[1].removed,true);
});
test('the complete m1 folder imports unchanged, persists within a conservative storage budget and restores',async()=>{
  const rt=support.makeRuntime(),pkg=JSON.parse(read('m1-cuttings-case/case.json')),files=packFiles();
  assert.equal(rt.ctx.__importTest.checkAll(pkg,pkg,files).filter(x=>x.level==='error').length,0);
  const ui=new support.El();rt.ctx.__importTest.state.el=ui;rt.ctx.__importTest.reset({});
  const raw=[{name:'case.json',enc:'text',data:JSON.stringify(pkg)},...files].map(f=>{const binary=f.enc==='dataurl',payload=binary?Buffer.from(f.data.split(',')[1],'base64'):f.data;return {name:path.posix.basename(f.name),webkitRelativePath:'m1-cuttings-case/'+f.name,type:binary?'image/webp':'text/plain',size:Buffer.byteLength(payload),data:payload};});
  rt.ctx.__importTest.loadFiles(raw);await new Promise(resolve=>setImmediate(resolve));assert.equal(rt.ctx.__importTest.state.loading,false);rt.ctx.__importTest.commit();assert.equal(rt.ctx.Cases.byScene('m1').id,pkg.id);
  const saved=rt.values.get('atlas.casepack.v2');assert.ok(saved);assert.ok(saved.length*2<5*1024*1024,'serialized record bytes: '+saved.length*2);
  const restored=support.makeRuntime({'atlas.casepack.v2':saved});assert.equal(restored.ctx.Cases.byScene('m1').id,pkg.id);
  const root=new support.El();restored.ctx.Cases.byScene('m1').tabs.demo.mount(root,{});const doc=root.children[0].srcdoc;
  assert.ok(doc.includes('window.M1_DATA=')&&doc.includes('M1Model'));assert.ok(doc.includes('data:image/webp;base64,'));assert.equal(/<(?:script|link)\b[^>]*\s(?:src|href)="(?:data|model|demo)\.(?:js|css)"/.test(doc),false);
});
test('the directly opened entry embeds its theme, artwork, data and executable scripts',()=>{
  const markup=entryHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  assert.ok(entryHTML.includes('<style data-m1-style="theme">'));
  // A local preview that retains only body markup must retain the layout theme.
  const bodyMarkup=/<body\b[^>]*>([\s\S]*?)<\/body>/.exec(entryHTML)[1];
  const theme=/<style data-m1-style="theme">([\s\S]*?)<\/style>/.exec(bodyMarkup)[1];
  assert.ok(theme.includes('.background-chapter')&&theme.includes('.case-page'));
  assert.ok(Buffer.byteLength(theme)<64*1024,'critical layout stays separate from artwork');
  assert.equal(theme.includes('data:image/'),false);
  assert.ok(bodyMarkup.includes('<style data-m1-style="artwork">'));
  assert.ok(entryHTML.includes('--paper:#fcf6eb'));
  assert.ok(entryHTML.includes('--m1-art-sheet:url("data:image/webp;base64,'));
  assert.equal((entryHTML.match(/--m1-art-sheet:url\("data:image\/webp;base64,/g)||[]).length,1,'one shared illustration sheet');
  assert.equal(/<script\b[^>]*\bsrc\s*=/.test(entryHTML),false);
  assert.equal(/<link\b[^>]*\brel="stylesheet"/.test(entryHTML),false);
  assert.equal(/<img\b[^>]*\bsrc="(?!data:)/.test(markup),false);
  assert.equal(/\.\.\/assets\/m1-dioramas/.test(entryHTML),false);
  assert.equal((entryHTML.match(/class="art-sheet"/g)||[]).length,2);
  const figureSources=JSON.parse(read('m1-cuttings-case/FIGURE-SOURCES.json'));
  assert.equal(figureSources.assets.length,4);
  assert.deepEqual(figureSources.assets.map(f=>[f.paper,f.figure]),[['tolstaya','4'],['tolstaya','6'],['tolstaya','8'],['caja','9']]);
  for(const figure of figureSources.assets){const bytes=fs.readFileSync(path.join(site,'tools/m1/runtime/paper-figures',figure.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),figure.sha256);assert.ok(entryHTML.includes('data:image/webp;base64,'+bytes.toString('base64')));assert.ok(figureSources.papers[figure.paper].doi&&figureSources.papers[figure.paper].license==='CC BY 4.0');}
  for(const name of ['dataset','model','app'])new vm.Script(inlineCode(name));
  assert.equal(inlineCode('model').trim(),read('tools/m1/runtime/model.js').trim());
});

// UI fixture only: deterministic synthetic pixel matrices exercise events and state transitions.
// They are never shipped as samples and are not used to report real-data model performance.
function appRuntime(embedded=false,reduced=false,portalView=null){
  const html=read('m1-cuttings-case/demo/index.html'),nodes=new Map(),buttons=[];
  const create=tag=>{const e=new support.El(tag);e.getAttribute=name=>e.attributes[name]??null;e.style.setProperty=(k,v)=>{e.style[k]=v;};e.getBoundingClientRect=()=>({height:1800,top:0});e.click=()=>{e.clicked=true;if(e.listeners.click)e.listeners.click.call(e,{target:e});};e.closest=()=>e;return e;};
  for(const match of html.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const e=create(match[1]);for(const a of match[2].matchAll(/\b(src|alt)="([^"]*)"/g))e.setAttribute(a[1],a[2]);nodes.set(match[3],e);}
  for(const match of html.matchAll(/<button\b([^>]*)>/g)){const attr=match[1],id=/\bid="([^"]+)"/.exec(attr);const e=id?nodes.get(id[1]):create('button');for(const a of attr.matchAll(/data-(view|go|step|rock|field-step)="([^"]+)"/g))e.dataset[a[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=a[2];buttons.push(e);}
  const defaults={'k-select':'5','color-weight':'50','review-threshold':'70',exposure:'0',contrast:'100','lag-minutes':'30',rop:'12'};
  for(const [id,value]of Object.entries(defaults))nodes.get(id).value=value;
  const canvasContext=owner=>{let rgba=pixelImage(96,96);return {drawImage(image){rgba=image.rgba;},getImageData(){return {data:rgba};},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(pixels){owner.pixels=new Uint8ClampedArray(pixels.data);}};};
  nodes.get('processed-canvas').getContext=()=>canvasContext(nodes.get('processed-canvas'));
  const flow=create('svg');let pauses=0,resumes=0;flow.pauseAnimations=()=>pauses++;flow.unpauseAnimations=()=>resumes++;
  const body=create('body'),document={body,getElementById(id){assert.ok(nodes.has(id),'Missing HTML node '+id);return nodes.get(id);},querySelectorAll(selector){if(selector==='svg.flow')return [flow];const key=/\[data-([\w-]+)\]/.exec(selector);return key?buttons.filter(b=>b.dataset[key[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]!==undefined):[];},createElement(tag){const e=create(tag);if(tag==='canvas')e.getContext=()=>canvasContext(e);return e;}};
  const byImage=new Map(data.samples.map(s=>[s.image,s]));
  class FixtureImage{set src(value){const s=byImage.get(value);assert.ok(s);let seed=parseInt(s.sha256.slice(0,8),16);this.naturalWidth=180;this.naturalHeight=180;this.rgba=pixelImage(96,96);for(let i=0;i<this.rgba.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;this.rgba[i]=seed>>>24;this.rgba[i+1]=seed>>>23&255;this.rgba[i+2]=seed>>>22&255;}queueMicrotask(()=>this.onload());}}
  const stats={predict:0,evaluate:0},wrapped={...model,predict(...args){stats.predict++;return model.predict(...args);},evaluate(...args){stats.evaluate++;return model.evaluate(...args);}};
  const blobs=[],messages=[],windowEvents={},media={matches:reduced,addEventListener(){}};
  const ctx={document,console,M1_DATA:data,M1Model:wrapped,Image:FixtureImage,Blob,URLSearchParams,__CASE_DEMO_VIEW__:portalView,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:fixture';},revokeObjectURL(){}},location:{hash:'',search:''},history:{replaceState(a,b,hash){ctx.location.hash=hash;}},matchMedia:()=>media,scrollTo(){},addEventListener(type,fn){(windowEvents[type]||=([])).push(fn);},setTimeout(fn){fn();},ResizeObserver:class{observe(){}}};
  ctx.window=ctx;ctx.parent=embedded?{postMessage:message=>messages.push(message)}:ctx;vm.createContext(ctx);vm.runInContext(inlineCode('app'),ctx);
  return {ctx,nodes,buttons,stats,blobs,messages,body,motion:()=>({pauses,resumes}),message(event){(windowEvents.message||[]).forEach(fn=>fn(event));},event(id,type){nodes.get(id).listeners[type].call(nodes.get(id),{target:nodes.get(id)});}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function flowEvent(rt,selector,dataset,type='click',value){const target={dataset,value,closest:s=>s===selector?target:null};rt.nodes.get('flow-snapshot').listeners[type]({target});}

test('training-only exploration hides test samples and freezes parameters before one holdout evaluation',async()=>{
  const rt=appRuntime();await settle();assert.equal(rt.stats.evaluate,0);assert.match(rt.nodes.get('evaluation-status').textContent,/阶段 1/);
  for(const s of data.samples.filter(s=>s.split==='test'))assert.ok(!rt.nodes.get('sample-select').innerHTML.includes(s.id));
  const current=rt.nodes.get('query-id').textContent;rt.nodes.get('sample-select').value=data.samples.find(s=>s.split==='test').id;rt.event('sample-select','change');assert.equal(rt.nodes.get('query-id').textContent,current);
  rt.nodes.get('k-select').value='3';rt.event('k-select','change');rt.event('finalize-test','click');assert.equal(rt.stats.evaluate,1);assert.match(rt.nodes.get('evaluation-status').textContent,/阶段 2/);assert.match(rt.nodes.get('loading-status').textContent,/当前为测试集/);assert.equal(rt.nodes.get('k-select').disabled,true);assert.equal(rt.nodes.get('flow-color-weight').disabled,true);
  assert.equal(data.samples.find(s=>s.id===rt.nodes.get('query-id').textContent).split,'test');
  const metrics=rt.nodes.get('evaluation-stats').innerHTML;rt.nodes.get('k-select').value='7';rt.event('k-select','change');assert.equal(rt.nodes.get('evaluation-stats').innerHTML,metrics);assert.match(rt.nodes.get('vote-summary').textContent,/\/ 3/);
  rt.event('finalize-test','click');assert.equal(rt.stats.evaluate,1);
  rt.event('export-csv','click');const csv=await rt.blobs[0].text();assert.equal(csv.trim().split('\r\n').length,25);assert.match(csv,/fixed-parameter-holdout/);assert.match(csv,/LBPriu2-P8-R1-10/);
});

test('distance explanations reconstruct the classifier distance with reference-only scales',()=>{
  const refs=[{id:'a',classId:'sandstone',features:feature(0)},{id:'b',classId:'shale',features:feature(1)}],scaler=model.fit(refs),query=feature(.3);
  for(const weight of [0,.5,1]){const explained=model.explainDistance(query.vector,refs[0].features.vector,weight,scaler),prediction=model.predict(query,refs,{k:2,colorWeight:weight},scaler);
    assert.equal(explained.rows.length,34);assert.equal(explained.distance,prediction.neighbors.find(n=>n.id==='a').distance);
    assert.ok(Math.abs(explained.distance**2-explained.colorPart-explained.otherPart)<1e-12);assert.equal(explained.rows[0].scale,.5);
  }
});

test('field stages and the visual overview connect real images with the current model output',async()=>{
  const rt=appRuntime();await settle();
  const first=data.samples.find(s=>s.split==='reference');
  assert.ok(rt.nodes.get('flow-snapshot').innerHTML.includes('data-depth-group="'+first.group+'" class="reference" aria-pressed="true"'));
  flowEvent(rt,'[data-depth-group]',{depthGroup:data.samples.find(s=>s.split==='test').group});
  assert.match(rt.nodes.get('flow-snapshot').innerHTML,/该组标签留到参数锁定后再查看/);
  assert.equal(rt.nodes.get('field-sample-image').src,first.image);
  assert.match(rt.nodes.get('field-sample-credit').textContent,new RegExp(first.id));
  const field=rt.buttons.find(b=>b.dataset.fieldStep==='2');field.listeners.click();
  assert.equal(rt.nodes.get('field-story').dataset.fieldStage,'2');
  assert.equal(field.getAttribute('aria-pressed'),'true');
  assert.match(rt.nodes.get('field-reading-title').textContent,/观察/);
  assert.ok(rt.nodes.get('flow-viz-1').innerHTML.includes(first.image));
  assert.match(rt.nodes.get('flow-viz-5').innerHTML,new RegExp(rt.nodes.get('prediction').textContent));
  rt.nodes.get('flow-k-select').value='3';rt.event('flow-k-select','change');
  assert.match(rt.nodes.get('flow-viz-5').innerHTML,/\/3 票/);
  const other=data.samples.filter(s=>s.split==='reference')[2];
  rt.nodes.get('flow-sample-select').value=other.id;rt.event('flow-sample-select','change');
  assert.ok(rt.nodes.get('flow-viz-1').innerHTML.includes(other.image));
  assert.equal(rt.nodes.get('field-sample-image').src,other.image);
  assert.equal(rt.nodes.get('query-id').textContent,other.id);
});

test('seven workflow stages follow one real sample and keyboard navigation reaches both ends',async()=>{
  const rt=appRuntime();await settle();const stages=rt.buttons.filter(b=>b.dataset.step!==undefined);assert.equal(stages.length,7);
  const first=rt.nodes.get('flow-sample-image').src;
  for(const button of stages){button.listeners.click();assert.ok(rt.nodes.get('flow-input').textContent);assert.ok(rt.nodes.get('flow-why').textContent);assert.equal(rt.nodes.get('flow-sample-image').src,first);}
  stages[0].listeners.keydown({key:'End',preventDefault(){}});assert.equal(rt.nodes.get('flow-count').textContent,'7 / 7');assert.equal(stages[6].focused,true);
  stages[6].listeners.keydown({key:'Home',preventDefault(){}});assert.equal(rt.nodes.get('flow-count').textContent,'1 / 7');
  const other=data.samples.filter(s=>s.split==='reference')[2];rt.nodes.get('flow-sample-select').value=other.id;rt.event('flow-sample-select','change');assert.equal(rt.nodes.get('flow-sample-image').src,other.image);assert.equal(rt.nodes.get('query-id').textContent,other.id);
  const pkg=JSON.parse(read('m1-cuttings-case/case.json'));assert.equal(pkg.tabs.workflow.steps.length,7);
});

test('color bins count actual pixels and the movable neighborhood explains local image calculations',async()=>{
  const rt=appRuntime();await settle();rt.buttons.find(b=>b.dataset.step==='2').listeners.click();
  flowEvent(rt,'[data-color-bin]',{colorBin:'7'});
  const canvas=rt.nodes.get('flow-snapshot').querySelector('.flow-color-canvas').children.at(-1),source=rt.nodes.get('processed-canvas').pixels;
  let count=0;for(let i=0;i<source.length;i+=4){const selected=source[i+1]>=192;if(selected)count++;assert.ok(Math.abs(canvas.pixels[i]-source[i]*(selected?1:.13))<=.5);}
  assert.ok(rt.nodes.get('flow-snapshot').innerHTML.includes(count+' / 9,216'));
  rt.buttons.find(b=>b.dataset.step==='3').listeners.click();
  flowEvent(rt,'[data-flow-pixel]',{flowPixel:'x'},'change','16');
  assert.match(rt.nodes.get('flow-snapshot').innerHTML,/横坐标 x = 16/);assert.match(rt.nodes.get('flow-snapshot').innerHTML,/循环跳变数 U/);assert.match(rt.nodes.get('flow-snapshot').innerHTML,/RGB 分支/);
  const gray=rt.nodes.get('flow-snapshot').querySelector('.flow-gray-canvas').children.at(-1).pixels;assert.equal(gray[0],gray[1]);assert.equal(gray[1],gray[2]);
});

test('workflow ranking, parameter changes and voting lead into the demo without duplicating review',async()=>{
  const rt=appRuntime();await settle();rt.buttons.find(b=>b.dataset.step==='4').listeners.click();const current=data.samples.find(s=>s.id===rt.nodes.get('query-id').textContent);const eligible=data.samples.filter(s=>s.split==='reference'&&s.group!==current.group);assert.equal((rt.nodes.get('flow-snapshot').innerHTML.match(/data-reference-id=/g)||[]).length,eligible.length);for(const sample of data.samples.filter(s=>s.group===current.group))assert.ok(!rt.nodes.get('flow-snapshot').innerHTML.includes('data-reference-id="'+sample.id+'"'));
  const ref=eligible[0];flowEvent(rt,'[data-reference-id]',{referenceId:ref.id});assert.ok(rt.nodes.get('flow-snapshot').innerHTML.includes(ref.image));
  rt.buttons.find(b=>b.dataset.step==='5').listeners.click();rt.nodes.get('flow-k-select').value='3';rt.event('flow-k-select','change');assert.match(rt.nodes.get('flow-snapshot').innerHTML,/已计 0 \/ 3 票/);
  flowEvent(rt,'[data-flow-action]',{flowAction:'vote-all'});assert.match(rt.nodes.get('flow-snapshot').innerHTML,/计票完成/);
  const complete=rt.nodes.get('flow-snapshot').innerHTML;rt.nodes.get('exposure').value='40';rt.event('exposure','input');assert.equal(rt.nodes.get('flow-snapshot').innerHTML,complete);
  rt.nodes.get('flow-color-weight').value='100';rt.event('flow-color-weight','input');assert.match(rt.nodes.get('flow-snapshot').innerHTML,/已计 0 \/ 3 票/);
  rt.buttons.find(b=>b.dataset.step==='6').listeners.click();
  assert.match(rt.nodes.get('flow-snapshot').innerHTML,/一张图与一组图/);
  assert.ok(rt.nodes.get('flow-snapshot').innerHTML.includes(current.id));
  assert.doesNotMatch(rt.nodes.get('flow-snapshot').innerHTML,/data-flow-review|data-flow-action="review-save"/);
});
test('standalone case switches all three sections and runs the sample-to-prediction flow',async()=>{
  const rt=appRuntime();await settle();
  assert.equal(rt.nodes.get('panel-background').hidden,false);assert.equal(rt.nodes.get('panel-demo').hidden,true);
  assert.match(rt.nodes.get('loading-status').textContent,/已就绪/);assert.ok(rt.nodes.get('prediction').textContent.length>0);
  const demo=rt.buttons.find(b=>b.dataset.view==='demo');demo.listeners.click();assert.equal(rt.nodes.get('panel-demo').hidden,false);
  const input=rt.nodes.get('sample-select');const other=data.samples.filter(s=>s.split==='reference')[1];input.value=other.id;rt.event('sample-select','change');assert.equal(rt.nodes.get('query-id').textContent,other.id);
  const before=rt.stats.predict;rt.nodes.get('k-select').value='3';rt.event('k-select','change');assert.ok(rt.stats.predict>before);assert.match(rt.nodes.get('vote-summary').textContent,/\/ 3/);
  const original=rt.nodes.get('image-statistics').innerHTML;rt.nodes.get('exposure').value='40';rt.event('exposure','input');assert.notEqual(rt.nodes.get('image-statistics').innerHTML,original);
});
test('label reveal and manual review keep model metrics separate and CSV retains provenance',async()=>{
  const rt=appRuntime();await settle();const metrics=rt.nodes.get('evaluation-stats').innerHTML,prediction=rt.nodes.get('prediction').textContent;
  rt.event('reveal-label','click');assert.equal(rt.nodes.get('original-label').hidden,false);assert.equal(rt.nodes.get('prediction').textContent,prediction);
  rt.nodes.get('review-class').value='shale';rt.event('save-review','click');assert.match(rt.nodes.get('review-status').textContent,/已复核/);assert.equal(rt.nodes.get('evaluation-stats').innerHTML,metrics);
  rt.event('export-csv','click');assert.equal(rt.blobs.length,1);const csv=await rt.blobs[0].text();assert.equal(csv.trim().split('\r\n').length,43);assert.match(csv,/image_sha256/);assert.match(csv,/review_exposure/);assert.ok(csv.includes(data.source.commit));
});
test('keyboard navigation, workflow changes, lag calculation and motion preferences work',async()=>{
  const rt=appRuntime(false,true);await settle();assert.equal(rt.body.classList.contains('is-paused'),true);assert.ok(rt.motion().pauses>0);
  rt.event('motion-toggle','click');assert.equal(rt.body.classList.contains('is-paused'),false);assert.ok(rt.motion().resumes>0);
  rt.nodes.get('lag-minutes').value='60';rt.event('lag-minutes','input');assert.equal(rt.nodes.get('source-depth').textContent,'3188 m');
  const background=rt.buttons.find(b=>b.dataset.view==='background');background.listeners.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(rt.nodes.get('panel-workflow').hidden,false);
  const old=rt.nodes.get('flow-title').textContent;rt.event('flow-next','click');assert.notEqual(rt.nodes.get('flow-title').textContent,old);assert.match(rt.nodes.get('flow-snapshot').innerHTML,/96 × 96/);
});
test('an arbitrary browser frame keeps the background and three-part navigation visible',async()=>{
  const rt=appRuntime(true);await settle();assert.equal(rt.body.classList.contains('embedded'),false);assert.equal(rt.nodes.get('panel-background').hidden,false);
  const workflow=rt.buttons.find(b=>b.dataset.view==='workflow');workflow.listeners.click();assert.equal(rt.nodes.get('panel-workflow').hidden,false);
});
test('explicit portal requests open each corresponding lesson instead of always opening the demo',async()=>{
  for(const name of ['background','workflow','demo']){const rt=appRuntime(true,false,name);await settle();assert.equal(rt.body.classList.contains('embedded'),true);assert.equal(rt.nodes.get('panel-'+name).hidden,false);assert.ok(rt.messages.some(m=>m.__m1Height===1800));}
});
test('embedded lessons accept shared samples and locked parameters only from their parent',async()=>{
  const rt=appRuntime(true,false,'workflow');await settle();
  const validation=data.samples.filter(s=>s.split==='reference')[4];
  const state={sampleId:validation.id,k:3,colorWeight:.7,stage:'validation',reviews:{}};
  rt.message({source:{},data:{__m1SharedState:state}});
  assert.notEqual(rt.nodes.get('query-id').textContent,validation.id);
  rt.message({source:rt.ctx.parent,data:{__m1SharedState:state}});
  assert.equal(rt.nodes.get('query-id').textContent,validation.id);
  assert.equal(rt.nodes.get('flow-k-select').value,'3');
  assert.equal(rt.nodes.get('flow-color-weight').value,'70');
  const holdout=data.samples.find(s=>s.split==='test');
  rt.message({source:rt.ctx.parent,data:{__m1SharedState:{...state,sampleId:holdout.id,stage:'test'}}});
  assert.equal(rt.nodes.get('query-id').textContent,holdout.id);
  assert.equal(rt.nodes.get('flow-k-select').disabled,true);
  assert.match(rt.nodes.get('flow-status').textContent,/锁定测试/);
  assert.match(rt.nodes.get('flow-viz-6').innerHTML,/锁定测试/);
});
test('a sample chosen in the background follows the student through each section',async()=>{
  const rt=appRuntime(true,false,'background');await settle();
  rt.message({source:rt.ctx.parent,data:{__m1SharedState:null}});
  rt.buttons.find(b=>b.dataset.rock==='shale').listeners.click();
  const selected=data.samples.find(s=>s.classId==='shale'&&s.split==='reference');
  assert.equal(rt.nodes.get('field-sample-image').src,selected.image);
  assert.equal(rt.nodes.get('query-id').textContent,selected.id);
  assert.ok(rt.messages.some(m=>m.__m1StateUpdate&&m.__m1StateUpdate.sampleId===selected.id));
  rt.buttons.find(b=>b.dataset.view==='workflow').listeners.click();
  assert.ok(rt.nodes.get('flow-snapshot').innerHTML.includes('data-depth-group="'+selected.group+'" class="reference" aria-pressed="true"'));
  rt.event('finalize-test','click');
  rt.buttons.find(b=>b.dataset.rock==='dolomite').listeners.click();
  const after=data.samples.find(s=>s.id===rt.nodes.get('query-id').textContent);
  assert.equal(after.classId,'dolomite');assert.equal(after.split,'test');
});
test('standalone and embedded lessons return to the beginning when asked by their owner',async()=>{
  const local=appRuntime();await settle();
  local.buttons.find(b=>b.dataset.view==='workflow').listeners.click();
  assert.equal(local.nodes.get('panel-workflow').scrollOptions.block,'start');
  const embedded=appRuntime(true,false,'demo');await settle();let calls=0;embedded.ctx.scrollTo=()=>{calls++;};
  embedded.message({source:{},data:{__m1ScrollToTop:true}});assert.equal(calls,0);
  embedded.message({source:embedded.ctx.parent,data:{__m1ScrollToTop:true}});assert.equal(calls,1);
});
test('the rock lesson shows the case data rather than unrelated paper samples',async()=>{
  assert.match(entryHTML,/<details class="geology-extension" open>/);
  const rt=appRuntime();await settle();
  for(const rock of ['sandstone','shale','dolomite']){
    rt.buttons.find(b=>b.dataset.rock===rock).listeners.click();
    const content=rt.nodes.get('reservoir-diagram').innerHTML;
    const sample=data.samples.find(s=>s.classId===rock&&s.split==='reference');
    assert.ok(content.includes(sample.image));assert.ok(content.includes(sample.id));
    assert.match(content,/原标签/);assert.match(content,/nature9420/);assert.doesNotMatch(content,/<svg|<canvas|rock-photo-pin/);
    assert.equal(rt.buttons.find(b=>b.dataset.rock===rock).getAttribute('aria-pressed'),'true');
  }
  assert.match(rt.nodes.get('rock-concept-copy').textContent,/不能单独确认/);
  assert.match(entryHTML,/不是同一样品的清洗前后对照/);
  const workflow=rt.buttons.find(b=>b.dataset.view==='workflow');workflow.listeners.click();assert.equal((rt.nodes.get('flow-snapshot').innerHTML.match(/data-depth-group=/g)||[]).length,17);
  rt.buttons.find(b=>b.dataset.step==='1').listeners.click();
  const stage={dataset:{imageStage:'2'}};rt.nodes.get('flow-snapshot').listeners.click({target:{closest:selector=>selector==='[data-image-stage]'?stage:null}});
  assert.equal(rt.nodes.get('flow-snapshot').querySelector('.processing-figure').children.at(-1).tagName,'canvas');
  rt.buttons.find(b=>b.dataset.step==='5').listeners.click();
  const reset={dataset:{flowAction:'vote-reset'}};rt.nodes.get('flow-snapshot').listeners.click({target:{closest:selector=>selector==='[data-flow-action]'?reset:null}});assert.match(rt.nodes.get('flow-snapshot').innerHTML,/已计 0 \/ 5 票/);
  const next={dataset:{flowAction:'vote-next'}};rt.nodes.get('flow-snapshot').listeners.click({target:{closest:selector=>selector==='[data-flow-action]'?next:null}});assert.match(rt.nodes.get('flow-snapshot').innerHTML,/已计 1 \/ 5 票/);
});
test('portal lessons mount separate matching views and tab switches preserve demo state',()=>{
  const rt=support.makeRuntime(),c=rt.ctx.Cases.get('m1-cuttings-preview-local'),sc=rt.ctx.ATLAS.index.byScene.m1;
  const tabs=rt.document.getElementById('tabs');for(const name of ['bg','flow','demo']){const b=new support.El('button');b.dataset.tab=name;tabs.children.push(b);const p=new support.El();p.dataset.panel=name;rt.panels.push(p);}
  rt.ctx.__shellTest.bindTabs(sc,c);const bg=rt.document.getElementById('case-bg-root').children[0];assert.ok(bg.src.includes('?v=1.6.2&'));assert.ok(bg.src.endsWith('section=background'));
  const click=tab=>tabs.listeners.click({target:{closest:()=>tabs.children.find(b=>b.dataset.tab===tab)}});
  click('flow');const flow=rt.document.getElementById('case-flow-root').children[0];assert.ok(flow.src.endsWith('section=workflow'));
  click('demo');const demo=rt.document.getElementById('case-demo-root').children[0];assert.ok(demo.src.endsWith('section=demo'));
  click('bg');click('demo');assert.equal(demo.removed,undefined);assert.equal(rt.document.getElementById('case-demo-root').children.length,1);
  rt.ctx.__shellTest.unmountCurrent();assert.equal(bg.removed,true);assert.equal(flow.removed,true);assert.equal(demo.removed,true);
});
test('portal tab switches use the stationary section anchor rather than the stuck tab position',()=>{
  const rt=support.makeRuntime(),c=rt.ctx.Cases.get('m1-cuttings-preview-local'),sc=rt.ctx.ATLAS.index.byScene.m1;
  const tabs=rt.document.getElementById('tabs'),anchor=rt.document.getElementById('case-tab-start');
  for(const name of ['bg','flow','demo']){const b=new support.El('button');b.dataset.tab=name;tabs.children.push(b);const p=new support.El();p.dataset.panel=name;rt.panels.push(p);}
  tabs.getBoundingClientRect=()=>({top:68});anchor.getBoundingClientRect=()=>({top:-4700});
  rt.ctx.getComputedStyle=()=>({top:'68px'});rt.ctx.scrollY=5000;const positions=[];rt.ctx.scrollTo=options=>positions.push(options.top);
  rt.ctx.__shellTest.bindTabs(sc,c);
  for(const button of tabs.children){tabs.listeners.click({target:{closest:()=>button}});assert.equal(positions.at(-1),232);}
  assert.match(rt.ctx.__shellTest.sceneHTML(sc,{case:c.id}),/id="case-tab-start"/);
});
test('optional page lessons import with their view while legacy packages keep static rendering',()=>{
  const rt=support.makeRuntime(),pkg=JSON.parse(read('m1-cuttings-case/case.json')),files=packFiles();
  const c=rt.ctx.__importTest.toCase({pkg,meta:pkg,files});
  for(const name of ['background','workflow','demo']){const root=new support.El();c.tabs[name].mount(root,{});assert.ok(root.children[0].srcdoc.includes('window.__CASE_DEMO_VIEW__="'+name+'";'));c.tabs[name].unmount();}
  const legacy=JSON.parse(read('firstbreak-pick-case/case.json'));const old=rt.ctx.__importTest.toCase({pkg:legacy,meta:legacy,files:[]});assert.equal(typeof old.tabs.background.mount,'undefined');assert.equal(typeof old.tabs.workflow.mount,'undefined');
  pkg.tabs.background.page.html='missing-lesson.html';assert.ok(rt.ctx.__importTest.checkAll(pkg,pkg,files).some(x=>x.level==='error'&&x.msg.includes('background.page')));
});
