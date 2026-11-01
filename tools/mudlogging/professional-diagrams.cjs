// Original field-principle drawings. Numerical examples are illustrative only.
const wrap=(title,body)=>{const uid='prof-arrow-'+Array.from(title).reduce((h,c)=>(h*31+c.codePointAt(0))>>>0,0);return `<svg class="professional-svg" viewBox="0 0 760 330" role="img" aria-label="${title}"><defs><marker id="${uid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#75988b" stroke-width="1.5"/></marker></defs>${body.replaceAll('url(#professional-arrow)','url(#'+uid+')')}</svg>`;};
const text=(x,y,label,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${label}</text>`;
const rect=(x,y,w,h,color='#e5e8d9')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${color}" stroke="#c4c9b5"/>`;
const arrow=d=>`<path d="${d}" stroke="#75988b" stroke-width="2" fill="none" marker-end="url(#professional-arrow)"/>`;
const curve=(values,x,y,w,h,color='#548d80')=>`<path d="${values.map((v,i)=>(i?'L':'M')+(x+i*w/(values.length-1)).toFixed(1)+' '+(y+h-v*h).toFixed(1)).join('')}" stroke="${color}" stroke-width="3" fill="none"/>`;
const depthCurve=(values,x,y,w,h,color='#548d80')=>`<path data-depth-track="true" d="${values.map((v,i)=>(i?'L':'M')+(x+v*w).toFixed(1)+' '+(y+i*h/(values.length-1)).toFixed(1)).join('')}" stroke="${color}" stroke-width="3" fill="none"/>`;
const axis=(x,y,w,h)=>`<path d="M${x} ${y}v${h}h${w}" stroke="#b5c1ad" fill="none"/>`;
function grains(x,y,mode){return [0,1,2,3,4,5].map(i=>`<path d="M${x+i%3*42} ${y+Math.floor(i/3)*43}l25-8 12 20-13 19-25-7Z" fill="#969f92" stroke="#73887e"/>`+(mode==='spread'||(mode==='patch'&&i<2)?`<ellipse cx="${x+16+i%3*42}" cy="${y+14+Math.floor(i/3)*43}" rx="${mode==='spread'?9:13}" ry="${mode==='spread'?7:9}" fill="#c8bb69"/>`:mode==='point'&&i%2===0?`<circle cx="${x+17+i%3*42}" cy="${y+14+Math.floor(i/3)*43}" r="4" fill="#c8bb69"/>`:'')).join('');}
function mudlog(){
 let s=rect(20,30,720,275,'#fbf6e8');const xs=[40,125,235,365,535,720];
 ['井深 / m','钻时','岩屑描述','全烃 / %','作业备注'].forEach((v,i)=>{s+=text(xs[i]+5,56,v,'prof-title');if(i)s+=`<path d="M${xs[i]} 68V289" stroke="#d6d9c5"/>`;});
 for(let i=0;i<6;i++){const y=85+i*35;s+=`<path d="M35 ${y}H725" stroke="#e3e4d2"/>`+text(48,y+4,2600+i*2);}
 s+=depthCurve([.3,.28,.35,.6,.65,.58,.32,.28],142,85,68,175);
 s+='<rect x="251" y="85" width="94" height="88" fill="#d3bd91"/><rect x="251" y="173" width="94" height="87" fill="#a2b3a2"/>'+text(260,131,'砂质较多')+text(260,235,'泥质较多');
 s+=depthCurve([.15,.16,.2,.8,.65,.24,.19,.2],387,85,120,175,'#6b9eaa')+text(552,116,'岩屑特征变化')+text(552,170,'气测升高')+text(552,222,'转速调整');
 return wrap('综合录井图以共同井深轴组织钻时、岩屑、气测和作业备注，示意数据',s);
}
module.exports={overview:mudlog,draw(id,topic){
 if(id==='m2'&&topic===0){
  let s=rect(20,88,160,96,'#dfded0')+text(42,122,'返出钻井液','prof-title')+text(42,149,'脱气器分离气体')+arrow('M184 136H253');
  s+=rect(266,27,210,103,'#dce9e7')+text(286,56,'全烃通道 TG','prof-title')+axis(286,72,163,40)+curve([.1,.13,.12,.75,.7,.15,.12],288,77,159,31);
  s+=rect(266,181,210,119,'#e7dfcc')+text(286,210,'组分分析 C1—C5','prof-title');
  [45,27,17,10,6].forEach((h,i)=>s+=`<rect x="${289+i*35}" y="${273-h}" width="18" height="${h}" fill="#aebf9f"/>`+text(287+i*35,291,'C'+(i+1)));
  s+=arrow('M215 137V80H260')+arrow('M215 137V233H260')+text(517,86,'总响应：升高多少？')+text(517,242,'组成：哪些组分变化？')+text(25,320,'采样与脱气条件会影响读数；全烃不直接等于地层含气量。');
  return wrap('返出气体分为全烃与组分两个测量维度',s);
 }
 if(id==='m2'&&topic===1){
  let s='';const names=['持续钻进中的显示','接单根后的短峰','再次循环的重复峰'];
  const a=[[.12,.12,.14,.6,.62,.6,.58,.15,.14],[.12,.13,.14,.2,.87,.22,.14,.12,.12],[.1,.11,.75,.15,.1,.11,.6,.13,.1]];
  for(let i=0;i<3;i++){s+=rect(16+i*249,30,234,238,i===1?'#eee1cb':'#e4e9dd')+text(32+i*249,62,names[i],'prof-title')+axis(37+i*249,107,181,102)+curve(a[i],39+i*249,111,177,92,i===1?'#b39161':'#5b9390')+text(38+i*249,240,['看持续性和组分','看停泵与迟到对应','看是否隔一轮再出现'][i]);}
  return wrap('三种气体来源线索的曲线示意',s+text(24,313,'曲线形状只是线索，来源还要由作业和循环记录支持。'));
 }
 if(id==='m2'){
  let s=text(25,41,'同一事件的两条时间线','prof-title');
  s+=text(24,98,'井底作业')+text(24,206,'地面气测')+'<path d="M135 117H720M135 224H720" stroke="#bac5b2"/>';
  s+='<rect x="245" y="75" width="45" height="40" fill="#c6a570"/>'+text(226,60,'停泵接单根')+curve([.05,.06,.05,.06,.05,.07,.12,.86,.15,.05,.06],139,150,570,73,'#4e91a5');
  s+=arrow('M268 125H495')+text(321,145,'上返迟到 6 min')+text(480,250,'气峰到达地面')+text(145,279,'来源井深取较早的钻进记录')+text(25,317,'现场以循环记录校验迟到；此图6 min仅来自本课生成设定。');
  return wrap('井底事件与地面检测之间存在上返迟到',s);
 }
 if(id==='m3'&&topic===0){
  let s='';['点状','斑块状','较均匀'].forEach((v,i)=>{s+=rect(16+i*249,28,234,193,'#e3e3d6')+text(32+i*249,56,v,'prof-title')+grains(45+i*249,88,['point','patch','spread'][i]);});
  s+=text(26,258,'分布：目标出现在哪里？')+text(402,258,'丰度：占约定样品范围多少？');
  [0,1,2,3,4,5].forEach(i=>s+=`<rect x="${27+i*31}" y="278" width="29" height="18" fill="${['#7b8580','#929a78','#a8ae70','#c4ba68','#cfbd55','#e3c666'][i]}"/>`);
  s+=text(232,294,'颜色与强度也要同时记录');return wrap('荧光的颜色、强度、分布与丰度',s);
 }
 if(id==='m3'&&topic===1){
  let s='';const titles=['白光：描述样品','紫外：自然荧光','补充：切割荧光'];
  titles.forEach((v,i)=>{s+=rect(15+i*249,31,233,232,i===1?'#dedfeb':'#e7e2d3')+text(30+i*249,61,v,'prof-title');});
  s+=grains(48,100,'none')+grains(297,100,'patch')+'<path d="M570 116h100l-12 91h-76Z" fill="#e1e8d9" stroke="#8ca397"/><ellipse cx="620" cy="190" rx="36" ry="13" fill="#d1c173"/>';
  s+=text(41,240,'颜色 · 粒度 · 油迹')+text(280,240,'颜色 · 强度 · 分布')+text(533,240,'释放现象 · 荧光 · 残留')+text(24,310,'观察互相补充；并非一次图像分割就能完成全部显示评价。');
  return wrap('白光、自然荧光和切割荧光提供互补观测',s);
 }
 if(id==='m3'){
  let s='';const cols=['#cbbd63','#8ca5bf','#a7a66e'];['烃类显示线索','矿物自身发光','人工材料污染'].forEach((v,i)=>{s+=rect(15+i*249,35,233,228,'#e5e5d6')+text(30+i*249,67,v,'prof-title')+grains(47+i*249,105,'none')+`<ellipse cx="${83+i*249}" cy="142" rx="24" ry="16" fill="${cols[i]}"/>`+text(33+i*249,239,['需结合其他显示','颜色可能与烃类重叠','需与使用材料对照'][i]);});
  return wrap('不同来源都可能发光，颜色不能单独证明含油',s+text(25,311,'本课蓝色干扰为人为设定；现场不能把蓝色一律排除。'));
 }
 if(id==='m4'&&topic===0){
  let s=text(26,39,'相同1 m进尺：越快钻完，钻时越小','prof-title');
  [6,10,20].forEach((v,i)=>{s+=text(26,95+i*68,v+' m/h')+`<rect x="135" y="${69+i*68}" width="${600/v*4.5}" height="32" rx="4" fill="${['#c9b58e','#aabd9e','#7ca394'][i]}"/>`+text(600,94+i*68,(60/v)+' min/m');});
  return wrap('机械钻速与钻时的单位换算',s+text(143,304,'Δt（min/m）= 60 ÷ ROP（m/h）','prof-equation'));
 }
 if(id==='m4'&&topic===1){
  let s='';for(let col=0;col<2;col++){
   const x=18+col*375;s+=rect(x,26,356,260,col?'#e5e8d9':'#eee2ce')+text(x+17,57,col?'工况相近，岩层改变':'同一岩层，工况改变','prof-title');
   s+=text(x+17,96,'岩层')+`<rect x="${x+81}" y="79" width="247" height="20" fill="#cbb98f"/>`;
   if(col)s+=`<rect x="${x+201}" y="79" width="127" height="20" fill="#92ac9c"/>`;
   s+=text(x+17,153,'钻压')+curve(col?[.7,.7,.7,.7,.7,.7]:[.8,.8,.8,.35,.35,.35],x+82,116,244,42,'#a79872');
   s+=text(x+17,221,'钻时')+curve([.2,.2,.2,.75,.75,.75],x+82,178,244,57,'#588d70');
  }
  return wrap('工况变化和地层变化都可造成钻时突变',s+text(29,316,'相同的钻时台阶，成因可能不同；先看其他通道有没有同步变化。'));
 }
 if(id==='m4'){
  const s=mudlog().replace(/^.*?<\/defs>/,'').replace(/<\/svg>$/,'');
  return wrap('沿共同井深轴对照候选层界与岩屑、气测记录',s);
 }
 if(id==='m5'&&topic===0){
  let s='';['地质记录','工程记录','成果表达'].forEach((v,i)=>{s+=rect(16+i*249,31,234,244,['#e4dfcb','#dde7df','#f6f0df'][i])+text(34+i*249,65,v,'prof-title');});
  ['岩性与地层','油气显示','样品描述'].forEach((v,i)=>s+=text(44,119+i*50,v));
  ['钻时与工况','钻井液性质','重要作业事件'].forEach((v,i)=>s+=text(293,119+i*50,v));
  ['共同井深图','主要井段说明','交班摘要 / 综合报告'].forEach((v,i)=>s+=text(542,119+i*50,v));
  return wrap('地质和工程记录共同组成录井成果',s);
 }
 if(id==='m5'&&topic===1){
  let s=rect(22,25,330,243,'#e1e8dc')+rect(410,25,329,243,'#eee1cf')+text(41,58,'可回到原记录的事实','prof-title')+text(430,58,'需要更多资料的解释','prof-title');
  ['井段全烃持续升高','岩屑呈现荧光','接单根后返出短峰'].forEach((v,i)=>s+=text(44,109+i*54,v));
  ['显示来自什么原因？','与什么地层对应？','能否支持流体与产能判断？'].forEach((v,i)=>s+=text(431,109+i*54,v));
  s+=arrow('M357 145H403')+text(39,310,'摘要准确陈述事实；解释要说明所依据的地质、工况与验证资料。');return wrap('录井报告中的事实与解释属于不同层次',s);
 }
 let s=rect(19,25,348,248,'#e4e8d9')+rect(393,25,348,248,'#ede2cb')+text(38,57,'空间和时间先对应','prof-title')+text(412,57,'数值与单位一起保留','prof-title');
 s+='<path d="M84 95V159Q84 207 236 224" fill="none" stroke="#819d91" stroke-width="8"/><path d="M84 95V224" stroke="#b59b76" stroke-width="2" stroke-dasharray="5 4"/>'+text(106,129,'MD：沿井眼')+text(106,169,'TVD：垂直距离');
 s+=text(433,119,'0.5 %','prof-equation')+text(432,163,'= 5000 ppm','prof-equation')+text(420,222,'值和单位不能拆开抄写')+text(29,310,'地层沿井深关联；作业沿时间关联；返出资料还要考虑迟到。');return wrap('深度基准与气体浓度单位的专业对应',s);
}};
