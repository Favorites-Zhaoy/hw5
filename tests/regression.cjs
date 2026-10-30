// Regression checks use in-memory storage and DOM doubles; they do not access browser data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const site = process.env.HW5_PORTAL_ROOT || path.resolve(__dirname, '..');
const read = (name, root = site) => fs.readFileSync(path.join(root, name), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const extras = sc => plain(Object.fromEntries(['data', 'refs', 'datasets', 'cross', 'demo'].map(k => [k, k === 'demo' ? !!sc[k] : sc[k] || []])));
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

class Element {
  constructor(tag = 'div') {
    this.tagName = tag; this.children = []; this.nodes = new Map(); this.listeners = {};
    this.dataset = {}; this.style = {}; this.attributes = {}; this.value = '';
    this.innerHTML = ''; this.textContent = ''; this.hidden = false;
    const classes = new Set();
    this.classList = { add: c => classes.add(c), remove: c => classes.delete(c), toggle(c, on) { if (on === undefined) on = !classes.has(c); if (on) classes.add(c); else classes.delete(c); }, contains: c => classes.has(c) };
  }
  querySelector(selector) {
    if (selector.startsWith('[data-tab=')) return this.children.find(c => selector.includes('"' + c.dataset.tab + '"')) || null;
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Element());
    return this.nodes.get(selector);
  }
  querySelectorAll(selector) {
    if (selector === 'input:checked') return [...this.innerHTML.matchAll(/<input\b[^>]*value="([^"]+)"[^>]*\bchecked[^>]*>/g)].map(m => ({ value: m[1] }));
    return [];
  }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  removeEventListener(type, fn) { if (this.listeners[type] === fn) delete this.listeners[type]; }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  setAttribute(k, v) { this.attributes[k] = v; }
  getBoundingClientRect() { return { top: 100 }; }
  attachShadow() { this.shadowRoot = new Element('shadow'); this.shadowRoot.host = this; return this.shadowRoot; }
  remove() { this.removed = true; }
  focus() { this.focused = true; }
  scrollIntoView(options) { this.scrollOptions = options; }
}

function runtime(seed = {}) {
  const values = new Map(Object.entries(seed));
  const storage = { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, String(v)) };
  const nodes = new Map(); const timers = []; const panels = [];
  const document = {
    body: new Element('body'), documentElement: new Element('html'),
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); },
    querySelectorAll: sel => sel === '.panel' ? panels : [],
    addEventListener() {}, createElement: tag => new Element(tag)
  };
  class FileReader {
    readAsText(file) { this.result = file.data; this.onload(); }
    readAsDataURL(file) { this.result = 'data:' + (file.type || 'application/octet-stream') + ';base64,' + Buffer.from(file.data).toString('base64'); this.onload(); }
  }
  const ctx = { console, document, localStorage: storage, sessionStorage: storage, FileReader,
    TextEncoder, Blob, Event, location: { hash: '#/' }, scrollY: 0,
    history: { replaceState(a, b, hash) { ctx.location.hash = hash; } },
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, scrollTo() {},
    getComputedStyle() { return { getPropertyValue() { return ''; } }; }
  };
  ctx.window = ctx; vm.createContext(ctx);
  const run = name => {
    let source = read(name);
    if (name.endsWith('case-upload.js')) source = source.replace('  global.CaseImport = {', '  global.__importTest = {checkAll, toCase, state:S, stripRoot, loadFiles, reset, commit};\n  global.CaseImport = {');
    vm.runInContext(source, ctx, { filename: name, timeout: 5000 });
  };
  ['assets/data.js', 'assets/core/registry.js', 'assets/core/kit.js', 'assets/cases/welllog-layer.case.js', 'assets/cases/welllog-layer.demo.js', 'assets/cases/m1-cuttings.case.js', 'assets/core/case-demo-host.js', 'assets/core/case-upload.js', 'assets/core/admin.js', 'assets/core/river.js', 'assets/core/home.js', 'assets/core/mudlogging.js'].forEach(run);
  let shell = read('assets/core/shell.js').replaceAll('\r', '');
  const marker = '  render();\n\n  // 启动自检';
  assert.ok(shell.includes(marker), 'shell test hook must match exactly');
  shell = shell.replace(marker, '  global.__shellTest = {bindTabs,parseHash,homeHTML,chainHTML,stageHTML,methodHTML,sceneHTML,casesHTML,guideHTML,render,unmountCurrent};\n\n  // 启动自检');
  vm.runInContext(shell, ctx, { filename: 'shell.js' });
  return { ctx, values, nodes, panels, timers, document };
}

