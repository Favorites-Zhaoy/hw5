/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE = 'assets/images/drilling-process.webp';
  var IMAGE_SET = 'assets/images/drilling-process-small.webp 768w, ' + IMAGE + ' 1448w';
  var IMAGE_SIZES = '(max-width:700px) calc(100vw - 28px), 1448px';
  var WIDTH = 1448, HEIGHT = 1086;
  var METHODS = [{"id":"","abbr":"ALL","name":"完整流程","note":"同一钻井作业的资料支持五项任务，按现场问题选择案例。"},{"id":"ts","abbr":"TS","name":"时序分析","note":"D1、D2、D4、D5读取工况及历史记录，点击相应工位进入案例。"},{"id":"opt","abbr":"OPT","name":"优化算法","note":"D1、D3、D5在参数和工况边界内比较候选，点击工位进入案例。"}];
  var TECH = [{"id":"d1","method":"ts","methods":["ts","opt"],"title":"钻速预测与参数优化","color":"#f28a24","box":[209,408,300,306],"art":[219,481,280,223],"input":"前段ROP摘要、WOB、RPM、流量与相对可钻性指标","output":"候选参数与钻速"},{"id":"d2","method":"ts","methods":["ts"],"title":"井下复杂事故前兆预警","color":"#2d9ed8","box":[514,406,274,306],"art":[525,478,254,225],"input":"扭矩、立管压力、返出流量差与振动的历史窗口","output":"偏离正常联动的时段"},{"id":"d3","method":"opt","methods":["opt"],"title":"井眼轨迹智能控制","color":"#9262ce","box":[793,406,294,309],"art":[805,477,271,226],"input":"当前井斜、相对地层响应与允许的转向动作","output":"轨迹与转向候选"},{"id":"d4","method":"ts","methods":["ts"],"title":"钻具失效预测","color":"#4b9b68","box":[1092,407,345,315],"art":[1106,478,320,227],"input":"已服役时长、振动与扭矩历史摘要、转速","output":"剩余寿命趋势"},{"id":"d5","method":"ts","methods":["ts","opt"],"title":"钻井液性能智能调控","color":"#ef7028","box":[987,758,457,326],"art":[997,835,435,238],"input":"温度、盐度、前段黏度与处理剂剂量","output":"性质预测与剂量候选"}];

  function selected(value) {
    return METHODS.some(function (m) { return m.id === value; }) ? value : '';
  }
  function method(value) { return METHODS.filter(function (m) { return m.id === value; })[0] || METHODS[0]; }
  function available(ctx) {
    return TECH.filter(function (t) { return ctx.stage.scenes.some(function (s) { return s.id === t.id; }); });
  }
  function scene(ctx, id) { return ctx.stage.scenes.filter(function (s) { return s.id === id; })[0]; }
  function crop(box, className) {
    return '<span class="dmap-crop ' + (className || '') + '" style="aspect-ratio:' + box[2] + '/' + box[3] + '">' +
      '<img src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" loading="lazy" decoding="async" alt="" width="1448" height="1086" draggable="false" style="width:' +
      (WIDTH / box[2] * 100).toFixed(5) + '%;left:' + (-box[0] / box[2] * 100).toFixed(5) +
      '%;top:' + (-box[1] / box[3] * 100).toFixed(5) + '%"></span>';
  }
  var effect=function effects(t){
 var w=t.box[2],h=t.box[3],index=Number(t.id.slice(1))-1,well=STAGE_KIND==='welllog';
 var drilling=[
  '<path class="dmap-monitor-scan" d="M92 85V155"/><path class="dmap-trace dmap-trace-gas" d="M104 111l20-3 12-15 16 12 18-4 16-12 23 6"/>',
  '<path class="dmap-trace dmap-trace-gas" d="M111 118l17-1 9-25 10 24 20-7 14 6 12-18 11 15 24-5"/><path class="dmap-monitor-scan" d="M148 87V201"/>',
  '<path class="dmap-trace dmap-trace-drill" d="M80 91Q94 152 151 163T245 168"/><circle class="dmap-report-pulse" cx="240" cy="129" r="15"/>',
  '<circle class="dmap-report-pulse" cx="139" cy="127" r="24"/><path class="dmap-trace dmap-trace-rpm" d="M213 112l14 8 13-5 15 16 19-6"/>',
  '<path class="dmap-trace dmap-trace-gas" d="M174 136l20-6 13-12 20-2 17-11"/><circle class="dmap-report-pulse" cx="411" cy="136" r="18"/>'
 ];
 var logging=[
  '<path class="dmap-depth-scan" d="M93 119H283"/><path class="dmap-monitor-scan" d="M196 88V171"/>',
  '<circle class="dmap-report-pulse" cx="213" cy="122" r="19"/><path class="dmap-trace dmap-trace-rpm" d="M176 149l9-18-4-18 14-15 2-14"/>',
  '<path class="dmap-trace dmap-trace-vision" d="M146 107Q170 85 191 107T273 109"/><path class="dmap-monitor-scan" d="M175 87V169"/>',
  '<path class="dmap-depth-scan" d="M66 133H275"/><path class="dmap-trace dmap-trace-drill" d="M101 92l-6 15 9 14-10 12 7 15-8 16"/>',
  '<g class="dmap-report-lines"><path d="M237 126l13 6-8 10 16 5-7 12 14 7"/></g><circle class="dmap-report-pulse" cx="254" cy="151" r="18"/>'
 ];
 return '<svg class="dmap-tech-effect" viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+(well?logging:drilling)[index]+'</svg>';
};
  function sceneHref(id) {
    var lesson = {"d1":"drilling-d1","d2":"drilling-d2","d3":"drilling-d3","d4":"drilling-d4","d5":"drilling-d5"}[id];
    return '#/scene/' + id + (lesson ? '?case=' + lesson + '&amp;tab=bg' : '');
  }
  function spot(ctx, t, focus) {
    var sc = scene(ctx, t.id), b = t.box, active = focus && t.methods.indexOf(focus) >= 0, esc = ctx.K.esc;
    return '<a class="dmap-spot dmap-spot-' + t.id + (active ? ' is-relevant' : focus ? ' is-dim' : '') +
      '" href="' + sceneHref(t.id) + '" data-dmap-spot="' + t.id + '" data-dmap-tech-method="' + t.method +
      '" aria-label="' + esc(sc.name + '，' + method(t.method).name + '，查看场景讲解') +
      '" style="--tech:' + t.color + ';left:' + (b[0] / WIDTH * 100).toFixed(5) + '%;top:' +
      (b[1] / HEIGHT * 100).toFixed(5) + '%;width:' + (b[2] / WIDTH * 100).toFixed(5) +
      '%;height:' + (b[3] / HEIGHT * 100).toFixed(5) + '%">' + crop(b) + effect(t) +
      '<span class="dmap-spot-tag"><b>' + t.methods.map(function(m){return method(m).abbr;}).join(' + ') + '</b> 点击图画 · 查看讲解 <span>↗</span></span></a>';
  }
  function flow(path, color, duration, id) {
    var tag = id ? ' data-dmap-flow="' + id + '"' : '';
    return '<g class="dmap-flow"' + tag + ' style="--flow:' + color + '">' +
      '<path class="dmap-flow-track" d="' + path + '"/><path class="dmap-flow-current" d="' + path + '"/>' +
      [0, 1].map(function (i) {
        return '<g class="dmap-moving-arrow"><path d="M-10-6 0 0-10 6M-19-6-9 0-19 6"/>' +
          '<animateMotion dur="' + duration + 's" begin="' + (-duration * i / 2) + 's" repeatCount="indefinite" rotate="auto" path="' + path + '"/></g>';
      }).join('') + '</g>';
  }
  var STAGE_KIND="drilling";var drawing=function drawing(){
 var parts=[],colors=['#ffab40','#40a7d4','#a18bd6','#8ab578'],well=STAGE_KIND==='welllog';
 var paths=well?['M335 674C335 719 501 700 609 735','M651 674Q665 718 707 737','M962 679Q924 712 760 738','M1281 680Q1210 732 915 738']:['M360 704C355 753 460 735 568 764','M643 701Q660 741 690 764','M935 705Q920 738 737 764','M1237 710Q1190 755 902 764'];
 for(var i=0;i<4;i++)parts.push(flow(paths[i],colors[i],4+i*.45,TECH[i].id));
 return '<svg class="dmap-flows" data-dmap-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+
 flow(well?'M151 367V939':'M143 369V787','#ffc238',5)+flow(well?'M164 937V369':'M155 789V369','#58b6ee',5.5)+
 flow(well?'M779 307V332H430Q402 332 396 370':'M728 330V357Q728 367 690 367H375Q360 367 356 399','#58b6ee',5)+
 flow(well?'M780 308V330Q780 337 697 337L675 370':'M729 329V358Q729 369 657 369L638 399','#58b6ee',3.5)+
 flow(well?'M795 309V331Q795 337 888 337L920 370':'M741 330V355Q741 369 876 369L911 399','#58b6ee',3.8)+
 flow(well?'M803 309V332H1193Q1228 332 1240 369':'M750 330V357Q750 366 1174 366L1196 399','#58b6ee',5.2)+parts.join('')+
 flow(well?'M974 845L1032 869':'M958 856L999 887','#ff963c',3.5,TECH[4].id)+
 '<path class="dmap-depth-scan" d="M445 901H861"/><circle class="dmap-drill-pulse" cx="'+(well?151:145)+'" cy="'+(well?731:803)+'" r="23"/></svg>';
};
  function deck(ctx, focus) {
    var esc = ctx.K.esc;
    return available(ctx).filter(function (t) { return !focus || t.methods.indexOf(focus) >= 0; }).map(function (t) {
      var sc = scene(ctx, t.id), count = ctx.cases.bySceneAll(t.id).length;
      return '<a class="dmap-read-card" href="' + sceneHref(t.id) + '" style="--tech:' + t.color + '">' +
        '<span class="dmap-read-art">' + crop(t.art) + '<span class="dmap-read-id">' + t.id.toUpperCase() + ' · ' + t.methods.map(function(m){return method(m).abbr;}).join(' + ') + '</span></span>' +
        '<div class="dmap-read-text"><h3>' + esc(sc.name) + '</h3><p>' + esc(sc.point) + '</p>' +
        '<dl><div><dt>输入</dt><dd>' + esc(t.input) + '</dd></div><div><dt>输出</dt><dd>' + esc(t.output) + '</dd></div></dl>' +
        '<span class="dmap-read-link">' + (count ? '查看讲解与案例 · ' + count + ' 个已接入' : '查看场景讲解') + '<b>↗</b></span></div></a>';
    }).join('');
  }
  function extraScenes(ctx) {
    var extra = ctx.stage.scenes.filter(function (sc) { return !TECH.some(function (t) { return t.id === sc.id; }); });
    if (!extra.length) return '';
    var esc = ctx.K.esc;
    return '<section class="dmap-extra"><h2>更多钻井场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="dmap-page" data-drilling-stage data-dmap-stage data-dmap-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">钻井</span></nav>' +
      '<header class="dmap-head"><div><div class="dmap-eyebrow"><span>03 / 13</span> DRILLING · 钻井</div>' +
      '<h1>从井口到井底，看懂钻井作业<span>。</span></h1><p>跟着钻头、工况和作业记录，看看智能方法怎样帮助钻井判断。</p></div>' +
      '<div class="dmap-head-note"><span class="dmap-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="dmap-lab" aria-label="钻井现场交互总览">' +
      '<div class="dmap-toolbar"><div class="dmap-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-dmap-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="dmap-map dmap-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="dmap-motion" type="button" data-dmap-toggle aria-pressed="true"><span data-dmap-toggle-icon>Ⅱ</span><span data-dmap-toggle-label>暂停动效</span></button></div>' +
      '<div class="dmap-status"><span class="dmap-status-icon">↳</span><p data-dmap-status role="status">' + method(focus).note + '</p><span class="dmap-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="dmap-map' + (focus ? ' has-focus' : '') + '" id="dmap-map" data-dmap-map data-dmap-image-state="loading" aria-busy="true">' +
      '<img class="dmap-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-dmap-image width="1448" height="1086" draggable="false" alt="从钻头破岩与循环，到现场资料采集，再比较参数、异常、轨迹、钻具和钻井液任务。">' +
      '<span class="dmap-image-status" data-dmap-image-status role="status">正在载入图解…</span><button class="dmap-image-retry" type="button" data-dmap-image-retry hidden>重新载入图解</button>' +
      '<div class="dmap-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="dmap-map-caption"><span class="dmap-live-dot"></span><span data-dmap-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="dmap-map-footer"><span><b>01</b> 现场钻进 <i>→</i> <b>02</b> 资料采集 <i>→</i> <b>03</b> 工况对齐 <i>→</i> <b>04</b> 参数与状态判断</span><p>五项任务共用作业背景，各有输入和成果；图中的连线不要求五种算法依次执行。</p></div></section>' +
      '<section class="dmap-reading' + (focus ? ' has-focus' : '') + '" data-dmap-reading aria-labelledby="dmap-reading-title"><div class="dmap-reading-head"><div><span class="dmap-eyebrow">EXPLORE THE SCENES</span><h2 id="dmap-reading-title" data-dmap-reading-title>' + (focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景') + '</h2></div><span data-dmap-reading-count>' + (focus ? available(ctx).filter(function (t) { return t.methods.indexOf(focus) >= 0; }).length : available(ctx).length) + ' 个图画入口 ↗</span></div>' +
      '<div class="dmap-deck" id="dmap-deck" data-dmap-deck>' + deck(ctx, focus) + '</div></section>' + extraScenes(ctx) +
      '<div class="pager">' + (prev ? '<a class="prev" href="#/stage/' + esc(prev.id) + '"><span class="dir">← 上一环节</span><span class="nm">' + esc(prev.name) + '</span></a>' : '') +
      (next ? '<a class="next" href="#/stage/' + esc(next.id) + '"><span class="dir">下一环节 →</span><span class="nm">' + esc(next.name) + '</span></a>' : '') + '</div></main>';
  }

  function bind(root, ctx) {
    if (!root) return { destroy: function () {} };
    var focus = selected((ctx.query || {}).m), disposed = false;
    var buttons = [].slice.call(root.querySelectorAll('[data-dmap-method-button]'));
    var spots = [].slice.call(root.querySelectorAll('[data-dmap-spot]'));
    var flows = [].slice.call(root.querySelectorAll('[data-dmap-flow]'));
    var svgs = [].slice.call(root.querySelectorAll('[data-dmap-motion]'));
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var paused = !!(mq && mq.matches);
    var map = root.querySelector('[data-dmap-map]'), baseImage = root.querySelector('[data-dmap-image]');
    var imageStatus = root.querySelector('[data-dmap-image-status]'), imageRetry = root.querySelector('[data-dmap-image-retry]');
    function imageReady() {
      if (disposed) return;
      map.dataset.dmapImageState = 'ready'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = true; imageRetry.hidden = true;
    }
    function imageFailed() {
      if (disposed) return;
      map.dataset.dmapImageState = 'error'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = false; imageStatus.textContent = '图解暂未载入'; imageRetry.hidden = false;
    }
    baseImage.addEventListener('load', imageReady); baseImage.addEventListener('error', imageFailed);
    if (baseImage.complete && baseImage.naturalWidth > 0) imageReady();

    function applyFocus(value, updateUrl) {
      focus = selected(value);
      root.dataset.dmapMethod = focus;
      root.querySelector('[data-dmap-map]').classList.toggle('has-focus', !!focus);
      root.querySelector('[data-dmap-reading]').classList.toggle('has-focus', !!focus);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.dmapMethodButton === focus)); });
      spots.forEach(function (s) {
        s.classList.toggle('is-relevant', !!focus && TECH.some(function(t){return t.id===s.dataset.dmapSpot && t.methods.indexOf(focus)>=0;}));
        s.classList.toggle('is-dim', !!focus && !TECH.some(function(t){return t.id===s.dataset.dmapSpot && t.methods.indexOf(focus)>=0;}));
      });
      flows.forEach(function (f) {
        var t = TECH.filter(function (x) { return x.id === f.dataset.dmapFlow; })[0];
        f.classList.toggle('is-dim', !!focus && t && t.methods.indexOf(focus) < 0);
        f.classList.toggle('is-relevant', !!focus && t && t.methods.indexOf(focus) >= 0);
      });
      root.querySelector('[data-dmap-status]').textContent = method(focus).note;
      root.querySelector('[data-dmap-reading-title]').textContent = focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景';
      root.querySelector('[data-dmap-reading-count]').textContent = available(ctx).filter(function (t) { return !focus || t.methods.indexOf(focus) >= 0; }).length + ' 个图画入口 ↗';
      root.querySelector('[data-dmap-deck]').innerHTML = deck(ctx, focus);
      if (updateUrl) {
        try { global.history.replaceState(null, '', '#/stage/drilling' + (focus ? '?m=' + focus : '')); }
        catch (e) { /* file:// can reject replaceState; the selected UI remains usable. */ }
        var first = spots.filter(function (s) { return TECH.some(function(t){return t.id===s.dataset.dmapSpot && t.methods.indexOf(focus)>=0;}); })[0];
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
      root.querySelector('[data-dmap-toggle]').setAttribute('aria-pressed', String(!paused));
      root.querySelector('[data-dmap-toggle-icon]').textContent = paused ? '▶' : 'Ⅱ';
      root.querySelector('[data-dmap-toggle-label]').textContent = paused ? '播放动效' : '暂停动效';
      root.querySelector('[data-dmap-running]').textContent = paused ? '动效已暂停 · 仍可点击探索' : '信号正在流动';
      svgs.forEach(function (svg) {
        var action = paused ? 'pauseAnimations' : 'unpauseAnimations';
        if (typeof svg[action] === 'function') svg[action]();
      });
    }
    function click(e) {
      if (e.target.closest('[data-dmap-image-retry]')) {
        map.dataset.dmapImageState = 'loading'; map.setAttribute('aria-busy', 'true');
        imageStatus.hidden = false; imageStatus.textContent = '正在载入图解…'; imageRetry.hidden = true;
        var retrySource = IMAGE + '?retry=' + Date.now();
        baseImage.srcset = ''; baseImage.src = retrySource;
        [].forEach.call(root.querySelectorAll('.dmap-crop img'), function (image) { image.srcset = ''; image.src = retrySource; });
        return;
      }
      var choice = e.target.closest('[data-dmap-method-button]');
      if (choice) { applyFocus(choice.dataset.dmapMethodButton, true); return; }
      if (e.target.closest('[data-dmap-toggle]')) { paused = !paused; applyMotion(); }
    }
    function keydown(e) {
      var choice = e.target.closest('[data-dmap-method-button]');
      if (!choice) return;
      var i = buttons.indexOf(choice), n = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % buttons.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + buttons.length) % buttons.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = buttons.length - 1;
      else return;
      e.preventDefault(); buttons[n].focus(); applyFocus(buttons[n].dataset.dmapMethodButton, true);
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
  global.DrillingStage = { render: render, bind: bind, html: render, mount: bind };
})(window);
