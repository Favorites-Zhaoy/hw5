(function(){
  'use strict';
  var DATA=window.M1_DATA,RESULTS=window.M1_RESULTS,AUDIT=window.M1_AUDIT,BASELINE=window.M1_BASELINE;
  var TEACHING={"scenario":{"title":"把井 2 的一批岩屑照片，整理成沿井深可查的岩性候选记录。","setting":"教学任务：你收到 66 张来自同一口井的岩屑照片，需要比较细砂岩、页岩与灰质白云岩的外观，再把每张照片的分类结果对应回原井深。","input":"66 张原始 RGB 照片 + 井号、源井深、三类原始标签","output":"每张照片的三类得分、岩性候选与图像响应，以及按井深排列的整批记录","note":"场景为教学设定；照片、井深和标签来自同一份公开资料。三个页面始终使用这一批数据。"},"papers":[{"year":"2026.10","authors":"Zhang 等","title":"A multi-attention mechanism-improved ResNet18 approach for lithology identification and classification","journal":"PLOS One","doi":"10.1371/journal.pone.0361625","url":"https://doi.org/10.1371/journal.pone.0361625","input":"岩石图像","ai":"在 ResNet-18 后加入通道与空间注意，让分类器重视更有区分力的图像特征。","output":"岩石类别","boundary":"岩石图像方法研究，不是本井岩屑实验；本课没有运行 CBAM。"},{"year":"2026.05","authors":"Hou 等","title":"A knowledge-guided multi-task learning method for drill cuttings analysis","journal":"Petroleum Science","doi":"10.1016/j.petsci.2026.05.037","url":"https://doi.org/10.1016/j.petsci.2026.05.037","input":"岩屑图像与属性标签","ai":"多任务学习结合地质属性之间的先验关联，协同判断颜色、形状和颗粒类型。","output":"多种岩屑属性","boundary":"论文有多属性标注；本课只有整图岩性标签，未复现该模型。"},{"year":"2025.02","authors":"Olsen 等","title":"X-ray Micro-CT based characterization of rock cuttings with deep learning","journal":"Applied Computing and Geosciences","doi":"10.1016/j.acags.2025.100220","url":"https://doi.org/10.1016/j.acags.2025.100220","input":"岩屑微 CT 图像","ai":"预训练 ResNet-18 学习图像表征，再进行岩性分类，说明基础 CNN 可以成为岩屑识别的核心。","output":"五类岩性","boundary":"微 CT 与本课 RGB 照片成像不同，不能套用论文结果。"}],"terms":[["岩屑 / Cuttings","钻头破岩后随钻井液返回地面的碎块。","图像中的对象；不等同于原岩颗粒。"],["岩性 / Lithology","对岩石组成、结构等特征的分类描述。","本课三类标签；不是矿物含量。"],["迟到 / Lag time","岩屑从井底返到地面所需的时间。","照片与井深对应时的时间偏移。"],["井深对齐 / Depth matching","把样品和描述放回正确井段。","记录关联与排序；不是分类特征。"],["整图标签 / Image-level label","一张照片只对应一个岩性名称。","监督学习的目标值，不是逐颗标注。"],["裁切区域 / ROI","统一保留照片中用于分析的部分。","本课中心 72%，缩放为 224×224。"],["CNN / 卷积神经网络","逐层提取局部纹理、边缘和组合形态。","把照片转成可供分类的特征。"],["ResNet / 残差网络","用跳接保留信息的一类 CNN。","本课固定的预训练图像编码器。"],["迁移学习 / Transfer learning","利用在其他图像上学到的表示。","冻结骨干，只拟合三类分类层。"],["分类得分 / Class score","模型对三个类别给出的相对分数。","不是地质判断一定正确的概率。"],["开发组与留出组","分开组织用于拟合和检查的资料。","按井段成组，避免相邻照片跨用途。"],["图像响应 / Grad-CAM","显示某个类别与图中哪些区域关联较强。","类别响应图；不表示矿物分布。"]]};
  var $=function(id){return document.getElementById(id);};
  var esc=function(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});};
  var classes=DATA.classes,ids=classes.map(function(c){return c.id;}),byClass={},byId={};
  classes.forEach(function(c){byClass[c.id]=c;});DATA.samples.forEach(function(s){byId[s.id]=s;});
  var className=function(id){return byClass[id]?byClass[id].name:'未标注';},pct=function(v){return (v*100).toFixed(1)+'%';};
  var currentId=DATA.samples[0].id,currentCamClass=RESULTS.samples[currentId].prediction,evaluationStage='validation';
  var workflowStep=0,view='background',motionPaused=false,ready=true,pendingRock=null,recordY={};
  var sharingReady=false,applyingShared=false,navigationPending=null;
  var flowText=[{"name":"设定批次任务","role":"场景与目标","title":"先明确这批照片要变成什么结果。","input":"井 2 的 66 张公开照片、源井深和三类标签。","process":"设定一次岩屑照片整理任务：把每张图的外观分类对应回井深，形成可逐图查看的岩性候选记录。先看输入、目标和现有标签，后面的步骤都使用这一批照片。","why":"先说清交付结果，才能知道需要哪些资料，以及算法替代了哪一部分工作。","output":"一批有来源的照片，和“按井深排列的三类岩性候选”这个明确目标。","trap":"这是教学任务设定，不代表本课完成过现场取样或重新鉴定。"},{"name":"准备图像与标签","role":"输入整理","title":"同一张照片，按统一规则处理。","input":"原始 JPEG、样品编号、井深、源标签与图像尺寸。","process":"保留原图与校验值，核对照片和记录的对应关系；统一保留中心 72% 区域，缩放到 224×224，沿用细砂岩、页岩、灰质白云岩三类整图标签。","why":"画面不一致、标签错位或井深失配，都会直接影响后面的分类。","output":"224×224 的 RGB 输入、对应原图和三类标签词表。","trap":"中心裁切不是颗粒分割，像素大小也不等于物理比例尺。"},{"name":"按井段划分资料","role":"训练与检查","title":"相邻照片成组，不拆开使用。","input":"已经与井深对应的照片和标签。","process":"按 20 m 井段分成 17 组：42 张开发用照片组成 12 组，24 张留出照片组成 5 组。开发组逐井段留出检查；每次拟合都不使用当前被留出的井段。","why":"相邻照片往往相似。整组隔开，才能检查分类方法遇到另一段资料时会怎样表现。","output":"固定的开发组、留出组和逐图分组清单。","trap":"20 m 是分组宽度，不是采样间距；这些照片仍来自同一口井。"},{"name":"从观察到 CNN 分类","role":"重点 · 深度学习","ai":true,"title":"把外观特征的提取与初始分类交给 CNN。","input":"同样的岩屑照片，以及开发组的三类标签。","process":"传统做法是观察颜色、颗粒和结构，与标准样或其他资料对照后描述岩性。这里用预训练 ResNet-18 提取图像表征，再拟合三类分类层，批量生成岩性候选和分类得分。","why":"CNN 能把多层纹理与形态信息组合起来，统一处理整批图像；它替代的是照片外观的重复提取和初始分类。","output":"每张照片的三类得分、岩性候选和对应的类别响应图。","trap":"本课冻结卷积骨干，只拟合三类分类层；图像响应不表示矿物含量，整图分类也不能替代全部岩性鉴定。"},{"name":"比较常规与 AI 结果","role":"同资料对照","ai":true,"title":"优势和失效，都要放回同一批资料里比较。","input":"同一分组下的常规颜色参照结果、CNN 结果和源标签。","process":"常规参照只使用 RGB 直方图与各类平均外观，CNN 使用预训练的深层图像特征。两者采用同样的照片、裁切和井段划分，分别统计开发组与留出组的结果。","why":"可见的自动化收益包括批量分类、统一得分和井深结果组织；识别是否更准，仍需用独立分组的真实成绩回答。","output":"两种方法在两组资料上的一致率，以及可以逐图查看的差异。","trap":"颜色参照是计算基线，不是人工专家的成绩。当前 CNN 在留出组没有精度优势，不把开发组表现当成新井结论。"},{"name":"形成井深岩性记录","role":"结果交付","title":"让每一条候选都能找到原图和原始记录。","input":"样品编号、源井深、原始标签、两种方法输出和三类得分。","process":"按真实井深排序并关联照片，对照原记录、常规参照和 CNN 候选。井深大间隔保留断轴；导出本批结果后，进入可运行示范播放结果形成的过程。","why":"把单张照片的分类组织成井深记录，才便于观察岩性随井深的变化与差异。","output":"可查阅、可导出的逐图识别记录，以及沿井深排列的整批结果。","trap":"空白井段不补画地层；本批数据不能代表完整连续地层或其他井。"}];
  var sectionQuery=new URLSearchParams(window.location.search||'');
  var frameSection=/^m1-lesson-(background|workflow|demo)$/.exec(String(window.name||''));
  var portalSection=document.body.dataset.m1Section||window.__CASE_DEMO_VIEW__||sectionQuery.get('section')||(frameSection&&frameSection[1]);
  var embedded=window.parent!==window||Boolean(window.__CASE_DEMO_VIEW__)||sectionQuery.get('embed')==='portal';
  if(embedded){document.body.classList.add('embedded');var brand=document.querySelector?document.querySelector('.wordmark'):null;if(brand){brand.removeAttribute('href');brand.setAttribute('aria-label','M1 岩屑岩性辅助识别');}}
  function reportHeight(){if(window.parent!==window)window.parent.postMessage({__m1Height:Math.ceil(document.body.getBoundingClientRect().height)},'*');}
  function setView(next,focus,scroll){
    if(embedded&&portalSection)next=portalSection;
    if(['background','workflow','demo'].indexOf(next)<0)next='background';view=next;
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'),function(b){var active=b.dataset.view===next;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus({preventScroll:true});});
    ['background','workflow','demo'].forEach(function(n){$('panel-'+n).hidden=n!==next;});
    if(next!=='demo'&&typeof stopBatchPlayback==='function')stopBatchPlayback();if(next==='workflow')renderWorkflow();if(next==='demo')renderIdentification(true);
    try{window.history.replaceState(null,'','#'+next);}catch(e){}
    if(scroll&&!embedded&&$('panel-'+next).scrollIntoView)$('panel-'+next).scrollIntoView({block:'start',behavior:'instant'});reportHeight();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-view]'),function(b,index,buttons){b.addEventListener('click',function(){setView(b.dataset.view,false,true);});b.addEventListener('keydown',function(event){var at=index;if(event.key==='ArrowRight')at=(index+1)%3;else if(event.key==='ArrowLeft')at=(index+2)%3;else if(event.key==='Home')at=0;else if(event.key==='End')at=2;else return;event.preventDefault();setView(buttons[at].dataset.view,true,true);});});
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'),function(b){b.addEventListener('click',function(){var next=b.dataset.go;if(!embedded){if(document.body.dataset.m1Section){window.location.assign({background:'background.html',workflow:'workflow.html',demo:'identify.html'}[next]);return;}setView(next,true,true);return;}var token=String(Date.now());navigationPending=token;window.parent.postMessage({__m1Navigate:next,token:token},'*');window.setTimeout(function(){if(navigationPending===token){navigationPending=null;setView(next,true,true);}},350);});});
  window.addEventListener('hashchange',function(){setView(window.location.hash.slice(1),false);});
  function applyMotion(){document.body.classList.toggle('is-paused',motionPaused);$('motion-toggle').setAttribute('aria-pressed',String(motionPaused));$('motion-toggle').textContent=motionPaused?'继续动效':'暂停动效';}
  $('motion-toggle').addEventListener('click',function(){motionPaused=!motionPaused;applyMotion();});
  var media=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');if(media&&media.matches)motionPaused=true;if(media&&media.addEventListener)media.addEventListener('change',function(){motionPaused=media.matches;applyMotion();});applyMotion();
  function updateLag() {
    var minutes = Number($('lag-minutes').value), rop = Number($('rop').value), delta = minutes * rop / 60;
    $('lag-value').textContent = minutes + ' 分钟'; $('rop-value').textContent = rop + ' m/h';
    $('source-depth').textContent = (3200 - delta).toFixed(delta % 1 ? 1 : 0) + ' m';
    $('lag-source-label').textContent = '来源示意：' + (3200 - delta).toFixed(1) + ' m';
    $('lag-marker').setAttribute('transform','translate(0,' + (-Math.min(77,delta * 1.8)).toFixed(1) + ')');
  }
  $('lag-minutes').addEventListener('input', updateLag); $('rop').addEventListener('input', updateLag); updateLag();

  function renderRockLesson(id, selectedSample) {
    var lessons={
      sandstone:{title:'细砂岩：从已有标签开始观察。',copy:'这张照片沿用公开数据中的细砂岩标签。先观察整体颜色与碎块表面，再与其他照片比较；未标定的图像不能给出原岩颗粒的定量尺度。',question:'原岩粒度与矿物组成如何确认？需要比例尺、薄片或其他实验资料。'},
      shale:{title:'页岩：碎块不一定保留完整层理。',copy:'这张照片沿用公开数据中的页岩标签。岩屑是破碎后的样品，完整岩心中可以观察的层理，在岩屑照片里可能不再完整。',question:'照片中的表面特征是否有地层意义？需要回到取样记录和其他地质资料。'},
      dolomite:{title:'灰质白云岩：外观提供候选线索。',copy:'这张照片沿用公开数据中的灰质白云岩标签。图像可以用于外观比较，但不能单独确认灰质与白云石的含量。',question:'碳酸盐组分如何确认？需要结合酸反应、显微观察或其他矿物分析。'}
    };
    if(!lessons[id])id='sandstone';
    var lesson=lessons[id],split=evaluationStage==='test'?'test':'reference';
    var sample=selectedSample||DATA.samples.filter(function(s){return s.classId===id&&s.split===split;})[0];
    $('reservoir-diagram').innerHTML='<figure class="rock-photo"><div class="rock-photo-stage"><img src="'+sample.image+'" alt="本例公开岩屑照片，原数据标签为'+esc(className(id))+'"></div><figcaption><b>原标签：'+esc(className(id))+' · '+esc(sample.id)+' · 源井深 '+sample.depth+' m</b><p class="paper-credit">本案例公开数据原图 · 井 '+esc(sample.well)+'<br><a href="https://github.com/nature9420/-ResNet-HMM-Lithology" target="_blank" rel="noopener noreferrer">查看原始数据来源 ↗</a></p><small>保留源数据标签；外观不等于矿物定量结果。</small></figcaption></figure>';
    $('rock-concept-title').textContent=lesson.title;$('rock-concept-copy').textContent=lesson.copy;$('rock-concept-question').textContent=lesson.question;
    $('rock-photo-limit').textContent='这些是本案例的真实照片；岩性名称沿用源标签，不把外部论文图当作本井样品。';
    Array.prototype.forEach.call(document.querySelectorAll('[data-rock]'),function(button){button.setAttribute('aria-pressed',String(button.dataset.rock===id));});
    reportHeight();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-rock]'),function(button){button.addEventListener('click',function(){
    var id=button.dataset.rock;pendingRock=id;
    var sample=DATA.samples.filter(function(s){return s.classId===id&&s.split===(evaluationStage==='test'?'test':'reference');})[0];
    if(ready&&sample)selectSample(sample.id);else renderRockLesson(id);
  });});
  renderRockLesson('sandstone');
  function splitMarkup() {
    return classes.map(function(c){var reference=DATA.samples.filter(function(s){return s.classId===c.id&&s.split==='reference';}).length;var test=DATA.samples.filter(function(s){return s.classId===c.id&&s.split==='test';}).length;
      return '<div class="split-row"><header><span>'+c.name+'</span><span>'+reference+' 开发 / '+test+' 留出</span></header><div class="split-track"><span class="reference" style="width:'+reference/(reference+test)*100+'%">'+reference+'</span><span class="test" style="width:'+test/(reference+test)*100+'%">'+test+'</span></div></div>';
    }).join('')+'<div class="split-legend"><span><i></i>开发用资料 42 张</span><span><i class="test"></i>留出资料 24 张</span></div>';
  }
  $('split-bars').innerHTML = splitMarkup();

  // A conceptual field route is paired with an authentic image, without implying
  // that the displayed photograph was taken in the illustrated well.
  var fieldStories=[
    {kicker:'01 / 井底破岩',title:'钻头接触的岩层，变成碎块。',copy:'钻头破岩产生岩屑；它提供了钻遇岩层的实物线索，但破碎后已不再保留完整岩心的空间关系。',note:'碎块大小不能直接当作原岩颗粒大小。'},
    {kicker:'02 / 上返取样',title:'岩屑到达地面，需要时间。',copy:'钻井液把岩屑从井底带回地面。取样时钻头通常已继续前进，样品还可能混入井壁坍落物。',note:'先核对迟到与取样记录，才能把样品对应到井深。'},
    {kicker:'03 / 观察描述',title:'人观察岩屑，照片保留外观。',copy:'录井人员观察颜色、颗粒和结构，并结合其他证据描述岩性。M1 在这里辅助比较照片，提出候选。',note:'照片能提供可见线索，不能独立确认矿物含量。'},
    {kicker:'04 / 记录对比',title:'判断回到井深，才有地层意义。',copy:'岩性描述与正确井深对应后，才能与其他井段、录井及地质资料一起对比。把照片与岩性记录按井深对应起来。',note:'岩性变化要与照片和井深一起看。'}
  ];
  function showFieldStory(index){
    var story=fieldStories[index];if(!story)return;
    $('field-story').dataset.fieldStage=String(index);
    $('field-reading-kicker').textContent=story.kicker;$('field-reading-title').textContent=story.title;
    $('field-reading-copy').textContent=story.copy;$('field-reading-note').textContent=story.note;
    Array.prototype.forEach.call(document.querySelectorAll('[data-field-step]'),function(button){button.setAttribute('aria-pressed',String(Number(button.dataset.fieldStep)===index));});
    reportHeight();
  }
  var fieldSample=DATA.samples.filter(function(sample){return sample.split==='reference';})[0];
  function showFieldSample(sample){
    $('field-sample-image').src=sample.image;
    $('field-sample-credit').textContent='本例公开原图 · '+sample.id+' · 源井深 '+sample.depth+' m · 原标签：'+className(sample.classId);
  }
  showFieldSample(fieldSample);
  Array.prototype.forEach.call(document.querySelectorAll('[data-field-step]'),function(button){button.addEventListener('click',function(){showFieldStory(Number(button.dataset.fieldStep));});});
  showFieldStory(0);

    // Mechanism drawings describe cited methods; they are not measured weights or predictions.
  var attentionOn=false,multitaskOn=false;
  function renderAttention(){
    $('research-attention-viz').innerHTML='<svg viewBox="0 0 330 185" role="img" aria-label="残差网络特征先经过通道注意，再经过空间注意的机制示意"><text x="12" y="20">特征：哪些通道、哪些位置更有用？</text>'+[0,1,2].map(function(i){return '<rect x="'+(18+i*11)+'" y="'+(56-i*9)+'" width="62" height="68" fill="'+['#bdcfc1','#9ab4a9','#769e96'][i]+'" stroke="#698982"/>';}).join('')+'<path d="M111 90H133M211 90H234" stroke="#ac9c7f" stroke-width="2"/><rect x="136" y="47" width="70" height="82" rx="6" fill="#f1dfbf"/><text x="145" y="72">通道注意</text>'+[0,1,2,3].map(function(i){var weights=attentionOn?[.25,.9,.5,.72]:[.5,.5,.5,.5];return '<rect x="'+(146+i*13)+'" y="'+(115-weights[i]*33)+'" width="8" height="'+(weights[i]*33)+'" fill="#b88950"/>';}).join('')+'<rect x="237" y="47" width="80" height="82" rx="6" fill="#dae7df"/><text x="246" y="72">空间注意</text>'+[0,1,2,3,4,5,6,7,8].map(function(i){var op=attentionOn?[.1,.2,.2,.3,.95,.7,.2,.6,.4][i]:.35;return '<rect x="'+(252+i%3*16)+'" y="'+(80+Math.floor(i/3)*13)+'" width="13" height="10" fill="#b88146" opacity="'+op+'"/>';}).join('')+'<text x="18" y="160">CNN 特征</text><text x="136" y="160">选择通道</text><text x="238" y="160">突出位置</text></svg>';
    $('research-attention-note').textContent=attentionOn?'不同柱高与深浅只解释加权机制；不是本课权重，本课没有运行 CBAM。':'ResNet-18 + CBAM 机制示意；展开查看两种注意怎样作用。';
  }
  function renderMultitask(){
    $('research-multitask-viz').innerHTML='<svg viewBox="0 0 330 185" role="img" aria-label="一份共享图像表示分别用于颜色、形状与颗粒类型任务，地质属性关联连接各任务"><rect x="10" y="63" width="96" height="64" rx="7" fill="#cadbd1"/><text x="24" y="90">共享图像表示</text><text x="28" y="113">同一张岩屑图</text>'+['颜色','形状','颗粒类型'].map(function(n,i){return '<path d="M106 95H142V'+(35+i*58)+'H173" fill="none" stroke="#8bada3" stroke-width="2"/><rect x="177" y="'+(16+i*58)+'" width="99" height="38" rx="6" fill="#eee0c9"/><text x="194" y="'+(41+i*58)+'">'+n+'</text>';}).join('')+(multitaskOn?'<path d="M284 35H307V151H284M284 93H307" fill="none" stroke="#bd7746" stroke-width="2" stroke-dasharray="4 3"/><text x="17" y="172">知识引导：利用属性之间的先验关联</text>':'<text x="17" y="172">一个输入，多个预测任务</text>')+'</svg>';
    $('research-multitask-note').textContent=multitaskOn?'橙色连线表示属性关联的机制；本课缺少多属性标签，未复现该方法。':'颜色、形状、颗粒类型共用图像表示；连线为机制示意。';
  }
  $('research-attention-toggle').addEventListener('click',function(){attentionOn=!attentionOn;this.setAttribute('aria-pressed',String(attentionOn));renderAttention();reportHeight();});
  $('research-multitask-toggle').addEventListener('click',function(){multitaskOn=!multitaskOn;this.setAttribute('aria-pressed',String(multitaskOn));renderMultitask();reportHeight();});
  renderAttention();renderMultitask();



  var imageCache={};
  function sampleImage(sample){if(!imageCache[sample.id])imageCache[sample.id]=new Promise(function(resolve,reject){var image=new Image();image.onload=function(){resolve(image);};image.onerror=function(){reject(new Error('无法读取原图 '+sample.id));};image.src=sample.image;});return imageCache[sample.id];}
  function drawSampleCanvas(target,camClass){
    var id=currentId,sample=byId[id],roi=AUDIT[id].roi;
    var canvas=document.createElement('canvas');canvas.width=224;canvas.height=224;canvas.className='prepared-canvas';canvas.setAttribute('aria-label',camClass?'岩屑照片与'+className(camClass)+'类别响应':'实际裁切范围缩放到224×224');target.innerHTML='';target.appendChild(canvas);
    sampleImage(sample).then(function(image){
      var ctx=canvas.getContext('2d');ctx.drawImage(image,roi[0],roi[1],roi[2]-roi[0],roi[3]-roi[1],0,0,224,224);
      if(camClass){var raw=atob(RESULTS.samples[id].cam),offset=ids.indexOf(camClass)*49,heat=document.createElement('canvas');heat.width=7;heat.height=7;var hc=heat.getContext('2d'),pixels=hc.createImageData(7,7);for(var n=0;n<49;n++){var t=raw.charCodeAt(offset+n)/255;pixels.data[n*4]=255;pixels.data[n*4+1]=Math.round(210*(1-t));pixels.data[n*4+2]=24;pixels.data[n*4+3]=Math.round(t*.64*255);}hc.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(heat,0,0,224,224);}
      reportHeight();
    }).catch(function(error){target.textContent=error.message;});
  }
  function phaseSamples(){return DATA.samples.filter(function(s){return (s.split==='test')===(evaluationStage==='test');}).sort(function(a,b){return a.depth-b.depth;});}
  function selectSample(id,focus){
    if(!byId[id])return;currentId=id;evaluationStage=byId[id].split==='test'?'test':'validation';currentCamClass=RESULTS.samples[id].prediction;selectedDepthGroup=byId[id].group;
    showFieldSample(byId[id]);renderRockLesson(byId[id].classId,byId[id]);renderWorkflow();renderIdentification(Boolean(focus));publishLessonState();reportHeight();
  }
  function renderDepth(focus){
    var samples=phaseSamples(),y=34,previous=null,parts=[],chartWidth=600,photoX=64,sourceX=118,baselineX=217,resultX=316,scoreStart=416,scoreWidth=148,bandWidth=48;recordY={};
    samples.forEach(function(s,index){var gap=previous===null?0:s.depth-previous;if(index){if(gap>20){y+=68;parts.push('<g class="depth-break"><path d="M6 '+(y-34)+'l9 -5 9 5 9 -5"/><text x="52" y="'+(y-31)+'">间隔 '+gap+' m · 断轴</text></g>');}else y+=gap*10;}recordY[s.id]=y;
      var result=RESULTS.samples[s.id],different=result.prediction!==s.classId,selected=s.id===currentId;
      var label='井深 '+s.depth+' 米，原始记录 '+className(s.classId)+'，颜色参照 '+className(BASELINE.samples[s.id].prediction)+'，CNN 结果 '+className(result.prediction);
      var scoreX=scoreStart,scoreBars=result.scores.map(function(score,c){var x=scoreX;scoreX+=score*scoreWidth;return '<rect x="'+x.toFixed(2)+'" y="'+(y-6)+'" width="'+(score*scoreWidth).toFixed(2)+'" height="12" fill="'+classes[c].color+'"/>';}).join('');
      parts.push('<g class="depth-record '+(different?'is-different':'is-same')+(selected?' is-current':'')+'" data-pick="'+s.id+'" data-depth="'+s.depth+'" data-y="'+y+'" role="button" tabindex="'+(selected?'0':'-1')+'" aria-pressed="'+selected+'" aria-label="'+esc(label)+'"><title>'+esc(label)+'；'+classes.map(function(c,i){return c.name+' '+pct(result.scores[i]);}).join('，')+'</title><rect class="depth-hit" x="0" y="'+(y-10)+'" width="'+(chartWidth-4)+'" height="20"/><text class="depth-value" x="5" y="'+(y+4)+'">'+s.depth+'</text><image href="'+s.image+'" x="'+photoX+'" y="'+(y-9)+'" width="22" height="18" preserveAspectRatio="xMidYMid slice"/><rect x="'+sourceX+'" y="'+(y-5)+'" width="'+bandWidth+'" height="10" rx="2" fill="'+byClass[s.classId].color+'"/><rect x="'+baselineX+'" y="'+(y-5)+'" width="'+bandWidth+'" height="10" rx="2" fill="'+byClass[BASELINE.samples[s.id].prediction].color+'"/><rect x="'+resultX+'" y="'+(y-5)+'" width="'+bandWidth+'" height="10" rx="2" fill="'+byClass[result.prediction].color+'"/>'+scoreBars+(different?'<text class="record-difference" x="'+580+'" y="'+(y+5)+'">≠</text>':'')+'</g>');previous=s.depth;
    });
    var log=$('depth-log');log.innerHTML='<svg class="depth-track" viewBox="0 0 '+chartWidth+' '+(y+24)+'" role="group" aria-label="真实井深上的离散照片、原始岩性和分类结果">'+parts.join('')+'</svg>';
    if(focus&&log.clientHeight)log.scrollTop=Math.max(0,recordY[currentId]*log.clientWidth/chartWidth-log.clientHeight/2);
    var mismatch=samples.filter(function(s){return RESULTS.samples[s.id].prediction!==s.classId;}).length;
    $('depth-summary').textContent=(evaluationStage==='test'?'留出组':'开发组')+' · '+samples.length+' 张照片 · '+mismatch+' 张与原始记录不同';$('next-disagreement').disabled=mismatch===0;
  }
  function renderIdentification(focus){
    var s=byId[currentId],r=RESULTS.samples[currentId],different=r.prediction!==s.classId;
    $('sample-select').innerHTML=phaseSamples().map(function(p){return '<option value="'+p.id+'">'+p.depth+' m · '+p.id+'</option>';}).join('');$('sample-select').value=s.id;
    $('phase-validation').setAttribute('aria-pressed',String(evaluationStage==='validation'));$('phase-test').setAttribute('aria-pressed',String(evaluationStage==='test'));
    $('evaluation-sample-badge').textContent=(evaluationStage==='test'?'留出组':'开发组')+' / 井 '+s.well;
    $('query-image').src=s.image;$('query-id').textContent=s.id;$('query-depth').textContent='源井深 '+s.depth+' m';$('prediction').textContent=className(r.prediction);$('original-label').textContent=className(s.classId);$('baseline-label').textContent=className(BASELINE.samples[s.id].prediction);
    $('result-state').textContent=different?'与记录不同':'与记录相同';$('result-state').classList.toggle('is-different',different);$('comparison-note').classList.toggle('is-different',different);
    $('comparison-note').textContent=different?'CNN 与原始记录不同，可沿井深对照相邻照片及颜色参照。':'识别结果与原始记录相同，可继续查看相邻井深的变化。';
    $('class-scores').innerHTML=classes.map(function(c,i){return '<button type="button" class="class-score" data-cam-class="'+c.id+'" aria-pressed="'+(currentCamClass===c.id)+'"><span>'+c.name+'</span><i><b style="width:'+r.scores[i]*100+'%;background:'+c.color+'"></b></i><strong>'+pct(r.scores[i])+'</strong></button>';}).join('');
    $('response-label').textContent=className(currentCamClass)+' / 图像响应';drawSampleCanvas($('response-image'),currentCamClass);
    $('depth-legend').innerHTML=classes.map(function(c){return '<span><i style="background:'+c.color+'"></i>'+c.name+'</span>';}).join('');
    renderDepth(focus);renderEvaluation();renderDemoComparison();
  }
  function renderEvaluation(){
    $('phase-comparison').innerHTML=['validation','test'].map(function(phase){var m=RESULTS.metrics[phase];return '<div><span>'+(phase==='test'?'留出组 · 24 张':'开发组 · 42 张')+'</span><b>'+pct(m.accuracy)+'</b><small>与原始标签一致<br>宏平均 F1 '+m.macroF1.toFixed(3)+'</small></div>';}).join('');
    var matrix=RESULTS.metrics[evaluationStage].matrix;
    $('confusion-matrix').innerHTML='<table class="matrix" aria-label="当前分组的原始记录与识别结果"><caption>当前'+(evaluationStage==='test'?'留出组':'开发组')+'：行是原始记录，列是识别结果</caption><thead><tr><th>记录 ↓ / 结果 →</th>'+classes.map(function(c){return '<th scope="col">'+c.name+'</th>';}).join('')+'</tr></thead><tbody>'+classes.map(function(c,i){return '<tr><th scope="row">'+c.name+'</th>'+classes.map(function(d,j){return '<td><button type="button" data-matrix="'+i+'-'+j+'" '+(matrix[i][j]?'':'disabled')+'>'+matrix[i][j]+'</button></td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
    $('model-provenance').textContent='固定实验版本 '+RESULTS.version+' · 权重 IMAGENET1K_V1 · 权重 SHA-256 '+RESULTS.method.weightsSha256.slice(0,16)+'…';
  }
  $('sample-select').addEventListener('change',function(){selectSample(this.value,true);});
  ['validation','test'].forEach(function(phase){$('phase-'+phase).addEventListener('click',function(){if(evaluationStage===phase)return;var s=DATA.samples.find(function(p){return (p.split==='test')===(phase==='test');});selectSample(s.id,true);});});
  $('next-disagreement').addEventListener('click',function(){var pool=phaseSamples(),start=pool.findIndex(function(s){return s.id===currentId;});for(var n=1;n<=pool.length;n++){var s=pool[(start+n)%pool.length];if(RESULTS.samples[s.id].prediction!==s.classId){selectSample(s.id,true);break;}}});
  $('highlight-differences').addEventListener('change',function(){$('depth-log').classList.toggle('highlight-differences',this.checked);});
  $('depth-log').addEventListener('click',function(event){var row=event.target.closest('[data-pick]');if(row)selectSample(row.dataset.pick,false);});
  $('depth-log').addEventListener('keydown',function(event){var pool=phaseSamples(),at=pool.findIndex(function(s){return s.id===currentId;});if(event.key==='ArrowDown')at=Math.min(pool.length-1,at+1);else if(event.key==='ArrowUp')at=Math.max(0,at-1);else if(event.key==='Home')at=0;else if(event.key==='End')at=pool.length-1;else return;event.preventDefault();selectSample(pool[at].id,true);var row=$('depth-log').querySelector('[data-pick="'+currentId+'"]');if(row&&row.focus)row.focus({preventScroll:true});});
  $('class-scores').addEventListener('click',function(event){var b=event.target.closest('[data-cam-class]');if(b&&byClass[b.dataset.camClass]){currentCamClass=b.dataset.camClass;renderIdentification(false);reportHeight();}});
  $('confusion-matrix').addEventListener('click',function(event){var b=event.target.closest('[data-matrix]');if(!b)return;var pair=b.dataset.matrix.split('-').map(Number);var found=phaseSamples().find(function(s){return s.classId===ids[pair[0]]&&RESULTS.samples[s.id].prediction===ids[pair[1]];});if(found)selectSample(found.id,true);});
  function csvCell(value){return '"'+String(value==null?'':value).replace(/"/g,'""')+'"';}
  function downloadCSV(rows,name){var blob=new Blob(['\ufeff'+rows.map(function(row){return row.map(csvCell).join(',');}).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();window.setTimeout(function(){URL.revokeObjectURL(url);},1000);}
  function exportData(){var rows=[['sample_id','well','source_depth_m','source_label','source_path','source_url','image_sha256','width_px','height_px','roi_xyxy','group_20m','split','capture_conditions','lag_correction']];DATA.samples.forEach(function(s){var a=AUDIT[s.id];rows.push([s.id,s.well,s.depth,s.label,s.sourcePath,s.sourceUrl,s.sha256,a.width,a.height,a.roi.join(':'),s.group,s.split,'not_provided','not_provided']);});downloadCSV(rows,'m1-cuttings-data-manifest.csv');}
  function exportIdentificationRecords(){var rows=[['sample_id','well','source_depth_m','source_label','color_baseline_lithology','identified_lithology','score_sandstone','score_shale','score_dolomite','experiment_phase','fit_images','excluded_group','weights_sha256','image_sha256']];phaseSamples().forEach(function(s){var r=RESULTS.samples[s.id];rows.push([s.id,s.well,s.depth,s.label,className(BASELINE.samples[s.id].prediction),className(r.prediction)].concat(r.scores,[evaluationStage,r.fitCount,r.fold==='holdout'?'':r.fold,RESULTS.method.weightsSha256,s.sha256]));});downloadCSV(rows,'m1-identification-'+evaluationStage+'.csv');}
  $('export-identification').addEventListener('click',exportIdentificationRecords);
  function publishLessonState(){if(embedded&&sharingReady&&!applyingShared)window.parent.postMessage({__m1StateUpdate:{sampleId:currentId,stage:evaluationStage}},'*');}
  window.addEventListener('message',function(event){if(event.source!==window.parent||!event.data)return;if(embedded&&['background','workflow','demo'].indexOf(event.data.__m1Section)>=0&&(!document.body.dataset.m1Section||document.body.dataset.m1Section===event.data.__m1Section)){portalSection=event.data.__m1Section;setView(portalSection,false);}
    if(embedded&&event.data.__m1ScrollToTop)window.scrollTo(0,0);if(event.data.__m1NavigationAck===navigationPending)navigationPending=null;if(Object.prototype.hasOwnProperty.call(event.data,'__m1SharedState')){sharingReady=true;var state=event.data.__m1SharedState;if(state&&byId[state.sampleId]){applyingShared=true;selectSample(state.sampleId);applyingShared=false;}else publishLessonState();}});
  $('flow-sample-select').innerHTML=DATA.samples.map(function(s){return '<option value="'+s.id+'">'+s.id+' · '+s.depth+' m</option>';}).join('');
    var networkStage=0,batchTimer=null,batchToken=0,batchIndex=0,batchPlaying=false,resultView='both';
  function correctCount(m){return m.matrix.reduce(function(n,row,i){return n+row[i];},0);}
  function methodComparisonHTML(){
    return '<div class="method-comparison-grid">'+['validation','test'].map(function(phase){var a=BASELINE.metrics[phase],b=RESULTS.metrics[phase],delta=(b.accuracy-a.accuracy)*100;return '<article><h4>'+(phase==='test'?'留出组 · 24 张':'开发组逐组验证 · 42 张')+'</h4><div class="method-bar"><span>常规颜色参照</span><i><b style="width:'+a.accuracy*100+'%"></b></i><strong>'+correctCount(a)+'/'+a.count+'</strong></div><div class="method-bar is-cnn"><span>CNN 迁移学习</span><i><b style="width:'+b.accuracy*100+'%"></b></i><strong>'+correctCount(b)+'/'+b.count+'</strong></div><p class="method-delta '+(delta<0?'is-lower':'')+'">CNN '+(delta>=0?'+':'')+delta.toFixed(1)+' 个百分点</p><small>与源标签一致的照片数；'+(phase==='test'?'本组 CNN 的精度更低。':'每个井段的结果都来自其他开发组拟合的分类层。')+'</small></article>';}).join('')+'</div><p class="fine-print">常规参照使用 12 维 RGB 直方图与最近类别中心，是计算基线，不是人工专家成绩。两种方法使用相同原图、裁切和外层分组。</p>';
  }
  function networkHTML(){
    var names=['照片输入','卷积与残差','三类分类层','岩性候选'],explain=[
      '把当前照片中心区域缩放为 224×224，并按预训练网络的规则归一化。',
      'ResNet-18 的四个残差阶段逐层组合边缘、纹理与形态，最后得到 512×7×7 的特征图；本课卷积层保持固定。',
      '平均池化形成 512 维表征，只用当前拟合组的标签训练三类线性分类层；当前被检查的井段不参与该次拟合。',
      '得到三类分类得分，取最高分作为候选。下方响应图按当前照片、当前类别的实际 Grad-CAM 计算。'
    ];
    return '<div class="cnn-stage-nav">'+names.map(function(n,i){return '<button type="button" data-network-stage="'+i+'" aria-pressed="'+(networkStage===i)+'"><b>0'+(i+1)+'</b>'+n+'</button>';}).join('')+'</div><svg class="cnn-structure" viewBox="0 0 680 150" role="img" aria-label="照片经过固定的残差网络，再由本课拟合的三类分类层得到候选"><defs><marker id="cnn-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#6f918d" stroke-width="1.5"/></marker></defs><rect x="8" y="45" width="83" height="61" rx="6" fill="#e9d8ba"/><text x="24" y="73">RGB 照片</text><text x="19" y="94">224×224</text><path d="M96 76H122M419 76H451M551 76H582" stroke="#6f918d" stroke-width="2" marker-end="url(#cnn-arrow)"/><rect x="132" y="25" width="276" height="100" rx="9" fill="#e5ede8" stroke="#adbdaf"/><text x="145" y="46">固定 ResNet-18 · 4 个残差阶段</text>'+[0,1,2,3].map(function(i){return '<rect x="'+(151+i*59)+'" y="60" width="45" height="45" rx="4" fill="'+['#a5c0b2','#8aafa4','#6c9994','#527e80'][i]+'"/><text x="'+(158+i*59)+'" y="88" fill="#fff">'+[64,128,256,512][i]+'</text>';}).join('')+'<path d="M153 56V14H193V56" fill="none" stroke="#b48751" stroke-width="1.5"/><text x="217" y="13">阶段内的残差跳接 · 示意</text><rect x="462" y="45" width="80" height="61" rx="6" fill="#e5d5bb"/><text x="477" y="72">分类层</text><text x="474" y="93">本课拟合</text><rect x="592" y="45" width="80" height="61" rx="6" fill="#d7e5d9"/><text x="605" y="73">三类得分</text><text x="605" y="94">岩性候选</text></svg><p class="network-reading">'+explain[networkStage]+'</p>';
  }
  function renderTerminology(){
    $('glossary-table-body').innerHTML=TEACHING.terms.map(function(t){return '<tr><th scope="row">'+esc(t[0])+'</th><td>'+esc(t[1])+'</td><td>'+esc(t[2])+'</td></tr>';}).join('');
  }
  function stopBatchPlayback(){batchToken++;if(batchTimer&&window.clearTimeout)window.clearTimeout(batchTimer);batchTimer=null;}
  function updateBatchDisplay(){
    var pool=phaseSamples(),shown=pool.slice(0,batchIndex),at=pool.findIndex(function(s){return s.id===currentId;}),start=Math.min(Math.max(0,at-2),Math.max(0,pool.length-6)),recent=batchPlaying?shown.slice(-6):pool.slice(start,start+6);
    $('ordinary-photo-grid').innerHTML=(recent.length?recent:pool.slice(0,6)).map(function(s){return '<button type="button" data-batch-pick="'+s.id+'"><img src="'+s.image+'" alt="源井深 '+s.depth+' 米的岩屑原图"><span>'+s.depth+' m</span><small>原记录 '+s.label+'</small></button>';}).join('');
    $('batch-count').textContent=batchIndex+' / '+pool.length+' 张';$('batch-progress').style.width=batchIndex/pool.length*100+'%';
    $('batch-output').innerHTML=recent.length?recent.map(function(s){var r=RESULTS.samples[s.id];return '<button type="button" data-batch-pick="'+s.id+'"><span>'+s.depth+' m</span><b style="--rock:'+byClass[r.prediction].color+'">'+className(r.prediction)+'</b><small>'+pct(Math.max.apply(null,r.scores))+'</small></button>';}).join(''):'<p class="fine-print">点击播放，查看本批结果逐条形成。</p>';
    $('batch-state').textContent=batchIndex===pool.length?'固定实验结果：本批候选与分类得分已按井深整理完成。':'固定实验结果回放；不把播放时间当作模型推理耗时。';
  }
  function renderDemoComparison(){
    stopBatchPlayback();var pool=phaseSamples();batchIndex=pool.length;batchPlaying=false;
    $('result-batch-note').textContent='同一批输入：'+pool.length+' 张照片、源井深与原始标签。';
    $('result-comparison').dataset.resultView=resultView;
    $('comparison-benchmarks').innerHTML=methodComparisonHTML();updateBatchDisplay();
  }
  $('play-batch').addEventListener('click',function(){
    stopBatchPlayback();var token=batchToken,total=phaseSamples().length;batchPlaying=true;batchIndex=0;updateBatchDisplay();
    function tick(){if(token!==batchToken)return;batchIndex=motionPaused?total:Math.min(total,batchIndex+1);updateBatchDisplay();if(batchIndex<total)batchTimer=window.setTimeout(tick,70);}
    tick();
  });
  $('result-comparison').addEventListener('click',function(event){var viewButton=event.target.closest('button[data-result-view]');if(viewButton){resultView=viewButton.dataset.resultView;$('result-comparison').dataset.resultView=resultView;Array.prototype.forEach.call(document.querySelectorAll('button[data-result-view]'),function(b){b.setAttribute('aria-pressed',String(b.dataset.resultView===resultView));});return;}var sample=event.target.closest('[data-batch-pick]');if(sample)selectSample(sample.dataset.batchPick,true);});

    // The six teaching steps share the actual source images and fixed experiment records.
  var imageStage=0,selectedDepthGroup=null;
  function groupData(){var grouped={};DATA.samples.forEach(function(s){(grouped[s.group]||(grouped[s.group]=[])).push(s);});return grouped;}
  function tinyHistogram(hist){var max=Math.max.apply(null,hist);return '<span class="overview-bars audit-bars">'+hist.map(function(n){return '<i style="height:'+Math.max(2,n/max*50)+'px"></i>';}).join('')+'</span>';}
  function responseGrid(s){var r=RESULTS.samples[s.id],raw=atob(r.cam),offset=ids.indexOf(r.prediction)*49;return '<span class="overview-response" aria-label="当前照片的实际类别响应">'+Array.from({length:49},function(_,i){return '<i style="opacity:'+(0.08+raw.charCodeAt(offset+i)/255*.92)+'"></i>';}).join('')+'</span>';}
  function renderFlowOverview(){
    var s=byId[currentId],tiles=[
      '<img class="data-overview-photo" src="'+s.image+'" alt=""><em>66 张照片 / 三类岩性</em>',
      '<span class="overview-crop"><img src="'+s.image+'" alt=""><i></i></span><em>中心 72% → 224×224</em>',
      '<span class="overview-pools"><span><b>42</b>开发用</span><span><b>24</b>留出</span></span><em>17 个井段组</em>',
      responseGrid(s)+'<em>CNN · 实际类别响应</em>',
      '<span class="overview-methods"><b>24 → 37</b><small>开发组一致张数 / 42</small></span><em>两组结果一起看</em>',
      '<b class="data-overview-number">'+s.depth+'<small>m / 井 '+esc(s.well)+'</small></b><em>照片、候选与井深对应</em>'
    ];tiles.forEach(function(html,i){$('flow-viz-'+i).innerHTML=html;});
  }
  function renderWorkflow(){
    var item=flowText[workflowStep],s=byId[currentId],a=AUDIT[currentId],r=RESULTS.samples[currentId],snapshot=$('flow-snapshot');
    $('flow-sample-image').src=s.image;$('flow-sample-select').value=s.id;$('flow-sample-meta').textContent=s.id+' · 井 '+s.well+' · 源井深 '+s.depth+' m';
    $('flow-kicker').textContent='步骤 0'+(workflowStep+1)+' / '+item.role;$('flow-title').textContent=item.name;$('flow-subtitle').textContent=item.title;$('flow-copy').textContent=item.process;$('flow-input').textContent=item.input;$('flow-why').textContent=item.why;$('flow-output').textContent=item.output;$('flow-trap').textContent=item.trap;
    $('flow-count').textContent=(workflowStep+1)+' / '+flowText.length;$('flow-prev').disabled=workflowStep===0;$('flow-next').disabled=workflowStep===flowText.length-1;
    $('workflow-detail').classList.toggle('is-ai-lesson',!!item.ai);Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(b){b.setAttribute('aria-pressed',String(Number(b.dataset.step)===workflowStep));});renderFlowOverview();
    if(workflowStep===0){snapshot.innerHTML='<span class="mini-label">本课的业务场景 / 教学任务设定</span><h4>'+TEACHING.scenario.title+'</h4><p class="scenario-setting">'+TEACHING.scenario.setting+'</p><div class="scenario-input-output"><div><b>收到什么</b><p>'+TEACHING.scenario.input+'</p></div><span>→</span><div><b>交付什么</b><p>'+TEACHING.scenario.output+'</p></div></div><div class="scenario-sample"><img src="'+s.image+'" alt="当前真实样品"><div><b>'+s.id+' / '+s.depth+' m</b><p>原记录：'+s.label+'</p><small>这张照片会贯穿数据准备、CNN 识别和结果对照。</small></div></div><p class="fine-print">'+TEACHING.scenario.note+'</p><button type="button" class="primary-button" data-jump-ai>直接看 AI 改变哪一步 →</button>';}
    if(workflowStep===1){var names=['原始照片','裁切位置','统一尺寸'];snapshot.innerHTML='<h4>一张原图，统一处理后进入分类。</h4><div class="processing-stages">'+names.map(function(n,i){return '<button type="button" data-image-stage="'+i+'" aria-pressed="'+(imageStage===i)+'">'+n+'</button>';}).join('')+'</div><div class="processing-figure">'+(imageStage<2?'<div class="processing-photo"><img src="'+s.image+'" alt="'+names[imageStage]+'">'+(imageStage===1?'<span class="roi-outline"></span>':'')+'</div>':'<div id="prepared-image"></div>')+'</div><div class="technical-readout">'+['原始 JPEG：'+a.width+'×'+a.height+' px，'+(a.bytes/1024).toFixed(1)+' KiB；原图与源记录保留。','统一裁切坐标：('+a.roi[0]+', '+a.roi[1]+') → ('+a.roi[2]+', '+a.roi[3]+')。','224×224 RGB；不是新增比例尺，也没有变成逐颗岩屑分割。'][imageStage]+'</div><div class="label-correspondence"><span>'+esc(s.sourcePath.split('/').pop())+'</span><i>↔</i><b>'+s.label+'</b><i>↔</i><span>'+s.depth+' m</span></div><details><summary>查看原图信息与资料缺口</summary>'+tinyHistogram(a.histogram)+'<p class="fine-print">原图灰度均值 '+a.brightness+'，标准差 '+a.contrast+'。66 张图没有完全相同的 SHA-256；取样时间、完整拍摄条件与迟到校正状态未提供。</p><p class="source-file-path">'+s.sha256+'</p></details>';if(imageStage===2)drawSampleCanvas(snapshot.querySelector('#prepared-image'),null);}
    if(workflowStep===2){var grouped=groupData(),keys=Object.keys(grouped).sort(function(x,y){return Number(x.split('-').pop())-Number(y.split('-').pop());});if(!selectedDepthGroup)selectedDepthGroup=s.group;var selected=grouped[selectedDepthGroup],start=Number(selectedDepthGroup.split('-').pop());snapshot.innerHTML='<h4>同一井段组，只进入一边。</h4><div class="technical-pools"><div><b>42 张</b><span>开发用 · 12 组</span></div><div><b>24 张</b><span>留出 · 5 组</span></div></div><div class="depth-group-picker">'+keys.map(function(key){var p=grouped[key],begin=Number(key.split('-').pop());return '<button type="button" data-depth-group="'+key+'" class="'+p[0].split+'" aria-pressed="'+(key===selectedDepthGroup)+'"><b>'+begin+'—'+(begin+19)+' m</b><small>'+p.length+' 张 / '+(p[0].split==='test'?'留出':'开发用')+'</small></button>';}).join('')+'</div><div class="group-readout"><b>'+start+'—'+(start+19)+' m</b><p>'+classes.map(function(c){return c.name+' '+selected.filter(function(p){return p.classId===c.id;}).length+' 张';}).join(' · ')+'</p></div><p class="fine-print">开发组按井段逐组留出，每次只用其他开发组拟合。整批留出组仅使用 42 张开发图拟合的分类层。</p>';}
    if(workflowStep===3){snapshot.innerHTML='<div class="traditional-ai"><div><span class="mini-label">传统观察怎样做</span><h4>看外观，再结合专业资料描述。</h4><ol><li>观察颜色、颗粒与结构。</li><li>对照标准样，必要时做酸反应或显微观察。</li><li>把岩性描述与样品井深对应。</li></ol></div><div><span class="mini-label">本课 AI 替代哪一段</span><h4>统一提取照片特征，生成初始分类。</h4><p>照片输入 CNN，由多层纹理与形态表征得到三类得分。现场取样、井深对应和矿物鉴定仍有各自的数据要求。</p></div></div>'+networkHTML()+'<div class="flow-ai-evidence"><div><div id="flow-ai-response" class="response-image"></div><small>当前照片的实际类别响应</small></div><div><b>'+s.id+' / '+s.depth+' m</b><div class="flow-ai-score-list">'+classes.map(function(c,i){return '<button type="button" data-flow-cam="'+c.id+'" aria-pressed="'+(currentCamClass===c.id)+'"><span>'+c.name+'</span><i><b style="width:'+r.scores[i]*100+'%;background:'+c.color+'"></b></i><strong>'+pct(r.scores[i])+'</strong></button>';}).join('')+'</div><p class="fine-print">本条分类层由 '+r.fitCount+' 张照片拟合；'+(r.fold==='holdout'?'留出照片未参与拟合。':'排除了当前整个井段组。')+'</p></div></div>';drawSampleCanvas(snapshot.querySelector('#flow-ai-response'),currentCamClass);}
    if(workflowStep===4){snapshot.innerHTML='<h4>同照片、同裁切、同分组，比较两种图像方法。</h4>'+methodComparisonHTML()+'<div class="selected-methods"><span>当前 '+s.id+'</span><p>原记录 <b>'+s.label+'</b> · 颜色参照 <b>'+className(BASELINE.samples[s.id].prediction)+'</b> · CNN <b>'+className(r.prediction)+'</b></p></div>';}
    if(workflowStep===5){var pool=phaseSamples(),at=pool.findIndex(function(p){return p.id===s.id;}),near=pool.slice(Math.max(0,at-2),Math.min(pool.length,at+4));snapshot.innerHTML='<h4>一条结果，关联照片、井深与原记录。</h4><div class="delivery-records"><table><thead><tr><th>井深 / m</th><th>原记录</th><th>颜色参照</th><th>CNN 候选</th></tr></thead><tbody>'+near.map(function(p){return '<tr class="'+(p.id===s.id?'is-current':'')+'"><td><button type="button" data-depth-example="'+p.id+'">'+p.depth+'</button></td><td>'+p.label+'</td><td>'+className(BASELINE.samples[p.id].prediction)+'</td><td>'+className(RESULTS.samples[p.id].prediction)+'</td></tr>';}).join('')+'</tbody></table></div><p class="fine-print">表中每行都能回到原图。示范页使用同一批结果，不补画缺失井段。</p><div class="delivery-buttons"><button type="button" class="quiet-button" data-export-data>导出 66 张数据清单 ↓</button><button type="button" class="primary-button" data-export-results>导出本组识别记录 ↓</button></div>';}
    reportHeight();
  }
  function changeWorkflowStep(next,focus){workflowStep=Math.max(0,Math.min(flowText.length-1,next));renderWorkflow();if(focus){var buttons=document.querySelectorAll('[data-step]');if(buttons[workflowStep])buttons[workflowStep].focus({preventScroll:true});}}
  Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(button){button.addEventListener('click',function(){changeWorkflowStep(Number(button.dataset.step),false);});button.addEventListener('keydown',function(event){var next=Number(button.dataset.step);if(event.key==='ArrowRight')next++;else if(event.key==='ArrowLeft')next--;else if(event.key==='Home')next=0;else if(event.key==='End')next=flowText.length-1;else return;event.preventDefault();changeWorkflowStep(next,true);});});
  $('flow-prev').addEventListener('click',function(){changeWorkflowStep(workflowStep-1,false);});$('flow-next').addEventListener('click',function(){changeWorkflowStep(workflowStep+1,false);});$('flow-sample-select').addEventListener('change',function(){selectSample(this.value);});
  $('flow-snapshot').addEventListener('click',function(event){
    var group=event.target.closest('[data-depth-group]');if(group){selectedDepthGroup=group.dataset.depthGroup;renderWorkflow();return;}
    var stage=event.target.closest('[data-image-stage]');if(stage){imageStage=Number(stage.dataset.imageStage);renderWorkflow();return;}
    var net=event.target.closest('[data-network-stage]');if(net){networkStage=Number(net.dataset.networkStage);renderWorkflow();return;}
    var cam=event.target.closest('[data-flow-cam]');if(cam&&byClass[cam.dataset.flowCam]){currentCamClass=cam.dataset.flowCam;renderWorkflow();renderIdentification(false);return;}
    var record=event.target.closest('[data-depth-example]');if(record){selectSample(record.dataset.depthExample);return;}
    if(event.target.closest('[data-jump-ai]')){changeWorkflowStep(3,true);return;}
    if(event.target.closest('[data-export-data]'))exportData();if(event.target.closest('[data-export-results]'))exportIdentificationRecords();
  });

  renderTerminology();
  selectSample(currentId);setView(portalSection||window.location.hash.slice(1)||'background',false);
  if(embedded)window.parent.postMessage({__m1StateRequest:true},'*');
  if(window.ResizeObserver)new window.ResizeObserver(reportHeight).observe(document.body);window.addEventListener('load',reportHeight);window.addEventListener('resize',function(){renderDepth(false);reportHeight();});
}());
