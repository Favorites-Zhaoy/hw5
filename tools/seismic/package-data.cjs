/* Split case observations so opening the home page does not fetch eight MB of samples. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'assets/seismic'),w={};
const modelsPath=path.join(dir,'models.js');
fs.writeFileSync(modelsPath,fs.readFileSync(modelsPath,'utf8').replace(/\r\n/g,'\n'));
vm.runInNewContext(fs.readFileSync(path.join(dir,'data.js'),'utf8'),{window:w});
if(!w.SEISMIC_DATA.s1.records)for(const id of ['s1','s2','s3','s4','s5'])vm.runInNewContext(fs.readFileSync(path.join(dir,'data',id+'.js'),'utf8'),{window:w});
fs.mkdirSync(path.join(dir,'data'),{recursive:true});const metadata={};
for(const [id,d] of Object.entries(w.SEISMIC_DATA)){
 metadata[id]={...d,records:undefined};
 fs.writeFileSync(path.join(dir,'data',id+'.js'),'(function(g){g.SEISMIC_DATA=g.SEISMIC_DATA||{};g.SEISMIC_DATA.'+id+'='+JSON.stringify(d)+';})(window);\n');
}
fs.writeFileSync(path.join(dir,'data.js'),'(function(g){g.SEISMIC_DATA='+JSON.stringify(metadata)+';})(window);\n');
const auditPath=path.join(dir,'provenance.json'),audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
if(!audit.generatorJSONSHA256)audit.generatorJSONSHA256=audit.dataSHA256;
audit.dataSHA256=crypto.createHash('sha256').update(JSON.stringify(w.SEISMIC_DATA)).digest('hex');
audit.assetIntegrity={};
for(const name of ['data.js','models.js',...Object.keys(w.SEISMIC_DATA).map(id=>'data/'+id+'.js')]){
 const bytes=fs.readFileSync(path.join(dir,name));audit.assetIntegrity[name]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
}
fs.writeFileSync(auditPath,JSON.stringify(audit,null,2)+'\n');
console.log('Five case payloads; shared metadata',fs.statSync(path.join(dir,'data.js')).size,'bytes.');
