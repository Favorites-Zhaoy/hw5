/* Generated from the retained mudlogging field template. */
window.OperationsStages={};
/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE='assets/images/operations/production-process-v2.webp';
var IMAGE_SET='assets/images/operations/production-process-v2-small.webp 768w, '+IMAGE+' 1448w';
var IMAGE_SIZES='(max-width:700px) calc(100vw - 28px), 1448px';
var WIDTH=1448,HEIGHT=1086;
var METHODS=[{"id":"","abbr":"ALL","name":"完整关系","note":"五项任务共享井号和时间基准，彼此互补；P1—P5是案例编号。配注示例作用于井间总液响应，不代表已完成分层配注。"},{"id":"cv","abbr":"CV","name":"计算机视觉","note":"PR1 示功图诊断。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"ts","abbr":"TS","name":"时序分析","note":"PR2 产量预测 · PR4 电潜泵预警 · PR5 结垢风险。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"opt","abbr":"OPT","name":"约束优化","note":"PR3 注水调配。方法标签解释各任务怎样处理资料，仍需回到业务判断。"}];
var TECH=[{"id":"pr1","method":"cv","methods":["cv"],"color":"#b95739","box":[4,430,294,340],"art":[4,430,294,340],"input":"同一张示功图的位移—载荷点集及其栅格图；井分组、卡片来源和图形标签随记录保留。","output":"四类形状候选、各类得分和低分复核标记；12张形状示范与全部55张留出图的门槛统计分开展示。"},{"id":"pr2","method":"ts","methods":["ts"],"color":"#497d99","box":[306,430,272,340],"art":[306,430,272,340],"input":"预测月以前12个月的可销售产油量Sm³/月；日期与原始百万Sm³月总量用于追溯。","output":"下一月产油量预测、实际值、逐月误差，以及相同目标月份的末值与指数递减参照。"},{"id":"pr3","method":"opt","methods":["opt"],"color":"#8b65a0","box":[589,430,271,340],"art":[589,430,271,340],"input":"5口注水井、4口生产井的对齐合成历史；总配注预算、单井上下限，以及明确给定的代理模型。","output":"各注水井建议量、与均分方案相比的预测总液响应、约束剩余量和可行性状态。"},{"id":"pr4","method":"ts","methods":["ts"],"color":"#6b884b","box":[867,430,286,340],"art":[867,430,286,340],"input":"仿真片段中的时间、电流A、温度°C、压力MPa和频率Hz；每次预测只读取已发生的记录。","output":"下一时刻预测、逐通道残差、汇总异常分数、报警时刻与相对仿真异常起点的检出延迟。"},{"id":"pr5","method":"ts","methods":["ts"],"color":"#3a8c8a","box":[1159,430,287,340],"art":[1159,430,287,340],"input":"按时间排列的P-TPT、P-MON-CKP、T-TPT及可用QGL；保留真实井号、原始时间与采样信息。","output":"正常关系的重建残差、异常分数、候选报警，以及相对0/107/7事件阶段的时间对照。"}];
function relevant(t,focus){return t.methods.indexOf(focus)>=0;}
 function lessonIntro(t,sc){var c=global.OPERATIONS_CONTENT.find(function(c){return c.id===t.id;});return c?c.intro:sc.point;}
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
  function effect(t){return '<svg class="ml-tech-effect" viewBox="0 0 '+t.box[2]+' '+t.box[3]+'" aria-hidden="true"><path class="ml-trace ml-trace-vision" d="M24 118H'+(t.box[2]-24)+'V'+(t.box[3]-28)+'H24Z"/><path class="ml-monitor-scan" d="M25 118V'+(t.box[3]-28)+'"/></svg>';}
