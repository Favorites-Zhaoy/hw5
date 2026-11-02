/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE = 'assets/images/cementing-process.webp';
  var IMAGE_SET = 'assets/images/cementing-process-small.webp 768w, ' + IMAGE + ' 1448w';
  var IMAGE_SIZES = '(max-width:700px) calc(100vw - 28px), 1448px';
  var WIDTH = 1448, HEIGHT = 1086;
  var METHODS = [{"id":"","abbr":"ALL","name":"完整流程","note":"从套管与环空，到施工记录和质量评价，按现场问题选择四个案例。"},{"id":"cv","abbr":"CV","name":"计算机视觉","note":"C1读取VDL图像中的波形形态，点击固井质量工位进入案例。"},{"id":"ts","abbr":"TS","name":"时序分析","note":"C1结合声学响应与深度变化，点击图画查看资料怎样对应。"},{"id":"opt","abbr":"OPT","name":"优化算法","note":"C2、C3、C4比较施工、风险和扶正器方案，点击相应工位进入案例。"}];
  var TECH = [{"id":"c1","method":"cv","methods":["cv","ts"],"title":"固井质量智能评价","color":"#f28a24","box":[235,386,307,353],"art":[246,464,282,264],"input":"相邻3个井深点的24格VDL波形与CBL幅值","output":"胶结响应与质量候选"},{"id":"c2","method":"opt","methods":["opt"],"title":"固井施工参数优化","color":"#2d9ed8","box":[545,386,286,353],"art":[556,466,262,262],"input":"排量、浆体密度、隔离液体积、偏心率、井斜与泥浆PV","output":"约束内的施工参数"},{"id":"c3","method":"opt","methods":["opt"],"title":"固井漏失风险与预警优化","color":"#9262ce","box":[834,386,281,353],"art":[847,466,255,263],"input":"当前及此前4分钟的返出缺口、压力、池体积变化与压力裕量","output":"漏失风险与误报漏报"},{"id":"c4","method":"opt","methods":["opt"],"title":"套管扶正器布置优化","color":"#4b9b68","box":[1119,386,315,353],"art":[1133,470,287,259],"input":"沿井深的井斜、径向间隙、初始偏移及允许安装点","output":"居中度与扶正器方案"}];

  function selected(value) {
    return METHODS.some(function (m) { return m.id === value; }) ? value : '';
  }
  function method(value) { return METHODS.filter(function (m) { return m.id === value; })[0] || METHODS[0]; }
  function available(ctx) {
    return TECH.filter(function (t) { return ctx.stage.scenes.some(function (s) { return s.id === t.id; }); });
  }
  function scene(ctx, id) { return ctx.stage.scenes.filter(function (s) { return s.id === id; })[0]; }
  function crop(box, className) {
    return '<span class="cmap-crop ' + (className || '') + '" style="aspect-ratio:' + box[2] + '/' + box[3] + '">' +
      '<img src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" loading="lazy" decoding="async" alt="" width="1448" height="1086" draggable="false" style="width:' +
      (WIDTH / box[2] * 100).toFixed(5) + '%;left:' + (-box[0] / box[2] * 100).toFixed(5) +
      '%;top:' + (-box[1] / box[3] * 100).toFixed(5) + '%"></span>';
  }
  var effect=function effects(t){
 var w=t.box[2],h=t.box[3],index=TECH.findIndex(function(row){return row.id===t.id;}),well=STAGE_KIND==='welllog';
 if(STAGE_KIND!=='drilling'&&!well){
  var overlays=[
   '<path class="cmap-monitor-scan" d="M138 80V175"/><path class="cmap-trace cmap-trace-gas" d="M92 135l17-6 11-19 13 19 18-8 13 4 18-13 17 6"/>',
   '<path class="cmap-trace cmap-trace-rpm" d="M105 154l18-12 16-5 14-16 18 4 20-15"/><circle class="cmap-report-pulse" cx="190" cy="124" r="17"/>',
   '<path class="cmap-trace cmap-trace-drill" d="M100 126l20-5 16-19 14 18 21-8 22 11"/><path class="cmap-monitor-scan" d="M180 82V182"/>',
   '<circle class="cmap-report-pulse" cx="150" cy="129" r="21"/><path class="cmap-depth-scan" d="M75 152H270"/>'
  ];
  return '<svg class="cmap-tech-effect" viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+overlays[index]+'</svg>';
 }
 var drilling=[
  '<path class="cmap-monitor-scan" d="M92 85V155"/><path class="cmap-trace cmap-trace-gas" d="M104 111l20-3 12-15 16 12 18-4 16-12 23 6"/>',
  '<path class="cmap-trace cmap-trace-gas" d="M111 118l17-1 9-25 10 24 20-7 14 6 12-18 11 15 24-5"/><path class="cmap-monitor-scan" d="M148 87V201"/>',
  '<path class="cmap-trace cmap-trace-drill" d="M80 91Q94 152 151 163T245 168"/><circle class="cmap-report-pulse" cx="240" cy="129" r="15"/>',
  '<circle class="cmap-report-pulse" cx="139" cy="127" r="24"/><path class="cmap-trace cmap-trace-rpm" d="M213 112l14 8 13-5 15 16 19-6"/>',
  '<path class="cmap-trace cmap-trace-gas" d="M174 136l20-6 13-12 20-2 17-11"/><circle class="cmap-report-pulse" cx="411" cy="136" r="18"/>'
 ];
 var logging=[
  '<path class="cmap-depth-scan" d="M93 119H283"/><path class="cmap-monitor-scan" d="M196 88V171"/>',
  '<circle class="cmap-report-pulse" cx="213" cy="122" r="19"/><path class="cmap-trace cmap-trace-rpm" d="M176 149l9-18-4-18 14-15 2-14"/>',
  '<path class="cmap-trace cmap-trace-vision" d="M146 107Q170 85 191 107T273 109"/><path class="cmap-monitor-scan" d="M175 87V169"/>',
  '<path class="cmap-depth-scan" d="M66 133H275"/><path class="cmap-trace cmap-trace-drill" d="M101 92l-6 15 9 14-10 12 7 15-8 16"/>',
  '<g class="cmap-report-lines"><path d="M237 126l13 6-8 10 16 5-7 12 14 7"/></g><circle class="cmap-report-pulse" cx="254" cy="151" r="18"/>'
 ];
 return '<svg class="cmap-tech-effect" viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+(well?logging:drilling)[index]+'</svg>';
};
  function sceneHref(id) {
    var lesson = {"c1":"cementing-c1","c2":"cementing-c2","c3":"cementing-c3","c4":"cementing-c4"}[id];
    return '#/scene/' + id + (lesson ? '?case=' + lesson + '&amp;tab=bg' : '');
  }
  function spot(ctx, t, focus) {
    var sc = scene(ctx, t.id), b = t.box, active = focus && t.methods.indexOf(focus) >= 0, esc = ctx.K.esc;
    return '<a class="cmap-spot cmap-spot-' + t.id + (active ? ' is-relevant' : focus ? ' is-dim' : '') +
      '" href="' + sceneHref(t.id) + '" data-cmap-spot="' + t.id + '" data-cmap-tech-method="' + t.method +
      '" aria-label="' + esc(sc.name + '，' + method(t.method).name + '，查看场景讲解') +
      '" style="--tech:' + t.color + ';left:' + (b[0] / WIDTH * 100).toFixed(5) + '%;top:' +
      (b[1] / HEIGHT * 100).toFixed(5) + '%;width:' + (b[2] / WIDTH * 100).toFixed(5) +
      '%;height:' + (b[3] / HEIGHT * 100).toFixed(5) + '%">' + crop(b) + effect(t) +
      '<span class="cmap-spot-tag"><b>' + t.methods.map(function(m){return method(m).abbr;}).join(' + ') + '</b> 点击图画 · 查看讲解 <span>↗</span></span></a>';
  }
  function flow(path, color, duration, id) {
    var tag = id ? ' data-cmap-flow="' + id + '"' : '';
    return '<g class="cmap-flow"' + tag + ' style="--flow:' + color + '">' +
      '<path class="cmap-flow-track" d="' + path + '"/><path class="cmap-flow-current" d="' + path + '"/>' +
      [0, 1].map(function (i) {
        return '<g class="cmap-moving-arrow"><path d="M-10-6 0 0-10 6M-19-6-9 0-19 6"/>' +
          '<animateMotion dur="' + duration + 's" begin="' + (-duration * i / 2) + 's" repeatCount="indefinite" rotate="auto" path="' + path + '"/></g>';
      }).join('') + '</g>';
  }
  var STAGE_KIND="cementing";var STAGE_PATHS={"physical":["M130 332V804","M169 797V364"],"feeds":["M773 283Q773 316 722 316H421Q382 316 382 376","M775 285V319H737Q689 319 682 376","M787 284V319H910Q969 319 977 376","M795 285Q795 316 845 316H1200Q1260 316 1260 376"],"returns":["M374 735Q378 769 666 790","M686 735Q706 770 778 790","M975 735Q962 769 809 790","M1252 735Q1235 774 953 795"],"scan":"M446 903H1048","pulse":[130,935]};var drawing=function drawing(){
 var parts=[],colors=['#ffab40','#40a7d4','#a18bd6','#8ab578'],well=STAGE_KIND==='welllog';
 if(STAGE_KIND!=='drilling'&&!well){
  var motion=STAGE_PATHS,feeds=motion.feeds,returns=motion.returns;
  for(var k=0;k<4;k++){parts.push(flow(feeds[k],'#58b6ee',3.5+k*.55,TECH[k].id));parts.push(flow(returns[k],colors[k],3.8+k*.4,TECH[k].id));}
  return '<svg class="cmap-flows" data-cmap-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+motion.physical.map(function(path,i){return flow(path,i%2?'#58b6ee':'#ffc238',5+i*.5);}).join('')+parts.join('')+'<path class="cmap-depth-scan" d="'+motion.scan+'"/><circle class="cmap-drill-pulse" cx="'+motion.pulse[0]+'" cy="'+motion.pulse[1]+'" r="21"/></svg>';
 }
 var paths=well?['M335 674C335 719 501 700 609 735','M651 674Q665 718 707 737','M962 679Q924 712 760 738','M1281 680Q1210 732 915 738']:['M360 704C355 753 460 735 568 764','M643 701Q660 741 690 764','M935 705Q920 738 737 764','M1237 710Q1190 755 902 764'];
 for(var i=0;i<4;i++)parts.push(flow(paths[i],colors[i],4+i*.45,TECH[i].id));
 return '<svg class="cmap-flows" data-cmap-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+
 flow(well?'M151 367V939':'M143 369V787','#ffc238',5)+flow(well?'M164 937V369':'M155 789V369','#58b6ee',5.5)+
 flow(well?'M779 307V332H430Q402 332 396 370':'M728 330V357Q728 367 690 367H375Q360 367 356 399','#58b6ee',5)+
 flow(well?'M780 308V330Q780 337 697 337L675 370':'M729 329V358Q729 369 657 369L638 399','#58b6ee',3.5)+
 flow(well?'M795 309V331Q795 337 888 337L920 370':'M741 330V355Q741 369 876 369L911 399','#58b6ee',3.8)+
 flow(well?'M803 309V332H1193Q1228 332 1240 369':'M750 330V357Q750 366 1174 366L1196 399','#58b6ee',5.2)+parts.join('')+
 flow(well?'M974 845L1032 869':'M958 856L999 887','#ff963c',3.5,TECH[4].id)+
 '<path class="cmap-depth-scan" d="M445 901H861"/><circle class="cmap-drill-pulse" cx="'+(well?151:145)+'" cy="'+(well?731:803)+'" r="23"/></svg>';
};
  function deck(ctx, focus) {
    var esc = ctx.K.esc;
    return available(ctx).filter(function (t) { return !focus || t.methods.indexOf(focus) >= 0; }).map(function (t) {
      var sc = scene(ctx, t.id), count = ctx.cases.bySceneAll(t.id).length;
      return '<a class="cmap-read-card" href="' + sceneHref(t.id) + '" style="--tech:' + t.color + '">' +
        '<span class="cmap-read-art">' + crop(t.art) + '<span class="cmap-read-id">' + t.id.toUpperCase() + ' · ' + t.methods.map(function(m){return method(m).abbr;}).join(' + ') + '</span></span>' +
        '<div class="cmap-read-text"><h3>' + esc(sc.name) + '</h3><p>' + esc(sc.point) + '</p>' +
        '<dl><div><dt>输入</dt><dd>' + esc(t.input) + '</dd></div><div><dt>输出</dt><dd>' + esc(t.output) + '</dd></div></dl>' +
        '<span class="cmap-read-link">' + (count ? '查看讲解与案例 · ' + count + ' 个已接入' : '查看场景讲解') + '<b>↗</b></span></div></a>';
    }).join('');
  }
  function extraScenes(ctx) {
    var extra = ctx.stage.scenes.filter(function (sc) { return !TECH.some(function (t) { return t.id === sc.id; }); });
    if (!extra.length) return '';
    var esc = ctx.K.esc;
    return '<section class="cmap-extra"><h2>更多固井场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="cmap-page" data-cementing-stage data-cmap-stage data-cmap-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">固井</span></nav>' +
      '<header class="cmap-head"><div><div class="cmap-eyebrow"><span>06 / 13</span> CEMENTING · 固井</div>' +
      '<h1>把环空封好，把固井质量看清<span>。</span></h1><p>从套管、水泥环到施工与声学资料，看看智能方法怎样帮助固井判断。</p></div>' +
      '<div class="cmap-head-note"><span class="cmap-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="cmap-lab" aria-label="固井现场交互总览">' +
      '<div class="cmap-toolbar"><div class="cmap-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-cmap-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="cmap-map cmap-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="cmap-motion" type="button" data-cmap-toggle aria-pressed="true"><span data-cmap-toggle-icon>Ⅱ</span><span data-cmap-toggle-label>暂停动效</span></button></div>' +
      '<div class="cmap-status"><span class="cmap-status-icon">↳</span><p data-cmap-status role="status">' + method(focus).note + '</p><span class="cmap-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="cmap-map' + (focus ? ' has-focus' : '') + '" id="cmap-map" data-cmap-map data-cmap-image-state="loading" aria-busy="true">' +
      '<img class="cmap-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-cmap-image width="1448" height="1086" draggable="false" alt="水泥环承担层间封隔；施工、压力、胶结响应与套管位置共同提供判断线索。">' +
      '<span class="cmap-image-status" data-cmap-image-status role="status">正在载入图解…</span><button class="cmap-image-retry" type="button" data-cmap-image-retry hidden>重新载入图解</button>' +
      '<div class="cmap-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="cmap-map-caption"><span class="cmap-live-dot"></span><span data-cmap-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="cmap-map-footer"><span><b>01</b> 下套管 <i>→</i> <b>02</b> 注水泥 <i>→</i> <b>03</b> 施工记录 <i>→</i> <b>04</b> 胶结评价</span><p>四项任务分别处理施工设计、几何条件和质量资料；图中的连线表示资料关系。</p></div></section>' +
      '<section class="cmap-reading' + (focus ? ' has-focus' : '') + '" data-cmap-reading aria-labelledby="cmap-reading-title"><div class="cmap-reading-head"><div><span class="cmap-eyebrow">EXPLORE THE SCENES</span><h2 id="cmap-reading-title" data-cmap-reading-title>' + (focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景') + '</h2></div><span data-cmap-reading-count>' + (focus ? available(ctx).filter(function (t) { return t.methods.indexOf(focus) >= 0; }).length : available(ctx).length) + ' 个图画入口 ↗</span></div>' +
      '<div class="cmap-deck" id="cmap-deck" data-cmap-deck>' + deck(ctx, focus) + '</div></section>' + extraScenes(ctx) +
      '<div class="pager">' + (prev ? '<a class="prev" href="#/stage/' + esc(prev.id) + '"><span class="dir">← 上一环节</span><span class="nm">' + esc(prev.name) + '</span></a>' : '') +
      (next ? '<a class="next" href="#/stage/' + esc(next.id) + '"><span class="dir">下一环节 →</span><span class="nm">' + esc(next.name) + '</span></a>' : '') + '</div></main>';
  }

  function bind(root, ctx) {
    if (!root) return { destroy: function () {} };
    var focus = selected((ctx.query || {}).m), disposed = false;
    var buttons = [].slice.call(root.querySelectorAll('[data-cmap-method-button]'));
    var spots = [].slice.call(root.querySelectorAll('[data-cmap-spot]'));
    var flows = [].slice.call(root.querySelectorAll('[data-cmap-flow]'));
    var svgs = [].slice.call(root.querySelectorAll('[data-cmap-motion]'));
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var paused = !!(mq && mq.matches);
    var map = root.querySelector('[data-cmap-map]'), baseImage = root.querySelector('[data-cmap-image]');
    var imageStatus = root.querySelector('[data-cmap-image-status]'), imageRetry = root.querySelector('[data-cmap-image-retry]');
    function imageReady() {
      if (disposed) return;
      map.dataset.cmapImageState = 'ready'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = true; imageRetry.hidden = true;
    }
    function imageFailed() {
      if (disposed) return;
      map.dataset.cmapImageState = 'error'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = false; imageStatus.textContent = '图解暂未载入'; imageRetry.hidden = false;
    }
    baseImage.addEventListener('load', imageReady); baseImage.addEventListener('error', imageFailed);
    if (baseImage.complete && baseImage.naturalWidth > 0) imageReady();

    function applyFocus(value, updateUrl) {
      focus = selected(value);
      root.dataset.cmapMethod = focus;
      root.querySelector('[data-cmap-map]').classList.toggle('has-focus', !!focus);
      root.querySelector('[data-cmap-reading]').classList.toggle('has-focus', !!focus);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cmapMethodButton === focus)); });
      spots.forEach(function (s) {
        s.classList.toggle('is-relevant', !!focus && TECH.some(function(t){return t.id===s.dataset.cmapSpot && t.methods.indexOf(focus)>=0;}));
        s.classList.toggle('is-dim', !!focus && !TECH.some(function(t){return t.id===s.dataset.cmapSpot && t.methods.indexOf(focus)>=0;}));
      });
      flows.forEach(function (f) {
        var t = TECH.filter(function (x) { return x.id === f.dataset.cmapFlow; })[0];
        f.classList.toggle('is-dim', !!focus && t && t.methods.indexOf(focus) < 0);
        f.classList.toggle('is-relevant', !!focus && t && t.methods.indexOf(focus) >= 0);
      });
      root.querySelector('[data-cmap-status]').textContent = method(focus).note;
      root.querySelector('[data-cmap-reading-title]').textContent = focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景';
      root.querySelector('[data-cmap-reading-count]').textContent = available(ctx).filter(function (t) { return !focus || t.methods.indexOf(focus) >= 0; }).length + ' 个图画入口 ↗';
      root.querySelector('[data-cmap-deck]').innerHTML = deck(ctx, focus);
      if (updateUrl) {
        try { global.history.replaceState(null, '', '#/stage/cementing' + (focus ? '?m=' + focus : '')); }
        catch (e) { /* file:// can reject replaceState; the selected UI remains usable. */ }
        var first = spots.filter(function (s) { return TECH.some(function(t){return t.id===s.dataset.cmapSpot && t.methods.indexOf(focus)>=0;}); })[0];
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
      root.querySelector('[data-cmap-toggle]').setAttribute('aria-pressed', String(!paused));
      root.querySelector('[data-cmap-toggle-icon]').textContent = paused ? '▶' : 'Ⅱ';
      root.querySelector('[data-cmap-toggle-label]').textContent = paused ? '播放动效' : '暂停动效';
      root.querySelector('[data-cmap-running]').textContent = paused ? '动效已暂停 · 仍可点击探索' : '信号正在流动';
      svgs.forEach(function (svg) {
        var action = paused ? 'pauseAnimations' : 'unpauseAnimations';
        if (typeof svg[action] === 'function') svg[action]();
      });
    }
    function click(e) {
      if (e.target.closest('[data-cmap-image-retry]')) {
        map.dataset.cmapImageState = 'loading'; map.setAttribute('aria-busy', 'true');
        imageStatus.hidden = false; imageStatus.textContent = '正在载入图解…'; imageRetry.hidden = true;
        var retrySource = IMAGE + '?retry=' + Date.now();
        baseImage.srcset = ''; baseImage.src = retrySource;
        [].forEach.call(root.querySelectorAll('.cmap-crop img'), function (image) { image.srcset = ''; image.src = retrySource; });
        return;
      }
      var choice = e.target.closest('[data-cmap-method-button]');
      if (choice) { applyFocus(choice.dataset.cmapMethodButton, true); return; }
      if (e.target.closest('[data-cmap-toggle]')) { paused = !paused; applyMotion(); }
    }
    function keydown(e) {
      var choice = e.target.closest('[data-cmap-method-button]');
      if (!choice) return;
      var i = buttons.indexOf(choice), n = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % buttons.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + buttons.length) % buttons.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = buttons.length - 1;
      else return;
      e.preventDefault(); buttons[n].focus(); applyFocus(buttons[n].dataset.cmapMethodButton, true);
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
  global.CementingStage = { render: render, bind: bind, html: render, mount: bind };
})(window);