function sample() {
  const dir = path.join(site, 'firstbreak-pick-case');
  const pkg = JSON.parse(read('firstbreak-pick-case/case.json'));
  const files = walk(dir).filter(p => path.basename(p) !== 'case.json').map(p => ({ name: path.relative(dir, p).replaceAll('\\', '/'), size: fs.statSync(p).size, enc: 'text', data: fs.readFileSync(p, 'utf8') }));
  return { pkg, files };
}
function record(pkg, files = [], id = pkg.id) {
  return { v: 2, pkg, files, meta: { id, title: pkg.title, sceneId: pkg.sceneId, methods: pkg.methods || [], version: pkg.version, updated: pkg.updated }, savedAt: '2026-10-23T00:00:00Z' };
}
function check(rt, pkg, files = [], id = pkg.id) { return rt.ctx.__importTest.checkAll(pkg, record(pkg, files, id).meta, files); }
function noErrors(items) { assert.deepEqual(plain(items.filter(x => x.level === 'error')), []); }
function formScene(sc) { return Object.fromEntries(['id', 'name', 'stageId', 'methods', 'diff', 'status', 'intro', 'point', 'problem', 'diffWhy'].map(k => [k, sc[k]])); }

async function importThroughControls(rt, pkg, files, folder = true) {
  const ui = new Element(); rt.ctx.__importTest.state.el = ui; rt.ctx.__importTest.reset({});
  const raw = [{ name: 'case.json', enc: 'text', data: JSON.stringify(pkg) }, ...files].map(f => ({
    name: path.posix.basename(f.name), webkitRelativePath: folder ? 'case-folder/' + f.name : '',
    type: 'text/plain', size: Buffer.byteLength(f.data), data: f.data
  }));
  rt.ctx.__importTest.loadFiles(raw);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(rt.ctx.__importTest.state.loading, false);
  assert.ok(rt.ctx.__importTest.state.pkg, ui.querySelector('#imp-tip').textContent);
  noErrors(rt.ctx.CaseImport.check(rt.ctx.__importTest.state.pkg, record(pkg).meta));
  rt.ctx.__importTest.commit();
  assert.ok(rt.ctx.Cases.get(pkg.id), ui.querySelector('#imp-tip').textContent);
  const nextTimers = rt.timers.splice(0); nextTimers.filter(t => t.delay < 1000).forEach(t => t.fn());
  assert.equal(rt.ctx.location.hash, '#/scene/' + pkg.sceneId);
  return rt.ctx.Cases.get(pkg.id);
}

test('all JavaScript files compile', () => {
  for (const file of walk(site).filter(p => p.endsWith('.js'))) new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
});

test('newest upload is the default; plugin order and explicit case access remain stable', () => {
  const rt = runtime(), C = rt.ctx.Cases;
  C.register({ id: 'plugin-two', sceneId: 'w1', tabs: {} });
  for (const id of ['upload-one', 'upload-two']) C.register({ id, sceneId: 'w1', imported: true, tabs: {} });
  assert.equal(C.byScene('w1').id, 'upload-two');
  const expected = ['upload-two', 'upload-one', 'welllog-layer', 'plugin-two'];
  assert.deepEqual(plain(C.bySceneAll('w1').map(c => c.id)), expected);
  assert.deepEqual(plain(C.bySceneAll('w1').map(c => c.id)), expected);
  assert.equal(C.get('upload-one').id, 'upload-one');
});

test('v1 records and v2 records restore with the newest v2 case preferred', () => {
  const { pkg, files } = sample();
  const oldPkg = plain(pkg); oldPkg.tabs.demo = { builtin: 'welllog-layer' };
  const v1 = record(oldPkg, [], 'legacy-upload');
  const first = record(pkg, files, 'v2-first'), last = record(pkg, files, 'v2-last');
  const rt = runtime({ 'atlas.casepack.v1': JSON.stringify([v1]), 'atlas.casepack.v2': JSON.stringify([first, last]) });
  assert.deepEqual(plain(rt.ctx.Cases.bySceneAll('s3').map(c => c.id)), ['v2-last', 'v2-first', 'legacy-upload']);
  for (const id of ['legacy-upload', 'v2-first', 'v2-last']) assert.equal(typeof rt.ctx.Cases.get(id).tabs.demo.mount, 'function');
});

test('Tab events preserve the selected non-default case for refresh and shared links', () => {
  const rt = runtime(), { ctx, document, panels } = rt;
  const { pkg, files } = sample();
  const selected = ctx.__importTest.toCase(record(pkg, files, 'selected-case'));
  ctx.Cases.register(selected); ctx.Cases.register(ctx.__importTest.toCase(record(pkg, files, 'newest-case')));
  const tabs = document.getElementById('tabs');
  for (const tab of ['bg', 'flow', 'demo']) { const b = new Element('button'); b.dataset.tab = tab; tabs.children.push(b); const p = new Element(); p.dataset.panel = tab; panels.push(p); }
  ctx.location.hash = '#/scene/s3?case=selected-case';
  ctx.__shellTest.bindTabs(ctx.ATLAS.index.byScene.s3, selected);
  for (const b of tabs.children) {
    tabs.listeners.click({ target: { closest: () => b } });
    const q = ctx.__shellTest.parseHash().q;
    assert.equal(q.case, 'selected-case'); assert.equal(q.tab, b.dataset.tab);
    const html = ctx.__shellTest.sceneHTML(ctx.ATLAS.index.byScene.s3, q);
    assert.match(html, /案例 selected-case/);
  }
  ctx.location.hash = '#/scene/s3?tab=3';
  ctx.__shellTest.bindTabs(ctx.ATLAS.index.byScene.s3, selected);
  assert.ok(tabs.children.find(b => b.dataset.tab === 'demo').classList.contains('on'));
});

