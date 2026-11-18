// AI 자리의 패배기록(2026-11-19 사용자): 진 AI 자리가 쓰고, 고치지 않고 쌓이며, 판을 시작할 때 자리마다 꼬리표별로 무작위로 받는지.
// 가짜 AI(정해진 답)와 임시 기록 파일로 본다. 사용: node defeats_test.js <저장소 경로>
const fs=require('fs'),path=require('path'),os=require('os');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
const tmp=path.join(os.tmpdir(),'noir_defeats_test_'+process.pid+'.jsonl');process.env.NOIR_DEFEAT_FILE=tmp;try{fs.unlinkSync(tmp);}catch{}
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
const src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src.replace(/\}\)\(\);\s*$/,'globalThis.__d={loadDefeats,saveDefeat,assignDefeats,defeatsFor,writeDefeat,writeEndDefeats,aiVotes,aiConsent,verdictScene};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,D=globalThis.__d;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=3;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['사람','도현','서아','시온','하준','나린','이안','수현'].map((n,i)=>({id:'p'+i,name:n,bot:i>0})),rng);S.start(s);s.day=3;s.turn=0;return s;};
const room=(s,answer)=>{const rec=[],prompts=[];return {state:s,random:rng,rec,prompts,ai:{mode:'on',async ask(p,info){prompts.push({p,purpose:info?.purpose});const a=answer(info?.purpose,p);return a==null?{ok:false}:{ok:true,text:JSON.stringify(a)};}},record(b){rec.push(b);return true;},refresh(){},closePhase(){this.closed=true;},phase(){},after(){}};};
const wait=()=>new Promise(r=>setTimeout(r,20));
(async()=>{
 // 1. 진 AI 자리가 쓰고, 고치지 않고 쌓인다
 {const s=fresh(),p=s.players.find(q=>q.bot&&q.team==='town');p.hp=0;p.deathCause='재판 처형';
  const r=room(s,purpose=>purpose==='패배기록'?{situation:'처음 회관에서 폭약을 꺼냈다',did:'NPC 앞에서 꺼냈다',result:'고발당해 처형됐다',cause:'확인: NPC가 봤다. 추정: 말없이 꺼내 의심받았다',shows:'NPC 앞에서 말없이 꺼내면 고발당했다',tags:['폭약','재판','없는꼬리표']}:null);
  await D.writeDefeat(r,p,p.deathCause);await wait();
  const saved=D.loadDefeats();ok(saved.length===1&&saved[0].situation==='처음 회관에서 폭약을 꺼냈다'&&saved[0].why==='재판 처형','죽은 AI 자리가 쓴 기록이 그대로 쌓임');
  ok(saved[0].tags.join()==='폭약,재판','꼬리표는 정해진 목록 안에서만');
  ok(r.prompts[0]&&/명령이나 규칙으로 쓰지 않는다/.test(r.prompts[0].p)&&/확인한 것과 추정으로 나눠서/.test(r.prompts[0].p),'기록은 경험으로(확인과 추정을 나눠, 명령으로 쓰지 않게) 쓰게 함');
  ok(r.rec.some(b=>b.event==='defeat'),'게임 기록에도 남김');
  await D.writeDefeat(r,p,p.deathCause);ok(D.loadDefeats().length===1,'한 판에 한 자리는 한 번만');}
 // 2. 판 끝: 진 편에 남은 AI 자리도 쓴다, 이긴 편은 쓰지 않는다
 {const s=fresh();s.result={team:'town'};const r=room(s,()=>({situation:'마피아로 살아남았지만 편이 졌다',did:'숨었다',result:'외부 지원이 왔다',cause:'추정: 너무 조용했다',shows:'조용히 있으면 졌다',tags:['숨기']}));
  const before=D.loadDefeats().length;D.writeEndDefeats(r);await wait();await wait();const added=D.loadDefeats().slice(before);
  ok(added.length===s.players.filter(p=>p.bot&&p.team==='mafia').length&&added.every(d=>d.team==='mafia'&&d.why==='편이 짐'),'판이 끝나면 진 편(마피아)의 AI 자리만 씀');}
 // 3. AI를 끄면 쓰지 않는다
 {const s=fresh(),p=s.players.find(q=>q.bot);const r=room(s,()=>({situation:'x',tags:['기타']}));r.ai.mode='off';const n=D.loadDefeats().length;await D.writeDefeat(r,p,'공격');ok(D.loadDefeats().length===n,'AI를 끈 판에서는 쓰지 않음');}
 // 4. 판을 시작할 때 자리마다 꼬리표별로 무작위로 넷까지
 {for(let i=0;i<8;i++){const tag=['습격','변장','고발','표','추적','회관 대화','영입','지키기'][i];D.saveDefeat({record(){return true;}},{id:'t'+i,situation:'상황'+i,did:'',result:'',cause:'',shows:'보여 줌'+i,tags:[tag]});}
  const s=fresh(),r=room(s,()=>null);D.assignDefeats(r);const sets=Object.values(s.defeatSets);
  ok(sets.length===7&&sets.every(l=>l.length===4&&new Set(l.map(d=>d.id)).size===4),'컴퓨터 자리 일곱마다 서로 다른 기록 넷');
  ok(new Set(sets.map(l=>l.map(d=>d.id).sort().join())).size>1,'자리마다 받은 기록이 다름(성향이 갈림)');
  ok(!s.players.find(p=>!p.bot)||!s.defeatSets[s.players.find(p=>!p.bot).id],'사람 자리에는 주지 않음');
  const p=s.players.find(q=>q.bot),txt=D.defeatsFor(s,p);ok(/지난 판에서 진 AI가 남긴 패배기록/.test(txt)&&/같은 점과 다른 점을 가려 읽는다/.test(txt)&&s.defeatSets[p.id].every(d=>txt.includes(d.shows)),'지시문에 그 자리가 받은 기록을 그때의 일로 넣음');
  ok(r.rec.some(b=>b.event==='defeat-sets'),'누가 어떤 기록을 받았는지 게임 기록에 남김');
  const v=JSON.stringify(C.view(s,s.players[0].id));ok(!v.includes('보여 줌'),'다른 사람의 화면에는 기록이 가지 않음');}
 // 5. 재판 동의와 표도 AI로, 답이 없으면 규칙으로
 {const s=fresh(),t=s.players[2];s.cases.push({id:'c1',day:s.day,closed:false,target:t.id,by:s.players[3].id,reason:'수상',reasons:[],evidence:[],support:[],responses:{},order:1});for(const o of C.alive(s)){o.knownCases??=[];o.knownCases.push('c1');}
  C.beginConsent(s,s.cases[0]);const p=s.players.find(q=>q.bot&&q.id!==t.id),r=room(s,purpose=>purpose==='재판 동의'?{agree:true}:null);await D.aiConsent(r,s.cases[0],p,false);
  ok(s.cases[0].responses[p.id]===true,'AI가 답한 대로 동의(규칙 판단은 반대였음)');
  const q=s.players.find(o=>o.bot&&o.id!==t.id&&o.id!==p.id),r2=room(s,()=>null);await D.aiConsent(r2,s.cases[0],q,false);ok(s.cases[0].responses[q.id]===false,'AI가 답하지 못하면 규칙 판단(반대)으로');
  C.beginTrial(s,s.cases[0]);s.stage='vote';const r3=room(s,purpose=>purpose==='재판 표'?{vote:'innocent'}:null);D.aiVotes(r3);await wait();await wait();
  const bots=C.alive(s).filter(o=>o.bot&&!o.masked&&o.id!==t.id);ok(bots.every(o=>s.trial.votes[o.id]==='innocent'),'표도 AI가 답한 대로');}
 // 7. 판결로 처형된 AI 자리: 판결 직후(단계 vote, 재판 비었음)에는 화면을 읽을 수 없으니 판결 장면이 시작된 뒤에 쓴다(2026-11-19 세 판에서 처리 안 된 오류 4번)
 {const s=fresh(),t=s.players.find(q=>q.bot&&q.team==='town');s.cases.push({id:'c7',day:s.day,closed:false,target:t.id,by:s.players[3].id,reason:'수상',reasons:[],evidence:[],support:[],responses:{},order:1});
  C.beginConsent(s,s.cases[0]);C.beginTrial(s,s.cases[0]);s.stage='vote';for(const o of C.alive(s))s.trial.votes[o.id]='guilty';C.judge(s);
  const errs=[],h=e=>errs.push(e);process.on('unhandledRejection',h);const r=room(s,purpose=>purpose==='패배기록'?{situation:'재판에서 처형됐다',did:'변론했다',result:'유죄',cause:'추정: 근거가 약했다',shows:'변론만으로는 표가 바뀌지 않았다',tags:['재판']}:null);
  r.engine={time:0};const before=D.loadDefeats().length;D.verdictScene(r,()=>{});await wait();await wait();process.off('unhandledRejection',h);
  ok(t.hp<=0&&s.stage==='verdict'&&errs.length===0,'판결 장면에서 처리 안 된 오류 없음');ok(D.loadDefeats().slice(before).some(d=>d.name===t.name&&d.situation==='재판에서 처형됐다'),'처형된 AI 자리가 판결 장면이 시작된 뒤 기록을 씀');}
 // 6. AI를 켜면 컴퓨터 자리 모두 AI로
 ok(src.includes('const selected=group.map(p=>p.id);'),'AI를 켜면 한 턴에 두 자리가 아니라 컴퓨터 자리 모두 AI로');
 try{fs.unlinkSync(tmp);}catch{}
})();
