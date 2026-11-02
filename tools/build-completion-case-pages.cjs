'use strict';
// Render four completion lessons into the same three-document package
// used by M1/M2. This build reads stored weights; it never trains or alters data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true}); fs.writeFileSync(path.join(root, file), value, 'utf8'); };
require('./completion/compose-layout.cjs');
const context = {window: {}};
vm.createContext(context);
for (const file of ['assets/shared-perforation/data.js','assets/shared-perforation/core.js','assets/completion/content.js','assets/completion/data.js','assets/completion/core.js','assets/completion/lessons.js']) vm.runInContext(read(file), context, {filename: file});
const W = context.window, version = '2.0.0';
assert.equal(W.COMPLETION_CONTENT.length, 4);
assert.equal(W.COMPLETION_DATA.kind, 'synthetic-teaching');
const pages = {background: 'background.html', workflow: 'workflow.html', demo: 'identify.html'};
const labels = {background: '专业背景', workflow: '案例流程', demo: '可运行示范'};

const fieldCSS = `/* Only the fitted completion figures extend the unmodified M2 lesson template. */
.cmp-mechanism,.cmp-plot,.cmp-residual,.cmp-trajectory{display:block;width:100%;height:auto}
.cmp-mechanism{margin:16px 0 8px}.cmp-mechanism text{fill:#805e48;font-size:17px}.technical-board .cmp-mechanism{max-height:370px}
.professional-svg.cmp-concept-mini{display:block;width:100%;height:auto;background:#faf4e9}.cmp-concept-mini text{fill:#805f47;stroke:none;font-size:12px}.cmp-concept-mini .ink{stroke:#b95739;stroke-width:3}.cmp-concept-mini .light{stroke:#c9b194;stroke-dasharray:5 4}.cmp-concept-mini rect{stroke:#bca38b}
.cmp-method text{fill:#805d45;font-size:14px}.cmp-method .cmp-svg-title{font-size:17px;font-weight:600}.cmp-contract>span{line-height:1.9}
.cmp-plot,.cmp-residual,.cmp-trajectory{padding:12px;border:1px solid #e2cdb9;background:#fffbf4;border-radius:6px;margin:17px 0}.cmp-plot text,.cmp-residual text,.cmp-trajectory text{fill:#8e6e56;font-size:11px}.cmp-plot .cmp-svg-title{font-size:13px;font-weight:600}.cmp-trajectory text{font-size:14px}
.cmp-why-grid>.data-table-wrap{margin-top:20px}.cmp-pair>svg{margin:0;min-width:0}.cmp-pair>article{min-width:0}.cmp-pair h3{font-size:17px}.cmp-pair .cmp-route{margin:15px 0}
.data-table-wrap{overflow-x:auto;margin:18px 0}.data-table-wrap .data-fields{min-width:0}.cmp-table th{width:29%}.cmp-table td{overflow-wrap:anywhere}.cmp-table tbody tr:nth-child(even){background:#f8efe2}
.cmp-trajectory-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:22px;align-items:start}.cmp-trajectory-grid .guide-metric-grid{grid-template-columns:1fr}.cmp-trajectory-grid .guide-metric{padding:13px 17px}.cmp-trajectory-grid .guide-metric>b{font-size:20px;margin:4px 0}
.flow-stage .guide-contract{grid-template-columns:1fr 18px 1fr;gap:10px}.flow-stage .guide-contract>span{font-size:11px}.flow-stage .cmp-mechanism text{font-size:17px}.flow-stage .fine{margin-bottom:0}.flow-layout[data-focus=ordinary] .flow-stage .cmp-mechanism{margin:0}.flow-stage .guide-metric-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.flow-nav button>b{line-height:1.7}.flow-nav button>small{line-height:1.7}.guide-records .data-fields{margin-top:15px}.cmp-controls{margin-top:22px}.professional-bridge{font-size:13px;line-height:2}.cmp-graph{display:block;width:100%;height:auto;margin:16px 0}.cmp-graph text{font-size:15px;fill:#805f47}.field-hash{overflow-wrap:anywhere}.cmp-table td{overflow-wrap:anywhere}.guide-bar{grid-template-columns:110px minmax(0,1fr) 170px}.guide-bar strong{font-size:22px;white-space:nowrap}.cmp-paper-route{overflow-wrap:anywhere}.cmp-plot{overflow:visible}.flow-stage .cmp-plot text{font-size:11px}
.difficulty-meter[data-level=high] i{background:#B95739}
`;

