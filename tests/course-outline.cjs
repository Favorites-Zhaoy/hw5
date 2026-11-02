const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function fixture({ phase, reduced = false, route = '#/chain', cached = false } = {}) {
  const dom = new JSDOM('<div id="view"></div>', { url: 'https://course.test/' + route, runScripts: 'outside-only' });
  const w = dom.window, listeners = new Set(), stats = { pause: 0, play: 0 };
  const mq = { matches: reduced, addEventListener(_, fn) { listeners.add(fn); }, removeEventListener(_, fn) { listeners.delete(fn); } };
  w.matchMedia = () => mq;
  w.SVGElement.prototype.pauseAnimations = () => stats.pause++;
  w.SVGElement.prototype.unpauseAnimations = () => stats.play++;
  Object.defineProperty(w.HTMLImageElement.prototype, 'complete', { get: () => cached });
  Object.defineProperty(w.HTMLImageElement.prototype, 'naturalWidth', { get: () => cached ? 887 : 0 });
  for (const file of ['assets/data.js', 'assets/core/registry.js', 'assets/core/kit.js', 'assets/cases/welllog-layer.case.js', 'assets/cases/m1-cuttings.case.js', 'assets/cases/m2-gas.case.js', 'assets/cases/m3-fluorescence.case.js', 'assets/cases/m4-drilling.case.js', 'assets/cases/m5-report.case.js', 'assets/core/course-outline.js']) w.eval(read(file));
  const ctx = { atlas: w.ATLAS, cases: w.Cases, K: w.K, query: { phase }, route };
  w.document.getElementById('view').innerHTML = w.CourseOutline.render(ctx);
  const el = w.document.querySelector('[data-course-outline]'), handle = w.CourseOutline.bind(el, ctx);
  return { w, el, ctx, handle, stats, mq, listeners, q: s => el.querySelector(s), qa: s => [...el.querySelectorAll(s)], close() { handle.destroy(); dom.window.close(); } };
}

test('the five course phases partition all thirteen existing stages and keep all scene links', () => {
  const f = fixture();
  try {
    const ids = Array.from(f.w.CourseOutline.phases).flatMap(p => [...p.stages]);
    assert.equal(new Set(ids).size, 13);
    assert.deepEqual(ids, [...f.ctx.atlas.stages].map(s => s.id));
    assert.equal(f.qa('[data-course-scene]').length, f.ctx.atlas.allScenes.length);
    for (const link of f.qa('[data-course-scene]')) assert.ok(f.ctx.atlas.index.byScene[link.hash.split('/')[2].split('?')[0]]);
    assert.equal(f.qa('[data-course-tab]').length, 6, 'five phases and the complete-flow button');
    assert.equal(f.qa('[data-course-map]').length, 1);
    assert.equal(f.q('.course-detail, .course-zoom, .course-workbench'), null, 'no separate enlarged artwork or side panel');
    assert.ok(f.q('[data-course-image]').src.endsWith('assets/images/course-outline-wide.png'));
    assert.equal(f.qa('[data-course-map] [data-course-spot]').length, 13);
    assert.equal(f.el.dataset.coursePhase, '-1', 'the complete original is shown by default');
  } finally { f.close(); }
});

test('phase selection highlights the original in place, keeps its links, and supports keyboard navigation', () => {
  const f = fixture({ phase: '2' });
  try {
    assert.equal(f.el.dataset.coursePhase, '1');
    const map = f.q('[data-course-map]'), image = f.q('[data-course-image]');
    assert.ok(f.q('[data-course-spot="mudlogging"]').classList.contains('is-relevant'));
    assert.equal(f.qa('[data-course-flow].is-dim').length, 4);
    f.q('[data-course-tab][data-course-select="4"]').click();
    assert.equal(f.w.location.hash, '#/chain?phase=5');
    assert.equal(f.q('[data-course-map]'), map);
    assert.equal(f.q('[data-course-image]'), image, 'the original drawing is never replaced');
    assert.ok(f.q('[data-course-spot="refining"]').classList.contains('is-relevant'));
    assert.ok(f.q('[data-course-spot="mudlogging"]').classList.contains('is-dim'));
    assert.equal(f.qa('[data-course-spot].is-relevant').length, 2);
    assert.equal(f.q('[data-course-spot="mudlogging"]').hash, '#/stage/mudlogging');
    f.q('[data-course-tab][data-course-select="4"]').dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    assert.equal(f.el.dataset.coursePhase, '-1');
    assert.equal(f.w.location.hash, '#/chain');
    assert.equal(f.q('[data-course-map]').classList.contains('has-focus'), false);
    assert.equal(f.qa('[data-course-spot].is-dim, [data-course-spot].is-relevant').length, 0);
    const all = f.q('[data-course-tab][data-course-select="-1"]');
    assert.equal(f.w.document.activeElement, all);
    all.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    assert.equal(f.el.dataset.coursePhase, '4');
    f.q('[data-course-tab][data-course-select="4"]').dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    assert.equal(f.el.dataset.coursePhase, '-1');
    f.q('[data-course-tab][data-course-select="3"]').click();
    assert.ok(f.q('[data-course-injection]'));
    assert.equal(f.q('[data-course-injection]').tagName, 'BUTTON');
    f.q('[data-course-injection]').click();
    assert.equal(f.q('[data-course-injection-note]').hidden, false);
    assert.ok(f.q('[data-course-injection-note] a[href="#/stage/workover"]'));
    f.q('[data-course-injection-close]').click();
    assert.equal(f.q('[data-course-injection-note]').hidden, true);
    assert.equal(f.q('[data-course-injection]').getAttribute('aria-expanded'), 'false');
  } finally { f.close(); }
  const fallback = fixture({ phase: 'NaN' });
  try { assert.equal(fallback.el.dataset.coursePhase, '-1'); } finally { fallback.close(); }
});

