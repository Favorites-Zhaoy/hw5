'use strict';
// Derive both illustrated stage pages from the maintained mudlogging template.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const themes={
 drilling:{prefix:'dmap',global:'DrillingStage',zh:'钻井',en:'DRILLING',number:'03',letter:'d',
  heading:'从井口到井底，看懂钻井作业',
  lead:'跟着钻头、工况和作业记录，看看智能方法怎样帮助钻井判断。',
  note:'从钻头破岩与循环，到现场资料采集，再比较参数、异常、轨迹、钻具和钻井液任务。',
  methods:[['','ALL','完整流程','同一钻井作业的资料支持五项任务，按现场问题选择案例。'],['ts','TS','时序分析','D1、D2、D4、D5读取工况及历史记录，点击相应工位进入案例。'],['opt','OPT','优化算法','D1、D3、D5在参数和工况边界内比较候选，点击工位进入案例。']],
  boxes:[[209,408,300,306],[514,406,274,306],[793,406,294,309],[1092,407,345,315],[987,758,457,326]],
  art:[[219,481,280,223],[525,478,254,225],[805,477,271,226],[1106,478,320,227],[997,835,435,238]],
  outputs:['候选参数与钻速','偏离正常联动的时段','轨迹与转向候选','剩余寿命趋势','性质预测与剂量候选'],
  footer:['现场钻进','资料采集','工况对齐','参数与状态判断'],
  caption:'五项任务共用作业背景，各有输入和成果；图中的连线不要求五种算法依次执行。'
 },
 welllog:{prefix:'wmap',global:'WelllogStage',zh:'测井',en:'WELL LOGGING',number:'05',letter:'w',
  heading:'沿着井深，认识地层的物理响应',
  lead:'从井下仪器到同一井深上的曲线，看看智能方法怎样帮助地层解释。',
  note:'井下仪器采集物理响应，先对齐测量井深，再进入分层、孔隙度、裂缝、岩性和曲线修复任务。',
  methods:[['','ALL','完整流程','从井下测量，到资料对齐，再查看五个解释与修复任务。'],['cv','CV','计算机视觉','W3读取井壁展开图，圈出裂缝候选，点击图画进入案例。'],['ts','TS','时序分析','W1、W2、W4、W5沿井深组织曲线，点击相应工位进入案例。'],['opt','OPT','优化算法','W2用多曲线约束孔隙度解释，点击相应工位进入案例。']],
  boxes:[[211,378,301,310],[518,379,296,308],[815,379,294,309],[1116,379,317,314],[1053,732,384,352]],
  art:[[218,444,288,233],[526,449,278,229],[826,445,273,237],[1126,446,298,239],[1058,806,370,267]],
  outputs:['同一井深的候选层界','孔隙度曲线与误差','裂缝候选掩膜','逐深度岩性候选','带来源标记的重建曲线'],
  footer:['井下测量','资料采集','井深对齐','解释与修复'],
  caption:'曲线先对应同一测量井深；五项任务互相补充，井壁图像的地质解释还需要标定。'
 }
};
const colors=['#f28a24','#2d9ed8','#9262ce','#4b9b68','#ef7028'];
function effects(t){
 var w=t.box[2],h=t.box[3],index=Number(t.id.slice(1))-1,well=STAGE_KIND==='welllog';
 var drilling=[
  '<path class="ml-monitor-scan" d="M92 85V155"/><path class="ml-trace ml-trace-gas" d="M104 111l20-3 12-15 16 12 18-4 16-12 23 6"/>',
  '<path class="ml-trace ml-trace-gas" d="M111 118l17-1 9-25 10 24 20-7 14 6 12-18 11 15 24-5"/><path class="ml-monitor-scan" d="M148 87V201"/>',
  '<path class="ml-trace ml-trace-drill" d="M80 91Q94 152 151 163T245 168"/><circle class="ml-report-pulse" cx="240" cy="129" r="15"/>',
  '<circle class="ml-report-pulse" cx="139" cy="127" r="24"/><path class="ml-trace ml-trace-rpm" d="M213 112l14 8 13-5 15 16 19-6"/>',
  '<path class="ml-trace ml-trace-gas" d="M174 136l20-6 13-12 20-2 17-11"/><circle class="ml-report-pulse" cx="411" cy="136" r="18"/>'
 ];
 var logging=[
  '<path class="ml-depth-scan" d="M93 119H283"/><path class="ml-monitor-scan" d="M196 88V171"/>',
  '<circle class="ml-report-pulse" cx="213" cy="122" r="19"/><path class="ml-trace ml-trace-rpm" d="M176 149l9-18-4-18 14-15 2-14"/>',
  '<path class="ml-trace ml-trace-vision" d="M146 107Q170 85 191 107T273 109"/><path class="ml-monitor-scan" d="M175 87V169"/>',
  '<path class="ml-depth-scan" d="M66 133H275"/><path class="ml-trace ml-trace-drill" d="M101 92l-6 15 9 14-10 12 7 15-8 16"/>',
  '<g class="ml-report-lines"><path d="M237 126l13 6-8 10 16 5-7 12 14 7"/></g><circle class="ml-report-pulse" cx="254" cy="151" r="18"/>'
 ];
 return '<svg class="ml-tech-effect" viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+(well?logging:drilling)[index]+'</svg>';
}
function drawing(){
 var parts=[],colors=['#ffab40','#40a7d4','#a18bd6','#8ab578'],well=STAGE_KIND==='welllog';
 var paths=well?['M335 674C335 719 501 700 609 735','M651 674Q665 718 707 737','M962 679Q924 712 760 738','M1281 680Q1210 732 915 738']:['M360 704C355 753 460 735 568 764','M643 701Q660 741 690 764','M935 705Q920 738 737 764','M1237 710Q1190 755 902 764'];
 for(var i=0;i<4;i++)parts.push(flow(paths[i],colors[i],4+i*.45,TECH[i].id));
 return '<svg class="ml-flows" data-ml-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+
 flow(well?'M151 367V939':'M143 369V787','#ffc238',5)+flow(well?'M164 937V369':'M155 789V369','#58b6ee',5.5)+
 flow(well?'M779 307V332H430Q402 332 396 370':'M728 330V357Q728 367 690 367H375Q360 367 356 399','#58b6ee',5)+
 flow(well?'M780 308V330Q780 337 697 337L675 370':'M729 329V358Q729 369 657 369L638 399','#58b6ee',3.5)+
 flow(well?'M795 309V331Q795 337 888 337L920 370':'M741 330V355Q741 369 876 369L911 399','#58b6ee',3.8)+
 flow(well?'M803 309V332H1193Q1228 332 1240 369':'M750 330V357Q750 366 1174 366L1196 399','#58b6ee',5.2)+parts.join('')+
 flow(well?'M974 845L1032 869':'M958 856L999 887','#ff963c',3.5,TECH[4].id)+
 '<path class="ml-depth-scan" d="M445 901H861"/><circle class="ml-drill-pulse" cx="'+(well?151:145)+'" cy="'+(well?731:803)+'" r="23"/></svg>';
}
for(const [theme,cfg] of Object.entries(themes)){
 const b={window:{}};vm.runInNewContext(read('assets/'+theme+'/content.js'),b);
 const content=b.window[theme==='drilling'?'DRILLING_CONTENT':'WELLLOG_CONTENT'];
 const tech=content.map((c,i)=>({id:c.id,method:c.methods[0],methods:c.methods,title:c.short,color:colors[i],box:cfg.boxes[i],art:cfg.art[i],input:c.input,output:cfg.outputs[i]}));
 let js=read('assets/core/mudlogging.js').replace(/\r\n/g,'\n');
 js=js.replace(/var IMAGE = '[^']+';/,"var IMAGE = 'assets/images/"+theme+"-process.webp';")
  .replace(/var IMAGE_SET = [^\n]+;/,"var IMAGE_SET = 'assets/images/"+theme+"-process-small.webp 768w, ' + IMAGE + ' 1448w';")
  .replace(/var METHODS = \[[\s\S]*?\n  \];/,'var METHODS = '+JSON.stringify(cfg.methods.map(a=>({id:a[0],abbr:a[1],name:a[2],note:a[3]})))+';')
  .replace(/var TECH = \[[\s\S]*?\n  \];/,'var TECH = '+JSON.stringify(tech)+';');
 js=js.replace(/function effect\(t\) \{[\s\S]*?\n  \}\n  function sceneHref/,'var effect='+effects.toString()+';\n  function sceneHref');
 const routes=Object.fromEntries(content.map(c=>[c.id,c.caseId]));
 js=js.replace(/var lesson = \{[^\n]+/,'var lesson = '+JSON.stringify(routes)+'[id];');
 js=js.replace(/function drawing\(\) \{[\s\S]*?\n  \}\n  function deck/,'var STAGE_KIND='+JSON.stringify(theme)+';var drawing='+drawing.toString()+';\n  function deck');
 js=js.replace(/t\.method === focus/g,'t.methods.indexOf(focus) >= 0').replace(/t\.method !== focus/g,'t.methods.indexOf(focus) < 0').replace(/focus === t\.method/g,'t.methods.indexOf(focus) >= 0');
 js=js.replace(/method\(t\.method\)\.abbr/g,"t.methods.map(function(m){return method(m).abbr;}).join(' + ')");
 js=js.replace(/s\.dataset\.mlTechMethod === focus/g,'TECH.some(function(t){return t.id===s.dataset.mlSpot && t.methods.indexOf(focus)>=0;})')
  .replace(/s\.dataset\.mlTechMethod !== focus/g,'!TECH.some(function(t){return t.id===s.dataset.mlSpot && t.methods.indexOf(focus)>=0;})');
 js=js.replace("var first = spots.filter(function (s) { return s.dataset.mlTechMethod === focus; })[0];","var first = spots.filter(function (s) { return TECH.some(function(t){return t.id===s.dataset.mlSpot && t.methods.indexOf(focus)>=0;}); })[0];");
 js=js.replace('看见地下，读懂每一米',cfg.heading).replace('跟着岩屑与气体回到地面，看看智能方法在哪里发挥作用。',cfg.lead)
  .replace('04 / 13',cfg.number+' / 13').replace('MUD LOGGING',cfg.en)
  .replace('录井流程：钻头破岩，钻井液携带岩屑与气体返回地面，经过岩性、气测、荧光、钻时分析，统一深度并汇总报告。',cfg.note)
  .replace('岩屑与气测需做迟到校正；钻时还需结合钻压、转速等工况解读。',cfg.caption)
  .replace('井底取样',cfg.footer[0]).replace('地面分析',cfg.footer[1]).replace('深度对齐',cfg.footer[2]).replace('证据汇总',cfg.footer[3])
  .replace(/#\/stage\/mudlogging/g,'#/stage/'+theme).replace(/录井/g,cfg.zh).replace(/MudloggingStage/g,cfg.global);
 js=js.replace(/\bml([A-Z]\w*)/g,(_,p)=>cfg.prefix+p).replace(/ml-/g,cfg.prefix+'-');
 js=js.replace('data-'+cfg.prefix+'-stage','data-'+theme+'-stage data-'+cfg.prefix+'-stage').replace('{ render: render, bind: bind }','{ render: render, bind: bind, html: render, mount: bind }');
 let css=read('assets/core/mudlogging.css').replace(/ml-/g,cfg.prefix+'-');
 for(let i=1;i<=5;i++)css=css.replaceAll(cfg.prefix+'-spot-m'+i,cfg.prefix+'-spot-'+cfg.letter+i);
 const manifest=JSON.parse(read('assets/images/'+theme+'-images.json'));
 css=css.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g,'data:image/webp;base64,'+manifest.placeholder);
 if(!js.includes('var STAGE_KIND=')||js.includes('shapes[t.id]'))throw Error(theme+': stage-specific artwork overlays were not generated');
 write('assets/'+theme+'/stage.js',js);write('assets/'+theme+'/stage-map.css',css);
}
console.log('Generated drilling/welllog image stage pages from assets/core/mudlogging.js + mudlogging.css.');
