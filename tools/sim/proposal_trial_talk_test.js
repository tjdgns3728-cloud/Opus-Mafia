// 제안 C1(사용자 허락 전, proposal/trial-talk-early-end): 재판 대화는 1분이 지난 뒤 말할 수 있는 사람이 모두 「말 마침」을 누르면 일찍 끝난다. 사용: node proposal_trial_talk_test.js <저장소 경로>
const fs=require('fs'),path=require('path'),os=require('os');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
const tmp=path.join(os.tmpdir(),'noir_trial_talk_test_'+process.pid+'.jsonl');process.env.NOIR_DEFEAT_FILE=tmp;try{fs.unlinkSync(tmp);}catch{}
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src.replace(/\}\)\(\);\s*$/,'globalThis.__t={talkDone,botTalk,ROOM};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen,T=globalThis.__t;let seed=151;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=(humans=0,mode='on')=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:i>=humans})),rng);S.start(s);s.day=3;s.turn=0;s.ai.mode=mode;for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
 const c={id:'c1',target:'p1',by:'p2',reason:'시험 재판',evidence:[],support:[],day:s.day};s.cases.push({...c,closed:false});C.beginTrial(s,c);s.opened=100;return s;};
const room=(s,time,answer)=>{const afters=[],prompts=[];return {state:s,random:rng,engine:{time},afters,prompts,ai:{mode:s.ai.mode,async ask(p,info){prompts.push({p,purpose:info?.purpose});const a=answer?answer(p):null;return a==null?{ok:false}:{ok:true,text:JSON.stringify(a)};}},closed:false,after(sec,fn){afters.push({sec,fn});},closePhase(){this.closed=true;},refresh(){},record(){return true;},phase(){},seat(){return {on:true};}};};
// 1. 1분 전에 모두 누르면 1분까지 기다렸다 끝, 1분 뒤면 곧 끝
{const s=fresh();s.trial.talkDone=C.trialTalkers(s).map(p=>p.id);const r=room(s,120);ok(T.talkDone(r)===true&&r.afters[0]?.sec===40,'열린 뒤 20초에 모두 말 마침 → 40초 뒤(1분)에 끝냄 · '+r.afters.map(a=>a.sec));
 T.talkDone(r);ok(r.afters.length===1,'끝내기 예약은 한 번만');r.afters[0].fn();ok(r.closed&&s.feed.some(e=>/모두 「말 마침」을 눌러 재판 대화를 일찍 끝냈습니다/.test(e.text||'')),'끝날 때 모두에게 알림 글');}
{const s=fresh();s.trial.talkDone=C.trialTalkers(s).map(p=>p.id);const r=room(s,170);T.talkDone(r);ok(r.afters[0]?.sec===1,'1분이 지난 뒤 모두 누르면 1초 뒤 끝');}
{const s=fresh();s.trial.talkDone=C.trialTalkers(s).slice(1).map(p=>p.id);const r=room(s,170);ok(T.talkDone(r)===false&&!r.afters.length,'한 사람이라도 누르지 않으면 끝내지 않음(피고 포함)');}
{const s=fresh();s.trial.talkDone=C.trialTalkers(s).map(p=>p.id);const r=room(s,170);T.talkDone(r);s.stage='vote';r.afters[0].fn();ok(!r.closed,'단계가 이미 바뀌었으면 닫지 않음');}
// 2. 말할 수 있는 사람: 살아 있는 사람(피고 포함). AI를 끈 판에서는 사람 자리만
{const s=fresh();const ts=C.trialTalkers(s).map(p=>p.id);ok(ts.length===8&&ts.includes(s.trial.target),'AI를 켠 판: 살아 있는 8명 모두(피고 포함)');
 s.players[3].hp=0;ok(!C.trialTalkers(s).some(p=>p.id==='p3'),'쓰러진 사람(체력 0)은 세지 않음');}
{const s=fresh(2,'off');ok(C.trialTalkers(s).map(p=>p.id).join()==='p0,p1','AI를 끈 판: 사람 자리만 셈');s.trial.talkDone=['p0','p1'];const r=room(s,170);ok(T.talkDone(r)===true,'AI를 끈 판: 사람이 모두 누르면 끝냄');}
// 3. 사람 화면: 버튼·진행 표시·눌러진 뒤 모양, AI 화면도 같은 글과 버튼
{const s=fresh(1);const v=C.view(s,'p0'),scr=NS.read(v);ok(/\[말 마침\]/.test(scr.text),'재판 대화 화면에 [말 마침] 버튼');ok(v.progress?.label==='말 마침'&&v.progress.done===0&&v.progress.total===8,'진행 표시 "말 마침 0 / 8명"');
 const m=NS.press(v,scr,{'버튼':'말 마침'});ok(m.req?.type==='talk-done','[말 마침]을 누르면 talk-done 요청');
 s.trial.talkDone=['p0'];const v2=C.view(s,'p0'),scr2=NS.read(v2);ok(v2.trial.talkDone===true&&/\[말 마침 · 다른 사람을 기다리는 중\]/.test(scr2.text)&&scr2.buttons.find(b=>b.do==='talk-done')?.disabled,'누른 뒤에는 "말 마침 · 다른 사람을 기다리는 중"(누를 수 없음)');
 ok(C.view(s,'p0').progress.done===1,'진행 표시 1명');ok(/1분이 지난 뒤 모두 「말 마침」을 누르면 일찍 끝납니다/.test(scr.text),'재판 대화 안내 글에 일찍 끝나는 조건');}
