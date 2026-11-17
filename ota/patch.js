/* SANAI V6.4.2 r2 (native 69): cumulative warm-up patch.
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
// Meal serving mode: scale a copy; never rewrite stored logs.
function sanaiMealServing(x){
 if(!x||x.chicken||x.scoop||/닭가슴살|프로틴|단백질\s*파우더|보충제|유청|테이크핏|\bWPC\b/i.test(x.name||''))return x;
 if(x.unit==='인분')return x;
 if(x.unit!=='g'||!Number.isFinite(x.portion)||x.portion<=0||!Number.isFinite(x.base)||x.base<=0)return x;
 if(!/밥|덮밥|김밥|솥밥|오무라이스|오므라이스|죽|찌개|전골|국밥|국$|국\s*\(|탕|수프|스프|면|국수|우동|냉면|라면|라멘|짬뽕|짜장|자장|파스타|떡볶이|만두|돈까스|돈가스|카레|스튜|볶음|불고기|찜|족발|보쌈|순대|샌드위치|햄버거|버거|포케|샐러드|피자|치킨|탕수육|닭발|양꼬치|초밥|스테이크/.test(x.name||''))return x;
 if(/생것|마른 것|건조|분말|소스|양념장|조리 전|식용유|기름/.test(x.name||''))return x;
 if(x.foodCode&&x.portion===x.base)return x; // DB fallback is not a verified serving.
 const g=x.portion,ratio=g/x.base;
 return {...x,base:1,portion:1,unit:'인분',kcal:x.kcal*ratio,p:x.p*ratio,c:x.c*ratio,f:x.f*ratio,estimate:true,serving:'1인분 약 '+g+'g',source:(x.source||'기본 추정치')+' · 1인분 약 '+g+'g',servingGrams:g};
}
function installMealServing(){
 if(window.__sanaiMealServing)return;
 window.__sanaiMealServing=true;
 const oldPick=nPick,oldSearch=nSearch,oldManual=nManual,oldKey=nKey;
 nKey=function(x){return oldKey(sanaiMealServing(x));};
 nPick=function(x,amount){
  if(nEdit)return oldPick(x,amount);
  const y=sanaiMealServing(x);
  if(y!==x)return oldPick(y,1);
  if(y.unit==='인분'&&!y.estimate)return oldPick({...y,estimate:true},amount);
  return oldPick(y,amount);
 };
 nSearch=function(){
  oldSearch();
  const el=document.getElementById('n-results');if(!el)return;
  for(const b of el.querySelectorAll('[data-n="choose"]')){
   const x=nResults[Number(b.dataset.i)],y=sanaiMealServing(x);
   if(!x||x===y)continue;
   const spans=b.querySelectorAll('span');if(spans.length<2)continue;
   spans[0].querySelector('small').textContent=y.source+' · 1인분 기준';
   spans[1].querySelector('b').textContent=nFmt(y.p)+'g';
   spans[1].querySelector('small').textContent=nFmt(y.kcal)+' kcal';
  }
 };
 nManual=function(){
  oldManual();
  const form=document.getElementById('n-manual-form');if(!form)return;
  const unit=form.elements.unit,base=form.elements.base;
  const option=document.createElement('option');option.value='인분';option.textContent='인분';unit.prepend(option);unit.value='인분';base.value='1';
  unit.addEventListener('change',()=>{base.value=['g','ml'].includes(unit.value)?'100':'1';});
 };
 if(tab==='nutrition')nSearch();
}
installMealServing();
const header=document.querySelector('.eyebrow');header.textContent=header.textContent+'-r2';
if(tab==='edit')mountWarmup();
})();
