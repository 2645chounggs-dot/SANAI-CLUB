/* Free local search and official CSV import. No keys, no network, no storage writes. */
(function(root){
'use strict';
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/순댓국/g,'순대국').replace(/돈가스|돈카츠/g,'돈까스').replace(/자장면/g,'짜장면').replace(/오므라이스/g,'오무라이스').replace(/제로콜라/g,'콜라제로').replace(/[\s·&_\-()[\]{}.,/]/g,'');
const initials=s=>Array.from(norm(s),c=>{let n=c.charCodeAt(0)-44032;return n>=0&&n<11172?'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[Math.floor(n/588)]:c}).join('');
const compat=s=>Array.from(String(s??''),c=>{let n=c.charCodeAt(0)-0x1100;return n>=0&&n<19?'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[n]:c}).join('');
const queryInitial=s=>compat(String(s??'').normalize('NFKC')).replace(/\s/g,'');
const fields=['kcal','p','c','f'];
const searchText=x=>[x.name,x.alias,x.brand,x.maker,x.category].filter(Boolean).join(' ');
const valid=x=>x&&typeof x.name==='string'&&x.name.trim()&&Number.isFinite(x.base)&&x.base>0&&fields.every(k=>Number.isFinite(x[k])&&x[k]>=0);
function distance(a,b,max=1){if(Math.abs(a.length-b.length)>max)return max+1;let prev=Array.from({length:b.length+1},(_,i)=>i),older=null;for(let i=1;i<=a.length;i++){let cur=[i];for(let j=1;j<=b.length;j++){cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])cur[j]=Math.min(cur[j],older[j-2]+1);}older=prev;prev=cur;}return prev[b.length];}
function score(x,q,{fuzzy=false}={}){
 const query=norm(q),name=norm(x.name),hay=norm(searchText(x));if(!query)return 0;
 const iq=queryInitial(q);if(/^[ㄱ-ㅎ]{2,}$/.test(iq))return initials(searchText(x)).includes(iq)?55:0;
 if(name===query)return 120;
 if(norm(x.alias)===query||norm(x.brand)===query)return 105;
 if(name.startsWith(query))return 95;
 if(name.includes(query))return 85;
 if(hay.includes(query))return 78;
 const terms=String(q).trim().split(/\s+/).map(norm).filter(Boolean);
 if(terms.length>1&&terms.every(t=>hay.includes(t)))return 72;
 if(!fuzzy||query.length<3||query.length>40)return 0;
 // One typo in a complete token or product-name prefix; suggestions only.
 const tokens=[name,...searchText(x).split(/[\s·_(),/]+/).map(norm)].filter(t=>t.length>=3);
 return tokens.some(t=>distance(query,t,1)<=1||t.length>query.length&&distance(query,t.slice(0,query.length),1)<=1)?30:0;
}
const key=x=>[norm(x.name),x.base,x.unit,...fields.map(k=>x[k])].join('|');
function quality(x){const s=String(x.source||'');return x.estimate||/추정|미검증/.test(s)?0:x.officialImport?9:x.chicken?6:/공공|공식/.test(s)?5:2;}
function ranked(list,q,{fuzzy=false,favorites=[]}={}){
 const fav=new Set(favorites.map(key)),seen=new Map();
 for(const x of list){if(!valid(x))continue;const k=key(x),p=score(x,q,{fuzzy});if(!p)continue;const old=seen.get(k),v={x,score:p,quality:quality(x),fav:fav.has(k)?1:0};if(!old||v.quality>old.quality)seen.set(k,v);}
 return [...seen.values()].sort((a,b)=>b.score-a.score||b.fav-a.fav||b.quality-a.quality||a.x.name.length-b.x.name.length).map(v=>v.x);
}
const head=s=>String(s??'').normalize('NFKC').replace(/[\s\uFEFF]/g,'').toLowerCase();
const cellNum=s=>{let t=String(s??'').trim().replace(/,/g,'');return /^\d+(?:\.\d+)?$/.test(t)?Number(t):NaN;};
function parseRows(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('CSV가 비어 있다.');
 const headers=rows[0].map(head),ix=(...aliases)=>aliases.map(head).map(h=>headers.indexOf(h)).find(i=>i>=0)??-1;
 const ids=[ix('식품명'),ix('영양성분함량기준량'),ix('에너지(kcal)','열량(kcal)'),ix('단백질(g)'),ix('탄수화물(g)'),ix('지방(g)')];
 if(ids.some(i=>i<0))throw Error('공공데이터 표준 CSV 필수 열(식품명, 기준량, 열량, 탄단지)이 필요하다.');
 const maker=[ix('제조사명'),ix('업체명'),ix('유통업체명'),ix('수입업체명')].filter(i=>i>=0),source=ix('출처명'),date=ix('데이터기준일자','데이터생성일자'),code=ix('식품코드'),weight=ix('식품중량'),category=ix('식품대분류명','데이터구분명');
 const result=[];for(const row of rows.slice(1)){const [name,b,...raw]=ids.map(i=>String(row[i]??'').trim());const m=b.match(/^(\d+(?:\.\d+)?)\s*(g|ml)$/i);const vals=raw.map(cellNum);if(!name||!m||!vals.every(Number.isFinite)||+m[1]<=0)continue;
  const base=+m[1],unit=m[2].toLowerCase(),brand=[...new Set(maker.map(i=>String(row[i]??'').trim()).filter(Boolean))].join(' ');
  const per=vals.map(v=>v*100/base);if(per[0]>1000||per.slice(1).some(v=>v>105)||per.slice(1).reduce((a,b)=>a+b,0)>110)continue;
  const portion=String(row[weight]??'').trim().match(/^(\d+(?:\.\d+)?)\s*(g|ml)$/i);
  const src=String(row[source]??'').trim(),dt=String(row[date]??'').trim();
  result.push({name,alias:brand,brand,category:String(row[category]??'').trim(),base,unit,portion:portion&&portion[2].toLowerCase()===unit&&+portion[1]>0&&+portion[1]<=5000?+portion[1]:base,kcal:vals[0],p:vals[1],c:vals[2],f:vals[3],officialImport:true,source:'공공 식품영양성분 DB · CSV'+(src?' · '+src:'')+(dt?' · '+dt:''),sourceUrl:'https://www.data.go.kr/data/15100064/standard.do',foodCode:String(row[code]??'').trim()});
 }
 if(!result.length)throw Error('기준량과 영양성분이 완전한 행이 없다.');return result;
}
function merge(existing,added){const map=new Map();for(const x of [...(Array.isArray(existing)?existing:[]),...added]){if(!valid(x))continue;const k=key(x),old=map.get(k);if(!old||quality(x)>=quality(old))map.set(k,x);}return [...map.values()];}
root.SanaiFoodSearch={norm,initials,score,ranked,parseRows,merge,key};
})(typeof window==='undefined'?globalThis:window);
