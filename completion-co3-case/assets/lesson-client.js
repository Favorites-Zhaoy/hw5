/* Shared state transport for the three fixed HTML documents. */
(function(){
 'use strict';
 var config=window.LESSON_CONFIG,c=window.COMPLETION_CONTENT.find(function(x){return x.caseId===config.id;}),L=window.CompletionLessons;
 var part=document.body.dataset.section,key='completion-lesson:'+c.caseId,applying=false,raf=0;
 function post(message){if(window.parent!==window)window.parent.postMessage(message,'*');}
 function height(){post({__lessonHeight:Math.ceil(document.body.getBoundingClientRect().height)});}
 function queueHeight(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;height();});}
 function remember(value){try{sessionStorage.setItem(key,JSON.stringify(value));}catch(error){}}
 function publish(value){remember(value);if(!applying)post({__lessonStateUpdate:value});queueHeight();}
 function navigate(section){var value=L.sharedState(c);publish(value);if(window.parent!==window)post({__lessonNavigate:section});else location.assign({background:'background.html',workflow:'workflow.html',demo:'identify.html'}[section]+'#experiment='+encodeURIComponent(JSON.stringify(value)));}
 var initial=null;try{var match=/^#experiment=(.*)$/.exec(location.hash||'');initial=JSON.parse(match?decodeURIComponent(match[1]):sessionStorage.getItem(key)||'null');}catch(error){}
 var cleanup=L.mount(c,part,document.querySelector('main.lesson'),{hydrate:true,initialState:initial,onState:publish,navigate:navigate});
 window.addEventListener('message',function(event){if(event.source!==window.parent||!event.data)return;var d=event.data;if(d.__lessonScrollToTop||d.__m1ScrollToTop)window.scrollTo(0,0);if(Object.prototype.hasOwnProperty.call(d,'__lessonSharedState')){applying=true;L.restore(c,d.__lessonSharedState);remember(L.sharedState(c));applying=false;queueHeight();}});
 if(window.ResizeObserver)new ResizeObserver(queueHeight).observe(document.body);
 if(window.MutationObserver)new MutationObserver(queueHeight).observe(document.querySelector('main.lesson'),{subtree:true,childList:true,attributes:true});
 window.addEventListener('load',queueHeight);window.addEventListener('resize',queueHeight);document.addEventListener('toggle',queueHeight,true);
 // The document owns its section. Restoring record/parameters never changes it.
 post({__lessonSection:part});post({__lessonStateRequest:true});queueHeight();
 window.CompletionPage={caseId:c.caseId,section:part,state:L.sessions[c.id].state,snapshot:function(){return L.snapshot(c,L.sessions[c.id].state);},cleanup:cleanup};
}());
