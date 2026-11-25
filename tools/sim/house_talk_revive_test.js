// 2026-11-25 사람 두 자리 판: 쓰러진 사람의 집에 찾아간 의사가 말을 하면 골목(alley 'talk')으로 빠져 살리기가 "같은 장소에 쓰러진 사람이 있어야 합니다."로 막혔다.
// 집 안에 (숨지 않은) 다른 사람이 있으면 그 집 안에서 말하고, 집에 혼자일 때만 예전처럼 골목으로 나간다. 공격한 본인 줄의 주어, 도움을 청한 뒤 쓰러진 사람 안내도 확인.
// 사용: node house_talk_revive_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const classes={};globalThis.WebEngine={room(){},Component:class{},define(n,c){classes[n]=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const sessionSrc=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(sessionSrc.replace(/\}\)\(\);\s*$/,'globalThis.__v={spoken};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,V=globalThis.__v,UI=classes.TRPGUI;let seed=331;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.houseId=null;p.hidden=false;delete p.alley;p.used={big:false,small:false};}return s;};
const room=s=>({state:s,ai:{mode:'off'},after(){},random:rng,refresh(){},engine:{time:0}});
const heard=(s,n0,id)=>s.feed.slice(n0).some(e=>e.kind==='speech'&&(e.to||[]).includes(id));
const run=(s,plans,r=rng)=>{s.plans=plans;for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};const n0=s.feed.length;C.announceClashes?.(s);s.stage='plan';C.resolveBig(s,r);return s.feed.slice(n0);};
const setDowned=(s,host)=>{host.location='home';host.houseId=null;host.hp=0;host.downed={left:1};};

// 1. 쓰러진 사람의 집에 찾아간 의사가 말해도 그 집 안에 남고, 살리기를 고를 수 있고, 살릴 수 있다
{const s=fresh(),doc=s.players.find(p=>p.role==='doctor'),host=s.players.find(p=>p.id!==doc.id&&p.team==='town');setDowned(s,host);doc.location='home';doc.houseId=host.id;
 const other=s.players.find(p=>p.id!==doc.id&&p.id!==host.id&&p.team==='town');other.location='home';other.houseId=host.id;
 const n0=s.feed.length;V.spoken(room(s),doc.id,'괜찮소? 내가 왔소.');
 ok(!doc.alley&&C.sameSpace(s,doc,host)&&C.sameSpace(s,host,doc),'찾아간 집에서 말해도 골목으로 빠지지 않고 쓰러진 사람과 같은 곳(서로 보임)');
 ok(heard(s,n0,other.id)&&!heard(s,n0,s.players.find(p=>p.location==='hall').id),'같은 집에 있는 사람이 듣고, 다른 곳 사람은 못 들음');
 ok(C.choices(s,doc.id,'big').some(a=>a.type==='revive'&&a.target===host.id),'말한 뒤에도 의사에게 살리기 선택지');
 const out=run(s,{[doc.id]:{type:'revive',target:host.id}},()=>0.001);
 ok(!host.downed&&host.hp===1&&out.some(e=>/눈을 뜹니다/.test(e.text||'')),'살리기 성공(주사위가 좋을 때) — 쓰러진 사람이 일어남');}
// 1-대조: 예전처럼 골목으로 나가 있으면 같은 곳이 아니다(고치기 전 버그의 모양)
{const s=fresh(),doc=s.players.find(p=>p.role==='doctor'),host=s.players.find(p=>p.id!==doc.id&&p.team==='town');setDowned(s,host);doc.location='home';doc.houseId=host.id;doc.alley='talk';
 ok(!C.sameSpace(s,doc,host)&&!C.choices(s,doc.id,'big').some(a=>a.type==='revive'),'대조: 골목에 있으면 살리기 선택지 없음(고치기 전 판의 모양)');}
// 2. 집에 혼자일 때 말하면 예전처럼 골목으로 나가고, 골목에서 말한 사람끼리 듣는다
{const s=fresh(),a=s.players[2],b=s.players[3];for(const p of [a,b]){p.location='home';p.houseId=null;}const r=room(s);
 V.spoken(r,a.id,'누구 없소?');ok(a.alley==='talk','혼자 집에서 말하면 골목으로(예전 규칙 그대로)');
 const n0=s.feed.length;V.spoken(r,b.id,'여기 있소.');ok(b.alley==='talk'&&heard(s,n0,a.id),'다른 집에 혼자 있던 사람도 말하면 골목으로 나와 서로 들음');}
