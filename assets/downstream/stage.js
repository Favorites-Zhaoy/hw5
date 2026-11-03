/* Generated from the retained mudlogging field template. */
window.DownstreamStages={};
/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE='assets/images/downstream/transport-process-v1.webp';
var IMAGE_SET='assets/images/downstream/transport-process-v1-small.webp 768w, '+IMAGE+' 1448w';
var IMAGE_SIZES='(max-width:700px) calc(100vw - 28px), 1448px';
var WIDTH=1448,HEIGHT=1086;
var METHODS=[{"id":"","abbr":"ALL","name":"完整关系","note":"五项任务共享管段、设备与时间标识，分别处理泄漏、腐蚀、调度、计量与储罐状态，彼此互补；T1—T5是案例编号。"},{"id":"cv","abbr":"CV","name":"计算机视觉","note":"T2 腐蚀评估 · T5 可见液位。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"ts","abbr":"TS","name":"时序分析","note":"T1 泄漏检测 · T2 腐蚀评估 · T4 计量校正。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"opt","abbr":"OPT","name":"约束优化","note":"T3 集输优化。方法标签解释各任务怎样处理资料，仍需回到业务判断。"}];
var TECH=[{"id":"t1","method":"ts","methods":["ts"],"color":"#b95739","box":[4,430,290,340],"art":[4,430,290,340],"input":"96点×5通道：双端压力MPa、进出流量m³/h和相对声学能量；每0.05s采样，另保留管长和波速假设。","output":"正常、调阀扰动、泄漏三类得分，以及泄漏候选的互相关迟到、位置与复核信息。"},{"id":"t2","method":"cv","methods":["cv","ts"],"color":"#497d99","box":[306,430,272,340],"art":[306,430,272,340],"input":"32×32灰度检测图；另有过去6次的[壁厚mm,时间year]记录。参考位置、掩膜和未来壁厚均不进入对应模型输入。","output":"缺陷候选得分、下一年壁厚，以及在声明4mm阈值下的剩余时间情景。"},{"id":"t3","method":"opt","methods":["opt"],"color":"#8b65a0","box":[589,430,271,340],"art":[589,430,271,340],"input":"需求输量10³m³/h、压力上限bar，以及两站的流量边界和声明的压降/能耗系数。","output":"各站开停与流量、代理能耗kW、压力、容量剩余和不可行时的输量缺口。"},{"id":"t4","method":"ts","methods":["ts"],"color":"#6b884b","box":[867,430,286,340],"art":[867,430,286,340],"input":"受控流量计读数m³/h、标定时刻的读数减参考值、1min时间步；非标定时刻没有参考输入。","output":"偏差与漂移状态、校正后流量、与最近标定偏差保持法的误差对照。"},{"id":"t5","method":"cv","methods":["cv"],"color":"#3a8c8a","box":[1159,430,287,340],"art":[1159,430,287,340],"input":"真实照片的32×32 RGB像素，按CHW顺序除255；人工已知的口沿和底缘仅用于输出高度换算。","output":"液面纵坐标候选、与标注的像素偏差，以及在已知上下缘下的可见高度比例。"}];
function relevant(t,focus){return t.methods.indexOf(focus)>=0;}
 function lessonIntro(t,sc){var c=global.DOWNSTREAM_CONTENT.find(function(c){return c.id===t.id;});return c?c.intro:sc.point;}
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
function sceneHref(id){var c=global.DOWNSTREAM_CONTENT.find(function(c){return c.id===id;});return '#/scene/'+id+'?case='+c.caseId+'&amp;tab=bg';}
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
  function drawing(){return '<svg class="ml-flows" data-ml-motion viewBox="0 0 1448 1086" aria-hidden="true">'+flow('M724 378H146V430', '#b95739', 5, 't1')+flow('M724 378H448V430', '#497d99', 5.333333333333333, 't2')+flow('M724 378H731V430', '#8b65a0', 5.666666666666667, 't3')+flow('M724 378H1009V430', '#6b884b', 6, 't4')+flow('M724 378H1301V430', '#3a8c8a', 6.333333333333333, 't5')+'</svg>';}
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
    return '<section class="ml-extra"><h2>更多运输场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="ml-page op-stage" data-downstream-stage data-ml-stage data-ml-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">运输</span></nav>' +
      '<header class="ml-head"><div><div class="ml-eyebrow"><span>12 / 13</span> TRANSPORTATION · 运输</div>' +
      '<h1>沿着管线与储罐，读懂运行中的变化<span>。</span></h1><p>先理解输送、增压、计量与储存，再比较异常检测、缺陷评估和运行优化。</p></div>' +
      '<div class="ml-head-note"><span class="ml-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="ml-lab" aria-label="运输现场交互总览">' +
      '<div class="ml-toolbar"><div class="ml-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-ml-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="ml-map ml-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="ml-motion" type="button" data-ml-toggle aria-pressed="true"><span data-ml-toggle-icon>Ⅱ</span><span data-ml-toggle-label>暂停动效</span></button></div>' +
      '<div class="ml-status"><span class="ml-status-icon">↳</span><p data-ml-status role="status">' + method(focus).note + '</p><span class="ml-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="ml-map' + (focus ? ' has-focus' : '') + '" id="ml-map" data-ml-map data-ml-image-state="loading" aria-busy="true">' +
      '<img class="ml-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-ml-image width="1448" height="1086" draggable="false" alt="运输业务关系示意：五项任务共享管段、设备与时间标识，分别处理泄漏、腐蚀、调度、计量与储罐状态，彼此互补；T1—T5是案例编号。；AI生成的教学插图，不是实验资料。">' +
      '<span class="ml-image-status" data-ml-image-status role="status">正在载入图解…</span><button class="ml-image-retry" type="button" data-ml-image-retry hidden>重新载入图解</button>' +
      '<div class="ml-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="ml-map-caption"><span class="ml-live-dot"></span><span data-ml-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="ml-map-footer"><span>管线与储运资料 → 监测、评估与约束调度 → 工程复核与记录</span><p>五项任务共享管段、设备与时间标识，分别处理泄漏、腐蚀、调度、计量与储罐状态，彼此互补；T1—T5是案例编号。 AI生成的业务示意，实验资料与结果在各案例中。</p></div></section>'+
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
        try { global.history.replaceState(null, '', '#/stage/transport' + (focus ? '?m=' + focus : '')); }
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
  global.DownstreamStages.transport={render:render,bind:bind};
})(window);

