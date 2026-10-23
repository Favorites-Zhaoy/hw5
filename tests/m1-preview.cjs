// Source/VM checks only. No browser, user storage or network access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const site = process.env.HW5_PORTAL_ROOT || path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(site, name), 'utf8');
const base = read('tests/regression.cjs').split("test('all JavaScript files compile'")[0];
const support = { require, __dirname: path.join(site, 'tests'), process, Buffer, Blob, TextEncoder, Event, console, setImmediate };
vm.createContext(support);
vm.runInContext(base + '\nglobalThis.makeRuntime = runtime; globalThis.El = Element; globalThis.importPack = importThroughControls;', support);
function packFiles() {
  return ['demo/index.html', 'demo/demo.css', 'demo/demo.js', 'assets/m1-dioramas.webp'].map(name => {
    const data = fs.readFileSync(path.join(site, 'm1-cuttings-case', name));
    const binary = name.endsWith('.webp');
    return { name, size: data.length, enc: binary ? 'dataurl' : 'text', mime: binary ? 'image/webp' : 'text/plain', data: binary ? 'data:image/webp;base64,' + data.toString('base64') : data.toString('utf8') };
  });
}

test('m1 plugin registers a draft and frame lifecycle preserves source isolation', () => {
  const rt = support.makeRuntime(), c = rt.ctx.Cases.get('m1-cuttings-preview-local');
  const pkg = JSON.parse(read('m1-cuttings-case/case.json'));
  assert.equal(c.status, 'draft'); assert.equal(c.sceneId, 'm1');
  assert.deepEqual(JSON.parse(JSON.stringify(c.tabs.background)), pkg.tabs.background);
  assert.equal(rt.ctx.Cases.validate(c).filter(x => x.level === 'error').length, 0);
  const root = new support.El(); c.tabs.demo.mount(root);
  const first = root.children[0];
  assert.equal(first.src, 'm1-cuttings-case/demo/index.html');
  assert.ok(first.attributes.sandbox.includes('allow-scripts'));
  c.tabs.demo.mount(root); assert.equal(first.removed, true);
  c.tabs.demo.unmount(); assert.equal(root.children[1].removed, true);
});

test('m1 page pack fits importer limits and embeds its artwork, scripts and style', () => {
  const rt = support.makeRuntime(), pkg = JSON.parse(read('m1-cuttings-case/case.json')), files = packFiles();
  const errors = rt.ctx.__importTest.checkAll(pkg, pkg, files).filter(x => x.level === 'error');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  assert.ok(files.reduce((sum, f) => sum + f.size, 0) < 6 * 1024 * 1024);
  const c = rt.ctx.__importTest.toCase({ pkg, meta: { ...pkg, id: 'imported-m1-preview' }, files });
  const root = new support.El(); c.tabs.demo.mount(root, {});
  const doc = root.children[0].srcdoc;
  assert.match(doc, /data:image\/webp;base64,/);
  assert.equal(/<(?:img|script)\b[^>]*\ssrc="(?:\.\.\/assets|demo\.js)|<link\b[^>]*\shref="demo\.css"/.test(doc), false);
  assert.match(doc, /flow-dashes/); assert.match(doc, /尚未接入真实岩屑样本/);
  c.tabs.demo.unmount(); assert.equal(root.children[0].removed, true);
});

test('the unchanged m1 folder imports through controls into its own portal and restores', async () => {
  const rt = support.makeRuntime(), pkg = JSON.parse(read('m1-cuttings-case/case.json'));
  const ui = new support.El(); rt.ctx.__importTest.state.el = ui; rt.ctx.__importTest.reset({});
  const raw = [{ name: 'case.json', enc: 'text', data: JSON.stringify(pkg) }, ...packFiles()].map(file => {
    const binary = file.enc === 'dataurl';
    const data = binary ? Buffer.from(file.data.split(',')[1], 'base64') : file.data;
    return { name: path.posix.basename(file.name), webkitRelativePath: 'm1-cuttings-case/' + file.name, type: binary ? 'image/webp' : 'text/plain', size: Buffer.byteLength(data), data };
  });
  rt.ctx.__importTest.loadFiles(raw); await new Promise(resolve => setImmediate(resolve));
  assert.equal(rt.ctx.__importTest.state.loading, false);
  rt.ctx.__importTest.commit();
  assert.equal(rt.ctx.Cases.byScene('m1').id, pkg.id);
  const saved = rt.values.get('atlas.casepack.v2'); assert.ok(saved);
  assert.ok(saved.length * 2 < 5 * 1024 * 1024, 'one pack fits a 5 MiB UTF-16 storage budget');
  const restored = support.makeRuntime({ 'atlas.casepack.v2': saved });
  assert.equal(restored.ctx.Cases.byScene('m1').id, pkg.id);
});

test('m1 step controls, autoplay and motion toggle update actual explanations', () => {
  const nodes = new Map(), buttons = [0, 1, 2, 3].map(() => new support.El('button'));
  const doc = { body: new support.El(), documentElement: { scrollHeight: 1300 }, hidden: false,
    querySelector: () => null, querySelectorAll: () => buttons, getElementById(id) { if (!nodes.has(id)) { const node = new support.El(); node.style.setProperty = (key, value) => { node.style[key] = value; }; nodes.set(id, node); } return nodes.get(id); },
    createElement: () => new support.El(), addEventListener() {} };
  let ticker = null, cleared = 0;
  const ctx = { document: doc, addEventListener() {}, setInterval(fn) { ticker = fn; return 1; }, clearInterval() { ticker = null; cleared++; } };
  ctx.window = ctx; ctx.parent = ctx;
  vm.createContext(ctx); vm.runInContext(read('m1-cuttings-case/demo/demo.js'), ctx);
  assert.equal(nodes.get('step-count').textContent, '1 / 4');
  buttons[2].listeners.click(); assert.match(nodes.get('detail-title').textContent, /机器找相似/);
  assert.equal(buttons[2].attributes['aria-pressed'], 'true');
  nodes.get('next').listeners.click(); assert.equal(nodes.get('step-count').textContent, '4 / 4');
  nodes.get('next').listeners.click(); assert.equal(nodes.get('step-count').textContent, '1 / 4');
  nodes.get('prev').listeners.click(); assert.equal(nodes.get('step-count').textContent, '4 / 4');
  nodes.get('play').listeners.click(); ticker(); assert.equal(nodes.get('step-count').textContent, '1 / 4');
  nodes.get('motion').listeners.click(); assert.equal(ticker, null); assert.ok(cleared > 0);
  assert.equal(doc.body.classList.contains('is-paused'), true);
  nodes.get('motion').listeners.click(); assert.equal(doc.body.classList.contains('is-paused'), false);
});