function sceneHref(id){var c=global.OPERATIONS_CONTENT.find(function(c){return c.id===id;});return '#/scene/'+id+'?case='+c.caseId+'&amp;tab=bg';}
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
  function drawing(){return '<svg class="ml-flows" data-ml-motion viewBox="0 0 1448 1086" aria-hidden="true">'+flow('M724 378H146V430', '#b95739', 5, 'pr1')+flow('M724 378H448V430', '#497d99', 5.333333333333333, 'pr2')+flow('M724 378H731V430', '#8b65a0', 5.666666666666667, 'pr3')+flow('M724 378H1009V430', '#6b884b', 6, 'pr4')+flow('M724 378H1301V430', '#3a8c8a', 6.333333333333333, 'pr5')+'</svg>';}
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
    return '<section class="ml-extra"><h2>更多采油场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="ml-page op-stage" data-operations-stage data-ml-stage data-ml-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">采油</span></nav>' +
      '<header class="ml-head"><div><div class="ml-eyebrow"><span>09 / 13</span> PRODUCTION · 采油</div>' +
      '<h1>把每一口井的变化，变成可核对的生产判断<span>。</span></h1><p>先理解举升、注水与计量，再看诊断、预测和调配怎样帮助日常生产。</p></div>' +
      '<div class="ml-head-note"><span class="ml-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="ml-lab" aria-label="采油现场交互总览">' +
      '<div class="ml-toolbar"><div class="ml-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-ml-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="ml-map ml-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="ml-motion" type="button" data-ml-toggle aria-pressed="true"><span data-ml-toggle-icon>Ⅱ</span><span data-ml-toggle-label>暂停动效</span></button></div>' +
      '<div class="ml-status"><span class="ml-status-icon">↳</span><p data-ml-status role="status">' + method(focus).note + '</p><span class="ml-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="ml-map' + (focus ? ' has-focus' : '') + '" id="ml-map" data-ml-map data-ml-image-state="loading" aria-busy="true">' +
      '<img class="ml-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-ml-image width="1448" height="1086" draggable="false" alt="采油业务关系示意：五项任务共享井号和时间基准，彼此互补；P1—P5是案例编号。配注示例作用于井间总液响应，不代表已完成分层配注。；AI生成的教学插图，不是实验资料。">' +
      '<span class="ml-image-status" data-ml-image-status role="status">正在载入图解…</span><button class="ml-image-retry" type="button" data-ml-image-retry hidden>重新载入图解</button>' +
      '<div class="ml-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="ml-map-caption"><span class="ml-live-dot"></span><span data-ml-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="ml-map-footer"><span>生产记录 → 工况候选、预测与约束调配 → 工程复核</span><p>五项任务共享井号和时间基准，彼此互补；P1—P5是案例编号。配注示例作用于井间总液响应，不代表已完成分层配注。 AI生成的业务示意，实验资料与结果在各案例中。</p></div></section>'+
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
      root.dataset.mlMethod = focus;root.classList.toggle('has-many-focus', !!focus && TECH.filter(function(t){return relevant(t,focus);}).length>1);
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
        try { global.history.replaceState(null, '', '#/stage/production' + (focus ? '?m=' + focus : '')); }
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
  global.OperationsStages.production={render:render,bind:bind};
})(window);

