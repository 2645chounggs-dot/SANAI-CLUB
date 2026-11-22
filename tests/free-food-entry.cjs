'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx={window:{}};
vm.createContext(ctx);
new vm.Script(fs.readFileSync('app/src/main/assets/sanai-free-food.js','utf8')).runInContext(ctx);
const parse=ctx.window.sanaiFreeFoodParse;
const food=[
 {name:'닭가슴살 (익힌 것)',base:100,unit:'g',portion:100,kcal:165,p:31,c:0,f:3.6,source:'기본 추정치'},
 {name:'모짜렐라 치즈',base:100,unit:'g',portion:100,kcal:280,p:28,c:3.1,f:17,source:'기본 추정치'},
 {name:'삶은 달걀',alias:'계란',base:100,unit:'g',portion:50,kcal:155,p:12.6,c:1.1,f:10.6,source:'기본 추정치'},
 {name:'제육볶음 (일반)',base:1,unit:'인분',portion:1,kcal:650,p:35,c:65,f:27,source:'기본 추정치'}
];
let r=parse('점심 닭가슴살 200g, 모짜렐라 치즈 50g',food);
assert.equal(r.errors.length,0);
assert.equal(r.entries.length,2);
assert.equal(r.entries[0].meal,'점심');
assert.equal(r.entries[1].meal,'점심');
assert.equal(r.entries[0].amount,200);
assert.equal(r.entries[1].amount,50);
assert.equal(r.entries[0].p*r.entries[0].amount/r.entries[0].base,62);
r=parse('아침 계란 2개',food);
assert.equal(r.errors.length,0);
assert.equal(r.entries[0].amount,100);
r=parse('저녁 제육볶음 2인분',food);
assert.equal(r.errors.length,0);
assert.equal(r.entries[0].amount,2);
r=parse('점심|닭가슴살 200g|330|62|0|7.2\n저녁|김치찌개 1인분|210|15|9|13',food);
assert.equal(r.errors.length,0);
assert.equal(r.entries.length,2);
assert.equal(r.entries[0].kcal,330);
assert.equal(r.entries[1].meal,'저녁');
assert.equal(r.entries[1].base,1);
r=parse('점심|닭가슴살|-20|62|0|7.2',food);
assert.equal(r.entries.length,0);
assert.equal(r.errors.length,1);
r=parse('점심 모르는음식 300g',food);
assert.equal(r.entries.length,0);
assert.equal(r.errors.length,1);
r=parse('점심 닭가슴살 200g, 모르는음식 5개',food);
assert.equal(r.entries.length,1);
assert.equal(r.errors.length,1,'invalid partial batch must block saving in UI');
r=parse('점심 닭가슴살 200000g',food);
assert.equal(r.entries.length,0);
assert.equal(r.errors.length,1);
assert.match(fs.readFileSync('app/src/main/assets/sanai-free-food.js','utf8'),/nSave\(\{\.\.\.nutrition,logs:\[\.\.\.nutrition\.logs,\.\.\.logs\]\}\)/);
console.log('SANAI subscription-free nutrition parsing / validation PASS');
