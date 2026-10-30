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
const entryHTML=read('m1-cuttings-case/demo/lesson.html');
function inlineCode(label){const match=new RegExp('<script data-m1="'+label+'">([\\s\\S]*?)<\\/script>').exec(entryHTML);assert.ok(match,'Missing inline script '+label);return match[1];}
const resultSource={window:{}};vm.runInNewContext(inlineCode('results'),resultSource);
const results=plain(resultSource.window.M1_RESULTS),audit=plain(resultSource.window.M1_AUDIT);
const flow=require(path.join(site,'tools/m1/workflow-content.cjs'));
const source = {window:{}};vm.runInNewContext(inlineCode('dataset'),source);
const data = plain(source.window.M1_DATA);
const base = read('tests/regression.cjs').split("test('all JavaScript files compile'")[0];
const support = {require,__dirname:path.join(site,'tests'),process,Buffer,Blob,TextEncoder,Event,console,setImmediate};
vm.createContext(support);vm.runInContext(base+'\nglobalThis.makeRuntime=runtime;globalThis.El=Element;',support);
function packFiles(){
  const directory=path.join(site,'m1-cuttings-case');
  const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
  return walk(directory).filter(file=>path.basename(file)!=='case.json').map(file=>{const binary=file.endsWith('.webp'),payload=fs.readFileSync(file);return {name:path.relative(directory,file).replaceAll('\\','/'),size:payload.length,mime:binary?'image/webp':'text/plain',enc:binary?'dataurl':'text',data:binary?'data:image/webp;base64,'+payload.toString('base64'):payload.toString('utf8')};});
}