// 3. 숨어 있는 손님은 집 안 사람으로 치지 않는다(숨은 사람 때문에 행동이 달라지지 않음)
{const s=fresh(),host=s.players[4],guest=s.players[5];host.location='home';host.houseId=null;guest.location='home';guest.houseId=host.id;guest.hidden=true;
 V.spoken(room(s),host.id,'아무도 없나.');ok(host.alley==='talk','숨은 손님만 있으면 예전처럼 골목으로');}
// 4. 내 집에 (보이는) 손님이 있으면 집주인도 집 안에서 말하고 손님이 듣는다
{const s=fresh(),host=s.players[4],guest=s.players[5];host.location='home';host.houseId=null;guest.location='home';guest.houseId=host.id;
 const n0=s.feed.length;V.spoken(room(s),host.id,'어서 오시오.');ok(!host.alley&&heard(s,n0,guest.id),'손님이 있는 내 집에서는 집 안에서 말하고 손님이 들음');}
// 5. 같은 집에서 피를 흘리는 사람에게도 손님에 대한 [사람에게 하는 일]이 남는다(손님이 말한 뒤에도)
{const s=fresh(),host=s.players.find(p=>p.team==='town'),guest=s.players.find(p=>p.id!==host.id&&p.team==='town');host.location='home';host.houseId=null;host.hp=3;host.bleeding=true;guest.location='home';guest.houseId=host.id;
 V.spoken(room(s),guest.id,'피가 나는군.');const opts=[...C.choices(s,host.id,'big'),...C.choices(s,host.id,'small')].filter(a=>a.target===guest.id);
 ok(!guest.alley&&opts.length>0,'손님이 말한 뒤에도 집주인에게 손님을 대상으로 한 선택지('+opts.map(a=>a.type).join(',')+')');}
// 6. 공격한 본인의 공격 시도 줄에 주어
{const s=fresh(),att=s.players.find(p=>p.team==='mafia'),vic=s.players.find(p=>p.team==='town'),by=s.players.find(p=>p.id!==att.id&&p.id!==vic.id);for(const p of s.players)p.location='tavern';
 const out=run(s,{[att.id]:{type:'attack',target:vic.id,weapon:'fist'}});const mine=out.filter(e=>(e.to||[]).includes(att.id)&&/공격 시도\(/.test(e.text||'')),theirs=out.filter(e=>(e.to||[]).includes(by.id)&&!(e.to||[]).includes(att.id)&&/공격 시도\(/.test(e.text||''));
 ok(mine.some(e=>new RegExp('당신이 '+vic.name+'에게 공격 시도\\(').test(e.text)),'공격한 본인: "당신이 '+vic.name+'에게 공격 시도(…)"');
 ok(!mine.some(e=>new RegExp('(^|\\n|\\])'+vic.name+'에게 공격 시도').test(e.text)),'본인 줄에 주어 없는 줄이 남지 않음');
 ok(theirs.length===0||theirs.every(e=>!/당신이 /.test(e.text)),'곁의 사람 줄은 그대로(본인 줄을 받지 않음)');}
// 7. 도움을 청한 뒤 쓰러진 사람 안내
{const s=fresh(),host=s.players.find(p=>p.team==='town');setDowned(s,host);const mk=v=>{const u=Object.create(UI.prototype);Object.assign(u,{now:{view:v,room:'',round:0},sound:{enabled:false},selected:null,tab:'self',draft:'',chatMode:'say',overlay:null,feedTab:'story',peopleTab:'players',typing:new Map(),stayEpoch:v.epoch});return u.play(v);};
 const before=mk(C.view(s,host.id));ok(/한 번 도움을 청할 수 있습니다\./.test(before),'청하기 전: "한 번 도움을 청할 수 있습니다."');
 ok(!C.callHelp(s,host.id),'도움 청하기');const after=mk(C.view(s,host.id));ok(/도움을 청했습니다\. 누군가 찾아와 주기를 기다립니다\./.test(after)&&!/한 번 도움을 청할 수 있습니다\./.test(after),'청한 뒤: "도움을 청했습니다. 누군가 찾아와 주기를 기다립니다."');}
