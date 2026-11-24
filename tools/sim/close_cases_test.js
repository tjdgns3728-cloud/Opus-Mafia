// 2026-11-25 자율 순환(run27): 다른 재판이 먼저 열려 동의 단계에 가지 못한 재판 신청이 "동의가 모자라"로 알려지던 것 확인.
// 사용: node close_cases_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=51;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아름'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);
s.day=2;s.turn=0;for(const p of s.players){p.location='hall';p.hidden=false;}
const [A,B,X]=s.players;
/* run27 2일째처럼 NPC 고발이 먼저 생기고, 그 뒤 플레이어 신청 */const npc=C.npcAccuse(s,X,'hammond','해먼드','시험 고발');ok(!!npc,'NPC 고발 재판이 생김');
/* 플레이어 재판 신청(만들어질 때 모양 그대로) */s.cases.push({id:'c'+(++s.serial),day:s.day,submittedAt:C.label(s),closed:false,target:B.id,by:A.id,reason:'시험',reasons:[{by:A.id,text:'시험'}],evidence:[],support:[A.id],responses:{[A.id]:true},order:s.serial});
const first=C.nextConsent(s);ok(first&&first.id===npc.id,'동의 없이 여는 NPC 고발이 먼저');
C.beginConsent(s,first);const approved=C.finishConsent(s);ok(approved&&approved.id===npc.id,'NPC 고발 재판 엶');
const before=s.feed.length;C.beginTrial(s,approved);C.closeCases(s,approved.id);
const notes=s.feed.slice(before).filter(e=>/재판 신청:/.test(e.text)).map(e=>e.text);
ok(notes.some(t=>t===A.name+' → '+B.name+' 재판 신청: 오늘 다른 재판이 먼저라 열리지 않음.'),'동의 단계에 가지 못한 신청: "신청한 사람 → 대상 재판 신청: 오늘 다른 재판이 먼저라 열리지 않음" · '+notes.join(' / '));
ok(!notes.some(t=>/동의가 모자라/.test(t)),'"동의가 모자라"라고 알리지 않음');
