(function(root,factory){'use strict';var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MudLessonMath=api;}(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 function bytes(s){var raw=atob(s),a=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return a;}
 function unpack(s,n){var a=bytes(s),out=new Uint8Array(n);for(var i=0;i<n;i++)out[i]=(a[i>>3]>>(7-i%8))&1;return out;}
 function classify(records,key,n){var m=Array.from({length:n},function(){return Array(n).fill(0);}),count=0,correct=0;records.forEach(function(r){var y=Array.isArray(r.truth)?r.truth:[r.truth],p=Array.isArray(r[key])?r[key]:[r[key]];y.forEach(function(v,i){m[v][p[i]]++;count++;if(v===p[i])correct++;});});var f=m.reduce(function(sum,row,i){var col=m.reduce(function(n,r){return n+r[i];},0),total=row.reduce(function(a,b){return a+b;},0);return sum+(col+total?2*row[i]/(col+total):0);},0)/n;return {count:count,correct:correct,accuracy:correct/count,macroF1:f,matrix:m};}
 function segmentation(record,threshold){var n=4096,y=unpack(record.truth,n),roi=unpack(record.roi,n),base=unpack(record.baseline,n),p=bytes(record.probability),pred=new Uint8Array(n);for(var i=0;i<n;i++)pred[i]=roi[i]&&p[i]/255>=threshold?1:0;return {truth:y,roi:roi,baseline:base,prediction:pred,probability:p};}
 function pixelMetrics(y,p){var tp=0,fp=0,fn=0,positive=0;for(var i=0;i<y.length;i++){if(p[i]){positive++;if(y[i])tp++;else fp++;}else if(y[i])fn++;}return {tp:tp,fp:fp,fn:fn,positive:positive,iou:tp+fp+fn?tp/(tp+fp+fn):1,dice:2*tp+fp+fn?2*tp/(2*tp+fp+fn):1};}
 function imageMetrics(records,key,threshold){var tp=0,fp=0,fn=0;records.forEach(function(r){var s=segmentation(r,threshold),m=pixelMetrics(s.truth,s[key]);tp+=m.tp;fp+=m.fp;fn+=m.fn;});return {tp:tp,fp:fp,fn:fn,iou:tp+fp+fn?tp/(tp+fp+fn):1,dice:2*tp+fp+fn?2*tp/(2*tp+fp+fn):1,count:records.length};}
 function boundaries(a){var out=[];for(var i=1;i<a.length;i++)if(a[i]!==a[i-1])out.push(i);return out;}
 function boundaryMetrics(records,key,tolerance){var matched=0,predicted=0,reference=0,error=0;records.forEach(function(r){var a=boundaries(r.truth),b=boundaries(r[key]),pairs=[];reference+=a.length;predicted+=b.length;a.forEach(function(x){b.forEach(function(y){pairs.push([Math.abs(x-y),x,y]);});});pairs.sort(function(x,y){return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];});var aa=new Set(),bb=new Set();pairs.forEach(function(p){if(p[0]<=tolerance&&!aa.has(p[1])&&!bb.has(p[2])){matched++;error+=p[0];aa.add(p[1]);bb.add(p[2]);}});});return {matched:matched,predicted:predicted,reference:reference,f1:predicted+reference?2*matched/(predicted+reference):1,toleranceM:tolerance,meanErrorM:matched?error/matched:null};}
 function reportParts(r,key,labels){var f=r.facts;return [
  {title:'井段与样品描述',parts:[{text:'记录井段为 '},{text:f[0].value,fact:f[0].id},{text:'；岩性描述为 '},{text:f[3].value,fact:f[3].id},{text:'。'}]},
  {title:'气测与工况记录',parts:[{text:'全烃峰值 '},{text:f[1].value,fact:f[1].id},{text:'，钻井液密度 '},{text:f[4].value,fact:f[4].id},{text:'。'}]},
  {title:'作业摘录',parts:[{text:f[2].value,fact:f[2].id}]},
  {title:'事项候选',parts:[{text:'本条记录归为 '},{text:labels[r[key]],fact:f[2].id},{text:'。此项来自语句分类；数值与描述沿用上表。'}]}
 ];}
 return {bytes:bytes,unpack:unpack,classify:classify,segmentation:segmentation,pixelMetrics:pixelMetrics,imageMetrics:imageMetrics,boundaries:boundaries,boundaryMetrics:boundaryMetrics,reportParts:reportParts};
}));
