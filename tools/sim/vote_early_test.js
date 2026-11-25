// 2026-11-25 사용자 "모두 표를 내면 표결을 일찍 끝내기가 맞습니다.": 최종 변론·표결은 표를 낼 수 있는 사람이 모두 내면 끝난다.
// 사용: node vote_early_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src.replace(/\}\)\(\);\s*$/,'globalThis.__v={voteDone,checkedReady};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,V=globalThis.__v;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=21;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='vote';s.opened=100;s.trial={id:'c1',target:'p0',votes:{}};s.ready=[];return s;};
const room=s=>({state:s,engine:{time:105},afters:[],closed:false,after(sec,fn){this.afters.push(fn);},closePhase(){this.closed=true;},run(){const a=this.afters;this.afters=[];for(const f of a)f();}});
// 1. 한 사람이라도 표를 안 냈으면 끝나지 않고, 모두 내면 1초 뒤 끝남
{const s=fresh(),r=room(s);for(const p of s.players.slice(1,7))s.trial.votes[p.id]='guilty';ok(!V.voteDone(r)&&(r.run(),!r.closed),'표를 낼 사람 7명 중 6명만 냄: 표결 계속');
 s.trial.votes.p7='abstain';ok(V.voteDone(r),'마지막 사람이 기권으로 냄: 모두 냄');r.run();ok(r.closed,'모두 내면 1초 뒤 표결을 끝냄');}
// 2. 피고·죽은 사람·얼굴 가린 사람은 기다리지 않음
{const s=fresh(),r=room(s);s.players[1].hp=0;s.players[2].masked=true;for(const p of s.players.slice(3))s.trial.votes[p.id]='innocent';ok(V.voteDone(r),'피고·죽은 사람·얼굴 가린 사람 빼고 모두 내면 끝');r.run();ok(r.closed,'끝남');}
// 3. 그 사이 단계가 바뀌었으면 닫지 않음, 같은 재판에 두 번 예약하지 않음
{const s=fresh(),r=room(s);for(const p of s.players.slice(1))s.trial.votes[p.id]='guilty';V.voteDone(r);V.voteDone(r);ok(r.afters.length===1,'끝내기 예약은 한 번만');s.stage='verdict';r.run();ok(!r.closed,'단계가 이미 바뀌었으면 닫지 않음');}
// 4. 단계를 연 뒤 확인(checkedReady)에서도 모두 냈으면 끝냄(AI를 끈 컴퓨터 자리는 단계를 열 때 표를 냄)
{const s=fresh(),r=room(s);r.engine.time=103;for(const p of s.players.slice(1))s.trial.votes[p.id]='guilty';V.checkedReady(r);r.run();ok(r.closed,'단계를 연 뒤 확인에서 모두 냈으면 끝냄');}
// 5. 사람·AI 표가 지나는 처리에서 확인을 부름, 안내 글
ok(src.includes('s.trial.votes[id]=a.vote;voteDone(r);'),'표를 받을 때마다 모두 냈는지 확인');
const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(ui.includes("vote:'최종 변론·표결 · 2분 · 첫 30초 뒤 모두 표를 내면 끝'")&&ui.includes('첫 30초 뒤 모두 표를 내거나 시간이 끝나면 판결'),'화면 글: 모두 표를 내면 끝');
ok(src.includes("'재판 대화는 1분 뒤 25초 동안 아무도 말하지 않거나 시간이 끝나면 끝납니다.'"),'재판 대화는 [다음으로]로 끝나지 않음(제안 C1a: 조용하면 끝)');
