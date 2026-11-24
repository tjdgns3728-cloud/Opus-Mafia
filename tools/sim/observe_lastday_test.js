// 주변 보기: 낮이 한 번이라 앞 때(밤) 대신 가장 최근의 낮을 봄(2026-11-25 자율 순환, run25 결과)
// 사용: node observe_lastday_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=31;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';
for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};}const [a,b,c]=s.players;
const end=()=>{s.plans={};for(const p of C.alive(s))s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
end();/* 2일 낮(술집에 모두) → 2일 밤(시민은 집) */ok(s.turn===2,'밤이 됨');end();/* → 3일 낮 */ok(s.day===3&&s.turn===0,'3일 낮');
a.location='tavern';a.used={big:false,small:false};C.smallAct(s,a.id,{type:'observe'},rng);
const t=s.feed.filter(e=>e.to.includes(a.id)&&/지난 낮/.test(e.text||'')).at(-1)?.text||'';
ok(/지난 낮\(2일째 낮\) 광부 술집에 있던 사람: /.test(t)&&t.includes(c.name),'3일 낮에 술집을 보면 2일 낮에 술집에 있던 사람이 나옴: '+t.slice(0,60));
ok(!/아무도 없었습니다/.test(t),'전날 밤(모두 집)을 보지 않음');
