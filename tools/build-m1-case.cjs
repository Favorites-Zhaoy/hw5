// Authoring helper only; the submitted folder runs as static HTML/CSS/JavaScript.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..'), pack = path.join(root,'m1-cuttings-case');
const runtime=path.join(__dirname,'m1/runtime');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(runtime,'data.js'),'utf8'),context);
const data=context.window.M1_DATA;
const paperFigures=require('./m1/paper-figures.cjs');
const flowContent=require('./m1/workflow-content.cjs');
const teaching=require('./m1/teaching-content.cjs');
const style='<style>.m1c{background:#faf2e4;border:1px solid #e8dbc7;border-radius:12px;padding:22px;margin:20px 0;color:#334c56}.m1c svg{display:block;width:100%;height:auto}.m1c svg text{font-family:Microsoft YaHei,system-ui,sans-serif}.m1c p{font-size:12px;line-height:1.9;color:#858b7d}.m1c-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.m1c-photo img{width:100%;max-width:155px;aspect-ratio:1;object-fit:cover;border-radius:6px;display:block;margin:0 auto 12px}.m1c-photo b{display:block;font-size:14px;color:#6d7f7e}.m1c-photo small{display:block;font-size:10px;line-height:1.9;color:#9a9b88}.m1c-legend{display:flex;gap:20px;font-size:11px;color:#859184}.m1c-legend i{display:inline-block;width:10px;height:10px;background:#90aab3;margin-right:5px}.m1c-legend i.test{background:#d4a06a}@media(max-width:600px){.m1c{padding:14px}.m1c-grid{gap:10px}.m1c-photo b{font-size:11px}.m1c-photo small{font-size:9px}}</style>';
const well='<svg viewBox="0 0 720 300" role="img" aria-label="钻头破岩、岩屑沿环空返出，以及迟到时间造成深度偏移的示意"><defs><pattern id="m1-rock-dots" width="15" height="15" patternUnits="userSpaceOnUse"><circle cx="4" cy="5" r="1.5" fill="#bda384" opacity=".5"/></pattern></defs><path d="M38 82 259 56 355 98 135 129Z" fill="#e1c6a1"/><path d="M38 82v148l97 42V129Z" fill="#ccb392"/><path d="M135 129 355 98v148l-220 26Z" fill="#e7d7bd"/><path d="M135 174 355 145v35l-220 29Z" fill="#b7b6a2"/><path d="M135 232 355 204v30l-220 29Z" fill="#b9a088"/><path d="M135 129 355 98v148l-220 26Z" fill="url(#m1-rock-dots)"/><path d="M196 40V231" stroke="#7e8178" stroke-width="19"/><path d="M196 40V231" stroke="#fff6dc" stroke-width="8"/><path d="M188 229h16l-8 20Z" fill="#74818a"/><path d="M221 223V85q0-30 35-30h83" fill="none" stroke="#dbaa66" stroke-width="7"/><path d="m327 47 12 8-12 8" fill="none" stroke="#dbaa66" stroke-width="4"/><text x="45" y="33" fill="#8e7453" font-size="13">① 钻头破岩</text><text x="255" y="32" fill="#8e7453" font-size="13">② 钻井液携带岩屑上返</text><text x="406" y="74" fill="#36596a" font-size="17">③ 地面样品存在“迟到”</text><text x="406" y="112" fill="#7f8c84" font-size="13">钻头此刻深度：3200 m</text><text x="406" y="144" fill="#7f8c84" font-size="13">假设钻速：12 m/h；迟到：30 分钟</text><rect x="402" y="171" width="280" height="65" rx="10" fill="#e1edf0"/><text x="420" y="196" fill="#527f91" font-size="13">样品来源深度的简化示意</text><text x="420" y="221" fill="#527f91" font-size="16">3200 − 12 × 30 ÷ 60 = 3194 m</text><text x="401" y="268" fill="#a19b83" font-size="11">教学设定；实际迟到校正需结合井眼、钻具与循环条件。</text></svg>';
const split='<svg viewBox="0 0 700 215" role="img" aria-label="按20米井段分组的开发组与留出组类别数量">'+data.classes.map((c,i)=>{const ref=data.samples.filter(s=>s.classId===c.id&&s.split==='reference').length,tst=data.samples.filter(s=>s.classId===c.id&&s.split==='test').length;return '<text x="0" y="'+(32+i*65)+'" fill="#687f85" font-size="13">'+c.name+'</text><rect x="125" y="'+(10+i*65)+'" width="'+ref*15+'" height="31" rx="4" fill="#90aab3"/><rect x="'+(125+ref*15)+'" y="'+(10+i*65)+'" width="'+tst*15+'" height="31" rx="4" fill="#d4a06a"/><text x="'+(140+(ref+tst)*15)+'" y="'+(31+i*65)+'" fill="#999b87" font-size="12">'+ref+' 开发 / '+tst+' 留出</text>';}).join('')+'</svg>';
const workflow='<svg viewBox="0 0 1050 180" role="img" aria-label="从同一批照片到CNN候选记录的六步流程">'+flowContent.map((s,i)=>{const x=i*175;return '<g transform="translate('+x+',12)"><rect width="165" height="146" rx="10" fill="#fff9ee" stroke="#e4d6c0"/><text x="13" y="33" font-size="21" fill="#c59562">0'+(i+1)+'</text><text x="13" y="68" font-size="12" fill="#365261">'+s.name+'</text><text x="13" y="99" font-size="11" fill="#869084">'+['井 2 的批次场景','裁切与标签对应','42 / 24 成组划分','传统观察与 CNN','两组实际结果','沿井深导出结果'][i]+'</text></g>';}).join('')+'</svg>';
const feature='<svg viewBox="0 0 720 130" role="img" aria-label="辅助识别使用固定 ResNet-18 图像特征和三类分类层"><text x="0" y="20" fill="#8d866c" font-size="13">整理完成的照片，进入辅助识别</text>'+['224×224 照片','固定 ResNet-18','三类分类得分','井深上的岩性对照'].map((label,i)=>'<g transform="translate('+(i*180)+',42)"><rect width="164" height="55" rx="8" fill="'+['#ead8bb','#c9dadd','#dcd9c0','#d3dfd0'][i]+'"/><text x="12" y="32" fill="#365261" font-size="12">'+label+'</text></g>').join('')+'</svg>';
const definition={id:'m1-cuttings',sceneId:'m1',title:'岩屑岩性辅助识别',methods:['cv'],version:'3.0.0',updated:'2026-10-30',status:'ready',tabs:{
background:null,
workflow:{label:'案例流程',title:'同一批岩屑，传统怎样判断，AI 改变哪一步？',lead:[teaching.scenario.setting,'六步完成批次任务，重点讲 CNN 如何接替重复的图像比较，并对照两组实际结果。'],stats:[['真实照片','66 张'],['案例流程','6 步'],['井段分组','17 组']],steps:flowContent.map(s=>({name:s.name,role:s.role,do:s.process,effect:s.output,trap:s.trap})),metrics:{title:'从场景到 CNN 分类与井深记录',html:style+'<div class="m1c">'+workflow+'</div>'+flowContent.map((s,i)=>'<h4>0'+(i+1)+' · '+s.name+'</h4><p><b>输入：</b>'+s.input+'</p><p><b>处理：</b>'+s.process+'</p><p><b>原因：</b>'+s.why+'</p><p><b>输出：</b>'+s.output+'</p>').join('')},fails:[{name:'照片与井深错位',why:'没有取样与迟到记录，无法保证照片对应正确井段。'},{name:'标签含义不清',why:'整图标签不能直接当作每颗岩屑的标签。'},{name:'相邻照片分散到不同用途',why:'相似成像条件和相邻井段会让数据代表性被高估。'}]},
demo:{mode:'page',html:'demo/lesson.html',label:'可运行示范',intro:'同一批照片，对照普通查看方式与 AI 的批量分类记录；再沿井深比较原始记录、常规颜色参照与 CNN 结果。示范回放固定实验输出，不重新训练或推理。',height:1040}
}};
// Retain the same teaching points in original-protocol HTML for older portals.

