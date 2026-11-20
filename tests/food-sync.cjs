'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const events = [];
let canSave = true;
const original = {id:'existing-id', name:'기존 식사', date:'2026-11-20', meal:'점심',
                  unit:'인분', base:1, amount:1, kcal:500, p:20, c:55, f:18};
const ctx = {
  window: {SanaiNative: {
    foodSyncInfo: () => JSON.stringify({paired:true}),
    foodSyncAck: id => events.push(id),
    foodSyncRefresh: () => {},
    foodSyncCopyPairing: () => {}
  }},
  tab:'records',
  nutrition:{logs:[original]},
  nSave:next => {if(!canSave)return false;ctx.nutrition=next;return true;},
  renderNutrition:()=>{},
  main:{querySelector:()=>null},
  notify:()=>{},
  document:{createElement:()=>({})}
};
vm.createContext(ctx);
const script=fs.readFileSync('app/src/main/assets/sanai-food-sync.js','utf8');
new vm.Script(script).runInContext(ctx);
assert.match(fs.readFileSync('app/src/main/assets/index.html','utf8'),
             /<script src="sanai-food-sync\.js"><\/script>/);
const record={
 v:1,id:'a1234567-b123-4123-8123-1234567890ab',
 name:'제육볶음 1인분',date:'2026-11-21',meal:'점심',
 unit:'인분',base:1,amount:1,kcal:650,p:35,c:65,f:27,estimate:true
};
assert.equal(ctx.window.sanaiFoodSyncIngest(JSON.stringify(record)),true);
assert.equal(ctx.nutrition.logs.length,2);
assert.equal(ctx.nutrition.logs[0].name,'기존 식사');
assert.equal(ctx.nutrition.logs[1].name,record.name);
assert.equal(ctx.nutrition.logs[1].estimate,true);
assert.equal(events.length,1);
assert.equal(ctx.window.sanaiFoodSyncIngest(JSON.stringify(record)),true);
assert.equal(ctx.nutrition.logs.length,2,'replayed event must not duplicate');
assert.equal(events.length,2,'already-recorded replay can be acknowledged');
for(const change of [
  {date:'2026-02-30'}, {id:'../../bad'}, {kcal:-1}, {p:'35'}, {meal:'야식'},
  {base:0}, {name:'  '}
]){
  const malformed={...record,id:'f1234567-b123-4123-8123-1234567890ab',...change};
  assert.equal(ctx.window.sanaiFoodSyncIngest(JSON.stringify(malformed)),false);
}
assert.equal(ctx.nutrition.logs.length,2);
assert.equal(events.length,2);
canSave=false;
const failed={...record,id:'b1234567-b123-4123-8123-1234567890ab'};
assert.equal(ctx.window.sanaiFoodSyncIngest(JSON.stringify(failed)),false);
assert.equal(events.length,2,'failed local save must not ACK');
console.log('SANAI food sync merge, replay, validation, and ACK tests PASS');
