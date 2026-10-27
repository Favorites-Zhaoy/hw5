/* An interpretable browser kNN baseline. No dependencies, remote API or embedded predictions. */
(function (global) {
  'use strict';
  var COLOR_DIMS = 12, DIMS = 34;
  // LBP riu2, P=8, R=1: circular samples, bilinear interpolation, 10 histogram bins.
  var diagonal=Math.SQRT1_2;
  var ring=[[-diagonal,-diagonal],[0,-1],[diagonal,-diagonal],[1,0],[diagonal,diagonal],[0,1],[-diagonal,diagonal],[-1,0]];
  function uniformPattern(code){
    var ones=0,transitions=0;
    for(var i=0;i<8;i++){var bit=(code>>i)&1;ones+=bit;if(bit!==((code>>((i+1)%8))&1))transitions++;}
    return {ones:ones,transitions:transitions,bin:transitions<=2?ones:9};
  }
  var uniformBins=Array.from({length:256},function(_,code){return uniformPattern(code).bin;});
  function sampleGray(gray,width,x,y){
    var x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;
    var a=gray[y0*width+x0],b=gray[y0*width+x0+1],c=gray[(y0+1)*width+x0],d=gray[(y0+1)*width+x0+1];
    // Integer coordinates need no second row/column (including the last valid pixel).
    if(!tx&&!ty)return a;
    if(!tx)return a+(c-a)*ty;
    if(!ty)return a+(b-a)*tx;
    var top=a+(b-a)*tx,bottom=c+(d-c)*tx;return top+(bottom-top)*ty;
  }
  function localPattern(gray,width,x,y){
    var center=gray[y*width+x],code=0;
    var samples=ring.map(function(offset,i){var value=sampleGray(gray,width,x+offset[0],y+offset[1]);if(value>=center)code|=1<<i;return value;});
    var info=uniformPattern(code);return {center:center,samples:samples,code:code,ones:info.ones,transitions:info.transitions,bin:info.bin};
  }
  function extract(rgba, width, height) {
    if (!rgba || rgba.length !== width * height * 4 || width < 3 || height < 3) throw new Error('图像尺寸或像素数据无效');
    var n = width * height, gray = new Float64Array(n), color = new Array(12).fill(0);
    var lbp = new Array(10).fill(0), gradients = new Array(8).fill(0), sum = 0, sum2 = 0;
    for (var i = 0; i < n; i++) {
      var r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
      color[Math.min(3, r >> 6)]++; color[4 + Math.min(3, g >> 6)]++; color[8 + Math.min(3, b >> 6)]++;
      var value = .299 * r + .587 * g + .114 * b;
      gray[i] = value; sum += value; sum2 += value * value;
    }
    var count = 0, edgeSum = 0, lapSum = 0, lapSum2 = 0, edgeCount = 0;
    for (var y = 1; y < height - 1; y++) for (var x = 1; x < width - 1; x++) {
      var at = y * width + x, code = 0;
      for(var bit=0;bit<8;bit++)if(sampleGray(gray,width,x+ring[bit][0],y+ring[bit][1])>=gray[at])code|=1<<bit;
      lbp[uniformBins[code]]++;
      var dx = gray[at + 1] - gray[at - 1], dy = gray[at + width] - gray[at - width];
      var magnitude = Math.sqrt(dx * dx + dy * dy);
      var direction = Math.min(7, Math.floor((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI) * 8));
      gradients[direction] += magnitude; edgeSum += magnitude;
      if (magnitude > 28) edgeCount++;
      var lap = gray[at - 1] + gray[at + 1] + gray[at - width] + gray[at + width] - 4 * gray[at];
      lapSum += lap; lapSum2 += lap * lap; count++;
    }
    var mean = sum / n, deviation = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
    var lapVariance = Math.max(0, lapSum2 / count - Math.pow(lapSum / count, 2));
    var vector = color.map(function (v) { return v / n; })
      .concat(lbp.map(function (v) { return v / count; }))
      .concat(gradients.map(function (v) { return edgeSum ? v / edgeSum : 0; }))
      .concat([mean / 255, deviation / 128, edgeCount / count, Math.min(1, Math.sqrt(lapVariance) / 255)]);
    return { vector: vector, gray: gray, width: width, height: height,
      stats: { brightness: mean, contrast: deviation, edges: edgeCount / count, sharpness: lapVariance } };
  }
  function fit(references) {
    if (!references.length) throw new Error('参考库为空');
    var mean = new Array(DIMS).fill(0), scale = new Array(DIMS).fill(0);
    references.forEach(function (r) { r.features.vector.forEach(function (v, i) { mean[i] += v / references.length; }); });
    references.forEach(function (r) { r.features.vector.forEach(function (v, i) { scale[i] += Math.pow(v - mean[i], 2) / references.length; }); });
    return { mean: mean, scale: scale.map(function (v) { return Math.max(.01, Math.sqrt(v)); }) };
  }
  function distance(a, b, colorWeight, scaler) {
    var color = 0, texture = 0;
    for (var i = 0; i < DIMS; i++) {
      var delta = (a[i] - b[i]) / scaler.scale[i];
      if (i < COLOR_DIMS) color += delta * delta / COLOR_DIMS;
      else texture += delta * delta / (DIMS - COLOR_DIMS);
    }
    return Math.sqrt(colorWeight * color + (1 - colorWeight) * texture);
  }
  function predict(features, references, options, scaler) {
    options = options || {}; scaler = scaler || fit(references);
    var k = Math.max(1, Math.min(references.length, Math.round(options.k || 5)));
    var weight = options.colorWeight == null ? .5 : Math.max(0, Math.min(1, Number(options.colorWeight)));
    var neighbors = references.map(function (sample) { return { id: sample.id, classId: sample.classId,
      distance: distance(features.vector, sample.features.vector, weight, scaler) }; })
      .sort(function (a, b) { return a.distance - b.distance || a.id.localeCompare(b.id); }).slice(0, k);
    var votes = {}, sums = {};
    neighbors.forEach(function (n) { votes[n.classId] = (votes[n.classId] || 0) + 1; sums[n.classId] = (sums[n.classId] || 0) + n.distance; });
    var order = Object.keys(votes).sort(function (a, b) { return votes[b] - votes[a] || sums[a] / votes[a] - sums[b] / votes[b] || a.localeCompare(b); });
    return { classId: order[0], share: votes[order[0]] / k, votes: votes, neighbors: neighbors, k: k };
  }
  function explainDistance(a, b, colorWeight, scaler) {
    var color = 0, other = 0;
    var rows = a.map(function(value, i) {
      var delta = (value - b[i]) / scaler.scale[i];
      var contribution = delta * delta / (i < COLOR_DIMS ? COLOR_DIMS : DIMS - COLOR_DIMS);
      if (i < COLOR_DIMS) color += contribution; else other += contribution;
      return {index:i,query:value,reference:b[i],scale:scaler.scale[i],delta:delta,contribution:contribution};
    });
    return {rows:rows,color:color,other:other,colorPart:colorWeight*color,otherPart:(1-colorWeight)*other,
      distance:distance(a,b,colorWeight,scaler)};
  }
  function summarize(predictions,classes) {
    var matrix = classes.map(function () { return classes.map(function () { return 0; }); });
    var hit = 0;
    predictions.forEach(function (sample) {
      var truth = classes.indexOf(sample.truth), predicted = classes.indexOf(sample.result.classId);
      if (truth < 0 || predicted < 0) throw new Error('类别不在评价范围内');
      matrix[truth][predicted]++; if (truth === predicted) hit++;
    });
    var perClass = classes.map(function (id, i) {
      var tp = matrix[i][i], actual = matrix[i].reduce(function (s, n) { return s + n; }, 0);
      var proposed = matrix.reduce(function (s, row) { return s + row[i]; }, 0);
      var precision = proposed ? tp / proposed : 0, recall = actual ? tp / actual : 0;
      return { id: id, total: actual, recall: recall, precision: precision, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0 };
    });
    return { count: predictions.length, hit: hit, accuracy: predictions.length ? hit / predictions.length : 0, matrix: matrix,
      macroF1: perClass.reduce(function (s, c) { return s + c.f1; }, 0) / classes.length,
      perClass: perClass, predictions: predictions };
  }
  function evaluate(tests,references,classes,options,scaler){
    return summarize(tests.map(function(sample){return {id:sample.id,truth:sample.classId,result:predict(sample.features,references,options,scaler)};}),classes);
  }
  function crossValidate(training,classes,options){
    var groups=Array.from(new Set(training.map(function(s){if(!s.group)throw new Error('分组交叉验证需要井段分组');return s.group;}))).sort();
    if(groups.length<2)throw new Error('分组交叉验证至少需要两个组');
    var predictions=[],folds=[];
    groups.forEach(function(group){
      var fitSamples=training.filter(function(s){return s.group!==group;}),validation=training.filter(function(s){return s.group===group;}),foldScaler=fit(fitSamples);
      folds.push({group:group,trainingIds:fitSamples.map(function(s){return s.id;}),validationIds:validation.map(function(s){return s.id;}),scale:foldScaler.scale.slice()});
      validation.forEach(function(sample){predictions.push({id:sample.id,truth:sample.classId,group:group,result:predict(sample.features,fitSamples,options,foldScaler)});});
    });
    var result=summarize(predictions,classes);result.folds=folds;result.protocol='LeaveOneGroupOut';return result;
  }
  function disturb(rgba, exposure, contrast) {
    var out = new Uint8ClampedArray(rgba.length);
    for (var i = 0; i < rgba.length; i += 4) {
      for (var c = 0; c < 3; c++) out[i + c] = (rgba[i + c] - 128) * contrast + 128 + exposure;
      out[i + 3] = rgba[i + 3];
    }
    return out;
  }
  var api = { extract: extract, localPattern:localPattern, uniformPattern:uniformPattern, fit: fit, predict: predict, explainDistance: explainDistance, evaluate: evaluate, crossValidate:crossValidate, disturb: disturb, dimensions: DIMS };
  global.M1Model = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
