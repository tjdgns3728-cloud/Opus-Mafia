// 무작위 행동으로 판을 끝까지 돌리고 이상한 글·오류를 찾는다. 사용: node fuzz.js <저장소 경로> <판 수> [자리 수]
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory;
const games=Number(process.argv[3]||10),seatsN=Number(process.argv[4]||8);
const issues=new Map();const partCheck=(where,txt)=>{for(const m of String(txt).matchAll(/([가-힣])(을|를)(?=[\s.,!?"'”]|$)/g)){if(['마을','가을','고을'].includes(m[1]+m[2]))continue;const c=m[1].charCodeAt(0)-44032,bat=c%28!==0;if((m[2]==='를'&&bat)||(m[2]==='을'&&!bat))note('조사 틀림('+where+')',m[1]+m[2]+' · '+txt);}};const note=(kind,detail)=>{const k=kind+' | '+detail.slice(0,160);issues.set(k,(issues.get(k)||0)+1);};
const used=new Map();
for(let g=0;g<games;g++){let seed=1000+g*37;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const pick=a=>a[Math.floor(rng()*a.length)];
 const seats=Array.from({length:seatsN},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라','자두','차오','하랑','타미'][i],bot:true}));
 let s;try{s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);}catch(e){note('시작 오류',e.message);continue;}
 for(let step=0;step<(s.cfg?.days||7)*3+3&&!s.result;step++){
  s.stage='plan';s.plans={};
  for(const p of C.alive(s)){
   try{const small=[...C.choices(s,p.id,'small'),...(S.choices(s,p,'small')||[])].filter(a=>a.type!=='wait');if(small.length&&rng()<0.8){for(const o of small)partCheck('선택지',o.label||'');const a=pick(small);used.set('작은:'+(a.verb||a.sceneKey||a.type),(used.get('작은:'+(a.verb||a.sceneKey||a.type))||0)+1);const err=C.smallAct(s,p.id,a,rng);if(err&&!/이미|시간|생략/.test(err))note('작은 행동 거부',(a.label||a.type)+' → '+err);}}catch(e){note('작은 행동 오류',e.message+' @'+e.stack.split('\n')[1]);}
   try{const big=[...C.choices(s,p.id,'big'),...(S.choices(s,p,'big')||[])];if(big.length){for(const o of big)partCheck('선택지',o.label||'');const a=pick(big);used.set('큰:'+(a.verb||a.sceneKey||a.type),(used.get('큰:'+(a.verb||a.sceneKey||a.type))||0)+1);const err=C.queue(s,p.id,a);if(err)note('큰 행동 거부',(a.label||a.type)+' → '+err);}}catch(e){note('큰 행동 고르기 오류',e.message);}
  }
  try{C.announceClashes(s);for(const p of C.alive(s))if(C.threats(s,p.id).length)s.reactions[p.id]=rng()<0.5?'dodge':'block';s.stage='plan';C.resolveBig(s,rng);}catch(e){note('큰 행동 처리 오류',e.message+' @'+(e.stack.split('\n')[1]||''));}
  try{if(s.scenario?.hazardPending){for(const p of C.alive(s).filter(p=>p.location==='warehouse'))S.hazardAction(s,p,rng()<0.5?'escape':'extinguish',rng);S.resolveHazard(s);}}catch(e){note('폭발 처리 오류',e.message);}
  if(s.result)break;
  try{ST?.beforeAdvance?.(s);C.tickBleed(s);C.nextTurn(s);S.nextChapter(s);}catch(e){note('턴 넘기기 오류',e.message+' @'+(e.stack.split('\n')[1]||''));break;}
 }
 // 글 검사
 for(const p of s.players){const mine=s.feed.filter(e=>e.to.includes(p.id));let prev='';
  for(const e of mine){const t=String(e.text||'');
   if(/undefined|NaN|\[object|null(?![가-힣])/.test(t))note('빈 값이 들어간 글',t);
   partCheck('글',t);
   if(t&&t===prev&&e.kind!=='speech')note('같은 글 연속',t);prev=t;
   if(/\$\{/.test(t))note('코드가 그대로 나온 글',t);if(/[^.]\.\.(?!\.)/.test(t))note('마침표 두 번',t);}
  const dead=s.feed.find(e=>e.kind==='death'&&e.who===p.id);if(dead&&p.hp>0)note('죽었다는 글 뒤 살아 있음',p.name);
 }
}
console.log('== 이상한 점 ==');for(const [k,n] of [...issues].sort((a,b)=>b[1]-a[1]))console.log(n+'회 · '+k);
console.log('== 써 본 행동 종류 '+used.size+'개 ==');console.log([...used].sort((a,b)=>b[1]-a[1]).map(([k,n])=>k+' '+n).join(', '));
