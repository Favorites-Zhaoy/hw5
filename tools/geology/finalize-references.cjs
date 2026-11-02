const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),file=path.join(root,'assets/geology/references.json');
const old=JSON.parse(fs.readFileSync(file,'utf8')),known=new Map(old.references.map(r=>[r.doi.toLowerCase(),r]));
const w={GeologyMath:{esc:String}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/geology/teaching.js'),'utf8'),{window:w});
const references=[];
for(const [scene,t] of Object.entries(w.GeologyTeaching.byId))for(const paper of t.papers){const previous=known.get(paper.doi.toLowerCase())||{};references.push({...previous,scene,doi:paper.doi,title:paper.title,journal:paper.journal,authors:previous.authors||paper.authors,publicationLabel:paper.date,url:paper.url||'https://doi.org/'+paper.doi,verifiedBy:previous.error?'Publisher citation record, https://www.mdpi.com/2072-4292/17/3/387':previous.verifiedBy||'Primary arXiv record, https://arxiv.org/abs/2506.16006',...(previous.error?{registryAttemptError:previous.error,error:undefined}:{}),teachingUse:{input:paper.input,method:paper.method,output:paper.output,boundary:paper.boundary}});}
fs.writeFileSync(file,JSON.stringify({checked:'2026-11-01',referenceTemplate:'https://favorites-zhaoy.github.io/hw5/?v=46320ee#/stage/mudlogging',references},null,2)+'\n');
console.log(references.length+' verified research references recorded.');
