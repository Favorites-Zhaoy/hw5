// Authoring helper only; the submitted folder runs as static HTML/CSS/JavaScript.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..'), pack = path.join(root,'m1-cuttings-case');
const runtime=path.join(__dirname,'m1/runtime');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(runtime,'data.js'),'utf8'),context);
const data=context.window.M1_DATA;
const paperFigures=require('./m1/paper-figures.cjs');
const style='<style>.m1c{background:#faf2e4;border:1px solid #e8dbc7;border-radius:12px;padding:22px;margin:20px 0;color:#334c56}.m1c svg{display:block;width:100%;height:auto}.m1c svg text{font-family:Microsoft YaHei,system-ui,sans-serif}.m1c p{font-size:12px;line-height:1.9;color:#858b7d}.m1c-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}.m1c-photo img{width:100%;max-width:155px;aspect-ratio:1;object-fit:cover;border-radius:6px;display:block;margin:0 auto 12px}.m1c-photo b{display:block;font-size:14px;color:#6d7f7e}.m1c-photo small{display:block;font-size:10px;line-height:1.9;color:#9a9b88}.m1c-legend{display:flex;gap:20px;font-size:11px;color:#859184}.m1c-legend i{display:inline-block;width:10px;height:10px;background:#90aab3;margin-right:5px}.m1c-legend i.test{background:#d4a06a}@media(max-width:600px){.m1c{padding:14px}.m1c-grid{gap:10px}.m1c-photo b{font-size:11px}.m1c-photo small{font-size:9px}}</style>';
const well='<svg viewBox="0 0 720 300" role="img" aria-label="钻头破岩、岩屑沿环空返出，以及迟到时间造成深度偏移的示意"><defs><pattern id="m1-rock-dots" width="15" height="15" patternUnits="userSpaceOnUse"><circle cx="4" cy="5" r="1.5" fill="#bda384" opacity=".5"/></pattern></defs><path d="M38 82 259 56 355 98 135 129Z" fill="#e1c6a1"/><path d="M38 82v148l97 42V129Z" fill="#ccb392"/><path d="M135 129 355 98v148l-220 26Z" fill="#e7d7bd"/><path d="M135 174 355 145v35l-220 29Z" fill="#b7b6a2"/><path d="M135 232 355 204v30l-220 29Z" fill="#b9a088"/><path d="M135 129 355 98v148l-220 26Z" fill="url(#m1-rock-dots)"/><path d="M196 40V231" stroke="#7e8178" stroke-width="19"/><path d="M196 40V231" stroke="#fff6dc" stroke-width="8"/><path d="M188 229h16l-8 20Z" fill="#74818a"/><path d="M221 223V85q0-30 35-30h83" fill="none" stroke="#dbaa66" stroke-width="7"/><path d="m327 47 12 8-12 8" fill="none" stroke="#dbaa66" stroke-width="4"/><text x="45" y="33" fill="#8e7453" font-size="13">① 钻头破岩</text><text x="255" y="32" fill="#8e7453" font-size="13">② 钻井液携带岩屑上返</text><text x="406" y="74" fill="#36596a" font-size="17">③ 地面样品存在“迟到”</text><text x="406" y="112" fill="#7f8c84" font-size="13">钻头此刻深度：3200 m</text><text x="406" y="144" fill="#7f8c84" font-size="13">假设钻速：12 m/h；迟到：30 分钟</text><rect x="402" y="171" width="280" height="65" rx="10" fill="#e1edf0"/><text x="420" y="196" fill="#527f91" font-size="13">样品来源深度的简化示意</text><text x="420" y="221" fill="#527f91" font-size="16">3200 − 12 × 30 ÷ 60 = 3194 m</text><text x="401" y="268" fill="#a19b83" font-size="11">教学设定；实际迟到校正需结合井眼、钻具与循环条件。</text></svg>';
const split='<svg viewBox="0 0 700 215" role="img" aria-label="按20米井段分组的参考库与测试集类别数量">'+data.classes.map((c,i)=>{const ref=data.samples.filter(s=>s.classId===c.id&&s.split==='reference').length,tst=data.samples.filter(s=>s.classId===c.id&&s.split==='test').length;return '<text x="0" y="'+(32+i*65)+'" fill="#687f85" font-size="13">'+c.name+'</text><rect x="125" y="'+(10+i*65)+'" width="'+ref*15+'" height="31" rx="4" fill="#90aab3"/><rect x="'+(125+ref*15)+'" y="'+(10+i*65)+'" width="'+tst*15+'" height="31" rx="4" fill="#d4a06a"/><text x="'+(140+(ref+tst)*15)+'" y="'+(31+i*65)+'" fill="#999b87" font-size="12">'+ref+' 参考 / '+tst+' 测试</text>';}).join('')+'</svg>';
const workflow='<svg viewBox="0 0 820 250" role="img" aria-label="四步可解释岩屑分类流程，每步的输入输出与实际参数">'+[['核验与分组','66 张原图与标签','42 参考 / 24 测试','#dda366'],['图像与特征','中心 72% → 96 × 96','输出 40 维特征','#7da9b7'],['近邻与投票','参考尺度标准化','距离 → k 票 → 候选','#a18bb8'],['复核与评价','24 张留出测试图','模型与人工分别记录','#8ca47e']].map((s,i)=>{const x=8+i*205;return '<g transform="translate('+x+',15)"><rect width="188" height="185" rx="12" fill="#fff9ee" stroke="#e4d6c0"/><circle cx="31" cy="30" r="18" fill="'+s[3]+'"/><text x="31" y="35" text-anchor="middle" font-size="15" fill="white">0'+(i+1)+'</text><text x="18" y="78" font-size="17" fill="#365261">'+s[0]+'</text><text x="18" y="114" font-size="12" fill="#869084">'+s[1]+'</text><text x="18" y="145" font-size="12" fill="#869084">'+s[2]+'</text></g>'+(i<3?'<path d="M'+(x+178)+' 224q28 10 48-10m-9 0h9v9" fill="none" stroke="'+s[3]+'" stroke-width="3"/>':'');}).join('')+'</svg>';
const feature='<svg viewBox="0 0 720 125" role="img" aria-label="40维图像特征的组成"><text x="0" y="18" fill="#8d866c" font-size="12">图像 → 40 维描述 → 加权距离 → 近邻证据</text>'+[[12,'12 维颜色','#c69570'],[16,'16 维局部纹理','#95a888'],[8,'8 维梯度方向','#86a7b6'],[4,'4 个统计量','#aa9abd']].map((s,i,all)=>{const start=all.slice(0,i).reduce((n,v)=>n+v[0],0)*17;return '<rect x="'+start+'" y="37" width="'+(s[0]*17-4)+'" height="35" rx="4" fill="'+s[2]+'"/><text x="'+start+'" y="101" fill="#8a9585" font-size="11">'+s[1]+'</text>';}).join('')+'</svg>';
const photos=data.classes.map(c=>{const s=data.samples.find(s=>s.classId===c.id);return '<div class="m1c-photo"><img src="'+s.image+'" alt="公开原图：'+c.name+'"><b>'+c.name+'</b><small>'+s.id+' · '+s.depth+' m<br>原始数据标签，非模型输出</small></div>';}).join('');
const definition={id:'m1-cuttings-knn',sceneId:'m1',title:'岩屑岩性辅助识别：公开图像与可解释近邻分类',methods:['cv'],version:'1.3.0',updated:'2026-10-24',status:'ready',tabs:{
background:null,
workflow:{label:'案例流程',title:'从真实岩屑图像到可复核候选的四步流程',lead:['每一步都有明确输入、可见计算与可保存的输出。第三部分实际执行同一套流程。'],stats:[['真实照片','66 张'],['参考 / 测试','42 / 24'],['类别 / 特征','3 / 40']],steps:[
{name:'核验图像并按井段分组',role:'数据',do:'核对原图、岩性标签与源井深，选取三类共 66 张，按 20 米井段分组留出。',effect:'42 张参考图与 24 张测试图，同组不跨集合；原图 SHA-256 可追溯。',trap:'相邻照片随机拆分会高估效果；选样与分组不使用模型分数。'},
{name:'统一图像并提取 40 维特征',role:'CV',do:'中心 72% 区域统一到 96 × 96；计算颜色、局部二值纹理、梯度方向与图像统计。',effect:'每个样本得到 40 维向量，以参考库尺度标准化。',trap:'不把边框编号、文件名、井深或原标签作为输入；中心裁切不保证完全消除背景偏差。'},
{name:'计算近邻距离并按类别投票',role:'ML',do:'计算加权欧氏距离，寻找 k 个参考近邻。多数票给出候选，票数相同时比较该类近邻平均距离。',effect:'展示候选、票数、原始相似照片和距离；参数变化触发重新计算。',trap:'投票占比不是校准概率，相似外观不能独立证明地质成因。'},
{name:'留出评价、人工复核与记录导出',role:'地质',do:'对 24 张留出照片计算混淆矩阵、准确率和宏平均 F1；人工意见单独记录并导出 CSV。',effect:'模型输出与人工修改分别可查；回到源井深记录，缺失井段保持断开。',trap:'不把人工修改计入模型分数，不把单井小样本实验外推到新井。'}
],metrics:{title:'把每一步的目的与输出连起来',html:style+'<div class="m1c">'+workflow+'</div><p>可运行示范会实时给出准确率、宏平均 F1 和混淆矩阵。准确率 = 与原标签一致的数量 ÷ 24；宏平均 F1 为三个类别 F1 的等权平均。当前查询的光照扰动只用于观察敏感性，批量评价保持原始图像条件。</p>'},fails:[{name:'拍摄条件替代岩性特征',why:'颜色与纹理会受光照、背景、拍摄批次影响，应检查相似样本与跨井验证。'},{name:'混样或标签不确定',why:'原标签作为本例对照依据，但不能消除现场混样与人工标注误差。'},{name:'把候选当成最终解释',why:'需要样品、取样记录与其他地质证据共同复核。'}]},
demo:{mode:'page',html:'demo/index.html',label:'可视化示范',intro:'选择真实留出样品，调整 k、颜色与纹理权重，查看候选、近邻、混淆矩阵与原井深记录；人工复核与模型输出分别保存，可导出 CSV。',height:1040}
}};
// Retain the same teaching points in original-protocol HTML for older portals.
const rockOverview='<svg viewBox="0 0 780 230" role="img" aria-label="三类岩性结构与孔隙通道的概念示意">'+data.classes.map((c,i)=>{
  let shapes='';if(i===0)for(let y=0;y<3;y++)for(let x=0;x<5;x++)shapes+='<ellipse cx="'+(27+x*41)+'" cy="'+(65+y*32)+'" rx="15" ry="12" fill="#d3b083" stroke="#b99565"/>';
  if(i===1)for(let y=0;y<5;y++)shapes+='<path d="M14 '+(57+y*18)+'q55-8 110 0t110 0" fill="none" stroke="#8d9fac" stroke-width="9"/>';
  if(i===2)for(let y=0;y<3;y++)for(let x=0;x<5;x++)shapes+='<path d="m'+(13+x*44)+' '+(53+y*32)+' 23-7 13 20-23 7Z" fill="#acba97" stroke="#8c9f7b"/>';
  return '<g transform="translate('+(i*260)+',0)"><rect x="0" y="34" width="245" height="126" rx="10" fill="#e9dfcb"/>'+shapes+'<text x="8" y="20" fill="#65808b" font-size="15">'+c.name+'</text><text x="8" y="187" fill="#8b947e" font-size="12">'+['颗粒与孔隙：储集空间的线索','细粒与层理：需核验岩层作用','晶体与裂缝：需验证内部通道'][i]+'</text></g>';
}).join('')+'<text x="7" y="220" fill="#a29477" font-size="11">概念示意，不表示样本实测孔渗。岩性识别不能直接证明油气存在。</text></svg>';
definition.tabs.background=require('./m1/background-metadata.cjs')({style,well,feature,photos,split,rockOverview,observationGallery:paperFigures.legacy()});
definition.tabs.background.page={html:'demo/index.html',view:'background',height:1040};
definition.tabs.workflow.page={html:'demo/index.html',view:'workflow',height:1040};
definition.tabs.demo.view='demo';
const grouped={};data.samples.forEach(s=>{if(!grouped[s.group])grouped[s.group]=[];grouped[s.group].push(s);});
const groupDiagram='<svg viewBox="0 0 820 265" role="img" aria-label="本案例实际17个20米井段分组及其参考测试归属">'+Object.keys(grouped).sort((a,b)=>Number(a.split('-').pop())-Number(b.split('-').pop())).map((key,i)=>{const start=Number(key.split('-').pop()),samples=grouped[key],test=samples[0].split==='test',x=(i%6)*137,y=Math.floor(i/6)*78;return '<g transform="translate('+x+','+y+')"><rect width="126" height="65" rx="6" fill="'+(test?'#efd0a9':'#c9dadd')+'"/><text x="10" y="25" fill="#6b7e80" font-size="12">'+start+'—'+(start+19)+' m</text><text x="10" y="49" fill="#83907e" font-size="10">'+samples.length+' 张 / '+(test?'测试':'参考')+'</text></g>';}).join('')+'<text x="0" y="257" fill="#a3957a" font-size="11">整组划分：42 张参考图、24 张测试图；颜色表示集合，不是岩性。</text></svg>';
definition.tabs.workflow.metrics.html+='<div class="m1c"><h4>第一步的真实数据：17 个井段分组，5 组留出</h4>'+groupDiagram+'</div>';
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
let html=fs.readFileSync(path.join(__dirname,'m1/index.template.html'),'utf8');
html=html.replace('<!-- M1_BACKGROUND -->',()=>fs.readFileSync(path.join(__dirname,'m1/background.template.html'),'utf8').replace('<!-- M1_OBSERVATIONS -->',()=>paperFigures.full()));
html=html.replace('<link rel="stylesheet" href="demo.css">',()=>'<style data-m1-style="theme">'+css.replace(/<\/style/gi,'<\\/style')+'</style>\n<style data-m1-style="artwork">'+artworkCSS+'</style>');
html=html.replace(/<img\b[^>]*\bsrc="\.\.\/assets\/m1-dioramas\.webp"[^>]*>/g,tag=>{
  const alt=/\balt="([^"]*)"/.exec(tag);
  return '<span class="art-sheet" role="img" aria-label="'+(alt?alt[1]:'教学设备插画')+'"></span>';
});
const scripts=[['data.js','dataset',fs.readFileSync(path.join(runtime,'data.js'),'utf8')],['model.js','model',fs.readFileSync(path.join(runtime,'model.js'),'utf8')],['demo.js','app',fs.readFileSync(path.join(__dirname,'m1/app.template.js'),'utf8')]];
scripts.forEach(([name,label,source])=>{html=html.replace('<script src="'+name+'"></script>','<script data-m1="'+label+'">'+source.replace(/<\/script/gi,'<\\/script')+'</script>');});
fs.writeFileSync(path.join(pack,'demo/index.html'),html);
fs.writeFileSync(path.join(runtime,'demo.css'),fs.readFileSync(path.join(__dirname,'m1/style.template.css')));
fs.writeFileSync(path.join(runtime,'demo.js'),fs.readFileSync(path.join(__dirname,'m1/app.template.js')));
fs.copyFileSync(path.join(__dirname,'m1/tests.template.cjs'),path.join(root,'tests/m1-preview.cjs'));
const wrapper=`/* Generated from m1-cuttings-case/case.json by tools/build-m1-case.cjs. */
(function(global){'use strict';var definition=${JSON.stringify(definition)};
function attachSection(name,section){var frame=null;var tab=definition.tabs[name];
function resize(event){if(!frame||event.source!==frame.contentWindow)return;var h=event.data&&event.data.__m1Height;if(typeof h==='number'&&isFinite(h))frame.style.height=Math.max(700,Math.min(10000,h+2))+'px';}
tab.mount=function(root){tab.unmount();frame=document.createElement('iframe');frame.src='m1-cuttings-case/demo/index.html?embed=portal&section='+section;frame.setAttribute('title','M1 · '+tab.label);frame.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads');frame.setAttribute('referrerpolicy','no-referrer');frame.style.cssText='display:block;width:100%;height:1040px;border:0;border-radius:12px;background:#fcf6eb';global.addEventListener('message',resize);root.appendChild(frame);};
tab.unmount=function(){global.removeEventListener('message',resize);if(frame)frame.remove();frame=null;};}
['background','workflow','demo'].forEach(function(name){attachSection(name,name);});
// Stable local ID replaces the earlier prototype; package ID stays free for standard import.
definition.id='m1-cuttings-preview-local';global.Cases.register(definition);}(window));\n`;
fs.writeFileSync(path.join(root,'assets/cases/m1-cuttings.case.js'),wrapper);
const index=path.join(root,'index.html');let indexText=fs.readFileSync(index,'utf8').replace(/(assets\/cases\/m1-cuttings\.case\.js\?v=)[^"\s]+/,(_,prefix)=>prefix+'20261024-m1case6');
['case-demo-host','case-upload','shell'].forEach(name=>{indexText=indexText.replace(new RegExp('(assets/core/'+name+'\\.js\\?v=)[^"\\s]+'), (_,prefix)=>prefix+'20261024-sections1');});
fs.writeFileSync(index,indexText);
console.log(JSON.stringify({id:definition.id,manifestBytes:Buffer.byteLength(JSON.stringify(definition)),samples:data.samples.length,reference:42,test:24}));
