(function () {
  'use strict';
  var DATA = window.M1_DATA, MODEL = window.M1Model;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]; }); };
  var classes = DATA.classes, ids = classes.map(function (c) { return c.id; });
  var byClass = {}, byId = {}, reviews = Object.create(null), computed = Object.create(null);
  classes.forEach(function (c) { byClass[c.id] = c; });
  DATA.samples.forEach(function (s) { byId[s.id] = s; });
  var references = [], tests = [], scaler, evaluation, ready = false, currentId, currentResult, currentFeatures;
  var evaluationStage='validation',lockedConfig=null,foldContexts=Object.create(null),validationCache=Object.create(null);
  var workflowStep = 0, view = 'background', motionPaused = false;
  var cropSize = 96, exposure = 0, contrast = 1, matrixFilter = null;
  var imageStage = 0, flowVoteCount = null, voteContext = '', selectedDepthGroup = null;
  var sharingReady=false,sharedPending=null,shareInitialized=false,applyingShared=false,navigationPending=null,pendingRock=null;
  var className = function (id) { return byClass[id] ? byClass[id].name : '尚未复核'; };
  var pct = function (v) { return (v * 100).toFixed(1) + '%'; };
  var config = function () { return lockedConfig?{k:lockedConfig.k,colorWeight:lockedConfig.colorWeight}:{ k: Number($('k-select').value), colorWeight: Number($('color-weight').value) / 100 }; };
  var flowText = [{"name":"先把照片分组","role":"照片与井段","title":"让同一井段的照片留在同一组。","input":"66张岩屑照片、已有岩性标签、井号、源井深与逐图校验值。","process":"将 66 张照片按 20 m 井段分为 17 组：42 张用于训练集内的分组验证，24 张留作测试。点击右侧井段，看每组去了哪里。","why":"井段相邻照片存在相关性。同组不跨训练与测试；交叉验证时，同一组也不跨该折拟合与验证。","output":"训练集42张、测试集24张及分组元数据。训练图在当前验证折内分为拟合样本和验证样本。","trap":"本例复用公开标签，没有新增专家标注。20 m是分组宽度；历史版本已展示测试图，本版演示规范流程，不宣称独立盲测。"},{"name":"裁出统一的画面","role":"图像预处理","title":"减少外围干扰，让照片便于比较。","input":"当前查询图像；每张拟合参考图也采用相同预处理。","process":"每张图都保留中心 72% 的区域，缩放到 96 × 96 像素。右侧可以依次查看原图、裁切范围和处理结果。","why":"统一像素尺寸和计算量，减轻边框编号干扰。固定中心ROI不属于岩屑分割，也不保证完全去掉背景。","output":"96×96 RGB像素及对应灰度图；保留未修改的原始JPEG。","trap":"Resize属于尺寸调整，不是像素归一化。裁切与缩放不提供物理比例尺，也不能测量原岩粒度。"},{"name":"看看颜色怎么分布","role":"RGB 直方图","title":"统计不同强度区间的像素比例。","input":"预处理后图像的R、G、B通道，各有9,216个像素值。","process":"红、绿、蓝三个通道分别分成 4 个区间，统计每个区间的像素比例，共得到 12 个数。点击右侧柱子，看它数到了哪些像素。","why":"描述颜色分布，减弱岩屑位置变化的影响；光照、干湿和背景仍会改变分布。","output":"12维RGB直方图特征，每通道4个比例之和为1。","trap":"这里的归一化把计数变为频率，不等于后续按训练数据标准差进行特征缩放。"},{"name":"纹理与颜色合在一起","role":"LBP 与特征拼接","title":"颜色之外，还可以描述局部明暗变化。","input":"灰度图与已得到的12维RGB特征。","process":"纹理从同一张裁切后的图像另行计算：比较每个位置周围的明暗，汇总为 LBP 特征，再加上梯度和统计量。它们与颜色特征合成 34 个数。右侧可移动位置查看计算。","why":"使用有明确定义的纹理描述子，保留全部8个采样点的模式信息；补充颜色难以描述的局部图像结构。","output":"12维RGB + 10维Uniform LBP + 8维梯度方向 + 4维统计量 = 34维。","trap":"LBP模式映射具备旋转不变性；整个34维向量还含有方向特征，不宣称整体旋转不变。8维全图梯度统计不称为完整HOG。"},{"name":"找出相近的参考图","role":"特征缩放与距离","title":"把这张图与可用参考照片逐一比较。","input":"查询图像与当前拟合参考样本的34维特征。","process":"先按当前拟合参考样本的尺度调整差异，再根据颜色权重合成距离。距离越小，表示本方法下的特征越相近。点击右侧参考图可查看计算。","why":"控制不同数值尺度与组内维数的影响，避免验证或测试数据参与尺度拟合。","output":"当前可用拟合样本的距离排序及逐维数值；交叉验证时排除查询图整个井段组。","trap":"条形图展示对平方距离的数值贡献，不是类别特征重要性、SHAP值或矿物学解释。权重是人工超参数，没有进行度量学习。"},{"name":"让近邻投票","role":"k 近邻分类","title":"检索最近的样本，用它们的标签形成预测。","input":"按加权距离排序的拟合样本、已有标签及超参数k。","process":"取距离最近的 k 张参考图，每张按原标签投一票，得票最多的类别成为候选。可以在右侧逐张计票，观察候选如何产生。","why":"传统监督学习基线可直接追溯到近邻样本与距离；不涉及CNN训练、反向传播或深度特征学习。","output":"预测类别（供地质人员复核的岩性候选）、各类票数和近邻证据。","trap":"投票占比不是校准置信概率。图像相似不直接证明矿物组成、孔渗或地质成因。"},{"name":"检查一次判断与整组表现","role":"评价与复核","title":"单张候选和整组指标回答的是不同问题。","input":"训练集分组交叉验证的折外预测；锁定参数后生成的测试预测；独立人工意见。","process":"一张照片可以检查近邻与投票；要了解方法在一组照片上的表现，还需要把预测与已有标签逐一比较。进入示范后，可以继续复核，并查看分组验证与测试结果。","why":"把超参数探索、留出测试和业务复核分开，避免依据测试分数反复选择配置。","output":"分组交叉验证记录、锁定配置的测试结果、带协议与描述子版本的CSV。","trap":"测试后不再开放本页参数调整。刷新后再挑参数属于继续探索，不能视作新的独立测试。小样本单井结果不代表跨井泛化。"}];

  function reportHeight() {
    if (window.parent !== window) window.parent.postMessage({ __m1Height: Math.ceil(document.body.getBoundingClientRect().height) }, '*');
  }
  function setView(next, focus, scroll) {
    if (['background','workflow','demo'].indexOf(next) < 0) next = 'background';
    view = next;
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (button) {
      var active = button.dataset.view === next;
      button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
    ['background','workflow','demo'].forEach(function (name) { $('panel-' + name).hidden = name !== next; });
    if (next === 'workflow') renderWorkflow();
    if (ready && next === 'demo') { drawQuery(); renderDepth(); }
    try { window.history.replaceState(null, '', '#' + next); } catch (e) { /* file and sandbox history are optional */ }
    if(scroll && !embedded && $('panel-'+next).scrollIntoView) $('panel-'+next).scrollIntoView({block:'start',behavior:'instant'});
    reportHeight();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (button, index, buttons) {
    button.addEventListener('click', function () { setView(button.dataset.view, false, true); });
    button.addEventListener('keydown', function (event) {
      var at = index;
      if (event.key === 'ArrowRight') at = (index + 1) % 3;
      else if (event.key === 'ArrowLeft') at = (index + 2) % 3;
      else if (event.key === 'Home') at = 0;
      else if (event.key === 'End') at = 2;
      else return;
      event.preventDefault(); setView(buttons[at].dataset.view, true, true);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (button) { button.addEventListener('click', function () {
    var next=button.dataset.go;
    if(!embedded){setView(next,true,true);return;}
    var token=String(Date.now());navigationPending=token;window.parent.postMessage({__m1Navigate:next,token:token},'*');
    window.setTimeout(function(){if(navigationPending===token){navigationPending=null;setView(next,true,true);}},350);
  }); });
  window.addEventListener('hashchange', function () { setView(window.location.hash.slice(1), false); });

  function applyMotion() {
    document.body.classList.toggle('is-paused', motionPaused);
    $('motion-toggle').setAttribute('aria-pressed', String(motionPaused));
    $('motion-toggle').textContent = motionPaused ? '继续动效' : '暂停动效';
    Array.prototype.forEach.call(document.querySelectorAll('svg.flow'), function (svg) {
      if (svg.pauseAnimations && svg.unpauseAnimations) { if (motionPaused) svg.pauseAnimations(); else svg.unpauseAnimations(); }
    });
  }
  $('motion-toggle').addEventListener('click', function () { motionPaused = !motionPaused; applyMotion(); });
  var media = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (media && media.matches) motionPaused = true;
  if (media && media.addEventListener) media.addEventListener('change', function () { motionPaused = media.matches; applyMotion(); });
  applyMotion();
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
    }).join('')+'<div class="split-legend"><span><i></i>训练集42张</span><span><i class="test"></i>测试集 24 张</span></div>';
  }
  $('split-bars').innerHTML = splitMarkup();

  // A conceptual field route is paired with an authentic image, without implying
  // that the displayed photograph was taken in the illustrated well.
  var fieldStories=[
    {kicker:'01 / 井底破岩',title:'钻头接触的岩层，变成碎块。',copy:'钻头破岩产生岩屑；它提供了钻遇岩层的实物线索，但破碎后已不再保留完整岩心的空间关系。',note:'碎块大小不能直接当作原岩颗粒大小。'},
    {kicker:'02 / 上返取样',title:'岩屑到达地面，需要时间。',copy:'钻井液把岩屑从井底带回地面。取样时钻头通常已继续前进，样品还可能混入井壁坍落物。',note:'先核对迟到与取样记录，才能把样品对应到井深。'},
    {kicker:'03 / 观察描述',title:'人观察岩屑，照片保留外观。',copy:'录井人员观察颜色、颗粒和结构，并结合其他证据描述岩性。M1 在这里辅助比较照片，提出候选。',note:'照片能提供可见线索，不能独立确认矿物含量。'},
    {kicker:'04 / 记录对比',title:'判断回到井深，才有地层意义。',copy:'岩性描述与正确井深对应后，才能与其他井段、录井及地质资料一起对比。机器候选仍需人员复核。',note:'分类票数不等于地质结论或可靠概率。'}
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

  function imageFeatures(sample) {
    return new Promise(function(resolve,reject){
      var image = new Image();
      image.onload = function(){
        try {
          var canvas = document.createElement('canvas'); canvas.width=cropSize;canvas.height=cropSize;
          var ctx=canvas.getContext('2d',{willReadFrequently:true});
          // Same fractional ROI for every sample; no use of class, file name, well or depth.
          ctx.drawImage(image,image.naturalWidth*.14,image.naturalHeight*.14,image.naturalWidth*.72,image.naturalHeight*.72,0,0,cropSize,cropSize);
          var rgba=ctx.getImageData(0,0,cropSize,cropSize).data;
          computed[sample.id]={rgba:rgba,features:MODEL.extract(rgba,cropSize,cropSize)};
          resolve({id:sample.id,classId:sample.classId,group:sample.group,features:computed[sample.id].features});
        } catch(error){ reject(error); }
      };
      image.onerror=function(){reject(new Error('无法解码原图 '+sample.id));}; image.src=sample.image;
    });
  }
  function histogramMarkup(features) {
    return ['#bc8071','#84a075','#7493ad'].map(function(color,channel){
      return '<div class="hist-group" style="--channel:'+color+'">'+features.vector.slice(channel*4,channel*4+4).map(function(v,bin){return '<i style="height:'+Math.max(2,v*100)+'%" title="'+['R','G','B'][channel]+' 区间 '+(bin+1)+': '+pct(v)+'"></i>';}).join('')+'<span>'+['R','G','B'][channel]+'</span></div>';
    }).join('');
  }
  function voteMarkup(result) {
    return classes.map(function(c){var count=result.votes[c.id]||0;return '<div class="vote-row"><header><span>'+c.name+'</span><span>'+count+' / '+result.k+' 票</span></header><div class="vote-track"><span style="--lith-color:'+c.color+';width:'+(count/result.k*100)+'%"></span></div></div>';}).join('');
  }
  function selectSample(id, focusRecord) {
    if (!ready || !byId[id] || !activeSamples().some(function(s){return s.id===id;})) return;
    currentId=id;$('sample-select').value=id;
    var image=byId[id]; selectedDepthGroup=image.group; showFieldSample(image); renderRockLesson(image.classId,image); $('query-image').src=image.image;
    $('query-id').textContent=image.id; $('query-depth').textContent='源记录井深 '+image.depth+' m · 井 '+image.well;
    drawQuery(); renderDepth(focusRecord);
  }
  function drawQuery() {
    if (!ready || !currentId) return;
    var original = computed[currentId], rgba=MODEL.disturb(original.rgba,exposure,contrast);
    currentFeatures = MODEL.extract(rgba,cropSize,cropSize);
    var canvas=$('processed-canvas'),ctx=canvas.getContext('2d');
    var data=ctx.createImageData(cropSize,cropSize);data.data.set(rgba);ctx.putImageData(data,0,0);
    $('image-statistics').innerHTML='<span>平均亮度<b>'+currentFeatures.stats.brightness.toFixed(1)+'</b></span><span>灰度对比度<b>'+currentFeatures.stats.contrast.toFixed(1)+'</b></span><span>边缘像素比例<b>'+pct(currentFeatures.stats.edges)+'</b></span><span>清晰度统计<b>'+currentFeatures.stats.sharpness.toFixed(0)+'</b></span>';
    $('feature-histogram').innerHTML=histogramMarkup(currentFeatures);
    var context=queryContext();currentResult=MODEL.predict(currentFeatures,context.samples,config(),context.scaler);
    var source=byId[currentId],different=currentResult.classId!==source.classId;
    $('prediction').textContent=className(currentResult.classId);$('prediction').setAttribute('style',lithStyle(currentResult.classId));
    $('original-label').textContent=className(source.classId);$('original-label').setAttribute('style',lithStyle(source.classId));
    $('result-condition').textContent=(exposure!==0||contrast!==1)?'光照调整后':'原图条件';
    $('comparison-note').classList.toggle('is-different',different);
    $('comparison-note').textContent=different?'候选与原标签不同。请结合相似照片和现场资料核对。':'候选与原标签一致。仍可查看参考照片，并结合其他资料判断。';
    $('vote-summary').textContent='最高票 '+currentResult.votes[currentResult.classId]+' / '+currentResult.k+' · 投票占比 '+pct(currentResult.share);
    $('vote-bars').innerHTML=voteMarkup(currentResult);
    $('result-state').classList.toggle('needs-review',different);$('result-state').textContent=different?'与原标签不一致':'与原标签一致';
    $('neighbors').innerHTML=currentResult.neighbors.map(function(n,i){var s=byId[n.id],c=byClass[n.classId];return '<article class="neighbor" style="--lith-color:'+c.color+'"><span class="neighbor-rank">近邻 '+(i+1)+'</span><img src="'+s.image+'" alt="近邻 '+s.id+'，原标签 '+c.name+'"><b>'+c.name+'</b><small>'+s.depth+' m<br>距离 '+n.distance.toFixed(3)+'</small></article>';}).join('');
    $('review-class').value=reviews[currentId]?reviews[currentId].classId:currentResult.classId;
    $('review-status').textContent=reviews[currentId]?'本次会话已复核为 '+className(reviews[currentId].classId)+'。模型原始记录保留。':'尚未复核 · 共 '+Object.keys(reviews).length+' 条人工记录';
    if (view==='workflow') renderWorkflow(); publishLessonState(); reportHeight();
  }
  function updateEvaluation() {
    if (!ready) return;
    if(evaluationStage==='test')evaluation=MODEL.evaluate(tests,references,ids,config(),scaler);
    else{var key=JSON.stringify(config());if(!validationCache[key])validationCache[key]=MODEL.crossValidate(references,ids,config());evaluation=validationCache[key];}
    syncEvaluationControls();
    $('evaluation-stats').innerHTML=[[evaluationStage==='test'?'锁定测试':'交叉验证折外样本',String(evaluation.count),'共 '+new Set(activeSamples().map(function(s){return byId[s.id].group;})).size+' 个井段组'],['与原标签一致率',pct(evaluation.accuracy),evaluation.hit+' / '+evaluation.count+' 张'],['宏平均 F1',evaluation.macroF1.toFixed(3),'三个类别等权平均']].map(function(x){return '<div class="evaluation-stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>';}).join('');
    var max=Math.max.apply(null,[1].concat.apply([1],evaluation.matrix));
    $('confusion-matrix').innerHTML='<table class="matrix" aria-label="模型原始输出的混淆矩阵"><thead><tr><th>原标签 ↓<br>预测 →</th>'+classes.map(function(c){return '<th scope="col">'+c.name+'</th>';}).join('')+'</tr></thead><tbody>'+evaluation.matrix.map(function(row,i){return '<tr><th scope="row">'+classes[i].name+'</th>'+row.map(function(n,j){return '<td><button type="button" class="matrix-cell" data-truth="'+classes[i].id+'" data-predicted="'+classes[j].id+'" data-off="'+(i!==j)+'" style="--strength:'+(n?.2+.6*n/max:.05)+'" aria-label="'+classes[i].name+'预测为'+classes[j].name+'：'+n+'张">'+n+'</button></td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
    if(matrixFilter) renderMatrixSelection(matrixFilter.truth,matrixFilter.predicted);
    $('next-disagreement').disabled=evaluation.hit===evaluation.count;
    renderDepth();if(view==='workflow')renderWorkflow();
  }
  function renderMatrixSelection(truth,predicted) {
    matrixFilter={truth:truth,predicted:predicted};
    var chosen=evaluation.predictions.filter(function(p){return p.truth===truth&&p.result.classId===predicted;});
    $('matrix-selection').innerHTML=className(truth)+' → '+className(predicted)+'：'+chosen.length+' 张。 '+chosen.map(function(p){return '<button type="button" data-pick="'+p.id+'">'+p.id+'</button>';}).join('');
  }
  $('confusion-matrix').addEventListener('click',function(event){var b=event.target.closest('[data-truth]');if(b&&ready)renderMatrixSelection(b.dataset.truth,b.dataset.predicted);});
  $('matrix-selection').addEventListener('click',function(event){var b=event.target.closest('[data-pick]');if(b){selectSample(b.dataset.pick);if($('sample-detail').scrollIntoView)$('sample-detail').scrollIntoView({block:'start',behavior:'smooth'});}});
  function lithStyle(id) { return byClass[id]?'--lith-color:'+byClass[id].color+';--lith-bg:'+byClass[id].color+'20':''; }
  function renderDepth(focusRecord) {
    if(!ready||!evaluation)return;
    $('depth-legend').innerHTML=classes.map(function(c){return '<span><i style="--lith-color:'+c.color+'"></i>'+c.name+'</span>';}).join('');
    var groups=[],lastDepth=null;
    evaluation.predictions.slice().sort(function(a,b){return byId[a.id].depth-byId[b.id].depth;}).forEach(function(p){var sample=byId[p.id];if(lastDepth!==null&&sample.depth-lastDepth>10)groups.push({gap:sample.depth-lastDepth});groups.push(p);lastDepth=sample.depth;});
    var disagree=evaluation.count-evaluation.hit,reviewed=evaluation.predictions.filter(function(p){return !!reviews[p.id];}).length;
    $('depth-summary').textContent=(evaluationStage==='test'?'锁定测试':'训练集分组验证')+' · '+evaluation.count+' 张 · '+disagree+' 张与原标签不同 · '+reviewed+' 张已复核';
    var html='';groups.forEach(function(p){
      if(p.gap){html+='<div class="well-gap">样品间隔 '+p.gap+' m · 中间未展示</div>';return;}
      var s=byId[p.id],r=reviews[p.id],different=p.truth!==p.result.classId;
      var label=s.depth+' 米，模型候选 '+className(p.result.classId)+'，原标签 '+className(p.truth)+'，'+(different?'标签不一致，':'标签一致，')+(r?'人工复核 '+className(r.classId):'待复核');
      html+='<button type="button" class="well-row'+(p.id===currentId?' is-current':'')+'" data-pick="'+esc(p.id)+'" aria-pressed="'+String(p.id===currentId)+'" aria-label="'+esc(label)+'"><span class="well-depth">'+s.depth.toFixed(0)+'</span><img class="well-thumb" src="'+s.image+'" alt=""><span class="well-label" style="'+lithStyle(p.result.classId)+'">'+className(p.result.classId)+(different?'<small>不一致</small>':'')+'</span><span class="well-label" style="'+lithStyle(p.truth)+'">'+className(p.truth)+'</span><span class="well-label'+(r?'':' review-empty')+'" style="'+(r?lithStyle(r.classId):'')+'">'+(r?className(r.classId):'待复核')+'</span></button>';
    });
    var log=$('depth-log');log.innerHTML=html;
    var selected=log.querySelector('[data-pick="'+currentId+'"]');
    if(selected&&Number.isFinite(selected.offsetTop)&&log.clientHeight)log.scrollTop=Math.max(0,selected.offsetTop-(log.clientHeight-selected.offsetHeight)/2);
    if(focusRecord&&selected&&selected.focus)selected.focus({preventScroll:true});
  }
  $('depth-log').addEventListener('click',function(event){var b=event.target.closest('[data-pick]');if(b)selectSample(b.dataset.pick,true);});
  $('next-disagreement').addEventListener('click',function(){
    if(!ready||!evaluation)return;
    var different=evaluation.predictions.filter(function(p){return p.truth!==p.result.classId;}).sort(function(a,b){return byId[a.id].depth-byId[b.id].depth;});
    if(!different.length)return;
    var at=different.findIndex(function(p){return p.id===currentId;});selectSample(different[(at+1)%different.length].id);
  });
    // Hyperparameters are explored using training-only grouped CV, then frozen for the holdout.
  function activeSamples(){return evaluationStage==='test'?tests:references;}
  function queryContext(){
    if(evaluationStage==='test')return {samples:references,scaler:scaler};
    return foldContexts[byId[currentId].group];
  }
  function populateSampleChoices(){
    $('sample-select').innerHTML=activeSamples().map(function(s){return '<option value="'+s.id+'">'+s.id+' · '+byId[s.id].depth+' m</option>';}).join('');
    $('flow-sample-select').innerHTML=$('sample-select').innerHTML;
  }
  function syncEvaluationControls(){
    var frozen=evaluationStage==='test',description=frozen?'阶段 2 · 已锁定 k='+lockedConfig.k+'、颜色权重='+lockedConfig.colorWeight.toFixed(1)+'，正在查看 24 张测试图。':'阶段 1 · 用 42 张训练图做分组交叉验证；每次排除待检照片所在的整个井段组。24 张测试图暂不开放。';
    $('evaluation-status').textContent=description;
    $('export-stage-note').textContent=frozen?'测试导出只包含测试样品；训练阶段记录需在锁定前另行导出。':'训练阶段的复核如需保留，请先导出本阶段；测试导出只包含测试样品。';
    $('loading-status').textContent=frozen?'当前为测试集，k 和颜色权重已锁定。':'已就绪 · 先从一张训练集照片开始；参数锁定后可查看测试照片。';
    $('flow-status').textContent=frozen?'当前为锁定测试阶段，展示测试样品的原始照片。':'当前在训练集内探索；可在示范页锁定参数并查看测试图。';
    ['k-select','color-weight','flow-k-select','flow-color-weight','reset-parameters','finalize-test'].forEach(function(id){$(id).disabled=!ready||frozen;});
    $('evaluation-sample-badge').textContent=frozen?'测试集 / 参数已锁定':'训练集 / 折外查询';
    $('evaluation-title').textContent=frozen?'锁定参数测试与误差分析':'分组交叉验证与参数敏感性分析';
    $('evaluation-subtitle').textContent=frozen?'查看固定配置在24张测试图上的表现。':'在42张训练图内部检验参数，每个样品的同组图均从该折参考集排除。';
    $('query-reference-note').textContent=frozen?'仅从42张训练图组成的参考样本集中检索。':'查询训练样品时，排除其整个井段组；距离只使用该折训练样本与尺度。';
  }
  function finalizeTest(){
    if(!ready||lockedConfig)return;
    lockedConfig=config();evaluationStage='test';matrixFilter=null;exposure=0;contrast=1;
    $('exposure').value='0';$('contrast').value='100';$('exposure-value').textContent='0';$('contrast-value').textContent='1.0×';
    currentId=tests[0].id;populateSampleChoices();syncEvaluationControls();updateEvaluation();selectSample(currentId);renderWorkflow();reportHeight();
  }
  $('finalize-test').addEventListener('click',finalizeTest);

    // All illustrations below use the same selected sample's original pixels and computed features.
  var flowColorBin=0, flowPixelX=48, flowPixelY=48, flowReferenceId=null;
  function flowCanvas(selector, mode) {
    var source=computed[currentId],canvas=document.createElement('canvas');
    canvas.width=cropSize;canvas.height=cropSize;canvas.className='technical-canvas';
    canvas.setAttribute('aria-label',mode==='gray'?'实际灰度像素':mode==='color'?'当前颜色区间的实际像素位置':'实际中心取样与96×96缩放结果');
    var context=canvas.getContext('2d'),pixels=context.createImageData(cropSize,cropSize);
    for(var i=0;i<cropSize*cropSize;i++){
      var selected=mode!=='color'||Math.min(3,source.rgba[i*4+Math.floor(flowColorBin/4)]>>6)===flowColorBin%4;
      for(var c=0;c<3;c++)pixels.data[i*4+c]=mode==='gray'?source.features.gray[i]:source.rgba[i*4+c]*(selected?1:.13);
      pixels.data[i*4+3]=255;
    }
    context.putImageData(pixels,0,0);$('flow-snapshot').querySelector(selector).appendChild(canvas);
  }
  function flowVector(features) {
    var groups=[[0,12,'颜色 / 12','#c18d6c'],[12,22,'Uniform LBP / 10','#98ac82'],[22,30,'梯度 / 8','#81a7b5'],[30,34,'统计量 / 4','#aa97bb']];
    return '<div class="technical-vector">'+groups.map(function(g){return '<div><strong>'+g[2]+'</strong><div class="technical-vector-bars">'+features.vector.slice(g[0],g[1]).map(function(v,j){return '<i style="--feature-color:'+g[3]+';height:'+Math.max(2,v*100)+'%" title="维度 '+(g[0]+j+1)+' = '+v.toFixed(4)+'"></i>';}).join('')+'</div></div>';}).join('')+'</div>';
  }
  function flowFeatureName(i) {
    return i<12?['R','G','B'][Math.floor(i/4)]+' 桶 '+(i%4):i<22?'Uniform LBP bin '+(i-12):i<30?'梯度方向 '+(i-22):['平均亮度','灰度对比度','边缘比例','清晰度'][i-30];
  }
  function renderFlowOverview(){
    $('flow-viz-0').innerHTML='<span class="overview-pools"><span><b>42</b>训练</span><span><b>24</b>测试</span></span><em>17 个井段组</em>';
    if(!ready||!currentId)return;
    var sample=byId[currentId],features=computed[currentId].features,query=queryContext();
    var result=MODEL.predict(features,query.samples,config(),query.scaler),nearest=result.neighbors[0];
    $('flow-viz-1').innerHTML='<span class="overview-crop"><img src="'+sample.image+'" alt=""><i></i></span><em>中心 72% → 96×96</em>';
    $('flow-viz-2').innerHTML='<span class="overview-bars">'+features.vector.slice(0,12).map(function(v,i){return '<i style="height:'+Math.max(3,v*100)+'%;background:'+['#bf7769','#83a17d','#7d9fb6'][Math.floor(i/4)]+'" title="'+flowFeatureName(i)+'：'+pct(v)+'"></i>';}).join('')+'</span><em>RGB · 12 维</em>';
    $('flow-viz-3').innerHTML='<span class="overview-bars texture-bars">'+features.vector.slice(12,22).map(function(v,i){return '<i style="height:'+Math.max(3,v*100)+'%" title="LBP '+i+'：'+pct(v)+'"></i>';}).join('')+'</span><em>LBP 10 + 其他 12</em>';
    $('flow-viz-4').innerHTML='<span class="overview-nearest"><img src="'+byId[nearest.id].image+'" alt=""><span><b>最近参考图</b><br>'+esc(nearest.id)+'<br>距离 '+nearest.distance.toFixed(3)+'</span></span><em>'+esc(className(nearest.classId))+' · 原标签</em>';
    $('flow-viz-5').innerHTML='<span class="overview-votes">'+classes.map(function(c){var count=result.votes[c.id]||0;return '<span><b>'+esc(c.name)+'</b><i><i style="width:'+(count/result.k*100)+'%;background:'+c.color+'"></i></i><small>'+count+'</small></span>';}).join('')+'</span><em>候选：'+esc(className(result.classId))+' · '+result.votes[result.classId]+'/'+result.k+' 票</em>';
    $('flow-viz-6').innerHTML='<span class="overview-score"><b>'+(evaluation?pct(evaluation.accuracy):'—')+'</b><small>与原标签一致</small></span><em>'+(evaluationStage==='test'?'锁定测试':'训练集交叉验证')+'</em>';
  }
  function renderWorkflow() {
    var d=flowText[workflowStep];$('flow-kicker').textContent='STEP 0'+(workflowStep+1)+' / '+d.role;
    $('flow-title').textContent=d.name;$('flow-subtitle').textContent=d.title;$('flow-input').textContent=d.input;$('flow-copy').textContent=d.process;
    $('flow-why').textContent=d.why;$('flow-output').textContent=d.output;$('flow-trap').textContent=d.trap;$('flow-count').textContent=(workflowStep+1)+' / '+flowText.length;
    $('flow-prev').disabled=workflowStep===0;$('flow-next').disabled=workflowStep===flowText.length-1;
    Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(button){var n=Number(button.dataset.step),active=n===workflowStep;button.classList.toggle('is-selected',active);button.classList.toggle('is-complete',n<workflowStep);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-current',active?'step':'false');});
    renderFlowOverview();
    var snapshot=$('flow-snapshot');
    if(ready){
      var activeSample=byId[currentId];$('flow-sample-image').src=activeSample.image;$('flow-sample-select').value=currentId;
      $('flow-sample-meta').textContent=activeSample.id+' · 源井深 '+activeSample.depth+' m · 井 '+activeSample.well+' · 标签不作为分类输入';
      $('flow-k-select').value=String(config().k);$('flow-color-weight').value=String(Math.round(config().colorWeight*100));$('flow-weight-value').textContent=Math.round(config().colorWeight*100)+' / '+Math.round((1-config().colorWeight)*100);
    }
    if(workflowStep===0){
      var grouped={};DATA.samples.forEach(function(s){if(!grouped[s.group])grouped[s.group]=[];grouped[s.group].push(s);});
      var groupNames=Object.keys(grouped).sort(function(a,b){return Number(a.split('-').pop())-Number(b.split('-').pop());});
      if(!selectedDepthGroup)selectedDepthGroup=groupNames.filter(function(name){return grouped[name][0].split==='test';})[0];
      var selected=grouped[selectedDepthGroup],start=Number(selectedDepthGroup.split('-').pop());
      snapshot.innerHTML='<h4>标签留在训练参考集，测试标签留待评价。</h4><div class="technical-pools"><div><b>42 张</b><span>训练集：照片 + 已有标签<br>12个组内部交叉验证与尺度拟合</span></div><div><b>24 张</b><span>测试集：5个组留出<br>锁定参数后才开放查询与评价</span></div></div><h5>点击真实井段，检查分组去向</h5><div class="depth-group-picker">'+groupNames.map(function(name){var samples=grouped[name],begin=Number(name.split('-').pop());return '<button type="button" data-depth-group="'+name+'" class="'+samples[0].split+'" aria-pressed="'+String(name===selectedDepthGroup)+'"><b>'+begin+'—'+(begin+19)+' m</b><small>'+samples.length+' 张 / '+(samples[0].split==='test'?'测试':'训练')+'</small></button>';}).join('')+'</div><div class="group-readout"><b>'+start+'—'+(start+19)+' m · '+(selected[0].split==='test'?'整组留作测试':'整组进入训练参考集')+'</b><p>'+(selected[0].split==='test'&&evaluationStage!=='test'?'该组标签留到参数锁定后再查看。':classes.map(function(c){return c.name+' '+selected.filter(function(s){return s.classId===c.id;}).length+' 张';}).join(' / '))+'</p></div><p class="fine-print">17 组中 5 组用于测试。同组不跨集合；蓝灰表示训练，橙色表示测试，不表示岩性。</p>';return;
    }
    if(!ready){snapshot.innerHTML='<p>正在准备实际样本与计算结果，请稍候…</p>';return;}
    var sample=byId[currentId],f=computed[currentId].features;
    var query=queryContext(),pool=query.samples,fitScale=query.scaler;var result=MODEL.predict(f,pool,config(),fitScale);
    if(workflowStep===1){
      var labels=['原始照片','中心裁切位置','96 × 96 计算结果'];
      snapshot.innerHTML='<h4>同一张照片，检查每一步输入。</h4><div class="processing-stages">'+labels.map(function(label,index){return '<button type="button" data-image-stage="'+index+'" aria-pressed="'+String(index===imageStage)+'">'+(index+1)+'. '+label+'</button>';}).join('')+'</div><div class="processing-figure">'+(imageStage<2?'<div class="processing-photo"><img src="'+sample.image+'" alt="'+esc(labels[imageStage])+'">'+(imageStage===1?'<span class="roi-outline"></span>':'')+'</div>':'')+'</div><div class="technical-readout">'+['原始 JPEG 保持不变。编号、文件名与井深不进入特征向量。','虚线框：x、y 均从原图的 14% 位置开始，宽、高各取 72%。框外像素不进入后续计算。','画面由真实中心区域缩放后的像素绘制。输出 96 × 96 × 3 个通道值，颜色与灰度分支都从这里出发。'][imageStage]+'</div><p class="fine-print">缩放统一像素尺寸，不提供毫米尺度；中心裁切只能减轻边框干扰。</p>';
      if(imageStage===2)flowCanvas('.processing-figure','rgb');
    }
    if(workflowStep===2){
      var channel=Math.floor(flowColorBin/4),bin=flowColorBin%4,value=f.vector[flowColorBin],count=Math.round(value*cropSize*cropSize);
      snapshot.innerHTML='<h4>选一个颜色桶，看它统计了哪些像素。</h4><div class="technical-image-row"><div class="flow-color-canvas"></div><div class="technical-histograms">'+['R','G','B'].map(function(name,c){return '<div><h5>'+name+' 通道 / 4 桶</h5><div class="technical-histogram">'+f.vector.slice(c*4,c*4+4).map(function(v,b){var n=c*4+b;return '<button type="button" data-color-bin="'+n+'" aria-pressed="'+String(n===flowColorBin)+'" title="'+name+' '+(b*64)+'—'+(b*64+63)+'"><i style="--channel:'+['#bd7e65','#8caa79','#84a6be'][c]+';height:'+Math.max(2,v*70)+'px"></i>'+b*64+'—'+(b*64+63)+'<small>'+pct(v)+'</small></button>';}).join('')+'</div></div>';}).join('')+'</div></div><div class="technical-readout"><b>'+['R','G','B'][channel]+' = '+bin*64+'—'+(bin*64+63)+'</b><br>'+count+' / 9,216 像素 = '+value.toFixed(4)+'。对应像素保持原色，其余像素变暗，仅用于解释计数。</div><p class="fine-print">每个通道单独统计，同一个像素在 R、G、B 各投一次计数；每个通道四桶之和为 1。显示百分比经过四舍五入。</p>';
      flowCanvas('.flow-color-canvas','color');
    }
    if(workflowStep===3){
      var at=flowPixelY*cropSize+flowPixelX,pattern=MODEL.localPattern(f.gray,cropSize,flowPixelX,flowPixelY),code=pattern.code;
      var dx=f.gray[at+1]-f.gray[at-1],dy=f.gray[at+cropSize]-f.gray[at-cropSize],angle=Math.atan2(dy,dx),direction=Math.min(7,Math.floor((angle+Math.PI)/(2*Math.PI)*8));
      var cells=[0,1,2,7,-1,3,6,5,4];
      snapshot.innerHTML='<h4>Uniform LBP（P=8，R=1）与特征拼接</h4><p class="fine-print">移动观察位置，检查真实灰度图的圆周采样与模式映射。</p><div class="technical-branches"><div><b>RGB 分支 → 12维</b>颜色直方图。</div><div><b>灰度分支 → 22维</b>Uniform LBP 10 + 梯度8 + 统计量4。</div></div><div class="technical-image-row"><div class="flow-gray-canvas"><span class="technical-pixel-marker" style="left:'+((flowPixelX+.5)/cropSize*100)+'%;top:'+((flowPixelY+.5)/cropSize*100)+'%" aria-hidden="true"></span></div><div><div class="technical-pixel-controls"><label>横坐标 x = '+flowPixelX+'<input type="range" min="1" max="94" value="'+flowPixelX+'" data-flow-pixel="x" aria-label="选择采样中心横坐标"></label><label>纵坐标 y = '+flowPixelY+'<input type="range" min="1" max="94" value="'+flowPixelY+'" data-flow-pixel="y" aria-label="选择采样中心纵坐标"></label></div><div class="technical-neighborhood">'+cells.map(function(index){var center=index===-1,value=center?pattern.center:pattern.samples[index];return '<span class="'+(center?'center':'')+'">'+value.toFixed(1)+'<small>'+(center?'中心':value>=pattern.center?'≥ 中心 → 1':'< 中心 → 0')+'</small></span>';}).join('')+'</div></div></div><div class="technical-formula">圆周采样：从左上顺时针对应bit 0…7，非整数坐标使用双线性插值。<br>二进制按bit 7…0显示：'+('00000000'+code.toString(2)).slice(-8)+'<br>循环跳变数 U = '+pattern.transitions+'；1的数量 = '+pattern.ones+'<br>U ≤ 2时映射到1的数量；否则映射到非均匀模式9 → bin '+pattern.bin+'<br>Gx = '+dx.toFixed(2)+'，Gy = '+dy.toFixed(2)+'；幅值 '+Math.sqrt(dx*dx+dy*dy).toFixed(2)+' → 梯度方向区间 '+direction+'</div><p class="fine-print">九宫格展示中心与8个圆周采样值，不是直接使用方形邻域角点；对角点距中心为1像素。滑杆松开后更新，比较采用完整精度，数值显示一位小数。对8,836个内部位置汇总10维LBP直方图。</p><h5>多特征拼接：12 + 10 + 8 + 4 = 34维</h5>'+flowVector(f)+'<p class="fine-print">LBP映射具有旋转不变性；含方向特征的整体向量不具备此保证。8维全图梯度直方图不称为完整HOG。依据：<a href="https://doi.org/10.1109/TPAMI.2002.1017623" target="_blank" rel="noopener noreferrer">Ojala et al., 2002</a>。</p>';
      flowCanvas('.flow-gray-canvas','gray');
    }
    if(workflowStep===4){
      var ranked=MODEL.predict(f,pool,{k:pool.length,colorWeight:config().colorWeight},fitScale).neighbors;
      if(!flowReferenceId||!pool.some(function(r){return r.id===flowReferenceId;}))flowReferenceId=ranked[0].id;
      var ref=pool.filter(function(r){return r.id===flowReferenceId;})[0],explain=MODEL.explainDistance(f.vector,ref.features.vector,config().colorWeight,fitScale),total=explain.colorPart+explain.otherPart;
      snapshot.innerHTML='<h4>加权距离度量 / 当前'+pool.length+'张拟合参考图</h4><div class="technical-table-scroll"><table class="technical-table"><thead><tr><th>距离排序 / 点击参考图</th><th>原标签</th><th>距离</th></tr></thead><tbody>'+ranked.map(function(n,i){return '<tr class="'+(n.id===flowReferenceId?'is-current':'')+'"><td><button type="button" data-reference-id="'+n.id+'">#'+(i+1)+' '+n.id+'</button></td><td>'+className(n.classId)+'</td><td>'+n.distance.toFixed(4)+'</td></tr>';}).join('')+'</tbody></table></div><div class="technical-comparison"><img src="'+byId[ref.id].image+'" alt="被比较的真实参考图 '+ref.id+'"><span>'+ref.id+' · '+className(ref.classId)+'<br>与上方待识别图的距离：'+explain.distance.toFixed(4)+'</span></div><div class="technical-formula">δᵢ = (查询值 − 参考值) / max(σ训练参考集,i, 0.01)<br>C = 前 12 维 δ² 的平均；T = 后 22 维 δ² 的平均<br>d = √[w × C + (1 − w) × T]<br>= √['+explain.colorPart.toFixed(4)+' + '+explain.otherPart.toFixed(4)+'] = '+explain.distance.toFixed(4)+'</div><div class="technical-distance-bars" aria-label="颜色与其余特征对平方距离的贡献"><span style="width:'+(total?explain.colorPart/total*100:0)+'%;background:#c59673"></span><span style="width:'+(total?explain.otherPart/total*100:0)+'%;background:#91a8a6"></span></div><p class="fine-print">棕色：颜色贡献；蓝灰：其余 22 维贡献。条长展示 d² 的组成；最终距离还要开方。权重 w = '+config().colorWeight.toFixed(1)+'。</p><details><summary>展开核对全部 34 维数值与尺度</summary><div class="technical-table-scroll"><table class="technical-table"><thead><tr><th>维度</th><th>查询值</th><th>参考值</th><th>尺度</th><th>δ</th></tr></thead><tbody>'+explain.rows.map(function(r){return '<tr><td>'+flowFeatureName(r.index)+'</td><td>'+r.query.toFixed(4)+'</td><td>'+r.reference.toFixed(4)+'</td><td>'+r.scale.toFixed(4)+'</td><td>'+r.delta.toFixed(4)+'</td></tr>';}).join('')+'</tbody></table></div></details><p class="fine-print">交叉验证时排除查询图整个井段组，尺度仅由该折拟合样本计算；锁定测试时才使用全部42张训练图。条形长度只解释距离数值，不表示分类特征重要性。</p>';
    }
    if(workflowStep===5){
      var contextKey=currentId+'|'+JSON.stringify(config());if(contextKey!==voteContext){voteContext=contextKey;flowVoteCount=0;}
      var count=Math.min(flowVoteCount,result.k),partial={votes:{},k:result.k};result.neighbors.slice(0,count).forEach(function(n){partial.votes[n.classId]=(partial.votes[n.classId]||0)+1;});
      snapshot.innerHTML='<h4>'+(count===result.k?'计票完成：'+className(result.classId):'已计 '+count+' / '+result.k+' 票，尚未完成')+'</h4><div class="snapshot-vote-gallery">'+result.neighbors.map(function(n,i){return '<figure class="'+(i<count?'is-counted':'')+'" style="--lith-color:'+byClass[n.classId].color+'"><img src="'+byId[n.id].image+'" alt="近邻 '+(i+1)+'，'+className(n.classId)+'"><figcaption>#'+(i+1)+' '+className(n.classId)+'<small>'+n.id+'<br>距离 '+n.distance.toFixed(4)+'</small></figcaption></figure>';}).join('')+'</div><div class="snapshot-votes">'+voteMarkup(partial)+'</div><div class="vote-controls"><button type="button" data-flow-action="vote-reset" class="quiet-button">从零计票</button><button type="button" data-flow-action="vote-next" class="quiet-button" '+(count===result.k?'disabled':'')+'>计入下一张 →</button><button type="button" data-flow-action="vote-all" class="quiet-button">查看完整投票</button></div><div class="technical-readout">'+(count===result.k?'最高票 '+result.votes[result.classId]+' / '+result.k+'，占比 '+pct(result.share)+'。这一比例不作校准概率。':'按距离顺序逐张计入原标签，完成全部 '+result.k+' 票后才输出候选。')+'</div><p class="fine-print">每张图一票。平票时比较该类近邻平均距离；仍相同时按类别 ID 排序。上方 k 与权重改变时，重新开始计票。</p>';
    }
    if(workflowStep===6){
      var phase=evaluationStage==='test'?'锁定参数后的测试集':'训练集分组交叉验证';
      snapshot.innerHTML='<h4>一张图与一组图，回答不同问题。</h4><div class="technical-exits"><section><h5>这张照片</h5><div class="technical-record">样品：'+esc(sample.id)+'<br>候选：'+esc(className(result.classId))+'<br>最高票：'+result.votes[result.classId]+' / '+result.k+'</div><p>回看近邻及其标签，判断这次候选是否有充分依据。</p></section><section><h5>'+phase+'</h5><div class="technical-record">与原标签一致：'+evaluation.hit+' / '+evaluation.count+' 张<br>准确率：'+pct(evaluation.accuracy)+'</div><p>整组表现可以发现单张照片看不到的错误；它不能证明新井也有相同效果。</p></section></div><p>下一页可检查近邻、复核样品，并查看各类别的预测结果。人工意见不改变模型分数。</p>';
    }
  }
  function changeWorkflowStep(next,focus){workflowStep=(next+flowText.length)%flowText.length;renderWorkflow();if(focus){var buttons=document.querySelectorAll('[data-step]');if(buttons[workflowStep])buttons[workflowStep].focus();}reportHeight();}
  Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(button){button.addEventListener('click',function(){changeWorkflowStep(Number(button.dataset.step),false);});button.addEventListener('keydown',function(event){var next=Number(button.dataset.step);if(event.key==='ArrowRight')next++;else if(event.key==='ArrowLeft')next--;else if(event.key==='Home')next=0;else if(event.key==='End')next=flowText.length-1;else return;event.preventDefault();changeWorkflowStep(next,true);});});
  $('flow-prev').addEventListener('click',function(){changeWorkflowStep(workflowStep-1,false);});
  $('flow-next').addEventListener('click',function(){changeWorkflowStep(workflowStep+1,false);});
  $('flow-sample-select').addEventListener('change',function(){selectSample(this.value);renderWorkflow();reportHeight();});
  $('flow-k-select').addEventListener('change',function(){if(lockedConfig)return;$('k-select').value=this.value;drawQuery();updateEvaluation();renderWorkflow();reportHeight();});
  $('flow-color-weight').addEventListener('input',function(){if(lockedConfig)return;$('color-weight').value=this.value;$('weight-value').textContent=this.value+' / '+(100-Number(this.value));drawQuery();updateEvaluation();renderWorkflow();reportHeight();});
  $('flow-snapshot').addEventListener('change',function(event){var pixel=event.target.closest('[data-flow-pixel]');if(!pixel)return;var value=Math.max(1,Math.min(94,Number(pixel.value)||1));if(pixel.dataset.flowPixel==='x')flowPixelX=value;else flowPixelY=value;renderWorkflow();reportHeight();});
  $('flow-snapshot').addEventListener('click',function(event){
    var group=event.target.closest('[data-depth-group]');if(group){selectedDepthGroup=group.dataset.depthGroup;renderWorkflow();reportHeight();return;}
    var stage=event.target.closest('[data-image-stage]');if(stage){imageStage=Math.max(0,Math.min(2,Number(stage.dataset.imageStage)));renderWorkflow();reportHeight();return;}
    var bin=event.target.closest('[data-color-bin]');if(bin){flowColorBin=Math.max(0,Math.min(11,Number(bin.dataset.colorBin)));renderWorkflow();reportHeight();return;}
    var ref=event.target.closest('[data-reference-id]');if(ref){if(references.some(function(r){return r.id===ref.dataset.referenceId;}))flowReferenceId=ref.dataset.referenceId;renderWorkflow();reportHeight();return;}
    var action=event.target.closest('[data-flow-action]');if(!action||!ready)return;
    var query=queryContext();var result=MODEL.predict(computed[currentId].features,query.samples,config(),query.scaler);
    if(action.dataset.flowAction==='vote-reset')flowVoteCount=0;
    if(action.dataset.flowAction==='vote-next')flowVoteCount=Math.min(result.k,flowVoteCount+1);
    if(action.dataset.flowAction==='vote-all')flowVoteCount=result.k;
    renderWorkflow();reportHeight();
  });


  $('sample-select').addEventListener('change',function(){selectSample(this.value);});
  $('k-select').addEventListener('change',function(){if(lockedConfig)return;drawQuery();updateEvaluation();});
  $('color-weight').addEventListener('input',function(){if(lockedConfig)return;var n=Number(this.value);$('weight-value').textContent=n+' / '+(100-n);drawQuery();updateEvaluation();});
  function updateDisturbance(){exposure=Number($('exposure').value);contrast=Number($('contrast').value)/100;$('exposure-value').textContent=String(exposure);$('contrast-value').textContent=contrast.toFixed(1)+'×';drawQuery();}
  $('exposure').addEventListener('input',updateDisturbance);$('contrast').addEventListener('input',updateDisturbance);
  $('reset-image').addEventListener('click',function(){$('exposure').value='0';$('contrast').value='100';updateDisturbance();});
  $('reset-parameters').addEventListener('click',function(){if(lockedConfig)return;$('k-select').value='5';$('color-weight').value='50';$('weight-value').textContent='50 / 50';$('exposure').value='0';$('contrast').value='100';updateDisturbance();updateEvaluation();});
  $('save-review').addEventListener('click',function(){
    if(!ready||!currentResult)return;
    reviews[currentId]={classId:$('review-class').value,time:new Date().toISOString(),modelAtReview:currentResult.classId,k:config().k,colorWeight:config().colorWeight,exposure:exposure,contrast:contrast};
    $('review-status').textContent='已复核为 '+className(reviews[currentId].classId)+' · 共 '+Object.keys(reviews).length+' 条人工记录。请导出 CSV 保存。';renderDepth();publishLessonState();reportHeight();
  });
  function csvCell(value){return '"'+String(value==null?'':value).replace(/"/g,'""')+'"';}
  $('export-csv').addEventListener('click',function(){
    if(!ready||!evaluation)return;
    var columns=['sample_id','well','source_depth_m','group_20m','source_label','model_prediction_original_conditions','vote_share_not_probability','review_label','model_candidate_at_review','review_k','review_color_weight','review_exposure','review_contrast','review_time','current_k','current_color_weight','source_commit','image_sha256','evaluation_protocol','evaluation_stage','feature_descriptor'];
    var lines=[columns];evaluation.predictions.forEach(function(p){var s=byId[p.id],r=reviews[p.id];lines.push([s.id,s.well,s.depth,s.group,className(s.classId),className(p.result.classId),p.result.share,r?className(r.classId):'',r?className(r.modelAtReview):'',r?r.k:'',r?r.colorWeight:'',r?r.exposure:'',r?r.contrast:'',r?r.time:'',config().k,config().colorWeight,DATA.source.commit,s.sha256,evaluationStage==='test'?'fixed-parameter-holdout':'LeaveOneGroupOut-training-only',evaluationStage,'RGB12+LBPriu2-P8-R1-10+Gradient8+Stats4']);});
    var blob=new Blob(['\ufeff'+lines.map(function(row){return row.map(csvCell).join(',');}).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='m1-cuttings-predictions-and-review.csv';document.body.appendChild(a);a.click();a.remove();window.setTimeout(function(){URL.revokeObjectURL(url);},1000);
  });
  $('review-class').innerHTML=classes.map(function(c){return '<option value="'+c.id+'">'+c.name+'</option>';}).join('');
  // An app/browser preview can also be framed. Only an explicit portal request
  // selects compact section mode; being inside a frame must not hide the lessons.
  var sectionQuery=new URLSearchParams(window.location.search||'');
  var portalSection=window.__CASE_DEMO_VIEW__||sectionQuery.get('section');
  var embedded=Boolean(window.__CASE_DEMO_VIEW__)||sectionQuery.get('embed')==='portal';
  if(embedded){document.body.classList.add('embedded');var brand=document.querySelector?document.querySelector('.wordmark'):null;if(brand){brand.removeAttribute('href');brand.setAttribute('aria-label','M1 岩屑岩性辅助识别');}}
  function publishLessonState(){
    if(!embedded||!sharingReady||!shareInitialized||applyingShared||!ready)return;
    window.parent.postMessage({__m1StateUpdate:{sampleId:currentId,k:config().k,colorWeight:config().colorWeight,stage:evaluationStage,reviews:reviews}},'*');
  }
  function applyLessonState(state){
    if(!ready||!state||!byId[state.sampleId]||[1,3,5,7].indexOf(state.k)<0||typeof state.colorWeight!=='number'||state.colorWeight<0||state.colorWeight>1)return;
    var stage=state.stage==='test'?'test':'validation';
    if((stage==='test')!==(byId[state.sampleId].split==='test'))return;
    applyingShared=true;evaluationStage=stage;lockedConfig=stage==='test'?{k:state.k,colorWeight:state.colorWeight}:null;
    $('k-select').value=String(state.k);$('color-weight').value=String(Math.round(state.colorWeight*100));$('weight-value').textContent=Math.round(state.colorWeight*100)+' / '+Math.round((1-state.colorWeight)*100);
    if(state.reviews&&typeof state.reviews==='object')reviews=state.reviews;
    currentId=state.sampleId;populateSampleChoices();syncEvaluationControls();updateEvaluation();selectSample(currentId);renderWorkflow();applyingShared=false;reportHeight();
  }
  window.addEventListener('message',function(event){
    if(event.source!==window.parent||!event.data)return;
    if(embedded&&event.data.__m1ScrollToTop)window.scrollTo(0,0);
    if(event.data.__m1NavigationAck&&event.data.__m1NavigationAck===navigationPending)navigationPending=null;
    if(Object.prototype.hasOwnProperty.call(event.data,'__m1SharedState')){
      sharingReady=true;sharedPending=event.data.__m1SharedState;
      if(ready&&shareInitialized){if(sharedPending)applyLessonState(sharedPending);else publishLessonState();}
    }
  });
  if(embedded)window.parent.postMessage({__m1StateRequest:true},'*');
  setView(portalSection||window.location.hash.slice(1)||'background',false);renderWorkflow();
  // Prevent controls from acting on incomplete computations; all content remains readable.
  var demoControls=['sample-select','k-select','color-weight','exposure','contrast','save-review','export-csv','flow-sample-select','flow-k-select','flow-color-weight','finalize-test','next-disagreement'];
  demoControls.forEach(function(id){$(id).disabled=true;});
  Promise.all(DATA.samples.map(imageFeatures)).then(function(results){
    references=results.filter(function(s){return byId[s.id].split==='reference';});tests=results.filter(function(s){return byId[s.id].split==='test';});scaler=MODEL.fit(references);Array.from(new Set(references.map(function(s){return s.group;}))).forEach(function(group){var subset=references.filter(function(s){return s.group!==group;});foldContexts[group]={samples:subset,scaler:MODEL.fit(subset)};});ready=true;currentId=((pendingRock&&references.filter(function(s){return s.classId===pendingRock;})[0])||references[0]).id;
    populateSampleChoices();
    demoControls.forEach(function(id){$(id).disabled=false;});
    $('flow-status').textContent='已就绪 · 当前阶段在训练集上探索超参数；锁定后开放测试图，始终使用原始成像条件讲解。';
    updateEvaluation();selectSample(currentId);renderWorkflow();shareInitialized=true;if(sharedPending)applyLessonState(sharedPending);else publishLessonState();reportHeight();
  }).catch(function(error){$('loading-status').classList.add('is-error');$('loading-status').textContent='样本初始化失败：'+error.message+'。请确认案例包完整，并刷新页面。';$('flow-status').textContent='样本初始化失败：'+error.message+'。请确认案例包完整并刷新。';reportHeight();});
  if(window.ResizeObserver)new window.ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener('load',reportHeight);window.addEventListener('resize',reportHeight);
}());
