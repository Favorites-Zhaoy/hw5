(function () {
  'use strict';
  var steps = [
    { kicker: '专业背景 / 岩屑从哪里来？', title: '小小岩屑，是井底带回来的地质线索。', copy: '钻头破碎岩石，产生的碎屑随钻井液沿环空返回地面。现场人员收集岩屑，观察颜色、颗粒和结构，帮助判断钻遇的岩层。岩屑返回需要时间，因此地面取样时的钻头深度并不直接等于岩屑来源深度。', concepts: ['钻头破岩', '钻井液返出', '迟到时间'], question: '这份样品来自哪里？', output: '保留样品编号、采集时间和井段信息，让后续识别结果能追溯到原始样品。', accent: '#dd702b', tint: '#f9e7d0' },
    { kicker: '案例流程 / 先把样品看清楚', title: '同样的岩屑，要在一致的条件下观察。', copy: '清洗能减少钻井液残留，分散铺样有助于观察颗粒。拍摄时保持尺度、光照和背景一致，避免模型只学会区分照片的拍摄条件。白光照片和扫描电镜图像具有不同的信息，应分别设计预处理与特征。', concepts: ['样品清洗', '统一成像', '记录尺度'], question: '比较的是岩石，还是光线？', output: '输出带样品编号与成像条件的图像。模糊、遮挡和污染严重的图像先进入质量检查。', accent: '#3989b5', tint: '#dfeef3' },
    { kicker: '智能化方法 / 计算机视觉', title: '让机器找相似，把判断依据展示出来。', copy: '初版识别方案拟从可解释的图像特征与近邻比较入手：白光图像可比较颜色和纹理，扫描电镜图像主要考虑灰度与纹理。界面将同时展示待识别图像、相似参考样本和候选类别，方便理解结果从何而来。', concepts: ['图像特征', '近邻比较', '候选岩性'], question: '为什么给出这个候选？', output: '此处先演示识别环节的位置，尚未运行分类模型。接入公开数据后再确定类别与评价指标。', accent: '#8870b5', tint: '#ebe3f4' },
    { kicker: '结果解读 / 人工复核', title: '识别结果，要放回真实的地质情境。', copy: '岩性候选需要与原始样品、取样记录和其他地质证据一起复核。外观相似、混合样品与井壁掉块都可能影响判断。保留候选、复核意见与修改记录，才能形成可追溯的岩性记录。', concepts: ['复核候选', '追溯样品', '结合地质证据'], question: '这条记录能被复查吗？', output: '有可靠深度元数据时再绘制深度剖面；缺少深度时只展示样品序列，不人为补造井深。', accent: '#57895f', tint: '#e5eddb' }
  ];
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-step]'));
  var detail = document.getElementById('step-detail');
  var play = document.getElementById('play');
  var motion = document.getElementById('motion');
  var flow = document.querySelector('.flow');
  var current = 0, timer = null, paused = false;
  function text(id, value) { document.getElementById(id).textContent = value; }
  function select(index) {
    current = (index + steps.length) % steps.length;
    var step = steps[current];
    buttons.forEach(function (button, i) {
      button.classList.toggle('is-selected', i === current);
      button.setAttribute('aria-pressed', String(i === current));
    });
    detail.style.setProperty('--accent', step.accent);
    detail.style.setProperty('--tint', step.tint);
    text('detail-number', '0' + (current + 1));
    text('detail-kicker', step.kicker); text('detail-title', step.title);
    text('detail-copy', step.copy); text('detail-question', step.question);
    text('detail-output', step.output); text('step-count', (current + 1) + ' / 4');
    var concepts = document.getElementById('concepts');
    concepts.textContent = '';
    step.concepts.forEach(function (label) { var span = document.createElement('span'); span.textContent = label; concepts.appendChild(span); });
    reportHeight();
  }
  function stop() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    play.setAttribute('aria-pressed', 'false');
    play.querySelector('span').textContent = '自动讲解';
  }
  buttons.forEach(function (button, index) { button.addEventListener('click', function () { stop(); select(index); }); });
  document.getElementById('prev').addEventListener('click', function () { stop(); select(current - 1); });
  document.getElementById('next').addEventListener('click', function () { stop(); select(current + 1); });
  play.addEventListener('click', function () {
    if (timer !== null) { stop(); return; }
    play.setAttribute('aria-pressed', 'true');
    play.querySelector('span').textContent = '停止讲解';
    timer = window.setInterval(function () { select(current + 1); }, 6500);
  });
  motion.addEventListener('click', function () {
    paused = !paused;
    applyMotion();
    if (paused) stop();
  });
  function applyMotion() {
    document.body.classList.toggle('is-paused', paused);
    motion.setAttribute('aria-pressed', String(paused));
    motion.textContent = paused ? '继续动效' : '暂停动效';
    if (flow && flow.pauseAnimations && flow.unpauseAnimations) {
      if (paused) flow.pauseAnimations(); else flow.unpauseAnimations();
    }
  }
  var preference = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference && preference.matches) { paused = true; applyMotion(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  function reportHeight() {
    if (window.parent !== window) window.parent.postMessage({ __m1Height: Math.ceil(document.body.getBoundingClientRect().height) }, '*');
  }
  if (window.ResizeObserver) new window.ResizeObserver(reportHeight).observe(document.body);
  window.addEventListener('load', reportHeight);
  window.addEventListener('resize', reportHeight);
  select(0);
}());
