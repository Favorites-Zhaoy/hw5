(function(){'use strict';
 var script=document.currentScript,base;
 try{base=new URL('../../assets/vendor/ort-1.31.1/',script&&script.src?script.src:location.href).href;if(!/^https?:/.test(base))base=null;}catch(e){}
 base=base||'https://favorites-zhaoy.github.io/hw5/assets/vendor/ort-1.31.1/';
 var loading=null,sessions={};
 function runtime(){if(loading)return loading;loading=new Promise(function(resolve,reject){
  function ready(){try{window.ort.env.wasm.numThreads=1;window.ort.env.wasm.proxy=false;window.ort.env.wasm.initTimeout=30000;window.ort.env.wasm.wasmPaths=base;resolve(window.ort);}catch(e){reject(e);}}
  if(window.ort){ready();return;}var s=document.createElement('script');s.src=base+'ort.wasm.min.js';s.onload=ready;s.onerror=function(){reject(Error('推理组件未能载入，请检查静态资源连接。'));};document.head.appendChild(s);
 }).catch(function(e){loading=null;throw e;});return loading;}
 function bytes(s){var raw=atob(s),a=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return a;}
 async function session(id){var ort=await runtime();if(!sessions[id]){var model=window.PETRO_MODELS&&window.PETRO_MODELS[id];if(!model)throw Error('当前案例包没有对应模型。');sessions[id]=ort.InferenceSession.create(bytes(model.data),{executionProviders:['wasm'],graphOptimizationLevel:'all'}).catch(function(e){delete sessions[id];throw e;});}return sessions[id];}
 async function run(id,data,dims,type){var ort=await runtime(),s=await session(id),tensor=new ort.Tensor(type||'float32',data,dims),result=await s.run({input:tensor});return {values:result.output.data,dims:result.output.dims};}
 function text(note,vocab){var chars=Array.from(note).slice(0,96);if(!chars.length)throw Error('请先输入一条记录。');return {data:BigInt64Array.from(chars.map(function(c){return BigInt(vocab[c]||1);})),dims:[1,chars.length],characters:chars.length,unknown:chars.filter(function(c){return !vocab[c];}).length,truncated:Array.from(note).length>96};}
 window.PetroModelRunner={run:run,text:text,runtime:runtime,prepare:session,version:'ort-web-1.31.1'};
}());
