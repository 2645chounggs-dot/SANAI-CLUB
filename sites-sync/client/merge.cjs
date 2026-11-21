'use strict';
/* Local/cloud reconciliation for SANAI nutrition logs.
 * Pure plan only: no HTTP requests, no data writes, and no SDK assumptions.
 * The caller must apply PUSH operations with authenticated Sites tools/API,
 * then re-fetch snapshot before committing the new shadow map.
 *
 * No remote response may replace local data when there is a conflict.
 */
const fields=['name','unit','date','meal','base','amount','kcal','p','c','f','estimate'];
const pick=x=>{
  const o={};for(const k of fields)o[k]=x[k];return o;
};
const fingerprint=x=>JSON.stringify(pick(x));
const mapById=rows=>{
 const out=new Map();
 for(const row of rows||[]){
  if(row&&typeof row.id==='string'&&row.id)out.set(row.id,row);
 }
 return out;
};
function planMerge({local=[],remote=[],shadow={}}={}){
  const L=mapById(local),R=mapById(remote);
  const merged=[],push=[],conflicts=[],nextShadow={...shadow},seen=new Set();
  const all=new Set([...L.keys(),...R.keys(),...Object.keys(shadow)]);
  for(const id of all){
    seen.add(id);
    const l=L.get(id),r=R.get(id),s=shadow[id];
    const lh=l?fingerprint(l):null;
    const rh=r&&!r.deleted?fingerprint(r):null;
    const lChanged=!!s&&(lh!==s.fingerprint);
    const rChanged=!!s&&r&&r.revision!==s.revision;
    if(!s){
      if(l&&r){
        if(!r.deleted&&lh===rh){
          merged.push(l);nextShadow[id]={revision:r.revision,fingerprint:lh};
        }else {
          merged.push(l);conflicts.push({id,kind:'untracked-id-collision'});
        }
      }else if(l){
        merged.push(l);
        push.push({kind:'import',id,item:l});
      }else if(r&&!r.deleted){
        merged.push({...r});nextShadow[id]={revision:r.revision,fingerprint:rh};
      }
      continue;
    }
    if(lChanged&&rChanged){
      if(l)merged.push(l);
      conflicts.push({id,kind:'both-changed'});
    }else if(lChanged){
      if(l){
        merged.push(l);
        push.push({kind:'update',id,item:l,expectedRevision:s.revision});
      }else{
        push.push({kind:'delete',id,expectedRevision:s.revision});
      }
    }else if(rChanged){
      if(r&&!r.deleted){
        merged.push(l?{...l,...pick(r)}:{...r});
        nextShadow[id]={revision:r.revision,fingerprint:rh};
      }else if(r?.deleted){
        delete nextShadow[id]; // remote delete, local unmodified
      }
    }else if(l&&r&&!r.deleted){
      merged.push(l); // canonical local untouched
    }else if(l&&!r){
      merged.push(l);
      conflicts.push({id,kind:'remote-missing'});
    }else if(!l&&r&&!r.deleted){
      // Local deletion since shadow, queue removal but never erase cloud prematurely.
      push.push({kind:'delete',id,expectedRevision:s.revision});
    }else{
      delete nextShadow[id];
    }
  }
  return {merged,push,conflicts,shadow:nextShadow};
}
module.exports={planMerge,fingerprint};
