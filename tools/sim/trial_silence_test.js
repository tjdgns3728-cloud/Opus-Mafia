// 제안(사용자 허락 전, proposal/trial-silence-end) C1a: 재판 대화(3분)는 첫 1분 뒤, 마지막 말(또는 시간 추가) 뒤 25초 동안 아무도 말하지 않으면 끝난다.
// AI 선택(버튼)에 기대지 않는다. 사람·AI 화면에 같은 안내와 남은 초가 나온다. 사용: node proposal_trial_silence_test.js <저장소 경로>
const fs=require('fs'),path=require('path'),os=require('os');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
const tmp=path.join(os.tmpdir(),'noir_trial_silence_test_'+process.pid+'.jsonl');process.env.NOIR_DEFEAT_FILE=tmp;try{fs.unlinkSync(tmp);}catch{}
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
let UI=null;globalThis.WebEngine={room(){},Component:class{},define(n,c){if(n==='TRPGUI')UI=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src.replace(/\}\)\(\);\s*$/,'globalThis.__t={quietWatch,quietCalc,spoken,ROOM};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen,T=globalThis.__t;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=31;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['사람','도현','서아','시온','하준','나린','이안','수현'].map((n,i)=>({id:'p'+i,name:n,bot:i>0})),rng);S.start(s);s.day=3;s.turn=0;s.scenario.discovered=true;
 for(const p of s.players){p.location='hall';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
 s.stage='trial';s.opened=100;s.trial={id:'c1',target:'p1',by:'p2',reason:'시험 재판',evidence:[],votes:{}};s.cases.push({...s.trial,day:s.day,closed:false,support:[]});return s;};
// 시간을 손으로 돌리는 방: after는 그 시각에 실행, closePhase는 닫힌 시각을 남긴다
const room=s=>{const r={state:s,random:rng,engine:{time:100,timeScale:1},q:[],closedAt:null,extended:0,ai:{mode:'off'},
 after(sec,fn){this.q.push({at:this.engine.time+sec,fn});},closePhase(){if(this.closedAt==null){this.closedAt=this.engine.time;s.stage='vote';}},extendPhase(sec){this.extended+=sec;return true;},refresh(){},record(){return true;},phase(){},seat(){return {on:true};},
 run(to){while(this.engine.time<to){this.engine.time=Math.round((this.engine.time+0.5)*10)/10;for(;;){const i=this.q.findIndex(e=>e.at<=this.engine.time);if(i<0)break;const [e]=this.q.splice(i,1);e.fn();}}}};return r;};
const said=(r,id,text)=>T.spoken(r,id,text,{});
const humanHtml=v=>{const u=Object.create(UI.prototype);Object.assign(u,{now:{view:v,room:'',round:0},sound:{enabled:false},selected:null,tab:'self',draft:'',chatMode:'say',overlay:null,feedTab:'story',peopleTab:'players',typing:new Map(),stayEpoch:v.epoch});return u.play(v);};

// 1) 아무도 말하지 않으면 첫 1분이 끝날 때(열린 뒤 60초) 끝난다
{const s=fresh(),r=room(s);T.quietWatch(r);r.run(159);ok(r.closedAt==null,'아무도 말하지 않아도 첫 1분(59초)은 이어짐');r.run(161);ok(r.closedAt!=null&&r.closedAt>=160&&r.closedAt<=161,'아무도 말하지 않으면 1분에 끝 ('+r.closedAt+')');
 ok(s.feed.some(e=>/25초 동안 아무도 말하지 않아 재판 대화를 마칩니다/.test(e.text||'')),'끝날 때 모두에게 알림');ok(s.trial.quietEnded===true,'조용해서 끝났다는 표시');}
// 2) 1분 가까이 말하면 마지막 말 뒤 25초까지 이어진다
{const s=fresh(),r=room(s);T.quietWatch(r);r.run(150);said(r,'p3','나는 그날 밤 집에 있었소.');r.run(170);ok(r.closedAt==null,'1분 뒤라도 마지막 말(150초) 뒤 25초 전에는 이어짐');r.run(176);ok(r.closedAt!=null&&r.closedAt>=175&&r.closedAt<=176,'마지막 말 뒤 25초에 끝 ('+r.closedAt+')');}
// 3) 일찍 말하고 조용하면 첫 1분에서 끝
{const s=fresh(),r=room(s);T.quietWatch(r);r.run(110);said(r,'p4','장화 크기가 맞지 않소.');r.run(161);ok(r.closedAt!=null&&r.closedAt<=161,'첫 1분 안에 말하고 조용하면 1분에 끝 ('+r.closedAt+')');}
// 4) 사람의 시간 추가(30초)도 조용함을 다시 센다
{const s=fresh(),r=room(s);T.quietWatch(r);r.run(158);const res=T.ROOM.act(r,'p0',{type:'extend-time'});ok(res?.ok&&r.extended===30,'시간 추가가 받아짐');r.run(170);ok(r.closedAt==null,'시간 추가(158초) 뒤 25초 전에는 이어짐');r.run(184);ok(r.closedAt!=null&&r.closedAt>=183,'시간 추가 뒤 25초 조용하면 끝 ('+r.closedAt+')');}
// 5) 다른 곳에서 한 말은 세지 않는다(재판은 회관)
{const s=fresh(),r=room(s);T.quietWatch(r);const P=s.players[5];P.location='tavern';r.run(150);said(r,P.id,'술집에서 혼잣말.');r.run(161);ok(r.closedAt!=null&&r.closedAt<=161,'회관 밖의 말은 조용함을 깨지 않음');}
// 6) 재판이 아니면 아무것도 하지 않는다
{const s=fresh(),r=room(s);s.stage='vote';T.quietWatch(r);r.run(200);ok(r.closedAt==null,'표결 단계에서는 끝내지 않음');}
// 7) 화면: 사람·AI가 같은 안내와 남은 초를 본다
{const s=fresh(),r=room(s);T.quietWatch(r);r.run(130);T.quietCalc(r);const v=C.view(s,'p0');ok(v.trial?.quiet?.left===30&&v.trial.quiet.n===25,'화면 정보: 조용하면 끝까지 30초 ('+JSON.stringify(v.trial?.quiet)+')');
 const h=humanHtml(v);ok(/data-quiet>조용하면 0:30 뒤 재판 대화 끝\(1분 뒤, 마지막 말 뒤 25초\)</.test(h),'사람 화면 시계 옆 안내');ok(h.includes('재판 대화 · 3분 · 1분 뒤 25초 조용하면 끝'),'단계 이름');
 const scr=NS.read(v);ok(/조용하면 0:30 뒤 재판 대화 끝/.test(scr.text),'AI 화면에도 같은 안내');
 const v2=C.view(s,'p3');ok(v2.trial?.quiet?.left===30,'AI 자리 화면 정보도 같음');}
// 8) 규칙 글
{const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8'),w=fs.readFileSync(path.join(dir,'00World.js'),'utf8');ok(ui.includes('③ 재판 대화 3분(1분 뒤 25초 동안 아무도 말하지 않으면 끝)')&&ui.includes('재판 도입 뒤 대화 3분(한 사람이 한 번 30초 추가 가능, 1분 뒤 25초 동안 아무도 말하지 않으면 끝)'),'규칙 글 두 곳');ok(w.includes('재판 대화 3분(한 사람이 한 번씩 30초 연장, 1분 뒤 25초 동안 아무도 말하지 않으면 끝)'),'진행 글');ok(C.config.trialMinSeconds===60&&C.config.trialQuietSeconds===25,'설정 값 60·25');}
try{fs.unlinkSync(tmp);}catch{}
