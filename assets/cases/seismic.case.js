(function(g){'use strict';
g.SEISMIC_CONTENT.forEach(c=>{
 const scene=g.ATLAS.index.byScene[c.id];scene.demo=true;scene.intro=c.intro;scene.point=c.why;scene.problem=c.problem;scene.datasets=[c.source.name];
 const def={id:c.caseId,sceneId:c.id,title:c.short+'：'+c.algorithm,methods:c.methods.slice(),status:'ready',version:'1.0.0',updated:'2026-11-02',lessonProtocol:'field-v1',tabs:{}};
 [['background','专业背景'],['workflow','案例流程'],['demo','可运行示范']].forEach(([key,label])=>{
  let dispose=null;const tab={label};
  if(key==='background')tab.sections=g.SeismicLessons.titles.map((title,i)=>({title,body:[c.problem,c.paper.text,c.data,c.limit,c.terms.map(v=>v.join('：')).join('；')][i]}));
  if(key==='workflow'){tab.title=c.title;tab.steps=c.steps.map((v,i)=>({number:['01','02','03','03','04','05'][i],name:v[0],do:v[1],effect:v[2]}));}
  tab.mount=root=>{
   if(dispose)dispose();let cancelled=false,cleanup=null;dispose=()=>{cancelled=true;if(cleanup)cleanup();};
   root.innerHTML='<div class="sx-loading" role="status">正在载入这一个案例的地震资料…</div>';
   const start=()=>g.SeismicAssets.load(c.id).then(()=>{if(cancelled)return;cleanup=g.SeismicLessons.mount(c,key,root);}).catch(error=>{if(cancelled)return;root.innerHTML='<div class="sx-loading" role="alert">'+g.SeismicMath.esc(error.message)+' <button type="button" data-seismic-retry>重新载入</button></div>';root.querySelector('[data-seismic-retry]').onclick=start;});
   start();
  };
  tab.unmount=()=>{if(dispose)dispose();dispose=null;};def.tabs[key]=tab;
 });
 g.Cases.register(def);
});})(window);
