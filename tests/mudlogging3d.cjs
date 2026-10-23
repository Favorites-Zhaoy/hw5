// Hardware-independent checks of the actual meshes, poses, projection and rendering lifecycle.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const site = process.env.HW5_PORTAL_ROOT || path.resolve(__dirname, '..');
const THREE = require(path.join(site, 'assets/vendor/three-r160.min.js'));
const source = fs.readFileSync(path.join(site, 'assets/core/mudlogging3d.js'), 'utf8');

function runtime(software = false) {
  const stats = { renders: 0, fills: 0, strokes: 0, disposed: 0, lost: 0, canvases: [] };
  const ctx2d = { setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() { stats.fills++; }, stroke() { stats.strokes++; } };
  class Canvas {
    constructor() { this.listeners = {}; this.attributes = {}; stats.canvases.push(this); }
    setAttribute(k, v) { this.attributes[k] = v; }
    addEventListener(k, v) { this.listeners[k] = v; }
    removeEventListener(k, v) { if (this.listeners[k] === v) delete this.listeners[k]; }
    getContext(kind) { assert.equal(kind, '2d'); return ctx2d; }
    remove() { this.removed = true; }
  }
  class Renderer {
    constructor() { if (software) throw new Error('WebGL unavailable'); this.shadowMap = {}; }
    setPixelRatio() {} setClearColor() {} setSize() {}
    render(scene, camera) { assert.ok(scene.isScene && camera.isOrthographicCamera); stats.renders++; }
    dispose() { stats.disposed++; } forceContextLoss() { stats.lost++; }
  }
  const ctx = { THREE: { ...THREE, WebGLRenderer: Renderer }, document: { createElement: () => new Canvas() }, devicePixelRatio: 1 };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(source, ctx);
  const host = { children: [], appendChild(c) { this.children.push(c); }, getBoundingClientRect() { return { width: 360, height: 280 }; } };
  return { api: ctx.Mudlogging3D, stats, host };
}

test('all eight miniatures contain real meshes and articulated helmeted workers without raster textures', () => {
  const { api } = runtime();
  for (const id of ['drill', 'return', 'm1', 'm2', 'm3', 'm4', 'align', 'm5']) {
    const m = api.build(id); let meshes = 0;
    assert.ok(m.workers.length >= 1, id);
    m.root.traverse(o => { if (o.isMesh) { meshes++; assert.equal(o.material.map, null); } });
    assert.ok(meshes >= 40, id);
    for (const w of m.workers) {
      assert.equal(w.head.parent, w.body);
      assert.equal(w.left.elbow.parent, w.left.shoulder);
      assert.equal(w.right.elbow.parent, w.right.shoulder);
      assert.ok(w.head.children.some(c => c.geometry && c.geometry.type === 'SphereGeometry'));
      assert.ok(w.head.children.some(c => c.geometry && c.geometry.type === 'CylinderGeometry'));
    }
    const bounds = new THREE.Box3().setFromObject(m.root);
    assert.ok(bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite));
    assert.ok(bounds.max.y > bounds.min.y);
    m.dispose();
  }
});

test('worker joints move between active poses and return exactly to their resting pose', () => {
  const { api } = runtime();
  for (const id of ['m1', 'm2', 'm3', 'm4', 'm5']) {
    const m = api.build(id), w = m.workers[0];
    const pose = () => [w.body.rotation.x, w.head.rotation.x, w.head.rotation.y, w.left.shoulder.rotation.x, w.right.elbow.rotation.x];
    m.update(0, 0); const rest = pose();
    m.update(.6, 1); const active = pose();
    m.update(1.3, 1); const moved = pose();
    assert.notDeepEqual(active, rest, id); assert.notDeepEqual(moved, active, id);
    m.update(2, 0); assert.ok(pose().every((v, i) => v === rest[i]), id);
    m.dispose();
  }
});

test('orthographic projection produces finite, visible geometric triangles and curves', () => {
  const { api } = runtime(), m = api.build('m2');
  for (const [width, height] of [[400, 300], [180, 400]]) {
    const camera = api.cameraFor(m, width, height), shapes = api.project(m, camera, width, height);
    assert.equal(camera.isOrthographicCamera, true); assert.ok(shapes.length > 1000);
    assert.ok(shapes.some(s => s.kind === 'line'));
    assert.ok(shapes.every(s => s.points.every(p => p.every(Number.isFinite))));
    assert.ok(shapes.every(s => s.points.every(p => p[0] >= -1 && p[0] <= width + 1 && p[1] >= -1 && p[1] <= height + 1)));
  }
  m.dispose();
});

test('WebGL views render geometry, resize and dispose only once', () => {
  const { api, stats, host } = runtime(), view = api.createView(host, 'm1');
  assert.ok(stats.renders > 0); assert.equal(host.children[0].attributes['aria-hidden'], 'true');
  view.setActive(true); assert.equal(view.isActive(), true); view.render(1, 1); view.resize();
  assert.ok(stats.renders >= 3);
  view.dispose(); view.dispose(); const renders = stats.renders; view.render(2, 1); view.resize();
  assert.equal(stats.renders, renders); assert.equal(stats.disposed, 1); assert.equal(stats.lost, 1);
  assert.equal(host.children[0].removed, true);
});

test('software fallback draws the same geometric model without screenshots or drawImage', () => {
  const { api, stats, host } = runtime(true), view = api.createView(host, 'm4');
  assert.ok(stats.fills > 1000); assert.ok(stats.strokes > 0);
  assert.equal(host.children[0].removed, true, 'failed WebGL canvas is replaced with a fresh 2D canvas');
  assert.equal(host.children.length, 2);
  const fills = stats.fills; view.render(1, 1); assert.ok(stats.fills > fills);
  view.dispose(); assert.equal(host.children[1].removed, true);
});

test('context loss switches to geometric software rendering and removes the old listener', () => {
  const { api, stats, host } = runtime(), view = api.createView(host, 'm2'), original = host.children[0];
  let prevented = false; original.listeners.webglcontextlost({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(original.removed, true);
  assert.equal(original.listeners.webglcontextlost, undefined);
  assert.equal(stats.disposed, 1); assert.ok(stats.fills > 1000);
  assert.equal(view.canvas, host.children[1]);
  view.dispose(); assert.equal(host.children[1].removed, true);
});
