// Source provenance, real saved outputs, chapter boundaries and course interactions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {test}=require('node:test');
const site=process.env.HW5_PORTAL_ROOT||path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(site,n),'utf8'),json=n=>JSON.parse(read(n)),plain=v=>JSON.parse(JSON.stringify(v));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const courses=require(path.join(site,'tools/mudlogging/content.cjs')),M=require(path.join(site,'tools/mudlogging/math.js')),V=require(path.join(site,'tools/mudlogging/lesson-views.js'));
const list=Object.values(courses),source=id=>json('tools/mudlogging/experiments/'+id+'.json');
list.forEach(c=>require(path.join(site,'tools/mudlogging/v2-content.cjs')).apply(c));
// Archived synthetic fixtures stay independently auditable; they are not loaded by M2/M4 pages.
function generated(c){if(c.realOnly)return source(c.id);const context={window:{}};vm.runInNewContext(read(c.slug+'-case/assets/experiment.js'),context);return plain(context.window.LESSON_DATA);}
function close(a,b,tol=1e-10){assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);}
function disjoint(a,b){for(const v of a)assert.ok(!new Set(b).has(v),'shared group '+v);}
const base=read('tests/regression.cjs').split("test('all JavaScript files compile'")[0];
const support={require,__dirname:path.join(site,'tests'),process,Buffer,Blob,TextEncoder,Event,console,setImmediate};
vm.createContext(support);vm.runInContext(base+'\nglobalThis.makeRuntime=runtime;globalThis.El=Element;',support);
function filesFor(c){const dir=path.join(site,c.slug+'-case'),walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);return walk(dir).filter(p=>path.basename(p)!=='case.json').map(p=>{const name=path.relative(dir,p).replaceAll('\\','/'),bytes=fs.readFileSync(p),binary=p.endsWith('.png');return {name,size:bytes.length,mime:binary?'image/png':'text/plain',enc:binary?'dataurl':'text',data:binary?'data:image/png;base64,'+bytes.toString('base64'):bytes.toString('utf8')};});}

