/* SANAI V6.4.2 r1 (native 69): cumulative warm-up patch.
 * Signed OTA only. No storage mutations, external scripts or native permission changes. */
(()=>{
'use strict';
if(window.__sanaiWarmupR1||typeof renderEditor!=='function'||typeof main==='undefined'||!document.querySelector('.eyebrow')?.textContent.includes('V6.4.2'))return;
function warmupSteps(base,step){
 if(!Number.isFinite(base)||base<=0||!Number.isFinite(step)||step<=0)return [];
 const result=[];
 for(const [ratio,reps] of [[0.5,10],[0.75,5]]){
  const kg=Number((Math.floor((base*ratio+1e-8)/step)*step).toFixed(3));
  if(kg>0&&kg<base&&!result.some(s=>s.kg===kg))result.push({kg,reps});
 }
 return result;
}
function warmupPlan(d){
 if(!d||d.editingId||!['가슴·삼두','가슴','등·이두·어깨','등','하체'].includes(d.part.trim()))return null;
 const e=d.exercises.find(x=>x.name.trim());
 if(!e)return {hint:'루틴을 시작하거나 첫 종목을 추가해라.'};
 const name=e.name.trim(),machine=e.machine.trim();
 if(v64Special(e))return {name,machine,hint:'맨몸·보조·시간·밴드 운동은 쉬운 동작 또는 가벼운 강도로 1~2세트 준비해라. 일반 중량 비율은 적용하지 않는다.'};
 const prior=historyFor(e)[0];
 const planned=e.sets.find(s=>Number.isFinite(s.kg)&&s.kg>0);
 const previous=prior?.e.sets.find(s=>Number.isFinite(s.kg)&&s.kg>0);
 const base=planned?.kg??previous?.kg;
 if(!base)return {name,machine,hint:'본운동 예정 중량을 입력해라. 동일 기구 기록이 없으면 임의 중량을 추천하지 않는다.'};
 return {name,machine,base,source:planned?'본운동 예정 중량':('직전 동일 기구 '+prior.date.slice(5)),sets:warmupSteps(base,v6Step(e)),barbell:/바벨/.test(name+' '+machine)};
}
function warmupPanel(){
 const p=warmupPlan(draft);if(!p)return '';
 const rows=p.sets?.map((s,i)=>'<tr><td>준비 '+(i+1)+'</td><td><strong>'+fmt(s.kg)+'kg</strong></td><td>'+s.reps+'회</td></tr>').join('')||'';
 return '<section class="panel" aria-label="워밍업 추천"><div class="row between"><h2>🔥 전투 준비 · 워밍업</h2><span class="chip">본세트 제외</span></div><p class="notice">가벼운 유산소 3~5분 후 관절을 편안한 범위에서 움직여라.</p>'+
 (p.name?'<strong>'+esc(p.name)+'</strong><div class="subtle">'+esc(p.machine||'기구 미지정')+'</div>':'')+
 (p.base?'<p class="notice">'+esc(p.source)+' '+fmt(p.base)+'kg 기준 · 약 50% / 75%</p>':'')+
 (rows?'<table class="sets-table"><thead><tr><th>SET</th><th>중량</th><th>반복</th></tr></thead><tbody>'+rows+'</tbody></table>':'<p class="notice">'+esc(p.hint||'기구의 최소 저항으로 가볍게 1~2세트 준비해라.')+'</p>')+
 (p.barbell?'<p class="notice">바벨은 빈 봉 무게를 확인하고 그보다 낮은 추천값 대신 빈 봉 또는 가벼운 연습용 봉을 사용해라.</p>':'')+
 '<p class="notice">실제 기구에서 가능한 낮은 중량으로 맞추고 60~90초 휴식. 실패지점까지 하지 마라. 워밍업은 기록·PR·주간 세트·볼륨에 집계하지 않는다.</p></section>';
}

function mountWarmup(){
 if(tab!=='edit')return;
 let host=document.getElementById('sanai-warmup');
 if(!host){
  const natural=main.querySelector('details.natural');
  if(!natural)return;
  host=document.createElement('div');host.id='sanai-warmup';
  natural.before(host);
 }
 host.innerHTML=warmupPanel();
}
const original=renderEditor;
renderEditor=function(){original();mountWarmup();};
main.addEventListener('input',ev=>{const data=ev.target.dataset;if(tab==='edit'&&(data.draft||['name','machine','kg'].includes(data.field)))mountWarmup();});
window.__sanaiWarmupR1=true;
const header=document.querySelector('.eyebrow');header.textContent=header.textContent+'-r1';
if(tab==='edit')mountWarmup();
})();
