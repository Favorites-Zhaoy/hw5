/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE = 'assets/images/welllog-process.webp';
  var IMAGE_SET = 'assets/images/welllog-process-small.webp 768w, ' + IMAGE + ' 1448w';
  var IMAGE_SIZES = '(max-width:700px) calc(100vw - 28px), 1448px';
  var WIDTH = 1448, HEIGHT = 1086;
  var METHODS = [{"id":"","abbr":"ALL","name":"完整流程","note":"从井下测量，到资料对齐，再查看五个解释与修复任务。"},{"id":"cv","abbr":"CV","name":"计算机视觉","note":"W3读取井壁展开图，圈出裂缝候选，点击图画进入案例。"},{"id":"ts","abbr":"TS","name":"时序分析","note":"W1、W2、W4、W5沿井深组织曲线，点击相应工位进入案例。"},{"id":"opt","abbr":"OPT","name":"优化算法","note":"W2用多曲线约束孔隙度解释，点击相应工位进入案例。"}];
  var TECH = [{"id":"w1","method":"ts","methods":["ts"],"title":"曲线智能分层","color":"#f28a24","box":[211,378,301,310],"art":[218,444,288,233],"input":"同一井段的GR、密度、中子、电阻率曲线","output":"同一井深的候选层界"},{"id":"w2","method":"ts","methods":["ts","opt"],"title":"储层参数解释","color":"#2d9ed8","box":[518,379,296,308],"art":[526,449,278,229],"input":"GR、密度、中子与电阻率的同深度记录","output":"孔隙度曲线与误差"},{"id":"w3","method":"cv","methods":["cv"],"title":"井壁裂缝分割","color":"#9262ce","box":[815,379,294,309],"art":[826,445,273,237],"input":"井壁展开灰度教学图像","output":"裂缝候选掩膜"},{"id":"w4","method":"ts","methods":["ts"],"title":"多曲线岩性识别","color":"#4b9b68","box":[1116,379,317,314],"art":[1126,446,298,239],"input":"同井深的四种测井响应","output":"逐深度岩性候选"},{"id":"w5","method":"ts","methods":["ts"],"title":"缺失曲线修复","color":"#ef7028","box":[1053,732,384,352],"art":[1058,806,370,267],"input":"人工遮挡GR后的多曲线深度窗口","output":"带来源标记的重建曲线"}];

  function selected(value) {
    return METHODS.some(function (m) { return m.id === value; }) ? value : '';
  }
  function method(value) { return METHODS.filter(function (m) { return m.id === value; })[0] || METHODS[0]; }
  function available(ctx) {
    return TECH.filter(function (t) { return ctx.stage.scenes.some(function (s) { return s.id === t.id; }); });
  }
  function scene(ctx, id) { return ctx.stage.scenes.filter(function (s) { return s.id === id; })[0]; }
  function crop(box, className) {
    return '<span class="wmap-crop ' + (className || '') + '" style="aspect-ratio:' + box[2] + '/' + box[3] + '">' +
      '<img src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" loading="lazy" decoding="async" alt="" width="1448" height="1086" draggable="false" style="width:' +
      (WIDTH / box[2] * 100).toFixed(5) + '%;left:' + (-box[0] / box[2] * 100).toFixed(5) +
      '%;top:' + (-box[1] / box[3] * 100).toFixed(5) + '%"></span>';
  }
  var effect=function effects(t){
 var w=t.box[2],h=t.box[3],index=Number(t.id.slice(1))-1,well=STAGE_KIND==='welllog';
 var drilling=[
  '<path class="wmap-monitor-scan" d="M92 85V155"/><path class="wmap-trace wmap-trace-gas" d="M104 111l20-3 12-15 16 12 18-4 16-12 23 6"/>',
  '<path class="wmap-trace wmap-trace-gas" d="M111 118l17-1 9-25 10 24 20-7 14 6 12-18 11 15 24-5"/><path class="wmap-monitor-scan" d="M148 87V201"/>',
  '<path class="wmap-trace wmap-trace-drill" d="M80 91Q94 152 151 163T245 168"/><circle class="wmap-report-pulse" cx="240" cy="129" r="15"/>',
  '<circle class="wmap-report-pulse" cx="139" cy="127" r="24"/><path class="wmap-trace wmap-trace-rpm" d="M213 112l14 8 13-5 15 16 19-6"/>',
  '<path class="wmap-trace wmap-trace-gas" d="M174 136l20-6 13-12 20-2 17-11"/><circle class="wmap-report-pulse" cx="411" cy="136" r="18"/>'
 ];
 var logging=[
  '<path class="wmap-depth-scan" d="M93 119H283"/><path class="wmap-monitor-scan" d="M196 88V171"/>',
  '<circle class="wmap-report-pulse" cx="213" cy="122" r="19"/><path class="wmap-trace wmap-trace-rpm" d="M176 149l9-18-4-18 14-15 2-14"/>',
  '<path class="wmap-trace wmap-trace-vision" d="M146 107Q170 85 191 107T273 109"/><path class="wmap-monitor-scan" d="M175 87V169"/>',
  '<path class="wmap-depth-scan" d="M66 133H275"/><path class="wmap-trace wmap-trace-drill" d="M101 92l-6 15 9 14-10 12 7 15-8 16"/>',
  '<g class="wmap-report-lines"><path d="M237 126l13 6-8 10 16 5-7 12 14 7"/></g><circle class="wmap-report-pulse" cx="254" cy="151" r="18"/>'
 ];
 return '<svg class="wmap-tech-effect" viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+(well?logging:drilling)[index]+'</svg>';
};
  function sceneHref(id) {
    var lesson = {"w1":"welllog-layer","w2":"welllog-w2","w3":"welllog-w3","w4":"welllog-w4","w5":"welllog-w5"}[id];
    return '#/scene/' + id + (lesson ? '?case=' + lesson + '&amp;tab=bg' : '');
  }
  function spot(ctx, t, focus) {
    var sc = scene(ctx, t.id), b = t.box, active = focus && t.methods.indexOf(focus) >= 0, esc = ctx.K.esc;
    return '<a class="wmap-spot wmap-spot-' + t.id + (active ? ' is-relevant' : focus ? ' is-dim' : '') +
      '" href="' + sceneHref(t.id) + '" data-wmap-spot="' + t.id + '" data-wmap-tech-method="' + t.method +
      '" aria-label="' + esc(sc.name + '，' + method(t.method).name + '，查看场景讲解') +
      '" style="--tech:' + t.color + ';left:' + (b[0] / WIDTH * 100).toFixed(5) + '%;top:' +
      (b[1] / HEIGHT * 100).toFixed(5) + '%;width:' + (b[2] / WIDTH * 100).toFixed(5) +
      '%;height:' + (b[3] / HEIGHT * 100).toFixed(5) + '%">' + crop(b) + effect(t) +
      '<span class="wmap-spot-tag"><b>' + t.methods.map(function(m){return method(m).abbr;}).join(' + ') + '</b> 点击图画 · 查看讲解 <span>↗</span></span></a>';
  }
  function flow(path, color, duration, id) {
    var tag = id ? ' data-wmap-flow="' + id + '"' : '';
    return '<g class="wmap-flow"' + tag + ' style="--flow:' + color + '">' +
      '<path class="wmap-flow-track" d="' + path + '"/><path class="wmap-flow-current" d="' + path + '"/>' +
      [0, 1].map(function (i) {
        return '<g class="wmap-moving-arrow"><path d="M-10-6 0 0-10 6M-19-6-9 0-19 6"/>' +
          '<animateMotion dur="' + duration + 's" begin="' + (-duration * i / 2) + 's" repeatCount="indefinite" rotate="auto" path="' + path + '"/></g>';
      }).join('') + '</g>';
  }
  var STAGE_KIND="welllog";var drawing=function drawing(){
 var parts=[],colors=['#ffab40','#40a7d4','#a18bd6','#8ab578'],well=STAGE_KIND==='welllog';
 var paths=well?['M335 674C335 719 501 700 609 735','M651 674Q665 718 707 737','M962 679Q924 712 760 738','M1281 680Q1210 732 915 738']:['M360 704C355 753 460 735 568 764','M643 701Q660 741 690 764','M935 705Q920 738 737 764','M1237 710Q1190 755 902 764'];
 for(var i=0;i<4;i++)parts.push(flow(paths[i],colors[i],4+i*.45,TECH[i].id));
 return '<svg class="wmap-flows" data-wmap-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+
 flow(well?'M151 367V939':'M143 369V787','#ffc238',5)+flow(well?'M164 937V369':'M155 789V369','#58b6ee',5.5)+
 flow(well?'M779 307V332H430Q402 332 396 370':'M728 330V357Q728 367 690 367H375Q360 367 356 399','#58b6ee',5)+
 flow(well?'M780 308V330Q780 337 697 337L675 370':'M729 329V358Q729 369 657 369L638 399','#58b6ee',3.5)+
 flow(well?'M795 309V331Q795 337 888 337L920 370':'M741 330V355Q741 369 876 369L911 399','#58b6ee',3.8)+
 flow(well?'M803 309V332H1193Q1228 332 1240 369':'M750 330V357Q750 366 1174 366L1196 399','#58b6ee',5.2)+parts.join('')+
 flow(well?'M974 845L1032 869':'M958 856L999 887','#ff963c',3.5,TECH[4].id)+
 '<path class="wmap-depth-scan" d="M445 901H861"/><circle class="wmap-drill-pulse" cx="'+(well?151:145)+'" cy="'+(well?731:803)+'" r="23"/></svg>';
};
  function deck(ctx, focus) {
    var esc = ctx.K.esc;
    return available(ctx).filter(function (t) { return !focus || t.methods.indexOf(focus) >= 0; }).map(function (t) {
      var sc = scene(ctx, t.id), count = ctx.cases.bySceneAll(t.id).length;
      return '<a class="wmap-read-card" href="' + sceneHref(t.id) + '" style="--tech:' + t.color + '">' +
        '<span class="wmap-read-art">' + crop(t.art) + '<span class="wmap-read-id">' + t.id.toUpperCase() + ' · ' + t.methods.map(function(m){return method(m).abbr;}).join(' + ') + '</span></span>' +
        '<div class="wmap-read-text"><h3>' + esc(sc.name) + '</h3><p>' + esc(sc.point) + '</p>' +
        '<dl><div><dt>输入</dt><dd>' + esc(t.input) + '</dd></div><div><dt>输出</dt><dd>' + esc(t.output) + '</dd></div></dl>' +
        '<span class="wmap-read-link">' + (count ? '查看讲解与案例 · ' + count + ' 个已接入' : '查看场景讲解') + '<b>↗</b></span></div></a>';
    }).join('');
  }
  function extraScenes(ctx) {
    var extra = ctx.stage.scenes.filter(function (sc) { return !TECH.some(function (t) { return t.id === sc.id; }); });
    if (!extra.length) return '';
    var esc = ctx.K.esc;
    return '<section class="wmap-extra"><h2>更多测井场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="wmap-page" data-welllog-stage data-wmap-stage data-wmap-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">测井</span></nav>' +
      '<header class="wmap-head"><div><div class="wmap-eyebrow"><span>05 / 13</span> WELL LOGGING · 测井</div>' +
      '<h1>沿着井深，认识地层的物理响应<span>。</span></h1><p>从井下仪器到同一井深上的曲线，看看智能方法怎样帮助地层解释。</p></div>' +
      '<div class="wmap-head-note"><span class="wmap-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="wmap-lab" aria-label="测井现场交互总览">' +
      '<div class="wmap-toolbar"><div class="wmap-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-wmap-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="wmap-map wmap-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="wmap-motion" type="button" data-wmap-toggle aria-pressed="true"><span data-wmap-toggle-icon>Ⅱ</span><span data-wmap-toggle-label>暂停动效</span></button></div>' +
      '<div class="wmap-status"><span class="wmap-status-icon">↳</span><p data-wmap-status role="status">' + method(focus).note + '</p><span class="wmap-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="wmap-map' + (focus ? ' has-focus' : '') + '" id="wmap-map" data-wmap-map data-wmap-image-state="loading" aria-busy="true">' +
      '<img class="wmap-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-wmap-image width="1448" height="1086" draggable="false" alt="井下仪器采集物理响应，先对齐测量井深，再进入分层、孔隙度、裂缝、岩性和曲线修复任务。">' +
      '<span class="wmap-image-status" data-wmap-image-status role="status">正在载入图解…</span><button class="wmap-image-retry" type="button" data-wmap-image-retry hidden>重新载入图解</button>' +
      '<div class="wmap-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="wmap-map-caption"><span class="wmap-live-dot"></span><span data-wmap-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="wmap-map-footer"><span><b>01</b> 井下测量 <i>→</i> <b>02</b> 资料采集 <i>→</i> <b>03</b> 井深对齐 <i>→</i> <b>04</b> 解释与修复</span><p>曲线先对应同一测量井深；五项任务互相补充，井壁图像的地质解释还需要标定。</p></div></section>' +
      '<section class="wmap-reading' + (focus ? ' has-focus' : '') + '" data-wmap-reading aria-labelledby="wmap-reading-title"><div class="wmap-reading-head"><div><span class="wmap-eyebrow">EXPLORE THE SCENES</span><h2 id="wmap-reading-title" data-wmap-reading-title>' + (focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景') + '</h2></div><span data-wmap-reading-count>' + (focus ? available(ctx).filter(function (t) { return t.methods.indexOf(focus) >= 0; }).length : available(ctx).length) + ' 个图画入口 ↗</span></div>' +
      '<div class="wmap-deck" id="wmap-deck" data-wmap-deck>' + deck(ctx, focus) + '</div></section>' + extraScenes(ctx) +
      '<div class="pager">' + (prev ? '<a class="prev" href="#/stage/' + esc(prev.id) + '"><span class="dir">← 上一环节</span><span class="nm">' + esc(prev.name) + '</span></a>' : '') +
      (next ? '<a class="next" href="#/stage/' + esc(next.id) + '"><span class="dir">下一环节 →</span><span class="nm">' + esc(next.name) + '</span></a>' : '') + '</div></main>';
  }

  function bind(root, ctx) {
    if (!root) return { destroy: function () {} };
    var focus = selected((ctx.query || {}).m), disposed = false;
    var buttons = [].slice.call(root.querySelectorAll('[data-wmap-method-button]'));
    var spots = [].slice.call(root.querySelectorAll('[data-wmap-spot]'));
    var flows = [].slice.call(root.querySelectorAll('[data-wmap-flow]'));
    var svgs = [].slice.call(root.querySelectorAll('[data-wmap-motion]'));
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var paused = !!(mq && mq.matches);
    var map = root.querySelector('[data-wmap-map]'), baseImage = root.querySelector('[data-wmap-image]');
    var imageStatus = root.querySelector('[data-wmap-image-status]'), imageRetry = root.querySelector('[data-wmap-image-retry]');
    function imageReady() {
      if (disposed) return;
      map.dataset.wmapImageState = 'ready'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = true; imageRetry.hidden = true;
    }
    function imageFailed() {
      if (disposed) return;
      map.dataset.wmapImageState = 'error'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = false; imageStatus.textContent = '图解暂未载入'; imageRetry.hidden = false;
    }
    baseImage.addEventListener('load', imageReady); baseImage.addEventListener('error', imageFailed);
    if (baseImage.complete && baseImage.naturalWidth > 0) imageReady();

    function applyFocus(value, updateUrl) {
      focus = selected(value);
      root.dataset.wmapMethod = focus;
      root.querySelector('[data-wmap-map]').classList.toggle('has-focus', !!focus);
      root.querySelector('[data-wmap-reading]').classList.toggle('has-focus', !!focus);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.wmapMethodButton === focus)); });
      spots.forEach(function (s) {
        s.classList.toggle('is-relevant', !!focus && TECH.some(function(t){return t.id===s.dataset.wmapSpot && t.methods.indexOf(focus)>=0;}));
        s.classList.toggle('is-dim', !!focus && !TECH.some(function(t){return t.id===s.dataset.wmapSpot && t.methods.indexOf(focus)>=0;}));
      });
      flows.forEach(function (f) {
        var t = TECH.filter(function (x) { return x.id === f.dataset.wmapFlow; })[0];
        f.classList.toggle('is-dim', !!focus && t && t.methods.indexOf(focus) < 0);
        f.classList.toggle('is-relevant', !!focus && t && t.methods.indexOf(focus) >= 0);
      });
      root.querySelector('[data-wmap-status]').textContent = method(focus).note;
      root.querySelector('[data-wmap-reading-title]').textContent = focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景';
      root.querySelector('[data-wmap-reading-count]').textContent = available(ctx).filter(function (t) { return !focus || t.methods.indexOf(focus) >= 0; }).length + ' 个图画入口 ↗';
      root.querySelector('[data-wmap-deck]').innerHTML = deck(ctx, focus);
      if (updateUrl) {
        try { global.history.replaceState(null, '', '#/stage/welllog' + (focus ? '?m=' + focus : '')); }
        catch (e) { /* file:// can reject replaceState; the selected UI remains usable. */ }
        var first = spots.filter(function (s) { return TECH.some(function(t){return t.id===s.dataset.wmapSpot && t.methods.indexOf(focus)>=0;}); })[0];
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
      root.querySelector('[data-wmap-toggle]').setAttribute('aria-pressed', String(!paused));
      root.querySelector('[data-wmap-toggle-icon]').textContent = paused ? '▶' : 'Ⅱ';
      root.querySelector('[data-wmap-toggle-label]').textContent = paused ? '播放动效' : '暂停动效';
      root.querySelector('[data-wmap-running]').textContent = paused ? '动效已暂停 · 仍可点击探索' : '信号正在流动';
      svgs.forEach(function (svg) {
        var action = paused ? 'pauseAnimations' : 'unpauseAnimations';
        if (typeof svg[action] === 'function') svg[action]();
      });
    }
    function click(e) {
      if (e.target.closest('[data-wmap-image-retry]')) {
        map.dataset.wmapImageState = 'loading'; map.setAttribute('aria-busy', 'true');
        imageStatus.hidden = false; imageStatus.textContent = '正在载入图解…'; imageRetry.hidden = true;
        var retrySource = IMAGE + '?retry=' + Date.now();
        baseImage.srcset = ''; baseImage.src = retrySource;
        [].forEach.call(root.querySelectorAll('.wmap-crop img'), function (image) { image.srcset = ''; image.src = retrySource; });
        return;
      }
      var choice = e.target.closest('[data-wmap-method-button]');
      if (choice) { applyFocus(choice.dataset.wmapMethodButton, true); return; }
      if (e.target.closest('[data-wmap-toggle]')) { paused = !paused; applyMotion(); }
    }
    function keydown(e) {
      var choice = e.target.closest('[data-wmap-method-button]');
      if (!choice) return;
      var i = buttons.indexOf(choice), n = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % buttons.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + buttons.length) % buttons.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = buttons.length - 1;
      else return;
      e.preventDefault(); buttons[n].focus(); applyFocus(buttons[n].dataset.wmapMethodButton, true);
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
  global.WelllogStage = { render: render, bind: bind, html: render, mount: bind };
})(window);
