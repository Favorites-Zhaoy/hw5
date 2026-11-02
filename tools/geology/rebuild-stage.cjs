/* Derive the survey stage from the actual maintained mud-logging component. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
let source=fs.readFileSync(path.join(root,'assets/core/mudlogging.js'),'utf8');
function span(start,end,replacement){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0)throw Error('Template boundary missing: '+start);source=source.slice(0,a)+replacement+'\n  '+source.slice(b);}
source=source.replace(/assets\/images\/mudlogging-process-small\.webp/g,'assets/images/geology/geology-process-v2-small.webp').replace(/assets\/images\/mudlogging-process\.webp/g,'assets/images/geology/geology-process-v2.webp');
span('var METHODS = [','function selected',`var METHODS = [
    { id:'',abbr:'ALL',name:'完整流程',note:'从区域调查，到多源识别，再到同一坐标下的地质证据汇总。' },
    { id:'cv',abbr:'CV',name:'计算机视觉',note:'看影像、读图面、量裂缝。g1、g3、g4 已放大，点击图画进入对应讲解。' },
    { id:'opt',abbr:'OPT',name:'优化算法',note:'把多指标异常放回采样网格。g2 已放大，查看异常识别与空间聚类。' },
    { id:'nlp',abbr:'NLP',name:'自然语言处理',note:'把图例原文转为可追溯的岩性属性。g3 已放大，查看CV与NLP如何接力。' }
  ];
  var TECH = [
    {id:'g1',method:'cv',methods:['cv'],title:'遥感中的地表线索',color:'#f28a24',box:[20,326,343,353],art:[20,442,343,237],input:'同一网格的多光谱影像',output:'地表单元与边界候选'},
    {id:'g2',method:'opt',methods:['opt'],title:'采样点里的组合异常',color:'#2d9ed8',box:[378,326,343,353],art:[378,442,343,237],input:'带坐标的多指标化探值',output:'异常簇与复采候选'},
    {id:'g3',method:'cv',methods:['cv','nlp'],title:'从像素到有语义的要素',color:'#9262ce',box:[733,326,342,353],art:[733,442,342,237],input:'扫描地质图与图例原文',output:'断层折线、字符与岩性属性'},
    {id:'g4',method:'cv',methods:['cv'],title:'露头裂缝的二维几何',color:'#4b9b68',box:[1088,326,343,353],art:[1088,442,343,237],input:'带尺度的正射露头照片',output:'线迹、面内方向与密度'}
  ];
  function relevant(t,focus){return t.methods.indexOf(focus)>=0;}
  function lessonIntro(t,sc){
    var lesson=(global.GEOLOGY_CONTENT||[]).find(function(c){return c.id===t.id;});
    return lesson ? lesson.intro : sc.point;
  }`);
span('function effect(t) {','function sceneHref',`function effect(t) {
    var shapes={
      g1:'<path class="ml-trace ml-trace-vision" d="M174 138h142v93H174z"/><path class="ml-monitor-scan" d="M174 138v93"/><path class="ml-crosshair" d="M228 179h25m-12-12v24"/>',
      g2:'<g class="ml-uv-glow"><circle cx="187" cy="228" r="8"/><circle cx="212" cy="242" r="7"/><circle cx="175" cy="247" r="5"/></g><path class="ml-trace ml-trace-gas" d="M106 253l16-8 18-24 15 9 22-35 18 16 25-18 14 20"/>',
      g3:'<path class="ml-trace ml-trace-vision" d="M104 183h128v74H104z"/><g class="ml-report-lines"><path d="M126 204h85m-85 16h70m-70 16h78"/></g><path class="ml-trace ml-trace-rpm" d="M115 252l25-23 23 7 21-29 31 16"/>',
      g4:'<path class="ml-trace ml-trace-drill" d="M62 166l13 41-8 35 22 39m17-128-8 54 25 31-7 35m-68-67 68 6 17-14"/><circle class="ml-report-pulse" cx="220" cy="234" r="26"/>'
    };
    return '<svg class="ml-tech-effect" viewBox="0 0 '+t.box[2]+' '+t.box[3]+'" aria-hidden="true">'+shapes[t.id]+'</svg>';
  }`);
span('function sceneHref(id) {','function spot',`function sceneHref(id) {
    var lesson={g1:'g1-remote-sensing',g2:'g2-geochemistry',g3:'g3-map-extraction',g4:'g4-outcrop-fractures'}[id];
    return '#/scene/'+id+'?case='+lesson+'&amp;tab=bg';
  }`);
span('function drawing() {','function deck',`function drawing() {
    return '<svg class="ml-flows" data-ml-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+
      flow('M658 264V296H195Q178 296 178 322','#58b6ee',4.8,'g1')+
      flow('M658 264V296H548V322','#58b6ee',4.1,'g2')+
      flow('M658 264V296H895V322','#58b6ee',4.6,'g3')+
      flow('M658 264V296H1235Q1258 296 1258 322','#58b6ee',4.3,'g4')+
      flow('M196 680V691Q196 717 235 717H461Q512 717 520 745','#ffab40',5.7,'g1')+
      flow('M531 681V702Q531 720 565 720Q679 718 695 747','#40a7d4',3.8,'g2')+
      flow('M912 681V702Q912 720 877 720H801Q771 720 758 746','#a18bd6',4.2,'g3')+
      flow('M1271 681V699Q1271 723 1021 723H965Q921 723 918 747','#8ab578',5.6,'g4')+
      '<path class="ml-depth-scan" d="M460 934H999"/></svg>';
  }`);
source=source.replace(/focus === t\.method/g,'relevant(t, focus)').replace(/t\.method === focus/g,'relevant(t, focus)').replace(/t\.method !== focus/g,'!relevant(t, focus)');
source=source.replace(/s\.dataset\.mlTechMethod === focus/g,"s.dataset.mlTechMethod.split(' ').indexOf(focus) >= 0").replace(/s\.dataset\.mlTechMethod !== focus/g,"s.dataset.mlTechMethod.split(' ').indexOf(focus) < 0");
source=source.replace("' data-ml-tech-method=\"' + t.method", "' data-ml-tech-method=\"' + t.methods.join(' ')");
// The source has the attribute at the end of a larger string; keep both-category G3.
source=source.replace("'\" data-ml-tech-method=\"' + t.method", "'\" data-ml-tech-method=\"' + t.methods.join(' ')");
source=source.replace(/method\(t\.method\)\.abbr/g,"t.methods.map(function(k){return method(k).abbr;}).join(' + ')");
source=source.replace(/method\(t\.method\)\.name/g,"t.methods.map(function(k){return method(k).name;}).join('与')");
source=source.replace('esc(sc.point)','esc(lessonIntro(t,sc))');
source=source.replace('data-ml-stage data-ml-method','data-geo-stage data-ml-stage data-ml-method').replace('class="ml-page"','class="ml-page gl-stage"');
source=source.replace(/#\/stage\/mudlogging/g,'#/stage/geology').replace('global.MudloggingStage = { render: render, bind: bind };',`global.GeologyStage = { render:render, bind:bind, art:function(name,alt){return '<img src="assets/images/geology/'+name+'.webp" width="1536" height="1024" alt="'+global.GeologyMath.esc(alt)+'" decoding="async">';} };`);
source=source.replaceAll('更多录井场景','更多地质勘察场景').replaceAll('04 / 13','01 / 13').replaceAll('MUD LOGGING · 录井','GEOLOGICAL SURVEY · 地质勘察').replaceAll('<span class="cur">录井</span>','<span class="cur">地质勘察</span>').replaceAll('看见地下，读懂每一米','从地表线索，拼出地质底图').replaceAll('跟着岩屑与气体回到地面，看看智能方法在哪里发挥作用。','跟着影像、采样、图件与露头，看看智能方法在哪里发挥作用。').replaceAll('录井现场交互总览','地质勘察现场交互总览').replaceAll('录井流程：钻头破岩，钻井液携带岩屑与气体返回地面，经过岩性、气测、荧光、钻时分析，统一深度并汇总报告。','地质勘察流程：区域调查获取影像、样品、图件与露头照片，遥感解译、化探聚类、图件语义提取与裂缝统计汇入地质底图。').replaceAll('井底取样','区域调查').replaceAll('地面分析','多源识别').replaceAll('深度对齐','坐标对应').replaceAll('证据汇总','交叉核查').replaceAll('岩屑与气测需做迟到校正；钻时还需结合钻压、转速等工况解读。','影像、采样点与图件需核对坐标和尺度；每一条候选都要保留来源与复核记录。');
fs.writeFileSync(path.join(root,'assets/geology/stage.js'),source);
console.log('GeologyStage rebuilt from MudloggingStage; template structure, crop zoom and motion lifecycle retained.');
