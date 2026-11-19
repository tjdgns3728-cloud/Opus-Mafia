// 지표 기록(2026-11-19 사용자 "그런 것 하나하나 지표로 기록해둬야 당신이 분석하기 편합니다"). 사용: node metrics_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
const src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src.replace(/\}\)\(\);\s*$/,'globalThis.__m={saveRecord};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,{summarize,gamesFromRecords}=require('./metrics_lib.js');
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=9;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const hi=()=>0.99;
const fresh=()=>{const s=C.create(['사람','도현','서아','시온','하준','나린','이안','수현'].map((n,i)=>({id:'p'+i,name:n,bot:i>0})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';s.scenario.discovered=true;for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};}return s;};
const kinds=s=>(s.metrics||[]).map(m=>m.kind);

// 1. 변장·끌어들이기·NPC 반응·찾기·재판·죽음이 지표로 남는다
{const s=fresh(),t=s.players.find(p=>p.team==='town'&&p.name!=='사람'),gf=s.players.find(p=>p.role==='godfather');
 t.location='hall';C.smallAct(s,t.id,{type:'cover'},rng);const cv=s.metrics.find(m=>m.kind==='cover');ok(cv&&cv.alias===1&&cv.actor===t.id&&cv.team==='town'&&cv.seenBy===0,'변장: 번호·누가·보는 사람 수');
 s.scenario.mineClosed=false;gf.location='tavern';const n=s.scenario.continuation.npcs.barkeep;n.location='tavern';gf.used.big=false;
 const rec=S.choices(s,gf,'big').find(a=>a.verb==='recruitNpc'&&a.npc==='barkeep');S.resolve(s,gf,rec,hi);
 const r=s.metrics.find(m=>m.kind==='recruit');ok(r&&r.npc==='barkeep'&&r.outcome==='refusedNotOpen'&&r.team==='mafia','끌어들이기: 흔들림 없는 NPC에게 권해 거절당함');
 const nr=s.metrics.find(m=>m.kind==='npcReact');ok(nr&&nr.act==='recruit'&&nr.outcome==='accused','NPC 반응: 거절한 NPC가 고발(지표 종류가 덮이지 않음)');
 const c=s.cases.find(q=>q.target===gf.id);C.beginConsent(s,c);C.beginTrial(s,c);s.stage='vote';for(const o of C.alive(s))s.trial.votes[o.id]='guilty';C.judge(s);
 const v=s.metrics.find(m=>m.kind==='verdict');ok(v&&v.guilty&&v.team==='mafia'&&v.caught&&v.caughtKind==='npc'&&v.npcKind==='recruit','재판: 유죄·피고 편·NPC 고발(끌어들이기)로 열림');}
// 2. 판 기록에 'metrics' 묶음으로 남고, 모아 보기가 읽는다
{const s=fresh(),t=s.players.find(p=>p.team==='town'&&p.name!=='사람');C.smallAct(s,t.id,{type:'cover'},rng);const lines=[];
 const r={state:s,record(b){lines.push(JSON.stringify({time:'t',room:'R1',data:b}));return true;}};globalThis.__m.saveRecord(r,'시험');
 ok(lines.some(l=>JSON.parse(l).data.event==='metrics')&&!s.metrics.length,'saveRecord가 지표를 판 기록에 남기고 비움');
 lines.push(JSON.stringify({time:'t',room:'R1',data:{event:'end',result:{team:'town'}}}));const g=gamesFromRecords(lines);
 ok(g.length===1&&g[0].winner==='town'&&g[0].metrics.some(m=>m.kind==='cover'),'판 기록에서 방마다 지표와 이긴 편을 읽음');
 ok(/변장 1/.test(summarize(g).text),'모아 보기에 변장 수가 나옴');}
