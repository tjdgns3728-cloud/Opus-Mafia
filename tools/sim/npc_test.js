// 장소에 도착하면 NPC가 쓸모 있는 말을 한 번 하는지 확인. 사용: node npc_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG;let seed=5;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const seats=Array.from({length:6},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다'][i],bot:true}));
const s=C.create(seats,rng);globalThis.NoirScenarios?.start?.(s);globalThis.NoirScenarios?.afterGathering?.(s);
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const p=s.players.find(p=>p.team==='town');s.turn=1;
/* 첫날 낮 2에는 이야기대로 도일이 갱도 입구에 있고 갱도가 닫혀 있다(턴 넘기기를 거치지 않으므로 직접 맞춘다) */
for(const n of [s.scenario.doyle,...Object.values(s.scenario.continuation?.npcs||{})])if(n?.name==='도일')n.location='warehouse';s.scenario.mineClosed=true;
const go=place=>{for(const o of s.players){o.used={big:false,small:false};}s.stage='plan';s.plans={[p.id]:{type:'move',place}};C.resolveBig(s,rng);return s.feed.filter(e=>e.to.includes(p.id)).slice(-6).map(e=>e.text).join(' / ');};
for(const [place,word] of [['tavern','자정쯤 리스'],['home','뭔가를 묻는'],['warehouse','열쇠는 셋뿐'],['hall','화약고 열쇠는 여기']]){const out=go(place);ok(out.includes(word),C.places[place].name+' 도착: '+(out.match(new RegExp('[^/]*'+word+'[^/]*'))?.[0]?.trim()||out.slice(0,160)));}
const before=s.feed.length;go('tavern');ok(!s.feed.slice(before).some(e=>e.text.includes('자정쯤 리스')),'같은 사람에게 두 번 하지 않음');
ok(p.known.some(k=>String(k.text).includes('광부의 말')),'수첩에 기록됨');
