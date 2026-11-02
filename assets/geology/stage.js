/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE = 'assets/images/geology/geology-process-v2.webp';
  var IMAGE_SET = 'assets/images/geology/geology-process-v2-small.webp 768w, ' + IMAGE + ' 1448w';
  var IMAGE_SIZES = '(max-width:700px) calc(100vw - 28px), 1448px';
  var WIDTH = 1448, HEIGHT = 1086;
  var METHODS = [
    { id:'',abbr:'ALL',name:'完整流程',note:'从区域调查，到多源识别，再到同一坐标下的地质交叉核查。' },
    { id:'cv',abbr:'CV',name:'计算机视觉',note:'看影像、读图面、量裂缝。g1、g3、g4 已放大，点击图画进入对应讲解。' },
    { id:'opt',abbr:'OPT',name:'优化算法',note:'把多指标异常放回采样网格。g2 已放大，查看异常识别与空间聚类。' },
    { id:'nlp',abbr:'NLP',name:'自然语言处理',note:'把图例原文转为可追溯的岩性属性。g3 已放大，查看CV与NLP如何接力。' }
  ];
  var TECH = [
    {id:'g1',method:'cv',methods:['cv'],title:'遥感中的地表线索',color:'#f28a24',box:[20,326,343,353],art:[20,442,343,237],input:'同一网格的多光谱影像',output:'地表单元与边界候选'},
    {id:'g2',method:'opt',methods:['opt'],title:'采样点里的组合异常',color:'#2d9ed8',box:[378,326,343,353],art:[378,442,343,237],input:'带坐标的多指标化探值',output:'异常簇与复采候选'},
    {id:'g3',method:'cv',methods:['cv','nlp'],title:'从像素到有语义的要素',color:'#9262ce',box:[733,326,342,353],art:[733,442,342,237],input:'扫描地质图与图例原文',output:'断层折线、字符与岩性属性'},
    {id:'g4',method:'cv',methods:['cv'],title:'露头裂缝的二维几何',color:'#4b9b68',box:[1088,326,343,353],art:[1088,442,343,237],input:'带尺度的正射露头照片',output:'线迹、面内方向与密度'}
  ];
  function relevant(t,focus){return t.methods.indexOf(focus)>=0;}
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
      '<img src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" loading="lazy" decoding="async" alt="" width="1448" height="1086" draggable="false" style="width:' +
      (WIDTH / box[2] * 100).toFixed(5) + '%;left:' + (-box[0] / box[2] * 100).toFixed(5) +
      '%;top:' + (-box[1] / box[3] * 100).toFixed(5) + '%"></span>';
  }
  function effect(t) {
    var shapes={
      g1:'<path class="ml-trace ml-trace-vision" d="M174 138h142v93H174z"/><path class="ml-monitor-scan" d="M174 138v93"/><path class="ml-crosshair" d="M228 179h25m-12-12v24"/>',
      g2:'<g class="ml-uv-glow"><circle cx="187" cy="228" r="8"/><circle cx="212" cy="242" r="7"/><circle cx="175" cy="247" r="5"/></g><path class="ml-trace ml-trace-gas" d="M106 253l16-8 18-24 15 9 22-35 18 16 25-18 14 20"/>',
      g3:'<path class="ml-trace ml-trace-vision" d="M104 183h128v74H104z"/><g class="ml-report-lines"><path d="M126 204h85m-85 16h70m-70 16h78"/></g><path class="ml-trace ml-trace-rpm" d="M115 252l25-23 23 7 21-29 31 16"/>',
      g4:'<path class="ml-trace ml-trace-drill" d="M62 166l13 41-8 35 22 39m17-128-8 54 25 31-7 35m-68-67 68 6 17-14"/><circle class="ml-report-pulse" cx="220" cy="234" r="26"/>'
    };
    return '<svg class="ml-tech-effect" viewBox="0 0 '+t.box[2]+' '+t.box[3]+'" aria-hidden="true">'+shapes[t.id]+'</svg>';
  }
  function sceneHref(id) {
    var lesson={g1:'g1-remote-sensing',g2:'g2-geochemistry',g3:'g3-map-extraction',g4:'g4-outcrop-fractures'}[id];
    return '#/scene/'+id+'?case='+lesson+'&amp;tab=bg';
  }
  function spot(ctx, t, focus) {
    var sc = scene(ctx, t.id), b = t.box, active = focus && relevant(t, focus), esc = ctx.K.esc;
    return '<a class="ml-spot ml-spot-' + t.id + (active ? ' is-relevant' : focus ? ' is-dim' : '') +
      '" href="' + sceneHref(t.id) + '" data-ml-spot="' + t.id + '" data-ml-tech-method="' + t.methods.join(' ') +
      '" aria-label="' + esc(sc.name + '，' + t.methods.map(function(k){return method(k).name;}).join('与') + '，查看场景讲解') +
      '" style="--tech:' + t.color + ';left:' + (b[0] / WIDTH * 100).toFixed(5) + '%;top:' +
      (b[1] / HEIGHT * 100).toFixed(5) + '%;width:' + (b[2] / WIDTH * 100).toFixed(5) +
      '%;height:' + (b[3] / HEIGHT * 100).toFixed(5) + '%">' + crop(b) + effect(t) +
      '<span class="ml-spot-tag"><b>' + t.methods.map(function(k){return method(k).abbr;}).join(' + ') + '</b> 点击图画 · 查看讲解 <span>↗</span></span></a>';
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
    return '<svg class="ml-flows" data-ml-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+
      flow('M658 264V296H195Q178 296 178 322','#58b6ee',4.8,'g1')+
      flow('M658 264V296H548V322','#58b6ee',4.1,'g2')+
      flow('M658 264V296H895V322','#58b6ee',4.6,'g3')+
      flow('M658 264V296H1235Q1258 296 1258 322','#58b6ee',4.3,'g4')+
      flow('M196 680V691Q196 717 235 717H461Q512 717 520 745','#ffab40',5.7,'g1')+
      flow('M531 681V702Q531 720 565 720Q679 718 695 747','#40a7d4',3.8,'g2')+
      flow('M912 681V702Q912 720 877 720H801Q771 720 758 746','#a18bd6',4.2,'g3')+
      flow('M1271 681V699Q1271 723 1021 723H965Q921 723 918 747','#8ab578',5.6,'g4')+
      '<path class="ml-depth-scan" d="M460 934H999"/></svg>';
  }
  function deck(ctx, focus) {
    var esc = ctx.K.esc;
    return available(ctx).filter(function (t) { return !focus || relevant(t, focus); }).map(function (t) {
      var sc = scene(ctx, t.id), count = ctx.cases.bySceneAll(t.id).length;
      return '<a class="ml-read-card" href="' + sceneHref(t.id) + '" style="--tech:' + t.color + '">' +
        '<span class="ml-read-art">' + crop(t.art) + '<span class="ml-read-id">' + t.id.toUpperCase() + ' · ' + t.methods.map(function(k){return method(k).abbr;}).join(' + ') + '</span></span>' +
        '<div class="ml-read-text"><h3>' + esc(sc.name) + '</h3><p>' + esc(sc.point) + '</p>' +
        '<dl><div><dt>输入</dt><dd>' + esc(t.input) + '</dd></div><div><dt>输出</dt><dd>' + esc(t.output) + '</dd></div></dl>' +
        '<span class="ml-read-link">' + (count ? '查看讲解与案例 · ' + count + ' 个已接入' : '查看场景讲解') + '<b>↗</b></span></div></a>';
    }).join('');
  }
  function extraScenes(ctx) {
    var extra = ctx.stage.scenes.filter(function (sc) { return !TECH.some(function (t) { return t.id === sc.id; }); });
    if (!extra.length) return '';
    var esc = ctx.K.esc;
    return '<section class="ml-extra"><h2>更多地质勘察场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="ml-page gl-stage" data-geo-stage data-ml-stage data-ml-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">地质勘察</span></nav>' +
      '<header class="ml-head"><div><div class="ml-eyebrow"><span>01 / 13</span> GEOLOGICAL SURVEY · 地质勘察</div>' +
      '<h1>从地表线索，拼出地质底图<span>。</span></h1><p>跟着影像、采样、图件与露头，看看智能方法在哪里发挥作用。</p></div>' +
      '<div class="ml-head-note"><span class="ml-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="ml-lab" aria-label="地质勘察现场交互总览">' +
      '<div class="ml-toolbar"><div class="ml-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-ml-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="ml-map ml-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="ml-motion" type="button" data-ml-toggle aria-pressed="true"><span data-ml-toggle-icon>Ⅱ</span><span data-ml-toggle-label>暂停动效</span></button></div>' +
      '<div class="ml-status"><span class="ml-status-icon">↳</span><p data-ml-status role="status">' + method(focus).note + '</p><span class="ml-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="ml-map' + (focus ? ' has-focus' : '') + '" id="ml-map" data-ml-map data-ml-image-state="loading" aria-busy="true">' +
      '<img class="ml-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-ml-image width="1448" height="1086" draggable="false" alt="地质勘察流程：区域调查获取影像、样品、图件与露头照片，遥感解译、化探聚类、图件语义提取与裂缝统计汇入地质底图。">' +
      '<span class="ml-image-status" data-ml-image-status role="status">正在载入图解…</span><button class="ml-image-retry" type="button" data-ml-image-retry hidden>重新载入图解</button>' +
      '<div class="ml-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="ml-map-caption"><span class="ml-live-dot"></span><span data-ml-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="ml-map-footer"><span><b>01</b> 区域调查 <i>→</i> <b>02</b> 多源识别 <i>→</i> <b>03</b> 坐标对应 <i>→</i> <b>04</b> 交叉核查</span><p>影像、采样点与图件需核对坐标和尺度；每一条候选都要保留来源与复核记录。</p></div></section>' +
      '<section class="ml-reading' + (focus ? ' has-focus' : '') + '" data-ml-reading aria-labelledby="ml-reading-title"><div class="ml-reading-head"><div><span class="ml-eyebrow">EXPLORE THE SCENES</span><h2 id="ml-reading-title" data-ml-reading-title>' + (focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景') + '</h2></div><span data-ml-reading-count>' + (focus ? available(ctx).filter(function (t) { return relevant(t, focus); }).length : available(ctx).length) + ' 个图画入口 ↗</span></div>' +
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
    var map = root.querySelector('[data-ml-map]'), baseImage = root.querySelector('[data-ml-image]');
    var imageStatus = root.querySelector('[data-ml-image-status]'), imageRetry = root.querySelector('[data-ml-image-retry]');
    function imageReady() {
      if (disposed) return;
      map.dataset.mlImageState = 'ready'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = true; imageRetry.hidden = true;
    }
    function imageFailed() {
      if (disposed) return;
      map.dataset.mlImageState = 'error'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = false; imageStatus.textContent = '图解暂未载入'; imageRetry.hidden = false;
    }
    baseImage.addEventListener('load', imageReady); baseImage.addEventListener('error', imageFailed);
    if (baseImage.complete && baseImage.naturalWidth > 0) imageReady();

    function applyFocus(value, updateUrl) {
      focus = selected(value);
      root.dataset.mlMethod = focus;
      root.querySelector('[data-ml-map]').classList.toggle('has-focus', !!focus);
      root.querySelector('[data-ml-reading]').classList.toggle('has-focus', !!focus);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mlMethodButton === focus)); });
      spots.forEach(function (s) {
        s.classList.toggle('is-relevant', !!focus && s.dataset.mlTechMethod.split(' ').indexOf(focus) >= 0);
        s.classList.toggle('is-dim', !!focus && s.dataset.mlTechMethod.split(' ').indexOf(focus) < 0);
      });
      flows.forEach(function (f) {
        var t = TECH.filter(function (x) { return x.id === f.dataset.mlFlow; })[0];
        f.classList.toggle('is-dim', !!focus && t && !relevant(t, focus));
        f.classList.toggle('is-relevant', !!focus && t && relevant(t, focus));
      });
      root.querySelector('[data-ml-status]').textContent = method(focus).note;
      root.querySelector('[data-ml-reading-title]').textContent = focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景';
      root.querySelector('[data-ml-reading-count]').textContent = available(ctx).filter(function (t) { return !focus || relevant(t, focus); }).length + ' 个图画入口 ↗';
      root.querySelector('[data-ml-deck]').innerHTML = deck(ctx, focus);
      if (updateUrl) {
        try { global.history.replaceState(null, '', '#/stage/geology' + (focus ? '?m=' + focus : '')); }
        catch (e) { /* file:// can reject replaceState; the selected UI remains usable. */ }
        var first = spots.filter(function (s) { return s.dataset.mlTechMethod.split(' ').indexOf(focus) >= 0; })[0];
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
      if (e.target.closest('[data-ml-image-retry]')) {
        map.dataset.mlImageState = 'loading'; map.setAttribute('aria-busy', 'true');
        imageStatus.hidden = false; imageStatus.textContent = '正在载入图解…'; imageRetry.hidden = true;
        var retrySource = IMAGE + '?retry=' + Date.now();
        baseImage.srcset = ''; baseImage.src = retrySource;
        [].forEach.call(root.querySelectorAll('.ml-crop img'), function (image) { image.srcset = ''; image.src = retrySource; });
        return;
      }
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
      baseImage.removeEventListener('load', imageReady); baseImage.removeEventListener('error', imageFailed);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', preference);
      svgs.forEach(function (svg) { if (typeof svg.pauseAnimations === 'function') svg.pauseAnimations(); });
    } };
  }
  global.GeologyStage = { render:render, bind:bind, art:function(name,alt){return '<img src="assets/images/geology/'+name+'.webp" width="1536" height="1024" alt="'+global.GeologyMath.esc(alt)+'" decoding="async">';} };
})(window);