const client = `/* Shared state transport for the three fixed HTML documents. */
(function(){
 'use strict';
 var config=window.LESSON_CONFIG,c=window.COMPLETION_CONTENT.find(function(x){return x.caseId===config.id;}),L=window.CompletionLessons;
 var part=document.body.dataset.section,key='completion-lesson:'+c.caseId,applying=false,raf=0;
 function post(message){if(window.parent!==window)window.parent.postMessage(message,'*');}
 function height(){post({__lessonHeight:Math.ceil(document.body.getBoundingClientRect().height)});}
 function queueHeight(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;height();});}
 function remember(value){try{sessionStorage.setItem(key,JSON.stringify(value));}catch(error){}}
 function publish(value){remember(value);if(!applying)post({__lessonStateUpdate:value});queueHeight();}
 function navigate(section){var value=L.sharedState(c);publish(value);if(window.parent!==window)post({__lessonNavigate:section});else location.assign({background:'background.html',workflow:'workflow.html',demo:'identify.html'}[section]+'#experiment='+encodeURIComponent(JSON.stringify(value)));}
 var initial=null;try{var match=/^#experiment=(.*)$/.exec(location.hash||'');initial=JSON.parse(match?decodeURIComponent(match[1]):sessionStorage.getItem(key)||'null');}catch(error){}
 var cleanup=L.mount(c,part,document.querySelector('main.lesson'),{hydrate:true,initialState:initial,onState:publish,navigate:navigate});
 window.addEventListener('message',function(event){if(event.source!==window.parent||!event.data)return;var d=event.data;if(d.__lessonScrollToTop||d.__m1ScrollToTop)window.scrollTo(0,0);if(Object.prototype.hasOwnProperty.call(d,'__lessonSharedState')){applying=true;L.restore(c,d.__lessonSharedState);remember(L.sharedState(c));applying=false;queueHeight();}});
 if(window.ResizeObserver)new ResizeObserver(queueHeight).observe(document.body);
 if(window.MutationObserver)new MutationObserver(queueHeight).observe(document.querySelector('main.lesson'),{subtree:true,childList:true,attributes:true});
 window.addEventListener('load',queueHeight);window.addEventListener('resize',queueHeight);document.addEventListener('toggle',queueHeight,true);
 // The document owns its section. Restoring record/parameters never changes it.
 post({__lessonSection:part});post({__lessonStateRequest:true});queueHeight();
 window.CompletionPage={caseId:c.caseId,section:part,state:L.sessions[c.id].state,snapshot:function(){return L.snapshot(c,L.sessions[c.id].state);},cleanup:cleanup};
}());
`;

for (const c of W.COMPLETION_CONTENT) {
 const folder = c.caseId + '-case';
 const config = {id:c.caseId,sceneId:c.id,title:c.short,version,lessonProtocol:'field-pages-v2',pages,methods:c.methods,dataKind:W.COMPLETION_DATA.kind};
 write(folder + '/config.json', JSON.stringify(config,null,2)+'\n');
 write(folder + '/assets/config.js', '/* Generated package metadata. */\nwindow.LESSON_CONFIG='+JSON.stringify(config,null,2)+';\n');
 write(folder + '/assets/lesson.css', read('m2-gas-case/assets/lesson.css'));
 write(folder + '/assets/field.css', fieldCSS);
 write(folder + '/assets/lesson-client.js', client);
 const tabs = {};
 for (const [part, file] of Object.entries(pages)) {
  const title = c.short + ' · ' + labels[part];
  const scripts = ['../../assets/shared-perforation/data.js','../../assets/shared-perforation/core.js',...['content','data','core','lessons'].map(name=>'../../assets/completion/'+name+'.js')].map(src=>'<script src="'+src+'?v='+version+'"></script>').join('\n');
  const html = '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+title+'</title>\n<link rel="stylesheet" href="../assets/lesson.css?v='+version+'">\n<link rel="stylesheet" href="../assets/field.css?v='+version+'">\n</head>\n<body data-section="'+part+'" style="--accent:#B95739">\n'+W.CompletionLessons.renderPage(c,part)+'\n<noscript><p class="static-warning">图表交互需要JavaScript；当前章节由独立HTML固定，仍可阅读专业背景和流程说明。</p></noscript>\n<script src="../assets/config.js?v='+version+'"></script>\n'+scripts+'\n<script src="../assets/lesson-client.js?v='+version+'"></script>\n</body>\n</html>\n';
  write(folder + '/demo/' + file, html);
  tabs[part]={label:labels[part],html:'demo/'+file,view:part,height:1040};
 }
 write(folder + '/case.json', JSON.stringify({id:c.caseId,sceneId:c.id,title:c.short,version,updated:'2026-11-02',lessonProtocol:'field-pages-v2',status:'ready',entry:'demo/background.html',tabs,data:{kind:W.COMPLETION_DATA.kind,seed:W.COMPLETION_DATA.seed,source:'../assets/completion/data.js',provenance:'../tools/completion/provenance.json'},template:'m2-gas-case/assets/lesson.css'},null,2)+'\n');
 write(folder + '/README.md', '# '+c.id.toUpperCase()+' · '+c.short+'\n\n本案例沿用 MUDLOGGING 的 M1/M2 三页教学模板，专业背景、案例流程、可运行示范分别是三个固定 HTML 文档。只有课程外层提供三页页签；包内不重复案例导航、页签或大幅标题区。\n\n- 背景：`demo/background.html`，五个章节，含 A/B/C 专业概念图。\n- 流程：`demo/workflow.html`，01、02、03（传统）、03（AI）、04、05 六张步骤卡。\n- 示范：`demo/identify.html`，方法、原因和效果三个可视问题。\n- 元数据：`case.json`、`config.json`、`assets/config.js`。\n\n请从完整课程站点的静态 HTTP 服务访问。页面通过相对路径读取站点共享的 `assets/shared-perforation/{data,core}.js` 与 `assets/completion/{content,data,core,lessons}.js`，本目录不宣称可脱离课程根目录作为独立 ZIP 运行。全部运行所需代码和资料均为本地文件，断网后可以继续使用；外部论文链接仅供阅读。\n\n入口路由：`#/scene/'+c.id+'?case='+c.caseId+'&tab=bg`（流程 `flow`；示范 `demo`）。\n\n`field-pages-v2` 协议：页面请求 `__lessonStateRequest`，接收 `__lessonSharedState`，在修改记录、步骤或参数时发布 `__lessonStateUpdate`；发布 `__lessonNavigate`、固定文档身份 `__lessonSection` 和 `__lessonHeight`，接收 `__lessonScrollToTop`。状态含 `caseId`、数字记录索引 `record`、`recordId`、`point`、`step` 和数值参数。恢复状态只恢复资料和参数，不改变 HTML 所属页。\n\n重建：在课程根目录运行 `node tools/build-completion-case-pages.cjs`。检查：`node --test tests/completion-pages.cjs`。构建只读取既有合成教学资料和已拟合模型，不重新训练，不更改 `tools/completion/provenance.json`。\n');
}