/* The supplied illustration stays intact. Native elements add focus, motion and links. */
(function (global) {
  'use strict';

  var IMAGE='assets/images/downstream/refining-process-v1.webp';
var IMAGE_SET='assets/images/downstream/refining-process-v1-small.webp 768w, '+IMAGE+' 1448w';
var IMAGE_SIZES='(max-width:700px) calc(100vw - 28px), 1448px';
var WIDTH=1448,HEIGHT=1086;
var METHODS=[{"id":"","abbr":"ALL","name":"完整关系","note":"五项任务对应操作、产品、设备、化验和在线质量，按业务需要组合；R1—R5是案例编号，不是五道连续炼油工序。"},{"id":"ts","abbr":"TS","name":"时序分析","note":"R2 催化裂化产物预测 · R3 炼化设备预测性维护 · R5 产品质量在线软测量。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"opt","abbr":"OPT","name":"约束优化","note":"R1 常减压装置操作优化 · R2 催化裂化产物预测 · R4 化验数据智能审核。方法标签解释各任务怎样处理资料，仍需回到业务判断。"},{"id":"nlp","abbr":"NLP","name":"自然语言处理","note":"R4 化验数据智能审核。方法标签解释各任务怎样处理资料，仍需回到业务判断。"}];
var TECH=[{"id":"r1","method":"opt","methods":["opt"],"color":"#b95739","box":[4,430,290,340],"art":[4,430,290,340],"input":"第一切割温度150—220°C、第二切割温度300—370°C、回流比0.5—4，以及控制伪组分分布的重端指数0.20—0.60。重端指数是教学参数，不是实测重油比例。","output":"轻、中、重三类馏分质量百分数、切割交叠指标、相对热负荷；有界搜索的候选及解析复核结果，或无可行候选提示。"},{"id":"r2","method":"opt","methods":["opt","ts"],"color":"#497d99","box":[306,430,272,340],"art":[306,430,272,340],"input":"每5分钟保留一个源记录，8点窗口含当前工况，跨度35分钟。五个信号为新鲜进料lb/s、反应温度°F、再生温度°F、再生催化剂循环量lb/min及分馏回流lb/min。","output":"当前时刻五类产品的wt%收率，以及留出时间段误差；温度与催化剂循环量候选的预测分布、约束满足情况和相对目标分数。"},{"id":"r3","method":"ts","methods":["ts"],"color":"#8b65a0","box":[589,430,271,340],"art":[589,430,271,340],"input":"过去12个源观测的v-RMS（m/s）、a-RMS（m/s²）和温度（°C）。源作者给出名义2分钟采样，网络不读取待预测的当前振动或状态标签。","output":"下一点v-RMS预测、实际振动与残差；由验证门槛和连续点规则形成的复核标记。输出不是失效概率或剩余寿命。"},{"id":"r4","method":"nlp","methods":["nlp","opt"],"color":"#6b884b","box":[867,430,286,340],"art":[867,430,286,340],"input":"用户可编辑的中英化验文本；硫、密度、闪点的单位规则与明确标为教学值的审核线；三类审核人员的技能、成本与分钟容量。","output":"三个断言得分、抽取字段与单位换算、否定或待确认线索、数值矛盾列表；任务分配、风险覆盖与未分配任务。"},{"id":"r5","method":"ts","methods":["ts"],"color":"#3a8c8a","box":[1159,430,287,340],"art":[1159,430,287,340],"input":"三日窗口内的进料C2、C3、nC4摩尔百分数、进料kmol/h、塔顶表压barg和回流比。当前进料组成在本教学情景中被假定已知，不读取LPG产品组成或蒸气压。","output":"当前LPG真蒸气压估计与源标签，单位kgf/cm²；正常段训练的GRU与当前工况Ridge在末段降负荷日的误差。"}];
function relevant(t,focus){return t.methods.indexOf(focus)>=0;}
 function lessonIntro(t,sc){var c=global.DOWNSTREAM_CONTENT.find(function(c){return c.id===t.id;});return c?c.intro:sc.point;}
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
function sceneHref(id){var c=global.DOWNSTREAM_CONTENT.find(function(c){return c.id===id;});return '#/scene/'+id+'?case='+c.caseId+'&amp;tab=bg';}
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
  function drawing(){return '<svg class="ml-flows" data-ml-motion viewBox="0 0 1448 1086" aria-hidden="true">'+flow('M724 378H146V430', '#b95739', 5, 'r1')+flow('M724 378H448V430', '#497d99', 5.333333333333333, 'r2')+flow('M724 378H731V430', '#8b65a0', 5.666666666666667, 'r3')+flow('M724 378H1009V430', '#6b884b', 6, 'r4')+flow('M724 378H1301V430', '#3a8c8a', 6.333333333333333, 'r5')+'</svg>';}
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
    return '<section class="ml-extra"><h2>更多加工场景</h2>' + extra.map(function (sc) {
      return '<a href="#/scene/' + esc(sc.id) + '"><b>' + esc(sc.name) + '</b><span>' + esc(sc.point || '') + '</span><i>↗</i></a>';
    }).join('') + '</section>';
  }
  function render(ctx) {
    var focus = selected((ctx.query || {}).m), esc = ctx.K.esc;
    var index = ctx.atlas.stages.indexOf(ctx.stage), prev = ctx.atlas.stages[index - 1], next = ctx.atlas.stages[index + 1];
    return '<main class="ml-page op-stage" data-downstream-stage data-ml-stage data-ml-method="' + focus + '">' +
      '<nav class="crumb"><a href="#/">总览</a><span class="sep">/</span><a href="#/chain">作业链</a><span class="sep">/</span><span class="cur">加工</span></nav>' +
      '<header class="ml-head"><div><div class="ml-eyebrow"><span>13 / 13</span> REFINING · 加工</div>' +
      '<h1>从原料到产品，核对工况、设备与质量<span>。</span></h1><p>认识分馏、反应、设备监测和化验怎样联系，再操作模型比较条件与结果。</p></div>' +
      '<div class="ml-head-note"><span class="ml-live-dot"></span><span>一张图，串起 <b>' + ctx.stage.scenes.length + ' 个场景</b><small>选择方法放大 · 点击图画进入讲解</small></span></div></header>' +
      '<section class="ml-lab" aria-label="加工现场交互总览">' +
      '<div class="ml-toolbar"><div class="ml-methods" role="group" aria-label="选择智能方法并放大对应图画">' + METHODS.map(function (m) {
        return '<button type="button" data-ml-method-button="' + m.id + '" aria-pressed="' + (focus === m.id) + '" aria-controls="ml-map ml-deck"><b>' + m.abbr + '</b><span>' + m.name + '</span></button>';
      }).join('') + '</div><button class="ml-motion" type="button" data-ml-toggle aria-pressed="true"><span data-ml-toggle-icon>Ⅱ</span><span data-ml-toggle-label>暂停动效</span></button></div>' +
      '<div class="ml-status"><span class="ml-status-icon">↳</span><p data-ml-status role="status">' + method(focus).note + '</p><span class="ml-status-hint">图画可点击 <b>↗</b></span></div>' +
      '<div class="ml-map' + (focus ? ' has-focus' : '') + '" id="ml-map" data-ml-map data-ml-image-state="loading" aria-busy="true">' +
      '<img class="ml-base" src="' + IMAGE + '" srcset="' + IMAGE_SET + '" sizes="' + IMAGE_SIZES + '" fetchpriority="high" decoding="async" loading="eager" data-ml-image width="1448" height="1086" draggable="false" alt="加工业务关系示意：五项任务对应操作、产品、设备、化验和在线质量，按业务需要组合；R1—R5是案例编号，不是五道连续炼油工序。；AI生成的教学插图，不是实验资料。">' +
      '<span class="ml-image-status" data-ml-image-status role="status">正在载入图解…</span><button class="ml-image-retry" type="button" data-ml-image-retry hidden>重新载入图解</button>' +
      '<div class="ml-veil" aria-hidden="true"></div>' + available(ctx).map(function (t) { return spot(ctx, t, focus); }).join('') + drawing() +
      '<div class="ml-map-caption"><span class="ml-live-dot"></span><span data-ml-running>信号正在流动</span><i>示意动画</i></div></div>' +
      '<div class="ml-map-footer"><span>原料与过程记录 → 优化、预测与审核 → 化验复核与生产记录</span><p>五项任务对应操作、产品、设备、化验和在线质量，按业务需要组合；R1—R5是案例编号，不是五道连续炼油工序。 AI生成的业务示意，实验资料与结果在各案例中。</p></div></section>'+
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
        try { global.history.replaceState(null, '', '#/stage/refining' + (focus ? '?m=' + focus : '')); }
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
  global.DownstreamStages.refining={render:render,bind:bind};
})(window);

window.DownstreamStage={supports:function(id){return !!window.DownstreamStages[id];},render:function(ctx){return window.DownstreamStages[ctx.stage.id].render(ctx);},bind:function(root,ctx){return window.DownstreamStages[ctx.stage.id].bind(root,ctx);}};
