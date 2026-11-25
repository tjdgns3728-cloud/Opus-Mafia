// 시간 설정: 실제 방은 assets/settings.json이 코드의 기본값을 덮어쓴다(2026-11-18: 코드만 2분으로 바꿔 실제로는 60초였던 일).
// 실제 방과 같이 settings.json을 넣어 만든 판의 시간과, 화면 글의 시간이 맞는지 확인. 사용: node timing_test.js <저장소 경로>
const path=require('path'),fs=require('fs');const root=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg'),dir=path.join(root,'scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG;const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const settings=JSON.parse(fs.readFileSync(path.join(root,'assets','settings.json'),'utf8'));
let x=5;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:'주민'+i,bot:i>0})),rng,settings);
ok(s.cfg.gatheringSeconds===60,'실제 방의 처음 회관 대화 1분 (지금 '+s.cfg.gatheringSeconds+'초)');
ok(s.cfg.planSeconds===60,'실제 방의 행동 선택 1분 (지금 '+s.cfg.planSeconds+'초)');
/* 2026-11-23 사용자: 이야기 글은 시간을 멈추지 않고 채팅 시간으로 40, 행동 1분 */ok(s.cfg.readSeconds===40,'실제 방의 이야기·채팅 시간 40 (지금 '+s.cfg.readSeconds+')');
const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8'),world=fs.readFileSync(path.join(dir,'00World.js'),'utf8'),ses=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');
ok(ui.includes("gathering:'회관 대화 · 처음 1분'")&&ui.includes('처음 1분은 모두 회관에서 이야기합니다')&&ui.includes('첫 도입 뒤 회관 대화 1분'),'화면 글: 처음 회관 대화 1분');
ok(ui.includes("plan:'행동 선택 · 공통 1분'")&&ui.includes('공통 1분 안에'),'화면 글: 행동 선택 1분');
ok(!/40초/.test(ui+world+ses),'화면·진행 글에 예전의 "40초"가 남지 않음');
// 재판과 한 판 최대 시간(2026-11-18 사용자 선택: 대화 3분, 최종 변론·표결 2분, 개정 동의 1분, 최대 90분)
ok(s.cfg.trialSeconds===180&&s.cfg.voteSeconds===120,'실제 방의 재판 대화 3분·최종 변론과 표결 2분 (지금 '+s.cfg.trialSeconds+'·'+s.cfg.voteSeconds+'초)');
ok(s.cfg.hardSeconds===5400,'실제 방의 한 판 최대 90분 (지금 '+s.cfg.hardSeconds/60+'분)');
ok(ses.includes("phase(r,'consent',60,"),'재판 개정 동의 1분');
ok(ui.includes("trial:'재판 대화 · 3분'")&&ui.includes("vote:'최종 변론·표결 · 2분 · 첫 30초 뒤 모두 표를 내면 끝'")&&ui.includes('재판 도입 뒤 대화 3분(')&&ui.includes('최종 변론·표결 2분(첫 30초는 최종 변론, 그 뒤 모두 표를 내면 바로 끝). 이전')/* 2026-11-25 사용자: 모두 표를 내면 일찍 끝 */&&ui.includes('1분이 끝나면 집계합니다'),'화면 글: 재판 3분·2분, 동의 1분');
/* 2026-11-23 새 방향: 진행 글을 짧게 */ok(world.includes('재판 대화 3분(한 사람이 한 번씩 30초 연장) → 최종 변론·표결 2분(첫 30초는 최종 변론, 그 뒤 모두 표를 내면 바로 끝).')&&world.includes('재판 동의 받기: 1분')&&ui.includes("vote:'최종 변론·표결 · 2분 · 첫 30초 뒤 모두 표를 내면 끝'"),'진행 글: 재판 3분·2분, 동의 1분');