test('saving every existing scene through the admin form preserves all extra fields across reload', () => {
  const rt = runtime(); const before = rt.ctx.ATLAS.allScenes.map(sc => ({ id: sc.id, fields: extras(sc), form: formScene(sc) }));
  for (const sc of before) {
    assert.equal(rt.ctx.ATLAS.saveScene({ ...sc.form, name: sc.form.name + '（测试）' }).ok, true);
    assert.deepEqual(extras(rt.ctx.ATLAS.index.byScene[sc.id]), sc.fields, sc.id);
  }
  const reloaded = runtime(Object.fromEntries(rt.values));
  for (const sc of before) assert.deepEqual(extras(reloaded.ctx.ATLAS.index.byScene[sc.id]), sc.fields, sc.id);
  assert.equal(reloaded.ctx.Cases.validate(reloaded.ctx.Cases.get('welllog-layer')).filter(v => v.level === 'error').length, 0);
});

test('legacy scene overrides missing data and references inherit the original built-in fields', () => {
  const base = runtime(); const upserts = {};
  for (const id of ['g1', 'w1']) upserts[id] = { ...formScene(base.ctx.ATLAS.index.byScene[id]), name: '旧版修改标题' };
  const rt = runtime({ 'atlas.scenes.user.v1': JSON.stringify({ upserts, deleted: [] }) });
  for (const id of ['g1', 'w1']) {
    assert.equal(rt.ctx.ATLAS.index.byScene[id].name, '旧版修改标题');
    assert.deepEqual(extras(rt.ctx.ATLAS.index.byScene[id]), extras(base.ctx.ATLAS.index.byScene[id]));
  }
});

test('custom scene details survive editing; explicit empty arrays and false demo flags are respected', () => {
  const rt = runtime(); const A = rt.ctx.ATLAS;
  const sc = { id: 'custom-scene', name: '自定义场景', stageId: 'geology', methods: ['cv'], diff: '中', data: [['图像', '10', '标注']], refs: ['分割'], datasets: ['sample'], cross: ['welllog'], demo: true };
  assert.equal(A.saveScene(sc).ok, true);
  assert.equal(A.saveScene({ ...formScene(A.index.byScene[sc.id]), name: '修改标题' }).ok, true);
  assert.deepEqual(extras(A.index.byScene[sc.id]), extras(sc));
  assert.equal(A.saveScene({ ...formScene(A.index.byScene[sc.id]), data: [], refs: [], datasets: [], cross: [], demo: false }).ok, true);
  assert.deepEqual(extras(A.index.byScene[sc.id]), { data: [], refs: [], datasets: [], cross: [], demo: false });
});

test('explicit page mode without HTML returns validation errors for empty, JS, CSS, and asset-only packs', () => {
  const rt = runtime(), { pkg } = sample(); pkg.tabs.demo.mode = 'page';
  for (const files of [[], [{ name: 'demo.js', data: 'void 0;', size: 7 }], [{ name: 'demo.css', data: 'body{}', size: 6 }], [{ name: 'readme.txt', data: 'demo', size: 4 }]]) {
    const result = check(rt, pkg, files);
    assert.ok(result.some(v => v.level === 'error' && /HTML/.test(v.msg)));
  }
});

test('explicit module mode without JS returns an error instead of silently omitting the demo', () => {
  const rt = runtime(), { pkg } = sample(); pkg.tabs.demo.mode = 'module';
  assert.ok(check(rt, pkg, []).some(v => v.level === 'error' && /脚本/.test(v.msg)));
});

test('validation checks the configured HTML and JS entrypoints, matching the existing host', () => {
  const rt = runtime(), { pkg } = sample();
  pkg.tabs.demo = { mode: 'page', html: 'actual.html' };
  const files = [{ name: 'other.html', data: '<link rel="stylesheet" href="missing.css">', size: 100 }, { name: 'actual.html', data: '<!doctype html><html><body>actual demo</body></html>', size: 100 }];
  assert.equal(check(rt, pkg, files).filter(v => /不在包里/.test(v.msg)).length, 0);
  pkg.tabs.demo = { mode: 'module', js: 'actual.js' };
  noErrors(check(rt, pkg, [{ name: 'other.js', data: 'invalid !!!', size: 10 }, { name: 'actual.js', data: 'exports.mount=function(){};', size: 30 }]));
});

test('original firstbreak folder imports, persists, restores and mounts in page mode', async () => {
  const rt = runtime(), { pkg, files } = sample();
  const c = await importThroughControls(rt, pkg, files);
  assert.deepEqual(plain(c.methods), ['ts']); assert.equal(c.tabs.demo.mode, 'page');
  const reloaded = runtime(Object.fromEntries(rt.values));
  const restored = reloaded.ctx.Cases.get(pkg.id); assert.ok(restored);
  const root = new Element(); restored.tabs.demo.mount(root, { scene: reloaded.ctx.ATLAS.index.byScene.s3, kase: restored });
  const frame = root.children[0]; assert.equal(frame.tagName, 'iframe');
  assert.match(frame.srcdoc, /<style data-src="demo.css">/); assert.match(frame.srcdoc, /<script data-src="demo.js">/);
  assert.doesNotMatch(frame.srcdoc, /<script\b[^>]*\ssrc\s*=/i);
  assert.doesNotMatch(frame.srcdoc, /<link\b[^>]*\shref\s*=/i);
  restored.tabs.demo.unmount(); assert.equal(frame.removed, true);
});