/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE='assets/images/operations/workover-process-v2.webp';
var IMAGE_SET='assets/images/operations/workover-process-v2-small.webp 768w, '+IMAGE+' 1448w';
var IMAGE_SIZES='(max-width:700px) calc(100vw - 28px), 1448px';
var WIDTH=1448,HEIGHT=1086;
var METHODS=[{"id":"","abbr":"ALL","name":"完整关系","note":"五项任务围绕同一井筒与作业记录互补，不是必须依次运行的五道工序。W1—W5是案例编号。"},{"id":"cv","abbr":"CV","name":"计算机视觉","note":"WO3 超声壁厚。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"ts","abbr":"TS","name":"时序分析","note":"WO4 过程预警 · WO5 计划工期。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"nlp","abbr":"NLP","name":"自然语言处理","note":"WO1 修井方案。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"kg","abbr":"KG","name":"知识图谱","note":"WO1 修井方案 · WO2 打捞选型。方法标签解释各任务怎样处理资料，仍需回到业务判断。"}];
var TECH=[{"id":"wo1","method":"kg","methods":["kg","nlp"],"color":"#b95739","box":[4,430,294,360],"art":[4,430,294,360],"input":"中文或英文查询、已知井况条件，以及真实申报的井号、日期、官方作业代码和简短文本。","output":"有来源链接的候选计划、命中术语、相似度排序，以及约束满足、冲突或缺信息的证据清单。"},{"id":"wo2","method":"kg","methods":["kg"],"color":"#497d99","box":[306,430,272,360],"art":[306,430,272,360],"input":"落物类别、外径和内径、可接近的抓持面、材料信息；井筒最小通径与课堂指定间隙；有出处的工具规格。","output":"各候选的约束核对卡、排除原因或缺失证据，以及工具与落物的简化几何关系图。"},{"id":"wo3","method":"cv","methods":["cv"],"color":"#8b65a0","box":[589,430,271,360],"art":[589,430,271,360],"input":"公开仿真的单条超声A扫描、采样间隔和受控几何信息；训练目标为模型已知的壁厚。","output":"回波间隔基线与CNN的壁厚估计（mm）、对同一波形的误差，以及留出管径的整体评估。"},{"id":"wo4","method":"ts","methods":["ts"],"color":"#6b884b","box":[867,430,286,360],"art":[867,430,286,360],"input":"带时间戳的压力、扭矩与已知工序；完整作业段的训练、验证和测试划分。","output":"实时可计算的残差、报警时间和持续区间，以及相对合成异常起点的检出延迟、漏报和误报统计。"},{"id":"wo5","method":"ts","methods":["ts"],"color":"#3a8c8a","box":[1159,430,287,360],"art":[1159,430,287,360],"input":"同井严格更早提交的计划日期与预计天数；预测时已经知道的作业上下文另行标明。","output":"下一份申报计划预计天数的中央估计、独立CHECK误差范围、历史基线，以及按日期留出的误差与范围覆盖。"}];
function relevant(t,focus){return t.methods.indexOf(focus)>=0;}
 function lessonIntro(t,sc){var c=global.OPERATIONS_CONTENT.find(function(c){return c.id===t.id;});return c?c.intro:sc.point;}
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
  function effect(t){return '<svg class="ml-tech-effect" viewBox="0 0 '+t.box[2]+' '+t.box[3]+'" aria-hidden="true"><path class="ml-trace ml-trace-vision" d="M24 118H'+(t.box[2]-24)+'V'+(t.box[3]-28)+'H24Z"/><path class="ml-monitor-scan" d="M25 118V'+(t.box[3]-28)+'"/></svg>';}
function sceneHref(id){var c=global.OPERATIONS_CONTENT.find(function(c){return c.id===id;});return '#/scene/'+id+'?case='+c.caseId+'&amp;tab=bg';}
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
  function drawing(){return '<svg class="ml-flows" data-ml-motion viewBox="0 0 1448 1086" aria-hidden="true">'+flow('M724 378H146V430', '#b95739', 5, 'wo1')+flow('M724 378H448V430', '#497d99', 5.333333333333333, 'wo2')+flow('M724 378H731V430', '#8b65a0', 5.666666666666667, 'wo3')+flow('M724 378H1009V430', '#6b884b', 6, 'wo4')+flow('M724 378H1301V430', '#3a8c8a', 6.333333333333333, 'wo5')+'</svg>';}
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
    return '<section class="ml-extra"><h2>更多修井场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="ml-page op-stage" data-operations-stage data-ml-stage data-ml-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">修井</span></nav>' +
      '<header class="ml-head"><div><div class="ml-eyebrow"><span>10 / 13</span> WORKOVER · 修井</div>' +
      '<h1>围绕同一口井，核对方案、工具与作业风险<span>。</span></h1><p>从井筒状态与作业目标出发，认识检索、尺寸匹配、测厚和过程监测的不同任务。</p></div>' +
      '<div class="ml-head-note"><span class="ml-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="ml-lab" aria-label="修井现场交互总览">' +
      '<div class="ml-toolbar"><div class="ml-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-ml-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="ml-map ml-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="ml-motion" type="button" data-ml-toggle aria-pressed="true"><span data-ml-toggle-icon>Ⅱ</span><span data-ml-toggle-label>暂停动效</span></button></div>' +
      '<div class="ml-status"><span class="ml-status-icon">↳</span><p data-ml-status role="status">' + method(focus).note + '</p><span class="ml-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="ml-map' + (focus ? ' has-focus' : '') + '" id="ml-map" data-ml-map data-ml-image-state="loading" aria-busy="true">' +
      '<img class="ml-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-ml-image width="1448" height="1086" draggable="false" alt="修井业务关系示意：五项任务围绕同一井筒与作业记录互补，不是必须依次运行的五道工序。W1—W5是案例编号。；AI生成的教学插图，不是实验资料。">' +
      '<span class="ml-image-status" data-ml-image-status role="status">正在载入图解…</span><button class="ml-image-retry" type="button" data-ml-image-retry hidden>重新载入图解</button>' +
      '<div class="ml-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="ml-map-caption"><span class="ml-live-dot"></span><span data-ml-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="ml-map-footer"><span>井史与检测资料 → 方案与工具候选 → 现场复核与记录</span><p>五项任务围绕同一井筒与作业记录互补，不是必须依次运行的五道工序。W1—W5是案例编号。 AI生成的业务示意，实验资料与结果在各案例中。</p></div></section>'+
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
      root.dataset.mlMethod = focus;root.classList.toggle('has-many-focus', !!focus && TECH.filter(function(t){return relevant(t,focus);}).length>1);
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
        try { global.history.replaceState(null, '', '#/stage/workover' + (focus ? '?m=' + focus : '')); }
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
  global.OperationsStages.workover={render:render,bind:bind};
})(window);

