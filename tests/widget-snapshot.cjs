const fs=require('fs'),vm=require('vm'),assert=require('assert');let got=[];const ctx={console,Date,JSON,Number,Math,Set,Promise,dateNow:()=> '2026-11-13',sessions:[{date:'2026-11-13',part:'등',exercises:[{sets:[{reps:10}]}]}],draft:{date:'2026-11-13',part:'가슴',exercises:[{sets:[{reps:10},{reps:null},{reps:''},{reps:0}]}]},nutrition:{logs:[{date:'2026-11-13',p:30}]},nTotals:r=>({p:r.reduce((a,b)=>a+b.p,0),kcal:210,c:10,f:2}),nTarget:()=>150,count:s=>s.exercises.reduce((a,b)=>a+b.sets.length,0),localStorage:{getItem:()=>JSON.stringify({mode:'paused',remaining:40000,end:0})},write:()=>true,window:{SanaiNative:{widgetSnapshot:s=>got.push(JSON.parse(s))},addEventListener(){}},document:{addEventListener(){}},setInterval(){}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('app/src/main/assets/sanai-widgets-v54.js','utf8'),ctx);ctx.window.sanaiWidgetSync();assert.equal(got[0].nutrition.p,30);assert.equal(got[0].nutrition.goal,150);assert.equal(got[0].workout.done,1);assert.equal(got[0].workout.total,4);assert.equal(got[0].workout.logged,1);assert.equal(got[0].timer.remaining,40000);assert.equal(got[0].days.length,1);ctx.window.sanaiWidgetSync();assert.equal(got.length,1);console.log('Widget snapshot tests PASS');

// Bundled data and browser script syntax regressions.
const html56=fs.readFileSync('app/src/main/assets/index.html','utf8');
for(const script of html56.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script[1]);
const food56=vm.runInNewContext(fs.readFileSync('app/src/main/assets/sanai-food-db-v56.js','utf8')+'\nnPackagedFood');
assert.equal(food56.length,1320);assert(food56.every(x=>x.base>0&&['g','ml'].includes(x.unit)&&['kcal','p','c','f'].every(k=>Number.isFinite(x[k])&&x[k]>=0)));
assert(food56.some(x=>x.name.includes('순대국밥')&&x.p===3.17&&x.base===100));assert(food56.some(x=>x.name.includes('오므라이스')));assert(html56.includes('...nPackagedFood,...nRemote'));assert(!html56.includes('id="n-csv"'));assert(html56.includes("ironlog.v5.nutrition"));
const matcher56=vm.runInNewContext(html56.match(/const nCompact=.*?;\n/)[0]+html56.match(/function nMatch\(s,q\)\{[^\n]+\}/)[0]+'\nnMatch');assert(matcher56('국밥_순대국밥','순댓국'));assert(matcher56('오므라이스','오무라이스'));console.log('Bundled food DB tests PASS');

