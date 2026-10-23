/* SVG current map: measured river geometry, native motion, and explicit lifecycle cleanup. */
(function (global) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function n(v) { return Math.round(v * 10) / 10; }
  function curve(points) {
    if (!points.length) return '';
    var out = 'M' + n(points[0].x) + ' ' + n(points[0].y);
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i], mid = (a.y + b.y) / 2;
      out += ' C' + n(a.x) + ' ' + n(mid) + ' ' + n(b.x) + ' ' + n(mid) + ' ' + n(b.x) + ' ' + n(b.y);
    }
    return out;
  }
  function geometry(stops, width, height) {
    var narrow = width < 900;
    var ordered = stops.slice().sort(function (a, b) { return a.y - b.y; });
    var fallback = narrow ? 38 : width / 2;
    var first = ordered[0] || { x: fallback, y: height / 2 };
    var last = ordered[ordered.length - 1] || first;
    var points = [{ x: first.x + (narrow ? 5 : -32), y: 0 }].concat(ordered, [{ x: last.x + (narrow ? -4 : 30), y: height }]);
    var half = narrow ? 15 : 35;
    var left = points.map(function (p, i) { return { x: p.x - half * (1 + Math.sin(i * 1.7) * .23), y: p.y }; });
    var right = points.map(function (p, i) { return { x: p.x + half * (1 + Math.cos(i * 1.4) * .22), y: p.y }; });
    var lanes = [-.36, .26, .5].map(function (offset, lane) {
      return curve(points.map(function (p, i) { return { x: p.x + half * offset + Math.sin(i * 1.2 + lane) * 3, y: p.y }; }));
    });
    return {
      width: width, height: height, trunk: curve(points),
      body: curve(left) + ' L' + n(right[right.length - 1].x) + ' ' + n(right[right.length - 1].y) + curve(right.slice().reverse()).replace(/^M[^C]+/, '') + ' Z',
      lanes: lanes,
      branches: ordered.map(function (p) {
        var edgeX = p.edgeX == null ? p.x : p.edgeX, edgeY = p.edgeY == null ? p.y : p.edgeY;
        var distance = edgeX - p.x;
        return { id: p.id, ready: !!p.ready, path: 'M' + n(p.x) + ' ' + n(p.y) + ' C' + n(p.x + distance * .5) + ' ' + n(p.y + 24) + ' ' + n(edgeX - distance * .32) + ' ' + n(edgeY - 22) + ' ' + n(edgeX) + ' ' + n(edgeY) };
      })
    };
  }
  function particle(path, duration, delay, branch) {
    return '<g class="atlas-river-particle' + (branch ? ' is-branch-particle' : '') + '"><circle r="8" fill="#ff789f" opacity=".14"/><path d="M-15 0H-4" stroke="#fff2df" stroke-width="1.4" stroke-linecap="round" opacity=".55"/><circle r="' + (branch ? '2' : '2.8') + '" fill="#fff6e7"/>' +
      '<animateMotion dur="' + duration + 's" begin="-' + delay + 's" repeatCount="indefinite" rotate="auto" path="' + path + '"/></g>';
  }
  function drawing(model) {
    var output = '<defs><linearGradient id="atlas-current-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff294e"/><stop offset=".4" stop-color="#ff5b83"/><stop offset=".72" stop-color="#dc246f"/><stop offset="1" stop-color="#ff7a91"/></linearGradient><linearGradient id="atlas-current-light" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ff7f9b"/><stop offset=".45" stop-color="#ffe9d9"/><stop offset="1" stop-color="#ff547c"/></linearGradient></defs>';
    output += '<path class="atlas-current-halo" d="' + model.trunk + '"/><path class="atlas-current-body" fill="url(#atlas-current-fill)" d="' + model.body + '"/>';
    output += '<path class="atlas-current-spine" d="' + model.trunk + '" stroke="url(#atlas-current-light)"/>';
    model.lanes.forEach(function (lane, i) { output += '<path class="atlas-current-thread thread-' + i + '" d="' + lane + '"/>'; });
    model.branches.forEach(function (branch, i) {
      output += '<g class="atlas-river-tributary' + (branch.ready ? ' has-case' : '') + '" data-river-branch="' + esc(branch.id) + '"><path class="atlas-tributary-under" d="' + branch.path + '"/><path class="atlas-tributary-line" d="' + branch.path + '"/>' + particle(branch.path, 4.3 + (i % 3), i * .7, true) + '</g>';
    });
    for (var i = 0; i < 27; i++) output += particle(model.trunk, 15 + (i % 4) * 1.4, i * .83, false);
    return output;
  }
  function initial(stages) {
    var height = Math.max(400, stages.length * 236 + 130);
    var bends = [52, 45, 56, 47, 53, 44, 55, 47, 52, 45, 54, 46, 51];
    var stops = stages.map(function (st, i) { return { id: st.id, x: bends[i % bends.length] * 10, y: i * 236 + 170, edgeX: i % 2 ? 610 : 390, edgeY: i * 236 + 170 }; });
    var model = geometry(stops, 1000, height);
    return '<svg class="atlas-river-drawing" data-river-svg viewBox="0 0 1000 ' + height + '" preserveAspectRatio="none" aria-hidden="true" focusable="false" xmlns="' + NS + '">' + drawing(model) + '</svg>';
  }
  function mount(tree) {
    if (!tree) return { refresh: function () {}, destroy: function () {} };
    var svg = tree.querySelector('[data-river-svg]');
    if (!svg) return { refresh: function () {}, destroy: function () {} };
    var disposed = false, frame = null, active = null;
    var media = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var playing = !media.matches;
    var toggle = tree.querySelector('[data-river-motion]');
    function syncMotion() {
      tree.classList.toggle('is-paused', !playing);
      if (toggle) {
        toggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
        toggle.setAttribute('aria-label', playing ? '暂停河流动效' : '恢复河流动效');
        var label = toggle.querySelector('[data-river-motion-label]');
        if (label) label.textContent = playing ? '暂停动效' : '恢复动效';
      }
      if (playing && typeof svg.unpauseAnimations === 'function') svg.unpauseAnimations();
      if (!playing && typeof svg.pauseAnimations === 'function') svg.pauseAnimations();
    }
    function redraw() {
      frame = null;
      if (disposed) return;
      var bounds = tree.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      var points = [];
      [].forEach.call(tree.querySelectorAll('[data-home-stage]'), function (stage) {
        if (stage.hidden) return;
        var node = stage.querySelector('[data-river-node]'), island = stage.querySelector('.atlas-river-island');
        if (!node || !island) return;
        var a = node.getBoundingClientRect(), b = island.getBoundingClientRect();
        if (!a.width || !b.width) return;
        var x = a.left - bounds.left + a.width / 2;
        points.push({ id: node.dataset.riverNode, x: x, y: a.top - bounds.top + a.height / 2,
          edgeX: (b.left > a.left ? b.left : b.right) - bounds.left, edgeY: b.top - bounds.top + b.height / 2,
          ready: [].some.call(stage.querySelectorAll('[data-home-leaf]'), function (leaf) { return !leaf.hidden && leaf.dataset.ready === '1'; }) });
      });
      var model = geometry(points, bounds.width, bounds.height);
      svg.setAttribute('viewBox', '0 0 ' + n(bounds.width) + ' ' + n(bounds.height));
      svg.innerHTML = drawing(model);
      syncMotion();
      if (active) highlight(active);
    }
    function refresh() {
      if (disposed || frame != null) return;
      if (global.requestAnimationFrame) frame = global.requestAnimationFrame(redraw); else redraw();
    }
    function highlight(stage) {
      if (active && active !== stage) active.classList.remove('is-current');
      active = stage;
      if (stage) stage.classList.add('is-current');
      var node = stage && stage.querySelector('[data-river-node]');
      [].forEach.call(svg.querySelectorAll('[data-river-branch]'), function (branch) { branch.classList.toggle('is-current', !!node && branch.dataset.riverBranch === node.dataset.riverNode); });
    }
    function hover(e) { var stage = e.target.closest('[data-home-stage]'); if (stage) highlight(stage); }
    function leave(e) { var stage = e.target.closest('[data-home-stage]'); if (stage && (!e.relatedTarget || !stage.contains(e.relatedTarget))) highlight(null); }
    function pointer(e) {
      if (!playing) return;
      var box = tree.getBoundingClientRect();
      if (box.width && box.height) {
        tree.style.setProperty('--river-pointer-x', n((e.clientX - box.left) / box.width * 100) + '%');
        tree.style.setProperty('--river-pointer-y', n((e.clientY - box.top) / box.height * 100) + '%');
      }
    }
    function toggleMotion() { playing = !playing; syncMotion(); }
    function preferenceChanged() { playing = !media.matches; syncMotion(); }
    tree.addEventListener('pointerover', hover);
    tree.addEventListener('pointerout', leave);
    tree.addEventListener('focusin', hover);
    tree.addEventListener('focusout', leave);
    tree.addEventListener('pointermove', pointer);
    if (toggle) toggle.addEventListener('click', toggleMotion);
    global.addEventListener('resize', refresh);
    var observer = global.ResizeObserver ? new global.ResizeObserver(refresh) : null;
    if (observer) observer.observe(tree);
    if (media.addEventListener) media.addEventListener('change', preferenceChanged);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    syncMotion(); refresh();
    return {
      refresh: refresh,
      destroy: function () {
        disposed = true;
        if (frame != null && global.cancelAnimationFrame) global.cancelAnimationFrame(frame);
        if (observer) observer.disconnect();
        global.removeEventListener('resize', refresh);
        if (media.removeEventListener) media.removeEventListener('change', preferenceChanged);
        tree.removeEventListener('pointerover', hover); tree.removeEventListener('pointerout', leave);
        tree.removeEventListener('focusin', hover); tree.removeEventListener('focusout', leave); tree.removeEventListener('pointermove', pointer);
        if (toggle) toggle.removeEventListener('click', toggleMotion);
        if (typeof svg.pauseAnimations === 'function') svg.pauseAnimations();
      }
    };
  }
  global.AtlasRiver = { initial: initial, geometry: geometry, drawing: drawing, mount: mount };
})(window);
