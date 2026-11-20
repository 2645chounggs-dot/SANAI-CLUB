'use strict';
const assert=require('node:assert/strict');
const {service,dateOK}=require('../sites-sync/server/food-service.cjs');

function memoryStore(){
  const docs=new Map();
  const copy=x=>structuredClone(x);
  return {
    async read(key){return docs.has(key)?copy(docs.get(key)):null;},
    async transact(key,fn){
      const document=docs.has(key)?copy(docs.get(key)):{};
      const result=fn(document);
      docs.set(key,document);
      return copy(result);
    }
  };
}
const item=(name='김치찌개')=>({
 name,date:'2026-11-21',meal:'점심',unit:'인분',
 base:1,amount:1,kcal:520,p:30,c:40,f:22,estimate:true
});
async function throwsAsync(fn,code){
  await assert.rejects(fn,e=>e.message===code,code);
}
async function run(){
  assert(dateOK('2026-11-21'));
  assert(!dateOK('2026-02-30'));
  const svc=service(memoryStore(),()=>Date.parse('2026-11-21T09:00:00Z'));
  const alice='auth:alice',bob='auth:bob';
  const a=await svc.add(alice,item('비빔밥'),'create-a-1');
  assert.equal(a.name,'비빔밥');
  assert.equal(a.revision,1);
  assert.equal((await svc.add(alice,item('비빔밥'),'create-a-1')).id,a.id);
  assert.equal((await svc.list(alice)).items.length,1);
  assert.equal((await svc.list(bob)).items.length,0);
  await throwsAsync(()=>svc.update(alice,a.id,{kcal:600},10,'update-old'), 'CONFLICT');
  const updated=await svc.update(alice,a.id,{kcal:600},1,'update-a');
  assert.equal(updated.revision,2);
  assert.equal(updated.kcal,600);
  assert.equal((await svc.update(alice,a.id,{kcal:600},1,'update-a')).revision,2);
  await throwsAsync(()=>svc.remove(alice,a.id,1,'remove-stale'), 'CONFLICT');
  const erased=await svc.remove(alice,a.id,2,'remove-a');
  assert.equal(erased.deleted,true);
  assert.equal((await svc.list(alice)).items.length,0);
  assert.equal((await svc.snapshot(alice)).items[0].deleted,true);
  const c=await svc.changes(alice,{since:0,limit:2});
  assert.equal(c.events.length,2);
  assert(c.hasMore);
  const next=await svc.changes(alice,{since:c.cursor});
  assert.equal(next.events.length,1);
  const original={
    ...item('기존 식사'),id:'old-local-2026-11-18',
    date:'2026-11-18'
  };
  const imp=await svc.importLocal(alice,[original]);
  assert.deepEqual(imp.imported,['old-local-2026-11-18']);
  const same=await svc.importLocal(alice,[original]);
  assert.deepEqual(same.existing,['old-local-2026-11-18']);
  const conflict=await svc.importLocal(alice,[{...original,kcal:900}]);
  assert.deepEqual(conflict.conflicts,['old-local-2026-11-18']);
  assert.equal((await svc.list(alice)).items[0].kcal,520);
  await throwsAsync(()=>svc.importLocal(alice,[{...original,date:'2026-02-30'}]),'INVALID_FOOD');
  await throwsAsync(()=>svc.add(' ',item(),'no-auth'),'UNAUTHENTICATED');
  const pairing=await svc.beginPair(alice);
  assert.equal(pairing.pairingCode.length,40);
  const claimed=await svc.claimPair(pairing.pairingCode,'phone-1');
  assert.equal(await svc.deviceSubject('phone-1',claimed.token),alice);
  await throwsAsync(()=>svc.deviceSubject('phone-1','wrong'),'UNAUTHENTICATED');
  await throwsAsync(()=>svc.claimPair(pairing.pairingCode,'phone-2'),'PAIRING_EXPIRED');
  const pair2=await svc.beginPair(bob);
  const phone2=await svc.claimPair(pair2.pairingCode,'phone-2');
  assert.equal(await svc.deviceSubject('phone-2',phone2.token),bob);
  assert.equal((await svc.list(bob)).items.length,0);
  const meal=await svc.add(bob,item('떡볶이'),'create-b-1');
  assert.equal((await svc.list(alice)).items.some(x=>x.id===meal.id),false);
  console.log('Sites food core: create/read/update/delete, tombstones, import, replay, pairing and tenant isolation PASS');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
