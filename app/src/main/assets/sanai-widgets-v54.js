/* Read-only widget snapshot; source of truth remains original WebView storage. */
(()=>{
'use strict';
let last='', scheduled=false;
function snapshot(){
 const day=dateNow(), todays=sessions.filter(s=>s.date===day);
 const current=draft?.date===day?draft:null;
 const sets=current?.exercises?.flatMap(e=>e.sets)||[];
 const sums=nTotals(nutrition.logs.filter(x=>x.date===day));
 let timer={mode:'idle',remaining:90000,end:0};try{const t=JSON.parse(localStorage.getItem('sanai.rest.v1')||'null');if(t&&['idle','running','paused','done'].includes(t.mode))timer={mode:t.mode,remaining:Number(t.remaining)||0,end:Number(t.end)||0};}catch(e){}
 const dates=[...new Set(sessions.map(x=>x.date))].filter(x=>{let d=new Date(x+'T00:00:00');let now=new Date(day+'T00:00:00');return Math.abs(d-now)<32*86400000;}).sort();
 return {schema:1,date:day,nutrition:{...sums,goal:nTarget()},workout:{part:current?.part||todays.map(s=>s.part).filter(Boolean).join(' · '),total:sets.length,done:sets.filter(s=>s.reps!==null&&s.reps!==''&&Number.isFinite(Number(s.reps))&&Number(s.reps)>0).length,logged:todays.reduce((a,s)=>a+count(s),0)},days:dates,timer};
}
window.sanaiWidgetSync=()=>{try{const raw=JSON.stringify(snapshot());if(raw!==last&&window.SanaiNative?.widgetSnapshot){window.SanaiNative.widgetSnapshot(raw);last=raw;}}catch(e){console.warn('Widget snapshot',e);}};
function queue(){if(scheduled)return;scheduled=true;Promise.resolve().then(()=>{scheduled=false;window.sanaiWidgetSync();});}
const originalWrite=write;write=function(k,v){const ok=originalWrite(k,v);if(ok)queue();return ok;};
window.sanaiWidgetOpen=action=>{if(action==='nutrition'){nDate=dateNow();go('nutrition');}else if(action==='edit'){go('edit');}else if(action==='calendar'){selected=dateNow();month=selected.slice(0,7);go('calendar');}else if(action==='rest'||action==='restToggle'){const dialog=document.getElementById('restDialog');if(!dialog?.open){const b=document.querySelector('[data-rest="open"]');if(b)b.click();else{go('edit');document.querySelector('[data-rest="open"]')?.click();}}if(action==='restToggle'){document.getElementById('rest-dialog-toggle')?.click();}}queue();};
window.addEventListener('focus',queue);document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue();});window.addEventListener('pageshow',queue);setInterval(queue,60000);queue();
})();
