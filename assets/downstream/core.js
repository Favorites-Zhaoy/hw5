(function(g){'use strict';
// Frozen neural inference is shared with the preceding engineering themes.
const M=g.OperationsMath;
function exportRecord(c,r,s,z){const d=g.DOWNSTREAM_DATA[c.id];return {name:c.id+'-'+r.id.replace(/[^a-z0-9_.-]/gi,'_')+'.json',mime:'application/json',text:JSON.stringify({caseId:c.caseId,record:r.id,sourceId:r.sourceId,kind:r.kind,scope:r.scope,unit:d.unit,originalInput:r.input,secondaryInput:r.secondaryInput,observations:r.display,reference:r.target,secondaryReference:r.secondaryTarget,source:d.source,dataFile:'assets/downstream/data/'+c.id+'.json',model:d.model.name,modelSHA256:d.modelSHA256,modelHashes:d.modelHashes,parameters:s,results:z,validation:d.validation},null,2)};}
g.DownstreamMath={...M,exportRecord};
})(window);
