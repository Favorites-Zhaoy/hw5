/* Generate only the two downstream themes from their reviewed content and retained field template. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'assets/downstream');fs.mkdirSync(out,{recursive:true});
const art=JSON.parse(fs.readFileSync(path.join(__dirname,'image-config.json'),'utf8'));
const lesson='(function(g){\'use strict\';\n'+fs.readFileSync(path.join(__dirname,'lesson-logic.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'lesson-template.js'),'utf8')+'g.DownstreamLessons={mount,state,titles,defaults};\n})(window);\n';
fs.writeFileSync(path.join(out,'lessons.js'),lesson.replace(/\r\n/g,'\n'));
const stages={
 transport:{name:'运输',en:'TRANSPORTATION',index:'12',headline:'沿着管线与储罐，读懂运行中的变化',lead:'先理解输送、增压、计量与储存，再比较异常检测、缺陷评估和运行优化。',relation:'五项任务共享管段、设备与时间标识，分别处理泄漏、腐蚀、调度、计量与储罐状态，彼此互补；T1—T5是案例编号。',flow:'管线与储运资料 → 监测、评估与约束调度 → 工程复核与记录'},
 refining:{name:'加工',en:'REFINING',index:'13',headline:'从原料到产品，核对工况、设备与质量',lead:'认识分馏、反应、设备监测和化验怎样联系，再操作模型比较条件与结果。',relation:'五项任务对应操作、产品、设备、化验和在线质量，按业务需要组合；R1—R5是案例编号，不是五道连续炼油工序。',flow:'原料与过程记录 → 优化、预测与审核 → 化验复核与生产记录'}
};
const names={cv:['CV','计算机视觉'],ts:['TS','时序分析'],opt:['OPT','约束优化'],nlp:['NLP','自然语言处理'],kg:['KG','知识图谱']};
const algorithms={t1:'双端负压波时序检测＋互相关定位',t2:'缺陷图CNN＋减薄时序评估',t3:'集输代理＋容量与压力约束搜索',t4:'稀疏标定的漂移状态估计',t5:'可见液面图像CNN读数',r1:'馏分代理MLP＋有界操作搜索',r2:'FCC动态GRU＋工况候选筛选',r3:'历史振动温度GRU＋残差预警',r4:'文本抽取与审核分类＋约束分派',r5:'过程窗口GRU质量软测量'};
const colors=['#b95739','#497d99','#8b65a0','#6b884b','#3a8c8a'];
for(const [id,st] of Object.entries(stages)){const image=art.stages[id];st.image='assets/images/downstream/'+image.baseName+'.webp';st.top=image.boxes[0][1];st.height=image.boxes[0][3];}
const content=Object.keys(stages).flatMap(stage=>JSON.parse(fs.readFileSync(path.join(__dirname,'content-'+stage+'.json'),'utf8')).map((c,i)=>({...c,algorithm:algorithms[c.id],color:colors[i],artImage:stages[stage].image,artBox:art.stages[stage].boxes[i]})));
fs.writeFileSync(path.join(out,'content.js'),'(function(g){g.DOWNSTREAM_CONTENT='+JSON.stringify(content)+';g.DOWNSTREAM_STAGES='+JSON.stringify(stages)+';})(window);\n');
const source=fs.readFileSync(path.join(root,'assets/seismic/stage.js'),'utf8');
let result='/* Generated from the retained mudlogging field template. */\nwindow.DownstreamStages={};\n';
for(const [id,st] of Object.entries(stages)){
 const list=content.filter(c=>c.stageId===id),methods=[{id:'',abbr:'ALL',name:'完整关系',note:st.relation},...Object.keys(names).filter(m=>list.some(c=>c.methods.includes(m))).map(m=>({id:m,abbr:names[m][0],name:names[m][1],note:list.filter(c=>c.methods.includes(m)).map(c=>c.id.toUpperCase()+' '+c.short).join(' · ')+'。方法标签解释各任务怎样处理资料，仍需回到业务判断。'}))];
 const tech=list.map((c,i)=>({id:c.id,method:c.methods[0],methods:c.methods,color:c.color,box:c.artBox,art:c.artBox,input:c.input,output:c.output}));
 let s=source.replace(/var IMAGE = [\s\S]*?function relevant/,`var IMAGE='assets/images/downstream/${art.stages[id].baseName}.webp';\nvar IMAGE_SET='assets/images/downstream/${art.stages[id].baseName}-small.webp 768w, '+IMAGE+' 1448w';\nvar IMAGE_SIZES='(max-width:700px) calc(100vw - 28px), 1448px';\nvar WIDTH=1448,HEIGHT=1086;\nvar METHODS=${JSON.stringify(methods)};\nvar TECH=${JSON.stringify(tech)};\nfunction relevant`);
 s=s.replace(/function effect\(t\)\{[\s\S]*?function sceneHref/,`function effect(t){return '<svg class="ml-tech-effect" viewBox="0 0 '+t.box[2]+' '+t.box[3]+'" aria-hidden="true"><path class="ml-trace ml-trace-vision" d="M24 118H'+(t.box[2]-24)+'V'+(t.box[3]-28)+'H24Z"/><path class="ml-monitor-scan" d="M25 118V'+(t.box[3]-28)+'"/></svg>';}\nfunction sceneHref`);
 const paths=tech.map((t,i)=>`flow('M724 ${st.top-52}H${Math.round(t.box[0]+142)}V${st.top}', '${colors[i]}', ${5+i/3}, '${t.id}')`).join('+');
 s=s.replace(/function drawing\(\)\{[\s\S]*?function deck/,`function drawing(){return '<svg class="ml-flows" data-ml-motion viewBox="0 0 1448 1086" aria-hidden="true">'+${paths}+'</svg>';}\nfunction deck`);
 s=s.replace('root.dataset.mlMethod = focus;', "root.dataset.mlMethod = focus;root.classList.toggle('has-many-focus', !!focus && TECH.filter(function(t){return relevant(t,focus);}).length>1);");
 s=s.replaceAll('global.SEISMIC_CONTENT','global.DOWNSTREAM_CONTENT').replaceAll('data-seismic-stage','data-downstream-stage').replaceAll('sx-stage','op-stage').replaceAll('#/stage/seismic','#/stage/'+id);
 s=s.replace('02 / 13',st.index+' / 13').replace('GEOPHYSICS · 物探',st.en+' · '+st.name).replaceAll('更多物探场景','更多'+st.name+'场景').replaceAll('物探现场交互总览',st.name+'现场交互总览').replace('>物探</span>','>'+st.name+'</span>');
 s=s.replace('从地震记录，读出地下线索',st.headline).replace('先认识采集、处理、解释与预测，再看每种方法具体接手哪一步。',st.lead).replace('采集记录 → 处理资料 → 解释与预测',st.flow).replace('断层与地震相是互补解释；初至与去噪是可按需组合的处理任务；参数预测另需井约束。S1—S5为案例编号。',st.relation+' AI生成的业务示意，实验资料与结果在各案例中。');
 s=s.replace(/alt="物探关系图：[^"]*"/,'alt="'+st.name+'业务关系示意：'+st.relation+'；AI生成的教学插图，不是实验资料。"');
 s=s.replace(/global.SeismicStage = [\s\S]*?;\s*\}\)\(window\);/,`global.DownstreamStages.${id}={render:render,bind:bind};\n})(window);`);
 result+=s+'\n';
}
result+='window.DownstreamStage={supports:function(id){return !!window.DownstreamStages[id];},render:function(ctx){return window.DownstreamStages[ctx.stage.id].render(ctx);},bind:function(root,ctx){return window.DownstreamStages[ctx.stage.id].bind(root,ctx);}};\n';
fs.writeFileSync(path.join(out,'stage.js'),result.replace(/\r\n/g,'\n'));
let css=fs.readFileSync(path.join(root,'assets/seismic/seismic.css'),'utf8').replace(/\.sx-stage[^\n]*\n/,'').replaceAll('sx-','ox-').replaceAll('data-seismic-lesson','data-downstream-lesson');
css+='\n.op-stage .ml-spot{scroll-margin-top:150px}.op-stage .ml-spot:first-of-type{transform-origin:left center}.op-stage .ml-spot:last-of-type{transform-origin:right center}.op-stage .ml-map-footer{align-items:flex-start}.op-stage .ml-map-footer p{max-width:650px;font-size:12px;line-height:1.8}.op-stage .ml-reading.has-focus .ml-deck{grid-template-columns:repeat(2,minmax(0,1fr))}.ox-chart-pair{display:grid;grid-template-columns:1fr 1fr;gap:26px;align-items:start}.ox-chart-pair>*{min-width:0}.ox-field-row{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.ox-field-row label{font-size:12px;color:#8a6848}.ox-field-row input,.ox-field-row select{font:inherit;max-width:100%;padding:8px 12px;border:1px solid #d5bea1;background:#fffaf0;color:#684c34}.ox-field-row input[type=text]{min-width:340px}.ox-chart-label{font-size:11px;color:#997957}.ox-result-table td{max-width:420px}.ox-image{width:100%;max-width:360px;image-rendering:pixelated}.ox-svg-image{display:block;width:100%;max-width:360px;margin:0 auto;background:#f8efdf;border:1px solid #d9c5a5}.ox-status{font-size:12px;padding:12px 16px;border-left:3px solid #b95739;background:#f2e6d1}.ox-key-result{font:500 23px/1.7 var(--serif,Georgia,serif);color:#923f2c}.ox-source-url{overflow-wrap:anywhere}.ox-context select{max-width:520px;min-width:250px}.ox-related a{max-width:220px}.ox-controls{flex-wrap:wrap}.ox-control{flex:1 1 240px}.ox-scope{overflow-wrap:anywhere}.ox-stats{grid-template-columns:repeat(auto-fit,minmax(155px,1fr))}\n';
css+='\n.op-stage.has-many-focus .ml-map.has-focus .ml-spot.is-relevant{transform:scale(1.02)}.op-stage.has-many-focus .ml-map.has-focus .ml-spot.is-relevant:hover,.op-stage.has-many-focus .ml-map.has-focus .ml-spot.is-relevant:focus-visible{transform:scale(1.12);z-index:9}\n';
fs.writeFileSync(path.join(out,'downstream.css'),css.replace(/\r\n/g,'\n'));
for(const c of content){const file=path.join(out,'data',c.id+'.json');if(!fs.existsSync(file))continue;const d=JSON.parse(fs.readFileSync(file,'utf8'));d.modelSHA256=crypto.createHash('sha256').update(JSON.stringify(d.model)).digest('hex');d.modelHashes={primary:d.modelSHA256};for(const key of ['secondaryModel','baselineModel'])if(d[key])d.modelHashes[key]=crypto.createHash('sha256').update(JSON.stringify(d[key])).digest('hex');fs.writeFileSync(file,JSON.stringify(d)+'\n');}
console.log('Downstream: '+content.length+' cases, two stage maps; available data payloads normalized.');
const integrity={version:1,generated:'2026-11-03',illustrationsUsedForTraining:false,cases:{},assetIntegrity:{}};
const artifact=file=>{const bytes=fs.readFileSync(path.join(root,file));return {file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};};
integrity.illustrations={styleVersion:art.version,tool:art.generationTool,references:art.references.map(artifact),stages:{}};
for(const [id,image] of Object.entries(art.stages)){
 const png='assets/images/downstream/'+image.baseName+'.png',bytes=fs.readFileSync(path.join(root,png));
 const nativeCanvas=image.nativeCanvas||art.canvas;
 if(bytes.readUInt32BE(16)!==nativeCanvas[0]||bytes.readUInt32BE(20)!==nativeCanvas[1])throw Error('Illustration canvas mismatch: '+png);
 if(image.boxes.length!==5||image.boxes.some(([x,y,w,h])=>x<0||y<0||w<=0||h<=0||x+w>art.canvas[0]||y+h>art.canvas[1]))throw Error('Invalid illustration hotspots: '+id);
 integrity.illustrations.stages[id]={canvas:art.canvas,nativeCanvas,boxes:image.boxes,files:[png,'assets/images/downstream/'+image.baseName+'.webp','assets/images/downstream/'+image.baseName+'-small.webp'].map(artifact)};
}
for(const c of content){const name='data/'+c.id+'.json',file=path.join(out,name);if(!fs.existsSync(file))throw Error('Missing case payload: '+name);const bytes=fs.readFileSync(file),d=JSON.parse(bytes);integrity.cases[c.id]={caseId:c.caseId,methods:c.methods,records:d.records.length,kind:[...new Set(d.records.map(r=>r.kind))],source:d.source,validation:d.validation,modelSHA256:d.modelSHA256};integrity.assetIntegrity[name]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}
for(const name of ['core.js','nlp.js','experiments.js','lessons.js','stage.js','content.js','downstream.css']){const bytes=fs.readFileSync(path.join(out,name));integrity.assetIntegrity[name]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}
fs.writeFileSync(path.join(out,'provenance.json'),JSON.stringify(integrity,null,2)+'\n');
