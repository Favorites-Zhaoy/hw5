(function(root,factory){'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MudLessonViews=api;}(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});},pct=function(v){return (v*100).toFixed(1)+'%';};
 function median(a){var b=a.slice().sort(function(x,y){return x-y;}),n=b.length;return n%2?b[(n-1)/2]:(b[n/2-1]+b[n/2])/2;}
 function windowInputs(C,E,r,index){
  var causal=C.id==='m2',start=Math.max(0,index-14),end=causal?index:Math.min(r.truth.length-1,index+14),values=[],labels=causal?['全烃','C2','C3','对应泵','排量','钻速']:['钻时','钻压','转速','排量','进尺'];
  for(var j=start;j<=end;j++)values.push(causal?[Math.log1p(r.gas[j]),r.c2[j],r.c3[j],r.alignedPump[j],r.flow[j]/24,r.rop[j]/15]:[Math.log(r.drillTime[j]),r.wob[j]/85,r.rpm[j]/110,r.flow[j]/25,r.footage[j]/1000]);
  return {start:start,end:end,labels:labels,values:values,scaled:values.map(function(row){return row.map(function(v,c){return (v-E.normalization.mean[c])/E.normalization.std[c];});})};
 }
 function heatmap(C,E,r,index){
  var d=windowInputs(C,E,r,index),n=d.values.length,cell=Math.min(24,430/n),x=77,y=35,w=n*cell;
  var svg='<svg class="process-heatmap" viewBox="0 0 530 '+(d.labels.length*29+83)+'" role="img" aria-label="实际输入的多通道邻域，以训练组参数标准化后着色">';
  d.labels.forEach(function(label,c){svg+='<text x="5" y="'+(y+c*29+17)+'">'+label+'</text>';d.scaled.forEach(function(row,j){var z=Math.max(-2,Math.min(2,row[c])),a=Math.abs(z)/2,lo=z<0?[180,145,99]:[66,138,134],rgb=lo.map(function(v){return Math.round(240*(1-a)+v*a);});svg+='<rect x="'+(x+j*cell)+'" y="'+(y+c*29)+'" width="'+(cell-1)+'" height="24" rx="1" fill="rgb('+rgb.join(',')+')"><title>'+esc((C.id==='m2'?r.time[d.start+j]+' min':r.depth[d.start+j]+' m')+' · '+label+' · 标准化值 '+row[c].toFixed(3))+'</title></rect>';});});
  var left=C.id==='m2'?r.time[d.start]+' min':r.depth[d.start]+' m',right=C.id==='m2'?r.time[d.end]+' min':r.depth[d.end]+' m';
  svg+='<text x="'+x+'" y="22">'+left+'</text><text x="'+(x+w-48)+'" y="22">'+right+'</text>';
  var cursor=x+(index-d.start+.5)*cell;svg+='<path d="M'+cursor+' 28V'+(y+d.labels.length*29-3)+'" stroke="#b97544" stroke-width="1.8"/><text x="77" y="'+(y+d.labels.length*29+24)+'">低 ← 标准化后的输入 → 高 · 竖线为当前记录</text></svg>';
  return svg;
 }
 function linePlot(values,thresholds,current,title){
  var lo=0,hi=Math.max.apply(null,values.concat(thresholds))*1.15||1,x=45,y=33,w=448,h=125;
  var s='<svg class="rule-chart" viewBox="0 0 530 195" role="img" aria-label="'+esc(title)+'"><text x="10" y="19">'+esc(title)+'</text>';
  for(var g=0;g<3;g++){var yy=y+h-g*h/2;s+='<path d="M45 '+yy+'H493" stroke="#e1dfcd"/><text x="4" y="'+(yy+4)+'">'+(hi*g/2).toFixed(1)+'</text>';}
  thresholds.forEach(function(t){var yy=y+h-(t-lo)/(hi-lo)*h;s+='<path d="M45 '+yy+'H493" stroke="#b49b70" stroke-dasharray="4 4"/><text x="453" y="'+(yy-4)+'">'+t.toFixed(2)+'</text>';});
  s+='<path d="'+values.map(function(v,i){return (i?'L':'M')+(x+i*w/Math.max(1,values.length-1)).toFixed(2)+' '+(y+h-v/hi*h).toFixed(2);}).join('')+'" stroke="#9f8968" stroke-width="2.5" fill="none"/>';
  var cx=x+current*w/Math.max(1,values.length-1),cy=y+h-values[current]/hi*h;s+='<path d="M'+cx+' 29V162" stroke="#b97544" stroke-dasharray="3 3"/><circle cx="'+cx+'" cy="'+cy+'" r="5" fill="#b97544"/><text x="45" y="188">虚线：预先固定的阈值 · 圆点：当前输入</text></svg>';return s;
 }
 function scores(E,values,colors){return '<div class="process-scores">'+E.labels.map(function(label,i){return '<div><span>'+esc(label)+'</span><i><b style="width:'+values[i]*100+'%;background:'+colors[i]+'"></b></i><strong>'+pct(values[i])+'</strong></div>';}).join('')+'</div>';}
 function result(label,text,good){return '<div class="process-result '+(good?'consistent':'different')+'"><span>'+esc(label)+'</span><b>'+esc(text)+'</b></div>';}
 function tagFlow(items){return '<div class="operation-path">'+items.map(function(s){return '<span>'+esc(s)+'</span>';}).join('<i>→</i>')+'</div>';}
 function lane(label,title,inside,ai,badge,good){return '<article class="method-lane '+(ai?'ai-lane':'rule-lane')+'"><header><small>'+label+'</small><h3>'+esc(title)+'</h3>'+(badge?'<b class="lane-badge '+(good===undefined?'metric':good?'consistent':'different')+'">'+esc(badge)+'</b>':'')+'</header>'+inside+'</article>';}
 function details(C){return '<details class="algorithm-notes"><summary>展开人工做法、算法参数与比较口径</summary><p>'+esc(C.traditional)+'</p><p>'+esc(C.replacement)+'</p><p>'+esc(C.baselineDescription)+'</p><p>'+esc(C.modelReading)+'</p><p>图中的规则是可计算参照，不是人工专家成绩。输入、得分与最终候选来自本课固定实验。</p></details>';}
 function timeProcess(o){
  var C=o.C,E=o.E,r=o.r,i=o.state.pointIndex,gas=C.id==='m2',win=windowInputs(C,E,r,i),v=(gas?r.gas:r.drillTime).slice(win.start,win.end+1),thresholds=gas?[2*median(r.gas.slice(0,12))]:[4.1,6.7],p=r.scores[i],raw=p.indexOf(Math.max.apply(null,p));
  var ruleData;
  if(gas){var high=r.gas[i]>thresholds[0],pump=r.alignedPump.slice(Math.max(0,i-8),i+1).some(function(v){return v<.5;});ruleData=[['全烃',r.gas[i].toFixed(3)+' %'],['固定阈值',thresholds[0].toFixed(3)+' %'],['超过阈值',high?'是':'否'],['近8 min对应停泵',pump?'有':'无']];}
  else ruleData=[['当前钻时',r.drillTime[i].toFixed(2)+' min/m'],['第一阈值','4.10 min/m'],['第二阈值','6.70 min/m'],['规则读取','仅看钻时落入哪一档']];
  var rule=tagFlow(gas?['全烃比阈值','查停泵窗口','给类别']:['钻时比阈值','划成三档','短段过滤'])+linePlot(v,thresholds,i-win.start,gas?'全烃 / %':'钻时 / min/m')+'<dl class="rule-values">'+ruleData.map(function(row){return '<div><dt>'+esc(row[0])+'</dt><dd>'+esc(row[1])+'</dd></div>';}).join('')+'</dl>';
  var ai=tagFlow(gas?['六通道局部形态','只读当前与过去','三类得分']:['五通道邻域','前后各14 m','三类得分'])+heatmap(C,E,r,i)+'<div class="learned-operator"><b>扩张卷积</b><span>1 → 2 → 4 · 结构示意</span><i>↓</i></div>'+scores(E,p,o.colors);
  var point=gas?r.time[i]+' min · 全烃 '+r.gas[i].toFixed(3)+' %':r.depth[i]+' m · 钻压 '+r.wob[i].toFixed(1)+' kN · 转速 '+r.rpm[i].toFixed(1)+' r/min';
  return '<div class="shared-input"><div><small>同一条实际输入 · '+esc(r.id)+'</small><h3>'+esc(point)+'</h3></div><div class="source-target"><small>生成标签</small><b>'+esc(E.labels[r.truth[i]])+'</b></div></div><div class="process-point"><label>沿'+(gas?'时间':'井深')+'移动 <input id="point-range" type="range" min="0" max="'+(r.truth.length-1)+'" value="'+i+'"></label><button data-next-error>定位下一处规则差异 →</button></div><div class="method-comparison">'+lane('常规规则参照',C.baselineLabel,rule,false,E.labels[r.baseline[i]],r.baseline[i]===r.truth[i])+lane('引入深度学习',C.modelName,ai,true,E.labels[r.prediction[i]],r.prediction[i]===r.truth[i])+'</div>'+(gas?'<p class="visual-caption">输入窗口只包含当前与过去14 min。拖动选点，同时看规则阈值与CNN多通道窗口怎样变化。</p>':'<p class="visual-caption">两种方法共用4点最短段过滤。当前原始最高分为“'+esc(E.labels[raw])+'”；过滤后的最终候选为“'+esc(E.labels[r.prediction[i]])+'”。</p>')+details(C);
 }
 function imageProcess(o){
  var r=o.r,C=o.C,E=o.E,M=o.M,s=M.segmentation(r,o.state.threshold),a=M.pixelMetrics(s.truth,s.baseline),b=M.pixelMetrics(s.truth,s.prediction);
  function panel(mode,title){return '<div class="process-image"><b>'+title+'</b><canvas data-image-mode="'+mode+'" aria-label="'+title+' · '+esc(r.id)+'"></canvas></div>';}
  function counts(m){return '<div class="pixel-counts"><div><small>圈中</small><b>'+m.tp+'</b></div><div><small>多圈</small><b>'+m.fp+'</b></div><div><small>漏圈</small><b>'+m.fn+'</b></div><div><small>IoU</small><b>'+pct(m.iou)+'</b></div></div>';}
  var rule=tagFlow(['共同曝光校正','固定RGB阈值','逐像素圈定'])+'<div class="image-rule-formula"><span>R &gt; 0.40</span><span>G &gt; 0.45</span><span>R &gt; 1.25B</span></div>'+panel('mask-baseline','颜色规则掩膜')+counts(a);
  var ai=tagFlow(['同一校正图像','编码 ↔ 跳接解码','像素得分'])+'<div class="segmentation-stages">'+panel('probability','实际保存的目标得分')+panel('mask-prediction','U-Net掩膜')+'</div><div class="score-scale"><span>0 低</span><i></i><span>高 1</span></div>'+counts(b);
  return '<div class="shared-input"><div class="shared-image"><img src="'+esc(r.imageData||r.image)+'" alt="'+esc(r.id)+'合成原始输入"><div><small>同一张图 · '+esc(r.id)+'</small><h3>相同曝光校正，相同样品ROI</h3><span>64×64 RGB · 参照块估计曝光 '+r.exposureEstimate.toFixed(3)+'</span></div></div></div><div class="method-comparison">'+lane('常规规则参照','颜色逐点比较',rule,false,'IoU '+pct(a.iou))+lane('引入深度学习','U-Net联合颜色与邻域',ai,true,'IoU '+pct(b.iou))+'</div><p class="visual-caption">右侧的得分图来自实际模型输出；绿色掩膜由当前 '+o.state.threshold.toFixed(2)+' 阈值得到。圈中、多圈、漏圈均相对生成标签计算。</p>'+details(C);
 }
 function markedNote(note){var pattern=/(并没有|没有|并非|未出现|未见|未停泵|但|却|随后|之后|后|持续|短时)/g;return esc(note).replace(pattern,'<mark>$1</mark>');}
 function sentenceTokens(note){var sentence=note.replace(/^[^：]*：/,'').replace(/对应井段[\s\S]*$/,'');return sentence.split(/(并没有|没有|并非|未出现|未见|未停泵|但|却|随后|之后|持续|短时)/).filter(Boolean).map(function(token){var clue=/^(并没有|没有|并非|未出现|未见|未停泵|但|却|随后|之后|持续|短时)$/.test(token);return '<span class="'+(clue?'language-clue':'')+'">'+esc(token)+'</span>';}).join('');}
 function textProcess(o){
  var r=o.r,C=o.C,E=o.E,groups=[['接单根 / 停泵',['接单根','停泵']],['全烃升高 / 气测异常 / 气测显示',['全烃升高','气测异常','气测显示']],['钻时 / 钻速',['钻时','钻速']]],winner=-1;
  var rows=groups.map(function(group,i){var hits=group[1].filter(function(w){return r.note.indexOf(w)>=0;});if(winner<0&&hits.length)winner=i;return {hits:hits,label:group[0]};});
  var rule=tagFlow(['从上到下匹配','首个命中优先','选择模板'])+'<div class="keyword-rules">'+rows.map(function(row,i){return '<div class="'+(i===winner?'chosen':'')+'"><span>0'+(i+1)+'</span><b>'+esc(row.label)+'</b><em>'+esc(i===winner?'首先命中':row.hits.length?'后序命中':'未命中')+'</em></div>';}).join('')+'</div>';
  var ai=tagFlow(['字符编码','双向GRU','四类得分'])+'<div class="bidirectional-note"><div class="reading-arrow">前文 → → → 后文</div><div class="sentence-tokens">'+sentenceTokens(r.note)+'</div><div class="reading-arrow reverse">前文 ← ← ← 后文</div></div><p class="visual-caption">色块仅划分语句、标出否定与时间线索；不代表模型注意力权重。</p>'+scores(E,r.scores,o.colors);
  return '<div class="shared-input"><div><small>同一句原话 · '+esc(r.id)+'</small><h3 class="note-for-comparison">'+markedNote(r.note)+'</h3></div></div><div class="method-comparison">'+lane('常规规则参照','字面词命中',rule,false,E.labels[r.baseline],r.baseline===r.truth)+lane('引入深度学习','BiGRU读整句前后文',ai,true,E.labels[r.prediction],r.prediction===r.truth)+'</div><div class="report-binding"><span>两路共用原事实表</span>'+r.facts.filter(function(f){return f.key!=='原始记录';}).map(function(f){return '<button data-fact="'+esc(f.id)+'">'+esc(f.key)+'：'+esc(f.value)+'</button>';}).join('')+'<b>数值相同，事项归类可能不同</b></div><div class="inline-fact-source">'+r.facts.filter(function(f){return f.id===o.state.fact;}).map(function(f){return esc(f.id+' · '+f.value);}).join('')+'</div>'+details(C);
 }
 function process(o){return o.C.id==='m3'?imageProcess(o):o.C.id==='m5'?textProcess(o):timeProcess(o);}
 function pairData(C,E,state,M){
  if(C.id==='m5'){
   var grouped={};E.records.forEach(function(r){(grouped[r.templateId]||(grouped[r.templateId]=[])).push(r);});
   return Object.keys(grouped).map(function(id){var rows=grouped[id],label=E.labels[rows[0].truth].replace('记录',''),suffix=Number(id.split('-').at(-1))+1;return {id:rows[0].id,label:label+' '+suffix,count:rows.length,recordIds:rows.map(function(r){return r.id;}),baseline:rows.filter(function(r){return r.baseline===r.truth;}).length/rows.length,prediction:rows.filter(function(r){return r.prediction===r.truth;}).length/rows.length};});
  }
  return E.records.map(function(r){var a,b;if(C.id==='m3'){var s=M.segmentation(r,state.threshold);a=M.pixelMetrics(s.truth,s.baseline).iou;b=M.pixelMetrics(s.truth,s.prediction).iou;}else if(C.id==='m4'){a=M.boundaryMetrics([r],'baseline',state.tolerance).f1;b=M.boundaryMetrics([r],'prediction',state.tolerance).f1;}else{a=M.classify([r],'baseline',E.labels.length).macroF1;b=M.classify([r],'prediction',E.labels.length).macroF1;}return {id:r.id,label:r.id,count:Array.isArray(r.truth)?r.truth.length:4096,recordIds:[r.id],baseline:a,prediction:b};});
 }
 function pairedPlot(o){
  var data=pairData(o.C,o.E,o.state,o.M),columns=data.length>12?2:1,rows=Math.ceil(data.length/columns),width=980,height=80+rows*29,colW=width/columns;
  var metric=o.C.id==='m3'?'逐图IoU · 阈值'+o.state.threshold.toFixed(2):o.C.id==='m4'?'逐井层界F1 · ±'+o.state.tolerance+' m':o.C.id==='m5'?'逐句式组一致率':'逐井宏平均F1';
  var s='<svg class="paired-plot" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+esc(metric+'：所有留出资料逐份对照，棕色为规则，主题色为AI')+'">';
  data.forEach(function(row,i){var col=Math.floor(i/rows),line=i%rows,x=col*colW+117,w=colW-155,y=59+line*29;if(line===0){[0,.5,1].forEach(function(v){s+='<path d="M'+(x+v*w)+' 35V'+(height-8)+'" stroke="#dfdfcc" stroke-dasharray="3 4"/><text x="'+(x+v*w-8)+'" y="24">'+Math.round(v*100)+'%</text>';});}
   var selected=row.recordIds.indexOf(o.state.recordId)>=0;
   s+='<g class="pair-row '+(selected?'selected':'')+'" data-record="'+esc(row.id)+'" role="button" tabindex="0" aria-label="查看'+esc(row.label)+'"><title>'+esc(row.label+' · '+metric+' · 规则 '+pct(row.baseline)+' · AI '+pct(row.prediction))+'</title><rect x="'+(col*colW+4)+'" y="'+(y-17)+'" width="'+(colW-10)+'" height="26" rx="3" fill="'+(selected?'#e7ead8':'transparent')+'"/><text x="'+(col*colW+9)+'" y="'+(y+2)+'">'+esc(row.label)+'</text><path d="M'+(x+row.baseline*w)+' '+y+'H'+(x+row.prediction*w)+'" stroke="'+o.C.accent+'" stroke-width="2" opacity=".5"/><circle cx="'+(x+row.baseline*w)+'" cy="'+y+'" r="5" fill="#fff9eb" stroke="#ac8c62" stroke-width="2"/><circle cx="'+(x+row.prediction*w)+'" cy="'+y+'" r="3.6" fill="'+o.C.accent+'"/></g>';
  });
  return '<div class="batch-comparison"><div class="comparison-legend"><h3>'+metric+' · 每份资料一行</h3><span><i class="rule-dot"></i>常规规则</span><span><i style="background:'+o.C.accent+'"></i>AI</span></div>'+s+'</svg><p class="visual-caption">'+(o.C.id==='m5'?'16个留出句式组，每组10个数字或前缀变化；这些变化不等于10种独立句式。':'全部留出资料均列出，没有剔除较差结果。')+' 点击一行可定位该份资料。</p></div>';
 }
 function errorData(o){
  var M=o.M,E=o.E,C=o.C,state=o.state;
  if(C.id==='m3'){var a=M.imageMetrics(E.records,'baseline',state.threshold),b=M.imageMetrics(E.records,'prediction',state.threshold);return [['正确圈中 / px',a.tp,b.tp],['多圈 / px',a.fp,b.fp],['漏圈 / px',a.fn,b.fn]];}
  if(C.id==='m4'){var x=M.boundaryMetrics(E.records,'baseline',state.tolerance),y=M.boundaryMetrics(E.records,'prediction',state.tolerance);return [['匹配层界',x.matched,y.matched],['多报层界',x.predicted-x.matched,y.predicted-y.matched],['漏报层界',x.reference-x.matched,y.reference-y.matched]];}
  var p=M.classify(E.records,'baseline',E.labels.length),q=M.classify(E.records,'prediction',E.labels.length);return [['一致记录',p.correct,q.correct],['分错记录',p.count-p.correct,q.count-q.correct],['全部记录',p.count,q.count]];
 }
 function errorBars(o){return '<div class="error-bars">'+errorData(o).map(function(row){var max=Math.max(row[1],row[2],1);return '<article><h4>'+row[0]+'</h4><div><span>规则</span><i><b style="width:'+row[1]/max*100+'%;background:#b39469"></b></i><strong>'+row[1]+'</strong></div><div><span>AI</span><i><b style="width:'+row[2]/max*100+'%;background:'+o.C.accent+'"></b></i><strong>'+row[2]+'</strong></div></article>';}).join('')+'</div>';}
 return {windowInputs:windowInputs,process:process,pairData:pairData,pairedPlot:pairedPlot,errorData:errorData,errorBars:errorBars};
}));