test('original firstbreak multi-file upload still works without directory paths', async () => {
  const rt = runtime(), { pkg, files } = sample();
  const c = await importThroughControls(rt, pkg, files, false);
  assert.equal(c.tabs.demo.mode, 'page');
});

test('two standard packages import in sequence and the newest remains preferred after reload', async () => {
  const rt = runtime(), { pkg, files } = sample();
  await importThroughControls(rt, pkg, files);
  const second = { ...pkg, id: 'classmate-firstbreak', title: '另一位同学的初至案例' };
  await importThroughControls(rt, second, files);
  assert.equal(rt.ctx.Cases.byScene('s3').id, second.id);
  const reloaded = runtime(Object.fromEntries(rt.values));
  assert.equal(reloaded.ctx.Cases.byScene('s3').id, second.id);
  assert.ok(reloaded.ctx.Cases.get(pkg.id));
});

test('the unmodified JSON template remains importable with its original optional-demo behavior', async () => {
  const rt = runtime(), pkg = JSON.parse(read('assets/cases/_template.case.json'));
  noErrors(check(rt, pkg));
  await importThroughControls(rt, pkg, []);
});

test('the downloadable original-format template imports and its JS compiles', async () => {
  const rt = runtime(), pkg = rt.ctx.CaseImport.template(), T = rt.ctx.CaseImport.templates;
  const files = [['demo/index.html', T.html], ['demo/demo.css', T.css], ['demo/demo.js', T.js]].map(([name, data]) => ({ name, data, enc: 'text', size: Buffer.byteLength(data) }));
  new vm.Script(T.js);
  await importThroughControls(rt, pkg, files);
});

test('original module export forms still mount and clean up', () => {
  for (const form of ['module.exports={mount:mount}', 'exports.mount=mount', 'window.__CASE_MOUNT__=mount']) {
    const rt = runtime(), { pkg } = sample();
    pkg.tabs.demo = { mode: 'module', js: 'demo.js' };
    const code = 'function mount(root,api){root.textContent="mounted";api.onDestroy(function(){window.cleaned=true});return {unmount:function(){window.unmounted=true}};} ' + form;
    const files = [{ name: 'demo.js', data: code, size: code.length, enc: 'text' }];
    noErrors(check(rt, pkg, files));
    const c = rt.ctx.__importTest.toCase(record(pkg, files)); const host = new Element();
    c.tabs.demo.mount(host, { scene: rt.ctx.ATLAS.index.byScene.s3, kase: c });
    assert.equal(host.shadowRoot.children[1].textContent, 'mounted');
    c.tabs.demo.unmount(); assert.equal(rt.ctx.cleaned, true); assert.equal(rt.ctx.unmounted, true);
  }
});

test('builtin-demo packages still import without demo files', async () => {
  const rt = runtime(), { pkg } = sample(); pkg.id = 'builtin-reference'; pkg.tabs.demo = { builtin: 'welllog-layer' };
  const c = await importThroughControls(rt, pkg, []);
  assert.equal(c.tabs.demo.mount, rt.ctx.Cases.get('welllog-layer').tabs.demo.mount);
});

test('duplicate IDs, unknown scenes and oversized packs remain blocked', () => {
  const rt = runtime(), { pkg, files } = sample();
  assert.ok(check(rt, pkg, files, 'welllog-layer').some(v => v.level === 'error'));
  assert.ok(check(rt, { ...pkg, sceneId: 'missing-scene' }, files).some(v => v.level === 'error'));
  assert.ok(check(rt, pkg, files.concat({ name: 'large.txt', data: '', size: 7 * 1024 * 1024 })).some(v => v.level === 'error' && /包太大/.test(v.msg)));
});

test('firstbreak imported script still computes live outputs and SVG paths', () => {
  const rt = runtime(), { document, ctx } = rt;
  document.getElementById('noise').value = '0.8'; document.getElementById('th').value = '3';
  vm.runInContext(read('firstbreak-pick-case/demo/demo.js'), ctx);
  assert.equal(document.getElementById('ro-pick').textContent, '304 ms');
  assert.match(document.getElementById('trace').innerHTML, /<path/);
  document.getElementById('noise').value = '3'; document.getElementById('th').value = '8';
  document.getElementById('noise').listeners.input();
  assert.equal(document.getElementById('ro-verdict').textContent, '漏拾取');
});

test('all 83 page combinations generate HTML without exceptions', () => {
  const rt = runtime(), P = rt.ctx.__shellTest, A = rt.ctx.ATLAS;
  const calls = [() => P.homeHTML(), () => P.chainHTML(), ...A.stages.map(s => () => P.stageHTML(s, {})), ...Object.keys(A.methods).map(k => () => P.methodHTML(k)), ...A.allScenes.map(sc => () => P.sceneHTML(sc, {})), () => P.casesHTML(), () => P.guideHTML()];
  assert.equal(calls.length, 83); for (const fn of calls) assert.ok(fn().length);
});

