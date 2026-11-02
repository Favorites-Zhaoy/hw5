(function(g){'use strict';
 const pending=new Map();g.OPERATIONS_DATA={};
 function load(id){
  if(g.OPERATIONS_DATA[id])return Promise.resolve(g.OPERATIONS_DATA[id]);
  if(!g.OPERATIONS_CONTENT.some(c=>c.id===id))return Promise.reject(Error('未找到这个案例'));
  if(pending.has(id))return pending.get(id);
  const request=fetch('assets/operations/data/'+id+'.json?v=20261103-op1').then(r=>{if(!r.ok)throw Error('资料载入失败（'+r.status+'）');return r.json();}).then(data=>{if(data.id!==id||!data.records.length)throw Error('资料文件不完整');g.OPERATIONS_DATA[id]=data;return data;}).catch(e=>{pending.delete(id);throw e;});
  pending.set(id,request);return request;
 }
 g.OperationsAssets={load};
})(window);
