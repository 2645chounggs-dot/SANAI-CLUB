'use strict';
/*
 * SANAI-CLUB Sites cloud food domain service.
 *
 * Storage contract (provided by actual Sites backend):
 *   await store.read(key) -> JSON|null
 *   await store.transact(key, fn) -> fn's return value
 *   fn receives mutable JSON document; store transaction must be SERIALIZABLE
 *   and must persist modified document before it resolves.
 *
 * Authentication contract:
 *   MCP layer derives subject from verified Sites session; NEVER accept
 *   subject from tool arguments or from a client-controlled header.
 *   Device layer resolves subject only after verifying a 256-bit pairing token.
 *
 * This library is host-agnostic source code, not an exposed/public MCP endpoint.
 * Actual Sites storage, MCP registration and HTTP routes are not yet provisioned.
 */
const crypto = require('node:crypto');
const MEALS = new Set(['아침','점심','저녁','간식']);
const ID = /^[a-zA-Z0-9_.:-]{1,128}$/;
const KEY = 'sanai:food:v1:';
const devicesKey = KEY+'devices';
const codesKey = KEY+'pairings';
const sha = s => crypto.createHash('sha256').update(s,'utf8').digest('hex');
const safeEq = (a,b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a,'utf8'),Buffer.from(b,'utf8'));
};
const copy = x => JSON.parse(JSON.stringify(x));
const number = (x,max) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max;
const uuid = () => crypto.randomUUID();
function dateOK(s) {
  if (typeof s!=='string'|| !/^\d{4}-\d\d-\d\d$/.test(s)) return false;
  const [y,m,d]=s.split('-').map(Number);
  const t=new Date(Date.UTC(y,m-1,d));
  return t.getUTCFullYear()===y && t.getUTCMonth()===m-1 && t.getUTCDate()===d;
}
function food(input,{allowId=true}={}) {
  if (!input||typeof input!=='object'||Array.isArray(input)) throw Error('INVALID_FOOD');
  if (input.id!==undefined && (!allowId||typeof input.id!=='string'||!ID.test(input.id))) throw Error('INVALID_ID');
  const name=String(input.name??'').trim(),unit=String(input.unit??'').trim();
  if(!name||name.length>120||!unit||unit.length>24||
     !dateOK(input.date)||!MEALS.has(input.meal)||
     !number(input.base,100000)||input.base===0||!number(input.amount,100000)||input.amount===0)
    throw Error('INVALID_FOOD');
  for(const k of ['kcal','p','c','f'])
    if(!number(input[k],k==='kcal'?20000:5000)) throw Error('INVALID_MACRO_'+k);
  const out={name,unit,date:input.date,meal:input.meal,base:input.base,
    amount:input.amount,kcal:input.kcal,p:input.p,c:input.c,f:input.f,
    estimate:input.estimate===true};
  if (typeof input.source==='string' && input.source.length<=240) out.source=input.source;
  if(input.id) out.id=input.id;
  return out;
}
const initial = () => ({seq:0,entries:{},events:[],mutations:{}});
const identity = subject => {
  if(typeof subject!=='string'||!subject.trim()||subject.length>240) throw Error('UNAUTHENTICATED');
  return subject.trim();
};
function service(store,now=()=>Date.now()){
  async function userTx(subject,fn){
    const id=identity(subject);
    return store.transact(KEY+'user:'+sha(id),state=>{
      if(!state.seq&&state.seq!==0) Object.assign(state,initial());
      state.entries??={};state.events??=[];state.mutations??={};
      return fn(state);
    });
  }
  async function userRead(subject){
    const id=identity(subject);
    return (await store.read(KEY+'user:'+sha(id)))||initial();
  }
  function remember(state,mutationId,op){
    if(!mutationId || typeof mutationId!=='string' || !ID.test(mutationId))
      throw Error('INVALID_MUTATION_ID');
    if(state.mutations[mutationId])return {replay:true,response:copy(state.mutations[mutationId])};
    const response=op();
    state.mutations[mutationId]=copy(response);
    return {replay:false,response};
  }
  function emit(state,id,deleted){
    state.seq++;
    state.events.push({seq:state.seq,id,deleted});
  }
  async function add(subject,payload,mutationId){
    const value=food(payload);
    return userTx(subject,state=>remember(state,mutationId,()=>{
      const id=value.id||uuid();
      if(state.entries[id])throw Error('ALREADY_EXISTS');
      const entry={...value,id,revision:1,deleted:false};
      state.entries[id]=entry;emit(state,id,false);return copy(entry);
    }).response);
  }
  async function update(subject,id,patch,expectedRevision,mutationId){
    if(typeof id!=='string'||!ID.test(id))throw Error('INVALID_ID');
    if(!Number.isInteger(expectedRevision)||expectedRevision<1)throw Error('PRECONDITION_REQUIRED');
    if(!patch||typeof patch!=='object'||Array.isArray(patch)||
       Object.keys(patch).some(k=>!['name','unit','date','meal','base','amount','kcal','p','c','f','estimate','source'].includes(k)))
      throw Error('INVALID_PATCH');
    return userTx(subject,state=>remember(state,mutationId,()=>{
      const prev=state.entries[id];
      if(!prev||prev.deleted)throw Error('NOT_FOUND');
      if(prev.revision!==expectedRevision)throw Error('CONFLICT');
      const value=food({...prev,...patch,id});
      const entry={...value,id,revision:expectedRevision+1,deleted:false};
      state.entries[id]=entry;emit(state,id,false);return copy(entry);
    }).response);
  }
  async function remove(subject,id,expectedRevision,mutationId){
    if(typeof id!=='string'||!ID.test(id))throw Error('INVALID_ID');
    if(!Number.isInteger(expectedRevision)||expectedRevision<1)throw Error('PRECONDITION_REQUIRED');
    return userTx(subject,state=>remember(state,mutationId,()=>{
      const prev=state.entries[id];
      if(!prev||prev.deleted)throw Error('NOT_FOUND');
      if(prev.revision!==expectedRevision)throw Error('CONFLICT');
      const entry={...prev,deleted:true,revision:expectedRevision+1};
      state.entries[id]=entry;emit(state,id,true);
      return {id,revision:entry.revision,deleted:true};
    }).response);
  }
  async function list(subject,{date,meal,limit=200}={}){
    if(date!==undefined&&!dateOK(date))throw Error('INVALID_DATE');
    if(meal!==undefined&&!MEALS.has(meal))throw Error('INVALID_MEAL');
    if(!Number.isInteger(limit)||limit<1||limit>1000)throw Error('INVALID_LIMIT');
    const s=await userRead(subject);
    const items=Object.values(s.entries).filter(x=>!x.deleted&&(!date||x.date===date)&&(!meal||x.meal===meal))
      .sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))
      .slice(0,limit);
    return {items:copy(items),seq:s.seq};
  }
  async function snapshot(subject){
    const s=await userRead(subject);
    return {seq:s.seq,items:copy(Object.values(s.entries))};
  }
  async function changes(subject,{since=0,limit=300}={}){
    if(!Number.isSafeInteger(since)||since<0||!Number.isInteger(limit)||limit<1||limit>1000)
      throw Error('INVALID_CURSOR');
    const s=await userRead(subject);
    const events=s.events.filter(x=>x.seq>since).slice(0,limit);
    return {seq:s.seq,cursor:events.length?events[events.length-1].seq:since,
      hasMore:s.events.some(x=>x.seq>(events.length?events[events.length-1].seq:since)),
      events:copy(events.map(e=>({...e,item:s.entries[e.id]})))};
  }
  async function importLocal(subject,items){
    if(!Array.isArray(items)||items.length>200)throw Error('INVALID_BATCH');
    const cleaned=items.map(x=>food(x));
    if(cleaned.some(x=>!x.id))throw Error('IMPORT_ID_REQUIRED');
    return userTx(subject,state=>{
      const imported=[],existing=[],conflicts=[];
      for(const value of cleaned){
        const id=value.id,found=state.entries[id];
        if(found){
          const keys=['name','unit','date','meal','base','amount','kcal','p','c','f','estimate'];
          if(!found.deleted&&keys.every(k=>found[k]===value[k]))existing.push(id);
          else conflicts.push(id); // Preserve both versions for manual resolution
          continue;
        }
        const entry={...value,revision:1,deleted:false};
        state.entries[id]=entry;emit(state,id,false);imported.push(id);
      }
      return {imported,existing,conflicts,seq:state.seq};
    });
  }
  async function beginPair(subject){
    const owner=identity(subject);
    const code=crypto.randomBytes(20).toString('hex');
    const codeHash=sha(code);
    await store.transact(codesKey,state=>{
      state.pending??={};
      state.pending[codeHash]={owner,expires:now()+10*60*1000};
      return null;
    });
    return {pairingCode:code,expiresInSeconds:600};
  }
  async function claimPair(code,deviceId){
    if(typeof code!=='string'||!/^[0-9a-f]{40}$/.test(code)||
      typeof deviceId!=='string'||!ID.test(deviceId))throw Error('INVALID_PAIRING');
    const token=crypto.randomBytes(32).toString('base64url');
    const codeHash=sha(code),tokenHash=sha(token);
    // Consume under one transaction; pairs and devices share a registry to avoid
    // accepting one code twice or creating a device without ownership.
    return store.transact(codesKey,state=>{
      const pending=state.pending?.[codeHash];
      if(!pending||pending.expires<now())throw Error('PAIRING_EXPIRED');
      state.devices??={};
      if(state.devices[deviceId])throw Error('DEVICE_ALREADY_PAIRED');
      state.devices[deviceId]={owner:pending.owner,tokenHash,createdAt:now()};
      delete state.pending[codeHash];
      return {deviceId,token};
    });
  }
  async function deviceSubject(deviceId,token){
    if(typeof deviceId!=='string'||!ID.test(deviceId)||typeof token!=='string')
      throw Error('UNAUTHENTICATED');
    const registry=(await store.read(codesKey))||{};
    const item=registry.devices?.[deviceId];
    if(!item||!safeEq(item.tokenHash,sha(token)))throw Error('UNAUTHENTICATED');
    return identity(item.owner);
  }
  return {add,update,remove,list,snapshot,changes,importLocal,beginPair,claimPair,deviceSubject,food};
}
module.exports={service,food,dateOK};
