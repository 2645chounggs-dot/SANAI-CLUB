'use strict';
const assert=require('node:assert/strict');
const {planMerge,fingerprint}=require('../sites-sync/client/merge.cjs');
const food=(id,name='기존 식단',rev=1)=>({id,name,unit:'인분',date:'2026-11-21',
  meal:'점심',base:1,amount:1,kcal:450,p:20,c:40,f:20,estimate:true,revision:rev});
const local=food('local-1');
const cloud=food('chat-1','ChatGPT 식단');
const first=planMerge({local:[local],remote:[cloud]});
assert.equal(first.merged.length,2);
assert.deepEqual(first.push.map(x=>x.kind),['import']);
assert.equal(first.conflicts.length,0);
const state={['local-1']:{revision:1,fingerprint:fingerprint(local)}};
const remoteSame=food('local-1');
const clean=planMerge({local:[{...local,localMeta:'보존할 메모'}],remote:[{...remoteSame,kcal:550,revision:2}],shadow:state});
assert.equal(clean.merged[0].kcal,550);
assert.equal(clean.merged[0].localMeta,'보존할 메모');
assert.equal(clean.push.length,0);
const dirty=planMerge({local:[{...local,p:40}],remote:[remoteSame],shadow:state});
assert.equal(dirty.push[0].kind,'update');
assert.equal(dirty.push[0].expectedRevision,1);
const clash=planMerge({local:[{...local,p:40}],
 remote:[{...remoteSame,p:35,revision:2}],shadow:state});
assert.equal(clash.conflicts[0].kind,'both-changed');
assert.equal(clash.merged[0].p,40);
const tomb=planMerge({local:[local],remote:[{...remoteSame,deleted:true,revision:2}],shadow:state});
assert.equal(tomb.merged.length,0);
assert.equal(tomb.conflicts.length,0);
const noSilentDelete=planMerge({local:[{...local,p:40}],
 remote:[{...remoteSame,deleted:true,revision:2}],shadow:state});
assert.equal(noSilentDelete.merged.length,1);
assert.equal(noSilentDelete.conflicts[0].kind,'both-changed');
const localDelete=planMerge({local:[],remote:[remoteSame],shadow:state});
assert.equal(localDelete.push[0].kind,'delete');
const collision=planMerge({local:[local],remote:[{...local,kcal:900}],shadow:{}});
assert.equal(collision.conflicts[0].kind,'untracked-id-collision');
assert.equal(collision.merged[0].kcal,450);
console.log('Sites merge planner: additive import, remote updates, user edits, tombstones and conflict preservation PASS');
