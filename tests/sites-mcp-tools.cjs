'use strict';
const assert=require('node:assert/strict');
const {toolsForSite}=require('../sites-sync/server/mcp-tools.cjs');
function memory(){
  const docs=new Map(),clone=x=>structuredClone(x);
  return {
    async read(k){return docs.has(k)?clone(docs.get(k)):null;},
    async transact(k,fn){
      const d=docs.has(k)?clone(docs.get(k)):{};
      const result=fn(d);
      docs.set(k,d);
      return clone(result);
    }
  };
}
async function rejects(f,message){await assert.rejects(f,e=>e.message===message);}
async function test(){
  const site=toolsForSite({store:memory(),subjectFromVerifiedSession:ctx=>{
    if(!ctx||ctx.verified!==true)throw Error('UNAUTHENTICATED');
    return ctx.accountSubject;
  }});
  const alice={verified:true,accountSubject:'sites:alice'},
        bob={verified:true,accountSubject:'sites:bob'};
  assert.deepEqual(site.tools.map(t=>t.name),[
    'add_food','list_food','update_food','delete_food','begin_food_pairing']);
  const payload={
    name:'닭갈비 1인분',date:'2026-11-21',meal:'저녁',unit:'인분',
    base:1,amount:1,kcal:650,p:40,c:55,f:23,estimate:true,
    mutationId:'add-1'
  };
  await rejects(()=>site.call('add_food',payload,{}),'UNAUTHENTICATED');
  const made=await site.call('add_food',{...payload,userId:'sites:bob'},alice);
  assert.equal(made.name,'닭갈비 1인분');
  const retry=await site.call('add_food',payload,alice);
  assert.equal(retry.id,made.id);
  const list=await site.call('list_food',{date:'2026-11-21'},alice);
  assert.equal(list.items.length,1);
  assert.equal((await site.call('list_food',{},bob)).items.length,0);
  await rejects(()=>site.call('update_food',{id:made.id,expectedRevision:10,
    patch:{kcal:700},mutationId:'wrong-version'},alice),'CONFLICT');
  const edit=await site.call('update_food',{id:made.id,expectedRevision:1,
    patch:{kcal:700},mutationId:'edit-1'},alice);
  assert.equal(edit.kcal,700);
  assert.equal(edit.revision,2);
  const gone=await site.call('delete_food',{id:made.id,expectedRevision:2,mutationId:'del-1'},alice);
  assert.equal(gone.deleted,true);
  assert.equal((await site.call('list_food',{},alice)).items.length,0);
  const pair=await site.call('begin_food_pairing',{},alice);
  assert.equal(typeof pair.pairingCode,'string');
  assert.equal(pair.pairingCode.length,40);
  console.log('MCP dispatcher: authenticated CRUD, retry, tenant isolation, pairing PASS');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