test('search and ready filtering show matching scenes, empty states, and recover after clearing', () => {
  const f = fixture();
  const input = value => { f.q('[data-course-search]').value = value; f.q('[data-course-search]').dispatchEvent(new f.w.Event('input')); };
  const visible = () => f.qa('[data-course-scene]').filter(s => !s.hidden);
  try {
    input('录井');
    assert.equal(visible().length, f.ctx.atlas.index.byStage.mudlogging.scenes.length);
    assert.equal(f.q('[data-course-directory]').open, true);
    input('  不存在的课程987  ');
    assert.equal(visible().length, 0); assert.equal(f.q('[data-course-empty]').hidden, false);
    assert.equal(f.qa('[data-course-group]').filter(g => !g.hidden).length, 0);
    input(''); f.q('[data-course-scope="ready"]').click();
    const expected = f.ctx.atlas.allScenes.filter(s => f.ctx.cases.bySceneAll(s.id).length).length;
    assert.equal(visible().length, expected);
    f.q('[data-course-scope="all"]').click();
    assert.equal(visible().length, 61); assert.equal(f.q('[data-course-empty]').hidden, true);
    input('NLP');
    assert.equal(visible().length, f.ctx.atlas.index.byMethod.nlp.length);
  } finally { f.close(); }
});

test('pause controls stop SVG and CSS motion across phase changes and listeners are cleaned up', () => {
  const f = fixture({ reduced: true, route: '#/' });
  try {
    assert.ok(f.el.classList.contains('is-paused')); assert.ok(f.stats.pause > 0); assert.equal(f.stats.play, 0);
    f.q('[data-course-motion]').click(); assert.ok(f.el.classList.contains('is-playing')); assert.ok(f.stats.play > 0);
    f.q('[data-course-motion]').click();
    f.q('[data-course-tab][data-course-select="2"]').click();
    assert.ok(f.el.classList.contains('is-paused')); assert.equal(f.q('[data-course-motion]').getAttribute('aria-pressed'), 'false');
    assert.equal(f.w.location.hash, '#/?phase=3');
    f.mq.matches = false; for (const fn of f.listeners) fn();
    assert.ok(f.el.classList.contains('is-playing'));
    const search = f.q('[data-course-search]');
    f.handle.destroy(); assert.equal(f.listeners.size, 0);
    const phase = f.el.dataset.coursePhase;
    f.q('[data-course-tab][data-course-select="4"]').click(); assert.equal(f.el.dataset.coursePhase, phase);
    search.value = '不存在'; search.dispatchEvent(new f.w.Event('input')); assert.equal(f.q('[data-course-count]').textContent, '61 个场景');
  } finally { f.close(); }
});

test('image loading, retry and cached readiness gate drawing effects, with no listeners left after unmount', () => {
  const f = fixture();
  try {
    const image = f.q('[data-course-image]'), map = f.q('[data-course-map]');
    assert.equal(map.dataset.courseImageState, 'loading');
    image.dispatchEvent(new f.w.Event('error'));
    assert.equal(map.dataset.courseImageState, 'error');
    assert.equal(f.q('[data-course-image-retry]').hidden, false);
    f.q('[data-course-image-retry]').click();
    assert.equal(map.dataset.courseImageState, 'loading');
    assert.ok(image.src.includes('?retry='));
    for (const crop of f.qa('.course-hotspot-art img, .course-phase-crop img')) assert.equal(crop.src, image.src);
    image.dispatchEvent(new f.w.Event('load'));
    assert.equal(map.dataset.courseImageState, 'ready');
    assert.equal(map.getAttribute('aria-busy'), 'false');
    assert.equal(f.q('[data-course-image-status]').hidden, true);
    f.handle.destroy();
    image.dispatchEvent(new f.w.Event('error'));
    assert.equal(map.dataset.courseImageState, 'ready');
  } finally { f.close(); }
  const cached = fixture({ cached: true });
  try { assert.equal(cached.q('[data-course-map]').dataset.courseImageState, 'ready'); } finally { cached.close(); }
});
