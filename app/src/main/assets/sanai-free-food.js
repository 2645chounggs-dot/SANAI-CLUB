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