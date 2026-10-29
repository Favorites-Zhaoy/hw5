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
  var workflowStep = 0, view = 'background', motionPaused = false, revealed = false;
  var cropSize = 96, exposure = 0, contrast = 1, matrixFilter = null;
  var imageStage = 0, flowVoteCount = null, voteContext = '', selectedDepthGroup = null;
  var sharingReady=false,sharedPending=null,shareInitialized=false,applyingShared=false,navigationPending=null,pendingRock=null;
  var className = function (id) { return byClass[id] ? byClass[id].name : '尚未复核'; };
  var pct = function (v) { return (v * 100).toFixed(1) + '%'; };
  var config = function () { return lockedConfig?{k:lockedConfig.k,colorWeight:lockedConfig.colorWeight}:{ k: Number($('k-select').value), colorWeight: Number($('color-weight').value) / 100 }; };
  var threshold = function () { return Number($('review-threshold').value) / 100; };
  var flowText = /* M1_FLOW_TEXT */ [];

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
    if (ready && next === 'demo') drawQuery();
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
  function selectSample(id) {
    if (!ready || !byId[id] || !activeSamples().some(function(s){return s.id===id;})) return;
    currentId=id;revealed=false;$('sample-select').value=id;$('original-label').hidden=true;
    $('reveal-label').textContent='显示原数据标签';
    var image=byId[id]; selectedDepthGroup=image.group; showFieldSample(image); renderRockLesson(image.classId,image); $('query-image').src=image.image;
    $('query-id').textContent=image.id; $('query-depth').textContent='源记录井深 '+image.depth+' m · 井 '+image.well;
    drawQuery(); renderFeatureMap(); renderDepth();
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
    $('prediction').textContent=className(currentResult.classId);
    $('vote-summary').textContent='最高票 '+currentResult.votes[currentResult.classId]+' / '+currentResult.k+' · 投票占比 '+pct(currentResult.share);
    $('vote-bars').innerHTML=voteMarkup(currentResult);
    var weak=currentResult.share<threshold();
    $('result-state').classList.toggle('needs-review',weak);$('result-state').textContent=weak?'优先复核':'候选已生成';
    $('neighbors').innerHTML=currentResult.neighbors.map(function(n,i){var s=byId[n.id],c=byClass[n.classId];return '<article class="neighbor" style="--lith-color:'+c.color+'"><span class="neighbor-rank">NEIGHBOR '+(i+1)+'</span><img src="'+s.image+'" alt="近邻 '+s.id+'，原标签 '+c.name+'"><b>'+c.name+'</b><small>'+s.id+'<br>距离 '+n.distance.toFixed(3)+'<br>原井深 '+s.depth+' m</small></article>';}).join('');
    $('review-class').value=reviews[currentId]?reviews[currentId].classId:currentResult.classId;
    $('review-status').textContent=reviews[currentId]?'本次会话已复核为 '+className(reviews[currentId].classId)+'。模型原始记录保留。':'尚未复核 · 共 '+Object.keys(reviews).length+' 条人工记录';
    if (revealed) $('original-label').textContent='原数据标签：'+className(byId[currentId].classId)+'。仅用于对照，不作为分类输入。';
    if (view==='workflow') renderWorkflow(); publishLessonState(); reportHeight();
  }
  function updateEvaluation() {
    if (!ready) return;
    if(evaluationStage==='test')evaluation=MODEL.evaluate(tests,references,ids,config(),scaler);
    else{var key=JSON.stringify(config());if(!validationCache[key])validationCache[key]=MODEL.crossValidate(references,ids,config());evaluation=validationCache[key];}
    syncEvaluationControls();
    $('evaluation-stats').innerHTML=[[evaluationStage==='test'?'锁定测试':'交叉验证折外样本',String(evaluation.count),'共 '+new Set(activeSamples().map(function(s){return byId[s.id].group;})).size+' 个井段组'],['准确率',pct(evaluation.accuracy),evaluation.hit+' / '+evaluation.count+' 张与原标签一致'],['宏平均 F1',evaluation.macroF1.toFixed(3),'三个类别等权平均'],['待优先复核',String(evaluation.predictions.filter(function(p){return p.result.share<threshold();}).length),'以当前 '+pct(threshold())+' 投票门槛统计']].map(function(x){return '<div class="evaluation-stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>';}).join('');
    var max=Math.max.apply(null,[1].concat.apply([1],evaluation.matrix));
    $('confusion-matrix').innerHTML='<table class="matrix" aria-label="模型原始输出的混淆矩阵"><thead><tr><th>原标签 ↓<br>预测 →</th>'+classes.map(function(c){return '<th scope="col">'+c.name+'</th>';}).join('')+'</tr></thead><tbody>'+evaluation.matrix.map(function(row,i){return '<tr><th scope="row">'+classes[i].name+'</th>'+row.map(function(n,j){return '<td><button type="button" class="matrix-cell" data-truth="'+classes[i].id+'" data-predicted="'+classes[j].id+'" data-off="'+(i!==j)+'" style="--strength:'+(n?.2+.6*n/max:.05)+'" aria-label="'+classes[i].name+'预测为'+classes[j].name+'：'+n+'张">'+n+'</button></td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
    if(matrixFilter) renderMatrixSelection(matrixFilter.truth,matrixFilter.predicted);
    renderFeatureMap();renderDepth();if(view==='workflow')renderWorkflow();
  }
  function renderMatrixSelection(truth,predicted) {
    matrixFilter={truth:truth,predicted:predicted};
    var chosen=evaluation.predictions.filter(function(p){return p.truth===truth&&p.result.classId===predicted;});
    $('matrix-selection').innerHTML=className(truth)+' → '+className(predicted)+'：'+chosen.length+' 张。 '+chosen.map(function(p){return '<button type="button" data-pick="'+p.id+'">'+p.id+'</button>';}).join('');
  }
  $('confusion-matrix').addEventListener('click',function(event){var b=event.target.closest('[data-truth]');if(b&&ready)renderMatrixSelection(b.dataset.truth,b.dataset.predicted);});
  $('matrix-selection').addEventListener('click',function(event){var b=event.target.closest('[data-pick]');if(b)selectSample(b.dataset.pick);});

  function renderFeatureMap() {
    if(!ready)return;
    var all=evaluationStage==='test'?references.concat(tests):references;
    var x0=45,y0=190,w=350,h=155;
    var means=all.map(function(s){return s.features.stats.brightness;}),edges=all.map(function(s){return s.features.stats.edges;});
    var xmin=Math.min.apply(null,means)-5,xmax=Math.max.apply(null,means)+5,ymax=Math.max(.1,Math.max.apply(null,edges)*1.12);
    function point(sample){return [x0+(sample.features.stats.brightness-xmin)/(xmax-xmin)*w,y0-sample.features.stats.edges/ymax*h];}
    var svg='<svg class="feature-map-svg" viewBox="0 0 430 232" role="img" aria-label="原图中心区域平均亮度与边缘比例的双变量散点图"><path d="M45 25V190H405" fill="none" stroke="#d8d2c2"/>';
    [0,.5,1].forEach(function(t){var y=y0-t*h;svg+='<line x1="45" y1="'+y+'" x2="405" y2="'+y+'" stroke="#e8e1d2" stroke-dasharray="3 5"/><text x="37" y="'+(y+3)+'" text-anchor="end">'+(t*ymax*100).toFixed(0)+'%</text>';var x=x0+t*w;svg+='<text x="'+x+'" y="207" text-anchor="middle">'+(xmin+t*(xmax-xmin)).toFixed(0)+'</text>';});
    all.forEach(function(s){var p=point(s),color=byClass[s.classId].color,shape=byId[s.id].split==='test'?'<path d="M'+p[0]+' '+(p[1]-4)+'l4 4-4 4-4-4Z"':'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.5"';svg+=shape+' class="point" fill="'+color+'"><title>'+s.id+' · 原标签 '+className(s.classId)+'</title>'+(shape.indexOf('circle')>=0?'</circle>':'</path>');if(s.id===currentId)svg+='<circle class="current-point" cx="'+p[0]+'" cy="'+p[1]+'" r="8"/>';});
    svg+='<text x="220" y="226" text-anchor="middle">平均亮度（0—255）</text><text x="45" y="15">边缘比例</text></svg>';
    $('feature-map').innerHTML=svg;
  }
  function lithStyle(id) { return byClass[id]?'--lith-color:'+byClass[id].color+';--lith-bg:'+byClass[id].color+'20':''; }
  function renderDepth() {
    if(!ready||!evaluation)return;
    $('depth-legend').innerHTML=classes.map(function(c){return '<span><i style="--lith-color:'+c.color+'"></i>'+c.name+'</span>';}).join('');
    var groups=[],lastDepth=null;
    evaluation.predictions.slice().sort(function(a,b){return byId[a.id].depth-byId[b.id].depth;}).forEach(function(p){var sample=byId[p.id];if(lastDepth!==null&&sample.depth-lastDepth>10)groups.push({gap:sample.depth-lastDepth});groups.push(p);lastDepth=sample.depth;});
    var html='<div class="depth-group"><div class="depth-row header"><b>井深 / m</b><span>原数据标签</span><span>模型折外 / 测试预测</span><span>人工复核</span></div>';
    groups.forEach(function(p){if(p.gap){html+='<div class="depth-gap">⋮ 相邻展示样本间隔 '+p.gap+' m，未补造中间记录</div>';return;}var s=byId[p.id],r=reviews[p.id];html+='<div class="depth-row'+(p.id===currentId?' is-current':'')+'"><button type="button" data-pick="'+p.id+'">'+s.depth.toFixed(0)+'</button><span style="'+lithStyle(p.truth)+'">'+className(p.truth)+'</span><span style="'+lithStyle(p.result.classId)+'">'+className(p.result.classId)+'</span><span style="'+(r?lithStyle(r.classId):'')+'">'+(r?className(r.classId):'待复核')+'</span></div>';});
    $('depth-log').innerHTML=html+'</div>';
  }
  $('depth-log').addEventListener('click',function(event){var b=event.target.closest('[data-pick]');if(b)selectSample(b.dataset.pick);});
  /* M1_EVALUATION_SCRIPT */
  /* M1_WORKFLOW_SCRIPT */

  $('sample-select').addEventListener('change',function(){selectSample(this.value);});
  $('k-select').addEventListener('change',function(){if(lockedConfig)return;drawQuery();updateEvaluation();});
  $('color-weight').addEventListener('input',function(){if(lockedConfig)return;var n=Number(this.value);$('weight-value').textContent=n+' / '+(100-n);drawQuery();updateEvaluation();});
  $('review-threshold').addEventListener('input',function(){$('threshold-value').textContent=this.value+'%';drawQuery();updateEvaluation();});
  function updateDisturbance(){exposure=Number($('exposure').value);contrast=Number($('contrast').value)/100;$('exposure-value').textContent=String(exposure);$('contrast-value').textContent=contrast.toFixed(1)+'×';drawQuery();}
  $('exposure').addEventListener('input',updateDisturbance);$('contrast').addEventListener('input',updateDisturbance);
  $('reset-image').addEventListener('click',function(){$('exposure').value='0';$('contrast').value='100';updateDisturbance();});
  $('reset-parameters').addEventListener('click',function(){if(lockedConfig)return;$('k-select').value='5';$('color-weight').value='50';$('weight-value').textContent='50 / 50';$('exposure').value='0';$('contrast').value='100';$('review-threshold').value='70';$('threshold-value').textContent='70%';updateDisturbance();updateEvaluation();});
  $('reveal-label').addEventListener('click',function(){if(!ready)return;revealed=!revealed;$('original-label').hidden=!revealed;this.textContent=revealed?'隐藏原数据标签':'显示原数据标签';$('original-label').textContent='原数据标签：'+className(byId[currentId].classId)+'。仅用于对照，不作为分类输入。';reportHeight();});
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
  var demoControls=['sample-select','k-select','color-weight','exposure','contrast','review-threshold','save-review','export-csv','flow-sample-select','flow-k-select','flow-color-weight','finalize-test'];
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
