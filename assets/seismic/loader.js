(function(g){'use strict';const loading=new Map();
function load(id){
 if(g.SEISMIC_DATA&&g.SEISMIC_DATA[id]&&g.SEISMIC_DATA[id].records)return Promise.resolve();
 if(!/^s[1-5]$/.test(id))return Promise.reject(Error('Unknown seismic case'));
 if(loading.has(id))return loading.get(id);
 const task=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/seismic/data/'+id+'.js?v=20261102-seismic2';script.onload=()=>{if(g.SEISMIC_DATA[id].records)resolve();else{loading.delete(id);script.remove();reject(Error('资料文件不完整'));}};script.onerror=()=>{loading.delete(id);script.remove();reject(Error('资料文件载入失败，请检查连接后重试'));};document.head.appendChild(script);});loading.set(id,task);return task;
}
g.SeismicAssets={load};})(window);
