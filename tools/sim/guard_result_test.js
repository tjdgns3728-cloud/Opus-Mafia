// 2026-11-25 기록 분석(run25~29): 곁에서 지키기 54번 중 막은 것 0 — 공격이 없으면 지킨 사람에게 결과가 없었다.
// 공격이 없었으면 "이번 때 ○○를 노린 공격은 없었습니다", 공격이 있었으면 그 줄 없이 맞선 결과가 나오는지 확인. 사용: node guard_result_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=101;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='plan';for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}return s;};
const run=(s,plans)=>{s.plans=plans;for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes?.(s);s.stage='plan';const n0=s.feed.length;C.resolveBig(s,rng);return s.feed.slice(n0);};
{const s=fresh(),[G,T]=s.players;const out=run(s,{[G.id]:{type:'guardPlayer',target:T.id}}).filter(e=>e.to.includes(G.id)).map(e=>e.text).join(' / ');
 ok(/이번 때 나래를 노린 공격은 없었습니다\./.test(out),'공격이 없으면 "이번 때 ○○를 노린 공격은 없었습니다" · '+out.slice(0,90));}
{const s=fresh(),G=s.players[0],T=s.players[1],A=s.players.find(p=>p.role==='mafioso')||s.players[2];if(A.id===G.id||A.id===T.id)throw new Error('자리');const out=run(s,{[G.id]:{type:'guardPlayer',target:T.id},[A.id]:{type:'attack',target:T.id,weapon:'fist'}}).filter(e=>e.to.includes(G.id)).map(e=>e.text).join(' / ');
 ok(!/노린 공격은 없었습니다/.test(out),'공격이 있었으면 "없었습니다"를 쓰지 않음 · '+(out.match(/[^/]*없었습니다[^/]*/)||['(없음)'])[0]);}
// 밤 남의 집 지키기: 습격이 없었으면 "밤새 ○○의 집 앞을 지켰지만 아무도 오지 않았습니다"(2026-11-25 기록 분석: 49번 중 습격과 마주친 것 1)
{const s=fresh();s.turn=2;const town=s.players.filter(p=>p.team==='town'),[G,T]=town;for(const p of s.players){p.location=p.team==='mafia'?'hideout':'home';p.houseId=p.team==='mafia'?null:p.id;}
 const plans={[G.id]:{type:'guardHouse',target:T.id}};for(const p of s.players)if(!plans[p.id])plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};const out=run(s,plans).filter(e=>e.to.includes(G.id)).map(e=>e.text).join(' / ');
 ok(new RegExp('밤새 '+T.name+'의 집 앞을 지켰지만 아무도 오지 않았습니다').test(out),'밤 남의 집 지키기: 습격이 없으면 알림 · '+(out.match(/[^/]*아무도 오지[^/]*/)||[out.slice(0,80)])[0]);}
