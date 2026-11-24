// 2026-11-25 사용자 "찾아가기+도움 청하기", "남의 집 찾아가는 기능은 주택가를 선택하고 자기 및 다른 사람 집을 선택할 수 있게 목록을 보여주세요",
// "예전처럼 자기집으로 가는 것이 아니고요" 확인. 사용: node house_visit_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=81;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='move';s.moveDone=null;for(const p of s.players){p.location='hall';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}return s;};
// 1. 이동 화면: [주택가]를 누르면 집 목록(내 집 · ○○의 집), 고른 집을 보냄
{const s=fresh(),me=s.players[1],v=C.view(s,me.id),scr=NS.read(v);
 ok(/■ 창 · \[주택가\]를 누르면 열리는 창/.test(scr.text)&&/어느 집으로 갑니까\?/.test(scr.text)&&/내 집/.test(scr.text)&&/가람의 집/.test(scr.text),'AI 화면: [주택가]가 여는 창에 집 목록');
 const m=NS.press(v,scr,{'버튼':'주택가','고른 것':['다온의 집']});ok(m.req?.action?.type==='move'&&m.req.action.place==='home'&&m.req.action.house==='p2','주택가 · 다온의 집 누름 → 그 집으로 가는 요청');
 const m2=NS.press(v,scr,{'버튼':'주택가','고른 것':[]});ok(!!m2.error,'집을 고르지 않으면 대신 고르지 않음(오류)');}
// 2. 남의 집으로 옮기면 집주인과 같은 곳, 쓰러져 있으면 의사가 살리기를 고를 수 있음
{const s=fresh(),doc=s.players.find(p=>p.role==='doctor'),host=s.players.find(p=>p.id!==doc.id&&p.team==='town');host.location='home';host.houseId=host.id;host.hp=0;host.downed={left:1};
 ok(!C.chooseMove(s,doc.id,{type:'move',place:'home',house:host.id}),'의사가 쓰러진 사람의 집을 고름');C.applyMoves(s,rng);
 ok(doc.location==='home'&&doc.houseId===host.id&&C.sameSpace(s,doc,host),'옮긴 뒤 집주인과 같은 곳');s.stage='plan';
 ok(C.choices(s,doc.id,'big').some(a=>a.type==='revive'&&a.target===host.id),'의사에게 살리기 선택지');
 ok(s.feed.some(e=>e.to.includes(doc.id)&&new RegExp(host.name+'의 집에 들어갔습니다').test(e.text)),'본인에게 "○○의 집에 들어갔습니다"');}
// 3. 내 집을 고르면 예전처럼 자기 집, 지금 있는 집은 목록에 없음
{const s=fresh(),me=s.players[3];ok(!C.chooseMove(s,me.id,{type:'move',place:'home',house:me.id}),'내 집 고름');C.applyMoves(s,rng);ok(me.location==='home'&&!me.houseId,'자기 집에 있음');
 s.stage='move';s.moveDone=null;const v=C.view(s,me.id);ok(!NS.read(v).text.includes('- 내 집')&&/가람의 집/.test(NS.read(v).text),'지금 있는 내 집은 목록에 없고 다른 집은 있음');
 ok(!!C.chooseMove(s,me.id,{type:'move',place:'home',house:me.id}),'지금 있는 집을 다시 고르면 갈 수 없음');ok(!C.chooseMove(s,me.id,{type:'move',place:'home',house:'p0'}),'주택가에 있어도 다른 집으로는 갈 수 있음');}
// 4. 이웃이 창밖으로 볼 수 있음
{let seen=false;for(let i=0;i<30&&!seen;i++){const s=fresh(),a=s.players[1],host=s.players[2],nb=s.players[4];host.location='home';host.houseId=host.id;nb.location='home';nb.houseId=nb.id;nb.stats.observe=10;C.chooseMove(s,a.id,{type:'move',place:'home',house:host.id});C.applyMoves(s,rng);seen=s.feed.some(e=>e.to.includes(nb.id)&&/창밖으로 나래가 다온의 집에 들어가는 것을 봤습니다/.test(e.text));}ok(seen,'주택가 이웃이 "창밖으로 ○○가 △△의 집에 들어가는 것을 봤습니다"');}
// 5. 쓰러진 사람: 도움 청하기(한 번), 같은 곳은 누구인지, 다른 곳은 어느 쪽인지
{const s=fresh(),d=s.players[5],nb=s.players[6],far=s.players[7];d.location='home';d.houseId=d.id;d.hp=0;d.downed={left:1};nb.location='home';nb.houseId=nb.id;s.stage='plan';
 const v=C.view(s,d.id),scr=NS.read(v);ok(/\[도움 청하기 · 한 번\]/.test(scr.text),'쓰러진 사람 화면에 [도움 청하기 · 한 번]');const m=NS.press(v,scr,{'버튼':'도움 청하기 · 한 번'});ok(m.req?.type==='call-help','누르면 도움 청하기 요청');
 ok(!C.callHelp(s,d.id),'도움을 청함');ok(s.feed.some(e=>e.to.includes(nb.id)&&e.text===('주택가 '+d.name+'의 집에서 도움을 청하는 신음 소리가 들립니다.')),'주택가 사람: 누구 집인지 들음');
 ok(s.feed.some(e=>e.to.includes(far.id)&&e.text==='주택가 쪽에서 누군가 도움을 청하는 소리가 들립니다.'),'다른 곳 사람: 어느 쪽인지만 들음');ok(!!C.callHelp(s,d.id),'두 번째는 안 됨');
 ok(!/\[도움 청하기/.test(NS.read(C.view(s,d.id)).text),'청한 뒤에는 버튼 없음');}
// 6. 주택가 안에서 집을 옮기면 "주택가에서 주택가로"를 쓰지 않음(2026-11-25 브라우저 확인에서 찾음)
{const s=fresh(),me=s.players[1],host=s.players[2];me.location='home';me.houseId=null;host.location='home';host.houseId=host.id;C.chooseMove(s,me.id,{type:'move',place:'home',house:host.id});const n0=s.feed.length;C.applyMoves(s,rng);const mine=s.feed.slice(n0).filter(e=>e.to.includes(me.id)).map(e=>e.text).join(' / ');ok(!/주택가에서 주택가로/.test(mine)&&/다온의 집에 들어갔습니다/.test(mine),'집에서 집으로: '+mine.slice(0,80));
 s.epoch++;/* 다음 때 */s.stage='move';s.moveDone=null;C.chooseMove(s,me.id,{type:'move',place:'home',house:me.id});const n1=s.feed.length;C.applyMoves(s,rng);const back=s.feed.slice(n1).filter(e=>e.to.includes(me.id)).map(e=>e.text).join(' / ');ok(/내 집으로 돌아왔습니다/.test(back)&&!/주택가에서 주택가로/.test(back),'남의 집에서 내 집으로: '+back.slice(0,60));}
