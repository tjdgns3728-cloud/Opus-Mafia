// 재판 동의 결과 알림을 동의 창과 같은 말로(2026-11-25 자율 순환, AI 평가: 미응답·필요 집계가 헷갈림)
// 사용: node consent_notice_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=71;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';
for(const p of s.players){p.location='hall';p.hidden=false;p.used={big:false,small:false};}
const gf=s.players.find(q=>q.team==='mafia'),f=s.players.find(q=>q.team==='town');
C.queue(s,f.id,{type:'file',target:gf.id,reason:'시험'});for(const p of C.alive(s))if(!s.plans[p.id])C.queue(s,p.id,{type:'wait'});C.resolveBig(s,rng);
const c=s.cases.find(q=>q.target===gf.id);C.beginConsent(s,c);C.finishConsent(s);
const t=s.feed.filter(e=>/재판 동의 결과/.test(e.text||'')).at(-1)?.text||'';
ok(/^재판 동의 결과: 동의 \d+명 · 열리려면 \d+명 → (재판 엶|열지 않음)\. \(반대 \d+명 · 고르지 않음 \d+명\)$/.test(t),'결과 알림: '+t);