for(const c of list){
 test(c.id+': five connected background chapters and six scenario-based steps with an actual deep model',()=>{
  const pkg=json(c.slug+'-case/case.json'),background=read(c.slug+'-case/demo/background.html');
  assert.deepEqual(pkg.tabs.background.sections.map(s=>s.title),['真实背景','技术前沿','示例数据','技术难度与参考方向','术语对照表']);
  assert.ok(c.terms.length>=10&&c.terms.every(t=>t.length===3));assert.equal(c.steps.length,6);assert.ok(c.steps.some(s=>s.focus));
  assert.ok(background.includes('role="img"'));assert.ok(background.includes(c.professionalSource.url));
  assert.equal(c.papers.length>=2,true);for(const p of c.papers){assert.ok(background.includes(p.url));assert.ok(p.input&&p.method&&p.output&&p.boundary);assert.ok(p.date.startsWith('2025')||p.date.startsWith('2026'));}
  assert.ok(read(c.slug+'-case/demo/workflow.html').includes(c.scenario));
  const provenance=json(c.slug+'-case/provenance.json'),e=source(c.id);
  if(c.realOnly){const d=json('tools/mudlogging/real-data/'+(c.id==='m2'?'m2-gru':'m4-lstm')+'.json');assert.equal(provenance.weightsSha256,d.modelSha256);assert.equal(provenance.generatorSha256,d.modelPreparation.scriptSha256);assert.deepEqual(provenance.metrics,d.model.metrics);}else{
  assert.equal(provenance.weightsSha256,hash(fs.readFileSync(path.join(site,'tools/mudlogging/checkpoints/'+c.id+'.pt'))));
  assert.equal(provenance.generatorSha256,hash(fs.readFileSync(path.join(site,'tools/mudlogging/prepare-experiments.py'))));
  assert.equal(provenance.experimentSha256,hash(fs.readFileSync(path.join(site,'tools/mudlogging/experiments/'+c.id+'.json'))));
  assert.deepEqual(provenance.metrics,e.metrics);assert.equal(e.kind,'synthetic-teaching');
  }
 });
 test(c.id+': three physical entries cannot fall through to the background or a retired whole page',()=>{
  for(const [view,file] of [['background','background'],['workflow','workflow'],['demo','identify']]){
   const html=read(c.slug+'-case/demo/'+file+'.html');assert.ok(html.includes('data-section="'+view+'"'));
   assert.doesNotMatch(html,/<iframe|data-view=|class="masthead"|class="case-tabs"|lesson\.html|demo\/index\.html/);
   if(view!=='background')assert.ok(!html.includes('id="chapter-1"'));
   for(const m of html.matchAll(/(?:src|href)="\.\.\/assets\/([^"]+)"/g))assert.ok(fs.existsSync(path.join(site,c.slug+'-case/assets',m[1].split('?')[0])));
  }
 });
 test(c.id+': displayed inputs, labels and scores belong to the saved held-out records',()=>{
  const a=source(c.id),b=generated(c),pack=c.slug+'-case/';assert.equal(a.records.length,b.records.length);
  if(c.id==='m5'){
   disjoint(a.trainTemplateIds,a.validationTemplateIds);disjoint(a.trainTemplateIds,a.records.map(r=>r.templateId));disjoint(a.validationTemplateIds,a.records.map(r=>r.templateId));
   assert.equal(new Set(a.records.map(r=>r.templateId)).size,16);
  }else{
   const group=id=>c.id==='m3'?id.split('-').slice(0,2).join('-'):id;
   disjoint(a.trainIds.map(group),a.validationIds.map(group));disjoint(a.trainIds.map(group),a.records.map(r=>group(r.id)));disjoint(a.validationIds.map(group),a.records.map(r=>group(r.id)));
  }
  for(let i=0;i<a.records.length;i++){
   const original=a.records[i],shown=b.records[i];
   for(const key of Object.keys(original)){if(['image','facts'].includes(key))continue;assert.deepEqual(shown[key],original[key],original.id+' '+key);}
   if(c.id==='m3'){
    const bytes=fs.readFileSync(path.join(site,pack,'assets/images',path.basename(original.image)));
    assert.equal(hash(bytes),original.imageSha256);assert.deepEqual(Buffer.from(shown.imageData.split(',')[1],'base64'),bytes);
    assert.deepEqual(Array.from(M.segmentation(shown,.5).prediction),Array.from(M.unpack(original.prediction,4096)));
   }else{
    const scores=c.id==='m5'?[shown.scores]:shown.scores;
    for(const row of scores){close(row.reduce((n,v)=>n+v,0),1,.000003);assert.ok(row.every(v=>v>=0&&v<=1));}
    if(c.id==='m5'){assert.deepEqual(shown.facts.slice(0,3),original.facts);assert.equal(shown.facts.length,5);assert.equal(shown.prediction,shown.scores.indexOf(Math.max(...shown.scores)));}
   }
  }
 });
 test(c.id+': original import protocol restores all chapters, local images and shared-state protocol below quota',()=>{
  const rt=support.makeRuntime(),pkg=json(c.slug+'-case/case.json'),files=filesFor(c),rec={v:2,pkg,files,meta:pkg};
  rt.ctx.Cases.unregister(c.slug); // Import into an original-protocol portal without this built-in ID.
  assert.deepEqual(plain(rt.ctx.__importTest.checkAll(pkg,pkg,files).filter(v=>v.level==='error')),[]);
  assert.ok(JSON.stringify(rec).length*2<5*1024*1024);
  const imported=rt.ctx.__importTest.toCase(rec);assert.equal(imported.lessonProtocol,'mudlogging-v1');
  for(const [view,file] of [['background','background'],['workflow','workflow'],['demo','identify']]){
   const root=new support.El();imported.tabs[view].mount(root,{});const doc=root.children[0].srcdoc;
   assert.ok(doc.includes('data-section="'+view+'"'));assert.ok(doc.includes('window.LESSON_DATA='));assert.doesNotMatch(doc,/<script\b[^>]*\ssrc=/);
   assert.ok(doc.includes('Math.min(h,14000)'));assert.ok(doc.includes('window.caseAsset='));
   if(c.id==='m3')assert.ok(doc.includes('data:image/png;base64,'));imported.tabs[view].unmount();assert.equal(root.children[0].removed,true);
  }
 });
}

