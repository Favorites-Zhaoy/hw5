'use strict';
// One-time source derivation; package builds run the generated builder directly.
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'../..');
let s=fs.readFileSync(path.join(root,'tools/build-drilling-case-pages.cjs'),'utf8').replaceAll('Drilling','Perforation').replaceAll('DRILLING','PERFORATION').replaceAll('drilling','perforation').replaceAll('drl','pf').replaceAll("'engine'","'core'").replaceAll('engine.js','core.js');
s=s.replace("for (const file of ['content', 'core', 'data', 'lessons']) vm.runInContext(read('assets/perforation/' + file + '.js'), context, {filename: file + '.js'});","for (const file of ['shared-perforation/data','shared-perforation/core','perforation/data','perforation/core','perforation/content','perforation/lessons']) vm.runInContext(read('assets/' + file + '.js'), context, {filename: file + '.js'});");
s=s.replace('assert.equal(W.PERFORATION_CONTENT.length, 5);','assert.equal(W.PERFORATION_CONTENT.length, 4);');
s=s.replace("const scripts = ['content','core','data','lessons'].map(name=>'<script src=\"../../assets/perforation/'+name+'.js?v='+version+'\"></script>').join('\\n');","const scripts = ['shared-perforation/data','shared-perforation/core','perforation/data','perforation/core','perforation/content','perforation/lessons'].map(name=>'<script src=\"../../assets/'+name+'.js?v='+version+'\"></script>').join('\\n');");
s=s.replace('const root = path.resolve(__dirname, \'..\');',"const root = path.resolve(__dirname, '..');\nrequire('./perforation/derive-lessons.cjs');");
s=s.replace('five existing fitted lessons','four fitted/knowledge lessons').replace('Only the fitted perforation figures','Only the perforation figures').replace('Perforation packages: 5 cases','Perforation packages: 4 cases');
s=s.replace('`content.js`、`core.js`、`data.js` 和 `lessons.js`','`content.js`、`core.js`、`data.js` 和 `lessons.js`，以及 `assets/shared-perforation/` 中CO2/P1共享代理');
s=s.replace('`assets/perforation/content.js`、`core.js`、`data.js` 和 `lessons.js`','`assets/perforation/content.js`、`core.js`、`data.js` 和 `lessons.js`，以及 `assets/shared-perforation/` 中CO2/P1共享代理');
s=s.replace('全部运行所需代码和资料均为本地文件','全部工具族、性质证书和压力资料均为合成，不含真实厂家规格。全部运行所需代码和资料均为本地文件');
s=s.replace('.pf-mechanism,.pf-plot,.pf-residual,.pf-trajectory{','.pf-mechanism,.pf-plot,.pf-residual,.pf-trajectory,.pf-graph{');
s=s.replace('.pf-mechanism{margin:', '.pf-graph{display:block;width:100%;height:auto;margin:16px 0;background:#fffbf4;border:1px solid #e2cdb9;border-radius:6px}.pf-graph text{fill:#805e48;font-size:16px}.pf-mechanism{margin:');
fs.writeFileSync(path.join(root,'tools/build-perforation-case-pages.cjs'),s);console.log('Derived the four-case package builder from approved drilling builder.');