// v5.7 restaurant coverage and search behavior.
const html57=fs.readFileSync('app/src/main/assets/index.html','utf8');for(const script of html57.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
const frctx=vm.createContext({});vm.runInContext(fs.readFileSync('app/src/main/assets/sanai-franchise-v57.js','utf8'),frctx);const frpart=html57.slice(html57.indexOf('const nFranchiseAliases='),html57.indexOf('function nFranchiseControls()'));vm.runInContext(frpart+'\nfunction nMatch(s,q){return nCompact(s).includes(nCompact(q))}',frctx);
const check57=vm.runInContext(`({brands:nFranchiseDB.brands.length,foods:nFrFoods.length,groups:new Set(nFranchiseDB.brands.map(x=>x.category)).size,unique:new Set(nFranchiseDB.brands.map(x=>nCompact(x.name))).size,search:nFranchiseResults('지코바'),curry:nFranchiseResults('코코이찌방야 카레오무라이스'),pizza:nFranchiseResults('피자알볼로'),halmae:nFranchiseResults('할매순대국'),all:nFrFoods})`,frctx);assert.equal(check57.brands,708);assert.equal(check57.unique,check57.brands);assert.equal(check57.foods,283);assert(check57.groups>=18);assert(check57.search.some(x=>x.name.includes('숯불양념치킨')));assert(check57.curry.some(x=>x.name.includes('카레오무라이스')));assert(check57.pizza.some(x=>x.name.includes('피자')));assert(!check57.pizza.some(x=>x.name.includes('순대국')));assert(check57.halmae.length);assert(check57.all.every(x=>x.estimate&&['p','c','f','kcal'].every(k=>Number.isFinite(x[k])&&x[k]>=0)));console.log('Expanded franchise DB tests PASS');

// V5.8 favorite migration, serving snapshot, toggle and persistence compatibility.
const html58=fs.readFileSync('app/src/main/assets/index.html','utf8');for(const script of html58.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
const favctx=vm.createContext({validDate:()=>true});const mig=html58.slice(html58.indexOf('const nProteinDefault='),html58.indexOf('let nutrition=nClean('));const fns=html58.slice(html58.indexOf('function nKey('),html58.indexOf('function nFavoritePanel('));vm.runInContext(mig+'\n'+fns,favctx);
const f58=vm.runInContext(`(()=>{const food={name:'닭가슴살',base:100,unit:'g',kcal:165,p:31,c:0,f:3.6,portion:100};const log={...food,id:'l1',date:'2026-11-13',meal:'점심',amount:200};const old=nClean({favorites:[food],logs:[log]});const fav=nFavoriteNext([],log,200);const removed=nFavoriteNext(fav,food,100);const brands=nFavoriteBrandNext(['지코바'],'코코이찌방야');const saved=nClean({favorites:fav,logs:old.logs,favoriteBrands:[...brands,'지코바',null]});return {old,fav,removed,brands,saved,brandRemoved:nFavoriteBrandNext(brands,'지코바')}})()`,favctx);assert.equal(f58.old.favorites.length,1);assert.equal(f58.old.logs.length,1);assert.equal(f58.old.favoriteBrands.length,0);assert.equal(f58.fav[0].portion,200);assert(!('id'in f58.fav[0]));assert(!('amount'in f58.fav[0]));assert.equal(f58.removed.length,0);assert.equal(f58.saved.favoriteBrands.length,2);assert.equal(f58.saved.logs.length,1);assert.equal(f58.saved.favorites[0].portion,200);assert.equal(f58.brandRemoved.length,1);assert(html58.includes('id="n-favorites"'));assert(html58.includes('data-n="result-favorite"'));console.log('Food and brand favorites tests PASS');

// V5.9 full-screen artwork and timer bridge wiring.
const timer59=fs.readFileSync('app/src/main/assets/rest-timer-v50.js','utf8');new vm.Script(timer59);
assert(html58.includes('id="rest-full-alert"'));assert(html58.includes('id="rest-overlay-enable"'));assert(timer59.includes('SanaiNative.restFinish(root,end)'));assert(timer59.includes('SanaiNative.restArm(st.root,st.end'));
for(const a of ['chad-art-v59.jpg','chad-controls-v59.jpg']){const b=fs.readFileSync('app/src/main/assets/'+a);assert(b.length>10000&&b[0]===255&&b[1]===216);}
console.log('CHAD full-screen assets and bridge tests PASS');


// V6.4 arsenal: metadata, aliases, special recording units and cardio.
const html64=fs.readFileSync('app/src/main/assets/index.html','utf8');
const db64=fs.readFileSync('app/src/main/assets/sanai-arsenal-v64.js','utf8');
const a64=html64.slice(html64.indexOf('const library='),html64.indexOf('const video='));
const b64=html64.slice(html64.indexOf('const freeExercises'),html64.indexOf('const guideTypes'));
const m64=html64.slice(html64.indexOf('const subGroups'),html64.indexOf('function detailedCounts'));
const alt64=html64.slice(html64.indexOf('function altList'),html64.indexOf('function openAlternatives'));
const cardio64=html64.slice(html64.indexOf('const v64CardioTypes'),html64.indexOf('function v64CardioPanel'));
const ctx64=vm.createContext({validDate:s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)});
vm.runInContext([db64,a64,b64,m64,alt64,cardio64].join('\n'),ctx64);
const checks64=vm.runInContext("({total:guideExercises.length,meta:guideMeta.length,unique:new Set(guideExercises.map(x=>x[1])).size,complete:guideExercises.every((x,i)=>x.length===7&&x.every(Boolean)&&guideMeta[i].length===2),deadlift:guideIndex({name:'데드리프트'})!==guideIndex({name:'루마니안 데드리프트'}),calf:muscle({name:'브이 스쿼트 카프레이즈'}),pullup:guideIndex({name:'턱걸이'})===guideIndex({name:'풀업'}),search:v64Match(guideExercises[guideIndex({name:'턱걸이'})],guideIndex({name:'턱걸이'}),'턱걸이'),body:v64Default({name:'푸시업',machine:'맨몸'}),assist:v64Mode({name:'어시스트 친업',machine:'머신'}),timed:v64Labels({name:'플랭크',machine:'맨몸'})[1],band:v64Mode({name:'밴드 로우',machine:'밴드'}),mapped:guideExercises.every(x=>muscle({name:x[1]})===x[0]&&Array.isArray(secondaryFor({name:x[1],machine:x[2]}))),alternatives:guideExercises.every((x,i)=>altList(i).every(j=>j!==i&&j>=0&&j<guideExercises.length)),cross:altList(guideIndex({name:'가슴 딥스'})).some(j=>guideExercises[j][0]==='삼두'),cardio:v64CardioClean([{id:'a',date:'2026-11-15',type:'트레드밀 걷기',minutes:25,km:2,speed:4.8,incline:5}]).length,invalid:v64CardioClean([{id:'a',date:'2026-11-15',type:'트레드밀 걷기',minutes:-1}]).length})",ctx64);
assert.equal(checks64.total,259);assert.equal(checks64.meta,259);assert.equal(checks64.unique,259);assert(checks64.complete);assert(checks64.deadlift);assert.equal(checks64.calf,'종아리');assert(checks64.pullup);assert(checks64.search);assert.equal(checks64.body,0);assert.equal(checks64.assist,'assist');assert(checks64.timed.includes('초'));assert.equal(checks64.band,'band');assert(checks64.mapped);assert(checks64.alternatives);assert(checks64.cross);assert.equal(checks64.cardio,1);assert.equal(checks64.invalid,0);
console.log('V6.4 arsenal tests PASS');

// V6.4.2 protein nutrition: official 90-serving Natural Chocolate; only legacy default migrates.
const proteinChecks=vm.runInContext(`(()=>{const legacy={name:'마이프로틴 임팩트웨이 WPC',grams:20,kcal:80,p:15,c:2,f:1.4,custom:false};const custom={...legacy,custom:true};const other={...legacy,name:'다른 프로틴'};const log={name:'과거 프로틴',base:20,unit:'g',kcal:80,p:15,c:2,f:1.4,id:'p1',date:'2026-11-15',meal:'간식',amount:40};const clean=nClean({protein:legacy,logs:[log],weight:72});return {fresh:nDefault().protein,migrated:clean.protein,custom:nClean({protein:custom}).protein,other:nClean({protein:other}).protein,logs:clean.logs,weight:clean.weight,reloaded:nClean(clean).protein,official:nProteinOfficial(clean.protein),valid:nProteinValid(clean.protein)}})()`,favctx);
assert.equal(proteinChecks.fresh.grams,30);assert.equal(proteinChecks.fresh.kcal,111);assert.equal(proteinChecks.fresh.p,21);assert.equal(proteinChecks.fresh.c,2.1);assert.equal(proteinChecks.fresh.f,2);assert.deepEqual(proteinChecks.fresh,proteinChecks.migrated);assert.deepEqual(proteinChecks.reloaded,proteinChecks.migrated);assert.equal(proteinChecks.custom.grams,20);assert.equal(proteinChecks.custom.custom,true);assert.equal(proteinChecks.other.name,'다른 프로틴');assert.equal(proteinChecks.logs[0].p,15);assert.equal(proteinChecks.logs[0].amount,40);assert.equal(proteinChecks.weight,72);assert(proteinChecks.official&&proteinChecks.valid);console.log('V6.4.2 protein migration tests PASS');

// V6.4.3 warm-up: use planned load, same-machine fallback, and never mutate work sets.
const wuSrc=html56.slice(html56.indexOf('function warmupSteps('),html56.indexOf('function warmupPanel('));
assert(wuSrc.includes('function warmupPlan('));
const wuCtx=vm.createContext({v6Step:()=>2.5,v64Special:e=>e.special===true,historyFor:e=>e.machine==='정확한기구'?[{date:'2026-11-14',e:{sets:[{kg:80,reps:12}]}}]:[]});
vm.runInContext(wuSrc,wuCtx);
const wuResult=vm.runInContext(`(()=>{
 const draft=(part,kg,machine='머신',name='브이스쿼트')=>({part,exercises:[{name,machine,sets:[{kg,reps:null}]}]});
 const d=draft('하체',80),before=JSON.stringify(d);
 const legs=warmupPlan(d),unchanged=before===JSON.stringify(d);
 const push=warmupPlan(draft('가슴·삼두',45,'머신','인클라인 벤치프레스'));
 const pull=warmupPlan(draft('등·이두·어깨',70,'올림피아','하이로우'));
 const fallback=warmupPlan(draft('하체',null,'정확한기구'));
 const unknown=warmupPlan(draft('하체',null,'다른기구'));
 const special=draft('등',40);special.exercises[0].special=true;
 return {legs,push,pull,fallback,unknown,unchanged,special:warmupPlan(special),editing:warmupPlan({...d,editingId:'old'}),other:warmupPlan(draft('복부',40)),small:warmupSteps(2.5,2.5),duplicate:warmupSteps(5,2.5),invalid:warmupSteps(NaN,2.5)};
})()`,wuCtx);
assert.equal(JSON.stringify(wuResult.legs.sets),JSON.stringify([{kg:40,reps:10},{kg:60,reps:5}]));
assert.equal(wuResult.push.sets[0].kg,22.5);assert.equal(wuResult.push.sets[1].kg,32.5);
assert.equal(wuResult.pull.sets[0].kg,35);assert.equal(wuResult.pull.sets[1].kg,52.5);
assert.equal(wuResult.fallback.base,80);assert(!wuResult.unknown.sets);assert(!wuResult.special.sets);
assert(wuResult.unchanged);assert.equal(wuResult.editing,null);assert.equal(wuResult.other,null);
assert.equal(wuResult.small.length,0);assert.equal(wuResult.duplicate.length,1);assert.equal(wuResult.invalid.length,0);
assert(html56.includes('id="sanai-warmup"'));assert(html56.includes('refreshWarmup()'));console.log('V6.4.3 warm-up tests PASS');

// OTA r1: apply in an existing page, refresh on edit, reapply safely, preserve draft.
const otaR1=fs.readFileSync('ota/patch.js','utf8');
new vm.Script(otaR1);
if(otaR1.includes('__sanaiWarmupR1')){
 const header={textContent:'DISCIPLINE · STRENGTH / V6.4.2'};
 let host=null, renders=0, listeners=[];
 const natural={before:x=>{host=x}};
 const ctx=vm.createContext({window:{},document:{querySelector:()=>header,getElementById:()=>host,createElement:()=>({id:'',innerHTML:''})},
 main:{querySelector:()=>natural,addEventListener:(name,fn)=>listeners.push(fn)},tab:'edit',draft:{part:'하체',exercises:[{name:'브이스쿼트',machine:'머신',sets:[{kg:80,reps:null}]}]},
 renderEditor:()=>{renders++;host=null},v64Special:()=>false,v6Step:()=>2.5,historyFor:()=>[],fmt:String,esc:String});
 const before=JSON.stringify(ctx.draft);
 vm.runInContext(otaR1,ctx);assert(host.innerHTML.includes('40kg')&&host.innerHTML.includes('60kg'));
 assert.equal(header.textContent,'DISCIPLINE · STRENGTH / V6.4.2-r1');assert.equal(listeners.length,1);
 vm.runInContext(otaR1,ctx);assert.equal(listeners.length,1);
 ctx.renderEditor();assert.equal(renders,1);assert(host.innerHTML.includes('60kg'));assert.equal(JSON.stringify(ctx.draft),before);
 ctx.draft.exercises[0].sets[0].kg=100;listeners[0]({target:{dataset:{field:'kg'}}});
 assert(host.innerHTML.includes('50kg')&&host.innerHTML.includes('75kg'));
 console.log('OTA r1 warm-up integration tests PASS');
}