test('all classification and boundary metrics recompute from every held-out decision',()=>{
 for(const id of ['m2','m4','m5']){
  const e=source(id);for(const key of ['baseline','prediction']){
   const measured=M.classify(e.records,key,e.labels.length),saved=e.metrics.test[key];
   assert.deepEqual(measured.matrix,saved.matrix);for(const k of ['count','correct','accuracy','macroF1'])close(measured[k],saved[k]);
   if(id==='m4')assert.deepEqual(M.boundaryMetrics(e.records,key,2),saved.boundary);
  }
  for(const phase of ['validation','test'])for(const key of ['baseline','prediction']){
   const m=e.metrics[phase][key],hit=m.matrix.reduce((n,row,i)=>n+row[i],0),count=m.matrix.flat().reduce((n,v)=>n+v,0);close(m.accuracy,hit/count);assert.equal(m.count,count);
  }
 }
 const text=source('m5');assert.ok(text.metrics.validation.prediction.macroF1<text.metrics.validation.baseline.macroF1);assert.equal(text.records.filter(r=>r.prediction!==r.truth).length,41);
});
test('field background adds three illustrated professional concepts before research, with primary references',()=>{
 const professional=require(path.join(site,'tools/mudlogging/professional-content.cjs'));
 for(const c of list){const html=read(c.slug+'-case/demo/background.html'),field=html.split('id="chapter-2"')[0],p=professional[c.id];assert.equal((field.match(/class="professional-concept"/g)||[]).length,3);assert.ok((field.match(/role="img"/g)||[]).length>=4);for(const topic of p.topics){assert.ok(field.includes(topic.title));assert.equal(topic.facts.length,3);for(const f of topic.facts)assert.ok(field.includes(f[0])&&field.includes(f[1]));}for(const ref of p.sources)assert.ok(field.includes(ref[1]));if(c.id==='m5'){assert.ok(field.includes('综合录井图'));assert.ok(!field.includes('归类并关联事实'));}}
});
test('visual convolution windows use the actual normalized channels and respect causal versus offline context',()=>{
 for(const id of ['m2','m4']){const e=source(id),c=courses[id],r=e.records[0],d=V.windowInputs(c,e,r,40);assert.equal(d.start,26);assert.equal(d.end,id==='m2'?40:54);assert.equal(d.values.length,id==='m2'?15:29);const input=id==='m2'?Math.log1p(r.gas[26]):Math.log(r.drillTime[26]);close(d.values[0][0],input);close(d.scaled[0][0],(input-e.normalization.mean[0])/e.normalization.std[0]);assert.ok(d.scaled.every(row=>row.every(Number.isFinite)));}
});
test('professional mud-log curves use increasing vertical depth and share the same depth interval',()=>{
 const drawings=require(path.join(site,'tools/mudlogging/professional-diagrams.cjs')),html=drawings.overview(),tracks=[...html.matchAll(/data-depth-track="true" d="([^"]+)"/g)];assert.equal(tracks.length,2);
 for(const [,d] of tracks){const points=d.slice(1).split('L').map(p=>p.split(' ').map(Number));assert.equal(points[0][1],85);assert.equal(points.at(-1)[1],260);assert.ok(points.every((p,i)=>!i||p[1]>points[i-1][1]));}
});
test('paired charts account for all records and calculate the metric advertised on each row',()=>{
 for(const c of list){const e=generated(c),state={threshold:.5,tolerance:2},data=V.pairData(c,e,state,M);assert.deepEqual(data.flatMap(row=>row.recordIds).sort(),e.records.map(r=>r.id).sort());for(const row of data){const records=row.recordIds.map(id=>e.records.find(r=>r.id===id));for(const key of ['baseline','prediction']){const expected=c.id==='m3'?M.imageMetrics(records,key,.5).iou:c.id==='m4'?M.boundaryMetrics(records,key,2).f1:c.id==='m5'?M.classify(records,key,e.labels.length).accuracy:M.classify(records,key,e.labels.length).macroF1;close(row[key],expected);}}}
});
test('visual error counts expose tradeoffs as well as gains instead of reporting a single winning percentage',()=>{
 const fluorescence={C:courses.m3,E:generated(courses.m3),M,state:{threshold:.5,tolerance:2}},report={C:courses.m5,E:generated(courses.m5),M,state:{threshold:.5,tolerance:2}};
 assert.deepEqual(V.errorData(fluorescence),[['正确圈中 / px',4885,7968],['多圈 / px',0,280],['漏圈 / px',3225,142]]);
 assert.deepEqual(V.errorData(report),[['一致记录',60,119],['分错记录',100,41],['全部记录',160,160]]);
});
test('pixel metrics use real masks and interactive thresholds change decisions while preserving fixed results',()=>{
 const e=source('m3'),snapshot=JSON.stringify(e);for(const key of ['baseline','prediction'])assert.deepEqual(M.imageMetrics(e.records,key,.5),e.metrics.test[key]);
 const low=M.imageMetrics(e.records,'prediction',.25),high=M.imageMetrics(e.records,'prediction',.75);assert.notEqual(low.fp,high.fp);assert.notEqual(low.fn,high.fn);assert.equal(JSON.stringify(e),snapshot);
 const r=source('m4').records;assert.notEqual(M.boundaryMetrics(r,'prediction',0).matched,M.boundaryMetrics(r,'prediction',2).matched);
});
test('report assembly keeps values tied to the exact record and does not hide classifier mistakes',()=>{
 const e=generated(courses.m5);for(const r of e.records)for(const key of ['baseline','prediction']){
  const parts=M.reportParts(r,key,e.labels),lookup=new Map(r.facts.map(f=>[f.id,f.value]));
  for(const section of parts)for(const p of section.parts)if(p.fact){assert.ok(lookup.has(p.fact));if(section.title!=='事项候选')assert.equal(p.text,lookup.get(p.fact));}
  assert.equal(parts.at(-1).parts[1].text,e.labels[r[key]]);
 }
});

