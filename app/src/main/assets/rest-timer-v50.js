(()=>{
'use strict';
const key='sanai.rest.v1', el=id=>document.getElementById(id), dlg=el('restDialog'), hud=el('rest-hud'), input=el('rest-custom'), sound=el('rest-sound'), vibration=el('rest-vibration');
let st={mode:'idle',duration:90,remaining:90000,end:0,sound:true,vibration:true,systemNotify:false,fullAlert:true,root:0}, audio=null;
try{const old=JSON.parse(localStorage.getItem(key)||'null');if(old&&['idle','running','paused','done'].includes(old.mode)&&Number.isFinite(old.duration)&&old.duration>=5&&old.duration<=3600&&Number.isFinite(old.remaining)&&Number.isFinite(old.end))st={...st,...old,vibration:typeof old.vibration==='boolean'?old.vibration:old.sound!==false};}catch(e){}
const clamp=n=>Math.min(3600,Math.max(5,Math.round(n)||90));
const left=()=>st.mode==='running'?Math.max(0,st.end-Date.now()):st.mode==='done'?0:Math.max(0,st.remaining);
const format=ms=>{let n=Math.ceil(ms/1000);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')};
const hasNative=()=>typeof window.SanaiNative?.restArm==='function';
function nativeSync(){try{if(hasNative()){
 if(st.mode==='paused'||st.mode==='idle'){SanaiNative.cancel();}
 else if(st.mode==='running'){if(!st.root){st.root=st.end;localStorage.setItem(key,JSON.stringify(st));}SanaiNative.restArm(st.root,st.end,st.fullAlert!==false,!!st.systemNotify,!!st.sound,!!st.vibration);}
 }else if(!st.systemNotify||st.mode==='paused'||st.mode==='idle'){window.SanaiNative?.cancel();}else if(st.mode==='running'&&st.end>Date.now()){SanaiNative.schedule(st.end);}}catch(e){}}
function reconcile(){if(!hasNative()||!st.root)return false;try{const n=JSON.parse(SanaiNative.restState());if(n.root!==st.root)return false;
 if(n.end>0&&n.end!==st.end){st.mode='running';st.end=n.end;st.remaining=Math.max(0,n.end-Date.now());st.duration=Math.max(st.duration,30);input.value=st.duration;localStorage.setItem(key,JSON.stringify(st));window.sanaiWidgetSync?.();return true;}
 if(n.end===0&&n.last>0&&st.mode==='running'){st.mode='done';st.remaining=0;st.end=0;localStorage.setItem(key,JSON.stringify(st));window.sanaiWidgetSync?.();return true;}
 }catch(e){}return false;}
function save(){try{localStorage.setItem(key,JSON.stringify(st));}catch(e){}nativeSync();if(window.sanaiWidgetSync)window.sanaiWidgetSync();}
function armSound(){if(!st.sound)return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=audio||new AC();audio.resume().catch(()=>{});}catch(e){}}
const notificationSupported=()=>!!window.SanaiNative;
function paintPermission(){let granted=false,overlay=false,exact=true;try{granted=SanaiNative.notificationsEnabled();overlay=hasNative()&&SanaiNative.overlayEnabled();exact=!hasNative()||SanaiNative.exactAlarmEnabled();}catch(e){}
el('rest-system-notify').checked=!!st.systemNotify&&granted;el('rest-system-notify').disabled=!granted;el('rest-notify-enable').disabled=false;el('rest-notify-enable').textContent=granted?'알림 설정':'알림 허용';
el('rest-full-alert').checked=st.fullAlert!==false;el('rest-full-alert').disabled=!hasNative();
el('rest-overlay-enable').disabled=!hasNative();el('rest-overlay-enable').textContent=overlay?'전체화면 권한 설정':'다른 앱 위에 표시 허용';
el('rest-exact-enable').hidden=!hasNative()||exact;
el('rest-notify-status').textContent=(overlay?'채드 강림: 다른 앱 위 표시 허용됨.':'앱 안에서는 전체화면, 다른 앱 위에 표시하려면 별도 권한 허용.')+(exact?'':' 정확한 알람 권한이 없으면 백그라운드 알림이 늦을 수 있다.')+(granted?'':' 알림 권한을 허용하면 실패 시 배너로 알려준다.');}
async function enableNotification(){try{SanaiNative.notificationSettings();}catch(e){}}
async function sendSystemNotification(){/* AlarmManager handles native background notification */}
let bannerTimer=0;
function hideBanner(){const b=el('rest-strike-banner');clearTimeout(bannerTimer);try{if(typeof b.hidePopover==='function')b.hidePopover();}catch(e){}b.hidden=true;}
function showBanner(){if(document.hidden)return;const b=el('rest-strike-banner');hideBanner();b.hidden=false;try{if(typeof b.showPopover==='function')b.showPopover();else b.removeAttribute('popover');}catch(e){b.removeAttribute('popover');}bannerTimer=setTimeout(hideBanner,6500);}
const vibrationPattern=[350,150,350,150,600];
function tryVibration(){try{return typeof navigator.vibrate==='function'&&navigator.vibrate(vibrationPattern);}catch(e){return false;}}
function alertDone(){void sendSystemNotification();if(st.vibration)tryVibration();if(st.sound){try{if(audio?.state==='running'){const t=audio.currentTime;for(let i=0;i<2;i++){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=880;g.gain.setValueAtTime(.13,t+i*.23);g.gain.exponentialRampToValueAtTime(.001,t+i*.23+.19);o.connect(g);g.connect(audio.destination);o.start(t+i*.23);o.stop(t+i*.23+.2);}}}catch(e){}}showBanner();}
function paint(){const n=left(),str=format(n);const active=st.mode!=='idle';hud.hidden=!active;hud.classList.toggle('done',st.mode==='done');document.body.classList.toggle('rest-visible',active);el('rest-hud-clock').textContent=str;el('rest-clock').textContent=str;el('rest-hud-label').textContent=st.mode==='done'?'재정비 완료 · 다음 세트':st.mode==='paused'?'휴식 일시정지':'세트 간 재정비';el('rest-hud-toggle').textContent=st.mode==='running'?'일시정지':st.mode==='paused'?'재개':'다시 시작';el('rest-dialog-toggle').textContent=st.mode==='running'?'일시정지':st.mode==='paused'?'휴식 재개':st.mode==='done'?'다시 시작':'휴식 시작';el('rest-progress').style.width=Math.min(100,n/(st.duration*1000)*100)+'%';dlg.querySelectorAll('[data-rest="preset"]').forEach(b=>b.classList.toggle('on',+b.dataset.seconds===st.duration));if(active){document.body.style.setProperty('--rest-hud-height',hud.offsetHeight+'px');}document.body.style.setProperty('--rest-nav-height',(document.querySelector('.tabbar')?.offsetHeight||76)+'px');}
let lastSync=0;
function tick(){if(Date.now()-lastSync>=500){lastSync=Date.now();reconcile();}
 if(st.mode==='running'&&left()<=0){const end=st.end,root=st.root;st.mode='done';st.remaining=0;st.end=0;save();if(hasNative()){SanaiNative.restFinish(root,end);if(st.fullAlert===false&&!st.systemNotify)alertDone();}else alertDone();}paint();}
function setDuration(n){n=clamp(n);st.duration=n;st.remaining=n*1000;st.end=0;st.mode='idle';st.root=0;input.value=n;save();paint();}
function start(){if(st.mode==='idle'||st.mode==='done'){st.duration=clamp(Number(input.value));st.remaining=st.duration*1000;input.value=st.duration;}if(st.mode==='paused'&&st.remaining<=0){st.remaining=st.duration*1000;}st.mode='running';st.end=Date.now()+st.remaining;st.root=st.end;armSound();save();paint();if(dlg.open)dlg.close();}
function toggle(){if(st.mode==='running'){st.remaining=left();st.end=0;st.mode='paused';save();paint();}else start();}
function plus(){if(st.mode==='idle'||st.mode==='done'){setDuration(Math.min(3600,clamp(Number(input.value))+15));return;}let n=Math.min(3600000,left()+15000);st.remaining=n;st.duration=Math.min(3600,Math.max(st.duration,Math.ceil(n/1000)));if(st.mode==='running'){st.end=Date.now()+n;st.root=st.end;}input.value=st.duration;save();paint();}
window.sanaiRestActive=()=>st.mode==='running'||st.mode==='paused'||st.mode==='done';
input.value=st.duration;el('rest-full-alert').addEventListener('change',()=>{st.fullAlert=el('rest-full-alert').checked;save();paintPermission();});sound.checked=st.sound;vibration.checked=st.vibration;paintPermission();vibration.addEventListener('change',()=>{st.vibration=vibration.checked;save();});el('rest-system-notify').addEventListener('change',()=>{st.systemNotify=el('rest-system-notify').checked;save();paintPermission();});
input.addEventListener('change',()=>setDuration(Number(input.value)));sound.addEventListener('change',()=>{st.sound=sound.checked;armSound();save();});
document.addEventListener('click',e=>{let b=e.target.closest('[data-rest]');if(!b)return;switch(b.dataset.rest){case 'notify-enable':void enableNotification();break;case 'overlay-enable':try{SanaiNative.overlaySettings();}catch(e){}break;case 'exact-enable':try{SanaiNative.exactAlarmSettings();}catch(e){}break;case 'dismiss-banner':hideBanner();break;case 'open':input.value=st.duration;paintPermission();paint();if(!dlg.open)dlg.showModal();break;case 'close':if(dlg.open)dlg.close();break;case 'preset':setDuration(+b.dataset.seconds);break;case 'toggle':toggle();break;case 'plus':plus();break;case 'reset':case 'stop':setDuration(st.duration);break;}});
document.addEventListener('visibilitychange',()=>{tick();if(!document.hidden){reconcile();nativeSync();paintPermission();}});window.addEventListener('focus',()=>{reconcile();tick();nativeSync();paintPermission();});window.addEventListener('pageshow',tick);window.addEventListener('resize',paint);setInterval(tick,250);reconcile();nativeSync();tick();
})();
