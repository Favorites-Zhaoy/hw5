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
  var workflowStep = 0, view = 'background', motionPaused = false, revealed = false;
  var cropSize = 96, exposure = 0, contrast = 1, matrixFilter = null;
  var imageStage = 0, flowVoteCount = null, voteContext = '', selectedDepthGroup = null;
  var className = function (id) { return byClass[id] ? byClass[id].name : '尚未复核'; };
  var pct = function (v) { return (v * 100).toFixed(1) + '%'; };
  var config = function () { return { k: Number($('k-select').value), colorWeight: Number($('color-weight').value) / 100 }; };
  var threshold = function () { return Number($('review-threshold').value) / 100; };
  var flowText = [
    { kicker:'STEP 01 / 核验与分组', title:'先分组，再比较。', copy:'核对原图与 CSV 中的岩性、井号和井深，选取三个类别共 66 张照片。按井深每 20 米组成一组，以固定种子划分参考库与测试集。选样和分组不使用模型分数。', output:'42 张参考图、24 张测试图，三个类别在两边均有样本。均值与尺度只由参考库计算。', trap:'相邻或同源照片随机拆分会高估效果；即使分组留出，单井与拍摄批次偏差仍可能存在。' },
    { kicker:'STEP 02 / 图像与特征', title:'把图像，变成可比较的数字。', copy:'从中心 72% 区域取样，再统一到 96 × 96 像素，减少样品盘边框和手写编号影响。计算 12 维颜色直方图、16 维局部二值纹理、8 维梯度方向，以及亮度、对比度、边缘与清晰度统计，共 40 维。', output:'每张照片对应一组 40 维描述。颜色与纹理权重可以在示范中调整。', trap:'不同成像条件会改变特征；中心裁切只能减轻背景干扰，不能保证完全排除非岩屑信息。' },
    { kicker:'STEP 03 / 近邻与投票', title:'寻找相似照片，再汇总候选。', copy:'按参考库尺度标准化特征，计算加权欧氏距离，找出最近的 k 张参考照片。按类别计票，票数相同时比较该类近邻平均距离。界面同时展示每个近邻的原图、标签与距离。', output:'一个岩性候选、三类票数，以及可检查的相似样本。投票占比不作校准概率。', trap:'近邻相似性只描述本特征空间，不能直接证明矿物组成或地质成因。' },
    { kicker:'STEP 04 / 复核与评价', title:'看见错误，才能知道方法的边界。', copy:'对 24 张分组留出图逐一分类，按原数据标签计算混淆矩阵、准确率与宏平均 F1。人工复核意见单独记录，与模型原始候选一起回到原始井深记录中。', output:'模型评价、逐样品证据与可导出的复核 CSV。缺失井段保留间隔，不插值生成连续剖面。', trap:'不要把人工修正后的结果混入模型分数，也不要把一个井上的小样本评价当作新井验证。' }
  ];

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

  function rockConcept(id) {
    var inside = '';
    if (id === 'sandstone') for (var y=0;y<4;y++) for (var x=0;x<5;x++) inside += '<circle cx="'+(15+x*19+(y%2)*6)+'" cy="'+(15+y*19)+'" r="7" fill="#d7ad73" stroke="#be915a" stroke-width="1"/>';
    if (id === 'shale') for (var i=0;i<6;i++) inside += '<path d="M9 '+(13+i*12)+'q24-6 46 0t48 0" stroke="#7e94a9" stroke-width="6" fill="none"/>';
    if (id === 'dolomite') for (var j=0;j<3;j++) for(var k=0;k<4;k++) inside += '<path d="m'+(13+k*25)+' '+(12+j*25)+' 15-5 7 15-15 5Z" fill="#a1b393" stroke="#7f9774" stroke-width="1"/>';
    return '<svg viewBox="0 0 118 90" role="img" aria-label="岩性概念示意，不表示照片中的定量矿物组成">'+inside+'</svg>';
  }
  function renderRockLesson(id) {
    var lessons={
      sandstone:{title:'颗粒之间的空间，为什么值得关注？',copy:'孔隙提供储存流体的空间，连通的通道影响流体能否通过。识别砂岩可为寻找和描述储集层提供岩性线索；但胶结、压实等作用会改变孔隙，不能把“砂岩”直接等同于“好储层”。',question:'有哪些孔隙与连通证据？还要结合岩心、测井或实验。',caption:'颗粒 → 孔隙 → 连通性问题'},
      shale:{title:'细粒与层理，让我们提出不同的地质问题。',copy:'页岩的细粒和层理是观察线索。相对不易透流的岩层可能参与封盖；岩层在油气系统中的实际作用，还需要厚度、裂缝、物性等证据。图像分类先提供描述线索，不能代替封盖或储集评价。',question:'层理、裂缝和物性是否支持后续解释？',caption:'细粒 / 层理 → 封盖与地层对比线索'},
      dolomite:{title:'看到晶体外观，还需要核验内部通道。',copy:'灰质白云岩属于本例的碳酸盐岩标签。晶间空间、溶蚀与裂缝可能影响储集和流动条件，外观相似的样品也可能具有不同物性。岩屑照片可辅助识别候选，矿物组成和孔渗仍需其他分析。',question:'是否存在晶间孔、溶孔或裂缝？证据来自哪里？',caption:'晶体 / 裂缝 → 进一步验证的线索'}
    };
    var lesson=lessons[id]||lessons.sandstone,shapes='',flow='M44 155C90 145 95 182 139 167S210 145 259 166S321 172 380 148';
    if(id==='sandstone')for(var y=0;y<4;y++)for(var x=0;x<8;x++){var cx=61+x*43+(y%2)*9,cy=96+y*35;shapes+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="15" ry="12" fill="#d4b384" stroke="#bd9868" stroke-width="1.2"/>';}
    if(id==='shale'){for(var n=0;n<8;n++)shapes+='<path d="M42 '+(88+n*17)+'q88-11 172 0t168 0" stroke="'+(n%2?'#a6b2ba':'#8297a7')+'" stroke-width="9" fill="none"/>';flow='M43 155C82 153 86 145 112 146';}
    if(id==='dolomite'){for(var j=0;j<4;j++)for(var k=0;k<7;k++)shapes+='<path d="m'+(49+k*48)+' '+(87+j*34)+' 24-9 15 21-24 9Z" fill="#b5c0a0" stroke="#91a27f" stroke-width="1.2"/>';shapes+='<path d="M58 212 148 167 201 175 279 112 380 90" fill="none" stroke="#f3edda" stroke-width="9"/>';flow='M58 212 148 167 201 175 279 112 380 90';}
    $('reservoir-diagram').innerHTML='<svg viewBox="0 0 500 335" aria-hidden="true"><path d="M40 75 100 42H445L385 75Z" fill="#f1e5cf"/><path d="M385 75 445 42V200L385 233Z" fill="#c7b797"/><path d="M40 75H385V233H40Z" fill="#e4dbc7"/><path d="M40 233H385L445 280H100Z" fill="#d6c3a2" opacity=".45"/>'+shapes+'<path class="concept-channel" d="'+flow+'"/><path class="concept-current" d="'+flow+'"/><text x="40" y="25">'+className(id)+' / 结构与通道概念图</text><text x="40" y="301">'+lesson.caption+'</text><text class="concept-note" x="40" y="324">示意结构，不对应样本实测孔渗；不表示已经发现油气。</text></svg>';
    $('rock-concept-title').textContent=lesson.title;$('rock-concept-copy').textContent=lesson.copy;$('rock-concept-question').textContent=lesson.question;
    Array.prototype.forEach.call(document.querySelectorAll('[data-rock]'),function(button){button.setAttribute('aria-pressed',String(button.dataset.rock===id));});
    reportHeight();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-rock]'),function(button){button.addEventListener('click',function(){renderRockLesson(button.dataset.rock);});});
  renderRockLesson('sandstone');
  var descriptions = {
    sandstone:{text:'沉积颗粒形成的碎屑岩。粒度与颗粒形态是观察线索，但照片不能直接给出孔隙度、渗透率。',concept:'颗粒结构示意'},
    shale:{text:'细粒沉积岩，层理或薄片状构造是常见观察要点。混样、风化和相近外观会影响图像判断。',concept:'细粒与层理示意'},
    dolomite:{text:'含方解石组分的白云岩类原标签。外观可提供线索，准确矿物组成需结合酸反应、显微或其他分析。',concept:'碳酸盐晶体示意'}
  };
  $('lithology-cards').innerHTML = classes.map(function (c) {
    var sample = DATA.samples.filter(function(s){return s.classId===c.id;})[0], d=descriptions[c.id];
    return '<article class="lithology-card" style="--lith-color:'+c.color+'"><div class="lithology-top"><h3>'+c.name+'</h3><span>'+DATA.samples.filter(function(s){return s.classId===c.id;}).length+' 张原图</span></div><div class="lithology-evidence"><img src="'+sample.image+'" alt="公开数据中标签为'+c.name+'的岩屑原图">'+rockConcept(c.id)+'</div><p>'+d.text+'</p><small>左：真实原图；右：'+d.concept+'。照片深度 '+sample.depth+' m，非矿物定量结果。</small></article>';
  }).join('');
  function splitMarkup() {
    return classes.map(function(c){var reference=DATA.samples.filter(function(s){return s.classId===c.id&&s.split==='reference';}).length;var test=DATA.samples.filter(function(s){return s.classId===c.id&&s.split==='test';}).length;
      return '<div class="split-row"><header><span>'+c.name+'</span><span>'+reference+' 参考 / '+test+' 测试</span></header><div class="split-track"><span class="reference" style="width:'+reference/(reference+test)*100+'%">'+reference+'</span><span class="test" style="width:'+test/(reference+test)*100+'%">'+test+'</span></div></div>';
    }).join('')+'<div class="split-legend"><span><i></i>参考库 42 张</span><span><i class="test"></i>测试集 24 张</span></div>';
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
          resolve({id:sample.id,classId:sample.classId,features:computed[sample.id].features});
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
    if (!ready || !byId[id] || byId[id].split!=='test') return;
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
    currentResult=MODEL.predict(currentFeatures,references,config(),scaler);
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
    evaluation=MODEL.evaluate(tests,references,ids,config(),scaler);
    $('evaluation-stats').innerHTML=[['留出样本',String(evaluation.count),'共 '+new Set(tests.map(function(s){return byId[s.id].group;})).size+' 个井深分组'],['准确率',pct(evaluation.accuracy),evaluation.hit+' / '+evaluation.count+' 张与原标签一致'],['宏平均 F1',evaluation.macroF1.toFixed(3),'三个类别等权平均'],['待优先复核',String(evaluation.predictions.filter(function(p){return p.result.share<threshold();}).length),'以当前 '+pct(threshold())+' 投票门槛统计']].map(function(x){return '<div class="evaluation-stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>';}).join('');
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
    var all=references.concat(tests),x0=45,y0=190,w=350,h=155;
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
    var html='<div class="depth-group"><div class="depth-row header"><b>井深 / m</b><span>原数据标签</span><span>模型原始候选</span><span>人工复核</span></div>';
    groups.forEach(function(p){if(p.gap){html+='<div class="depth-gap">⋮ 相邻展示样本间隔 '+p.gap+' m，未补造中间记录</div>';return;}var s=byId[p.id],r=reviews[p.id];html+='<div class="depth-row'+(p.id===currentId?' is-current':'')+'"><button type="button" data-pick="'+p.id+'">'+s.depth.toFixed(0)+'</button><span style="'+lithStyle(p.truth)+'">'+className(p.truth)+'</span><span style="'+lithStyle(p.result.classId)+'">'+className(p.result.classId)+'</span><span style="'+(r?lithStyle(r.classId):'')+'">'+(r?className(r.classId):'待复核')+'</span></div>';});
    $('depth-log').innerHTML=html+'</div>';
  }
  $('depth-log').addEventListener('click',function(event){var b=event.target.closest('[data-pick]');if(b)selectSample(b.dataset.pick);});
  function renderWorkflow() {
    var d=flowText[workflowStep];$('flow-kicker').textContent=d.kicker;$('flow-title').textContent=d.title;$('flow-copy').textContent=d.copy;$('flow-output').textContent=d.output;$('flow-trap').textContent=d.trap;$('flow-count').textContent=(workflowStep+1)+' / 4';
    Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(button){var active=Number(button.dataset.step)===workflowStep;button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));});
    var snapshot=$('flow-snapshot');
    if(workflowStep===0){
      var grouped={};DATA.samples.forEach(function(s){if(!grouped[s.group])grouped[s.group]=[];grouped[s.group].push(s);});
      var groupNames=Object.keys(grouped).sort(function(a,b){return Number(a.split('-').pop())-Number(b.split('-').pop());});
      if(!selectedDepthGroup)selectedDepthGroup=groupNames.filter(function(name){return grouped[name][0].split==='test';})[0];
      var selected=grouped[selectedDepthGroup],start=Number(selectedDepthGroup.split('-').pop());
      snapshot.innerHTML='<h4>点击一个真实 20 米分组，查看它被分到哪里</h4><div class="depth-group-picker">'+groupNames.map(function(name){var samples=grouped[name],begin=Number(name.split('-').pop());return '<button type="button" data-depth-group="'+name+'" class="'+samples[0].split+'" aria-pressed="'+String(name===selectedDepthGroup)+'"><b>'+begin+'—'+(begin+19)+' m</b><small>本例 '+samples.length+' 张</small></button>';}).join('')+'</div><div class="group-readout"><b>'+start+'—'+(start+19)+' m · '+(selected[0].split==='test'?'整个分组留作测试':'整个分组进入参考库')+'</b><p>'+classes.map(function(c){return c.name+' '+selected.filter(function(s){return s.classId===c.id;}).length+' 张';}).join(' / ')+'</p></div><p class="fine-print">17 组中 5 组用于测试；同组样本不跨两边。颜色表示集合，不是岩性。蓝灰：参考；橙色：测试。</p>';return;
    }
    if(!ready){snapshot.innerHTML='<p>正在准备实际样本与计算结果…</p>';return;}
    var sample=byId[currentId],f=computed[currentId].features;
    if(workflowStep===1){
      var labels=['原始照片','中心取样','灰度与纹理','40 维特征'];
      snapshot.innerHTML='<h4>'+sample.id+' / 从照片到 40 维特征</h4><div class="processing-stages">'+labels.map(function(label,index){return '<button type="button" data-image-stage="'+index+'" aria-pressed="'+String(index===imageStage)+'">'+(index+1)+'. '+label+'</button>';}).join('')+'</div><div class="processing-figure">'+(imageStage<2?'<div class="processing-photo"><img src="'+sample.image+'" alt="'+labels[imageStage]+'">'+(imageStage===1?'<span class="roi-outline"></span>':'')+'</div>':imageStage===3?'<div class="snapshot-vector">'+f.vector.map(function(v){return '<i style="height:'+Math.min(100,Math.max(3,v*100))+'%"></i>';}).join('')+'</div>':'')+'</div><p class="fine-print">'+['保留原图与来源信息，分类不读取井深或文件名。','统一取中心 72% 区域，再缩放为 96 × 96，减少边框与编号干扰。','灰度图由当前样本实际像素计算，用于观察局部纹理与边缘。','12 维颜色 + 16 维局部纹理 + 8 维梯度方向 + 4 个统计量；距离计算前按参考库尺度标准化。'][imageStage]+'</p>';
      if(imageStage===2){var canvas=document.createElement('canvas');canvas.width=cropSize;canvas.height=cropSize;canvas.className='processing-canvas';var context=canvas.getContext('2d'),pixels=context.createImageData(cropSize,cropSize);for(var g=0;g<f.gray.length;g++){pixels.data[g*4]=pixels.data[g*4+1]=pixels.data[g*4+2]=f.gray[g];pixels.data[g*4+3]=255;}context.putImageData(pixels,0,0);snapshot.querySelector('.processing-figure').appendChild(canvas);}
    }
    if(workflowStep===2){
      var contextKey=currentId+'|'+JSON.stringify(config())+'|'+exposure+'|'+contrast;
      if(contextKey!==voteContext){voteContext=contextKey;flowVoteCount=null;}
      var count=flowVoteCount===null?currentResult.k:Math.min(flowVoteCount,currentResult.k),partial={votes:{},k:currentResult.k};
      currentResult.neighbors.slice(0,count).forEach(function(n){partial.votes[n.classId]=(partial.votes[n.classId]||0)+1;});
      snapshot.innerHTML='<h4>'+(count===currentResult.k?'计票完成：'+className(currentResult.classId):'已计 '+count+' / '+currentResult.k+' 票，尚未完成')+'</h4><div class="snapshot-vote-gallery">'+currentResult.neighbors.map(function(n,i){return '<figure class="'+(i<count?'is-counted':'')+'" style="--lith-color:'+byClass[n.classId].color+'"><img src="'+byId[n.id].image+'" alt="近邻 '+(i+1)+'，'+className(n.classId)+'"><figcaption>#'+(i+1)+' '+className(n.classId)+'<small>距离 '+n.distance.toFixed(3)+'</small></figcaption></figure>';}).join('')+'</div><div class="snapshot-votes">'+voteMarkup(partial)+'</div><div class="vote-controls"><button type="button" data-flow-action="vote-reset" class="quiet-button">从零计票</button><button type="button" data-flow-action="vote-next" class="quiet-button" '+(count===currentResult.k?'disabled':'')+'>计入下一张近邻 →</button></div><p class="fine-print">每张近邻投一票。票数相同，比较该类近邻平均距离。这里展示实际近邻的标签与距离。</p>';
    }
    if(workflowStep===3){snapshot.innerHTML='<h4>24 张留出图 / 行为原标签，列为预测</h4><div class="flow-confusion">'+evaluation.matrix.map(function(row,i){return '<div><b>'+className(classes[i].id)+'</b>'+row.map(function(n,j){return '<span class="'+(i===j?'diagonal':'')+'" title="'+className(classes[i].id)+' → '+className(classes[j].id)+'">'+n+'</span>';}).join('')+'</div>';}).join('')+'</div><p class="fine-print">列顺序：细砂岩 / 页岩 / 灰质白云岩。非对角线是误判。</p><div class="evaluation-stats"><div class="evaluation-stat"><span>准确率</span><strong>'+pct(evaluation.accuracy)+'</strong><small>'+evaluation.hit+' / '+evaluation.count+' 张</small></div><div class="evaluation-stat"><span>宏平均 F1</span><strong>'+evaluation.macroF1.toFixed(3)+'</strong><small>三个类别等权</small></div></div><button type="button" data-flow-action="inspect-errors" class="quiet-button">在示范里检查一份误判样本 →</button><p class="fine-print">人工复核单独保留，不修饰模型分数。</p>';}
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(button){button.addEventListener('click',function(){workflowStep=Number(button.dataset.step);renderWorkflow();reportHeight();});});
  $('flow-prev').addEventListener('click',function(){workflowStep=(workflowStep+3)%4;renderWorkflow();reportHeight();});
  $('flow-next').addEventListener('click',function(){workflowStep=(workflowStep+1)%4;renderWorkflow();reportHeight();});
  $('flow-snapshot').addEventListener('click',function(event){
    var group=event.target.closest('[data-depth-group]');if(group){selectedDepthGroup=group.dataset.depthGroup;renderWorkflow();reportHeight();return;}
    var stage=event.target.closest('[data-image-stage]');if(stage){imageStage=Number(stage.dataset.imageStage);renderWorkflow();reportHeight();return;}
    var action=event.target.closest('[data-flow-action]');if(!action||!ready)return;
    if(action.dataset.flowAction==='vote-reset')flowVoteCount=0;
    if(action.dataset.flowAction==='vote-next')flowVoteCount=Math.min(currentResult.k,(flowVoteCount===null?currentResult.k:flowVoteCount)+1);
    if(action.dataset.flowAction==='inspect-errors'){var wrong=evaluation.predictions.filter(function(p){return p.truth!==p.result.classId;})[0];$('exposure').value='0';$('contrast').value='100';exposure=0;contrast=1;$('exposure-value').textContent='0';$('contrast-value').textContent='1.0×';setView('demo',true);if(wrong){selectSample(wrong.id);renderMatrixSelection(wrong.truth,wrong.result.classId);}return;}
    renderWorkflow();reportHeight();
  });

  $('sample-select').addEventListener('change',function(){selectSample(this.value);});
  $('k-select').addEventListener('change',function(){drawQuery();updateEvaluation();});
  $('color-weight').addEventListener('input',function(){var n=Number(this.value);$('weight-value').textContent=n+' / '+(100-n);drawQuery();updateEvaluation();});
  $('review-threshold').addEventListener('input',function(){$('threshold-value').textContent=this.value+'%';drawQuery();updateEvaluation();});
  function updateDisturbance(){exposure=Number($('exposure').value);contrast=Number($('contrast').value)/100;$('exposure-value').textContent=String(exposure);$('contrast-value').textContent=contrast.toFixed(1)+'×';drawQuery();}
  $('exposure').addEventListener('input',updateDisturbance);$('contrast').addEventListener('input',updateDisturbance);
  $('reset-image').addEventListener('click',function(){$('exposure').value='0';$('contrast').value='100';updateDisturbance();});
  $('reset-parameters').addEventListener('click',function(){$('k-select').value='5';$('color-weight').value='50';$('weight-value').textContent='50 / 50';$('exposure').value='0';$('contrast').value='100';$('review-threshold').value='70';$('threshold-value').textContent='70%';updateDisturbance();updateEvaluation();});
  $('reveal-label').addEventListener('click',function(){if(!ready)return;revealed=!revealed;$('original-label').hidden=!revealed;this.textContent=revealed?'隐藏原数据标签':'显示原数据标签';$('original-label').textContent='原数据标签：'+className(byId[currentId].classId)+'。仅用于对照，不作为分类输入。';reportHeight();});
  $('save-review').addEventListener('click',function(){
    if(!ready||!currentResult)return;
    reviews[currentId]={classId:$('review-class').value,time:new Date().toISOString(),modelAtReview:currentResult.classId,k:config().k,colorWeight:config().colorWeight,exposure:exposure,contrast:contrast};
    $('review-status').textContent='已复核为 '+className(reviews[currentId].classId)+' · 共 '+Object.keys(reviews).length+' 条人工记录。请导出 CSV 保存。';renderDepth();reportHeight();
  });
  function csvCell(value){return '"'+String(value==null?'':value).replace(/"/g,'""')+'"';}
  $('export-csv').addEventListener('click',function(){
    if(!ready||!evaluation)return;
    var columns=['sample_id','well','source_depth_m','group_20m','source_label','model_prediction_original_conditions','vote_share_not_probability','review_label','model_candidate_at_review','review_k','review_color_weight','review_exposure','review_contrast','review_time','current_k','current_color_weight','source_commit','image_sha256'];
    var lines=[columns];evaluation.predictions.forEach(function(p){var s=byId[p.id],r=reviews[p.id];lines.push([s.id,s.well,s.depth,s.group,className(s.classId),className(p.result.classId),p.result.share,r?className(r.classId):'',r?className(r.modelAtReview):'',r?r.k:'',r?r.colorWeight:'',r?r.exposure:'',r?r.contrast:'',r?r.time:'',config().k,config().colorWeight,DATA.source.commit,s.sha256]);});
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
  var demoControls=['sample-select','k-select','color-weight','exposure','contrast','review-threshold','save-review','export-csv'];
  demoControls.forEach(function(id){$(id).disabled=true;});
  Promise.all(DATA.samples.map(imageFeatures)).then(function(results){
    references=results.filter(function(s){return byId[s.id].split==='reference';});tests=results.filter(function(s){return byId[s.id].split==='test';});scaler=MODEL.fit(references);ready=true;currentId=tests[0].id;
    $('sample-select').innerHTML=tests.map(function(s){return '<option value="'+s.id+'">'+s.id+' · '+byId[s.id].depth+' m</option>';}).join('');
    demoControls.forEach(function(id){$(id).disabled=false;});
    $('loading-status').textContent='已就绪 · 66 张原图完成特征计算 · 42 张参考 / 24 张测试 · 所有结果由当前浏览器实时计算';
    updateEvaluation();selectSample(currentId);renderWorkflow();reportHeight();
  }).catch(function(error){$('loading-status').classList.add('is-error');$('loading-status').textContent='样本初始化失败：'+error.message+'。请确认案例包完整，并刷新页面。';reportHeight();});
  if(window.ResizeObserver)new window.ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener('load',reportHeight);window.addEventListener('resize',reportHeight);
}());
