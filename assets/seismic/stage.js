/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE = 'assets/images/seismic/seismic-process-v1.webp';
  var IMAGE_SET = 'assets/images/seismic/seismic-process-v1-small.webp 768w, ' + IMAGE + ' 1448w';
  var IMAGE_SIZES = '(max-width:700px) calc(100vw - 28px), 1448px';
  var WIDTH = 1448, HEIGHT = 1086;
  var METHODS=[
 {id:'',abbr:'ALL',name:'完整关系',note:'从激发接收，到资料处理、结构解释与参数预测。五个任务共享或互补资料，编号不表示运行顺序。'},
 {id:'cv',abbr:'CV',name:'计算机视觉',note:'看反射的组织、错断和残差。S1、S2、S4、S5使用图面或局部波形邻域，但各自目标不同。'},
 {id:'ts',abbr:'TS',name:'时序分析',note:'S3定位炮集各道最早起跳；时间邻域与低分道复核共同支持初至拾取。'},
 {id:'opt',abbr:'OPT',name:'约束优化',note:'S4结合井约束比较参数候选。输出依赖波子、尺度与先验，需检查残差和多解性。'}];
 var TECH=[
 {id:'s1',method:'cv',methods:['cv'],color:'#b95739',box:[2,447,281,309],art:[5,503,275,247],input:'三维振幅邻域',output:'断层得分与复核候选'},
 {id:'s2',method:'cv',methods:['cv'],color:'#497d99',box:[291,447,286,309],art:[295,503,276,247],input:'F3剖面与解释方案',output:'相类候选与分歧区域'},
 {id:'s3',method:'ts',methods:['ts'],color:'#8b65a0',box:[584,447,273,309],art:[590,503,263,247],input:'有采样基准的炮集',output:'逐道初至与复核记录'},
 {id:'s4',method:'cv',methods:['cv','opt'],color:'#6b884b',box:[864,447,287,309],art:[870,503,277,247],input:'地震响应与井约束',output:'带条件的参数候选'},
 {id:'s5',method:'cv',methods:['cv'],color:'#3a8c8a',box:[1159,447,287,309],art:[1165,503,277,247],input:'含噪剖面与实验参考',output:'去噪图、残差与保真比较'}];
 function relevant(t,focus){return t.methods.indexOf(focus)>=0;}
 function lessonIntro(t,sc){var c=global.SEISMIC_CONTENT.find(function(c){return c.id===t.id;});return c?c.intro:sc.point;}
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
  function effect(t){
 var shapes={s1:'<path class="ml-trace ml-trace-drill" d="M180 61l-17 48-30 37-11 51"/>',s2:'<path class="ml-trace ml-trace-vision" d="M34 66h161v107H34z"/><path class="ml-monitor-scan" d="M35 66v107"/>',s3:'<path class="ml-trace ml-trace-rpm" d="M34 132l26-14 26-23 27-24 26 18 28 22 29 16"/>',s4:'<path class="ml-trace ml-trace-gas" d="M216 77l-6 18 12 17-17 22 16 20-11 22"/>',s5:'<path class="ml-trace ml-trace-vision" d="M103 65h71v108h-71z"/><path class="ml-monitor-scan" d="M104 65v108"/>'};
 return '<svg class="ml-tech-effect" viewBox="0 0 '+t.box[2]+' '+t.box[3]+'" aria-hidden="true">'+shapes[t.id]+'</svg>';}
  function sceneHref(id){var c=global.SEISMIC_CONTENT.find(function(c){return c.id===id;});return '#/scene/'+id+'?case='+c.caseId+'&amp;tab=bg';}
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
  function drawing(){return '<svg class="ml-flows" data-ml-motion viewBox="0 0 1448 1086" aria-hidden="true">'+
 flow('M470 367V400H150V445','#d68850',5,'s1')+flow('M480 367V414H433V445','#639bb5',5,'s2')+
 flow('M870 367V410H717V445','#a280b9',5,'s3')+flow('M900 367V414H1300V445','#62a6a5',5,'s5')+
 flow('M471 367H1000V445','#8baf65',6,'s4')+
 flow('M150 758V787H501V831','#d68850',6,'s1')+flow('M433 758V805H532V831','#639bb5',6,'s2')+flow('M1000 758V802H621V831','#8baf65',6,'s4')+'</svg>';}
  function deck(ctx, focus) {
    var esc = ctx.K.esc;
    return available(ctx).filter(function (t) { return !focus || relevant(t, focus); }).map(function (t) {
      var sc = scene(ctx, t.id), count = ctx.cases.bySceneAll(t.id).length;
      return '<a class="ml-read-card" href="' + sceneHref(t.id) + '" style="--tech:' + t.color + '">' +
        '<span class="ml-read-art">' + crop(t.art) + '<span class="ml-read-id">' + t.id.toUpperCase() + ' · ' + t.methods.map(function(k){return method(k).abbr;}).join(' + ') + '</span></span>' +
        '<div class="ml-read-text"><h3>' + esc(sc.name) + '</h3><p>' + esc(lessonIntro(t,sc)) + '</p>' +
        '<dl><div><dt>输入</dt><dd>' + esc(t.input) + '</dd></div><div><dt>输出</dt><dd>' + esc(t.output) + '</dd></div></dl>' +
        '<span class="ml-read-link">' + (count ? '查看讲解与案例 · ' + count + ' 个已接入' : '查看场景讲解') + '<b>↗</b></span></div></a>';
    }).join('');
  }
  function extraScenes(ctx) {
    var extra = ctx.stage.scenes.filter(function (sc) { return !TECH.some(function (t) { return t.id === sc.id; }); });
    if (!extra.length) return '';
    var esc = ctx.K.esc;
    return '<section class="ml-extra"><h2>更多物探场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="ml-page sx-stage" data-seismic-stage data-ml-stage data-ml-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">物探</span></nav>' +
      '<header class="ml-head"><div><div class="ml-eyebrow"><span>02 / 13</span> GEOPHYSICS · 物探</div>' +
      '<h1>从地震记录，读出地下线索<span>。</span></h1><p>先认识采集、处理、解释与预测，再看每种方法具体接手哪一步。</p></div>' +
      '<div class="ml-head-note"><span class="ml-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="ml-lab" aria-label="物探现场交互总览">' +
      '<div class="ml-toolbar"><div class="ml-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-ml-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="ml-map ml-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="ml-motion" type="button" data-ml-toggle aria-pressed="true"><span data-ml-toggle-icon>Ⅱ</span><span data-ml-toggle-label>暂停动效</span></button></div>' +
      '<div class="ml-status"><span class="ml-status-icon">↳</span><p data-ml-status role="status">' + method(focus).note + '</p><span class="ml-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="ml-map' + (focus ? ' has-focus' : '') + '" id="ml-map" data-ml-map data-ml-image-state="loading" aria-busy="true">' +
      '<img class="ml-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-ml-image width="1448" height="1086" draggable="false" alt="物探关系图：激发与接收形成炮集，初至与噪声处理提供可用资料；反射图用于断层和相类解释，参数预测另需井约束。">' +
      '<span class="ml-image-status" data-ml-image-status role="status">正在载入图解…</span><button class="ml-image-retry" type="button" data-ml-image-retry hidden>重新载入图解</button>' +
      '<div class="ml-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="ml-map-caption"><span class="ml-live-dot"></span><span data-ml-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="ml-map-footer"><span>采集记录 → 处理资料 → 解释与预测</span><p>断层与地震相是互补解释；初至与去噪是可按需组合的处理任务；参数预测另需井约束。S1—S5为案例编号。</p></div></section>'+
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
        try { global.history.replaceState(null, '', '#/stage/seismic' + (focus ? '?m=' + focus : '')); }
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
  global.SeismicStage = { render:render, bind:bind, art:function(name,alt){return '<img src="assets/images/seismic/'+name+'.webp" width="1536" height="1024" alt="'+global.SeismicMath.esc(alt)+'" decoding="async">';} };
})(window);
