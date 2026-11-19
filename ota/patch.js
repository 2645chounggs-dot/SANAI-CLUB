/* SANAI V6.4.4 r2 · exercise history + macro alerts; native 71 */
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
(()=>{const h=document.querySelector('.eyebrow');if(h?.textContent.includes('V6.4.4'))h.textContent=h.textContent.replace(/-r\d+$/,'')+'-r3';})();

(function sanaiOnlineSearch(){
'use strict';
if(window.__sanaiOnlineSearch||typeof nOnline!=='function'||!document.querySelector('.eyebrow')?.textContent.includes('V6.4.4'))return;
window.__sanaiOnlineSearch=true;
function onlineUrl(q){
 return 'https://search.openfoodfacts.org/search?q='+encodeURIComponent(q)+'&langs=ko%2Cen&page_size=25&fields=code%2Cproduct_name%2Cproduct_name_ko%2Cproduct_name_en%2Cbrands%2Cnutriments%2Cserving_quantity';
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
  const grams=Number(x.serving_quantity);if(Number.isFinite(grams)&&grams>0&&grams<=1000)y.portion=grams;
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
