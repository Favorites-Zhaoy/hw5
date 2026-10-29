  // Hyperparameters are explored using training-only grouped CV, then frozen for the holdout.
  function activeSamples(){return evaluationStage==='test'?tests:references;}
  function queryContext(){
    if(evaluationStage==='test')return {samples:references,scaler:scaler};
    return foldContexts[byId[currentId].group];
  }
  function populateSampleChoices(){
    $('sample-select').innerHTML=activeSamples().map(function(s){return '<option value="'+s.id+'">'+s.id+' · '+byId[s.id].depth+' m</option>';}).join('');
    $('flow-sample-select').innerHTML=$('sample-select').innerHTML;
  }
  function syncEvaluationControls(){
    var frozen=evaluationStage==='test',description=frozen?'阶段 2 · 锁定测试：k='+lockedConfig.k+'，颜色权重='+lockedConfig.colorWeight.toFixed(1)+'；24 张测试图仅按此配置评价。':'阶段 1 · 参数探索：仅在42张训练图的12个井段组内部执行 Leave-One-Group-Out 交叉验证；24张测试图暂不开放。';
    ['evaluation-status','flow-evaluation-status'].forEach(function(id){$(id).textContent=description;});
    $('flow-status').textContent=frozen?'当前阶段：参数已锁定，展示测试样品；图中始终使用原始成像条件。':'当前阶段：在训练集分组验证中探索参数；锁定后开放测试图。';
    ['k-select','color-weight','flow-k-select','flow-color-weight','reset-parameters','finalize-test','flow-finalize-test'].forEach(function(id){$(id).disabled=!ready||frozen;});
    $('evaluation-sample-badge').textContent=frozen?'测试集 / 参数已锁定':'训练集 / 折外查询';
    $('evaluation-title').textContent=frozen?'锁定参数测试与误差分析':'分组交叉验证与参数敏感性分析';
    $('evaluation-subtitle').textContent=frozen?'查看固定配置在24张测试图上的表现。':'在42张训练图内部检验参数，每个样品的同组图均从该折参考集排除。';
    $('query-reference-note').textContent=frozen?'仅从42张训练图组成的参考样本集中检索。':'查询训练样品时，排除其整个井段组；距离只使用该折训练样本与尺度。';
  }
  function finalizeTest(){
    if(!ready||lockedConfig)return;
    lockedConfig=config();evaluationStage='test';matrixFilter=null;exposure=0;contrast=1;
    $('exposure').value='0';$('contrast').value='100';$('exposure-value').textContent='0';$('contrast-value').textContent='1.0×';
    currentId=tests[0].id;populateSampleChoices();syncEvaluationControls();updateEvaluation();selectSample(currentId);renderWorkflow();reportHeight();
  }
  $('finalize-test').addEventListener('click',finalizeTest);
  $('flow-finalize-test').addEventListener('click',finalizeTest);
