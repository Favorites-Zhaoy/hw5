  // All illustrations below use the same selected sample's original pixels and computed features.
  var flowColorBin=0, flowPixelX=48, flowPixelY=48, flowReferenceId=null;
  function flowCanvas(selector, mode) {
    var source=computed[currentId],canvas=document.createElement('canvas');
    canvas.width=cropSize;canvas.height=cropSize;canvas.className='technical-canvas';
    canvas.setAttribute('aria-label',mode==='gray'?'实际灰度像素':mode==='color'?'当前颜色区间的实际像素位置':'实际中心取样与96×96缩放结果');
    var context=canvas.getContext('2d'),pixels=context.createImageData(cropSize,cropSize);
    for(var i=0;i<cropSize*cropSize;i++){
      var selected=mode!=='color'||Math.min(3,source.rgba[i*4+Math.floor(flowColorBin/4)]>>6)===flowColorBin%4;
      for(var c=0;c<3;c++)pixels.data[i*4+c]=mode==='gray'?source.features.gray[i]:source.rgba[i*4+c]*(selected?1:.13);
      pixels.data[i*4+3]=255;
    }
    context.putImageData(pixels,0,0);$('flow-snapshot').querySelector(selector).appendChild(canvas);
  }
  function flowVector(features) {
    var groups=[[0,12,'颜色 / 12','#c18d6c'],[12,22,'Uniform LBP / 10','#98ac82'],[22,30,'梯度 / 8','#81a7b5'],[30,34,'统计量 / 4','#aa97bb']];
    return '<div class="technical-vector">'+groups.map(function(g){return '<div><strong>'+g[2]+'</strong><div class="technical-vector-bars">'+features.vector.slice(g[0],g[1]).map(function(v,j){return '<i style="--feature-color:'+g[3]+';height:'+Math.max(2,v*100)+'%" title="维度 '+(g[0]+j+1)+' = '+v.toFixed(4)+'"></i>';}).join('')+'</div></div>';}).join('')+'</div>';
  }
  function flowFeatureName(i) {
    return i<12?['R','G','B'][Math.floor(i/4)]+' 桶 '+(i%4):i<22?'Uniform LBP bin '+(i-12):i<30?'梯度方向 '+(i-22):['平均亮度','灰度对比度','边缘比例','清晰度'][i-30];
  }
  function renderWorkflow() {
    var d=flowText[workflowStep];$('flow-kicker').textContent='STEP 0'+(workflowStep+1)+' / '+d.role;
    $('flow-title').textContent=d.name;$('flow-subtitle').textContent=d.title;$('flow-input').textContent=d.input;$('flow-copy').textContent=d.process;
    $('flow-why').textContent=d.why;$('flow-output').textContent=d.output;$('flow-trap').textContent=d.trap;$('flow-count').textContent=(workflowStep+1)+' / '+flowText.length;
    Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(button){var n=Number(button.dataset.step),active=n===workflowStep;button.classList.toggle('is-selected',active);button.classList.toggle('is-complete',n<workflowStep);button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-current',active?'step':'false');});
    var snapshot=$('flow-snapshot');
    if(ready){
      var activeSample=byId[currentId];$('flow-sample-image').src=activeSample.image;$('flow-sample-select').value=currentId;
      $('flow-sample-meta').textContent=activeSample.id+' · 源井深 '+activeSample.depth+' m · 井 '+activeSample.well+' · 标签不作为分类输入';
      $('flow-k-select').value=String(config().k);$('flow-color-weight').value=String(Math.round(config().colorWeight*100));$('flow-weight-value').textContent=Math.round(config().colorWeight*100)+' / '+Math.round((1-config().colorWeight)*100);
    }
    if(workflowStep===0){
      var grouped={};DATA.samples.forEach(function(s){if(!grouped[s.group])grouped[s.group]=[];grouped[s.group].push(s);});
      var groupNames=Object.keys(grouped).sort(function(a,b){return Number(a.split('-').pop())-Number(b.split('-').pop());});
      if(!selectedDepthGroup)selectedDepthGroup=groupNames.filter(function(name){return grouped[name][0].split==='test';})[0];
      var selected=grouped[selectedDepthGroup],start=Number(selectedDepthGroup.split('-').pop());
      snapshot.innerHTML='<h4>标签留在训练参考集，测试标签留待评价。</h4><div class="technical-pools"><div><b>42 张</b><span>训练集：照片 + 已有标签<br>12个组内部交叉验证与尺度拟合</span></div><div><b>24 张</b><span>测试集：5个组留出<br>锁定参数后才开放查询与评价</span></div></div><h5>点击真实井段，检查分组去向</h5><div class="depth-group-picker">'+groupNames.map(function(name){var samples=grouped[name],begin=Number(name.split('-').pop());return '<button type="button" data-depth-group="'+name+'" class="'+samples[0].split+'" aria-pressed="'+String(name===selectedDepthGroup)+'"><b>'+begin+'—'+(begin+19)+' m</b><small>'+samples.length+' 张 / '+(samples[0].split==='test'?'测试':'训练')+'</small></button>';}).join('')+'</div><div class="group-readout"><b>'+start+'—'+(start+19)+' m · '+(selected[0].split==='test'?'整组留作测试':'整组进入训练参考集')+'</b><p>'+classes.map(function(c){return c.name+' '+selected.filter(function(s){return s.classId===c.id;}).length+' 张';}).join(' / ')+'</p></div><p class="fine-print">17 组中 5 组用于测试。同组不跨集合；蓝灰表示训练，橙色表示测试，不表示岩性。</p>';return;
    }
    if(!ready){snapshot.innerHTML='<p>正在准备实际样本与计算结果，请稍候…</p>';return;}
    var sample=byId[currentId],f=computed[currentId].features;
    var query=queryContext(),pool=query.samples,fitScale=query.scaler;var result=MODEL.predict(f,pool,config(),fitScale);
    if(workflowStep===1){
      var labels=['原始照片','中心裁切位置','96 × 96 计算结果'];
      snapshot.innerHTML='<h4>同一张照片，检查每一步输入。</h4><div class="processing-stages">'+labels.map(function(label,index){return '<button type="button" data-image-stage="'+index+'" aria-pressed="'+String(index===imageStage)+'">'+(index+1)+'. '+label+'</button>';}).join('')+'</div><div class="processing-figure">'+(imageStage<2?'<div class="processing-photo"><img src="'+sample.image+'" alt="'+esc(labels[imageStage])+'">'+(imageStage===1?'<span class="roi-outline"></span>':'')+'</div>':'')+'</div><div class="technical-readout">'+['原始 JPEG 保持不变。编号、文件名与井深不进入特征向量。','虚线框：x、y 均从原图的 14% 位置开始，宽、高各取 72%。框外像素不进入后续计算。','画面由真实中心区域缩放后的像素绘制。输出 96 × 96 × 3 个通道值，颜色与灰度分支都从这里出发。'][imageStage]+'</div><p class="fine-print">缩放统一像素尺寸，不提供毫米尺度；中心裁切只能减轻边框干扰。</p>';
      if(imageStage===2)flowCanvas('.processing-figure','rgb');
    }
    if(workflowStep===2){
      var channel=Math.floor(flowColorBin/4),bin=flowColorBin%4,value=f.vector[flowColorBin],count=Math.round(value*cropSize*cropSize);
      snapshot.innerHTML='<h4>选一个颜色桶，看它统计了哪些像素。</h4><div class="technical-image-row"><div class="flow-color-canvas"></div><div class="technical-histograms">'+['R','G','B'].map(function(name,c){return '<div><h5>'+name+' 通道 / 4 桶</h5><div class="technical-histogram">'+f.vector.slice(c*4,c*4+4).map(function(v,b){var n=c*4+b;return '<button type="button" data-color-bin="'+n+'" aria-pressed="'+String(n===flowColorBin)+'" title="'+name+' '+(b*64)+'—'+(b*64+63)+'"><i style="--channel:'+['#bd7e65','#8caa79','#84a6be'][c]+';height:'+Math.max(2,v*70)+'px"></i>'+b*64+'—'+(b*64+63)+'<small>'+pct(v)+'</small></button>';}).join('')+'</div></div>';}).join('')+'</div></div><div class="technical-readout"><b>'+['R','G','B'][channel]+' = '+bin*64+'—'+(bin*64+63)+'</b><br>'+count+' / 9,216 像素 = '+value.toFixed(4)+'。对应像素保持原色，其余像素变暗，仅用于解释计数。</div><p class="fine-print">每个通道单独统计，同一个像素在 R、G、B 各投一次计数；每个通道四桶之和为 1。显示百分比经过四舍五入。</p>';
      flowCanvas('.flow-color-canvas','color');
    }
    if(workflowStep===3){
      var at=flowPixelY*cropSize+flowPixelX,pattern=MODEL.localPattern(f.gray,cropSize,flowPixelX,flowPixelY),code=pattern.code;
      var dx=f.gray[at+1]-f.gray[at-1],dy=f.gray[at+cropSize]-f.gray[at-cropSize],angle=Math.atan2(dy,dx),direction=Math.min(7,Math.floor((angle+Math.PI)/(2*Math.PI)*8));
      var cells=[0,1,2,7,-1,3,6,5,4];
      snapshot.innerHTML='<h4>Uniform LBP（P=8，R=1）与特征拼接</h4><p class="fine-print">移动观察位置，检查真实灰度图的圆周采样与模式映射。</p><div class="technical-branches"><div><b>RGB 分支 → 12维</b>颜色直方图。</div><div><b>灰度分支 → 22维</b>Uniform LBP 10 + 梯度8 + 统计量4。</div></div><div class="technical-image-row"><div class="flow-gray-canvas"><span class="technical-pixel-marker" style="left:'+((flowPixelX+.5)/cropSize*100)+'%;top:'+((flowPixelY+.5)/cropSize*100)+'%" aria-hidden="true"></span></div><div><div class="technical-pixel-controls"><label>横坐标 x = '+flowPixelX+'<input type="range" min="1" max="94" value="'+flowPixelX+'" data-flow-pixel="x" aria-label="选择采样中心横坐标"></label><label>纵坐标 y = '+flowPixelY+'<input type="range" min="1" max="94" value="'+flowPixelY+'" data-flow-pixel="y" aria-label="选择采样中心纵坐标"></label></div><div class="technical-neighborhood">'+cells.map(function(index){var center=index===-1,value=center?pattern.center:pattern.samples[index];return '<span class="'+(center?'center':'')+'">'+value.toFixed(1)+'<small>'+(center?'中心':value>=pattern.center?'≥ 中心 → 1':'< 中心 → 0')+'</small></span>';}).join('')+'</div></div></div><div class="technical-formula">圆周采样：从左上顺时针对应bit 0…7，非整数坐标使用双线性插值。<br>二进制按bit 7…0显示：'+('00000000'+code.toString(2)).slice(-8)+'<br>循环跳变数 U = '+pattern.transitions+'；1的数量 = '+pattern.ones+'<br>U ≤ 2时映射到1的数量；否则映射到非均匀模式9 → bin '+pattern.bin+'<br>Gx = '+dx.toFixed(2)+'，Gy = '+dy.toFixed(2)+'；幅值 '+Math.sqrt(dx*dx+dy*dy).toFixed(2)+' → 梯度方向区间 '+direction+'</div><p class="fine-print">九宫格展示中心与8个圆周采样值，不是直接使用方形邻域角点；对角点距中心为1像素。滑杆松开后更新，比较采用完整精度，数值显示一位小数。对8,836个内部位置汇总10维LBP直方图。</p><h5>多特征拼接：12 + 10 + 8 + 4 = 34维</h5>'+flowVector(f)+'<p class="fine-print">LBP映射具有旋转不变性；含方向特征的整体向量不具备此保证。8维全图梯度直方图不称为完整HOG。依据：<a href="https://doi.org/10.1109/TPAMI.2002.1017623" target="_blank" rel="noopener noreferrer">Ojala et al., 2002</a>。</p>';
      flowCanvas('.flow-gray-canvas','gray');
    }
    if(workflowStep===4){
      var ranked=MODEL.predict(f,pool,{k:pool.length,colorWeight:config().colorWeight},fitScale).neighbors;
      if(!flowReferenceId||!pool.some(function(r){return r.id===flowReferenceId;}))flowReferenceId=ranked[0].id;
      var ref=pool.filter(function(r){return r.id===flowReferenceId;})[0],explain=MODEL.explainDistance(f.vector,ref.features.vector,config().colorWeight,fitScale),total=explain.colorPart+explain.otherPart;
      snapshot.innerHTML='<h4>加权距离度量 / 当前'+pool.length+'张拟合参考图</h4><div class="technical-table-scroll"><table class="technical-table"><thead><tr><th>距离排序 / 点击参考图</th><th>原标签</th><th>距离</th></tr></thead><tbody>'+ranked.map(function(n,i){return '<tr class="'+(n.id===flowReferenceId?'is-current':'')+'"><td><button type="button" data-reference-id="'+n.id+'">#'+(i+1)+' '+n.id+'</button></td><td>'+className(n.classId)+'</td><td>'+n.distance.toFixed(4)+'</td></tr>';}).join('')+'</tbody></table></div><div class="technical-comparison"><img src="'+byId[ref.id].image+'" alt="被比较的真实参考图 '+ref.id+'"><span>'+ref.id+' · '+className(ref.classId)+'<br>与上方待识别图的距离：'+explain.distance.toFixed(4)+'</span></div><div class="technical-formula">δᵢ = (查询值 − 参考值) / max(σ训练参考集,i, 0.01)<br>C = 前 12 维 δ² 的平均；T = 后 22 维 δ² 的平均<br>d = √[w × C + (1 − w) × T]<br>= √['+explain.colorPart.toFixed(4)+' + '+explain.otherPart.toFixed(4)+'] = '+explain.distance.toFixed(4)+'</div><div class="technical-distance-bars" aria-label="颜色与其余特征对平方距离的贡献"><span style="width:'+(total?explain.colorPart/total*100:0)+'%;background:#c59673"></span><span style="width:'+(total?explain.otherPart/total*100:0)+'%;background:#91a8a6"></span></div><p class="fine-print">棕色：颜色贡献；蓝灰：其余 22 维贡献。条长展示 d² 的组成；最终距离还要开方。权重 w = '+config().colorWeight.toFixed(1)+'。</p><details><summary>展开核对全部 34 维数值与尺度</summary><div class="technical-table-scroll"><table class="technical-table"><thead><tr><th>维度</th><th>查询值</th><th>参考值</th><th>尺度</th><th>δ</th></tr></thead><tbody>'+explain.rows.map(function(r){return '<tr><td>'+flowFeatureName(r.index)+'</td><td>'+r.query.toFixed(4)+'</td><td>'+r.reference.toFixed(4)+'</td><td>'+r.scale.toFixed(4)+'</td><td>'+r.delta.toFixed(4)+'</td></tr>';}).join('')+'</tbody></table></div></details><p class="fine-print">交叉验证时排除查询图整个井段组，尺度仅由该折拟合样本计算；锁定测试时才使用全部42张训练图。条形长度只解释距离数值，不表示分类特征重要性。</p>';
    }
    if(workflowStep===5){
      var contextKey=currentId+'|'+JSON.stringify(config());if(contextKey!==voteContext){voteContext=contextKey;flowVoteCount=0;}
      var count=Math.min(flowVoteCount,result.k),partial={votes:{},k:result.k};result.neighbors.slice(0,count).forEach(function(n){partial.votes[n.classId]=(partial.votes[n.classId]||0)+1;});
      snapshot.innerHTML='<h4>'+(count===result.k?'计票完成：'+className(result.classId):'已计 '+count+' / '+result.k+' 票，尚未完成')+'</h4><div class="snapshot-vote-gallery">'+result.neighbors.map(function(n,i){return '<figure class="'+(i<count?'is-counted':'')+'" style="--lith-color:'+byClass[n.classId].color+'"><img src="'+byId[n.id].image+'" alt="近邻 '+(i+1)+'，'+className(n.classId)+'"><figcaption>#'+(i+1)+' '+className(n.classId)+'<small>'+n.id+'<br>距离 '+n.distance.toFixed(4)+'</small></figcaption></figure>';}).join('')+'</div><div class="snapshot-votes">'+voteMarkup(partial)+'</div><div class="vote-controls"><button type="button" data-flow-action="vote-reset" class="quiet-button">从零计票</button><button type="button" data-flow-action="vote-next" class="quiet-button" '+(count===result.k?'disabled':'')+'>计入下一张 →</button><button type="button" data-flow-action="vote-all" class="quiet-button">查看完整投票</button></div><div class="technical-readout">'+(count===result.k?'最高票 '+result.votes[result.classId]+' / '+result.k+'，占比 '+pct(result.share)+'。这一比例不作校准概率。':'按距离顺序逐张计入原标签，完成全部 '+result.k+' 票后才输出候选。')+'</div><p class="fine-print">每张图一票。平票时比较该类近邻平均距离；仍相同时按类别 ID 排序。上方 k 与权重改变时，重新开始计票。</p>';
    }
    if(workflowStep===6){
      var reviewed=reviews[currentId];
      snapshot.innerHTML='<h4>两个出口：评价方法 / 复核样品</h4><div class="technical-exits"><section><h5>A · '+(evaluationStage==='test'?'锁定参数测试 / 24张':'训练集分组交叉验证 / 42张')+'</h5><table class="matrix" aria-label="当前评估阶段的混淆矩阵，行是已有标签，列是折外或锁定测试预测"><thead><tr><th>原标签 ↓<br>预测 →</th>'+classes.map(function(c){return '<th>'+c.name+'</th>';}).join('')+'</tr></thead><tbody>'+evaluation.matrix.map(function(row,i){return '<tr><th>'+classes[i].name+'</th>'+row.map(function(n,j){return '<td style="background:'+(i===j?'#d7e3dc':'#f1dfcb')+'">'+n+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table><div class="evaluation-stats"><div class="evaluation-stat"><span>准确率</span><strong>'+pct(evaluation.accuracy)+'</strong><small>'+evaluation.hit+' / '+evaluation.count+'</small></div><div class="evaluation-stat"><span>宏平均 F1</span><strong>'+evaluation.macroF1.toFixed(3)+'</strong><small>三个类别等权</small></div></div><p>对角线为与原标签一致，非对角线为误判。单井留出实验不能代表跨井表现。</p><details><summary>准确率与宏平均 F1 怎样算？</summary><p>准确率 = 对角线之和 / '+evaluation.count+'。逐类精确率 P = TP / 预测该类数量；召回率 R = TP / 原标签该类数量；F1 = 2PR / (P + R)，分母为零时取 0。宏平均 F1 为三类 F1 的平均。</p></details><button type="button" data-flow-action="inspect-errors" class="quiet-button">跟踪一份误判 → 回到距离计算</button></section><section><h5>B · 单样品复核 / '+sample.id+'</h5><div class="technical-record">模型候选：'+className(result.classId)+'<br>最高票：'+result.votes[result.classId]+' / '+result.k+'<br>人工意见：'+(reviewed?className(reviewed.classId):'待复核')+'<br>源井深：'+sample.depth+' m</div><p>回看第 5、6 步的真实近邻与距离，再确认或修改。保存人工意见不改变模型原始输出和左侧分数。</p><label class="mini-label">人工复核岩性<select data-flow-review aria-label="当前样品的人工复核岩性">'+classes.map(function(c){return '<option value="'+c.id+'" '+((reviewed?reviewed.classId:result.classId)===c.id?'selected':'')+'>'+c.name+'</option>';}).join('')+'</select></label><button type="button" data-flow-action="review-save" class="primary-button">保存本次复核</button><p role="status">'+(reviewed?'已保存本次会话意见。请导出 CSV 留存。':'意见保存在本次页面会话中。')+'</p><button type="button" data-flow-action="export" class="quiet-button">导出预测与复核 CSV ↓</button><p>CSV 分别保存原标签、原始成像条件下的候选、人工意见及源井深。缺失井段不补造连续地层。</p></section></div>';
    }
  }
  function changeWorkflowStep(next,focus){workflowStep=(next+flowText.length)%flowText.length;renderWorkflow();if(focus){var buttons=document.querySelectorAll('[data-step]');if(buttons[workflowStep])buttons[workflowStep].focus();}reportHeight();}
  Array.prototype.forEach.call(document.querySelectorAll('[data-step]'),function(button){button.addEventListener('click',function(){changeWorkflowStep(Number(button.dataset.step),false);});button.addEventListener('keydown',function(event){var next=Number(button.dataset.step);if(event.key==='ArrowRight')next++;else if(event.key==='ArrowLeft')next--;else if(event.key==='Home')next=0;else if(event.key==='End')next=flowText.length-1;else return;event.preventDefault();changeWorkflowStep(next,true);});});
  $('flow-prev').addEventListener('click',function(){changeWorkflowStep(workflowStep-1,false);});
  $('flow-next').addEventListener('click',function(){changeWorkflowStep(workflowStep+1,false);});
  $('flow-sample-select').addEventListener('change',function(){selectSample(this.value);renderWorkflow();reportHeight();});
  $('flow-k-select').addEventListener('change',function(){if(lockedConfig)return;$('k-select').value=this.value;drawQuery();updateEvaluation();renderWorkflow();reportHeight();});
  $('flow-color-weight').addEventListener('input',function(){if(lockedConfig)return;$('color-weight').value=this.value;$('weight-value').textContent=this.value+' / '+(100-Number(this.value));drawQuery();updateEvaluation();renderWorkflow();reportHeight();});
  $('flow-snapshot').addEventListener('change',function(event){var pixel=event.target.closest('[data-flow-pixel]');if(!pixel)return;var value=Math.max(1,Math.min(94,Number(pixel.value)||1));if(pixel.dataset.flowPixel==='x')flowPixelX=value;else flowPixelY=value;renderWorkflow();reportHeight();});
  $('flow-snapshot').addEventListener('click',function(event){
    var group=event.target.closest('[data-depth-group]');if(group){selectedDepthGroup=group.dataset.depthGroup;renderWorkflow();reportHeight();return;}
    var stage=event.target.closest('[data-image-stage]');if(stage){imageStage=Math.max(0,Math.min(2,Number(stage.dataset.imageStage)));renderWorkflow();reportHeight();return;}
    var bin=event.target.closest('[data-color-bin]');if(bin){flowColorBin=Math.max(0,Math.min(11,Number(bin.dataset.colorBin)));renderWorkflow();reportHeight();return;}
    var ref=event.target.closest('[data-reference-id]');if(ref){if(references.some(function(r){return r.id===ref.dataset.referenceId;}))flowReferenceId=ref.dataset.referenceId;renderWorkflow();reportHeight();return;}
    var action=event.target.closest('[data-flow-action]');if(!action||!ready)return;
    var query=queryContext();var result=MODEL.predict(computed[currentId].features,query.samples,config(),query.scaler);
    if(action.dataset.flowAction==='vote-reset')flowVoteCount=0;
    if(action.dataset.flowAction==='vote-next')flowVoteCount=Math.min(result.k,flowVoteCount+1);
    if(action.dataset.flowAction==='vote-all')flowVoteCount=result.k;
    if(action.dataset.flowAction==='review-save'){var value=$('flow-snapshot').querySelector('[data-flow-review]').value;if(ids.indexOf(value)>=0){reviews[currentId]={classId:value,time:new Date().toISOString(),modelAtReview:result.classId,k:config().k,colorWeight:config().colorWeight,exposure:0,contrast:1};renderDepth();}}
    if(action.dataset.flowAction==='export')$('export-csv').click();
    if(action.dataset.flowAction==='inspect-errors'){var wrong=evaluation.predictions.filter(function(p){return p.truth!==p.result.classId;})[0];if(wrong){selectSample(wrong.id);flowReferenceId=null;changeWorkflowStep(4,false);}else{$('flow-status').textContent='当前参数下没有与已有标签不一致的评估样本。';}return;}
    renderWorkflow();reportHeight();
  });