definition.tabs.background=require('./m1/background-metadata.cjs')({style,well,feature,split});
definition.tabs.background.page={html:'demo/lesson.html',view:'background',height:1040};
definition.tabs.workflow.page={html:'demo/lesson.html',view:'workflow',height:1040};
definition.tabs.demo.view='demo';
const grouped={};data.samples.forEach(s=>{if(!grouped[s.group])grouped[s.group]=[];grouped[s.group].push(s);});
const groupDiagram='<svg viewBox="0 0 820 265" role="img" aria-label="本案例实际17个20米井段分组及用途">'+Object.keys(grouped).sort((a,b)=>Number(a.split('-').pop())-Number(b.split('-').pop())).map((key,i)=>{const start=Number(key.split('-').pop()),samples=grouped[key],test=samples[0].split==='test',x=(i%6)*137,y=Math.floor(i/6)*78;return '<g transform="translate('+x+','+y+')"><rect width="126" height="65" rx="6" fill="'+(test?'#efd0a9':'#c9dadd')+'"/><text x="10" y="25" fill="#6b7e80" font-size="12">'+start+'—'+(start+19)+' m</text><text x="10" y="49" fill="#83907e" font-size="10">'+samples.length+' 张 / '+(test?'留出':'开发')+'</text></g>';}).join('')+'<text x="0" y="257" fill="#a3957a" font-size="11">整组划分：42 张开发用资料、24 张留出资料；颜色表示用途。</text></svg>';
definition.tabs.workflow.metrics.html+='<div class="m1c"><h4>第三步的真实数据：17 个井段分组，5 组留出</h4>'+groupDiagram+'</div>';
fs.writeFileSync(path.join(pack,'case.json'),JSON.stringify(definition,null,2)+'\n');
fs.writeFileSync(path.join(pack,'FIGURE-SOURCES.json'),JSON.stringify(paperFigures.manifest,null,2)+'\n');
// One directly-openable HTML document: no sibling resource reads, fetches or server needed.
const artwork='data:image/webp;base64,'+fs.readFileSync(path.join(runtime,'m1-dioramas-display.webp')).toString('base64');
let css=fs.readFileSync(path.join(__dirname,'m1/style.template.css'),'utf8');
css=css.replace(/(\.(?:hero-art|well-art|scene-art|art-vision|art-review|art-lab\.scene-art)) img/g,'$1 .art-sheet');
// Keep the small layout theme independent of the larger shared illustration.
// Both styles travel with body-only HTML previews as well as the complete page.
css+='\n.art-sheet{display:block;aspect-ratio:1;background-image:var(--m1-art-sheet);background-size:100% 100%;background-repeat:no-repeat;pointer-events:none}\n';
const artworkCSS=':root{--m1-art-sheet:url("'+artwork+'")}';
const workflowCSS=fs.readFileSync(path.join(__dirname,'m1/workflow.template.css'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'m1/demo.template.css'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'m1/teaching.template.css'),'utf8');
const appSource=fs.readFileSync(path.join(__dirname,'m1/app.template.js'),'utf8').replace('/* M1_FLOW_TEXT */ []',()=>JSON.stringify(flowContent)).replace('/* M1_TEACHING_CONTENT */ {}',()=>JSON.stringify(teaching)).replace('/* M1_TEACHING_SCRIPT */',()=>fs.readFileSync(path.join(__dirname,'m1/teaching.template.js'),'utf8')).replace('/* M1_WORKFLOW_SCRIPT */',()=>fs.readFileSync(path.join(__dirname,'m1/workflow.template.js'),'utf8')).replace('/* M1_BACKGROUND_VISUALS */',()=>fs.readFileSync(path.join(__dirname,'m1/background-visuals.template.js'),'utf8'));
let html=fs.readFileSync(path.join(__dirname,'m1/index.template.html'),'utf8');
html=html.replace('<!-- M1_DEMO -->',()=>fs.readFileSync(path.join(__dirname,'m1/demo.template.html'),'utf8'));
html=html.replace('<!-- M1_WORKFLOW -->',()=>fs.readFileSync(path.join(__dirname,'m1/workflow.template.html'),'utf8').replace('<!-- M1_WORKFLOW_NAV -->',()=>flowContent.map((s,i)=>'<button data-step="'+i+'" class="'+(s.ai?'is-ai-step':'')+'" type="button" aria-pressed="'+String(i===0)+'"><span class="journey-step-number">0'+(i+1)+'</span><strong>'+['设定场景','准备图像','井段划分','CNN 分类','结果对照','井深记录'][i]+'</strong><span class="journey-card-visual" id="flow-viz-'+i+'"><span class="journey-loading">准备中…</span></span><small>'+['同一批照片的任务','裁切与标签对应','开发组与留出组','重点 · 传统与 AI','重点 · 两种方法','输出整批结果'][i]+'</small></button>').join('')));
html=html.replace('<!-- M1_BACKGROUND -->',()=>fs.readFileSync(path.join(__dirname,'m1/background.template.html'),'utf8').replace('<!-- M1_OBSERVATIONS -->',()=>paperFigures.full()));
html=html.replace('<link rel="stylesheet" href="demo.css">',()=>'<style data-m1-style="theme">'+css.replace(/<\/style/gi,'<\\/style')+'</style>\n<style data-m1-style="workflow">'+workflowCSS+'</style>\n<style data-m1-style="artwork">'+artworkCSS+'</style>');
html=html.replace(/<img\b[^>]*\bsrc="\.\.\/assets\/m1-dioramas\.webp"[^>]*>/g,tag=>{
  const alt=/\balt="([^"]*)"/.exec(tag);
  return '<span class="art-sheet" role="img" aria-label="'+(alt?alt[1]:'教学设备插画')+'"></span>';
});
// Source URLs share a prefix. Reconstruct them on load to keep the complete,
// self-contained teaching package within the portal's browser storage budget.
const sourcePrefixes=new Set(data.samples.map(s=>s.sourceUrl.endsWith(s.sourcePath)?s.sourceUrl.slice(0,-s.sourcePath.length):null));
let datasetSource=fs.readFileSync(path.join(runtime,'data.js'),'utf8');
if(sourcePrefixes.size===1&&!sourcePrefixes.has(null)){
  const compactData=JSON.parse(JSON.stringify(data));compactData.samples.forEach(s=>{delete s.sourceUrl;});
  // Store repeated field names once; reconstruct the identical sample objects.
  const fields=Object.keys(compactData.samples[0]);
  if(!compactData.samples.every(s=>Object.keys(s).length===fields.length&&fields.every(k=>Object.hasOwn(s,k))))throw new Error('Sample fields differ');
  compactData.samples=compactData.samples.map(s=>fields.map(k=>s[k]));
  const prefix=Array.from(sourcePrefixes)[0];
  datasetSource='(function(){var d='+JSON.stringify(compactData)+',fields='+JSON.stringify(fields)+';d.samples=d.samples.map(function(row){var s={};fields.forEach(function(k,i){s[k]=row[i];});s.sourceUrl='+JSON.stringify(prefix)+'+s.sourcePath;return s;});window.M1_DATA=d;}());';
}
const scripts=[['data.js','dataset',datasetSource],['results.js','results','window.M1_RESULTS='+fs.readFileSync(path.join(runtime,'resnet-results.json'),'utf8')+';window.M1_AUDIT='+fs.readFileSync(path.join(runtime,'data-audit.json'),'utf8')+';window.M1_BASELINE='+fs.readFileSync(path.join(runtime,'color-baseline.json'),'utf8')+';'],['demo.js','app',appSource]];
scripts.forEach(([name,label,source])=>{html=html.replace('<script src="'+name+'"></script>','<script data-m1="'+label+'">'+source.replace(/<\/script/gi,'<\\/script')+'</script>');});
fs.writeFileSync(path.join(pack,'demo/lesson.html'),html);
fs.writeFileSync(path.join(runtime,'demo.css'),fs.readFileSync(path.join(__dirname,'m1/style.template.css'),'utf8')+'\n'+workflowCSS);
fs.writeFileSync(path.join(runtime,'demo.js'),appSource);
fs.copyFileSync(path.join(__dirname,'m1/tests.template.cjs'),path.join(root,'tests/m1-preview.cjs'));
const wrapper=`/* Generated from m1-cuttings-case/case.json by tools/build-m1-case.cjs. */
(function(global){'use strict';var definition=${JSON.stringify(definition)};
function attachSection(name,section){var frame=null;var tab=definition.tabs[name];
function resize(event){if(!frame||event.source!==frame.contentWindow)return;var h=event.data&&event.data.__m1Height;if(typeof h==='number'&&isFinite(h))frame.style.height=Math.max(700,Math.min(10000,h+2))+'px';}
tab.mount=function(root){tab.unmount();frame=document.createElement('iframe');frame.src='m1-cuttings-case/demo/lesson.html?v='+encodeURIComponent(definition.version)+'&embed=portal&section='+section;frame.setAttribute('title','M1 · '+tab.label);frame.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads');frame.setAttribute('referrerpolicy','no-referrer');frame.style.cssText='display:block;width:100%;height:1040px;border:0;border-radius:12px;background:#fcf6eb';global.addEventListener('message',resize);root.appendChild(frame);};
tab.unmount=function(){global.removeEventListener('message',resize);if(frame)frame.remove();frame=null;};}
['background','workflow','demo'].forEach(function(name){attachSection(name,name);});
// One canonical case identity for the site and the current standalone package.
definition.id='m1-cuttings';global.Cases.register(definition);}(window));\n`;
fs.writeFileSync(path.join(root,'assets/cases/m1-cuttings.case.js'),wrapper);
const index=path.join(root,'index.html');let indexText=fs.readFileSync(index,'utf8').replace(/(assets\/cases\/m1-cuttings\.case\.js\?v=)[^"\s]+/,(_,prefix)=>prefix+'20261030-m1case19');
indexText=indexText.replace(/(assets\/data\.js\?v=)[^"\s]+/,(_,prefix)=>prefix+'20261030-m1-data2');
['registry','case-demo-host','case-upload','shell','home','mudlogging'].forEach(name=>{indexText=indexText.replace(new RegExp('(assets/core/'+name+'\\.js\\?v=)[^"\\s]+'), (_,prefix)=>prefix+'20261030-routes7');});
indexText=indexText.replace(/(assets\/core\/mudlogging\.css\?v=)[^"\s]+/,(_,prefix)=>prefix+'20261030-ml2');
fs.writeFileSync(index,indexText);
console.log(JSON.stringify({id:definition.id,manifestBytes:Buffer.byteLength(JSON.stringify(definition)),samples:data.samples.length,reference:42,test:24}));
