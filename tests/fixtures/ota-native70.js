/* SANAI V6.4.3 r1 (native 70): meal serving patch; retains built-in warm-up.
 * Signed OTA only. No storage mutations, external scripts or native permission changes. */
(()=>{
'use strict';
const targetHeader=document.querySelector('.eyebrow');
if(window.__sanaiMealServing||typeof renderEditor!=='function'||typeof main==='undefined'||!targetHeader?.textContent.includes('V6.4.3'))return;
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
const header=document.querySelector('.eyebrow');header.textContent=header.textContent+'-r1';
})();
