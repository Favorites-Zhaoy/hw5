'use strict';
// Static package build: reads stored weights. Training is an explicit separate command.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),write=(file,value)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),value,'utf8');};
const scripts=['content','core','data','lesson-figures','lessons'],context={window:{}};vm.createContext(context);for(const name of scripts)vm.runInContext(read('assets/cementing/'+name+'.js'),context,{filename:name+'.js'});
const W=context.window,version='2.0.0',pages={background:'background.html',workflow:'workflow.html',demo:'identify.html'},labels={background:'专业背景',workflow:'案例流程',demo:'可运行示范'};
assert.equal(W.CEMENTING_CONTENT.length,4);assert.equal(W.CEMENTING_DATA.kind,'synthetic-teaching');
const fieldCSS=`/* Only the case-specific figures extend the unmodified M2 lesson template. */
.cem-mechanism,.cem-plot,.cem-bond,.cem-placement{display:block;width:100%;height:auto}.cem-mechanism{margin:16px 0 8px}.cem-mechanism text{fill:#805e48;stroke:none;font-size:17px}.technical-board .cem-mechanism{max-height:370px}
.professional-svg.cem-concept-mini{display:block;width:100%;height:auto;background:#faf4e9}.cem-concept-mini text{fill:#805f47;stroke:none;font-size:12px}.cem-concept-mini .ink{stroke:#b95739;stroke-width:3}.cem-concept-mini .light{stroke:#c9b194;stroke-dasharray:5 4}.cem-concept-mini rect{stroke:#bca38b}
.cem-method text{fill:#805d45;font-size:14px}.cem-method .cem-svg-title{font-size:17px;font-weight:600}.cem-contract>span{line-height:1.9}
.cem-plot,.cem-bond,.cem-placement{padding:12px;border:1px solid #e2cdb9;background:#fffbf4;border-radius:6px;margin:17px 0}.cem-plot text{fill:#8e6e56;font-size:11px}.cem-plot .cem-svg-title{font-size:13px;font-weight:600}.cem-bond text,.cem-placement text{fill:#8e6e56;font-size:13px}
.cem-pair>svg{margin:0;min-width:0}.cem-pair>article{min-width:0}.cem-pair h3{font-size:17px}.cem-pair .cem-route{margin:15px 0}.cem-pair .guide-metric-grid{grid-template-columns:1fr}.cem-pair .guide-metric{padding:13px 17px}.cem-pair .guide-metric>b{font-size:20px;margin:4px 0}
.data-table-wrap{overflow-x:auto;margin:18px 0}.data-table-wrap .data-fields{min-width:0}.cem-table th{width:29%}.cem-table td{overflow-wrap:anywhere}.cem-table tbody tr:nth-child(even){background:#f8efe2}.cem-confusion caption{text-align:left;font-size:12px;color:#8e6e56;padding-bottom:12px}.cem-confusion .cem-correct{background:#dbe8dc}.cem-confusion .cem-error{background:#f3ddcb}
.flow-stage .guide-contract{grid-template-columns:1fr 18px 1fr;gap:10px}.flow-stage .guide-contract>span{font-size:11px}.flow-stage .cem-mechanism text{font-size:17px}.flow-stage .fine{margin-bottom:0}.flow-layout[data-focus=ordinary] .flow-stage .cem-mechanism{margin:0}.flow-stage .guide-metric-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
.flow-nav button>b{line-height:1.7}.flow-nav button>small{line-height:1.7}.guide-records .data-fields{margin-top:15px}.cem-controls{margin-top:22px}.professional-bridge{font-size:13px;line-height:2}
`;
const client=`/* Shared state transport for three independent fixed HTML documents. */
(function(){
 'use strict';
 var config=window.LESSON_CONFIG,c=window.CEMENTING_CONTENT.find(function(x){return x.caseId===config.id;}),L=window.CementingLessons;
 var part=document.body.dataset.section,key='cementing-lesson:'+c.caseId,applying=false,raf=0;
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
 post({__lessonSection:part});post({__lessonStateRequest:true});queueHeight();
 window.CementingPage={caseId:c.caseId,section:part,state:L.sessions[c.id].state,snapshot:function(){return L.snapshot(c,L.sessions[c.id].state);},cleanup:cleanup};
}());
`;
for(const c of W.CEMENTING_CONTENT){const folder=c.caseId+'-case',config={id:c.caseId,sceneId:c.id,title:c.short,version,lessonProtocol:'field-pages-v2',pages,methods:c.methods,dataKind:W.CEMENTING_DATA.kind};
 write(folder+'/config.json',JSON.stringify(config,null,2)+'\n');write(folder+'/assets/config.js','/* Generated package metadata. */\nwindow.LESSON_CONFIG='+JSON.stringify(config,null,2)+';\n');write(folder+'/assets/lesson.css',read('m2-gas-case/assets/lesson.css'));write(folder+'/assets/field.css',fieldCSS);write(folder+'/assets/lesson-client.js',client);const tabs={};
 for(const [part,file] of Object.entries(pages)){const title=c.short+' · '+labels[part],tags=scripts.map(name=>'<script src="../../assets/cementing/'+name+'.js?v='+version+'"></script>').join('\n');const html='<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+title+'</title>\n<link rel="stylesheet" href="../assets/lesson.css?v='+version+'">\n<link rel="stylesheet" href="../assets/field.css?v='+version+'">\n</head>\n<body data-section="'+part+'" style="--accent:#B95739">\n'+W.CementingLessons.renderPage(c,part)+'\n<noscript><p class="static-warning">图表交互需要JavaScript；当前章节由独立HTML固定，仍可阅读专业背景和流程说明。</p></noscript>\n<script src="../assets/config.js?v='+version+'"></script>\n'+tags+'\n<script src="../assets/lesson-client.js?v='+version+'"></script>\n</body>\n</html>\n';write(folder+'/demo/'+file,html);tabs[part]={label:labels[part],html:'demo/'+file,view:part,height:1040};}
 write(folder+'/case.json',JSON.stringify({id:c.caseId,sceneId:c.id,title:c.short,version,updated:'2026-11-02',lessonProtocol:'field-pages-v2',status:'ready',entry:'demo/background.html',tabs,data:{kind:W.CEMENTING_DATA.kind,seed:W.CEMENTING_DATA.seed,source:'../assets/cementing/data.js',provenance:'../tools/cementing/provenance.json'},template:'m2-gas-case/assets/lesson.css'},null,2)+'\n');
 write(folder+'/README.md','# '+c.id.toUpperCase()+' · '+c.short+'\n\n沿用MUDLOGGING的M1/M2三页教学模板。背景、流程和示范分别是固定HTML文档，三页之间保留同一份资料和参数。只有课程外层提供案例导航与页签。\n\n- `demo/background.html`：五章背景，含A/B/C专业原理图、近期文献、示例资料、难度与术语。\n- `demo/workflow.html`：01、02、03传统、03AI、04、05六张步骤卡。\n- `demo/identify.html`：方法是什么、为什么有效、效果如何三个可视问题。\n- `assets/lesson.css`：与M2模板逐字节相同；`field.css`只补充案例图表。\n\n请从完整课程的静态HTTP服务访问，共享脚本通过相对路径读取；本目录不宣称可脱离课程根目录作为独立ZIP运行。全部模型推断和图表在浏览器本地执行，运行不依赖外部API。外部DOI与专业词典链接供延伸阅读。\n\n入口：`#/scene/'+c.id+'?case='+c.caseId+'&tab=bg`；流程`flow`，示范`demo`。\n\n`field-pages-v2`：请求`__lessonStateRequest`，接收`__lessonSharedState`；更改资料和参数发布`__lessonStateUpdate`，跳转发布`__lessonNavigate`，固定文档身份为`__lessonSection`。高度由当前iframe发送`__lessonHeight`，注册器仅接受来自该frame的高度。接收`__lessonScrollToTop`重置到顶部；恢复状态不会改变HTML所属章节。\n\n全部资料均为合成教学数据。'+c.limits+'\n\n重建页面：`node tools/build-cementing-case-pages.cjs`（只读取存储权重）。显式重现训练：`node tools/cementing/prepare-models.cjs`。模型来源：`tools/cementing/provenance.json`。数值、DOM与协议检查：`node --test tests/cementing*.cjs`。\n');
}
const registry=`(function(g){
 'use strict';
 g.CEMENTING_CONTENT.forEach(function(c){
  var folder=c.caseId+'-case',definition={id:c.caseId,sceneId:c.id,title:c.short,methods:c.methods.slice(),status:'ready',version:'${version}',updated:'2026-11-02',lessonProtocol:'field-pages-v2',tabs:{}};
  [['background','专业背景','background.html'],['workflow','案例流程','workflow.html'],['demo','可运行示范','identify.html']].forEach(function(pair){
   var name=pair[0],tab={label:pair[1],page:{html:'demo/'+pair[2],view:name,height:1040}},frame=null;
   if(name==='background')tab.sections=['真实背景','技术前沿','示例数据','技术难度与参考方向','术语对照表'].map(function(title,i){return {no:i+1,title:title,body:[c.context.map(function(v){return v.join('：');}).join(' '),c.papers.map(function(p){return p.title+' '+p.boundary;}).join(' '),c.dataText,c.difficulty+' '+c.limits,c.terms.map(function(v){return v.join('：');}).join('；')][i]};});
   if(name==='workflow'){tab.title=c.title;tab.steps=g.CementingLessons.flowSteps(c).map(function(v,i){return {number:['01','02','03','03','04','05'][i],part:i===2?'traditional':i===3?'ai':'ordinary',name:v[0],do:v[1],effect:c.output};});}
   if(name==='demo'){tab.mode='page';tab.html=tab.page.html;tab.view=name;tab.height=1040;}
   function resize(event){if(frame&&event.source===frame.contentWindow&&event.data){var h=event.data.__lessonHeight;if(typeof h==='number'&&isFinite(h))frame.style.height=Math.max(700,Math.min(14000,h+2))+'px';}}
   tab.mount=function(root){tab.unmount();frame=document.createElement('iframe');frame.src=folder+'/'+tab.page.html+'?v='+definition.version;frame.setAttribute('title',c.id.toUpperCase()+' · '+tab.label);frame.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads');frame.setAttribute('referrerpolicy','no-referrer');frame.style.cssText='display:block;width:100%;height:1040px;border:0;border-radius:10px;background:#fcf7eb';g.addEventListener('message',resize);root.appendChild(frame);};
   tab.unmount=function(){g.removeEventListener('message',resize);if(frame)frame.remove();frame=null;};definition.tabs[name]=tab;
  });g.Cases.register(definition);
 });
})(window);
`;
write('assets/cases/cementing.case.js','/* Generated by tools/build-cementing-case-pages.cjs. */\n'+registry);
console.log('Cementing packages: 4 cases × 3 fixed MUDLOGGING template pages; stored models unchanged.');