const registry = `(function(g){
 'use strict';
 g.COMPLETION_CONTENT.forEach(function(c){
  var folder=c.caseId+'-case',definition={id:c.caseId,sceneId:c.id,title:c.short,methods:c.methods.slice(),status:'ready',version:'${version}',updated:'2026-11-02',lessonProtocol:'field-pages-v2',tabs:{}};
  [['background','专业背景','background.html'],['workflow','案例流程','workflow.html'],['demo','可运行示范','identify.html']].forEach(function(pair){
   var name=pair[0],tab={label:pair[1],page:{html:'demo/'+pair[2],view:name,height:1040}},frame=null;
   if(name==='background')tab.sections=['真实背景','技术前沿','示例数据','技术难度与参考方向','术语对照表'].map(function(title,i){return {no:i+1,title:title,body:[c.context.map(function(v){return v.join('：');}).join(' '),c.papers.map(function(p){return p.title+' '+p.boundary;}).join(' '),c.dataText,c.difficulty+' '+c.limits,c.terms.map(function(v){return v.join('：');}).join('；')][i]};});
   if(name==='workflow'){tab.title=c.title;tab.steps=g.CompletionLessons.flowSteps(c).map(function(v,i){return {number:['01','02','03','03','04','05'][i],part:i===2?'traditional':i===3?'ai':'ordinary',name:v[0],do:v[1],effect:c.output};});}
   if(name==='demo'){tab.mode='page';tab.html=tab.page.html;tab.view=name;tab.height=1040;}
   function resize(event){if(frame&&event.source===frame.contentWindow&&event.data){var h=event.data.__lessonHeight;if(typeof h==='number'&&isFinite(h))frame.style.height=Math.max(700,Math.min(14000,h+2))+'px';}}
   tab.mount=function(root){tab.unmount();frame=document.createElement('iframe');frame.src=folder+'/'+tab.page.html+'?v='+definition.version;frame.setAttribute('title',c.id.toUpperCase()+' · '+tab.label);frame.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads');frame.setAttribute('referrerpolicy','no-referrer');frame.style.cssText='display:block;width:100%;height:1040px;border:0;border-radius:10px;background:#fcf7eb';g.addEventListener('message',resize);root.appendChild(frame);};
   tab.unmount=function(){g.removeEventListener('message',resize);if(frame)frame.remove();frame=null;};definition.tabs[name]=tab;
  });g.Cases.register(definition);
 });
})(window);
`;
write('assets/cases/completion.case.js', '/* Generated by tools/build-completion-case-pages.cjs. */\n'+registry);
console.log('Completion packages: 4 cases × 3 fixed MUDLOGGING template pages; stored models unchanged.');
