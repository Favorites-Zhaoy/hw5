(function(g){'use strict';
g.OPERATIONS_CONTENT.forEach(c=>{
 const scene=g.ATLAS.index.byScene[c.id];scene.demo=true;scene.intro=c.intro;scene.problem=c.problem;scene.point=c.why;scene.datasets=[c.primarySource.title];
 const def={id:c.caseId,sceneId:c.id,title:c.short+'：'+c.algorithm,methods:c.methods.slice(),status:'ready',version:'1.0.0',updated:'2026-11-03',lessonProtocol:'field-v1',tabs:{}};
 [['background','专业背景'],['workflow','案例流程'],['demo','可运行示范']].forEach(([key,label])=>{
  let dispose=null;const tab={label};
  if(key==='background')tab.sections=g.OperationsLessons.titles.map((title,i)=>({title,body:[c.problem,c.research.summary,c.data,c.limits.join('；'),c.glossary10.map(v=>v.join('：')).join('；')][i]}));
  if(key==='workflow'){tab.title=c.title;tab.steps=c.steps.map((v,i)=>({number:['01','02','03','03','04','05'][i],name:v.name,do:v.do,effect:v.output}));}
  tab.mount=root=>{
   if(dispose)dispose();let cancelled=false,cleanup=null;dispose=()=>{cancelled=true;if(cleanup)cleanup();};
   root.innerHTML='<div class="ox-loading" role="status">正在载入当前案例的资料与计算参数…</div>';
   const start=()=>g.OperationsAssets.load(c.id).then(()=>{if(cancelled)return;cleanup=g.OperationsLessons.mount(c,key,root);}).catch(error=>{if(cancelled)return;root.innerHTML='<div class="ox-loading" role="alert">'+g.OperationsMath.esc(error.message)+' <button type="button" data-op-retry>重新载入</button></div>';root.querySelector('[data-op-retry]').onclick=start;});start();
  };tab.unmount=()=>{if(dispose)dispose();dispose=null;};def.tabs[key]=tab;
 });g.Cases.register(def);
});
})(window);
