// 2026-11-25 사람 화면 UI 점검: 쓰러진 본인에게 자기 이름(3인칭)과 "같은 곳 사람은 살릴 수 있음"(살리기는 의사만), "내일 낮"이 나오던 것.
// 사용: node downed_text_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;let seed=121;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=5;s.turn=0;s.stage='plan';
for(const p of s.players){p.location='hall';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
const [V,W]=s.players;V.hp=0;const n0=s.feed.length;C.death(s,V,'공격');const fresh=s.feed.slice(n0);
const mine=fresh.filter(e=>e.to.includes(V.id)).map(e=>e.text).join(' / '),theirs=fresh.filter(e=>e.to.includes(W.id)).map(e=>e.text).join(' / ');
ok(/당신은 쓰러졌습니다/.test(mine)&&!new RegExp(V.name+' 쓰러짐').test(mine),'본인에게는 "당신은 쓰러졌습니다"(자기 이름 3인칭 아님) · '+mine.slice(0,80));
ok(/6일째 낮이 끝나기 전에/.test(mine)&&!/내일 낮/.test(mine),'마감은 날짜로(5일째 낮에 쓰러지면 6일째 낮)');
ok(/의사가 큰 행동으로 살릴 수 있음/.test(theirs)&&!/같은 곳 사람은 큰 행동으로/.test(theirs),'같은 곳 사람에게는 "같은 곳의 의사가 큰 행동으로 살릴 수 있음" · '+theirs.slice(0,80));
const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(ui.includes('쓰러져 있어 말하거나 행동할 수 없습니다.')&&ui.includes('composer.hidden=!!v.me?.downed')&&ui.includes("me.downed?'쓰러져 있음 · 행동할 수 없음'"),'쓰러져 있는 동안 대화 칸 대신 이유, 행동 횟수 대신 "쓰러져 있음"');
