/* SANAI V6.4.4 r5 · exercise history, macro alerts, online search, smart snacks; native 71 */
(function sanaiExerciseMemory(){
'use strict';
if(window.__sanaiExerciseMemory||typeof renderEditor!=='function'||!document.querySelector('.eyebrow')?.textContent.includes('V6.4.4'))return;
window.__sanaiExerciseMemory=true;
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
const key=(name,machine)=>JSON.stringify([norm(name),norm(machine)]);
const aliasPairs=Object.entries(aliases).filter(([a])=>!['컬','인클라인','디클라인','체스트'].includes(a));
const lookupName=s=>{const n=norm(s);return norm(aliasPairs.find(([a])=>norm(a)===n)?.[1]??s)};
const hasReal=e=>e.sets.some(t=>Number.isFinite(t.kg)&&Number.isInteger(t.reps)&&t.reps>0);
function historyRows(){
 const rows=[];const seen=new Set();
 const ordered=sessions.map((s,i)=>({s,i})).filter(({s})=>s.id!==draft?.editingId&&s.date<=(draft?.date||dateNow())).sort((a,b)=>b.s.date.localeCompare(a.s.date)||b.i-a.i);
 for(const {s} of ordered)for(const e of s.exercises){if(!e.name.trim()||!hasReal(e))continue;const k=key(e.name,e.machine);if(seen.has(k))continue;seen.add(k);rows.push({name:e.name,machine:e.machine,date:s.date,part:s.part,e});}
 return rows;
}
function candidates(){
 const rows=historyRows(),seen=new Set(rows.map(r=>key(r.name,r.machine)));
 for(const g of guideExercises){const name=g[1],machine=equipmentFor(g),k=key(name,machine);if(!seen.has(k)){seen.add(k);rows.push({name,machine,part:g[0],date:'',e:null});}}
 return rows;
}
function sameName(a,b){return norm(a)===norm(b)||lookupName(a)===lookupName(b);}
function matching(e,rows=historyRows()){return rows.find(r=>sameName(r.name,e.name)&&norm(r.machine)===norm(e.machine));}
function exactChoice(e,rows=historyRows()){
 const matches=rows.filter(r=>sameName(r.name,e.name));const same=matches.filter(r=>norm(r.machine)===norm(e.machine));
 if(e.machine.trim())return same[0]||null;
 if(new Set(matches.map(r=>norm(r.machine))).size===1)return matches[0];
 return null;
}
function restore(e,r,keepCount=false){
 if(!r?.e)return;
 e.name=r.name;e.machine=r.machine;
 const last=r.e.sets;
 if(keepCount)e.sets=e.sets.map((_,i)=>({kg:last[i]?.kg??last.at(-1)?.kg??null,reps:null}));
 else e.sets=last.map(t=>({kg:Number.isFinite(t.kg)?t.kg:null,reps:null}));
}
function score(r,q,machineField=false){
 const n=norm(r.name),m=norm(r.machine),a=lookupName(q),v=norm(q);
 if(!v)return r.e?1:0;
 if(machineField)return m===v?100:m.startsWith(v)?70:m.includes(v)?40:-1;
 const aliasesFor=aliasPairs.filter(([,target])=>norm(target)===n).map(([a])=>norm(a));
 if(n===v||n===a||aliasesFor.includes(v))return 100;
 if(n.startsWith(v)||aliasesFor.some(x=>x.startsWith(v)))return 70;
 if(n.includes(v)||m.includes(v)||aliasesFor.some(x=>x.includes(v)))return 40;
 if(/^[ㄱ-ㅎ]+$/.test(String(q).replace(/\s+/g,''))&&initials(r.name).includes(String(q).replace(/\s+/g,'')))return 35;
 return -1;
}
const initials=s=>Array.from(norm(s),c=>{const n=c.charCodeAt(0)-44032;return n>=0&&n<11172?'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[Math.floor(n/588)]:c;}).join('');
const originalPrevious=previous;
previous=function(e){const r=matching(e);return r?`직전 훈련 ${r.date.slice(5)} · ${groupSets(r.e)}`:originalPrevious(e);};
const originalGuide=addGuide;
addGuide=function(i){const length=draft?.exercises.length??0;originalGuide(i);const e=draft?.exercises[length];if(e){const r=matching(e);if(r){restore(e,r);refreshEdit();}}};
const originalAlternative=chooseAlternative;
chooseAlternative=function(j,i){const old=draft?.exercises[i];originalAlternative(j,i);const e=draft?.exercises[i];if(i>=0&&e&&e!==old){const r=matching(e);if(r){restore(e,r);refreshEdit();}}};
const originalCustom=startCustom;
startCustom=function(i,edit=false){const before=draft;originalCustom(i,edit);if(!edit&&draft&&draft!==before){for(const e of draft.exercises){const r=matching(e);if(r)restore(e,r,true);}refreshEdit();}};
const originalFinish=finish;
finish=function(){
 if(draft&&!draft.editingId){
  const rows=historyRows();
  for(const e of draft.exercises){const r=matching(e,rows);if(r){e.name=r.name;e.machine=r.machine;}
   else {const n=guideExercises.find(g=>norm(g[1])===norm(e.name));if(n)e.name=n[1];}
  }
 }
 return originalFinish();
};
const oldRender=renderEditor;
function fieldInput(t){return t instanceof HTMLInputElement&&t.dataset.ex!==undefined&&['name','machine'].includes(t.dataset.field)&&t.dataset.set===undefined;}
function clearMenus(){main.querySelectorAll('.sanai-ex-suggest').forEach(x=>x.remove());}
function blank(e){return e.sets.every(t=>t.reps==null&&t.kg==null);}
function apply(i,r,explicit=true){
 const e=draft?.exercises[i];if(!e)return;
 if(explicit&&!blank(e)&&!confirm('현재 입력한 세트를 선택한 종목의 마지막 중량으로 교체할까?'))return;
 if(r.e){restore(e,r);}
 else {e.name=r.name;e.machine=r.machine;e.sets=N(null,4).map(([kg,reps])=>({kg,reps}));const d=v64Default(e);if(d!==null)e.sets.forEach(t=>t.kg=d);}
 clearMenus();refreshEdit();notify(r.e?`${r.name} · ${r.date.slice(5)} 마지막 ${e.sets.length}세트 복원`:`${r.name} 선택 완료`);
}
function makeChoice(r,action){
 const b=document.createElement('button');b.type='button';b.style.cssText='display:block;width:100%;text-align:left;padding:10px;border:0;border-bottom:1px solid #333;background:#15161a;color:#fff;border-radius:0;white-space:normal';
 const title=document.createElement('strong');title.textContent=r.name+' · '+(r.machine||'기구 미지정');b.append(title);
 const sub=document.createElement('small');sub.style.cssText='display:block;color:#b5b5ba;margin-top:3px';sub.textContent=r.e?`${r.date} · ${r.e.sets.length}세트 · ${groupSets(r.e)}`:'무기고 · 새 종목';b.append(sub);
 b.addEventListener('pointerdown',ev=>ev.preventDefault());b.addEventListener('click',action);return b;
}
function show(t){
 clearMenus();if(tab!=='edit'||!draft||!fieldInput(t))return;const i=+t.dataset.ex,e=draft.exercises[i];if(!e)return;
 const machineField=t.dataset.field==='machine',q=t.value;
 let rows=candidates();if(machineField)rows=rows.filter(r=>sameName(r.name,e.name));
 rows=rows.map((r,index)=>({r,index,s:score(r,q,machineField)})).filter(x=>x.s>=0).sort((a,b)=>b.s-a.s||Number(!!b.r.e)-Number(!!a.r.e)||a.index-b.index).slice(0,8).map(x=>x.r);
 if(!rows.length)return;
 const menu=document.createElement('div');menu.className='sanai-ex-suggest';menu.style.cssText='max-height:250px;overflow:auto;border:1px solid #7c2429;border-radius:8px;margin-top:5px;background:#15161a;z-index:4';menu.setAttribute('aria-label','종목 자동완성');
 for(const r of rows)menu.append(makeChoice(r,()=>apply(i,r)));
 t.insertAdjacentElement('afterend',menu);
}
function addSkipped(){
 const list=document.createElement('div');list.className='sanai-ex-suggest';list.style.cssText='max-height:300px;overflow:auto;border:1px solid #7c2429;border-radius:8px;margin:6px 0';
 const used=new Set(draft.exercises.map(e=>key(e.name,e.machine)));
 const rows=historyRows().filter(r=>!used.has(key(r.name,r.machine))).sort((a,b)=>Number(b.part===draft.part)-Number(a.part===draft.part));
 for(const r of rows.slice(0,40))list.append(makeChoice(r,()=>{const e=E(r.name,r.machine,[]);restore(e,r);e.role=roleOf(r.e);draft.exercises.push(e);refreshEdit();notify(r.name+' · 마지막 세트 복원');}));
 if(!rows.length)list.textContent='추가할 이전 종목이 없다.';
 return list;
}
renderEditor=function(){oldRender();for(const t of main.querySelectorAll('input[data-ex][data-field="name"],input[data-ex][data-field="machine"]')){t.removeAttribute('list');t.autocomplete='off';}
 const anchor=main.querySelector('[data-action="add-ex"]');if(!anchor)return;
 const b=document.createElement('button');b.type='button';b.className='wide ghost';b.style.marginTop='6px';b.textContent='↶ 이전 운동 종목 추가';b.addEventListener('click',()=>{const existing=b.nextElementSibling;if(existing?.classList.contains('sanai-ex-suggest')){existing.remove();return;}clearMenus();b.insertAdjacentElement('afterend',addSkipped());});anchor.insertAdjacentElement('afterend',b);
};
main.addEventListener('focusin',ev=>{if(fieldInput(ev.target))show(ev.target);});
main.addEventListener('input',ev=>{if(fieldInput(ev.target))show(ev.target);});
main.addEventListener('focusout',ev=>{if(!fieldInput(ev.target))return;const t=ev.target;setTimeout(()=>{if(!main.querySelector('.sanai-ex-suggest')?.contains(document.activeElement)&&!fieldInput(document.activeElement))clearMenus();},150);});
main.addEventListener('change',ev=>{
 const t=ev.target;if(!fieldInput(t)||tab!=='edit'||!draft||draft.editingId)return;const e=draft.exercises[+t.dataset.ex];if(!e||!e.name.trim()||!blank(e))return;const r=exactChoice(e);
 if(r){restore(e,r);refreshEdit();notify(`${r.name} · 마지막 ${e.sets.length}세트 복원`);}
});
main.addEventListener('keydown',ev=>{if(!fieldInput(ev.target))return;if(ev.key==='Escape'){clearMenus();return;}if(ev.key==='ArrowDown'){const b=ev.target.nextElementSibling?.querySelector('button');if(b){ev.preventDefault();b.focus();}}});
document.addEventListener('click',ev=>{if(!fieldInput(ev.target)&&!ev.target.closest('.sanai-ex-suggest')&&!ev.target.closest('button')?.textContent.includes('이전 운동 종목 추가'))clearMenus();});
if(tab==='edit')renderEditor();
const header=document.querySelector('.eyebrow');if(header)header.textContent=header.textContent.replace(/-r\d+$/,'');
})();

(function sanaiMacroAlerts(){
'use strict';
if(window.__sanaiMacroAlerts||typeof renderNutrition!=='function'||!document.querySelector('.eyebrow')?.textContent.includes('V6.4.4'))return;
window.__sanaiMacroAlerts=true;
function macroSettings(x){return {c:Number.isFinite(x?.c)&&x.c>=0&&x.c<=1000?x.c:0,f:Number.isFinite(x?.f)&&x.f>=0&&x.f<=500?x.f:0};}
function macroGoals(weight,protein,kcal,custom){
 const p=protein, f=custom.f||Math.max(1,Math.round(kcal>0?kcal*.25/9:weight*.8));
 const c=custom.c||Math.max(1,Math.round(kcal>0?(kcal-p*4-f*9)/4:weight*3));
 return {c,p,f};
}
function macroStatus(value,target,late){
 const pct=value/target*100;
 return {pct,kind:pct>120?'high':pct<80?(late?'low':'pending'):'ok'};
}
const oldClean=nClean;
nClean=function(x){const d=oldClean(x);d.macroGoals=macroSettings(x?.macroGoals);return d;};
nutrition.macroGoals=macroSettings(read(NUTKEY,null)?.macroGoals);
const oldRender=renderNutrition;
renderNutrition=function(){
 oldRender();
 const rows=nutrition.logs.filter(x=>x.date===nDate),t=nTotals(rows),custom=macroSettings(nutrition.macroGoals),targets=macroGoals(nutrition.weight,nTarget(),v6.kcal,custom);
 const late=nDate<dateNow()||(nDate===dateNow()&&(new Date().getHours()>=21||new Date().getHours()<4));
 const panel=document.createElement('section');panel.className='panel stack';panel.id='sanai-macro-alerts';
 const heading=document.createElement('h3');heading.textContent='탄·단·지 보급 경고';panel.append(heading);
 const info=document.createElement('p');info.className='notice';info.textContent='목표 대비 80~120%를 기준으로 표시한다. 부족 경고는 21시 이후 또는 지난 날짜에 표시한다. 기록 기준이며 의학적 과다·결핍 진단은 아니다.';panel.append(info);
 for(const [k,label] of [['c','탄수화물'],['p','단백질'],['f','지방']]){
  const target=targets[k],value=t[k],s=macroStatus(value,target,late&&rows.length>0);
  const line=document.createElement('div');line.style.cssText='padding:8px 0;border-bottom:1px solid var(--line)';
  const top=document.createElement('div');top.className='row between';
  const title=document.createElement('b');title.textContent=label+' '+nFmt(value)+' / '+nFmt(target)+'g';top.append(title);
  const status=document.createElement('span');status.textContent=rows.length===0?'기록 없음':s.kind==='high'?'⚠ 목표 초과':s.kind==='low'?'⚠ 목표 부족':s.kind==='pending'?'보급 진행 중':'적정 범위';status.style.color=s.kind==='high'?'#ff7474':s.kind==='low'?'#ffc65a':s.kind==='ok'?'#8ed9a5':'var(--muted)';top.append(status);line.append(top);
  const bar=document.createElement('div');bar.className='n-track';bar.style.marginTop='8px';const fill=document.createElement('div');fill.style.width=Math.min(100,s.pct)+'%';fill.style.background=s.kind==='high'?'#ef4444':s.kind==='low'?'#e9ad45':'#7dbb92';bar.append(fill);line.append(bar);
  const msg=document.createElement('small');msg.className='notice';msg.textContent=rows.length===0?'섭취한 음식을 기록해라.':s.kind==='high'?nFmt(value-target)+'g 목표 초과 · 다음 식사는 균형 있게':s.kind==='low'?'목표까지 '+nFmt(target-value)+'g 남음 · 필요한 만큼 보급':s.kind==='pending'?'목표까지 '+nFmt(target-value)+'g 남음':Math.round(s.pct)+'% · 목표 범위 내';line.append(msg);panel.append(line);
 }
 const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='탄수화물·지방 목표 직접 설정';details.append(summary);
 const form=document.createElement('form');form.className='stack';form.id='sanai-macro-goals';
 for(const [k,label,max] of [['c','탄수화물 (g)',1000],['f','지방 (g)',500]]){const l=document.createElement('label');l.className='field';l.textContent=label+' · 0 = 자동';const input=document.createElement('input');input.type='number';input.name=k;input.min='0';input.max=String(max);input.step='1';input.required=true;input.value=String(custom[k]);l.append(input);form.append(l);}
 const save=document.createElement('button');save.type='submit';save.className='primary';save.textContent='탄·지 목표 저장';form.append(save);
 const note=document.createElement('p');note.className='notice';note.textContent='자동 목표: 칼로리 설정 시 지방 25% 및 단백질 목표 제외 후 탄수화물 배정. 미설정 시 체중당 탄수화물 3g, 지방 0.8g을 출발점으로 사용한다.';form.append(note);
 form.addEventListener('submit',ev=>{ev.preventDefault();const d=Object.fromEntries(new FormData(form));if(nSave({...nutrition,macroGoals:macroSettings({c:+d.c,f:+d.f})})){renderNutrition();notify('탄·지 목표 저장 완료');}});
 details.append(form);panel.append(details);
 const anchor=main.querySelector('.n-stats');if(anchor)anchor.insertAdjacentElement('afterend',panel);else main.querySelector('.titlebar')?.insertAdjacentElement('afterend',panel);
};
if(tab==='nutrition')renderNutrition();
})();
(()=>{const h=document.querySelector('.eyebrow');if(h?.textContent.includes('V6.4.4'))h.textContent=h.textContent.replace(/-r\d+$/,'')+'-r4';})();

(function sanaiOnlineSearch(){
'use strict';
if(window.__sanaiOnlineSearch||typeof nOnline!=='function'||!document.querySelector('.eyebrow')?.textContent.includes('V6.4.4'))return;
window.__sanaiOnlineSearch=true;
function onlineUrl(q){
 return 'https://search.openfoodfacts.org/search?q='+encodeURIComponent(q)+'&langs=ko%2Cen&page_size=25&fields=code%2Cproduct_name%2Cproduct_name_ko%2Cproduct_name_en%2Cbrands%2Cnutriments';
}
function textValue(x){if(typeof x==='string')return x.trim();if(Array.isArray(x))return x.map(textValue).filter(Boolean).join(', ');if(x&&typeof x==='object')return textValue(x.ko)||textValue(x.en)||textValue(x.main)||textValue(x.value)||Object.values(x).map(textValue).find(Boolean)||'';return '';}
function onlineFoods(data,q){
 if(!data||!Array.isArray(data.hits))throw Error('응답 형식 오류');
 const seen=new Set(),out=[];
 for(const raw of data.hits){
  const x=raw?._source||raw;if(!x||typeof x!=='object')continue;
  const n=x.nutriments||{},vals=[n['energy-kcal_100g'],n.proteins_100g,n.carbohydrates_100g,n.fat_100g];
  if(vals.some(v=>v==null||v===''||!Number.isFinite(Number(v))||Number(v)<0))continue;
  let name=textValue(x.product_name_ko)||textValue(x.product_name)||textValue(x.product_name_en)||textValue(x.product_name_main);
  const brand=textValue(x.brands);if(!name)continue;if(brand&&!name.includes(brand))name+=' · '+brand;
  const key=String(x.code||name);if(seen.has(key))continue;seen.add(key);
  const y={name,alias:brand+' '+q,base:100,unit:'g',kcal:+vals[0],p:+vals[1],c:+vals[2],f:+vals[3],source:'Open Food Facts · 사용자 등록 제품 DB · 제품 라벨 확인'};
  // Product nutrition is always imported on the declared 100 g basis; no serving-weight inference.
  if(nValidFood(y))out.push(y);
 }
 return out;
}
const cache=new Map();let active=null,lastRequest=0;
nOnline=async function(){
 const q=nQuery.trim(),el=document.getElementById('n-online-msg');
 if(!el)return;if(q.length<2){el.textContent='검색어를 2글자 이상 입력해라.';return;}
 const key=q.toLowerCase().replace(/\s+/g,'');
 if(active?.key===key)return;
 const cached=cache.get(key);if(cached&&Date.now()-cached.time<300000){++nRequest;if(active)active.controller.abort();nRemote=cached.foods;el.textContent=nRemote.length?`제품 ${nRemote.length}개 찾음 · 라벨 확인`:'제품 DB에 완전한 영양성분이 등록된 결과 없음. 일반 음식은 내장 DB를 이용해라.';nSearch();return;}
 if(Date.now()-lastRequest<6500){el.textContent='검색 요청 간격 제한 · 잠시 후 다시 검색해라.';return;}
 if(active)active.controller.abort();
 const controller=new AbortController(),req=++nRequest;active={key,controller};lastRequest=Date.now();
 const timer=setTimeout(()=>controller.abort(),18000);
 nRemote=[];nSearch();el.textContent='온라인 제품 DB 검색 중…';
 const current=()=>req===nRequest&&tab==='nutrition'&&q===nQuery.trim();
 try{
  const res=await fetch(onlineUrl(q),{method:'GET',signal:controller.signal,headers:{Accept:'application/json'},credentials:'omit'});
  if(!res.ok)throw Error('HTTP '+res.status);
  const data=await res.json(),foods=onlineFoods(data,q);
  if(cache.size>=30)cache.delete(cache.keys().next().value);
  cache.set(key,{time:Date.now(),foods});
  if(!current())return;nRemote=foods;el.textContent=foods.length?`제품 ${foods.length}개 찾음 · 실제 제품 라벨과 대조해라.`:'제품 DB에 완전한 영양성분이 등록된 결과 없음. 짬뽕 등 일반 식사는 내장 DB를 이용해라.';nSearch();
 }catch(e){
  if(!current())return;
  const reason=e?.name==='AbortError'?'응답 시간 초과':/^HTTP \d+$/.test(e?.message||'')?e.message:e?.message==='응답 형식 오류'?e.message:'네트워크/서버 연결 오류';
  el.textContent='온라인 검색 실패 ('+reason+'). 내장 DB는 사용 가능. 잠시 후 다시 시도해라.';
 }finally{clearTimeout(timer);if(active?.controller===controller)active=null;}
};
})();

(function sanaiSnackRecommendations(){
'use strict';
if(window.__sanaiSnackRecommendations||typeof renderNutrition!=='function'||typeof nTotals!=='function'||!document.querySelector('.eyebrow')?.textContent.includes('V6.4.4'))return;
window.__sanaiSnackRecommendations=true;
// Every ingredient comes from the existing local food DB, except the user's configured whey.
const choices=[
 {name:'프로틴 1스쿱',parts:[['@whey',1]]},
 {name:'무가당 그릭요거트 200g',parts:[['그릭요거트 (무지방, 무가당)',200]]},
 {name:'익힌 닭가슴살 100g',parts:[['닭가슴살 (익힌 것)',100]]},
 {name:'삶은 달걀 2개',parts:[['삶은 달걀',100]]},
 {name:'두부 150g',parts:[['두부',150]]},
 {name:'무가당 두유 1팩',parts:[['두유 (무가당)',190]]},
 {name:'바나나 1개',parts:[['바나나',120]]},
 {name:'군고구마 150g',parts:[['고구마 (구운 것)',150]]},
 {name:'오트밀 40g',parts:[['오트밀 (마른 것)',40]]},
 {name:'통밀식빵 2장',parts:[['통밀 식빵',70]]},
 {name:'현미밥 반 공기',parts:[['현미밥',105]]},
 {name:'아몬드 한 줌',parts:[['아몬드',20]]},
 {name:'모짜렐라 치즈 30g',parts:[['모짜렐라 치즈',30]]},
 {name:'낫또 1팩',parts:[['낫또',50]]},
 {name:'바나나 + 무가당 두유',parts:[['바나나',120],['두유 (무가당)',190]]},
 {name:'그릭요거트 + 아몬드',parts:[['그릭요거트 (무지방, 무가당)',150],['아몬드',20]]},
 {name:'삶은 달걀 + 통밀식빵',parts:[['삶은 달걀',100],['통밀 식빵',35]]},
 {name:'프로틴 + 바나나',parts:[['@whey',1],['바나나',120]]}
];
const labels={p:'단백질',c:'탄수화물',f:'지방'};
let shown=[];
function getTargets(){
 const custom=nutrition.macroGoals||{},protein=nTarget(),calories=Number(v6.kcal)||0;
 const fat=custom.f>0?custom.f:Math.max(1,Math.round(calories>0?calories*.25/9:nutrition.weight*.8));
 const carbs=custom.c>0?custom.c:Math.max(1,Math.round(calories>0?(calories-protein*4-fat*9)/4:nutrition.weight*3));
 return {p:protein,c:carbs,f:fat};
}
function buildChoices(){
 return choices.map(c=>{
  const items=c.parts.map(([name,amount])=>{
   const food=name==='@whey'?nProteinFood():nBuilt.find(x=>x.name===name);
   return food&&{food,amount:name==='@whey'?food.base:amount};
  });
  if(items.some(x=>!x||!nValidFood(x.food)))return null;
  return {name:c.name,items,total:nTotals(items.map(x=>({...x.food,amount:x.amount})))};
 }).filter(Boolean);
}
function snackScore(option,t,targets,lacking){
 let gain=0,excess=0;
 for(const k of ['p','c','f']){
  const need=Math.max(0,targets[k]-t[k]);
  if(lacking.includes(k))gain+=Math.min(need,option.total[k])/targets[k]*(k==='p'?3:2.5);
  excess+=Math.max(0,t[k]+option.total[k]-targets[k]*1.2)/targets[k];
 }
 return gain-excess*.8-option.total.kcal*.00015;
}
function addNote(panel,message){
 const note=document.createElement('p');note.className='notice';note.textContent=message;panel.append(note);
}
function renderSnacks(){
 document.getElementById('sanai-snack-rec')?.remove();
 shown=[];
 const anchor=main.querySelector('#sanai-macro-alerts')||main.querySelector('.n-stats');
 if(!anchor)return;
 const panel=document.createElement('section');panel.className='panel stack';panel.id='sanai-snack-rec';
 const title=document.createElement('h3');title.textContent='🥣 부족 영양 보충 · 간편 간식';panel.append(title);
 const rows=nutrition.logs.filter(x=>x.date===nDate),totals=nTotals(rows),targets=getTargets();
 if(!rows.length){
  addNote(panel,'식사 기록을 1개 이상 추가하면 부족한 탄단지에 맞춰 추천한다.');
 }else{
  const lacking=['p','c','f'].filter(k=>totals[k]<targets[k]*.8);
  const budget=Number(v6.kcal)||0,remaining=budget-totals.kcal;
  if(!lacking.length){
   addNote(panel,'탄단지가 설정된 적정 범위에 도달했다. 억지로 간식을 먹을 필요 없다.');
  }else if(budget>0&&remaining<=0){
   addNote(panel,'설정한 칼로리 목표에 이미 도달했다. 추가 간식보다 식단 기록과 목표를 먼저 확인해라.');
  }else{
   addNote(panel,lacking.map(k=>labels[k]+' '+nFmt(Math.max(0,targets[k]-totals[k]))+'g 남음').join(' · '));
   let ranked=buildChoices().filter(o=>budget<=0||o.total.kcal<=remaining*1.05).map(o=>({...o,score:snackScore(o,totals,targets,lacking)})).filter(o=>o.score>.05).sort((a,b)=>b.score-a.score);
   const selected=[];
   for(const k of [...lacking].sort((a,b)=>totals[a]/targets[a]-totals[b]/targets[b])){
    const best=ranked.filter(o=>!selected.includes(o)&&o.total[k]>=5).sort((a,b)=>(b.score+b.total[k]/targets[k])-(a.score+a.total[k]/targets[k]))[0];
    if(best)selected.push(best);
   }
   for(const item of ranked)if(selected.length<5&&!selected.includes(item))selected.push(item);
   shown=selected.slice(0,5);
   for(let i=0;i<shown.length;i++){
    const item=shown[i],line=document.createElement('div');line.className='n-fav-row';
    const info=document.createElement('div');info.style.flex='1';info.style.minWidth='0';
    const name=document.createElement('b');name.textContent=item.name;info.append(name);
    const values=document.createElement('small');values.style.display='block';values.textContent=nFmt(item.total.kcal)+' kcal · 단 '+nFmt(item.total.p)+'g · 탄 '+nFmt(item.total.c)+'g · 지 '+nFmt(item.total.f)+'g';info.append(values);
    const detail=document.createElement('small');detail.style.display='block';detail.textContent='기본 식품 추정치 · 제품별 라벨 확인';info.append(detail);
    const button=document.createElement('button');button.type='button';button.className='primary';button.dataset.sanaiSnack=String(i);button.textContent='＋ 간식 기록';
    line.append(info,button);panel.append(line);
   }
   if(!shown.length)addNote(panel,'현재 칼로리 여유와 부족량에 맞는 간식이 없다. 목표 또는 기록을 확인해라.');
  }
 }
 addNote(panel,'추천은 기록된 탄단지와 설정 목표를 비교한 참고용이다. 실제 결핍 진단이 아니며 누르면 선택 날짜에 간식으로 기록한다.');
 anchor.insertAdjacentElement('afterend',panel);
}
const previousRender=renderNutrition;
renderNutrition=function(){previousRender();renderSnacks();};
main.addEventListener('click',event=>{
 const btn=event.target.closest('[data-sanai-snack]');
 if(tab!=='nutrition'||!btn||!main.contains(btn))return;
 const index=Number(btn.dataset.sanaiSnack),item=shown[index];
 if(!Number.isInteger(index)||!item)return;
 const nextLogs=item.items.map(({food,amount})=>({...food,id:uid(),amount,date:nDate,meal:'간식'}));
 if(nSave({...nutrition,logs:[...nutrition.logs,...nextLogs]})){
  nChoice=null;nEdit='';renderNutrition();notify(item.name+' · 간식 기록 완료');
 }
});
if(tab==='nutrition')renderNutrition();
})();

/* SANAI CLUB — subscription-independent food entry, no API keys or network calls.
 * Additive only: preserves ironlog.v5.nutrition and existing food-sync adapter.
 * The pipe format accepts TOTAL nutrition for the named serving.
 */
(function sanaiFreeFoodEntry(){
'use strict';
if(window.__sanaiFreeFoodEntry)return;
window.__sanaiFreeFoodEntry=true;
const MEALS=['아침','점심','저녁','간식'];
const FIELDS=['kcal','p','c','f'];
const normalize=s=>String(s||'').normalize('NFKC').toLowerCase()
  .replace(/[\s·_()[\]{}\-]/g,'').replace(/순댓국/g,'순대국');
const number=s=>{if(!/^\d+(?:\.\d+)?$/.test(String(s).trim()))return null;
  const v=Number(s);return Number.isFinite(v)&&v>=0?v:null;};
const goodMacros=v=>v&&FIELDS.every((k,i)=>Number.isFinite(v[i])&&v[i]>=0&&v[i]<=(i===0?20000:5000));
function findFood(name,catalog){
 const q=normalize(name);if(q.length<2)return null;
 const candidates=[];
 for(const x of catalog){
  if(!x||typeof x.name!=='string'||!Number.isFinite(x.base)||x.base<=0||
     !FIELDS.every(k=>Number.isFinite(x[k])&&x[k]>=0))continue;
  const n=normalize(x.name),aliases=String(x.alias||'').split(/\s+/).map(normalize).filter(x=>x.length>=2);
  let score=n===q?100:n.replace(/\(.+?\)/g,'')===q?90:
    n.startsWith(q)?70-Math.min(20,(n.length-q.length)/2):
    aliases.includes(q)?65:n.includes(q)&&q.length>=3?50:0;
  if(score>0)candidates.push({x,score});
 }
 candidates.sort((a,b)=>b.score-a.score||a.x.name.length-b.x.name.length);
 return candidates[0]?.x||null;
}
function parse(input,catalog){
 const segments=String(input||'').trim().split(/[\n,+，]+/).map(x=>x.trim()).filter(Boolean);
 const entries=[],errors=[];
 if(!segments.length)return {entries,errors:['음식을 입력해라.']};
 if(segments.length>30)return {entries,errors:['한 번에 30개 음식까지만 입력해라.']};
 let meal=''; // a meal label on one line carries over to subsequent segments
 for(let i=0;i<segments.length;i++){
  let line=segments[i],selected=meal,usedPipe=false;
  const cells=line.split('|').map(x=>x.trim());
  if(cells.length===6&&MEALS.includes(cells[0])){
    const v=cells.slice(2).map(number);
    if(!cells[1]||cells[1].length>120||!goodMacros(v)){errors.push((i+1)+'번 줄: 숫자/음식명을 확인해라.');continue;}
    meal=cells[0];entries.push({name:cells[1],meal,amount:1,base:1,unit:'회',
       kcal:v[0],p:v[1],c:v[2],f:v[3],estimate:true,source:'외부 계산값 · 원본 확인 권장',
       matched:'직접 입력 수치',kind:'calculated'});
    usedPipe=true;
  }
  if(usedPipe)continue;
  if(line.includes('|')){errors.push((i+1)+'번 줄: 끼니|음식명|kcal|단백질|탄수화물|지방 순서로 입력해라.');continue;}
  const explicit=line.match(/^(?:오늘\s*)?(아침|점심|저녁|간식)\s*[:：]?\s*/);
  if(explicit){selected=explicit[1];meal=selected;line=line.slice(explicit[0].length).trim();}
  line=line.replace(/^(?:으로|에|먹은|먹었음|먹었어)\s*/,'').trim();
  if(!line){continue;}
  const quantity=line.match(/(\d+(?:\.\d+)?)\s*(g|그램|ml|mL|인분|개|조각|봉지|봉|팩|공기|스쿱)\s*$/i);
  const foodName=quantity?line.slice(0,quantity.index).trim():line;
  if(!foodName){errors.push((i+1)+'번 줄: 음식명이 없다.');continue;}
  const food=findFood(foodName,catalog);
  if(!food){errors.push((i+1)+'번 줄: "'+foodName+'" 검색 실패. 기존 검색/직접 등록을 이용해라.');continue;}
  let amount=Number(food.defaultAmount||food.portion||food.base),countGuess=false;
  if(quantity){
   const qty=Number(quantity[1]),unit=quantity[2].toLowerCase();
   if(!(qty>0&&qty<=100000)){errors.push((i+1)+'번 줄: 수량이 올바르지 않다.');continue;}
   if(unit==='g'||unit==='그램'||unit==='ml'){
    if(food.unit!=='g'&&food.unit!=='ml'){errors.push((i+1)+'번 줄: "'+foodName+'"의 기준 단위가 달라 직접 입력이 필요하다.');continue;}
    amount=qty;
   }else if(unit==='인분'&&food.unit==='인분')amount=qty;
   else {amount=Number(food.portion||food.defaultAmount||food.base)*qty;countGuess=true;}
  }
  if(!(amount>0&&amount<=100000)){errors.push((i+1)+'번 줄: 양을 확인해라.');continue;}
  entries.push({name:food.name,matched:food.name,meal:selected||null,amount,
     base:food.base,unit:food.unit,kcal:food.kcal,p:food.p,c:food.c,f:food.f,
     estimate:food.estimate===true||countGuess||String(food.source||'').includes('추정'),
     source:food.source||'내장 식품 DB',kind:'catalog'});
 }
 return {entries,errors};
}
// Separate pure parsing from the UI so invalid input never writes localStorage.
window.sanaiFreeFoodParse=parse;
if(typeof renderNutrition!=='function'||typeof nSave!=='function'||!main)return;
let draft='',pending=null,pendingDate='',pendingMeal='';
function catalog(){
 const arr=[...nutrition.favorites,nProteinFood(),...nBuilt,...nFrFoods,...nChickenFood,
   ...nPackagedFood,...nImported];
 const seen=new Set();
 return arr.filter(x=>{const k=[x.name,x.base,x.unit].join('|');if(seen.has(k))return false;seen.add(k);return true;});
}
function renderPanel(){
 if(tab!=='nutrition')return;
 main.querySelector('#sanai-free-food')?.remove();
 if(pending&&(pendingDate!==nDate||pendingMeal!==nMeal))pending=null;
 const anchor=main.querySelector('.titlebar');if(!anchor)return;
 const section=document.createElement('section');
 section.id='sanai-free-food';section.className='panel stack';
 const heading=document.createElement('h3');heading.textContent='무료 식단 빠른 입력';section.append(heading);
 const note=document.createElement('p');note.className='notice';
 note.textContent='ChatGPT Plus·플러그인·API 없이 휴대폰에 저장한다. 내장 DB 문장 또는 ChatGPT 계산값을 붙여넣고 반드시 미리보기를 확인해라.';
 section.append(note);
 const field=document.createElement('textarea');field.id='sanai-free-food-input';field.rows=3;
 field.placeholder='점심 닭가슴살 200g, 모짜렐라 치즈 50g\n또는\n점심|닭가슴살 200g|330|62|0|7.2';
 field.value=draft;field.style.width='100%';field.maxLength=4000;
 field.setAttribute('aria-label','식단 빠른 입력');
 field.addEventListener('input',()=>{draft=field.value;pending=null;showPreview();});
 section.append(field);
 const controls=document.createElement('div');controls.className='row';
 const inspect=document.createElement('button');inspect.type='button';inspect.className='ghost';
 inspect.textContent='영양성분 미리보기';
 inspect.addEventListener('click',()=>{
  draft=field.value;
  pending=parse(draft,catalog());pendingDate=nDate;pendingMeal=nMeal;
  showPreview();
 });
 const save=document.createElement('button');save.type='button';save.className='primary';
 save.id='sanai-free-food-save';save.textContent='＋ 확인 후 한 번에 저장';
 save.addEventListener('click',()=>{
  if(!pending||pending.errors.length||!pending.entries.length||pendingDate!==nDate||pendingMeal!==nMeal)return;
  const logs=pending.entries.map(x=>{
   const {matched,kind,...rest}=x;
   return {...rest,meal:x.meal||nMeal,date:nDate,id:uid()};
  });
  if(nSave({...nutrition,logs:[...nutrition.logs,...logs]})){
   pending=null;draft='';renderNutrition();notify(logs.length+'개 식단을 휴대폰에 저장했다.');
  }
 });
 controls.append(inspect,save);section.append(controls);
 const preview=document.createElement('div');preview.id='sanai-free-food-preview';section.append(preview);
 const help=document.createElement('small');help.className='subtle';
 help.textContent='외부 계산값 형식: 점심|음식명과 먹은 양|kcal|단백질g|탄수화물g|지방g (한 줄에 음식 하나). 모르는 수치는 임의로 채우지 마라.';
 section.append(help);
 anchor.insertAdjacentElement('afterend',section);
 function showPreview(){
  preview.replaceChildren();
  save.disabled=!pending||pending.errors.length>0||pending.entries.length===0;
  if(!pending)return;
  const caption=document.createElement('p');caption.className='notice';
  caption.textContent=nDate+' · '+(pending.entries.length)+'개 확인'+(pending.errors.length?' · 오류 '+pending.errors.length+'개':'');
  preview.append(caption);
  for(const x of pending.entries){
   const item=document.createElement('p');item.className='notice';
   const scale=x.amount/x.base;
   item.textContent=(x.meal||nMeal)+' · '+x.name+' / '+Number(x.amount.toFixed(1))+x.unit+
     ' · '+Math.round(x.kcal*scale)+'kcal / 단 '+Number((x.p*scale).toFixed(1))+
     'g 탄 '+Number((x.c*scale).toFixed(1))+'g 지 '+Number((x.f*scale).toFixed(1))+'g'+
     ' ['+x.source+']';
   preview.append(item);
  }
  for(const e of pending.errors){const p=document.createElement('p');p.className='notice';
   p.textContent='⚠ '+e;preview.append(p);}
 }
 showPreview();
}
const previousRender=renderNutrition;
renderNutrition=function(){previousRender();renderPanel();};
if(tab==='nutrition')renderPanel();
})();