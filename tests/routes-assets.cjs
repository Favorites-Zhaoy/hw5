const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const site = process.env.HW5_PORTAL_ROOT || path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(site, name), 'utf8');
const base = read('tests/regression.cjs').split("test('all JavaScript files compile'")[0];
const support = { require, __dirname: path.join(site, 'tests'), process, Buffer, Blob, TextEncoder, Event, console, setImmediate };
vm.createContext(support); vm.runInContext(base + '\nglobalThis.makeRuntime=runtime;globalThis.El=Element;', support);

test('retired M1 browser archives cannot replace the current lesson; custom uploads still work', () => {
  const aliases = ['m1-cuttings-preview-local', 'm1-cuttings-knn', 'm1-cuttings-resnet'];
  const archives = aliases.map(id => ({ v: 2, pkg: { id, sceneId: 'm1', tabs: {} }, meta: { id, sceneId: 'm1', title: '旧版 M1', version: '1.9.0' }, files: [] }));
  const saved = JSON.stringify(archives), rt = support.makeRuntime({ 'atlas.casepack.v2': saved });
  assert.equal(rt.ctx.Cases.byScene('m1').id, 'm1-cuttings');
  for (const id of aliases) { assert.equal(rt.ctx.Cases.get(id), null); assert.equal(rt.ctx.Cases.resolveScene('m1', id).id, 'm1-cuttings'); }
  assert.equal(rt.values.get('atlas.casepack.v2'), saved, 'private archive files are not rewritten');
  const checks = rt.ctx.__importTest.checkAll(archives[0].pkg, archives[0].meta, []);
  assert.ok(checks.some(x => x.level === 'error' && x.msg.includes('已停用')));
  rt.ctx.Cases.register({ id: 'custom-m1-example', sceneId: 'm1', version: '1.0.0', imported: true, tabs: {} });
  assert.equal(rt.ctx.Cases.resolveScene('m1', 'custom-m1-example').id, 'custom-m1-example');
});

test('old case IDs and section aliases resolve to the maintained case and correct tab', () => {
  const rt = support.makeRuntime();
  for (const [id, tab, expected] of [['m1-cuttings-knn', 'workflow', 'flow'], ['m1-cuttings-preview-local', 'background', 'bg'], ['m1-cuttings-resnet', '3', 'demo'], [null, null, 'bg']]) {
    rt.ctx.location.hash = '#/scene/m1' + (id ? '?case=' + id + '&tab=' + tab : '');
    rt.ctx.__shellTest.render();
    const q = rt.ctx.__shellTest.parseHash().q;
    assert.equal(q.case, 'm1-cuttings'); assert.equal(q.tab, expected);
    const html = rt.ctx.__shellTest.sceneHTML(rt.ctx.ATLAS.index.byScene.m1, q);
    assert.ok(html.includes('辅助识别')); assert.ok(!html.includes('可视化示范'));
  }
  rt.ctx.location.hash = '#/scene/w1?case=welllog-layer&tab=3';
  rt.ctx.__shellTest.render(); assert.equal(rt.ctx.location.hash, '#/scene/w1?case=welllog-layer&tab=3');
});

test('the abandoned introduction is absent from the standalone case and all website entrances use the canonical ID', () => {
  const html = read('m1-cuttings-case/demo/index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  assert.ok(!html.includes('<section class="hero">')); assert.ok(!html.includes('读懂一次判断'));
  const rt = support.makeRuntime(), home = rt.ctx.__shellTest.homeHTML(), mud = rt.ctx.__shellTest.stageHTML(rt.ctx.ATLAS.index.byStage.mudlogging, {});
  for (const entry of [home, mud]) assert.ok(entry.includes('#/scene/m1?case=m1-cuttings&amp;tab=bg'));
  assert.ok(!home.includes('m1-cuttings-preview-local')); assert.ok(!mud.includes('m1-cuttings-preview-local'));
});

test('delivery images preserve the original source and substantially reduce bytes for both screen sizes', () => {
  const manifest = JSON.parse(read('assets/images/mudlogging-images.json'));
  const source = fs.readFileSync(path.join(site, 'assets/images', manifest.source.file));
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), manifest.source.sha256);
  assert.equal(manifest.assets.length, 2);
  for (const asset of manifest.assets) {
    const bytes = fs.readFileSync(path.join(site, 'assets/images', asset.file));
    assert.equal(bytes.length, asset.bytes); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    assert.ok(asset.bytes < source.length * .12);
  }
  const rt = support.makeRuntime(), html = rt.ctx.__shellTest.stageHTML(rt.ctx.ATLAS.index.byStage.mudlogging, {});
  assert.ok(!html.includes('mudlogging-process.png'));
  assert.ok(html.includes('srcset=') && html.includes('fetchpriority="high"') && html.includes('decoding="async"'));
  assert.ok(read('index.html').includes("/^#\\/stage\\/mudlogging"));
  assert.ok(read('assets/core/mudlogging.css').includes('data:image/webp;base64,'));
});

test('image readiness handles cold loads, failures, retries and cached images without leftover listeners', () => {
  const rt = support.makeRuntime(), root = new support.El(), image = root.querySelector('[data-ml-image]');
  const ctx = { stage: rt.ctx.ATLAS.index.byStage.mudlogging, atlas: rt.ctx.ATLAS, cases: rt.ctx.Cases, K: rt.ctx.K, query: {} };
  const handle = rt.ctx.MudloggingStage.bind(root, ctx), map = root.querySelector('[data-ml-map]');
  image.listeners.error(); assert.equal(map.dataset.mlImageState, 'error'); assert.equal(root.querySelector('[data-ml-image-retry]').hidden, false);
  root.listeners.click({ target: { closest: selector => selector === '[data-ml-image-retry]' ? image : null } });
  assert.equal(map.dataset.mlImageState, 'loading'); assert.ok(image.src.includes('retry='));
  image.listeners.load(); assert.equal(map.dataset.mlImageState, 'ready'); assert.equal(map.attributes['aria-busy'], 'false');
  assert.equal(root.querySelector('[data-ml-image-status]').hidden, true);
  handle.destroy(); assert.equal(image.listeners.load, undefined); assert.equal(image.listeners.error, undefined);
  const cached = new support.El(), cachedImage = cached.querySelector('[data-ml-image]'); cachedImage.complete = true; cachedImage.naturalWidth = 1448;
  const cachedHandle = rt.ctx.MudloggingStage.bind(cached, ctx);
  assert.equal(cached.querySelector('[data-ml-map]').dataset.mlImageState, 'ready'); cachedHandle.destroy();
});
