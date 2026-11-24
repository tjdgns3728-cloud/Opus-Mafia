// 자율 순환 2026-11-25: 받침 없는 이름의 "였습니다", 본거지 마피아에게 주변 보기 없음
// 사용: node textfix_hideout_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=51;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['민재','도현','서아','시온','하준','나린','이안','수현'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};}return s;};
// 1. 추적을 알아챈 글: 받침 없는 이름은 "였습니다"
{let seen='';for(let i=0;i<60&&!seen;i++){const s=fresh(),a=s.players.find(p=>p.name==='민재'),t=s.players.find(p=>p.name==='도현');a.stats.agility=1;t.stats.observe=10;s.plans={[a.id]:{type:'track',target:t.id}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);seen=s.feed.filter(e=>e.to.includes(t.id)&&/뒤를 밟는 것을 알아챘습니다/.test(e.text||'')).map(e=>e.text).at(-1)||'';}
 ok(/민재였습니다/.test(seen)&&!/민재이었습니다/.test(seen),'추적을 알아챔: '+seen.slice(0,40));}
// 2. 본거지의 마피아에게는 주변 보기가 없고, 다른 곳에서는 있음
{const s=fresh(),m=s.players.find(p=>p.team==='mafia');s.turn=2;m.location='hideout';ok(!C.choices(s,m.id,'small').some(a=>a.type==='observe'),'밤 본거지의 마피아: 주변 보기 없음');m.location='tavern';s.turn=0;ok(C.choices(s,m.id,'small').some(a=>a.type==='observe'),'낮 술집의 마피아: 주변 보기 있음');}
// 3. 2026-11-25(run28): 낮 자기 집 주변 보기를 뺐다가, 같은 날 남의 집 찾아가기가 생겨 다시 둠
{const s=fresh(),c=s.players.find(p=>p.team==='town');c.location='home';c.houseId=null;ok(C.choices(s,c.id,'small').some(a=>a.type==='observe'),'낮 자기 집의 시민: 주변 보기 있음(2026-11-25 남의 집 찾아가기로 손님이 올 수 있어 다시 둠)');c.location='hall';ok(C.choices(s,c.id,'small').some(a=>a.type==='observe'),'낮 회관의 시민: 주변 보기 있음');const m=s.players.find(p=>p.team==='mafia');m.location='home';m.houseId=null;ok(C.choices(s,m.id,'small').some(a=>a.type==='observe'),'낮 자기 집의 마피아: 주변 보기 있음');}
