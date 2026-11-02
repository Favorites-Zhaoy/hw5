(function(g){'use strict';
const clip=(v,a,b)=>Math.max(a,Math.min(b,v)),sum=a=>a.reduce((s,v)=>s+v,0),mean=a=>a.length?sum(a)/a.length:0;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sigmoid=x=>1/(1+Math.exp(-clip(x,-40,40))),softmax=a=>{const m=Math.max(...a),e=a.map(v=>Math.exp(v-m)),z=sum(e);return e.map(v=>v/z);};
const transform=(a,t)=>a.map(v=>t==='log'?Math.log(Math.max(v,1e-15)):t==='log1p'?Math.log1p(v):v);
function output(a,m){return a.map((v,i)=>{v=v*(m.outputScale?.[i]??1)+(m.outputMean?.[i]??0);return m.outputTransform==='exp'?Math.exp(v):m.outputTransform==='expm1'?Math.expm1(v):v;});}
function dense(a,l){return l.bias.map((b,o)=>{let v=b;for(let i=0;i<a.length;i++)v+=a[i]*l.weight[o*a.length+i];return l.activation==='relu'?Math.max(0,v):l.activation==='tanh'?Math.tanh(v):v;});}
function mlp(input,m){let a=transform(input,m.inputTransform).map((v,i)=>(v-(m.mean?.[i]??0))/(m.scale?.[i]||1));for(const l of m.layers)a=dense(a,l);return output(a,m);}
function cnn(input,m){let a=input.slice(),[C,H,W]=m.dims;
 for(const l of m.layers){if(l.type==='flatten')continue;if(l.type==='dense'){a=dense(a,l);continue;}
  const K=l.kernel,P=l.padding||0,S=l.stride||1,OH=Math.floor((H+2*P-K)/S)+1,OW=Math.floor((W+2*P-K)/S)+1,b=new Array(l.out*OH*OW);
  for(let o=0;o<l.out;o++)for(let y=0;y<OH;y++)for(let x=0;x<OW;x++){let v=l.bias[o];for(let c=0;c<C;c++)for(let ky=0;ky<K;ky++)for(let kx=0;kx<K;kx++){const yy=y*S+ky-P,xx=x*S+kx-P;if(yy>=0&&yy<H&&xx>=0&&xx<W)v+=a[(c*H+yy)*W+xx]*l.weight[((o*C+c)*K+ky)*K+kx];}b[(o*OH+y)*OW+x]=l.activation==='relu'?Math.max(0,v):v;}
  a=b;C=l.out;H=OH;W=OW;
 }return output(a,m);
}
function gru(input,m,conditioning){const H=m.hiddenSize,I=m.inputSize;let h=new Array(H).fill(0);
 for(const row of input){const x=transform(row,m.inputTransform).map((v,i)=>(v-m.mean[i])/m.scale[i]),ih=[],hh=[];for(let o=0;o<3*H;o++){let a=m.biasIH[o],b=m.biasHH[o];for(let i=0;i<I;i++)a+=m.weightIH[o*I+i]*x[i];for(let i=0;i<H;i++)b+=m.weightHH[o*H+i]*h[i];ih.push(a);hh.push(b);}h=h.map((v,i)=>{const r=sigmoid(ih[i]+hh[i]),z=sigmoid(ih[H+i]+hh[H+i]),n=Math.tanh(ih[2*H+i]+r*hh[2*H+i]);return (1-z)*n+z*v;});}
 const a=dense(h,{...m.head,activation:'linear'});if(m.conditioning&&conditioning){const q=m.conditioning,x=transform(conditioning,q.transform);for(let o=0;o<a.length;o++)for(let i=0;i<x.length;i++)a[o]+=(x[i]-q.mean[i])/q.scale[i]*q.headWeight[o*x.length+i];}return output(a,m);
}
function kernel(x,y,m){const k=m.kernel;return k.signal*Math.exp(-.5*sum(x.map((v,i)=>((v-y[i])/k.lengths[i])**2)));}
function gp(input,m){const x=input.map((v,i)=>(v-m.mean[i])/m.scale[i]),k=m.scaledX.map(y=>kernel(x,y,m)),v=m.Kinv.map(row=>sum(row.map((a,i)=>a*k[i]))),mu=sum(k.map((a,i)=>a*m.alpha[i])),variance=Math.max(0,m.kernel.signal-sum(k.map((a,i)=>a*v[i])));return {value:output([mu],m)[0],sd:Math.sqrt(variance)*(m.outputScale?.[0]??1)};}
function predict(input,m,conditioning){if(m.type==='cnn')return cnn(input,m);if(m.type==='gru')return gru(input,m,conditioning);if(m.type==='mlp')return mlp(input,m);if(m.type==='gp')return [gp(input,m).value];throw Error('尚未接入的计算类型：'+m.type);}
function mae(a,b){const p=a.map((v,i)=>v==null||b[i]==null?null:Math.abs(v-b[i])).filter(v=>v!=null&&Number.isFinite(v));return p.length?mean(p):null;}
function ellipse(points,coverage=.9,trim=.08){
 if(points.length<3)return null;let p=points.map(v=>v.slice(0,2)),center=[mean(p.map(x=>x[0])),mean(p.map(x=>x[1]))];
 const ranked=p.map(v=>({v,d:Math.hypot(v[0]-center[0],v[1]-center[1])})).sort((a,b)=>a.d-b.d);p=ranked.slice(0,Math.max(3,Math.round(p.length*(1-trim)))).map(x=>x.v);center=[mean(p.map(x=>x[0])),mean(p.map(x=>x[1]))];
 const xx=mean(p.map(v=>(v[0]-center[0])**2)),yy=mean(p.map(v=>(v[1]-center[1])**2)),xy=mean(p.map(v=>(v[0]-center[0])*(v[1]-center[1]))),theta=.5*Math.atan2(2*xy,xx-yy),a=Math.sqrt(Math.max(1e-10,(xx+yy+Math.hypot(xx-yy,2*xy))/2)),b=Math.sqrt(Math.max(1e-10,(xx+yy-Math.hypot(xx-yy,2*xy))/2)),dist=p.map(v=>{const x=v[0]-center[0],y=v[1]-center[1];return Math.hypot((x*Math.cos(theta)+y*Math.sin(theta))/a,(-x*Math.sin(theta)+y*Math.cos(theta))/b);}).sort((x,y)=>x-y),q=dist[Math.min(dist.length-1,Math.floor(coverage*dist.length))];
 return {center,a:a*q,b:b*q,theta,retained:p.length,total:points.length,coverage,trim};
}
function projectBudget(proposal,total,caps){let lo=-Math.max(...caps)*2,hi=Math.max(...caps)*2;for(let j=0;j<80;j++){const mid=(lo+hi)/2,s=sum(proposal.map((v,i)=>clip(v-mid,0,caps[i])));if(s>total)lo=mid;else hi=mid;}return proposal.map((v,i)=>clip(v-(lo+hi)/2,0,caps[i]));}
function exportRecord(c,r,s,z){return {name:c.id+'-'+r.id.replace(/[^a-z0-9_.-]/gi,'_')+'.json',mime:'application/json',text:JSON.stringify({caseId:c.caseId,record:r.id,sourceId:r.sourceId,kind:r.kind,scope:r.scope,unit:g.OPERATIONS_DATA[c.id].unit,originalInput:r.input,observations:r.display,reference:r.target,dataFile:'assets/operations/data/'+c.id+'.json',source:g.OPERATIONS_DATA[c.id].source,model:g.OPERATIONS_DATA[c.id].model.name,modelSHA256:g.OPERATIONS_DATA[c.id].modelSHA256,parameters:s,results:z,validation:g.OPERATIONS_DATA[c.id].validation},null,2)};}
g.OperationsMath={clip,sum,mean,esc,sigmoid,softmax,dense,cnn,gru,mlp,gp,predict,mae,ellipse,projectBudget,exportRecord};
})(window);
