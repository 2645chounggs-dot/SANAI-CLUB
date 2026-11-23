'use strict';
const assert=require('node:assert/strict');
const {service}=require('../sites-sync/server/food-service.cjs');
const {createDeviceApi}=require('../sites-sync/server/device-api.cjs');
function memory(){
 const db=new Map(),copy=x=>structuredClone(x);
 return {
   async read(k){return db.has(k)?copy(db.get(k)):null;},
   async transact(k,fn){const v=db.has(k)?copy(db.get(k)):{};const result=fn(v);db.set(k,v);return copy(result);}
 };
}
const entry=(id,name)=>({id,name,date:'2026-11-21',meal:'점심',
  unit:'인분',base:1,amount:1,kcal:550,p:35,c:45,f:23,estimate:true});
async function rejects(fn,error){await assert.rejects(fn,e=>e.message===error);}
async function test(){
  const store=memory(),core=service(store),device=createDeviceApi({store});
  const pairA=await core.beginPair('verified:alice');
  const a=await device.dispatch('claim',{body:{pairingCode:pairA.pairingCode,deviceId:'phone-a'}});
  const session={deviceId:'phone-a',token:a.token};
  await rejects(()=>device.dispatch('snapshot',{deviceId:'phone-a',token:'invalid'}),'UNAUTHENTICATED');
  await rejects(()=>device.dispatch('snapshot',{deviceId:'phone-a'}),'UNAUTHENTICATED');
  assert.equal((await device.dispatch('snapshot',session)).items.length,0);
  const original=entry('old-id','기존 기록');
  const importOne=await device.dispatch('import',{...session,body:{items:[original]}});
  assert.deepEqual(importOne.imported,['old-id']);
  const reimport=await device.dispatch('import',{...session,body:{items:[original]}});
  assert.deepEqual(reimport.existing,['old-id']);
  const edited=await device.dispatch('update',{...session,body:{
    id:'old-id',patch:{kcal:600},expectedRevision:1,mutationId:'edit-1'
  }});
  assert.equal(edited.kcal,600);
  const fromChat=await core.add('verified:alice',entry('chat-id','채팅 기록'),'chat-1');
  const snapshot=await device.dispatch('snapshot',session);
  assert.equal(snapshot.items.length,2);
  assert(snapshot.items.some(x=>x.id===fromChat.id));
  const after=await device.dispatch('changes',{...session,params:{since:1}});
  assert(after.events.length>=2);
  const pairB=await core.beginPair('verified:bob');
  const b=await device.dispatch('claim',{body:{pairingCode:pairB.pairingCode,deviceId:'phone-b'}});
  assert.equal((await device.dispatch('snapshot',{deviceId:'phone-b',token:b.token})).items.length,0);
  await rejects(()=>device.dispatch('claim',{body:{
    pairingCode:pairB.pairingCode,deviceId:'phone-c'
  }}),'PAIRING_EXPIRED');
  console.log('Mobile route adapter: pairing, authenticated bidirectional CRUD, isolation and import PASS');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
