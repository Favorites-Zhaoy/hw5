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
    var frozen=evaluationStage==='test',description=frozen?'阶段 2 · 已锁定 k='+lockedConfig.k+'、颜色权重='+lockedConfig.colorWeight.toFixed(1)+'，正在查看 24 张测试图。':'阶段 1 · 用 42 张训练图做分组交叉验证；每次排除待检照片所在的整个井段组。24 张测试图暂不开放。';
    $('evaluation-status').textContent=description;
    $('export-stage-note').textContent=frozen?'测试导出只包含测试样品；训练阶段记录需在锁定前另行导出。':'训练阶段的复核如需保留，请先导出本阶段；测试导出只包含测试样品。';
    $('loading-status').textContent=frozen?'当前为测试集，k 和颜色权重已锁定。':'已就绪 · 先从一张训练集照片开始；参数锁定后可查看测试照片。';
    $('flow-status').textContent=frozen?'当前为锁定测试阶段，展示测试样品的原始照片。':'当前在训练集内探索；可在示范页锁定参数并查看测试图。';
    ['k-select','color-weight','flow-k-select','flow-color-weight','reset-parameters','finalize-test'].forEach(function(id){$(id).disabled=!ready||frozen;});
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
