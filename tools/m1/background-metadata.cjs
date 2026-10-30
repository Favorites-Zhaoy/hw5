// Compact original-protocol fallback. Full interactive figures remain in lesson.html.
const teaching=require('./teaching-content.cjs');
module.exports=function({style,well,feature,split}){
  const link=(url,label)=>'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+label+' ↗</a>';
  return {label:'专业背景',lede:'从现场原理到基础 CNN，带着同一批岩屑照片走完任务、分类和井深对照。',judge:[
    {label:'数据',value:'66 张真实照片',desc:'井 2，三类源标签'},
    {label:'方法',value:'CNN 迁移学习',desc:'固定 ResNet-18，只拟合三类分类层'},
    {label:'课程实现难度',value:'中',desc:'小样本、标签与井段相关性'}
  ],sections:[
    {no:1,en:'CONTEXT',title:'真实背景',html:style+'<p>钻头打碎岩层，岩屑随钻井液返回地面。录井人员清洗、筛分并观察颜色、颗粒和结构，结合检验描述岩性，再对应井深。</p><div class="m1c">'+well+'</div><p>专业结构图帮助理解颗粒、层理和组分；真实照片只记录可见外观。CNN 接替重复的图像特征比较，不包办现场取样和矿物鉴定。</p>'},
    {no:2,en:'RESEARCH',title:'技术前沿',html:teaching.papers.map(p=>'<p><b>'+p.year+' · '+p.authors+' · '+p.journal+'</b><br>'+p.input+' → '+p.ai+' → '+p.output+'。'+link(p.url,p.title)+'<br>'+p.boundary+'</p>').join('')+'<div class="m1c">'+feature+'</div>'},
    {no:3,en:'DATA',title:'示例数据',html:'<p>同一份公开资料：66 张 RGB 照片，细砂岩 24 张、页岩 18 张、灰质白云岩 24 张。背景、六步流程和示范都使用它们。'+link('https://github.com/nature9420/-ResNet-HMM-Lithology','原始资料')+'</p><div class="m1c">'+split+'</div><p>20 m 是井段分组宽度。42 张开发资料逐组验证，24 张沿用固定留出组；原图、井深、标签与分组不变。现场迟到及拍摄条件未完整提供。</p>'},
    {no:4,en:'DIFFICULTY',title:'技术难度与参考方向',html:'<p><b>难度 中</b>：基础网络可复用，难点在小样本、标签规则和井段相关性。先用分组验证检查基础 CNN，再讨论注意力、多任务学习或独立井应用。</p><svg viewBox="0 0 420 14" role="img" aria-label="三档难度的第二档"><rect width="132" height="7" rx="3" fill="#e7484d"/><rect x="140" width="132" height="7" rx="3" fill="#e7484d"/><rect x="280" width="132" height="7" rx="3" fill="#dcd6d3"/></svg><p>交叉环节：钻井（取样与井深）· 录井（观察描述）· 测井（综合核对）。</p>'},
    {no:5,en:'GLOSSARY',title:'术语对照表',html:'<table><thead><tr><th>专业术语</th><th>大白话</th><th>最接近的计算机概念 / 本课用法</th></tr></thead><tbody>'+teaching.terms.map(t=>'<tr>'+t.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
  ]};
};
