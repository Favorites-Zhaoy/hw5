/* Preserve the reference's continuous illustration, in-image magnification and lifecycle. */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../..');
let source=fs.readFileSync(path.join(root,'assets/geology/stage.js'),'utf8');
function span(a,b,replacement){let i=source.indexOf(a),j=source.indexOf(b,i);if(i<0||j<0)throw Error('Template changed: '+a);source=source.slice(0,i)+replacement+'\n  '+source.slice(j);}
source=source.replaceAll('assets/images/geology/geology-process-v2','assets/images/seismic/seismic-process-v1');
span('var METHODS = [','function selected',`var METHODS=[
 {id:'',abbr:'ALL',name:'完整关系',note:'从激发接收，到资料处理、结构解释与参数预测。五个任务共享或互补资料，编号不表示运行顺序。'},
 {id:'cv',abbr:'CV',name:'计算机视觉',note:'看反射的组织、错断和残差。S1、S2、S4、S5使用图面或局部波形邻域，但各自目标不同。'},
 {id:'ts',abbr:'TS',name:'时序分析',note:'S3定位炮集各道最早起跳；时间邻域与低分道复核共同支持初至拾取。'},
 {id:'opt',abbr:'OPT',name:'约束优化',note:'S4结合井约束比较参数候选。输出依赖波子、尺度与先验，需检查残差和多解性。'}];
 var TECH=[
 {id:'s1',method:'cv',methods:['cv'],color:'#b95739',box:[2,447,281,309],art:[5,503,275,247],input:'三维振幅邻域',output:'断层得分与复核候选'},
 {id:'s2',method:'cv',methods:['cv'],color:'#497d99',box:[291,447,286,309],art:[295,503,276,247],input:'F3剖面与解释方案',output:'相类候选与分歧区域'},
 {id:'s3',method:'ts',methods:['ts'],color:'#8b65a0',box:[584,447,273,309],art:[590,503,263,247],input:'有采样基准的炮集',output:'逐道初至与复核记录'},
 {id:'s4',method:'cv',methods:['cv','opt'],color:'#6b884b',box:[864,447,287,309],art:[870,503,277,247],input:'地震响应与井约束',output:'带条件的参数候选'},
 {id:'s5',method:'cv',methods:['cv'],color:'#3a8c8a',box:[1159,447,287,309],art:[1165,503,277,247],input:'含噪剖面与实验参考',output:'去噪图、残差与保真比较'}];
 function relevant(t,focus){return t.methods.indexOf(focus)>=0;}
 function lessonIntro(t,sc){var c=global.SEISMIC_CONTENT.find(function(c){return c.id===t.id;});return c?c.intro:sc.point;}`);
span('function effect(t) {','function sceneHref',`function effect(t){
 var shapes={s1:'<path class="ml-trace ml-trace-drill" d="M180 61l-17 48-30 37-11 51"/>',s2:'<path class="ml-trace ml-trace-vision" d="M34 66h161v107H34z"/><path class="ml-monitor-scan" d="M35 66v107"/>',s3:'<path class="ml-trace ml-trace-rpm" d="M34 132l26-14 26-23 27-24 26 18 28 22 29 16"/>',s4:'<path class="ml-trace ml-trace-gas" d="M216 77l-6 18 12 17-17 22 16 20-11 22"/>',s5:'<path class="ml-trace ml-trace-vision" d="M103 65h71v108h-71z"/><path class="ml-monitor-scan" d="M104 65v108"/>'};
 return '<svg class="ml-tech-effect" viewBox="0 0 '+t.box[2]+' '+t.box[3]+'" aria-hidden="true">'+shapes[t.id]+'</svg>';}`);
span('function sceneHref(id) {','function spot',`function sceneHref(id){var c=global.SEISMIC_CONTENT.find(function(c){return c.id===id;});return '#/scene/'+id+'?case='+c.caseId+'&amp;tab=bg';}`);
span('function drawing() {','function deck',`function drawing(){return '<svg class="ml-flows" data-ml-motion viewBox="0 0 1448 1086" aria-hidden="true">'+
 flow('M470 367V400H150V445','#d68850',5,'s1')+flow('M480 367V414H433V445','#639bb5',5,'s2')+
 flow('M870 367V410H717V445','#a280b9',5,'s3')+flow('M900 367V414H1300V445','#62a6a5',5,'s5')+
 flow('M471 367H1000V445','#8baf65',6,'s4')+
 flow('M150 758V787H501V831','#d68850',6,'s1')+flow('M433 758V805H532V831','#639bb5',6,'s2')+flow('M1000 758V802H621V831','#8baf65',6,'s4')+'</svg>';}`);
source=source.replaceAll("assets/images/geology/'+name+'.webp","assets/images/seismic/'+name+'.webp");
source=source.replaceAll('global.GEOLOGY_CONTENT','global.SEISMIC_CONTENT').replaceAll('global.GeologyStage','global.SeismicStage').replaceAll('global.GeologyMath','global.SeismicMath');
source=source.replaceAll('data-geo-stage','data-seismic-stage').replaceAll('ml-page gl-stage','ml-page sx-stage').replaceAll('#/stage/geology','#/stage/seismic');
source=source.replaceAll('更多地质勘察场景','更多物探场景').replaceAll('01 / 13','02 / 13').replaceAll('GEOLOGICAL SURVEY · 地质勘察','GEOPHYSICS · 物探').replaceAll('<span class="cur">地质勘察</span>','<span class="cur">物探</span>');
source=source.replaceAll('从地表线索，拼出地质底图','从地震记录，读出地下线索').replaceAll('跟着影像、采样、图件与露头，看看智能方法在哪里发挥作用。','先认识采集、处理、解释与预测，再看每种方法具体接手哪一步。').replaceAll('地质勘察现场交互总览','物探现场交互总览');
source=source.replaceAll('地质勘察流程：区域调查获取影像、样品、图件与露头照片，遥感解译、化探聚类、图件语义提取与裂缝统计汇入地质底图。','物探关系图：激发与接收形成炮集，初至与噪声处理提供可用资料；反射图用于断层和相类解释，参数预测另需井约束。');
const a=source.indexOf("'<div class=\"ml-map-footer\"");const b=source.indexOf("'<section class=\"ml-reading",a);
if(a<0||b<0)throw Error('Footer template changed');
source=source.slice(0,a)+`'<div class="ml-map-footer"><span>采集记录 → 处理资料 → 解释与预测</span><p>断层与地震相是互补解释；初至与去噪是可按需组合的处理任务；参数预测另需井约束。S1—S5为案例编号。</p></div></section>'+\n      `+source.slice(b);
fs.writeFileSync(path.join(root,'assets/seismic/stage.js'),source);
console.log('Seismic stage: reference component, five branches, CV/TS/OPT.');
