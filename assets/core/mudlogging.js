/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE = 'assets/images/mudlogging-process.png';
  var WIDTH = 1448, HEIGHT = 1086;
  var METHODS = [
    { id: '', abbr: 'ALL', name: '完整流程', note: '从井底取样，到地面分析，再到同一深度轴上的证据汇总。' },
    { id: 'cv', abbr: 'CV', name: '计算机视觉', note: '看图识岩、看光识显示。m1 与 m3 已放大，点击图画进入对应讲解。' },
    { id: 'ts', abbr: 'TS', name: '时序分析', note: '读懂随时间与深度变化的曲线。m2 与 m4 已放大，点击图画进入对应讲解。' },
    { id: 'nlp', abbr: 'NLP', name: '自然语言处理', note: '把多源证据组织成可追溯的文字。m5 已放大，点击图画进入报告生成讲解。' }
  ];
  var TECH = [
    { id: 'm1', method: 'cv', title: '岩屑里的地层线索', color: '#f28a24', box: [211, 438, 295, 305], art: [211, 548, 295, 197], input: '清洗、拍照后的岩屑图像', output: '岩性类别与组分比例' },
    { id: 'm2', method: 'ts', title: '气测曲线中的异常', color: '#2d9ed8', box: [520, 439, 277, 301], art: [520, 548, 277, 191], input: '全烃、组分与工况序列', output: '异常层段与解释线索' },
    { id: 'm3', method: 'cv', title: '紫外光下的含油显示', color: '#9262ce', box: [809, 439, 290, 305], art: [809, 548, 290, 195], input: '固定灯源与曝光的荧光图像', output: '荧光区域与级别建议' },
    { id: 'm4', method: 'ts', title: '钻时变化中的层界', color: '#4b9b68', box: [1115, 439, 322, 307], art: [1115, 551, 322, 195], input: '钻时、钻压、转速等工况', output: '候选层界与交叉验证' },
    { id: 'm5', method: 'nlp', title: '让每条结论都有出处', color: '#ef7028', box: [1040, 802, 404, 284], art: [1040, 920, 404, 166], input: '分层、油气显示与异常记录', output: '带证据来源的报告初稿' }
  ];

  function selected(value) {
    return METHODS.some(function (m) { return m.id === value; }) ? value : '';
  }
  function method(value) { return METHODS.filter(function (m) { return m.id === value; })[0] || METHODS[0]; }
  function available(ctx) {
    return TECH.filter(function (t) { return ctx.stage.scenes.some(function (s) { return s.id === t.id; }); });
  }
  function scene(ctx, id) { return ctx.stage.scenes.filter(function (s) { return s.id === id; })[0]; }
  function crop(box, className) {
    return '<span class="ml-crop ' + (className || '') + '" style="aspect-ratio:' + box[2] + '/' + box[3] + '">' +
      '<img src="' + IMAGE + '" alt="" width="1448" height="1086" draggable="false" style="width:' +
      (WIDTH / box[2] * 100).toFixed(5) + '%;left:' + (-box[0] / box[2] * 100).toFixed(5) +
      '%;top:' + (-box[1] / box[3] * 100).toFixed(5) + '%"></span>';
  }
  function effect(t) {
    var shapes = {
      m1: '<path class="ml-trace ml-trace-vision" d="M129 126h112v66H129z"/><path class="ml-crosshair" d="M166 159h24m-12-12v24"/>',
      m2: '<path class="ml-trace ml-trace-gas" d="M87 198l9-3 6-18 6 15 10-7 8 3 7-33 7 29 10-8 8 6 8-14 8 7 9-54 8 47 8 15 10-5"/><path class="ml-monitor-scan" d="M86 132v78"/>',
      m3: '<g class="ml-uv-glow"><circle cx="177" cy="167" r="13"/><circle cx="226" cy="171" r="10"/><circle cx="70" cy="176" r="9"/></g><path class="ml-uv-star" d="M177 148v38m-19-19h38m-32-13 26 26m0-26-26 26"/>',
      m4: '<path class="ml-trace ml-trace-drill" d="M130 137l-5 10 11 7-12 10 15 7-11 12 8 9-10 10 6 13"/><path class="ml-trace ml-trace-rpm" d="M199 137l5 10-11 7 12 10-15 7 11 12-8 9 10 10-6 13"/>',
      m5: '<g class="ml-report-lines"><path d="M105 157l99-18m-96 28 99-18m-96 28 81-15"/></g><circle class="ml-report-pulse" cx="288" cy="229" r="13"/>'
    };
    return '<svg class="ml-tech-effect" viewBox="0 0 ' + t.box[2] + ' ' + t.box[3] + '" aria-hidden="true">' + shapes[t.id] + '</svg>';
  }
  function spot(ctx, t, focus) {
    var sc = scene(ctx, t.id), b = t.box, active = focus && focus === t.method, esc = ctx.K.esc;
    return '<a class="ml-spot ml-spot-' + t.id + (active ? ' is-relevant' : focus ? ' is-dim' : '') +
      '" href="#/scene/' + t.id + '" data-ml-spot="' + t.id + '" data-ml-tech-method="' + t.method +
      '" aria-label="' + esc(sc.name + '，' + method(t.method).name + '，查看场景讲解') +
      '" style="--tech:' + t.color + ';left:' + (b[0] / WIDTH * 100).toFixed(5) + '%;top:' +
      (b[1] / HEIGHT * 100).toFixed(5) + '%;width:' + (b[2] / WIDTH * 100).toFixed(5) +
      '%;height:' + (b[3] / HEIGHT * 100).toFixed(5) + '%">' + crop(b) + effect(t) +
      '<span class="ml-spot-tag"><b>' + method(t.method).abbr + '</b> 点击图画 · 查看讲解 <span>↗</span></span></a>';
  }
  function flow(path, color, duration, id) {
    var tag = id ? ' data-ml-flow="' + id + '"' : '';
    return '<g class="ml-flow"' + tag + ' style="--flow:' + color + '">' +
      '<path class="ml-flow-track" d="' + path + '"/><path class="ml-flow-current" d="' + path + '"/>' +
      [0, 1].map(function (i) {
        return '<g class="ml-moving-arrow"><path d="M-10-6 0 0-10 6M-19-6-9 0-19 6"/>' +
          '<animateMotion dur="' + duration + 's" begin="' + (-duration * i / 2) + 's" repeatCount="indefinite" rotate="auto" path="' + path + '"/></g>';
      }).join('') + '</g>';
  }
  function drawing() {
    return '<svg class="ml-flows" data-ml-motion="" viewBox="0 0 1448 1086" aria-hidden="true">' +
      flow('M132 359V663', '#ffc238', 4.4) + flow('M144 658V353', '#ff8c35', 4.8) +
      flow('M172 332C238 343 263 378 321 343S449 266 551 268L581 277', '#fcbf46', 6.6) +
      flow('M720 249V224Q720 206 746 205H815', '#efb347', 3.2) +
      flow('M779 374Q779 403 745 403H449Q411 403 397 433', '#58b6ee', 5.2, 'm1') +
      flow('M779 374Q785 406 753 406H685Q666 406 652 432', '#58b6ee', 3.7, 'm2') +
      flow('M792 375Q792 403 829 403H861Q894 403 908 433', '#58b6ee', 3.8, 'm3') +
      flow('M794 375Q794 403 842 403H1176Q1204 403 1212 433', '#58b6ee', 5.5, 'm4') +
      flow('M325 740C370 783 419 767 482 770S562 763 586 785', '#ffab40', 4.8, 'm1') +
      flow('M597 735C619 751 689 751 701 784', '#40a7d4', 3.3, 'm2') +
      flow('M890 739C863 762 791 754 750 784', '#a18bd6', 3.6, 'm3') +
      flow('M1157 748C1098 783 1029 766 979 770S912 770 894 785', '#8ab578', 5.1, 'm4') +
      flow('M1016 908Q1046 929 1085 939', '#ff963c', 3.4, 'm5') +
      '<g class="ml-steam"><circle cx="858" cy="151" r="8"/><circle cx="881" cy="144" r="6"/><circle cx="867" cy="131" r="9"/></g>' +
      '<path class="ml-depth-scan" d="M628 851H929"/><circle class="ml-drill-pulse" cx="134" cy="697" r="26"/>' +
      '</svg>';
  }
  function deck(ctx, focus) {
    var esc = ctx.K.esc;
    return available(ctx).filter(function (t) { return !focus || t.method === focus; }).map(function (t) {
      var sc = scene(ctx, t.id), count = ctx.cases.bySceneAll(t.id).length;
      return '<a class="ml-read-card" href="#/scene/' + t.id + '" style="--tech:' + t.color + '">' +
        '<span class="ml-read-art">' + crop(t.art) + '<span class="ml-read-id">' + t.id.toUpperCase() + ' · ' + method(t.method).abbr + '</span></span>' +
        '<div class="ml-read-text"><h3>' + esc(sc.name) + '</h3><p>' + esc(sc.point) + '</p>' +
        '<dl><div><dt>输入</dt><dd>' + esc(t.input) + '</dd></div><div><dt>输出</dt><dd>' + esc(t.output) + '</dd></div></dl>' +
        '<span class="ml-read-link">' + (count ? '查看讲解与案例 · ' + count + ' 个已接入' : '查看场景讲解') + '<b>↗</b></span></div></a>';
    }).join('');
  }
  function extraScenes(ctx) {
    var extra = ctx.stage.scenes.filter(function (sc) { return !TECH.some(function (t) { return t.id === sc.id; }); });
    if (!extra.length) return '';
    var esc = ctx.K.esc;
    return '<section class="ml-extra"><h2>更多录井场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="ml-page" data-ml-stage data-ml-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">录井</span></nav>' +
      '<header class="ml-head"><div><div class="ml-eyebrow"><span>04 / 13</span> MUD LOGGING · 录井</div>' +
      '<h1>看见地下，读懂每一米<span>。</span></h1><p>跟着岩屑与气体回到地面，看看智能方法在哪里发挥作用。</p></div>' +
      '<div class="ml-head-note"><span class="ml-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="ml-lab" aria-label="录井现场交互总览">' +
      '<div class="ml-toolbar"><div class="ml-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-ml-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="ml-map ml-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="ml-motion" type="button" data-ml-toggle aria-pressed="true"><span data-ml-toggle-icon>Ⅱ</span><span data-ml-toggle-label>暂停动效</span></button></div>' +
      '<div class="ml-status"><span class="ml-status-icon">↳</span><p data-ml-status role="status">' + method(focus).note + '</p><span class="ml-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="ml-map' + (focus ? ' has-focus' : '') + '" id="ml-map" data-ml-map>' +
      '<img class="ml-base" src="' + IMAGE + '" width="1448" height="1086" draggable="false" alt="录井流程：钻头破岩，钻井液携带岩屑与气体返回地面，经过岩性、气测、荧光、钻时分析，统一深度并汇总报告。">' +
      '<div class="ml-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="ml-map-caption"><span class="ml-live-dot"></span><span data-ml-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="ml-map-footer"><span><b>01</b> 井底取样 <i>→</i> <b>02</b> 地面分析 <i>→</i> <b>03</b> 深度对齐 <i>→</i> <b>04</b> 证据汇总</span><p>岩屑与气测需做迟到校正；钻时还需结合钻压、转速等工况解读。</p></div></section>' +
      '<section class="ml-reading' + (focus ? ' has-focus' : '') + '" data-ml-reading aria-labelledby="ml-reading-title"><div class="ml-reading-head"><div><span class="ml-eyebrow">EXPLORE THE SCENES</span><h2 id="ml-reading-title" data-ml-reading-title>' + (focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景') + '</h2></div><span data-ml-reading-count>' + (focus ? available(ctx).filter(function (t) { return t.method === focus; }).length : available(ctx).length) + ' 个图画入口 ↗</span></div>' +
      '<div class="ml-deck" id="ml-deck" data-ml-deck>' + deck(ctx, focus) + '</div></section>' + extraScenes(ctx) +
      '<div class="pager">' + (prev ? '<a class="prev" href="#/stage/' + esc(prev.id) + '"><span class="dir">← 上一环节</span><span class="nm">' + esc(prev.name) + '</span></a>' : '') +
      (next ? '<a class="next" href="#/stage/' + esc(next.id) + '"><span class="dir">下一环节 →</span><span class="nm">' + esc(next.name) + '</span></a>' : '') + '</div></main>';
  }

  function bind(root, ctx) {
    if (!root) return { destroy: function () {} };
    var focus = selected((ctx.query || {}).m), disposed = false;
    var buttons = [].slice.call(root.querySelectorAll('[data-ml-method-button]'));
    var spots = [].slice.call(root.querySelectorAll('[data-ml-spot]'));
    var flows = [].slice.call(root.querySelectorAll('[data-ml-flow]'));
    var svgs = [].slice.call(root.querySelectorAll('[data-ml-motion]'));
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var paused = !!(mq && mq.matches);

    function applyFocus(value, updateUrl) {
      focus = selected(value);
      root.dataset.mlMethod = focus;
      root.querySelector('[data-ml-map]').classList.toggle('has-focus', !!focus);
      root.querySelector('[data-ml-reading]').classList.toggle('has-focus', !!focus);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mlMethodButton === focus)); });
      spots.forEach(function (s) {
        s.classList.toggle('is-relevant', !!focus && s.dataset.mlTechMethod === focus);
        s.classList.toggle('is-dim', !!focus && s.dataset.mlTechMethod !== focus);
      });
      flows.forEach(function (f) {
        var t = TECH.filter(function (x) { return x.id === f.dataset.mlFlow; })[0];
        f.classList.toggle('is-dim', !!focus && t && t.method !== focus);
        f.classList.toggle('is-relevant', !!focus && t && t.method === focus);
      });
      root.querySelector('[data-ml-status]').textContent = method(focus).note;
      root.querySelector('[data-ml-reading-title]').textContent = focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景';
      root.querySelector('[data-ml-reading-count]').textContent = available(ctx).filter(function (t) { return !focus || t.method === focus; }).length + ' 个图画入口 ↗';
      root.querySelector('[data-ml-deck]').innerHTML = deck(ctx, focus);
      if (updateUrl) {
        try { global.history.replaceState(null, '', '#/stage/mudlogging' + (focus ? '?m=' + focus : '')); }
        catch (e) { /* file:// can reject replaceState; the selected UI remains usable. */ }
        var first = spots.filter(function (s) { return s.dataset.mlTechMethod === focus; })[0];
        if (first && global.innerHeight) {
          var rect = first.getBoundingClientRect();
          if (rect.top < 130 || rect.bottom > global.innerHeight - 25) {
            first.scrollIntoView({ block: 'center', inline: 'nearest', behavior: mq && mq.matches ? 'auto' : 'smooth' });
          }
        }
      }
    }
    function applyMotion() {
      root.classList.toggle('is-paused', paused);
      root.classList.toggle('is-playing', !paused);
      root.querySelector('[data-ml-toggle]').setAttribute('aria-pressed', String(!paused));
      root.querySelector('[data-ml-toggle-icon]').textContent = paused ? '▶' : 'Ⅱ';
      root.querySelector('[data-ml-toggle-label]').textContent = paused ? '播放动效' : '暂停动效';
      root.querySelector('[data-ml-running]').textContent = paused ? '动效已暂停 · 仍可点击探索' : '信号正在流动';
      svgs.forEach(function (svg) {
        var action = paused ? 'pauseAnimations' : 'unpauseAnimations';
        if (typeof svg[action] === 'function') svg[action]();
      });
    }
    function click(e) {
      var choice = e.target.closest('[data-ml-method-button]');
      if (choice) { applyFocus(choice.dataset.mlMethodButton, true); return; }
      if (e.target.closest('[data-ml-toggle]')) { paused = !paused; applyMotion(); }
    }
    function keydown(e) {
      var choice = e.target.closest('[data-ml-method-button]');
      if (!choice) return;
      var i = buttons.indexOf(choice), n = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % buttons.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + buttons.length) % buttons.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = buttons.length - 1;
      else return;
      e.preventDefault(); buttons[n].focus(); applyFocus(buttons[n].dataset.mlMethodButton, true);
    }
    function preference() { if (!disposed) { paused = !!mq.matches; applyMotion(); } }
    root.addEventListener('click', click);
    root.addEventListener('keydown', keydown);
    if (mq && mq.addEventListener) mq.addEventListener('change', preference);
    applyFocus(focus, false); applyMotion();
    return { destroy: function () {
      if (disposed) return;
      disposed = true;
      root.removeEventListener('click', click); root.removeEventListener('keydown', keydown);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', preference);
      svgs.forEach(function (svg) { if (typeof svg.pauseAnimations === 'function') svg.pauseAnimations(); });
    } };
  }
  global.MudloggingStage = { render: render, bind: bind };
})(window);
