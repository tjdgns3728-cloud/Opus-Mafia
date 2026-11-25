// 2026-11-25 코드 검토가 찾은 이동 단계 시계 두 가지와 시작 거절 글. 사용: node move_clock_fix_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
let UI=null;globalThis.WebEngine={room(){},Component:class{},define(n,c){if(n==='TRPGUI')UI=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const clock={textContent:'',classList:{toggle(){},remove(){}}};
const ui=Object.create(UI.prototype);ui.el=id=>id==='chat-clock'?clock:null;ui.followStory=()=>{};ui.followChat=()=>{};ui.acknowledgeStory=()=>{};
const run=(left,view,seconds)=>{ui.engine={room:{left:()=>left}};ui.now={view,phase:{seconds}};try{ui.tick();}catch(e){}return clock.textContent;};
const base={stage:'move',epoch:5,cfg:{moveSeconds:15,moveWaitSeconds:30}};
ui.moveClock=null;ok(run(30,{...base},30).includes('0:15'),'처음부터 보면 0:15 · '+clock.textContent);
ui.moveClock=null;ok(run(20,{...base},30).includes('0:05'),'10초 지나 다시 불러와도 남은 5초(전: 0:10) · '+clock.textContent);
ui.moveClock=null;ok(run(14,{...base,ready:true},30).includes('갈 곳 마감'),'고르지 않고 마감으로 ready가 되면 갈 곳 마감(전: 갈 곳 정함) · '+clock.textContent);
ui.moveClock=null;ok(run(20,{...base,ready:true,myMove:'tavern'},30).includes('갈 곳 정함'),'고른 사람은 갈 곳 정함 · '+clock.textContent);
ui.moveClock=null;ok(run(10,{...base},10).includes('0:05'),'시간 배율 3(단계 10초)에서도 사람 마감 5초 · '+clock.textContent);
const ses=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');ok(ses.includes('지금 화면이 켜진 자리 ${n}명'),'시작 거절 글이 화면이 켜진 자리 수임을 알림');
