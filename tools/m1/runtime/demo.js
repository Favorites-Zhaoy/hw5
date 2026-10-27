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
  var flowText = [{"name":"建立参考库","role":"数据","title":"先确定机器可以参考哪些已知样品。","input":"66 张原始照片、三类岩性标签、井号与源井深。","process":"按 20 m 井段组成 17 组，固定划分为 42 张参考图与 24 张测试图。同组照片不跨集合；标签随参考照片保存，测试标签只用于评价。","why":"相邻样品和拍摄批次可能相似。整组留出能减轻相邻图像泄漏，但仍不能证明跨井泛化。","output":"一个带标签的参考库、一个留出测试集，以及可核对的分组记录。","trap":"20 m 是本例的分组宽度，不是原数据的取样间距。选样与划分不使用模型分数。"},{"name":"统一图像","role":"CV","title":"让照片进入相同的取样与像素坐标。","input":"同一张待识别原图；参考照片也执行完全相同的处理。","process":"取图像中心宽、高各 72% 的区域，再缩放为 96 × 96 像素。原图保持不变，后续特征只从这个处理结果计算。","why":"减轻样品盘边框与编号的干扰，统一计算量与邻域大小。固定裁切也可能遗漏边缘岩屑，不能保证完全排除背景。","output":"96 × 96 的 RGB 像素，共 9,216 个像素位置。","trap":"照片中的岩屑块径不等于原岩粒度；像素缩放也不提供物理比例尺。"},{"name":"提取颜色","role":"CV","title":"把综合色调，变成可以核对的分布。","input":"96 × 96 图像的 R、G、B 三个通道。","process":"每个通道按 0–63、64–127、128–191、192–255 分成 4 桶，统计像素数并除以 9,216。三个通道得到 12 个比例。","why":"直方图描述颜色分布，不要求每块岩屑出现在相同位置。它也会受到照明、干湿与背景的影响。","output":"12 维颜色特征；每个通道的 4 桶比例之和为 1。","trap":"RGB 颜色不能直接给出矿物组成、含油量或岩性的物理鉴定结果。"},{"name":"提取纹理","role":"CV","title":"观察局部明暗怎样变化，再汇总成特征。","input":"RGB 分支保留 12 维颜色；另由 0.299R + 0.587G + 0.114B 计算灰度分支。","process":"以每个内部像素为中心比较 8 邻域，编码后合并为 16 桶局部纹理；按梯度幅值汇总 8 个方向，再附加 4 个统计量。与颜色拼接成 40 维。","why":"局部纹理和灰度变化补充颜色描述。它们是图像外观特征，需要通过带标签样本验证分类价值。","output":"12 维颜色 + 16 维局部纹理 + 8 维梯度 + 4 个统计量 = 40 维。","trap":"本例局部纹理用 code >> 4 合并编码；梯度采用中心差分。它们不等于直接测量层理、裂缝或晶体。"},{"name":"计算距离","role":"ML","title":"先统一特征尺度，再比较哪张参考图更近。","input":"待识别图的 40 维向量，以及 42 张参考图的向量。","process":"仅从参考库计算每维标准差，差值除以 max(标准差, 0.01)。前 12 维与后 28 维分别平均平方差，再按权重加和、开方，得到加权欧氏距离。","why":"避免数值尺度或维数较多的一组特征主导距离。尺度只来自参考库，测试图不参与拟合。","output":"42 个真实距离及排序；可检查每一维和两个特征组的贡献。","trap":"权重中的“纹理”组包含局部纹理、梯度与统计量。距离越近仅表示本特征空间更相似。"},{"name":"近邻投票","role":"ML","title":"从排序中取前 k 张，逐票形成岩性候选。","input":"按距离从小到大排列的参考照片，以及它们已有的岩性标签。","process":"取最近的 k 张，每张投 1 票。多数票类别成为候选；票数相同则比较该类近邻的平均距离，再相同按类别 ID 排序。","why":"同一张照片的候选可以追溯到具体参考图。调整 k 和特征权重，能够观察判断对参数的敏感性。","output":"一个岩性候选、各类票数、近邻原图与距离。","trap":"票数占比不是校准概率。高票也可能来自参考库共同的成像偏差。"},{"name":"验证与交付","role":"评价 / 地质","title":"批量检验方法，逐份复核候选。","input":"24 张测试图的原标签与模型预测；当前样品的近邻证据。","process":"批量评价统计混淆矩阵、准确率和宏平均 F1；单样品复核独立保存人工意见。最终按源井深记录输出模型候选与复核 CSV。","why":"模型评价回答“这套方法表现怎样”，人工复核回答“这一份样品如何处理”。两类记录分别保留。","output":"可查的误判、模型评价与人工记录；缺失井段不插值。","trap":"人工修改不计入模型分数。单井、小样本的留出结果不能推断新井效果。"}];

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
    var sample = DATA.samples.filter(function(s){return s.classId===c.id;})[0], d=descriptions[c.id];
    return '<article class="lithology-card" style="--lith-color:'+c.color+'"><div class="lithology-top"><h3>'+c.name+'</h3><span>'+DATA.samples.filter(function(s){return s.classId===c.id;}).length+' 张原图</span></div><div class="lithology-evidence"><img src="'+sample.image+'" alt="公开数据中标签为'+c.name+'的岩屑原图"></div><p>'+d.text+'</p><small>本例真实原图 · 深度 '+sample.depth+' m · 沿用原始数据标签，非矿物定量结果。</small></article>';
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
    var groups=[[0,12,'颜色 / 12','#c18d6c'],[12,28,'局部纹理 / 16','#98ac82'],[28,36,'梯度 / 8','#81a7b5'],[36,40,'统计量 / 4','#aa97bb']];
    return '<div class="technical-vector">'+groups.map(function(g){return '<div><strong>'+g[2]+'</strong><div class="technical-vector-bars">'+features.vector.slice(g[0],g[1]).map(function(v,j){return '<i style="--feature-color:'+g[3]+';height:'+Math.max(2,v*100)+'%" title="维度 '+(g[0]+j+1)+' = '+v.toFixed(4)+'"></i>';}).join('')+'</div></div>';}).join('')+'</div>';
  }
  function flowFeatureName(i) {
    return i<12?['R','G','B'][Math.floor(i/4)]+' 桶 '+(i%4):i<28?'局部纹理桶 '+(i-12):i<36?'梯度方向 '+(i-28):['平均亮度','灰度对比度','边缘比例','清晰度'][i-36];
  }
  function renderWorkflow() {
    var d=flowText[workflowStep];$('flow-kicker').textContent='STEP 0'+(workflowStep+1)+' / '+d.role;
    $('flow-title').textContent=d.title;$('flow-input').textContent=d.input;$('flow-copy').textContent=d.process;
    $('flow-why').textContent=d.why;$('flow-output').textContent=d.output;$('flow-trap').textContent=d.trap;$('flow-count').textContent=(workflowStep+1)+' / '+flowText.length;
    Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(button){var n=Number(button.dataset.step),active=n===workflowStep;button.classList.toggle('is-selected',active);button.classList.toggle('is-complete',n<workflowStep);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-current',active?'step':'false');});
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
      snapshot.innerHTML='<h4>标签留在参考库，测试标签留待评价。</h4><div class="technical-pools"><div><b>42 张</b><span>参考库：照片 + 原标签<br>建立特征库与标准差尺度</span></div><div><b>24 张</b><span>留出集：照片进入识别<br>原标签仅用于最后的对照评价</span></div></div><h5>点击真实井段，检查分组去向</h5><div class="depth-group-picker">'+groupNames.map(function(name){var samples=grouped[name],begin=Number(name.split('-').pop());return '<button type="button" data-depth-group="'+name+'" class="'+samples[0].split+'" aria-pressed="'+String(name===selectedDepthGroup)+'"><b>'+begin+'—'+(begin+19)+' m</b><small>'+samples.length+' 张 / '+(samples[0].split==='test'?'测试':'参考')+'</small></button>';}).join('')+'</div><div class="group-readout"><b>'+start+'—'+(start+19)+' m · '+(selected[0].split==='test'?'整组留作测试':'整组进入参考库')+'</b><p>'+classes.map(function(c){return c.name+' '+selected.filter(function(s){return s.classId===c.id;}).length+' 张';}).join(' / ')+'</p></div><p class="fine-print">17 组中 5 组用于测试。同组不跨集合；蓝灰表示参考，橙色表示测试，不表示岩性。</p>';return;
    }
    if(!ready){snapshot.innerHTML='<p>正在准备实际样本与计算结果，请稍候…</p>';return;}
    var sample=byId[currentId],f=computed[currentId].features;
    var result=MODEL.predict(f,references,config(),scaler);
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
      var at=flowPixelY*cropSize+flowPixelX,center=f.gray[at],offsets=[-cropSize-1,-cropSize,-cropSize+1,1,cropSize+1,cropSize,cropSize-1,-1],code=0;
      offsets.forEach(function(off,bit){if(f.gray[at+off]>=center)code|=1<<bit;});
      var dx=f.gray[at+1]-f.gray[at-1],dy=f.gray[at+cropSize]-f.gray[at-cropSize],angle=Math.atan2(dy,dx),direction=Math.min(7,Math.floor((angle+Math.PI)/(2*Math.PI)*8));
      var cells=[-cropSize-1,-cropSize,-cropSize+1,-1,0,1,cropSize-1,cropSize,cropSize+1];
      snapshot.innerHTML='<h4>从一个真实 3 × 3 邻域开始理解纹理。</h4><div class="technical-branches"><div><b>RGB 分支 → 12 维</b>保留颜色直方图，继续参与最终向量。</div><div><b>灰度分支 → 28 维</b>局部纹理 16 + 梯度 8 + 统计量 4。</div></div><div class="technical-image-row"><div class="flow-gray-canvas"><span class="technical-pixel-marker" style="left:'+((flowPixelX+.5)/cropSize*100)+'%;top:'+((flowPixelY+.5)/cropSize*100)+'%" aria-hidden="true"></span></div><div><div class="technical-pixel-controls"><label>横坐标 x = '+flowPixelX+'<input type="range" min="1" max="94" value="'+flowPixelX+'" data-flow-pixel="x" aria-label="选择邻域横坐标"></label><label>纵坐标 y = '+flowPixelY+'<input type="range" min="1" max="94" value="'+flowPixelY+'" data-flow-pixel="y" aria-label="选择邻域纵坐标"></label></div><div class="technical-neighborhood">'+cells.map(function(off){return '<span class="'+(off===0?'center':'')+'">'+f.gray[at+off].toFixed(1)+'<small>'+(off===0?'中心':f.gray[at+off]>=center?'≥ 中心 → 1':'< 中心 → 0')+'</small></span>';}).join('')+'</div></div></div><div class="technical-formula">从左上开始顺时针对应 bit 0…7；二进制按 bit 7…0 显示：<br>'+('00000000'+code.toString(2)).slice(-8)+' → '+code+' → code >> 4 = 桶 '+(code>>4)+'<br>Gx = '+dx.toFixed(2)+'，Gy = '+dy.toFixed(2)+'；幅值 '+Math.sqrt(dx*dx+dy*dy).toFixed(2)+' → 方向桶 '+direction+'</div><p class="fine-print">滑杆松开后更新邻域；坐标从 0 开始。编码比较使用完整精度，格内灰度保留一位小数。8,836 个内部像素汇总为局部纹理直方图；梯度方向按幅值加权汇总。</p><h5>最终向量：四组拼接成 40 维</h5>'+flowVector(f)+'<p class="fine-print">4 个统计量依次为平均亮度、灰度对比度、边缘像素比例、清晰度变换。梯度采用中心差分；本例合并编码不具备旋转不变性。</p>';
      flowCanvas('.flow-gray-canvas','gray');
    }
    if(workflowStep===4){
      var ranked=MODEL.predict(f,references,{k:references.length,colorWeight:config().colorWeight},scaler).neighbors;
      if(!flowReferenceId||!references.some(function(r){return r.id===flowReferenceId;}))flowReferenceId=ranked[0].id;
      var ref=references.filter(function(r){return r.id===flowReferenceId;})[0],explain=MODEL.explainDistance(f.vector,ref.features.vector,config().colorWeight,scaler),total=explain.colorPart+explain.otherPart;
      snapshot.innerHTML='<h4>比较全部 42 张参考图，再看距离从哪里来。</h4><div class="technical-table-scroll"><table class="technical-table"><thead><tr><th>距离排序 / 点击参考图</th><th>原标签</th><th>距离</th></tr></thead><tbody>'+ranked.map(function(n,i){return '<tr class="'+(n.id===flowReferenceId?'is-current':'')+'"><td><button type="button" data-reference-id="'+n.id+'">#'+(i+1)+' '+n.id+'</button></td><td>'+className(n.classId)+'</td><td>'+n.distance.toFixed(4)+'</td></tr>';}).join('')+'</tbody></table></div><div class="technical-comparison"><img src="'+byId[ref.id].image+'" alt="被比较的真实参考图 '+ref.id+'"><span>'+ref.id+' · '+className(ref.classId)+'<br>与上方待识别图的距离：'+explain.distance.toFixed(4)+'</span></div><div class="technical-formula">δᵢ = (查询值 − 参考值) / max(σ参考库,i, 0.01)<br>C = 前 12 维 δ² 的平均；T = 后 28 维 δ² 的平均<br>d = √[w × C + (1 − w) × T]<br>= √['+explain.colorPart.toFixed(4)+' + '+explain.otherPart.toFixed(4)+'] = '+explain.distance.toFixed(4)+'</div><div class="technical-distance-bars" aria-label="颜色与其余特征对平方距离的贡献"><span style="width:'+(total?explain.colorPart/total*100:0)+'%;background:#c59673"></span><span style="width:'+(total?explain.otherPart/total*100:0)+'%;background:#91a8a6"></span></div><p class="fine-print">棕色：颜色贡献；蓝灰：其余 28 维贡献。条长展示 d² 的组成；最终距离还要开方。权重 w = '+config().colorWeight.toFixed(1)+'。</p><details><summary>展开核对全部 40 维数值与尺度</summary><div class="technical-table-scroll"><table class="technical-table"><thead><tr><th>维度</th><th>查询值</th><th>参考值</th><th>尺度</th><th>δ</th></tr></thead><tbody>'+explain.rows.map(function(r){return '<tr><td>'+flowFeatureName(r.index)+'</td><td>'+r.query.toFixed(4)+'</td><td>'+r.reference.toFixed(4)+'</td><td>'+r.scale.toFixed(4)+'</td><td>'+r.delta.toFixed(4)+'</td></tr>';}).join('')+'</tbody></table></div></details><p class="fine-print">尺度仅由 42 张参考图拟合；待识别图及其他测试图均不参与。改变上方权重，会重新计算距离与排序。</p>';
    }
    if(workflowStep===5){
      var contextKey=currentId+'|'+JSON.stringify(config());if(contextKey!==voteContext){voteContext=contextKey;flowVoteCount=0;}
      var count=Math.min(flowVoteCount,result.k),partial={votes:{},k:result.k};result.neighbors.slice(0,count).forEach(function(n){partial.votes[n.classId]=(partial.votes[n.classId]||0)+1;});
      snapshot.innerHTML='<h4>'+(count===result.k?'计票完成：'+className(result.classId):'已计 '+count+' / '+result.k+' 票，尚未完成')+'</h4><div class="snapshot-vote-gallery">'+result.neighbors.map(function(n,i){return '<figure class="'+(i<count?'is-counted':'')+'" style="--lith-color:'+byClass[n.classId].color+'"><img src="'+byId[n.id].image+'" alt="近邻 '+(i+1)+'，'+className(n.classId)+'"><figcaption>#'+(i+1)+' '+className(n.classId)+'<small>'+n.id+'<br>距离 '+n.distance.toFixed(4)+'</small></figcaption></figure>';}).join('')+'</div><div class="snapshot-votes">'+voteMarkup(partial)+'</div><div class="vote-controls"><button type="button" data-flow-action="vote-reset" class="quiet-button">从零计票</button><button type="button" data-flow-action="vote-next" class="quiet-button" '+(count===result.k?'disabled':'')+'>计入下一张 →</button><button type="button" data-flow-action="vote-all" class="quiet-button">查看完整投票</button></div><div class="technical-readout">'+(count===result.k?'最高票 '+result.votes[result.classId]+' / '+result.k+'，占比 '+pct(result.share)+'。这一比例不作校准概率。':'按距离顺序逐张计入原标签，完成全部 '+result.k+' 票后才输出候选。')+'</div><p class="fine-print">每张图一票。平票时比较该类近邻平均距离；仍相同时按类别 ID 排序。上方 k 与权重改变时，重新开始计票。</p>';
    }
    if(workflowStep===6){
      var reviewed=reviews[currentId];
      snapshot.innerHTML='<h4>两个出口：评价方法 / 复核样品</h4><div class="technical-exits"><section><h5>A · 批量评价 / 24 张测试图</h5><table class="matrix" aria-label="留出测试混淆矩阵，行是原标签，列是预测"><thead><tr><th>原标签 ↓<br>预测 →</th>'+classes.map(function(c){return '<th>'+c.name+'</th>';}).join('')+'</tr></thead><tbody>'+evaluation.matrix.map(function(row,i){return '<tr><th>'+classes[i].name+'</th>'+row.map(function(n,j){return '<td style="background:'+(i===j?'#d7e3dc':'#f1dfcb')+'">'+n+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table><div class="evaluation-stats"><div class="evaluation-stat"><span>准确率</span><strong>'+pct(evaluation.accuracy)+'</strong><small>'+evaluation.hit+' / '+evaluation.count+'</small></div><div class="evaluation-stat"><span>宏平均 F1</span><strong>'+evaluation.macroF1.toFixed(3)+'</strong><small>三个类别等权</small></div></div><p>对角线为与原标签一致，非对角线为误判。单井留出实验不能代表跨井表现。</p><details><summary>准确率与宏平均 F1 怎样算？</summary><p>准确率 = 对角线之和 / 24。逐类精确率 P = TP / 预测该类数量；召回率 R = TP / 原标签该类数量；F1 = 2PR / (P + R)，分母为零时取 0。宏平均 F1 为三类 F1 的平均。</p></details><button type="button" data-flow-action="inspect-errors" class="quiet-button">跟踪一份误判 → 回到距离计算</button></section><section><h5>B · 单样品复核 / '+sample.id+'</h5><div class="technical-record">模型候选：'+className(result.classId)+'<br>最高票：'+result.votes[result.classId]+' / '+result.k+'<br>人工意见：'+(reviewed?className(reviewed.classId):'待复核')+'<br>源井深：'+sample.depth+' m</div><p>回看第 5、6 步的真实近邻与距离，再确认或修改。保存人工意见不改变模型原始输出和左侧分数。</p><label class="mini-label">人工复核岩性<select data-flow-review aria-label="当前样品的人工复核岩性">'+classes.map(function(c){return '<option value="'+c.id+'" '+((reviewed?reviewed.classId:result.classId)===c.id?'selected':'')+'>'+c.name+'</option>';}).join('')+'</select></label><button type="button" data-flow-action="review-save" class="primary-button">保存本次复核</button><p role="status">'+(reviewed?'已保存本次会话意见。请导出 CSV 留存。':'意见保存在本次页面会话中。')+'</p><button type="button" data-flow-action="export" class="quiet-button">导出预测与复核 CSV ↓</button><p>CSV 分别保存原标签、原始成像条件下的候选、人工意见及源井深。缺失井段不补造连续地层。</p></section></div>';
    }
  }
  function changeWorkflowStep(next,focus){workflowStep=(next+flowText.length)%flowText.length;renderWorkflow();if(focus){var buttons=document.querySelectorAll('[data-step]');if(buttons[workflowStep])buttons[workflowStep].focus();}reportHeight();}
  Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(button){button.addEventListener('click',function(){changeWorkflowStep(Number(button.dataset.step),false);});button.addEventListener('keydown',function(event){var next=Number(button.dataset.step);if(event.key==='ArrowRight')next++;else if(event.key==='ArrowLeft')next--;else if(event.key==='Home')next=0;else if(event.key==='End')next=flowText.length-1;else return;event.preventDefault();changeWorkflowStep(next,true);});});
  $('flow-prev').addEventListener('click',function(){changeWorkflowStep(workflowStep-1,false);});
  $('flow-next').addEventListener('click',function(){changeWorkflowStep(workflowStep+1,false);});
  $('flow-sample-select').addEventListener('change',function(){selectSample(this.value);renderWorkflow();reportHeight();});
  $('flow-k-select').addEventListener('change',function(){$('k-select').value=this.value;drawQuery();updateEvaluation();renderWorkflow();reportHeight();});
  $('flow-color-weight').addEventListener('input',function(){$('color-weight').value=this.value;$('weight-value').textContent=this.value+' / '+(100-Number(this.value));drawQuery();updateEvaluation();renderWorkflow();reportHeight();});
  $('flow-snapshot').addEventListener('change',function(event){var pixel=event.target.closest('[data-flow-pixel]');if(!pixel)return;var value=Math.max(1,Math.min(94,Number(pixel.value)||1));if(pixel.dataset.flowPixel==='x')flowPixelX=value;else flowPixelY=value;renderWorkflow();reportHeight();});
  $('flow-snapshot').addEventListener('click',function(event){
    var group=event.target.closest('[data-depth-group]');if(group){selectedDepthGroup=group.dataset.depthGroup;renderWorkflow();reportHeight();return;}
    var stage=event.target.closest('[data-image-stage]');if(stage){imageStage=Math.max(0,Math.min(2,Number(stage.dataset.imageStage)));renderWorkflow();reportHeight();return;}
    var bin=event.target.closest('[data-color-bin]');if(bin){flowColorBin=Math.max(0,Math.min(11,Number(bin.dataset.colorBin)));renderWorkflow();reportHeight();return;}
    var ref=event.target.closest('[data-reference-id]');if(ref){if(references.some(function(r){return r.id===ref.dataset.referenceId;}))flowReferenceId=ref.dataset.referenceId;renderWorkflow();reportHeight();return;}
    var action=event.target.closest('[data-flow-action]');if(!action||!ready)return;
    var result=MODEL.predict(computed[currentId].features,references,config(),scaler);
    if(action.dataset.flowAction==='vote-reset')flowVoteCount=0;
    if(action.dataset.flowAction==='vote-next')flowVoteCount=Math.min(result.k,flowVoteCount+1);
    if(action.dataset.flowAction==='vote-all')flowVoteCount=result.k;
    if(action.dataset.flowAction==='review-save'){var value=$('flow-snapshot').querySelector('[data-flow-review]').value;if(ids.indexOf(value)>=0){reviews[currentId]={classId:value,time:new Date().toISOString(),modelAtReview:result.classId,k:config().k,colorWeight:config().colorWeight,exposure:0,contrast:1};renderDepth();}}
    if(action.dataset.flowAction==='export')$('export-csv').click();
    if(action.dataset.flowAction==='inspect-errors'){var wrong=evaluation.predictions.filter(function(p){return p.truth!==p.result.classId;})[0];if(wrong){selectSample(wrong.id);flowReferenceId=null;changeWorkflowStep(4,false);}else{$('flow-status').textContent='当前参数下没有与原标签不一致的测试样本。';}return;}
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
  var demoControls=['sample-select','k-select','color-weight','exposure','contrast','review-threshold','save-review','export-csv','flow-sample-select','flow-k-select','flow-color-weight'];
  demoControls.forEach(function(id){$(id).disabled=true;});
  Promise.all(DATA.samples.map(imageFeatures)).then(function(results){
    references=results.filter(function(s){return byId[s.id].split==='reference';});tests=results.filter(function(s){return byId[s.id].split==='test';});scaler=MODEL.fit(references);ready=true;currentId=tests[0].id;
    $('sample-select').innerHTML=tests.map(function(s){return '<option value="'+s.id+'">'+s.id+' · '+byId[s.id].depth+' m</option>';}).join('');
    $('flow-sample-select').innerHTML=$('sample-select').innerHTML;
    demoControls.forEach(function(id){$(id).disabled=false;});
    $('flow-status').textContent='已就绪 · 本页各步沿用同一张样品的原始成像条件；k 与权重变化会实时重算。';
    $('loading-status').textContent='已就绪 · 66 张原图完成特征计算 · 42 张参考 / 24 张测试 · 所有结果由当前浏览器实时计算';
    updateEvaluation();selectSample(currentId);renderWorkflow();reportHeight();
  }).catch(function(error){$('loading-status').classList.add('is-error');$('loading-status').textContent='样本初始化失败：'+error.message+'。请确认案例包完整，并刷新页面。';$('flow-status').textContent='样本初始化失败：'+error.message+'。请确认案例包完整并刷新。';reportHeight();});
  if(window.ResizeObserver)new window.ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener('load',reportHeight);window.addEventListener('resize',reportHeight);
}());