function app(c,section='demo'){
 const nodes=new Map(),listeners={},messages=[],timers=[],blobs=[];
 class Node{constructor(){this.innerHTML='';this.textContent='';this.value='';this.dataset={};this.disabled=false;this.attrs={};}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,v){this[k]=v;}getBoundingClientRect(){return {height:1200};}click(){}remove(){}}
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
 const steps=c.steps.map((_,i)=>{const b=new Node();b.dataset.step=String(i);return b;});
 const document={body:Object.assign(new Node(),{dataset:{section},appendChild(){}}),getElementById:get,querySelectorAll:s=>s==='[data-step]'?steps:[],addEventListener:(k,v)=>listeners[k]=v,createElement:()=>new Node()};
 const parent={postMessage:m=>messages.push(plain(m))},ctx={window:null,document,parent,console,Blob,Uint8Array,atob,URL:{createObjectURL:b=>{blobs.push(b);return 'blob:test';},revokeObjectURL(){}},setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},addEventListener:(k,v)=>listeners['window:'+k]=v,scrollTo(){},location:{assign(){}},matchMedia:()=>({matches:true})};ctx.window=ctx;
 vm.createContext(ctx);for(const name of ['math','config','experiment','lesson-views','lesson-client']){if(name==='experiment'&&c.realOnly)ctx.LESSON_DATA=source(c.id);else vm.runInContext(read(c.slug+'-case/assets/'+name+'.js'),ctx);}
 const click=(selector,dataset={})=>listeners.click({target:{closest:s=>s===selector?{dataset}:null}});
 return {nodes,listeners,messages,timers,blobs,ctx,click,change:(id,value)=>{get(id).value=value;listeners.change({target:Object.assign(get(id),{id})});},receive:(data,source=parent)=>listeners['window:message']({source,data})};
}
test('all six workflow steps render distinct inputs, traditional/AI explanations, outputs and comparisons',()=>{
 for(const c of list){const rt=app(c,'workflow');for(let i=0;i<6;i++){rt.click('[data-step]',{step:String(i)});assert.equal(rt.nodes.get('flow-title').textContent,c.steps[i].name);assert.ok(rt.nodes.get('flow-visual').innerHTML.length>100);if(i===3){assert.ok(rt.nodes.get('flow-visual').innerHTML.includes(c.traditional));assert.ok(rt.nodes.get('flow-visual').innerHTML.includes('method-lane rule-lane'));assert.ok(rt.nodes.get('flow-visual').innerHTML.includes('method-lane ai-lane'));assert.ok(!rt.nodes.get('flow-visual').innerHTML.split('<details')[0].includes(c.traditional));assert.equal(rt.nodes.get('flow-layout').attrs['data-focus'],'ai');}if(i===4)assert.ok(rt.nodes.get('flow-visual').innerHTML.includes('留出组'));}assert.equal(rt.nodes.get('flow-next').disabled,true);rt.nodes.get('flow-prev').click();assert.equal(rt.nodes.get('flow-counter').textContent,'5 / 6');}
});
test('child frames reject unrelated messages, keep the fixed chapter, and share exact sample and experiment controls',()=>{
 for(const c of list){const rt=app(c),e=generated(c),id=e.records.at(-1).id,original=rt.nodes.get('sample-select').value;rt.receive({__lessonSharedState:{recordId:id}},{});assert.equal(rt.nodes.get('sample-select').value,original);rt.receive({__lessonSharedState:{recordId:id,pointIndex:7,threshold:.75,tolerance:0}});assert.equal(rt.nodes.get('sample-select').value,id);assert.equal(rt.ctx.document.body.dataset.section,'demo');rt.change('sample-select',e.records[0].id);assert.equal(rt.messages.at(-1).__lessonStateUpdate.recordId,e.records[0].id);rt.click('[data-go]',{go:'workflow'});assert.equal(rt.messages.at(-1).__lessonNavigate,'workflow');}
});
test('report and fluorescence wrong-example controls retain all records and expose model errors',()=>{
 for(const c of [courses.m3,courses.m5]){const rt=app(c);rt.click('[data-example-difference]',{exampleDifference:'prediction'});const id=rt.nodes.get('sample-select').value,r=generated(c).records.find(r=>r.id===id);if(c.id==='m3'){const s=M.segmentation(r,.5),m=M.pixelMetrics(s.truth,s.prediction);assert.ok(m.fp+m.fn>0);}else assert.notEqual(r.prediction,r.truth);assert.equal((rt.nodes.get('sample-select').innerHTML.match(/<option /g)||[]).length,generated(c).records.length);}
});
test('exports retain the selected well or complete image/text pool with actual predictions and model hashes',async()=>{
 for(const c of list){const rt=app(c),e=generated(c);rt.change('sample-select',e.records.at(-1).id);rt.click('[data-export]',{export:'records'});const csv=await rt.blobs.at(-1).text(),rows=csv.trim().split('\r\n');assert.equal(rows.length,1+(c.id==='m3'||c.id==='m5'?e.records.length:e.records.at(-1).truth.length));assert.ok(csv.includes(e.weightsSha256));assert.ok(csv.includes(e.records.at(-1).id));if(c.id==='m5'){rt.click('[data-export]',{export:'report'});const report=await rt.blobs.at(-1).text(),record=e.records.at(-1);assert.ok(report.includes(e.labels[record.prediction]));for(const f of record.facts)assert.ok(report.includes(f.id)&&report.includes(f.value));}}
});
test('lesson portal state bridge trusts mounted sibling frames only and keeps tab ownership',()=>{
 const rt=support.makeRuntime(),handlers=[],scrolls=[];rt.ctx.addEventListener=(type,fn)=>{if(type==='message')handlers.push(fn);};rt.ctx.scrollTo=v=>scrolls.push(v);
 const c=rt.ctx.Cases.get('m2-gas'),sc=rt.ctx.ATLAS.index.byScene.m2,tabs=rt.document.getElementById('tabs');
 for(const key of ['bg','flow','demo'])rt.document.getElementById('case-'+key+'-root').nodes.set('iframe',null);
 for(const key of ['bg','flow','demo']){const b=new support.El('button');b.dataset.tab=key;b.click=()=>tabs.listeners.click({target:{closest:()=>b}});tabs.children.push(b);const p=new support.El();p.dataset.panel=key;rt.panels.push(p);}
 rt.ctx.__shellTest.bindTabs(sc,c);const receive=handlers[0],bgRoot=rt.document.getElementById('case-bg-root'),bg=bgRoot.children[0],sent=[];bgRoot.nodes.set('iframe',bg);bg.contentWindow={postMessage:m=>sent.push(plain(m))};
 receive({source:{},data:{__lessonStateUpdate:{recordId:'G-30'}}});receive({source:bg.contentWindow,data:{__lessonStateRequest:true}});assert.equal(sent.at(-1).__lessonSharedState,null);assert.equal(sent.at(-1).__lessonSection,'background');
 receive({source:bg.contentWindow,data:{__lessonStateUpdate:{recordId:'G-28',pointIndex:35}}});tabs.children[1].click();const flowRoot=rt.document.getElementById('case-flow-root'),flow=flowRoot.children[0],flowSent=[];flowRoot.nodes.set('iframe',flow);flow.contentWindow={postMessage:m=>flowSent.push(plain(m))};receive({source:flow.contentWindow,data:{__lessonStateRequest:true}});assert.equal(flowSent.at(-1).__lessonSharedState.recordId,'G-28');assert.equal(flowSent.at(-1).__lessonSection,'workflow');
 receive({source:flow.contentWindow,data:{__lessonNavigate:'demo'}});assert.ok(rt.ctx.location.hash.endsWith('&tab=demo'));assert.equal(scrolls.at(-1).behavior,'instant');
});
