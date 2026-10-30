(function(){
  'use strict';
  var DATA=window.M1_DATA,RESULTS=window.M1_RESULTS,AUDIT=window.M1_AUDIT,BASELINE=window.M1_BASELINE;
  var TEACHING=/* M1_TEACHING_CONTENT */ {};
  var $=function(id){return document.getElementById(id);};
  var esc=function(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});};
  var classes=DATA.classes,ids=classes.map(function(c){return c.id;}),byClass={},byId={};
  classes.forEach(function(c){byClass[c.id]=c;});DATA.samples.forEach(function(s){byId[s.id]=s;});
  var className=function(id){return byClass[id]?byClass[id].name:'未标注';},pct=function(v){return (v*100).toFixed(1)+'%';};
  var currentId=DATA.samples[0].id,currentCamClass=RESULTS.samples[currentId].prediction,evaluationStage='validation';
  var workflowStep=0,view='background',motionPaused=false,ready=true,pendingRock=null,recordY={};
  var sharingReady=false,applyingShared=false,navigationPending=null;
  var flowText=/* M1_FLOW_TEXT */ [];
  var sectionQuery=new URLSearchParams(window.location.search||'');
  var frameSection=/^m1-lesson-(background|workflow|demo)$/.exec(String(window.name||''));
  var portalSection=document.body.dataset.m1Section||window.__CASE_DEMO_VIEW__||sectionQuery.get('section')||(frameSection&&frameSection[1]);
  var embedded=window.parent!==window||Boolean(window.__CASE_DEMO_VIEW__)||sectionQuery.get('embed')==='portal';
  if(embedded){document.body.classList.add('embedded');var brand=document.querySelector?document.querySelector('.wordmark'):null;if(brand){brand.removeAttribute('href');brand.setAttribute('aria-label','M1 岩屑岩性辅助识别');}}
  function reportHeight(){if(window.parent!==window)window.parent.postMessage({__m1Height:Math.ceil(document.body.getBoundingClientRect().height)},'*');}
  function setView(next,focus,scroll){
    if(embedded&&portalSection)next=portalSection;
    if(['background','workflow','demo'].indexOf(next)<0)next='background';view=next;
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'),function(b){var active=b.dataset.view===next;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus({preventScroll:true});});
    ['background','workflow','demo'].forEach(function(n){$('panel-'+n).hidden=n!==next;});
    if(next!=='demo'&&typeof stopBatchPlayback==='function')stopBatchPlayback();if(next==='workflow')renderWorkflow();if(next==='demo')renderIdentification(true);
    try{window.history.replaceState(null,'','#'+next);}catch(e){}
    if(scroll&&!embedded&&$('panel-'+next).scrollIntoView)$('panel-'+next).scrollIntoView({block:'start',behavior:'instant'});reportHeight();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-view]'),function(b,index,buttons){b.addEventListener('click',function(){setView(b.dataset.view,false,true);});b.addEventListener('keydown',function(event){var at=index;if(event.key==='ArrowRight')at=(index+1)%3;else if(event.key==='ArrowLeft')at=(index+2)%3;else if(event.key==='Home')at=0;else if(event.key==='End')at=2;else return;event.preventDefault();setView(buttons[at].dataset.view,true,true);});});
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'),function(b){b.addEventListener('click',function(){var next=b.dataset.go;if(!embedded){if(document.body.dataset.m1Section){window.location.assign({background:'background.html',workflow:'workflow.html',demo:'identify.html'}[next]);return;}setView(next,true,true);return;}var token=String(Date.now());navigationPending=token;window.parent.postMessage({__m1Navigate:next,token:token},'*');window.setTimeout(function(){if(navigationPending===token){navigationPending=null;setView(next,true,true);}},350);});});
  window.addEventListener('hashchange',function(){setView(window.location.hash.slice(1),false);});
  function applyMotion(){document.body.classList.toggle('is-paused',motionPaused);$('motion-toggle').setAttribute('aria-pressed',String(motionPaused));$('motion-toggle').textContent=motionPaused?'继续动效':'暂停动效';}
  $('motion-toggle').addEventListener('click',function(){motionPaused=!motionPaused;applyMotion();});
  var media=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');if(media&&media.matches)motionPaused=true;if(media&&media.addEventListener)media.addEventListener('change',function(){motionPaused=media.matches;applyMotion();});applyMotion();
  function updateLag() {
    var minutes = Number($('lag-minutes').value), rop = Number($('rop').value), delta = minutes * rop / 60;
    $('lag-value').textContent = minutes + ' 分钟'; $('rop-value').textContent = rop + ' m/h';
    $('source-depth').textContent = (3200 - delta).toFixed(delta % 1 ? 1 : 0) + ' m';
    $('lag-source-label').textContent = '来源示意：' + (3200 - delta).toFixed(1) + ' m';
    $('lag-marker').setAttribute('transform','translate(0,' + (-Math.min(77,delta * 1.8)).toFixed(1) + ')');
  }
  $('lag-minutes').addEventListener('input', updateLag); $('rop').addEventListener('input', updateLag); updateLag();

  function renderRockLesson(id, selectedSample) {
    var lessons={
      sandstone:{title:'细砂岩：从已有标签开始观察。',copy:'这张照片沿用公开数据中的细砂岩标签。先观察整体颜色与碎块表面，再与其他照片比较；未标定的图像不能给出原岩颗粒的定量尺度。',question:'原岩粒度与矿物组成如何确认？需要比例尺、薄片或其他实验资料。'},
      shale:{title:'页岩：碎块不一定保留完整层理。',copy:'这张照片沿用公开数据中的页岩标签。岩屑是破碎后的样品，完整岩心中可以观察的层理，在岩屑照片里可能不再完整。',question:'照片中的表面特征是否有地层意义？需要回到取样记录和其他地质资料。'},
      dolomite:{title:'灰质白云岩：外观提供候选线索。',copy:'这张照片沿用公开数据中的灰质白云岩标签。图像可以用于外观比较，但不能单独确认灰质与白云石的含量。',question:'碳酸盐组分如何确认？需要结合酸反应、显微观察或其他矿物分析。'}
    };
    if(!lessons[id])id='sandstone';
    var lesson=lessons[id],split=evaluationStage==='test'?'test':'reference';
    var sample=selectedSample||DATA.samples.filter(function(s){return s.classId===id&&s.split===split;})[0];
    $('reservoir-diagram').innerHTML='<figure class="rock-photo"><div class="rock-photo-stage"><img src="'+sample.image+'" alt="本例公开岩屑照片，原数据标签为'+esc(className(id))+'"></div><figcaption><b>原标签：'+esc(className(id))+' · '+esc(sample.id)+' · 源井深 '+sample.depth+' m</b><p class="paper-credit">本案例公开数据原图 · 井 '+esc(sample.well)+'<br><a href="https://github.com/nature9420/-ResNet-HMM-Lithology" target="_blank" rel="noopener noreferrer">查看原始数据来源 ↗</a></p><small>保留源数据标签；外观不等于矿物定量结果。</small></figcaption></figure>';
    $('rock-concept-title').textContent=lesson.title;$('rock-concept-copy').textContent=lesson.copy;$('rock-concept-question').textContent=lesson.question;
    $('rock-photo-limit').textContent='这些是本案例的真实照片；岩性名称沿用源标签，不把外部论文图当作本井样品。';
    Array.prototype.forEach.call(document.querySelectorAll('[data-rock]'),function(button){button.setAttribute('aria-pressed',String(button.dataset.rock===id));});
    reportHeight();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-rock]'),function(button){button.addEventListener('click',function(){
    var id=button.dataset.rock;pendingRock=id;
    var sample=DATA.samples.filter(function(s){return s.classId===id&&s.split===(evaluationStage==='test'?'test':'reference');})[0];
    if(ready&&sample)selectSample(sample.id);else renderRockLesson(id);
  });});
  renderRockLesson('sandstone');
  function splitMarkup() {
    return classes.map(function(c){var reference=DATA.samples.filter(function(s){return s.classId===c.id&&s.split==='reference';}).length;var test=DATA.samples.filter(function(s){return s.classId===c.id&&s.split==='test';}).length;
      return '<div class="split-row"><header><span>'+c.name+'</span><span>'+reference+' 开发 / '+test+' 留出</span></header><div class="split-track"><span class="reference" style="width:'+reference/(reference+test)*100+'%">'+reference+'</span><span class="test" style="width:'+test/(reference+test)*100+'%">'+test+'</span></div></div>';
    }).join('')+'<div class="split-legend"><span><i></i>开发用资料 42 张</span><span><i class="test"></i>留出资料 24 张</span></div>';
  }
  $('split-bars').innerHTML = splitMarkup();

  // A conceptual field route is paired with an authentic image, without implying
  // that the displayed photograph was taken in the illustrated well.
  var fieldStories=[
    {kicker:'01 / 井底破岩',title:'钻头接触的岩层，变成碎块。',copy:'钻头破岩产生岩屑；它提供了钻遇岩层的实物线索，但破碎后已不再保留完整岩心的空间关系。',note:'碎块大小不能直接当作原岩颗粒大小。'},
    {kicker:'02 / 上返取样',title:'岩屑到达地面，需要时间。',copy:'钻井液把岩屑从井底带回地面。取样时钻头通常已继续前进，样品还可能混入井壁坍落物。',note:'先核对迟到与取样记录，才能把样品对应到井深。'},
    {kicker:'03 / 观察描述',title:'人观察岩屑，照片保留外观。',copy:'录井人员观察颜色、颗粒和结构，并结合其他证据描述岩性。M1 在这里辅助比较照片，提出候选。',note:'照片能提供可见线索，不能独立确认矿物含量。'},
    {kicker:'04 / 记录对比',title:'判断回到井深，才有地层意义。',copy:'岩性描述与正确井深对应后，才能与其他井段、录井及地质资料一起对比。把照片与岩性记录按井深对应起来。',note:'岩性变化要与照片和井深一起看。'}
  ];
  function showFieldStory(index){
    var story=fieldStories[index];if(!story)return;
    $('field-story').dataset.fieldStage=String(index);
    $('field-reading-kicker').textContent=story.kicker;$('field-reading-title').textContent=story.title;
    $('field-reading-copy').textContent=story.copy;$('field-reading-note').textContent=story.note;
    Array.prototype.forEach.call(document.querySelectorAll('[data-field-step]'),function(button){button.setAttribute('aria-pressed',String(Number(button.dataset.fieldStep)===index));});
    reportHeight();
  }
  var fieldSample=DATA.samples.filter(function(sample){return sample.split==='reference';})[0];
  function showFieldSample(sample){
    $('field-sample-image').src=sample.image;
    $('field-sample-credit').textContent='本例公开原图 · '+sample.id+' · 源井深 '+sample.depth+' m · 原标签：'+className(sample.classId);
  }
  showFieldSample(fieldSample);
  Array.prototype.forEach.call(document.querySelectorAll('[data-field-step]'),function(button){button.addEventListener('click',function(){showFieldStory(Number(button.dataset.fieldStep));});});
  showFieldStory(0);

  /* M1_BACKGROUND_VISUALS */


  var imageCache={};
  function sampleImage(sample){if(!imageCache[sample.id])imageCache[sample.id]=new Promise(function(resolve,reject){var image=new Image();image.onload=function(){resolve(image);};image.onerror=function(){reject(new Error('无法读取原图 '+sample.id));};image.src=sample.image;});return imageCache[sample.id];}
  function drawSampleCanvas(target,camClass){
    var id=currentId,sample=byId[id],roi=AUDIT[id].roi;
    var canvas=document.createElement('canvas');canvas.width=224;canvas.height=224;canvas.className='prepared-canvas';canvas.setAttribute('aria-label',camClass?'岩屑照片与'+className(camClass)+'类别响应':'实际裁切范围缩放到224×224');target.innerHTML='';target.appendChild(canvas);
    sampleImage(sample).then(function(image){
      var ctx=canvas.getContext('2d');ctx.drawImage(image,roi[0],roi[1],roi[2]-roi[0],roi[3]-roi[1],0,0,224,224);
      if(camClass){var raw=atob(RESULTS.samples[id].cam),offset=ids.indexOf(camClass)*49,heat=document.createElement('canvas');heat.width=7;heat.height=7;var hc=heat.getContext('2d'),pixels=hc.createImageData(7,7);for(var n=0;n<49;n++){var t=raw.charCodeAt(offset+n)/255;pixels.data[n*4]=255;pixels.data[n*4+1]=Math.round(210*(1-t));pixels.data[n*4+2]=24;pixels.data[n*4+3]=Math.round(t*.64*255);}hc.putImageData(pixels,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(heat,0,0,224,224);}
      reportHeight();
    }).catch(function(error){target.textContent=error.message;});
  }
  function phaseSamples(){return DATA.samples.filter(function(s){return (s.split==='test')===(evaluationStage==='test');}).sort(function(a,b){return a.depth-b.depth;});}
  function selectSample(id,focus){
    if(!byId[id])return;currentId=id;evaluationStage=byId[id].split==='test'?'test':'validation';currentCamClass=RESULTS.samples[id].prediction;selectedDepthGroup=byId[id].group;
    showFieldSample(byId[id]);renderRockLesson(byId[id].classId,byId[id]);renderWorkflow();renderIdentification(Boolean(focus));publishLessonState();reportHeight();
  }
  function renderDepth(focus){
    var samples=phaseSamples(),y=34,previous=null,parts=[],chartWidth=600,photoX=64,sourceX=118,baselineX=217,resultX=316,scoreStart=416,scoreWidth=148,bandWidth=48;recordY={};
    samples.forEach(function(s,index){var gap=previous===null?0:s.depth-previous;if(index){if(gap>20){y+=68;parts.push('<g class="depth-break"><path d="M6 '+(y-34)+'l9 -5 9 5 9 -5"/><text x="52" y="'+(y-31)+'">间隔 '+gap+' m · 断轴</text></g>');}else y+=gap*10;}recordY[s.id]=y;
      var result=RESULTS.samples[s.id],different=result.prediction!==s.classId,selected=s.id===currentId;
      var label='井深 '+s.depth+' 米，原始记录 '+className(s.classId)+'，颜色参照 '+className(BASELINE.samples[s.id].prediction)+'，CNN 结果 '+className(result.prediction);
      var scoreX=scoreStart,scoreBars=result.scores.map(function(score,c){var x=scoreX;scoreX+=score*scoreWidth;return '<rect x="'+x.toFixed(2)+'" y="'+(y-6)+'" width="'+(score*scoreWidth).toFixed(2)+'" height="12" fill="'+classes[c].color+'"/>';}).join('');
      parts.push('<g class="depth-record '+(different?'is-different':'is-same')+(selected?' is-current':'')+'" data-pick="'+s.id+'" data-depth="'+s.depth+'" data-y="'+y+'" role="button" tabindex="'+(selected?'0':'-1')+'" aria-pressed="'+selected+'" aria-label="'+esc(label)+'"><title>'+esc(label)+'；'+classes.map(function(c,i){return c.name+' '+pct(result.scores[i]);}).join('，')+'</title><rect class="depth-hit" x="0" y="'+(y-10)+'" width="'+(chartWidth-4)+'" height="20"/><text class="depth-value" x="5" y="'+(y+4)+'">'+s.depth+'</text><image href="'+s.image+'" x="'+photoX+'" y="'+(y-9)+'" width="22" height="18" preserveAspectRatio="xMidYMid slice"/><rect x="'+sourceX+'" y="'+(y-5)+'" width="'+bandWidth+'" height="10" rx="2" fill="'+byClass[s.classId].color+'"/><rect x="'+baselineX+'" y="'+(y-5)+'" width="'+bandWidth+'" height="10" rx="2" fill="'+byClass[BASELINE.samples[s.id].prediction].color+'"/><rect x="'+resultX+'" y="'+(y-5)+'" width="'+bandWidth+'" height="10" rx="2" fill="'+byClass[result.prediction].color+'"/>'+scoreBars+(different?'<text class="record-difference" x="'+580+'" y="'+(y+5)+'">≠</text>':'')+'</g>');previous=s.depth;
    });
    var log=$('depth-log');log.innerHTML='<svg class="depth-track" viewBox="0 0 '+chartWidth+' '+(y+24)+'" role="group" aria-label="真实井深上的离散照片、原始岩性和分类结果">'+parts.join('')+'</svg>';
    if(focus&&log.clientHeight)log.scrollTop=Math.max(0,recordY[currentId]*log.clientWidth/chartWidth-log.clientHeight/2);
    var mismatch=samples.filter(function(s){return RESULTS.samples[s.id].prediction!==s.classId;}).length;
    $('depth-summary').textContent=(evaluationStage==='test'?'留出组':'开发组')+' · '+samples.length+' 张照片 · '+mismatch+' 张与原始记录不同';$('next-disagreement').disabled=mismatch===0;
  }
  function renderIdentification(focus){
    var s=byId[currentId],r=RESULTS.samples[currentId],different=r.prediction!==s.classId;
    $('sample-select').innerHTML=phaseSamples().map(function(p){return '<option value="'+p.id+'">'+p.depth+' m · '+p.id+'</option>';}).join('');$('sample-select').value=s.id;
    $('phase-validation').setAttribute('aria-pressed',String(evaluationStage==='validation'));$('phase-test').setAttribute('aria-pressed',String(evaluationStage==='test'));
    $('evaluation-sample-badge').textContent=(evaluationStage==='test'?'留出组':'开发组')+' / 井 '+s.well;
    $('query-image').src=s.image;$('query-id').textContent=s.id;$('query-depth').textContent='源井深 '+s.depth+' m';$('prediction').textContent=className(r.prediction);$('original-label').textContent=className(s.classId);$('baseline-label').textContent=className(BASELINE.samples[s.id].prediction);
    $('result-state').textContent=different?'与记录不同':'与记录相同';$('result-state').classList.toggle('is-different',different);$('comparison-note').classList.toggle('is-different',different);
    $('comparison-note').textContent=different?'CNN 与原始记录不同，可沿井深对照相邻照片及颜色参照。':'识别结果与原始记录相同，可继续查看相邻井深的变化。';
    $('class-scores').innerHTML=classes.map(function(c,i){return '<button type="button" class="class-score" data-cam-class="'+c.id+'" aria-pressed="'+(currentCamClass===c.id)+'"><span>'+c.name+'</span><i><b style="width:'+r.scores[i]*100+'%;background:'+c.color+'"></b></i><strong>'+pct(r.scores[i])+'</strong></button>';}).join('');
    $('response-label').textContent=className(currentCamClass)+' / 图像响应';drawSampleCanvas($('response-image'),currentCamClass);
    $('depth-legend').innerHTML=classes.map(function(c){return '<span><i style="background:'+c.color+'"></i>'+c.name+'</span>';}).join('');
    renderDepth(focus);renderEvaluation();renderDemoComparison();
  }
  function renderEvaluation(){
    $('phase-comparison').innerHTML=['validation','test'].map(function(phase){var m=RESULTS.metrics[phase];return '<div><span>'+(phase==='test'?'留出组 · 24 张':'开发组 · 42 张')+'</span><b>'+pct(m.accuracy)+'</b><small>与原始标签一致<br>宏平均 F1 '+m.macroF1.toFixed(3)+'</small></div>';}).join('');
    var matrix=RESULTS.metrics[evaluationStage].matrix;
    $('confusion-matrix').innerHTML='<table class="matrix" aria-label="当前分组的原始记录与识别结果"><caption>当前'+(evaluationStage==='test'?'留出组':'开发组')+'：行是原始记录，列是识别结果</caption><thead><tr><th>记录 ↓ / 结果 →</th>'+classes.map(function(c){return '<th scope="col">'+c.name+'</th>';}).join('')+'</tr></thead><tbody>'+classes.map(function(c,i){return '<tr><th scope="row">'+c.name+'</th>'+classes.map(function(d,j){return '<td><button type="button" data-matrix="'+i+'-'+j+'" '+(matrix[i][j]?'':'disabled')+'>'+matrix[i][j]+'</button></td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
    $('model-provenance').textContent='固定实验版本 '+RESULTS.version+' · 权重 IMAGENET1K_V1 · 权重 SHA-256 '+RESULTS.method.weightsSha256.slice(0,16)+'…';
  }
  $('sample-select').addEventListener('change',function(){selectSample(this.value,true);});
  ['validation','test'].forEach(function(phase){$('phase-'+phase).addEventListener('click',function(){if(evaluationStage===phase)return;var s=DATA.samples.find(function(p){return (p.split==='test')===(phase==='test');});selectSample(s.id,true);});});
  $('next-disagreement').addEventListener('click',function(){var pool=phaseSamples(),start=pool.findIndex(function(s){return s.id===currentId;});for(var n=1;n<=pool.length;n++){var s=pool[(start+n)%pool.length];if(RESULTS.samples[s.id].prediction!==s.classId){selectSample(s.id,true);break;}}});
  $('highlight-differences').addEventListener('change',function(){$('depth-log').classList.toggle('highlight-differences',this.checked);});
  $('depth-log').addEventListener('click',function(event){var row=event.target.closest('[data-pick]');if(row)selectSample(row.dataset.pick,false);});
  $('depth-log').addEventListener('keydown',function(event){var pool=phaseSamples(),at=pool.findIndex(function(s){return s.id===currentId;});if(event.key==='ArrowDown')at=Math.min(pool.length-1,at+1);else if(event.key==='ArrowUp')at=Math.max(0,at-1);else if(event.key==='Home')at=0;else if(event.key==='End')at=pool.length-1;else return;event.preventDefault();selectSample(pool[at].id,true);var row=$('depth-log').querySelector('[data-pick="'+currentId+'"]');if(row&&row.focus)row.focus({preventScroll:true});});
  $('class-scores').addEventListener('click',function(event){var b=event.target.closest('[data-cam-class]');if(b&&byClass[b.dataset.camClass]){currentCamClass=b.dataset.camClass;renderIdentification(false);reportHeight();}});
  $('confusion-matrix').addEventListener('click',function(event){var b=event.target.closest('[data-matrix]');if(!b)return;var pair=b.dataset.matrix.split('-').map(Number);var found=phaseSamples().find(function(s){return s.classId===ids[pair[0]]&&RESULTS.samples[s.id].prediction===ids[pair[1]];});if(found)selectSample(found.id,true);});
  function csvCell(value){return '"'+String(value==null?'':value).replace(/"/g,'""')+'"';}
  function downloadCSV(rows,name){var blob=new Blob(['\ufeff'+rows.map(function(row){return row.map(csvCell).join(',');}).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();window.setTimeout(function(){URL.revokeObjectURL(url);},1000);}
  function exportData(){var rows=[['sample_id','well','source_depth_m','source_label','source_path','source_url','image_sha256','width_px','height_px','roi_xyxy','group_20m','split','capture_conditions','lag_correction']];DATA.samples.forEach(function(s){var a=AUDIT[s.id];rows.push([s.id,s.well,s.depth,s.label,s.sourcePath,s.sourceUrl,s.sha256,a.width,a.height,a.roi.join(':'),s.group,s.split,'not_provided','not_provided']);});downloadCSV(rows,'m1-cuttings-data-manifest.csv');}
  function exportIdentificationRecords(){var rows=[['sample_id','well','source_depth_m','source_label','color_baseline_lithology','identified_lithology','score_sandstone','score_shale','score_dolomite','experiment_phase','fit_images','excluded_group','weights_sha256','image_sha256']];phaseSamples().forEach(function(s){var r=RESULTS.samples[s.id];rows.push([s.id,s.well,s.depth,s.label,className(BASELINE.samples[s.id].prediction),className(r.prediction)].concat(r.scores,[evaluationStage,r.fitCount,r.fold==='holdout'?'':r.fold,RESULTS.method.weightsSha256,s.sha256]));});downloadCSV(rows,'m1-identification-'+evaluationStage+'.csv');}
  $('export-identification').addEventListener('click',exportIdentificationRecords);
  function publishLessonState(){if(embedded&&sharingReady&&!applyingShared)window.parent.postMessage({__m1StateUpdate:{sampleId:currentId,stage:evaluationStage}},'*');}
  window.addEventListener('message',function(event){if(event.source!==window.parent||!event.data)return;if(embedded&&['background','workflow','demo'].indexOf(event.data.__m1Section)>=0&&(!document.body.dataset.m1Section||document.body.dataset.m1Section===event.data.__m1Section)){portalSection=event.data.__m1Section;setView(portalSection,false);}
    if(embedded&&event.data.__m1ScrollToTop)window.scrollTo(0,0);if(event.data.__m1NavigationAck===navigationPending)navigationPending=null;if(Object.prototype.hasOwnProperty.call(event.data,'__m1SharedState')){sharingReady=true;var state=event.data.__m1SharedState;if(state&&byId[state.sampleId]){applyingShared=true;selectSample(state.sampleId);applyingShared=false;}else publishLessonState();}});
  $('flow-sample-select').innerHTML=DATA.samples.map(function(s){return '<option value="'+s.id+'">'+s.id+' · '+s.depth+' m</option>';}).join('');
  /* M1_TEACHING_SCRIPT */
  /* M1_WORKFLOW_SCRIPT */
  renderTerminology();
  selectSample(currentId);setView(portalSection||window.location.hash.slice(1)||'background',false);
  if(embedded)window.parent.postMessage({__m1StateRequest:true},'*');
  if(window.ResizeObserver)new window.ResizeObserver(reportHeight).observe(document.body);window.addEventListener('load',reportHeight);window.addEventListener('resize',function(){renderDepth(false);reportHeight();});
}());
