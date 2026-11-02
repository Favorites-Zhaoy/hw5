/* Fast static validation. Model retraining is an explicit separate command. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=['content','data','models','core','stage','lessons'];const ctx={window:{}};files.forEach(name=>vm.runInNewContext(read('assets/welllog/'+name+'.js'),ctx,{filename:name+'.js'}));
const D=ctx.window.WELLLOG_DATA,C=ctx.window.WELLLOG_CONTENT,U=ctx.window.WelllogMath;
if(C.length!==5||D.records.length!==2||D.images.length!==2)throw Error('Incomplete welllog lessons');
for(const c of C){if(c.terms.length<10||!c.papers.length)throw Error(c.id+' missing teaching content');const o=U.evaluate(c.id,0,{threshold:.5,factor:1,exposure:1,gapStart:68,gapLength:18,thickness:4,rule:14});if(!o.prediction.length||JSON.stringify(o.metrics).includes('null'))throw Error(c.id+' invalid inference');}
const manifest={version:'1.0.0',updated:'2026-11-02',cases:C.map(c=>({sceneId:c.id,caseId:c.caseId,algorithm:c.algorithm,methods:c.methods})),dataType:D.kind,seed:D.seed,modelSha256:D.modelSha256,retrain:'python tools/welllog/prepare.py',scripts:files.map(n=>'assets/welllog/'+n+'.js')};
fs.writeFileSync(path.join(root,'assets/welllog/manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest.cases));
