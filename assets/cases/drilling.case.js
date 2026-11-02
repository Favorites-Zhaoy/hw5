(function(g){
 'use strict';
 g.DRILLING_CONTENT.forEach(function(c){
  var def={id:c.caseId,sceneId:c.id,title:c.short,methods:c.methods.slice(),status:'ready',version:'1.0.0',updated:'2026-11-02',lessonProtocol:'field-v1',tabs:{}};
  [['background','专业背景'],['workflow','案例流程'],['demo','可运行示范']].forEach(function(pair){var cleanup=null,t={label:pair[1]};if(pair[0]==='background')t.sections=['真实背景','技术前沿','示例数据','技术难度与参考方向','术语对照表'].map(function(title,i){return {title:title,body:[c.context.map(function(v){return v.join('：');}).join(' '),c.papers.map(function(p){return p.title+' '+p.boundary;}).join(' '),c.dataText,c.difficulty+' '+c.limits,c.terms.map(function(v){return v.join('：');}).join('；')][i]};});if(pair[0]==='workflow'){t.title=c.title;t.steps=g.DrillingLessons.flowSteps(c).map(function(v,i){return {number:['01','02','03','03','04','05'][i],part:i===2?'traditional':i===3?'ai':'ordinary',name:v[0],do:v[1],effect:c.output};});}t.mount=function(root){if(cleanup)cleanup();cleanup=g.DrillingLessons.mount(c,pair[0],root);};t.unmount=function(){if(cleanup)cleanup();cleanup=null;};def.tabs[pair[0]]=t;});g.Cases.register(def);
 });
})(window);