// 4. 요청 처리(사람·AI 같은 길): 말 마침 → 모두 누르면 예약
{const s=fresh(1),r=room(s,170);const seatOf=p=>p.seat||p.id;let res=null;try{res=T.ROOM.act(r,seatOf(s.players[0]),{type:'talk-done'});}catch(e){res={err:String(e)};}
 ok(res?.ok&&s.trial.talkDone?.includes('p0'),'사람 자리가 [말 마침]을 누르면 기록됨 · '+JSON.stringify(res).slice(0,80));
 const again=T.ROOM.act(r,seatOf(s.players[0]),{type:'talk-done'});ok(again?.ok&&s.trial.talkDone.filter(x=>x==='p0').length===1,'두 번 눌러도 한 번만');
 s.stage='vote';const bad=T.ROOM.act(r,seatOf(s.players[0]),{type:'talk-done'});ok(!bad?.ok,'재판 대화가 아니면 누를 수 없음');}
// 5. AI를 켠 판: 회관의 모든 AI가 한 번씩 같은 화면으로 물음을 받고, [말 마침]을 누를 수 있음
(async()=>{const s=fresh(1);for(const p of s.players)p.location='hall';let n=0;const r=room(s,170,()=>({'말':['가람','나래','다온','라희','마루','바다','사랑'][n++%7]+' 쪽 이야기를 더 듣고 싶습니다.','누름':[{'버튼':'말 마침'}]}));T.botTalk(r,'trial');
 ok(r.afters.length===7,'회관의 AI 7명 모두 차례가 잡힘(전에는 둘) · '+r.afters.length);for(const a of r.afters)await a.fn();
 ok(r.prompts.length===7&&r.prompts.every(x=>x.purpose==='재판 대화'&&/\[말 마침\]/.test(x.p)&&/"누름"/.test(x.p)),'물음마다 사람과 같은 화면(버튼 포함)과 누름 칸');
 ok(s.players.filter(p=>p.bot).every(p=>s.trial.talkDone?.includes(p.id)),'AI가 [말 마침]을 누름');ok(!s.talkClosing,'사람 자리가 누르지 않았으면 끝내지 않음');
 ok(s.feed.filter(e=>e.kind==='speech').length>=7,'AI의 말이 채팅에 나옴');
 const t=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8'),w=fs.readFileSync(path.join(dir,'00World.js'),'utf8'),se=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');
 ok(t.includes("trial:'재판 대화 · 3분 · 1분 뒤 모두 말 마침이면 끝'")&&t.includes('③ 재판 대화 3분(1분이 지난 뒤 모두 말 마침을 누르면 바로 끝) ④')&&t.includes('재판 도입 뒤 대화 3분(한 사람이 한 번 30초 추가 가능, 1분이 지난 뒤 모두 말 마침을 누르면 바로 끝)'),'단계 이름·규칙 글 두 곳');
 ok(w.includes('재판 대화 3분(한 사람이 한 번씩 30초 연장, 1분이 지난 뒤 모두 말 마침을 누르면 바로 끝) →')&&se.includes("'재판 대화는 1분이 지난 뒤 모두 「말 마침」을 누르거나 시간이 끝나면 끝납니다.'"),'진행 글·안내 오류 글');
 try{fs.unlinkSync(tmp);}catch{}})();
