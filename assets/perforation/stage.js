/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE = 'assets/images/perforation-process.webp';
  var IMAGE_SET = 'assets/images/perforation-process-small.webp 768w, ' + IMAGE + ' 1448w';
  var IMAGE_SIZES = '(max-width:700px) calc(100vw - 28px), 1448px';
  var WIDTH = 1448, HEIGHT = 1086;
  var METHODS = [{"id":"","abbr":"ALL","name":"完整流程","note":"从井况与方案，到孔道和效果资料，按问题选择四个案例。"},{"id":"opt","abbr":"OPT","name":"优化算法","note":"P1、P2、P4用响应模型比较候选或反演参数，点击图画进入案例。"},{"id":"kg","abbr":"KG","name":"知识图谱","note":"P3按条件关系筛选工具族，点击选型工位查看检索过程。"},{"id":"ts","abbr":"TS","name":"时序分析","note":"P4沿时间对照压力与产量响应，点击效果工位进入案例。"}];
  var TECH = [{"id":"p1","method":"opt","methods":["opt"],"title":"射孔参数局部优化","color":"#f28a24","box":[241,393,289,355],"art":[254,478,264,256],"input":"选定完井包络、压力、渗透率、通道长度、相位与孔密","output":"约束内的参数候选"},{"id":"p2","method":"opt","methods":["opt"],"title":"通道响应预测与工具族比较","color":"#2d9ed8","box":[532,393,293,355],"art":[544,477,269,260],"input":"岩石UCS、围压、孔隙度与虚构密封工具性能等级","output":"孔道响应与预测误差"},{"id":"p3","method":"kg","methods":["kg"],"title":"工具适配知识图谱","color":"#9262ce","box":[827,393,290,355],"art":[839,476,265,261],"input":"温度、压力、通径、岩石、流体及套管接口条件","output":"符合条件的工具族"},{"id":"p4","method":"ts","methods":["ts","opt"],"title":"射孔后压力响应反演","color":"#4b9b68","box":[1119,393,314,355],"art":[1132,478,287,259],"input":"已观测的产量时间序列、压力、流动标度与观察窗","output":"压力产量响应与反演差异"}];

  function selected(value) {
    return METHODS.some(function (m) { return m.id === value; }) ? value : '';
  }
  function method(value) { return METHODS.filter(function (m) { return m.id === value; })[0] || METHODS[0]; }
  function available(ctx) {
    return TECH.filter(function (t) { return ctx.stage.scenes.some(function (s) { return s.id === t.id; }); });
  }
  function scene(ctx, id) { return ctx.stage.scenes.filter(function (s) { return s.id === id; })[0]; }
  function crop(box, className) {
    return '<span class="pmap-crop ' + (className || '') + '" style="aspect-ratio:' + box[2] + '/' + box[3] + '">' +
      '<img src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" loading="lazy" decoding="async" alt="" width="1448" height="1086" draggable="false" style="width:' +
      (WIDTH / box[2] * 100).toFixed(5) + '%;left:' + (-box[0] / box[2] * 100).toFixed(5) +
      '%;top:' + (-box[1] / box[3] * 100).toFixed(5) + '%"></span>';
  }
  var effect=function effects(t){
 var w=t.box[2],h=t.box[3],index=TECH.findIndex(function(row){return row.id===t.id;}),well=STAGE_KIND==='welllog';
 if(STAGE_KIND!=='drilling'&&!well){
  var overlays=[
   '<path class="pmap-monitor-scan" d="M138 80V175"/><path class="pmap-trace pmap-trace-gas" d="M92 135l17-6 11-19 13 19 18-8 13 4 18-13 17 6"/>',
   '<path class="pmap-trace pmap-trace-rpm" d="M105 154l18-12 16-5 14-16 18 4 20-15"/><circle class="pmap-report-pulse" cx="190" cy="124" r="17"/>',
   '<path class="pmap-trace pmap-trace-drill" d="M100 126l20-5 16-19 14 18 21-8 22 11"/><path class="pmap-monitor-scan" d="M180 82V182"/>',
   '<circle class="pmap-report-pulse" cx="150" cy="129" r="21"/><path class="pmap-depth-scan" d="M75 152H270"/>'
  ];
  return '<svg class="pmap-tech-effect" viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+overlays[index]+'</svg>';
 }
 var drilling=[
  '<path class="pmap-monitor-scan" d="M92 85V155"/><path class="pmap-trace pmap-trace-gas" d="M104 111l20-3 12-15 16 12 18-4 16-12 23 6"/>',
  '<path class="pmap-trace pmap-trace-gas" d="M111 118l17-1 9-25 10 24 20-7 14 6 12-18 11 15 24-5"/><path class="pmap-monitor-scan" d="M148 87V201"/>',
  '<path class="pmap-trace pmap-trace-drill" d="M80 91Q94 152 151 163T245 168"/><circle class="pmap-report-pulse" cx="240" cy="129" r="15"/>',
  '<circle class="pmap-report-pulse" cx="139" cy="127" r="24"/><path class="pmap-trace pmap-trace-rpm" d="M213 112l14 8 13-5 15 16 19-6"/>',
  '<path class="pmap-trace pmap-trace-gas" d="M174 136l20-6 13-12 20-2 17-11"/><circle class="pmap-report-pulse" cx="411" cy="136" r="18"/>'
 ];
 var logging=[
  '<path class="pmap-depth-scan" d="M93 119H283"/><path class="pmap-monitor-scan" d="M196 88V171"/>',
  '<circle class="pmap-report-pulse" cx="213" cy="122" r="19"/><path class="pmap-trace pmap-trace-rpm" d="M176 149l9-18-4-18 14-15 2-14"/>',
  '<path class="pmap-trace pmap-trace-vision" d="M146 107Q170 85 191 107T273 109"/><path class="pmap-monitor-scan" d="M175 87V169"/>',
  '<path class="pmap-depth-scan" d="M66 133H275"/><path class="pmap-trace pmap-trace-drill" d="M101 92l-6 15 9 14-10 12 7 15-8 16"/>',
  '<g class="pmap-report-lines"><path d="M237 126l13 6-8 10 16 5-7 12 14 7"/></g><circle class="pmap-report-pulse" cx="254" cy="151" r="18"/>'
 ];
 return '<svg class="pmap-tech-effect" viewBox="0 0 '+w+' '+h+'" aria-hidden="true">'+(well?logging:drilling)[index]+'</svg>';
};
  function sceneHref(id) {
    var lesson = {"p1":"perforation-p1","p2":"perforation-p2","p3":"perforation-p3","p4":"perforation-p4"}[id];
    return '#/scene/' + id + (lesson ? '?case=' + lesson + '&amp;tab=bg' : '');
  }
  function spot(ctx, t, focus) {
    var sc = scene(ctx, t.id), b = t.box, active = focus && t.methods.indexOf(focus) >= 0, esc = ctx.K.esc;
    return '<a class="pmap-spot pmap-spot-' + t.id + (active ? ' is-relevant' : focus ? ' is-dim' : '') +
      '" href="' + sceneHref(t.id) + '" data-pmap-spot="' + t.id + '" data-pmap-tech-method="' + t.method +
      '" aria-label="' + esc(sc.name + '，' + method(t.method).name + '，查看场景讲解') +
      '" style="--tech:' + t.color + ';left:' + (b[0] / WIDTH * 100).toFixed(5) + '%;top:' +
      (b[1] / HEIGHT * 100).toFixed(5) + '%;width:' + (b[2] / WIDTH * 100).toFixed(5) +
      '%;height:' + (b[3] / HEIGHT * 100).toFixed(5) + '%">' + crop(b) + effect(t) +
      '<span class="pmap-spot-tag"><b>' + t.methods.map(function(m){return method(m).abbr;}).join(' + ') + '</b> 点击图画 · 查看讲解 <span>↗</span></span></a>';
  }
  function flow(path, color, duration, id) {
    var tag = id ? ' data-pmap-flow="' + id + '"' : '';
    return '<g class="pmap-flow"' + tag + ' style="--flow:' + color + '">' +
      '<path class="pmap-flow-track" d="' + path + '"/><path class="pmap-flow-current" d="' + path + '"/>' +
      [0, 1].map(function (i) {
        return '<g class="pmap-moving-arrow"><path d="M-10-6 0 0-10 6M-19-6-9 0-19 6"/>' +
          '<animateMotion dur="' + duration + 's" begin="' + (-duration * i / 2) + 's" repeatCount="indefinite" rotate="auto" path="' + path + '"/></g>';
      }).join('') + '</g>';
  }
  var STAGE_KIND="perforation";var STAGE_PATHS={"physical":["M128 337V930","M146 742Q164 732 182 728","M146 630Q165 621 181 619"],"feeds":["M743 300V328H434Q388 328 388 386","M743 300V329H725Q683 329 683 385","M756 300V327H922Q969 327 974 385","M764 301V328H1213Q1263 328 1264 385"],"returns":["M384 741Q387 776 636 808","M672 742Q698 785 771 809","M975 742Q953 783 803 809","M1269 742Q1243 790 952 810"],"scan":"M455 911H1073","pulse":[129,630]};var drawing=function drawing(){
 var parts=[],colors=['#ffab40','#40a7d4','#a18bd6','#8ab578'],well=STAGE_KIND==='welllog';
 if(STAGE_KIND!=='drilling'&&!well){
  var motion=STAGE_PATHS,feeds=motion.feeds,returns=motion.returns;
  for(var k=0;k<4;k++){parts.push(flow(feeds[k],'#58b6ee',3.5+k*.55,TECH[k].id));parts.push(flow(returns[k],colors[k],3.8+k*.4,TECH[k].id));}
  return '<svg class="pmap-flows" data-pmap-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+motion.physical.map(function(path,i){return flow(path,i%2?'#58b6ee':'#ffc238',5+i*.5);}).join('')+parts.join('')+'<path class="pmap-depth-scan" d="'+motion.scan+'"/><circle class="pmap-drill-pulse" cx="'+motion.pulse[0]+'" cy="'+motion.pulse[1]+'" r="21"/></svg>';
 }
 var paths=well?['M335 674C335 719 501 700 609 735','M651 674Q665 718 707 737','M962 679Q924 712 760 738','M1281 680Q1210 732 915 738']:['M360 704C355 753 460 735 568 764','M643 701Q660 741 690 764','M935 705Q920 738 737 764','M1237 710Q1190 755 902 764'];
 for(var i=0;i<4;i++)parts.push(flow(paths[i],colors[i],4+i*.45,TECH[i].id));
 return '<svg class="pmap-flows" data-pmap-motion="" viewBox="0 0 1448 1086" aria-hidden="true">'+
 flow(well?'M151 367V939':'M143 369V787','#ffc238',5)+flow(well?'M164 937V369':'M155 789V369','#58b6ee',5.5)+
 flow(well?'M779 307V332H430Q402 332 396 370':'M728 330V357Q728 367 690 367H375Q360 367 356 399','#58b6ee',5)+
 flow(well?'M780 308V330Q780 337 697 337L675 370':'M729 329V358Q729 369 657 369L638 399','#58b6ee',3.5)+
 flow(well?'M795 309V331Q795 337 888 337L920 370':'M741 330V355Q741 369 876 369L911 399','#58b6ee',3.8)+
 flow(well?'M803 309V332H1193Q1228 332 1240 369':'M750 330V357Q750 366 1174 366L1196 399','#58b6ee',5.2)+parts.join('')+
 flow(well?'M974 845L1032 869':'M958 856L999 887','#ff963c',3.5,TECH[4].id)+
 '<path class="pmap-depth-scan" d="M445 901H861"/><circle class="pmap-drill-pulse" cx="'+(well?151:145)+'" cy="'+(well?731:803)+'" r="23"/></svg>';
};
  function deck(ctx, focus) {
    var esc = ctx.K.esc;
    return available(ctx).filter(function (t) { return !focus || t.methods.indexOf(focus) >= 0; }).map(function (t) {
      var sc = scene(ctx, t.id), count = ctx.cases.bySceneAll(t.id).length;
      return '<a class="pmap-read-card" href="' + sceneHref(t.id) + '" style="--tech:' + t.color + '">' +
        '<span class="pmap-read-art">' + crop(t.art) + '<span class="pmap-read-id">' + t.id.toUpperCase() + ' · ' + t.methods.map(function(m){return method(m).abbr;}).join(' + ') + '</span></span>' +
        '<div class="pmap-read-text"><h3>' + esc(sc.name) + '</h3><p>' + esc(sc.point) + '</p>' +
        '<dl><div><dt>输入</dt><dd>' + esc(t.input) + '</dd></div><div><dt>输出</dt><dd>' + esc(t.output) + '</dd></div></dl>' +
        '<span class="pmap-read-link">' + (count ? '查看讲解与案例 · ' + count + ' 个已接入' : '查看场景讲解') + '<b>↗</b></span></div></a>';
    }).join('');
  }
  function extraScenes(ctx) {
    var extra = ctx.stage.scenes.filter(function (sc) { return !TECH.some(function (t) { return t.id === sc.id; }); });
    if (!extra.length) return '';
    var esc = ctx.K.esc;
    return '<section class="pmap-extra"><h2>更多射孔场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="pmap-page" data-perforation-stage data-pmap-stage data-pmap-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">射孔</span></nav>' +
      '<header class="pmap-head"><div><div class="pmap-eyebrow"><span>08 / 13</span> PERFORATION · 射孔</div>' +
      '<h1>连通井筒与储层，看清方案与效果<span>。</span></h1><p>从井况和设计条件出发，比较孔道、工具适用关系与施工后的响应资料。</p></div>' +
      '<div class="pmap-head-note"><span class="pmap-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="pmap-lab" aria-label="射孔现场交互总览">' +
      '<div class="pmap-toolbar"><div class="pmap-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-pmap-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="pmap-map pmap-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="pmap-motion" type="button" data-pmap-toggle aria-pressed="true"><span data-pmap-toggle-icon>Ⅱ</span><span data-pmap-toggle-label>暂停动效</span></button></div>' +
      '<div class="pmap-status"><span class="pmap-status-icon">↳</span><p data-pmap-status role="status">' + method(focus).note + '</p><span class="pmap-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="pmap-map' + (focus ? ' has-focus' : '') + '" id="pmap-map" data-pmap-map data-pmap-image-state="loading" aria-busy="true">' +
      '<img class="pmap-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-pmap-image width="1448" height="1086" draggable="false" alt="射孔提供井筒与储层的连通通道；设计候选、孔道响应与效果评价需要不同资料。">' +
      '<span class="pmap-image-status" data-pmap-image-status role="status">正在载入图解…</span><button class="pmap-image-retry" type="button" data-pmap-image-retry hidden>重新载入图解</button>' +
      '<div class="pmap-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="pmap-map-caption"><span class="pmap-live-dot"></span><span data-pmap-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="pmap-map-footer"><span><b>01</b> 井况与方案 <i>→</i> <b>02</b> 孔道连通 <i>→</i> <b>03</b> 响应资料 <i>→</i> <b>04</b> 效果比较</span><p>CO2与P1共享计算基础，分别讲方案权衡和参数比较；图画为专业示意。</p></div></section>' +
      '<section class="pmap-reading' + (focus ? ' has-focus' : '') + '" data-pmap-reading aria-labelledby="pmap-reading-title"><div class="pmap-reading-head"><div><span class="pmap-eyebrow">EXPLORE THE SCENES</span><h2 id="pmap-reading-title" data-pmap-reading-title>' + (focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景') + '</h2></div><span data-pmap-reading-count>' + (focus ? available(ctx).filter(function (t) { return t.methods.indexOf(focus) >= 0; }).length : available(ctx).length) + ' 个图画入口 ↗</span></div>' +
      '<div class="pmap-deck" id="pmap-deck" data-pmap-deck>' + deck(ctx, focus) + '</div></section>' + extraScenes(ctx) +
      '<div class="pager">' + (prev ? '<a class="prev" href="#/stage/' + esc(prev.id) + '"><span class="dir">← 上一环节</span><span class="nm">' + esc(prev.name) + '</span></a>' : '') +
      (next ? '<a class="next" href="#/stage/' + esc(next.id) + '"><span class="dir">下一环节 →</span><span class="nm">' + esc(next.name) + '</span></a>' : '') + '</div></main>';
  }

  function bind(root, ctx) {
    if (!root) return { destroy: function () {} };
    var focus = selected((ctx.query || {}).m), disposed = false;
    var buttons = [].slice.call(root.querySelectorAll('[data-pmap-method-button]'));
    var spots = [].slice.call(root.querySelectorAll('[data-pmap-spot]'));
    var flows = [].slice.call(root.querySelectorAll('[data-pmap-flow]'));
    var svgs = [].slice.call(root.querySelectorAll('[data-pmap-motion]'));
    var mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var paused = !!(mq && mq.matches);
    var map = root.querySelector('[data-pmap-map]'), baseImage = root.querySelector('[data-pmap-image]');
    var imageStatus = root.querySelector('[data-pmap-image-status]'), imageRetry = root.querySelector('[data-pmap-image-retry]');
    function imageReady() {
      if (disposed) return;
      map.dataset.pmapImageState = 'ready'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = true; imageRetry.hidden = true;
    }
    function imageFailed() {
      if (disposed) return;
      map.dataset.pmapImageState = 'error'; map.setAttribute('aria-busy', 'false');
      imageStatus.hidden = false; imageStatus.textContent = '图解暂未载入'; imageRetry.hidden = false;
    }
    baseImage.addEventListener('load', imageReady); baseImage.addEventListener('error', imageFailed);
    if (baseImage.complete && baseImage.naturalWidth > 0) imageReady();

    function applyFocus(value, updateUrl) {
      focus = selected(value);
      root.dataset.pmapMethod = focus;
      root.querySelector('[data-pmap-map]').classList.toggle('has-focus', !!focus);
      root.querySelector('[data-pmap-reading]').classList.toggle('has-focus', !!focus);
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.pmapMethodButton === focus)); });
      spots.forEach(function (s) {
        s.classList.toggle('is-relevant', !!focus && TECH.some(function(t){return t.id===s.dataset.pmapSpot && t.methods.indexOf(focus)>=0;}));
        s.classList.toggle('is-dim', !!focus && !TECH.some(function(t){return t.id===s.dataset.pmapSpot && t.methods.indexOf(focus)>=0;}));
      });
      flows.forEach(function (f) {
        var t = TECH.filter(function (x) { return x.id === f.dataset.pmapFlow; })[0];
        f.classList.toggle('is-dim', !!focus && t && t.methods.indexOf(focus) < 0);
        f.classList.toggle('is-relevant', !!focus && t && t.methods.indexOf(focus) >= 0);
      });
      root.querySelector('[data-pmap-status]').textContent = method(focus).note;
      root.querySelector('[data-pmap-reading-title]').textContent = focus ? method(focus).name + ' · 放大看细节' : '从图画，走进每一个场景';
      root.querySelector('[data-pmap-reading-count]').textContent = available(ctx).filter(function (t) { return !focus || t.methods.indexOf(focus) >= 0; }).length + ' 个图画入口 ↗';
      root.querySelector('[data-pmap-deck]').innerHTML = deck(ctx, focus);
      if (updateUrl) {
        try { global.history.replaceState(null, '', '#/stage/perforation' + (focus ? '?m=' + focus : '')); }
        catch (e) { /* file:// can reject replaceState; the selected UI remains usable. */ }
        var first = spots.filter(function (s) { return TECH.some(function(t){return t.id===s.dataset.pmapSpot && t.methods.indexOf(focus)>=0;}); })[0];
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
      root.querySelector('[data-pmap-toggle]').setAttribute('aria-pressed', String(!paused));
      root.querySelector('[data-pmap-toggle-icon]').textContent = paused ? '▶' : 'Ⅱ';
      root.querySelector('[data-pmap-toggle-label]').textContent = paused ? '播放动效' : '暂停动效';
      root.querySelector('[data-pmap-running]').textContent = paused ? '动效已暂停 · 仍可点击探索' : '信号正在流动';
      svgs.forEach(function (svg) {
        var action = paused ? 'pauseAnimations' : 'unpauseAnimations';
        if (typeof svg[action] === 'function') svg[action]();
      });
    }
    function click(e) {
      if (e.target.closest('[data-pmap-image-retry]')) {
        map.dataset.pmapImageState = 'loading'; map.setAttribute('aria-busy', 'true');
        imageStatus.hidden = false; imageStatus.textContent = '正在载入图解…'; imageRetry.hidden = true;
        var retrySource = IMAGE + '?retry=' + Date.now();
        baseImage.srcset = ''; baseImage.src = retrySource;
        [].forEach.call(root.querySelectorAll('.pmap-crop img'), function (image) { image.srcset = ''; image.src = retrySource; });
        return;
      }
      var choice = e.target.closest('[data-pmap-method-button]');
      if (choice) { applyFocus(choice.dataset.pmapMethodButton, true); return; }
      if (e.target.closest('[data-pmap-toggle]')) { paused = !paused; applyMotion(); }
    }
    function keydown(e) {
      var choice = e.target.closest('[data-pmap-method-button]');
      if (!choice) return;
      var i = buttons.indexOf(choice), n = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % buttons.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + buttons.length) % buttons.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = buttons.length - 1;
      else return;
      e.preventDefault(); buttons[n].focus(); applyFocus(buttons[n].dataset.pmapMethodButton, true);
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
  global.PerforationStage = { render: render, bind: bind, html: render, mount: bind };
})(window);
