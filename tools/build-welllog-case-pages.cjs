/* Rebuild only the W1–W5 M2-template documents. This never trains or edits data. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const version='2.0.0';
const packages={
 w1:'w1-layer-case',
 w2:'w2-porosity-case',
 w3:'w3-fracture-case',
 w4:'w4-lithology-case',
 w5:'w5-repair-case'
};
const files={background:'background.html',workflow:'workflow.html',demo:'identify.html'};
const labels={background:'专业背景',workflow:'案例流程',demo:'可运行示范'};
const w={WELLLOG_PAGE_CONFIG:{assetBase:'../../assets/welllog/'}};
const ctx={window:w};
for(const name of ['content','data','models','core','lessons']){
 vm.runInNewContext(fs.readFileSync(path.join(root,'assets/welllog',name+'.js'),'utf8'),ctx,{filename:name+'.js'});
}
const C=w.WELLLOG_CONTENT;
const css='/* Only numerical-view adapters; layout and typography are the existing M2 template. */\n'+
'.wl-chart,.wl-tracks,.wl-neighborhood,.wl-window,.wl-network{display:block;width:100%;height:auto;margin:14px 0}.wl-tracks{max-height:620px}.wl-chart text,.wl-tracks text,.wl-neighborhood text,.wl-window text{font-family:"Microsoft YaHei",sans-serif;fill:#8a6b53}.wl-chart text{font-size:12px}.wl-tracks text{font-size:13px}.wl-neighborhood text{font-size:16px}.wl-window text{font-size:13px}.wl-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:20px 0}.wl-three>article{min-width:0;background:#f3e8da;border:1px solid #dfc8ad;border-radius:6px;padding:15px}.wl-three h4{font-size:15px;line-height:1.7;color:#805b41;margin:0 0 13px}.wl-image{display:block;width:100%;height:auto;image-rendering:pixelated;border:1px solid #cdb18f;background:#e4cfb0}.flow-stage>.wl-image,.flow-stage #flow-visual>.wl-image{max-width:480px;margin:0 auto}.wl-scores{margin:20px 0}.wl-scores>div{display:grid;grid-template-columns:80px minmax(0,1fr) 70px;gap:12px;align-items:center;margin:12px 0;font-size:12px;color:#8a6b53}.wl-scores i{height:10px;background:#eddcc6}.wl-scores i b{display:block;height:100%}.wl-scores strong{text-align:right;color:#923f2c}.wl-input-tags{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.wl-input-tags>span{background:#f5e2cd;border:1px solid #dfc0a0;border-radius:5px;padding:10px;font-size:11px;color:#99765c}.wl-input-tags b{display:block;margin-top:6px;color:#923f2c;font-size:14px}.wl-equation{font:25px/1.8 Georgia,"Microsoft YaHei",serif;color:#923f2c;padding:24px 10px}.wl-contract{display:grid;grid-template-columns:1fr 20px 1fr;gap:16px;align-items:center;background:#ede3d1;padding:18px;font-size:12px;color:#8d6a4c}.field-hash{font:11px/1.8 ui-monospace,monospace;overflow-wrap:anywhere}.field-step-controls[hidden]{display:none}.field-step-controls{margin-bottom:22px}.guide-bar{grid-template-columns:145px minmax(0,1fr) 170px}.guide-bar>strong{font-size:21px;white-space:nowrap}.guide-evidence-pair .data-fields{font-size:11px}.guide-evidence-pair .wl-network text{font-size:12px}.guide-caption{overflow-wrap:anywhere}.professional-svg{min-width:0}.professional-svg text{font-size:13px}.flow-stage .wl-current-table{background:#fff9ef}.lab-control-panel{padding:18px 20px;border:1px solid #dfc8ad;border-radius:7px;background:#f7ecdf}.lab-control-panel .lab-control-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lab-slider{margin:10px 0}.data-preview .guide-metric-grid{margin-bottom:0}.static-warning{max-width:1150px;margin:20px auto;padding:15px 25px;color:#8a6b53}\n';
function write(p,content){const abs=path.join(root,p);fs.mkdirSync(path.dirname(abs),{recursive:true});fs.writeFileSync(abs,content,'utf8');}
function definition(c){
 const d={id:c.caseId,sceneId:c.id,title:c.title,methods:c.methods,version,updated:'2026-11-02',status:'ready',lessonProtocol:'field-pages-v2',sourcePackage:packages[c.id],tabs:{}};
 d.tabs.background={label:labels.background,lede:c.scenario,sections:['真实背景','技术前沿','示例数据','技术难度与参考方向','术语对照表'].map((title,i)=>({no:i+1,title,body:[c.topics.map(v=>v.join('：')).join('；'),c.papers.map(v=>v.title).join('；'),c.data,c.difficulty,c.terms.map(v=>v.join('：')).join('；')][i]})),page:{html:'demo/background.html',view:'background',height:1040}};
 d.tabs.workflow={label:labels.workflow,title:c.scenario,lead:[c.scenario],stats:[['流程','5步 · 03含两部分'],['核心算法',c.algorithm],['资料','合成教学 / 按来源留出']],steps:w.WelllogLessons.flowSteps(c).map((v,i)=>({number:['01','02','03','03','04','05'][i],part:i===2?'traditional':i===3?'ai':null,name:v[0],do:v[1],effect:v[2],trap:c.limit})),page:{html:'demo/workflow.html',view:'workflow',height:1040}};
 d.tabs.demo={label:labels.demo,mode:'page',html:'demo/identify.html',view:'demo',height:1040,intro:c.why};
 return d;
}
const defs=[];
for(const c of C){
 const folder=packages[c.id],def=definition(c);defs.push(def);
 const config={sceneId:c.id,caseId:c.caseId,title:c.title,version,lessonProtocol:'field-pages-v2',assetBase:'../../assets/welllog/',template:'m2-gas-case/assets/lesson.css',dataKind:w.WELLLOG_DATA.kind,modelSha256:w.WELLLOG_DATA.modelSha256};
 write(folder+'/assets/config.js','window.WELLLOG_PAGE_CONFIG='+JSON.stringify(config)+';\n');
 write(folder+'/assets/case.css',css+'.wl-response-input{display:block;width:100%;height:auto;margin:18px 0}.wl-response-input text{font:14px "Microsoft YaHei",sans-serif;fill:#8a6b53}\n');
 write(folder+'/assets/client.js',"(function(){'use strict';window.WelllogLessons.initFrame(window.WELLLOG_PAGE_CONFIG);})();\n");
 write(folder+'/case.json',JSON.stringify(def,null,2)+'\n');
 for(const section of Object.keys(files)){
  const main=w.WelllogLessons.renderPage(c,section);
  const scripts=['../assets/config.js',...['content','data','models','core','lessons'].map(n=>'../../assets/welllog/'+n+'.js'),'../assets/client.js'].map(src=>'<script src="'+src+'?v='+version+'"></script>').join('');
  const html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+c.title+' · '+labels[section]+'</title><link rel="stylesheet" href="../../m2-gas-case/assets/lesson.css?v=20261102-field-templates2"><link rel="stylesheet" href="../assets/case.css?v='+version+'"></head><body data-section="'+section+'" data-scene="'+c.id+'" style="--accent:#B95739"><main class="lesson" data-welllog-case="'+c.id+'">'+main+'</main><noscript><p class="static-warning">图表交互需要JavaScript；当前章节由独立HTML固定，专业解释与默认计算结果仍可阅读。</p></noscript>'+scripts+'</body></html>\n';
  write(folder+'/demo/'+files[section],html);
 }
 const route='#/scene/'+c.id+'?case='+c.caseId;
 const readme=['# '+c.id.toUpperCase()+' · '+c.title,'',
  'This package follows the existing M2 MUDLOGGING lesson template. The parent owns the only three tabs; these documents do not add a second tab or case navigation.','',
  '- Background: demo/background.html',
  '- Workflow: demo/workflow.html (01 / 02 / 03 traditional / 03 AI / 04 / 05)',
  '- Runnable demonstration: demo/identify.html (method / why / effects)','',
  'Parent routes:','',
  '- '+route+'&tab=bg',
  '- '+route+'&tab=flow',
  '- '+route+'&tab=demo','',
  'Build: node tools/build-welllog-case-pages.cjs','',
  'Shared template: ../../m2-gas-case/assets/lesson.css. Package assets/case.css only adapts the numerical SVG views.',
  'Input, frozen models, provenance and inference: ../../assets/welllog/{content,data,models,core,lessons}.js.',
  'No retraining or data transformation occurs during this build. Data and labels remain synthetic teaching records.','',
  'Frame protocol: field-pages-v2. On initial load the document announces its own body data-section with __lessonSection, then requests shared state. __lessonSharedState restores the source ID and numerical controls; edits publish __lessonStateUpdate. __lessonNavigate asks the outer tab set to navigate. __lessonHeight resizes the same sandboxed iframe used by M2. Both __lessonScrollToTop and __m1ScrollToTop are honored.',
  'Direct standalone navigation carries the state in #experiment= so the three fixed documents share the same input without browser storage.','',
  'Model SHA-256: '+w.WELLLOG_DATA.modelSha256,''].join('\n');
 write(folder+'/README.md',readme);
}
const registry="/* Generated by tools/build-welllog-case-pages.cjs. */\n(function(g){'use strict';var definitions="+JSON.stringify(defs)+";definitions.forEach(function(def){var sc=g.ATLAS&&g.ATLAS.index.byScene[def.sceneId];if(sc)sc.demo=true;['background','workflow','demo'].forEach(function(name){var tab=def.tabs[name],frame=null;function resize(event){if(frame&&event.source===frame.contentWindow&&event.data){var h=event.data.__lessonHeight;if(typeof h==='number'&&isFinite(h))frame.style.height=Math.max(700,Math.min(14000,h+2))+'px';}}tab.mount=function(root){tab.unmount();frame=document.createElement('iframe');frame.src=def.sourcePackage+'/'+(tab.page?tab.page.html:tab.html)+'?v='+def.version;frame.setAttribute('title',def.sceneId.toUpperCase()+' · '+tab.label);frame.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads');frame.setAttribute('referrerpolicy','no-referrer');frame.style.cssText='display:block;width:100%;height:1040px;border:0;border-radius:10px;background:#fcf7eb';g.addEventListener('message',resize);root.appendChild(frame);};tab.unmount=function(){g.removeEventListener('message',resize);if(frame)frame.remove();frame=null;};});g.Cases.register(def);});})(window);\n";
write('assets/cases/welllog.case.js',registry);
console.log('Built '+C.length+' welllog packages / '+(C.length*3)+' M2-template documents; data and frozen models unchanged.');
