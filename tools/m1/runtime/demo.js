(function(){
  'use strict';
  var DATA=window.M1_DATA,RESULTS=window.M1_RESULTS,AUDIT=window.M1_AUDIT;
  var $=function(id){return document.getElementById(id);};
  var esc=function(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});};
  var classes=DATA.classes,ids=classes.map(function(c){return c.id;}),byClass={},byId={};
  classes.forEach(function(c){byClass[c.id]=c;});DATA.samples.forEach(function(s){byId[s.id]=s;});
  var className=function(id){return byClass[id]?byClass[id].name:'未标注';},pct=function(v){return (v*100).toFixed(1)+'%';};
  var currentId=DATA.samples[0].id,currentCamClass=RESULTS.samples[currentId].prediction,evaluationStage='validation';
  var workflowStep=0,view='background',motionPaused=false,ready=true,pendingRock=null,recordY={};
  var sharingReady=false,applyingShared=false,navigationPending=null;
  var flowText=[{"name":"保留样品与原图","role":"原始资料","title":"先保留一份不被改写的原始记录。","input":"岩屑照片、原始岩性记录和来源文件。","process":"为每张照片建立唯一编号，保留原始 JPEG、来源路径和校验值。处理后的图片另行保存，始终能找到原图。","why":"文件改名、压缩或覆盖后，照片可能与记录失去对应；保留原图才能追查处理过程。","output":"66 张原始 JPEG，以及逐图编号、路径和 SHA-256 清单。","trap":"公开原图已保留；现场取样、清洗与筛分过程没有完整记录，不将这些步骤写成已完成。"},{"name":"对上井深与来源","role":"样品对应","title":"照片必须能回到具体井段。","input":"样品编号、井号、源记录井深及取样资料。","process":"把照片与同一行岩性、井号和井深对应，检查是否存在缺失或冲突。现场还要记录取样时间和迟到校正状态。","why":"井深对应错误，即使照片清楚，也会把岩性变化放到错误井段。","output":"可按井深排序的样品索引，照片与记录一一对应。","trap":"本例只沿用源井深；缺少取样时间和迟到校正记录，不用示意参数改写真实井深。"},{"name":"检查图像与重复","role":"质量检查","title":"先发现看不清和重复出现的照片。","input":"原始图像、逐图像素信息和校验值。","process":"检查曝光、清晰度、背景遮挡与完全重复文件。用真实图像的灰度分布辅助观察，不能仅凭一个数值决定是否保留。","why":"暗照明、泥浆和背景会遮住岩屑外观；同一文件重复出现也会夸大数据量。","output":"可查看的图像质量信息、完全重复检查和缺失资料说明。","trap":"66 张原图没有相同 SHA-256；这只排除了完全相同文件，没有证明不同井深的照片互不相似。"},{"name":"统一画面与尺寸","role":"图像整理","title":"原图保留，处理规则统一。","input":"通过检查的原始照片与明确的裁切、缩放规则。","process":"本例统一保留中心 72% 区域，再缩放到 224×224。切换原图、裁切位置和处理结果，查看边缘信息怎样被舍弃。","why":"统一画面和像素尺寸，减少边框干扰；所有照片遵循同一规则，避免逐张随意处理。","output":"224×224 RGB 图像和对应原图、裁切坐标的记录。","trap":"固定中心裁切不等于岩屑分割；像素尺寸也不是物理比例尺，不能据此测量原岩粒度。"},{"name":"整理岩性标签","role":"标签核对","title":"先统一名称，再明确一个标签代表什么。","input":"源记录中的岩性名称、照片与命名规则。","process":"整理三类名称，核对空标签、拼写和照片对应关系。混合样品应说明标签规则；不能把整图标签当成每颗岩屑的标签。","why":"同物异名、错位和混样会改变任务本身，单靠增加照片数量解决不了。","output":"细砂岩、页岩、灰质白云岩三类词表，以及沿用源标签的说明。","trap":"本例没有新增矿物鉴定或颗粒含量标注；标签沿用公开记录，不补造确定性。"},{"name":"按井段分组","role":"用途划分","title":"相邻照片放在一起，整组分配用途。","input":"已对应井深的样品索引和类别数量。","process":"按 20 m 井段将照片分成 17 组。42 张作为开发用资料，24 张单独留出；一个井段组只进入一边。","why":"相邻照片常有相似的外观和成像条件。把它们拆散，再当成独立来源，会夸大数据的代表性。","output":"12 个开发组与 5 个留出组，以及可追溯的分组清单。","trap":"20 m 是本例分组宽度，不是原始取样间隔；数据仅来自井 2，不能代表新井的条件。"},{"name":"交付数据清单","role":"整理交付","title":"交付的不只是图片，还包括它们的来历。","input":"原图、样品索引、标签词表、处理规则和用途划分。","process":"一起交付原图、逐图清单和处理说明。检查哪些字段齐全、哪些现场信息仍缺失，再决定数据适合怎样使用。","why":"没有来源和处理记录的数据，很难重现，也无法判断出现问题的是照片、标签还是井深。","output":"可导出的 66 张照片清单，保留来源、井深、标签、分组与校验值。","trap":"本例适合课程中的固定小样本实验；现场应用仍需补齐取样、处理、拍摄条件及独立井资料。"}];
  var sectionQuery=new URLSearchParams(window.location.search||'');
  var portalSection=window.__CASE_DEMO_VIEW__||sectionQuery.get('section');
  var embedded=Boolean(window.__CASE_DEMO_VIEW__)||sectionQuery.get('embed')==='portal';
  if(embedded){document.body.classList.add('embedded');var brand=document.querySelector?document.querySelector('.wordmark'):null;if(brand){brand.removeAttribute('href');brand.setAttribute('aria-label','M1 岩屑岩性辅助识别');}}
  function reportHeight(){if(window.parent!==window)window.parent.postMessage({__m1Height:Math.ceil(document.body.getBoundingClientRect().height)},'*');}
  function setView(next,focus,scroll){
    if(['background','workflow','demo'].indexOf(next)<0)next='background';view=next;
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'),function(b){var active=b.dataset.view===next;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus({preventScroll:true});});
    ['background','workflow','demo'].forEach(function(n){$('panel-'+n).hidden=n!==next;});
    if(next==='workflow')renderWorkflow();if(next==='demo')renderIdentification(true);
    try{window.history.replaceState(null,'','#'+next);}catch(e){}
    if(scroll&&!embedded&&$('panel-'+next).scrollIntoView)$('panel-'+next).scrollIntoView({block:'start',behavior:'instant'});reportHeight();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-view]'),function(b,index,buttons){b.addEventListener('click',function(){setView(b.dataset.view,false,true);});b.addEventListener('keydown',function(event){var at=index;if(event.key==='ArrowRight')at=(index+1)%3;else if(event.key==='ArrowLeft')at=(index+2)%3;else if(event.key==='Home')at=0;else if(event.key==='End')at=2;else return;event.preventDefault();setView(buttons[at].dataset.view,true,true);});});
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'),function(b){b.addEventListener('click',function(){var next=b.dataset.go;if(!embedded){setView(next,true,true);return;}var token=String(Date.now());navigationPending=token;window.parent.postMessage({__m1Navigate:next,token:token},'*');window.setTimeout(function(){if(navigationPending===token){navigationPending=null;setView(next,true,true);}},350);});});
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
      return '<div class="split-row"><header><span>'+c.name+'</span><span>'+reference+' 参考 / '+test+' 测试</span></header><div class="split-track"><span class="reference" style="width:'+reference/(reference+test)*100+'%">'+reference+'</span><span class="test" style="width:'+test/(reference+test)*100+'%">'+test+'</span></div></div>';
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
    $('research-capture-a').src=sample.image;$('research-capture-b').src=sample.image;
    $('field-sample-credit').textContent='本例公开原图 · '+sample.id+' · 源井深 '+sample.depth+' m · 原标签：'+className(sample.classId);
  }
  showFieldSample(fieldSample);
  Array.prototype.forEach.call(document.querySelectorAll('[data-field-step]'),function(button){button.addEventListener('click',function(){showFieldStory(Number(button.dataset.fieldStep));});});
  showFieldStory(0);

    // Mechanism illustrations only: positions and particles are not measured data.
  var researchColors=classes.map(function(c){return c.color;});
  var researchPoints=[[65,66,0],[88,55,0],[109,72,0],[57,93,0],[81,91,1],[105,103,0],[72,116,0],[126,91,0],[203,57,2],[225,48,2],[244,68,2],[218,78,2],[201,123,1],[225,112,1],[245,132,1],[219,145,1]];
  $('research-label-viz').innerHTML='<svg viewBox="0 0 310 192" role="img" aria-label="外观相似的样本在图中特征位置靠近，颜色表示已有标签；蓝灰点位于砂色点群中，提示需要核对。"><text x="16" y="23">外观特征空间 · 示意</text>'+researchPoints.map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="7" fill="'+researchColors[p[2]]+'"/>';}).join('')+'<g class="audit-mark"><circle cx="81" cy="91" r="16" fill="none" stroke="#cf514b" stroke-width="2.5"/><path d="M96 96L157 164H281" fill="none" stroke="#cf514b" stroke-width="1.5"/><text x="161" y="156">标签值得核对</text></g></svg>';
  var researchLegend='<div class="research-legend">'+classes.map(function(c){return '<span><i style="background:'+c.color+'"></i>'+c.name+'</span>';}).join('')+'</div>';
  $('research-label-viz').innerHTML+=researchLegend;
  var researchParticles=['42,56 70,43 84,65 64,83 39,74','107,48 133,53 142,77 119,87 100,71','171,48 197,43 210,66 188,82 167,68','231,54 257,49 273,75 246,85 228,71','49,108 77,100 90,122 75,145 48,138','113,111 136,100 151,123 136,146 112,139','177,111 199,103 216,123 199,147 174,136','237,108 266,105 279,129 254,146 233,131'];
  $('research-grain-viz').innerHTML='<svg viewBox="0 0 310 192" role="img" aria-label="同一盘示意岩屑的两种输出表达；整图模式给一个标签，颗粒模式为各碎块显示类别。"><rect class="grain-tray" x="18" y="33" width="275" height="127" rx="13"/><text class="whole-caption" x="18" y="22">整图：一个标签</text><text class="grain-caption" x="18" y="22">逐颗：保留类别差异</text>'+researchParticles.map(function(p,i){return '<polygon class="research-particle" points="'+p+'" style="--particle:'+researchColors[[0,0,1,0,2,0,1,0][i]]+'"/>';}).join('')+'</svg><div class="grain-legend">'+researchLegend+'</div>';
  $('research-label-toggle').addEventListener('click',function(){
    var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));$('research-label-viz').classList.toggle('is-auditing',on);
    $('research-label-note').textContent=on?'圈出的点与周围标签不同；外观相近本身不能证明原标签错误。':'特征空间示意：同色为同类标签，点靠近表示外观相似。';reportHeight();
  });
  $('research-capture-toggle').addEventListener('click',function(){var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));$('research-capture-viz').classList.toggle('is-dim',on);});
  $('research-grain-toggle').addEventListener('click',function(){
    var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));$('research-grain-viz').classList.toggle('is-grain',on);
    $('research-grain-note').textContent=on?'机理示意，非本课分割结果；颜色表示类别，不是实测矿物含量。':'输出粒度示意：整盘只给一个标签，会省略混合样品中的类别差异。';reportHeight();
  });



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
    var samples=phaseSamples(),y=34,previous=null,parts=[],mobile=window.matchMedia&&window.matchMedia('(max-width:600px)').matches,chartWidth=mobile?300:474,photoX=mobile?46:64,sourceX=mobile?86:112,resultX=mobile?144:195,scoreStart=mobile?201:280,scoreWidth=mobile?79:154,bandWidth=mobile?36:48;recordY={};
    samples.forEach(function(s,index){var gap=previous===null?0:s.depth-previous;if(index){if(gap>20){y+=68;parts.push('<g class="depth-break"><path d="M6 '+(y-34)+'l9 -5 9 5 9 -5"/><text x="52" y="'+(y-31)+'">间隔 '+gap+' m · 断轴</text></g>');}else y+=gap*10;}recordY[s.id]=y;
      var result=RESULTS.samples[s.id],different=result.prediction!==s.classId,selected=s.id===currentId;
      var label='井深 '+s.depth+' 米，原始记录 '+className(s.classId)+'，识别结果 '+className(result.prediction);
      var scoreX=scoreStart,scoreBars=result.scores.map(function(score,c){var x=scoreX;scoreX+=score*scoreWidth;return '<rect x="'+x.toFixed(2)+'" y="'+(y-6)+'" width="'+(score*scoreWidth).toFixed(2)+'" height="12" fill="'+classes[c].color+'"/>';}).join('');
      parts.push('<g class="depth-record '+(different?'is-different':'is-same')+(selected?' is-current':'')+'" data-pick="'+s.id+'" data-depth="'+s.depth+'" data-y="'+y+'" role="button" tabindex="'+(selected?'0':'-1')+'" aria-pressed="'+selected+'" aria-label="'+esc(label)+'"><title>'+esc(label)+'；'+classes.map(function(c,i){return c.name+' '+pct(result.scores[i]);}).join('，')+'</title><rect class="depth-hit" x="0" y="'+(y-10)+'" width="'+(chartWidth-4)+'" height="20"/><text class="depth-value" x="5" y="'+(y+4)+'">'+s.depth+'</text><image href="'+s.image+'" x="'+photoX+'" y="'+(y-9)+'" width="22" height="18" preserveAspectRatio="xMidYMid slice"/><rect x="'+sourceX+'" y="'+(y-5)+'" width="'+bandWidth+'" height="10" rx="2" fill="'+byClass[s.classId].color+'"/><rect x="'+resultX+'" y="'+(y-5)+'" width="'+bandWidth+'" height="10" rx="2" fill="'+byClass[result.prediction].color+'"/>'+scoreBars+(different?'<text class="record-difference" x="'+(mobile?286:446)+'" y="'+(y+5)+'">≠</text>':'')+'</g>');previous=s.depth;
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
    $('query-image').src=s.image;$('query-id').textContent=s.id;$('query-depth').textContent='源井深 '+s.depth+' m';$('prediction').textContent=className(r.prediction);$('original-label').textContent=className(s.classId);
    $('result-state').textContent=different?'与记录不同':'与记录相同';$('result-state').classList.toggle('is-different',different);$('comparison-note').classList.toggle('is-different',different);
    $('comparison-note').textContent=different?'两列给出的岩性不同，可沿井深对照相邻照片。':'识别结果与原始记录相同，可继续查看相邻井深的变化。';
    $('class-scores').innerHTML=classes.map(function(c,i){return '<button type="button" class="class-score" data-cam-class="'+c.id+'" aria-pressed="'+(currentCamClass===c.id)+'"><span>'+c.name+'</span><i><b style="width:'+r.scores[i]*100+'%;background:'+c.color+'"></b></i><strong>'+pct(r.scores[i])+'</strong></button>';}).join('');
    $('response-label').textContent=className(currentCamClass)+' / 图像响应';drawSampleCanvas($('response-image'),currentCamClass);
    $('depth-legend').innerHTML=classes.map(function(c){return '<span><i style="background:'+c.color+'"></i>'+c.name+'</span>';}).join('');
    renderDepth(focus);renderEvaluation();
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
  $('export-identification').addEventListener('click',function(){var rows=[['sample_id','well','source_depth_m','source_label','identified_lithology','score_sandstone','score_shale','score_dolomite','experiment_phase','fit_images','excluded_group','weights_sha256','image_sha256']];phaseSamples().forEach(function(s){var r=RESULTS.samples[s.id];rows.push([s.id,s.well,s.depth,s.label,className(r.prediction)].concat(r.scores,[evaluationStage,r.fitCount,r.fold==='holdout'?'':r.fold,RESULTS.method.weightsSha256,s.sha256]));});downloadCSV(rows,'m1-identification-'+evaluationStage+'.csv');});
  function publishLessonState(){if(embedded&&sharingReady&&!applyingShared)window.parent.postMessage({__m1StateUpdate:{sampleId:currentId,stage:evaluationStage}},'*');}
  window.addEventListener('message',function(event){if(event.source!==window.parent||!event.data)return;if(embedded&&event.data.__m1ScrollToTop)window.scrollTo(0,0);if(event.data.__m1NavigationAck===navigationPending)navigationPending=null;if(Object.prototype.hasOwnProperty.call(event.data,'__m1SharedState')){sharingReady=true;var state=event.data.__m1SharedState;if(state&&byId[state.sampleId]){applyingShared=true;selectSample(state.sampleId);applyingShared=false;}else publishLessonState();}});
  $('flow-sample-select').innerHTML=DATA.samples.map(function(s){return '<option value="'+s.id+'">'+s.id+' · '+s.depth+' m</option>';}).join('');
    // This renderer reads original data and image audit fields only.
  var imageStage=0,qualityDim=false,selectedDepthGroup=null;
  function groupData(){var grouped={};DATA.samples.forEach(function(s){(grouped[s.group]||(grouped[s.group]=[])).push(s);});return grouped;}
  function tinyHistogram(hist){var max=Math.max.apply(null,hist);return '<span class="overview-bars audit-bars">'+hist.map(function(n){return '<i style="height:'+Math.max(2,n/max*50)+'px"></i>';}).join('')+'</span>';}
  function renderFlowOverview(){
    var s=byId[currentId],a=AUDIT[currentId];
    var tiles=[
      '<img class="data-overview-photo" src="'+s.image+'" alt=""><em>66 张原始 JPEG</em>',
      '<b class="data-overview-number">'+s.depth+'<small>m / 井 '+esc(s.well)+'</small></b><em>照片与井深对应</em>',
      tinyHistogram(a.histogram)+'<em>原图灰度分布</em>',
      '<span class="overview-crop"><img src="'+s.image+'" alt=""><i></i></span><em>中心区域 → 224×224</em>',
      '<span class="data-tag" style="--rock:'+byClass[s.classId].color+'">'+className(s.classId)+'</span><em>沿用原始标签</em>',
      '<span class="overview-pools"><span><b>42</b>开发用</span><span><b>24</b>留出</span></span><em>17 个井段组</em>',
      '<span class="data-sheet-icon" aria-hidden="true">ID　井深　标签<br>01　2090　…<br>02　2094　…</span><em>原图 + 清单 + 说明</em>'
    ];
    tiles.forEach(function(html,i){$('flow-viz-'+i).innerHTML=html;});
  }
  function renderWorkflow(){
    var item=flowText[workflowStep],s=byId[currentId],a=AUDIT[currentId],snapshot=$('flow-snapshot');
    $('flow-sample-image').src=s.image;$('flow-sample-select').value=s.id;
    $('flow-sample-meta').textContent=s.id+' · 井 '+s.well+' · 源井深 '+s.depth+' m';
    $('flow-kicker').textContent='STEP 0'+(workflowStep+1)+' / '+item.role;$('flow-title').textContent=item.name;
    $('flow-subtitle').textContent=item.title;$('flow-copy').textContent=item.process;$('flow-input').textContent=item.input;
    $('flow-why').textContent=item.why;$('flow-output').textContent=item.output;$('flow-trap').textContent=item.trap;
    $('flow-count').textContent=(workflowStep+1)+' / '+flowText.length;$('flow-prev').disabled=workflowStep===0;$('flow-next').disabled=workflowStep===flowText.length-1;
    Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(b){b.setAttribute('aria-pressed',String(Number(b.dataset.step)===workflowStep));});
    renderFlowOverview();
    if(workflowStep===0){snapshot.innerHTML='<h4>这张照片，从哪里来？</h4><div class="data-source-card"><img src="'+s.image+'" alt="'+esc(s.id)+' 岩屑原图"><dl><dt>样品编号</dt><dd>'+esc(s.id)+'</dd><dt>原文件</dt><dd>'+esc(s.sourcePath.split('/').pop())+'</dd><dt>格式与尺寸</dt><dd>JPEG · '+a.width+' × '+a.height+' px</dd><dt>文件大小</dt><dd>'+(a.bytes/1024).toFixed(1)+' KiB</dd></dl></div><div class="source-file-path">'+esc(s.sourcePath)+'</div><details><summary>查看原图校验值</summary><p class="source-file-path">SHA-256<br>'+s.sha256+'</p></details><p class="fine-print">当前原图与公开来源的字节校验一致；这里没有重新拍摄或生成岩屑照片。</p>';}
    if(workflowStep===1){var ordered=DATA.samples.slice().sort(function(x,y){return x.depth-y.depth;}),min=ordered[0].depth,max=ordered[ordered.length-1].depth;var y=38+(s.depth-min)/(max-min)*225;snapshot.innerHTML='<h4>照片编号、井号与井深对应。</h4><div class="source-depth-layout"><svg viewBox="0 0 220 300" role="img" aria-label="井2的实际照片采样深度分布"><path d="M66 32V270" stroke="#b6b7a4" stroke-width="2"/>'+ordered.map(function(p){var py=38+(p.depth-min)/(max-min)*225;return '<circle cx="66" cy="'+py.toFixed(1)+'" r="'+(p.id===s.id?6:2.5)+'" fill="'+(p.id===s.id?'#ce7b36':'#9faea2')+'"/>';}).join('')+'<text x="14" y="29">'+min+' m</text><text x="14" y="291">'+max+' m</text><path d="M78 '+y+'H111" stroke="#ce7b36"/><text x="115" y="'+(y+4)+'">'+s.depth+' m</text></svg><dl><dt>已知</dt><dd>井 '+s.well+' / 源井深 '+s.depth+' m</dd><dt>对应的照片</dt><dd>'+esc(s.id)+'</dd><dt>尚缺的现场记录</dt><dd>取样时间、迟到校正状态、样品处理过程。</dd></dl></div><p class="fine-print">点表示源数据中有照片的井深，不把点之间的空白画成连续地层。</p>';}
    if(workflowStep===2){var max=Math.max.apply(null,a.histogram);snapshot.innerHTML='<h4>看原图，也看像素分布。</h4><div class="quality-check"><img class="'+(qualityDim?'quality-dim':'')+'" src="'+s.image+'" alt="当前原图'+(qualityDim?'的偏暗教学模拟':'')+'"><div><div class="gray-histogram" aria-label="原始照片16区间灰度计数">'+a.histogram.map(function(n,i){return '<i style="height:'+Math.max(2,n/max*90)+'px" title="灰度 '+(i*16)+'—'+(i*16+15)+'：'+n+' 像素"></i>';}).join('')+'</div><div class="gray-axis"><span>暗 0</span><span>亮 255</span></div><p>原图灰度均值 '+a.brightness+'<br>原图灰度标准差 '+a.contrast+'</p></div></div><button type="button" class="quiet-button" data-quality-toggle aria-pressed="'+qualityDim+'">'+(qualityDim?'回到原图':'试着把照明调暗')+'</button><p class="fine-print">按钮仅模拟明暗变化；直方图和数字始终记录原图。它们是检查线索，不是图像好坏的自动评分。</p><div class="audit-inline"><span>完全重复文件 <b>0 / 66</b></span><span>拍摄条件记录 <b>未提供</b></span></div>';}
    if(workflowStep===3){var names=['原始照片','裁切位置','统一尺寸'];snapshot.innerHTML='<h4>一张原图，三个处理状态。</h4><div class="processing-stages">'+names.map(function(n,i){return '<button type="button" data-image-stage="'+i+'" aria-pressed="'+(imageStage===i)+'">'+n+'</button>';}).join('')+'</div><div class="processing-figure">'+(imageStage<2?'<div class="processing-photo"><img src="'+s.image+'" alt="'+names[imageStage]+'">'+(imageStage===1?'<span class="roi-outline"></span>':'')+'</div>':'<div id="prepared-image"></div>')+'</div><div class="technical-readout">'+['原始 JPEG 保持不变，尺寸为 '+a.width+' × '+a.height+' px。','裁切坐标：('+a.roi[0]+', '+a.roi[1]+') → ('+a.roi[2]+', '+a.roi[3]+')，统一保留中心区域。','中心区域缩放到 224 × 224；这里只统一像素尺寸，不增加物理比例尺。'][imageStage]+'</div>';if(imageStage===2)drawSampleCanvas(snapshot.querySelector('#prepared-image'),null);}
    if(workflowStep===4){snapshot.innerHTML='<h4>标签是一份记录，也是一套命名规则。</h4><div class="data-label-grid">'+classes.map(function(c){var samples=DATA.samples.filter(function(p){return p.classId===c.id;}),example=samples[0];return '<button type="button" data-label-example="'+example.id+'" aria-pressed="'+(s.classId===c.id)+'"><img src="'+example.image+'" alt="'+esc(c.name)+'公开照片"><b>'+c.name+'</b><span>'+samples.length+' 张 / 源标签</span></button>';}).join('')+'</div><div class="label-correspondence"><span>'+esc(s.sourcePath.split('/').pop())+'</span><i>↔</i><b>'+className(s.classId)+'</b></div><p class="fine-print">每张照片只有一个整图标签；没有单颗岩屑的类别或含量标注。点击任一类，查看对应的真实样品。</p>';}
    if(workflowStep===5){var grouped=groupData(),keys=Object.keys(grouped).sort(function(x,y){return Number(x.split('-').pop())-Number(y.split('-').pop());});if(!selectedDepthGroup)selectedDepthGroup=s.group;var selected=grouped[selectedDepthGroup],start=Number(selectedDepthGroup.split('-').pop());snapshot.innerHTML='<h4>整组分配，避免相邻照片被拆散。</h4><div class="technical-pools"><div><b>42 张</b><span>开发用资料 · 12 组</span></div><div><b>24 张</b><span>留出资料 · 5 组</span></div></div><div class="depth-group-picker">'+keys.map(function(key){var samples=grouped[key],begin=Number(key.split('-').pop());return '<button type="button" data-depth-group="'+key+'" class="'+samples[0].split+'" aria-pressed="'+(key===selectedDepthGroup)+'"><b>'+begin+'—'+(begin+19)+' m</b><small>'+samples.length+' 张 / '+(samples[0].split==='test'?'留出':'开发用')+'</small></button>';}).join('')+'</div><div class="group-readout"><b>'+start+'—'+(start+19)+' m / '+(selected[0].split==='test'?'整组留出':'整组开发用')+'</b><p>'+classes.map(function(c){return c.name+' '+selected.filter(function(p){return p.classId===c.id;}).length+' 张';}).join(' · ')+'</p></div><p class="fine-print">颜色区分资料用途，不表示岩性。20 m 是本例分组宽度；两边没有重复井段组。</p>';}
    if(workflowStep===6){var known=[['原图可读取','66 / 66'],['编号、井号与井深','66 / 66'],['岩性名称已对应','66 / 66'],['完全重复文件','0'],['井段组跨用途重复','0']],missing=['拍摄条件与物理比例尺','取样时间与迟到校正状态','样品清洗、筛分和异常记录'];snapshot.innerHTML='<h4>交付内容与资料缺口，一起列清楚。</h4><div class="data-delivery"><div><h5>本例可交付</h5>'+known.map(function(v){return '<p><span>'+v[0]+'</span><b>'+v[1]+'</b></p>';}).join('')+'</div><div><h5>现场资料仍缺</h5>'+missing.map(function(v){return '<p class="missing-field">'+v+'</p>';}).join('')+'</div></div><button type="button" class="primary-button" data-export-data>导出 66 张照片清单 ↓</button><p class="fine-print">清单只包含照片来源、标签、井深、用途划分与校验值；不会把缺失资料写成已完成。</p>';}
    reportHeight();
  }
  function changeWorkflowStep(next,focus){workflowStep=Math.max(0,Math.min(flowText.length-1,next));renderWorkflow();if(focus){var buttons=document.querySelectorAll('[data-step]');if(buttons[workflowStep])buttons[workflowStep].focus({preventScroll:true});}}
  Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(button){button.addEventListener('click',function(){changeWorkflowStep(Number(button.dataset.step),false);});button.addEventListener('keydown',function(event){var next=Number(button.dataset.step);if(event.key==='ArrowRight')next++;else if(event.key==='ArrowLeft')next--;else if(event.key==='Home')next=0;else if(event.key==='End')next=flowText.length-1;else return;event.preventDefault();changeWorkflowStep(next,true);});});
  $('flow-prev').addEventListener('click',function(){changeWorkflowStep(workflowStep-1,false);});$('flow-next').addEventListener('click',function(){changeWorkflowStep(workflowStep+1,false);});
  $('flow-sample-select').addEventListener('change',function(){selectSample(this.value);});
  $('flow-snapshot').addEventListener('click',function(event){
    var group=event.target.closest('[data-depth-group]');if(group){selectedDepthGroup=group.dataset.depthGroup;renderWorkflow();return;}
    var stage=event.target.closest('[data-image-stage]');if(stage){imageStage=Number(stage.dataset.imageStage);renderWorkflow();return;}
    var example=event.target.closest('[data-label-example]');if(example){selectSample(example.dataset.labelExample);return;}
    if(event.target.closest('[data-quality-toggle]')){qualityDim=!qualityDim;renderWorkflow();return;}
    if(event.target.closest('[data-export-data]'))exportData();
  });

  selectSample(currentId);setView(portalSection||window.location.hash.slice(1)||'background',false);
  if(embedded)window.parent.postMessage({__m1StateRequest:true},'*');
  if(window.ResizeObserver)new window.ResizeObserver(reportHeight).observe(document.body);window.addEventListener('load',reportHeight);window.addEventListener('resize',function(){renderDepth(false);reportHeight();});
}());
