/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE = 'assets/images/completion-process.webp';
  var IMAGE_SET = 'assets/images/completion-process-small.webp 768w, ' + IMAGE + ' 1448w';
  var IMAGE_SIZES = '(max-width:700px) calc(100vw - 28px), 1448px';
  var WIDTH = 1448, HEIGHT = 1086;
  var METHODS = [{"id":"","abbr":"ALL","name":"完整流程","note":"从储层条件到完井结构，再查看四项方案与运行任务。"},{"id":"kg","abbr":"KG","name":"知识图谱","note":"CO1把条件、完井方式和案例联系起来，点击方案工位进入案例。"},{"id":"opt","abbr":"OPT","name":"优化算法","note":"四个案例分别比较方案、参数、管柱工况和滑套策略。"}];
  var TECH = [{"id":"co1","method":"kg","methods":["kg","opt"],"title":"完井方案智能选择","color":"#f28a24","box":[225,369,309,337],"art":[237,451,285,244],"input":"温度、出砂倾向、分层隔离需求与体系能力图谱","output":"满足条件的完井候选"},{"id":"co2","method":"opt","methods":["opt"],"title":"完井参数协同优化","color":"#2d9ed8","box":[537,369,289,337],"art":[548,452,267,243],"input":"地层压力、渗透率与三个几何设计包络","output":"产能与风险的折中方案"},{"id":"co3","method":"opt","methods":["opt"],"title":"完井管柱受力与安全评估","color":"#9262ce","box":[829,370,291,336],"art":[840,446,267,249],"input":"内外压差、附加轴向力、温升约束与候选壁厚","output":"载荷与工况比较"},{"id":"co4","method":"opt","methods":["opt"],"title":"智能完井流入控制","color":"#4b9b68","box":[1123,371,311,336],"art":[1134,454,287,242],"input":"两个井段的当前含水、压力、时段及前一步动作","output":"分段开度与生产响应"}];

  function selected(value) {
    return METHODS.some(function (m) { return m.id === value; }) ? value : '';
  }
  function method(value) { return METHODS.filter(function (m) { return m.id === value; })[0] || METHODS[0]; }
  function available(ctx) {
    return TECH.filter(function (t) { return ctx.stage.scenes.some(function (s) { return s.id === t.id; }); });
  }
  function scene(ctx, id) { return ctx.stage.scenes.filter(function (s) { return s.id === id; })[0]; }
  function crop(box, className) {
    return '<span class="comap-crop ' + (className || '') + '" style="aspect-ratio:' + box[2] + '/' + box[3] + '">' +
      '<img src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" loading="lazy" decoding="async" alt="" width="1448" height="1086" draggable="false" style="width:' +
      (WIDTH / box[2] * 100).toFixed(5) + '%;left:' + (-box[0] / box[2] * 100).toFixed(5) +
      '%;top:' + (-box[1] / box[3] * 100).toFixed(5) + '%"></span>';
  }
  var effect=function effects(t){
 var w=t.box[2],h=t.box[3],index=TECH.findIndex(function(row){return row.id===t.id;}),well=STAGE_KIND==='welllog';
 if(STAGE_KIND!=='drilling'&&!well){
  var overlays=[
   '<path class="comap-monitor-scan" d="M138 80V175"/><path class="comap-trace comap-trace-gas" d="M92 135l17-6 11-19 13 19 18-8 13 4 18-13 17 6"/>',
   '<path class="comap-trace comap-trace-rpm" d="M105 154l18-12 16-5 14-16 18 4 20-15"/><circle class="comap-report-pulse" cx="190" cy="124" r="17"/>',
   '<path class="comap-trace comap-trace-drill" d="M100 126l20-5 16-19 14 18 21-8 22 11"/><path class="comap-monitor-scan" d="M180 82V182"/>',
   '<circle class="comap-report-pulse" cx="150" cy="129" r="21"/><path class="comap-depth-scan" d="M75 152H270"/>'
  ];
  return '<svg class="comap-tech-effect" viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+overlays[index]+'</svg>';
 }
 var drilling=[
  '<path class="comap-monitor-scan" d="M92 85V155"/><path class="comap-trace comap-trace-gas" d="M104 111l20-3 12-15 16 12 18-4 16-12 23 6"/>',
  '<path class="comap-trace comap-trace-gas" d="M111 118l17-1 9-25 10 24 20-7 14 6 12-18 11 15 24-5"/><path class="comap-monitor-scan" d="M148 87V201"/>',
  '<path class="comap-trace comap-trace-drill" d="M80 91Q94 152 151 163T245 168"/><circle class="comap-report-pulse" cx="240" cy="129" r="15"/>',
  '<circle class="comap-report-pulse" cx="139" cy="127" r="24"/><path class="comap-trace comap-trace-rpm" d="M213 112l14 8 13-5 15 16 19-6"/>',
  '<path class="comap-trace comap-trace-gas" d="M174 136l20-6 13-12 20-2 17-11"/><circle class="comap-report-pulse" cx="411" cy="136" r="18"/>'
 ];
 var logging=[
  '<path class="comap-depth-scan" d="M93 119H283"/><path class="comap-monitor-scan" d="M196 88V171"/>',
  '<circle class="comap-report-pulse" cx="213" cy="122" r="19"/><path class="comap-trace comap-trace-rpm" d="M176 149l9-18-4-18 14-15 2-14"/>',
  '<path class="comap-trace comap-trace-vision" d="M146 107Q170 85 191 107T273 109"/><path class="comap-monitor-scan" d="M175 87V169"/>',
  '<path class="comap-depth-scan" d="M66 133H275"/><path class="comap-trace comap-trace-drill" d="M101 92l-6 15 9 14-10 12 7 15-8 16"/>',
  '<g class="comap-report-lines"><path d="M237 126l13 6-8 10 16 5-7 12 14 7"/></g><circle class="comap-report-pulse" cx="254" cy="151" r="18"/>'
 ];
 return '<svg class="comap-tech-effect" viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+(well?logging:drilling)[index]+'</svg>';
};
  function sceneHref(id) {
    var lesson = {"co1":"completion-co1","co2":"completion-co2","co3":"completion-co3","co4":"completion-co4"}[id];
    return '#/scene/' + id + (lesson ? '?case=' + lesson + '&amp;tab=bg' : '');
  }
  function spot(ctx, t, focus) {
    var sc = scene(ctx, t.id), b = t.box, active = focus && t.methods.indexOf(focus) >= 0, esc = ctx.K.esc;
    return '<a class="comap-spot comap-spot-' + t.id + (active ? ' is-relevant' : focus ? ' is-dim' : '') +
      '" href="' + sceneHref(t.id) + '" data-comap-spot="' + t.id + '" data-comap-tech-method="' + t.method +
      '" aria-label="' + esc(sc.name + '，' + method(t.method).name + '，查看场景讲解') +
      '" style="--tech:' + t.color + ';left:' + (b[0] / WIDTH * 100).toFixed(5) + '%;top:' +
      (b[1] / HEIGHT * 100).toFixed(5) + '%;width:' + (b[2] / WIDTH * 100).toFixed(5) +
      '%;height:' + (b[3] / HEIGHT * 100).toFixed(5) + '%">' + crop(b) + effect(t) +
      '<span class="comap-spot-tag"><b>' + t.methods.map(function(m){return method(m).abbr;}).join(' + ') + '</b> 点击图画 · 查看讲解 <span>↗</span></span></a>';
  }
  function flow(path, color, duration, id) {
    var tag = id ? ' data-comap-flow="' + id + '"' : '';
    return '<g class="comap-flow"' + tag + ' style="--flow:' + color + '">' +
      '<path class="comap-flow-track" d="' + path + '"/><path class="comap-flow-current" d="' + path + '"/>' +
      [0, 1].map(function (i) {
        return '<g class="comap-moving-arrow"><path d="M-10-6 0 0-10 6M-19-6-9 0-19 6"/>' +
          '<animateMotion dur="' + duration + 's" begin="' + (-duration * i / 2) + 's" repeatCount="indefinite" rotate="auto" path="' + path + '"/></g>';
      }).join('') + '</g>';
  }
  var STAGE_KIND="completion";var STAGE_PATHS={"physical":["M122 923V329","M64 591Q93 592 121 571","M65 777Q93 778 121 758","M65 918Q91 921 121 905"],"feeds":["M799 284V318H449Q405 318 405 364","M799 285V321H721Q684 321 680 363","M805 285V319H925Q963 319 964 363","M809 286V320H1210Q1264 320 1263 364"],"returns":["M421 702Q427 746 663 765","M682 703Q697 749 769 766","M981 704Q971 749 803 766","M1274 704Q1262 749 932 767"],"scan":"M363 893H1253","pulse":[122,627]};var drawing=function drawing(){
 var parts=[],colors=['#ffab40','#40a7d4','#a18bd6','#8ab578'],well=STAGE_KIND==='welllog';
 if(STAGE_KIND!=='drilling'&&!well){
  var motion=STAGE_PATHS,feeds=motion.feeds,returns=motion.returns;
  for(var k=0;k<4;k++){parts.push(flow(feeds[k],'#58b6ee',3.5+k*.55,TECH[k].id));parts.push(flow(returns[k],colors[k],3.8+k*.4,TECH[k].id));}
  return '<svg class="comap-flows" data-comap-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+motion.physical.map(function(path,i){return flow(path,i%2?'#58b6ee':'#ffc238',5+i*.5);}).join('')+parts.join('')+'<path class="comap-depth-scan" d="'+motion.scan+'"/><circle class="comap-drill-pulse" cx="'+motion.pulse[0]+'" cy="'+motion.pulse[1]+'" r="21"/></svg>';
 }
 var paths=well?['M335 674C335 719 501 700 609 735','M651 674Q665 718 707 737','M962 679Q924 712 760 738','M1281 680Q1210 732 915 738']:['M360 704C355 753 460 735 568 764','M643 701Q660 741 690 764','M935 705Q920 738 737 764','M1237 710Q1190 755 902 764'];
 for(var i=0;i<4;i++)parts.push(flow(paths[i],colors[i],4+i*.45,TECH[i].id));
 return '<svg class="comap-flows" data-comap-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+
 flow(well?'M151 367V939':'M143 369V787','#ffc238',5)+flow(well?'M164 937V369':'M155 789V369','#58b6ee',5.5)+
 flow(well?'M779 307V332H430Q402 332 396 370':'M728 330V357Q728 367 690 367H375Q360 367 356 399','#58b6ee',5)+
 flow(well?'M780 308V330Q780 337 697 337L675 370':'M729 329V358Q729 369 657 369L638 399','#58b6ee',3.5)+
 flow(well?'M795 309V331Q795 337 888 337L920 370':'M741 330V355Q741 369 876 369L911 399','#58b6ee',3.8)+
 flow(well?'M803 309V332H1193Q1228 332 1240 369':'M750 330V357Q750 366 1174 366L1196 399','#58b6ee',5.2)+parts.join('')+
 flow(well?'M974 845L1032 869':'M958 856L999 887','#ff963c',3.5,TECH[4].id)+
 '<path class="comap-depth-scan" d="M445 901H861"/><circle class="comap-drill-pulse" cx="'+(well?151:145)+'" cy="'+(well?731:803)+'" r="23"/></svg>';
};
  function deck(ctx, focus) {
    var esc = ctx.K.esc;
    return available(ctx).filter(function (t) { return !focus || t.methods.indexOf(focus) >= 0; }).map(function (t) {
      var sc = scene(ctx, t.id), count = ctx.cases.bySceneAll(t.id).length;
      return '<a class="comap-read-card" href="' + sceneHref(t.id) + '" style="--tech:' + t.color + '">' +
        '<span class="comap-read-art">' + crop(t.art) + '<span class="comap-read-id">' + t.id.toUpperCase() + ' · ' + t.methods.map(function(m){return method(m).abbr;}).join(' + ') + '</span></span>' +
        '<div class="comap-read-text"><h3>' + esc(sc.name) + '</h3><p>' + esc(sc.point) + '</p>' +
        '<dl><div><dt>输入</dt><dd>' + esc(t.input) + '</dd></div><div><dt>输出</dt><dd>' + esc(t.output) + '</dd></div></dl>' +
        '<span class="comap-read-link">' + (count ? '查看讲解与案例 · ' + count + ' 个已接入' : '查看场景讲解') + '<b>↗</b></span></div></a>';
    }).join('');
  }
  function extraScenes(ctx) {
    var extra = ctx.stage.scenes.filter(function (sc) { return !TECH.some(function (t) { return t.id === sc.id; }); });
    if (!extra.length) return '';
    var esc = ctx.K.esc;
    return '<section class="comap-extra"><h2>更多完井场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="comap-page" data-completion-stage data-comap-stage data-comap-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">完井</span></nav>' +
      '<header class="comap-head"><div><div class="comap-eyebrow"><span>07 / 13</span> COMPLETION · 完井</div>' +
      '<h1>从完井方案，到分段运行<span>。</span></h1><p>把储层条件、管柱结构和运行记录放在一起，看看智能方法怎样帮助完井选择。</p></div>' +
      '<div class="comap-head-note"><span class="comap-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="comap-lab" aria-label="完井现场交互总览">' +
      '<div class="comap-toolbar"><div class="comap-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-comap-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="comap-map comap-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="comap-motion" type="button" data-comap-toggle aria-pressed="true"><span data-comap-toggle-icon>Ⅱ</span><span data-comap-toggle-label>暂停动效</span></button></div>' +
      '<div class="comap-status"><span class="comap-status-icon">↳</span><p data-comap-status role="status">' + method(focus).note + '</p><span class="comap-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="comap-map' + (focus ? ' has-focus' : '') + '" id="comap-map" data-comap-map data-comap-image-state="loading" aria-busy="true">' +
      '<img class="comap-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-comap-image width="1448" height="1086" draggable="false" alt="完井把井筒与储层连接起来；方案、受力和分段控制各自回答不同问题。">' +
      '<span class="comap-image-status" data-comap-image-status role="status">正在载入图解…</span><button class="comap-image-retry" type="button" data-comap-image-retry hidden>重新载入图解</button>' +
      '<div class="comap-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="comap-map-caption"><span class="comap-live-dot"></span><span data-comap-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="comap-map-footer"><span><b>01</b> 储层条件 <i>→</i> <b>02</b> 完井方案 <i>→</i> <b>03</b> 管柱与分段 <i>→</i> <b>04</b> 运行记录</span><p>完井方案选择与后续运行互相联系；案例中的结果来自明确标注的教学资料。</p></div></section>' +
      '<section class="comap-reading' + (focus ? ' has-focus' : '') + '" data-comap-reading aria-labelledby="comap-reading-title"><div class="comap-reading-head"><div><span class="comap-eyebrow">EXPLORE THE SCENES</span><h2 id="comap-reading-title" data-comap-reading-title>' + (focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景') + '</h2></div><span data-comap-reading-count>' + (focus ? available(ctx).filter(function (t) { return t.methods.indexOf(focus) >= 0; }).length : available(ctx).length) + ' 个图画入口 ↗</span></div>' +
      '<div class="comap-deck" id="comap-deck" data-comap-deck>' + deck(ctx, focus) + '</div></section>' + extraScenes(ctx) +
      '<div class="pager">' + (prev ? '<a class="prev" href="#/stage/' + esc(prev.id) + '"><span class="dir">← 上一环节</span><span class="nm">' + esc(prev.name) + '</span></a>' : '') +
      (next ? '<a class="next" href="#/stage/' + esc(next.id) + '"><span class="dir">下一环节 →</span><span class="nm">' + esc(next.name) + '</span></a>' : '') + '</div></main>';
  }

  function bind(root, ctx) {
    if (!root) return { destroy: function () {} };
    var focus = selected((ctx.query || {}).m), disposed = false;
    var buttons = [].slice.call(root.querySelectorAll('[data-comap-method-button]'));
    var spots = [].slice.call(root.querySelectorAll('[data-comap-spot]'));
    var flows = [].slice.call(root.querySelectorAll('[data-comap-flow]'));
    var svgs = [].slice.call(root.querySelectorAll('[data-comap-motion]'));
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var paused = !!(mq && mq.matches);
    var map = root.querySelector('[data-comap-map]'), baseImage = root.querySelector('[data-comap-image]');
    var imageStatus = root.querySelector('[data-comap-image-status]'), imageRetry = root.querySelector('[data-comap-image-retry]');
    function imageReady() {
      if (disposed) return;
      map.dataset.comapImageState = 'ready'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = true; imageRetry.hidden = true;
    }
    function imageFailed() {
      if (disposed) return;
      map.dataset.comapImageState = 'error'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = false; imageStatus.textContent = '图解暂未载入'; imageRetry.hidden = false;
    }
    baseImage.addEventListener('load', imageReady); baseImage.addEventListener('error', imageFailed);
    if (baseImage.complete && baseImage.naturalWidth > 0) imageReady();

    function applyFocus(value, updateUrl) {
      focus = selected(value);
      root.dataset.comapMethod = focus;
      root.querySelector('[data-comap-map]').classList.toggle('has-focus', !!focus);
      root.querySelector('[data-comap-reading]').classList.toggle('has-focus', !!focus);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.comapMethodButton === focus)); });
      spots.forEach(function (s) {
        s.classList.toggle('is-relevant', !!focus && TECH.some(function(t){return t.id===s.dataset.comapSpot && t.methods.indexOf(focus)>=0;}));
        s.classList.toggle('is-dim', !!focus && !TECH.some(function(t){return t.id===s.dataset.comapSpot && t.methods.indexOf(focus)>=0;}));
      });
      flows.forEach(function (f) {
        var t = TECH.filter(function (x) { return x.id === f.dataset.comapFlow; })[0];
        f.classList.toggle('is-dim', !!focus && t && t.methods.indexOf(focus) < 0);
        f.classList.toggle('is-relevant', !!focus && t && t.methods.indexOf(focus) >= 0);
      });
      root.querySelector('[data-comap-status]').textContent = method(focus).note;
      root.querySelector('[data-comap-reading-title]').textContent = focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景';
      root.querySelector('[data-comap-reading-count]').textContent = available(ctx).filter(function (t) { return !focus || t.methods.indexOf(focus) >= 0; }).length + ' 个图画入口 ↗';
      root.querySelector('[data-comap-deck]').innerHTML = deck(ctx, focus);
      if (updateUrl) {
        try { global.history.replaceState(null, '', '#/stage/completion' + (focus ? '?m=' + focus : '')); }
        catch (e) { /* file:// can reject replaceState; the selected UI remains usable. */ }
        var first = spots.filter(function (s) { return TECH.some(function(t){return t.id===s.dataset.comapSpot && t.methods.indexOf(focus)>=0;}); })[0];
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
      root.querySelector('[data-comap-toggle]').setAttribute('aria-pressed', String(!paused));
      root.querySelector('[data-comap-toggle-icon]').textContent = paused ? '▶' : 'Ⅱ';
      root.querySelector('[data-comap-toggle-label]').textContent = paused ? '播放动效' : '暂停动效';
      root.querySelector('[data-comap-running]').textContent = paused ? '动效已暂停 · 仍可点击探索' : '信号正在流动';
      svgs.forEach(function (svg) {
        var action = paused ? 'pauseAnimations' : 'unpauseAnimations';
        if (typeof svg[action] === 'function') svg[action]();
      });
    }
    function click(e) {
      if (e.target.closest('[data-comap-image-retry]')) {
        map.dataset.comapImageState = 'loading'; map.setAttribute('aria-busy', 'true');
        imageStatus.hidden = false; imageStatus.textContent = '正在载入图解…'; imageRetry.hidden = true;
        var retrySource = IMAGE + '?retry=' + Date.now();
        baseImage.srcset = ''; baseImage.src = retrySource;
        [].forEach.call(root.querySelectorAll('.comap-crop img'), function (image) { image.srcset = ''; image.src = retrySource; });
        return;
      }
      var choice = e.target.closest('[data-comap-method-button]');
      if (choice) { applyFocus(choice.dataset.comapMethodButton, true); return; }
      if (e.target.closest('[data-comap-toggle]')) { paused = !paused; applyMotion(); }
    }
    function keydown(e) {
      var choice = e.target.closest('[data-comap-method-button]');
      if (!choice) return;
      var i = buttons.indexOf(choice), n = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % buttons.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + buttons.length) % buttons.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = buttons.length - 1;
      else return;
      e.preventDefault(); buttons[n].focus(); applyFocus(buttons[n].dataset.comapMethodButton, true);
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
  global.CompletionStage = { render: render, bind: bind, html: render, mount: bind };
})(window);