test('original photos, labels, depth records and outer split are preserved byte for byte',()=>{
  const original={window:{}};vm.runInNewContext(read('tools/m1/runtime/data.js'),original);
  assert.deepEqual(data,plain(original.window.M1_DATA));assert.equal(data.samples.length,66);
  assert.deepEqual(data.classes.map(c=>data.samples.filter(s=>s.classId===c.id).length),[24,18,24]);
  const pools={reference:new Set(),test:new Set()},hashes=new Set(),provenance=JSON.parse(read('m1-cuttings-case/provenance.json'));assert.equal(provenance.sourceCommit,data.source.commit);assert.equal(provenance.method.weightsSha256,results.method.weightsSha256);assert.equal(provenance.samples.length,66);for(const sample of data.samples){const record=provenance.samples.find(p=>p.id===sample.id);assert.equal(record.sha256,sample.sha256);assert.equal(record.depth,sample.depth);assert.equal(record.lithology,sample.label);assert.equal(record.split,sample.split);}
  for(const s of data.samples){const bytes=Buffer.from(s.image.split(',')[1],'base64');assert.equal(bytes[0],255);assert.equal(bytes[1],216);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),s.sha256);assert.ok(!hashes.has(s.sha256));hashes.add(s.sha256);pools[s.split].add(s.group);assert.equal(s.well,'2');assert.ok(s.sourceUrl.includes(data.source.commit));}
  assert.equal(data.samples.filter(s=>s.split==='reference').length,42);assert.equal(pools.reference.size,12);assert.equal(pools.test.size,5);for(const g of pools.test)assert.ok(!pools.reference.has(g));
});
test('image audit derives sizes, histograms and the central crop from the original files',()=>{
  for(const s of data.samples){const a=audit[s.id];assert.equal(a.bytes,Buffer.from(s.image.split(',')[1],'base64').length);assert.equal(a.histogram.length,16);assert.equal(a.histogram.reduce((n,v)=>n+v,0),a.width*a.height);for(const [i,target] of [a.width*.14,a.height*.14,a.width*.86,a.height*.86].entries())assert.ok(Math.abs(a.roi[i]-target)<=.50000001);assert.ok(a.brightness>=0&&a.brightness<=255&&a.contrast>=0);}
});
test('each development prediction excludes its entire depth group and all holdout photos',()=>{
  const byId=Object.fromEntries(data.samples.map(s=>[s.id,s]));let queries=0;
  assert.equal(results.folds.length,12);assert.equal(results.method.encoderFrozen,true);assert.equal(results.sourceCommit,data.source.commit);
  for(const fold of results.folds){const expected=data.samples.filter(s=>s.split==='reference'&&s.group!==fold.group).map(s=>s.id).sort();assert.deepEqual(fold.fitIds.slice().sort(),expected);for(const id of fold.queryIds){assert.equal(byId[id].group,fold.group);assert.equal(results.samples[id].fold,fold.group);assert.equal(results.samples[id].fitCount,fold.fitIds.length);assert.ok(!fold.fitIds.includes(id));queries++;}}
  assert.equal(queries,42);for(const s of data.samples.filter(s=>s.split==='test')){assert.equal(results.samples[s.id].fold,'holdout');assert.equal(results.samples[s.id].fitCount,42);}
});
test('classification scores and class-specific response maps belong to the exact source image',()=>{
  assert.deepEqual(results.classes,data.classes.map(c=>c.id));assert.match(results.method.weightsSha256,/^[a-f0-9]{64}$/);assert.equal(results.method.weights,'IMAGENET1K_V1');
  assert.equal(Object.keys(results.samples).length,66);
  for(const s of data.samples){const r=results.samples[s.id];assert.equal(r.sha256,s.sha256);assert.equal(r.scores.length,3);assert.ok(r.scores.every(v=>Number.isFinite(v)&&v>=0&&v<=1));assert.ok(Math.abs(r.scores.reduce((n,v)=>n+v,0)-1)<3e-8);assert.equal(r.prediction,results.classes[r.scores.indexOf(Math.max(...r.scores))]);const raw=Buffer.from(r.cam,'base64');assert.equal(raw.length,147);for(let c=0;c<3;c++){const peak=Math.max(...raw.subarray(c*49,(c+1)*49));assert.ok(peak===0||peak===255);}}
  const raw=Buffer.from(results.samples[data.samples[0].id].cam,'base64');assert.notDeepEqual(raw.subarray(0,49),raw.subarray(49,98));
});
test('reported matrices and metrics are recomputed from all fixed predictions',()=>{
  for(const phase of ['validation','test']){const pool=data.samples.filter(s=>(s.split==='test')===(phase==='test')),matrix=Array.from({length:3},()=>[0,0,0]);for(const s of pool)matrix[results.classes.indexOf(s.classId)][results.classes.indexOf(results.samples[s.id].prediction)]++;const hit=matrix.reduce((n,row,i)=>n+row[i],0),f1=matrix.reduce((n,row,i)=>{const tp=row[i],fp=matrix.reduce((a,r)=>a+r[i],0)-tp,fn=row.reduce((a,v)=>a+v,0)-tp;return n+(2*tp/(2*tp+fp+fn)||0);},0)/3;assert.deepEqual(results.metrics[phase].matrix,matrix);assert.equal(results.metrics[phase].count,pool.length);assert.ok(Math.abs(results.metrics[phase].accuracy-hit/pool.length)<1e-8);assert.ok(Math.abs(results.metrics[phase].macroF1-f1)<1e-8);}
});
test('the workflow covers data handling only, with a picture or data graphic at each step',()=>{
  assert.equal(flow.length,7);const content=JSON.stringify(flow)+JSON.stringify(JSON.parse(read('m1-cuttings-case/case.json')).tabs.workflow);
  assert.doesNotMatch(content,/kNN|近邻|投票|CNN|ResNet|特征提取|训练|推理|模型评价/);assert.match(content,/井深/);assert.match(content,/标签/);assert.match(content,/原图/);assert.match(content,/清单/);
  const workflow=entryHTML.split('id="panel-workflow"')[1].split('id="panel-demo"')[0];assert.equal((workflow.match(/data-step="/g)||[]).length,7);assert.doesNotMatch(workflow,/k-select|color-weight|复核/);
});
test('only the requested three lesson names appear and the background retains four connected chapters',()=>{
  const markup=entryHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');const readable=markup.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,'');assert.equal(/人工复核|复核依据|可视化示范|近邻|kNN/.test(readable),false);
  const background=markup.split('id="panel-background"')[1].split('id="panel-workflow"')[0],chapters=background.split('<section class="background-chapter"').slice(1);
  assert.deepEqual(chapters.map(c=>/<h2[^>]*>([^<]+)<\/h2>/.exec(c)[1]),['真实背景','技术前沿','示例数据','技术难度与参考方向']);assert.ok(chapters[2].includes('id="reservoir-diagram"'));
  const pkg=JSON.parse(read('m1-cuttings-case/case.json'));assert.equal(pkg.tabs.demo.label,'辅助识别');assert.equal(pkg.version,'2.0.2');assert.equal(pkg.id,'m1-cuttings');
});
test('the directly opened entry contains all scripts, original images, theme and credited paper figures',()=>{
  const markup=entryHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');const body=/<body\b[^>]*>([\s\S]*?)<\/body>/.exec(entryHTML)[1],theme=/<style data-m1-style="theme">([\s\S]*?)<\/style>/.exec(body)[1];assert.ok(Buffer.byteLength(theme)<64*1024);assert.ok(theme.includes('.background-chapter'));assert.ok(!theme.includes('data:image/'));
  assert.equal(/<script\b[^>]*\bsrc\s*=/.test(entryHTML),false);assert.equal(/<link\b[^>]*\brel="stylesheet"/.test(entryHTML),false);assert.equal(/<img\b[^>]*\bsrc="(?!data:)/.test(markup),false);assert.equal((entryHTML.match(/--m1-art-sheet:url\("data:image\/webp;base64,/g)||[]).length,1);
  const sources=JSON.parse(read('m1-cuttings-case/FIGURE-SOURCES.json'));assert.equal(sources.assets.length,4);for(const f of sources.assets){const bytes=fs.readFileSync(path.join(site,'tools/m1/runtime/paper-figures',f.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256);assert.ok(entryHTML.includes('data:image/webp;base64,'+bytes.toString('base64')));assert.equal(sources.papers[f.paper].license,'CC BY 4.0');}
  for(const name of ['dataset','results','app'])new vm.Script(inlineCode(name));assert.doesNotMatch(inlineCode('app'),/M1Model|nearest|k-select/);
});
test('the case folder imports, persists below five MiB and restores its embedded views',async()=>{
  const rt=support.makeRuntime({}, {skipManagedM1:true}),pkg=JSON.parse(read('m1-cuttings-case/case.json')),files=packFiles();assert.equal(rt.ctx.__importTest.checkAll(pkg,pkg,files).filter(v=>v.level==='error').length,0);
  const ui=new support.El();rt.ctx.__importTest.state.el=ui;rt.ctx.__importTest.reset({});const raw=[{name:'case.json',enc:'text',data:JSON.stringify(pkg)},...files].map(f=>{const binary=f.enc==='dataurl',payload=binary?Buffer.from(f.data.split(',')[1],'base64'):f.data;return {name:path.posix.basename(f.name),webkitRelativePath:'m1-cuttings-case/'+f.name,type:binary?'image/webp':'text/plain',size:Buffer.byteLength(payload),data:payload};});rt.ctx.__importTest.loadFiles(raw);await settle();assert.equal(rt.ctx.__importTest.state.loading,false);rt.ctx.__importTest.commit();assert.equal(rt.ctx.Cases.byScene('m1').id,pkg.id);
  const saved=rt.values.get('atlas.casepack.v2');assert.ok(saved);assert.ok(saved.length*2<5*1024*1024,'serialized bytes: '+saved.length*2);const restored=support.makeRuntime({'atlas.casepack.v2':saved},{skipManagedM1:true});for(const name of ['background','workflow','demo']){const root=new support.El();restored.ctx.Cases.byScene('m1').tabs[name].mount(root,{});const doc=root.children[0].srcdoc;assert.ok(doc.includes('window.M1_DATA=')&&doc.includes('window.M1_RESULTS='));assert.ok(doc.includes('data:image/webp;base64,'));}
});

// Event fixture: it does not simulate or manufacture model outputs. Browser QA checks actual pixels.
function appRuntime(embedded=false,reduced=false,portalView=null,mobile=false){
  const nodes=new Map(),buttons=[],canvases=[],timers=[],blobs=[],messages=[],events={},scrolls=[];
  const create=tag=>{const e=new support.El(tag);e.getAttribute=k=>e.attributes[k]??null;e.removeAttribute=k=>{delete e.attributes[k];};e.style.setProperty=(k,v)=>{e.style[k]=v;};e.getBoundingClientRect=()=>({height:1800,top:0});e.click=()=>{if(e.listeners.click)e.listeners.click.call(e,{target:e});};return e;};
  for(const m of entryHTML.matchAll(/<([\w-]+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){const e=create(m[1]);for(const a of m[2].matchAll(/\b(src|alt|aria-pressed)="([^"]*)"/g))e.setAttribute(a[1],a[2]);nodes.set(m[3],e);}
  for(const m of entryHTML.matchAll(/<button\b([^>]*)>/g)){const attr=m[1],id=/\bid="([^"]+)"/.exec(attr),e=id?nodes.get(id[1]):create('button');for(const a of attr.matchAll(/data-(view|go|step|rock|field-step)="([^"]+)"/g))e.dataset[a[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=a[2];buttons.push(e);}
  nodes.get('lag-minutes').value='30';nodes.get('rop').value='12';
  const body=create('body'),document={body,getElementById(id){assert.ok(nodes.has(id),'Missing node '+id);return nodes.get(id);},querySelector(){return null;},querySelectorAll(selector){const k=/\[data-([\w-]+)\]/.exec(selector);return k?buttons.filter(b=>b.dataset[k[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]!==undefined):[];},createElement(tag){const e=create(tag);if(tag==='canvas'){e.draws=[];e.getContext=()=>({drawImage(...args){e.draws.push(args);},createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(p){e.pixels=new Uint8ClampedArray(p.data);}});canvases.push(e);}return e;}};
  const byImage=new Map(data.samples.map(s=>[s.image,s]));class FixtureImage{set src(value){const s=byImage.get(value);assert.ok(s);this.sampleId=s.id;this.naturalWidth=audit[s.id].width;this.naturalHeight=audit[s.id].height;queueMicrotask(()=>this.onload());}}
  const ctx={document,console,M1_DATA:data,M1_RESULTS:results,M1_AUDIT:audit,Image:FixtureImage,Blob,atob:value=>Buffer.from(value,'base64').toString('binary'),URLSearchParams,__CASE_DEMO_VIEW__:portalView,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:fixture';},revokeObjectURL(){}},location:{hash:'',search:''},history:{replaceState(a,b,hash){ctx.location.hash=hash;}},matchMedia:q=>({matches:q.includes('reduced')?reduced:mobile,addEventListener(){}}),scrollTo:(...args)=>scrolls.push(args),addEventListener(type,fn){(events[type]||=([])).push(fn);},setTimeout(fn){timers.push(fn);},ResizeObserver:class{observe(){}}};ctx.window=ctx;ctx.parent=embedded?{postMessage:m=>messages.push(m)}:ctx;vm.createContext(ctx);vm.runInContext(inlineCode('app'),ctx);
  return {ctx,nodes,buttons,canvases,blobs,messages,body,scrolls,timers,message(event){(events.message||[]).forEach(fn=>fn(event));},event(id,type,extra={}){const e=nodes.get(id);e.listeners[type].call(e,{target:e,preventDefault(){},...extra});},step(i){buttons.find(b=>b.dataset.step===String(i)).listeners.click();}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function delegated(rt,id,selector,dataset={}){const target={dataset,closest:s=>s===selector?target:null};rt.event(id,'click',{target});}
function pick(rt,id){rt.nodes.get('flow-sample-select').value=id;rt.event('flow-sample-select','change');}

test('each preparation step renders original information independently of classifier results',async()=>{
  const rt=appRuntime();await settle();for(let i=0;i<7;i++){rt.step(i);assert.equal(rt.nodes.get('flow-title').textContent,flow[i].name);assert.ok(rt.nodes.get('flow-snapshot').innerHTML.length>100);assert.doesNotMatch(rt.nodes.get('flow-snapshot').innerHTML,/分类得分|识别结果|近邻|模型/);assert.equal(rt.nodes.get('flow-count').textContent,(i+1)+' / 7');}assert.equal(rt.nodes.get('flow-next').disabled,true);rt.event('flow-next','click');assert.equal(rt.nodes.get('flow-count').textContent,'7 / 7');rt.step(0);rt.event('flow-prev','click');assert.equal(rt.nodes.get('flow-count').textContent,'1 / 7');
});
test('the quality illustration changes the displayed lighting while preserving actual source statistics',async()=>{
  const rt=appRuntime();await settle();rt.step(2);const before=rt.nodes.get('flow-snapshot').innerHTML;delegated(rt,'flow-snapshot','[data-quality-toggle]');const after=rt.nodes.get('flow-snapshot').innerHTML;assert.match(after,/quality-dim/);const hist=s=>/<div class="gray-histogram"[\s\S]*?<div class="gray-axis">/.exec(s)[0];assert.equal(hist(before),hist(after));assert.equal(rt.nodes.get('query-id').textContent,data.samples[0].id);
});
test('the image preparation actually draws the recorded source ROI into a 224-square canvas',async()=>{
  const rt=appRuntime();rt.step(3);delegated(rt,'flow-snapshot','[data-image-stage]',{imageStage:'2'});await settle();const canvas=rt.nodes.get('flow-snapshot').querySelector('#prepared-image').children.at(-1),roi=audit[data.samples[0].id].roi;assert.equal(canvas.width,224);assert.equal(canvas.height,224);assert.deepEqual(canvas.draws[0].slice(1),[roi[0],roi[1],roi[2]-roi[0],roi[3]-roi[1],0,0,224,224]);assert.equal(canvas.draws.length,1);
});
test('all seventeen groups remain inspectable in preparation regardless of identification phase',async()=>{
  const rt=appRuntime();await settle();rt.step(5);assert.equal((rt.nodes.get('flow-snapshot').innerHTML.match(/data-depth-group=/g)||[]).length,17);const holdout=data.samples.find(s=>s.split==='test');delegated(rt,'flow-snapshot','[data-depth-group]',{depthGroup:holdout.group});assert.match(rt.nodes.get('flow-snapshot').innerHTML,new RegExp(holdout.depth));assert.equal(rt.nodes.get('query-id').textContent,data.samples[0].id);
});
test('the preparation export contains all 66 source records and explicitly missing field metadata',async()=>{
  const rt=appRuntime();await settle();rt.step(6);delegated(rt,'flow-snapshot','[data-export-data]');const csv=await rt.blobs.at(-1).text(),lines=csv.trim().split('\r\n');assert.equal(lines.length,67);assert.match(lines[0],/source_depth_m/);assert.doesNotMatch(lines[0],/prediction|identified|score|review/);assert.ok(lines[1].includes(data.samples[0].sha256));assert.ok(lines[1].includes('not_provided'));assert.ok(lines[1].includes(data.samples[0].label));
});
test('depth spacing preserves real intervals and marks gaps rather than inventing continuous geology',async()=>{
  const rt=appRuntime();await settle();const markup=rt.nodes.get('depth-log').innerHTML,rows=[...markup.matchAll(/data-pick="([^"]+)" data-depth="(\d+)" data-y="(\d+)"/g)];assert.equal(rows.length,42);const row=depth=>rows.find(r=>Number(r[2])===depth);assert.equal(Number(row(2104)[3])-Number(row(2102)[3]),20);assert.equal(Number(row(2094)[3])-Number(row(2090)[3]),40);assert.match(markup,/间隔 100 m · 断轴/);assert.equal((markup.match(/<image /g)||[]).length,42);
});
test('selecting a depth links the original image, source label, prediction and all three scores',async()=>{
  const rt=appRuntime();await settle();const s=data.samples.find(s=>s.depth===2104),r=results.samples[s.id];delegated(rt,'depth-log','[data-pick]',{pick:s.id});assert.equal(rt.nodes.get('query-id').textContent,s.id);assert.equal(rt.nodes.get('query-image').src,s.image);assert.equal(rt.nodes.get('original-label').textContent,s.label);assert.equal(rt.nodes.get('prediction').textContent,data.classes.find(c=>c.id===r.prediction).name);for(const score of r.scores)assert.ok(rt.nodes.get('class-scores').innerHTML.includes((score*100).toFixed(1)+'%'));assert.match(rt.nodes.get('comparison-note').textContent,/不同/);
});
test('changing the response class changes the actual heat map without changing classification scores',async()=>{
  const rt=appRuntime();await settle();const scoreHTML=rt.nodes.get('class-scores').innerHTML,selected=rt.nodes.get('query-id').textContent,prediction=rt.nodes.get('prediction').textContent,firstHeat=rt.canvases.filter(c=>c.width===7).at(-1).pixels;delegated(rt,'class-scores','[data-cam-class]',{camClass:'shale'});await settle();const secondHeat=rt.canvases.filter(c=>c.width===7).at(-1).pixels;assert.notDeepEqual(secondHeat,firstHeat);assert.equal(rt.nodes.get('query-id').textContent,selected);assert.equal(rt.nodes.get('prediction').textContent,prediction);assert.equal(rt.nodes.get('class-scores').innerHTML.replaceAll(/aria-pressed="(true|false)"/g,''),scoreHTML.replaceAll(/aria-pressed="(true|false)"/g,''));assert.match(rt.nodes.get('response-label').textContent,/页岩/);
});
test('holdout selection uses its own 24 observations and exports its actual fixed scores',async()=>{
  const rt=appRuntime();await settle();rt.event('phase-test','click');assert.equal((rt.nodes.get('depth-log').innerHTML.match(/data-pick=/g)||[]).length,24);assert.match(rt.nodes.get('phase-comparison').innerHTML,/33\.3%/);rt.event('export-identification','click');const lines=(await rt.blobs.at(-1).text()).trim().split('\r\n');assert.equal(lines.length,25);assert.match(lines[0],/identified_lithology/);assert.ok(lines[1].includes(results.method.weightsSha256));assert.ok(lines[1].includes('test'));assert.doesNotMatch(lines[0],/review/);
});
test('record differences, keyboard navigation and highlighting never modify data or omit samples',async()=>{
  const rt=appRuntime();await settle();rt.event('next-disagreement','click');const id=rt.nodes.get('query-id').textContent,s=data.samples.find(s=>s.id===id);assert.notEqual(results.samples[id].prediction,s.classId);rt.nodes.get('highlight-differences').checked=true;rt.event('highlight-differences','change');assert.ok(rt.nodes.get('depth-log').classList.contains('highlight-differences'));assert.equal((rt.nodes.get('depth-log').innerHTML.match(/data-pick=/g)||[]).length,42);rt.event('depth-log','keydown',{key:'Home'});assert.equal(rt.nodes.get('query-id').textContent,data.samples[0].id);rt.event('depth-log','keydown',{key:'ArrowDown'});assert.equal(rt.nodes.get('query-id').textContent,'w2-2094');
});
test('responsive depth columns use a readable compact layout without discarding records',async()=>{
  const rt=appRuntime(false,false,null,true);await settle();assert.match(rt.nodes.get('depth-log').innerHTML,/viewBox="0 0 300 /);assert.equal((rt.nodes.get('depth-log').innerHTML.match(/data-pick=/g)||[]).length,42);
});
test('background illustrations share the selected real photo and do not change fixed classification',async()=>{
  const rt=appRuntime();await settle();const before=rt.nodes.get('phase-comparison').innerHTML;rt.event('research-label-toggle','click');assert.match(rt.nodes.get('research-label-note').textContent,/不能证明/);rt.event('research-grain-toggle','click');assert.match(rt.nodes.get('research-grain-note').textContent,/非本课分割结果/);rt.buttons.find(b=>b.dataset.rock==='shale').listeners.click();const s=data.samples.find(s=>s.classId==='shale'&&s.split==='reference');assert.equal(rt.nodes.get('field-sample-image').src,s.image);assert.equal(rt.nodes.get('research-capture-a').src,s.image);assert.equal(rt.nodes.get('query-id').textContent,s.id);assert.equal(rt.nodes.get('phase-comparison').innerHTML,before);
});
test('portal shared samples are accepted only from the parent and persist across all lesson views',async()=>{
  const rt=appRuntime(true,false,'background');await settle();const s=data.samples.find(s=>s.split==='test'),state={sampleId:s.id};rt.message({source:{},data:{__m1SharedState:state}});assert.notEqual(rt.nodes.get('query-id').textContent,s.id);rt.message({source:rt.ctx.parent,data:{__m1SharedState:state}});assert.equal(rt.nodes.get('query-id').textContent,s.id);assert.equal(rt.nodes.get('phase-test').getAttribute('aria-pressed'),'true');for(const name of ['background','workflow','demo']){rt.buttons.find(b=>b.dataset.view===name).listeners.click();assert.equal(rt.nodes.get('panel-'+name).hidden,false);assert.equal(rt.nodes.get('query-id').textContent,s.id);}pick(rt,'w2-2104');assert.ok(rt.messages.some(m=>m.__m1StateUpdate&&m.__m1StateUpdate.sampleId==='w2-2104'));
});
test('standalone tabs scroll to their start and portal scroll requests require the owning parent',async()=>{
  const local=appRuntime();await settle();local.buttons.find(b=>b.dataset.view==='workflow').listeners.click();assert.equal(local.nodes.get('panel-workflow').scrollOptions.block,'start');const rt=appRuntime(true,false,'demo');await settle();rt.message({source:{},data:{__m1ScrollToTop:true}});assert.equal(rt.scrolls.length,0);rt.message({source:rt.ctx.parent,data:{__m1ScrollToTop:true}});assert.deepEqual(rt.scrolls,[[0,0]]);
});
test('reduced motion, lag controls and bounded keyboard preparation navigation remain usable',async()=>{
  const rt=appRuntime(false,true);await settle();assert.equal(rt.body.classList.contains('is-paused'),true);rt.event('motion-toggle','click');assert.equal(rt.body.classList.contains('is-paused'),false);rt.nodes.get('lag-minutes').value='60';rt.event('lag-minutes','input');assert.equal(rt.nodes.get('source-depth').textContent,'3188 m');rt.buttons.find(b=>b.dataset.step==='0').listeners.keydown({key:'End',preventDefault(){}});assert.equal(rt.nodes.get('flow-count').textContent,'7 / 7');
});
test('the portal mounts all three matching lesson views once and removes them when leaving the case',()=>{
  const rt=support.makeRuntime(),c=rt.ctx.Cases.get('m1-cuttings'),sc=rt.ctx.ATLAS.index.byScene.m1,tabs=rt.document.getElementById('tabs');for(const name of ['bg','flow','demo']){const b=new support.El('button');b.dataset.tab=name;tabs.children.push(b);const p=new support.El();p.dataset.panel=name;rt.panels.push(p);}rt.ctx.__shellTest.bindTabs(sc,c);const bg=rt.document.getElementById('case-bg-root').children[0];assert.ok(bg.src.includes('?v=2.0.2&'));const click=tab=>tabs.listeners.click({target:{closest:()=>tabs.children.find(b=>b.dataset.tab===tab)}});click('flow');const flowFrame=rt.document.getElementById('case-flow-root').children[0];assert.ok(flowFrame.src.endsWith('section=workflow'));click('demo');const demo=rt.document.getElementById('case-demo-root').children[0];assert.ok(demo.src.endsWith('section=demo'));click('bg');click('demo');assert.equal(rt.document.getElementById('case-demo-root').children.length,1);rt.ctx.__shellTest.unmountCurrent();for(const frame of [bg,flowFrame,demo])assert.equal(frame.removed,true);
});
