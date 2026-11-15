// NPC와 상호작용한 글이 다른 장소 사람에게 가는지 확인. 사용: node npcvis_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=9;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const fresh=()=>{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);return s;};
const places=['hall','warehouse','tavern','clinic','chapel','home'];let leaks=0,checked=0;const seenKeys=new Set();
for(let round=0;round<40;round++){const s=fresh();s.day=2;s.turn=0;C.nextTurn(s);s.turn=0;s.day=2;S.nextChapter(s);s.stage='plan';
 // 사람들을 장소마다 흩어 놓는다
 s.players.forEach((p,i)=>{p.location=places[i%places.length];p.houseId=null;p.money=5;p.items.medicine=1;p.items.bandage=1;});
 const st=s.scenario.continuation;for(const n of Object.values(st?.npcs||{})){n.hp=n.id==='doyle'?10:6;n.bleeding=true;}
 for(const actor of s.players){const opts=(S.choices(s,actor,'big')||[]).filter(a=>a.type==='scene');
  for(const a of opts){const key=(a.sceneKey==='story-action'?a.verb:a.sceneKey);if(!/protect|threaten|bribe|disclose|guardNpc|recruitNpc|recruitNpcPaid|healNpc|escortNpc|attackNpc|talk|ask|npc/i.test(key))continue;
   const before=s.feed.length,loc=actor.location;try{S.resolve(s,actor,a,rng);}catch(e){console.log('오류',key,e.message);continue;}checked++;seenKeys.add(key);
   for(const e of s.feed.slice(before)){if(['environment','notice','death'].includes(e.kind))continue;for(const id of e.to){const o=C.find(s,id);if(o&&o.location!==loc){leaks++;if(leaks<=8)console.log('다른 장소로 감:',key,'·',C.places[loc].short,'→',C.places[o.location].short,'·',String(e.text).slice(0,80));}}}}}}
console.log('확인한 NPC 행동',checked,'번 · 종류:',[...seenKeys].join(', '),'· 다른 장소로 간 글',leaks,'건');
