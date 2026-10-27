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
  var className = function (id) { return byClass[id] ? byClass[id].name : '尚未复核'; };
  var pct = function (v) { return (v * 100).toFixed(1) + '%'; };
  var config = function () { return lockedConfig?{k:lockedConfig.k,colorWeight:lockedConfig.colorWeight}:{ k: Number($('k-select').value), colorWeight: Number($('color-weight').value) / 100 }; };
  var threshold = function () { return Number($('review-threshold').value) / 100; };
  var flowText = /* M1_FLOW_TEXT */ [];

  function reportHeight() {
    if (window.parent !== window) window.parent.postMessage({ __m1Height: Math.ceil(document.body.getBoundingClientRect().height) }, '*');
  }
  function setView(next, focus) {
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
    reportHeight();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (button, index, buttons) {
    button.addEventListener('click', function () { setView(button.dataset.view, false); });
    button.addEventListener('keydown', function (event) {
      var at = index;
      if (event.key === 'ArrowRight') at = (index + 1) % 3;
      else if (event.key === 'ArrowLeft') at = (index + 2) % 3;
      else if (event.key === 'Home') at = 0;
      else if (event.key === 'End') at = 2;
      else return;
      event.preventDefault(); setView(buttons[at].dataset.view, true);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (button) { button.addEventListener('click', function () { setView(button.dataset.go, true); }); });
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

  var rockAnnotationsVisible = true;
  function renderRockLesson(id) {
    var lessons={
      sandstone:{photo:'grain-fine',title:'从真实薄片中，辨认颗粒与接触关系。',copy:'复用上文 DZ 细粒砂岩薄片。先沿颗粒轮廓辨认接触关系，再对照原图的 Q 等矿物标注；颗粒之间的暗区不能一概当成有效孔隙。砂岩识别提供岩性线索，储集与流动能力仍需物性证据。',question:'粒度、胶结与孔隙是否支持储层解释？需要标定薄片、岩心与物性实验共同验证。',caption:'DZ 细粒砂岩 · 原图标尺 300 μm',credit:'Zhang et al., 2022 · Heritage Science · 图 4b',doi:'10.1186/s40494-022-00656-y',limit:'石窟砂岩研究中的教学图例，不是本例油井样本。保留原图标尺；显微颜色不能直接对应矿物含量或孔隙率。',marks:[{x:49,y:55,label:'原文 Q 标注',text:'对照原作者的石英（Q）标注观察颗粒，不能只按亮暗认矿物。'},{x:73,y:39,label:'颗粒边界',text:'沿颗粒轮廓比较粒形与相互接触；原图红色矿物标注保持不变。'}]},
      shale:{photo:'structure',title:'细粒与层理，回到真实岩心和薄片中看。',copy:'复用上文龙马溪组页岩图：A 看岩心水平纹层，B 看笔石化石，C 看显微尺度的石英纹层。完整岩心保存的空间关系，在钻碎岩屑中可能不完整；这些观察线索不能单独证明封盖或储集能力。',question:'层理、裂缝和物性是否支持后续解释？需要回到相应井段核对。',caption:'龙马溪组页岩 · 岩心 A、B 与薄片 C',credit:'Tang et al., 2021 · Frontiers in Earth Science · 图 3A—C',doi:'10.3389/feart.2021.775657',limit:'A、B、C 来自 N15 井不同深度，并非同一块样品同步成像。线状特征不能一概解释为裂缝。',marks:[{x:16,y:47,label:'A · 水平纹层',text:'在完整岩心表面观察平行纹层及其延伸。'},{x:42,y:61,label:'B · 笔石',text:'与原文 Graptolite 标注对照，辨认特殊生物组分。'},{x:85,y:70,label:'C · 石英纹层',text:'与原图 Lamination / Authigenic quartz 标注对照，区分观察尺度。'}]},
      dolomite:{photo:'color',title:'从真实岩屑外观，走向需要验证的组成。',copy:'复用上文原标签为 Dolomite 的岩屑图，观察灰褐色调、表面明暗和碎块边界。本例类别名称为“灰质白云岩”，但这张外部论文图只标注“白云岩”；两者不直接等同。仅凭外观不能确认灰质比例或白云石含量。',question:'灰质与白云石组分如何确认？需结合酸反应、显微观察或其他矿物分析。',caption:'Dolomite · 论文原标签为白云岩',credit:'Tolstaya et al., 2023 · Journal of Imaging · 图 4 子图',doi:'10.3390/jimaging9070126',limit:'该图未给出干湿状态与矿物定量；不据此标注晶间孔、溶孔、裂缝或油气。它不属于本例的分类数据。',marks:[{x:32,y:42,label:'碎块表面',text:'对照表面的灰褐色调与局部明暗；不由明暗判定干湿或含油。'},{x:66,y:64,label:'碎块边界',text:'辨认钻碎后碎块的轮廓；碎块尺寸不能代替原岩沉积粒度。'}]}
    };
    if(!lessons[id])id='sandstone';
    var lesson=lessons[id], source=$('paper-source-'+lesson.photo);
    $('reservoir-diagram').innerHTML='<figure class="rock-photo"><div class="rock-photo-stage"><img src="'+source.getAttribute('src')+'" alt="'+esc(source.getAttribute('alt'))+'">'+lesson.marks.map(function(mark,index){return '<span class="rock-photo-pin" style="left:'+mark.x+'%;top:'+mark.y+'%" title="'+esc(mark.label)+'" aria-hidden="true">'+(index+1)+'</span>';}).join('')+'</div><figcaption><b>'+esc(lesson.caption)+'</b><ol class="rock-photo-notes">'+lesson.marks.map(function(mark){return '<li><strong>'+esc(mark.label)+'</strong>'+esc(mark.text)+'</li>';}).join('')+'</ol><p class="paper-credit">'+esc(lesson.credit)+' · CC BY 4.0<br><a href="https://doi.org/'+lesson.doi+'" target="_blank" rel="noopener noreferrer">查看论文与完整原图 ↗</a></p><small>橙色编号为本页新增的观察标注，可隐藏；原图像素、文字与标尺未改动。</small></figcaption></figure>';
    $('rock-concept-title').textContent=lesson.title;$('rock-concept-copy').textContent=lesson.copy;$('rock-concept-question').textContent=lesson.question;
    $('rock-photo-limit').textContent=lesson.limit;
    Array.prototype.forEach.call(document.querySelectorAll('[data-rock]'),function(button){button.setAttribute('aria-pressed',String(button.dataset.rock===id));});
    reportHeight();
  }
  $('rock-annotation-toggle').addEventListener('click',function(){rockAnnotationsVisible=!rockAnnotationsVisible;$('reservoir-diagram').classList.toggle('annotations-hidden',!rockAnnotationsVisible);this.setAttribute('aria-pressed',String(rockAnnotationsVisible));this.textContent=rockAnnotationsVisible?'隐藏网页标注':'显示网页标注';reportHeight();});
  Array.prototype.forEach.call(document.querySelectorAll('[data-rock]'),function(button){button.addEventListener('click',function(){renderRockLesson(button.dataset.rock);});});
  renderRockLesson('sandstone');
  var descriptions = {
    sandstone:{text:'碎屑岩类原标签。观察原岩颗粒与胶结关系；未标定图像不作定量粒度测量，岩屑块径也不能代替沉积粒度。'},
    shale:{text:'细粒沉积岩类原标签。保存的层理与薄片状特征可供观察；钻碎和混样会削弱原岩结构，照片需结合样品复核。'},
    dolomite:{text:'碳酸盐岩类原标签。外观仅支持候选识别；灰质组分与白云石的确认需结合酸反应、显微或其他矿物分析。'}
  };
  $('lithology-cards').innerHTML = classes.map(function (c) {
    var sample = DATA.samples.filter(function(s){return s.classId===c.id&&s.split==='reference';})[0], d=descriptions[c.id];
    return '<article class="lithology-card" style="--lith-color:'+c.color+'"><div class="lithology-top"><h3>'+c.name+'</h3><span>'+DATA.samples.filter(function(s){return s.classId===c.id;}).length+' 张原图</span></div><div class="lithology-evidence"><img src="'+sample.image+'" alt="公开数据中标签为'+c.name+'的岩屑原图"></div><p>'+d.text+'</p><small>本例真实原图 · 深度 '+sample.depth+' m · 沿用原始数据标签，非矿物定量结果。</small></article>';
  }).join('');
  function splitMarkup() {
    return classes.map(function(c){var reference=DATA.samples.filter(function(s){return s.classId===c.id&&s.split==='reference';}).length;var test=DATA.samples.filter(function(s){return s.classId===c.id&&s.split==='test';}).length;
      return '<div class="split-row"><header><span>'+c.name+'</span><span>'+reference+' 参考 / '+test+' 测试</span></header><div class="split-track"><span class="reference" style="width:'+reference/(reference+test)*100+'%">'+reference+'</span><span class="test" style="width:'+test/(reference+test)*100+'%">'+test+'</span></div></div>';
    }).join('')+'<div class="split-legend"><span><i></i>训练集42张</span><span><i class="test"></i>测试集 24 张</span></div>';
  }
  $('split-bars').innerHTML = splitMarkup();

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
    var image=byId[id]; $('query-image').src=image.image;
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
    if (view==='workflow') renderWorkflow(); reportHeight();
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
    $('review-status').textContent='已复核为 '+className(reviews[currentId].classId)+' · 共 '+Object.keys(reviews).length+' 条人工记录。请导出 CSV 保存。';renderDepth();reportHeight();
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
  setView(portalSection||window.location.hash.slice(1)||'background',false);renderWorkflow();
  // Prevent controls from acting on incomplete computations; all content remains readable.
  var demoControls=['sample-select','k-select','color-weight','exposure','contrast','review-threshold','save-review','export-csv','flow-sample-select','flow-k-select','flow-color-weight','finalize-test','flow-finalize-test'];
  demoControls.forEach(function(id){$(id).disabled=true;});
  Promise.all(DATA.samples.map(imageFeatures)).then(function(results){
    references=results.filter(function(s){return byId[s.id].split==='reference';});tests=results.filter(function(s){return byId[s.id].split==='test';});scaler=MODEL.fit(references);Array.from(new Set(references.map(function(s){return s.group;}))).forEach(function(group){var subset=references.filter(function(s){return s.group!==group;});foldContexts[group]={samples:subset,scaler:MODEL.fit(subset)};});ready=true;currentId=references[0].id;
    populateSampleChoices();
    demoControls.forEach(function(id){$(id).disabled=false;});
    $('flow-status').textContent='已就绪 · 当前阶段在训练集上探索超参数；锁定后开放测试图，始终使用原始成像条件讲解。';
    $('loading-status').textContent='已就绪 · 34维手工视觉特征 + kNN · 训练集42张 / 测试集24张 · 先训练集分组交叉验证，锁定参数后测试';
    updateEvaluation();selectSample(currentId);renderWorkflow();reportHeight();
  }).catch(function(error){$('loading-status').classList.add('is-error');$('loading-status').textContent='样本初始化失败：'+error.message+'。请确认案例包完整，并刷新页面。';$('flow-status').textContent='样本初始化失败：'+error.message+'。请确认案例包完整并刷新。';reportHeight();});
  if(window.ResizeObserver)new window.ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener('load',reportHeight);window.addEventListener('resize',reportHeight);
}());
