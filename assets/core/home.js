/* Homepage explorer. Uses the existing scene data and case registry; no new case format. */
(function (global) {
  'use strict';
  var A, C, K;
  var methodKey = '', matrixMode = 'scenes';
  var arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var plus = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  var descriptions = {
    cv: ['从图像中，读出地层与设备的线索。', '遥感影像、地震剖面、岩屑照片、成像测井与示功图，都可以成为识别、检测和分割的输入。'],
    ts: ['让连续的数据，说出正在发生的变化。', '沿着时间或深度，发现异常、识别边界、预测趋势。把曲线变化与具体的作业判断联系起来。'],
    nlp: ['把散落的文字，变成可用的知识。', '从录井报告、井史记录和化验单中抽取信息，让专业资料更容易检索、核对与组织。'],
    opt: ['在复杂的约束中，找到更好的选择。', '把生产目标、参数范围与现场约束放在一起，通过代理模型和搜索算法比较不同方案。'],
    kg: ['连接经验与证据，让推荐有迹可循。', '组织设备、地层、故障和工艺之间的关系，为方案推荐、工具匹配与案例推理提供依据。']
  };
  function esc(s) { return K.esc(s); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function countReady() { return C.list().filter(function (c) { return c.tabs && c.tabs.demo && typeof c.tabs.demo.mount === 'function'; }).length; }
  function sectionHead(no, en, title, text) {
    return '<div class="atlas-section-head"><div class="atlas-eyebrow"><span>' + no + '</span>' + en + '</div><h2>' + title + '</h2><p>' + text + '</p></div>';
  }
  function cover() {
    return '<section class="atlas-cover" aria-labelledby="cover-title">' +
      '<div class="atlas-cover-media" aria-hidden="true"><img class="atlas-cover-photo" src="assets/images/oilfield-cover.png" alt="" fetchpriority="high"></div>' +
      '<div class="atlas-cover-shade"></div><div class="atlas-cover-grid" aria-hidden="true"></div>' +
      '<div class="atlas-cover-content atlas-width"><div class="atlas-cover-kicker"><span class="atlas-live-dot"></span> PETRO × AI ATLAS <span class="atlas-kicker-line"></span> 从现场出发</div>' +
      '<h1 id="cover-title">石油勘探开发的<br><span>智能化可能性地图</span></h1>' +
      '<p class="atlas-cover-desc">从石油现场的问题出发，理解专业背景与数据。<br>跟着案例看方法，再动手检查结果。</p>' +
      '<div class="atlas-cover-actions"><a class="atlas-btn atlas-btn-red" href="#/scene/m1?case=m1-cuttings-preview-local&amp;tab=bg">从岩屑案例开始 ' + arrow + '</a>' +
      '<button class="atlas-cover-secondary atlas-cover-map" data-home-jump="stage-map">浏览场景地图 <span>↓</span></button></div>' +
      '<div class="atlas-cover-index"><span>EXPLORATION</span><i></i><span>INTELLIGENCE</span></div></div>' +
      '<div class="atlas-cover-bottom atlas-width"><span>从地质勘察，一直走到加工。</span><button data-home-jump="stage-map" aria-label="向下浏览场景地图">向下探索 <span>↓</span></button></div></section>' +
      '<div class="atlas-stats atlas-width" aria-label="网站收录概况">' +
      [[A.stages.length, '作业环节', 'CONNECTED STAGES'], [A.allScenes.length, '候选场景', 'POSSIBILITIES'], [Object.keys(A.methods).length, '智能方法类别', 'AI APPROACHES'], [countReady(), '可运行案例', 'HANDS-ON CASES']].map(function (it) {
        return '<div class="atlas-stat"><strong>' + it[0] + '</strong><div><b>' + it[1] + '</b><span>' + it[2] + '</span></div></div>';
      }).join('') + '</div>';
  }
  function firstLesson() {
    return '<section class="atlas-first-lesson atlas-width" aria-labelledby="first-lesson-title"><div class="atlas-first-intro"><span class="atlas-mini-label">从一个具体问题开始 / 录井 · M1</span><h2 id="first-lesson-title">一张岩屑照片，能告诉我们什么？</h2><p>跟随一份真实样品，了解它从哪里来，整理照片、井深和标签，再对照岩性沿井深的变化。</p><a href="#/scene/m1?case=m1-cuttings-preview-local&amp;tab=bg">进入岩屑案例 ' + arrow + '</a></div>' +
      '<ol class="atlas-first-steps"><li><span>01</span><b>认识现场</b><small>岩屑怎样成为井深记录？</small></li><li><span>02</span><b>整理数据</b><small>照片、井深和标签怎样对应？</small></li><li><span>03</span><b>辅助识别</b><small>沿井深对照照片与岩性。</small></li></ol></section>';
  }
  function sceneLeaf(sc, st) {
    var ready = C.bySceneAll(sc.id).length;
    var search = [st.name, sc.name, sc.id, sc.point].concat((sc.methods || []).map(function (m) { return m + ' ' + (A.methods[m] ? A.methods[m].name : ''); })).join(' ').toLowerCase();
    return '<a class="atlas-leaf' + (ready ? ' has-case' : '') + '" href="#/scene/' + esc(sc.id) + '" data-home-leaf data-search="' + esc(search) + '" data-ready="' + (ready ? '1' : '0') + '">' +
      '<span class="atlas-leaf-marker" aria-hidden="true"></span><span class="atlas-leaf-name">' + esc(sc.name) + '</span>' +
      (ready ? '<span class="atlas-leaf-status">有案例</span>' : '<span class="atlas-leaf-code">' + esc(sc.id.toUpperCase()) + '</span>') + '<span class="atlas-leaf-arrow">↗</span></a>';
  }
  function stageMap() {
    var tree = A.stages.map(function (st) {
      return '<div class="atlas-map-stage" data-home-stage><div class="atlas-river-island"><a class="atlas-stage-label" href="#/stage/' + esc(st.id) + '"><span class="atlas-stage-no">STAGE ' + pad(st.idx) + ' / ' + pad(A.stages.length) + '</span><h3>' + esc(st.name) + '</h3><span class="atlas-stage-en">' + esc(st.en) + '</span><span class="atlas-stage-count">' + st.scenes.length + ' 个场景 ' + arrow + '</span></a>' +
        '<div class="atlas-map-leaves">' + st.scenes.map(function (sc) { return sceneLeaf(sc, st); }).join('') + '</div></div>' +
        '<a class="atlas-stage-junction" href="#/stage/' + esc(st.id) + '" data-river-node="' + esc(st.id) + '" aria-label="探索第 ' + st.idx + ' 阶段：' + esc(st.name) + '"><span class="atlas-node-orbit" aria-hidden="true"></span><b>' + pad(st.idx) + '</b></a></div>';
    }).join('');
    return '<section class="atlas-section atlas-map-section" id="stage-map"><div class="atlas-width">' +
      sectionHead('01', 'BY STAGE · FOLLOW THE CURRENT', '从作业链，<em>找到具体问题。</em>', '沿着 ' + A.stages.length + ' 个作业环节浏览场景；标有“有案例”的节点可以继续学习和操作。') +
      '<div class="atlas-map-toolbar"><div class="atlas-segment" role="group" aria-label="地图场景范围"><button class="is-active" data-home-scope="all" aria-pressed="true">全部场景 <span>' + A.allScenes.length + '</span></button><button data-home-scope="ready" aria-pressed="false">已有案例 <span>' + C.stats().coveredScenes + '</span></button></div>' +
      '<label class="atlas-search"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.6"/></svg><input id="atlas-map-search" type="search" placeholder="搜索环节、场景或方法" aria-label="搜索场景地图"></label></div>' +
      '<div class="atlas-map-caption"><span><i></i> THE CURRENT / 石油勘探开发</span><span id="atlas-map-count" role="status">' + A.allScenes.length + ' 个场景</span></div>' +
      '<div class="atlas-map-tree atlas-river-tree" data-river-map><div class="atlas-river-atmosphere" aria-hidden="true"><i></i><i></i><i></i></div>' + global.AtlasRiver.initial(A.stages) +
      '<div class="atlas-river-topbar"><div><span class="atlas-current-dot"></span> KNOWLEDGE IN MOTION <small>顺着光，发现下一种可能</small></div><button data-river-motion aria-pressed="true"><span class="atlas-motion-symbol" aria-hidden="true"></span><span data-river-motion-label>暂停动效</span></button></div>' +
      '<div class="atlas-river-stages">' + tree + '</div><div class="atlas-river-outro"><span>↓</span> THE EXPLORATION CONTINUES</div></div><div class="atlas-map-empty" id="atlas-map-empty" hidden>没有找到匹配的场景。试试更短的关键词，或切换到全部场景。</div>' +
      '<div class="atlas-map-end"><span></span><p>一张持续生长的地图。<b>下一个案例，可以由你补上。</b></p><button class="atlas-text-link" data-import>添加你的案例 ' + plus + '</button></div></div></section>';
  }
  function methodPanel(key) {
    var m = A.methods[key];
    if (!m) return '<p class="atlas-empty-note">暂时没有方法类别。</p>';
    var scenes = A.index.byMethod[key] || [];
    var info = descriptions[key] || [m.name, m.desc || ''];
    return '<div class="atlas-method-intro"><span class="atlas-method-large" aria-hidden="true">' + esc(m.abbr) + '<i>↗</i></span><div class="atlas-method-text"><span class="atlas-mini-label">' + esc(m.signal || '探索方法') + '</span><h3>' + esc(info[0]) + '</h3><p>' + esc(info[1]) + '</p></div></div>' +
      '<div class="atlas-method-examples"><div class="atlas-list-heading"><span>可以从这些场景开始</span><span>' + scenes.length + ' 个关联场景</span></div>' + scenes.slice(0, 4).map(function (sc) {
        return '<a href="#/scene/' + esc(sc.id) + '"><span>' + esc(sc.name) + '</span><span class="atlas-example-meta">' + esc(sc.stageName) + '<i>↗</i></span></a>';
      }).join('') + (!scenes.length ? '<p class="atlas-empty-note">该方法暂未关联场景。</p>' : '') + '</div><a class="atlas-text-link" href="#/method/' + esc(key) + '">查看全部 ' + scenes.length + ' 个场景 ' + arrow + '</a>';
  }
  function methods() {
    var keys = Object.keys(A.methods);
    if (!A.methods[methodKey]) methodKey = keys[0] || '';
    return '<section class="atlas-section atlas-method-section" id="by-method"><div class="atlas-width">' +
      sectionHead('02', 'BY METHOD', '带着你的方法，<em>找到新的现场。</em>', '熟悉图像、曲线，还是文本？换一个技术视角，看看同一种方法能够连接哪些石油场景。') +
      '<div class="atlas-method-workbench"><div class="atlas-method-tabs" role="tablist" aria-label="智能方法">' + keys.map(function (key, i) {
        var m = A.methods[key], on = key === methodKey;
        return '<button role="tab" id="method-tab-' + esc(key) + '" data-home-method="' + esc(key) + '" aria-controls="atlas-method-panel" aria-selected="' + on + '" tabindex="' + (on ? '0' : '-1') + '" class="' + (on ? 'is-active' : '') + '"><span class="atlas-method-order">' + pad(i + 1) + '</span><span><b>' + esc(m.name) + '</b><small>' + esc(m.abbr) + ' / ' + (A.index.byMethod[key] || []).length + ' SCENARIOS</small></span>' + arrow + '</button>';
      }).join('') + '</div><div class="atlas-method-panel" id="atlas-method-panel" role="tabpanel" tabindex="0" aria-labelledby="method-tab-' + esc(methodKey) + '">' + methodPanel(methodKey) + '</div></div></div></section>';
  }
  function matrixTable(mode) {
    var keys = Object.keys(A.methods), max = 1;
    A.stages.forEach(function (st) { keys.forEach(function (key) { max = Math.max(max, st.scenes.filter(function (s) { return s.methods.indexOf(key) >= 0; }).length); }); });
    return '<table class="atlas-heatmap"><caption class="atlas-sr-only">' + (mode === 'coverage' ? '各环节与方法的案例覆盖场景数和候选场景数' : '各环节与方法关联的候选场景数') + '</caption><thead><tr><th scope="col">作业环节 <span>STAGES</span></th>' + keys.map(function (key) { return '<th scope="col"><b>' + esc(A.methods[key].abbr) + '</b><span>' + esc(A.methods[key].name) + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      A.stages.map(function (st) {
        return '<tr><th scope="row"><a href="#/stage/' + esc(st.id) + '"><span>' + pad(st.idx) + '</span>' + esc(st.name) + '</a></th>' + keys.map(function (key) {
          var candidates = st.scenes.filter(function (s) { return s.methods.indexOf(key) >= 0; });
          var n = candidates.length, ready = candidates.filter(function (s) { return C.bySceneAll(s.id).length; }).length;
          var heat = mode === 'coverage' ? (n ? ready / n : 0) : n / max;
          var value = mode === 'coverage' ? ready + '<small> / ' + n + '</small>' : n;
          var label = st.name + ' · ' + A.methods[key].name + '：' + (mode === 'coverage' ? ready + ' / ' + n + ' 个场景已接入案例' : n + ' 个候选场景');
          return '<td>' + (n ? '<a class="atlas-heat-cell' + (!heat ? ' is-uncovered' : '') + '" style="--cell-heat:' + (0.055 + heat * 0.23).toFixed(3) + '" href="#/stage/' + esc(st.id) + '?m=' + esc(key) + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + value + '</a>' : '<span class="atlas-heat-zero" aria-label="无关联场景">—</span>') + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  }
  function matrix() {
    return '<section class="atlas-section atlas-matrix-section" id="method-matrix"><div class="atlas-width"><div class="atlas-matrix-heading">' +
      sectionHead('03', 'THE BIG PICTURE', '换个尺度，<em>看见全局。</em>', '交叉比较作业环节与智能方法。切换到案例覆盖，看看哪里已经可以动手，哪里还等待探索。') +
      '<div class="atlas-segment" role="group" aria-label="矩阵统计方式"><button data-home-matrix="scenes" class="' + (matrixMode === 'scenes' ? 'is-active' : '') + '" aria-pressed="' + (matrixMode === 'scenes') + '">场景分布</button><button data-home-matrix="coverage" class="' + (matrixMode === 'coverage' ? 'is-active' : '') + '" aria-pressed="' + (matrixMode === 'coverage') + '">案例覆盖</button></div></div>' +
      '<div class="atlas-matrix-scroll" id="atlas-matrix-table" tabindex="0" role="region" aria-label="方法与环节矩阵，可横向滚动">' + matrixTable(matrixMode) + '</div>' +
      '<div class="atlas-matrix-foot"><p id="atlas-matrix-note">' + matrixNote() + '</p><div class="atlas-heat-legend"><span>' + (matrixMode === 'coverage' ? '低' : '少') + '</span><i></i><i></i><i></i><i></i><span>' + (matrixMode === 'coverage' ? '高' : '多') + '</span></div></div></div></section>';
  }
  function matrixNote() { return matrixMode === 'coverage' ? '数字为已覆盖场景 / 候选场景；颜色越深，覆盖比例越高。点击格子进入筛选结果。' : '数字为关联场景数量；一个场景可对应多种方法。点击格子进入筛选结果。'; }
  function learning() {
    var available = C.list().filter(function (c) { return c.tabs && c.tabs.demo && typeof c.tabs.demo.mount === 'function' && A.index.byScene[c.sceneId]; });
    var demo = available.filter(function (c) { return c.id === 'm1-cuttings-preview-local'; })[0] || available[0];
    var target = demo ? '#/scene/' + demo.sceneId + '?case=' + encodeURIComponent(demo.id) + '&tab=bg' : '#/cases';
    return '<section class="atlas-section atlas-learning-section" id="start-learning"><div class="atlas-width">' +
      '<div class="atlas-learning-top"><div>' + sectionHead('04', 'FROM KNOWING TO DOING', '不止看懂，<br><em>还要亲手试一试。</em>', '每个完整案例，都沿着同一条学习路径展开。') + '<a class="atlas-btn atlas-btn-dark" href="' + target + '">' + (demo ? '运行一个案例' : '浏览案例库') + ' ' + arrow + '</a></div>' +
      '<div class="atlas-learning-path"><div><span>01 / UNDERSTAND</span><h3>读懂专业背景</h3><p>先认识现场的对象、机理与难题。让图解把陌生的石油概念变得具体。</p><svg viewBox="0 0 240 60" fill="none" aria-hidden="true"><path d="M0 20c40-20 70 20 110 0s80 15 130-5M0 36c40-20 70 20 110 0s80 15 130-5M0 52c40-20 70 20 110 0s80 15 130-5" stroke="currentColor" stroke-width="1.5"/></svg></div>' +
      '<div><span>02 / CONNECT</span><h3>拆解案例流程</h3><p>沿着输入、处理、建模与评价，弄清楚智能方法究竟在哪一步发挥作用。</p><svg viewBox="0 0 240 60" fill="none" aria-hidden="true"><path d="M35 30h170" stroke="currentColor" stroke-width="1.5"/>' + [35, 120, 205].map(function (x) { return '<rect x="' + (x - 12) + '" y="18" width="24" height="24" rx="5" fill="#faf7f7" stroke="currentColor" stroke-width="1.5"/>'; }).join('') + '</svg></div>' +
      '<div><span>03 / EXPERIMENT</span><h3>运行交互演示</h3><p>改变参数，观察数据与结果的变化。既看方法何时有效，也看它在哪里失灵。</p><svg viewBox="0 0 240 60" fill="none" aria-hidden="true"><path d="M0 40h42l10-8 12 16 15-30 15 23 12-7 12 4 18-25 13 31 12-10h79" stroke="currentColor" stroke-width="1.5"/></svg></div></div></div>' +
      '<div class="atlas-contribute"><div><span class="atlas-mini-label">KEEP THE MAP GROWING</span><h3>把你的发现，接入这张地图。</h3><p>保留完整的案例包，让专业背景、案例流程和交互演示一起被看见。</p></div><div><button class="atlas-btn atlas-btn-red" data-import>添加案例 ' + plus + '</button><a class="atlas-text-link" href="#/guide">了解接入方式 ↗</a></div></div></div></section>';
  }
  function footer() {
    return '<footer class="atlas-footer"><div class="atlas-width"><div><a class="atlas-footer-brand" href="#/">PETRO<span>×</span>AI</a><p>从具体问题出发，让智能方法走进专业现场。</p></div><nav aria-label="页脚导航"><a href="#/chain">作业链</a><a href="#/cases">案例库</a><a href="#/guide">接入指南</a><a href="#/admin">管理</a></nav><div class="atlas-footer-bottom"><span>可视化导论 · 石油勘探开发智能化案例集</span><span>EXPLORE. UNDERSTAND. EXPERIMENT.</span></div></div></footer>';
  }
  function render(ctx) {
    A = ctx.atlas; C = ctx.cases; K = ctx.K;
    return '<main class="atlas-home">' + cover() + firstLesson() + stageMap() + methods() + matrix() + learning() + '</main>';
  }
  function bind(root) {
    var scope = 'all';
    var search = root.querySelector('#atlas-map-search');
    var river = global.AtlasRiver.mount(root.querySelector('[data-river-map]'));
    function filterMap() {
      var query = (search.value || '').trim().toLowerCase(), count = 0;
      [].forEach.call(root.querySelectorAll('[data-home-stage]'), function (stage) {
        var visible = 0;
        [].forEach.call(stage.querySelectorAll('[data-home-leaf]'), function (leaf) {
          var show = (!query || leaf.dataset.search.indexOf(query) >= 0) && (scope !== 'ready' || leaf.dataset.ready === '1');
          leaf.hidden = !show; if (show) { visible++; count++; }
        });
        stage.hidden = !visible;
      });
      root.querySelector('#atlas-map-count').textContent = count + ' 个场景';
      root.querySelector('#atlas-map-empty').hidden = !!count;
      river.refresh();
    }
    root.addEventListener('click', function (e) {
      var jump = e.target.closest('[data-home-jump]');
      if (jump) { var section = document.getElementById(jump.dataset.homeJump); if (section) section.scrollIntoView({ behavior: global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
      var filter = e.target.closest('[data-home-scope]');
      if (filter) {
        scope = filter.dataset.homeScope;
        [].forEach.call(root.querySelectorAll('[data-home-scope]'), function (b) { var on = b === filter; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on); });
        filterMap();
      }
      var method = e.target.closest('[data-home-method]');
      if (method) activateMethod(method);
      var matrixButton = e.target.closest('[data-home-matrix]');
      if (matrixButton) {
        matrixMode = matrixButton.dataset.homeMatrix;
        [].forEach.call(root.querySelectorAll('[data-home-matrix]'), function (b) { var on = b === matrixButton; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on); });
        root.querySelector('#atlas-matrix-table').innerHTML = matrixTable(matrixMode);
        root.querySelector('#atlas-matrix-note').textContent = matrixNote();
        var legend = root.querySelector('.atlas-heat-legend');
        legend.firstElementChild.textContent = matrixMode === 'coverage' ? '低' : '少';
        legend.lastElementChild.textContent = matrixMode === 'coverage' ? '高' : '多';
      }
    });
    function activateMethod(button) {
      methodKey = button.dataset.homeMethod;
      [].forEach.call(root.querySelectorAll('[data-home-method]'), function (b) { var on = b === button; b.classList.toggle('is-active', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
      var panel = root.querySelector('#atlas-method-panel');
      panel.innerHTML = methodPanel(methodKey); panel.setAttribute('aria-labelledby', button.id);
    }
    root.addEventListener('keydown', function (e) {
      var button = e.target.closest('[data-home-method]');
      if (!button || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) < 0) return;
      e.preventDefault();
      var buttons = [].slice.call(root.querySelectorAll('[data-home-method]'));
      var i = buttons.indexOf(button), n = buttons.length;
      if (e.key === 'Home') i = 0; else if (e.key === 'End') i = n - 1; else i = (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + n) % n;
      activateMethod(buttons[i]); buttons[i].focus();
    });
    if (search) search.addEventListener('input', filterMap);
    return river;
  }
  global.AtlasHome = { render: render, bind: bind, footer: footer };
})(window);
