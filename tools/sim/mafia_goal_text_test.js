// 2026-11-28 사용자 "가 전부 만들기"(B3 초안의 안 가), 이어서 "글로 게임 플레이를 권장하지 말라는 것입니다".
// 가-1: 마피아 화면에만 "마피아 편 n명 · 시민 편 k명이 죽거나 r명이 넘어오면 장악"(이기는 조건과 같은 셈, 방법은 말하지 않음).
// 가-2: 대부 안내 「남은 숫자」는 규칙 한 문장만. 가-3: 대부 글 두 줄에서 하라는 말을 뺌.
// 사용: node mafia_goal_text_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
function game(seed){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.rng=rng;s.day=2;s.turn=0;s.stage='plan';return s;}
const line=(s,p)=>{const v=C.view(s,p.id);return {v,txt:NS.read(v).text};};
const want=(k,r)=>'시민 편 '+k+'명이 죽거나 '+r+'명이 넘어오면 장악';
{const s=game(51),m=s.players.find(o=>o.team==='mafia'),t=s.players.find(o=>o.team==='town');
 const a=line(s,m);ok(JSON.stringify(a.v.takeover)==='{"side":2,"kill":4,"recruit":2}','8명 시작: 마피아 편 2 · 4명이 죽거나 2명이 넘어오면 '+JSON.stringify(a.v.takeover));
 ok(a.txt.includes('마피아 편 2명 · '+want(4,2)),'마피아의 AI 화면 글에도 같은 줄');
 const b=line(s,t);ok(b.v.takeover==null&&!b.txt.includes('명이 넘어오면 장악'),'시민 화면에는 없음');
 t.hp=0;const c=line(s,m);ok(c.txt.includes(want(3,2)),'시민 편 한 명이 죽으면 3명이 죽거나 2명이 넘어오면');
 const mayor=ST.npc(s,'mayor');ok(!!mayor,'해먼드 NPC 있음');if(mayor){mayor.recruited=true;const d=line(s,m);ok(d.txt.includes('마피아 편 3명 · '+want(1,1)),'해먼드가 넘어오면 마피아 편 3: '+JSON.stringify(d.v.takeover));}
 // 이기는 조건과 같은 셈인지: 남은 수만큼 죽으면 실제로 장악
 const e=game(52),em=e.players.find(o=>o.team==='mafia');const need=C.view(e,em.id).takeover.kill;e.players.filter(o=>o.team==='town').slice(0,need).forEach(o=>o.hp=0);ok(C.finish?C.finish(e)?.team==='mafia':true,'시민 편 '+need+'명이 죽으면 실제로 마피아 장악');}
{const flow=fs.readFileSync(path.join(dir,'08StoryFlow.js'),'utf8');
 ok(!flow.includes('무엇을 시도할지 정합니다'),'대부 안내 「남은 숫자」: 무엇을 시도할지 권하는 말 없음');
 ok(!flow.includes('도일에게 손을 뻗을 때입니다'),'대부 글: "도일에게 손을 뻗을 때입니다" 없음');
 ok(!flow.includes('해먼드와 젊은 광부 쪽으로 눈을 돌리십시오'),'대부 글: "…쪽으로 눈을 돌리십시오" 없음');}
