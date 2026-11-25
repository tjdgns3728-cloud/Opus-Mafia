// 2026-11-25 검토 C: 이동 전에 말해도 찾아간 집에서 살릴 수 있음. 사용: node move_clear_alley_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=31;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;
const doc=s.players.find(p=>p.role==='doctor')||s.players[2];doc.role='doctor';const d=s.players.find(p=>p!==doc);
for(const p of s.players){p.location='home';p.houseId=null;p.hidden=false;p.used={big:false,small:false};p.alley=undefined;}
d.hp=0;d.downed={left:1};doc.alley='talk'/* 이동 전에 혼자 말함 */;
s.stage='move';s.moveDone=null;const err=C.chooseMove(s,doc.id,{type:'move',place:'home',house:d.id});C.applyMoves(s,rng);
ok(!err,'찾아가기 이동 고름 '+(err||''));
ok(doc.houseId===d.id,'의사가 쓰러진 사람의 집에 있음');ok(doc.alley===undefined,'골목 값이 지워짐(전: talk 남음)');
ok(C.sameSpace(s,doc,d),'쓰러진 사람과 같은 공간');
s.stage='plan';doc.used={big:false,small:false};const ch=(C.choices(s,doc.id,'big')||[]).filter(x=>x.type==='revive');ok(ch.some(x=>x.target===d.id),'살리기 선택지에 쓰러진 사람이 있음');
