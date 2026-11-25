// 2026-11-25 사용자: NPC 고발은 근거가 있음, AI 피고는 늘 해명할 차례. 사용: node npc_evidence_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=41;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.trialDay=0;
const p=s.players[1];const c=C.npcAccuse(s,p,'npc:해먼드','해먼드',p.name+'이 광산 창고에서 숨겨 둔 폭약을 꺼내려는 것을 해먼드가 보았다.');
ok(!!c,'NPC 고발이 열림');ok(c&&c.evidence.length===1,'근거 1건(전: 0건) · '+(c&&c.evidence.length));
ok(c&&c.evidence[0].source==='해먼드의 증언'&&/폭약/.test(c.evidence[0].text),'근거는 NPC가 본 일 그대로');
const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(ui.includes('근거 ${v.trial.evidence?.length||0}건'),'재판 머리글은 근거 목록 수를 셈(그대로)');
const ses=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');ok(ses.includes("if(kind==='trial'){const d=pool.findIndex(p=>p.id===s.trial?.target);if(d>=0)picks.push(pool.splice(d,1)[0]);}"),'재판 대화: AI 피고를 먼저 말할 사람으로');
// 피고 차례는 실제 판(AI 켬)에서 확인한다 — 시험 안에서 규칙을 다시 짜지 않음
