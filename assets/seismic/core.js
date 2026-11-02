(function(g){'use strict';
const cache=new Map(),clip=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function forward(input,dims,layers){
 let a=Float32Array.from(input),channels=input.length/(dims[0]*dims[1]*dims[2]);
 const [D,H,W]=dims,N=D*H*W;
 for(const layer of layers){
  const [KD,KH,KW]=layer.kernel,PD=KD>>1,PH=KH>>1,PW=KW>>1,out=new Float32Array(layer.out*N),weight=layer.weight;
  for(let o=0;o<layer.out;o++)for(let d=0;d<D;d++)for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   let sum=layer.bias[o],wi=o*channels*KD*KH*KW;
   for(let c=0;c<channels;c++)for(let kd=0;kd<KD;kd++)for(let ky=0;ky<KH;ky++)for(let kx=0;kx<KW;kx++,wi++){
    const dd=d+kd-PD,yy=y+ky-PH,xx=x+kx-PW;
    if(dd>=0&&dd<D&&yy>=0&&yy<H&&xx>=0&&xx<W)sum+=a[c*N+(dd*H+yy)*W+xx]*weight[wi];
   }
   out[o*N+(d*H+y)*W+x]=layer.activation==='relu'?Math.max(0,sum):sum;
  }
  a=out;channels=layer.out;
 }
 return a;
}
function sigmoid(v){return 1/(1+Math.exp(-clip(v,-35,35)));}
function memo(key,create){if(!cache.has(key))cache.set(key,create());return cache.get(key);}
function binary(mask,truth){let tp=0,fp=0,fn=0;mask.forEach((v,i)=>{if(v&&truth[i])tp++;else if(v)fp++;else if(truth[i])fn++;});return {tp,fp,fn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null,f1:2*tp+fp+fn?2*tp/(2*tp+fp+fn):null};}
function mean(a){return a.length?a.reduce((s,v)=>s+v,0)/a.length:0;}
function mae(a,b){const pairs=a.map((v,i)=>v==null||b[i]==null?null:Math.abs(v-b[i])).filter(v=>v!=null);return pairs.length?mean(pairs):null;}
function fault(r,s){
 const scores=memo('s1:'+r.id,()=>Array.from(forward(r.volume,[r.d,r.h,r.w],g.SEISMIC_MODELS.s1.layers),sigmoid));
 const size=r.w*r.h,start=s.slice*size,signal=r.volume.slice(start,start+size),truth=r.truth.slice(start,start+size),score=scores.slice(start,start+size);
 const baseline=signal.map((v,i)=>{const x=i%r.w;return x>0&&x<r.w-1?Math.min(1,Math.abs(signal[i+1]-signal[i-1])/3):0;}),pred=score.map(v=>v>=s.threshold),base=baseline.map(v=>v>=g.SEISMIC_MODELS.s1.attributeCalibration.threshold);
 return {signal,truth,scores:score,pred,baseline:base,metrics:binary(pred,truth),baseMetrics:binary(base,truth)};
}
function facies(r,s){
 const result=memo('s2:'+r.id,()=>{
  const position=r.signal.map((v,i)=>Math.floor(i/r.w)/(r.h-1)),logits=forward(r.signal.concat(position),[1,r.h,r.w],g.SEISMIC_MODELS.s2.layers),N=r.signal.length,C=g.SEISMIC_MODELS.s2.classes,pred=[],confidence=[],probabilities=[];
  for(let i=0;i<N;i++){const vals=Array.from({length:C},(_,c)=>logits[c*N+i]),mx=Math.max(...vals),exp=vals.map(v=>Math.exp(v-mx)),sum=mean(exp)*C,p=exp.map(v=>v/sum);pred.push(p.indexOf(Math.max(...p)));confidence.push(Math.max(...p));probabilities.push(p);}
  return {pred,confidence,probabilities};
 });
 const linear=g.SEISMIC_MODELS.s2.linear,baseline=r.signal.map((v,i)=>{const y=Math.floor(i/r.w)/(r.h-1),scores=linear.bias.map((b,k)=>b+linear.weight[k][0]*v+linear.weight[k][1]*y);return scores.indexOf(Math.max(...scores));}),keep=result.confidence.map(v=>v>=s.threshold),correct=result.pred.filter((v,i)=>v===r.truth[i]).length,accepted=keep.filter(Boolean).length;
 return {...result,baseline,keep,full:correct/r.truth.length,base:baseline.filter((v,i)=>v===r.truth[i]).length/r.truth.length,coverage:accepted/r.truth.length,acceptedAccuracy:accepted?result.pred.filter((v,i)=>keep[i]&&v===r.truth[i]).length/accepted:null};
}
function energy(trace,window){let sum=0;return trace.map((v,i)=>{sum+=v*v;if(i>=window)sum-=trace[i-window]**2;return Math.sqrt(Math.max(0,sum)/Math.min(i+1,window));});}
function neuralArrivals(r){return memo('s3:'+r.id,()=>{
 const output=[],scoreMap=new Float32Array(r.w*r.h);
 for(let x=0;x<r.w;x++){
  const trace=Array.from({length:r.h},(_,y)=>r.signal[y*r.w+x]),env=energy(trace,9),input=trace.concat(env),scores=Array.from(forward(input,[1,r.h,1],g.SEISMIC_MODELS.s3.layers),sigmoid);
  output.push(scores);scores.forEach((v,y)=>{scoreMap[y*r.w+x]=v;});
 }
 return {output,scoreMap};
});}
function timing(r,s){
 const {output,scoreMap}=neuralArrivals(r),baseline=[],pred=[],ratios=[];
 for(let x=0;x<r.w;x++){
  const trace=Array.from({length:r.h},(_,y)=>r.signal[y*r.w+x]),short=energy(trace,5),long=energy(trace,35),ratio=short.map((v,i)=>v*v/(long[i]**2+1e-8));let bp=null,mp=null;
  for(let i=35;i<r.h-2;i++){if(bp==null&&ratio[i]>=s.sta&&ratio[i+1]>=s.sta)bp=i;if(mp==null&&output[x][i]>=s.confidence&&output[x][i+1]>=s.confidence&&output[x][i+2]>=s.confidence)mp=i;}
  baseline.push(bp);pred.push(mp);ratios.push(ratio);
 }
 const complete=pred.filter(v=>v!=null).length;
 return {baseline,pred,ratios,scores:output,scoreMap,coverage:complete/r.w,baseCoverage:baseline.filter(v=>v!=null).length/r.w,error:r.reference?mae(pred,r.reference):null,baseError:r.reference?mae(baseline,r.reference):null};
}
function dense(row,model){
 let a=row.map((v,i)=>(v-model.mean[i])/model.scale[i]);
 for(const l of model.layers){const next=l.bias.map((b,o)=>b+a.reduce((sum,v,i)=>sum+v*l.weight[o*a.length+i],0));a=l.activation==='tanh'?next.map(Math.tanh):next;}
 return a[0];
}
function smooth(values,lambda,iterations=180){
 let x=values.map(v=>clip(v,0,.6));
 for(let k=0;k<iterations;k++)x=x.map((v,i)=>clip((values[i]+lambda*((i?x[i-1]:0)+(i<x.length-1?x[i+1]:0)))/(1+lambda*((i?1:0)+(i<x.length-1?1:0))),0,.6));
 return x;
}
function inverse(r,s){
 const model=g.SEISMIC_MODELS.s4,raw=memo('s4:'+r.id,()=>r.features.map(row=>dense(row,model))),baseline=r.features.map(row=>clip(model.linear.bias+row.reduce((sum,v,i)=>sum+(v-model.mean[i])/model.scale[i]*model.linear.weight[i],0),0,.6)),pred=smooth(raw,s.lambda);
 return {raw,baseline,pred,error:mae(pred,r.reference),baseError:mae(baseline,r.reference),rawError:mae(raw,r.reference),roughness:mean(pred.slice(1).map((v,i)=>(v-pred[i])**2))};
}
function blur(a,w,h){const b=new Float32Array(a.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=a[clip(y+dy,0,h-1)*w+clip(x+dx,0,w-1)]*(dx===0?2:1)*(dy===0?2:1);b[y*w+x]=sum/16;}return b;}
function snr(reference,pred){let sig=0,err=0;reference.forEach((v,i)=>{sig+=v*v;err+=(v-pred[i])**2;});return err<1e-15?Infinity:10*Math.log10(sig/err);}
function denoise(r,s){
 const state=memo('s5:'+r.id+':'+s.noise,()=>{
  const input=r.signal.map((v,i)=>v+r.unitNoise[i]*s.noise),noise=forward(input,[1,r.h,r.w],g.SEISMIC_MODELS.s5.layers);
  return {input,noise,baseline:Array.from(blur(input,r.w,r.h))};
 }),pred=state.input.map((v,i)=>v-s.strength*state.noise[i]),residual=state.input.map((v,i)=>v-pred[i]);
 return {...state,pred,residual,inputSNR:snr(r.signal,state.input),baseSNR:snr(r.signal,state.baseline),outputSNR:snr(r.signal,pred),error:mae(pred,r.signal)};
}
function compute(id,r,s){return ({s1:fault,s2:facies,s3:timing,s4:inverse,s5:denoise}[id])(r,s);}
function exportRecord(c,r,s,z){
 const meta={caseId:c.caseId,source:r.source,sourceOrigin:r.origin,record:r.id,kind:r.kind,parameters:{...s},coordinateSystem:r.coordinateSystem||'derived image pixels; not geographic coordinates',license:r.license,model:g.SEISMIC_MODELS[c.id].name,modelSHA256:g.SEISMIC_MODELS[c.id].sha256,noiseSeed:r.seed,attributeThreshold:c.id==='s1'?g.SEISMIC_MODELS.s1.attributeCalibration.threshold:undefined};delete meta.parameters.renderId;
 if(c.id==='s1'||c.id==='s2')return {name:r.id+'-candidates.json',mime:'application/json',text:JSON.stringify({...meta,width:r.w,height:r.h,prediction:Array.from(z.pred),score:c.id==='s1'?z.scores:z.confidence,reference:z.truth||r.truth},null,2)};
 if(c.id==='s5')return {name:r.id+'-denoising.json',mime:'application/json',text:JSON.stringify({...meta,width:r.w,height:r.h,reference:r.signal,input:z.input,output:z.pred,residual:z.residual},null,2)};
 const header=c.id==='s3'?['record','trace','source_sample','baseline_source_sample','reference_source_sample','sample_unit']:['record','depth_m','relative_twt_ms','reference_NPHI_vv','linear_NPHI_vv','neural_NPHI_vv','regularized_NPHI_vv'];
 const rows=c.id==='s3'?z.pred.map((v,i)=>[r.id,i+1,v==null?'':v*(r.sampleStep||1)+(r.sampleOffset||0),z.baseline[i]==null?'':z.baseline[i]*(r.sampleStep||1)+(r.sampleOffset||0),r.reference?r.reference[i]*(r.sampleStep||1)+(r.sampleOffset||0):'',r.sampleUnit||'source sample']):z.pred.map((v,i)=>[r.id,r.depth[i],r.time[i],r.reference[i],z.baseline[i],z.raw[i],v]);
 return {name:(r.well||r.id)+'.csv',mime:'text/csv;charset=utf-8',text:'\ufeff# '+JSON.stringify(meta)+'\r\n'+[header,...rows].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n')};
}
g.SeismicMath={esc,clip,forward,sigmoid,binary,facies,fault,timing,inverse,denoise,compute,smooth,exportRecord,mae,snr,energy,clearCache:()=>cache.clear()};
})(window);
