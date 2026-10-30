  var networkStage=0,batchTimer=null,batchToken=0,batchIndex=0,batchPlaying=false,resultView='both';
  function correctCount(m){return m.matrix.reduce(function(n,row,i){return n+row[i];},0);}
  function methodComparisonHTML(){
    return '<div class="method-comparison-grid">'+['validation','test'].map(function(phase){var a=BASELINE.metrics[phase],b=RESULTS.metrics[phase],delta=(b.accuracy-a.accuracy)*100;return '<article><h4>'+(phase==='test'?'留出组 · 24 张':'开发组逐组验证 · 42 张')+'</h4><div class="method-bar"><span>常规颜色参照</span><i><b style="width:'+a.accuracy*100+'%"></b></i><strong>'+correctCount(a)+'/'+a.count+'</strong></div><div class="method-bar is-cnn"><span>CNN 迁移学习</span><i><b style="width:'+b.accuracy*100+'%"></b></i><strong>'+correctCount(b)+'/'+b.count+'</strong></div><p class="method-delta '+(delta<0?'is-lower':'')+'">CNN '+(delta>=0?'+':'')+delta.toFixed(1)+' 个百分点</p><small>与源标签一致的照片数；'+(phase==='test'?'本组 CNN 的精度更低。':'每个井段的结果都来自其他开发组拟合的分类层。')+'</small></article>';}).join('')+'</div><p class="fine-print">常规参照使用 12 维 RGB 直方图与最近类别中心，是计算基线，不是人工专家成绩。两种方法使用相同原图、裁切和外层分组。</p>';
  }
  function networkHTML(){
    var names=['照片输入','卷积与残差','三类分类层','岩性候选'],explain=[
      '把当前照片中心区域缩放为 224×224，并按预训练网络的规则归一化。',
      'ResNet-18 的四个残差阶段逐层组合边缘、纹理与形态，最后得到 512×7×7 的特征图；本课卷积层保持固定。',
      '平均池化形成 512 维表征，只用当前拟合组的标签训练三类线性分类层；当前被检查的井段不参与该次拟合。',
      '得到三类分类得分，取最高分作为候选。下方响应图按当前照片、当前类别的实际 Grad-CAM 计算。'
    ];
    return '<div class="cnn-stage-nav">'+names.map(function(n,i){return '<button type="button" data-network-stage="'+i+'" aria-pressed="'+(networkStage===i)+'"><b>0'+(i+1)+'</b>'+n+'</button>';}).join('')+'</div><svg class="cnn-structure" viewBox="0 0 680 150" role="img" aria-label="照片经过固定的残差网络，再由本课拟合的三类分类层得到候选"><defs><marker id="cnn-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#6f918d" stroke-width="1.5"/></marker></defs><rect x="8" y="45" width="83" height="61" rx="6" fill="#e9d8ba"/><text x="24" y="73">RGB 照片</text><text x="19" y="94">224×224</text><path d="M96 76H122M419 76H451M551 76H582" stroke="#6f918d" stroke-width="2" marker-end="url(#cnn-arrow)"/><rect x="132" y="25" width="276" height="100" rx="9" fill="#e5ede8" stroke="#adbdaf"/><text x="145" y="46">固定 ResNet-18 · 4 个残差阶段</text>'+[0,1,2,3].map(function(i){return '<rect x="'+(151+i*59)+'" y="60" width="45" height="45" rx="4" fill="'+['#a5c0b2','#8aafa4','#6c9994','#527e80'][i]+'"/><text x="'+(158+i*59)+'" y="88" fill="#fff">'+[64,128,256,512][i]+'</text>';}).join('')+'<path d="M153 56V14H193V56" fill="none" stroke="#b48751" stroke-width="1.5"/><text x="217" y="13">阶段内的残差跳接 · 示意</text><rect x="462" y="45" width="80" height="61" rx="6" fill="#e5d5bb"/><text x="477" y="72">分类层</text><text x="474" y="93">本课拟合</text><rect x="592" y="45" width="80" height="61" rx="6" fill="#d7e5d9"/><text x="605" y="73">三类得分</text><text x="605" y="94">岩性候选</text></svg><p class="network-reading">'+explain[networkStage]+'</p>';
  }
  function renderTerminology(){
    $('glossary-table-body').innerHTML=TEACHING.terms.map(function(t){return '<tr><th scope="row">'+esc(t[0])+'</th><td>'+esc(t[1])+'</td><td>'+esc(t[2])+'</td></tr>';}).join('');
  }
  function stopBatchPlayback(){batchToken++;if(batchTimer&&window.clearTimeout)window.clearTimeout(batchTimer);batchTimer=null;}
  function updateBatchDisplay(){
    var pool=phaseSamples(),shown=pool.slice(0,batchIndex),at=pool.findIndex(function(s){return s.id===currentId;}),start=Math.min(Math.max(0,at-2),Math.max(0,pool.length-6)),recent=batchPlaying?shown.slice(-6):pool.slice(start,start+6);
    $('ordinary-photo-grid').innerHTML=(recent.length?recent:pool.slice(0,6)).map(function(s){return '<button type="button" data-batch-pick="'+s.id+'"><img src="'+s.image+'" alt="源井深 '+s.depth+' 米的岩屑原图"><span>'+s.depth+' m</span><small>原记录 '+s.label+'</small></button>';}).join('');
    $('batch-count').textContent=batchIndex+' / '+pool.length+' 张';$('batch-progress').style.width=batchIndex/pool.length*100+'%';
    $('batch-output').innerHTML=recent.length?recent.map(function(s){var r=RESULTS.samples[s.id];return '<button type="button" data-batch-pick="'+s.id+'"><span>'+s.depth+' m</span><b style="--rock:'+byClass[r.prediction].color+'">'+className(r.prediction)+'</b><small>'+pct(Math.max.apply(null,r.scores))+'</small></button>';}).join(''):'<p class="fine-print">点击播放，查看本批结果逐条形成。</p>';
    $('batch-state').textContent=batchIndex===pool.length?'固定实验结果：本批候选与分类得分已按井深整理完成。':'固定实验结果回放；不把播放时间当作模型推理耗时。';
  }
  function renderDemoComparison(){
    stopBatchPlayback();var pool=phaseSamples();batchIndex=pool.length;batchPlaying=false;
    $('result-batch-note').textContent='同一批输入：'+pool.length+' 张照片、源井深与原始标签。';
    $('result-comparison').dataset.resultView=resultView;
    $('comparison-benchmarks').innerHTML=methodComparisonHTML();updateBatchDisplay();
  }
  $('play-batch').addEventListener('click',function(){
    stopBatchPlayback();var token=batchToken,total=phaseSamples().length;batchPlaying=true;batchIndex=0;updateBatchDisplay();
    function tick(){if(token!==batchToken)return;batchIndex=motionPaused?total:Math.min(total,batchIndex+1);updateBatchDisplay();if(batchIndex<total)batchTimer=window.setTimeout(tick,70);}
    tick();
  });
  $('result-comparison').addEventListener('click',function(event){var viewButton=event.target.closest('button[data-result-view]');if(viewButton){resultView=viewButton.dataset.resultView;$('result-comparison').dataset.resultView=resultView;Array.prototype.forEach.call(document.querySelectorAll('button[data-result-view]'),function(b){b.setAttribute('aria-pressed',String(b.dataset.resultView===resultView));});return;}var sample=event.target.closest('[data-batch-pick]');if(sample)selectSample(sample.dataset.batchPick,true);});