/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE='assets/images/operations/eor-process-v2.webp';
var IMAGE_SET='assets/images/operations/eor-process-v2-small.webp 768w, '+IMAGE+' 1448w';
var IMAGE_SIZES='(max-width:700px) calc(100vw - 28px), 1448px';
var WIDTH=1448,HEIGHT=1086;
var METHODS=[{"id":"","abbr":"ALL","name":"完整关系","note":"压裂、化学驱、蒸汽与微生物是不同技术路径；E1—E5是案例编号，不表示依次实施。试验与模拟的范围分别保留。"},{"id":"cv","abbr":"CV","name":"计算机视觉","note":"E2 裂缝形态推断。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"ts","abbr":"TS","name":"时序分析","note":"E4 蒸汽注入情景优化 · E5 微生物产物软测量。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"opt","abbr":"OPT","name":"约束优化","note":"E1 压裂参数优化 · E2 裂缝形态推断 · E3 化学驱浓度筛选 · E4 蒸汽注入情景优化。方法标签解释各任务怎样处理资料，仍需回到业务判断。"}];
var TECH=[{"id":"e1","method":"opt","methods":["opt"],"color":"#b95739","box":[4,430,294,345],"art":[4,430,294,345],"input":"杨氏模量E（GPa）、泊松比ν、固定缝高h（m）、总注入排量Q（m³/s）、注入时间t（s）、流体黏度μ（Pa·s），以及允许的净压力和注入体积上限。","output":"代理预测的裂缝半长（m）、入口开度（mm）和净压力（MPa）；满足约束的参数候选；候选的解析复核结果与代理误差。"},{"id":"e2","method":"cv","methods":["cv","opt"],"color":"#497d99","box":[306,430,272,345],"art":[306,430,272,345],"input":"模拟事件密度图及其椭圆中心、长短轴和方向标签；真实目录的时间、经纬度、深度与定位标准差，经局部米制坐标转换后形成投影密度图。","output":"模拟留出图上的椭圆参数误差与包络重合度；CNN初值和优化后包络的对照；真实FORGE事件云上的定性包络及定位不确定性提示。"},{"id":"e3","method":"opt","methods":["opt"],"color":"#8b65a0","box":[589,430,271,345],"art":[589,430,271,345],"input":"聚合物浓度c（mg/L）、岩心渗透率k（10⁻³ μm²），以及希望达到的阻力系数下限；模型输入仅使用c与k。","output":"预测阻力系数及模型不确定性；边界内满足条件的最低浓度候选，或无可行候选提示；按浓度组留出的预测误差。"},{"id":"e4","method":"ts","methods":["ts","opt"],"color":"#6b884b","box":[867,430,286,345],"art":[867,430,286,345],"input":"CSS项目连续月度的产油量Oil（m³/月）与注汽量SteamINJ（15°C冷水当量m³/月），过去的时间顺序，以及明确给定的未来三个月注汽情景和预算。","output":"留出月份的GRU预测、持平基线及误差；各注汽情景下三个月预测产油量与累计值；预算、月间调整和历史范围的可行性检查。"},{"id":"e5","method":"ts","methods":["ts"],"color":"#3a8c8a","box":[1159,430,287,345],"art":[1159,430,287,345],"input":"检测时刻t之前24小时的转速（rpm）、温度（°C）和溶氧（%饱和度），按实际时间分别对齐并汇总为24个小时段；不输入当前产物、菌体或其他离线化验。","output":"时刻t的海藻糖脂浓度估计（g/L）、实际检测值与误差；按发酵条件留出的评价；每个输入窗口的观测数量与时间范围。"}];
function relevant(t,focus){return t.methods.indexOf(focus)>=0;}
 function lessonIntro(t,sc){var c=global.OPERATIONS_CONTENT.find(function(c){return c.id===t.id;});return c?c.intro:sc.point;}
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
  function effect(t){return '<svg class="ml-tech-effect" viewBox="0 0 '+t.box[2]+' '+t.box[3]+'" aria-hidden="true"><path class="ml-trace ml-trace-vision" d="M24 118H'+(t.box[2]-24)+'V'+(t.box[3]-28)+'H24Z"/><path class="ml-monitor-scan" d="M25 118V'+(t.box[3]-28)+'"/></svg>';}
