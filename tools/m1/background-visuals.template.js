  // Mechanism illustrations only: positions and particles are not measured data.
  var researchColors=classes.map(function(c){return c.color;});
  var researchPoints=[[65,66,0],[88,55,0],[109,72,0],[57,93,0],[81,91,1],[105,103,0],[72,116,0],[126,91,0],[203,57,2],[225,48,2],[244,68,2],[218,78,2],[201,123,1],[225,112,1],[245,132,1],[219,145,1]];
  $('research-label-viz').innerHTML='<svg viewBox="0 0 310 192" role="img" aria-label="外观相似的样本在图中特征位置靠近，颜色表示已有标签；蓝灰点位于砂色点群中，提示需要核对。"><text x="16" y="23">外观特征空间 · 示意</text>'+researchPoints.map(function(p){return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="7" fill="'+researchColors[p[2]]+'"/>';}).join('')+'<g class="audit-mark"><circle cx="81" cy="91" r="16" fill="none" stroke="#cf514b" stroke-width="2.5"/><path d="M96 96L157 164H281" fill="none" stroke="#cf514b" stroke-width="1.5"/><text x="161" y="156">标签值得核对</text></g></svg>';
  var researchLegend='<div class="research-legend">'+classes.map(function(c){return '<span><i style="background:'+c.color+'"></i>'+c.name+'</span>';}).join('')+'</div>';
  $('research-label-viz').innerHTML+=researchLegend;
  var researchParticles=['42,56 70,43 84,65 64,83 39,74','107,48 133,53 142,77 119,87 100,71','171,48 197,43 210,66 188,82 167,68','231,54 257,49 273,75 246,85 228,71','49,108 77,100 90,122 75,145 48,138','113,111 136,100 151,123 136,146 112,139','177,111 199,103 216,123 199,147 174,136','237,108 266,105 279,129 254,146 233,131'];
  $('research-grain-viz').innerHTML='<svg viewBox="0 0 310 192" role="img" aria-label="同一盘示意岩屑的两种输出表达；整图模式给一个标签，颗粒模式为各碎块显示类别。"><rect class="grain-tray" x="18" y="33" width="275" height="127" rx="13"/><text class="whole-caption" x="18" y="22">整图：一个标签</text><text class="grain-caption" x="18" y="22">逐颗：保留类别差异</text>'+researchParticles.map(function(p,i){return '<polygon class="research-particle" points="'+p+'" style="--particle:'+researchColors[[0,0,1,0,2,0,1,0][i]]+'"/>';}).join('')+'</svg><div class="grain-legend">'+researchLegend+'</div>';
  $('research-label-toggle').addEventListener('click',function(){
    var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));$('research-label-viz').classList.toggle('is-auditing',on);
    $('research-label-note').textContent=on?'圈出的点需要复核；外观相近本身不能证明原标签错误。':'特征空间示意：同色为同类标签，点靠近表示外观相似。';reportHeight();
  });
  $('research-capture-toggle').addEventListener('click',function(){var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));$('research-capture-viz').classList.toggle('is-dim',on);});
  $('research-grain-toggle').addEventListener('click',function(){
    var on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));$('research-grain-viz').classList.toggle('is-grain',on);
    $('research-grain-note').textContent=on?'机理示意，非本课分割结果；颜色表示类别，不是实测矿物含量。':'输出粒度示意：整盘只给一个标签，会省略混合样品中的类别差异。';reportHeight();
  });
