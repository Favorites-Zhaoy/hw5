(function(g){'use strict';
 const pending=new Map();g.DOWNSTREAM_DATA={};
 function load(id){
  if(g.DOWNSTREAM_DATA[id])return Promise.resolve(g.DOWNSTREAM_DATA[id]);
  if(!g.DOWNSTREAM_CONTENT.some(c=>c.id===id))return Promise.reject(Error('未找到这个案例'));
  if(pending.has(id))return pending.get(id);
  const request=fetch('assets/downstream/data/'+id+'.json?v=20261103-ds1').then(r=>{if(!r.ok)throw Error('资料载入失败（'+r.status+'）');return r.json();}).then(data=>{if(data.id!==id||!data.records.length)throw Error('资料文件不完整');g.DOWNSTREAM_DATA[id]=data;return data;}).catch(e=>{pending.delete(id);throw e;});
  pending.set(id,request);return request;
 }
 g.DownstreamAssets={load};
})(window);
