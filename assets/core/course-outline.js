/* Shared course syllabus. The user's original illustration is retained in full. */
(function (global) {
  'use strict';
  var IMAGE = 'assets/images/course-outline-wide.png', W = 887, H = 1774;
  var PHASES = [
    { title: '油气勘探与资源发现', short: '勘探发现', en: 'EXPLORATION', color: '#B95739', top: 205, bottom: 515, goal: '以地质勘探为先导，发现油气资源潜力。', question: '地下哪里可能有油气？', stages: ['geology', 'seismic'] },
    { title: '钻井施工与地层评价', short: '钻井评价', en: 'DRILLING & EVALUATION', color: '#A04D37', top: 515, bottom: 832, goal: '钻进目标地层，获取地质资料，认识钻遇地层。', question: '钻到了什么地层，获得了哪些证据？', stages: ['drilling', 'mudlogging', 'welllog'] },
    { title: '井筒建造与投产准备', short: '建井投产', en: 'WELL CONSTRUCTION', color: '#9D6150', top: 832, bottom: 1154, goal: '保障井筒完整性，建立油气导入通道。', question: '怎样把井建好，并连通储层？', stages: ['cementing', 'completion', 'perforation'] },
    { title: '油气开采与生产增效', short: '开采增效', en: 'PRODUCTION', color: '#8A694B', top: 1154, bottom: 1467, goal: '通过生产与增产技术，改善开采效果。', question: '怎样维持生产，并提高开采效果？', stages: ['production', 'workover', 'eor'] },
    { title: '油气集输与炼化加工', short: '集输加工', en: 'TRANSPORT & REFINING', color: '#A35C35', top: 1467, bottom: 1774, goal: '将产出的油气输送、处理并转化为产品。', question: '油气离开井口后，怎样成为产品？', stages: ['transport', 'refining'] }
  ];
  var SPOTS = [
    ['geology', 0, 126, 319, 145, 129], ['seismic', 0, 280, 319, 144, 129],
    ['drilling', 1, 114, 611, 105, 148], ['mudlogging', 1, 228, 611, 108, 148], ['welllog', 1, 346, 611, 97, 148],
    ['cementing', 2, 108, 939, 115, 143], ['completion', 2, 233, 939, 108, 143], ['perforation', 2, 351, 939, 109, 143],
    ['production', 3, 108, 1259, 115, 142], ['injection', 3, 233, 1259, 111, 142], ['eor', 3, 351, 1259, 111, 142],
    ['transport', 4, 108, 1549, 165, 159], ['refining', 4, 282, 1549, 172, 159]
  ];
  function index(value) { var n = Number(value); return n >= 1 && n <= 5 && n % 1 === 0 ? n - 1 : -1; }
  function stage(ctx, id) { return ctx.atlas.index.byStage[id]; }
  function sceneHref(ctx, sc) {
    var c = ctx.cases.byScene(sc.id);
    return '#/scene/' + ctx.K.esc(sc.id) + (c ? '?case=' + encodeURIComponent(c.id) + '&amp;tab=bg' : '');
  }
  function flow(path, color, duration) {
    return '<g class="course-flow" style="--flow:' + color + '"><path class="course-flow-track" d="' + path + '"/><path class="course-flow-current" d="' + path + '"/>' + [0, 1].map(function (i) {
      return '<g class="course-flow-arrow"><path d="M-10-6 0 0-10 6M-19-6-9 0-19 6"/><animateMotion dur="' + duration + 's" begin="' + (-duration * i / 2) + 's" repeatCount="indefinite" rotate="auto" path="' + path + '"/></g>';
    }).join('') + '</g>';
  }
  function motion() {
    return '<svg class="course-effects" data-course-motion-svg viewBox="0 0 887 1774" aria-hidden="true">' +
      '<g class="course-phase-effect" data-course-flow="0"><path class="course-survey-scan" d="M510 335H680"/>' +
      flow('M606 247L600 303', '#4ec6ae', 3.1) + flow('M363.5 459V502', '#29b9d2', 3) + '</g>' +
      '<g class="course-phase-effect" data-course-flow="1">' + flow('M605 830V683', '#43bdec', 4.5) + flow('M613 683V830', '#eda344', 4.8) +
      '<circle class="course-pulse" cx="608" cy="836" r="15"/>' + flow('M363.5 779V819', '#3799f2', 3) + '</g>' +
      '<g class="course-phase-effect" data-course-flow="2">' + flow('M701 1066L628 1028L529 1010', '#68b7d0', 4.7) + flow('M363.5 1104V1143', '#9d68cf', 3) + '</g>' +
      '<g class="course-phase-effect" data-course-flow="3">' + flow('M871 1434L678 1382L550 1351', '#50a995', 5) + flow('M363.5 1415V1456', '#65b56c', 3) + '</g>' +
      '<g class="course-phase-effect" data-course-flow="4">' + flow('M536 1642L690 1701L869 1757', '#e7983f', 5.5) +
      '<g class="course-steam"><circle cx="637" cy="1492" r="8"/><circle cx="653" cy="1505" r="6"/></g></g></svg>';
  }
  function effect(s) {
    var shapes = {
      geology: '<path class="course-vision-scan" d="M18 57H141"/><path class="course-trace" d="M30 116l28-19 30 14 28-23 20 9"/>',
      seismic: '<path class="course-vision-scan" d="M15 65H137"/><circle class="course-local-pulse" cx="85" cy="96" r="20"/>',
      drilling: '<path class="course-trace" d="M61 48v112"/><circle class="course-local-pulse" cx="61" cy="154" r="12"/>',
      mudlogging: '<path class="course-monitor-scan" d="M29 57v50"/><path class="course-trace" d="M29 91l7-3 7 5 7-19 6 13 6-5 7 7 7-13 7 6"/>',
      welllog: '<path class="course-trace" d="M46 43l-4 14 7 11-6 18 7 9-8 15 6 17-7 13 5 15m29-112 3 14-6 11 5 18-7 9 8 15-6 17 7 13-5 15"/>',
      cementing: '<path class="course-trace" d="M19 145h76l8-13"/><circle class="course-local-pulse" cx="92" cy="138" r="12"/>',
      completion: '<path class="course-trace" d="M62 48v112"/><path class="course-monitor-scan" d="M43 72h40"/>',
      perforation: '<g class="course-perforation"><path d="M64 105l23-9m-23 20 27 2m-27 10 20 14m-35-37-25-12m23 24-26 3m29 9-23 17"/></g>',
      production: '<path class="course-trace" d="M79 70v85"/><circle class="course-local-pulse" cx="79" cy="147" r="13"/>',
      injection: '<path class="course-trace" d="M22 133h38v-38m0 38h39"/><circle class="course-local-pulse" cx="60" cy="130" r="13"/>',
      eor: '<g class="course-perforation"><path d="M65 101l27-9m-27 20 28 3m-28 9 24 13m-35-36-25-12m23 23-27 1m30 12-24 15"/></g>',
      transport: '<path class="course-trace" d="M19 99l117 37"/><path class="course-monitor-scan" d="M25 60h82"/>',
      refining: '<path class="course-trace" d="M40 146V71m34 76V48m34 99V80"/><circle class="course-local-pulse" cx="75" cy="70" r="12"/>'
    };
    var box = s[0] === 'geology' ? '160 155' : s[0] === 'seismic' ? '155 155' : s[0] === 'transport' ? '170 190' : s[0] === 'refining' ? '154 190' : '120 180';
    return '<svg preserveAspectRatio="none" class="course-tech-effect" data-course-motion-svg viewBox="0 0 ' + box + '" aria-hidden="true">' + shapes[s[0]] + '</svg>';
  }
  function hotspots(ctx, focus) {
    return SPOTS.map(function (s) {
      var injection = s[0] === 'injection', label = injection ? '注井：查看本阶段课程说明' : stage(ctx, s[0]).name + '：进入环节';
      var attr = injection ? 'button type="button" data-course-injection aria-expanded="false" aria-controls="course-injection-note"' : 'a href="#/stage/' + s[0] + '"';
      return '<' + attr + ' class="course-hotspot' + (focus === s[1] ? ' is-relevant' : focus >= 0 ? ' is-dim' : '') + '" data-course-spot="' + s[0] + '" data-course-spot-phase="' + s[1] + '" aria-label="' + ctx.K.esc(label) + '" title="' + ctx.K.esc(label) + '" style="left:' + s[2] / W * 100 + '%;top:' + s[3] / H * 100 + '%;width:' + s[4] / W * 100 + '%;height:' + s[5] / H * 100 + '%;--phase:' + PHASES[s[1]].color + '"><span class="course-hotspot-art" aria-hidden="true"><img src="' + IMAGE + '" alt="" decoding="async" draggable="false" style="width:' + W / s[4] * 100 + '%;left:' + -s[2] / s[4] * 100 + '%;top:' + -s[3] / s[5] * 100 + '%"></span>' + effect(s) + '<span class="course-hotspot-tag"><b>0' + (s[1] + 1) + '</b>' + (injection ? '课程说明' : '进入环节') + '<i>↗</i></span></' + (injection ? 'button' : 'a') + '>';
    }).join('');
  }
  function sourceImage() {
    return '<img class="course-base" data-course-image src="' + IMAGE + '" width="887" height="1774" decoding="async" fetchpriority="high" draggable="false" alt="课程全景原图，依次为油气勘探与资源发现、钻井施工与地层评价、井筒建造与投产准备、油气开采与生产增效、油气集输与炼化加工。">';
  }
  function status(n) {
    return n < 0 ? '沿着五个阶段认识石油全流程。点击图画，进入具体环节。' : PHASES[n].title + ' · ' + PHASES[n].goal;
  }
  function phaseArt(n, focus) {
    var p = PHASES[n];
    return '<div class="course-phase-art' + (n === focus ? ' is-current' : '') + '" data-course-phase-art="' + n + '" aria-hidden="true" style="top:' + p.top / H * 100 + '%;height:' + (p.bottom - p.top) / H * 100 + '%;--phase:' + p.color + '"><span class="course-phase-crop"><img src="' + IMAGE + '" alt="" decoding="async" draggable="false" style="top:' + -p.top / (p.bottom - p.top) * 100 + '%"></span></div>';
  }
  function directory(ctx) {
    var esc = ctx.K.esc;
    return '<section class="course-directory"><div class="course-directory-head"><div><span class="course-eyebrow">FIND YOUR QUESTION</span><h3>从课程大纲，找到具体场景</h3></div><span data-course-count role="status">' + ctx.atlas.allScenes.length + ' 个场景</span></div><div class="course-searchbar"><label><span>⌕</span><input type="search" data-course-search placeholder="搜索环节、场景或方法" aria-label="搜索课程场景"></label><div role="group" aria-label="课程场景范围"><button type="button" data-course-scope="all" aria-pressed="true">全部场景</button><button type="button" data-course-scope="ready" aria-pressed="false">已有案例</button></div></div><details data-course-directory><summary>展开五个阶段的全部场景 <span>5 个阶段 / ' + ctx.atlas.stages.length + ' 个环节</span></summary><div class="course-directory-groups">' + PHASES.map(function (p, n) {
      return '<section class="course-directory-phase" data-course-group style="--phase:' + p.color + '"><h4><span>0' + (n + 1) + '</span>' + p.title + '</h4><div>' + p.stages.map(function (id) {
        var st = stage(ctx, id);
        return '<section class="course-directory-stage" data-course-stage><a class="course-directory-label" href="#/stage/' + id + '">' + esc(st.name) + '<span>↗</span></a><div>' + st.scenes.map(function (sc) {
          var ready = !!ctx.cases.bySceneAll(sc.id).length;
          var search = [p.title, st.name, sc.name, sc.id, sc.point].concat((sc.methods || []).map(function (key) { var m = ctx.atlas.methods[key]; return key + ' ' + (m ? m.name + ' ' + m.abbr : ''); })).join(' ').toLowerCase();
          return '<a href="' + sceneHref(ctx, sc) + '" data-course-scene data-search="' + esc(search) + '" data-ready="' + (ready ? '1' : '0') + '"><span>' + esc(sc.name) + '</span>' + (ready ? '<small>有案例</small>' : '<i>' + esc(sc.id.toUpperCase()) + '</i>') + '<b>↗</b></a>';
        }).join('') + '</div></section>';
      }).join('') + '</div></section>';
    }).join('') + '</div></details><p class="course-empty" data-course-empty hidden>没有找到匹配场景。试试更短的关键词，或切换到全部场景。</p></section>';
  }
  function render(ctx) {
    var n = index((ctx.query || {}).phase);
    return '<section class="course-outline" data-course-outline data-course-phase="' + n + '" style="--phase:' + (n < 0 ? '#b77c4b' : PHASES[n].color) + '">' +
      '<div class="course-toolbar"><div class="course-phase-tabs" role="group" aria-label="高亮课程阶段"><button type="button" data-course-select="-1" data-course-tab aria-pressed="' + (n < 0) + '" aria-controls="course-map" style="--tab-color:#B95739"><b>ALL</b><span>完整流程</span></button>' +
      PHASES.map(function (p, i) { return '<button type="button" data-course-select="' + i + '" data-course-tab aria-pressed="' + (i === n) + '" aria-controls="course-map" style="--tab-color:' + p.color + '"><b>0' + (i + 1) + '</b><span>' + p.short + '</span></button>'; }).join('') + '</div><button class="course-motion" type="button" data-course-motion aria-pressed="true"><span data-course-motion-icon>Ⅱ</span> <span data-course-motion-label>暂停动效</span></button></div>' +
      '<div class="course-status"><span>↳</span><p data-course-status role="status">' + status(n) + '</p><small>5 个阶段 · ' + ctx.atlas.stages.length + ' 个环节</small></div>' +
      '<div class="course-map' + (n >= 0 ? ' has-focus' : '') + '" id="course-map" data-course-map data-course-image-state="loading" aria-busy="true">' + sourceImage() + '<span class="course-image-status" data-course-image-status role="status">正在载入课程图解…</span><button class="course-image-retry" type="button" data-course-image-retry hidden>重新载入图解</button><div class="course-veil" aria-hidden="true"></div>' + PHASES.map(function (p, i) { return phaseArt(i, n); }).join('') + hotspots(ctx, n) + motion() +
      '<div class="course-map-caption"><i></i><span data-course-running>流程正在流动</span><small>示意动画</small></div>' +
      '<div class="course-injection-note" id="course-injection-note" data-course-injection-note hidden><p>原图中的“注井”暂未单设课程入口。本站保留<a href="#/stage/workover">修井补充环节 ↗</a>；“增产”相关场景沿用增采目录。</p><button type="button" data-course-injection-close aria-label="收起注井课程说明">×</button></div></div>' +
      '<div class="course-map-footer"><p>勘探发现 <i>→</i> 钻井评价 <i>→</i> 建井投产 <i>→</i> 开采增效 <i>→</i> 集输加工</p><span>点击图画 · 进入环节 ↗</span></div>' + directory(ctx) + '</section>';
  }
  function bind(root, ctx) {
    if (!root) return { destroy: function () {} };
    var n = index((ctx.query || {}).phase), scope = 'all', disposed = false;
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var paused = !!(mq && mq.matches), search = root.querySelector('[data-course-search]');
    var map = root.querySelector('[data-course-map]'), image = root.querySelector('[data-course-image]');
    var imageStatus = root.querySelector('[data-course-image-status]'), retry = root.querySelector('[data-course-image-retry]');
    var spots = [].slice.call(root.querySelectorAll('[data-course-spot]'));
    var phaseArts = [].slice.call(root.querySelectorAll('[data-course-phase-art]'));
    var flows = [].slice.call(root.querySelectorAll('[data-course-flow]'));
    var note = root.querySelector('[data-course-injection-note]'), injection = root.querySelector('[data-course-injection]');
    function imageReady() { if (!disposed) { map.dataset.courseImageState = 'ready'; map.setAttribute('aria-busy', 'false'); imageStatus.hidden = true; retry.hidden = true; } }
    function imageFailed() { if (!disposed) { map.dataset.courseImageState = 'error'; map.setAttribute('aria-busy', 'false'); imageStatus.hidden = false; imageStatus.textContent = '课程图解暂未载入'; retry.hidden = false; } }
    image.addEventListener('load', imageReady); image.addEventListener('error', imageFailed);
    if (image.complete && image.naturalWidth > 0) imageReady();
    function motionState() {
      root.classList.toggle('is-paused', paused); root.classList.toggle('is-playing', !paused);
      root.querySelector('[data-course-motion]').setAttribute('aria-pressed', String(!paused));
      root.querySelector('[data-course-motion-icon]').textContent = paused ? '▶' : 'Ⅱ';
      root.querySelector('[data-course-motion-label]').textContent = paused ? '播放动效' : '暂停动效';
      root.querySelector('[data-course-running]').textContent = paused ? '动效已暂停 · 仍可点击探索' : '流程正在流动';
      [].forEach.call(root.querySelectorAll('[data-course-motion-svg]'), function (svg) { var key = paused ? 'pauseAnimations' : 'unpauseAnimations'; if (typeof svg[key] === 'function') svg[key](); });
    }
    function select(value, updateUrl) {
      var next = Number(value); if (next % 1 || next < -1 || next >= PHASES.length || !isFinite(next)) return;
      n = next; root.dataset.coursePhase = String(n); root.style.setProperty('--phase', n < 0 ? '#b77c4b' : PHASES[n].color);
      map.classList.toggle('has-focus', n >= 0);
      [].forEach.call(root.querySelectorAll('[data-course-tab]'), function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.courseSelect) === n)); });
      spots.forEach(function (s) { s.classList.toggle('is-relevant', n >= 0 && Number(s.dataset.courseSpotPhase) === n); s.classList.toggle('is-dim', n >= 0 && Number(s.dataset.courseSpotPhase) !== n); });
      phaseArts.forEach(function (a) { a.classList.toggle('is-current', Number(a.dataset.coursePhaseArt) === n); });
      flows.forEach(function (f) { f.classList.toggle('is-dim', n >= 0 && Number(f.dataset.courseFlow) !== n); });
      root.querySelector('[data-course-status]').textContent = status(n);
      note.hidden = true; injection.setAttribute('aria-expanded', 'false');
      if (updateUrl) {
        try { global.history.replaceState(null, '', ctx.route + (n >= 0 ? '?phase=' + (n + 1) : '')); } catch (e) { /* file:// keeps the selected UI. */ }
        var target = n >= 0 ? phaseArts[n] : map;
        if (target && typeof target.scrollIntoView === 'function' && global.innerHeight) {
          var rect = target.getBoundingClientRect();
          if (rect.top < 160 || rect.top > global.innerHeight * .6) target.scrollIntoView({ block: 'start', behavior: mq && mq.matches ? 'auto' : 'smooth' });
        }
      }
    }
    function filter() {
      var query = search.value.trim().toLowerCase(), count = 0;
      [].forEach.call(root.querySelectorAll('[data-course-stage]'), function (st) {
        var visible = 0;
        [].forEach.call(st.querySelectorAll('[data-course-scene]'), function (sc) { var show = (!query || sc.dataset.search.indexOf(query) >= 0) && (scope !== 'ready' || sc.dataset.ready === '1'); sc.hidden = !show; if (show) { visible++; count++; } });
        st.hidden = !visible;
      });
      [].forEach.call(root.querySelectorAll('[data-course-group]'), function (g) { g.hidden = ![].some.call(g.querySelectorAll('[data-course-stage]'), function (s) { return !s.hidden; }); });
      root.querySelector('[data-course-count]').textContent = count + ' 个场景';
      root.querySelector('[data-course-empty]').hidden = !!count;
      if (query || scope === 'ready') root.querySelector('[data-course-directory]').open = true;
    }
    function click(e) {
      var b = e.target.closest('[data-course-select]');
      if (b) { select(b.dataset.courseSelect, true); return; }
      if (e.target.closest('[data-course-image-retry]')) {
        map.dataset.courseImageState = 'loading'; map.setAttribute('aria-busy', 'true'); imageStatus.hidden = false; imageStatus.textContent = '正在载入课程图解…'; retry.hidden = true;
        var src = IMAGE + '?retry=' + Date.now(); image.src = src;
        [].forEach.call(root.querySelectorAll('.course-hotspot-art img, .course-phase-crop img'), function (img) { img.src = src; });
        return;
      }
      if (e.target.closest('[data-course-injection]')) { note.hidden = !note.hidden; injection.setAttribute('aria-expanded', String(!note.hidden)); return; }
      if (e.target.closest('[data-course-injection-close]')) { note.hidden = true; injection.setAttribute('aria-expanded', 'false'); injection.focus({ preventScroll: true }); return; }
      if (e.target.closest('[data-course-motion]')) { paused = !paused; motionState(); return; }
      b = e.target.closest('[data-course-scope]');
      if (b) { scope = b.dataset.courseScope; [].forEach.call(root.querySelectorAll('[data-course-scope]'), function (s) { s.setAttribute('aria-pressed', String(s === b)); }); filter(); }
    }
    function keydown(e) {
      var b = e.target.closest('[data-course-tab]'); if (!b) return;
      var next = Number(b.dataset.courseSelect);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (next + 2) % 6 - 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (next + 6) % 6 - 1;
      else if (e.key === 'Home') next = -1; else if (e.key === 'End') next = 4; else return;
      e.preventDefault(); select(next, true); root.querySelector('[data-course-tab][data-course-select="' + next + '"]').focus();
    }
    function preference() { if (!disposed) { paused = !!mq.matches; motionState(); } }
    root.addEventListener('click', click); root.addEventListener('keydown', keydown); search.addEventListener('input', filter);
    if (mq && mq.addEventListener) mq.addEventListener('change', preference);
    flows.forEach(function (f) { f.classList.toggle('is-dim', n >= 0 && Number(f.dataset.courseFlow) !== n); });
    motionState();
    return { destroy: function () { if (disposed) return; disposed = true; root.removeEventListener('click', click); root.removeEventListener('keydown', keydown); search.removeEventListener('input', filter); image.removeEventListener('load', imageReady); image.removeEventListener('error', imageFailed); if (mq && mq.removeEventListener) mq.removeEventListener('change', preference); [].forEach.call(root.querySelectorAll('[data-course-motion-svg]'), function (svg) { if (typeof svg.pauseAnimations === 'function') svg.pauseAnimations(); }); } };
  }
  global.CourseOutline = { render: render, bind: bind, phases: PHASES };
})(window);