test('homepage contains all stage branches, valid scene links, and local cover assets', () => {
  const rt = runtime(); const html = rt.ctx.__shellTest.homeHTML();
  assert.equal((html.match(/data-home-stage>/g)||[]).length, 13);
  assert.equal((html.match(/data-home-leaf /g)||[]).length, 61);
  assert.match(html, /assets\/images\/oilfield-cover.png/);
  assert.ok(fs.existsSync(path.join(site, 'assets/images/oilfield-cover.png')));
  for(const match of html.matchAll(/href="#\/scene\/([^"?]+)(?:[^"]*)"/g)) assert.ok(rt.ctx.ATLAS.index.byScene[match[1]],match[1]);
  assert.match(html, /data-home-matrix="coverage"/);
  assert.match(html, /data-home-scope="ready"/);
  assert.ok(html.indexOf('id="first-lesson-title"') < html.indexOf('id="stage-map"'));
  assert.match(html, /href="#\/scene\/m1\?case=m1-cuttings&amp;tab=bg"/);
  assert.doesNotMatch(html, /DATA LAYER|SHELL|atlas@example.com/);
});

function homeControls(rt) {
  const html = rt.ctx.__shellTest.homeHTML(), root = new Element();
  const stages = html.split('<div class="atlas-map-stage" data-home-stage>').slice(1).map(part => {
    const stage = new Element();
    stage.leaves = [...part.matchAll(/data-home-leaf data-search="([^"]*)" data-ready="([01])"/g)].map(m => {
      const leaf = new Element(); leaf.dataset.search = m[1]; leaf.dataset.ready = m[2]; return leaf;
    });
    stage.querySelectorAll = selector => selector === '[data-home-leaf]' ? stage.leaves : [];
    return stage;
  });
  const methodButtons = [...html.matchAll(/data-home-method="([^"]*)"/g)].map(m => {
    const b = new Element('button'); b.dataset.homeMethod = m[1]; b.id = 'method-tab-' + m[1]; return b;
  });
  const scopeButtons = ['all', 'ready'].map(value => { const b = new Element('button'); b.dataset.homeScope = value; return b; });
  const matrixButtons = ['scenes', 'coverage'].map(value => { const b = new Element('button'); b.dataset.homeMatrix = value; return b; });
  const lists = { '[data-home-stage]': stages, '[data-home-method]': methodButtons, '[data-home-scope]': scopeButtons, '[data-home-matrix]': matrixButtons };
  root.querySelectorAll = sel => lists[sel] || [];
  const legend = root.querySelector('.atlas-heat-legend'); legend.firstElementChild = new Element(); legend.lastElementChild = new Element();
  rt.ctx.AtlasHome.bind(root);
  const click = (button, attr) => root.listeners.click({ target: { closest: selector => selector === '[data-home-' + attr + ']' ? button : null } });
  return { root, stages, methodButtons, scopeButtons, matrixButtons, click };
}

test('map search, empty results, clearing and case-only filtering update visible branches', () => {
  const rt = runtime(), { root, stages, scopeButtons, click } = homeControls(rt);
  const input = root.querySelector('#atlas-map-search');
  input.value = 's3'; input.listeners.input();
  assert.equal(root.querySelector('#atlas-map-count').textContent, '1 个场景');
  assert.equal(stages.filter(s => !s.hidden).length, 1);
  input.value = 'unmatched-query-987'; input.listeners.input();
  assert.equal(root.querySelector('#atlas-map-count').textContent, '0 个场景');
  assert.equal(root.querySelector('#atlas-map-empty').hidden, false);
  input.value = ''; input.listeners.input();
  assert.equal(root.querySelector('#atlas-map-count').textContent, '61 个场景');
  click(scopeButtons[1], 'scope');
  assert.equal(root.querySelector('#atlas-map-count').textContent, '2 个场景');
  assert.equal(stages.flatMap(s => s.leaves).filter(l => !l.hidden).length, 2);
  click(scopeButtons[0], 'scope');
  assert.equal(root.querySelector('#atlas-map-count').textContent, '61 个场景');
});

test('method choices update linked examples and support keyboard navigation', () => {
  const rt = runtime(), { root, methodButtons, click } = homeControls(rt);
  const ts = methodButtons.find(b => b.dataset.homeMethod === 'ts'); click(ts, 'method');
  const panel = root.querySelector('#atlas-method-panel');
  assert.match(panel.innerHTML, /href="#\/method\/ts"/);
  assert.equal(panel.attributes['aria-labelledby'], ts.id);
  assert.equal(ts.attributes['aria-selected'], true);
  root.listeners.keydown({ target: { closest: () => ts }, key: 'ArrowDown', preventDefault() {} });
  const next = methodButtons[methodButtons.indexOf(ts) + 1];
  assert.equal(next.focused, true); assert.equal(panel.attributes['aria-labelledby'], next.id);
  root.listeners.keydown({ target: { closest: () => next }, key: 'Home', preventDefault() {} });
  assert.equal(methodButtons[0].focused, true);
});

