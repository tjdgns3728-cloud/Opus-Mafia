// 2026-11-25 C1 제안 판에서 찾음: 사람 화면의 재판 대화 [시간 30초 추가](시계 옆)가 AI 화면에 없었고, 재판 대화 AI 물음의 답은 {"말"}뿐이라 누를 수도 없었다.
// AI 화면에 사람과 같은 버튼(같은 이름·같은 켜짐/꺼짐)이 나오고, 누르면 사람과 같은 요청이 되는지, 재판 대화가 아닐 때는 없는지 본다. 사용: node ai_trial_extend_test.js <저장소 경로>
const fs=require('fs'),path=require('path'),os=require('os');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
const tmp=path.join(os.tmpdir(),'noir_trial_extend_test_'+process.pid+'.jsonl');process.env.NOIR_DEFEAT_FILE=tmp;try{fs.unlinkSync(tmp);}catch{}
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
let UI=null;globalThis.WebEngine={room(){},Component:class{},define(n,c){if(n==='TRPGUI')UI=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src.replace(/\}\)\(\);\s*$/,'globalThis.__t={botTalk,ROOM};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen,T=globalThis.__t;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=29;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=stage=>{const s=C.create(['사람','도현','서아','시온','하준','나린','이안','수현'].map((n,i)=>({id:'p'+i,name:n,bot:i>0})),rng);S.start(s);s.day=3;s.turn=0;s.scenario.discovered=true;
 for(const p of s.players){p.location='hall';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
 s.stage=stage;s.trial={id:'c1',target:'p1',by:'p2',reason:'시험 재판',evidence:[],votes:{}};s.cases.push({...s.trial,day:s.day,closed:false,support:[]});return s;};
const room=(s,answer)=>{const prompts=[],afters=[];return {state:s,random:rng,prompts,afters,engine:{time:100},extended:0,extendPhase(sec){this.extended+=sec;return true;},
 ai:{mode:answer?'on':'off',async ask(p,info){prompts.push({p,purpose:info?.purpose});const a=answer?answer(info?.purpose,p):null;return a==null?{ok:false}:{ok:true,text:JSON.stringify(a)};}},
 record(){return true;},refresh(){},closePhase(){},phase(){},after(sec,fn){afters.push(fn);},seat(){return {on:true};}};};
const humanHtml=(v)=>{const u=Object.create(UI.prototype);Object.assign(u,{now:{view:v,room:'',round:0},sound:{enabled:false},selected:null,tab:'self',draft:'',chatMode:'say',overlay:null,feedTab:'story',peopleTab:'players',typing:new Map(),stayEpoch:v.epoch});return u.play(v);};
const btn=(scr,re)=>scr.buttons.find(b=>re.test(b.label));
(async()=>{
 // 1) 재판 대화: 사람 화면에 버튼이 있으면 AI 화면에도 같은 이름으로, 켜진 채로
 {const s=fresh('trial'),P=s.players[3],v=C.view(s,P.id),scr=NS.read(v),h=humanHtml(v);const b=btn(scr,/^시간 30초 추가$/);
  ok(/data-do="extend-time"(?![^>]*disabled)[^>]*>시간 30초 추가</.test(h),'사람 화면(재판 대화)에 켜진 [시간 30초 추가]');
  ok(!!b&&!b.disabled&&/\[시간 30초 추가\]/.test(scr.text)&&!/\[시간 30초 추가\] \(지금 누를 수 없음\)/.test(scr.text),'AI 화면에도 같은 이름, 켜진 버튼 · '+(b?b.name:scr.buttons.map(x=>x.label).join('|')));
  ok(/■ 지금\n[\s\S]*\[시간 30초 추가\]/.test(scr.text)&&(scr.text.match(/\[시간 30초 추가\]/g)||[]).length===1,'버튼은 "지금" 칸에 한 번만');
  // 2) 누르면 사람과 같은 요청, 엔진이 30초 늘림
  const m=NS.press(v,scr,{'버튼':'시간 30초 추가'});ok(!m.error&&m.req?.type==='extend-time','누름 → {type:"extend-time"} 요청(사람 화면과 같음) · '+(m.error||JSON.stringify(m.req)));
  const r=room(s,null),res=T.ROOM.act(r,P.id,m.req);ok(res?.ok&&r.extended===30&&s.trial.extended.includes(P.id),'방에 넣으면 30초 늘고 이 사람이 썼다고 남음 · '+JSON.stringify(res));
  // 3) 다시 보면 사람처럼 꺼진 "시간 추가함", 누르면 오류
  const v2=C.view(s,P.id),scr2=NS.read(v2),h2=humanHtml(v2),b2=btn(scr2,/^시간 추가함$/);
  ok(/data-do="extend-time"\s+disabled>시간 추가함</.test(h2),'사람 화면: 쓴 뒤 꺼진 [시간 추가함]');
  ok(!!b2&&b2.disabled&&/\[시간 추가함\] \(지금 누를 수 없음\)/.test(scr2.text),'AI 화면: 쓴 뒤 꺼진 [시간 추가함] (지금 누를 수 없음)');
  const m2=NS.press(v2,scr2,{'버튼':'시간 추가함'});ok(!!m2.error&&!m2.req,'꺼진 버튼은 누를 수 없음 · '+m2.error);
  const res2=T.ROOM.act(r,P.id,{type:'extend-time'});ok(res2&&!res2.ok&&r.extended===30,'같은 사람이 또 요청하면 사람과 같은 오류 · '+res2?.error);
  // 다른 사람은 자기 몫이 있음(사람 화면과 같음)
  const Q=s.players[4],scrQ=NS.read(C.view(s,Q.id));ok(!!btn(scrQ,/^시간 30초 추가$/),'다른 사람 화면에는 아직 켜진 [시간 30초 추가]');}
 // 4) 재판 대화가 아닐 때는 사람·AI 모두 없음
 for(const st of ['vote','small','gathering']){const s=fresh(st),P=s.players[3],v=C.view(s,P.id),scr=NS.read(v),h=humanHtml(v);
  ok(!/data-do="extend-time"/.test(h)&&!scr.buttons.some(b=>b.do==='extend-time'),st+' 단계: 사람·AI 화면 모두 시간 추가 버튼 없음');}
 // 5) 쓰러지거나 체력이 0이면 사람처럼 없음
 {const s=fresh('trial'),P=s.players[3];P.hp=0;const v=C.view(s,P.id),scr=NS.read(v),h=humanHtml(v);ok(!/data-do="extend-time"/.test(h)&&!scr.buttons.some(b=>b.do==='extend-time'),'체력 0: 사람·AI 화면 모두 없음');}
 // 6) 재판 대화 AI 물음: 같은 누름 칸이 있고, 누르면 사람과 같은 요청으로 처리됨
 {const s=fresh('trial');const r=room(s,(purpose)=>purpose==='재판 대화'?{'누름':[{'버튼':'시간 30초 추가'}],'말':'시간이 더 필요합니다.'}:null);
  T.botTalk(r,'trial');for(const f of r.afters)await f();const pr=r.prompts.filter(q=>q.purpose==='재판 대화');
  ok(pr.length>=1&&pr.every(q=>/"누름":\[\{"버튼":""/.test(q.p)&&/\[시간 30초 추가\]/.test(q.p)),'재판 대화 물음에 누름 칸과 화면의 [시간 30초 추가] · 물음 '+pr.length);
  const used=(s.trial.extended||[]);ok(used.length===pr.length&&r.extended===30*pr.length,'AI가 누르면 사람처럼 한 사람당 한 번 30초 · '+used.join(',')+' / '+r.extended+'초');
  ok(s.feed.some(e=>/재판 시간을 30초 늘렸습니다/.test(e.text||'')),'모두에게 "재판 시간을 30초 늘렸습니다" 알림');}
 // 7) 회관 대화 물음은 그대로(말만)
 {const s=fresh('gathering');s.trial=null;const r=room(s,()=>({'말':'안녕하세요.'}));T.botTalk(r,'gathering');for(const f of r.afters)await f();const pr=r.prompts.filter(q=>q.purpose==='회관 대화');
  ok(pr.length>=1&&pr.every(q=>/JSON \{"말":"\.\.\."\}/.test(q.p)&&!/"누름"/.test(q.p)),'회관 대화 물음은 그대로 {"말"}만 · 물음 '+pr.length);}
 try{fs.unlinkSync(tmp);}catch{}
})();
