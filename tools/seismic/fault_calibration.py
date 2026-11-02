"""Calibrate the conventional attribute using check volume 3 only, never display/test volumes."""
import numpy as np
def calibrate(raw):
    volume=np.clip(np.fromfile(raw/'fault-seis-3.dat',dtype='<f4').reshape(128,128,128)/3,-2,2)
    truth=np.fromfile(raw/'fault-fault-3.dat',dtype='<f4').reshape(128,128,128)>.5
    positions=np.argwhere(truth);center=positions[np.argmin(((positions-[64,64,64])**2).sum(1))]
    d,y,x=np.clip(center-[4,32,32],[0,0,0],[120,64,64]);a=volume[d:d+8,y:y+64,x:x+64];b=truth[d:d+8,y:y+64,x:x+64]
    score=np.zeros_like(a);score[:,:,1:-1]=np.minimum(1,np.abs(a[:,:,2:]-a[:,:,:-2])/3)
    candidates=[]
    for threshold in np.linspace(.002,.25,125):
        pred=score>=threshold;tp=np.sum(pred&b);fp=np.sum(pred&~b);fn=np.sum(~pred&b);f1=2*tp/max(1,2*tp+fp+fn);candidates.append((float(f1),float(threshold)))
    f1,threshold=max(candidates,key=lambda x:x[0])
    return dict(threshold=round(threshold,6),checkF1=round(f1,6),volume=3,scope='One reference-centered check window, all eight slices; freeze the attribute threshold on all display windows.')