test('matrix modes distinguish candidate counts from covered scenes and retain their legend', () => {
  const rt = runtime(), { root, matrixButtons, click } = homeControls(rt);
  click(matrixButtons[1], 'matrix');
  assert.match(root.querySelector('#atlas-matrix-table').innerHTML, /测井 · 时序预测：1 \/ \d+ 个场景已接入案例/);
  assert.match(root.querySelector('#atlas-matrix-note').textContent, /已覆盖场景/);
  assert.equal(root.querySelector('.atlas-heat-legend').firstElementChild.textContent, '低');
  assert.match(rt.ctx.__shellTest.homeHTML(), /atlas-heat-legend"><span>低<\/span>/);
  click(matrixButtons[0], 'matrix');
  assert.match(root.querySelector('#atlas-matrix-note').textContent, /关联场景数量/);
  assert.doesNotMatch(root.querySelector('#atlas-matrix-table').innerHTML, /个场景已接入案例/);
});

test('index loads the local homepage code before the shell and all linked files exist', () => {
  const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(html.indexOf('src="assets/core/river.js') < html.indexOf('src="assets/core/home.js'));
  assert.ok(html.indexOf('src="assets/core/home.js') < html.indexOf('src="assets/core/shell.js'));
  for (const m of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)(?:[^" ]*)"/g)) assert.ok(fs.existsSync(path.join(site, m[1])), m[1]);
});

test('river geometry follows ordered nodes and keeps original input intact', () => {
  const rt = runtime();
  const input = [{ id: 'end', x: 580, y: 800, edgeX: 700, edgeY: 805 }, { id: 'start', x: 500, y: 180, edgeX: 420, edgeY: 180 }];
  const before = plain(input), model = rt.ctx.AtlasRiver.geometry(input, 1100, 1000);
  assert.deepEqual(input, before);
  assert.deepEqual(plain(model.branches.map(b => b.id)), ['start', 'end']);
  assert.match(model.trunk, /500 180/); assert.match(model.trunk, /580 800/);
  assert.ok(model.body.endsWith(' Z')); assert.equal(model.lanes.length, 3);
  for (const size of [[375, 500], [1200, 2600]]) {
    const empty = rt.ctx.AtlasRiver.geometry([], ...size);
    assert.doesNotMatch(empty.body + empty.trunk, /NaN|undefined|Infinity/);
    assert.equal(empty.branches.length, 0);
  }
});

test('river markup includes native particles, thirteen tributaries and accessible stage links', () => {
  const rt = runtime(), html = rt.ctx.__shellTest.homeHTML();
  assert.equal((html.match(/data-river-node=/g) || []).length, 13);
  assert.equal((html.match(/data-river-branch=/g) || []).length, 13);
  assert.ok((html.match(/<animateMotion /g) || []).length >= 30);
  assert.match(html, /data-river-motion aria-pressed="true"/);
  for (const stage of rt.ctx.ATLAS.stages) assert.ok(html.includes('data-river-node="' + stage.id + '"'));
});

function measuredRiver(rt, reduced = false) {
  const tree = new Element(), svg = new Element('svg'), toggle = new Element('button');
  const stats = { paused: 0, resumed: 0, disconnected: 0, resizeListeners: new Set(), styles: {} };
  svg.pauseAnimations = () => stats.paused++; svg.unpauseAnimations = () => stats.resumed++;
  tree.nodes.set('[data-river-svg]', svg); tree.nodes.set('[data-river-motion]', toggle);
  tree.getBoundingClientRect = () => ({ top: 0, left: 0, width: 1100, height: 1000 });
  tree.style.setProperty = (k, v) => stats.styles[k] = v;
  const stages = [0, 1].map(i => {
    const stage = new Element(), node = new Element(), island = new Element(), leaf = new Element();
    node.dataset.riverNode = 'stage-' + i;
    node.getBoundingClientRect = () => ({ left: 510 + i * 50, top: 180 + i * 400, width: 60, height: 60 });
    island.getBoundingClientRect = () => i ? ({ left: 700, right: 1060, top: 520, width: 360, height: 180 }) : ({ left: 30, right: 440, top: 120, width: 410, height: 180 });
    stage.nodes.set('[data-river-node]', node); stage.nodes.set('.atlas-river-island', island);
    leaf.dataset.ready = i ? '1' : '0'; stage.querySelectorAll = () => [leaf];
    return stage;
  });
  tree.querySelectorAll = selector => selector === '[data-home-stage]' ? stages : [];
  rt.ctx.addEventListener = (type, fn) => { if (type === 'resize') stats.resizeListeners.add(fn); };
  rt.ctx.removeEventListener = (type, fn) => { if (type === 'resize') stats.resizeListeners.delete(fn); };
  rt.ctx.ResizeObserver = class { observe() {} disconnect() { stats.disconnected++; } };
  rt.ctx.matchMedia = () => ({ matches: reduced });
  const handle = rt.ctx.AtlasRiver.mount(tree);
  return { tree, svg, toggle, stages, stats, handle };
}

test('measured river redraw follows filters and pause controls stop native motion', () => {
  const rt = runtime(), { tree, svg, toggle, stages, stats, handle } = measuredRiver(rt);
  assert.match(svg.innerHTML, /data-river-branch="stage-0"/);
  assert.match(svg.innerHTML, /data-river-branch="stage-1"/);
  stages[0].hidden = true; handle.refresh();
  assert.doesNotMatch(svg.innerHTML, /data-river-branch="stage-0"/);
  assert.match(svg.innerHTML, /data-river-branch="stage-1"/);
  tree.listeners.pointermove({ clientX: 550, clientY: 300 });
  assert.equal(stats.styles['--river-pointer-x'], '50%');
  toggle.listeners.click(); assert.ok(tree.classList.contains('is-paused'));
  assert.equal(toggle.attributes['aria-pressed'], 'false'); assert.ok(stats.paused > 0);
  toggle.listeners.click(); assert.equal(tree.classList.contains('is-paused'), false);
  assert.equal(toggle.attributes['aria-pressed'], 'true'); assert.ok(stats.resumed > 0);
  handle.destroy();
  assert.equal(stats.disconnected, 1); assert.equal(stats.resizeListeners.size, 0);
  assert.equal(tree.listeners.pointermove, undefined); assert.equal(toggle.listeners.click, undefined);
  const old = svg.innerHTML; stages[1].hidden = true; handle.refresh(); assert.equal(svg.innerHTML, old);
});

test('river motion starts paused when reduced motion is preferred', () => {
  const rt = runtime(), { tree, toggle, stats, handle } = measuredRiver(rt, true);
  assert.ok(tree.classList.contains('is-paused')); assert.equal(toggle.attributes['aria-pressed'], 'false');
  assert.equal(stats.resumed, 0); assert.ok(stats.paused > 0); handle.destroy();
});

function mudControls(rt, query = {}, reduced = false, bindNow = true) {
  const root = new Element(), svg = new Element('svg');
  const ctx = { stage: rt.ctx.ATLAS.index.byStage.mudlogging, atlas: rt.ctx.ATLAS, cases: rt.ctx.Cases, K: rt.ctx.K, query };
  const stats = { paused: 0, resumed: 0, mediaListeners: new Set() };
  const mq = { matches: reduced, addEventListener(type, fn) { stats.mediaListeners.add(fn); }, removeEventListener(type, fn) { stats.mediaListeners.delete(fn); } };
  rt.ctx.matchMedia = () => mq;
  const buttons = ['', 'cv', 'ts', 'nlp'].map(m => { const b = new Element('button'); b.dataset.mlMethodButton = m; return b; });
  const spots = ['cv', 'ts', 'cv', 'ts', 'nlp'].map((m, i) => { const s = new Element('a'); s.dataset.mlTechMethod = m; s.dataset.mlSpot = 'm' + (i + 1); return s; });
  const flows = spots.map(s => { const f = new Element('g'); f.dataset.mlFlow = s.dataset.mlSpot; return f; });
  svg.pauseAnimations = () => stats.paused++; svg.unpauseAnimations = () => stats.resumed++;
  const lists = { '[data-ml-method-button]': buttons, '[data-ml-spot]': spots, '[data-ml-flow]': flows, '[data-ml-motion]': [svg] };
  root.querySelectorAll = selector => lists[selector] || [];
  const handle = bindNow ? rt.ctx.MudloggingStage.bind(root, ctx) : null;
  const choose = m => {
    const b = buttons.find(b => b.dataset.mlMethodButton === m);
    root.listeners.click({ target: { closest: selector => selector === '[data-ml-method-button]' ? b : null } });
  };
  const toggle = () => root.listeners.click({ target: { closest: selector => selector === '[data-ml-toggle]' ? root.querySelector('[data-ml-toggle]') : null } });
  return { root, ctx, buttons, spots, flows, svg, stats, mq, handle, choose, toggle };
}

test('mud logging artwork links all five techniques to valid explanations and keeps new admin scenes accessible', () => {
  const rt = runtime(), P = rt.ctx.__shellTest, A = rt.ctx.ATLAS;
  const html = P.stageHTML(A.index.byStage.mudlogging, {});
  assert.equal((html.match(/data-ml-spot=/g) || []).length, 5);
  assert.ok((html.match(/<animateMotion /g) || []).length >= 20);
  for (const id of ['m1', 'm2', 'm3', 'm4', 'm5']) assert.match(html, new RegExp('href="#/scene/' + id + '(?:\\?[^"]*)?"'));
  for (const match of html.matchAll(/href="#\/scene\/([^"?]+)(?:[^"]*)"/g)) assert.ok(A.index.byScene[match[1]]);
  assert.ok(fs.existsSync(path.join(site, 'assets/images/mudlogging-process.png')));
  assert.doesNotMatch(P.stageHTML(A.index.byStage.welllog, {}), /data-ml-stage/);
  assert.equal(A.saveScene({ id: 'mud-new', name: '扩展录井场景', stageId: 'mudlogging', methods: ['cv'], diff: '中', point: '新增场景' }).ok, true);
  assert.match(P.stageHTML(A.index.byStage.mudlogging, {}), /href="#\/scene\/mud-new"/);
});

test('method selection magnifies the correct illustrations and updates deep links, flow emphasis and enlarged cards', () => {
  const rt = runtime(), { root, choose, spots, flows, buttons } = mudControls(rt);
  const active = () => spots.filter(s => s.classList.contains('is-relevant')).map(s => s.dataset.mlSpot);
  const deckIds = () => [...root.querySelector('[data-ml-deck]').innerHTML.matchAll(/href="#\/scene\/(m\d)(?:\?[^\"]*)?"/g)].map(m => m[1]);
  for (const [m, ids] of [['cv', ['m1', 'm3']], ['ts', ['m2', 'm4']], ['nlp', ['m5']]]) {
    choose(m);
    assert.deepEqual(active(), ids); assert.deepEqual(deckIds(), ids);
    assert.deepEqual(flows.filter(f => f.classList.contains('is-relevant')).map(f => f.dataset.mlFlow), ids);
    assert.equal(buttons.find(b => b.dataset.mlMethodButton === m).attributes['aria-pressed'], 'true');
    assert.equal(rt.ctx.location.hash, '#/stage/mudlogging?m=' + m);
  }
  choose('');
  assert.deepEqual(active(), []); assert.equal(deckIds().length, 5);
  assert.equal(spots.some(s => s.classList.contains('is-dim')), false);
  assert.equal(rt.ctx.location.hash, '#/stage/mudlogging');
});

test('mud logging restores method URLs, supports keyboard focus, and still works when file history rejects writes', () => {
  const rt = runtime(), { root, spots, buttons, choose } = mudControls(rt, { m: 'cv' });
  assert.deepEqual(spots.filter(s => s.classList.contains('is-relevant')).map(s => s.dataset.mlSpot), ['m1', 'm3']);
  rt.ctx.history.replaceState = () => { throw new Error('file history refused'); };
  choose('ts');
  assert.equal(root.dataset.mlMethod, 'ts'); assert.match(root.querySelector('[data-ml-status]').textContent, /m2 与 m4/);
  const ts = buttons[2];
  rt.ctx.innerHeight = 720;
  spots[4].getBoundingClientRect = () => ({ top: 1000, bottom: 1250 });
  root.listeners.keydown({ target: { closest: () => ts }, key: 'ArrowRight', preventDefault() {} });
  assert.equal(buttons[3].focused, true); assert.equal(root.dataset.mlMethod, 'nlp');
  assert.equal(spots[4].scrollOptions.block, 'center');
  root.listeners.keydown({ target: { closest: () => buttons[3] }, key: 'Home', preventDefault() {} });
  assert.equal(buttons[0].focused, true); assert.equal(root.dataset.mlMethod, '');
  const invalid = mudControls(runtime(), { m: 'unknown' });
  assert.equal(invalid.root.dataset.mlMethod, '');
});

test('mud logging pauses both native SVG and CSS motion, observes system preferences and cleans up on navigation', () => {
  const rt = runtime(), ui = mudControls(rt, {}, true, false), { root, stats, mq } = ui;
  rt.nodes.get('view').nodes.set('[data-ml-stage]', root);
  rt.ctx.location.hash = '#/stage/mudlogging'; rt.ctx.__shellTest.render();
  assert.equal(root.classList.contains('is-paused'), true); assert.ok(stats.paused > 0); assert.equal(stats.resumed, 0);
  ui.toggle();
  assert.equal(root.classList.contains('is-playing'), true); assert.equal(root.querySelector('[data-ml-toggle]').attributes['aria-pressed'], 'true');
  assert.ok(stats.resumed > 0);
  mq.matches = true; [...stats.mediaListeners].forEach(fn => fn());
  assert.equal(root.classList.contains('is-paused'), true);
  rt.ctx.location.hash = '#/chain'; rt.ctx.__shellTest.render();
  assert.equal(root.listeners.click, undefined); assert.equal(root.listeners.keydown, undefined);
  assert.equal(stats.mediaListeners.size, 0);
});

test('original-format mud logging case packs remain importable and the illustrated entrance displays the registered case', async () => {
  const rt = runtime(), { pkg, files } = sample();
  pkg.id = 'mudlogging-imported-example'; pkg.sceneId = 'm1'; pkg.title = '录井上传验证';
  await importThroughControls(rt, pkg, files);
  const html = rt.ctx.__shellTest.stageHTML(rt.ctx.ATLAS.index.byStage.mudlogging, { m: 'cv' });
  assert.match(html, /查看讲解与案例 · 2 个已接入/);
  const sceneHtml = rt.ctx.__shellTest.sceneHTML(rt.ctx.ATLAS.index.byScene.m1, {});
  assert.match(sceneHtml, /案例 mudlogging-imported-example/);
  assert.match(sceneHtml, /data-tab="bg"/); assert.match(sceneHtml, /data-tab="flow"/); assert.match(sceneHtml, /data-tab="demo"/);
});
