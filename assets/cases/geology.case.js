(function(g){
  'use strict';
  g.GEOLOGY_CONTENT.forEach(function(c){
    if(g.ATLAS&&g.ATLAS.index.byScene[c.id])g.ATLAS.index.byScene[c.id].demo=true;
    var def={id:c.caseId,sceneId:c.id,title:c.short+'：'+c.algorithm,methods:c.methods.slice(),status:'ready',version:'2.0.0',updated:'2026-11-01',lessonProtocol:'geology-v1',tabs:{}};
    [['background','专业背景'],['workflow','案例流程'],['demo','可运行示范']].forEach(function(p){var cleanup=null,t={label:p[1]};if(p[0]==='background'){var teaching=g.GeologyTeaching.byId[c.id],bodies=[c.context.map(function(v){return v[1];}).join(' '),teaching.papers.map(function(v){return v.title+' '+v.boundary;}).join(' '),c.data,teaching.difficulty+' '+c.limits,c.terms.map(function(v){return v.join('：');}).join('；')];t.sections=['真实背景','技术前沿','示例数据','技术难度与参考方向','术语对照表'].map(function(title,i){return {title:title,body:bodies[i]};});}if(p[0]==='workflow'){t.title=c.title;t.steps=g.GeologyLessons.flowSteps(c).map(function(v,i){return {number:['01','02','03','03','04','05'][i],part:i===2?'traditional':i===3?'ai':'ordinary',name:v[0],do:v[1],effect:v[2]};});}t.mount=function(root){if(cleanup)cleanup();cleanup=g.GeologyLessons.mount(c,p[0],root);};t.unmount=function(){if(cleanup)cleanup();cleanup=null;};def.tabs[p[0]]=t;});g.Cases.register(def);
  });
})(window);
