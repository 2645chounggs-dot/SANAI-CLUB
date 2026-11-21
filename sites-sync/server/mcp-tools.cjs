'use strict';
/**
 * Host-independent MCP tool catalog and dispatcher.
 * Bind this to actual Sites MCP runtime only after Sites is provisioned.
 * Security requirement: subjectFromVerifiedSession MUST throw on missing
 * or invalid authenticated session. Never accept a client-supplied userId.
 */
const {service}=require('./food-service.cjs');
const foodProps={
  name:{type:'string',maxLength:120},
  date:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},
  meal:{type:'string',enum:['아침','점심','저녁','간식']},
  unit:{type:'string',maxLength:24},
  base:{type:'number',exclusiveMinimum:0,maximum:100000},
  amount:{type:'number',exclusiveMinimum:0,maximum:100000},
  kcal:{type:'number',minimum:0,maximum:20000},
  p:{type:'number',minimum:0,maximum:5000},
  c:{type:'number',minimum:0,maximum:5000},
  f:{type:'number',minimum:0,maximum:5000},
  estimate:{type:'boolean'}
};
const empty={type:'object',properties:{},additionalProperties:false};
const tools=[
  {name:'add_food',description:'사나이크럽 식단을 한 건 기록한다. 동일 mutationId 재시도 시 중복 등록하지 않는다.',
    inputSchema:{type:'object',properties:{...foodProps,mutationId:{type:'string',minLength:1}},required:[...Object.keys(foodProps).filter(k=>k!=='estimate'),'mutationId'],additionalProperties:false}},
  {name:'list_food',description:'인증된 사용자 소유 식단을 날짜와 식사별로 조회한다.',
    inputSchema:{type:'object',properties:{date:foodProps.date,meal:foodProps.meal,limit:{type:'integer',minimum:1,maximum:1000}},additionalProperties:false}},
  {name:'update_food',description:'기존 식단을 수정한다. 먼저 list_food로 id와 revision을 확인해야 한다.',
    inputSchema:{type:'object',properties:{id:{type:'string',minLength:1},expectedRevision:{type:'integer',minimum:1},mutationId:{type:'string'},patch:{type:'object',properties:foodProps,additionalProperties:false,minProperties:1}},required:['id','expectedRevision','mutationId','patch'],additionalProperties:false}},
  {name:'delete_food',description:'기존 식단 한 건을 삭제한다. 먼저 조회한 id와 revision이 일치해야 한다.',
    inputSchema:{type:'object',properties:{id:{type:'string',minLength:1},expectedRevision:{type:'integer',minimum:1},mutationId:{type:'string'}},required:['id','expectedRevision','mutationId'],additionalProperties:false}},
  {name:'begin_food_pairing',description:'사나이크럽 Android 앱 연결용 단기 일회성 페어링 코드를 발급한다.',
    inputSchema:empty}
];
function toolsForSite({store,subjectFromVerifiedSession,now}){
  if(!store||typeof subjectFromVerifiedSession!=='function')
    throw Error('SECURE_SITE_ADAPTER_REQUIRED');
  const api=service(store,now);
  const byName=new Map(tools.map(t=>[t.name,t]));
  async function call(name,args,context){
    if(!byName.has(name))throw Error('UNKNOWN_TOOL');
    if(!args||typeof args!=='object'||Array.isArray(args))throw Error('INVALID_INPUT');
    const subject=await subjectFromVerifiedSession(context);
    if(typeof subject!=='string'||!subject.trim())throw Error('UNAUTHENTICATED');
    // Explicitly pass only whitelisted values. Caller-supplied owner never used.
    switch(name){
      case 'add_food':{
        const {mutationId,...payload}=args;
        return api.add(subject,payload,mutationId);
      }
      case 'list_food':return api.list(subject,args);
      case 'update_food':return api.update(subject,args.id,args.patch,args.expectedRevision,args.mutationId);
      case 'delete_food':return api.remove(subject,args.id,args.expectedRevision,args.mutationId);
      case 'begin_food_pairing':return api.beginPair(subject);
    }
  }
  return {tools:tools.map(t=>({...t})),call,api};
}
module.exports={toolsForSite,tools};
