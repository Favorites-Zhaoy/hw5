'use strict';
// Static audit only. Refit the deterministic teaching models explicitly with:
// node tools/drilling/prepare-models.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),sha=p=>crypto.createHash('sha256').update(read(p)).digest('hex');
const files=['assets/drilling/content.js','assets/drilling/engine.js','assets/drilling/data.js','assets/drilling/stage.js','assets/drilling/lessons.js','assets/cases/drilling.case.js'];
for(const file of files)new vm.Script(read(file),{filename:file});
assert.ok(read('assets/drilling/drilling.css').includes('.drl-stage'));
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(read('assets/drilling/content.js'),ctx);vm.runInContext(read('assets/drilling/data.js'),ctx);
const D=ctx.window.DRILLING_DATA,C=ctx.window.DRILLING_CONTENT,P=JSON.parse(read('tools/drilling/provenance.json'));
assert.equal(C.length,5);assert.equal(D.kind,'synthetic-teaching');assert.equal(D.seed,20261102);
assert.equal(D.provenance.generator,'tools/drilling/prepare-models.cjs');assert.equal(D.provenance.generatorSha256,sha(D.provenance.generator),'Training generator changed: rerun the explicit prepare command.');
if(D.provenance.engineSha256)assert.equal(D.provenance.engineSha256,sha('assets/drilling/engine.js'),'Model engine changed: rerun prepare.');
for(const c of C){assert.ok(D.models[c.id]);assert.equal(c.context.length,3);assert.ok(c.papers.length>=2,c.id+' needs current primary sources');assert.ok(c.terms.length>=8);assert.equal(D[c.id].records.length,3);assert.ok(D[c.id].trainGroups.every(g=>!D[c.id].testGroups.includes(g)));assert.ok(P.models[c.id]);}
console.log('Drilling static audit: 5 complete lessons, 5 stored fitted models; no retraining.');