function sceneHref(id){var c=global.OPERATIONS_CONTENT.find(function(c){return c.id===id;});return '#/scene/'+id+'?case='+c.caseId+'&amp;tab=bg';}
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
  function drawing(){return '<svg class="ml-flows" data-ml-motion viewBox="0 0 1448 1086" aria-hidden="true">'+flow('M724 378H146V430', '#b95739', 5, 'e1')+flow('M724 378H448V430', '#497d99', 5.333333333333333, 'e2')+flow('M724 378H731V430', '#8b65a0', 5.666666666666667, 'e3')+flow('M724 378H1009V430', '#6b884b', 6, 'e4')+flow('M724 378H1301V430', '#3a8c8a', 6.333333333333333, 'e5')+'</svg>';}
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
    return '<section class="ml-extra"><h2>更多增采场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="ml-page op-stage" data-operations-stage data-ml-stage data-ml-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">增采</span></nav>' +
      '<header class="ml-head"><div><div class="ml-eyebrow"><span>11 / 13</span> ENHANCED RECOVERY · 增采</div>' +
      '<h1>从储层与流体入手，比较增采方案的条件<span>。</span></h1><p>理解压裂、化学驱、热采与微生物研究怎样作用，再比较模型能回答的具体问题。</p></div>' +
      '<div class="ml-head-note"><span class="ml-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="ml-lab" aria-label="增采现场交互总览">' +
      '<div class="ml-toolbar"><div class="ml-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-ml-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="ml-map ml-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="ml-motion" type="button" data-ml-toggle aria-pressed="true"><span data-ml-toggle-icon>Ⅱ</span><span data-ml-toggle-label>暂停动效</span></button></div>' +
      '<div class="ml-status"><span class="ml-status-icon">↳</span><p data-ml-status role="status">' + method(focus).note + '</p><span class="ml-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="ml-map' + (focus ? ' has-focus' : '') + '" id="ml-map" data-ml-map data-ml-image-state="loading" aria-busy="true">' +
      '<img class="ml-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-ml-image width="1448" height="1086" draggable="false" alt="增采业务关系示意：压裂、化学驱、蒸汽与微生物是不同技术路径；E1—E5是案例编号，不表示依次实施。试验与模拟的范围分别保留。；AI生成的教学插图，不是实验资料。">' +
      '<span class="ml-image-status" data-ml-image-status role="status">正在载入图解…</span><button class="ml-image-retry" type="button" data-ml-image-retry hidden>重新载入图解</button>' +
      '<div class="ml-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="ml-map-caption"><span class="ml-live-dot"></span><span data-ml-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="ml-map-footer"><span>储层与流体条件 → 模型与方案比较 → 约束、验证与复核</span><p>压裂、化学驱、蒸汽与微生物是不同技术路径；E1—E5是案例编号，不表示依次实施。试验与模拟的范围分别保留。 AI生成的业务示意，实验资料与结果在各案例中。</p></div></section>'+
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
      root.dataset.mlMethod = focus;root.classList.toggle('has-many-focus', !!focus && TECH.filter(function(t){return relevant(t,focus);}).length>1);
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
        try { global.history.replaceState(null, '', '#/stage/eor' + (focus ? '?m=' + focus : '')); }
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
  global.OperationsStages.eor={render:render,bind:bind};
})(window);

window.OperationsStage={supports:function(id){return !!window.OperationsStages[id];},render:function(ctx){return window.OperationsStages[ctx.stage.id].render(ctx);},bind:function(root,ctx){return window.OperationsStages[ctx.stage.id].bind(root,ctx);}};
