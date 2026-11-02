const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const modules=['content','data','models','core',...['s1','s2','s3','s4','s5'].map(id=>'data/'+id)];
function math(){const w={};for(const name of modules)vm.runInNewContext(read('assets/seismic/'+name+'.js'),{window:w});return w;}
const defaults={slice:4,threshold:.5,sta:2.2,confidence:.6,lambda:2,noise:.2,strength:1};
test('the five TXT tasks retain their original CV, TS and OPT categories and register three native lesson tabs',async()=>{
 const r=await runtime();for(const c of r.w.SEISMIC_CONTENT){const k=r.w.Cases.get(c.caseId);assert.deepEqual(Array.from(k.methods),Array.from(r.w.ATLAS.index.byScene[c.id].methods));assert.equal(k.status,'ready');assert.equal(k.tabs.background.sections.length,5);assert.equal(k.tabs.workflow.steps.length,6);assert.ok(['background','workflow','demo'].every(key=>typeof k.tabs[key].mount==='function'));assert.equal(r.w.Cases.validate(k).filter(v=>v.level==='error').length,0);}r.close();
});
test('3D, 2D and temporal convolution plus the well regressor reproduce independent Python outputs',()=>{
 const w=math(),U=w.SeismicMath;
 for(const id of ['s1','s2','s3','s4','s5'])for(const r of w.SEISMIC_DATA[id].records){let p;
  if(id==='s1')p=U.forward(r.volume,[r.d,r.h,r.w],w.SEISMIC_MODELS[id].layers);
  if(id==='s2')p=U.forward(r.signal.concat(r.signal.map((v,i)=>Math.floor(i/r.w)/(r.h-1))),[1,r.h,r.w],w.SEISMIC_MODELS[id].layers);
  if(id==='s3'){const t=Array.from({length:r.h},(_,i)=>r.signal[i*r.w]);p=U.forward(t.concat(U.energy(t,9)),[1,r.h,1],w.SEISMIC_MODELS[id].layers);}
  if(id==='s4')p=U.inverse(r,defaults).raw;
  if(id==='s5')p=U.forward(r.signal.map((v,i)=>v+.2*r.unitNoise[i]),[1,r.h,r.w],w.SEISMIC_MODELS[id].layers);
  const max=Math.max(...r.expected.map((v,i)=>Math.abs(p[i]-v)));assert.ok(max<.00002,id+' '+r.id+' max error '+max);
 }
});
test('display windows, wells, field observations and controlled labels have separate provenance and group splits',()=>{
 const w=math(),audit=JSON.parse(read('assets/seismic/provenance.json')),sources=JSON.parse(read('assets/seismic/sources.json')).sources;assert.equal(audit.illustrationsUsedForTraining,false);
 for(const id of ['s1','s2','s4','s5']){const d=w.SEISMIC_DATA[id],train=d.split.train,test=d.split.test;assert.ok(train.every(v=>!test.includes(v)));}
 assert.equal(w.SEISMIC_DATA.s2.counts.classes,10);assert.equal(w.SEISMIC_DATA.s3.records.filter(r=>r.kind==='field-unlabelled').length,3);assert.ok(w.SEISMIC_DATA.s3.records.filter(r=>r.kind==='field-unlabelled').every(r=>r.reference===null&&r.sampleUnit.includes('no time interval')));
 for(const d of Object.values(w.SEISMIC_DATA))for(const r of d.records)if(!r.kind.startsWith('controlled'))assert.ok(sources.some(x=>x.file===r.source),'traceable source '+r.source);
 assert.ok(audit.datasets.s4.target.includes('NPHI'));assert.ok(audit.datasets.s5.reference.includes('not a clean ground truth'));
});
test('thresholds change accepted coverage, regularization changes the actual solution, and noise changes the actual network input',()=>{
 const w=math(),U=w.SeismicMath,D=w.SEISMIC_DATA;
 const f=D.s1.records[0],fa=U.fault(f,{...defaults,threshold:.3}),fb=U.fault(f,{...defaults,threshold:.8});assert.deepEqual(fa.baseline,fb.baseline);assert.equal(w.SEISMIC_MODELS.s1.attributeCalibration.volume,3);assert.ok(!D.s1.split.test.includes(3));
 const r=D.s2.records[0],a=U.facies(r,{...defaults,threshold:.4}),b=U.facies(r,{...defaults,threshold:.9});assert.equal(a.full,b.full);assert.ok(a.coverage>b.coverage);
 const inv=D.s4.records[0],lo=U.inverse(inv,{...defaults,lambda:0}),hi=U.inverse(inv,{...defaults,lambda:10});assert.ok(hi.roughness<lo.roughness);assert.ok(hi.pred.some((v,i)=>Math.abs(v-lo.pred[i])>.001));assert.ok(hi.pred.every(v=>v>=0&&v<=.6));
 const n=D.s5.records[0],before=JSON.stringify(n),quiet=U.denoise(n,{...defaults,noise:.1}),loud=U.denoise(n,{...defaults,noise:.4});assert.ok(loud.inputSNR<quiet.inputSNR);assert.ok(loud.pred.some((v,i)=>Math.abs(v-quiet.pred[i])>.01));assert.equal(JSON.stringify(n),before);
 const field=D.s3.records[0],real=U.timing(field,defaults),cal=U.timing(D.s3.records[3],defaults);assert.equal(real.error,null);assert.ok(cal.error!=null);assert.ok(cal.coverage>0);
});
test('result exports retain coordinates, units, input parameters, observations and unlabelled-field boundaries',()=>{
 const w=math(),U=w.SeismicMath;
 for(const c of w.SEISMIC_CONTENT){
  const r=w.SEISMIC_DATA[c.id].records[0],z=U.compute(c.id,r,defaults),e=U.exportRecord(c,r,defaults,z);assert.ok(e.text.includes(r.source));
  if(c.id==='s3'){const fields=Array.from(e.text.split(/\r?\n/)[2].matchAll(/"([^"]*)"/g),m=>m[1]);assert.equal(fields[4],'');assert.ok(fields[5].includes('source sample'));}
  if(c.id==='s4')assert.ok(e.text.includes('reference_NPHI_vv'));
  if(c.id==='s5'){const d=JSON.parse(e.text);assert.equal(d.input.length,r.w*r.h);assert.ok(d.output.every((v,i)=>Math.abs(d.input[i]-v-d.residual[i])<1e-10));}
 }
});

test('five-case maps filter by shared methods and recognize S4 under both CV and OPT',async()=>{
 const r=await runtime(),d=r.w.document;assert.equal(d.querySelectorAll('.ml-spot').length,5);d.querySelector('[data-ml-method-button="cv"]').click();assert.equal(d.querySelectorAll('.ml-spot.is-relevant').length,4);d.querySelector('[data-ml-method-button="opt"]').click();assert.equal(d.querySelectorAll('.ml-spot.is-relevant').length,1);assert.equal(d.querySelector('.ml-spot.is-relevant').dataset.mlSpot,'s4');d.querySelector('[data-ml-method-button="ts"]').click();assert.equal(d.querySelector('.ml-spot.is-relevant').dataset.mlSpot,'s3');assert.equal(d.querySelectorAll('.ml-read-card').length,1);r.close();
});
test('all fifteen pages mount, share the same selected record and controls, and dispose without page errors',async()=>{
 for(const id of ['s1','s2','s3','s4','s5']){
  const r=await runtime('#/scene/'+id+'?tab=bg'),d=r.w.document;assert.equal(d.querySelectorAll('.sx-chapter').length,5);assert.equal(d.querySelectorAll('.sx-chapter:last-of-type tbody tr').length,10);
  const sample=d.querySelector('[data-sx-control="record"]');sample.value='2';sample.dispatchEvent(new r.w.Event('change',{bubbles:true}));d.querySelector('#tabs [data-tab="flow"]').click();await flush();assert.equal(d.querySelector('[data-panel="flow"] [data-sx-control="record"]').value,'2');d.querySelector('[data-sx-step="3"]').click();assert.ok(d.querySelector('[data-panel="flow"] .sx-results canvas, [data-panel="flow"] .sx-inverse'));
  const key={s1:'threshold',s2:'threshold',s3:'sta',s4:'lambda',s5:'noise'}[id],v={s1:.7,s2:.8,s3:3,s4:7,s5:.4}[id],control=d.querySelector('[data-panel="flow"] [data-sx-control="'+key+'"]');control.value=v;control.dispatchEvent(new r.w.Event('input',{bubbles:true}));d.querySelector('#tabs [data-tab="demo"]').click();await flush();assert.equal(d.querySelector('[data-panel="demo"] [data-sx-control="record"]').value,'2');assert.equal(Number(d.querySelector('[data-panel="demo"] [data-sx-control="'+key+'"]').value),v);assert.ok(!d.body.textContent.includes('案例部分挂载失败'));r.close();
 }
});
test('case payload integrity is verifiable and observations load only for the selected case',()=>{
 const audit=JSON.parse(read('assets/seismic/provenance.json'));for(const [name,expected] of Object.entries(audit.assetIntegrity)){const bytes=fs.readFileSync(path.join(root,'assets/seismic',name));assert.equal(bytes.length,expected.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected.sha256);}
 const w={};vm.runInNewContext(read('assets/seismic/data.js'),{window:w});assert.ok(Object.values(w.SEISMIC_DATA).every(d=>!d.records));assert.ok(fs.statSync(path.join(root,'assets/seismic/data.js')).size<3000);assert.ok(!read('index.html').includes('src="assets/seismic/data/s1.js'));
});
test('a failed case-data request can be retried without loading unrelated cases',async()=>{
 const {JSDOM}=require('jsdom'),dom=new JSDOM('<head></head><body></body>',{url:'http://localhost/',runScripts:'outside-only'}),w=dom.window;w.SEISMIC_DATA={s1:{},s2:{}};w.eval(read('assets/seismic/loader.js'));
 const first=w.SeismicAssets.load('s1'),firstScript=w.document.querySelector('script');assert.ok(firstScript.src.includes('/data/s1.js'));const rejected=assert.rejects(first,/载入失败/);firstScript.dispatchEvent(new w.Event('error'));await rejected;
 const second=w.SeismicAssets.load('s1');assert.equal(w.document.querySelectorAll('script').length,1);w.SEISMIC_DATA.s1.records=[];w.document.querySelector('script').dispatchEvent(new w.Event('load'));await second;assert.ok(!w.SEISMIC_DATA.s2.records);dom.window.close();
});
function flush(){return new Promise(resolve=>setImmediate(resolve));}
async function runtime(hash='#/stage/seismic'){
 const {JSDOM}=require('jsdom'),dom=new JSDOM('<div id="view"></div>',{url:'http://localhost/'+hash,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,errors=[];
 w.addEventListener('error',e=>errors.push(e.message));w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.Admin={loggedIn:()=>false};w.URL.createObjectURL=()=> 'blob:test';w.URL.revokeObjectURL=()=>{};
 w.HTMLCanvasElement.prototype.getContext=function(){return {createImageData:(x,y)=>({data:new Uint8ClampedArray(x*y*4)}),putImageData(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},setLineDash(){}};};
 for(const name of ['assets/data.js','assets/core/registry.js','assets/core/kit.js',...modules.map(v=>'assets/seismic/'+v+'.js'),'assets/seismic/loader.js','assets/seismic/stage.js','assets/seismic/lessons.js','assets/cases/seismic.case.js','assets/core/shell.js'])w.eval(read(name));
 await flush();return {w,close:()=>{for(const c of w.SEISMIC_CONTENT){const def=w.Cases.get(c.caseId);Object.values(def.tabs).forEach(tab=>tab.unmount());}w.close();assert.deepEqual(errors,[]);}};
}
