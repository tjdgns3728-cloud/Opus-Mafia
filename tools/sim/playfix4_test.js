// 2026-11-16 밤 시험 플레이에서 찾아 고친 것. 사용: node playfix4_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(name,cls){globalThis.__UI=cls;}};
let src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');src=src.replace(/\}\)\(\);\s*$/,'globalThis.__t={seekConsent,vote,cannedTalk,fallback};})();');eval(src);
eval(fs.readFileSync(path.join(dir,'20Interface.js'),'utf8'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,T=globalThis.__t,UI=globalThis.__UI;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=7;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=1;s.turn=1;s.stage='plan';for(const p of s.players)p.location='hall';return s;};
const fakeRoom=s=>({state:s,engine:{time:0},random:rng,ph:null,phase(name,o){this.ph=o;},after(){},refresh(){},seat(){return {on:true};},record(){},end(){},closePhase(){const o=this.ph;this.ph=null;o?.done?.();}});

// 1. NPC가 낸 고발 이유도 이름 뒤 조사를 맞춘다(동의 창은 고발 이유를 그대로 보여 준다)
{const s=fresh(),p=s.players.find(p=>p.name==='나래');const c=C.npcAccuse(s,p,'npc:bellringer','종지기','나래이 작은 교회에서 숨겨 둔 폭약을 꺼내는 것을 종지기이 보았다.');
 ok(c&&c.reason==='나래가 작은 교회에서 숨겨 둔 폭약을 꺼내는 것을 종지기가 보았다.','NPC 고발 이유의 조사: '+(c?.reason||'없음'));}

// 2. 현장에서 붙잡힌 고발은 동의 창(30초 응답)을 거치지 않고 바로 소집한다
{const s=fresh(),p=s.players.find(p=>p.team==='mafia');C.npcAccuse(s,p,'npc:bellringer','종지기',p.name+'이 작은 교회에서 숨겨 둔 폭약을 꺼내는 것을 종지기가 보았다.');
 const r=fakeRoom(s);let doneCalled=false;T.seekConsent(r,()=>{doneCalled=true;});
 ok(s.stage!=='consent'&&s.trial?.target===p.id,'붙잡힌 고발은 동의를 묻지 않고 재판으로 감 (단계 '+s.stage+')');
 ok(s.cases.find(c=>c.target===p.id)?.status==='현장 고발로 개정','재판 상태: '+s.cases.find(c=>c.target===p.id)?.status);
 // 2-1. 폭약을 꺼내다 NPC에게 붙잡힌 재판은 폭약을 찾아낸 시민도 걸린다(60판에서 시민 대상 45건). 시민 편 컴퓨터 자리는 전처럼 자기가 본 것으로 정한다
 T.vote(r);const votes=s.trial.votes;const town=s.players.filter(o=>o.team==='town'&&o.hp>0),mates=s.players.filter(o=>o.team==='mafia'&&o.id!==p.id);
 ok(town.every(o=>votes[o.id]==='innocent'),'폭약 붙잡힘 재판: 본 것이 없는 시민 편 컴퓨터 자리는 무죄 ('+town.map(o=>votes[o.id]).join(',')+')');
 ok(mates.every(o=>votes[o.id]==='innocent'),'폭약 붙잡힘 재판: 같은 편 컴퓨터 자리는 무죄');
 // 2-2. 재판 대화: 아는 것이 없는 시민 편은 NPC가 본 일을 그대로 말한다("직접 본 사람이 없다면"이라고 하지 않는다)
 const line=T.cannedTalk(s,town.find(o=>!o.known.some(k=>k.about===p.id)),'trial');ok(/종지기가 본 것은 폭약을 꺼낸 일입니다/.test(line)&&!/직접 본 사람이 없다면/.test(line),'재판 대화: '+line);
 // 2-3. 피고 컴퓨터 자리는 NPC가 본 일을 부정하지 않는다
 const def=T.cannedTalk(s,p,'trial');ok(/폭약을 꺼낸 것은 맞습니다/.test(def)&&!/하지 않았습니다/.test(def),'피고의 말: '+def);}

// 2-4. 여럿이 보는 앞에서 사람을 공격해 붙잡힌 재판은 시민 편 컴퓨터 자리가 유죄, 같은 편은 무죄
{const s=fresh(),[a,mate]=s.players.filter(p=>p.team==='mafia'),[v,w1,w2]=s.players.filter(p=>p.team==='town');
 s.cases.push({id:'c901',day:s.day,submittedAt:'',closed:false,target:a.id,by:w1.id,reason:a.name+'이 여러 사람이 보는 앞에서 '+v.name+'을 공격했다.',reasons:[],evidence:[],support:[w1.id,w2.id],responses:{},order:s.serial,caught:true,caughtKind:'attack'});
 const r=fakeRoom(s);T.seekConsent(r,()=>{});ok(s.trial?.target===a.id,'공격 붙잡힘도 동의 없이 재판');T.vote(r);
 ok(s.players.filter(o=>o.team==='town'&&o.hp>0).every(o=>s.trial.votes[o.id]==='guilty'),'공격 붙잡힘 재판: 시민 편 컴퓨터 자리 모두 유죄');ok(s.trial.votes[mate.id]==='innocent','공격 붙잡힘 재판: 같은 편은 무죄');}

// 2-3. 붙잡힌 재판이 아니면 시민 편 컴퓨터 자리는 전처럼 직접 본 것이 있을 때만 유죄
{const s=fresh(),t=s.players.find(p=>p.team==='mafia'),by=s.players.find(p=>p.team==='town');s.cases.push({id:'c900',day:s.day,submittedAt:'',closed:false,target:t.id,by:by.id,reason:'수상합니다',reasons:[],evidence:[],support:[by.id],responses:{},order:s.serial});
 C.beginTrial(s,s.cases.at(-1));const r=fakeRoom(s);T.vote(r);ok(s.players.filter(o=>o.team==='town'&&o.id!==by.id).every(o=>s.trial.votes[o.id]==='innocent'),'보통 재판: 본 것이 없는 시민 편은 무죄');}

// 3. 컴퓨터 자리가 고발할 때 자기가 본 기록을 근거로 붙인다
{const s=fresh();s.turn=0;const p=s.players.find(o=>o.team==='town'),t=s.players.find(o=>o.team==='mafia');p.location='hall';const k=C.learn(s,p.id,t.name+'이 당신을 단검으로 공격했다.',t.id,'직접 목격','observed');
 const a=T.fallback(fakeRoom(s),p.id,'big');ok(a?.type==='file'&&a.target===t.id&&Array.isArray(a.facts)&&a.facts[0]===k.id,'고발에 자기가 본 기록을 붙임: '+JSON.stringify(a&&{type:a.type,facts:a.facts}));
 ok(!C.validate(s,p.id,a,'big'),'붙인 근거로도 신청이 받아들여짐');}

// 4. 장소 칸에 같은 줄이 두 번 나오지 않는다
{const s=fresh(),p=s.players[0];s.epoch=5;for(let i=0;i<2;i++)C.emit(s,[p.id],'environment','시온에게 상처가 보입니다.',{localEvent:true});
 s.envSent={};C.emit(s,[p.id],'notice','시온에게 상처가 보입니다.',{localEvent:true});C.emit(s,[p.id],'notice','시온에게 상처가 보입니다.',{localEvent:true});
 const env=C.view(s,p.id).environment;ok(env.filter(t=>/시온에게 상처가 보입니다/.test(t)).length===1,'장소 칸의 같은 줄은 한 번만: '+env.slice(2).join(' / '));}

// 5. 작은 행동 없이 선택을 마치면 "작은 행동을 마쳤습니다"를 쓰지 않는다
{const s=fresh(),p=s.players[0];s.stage='small';const before=s.feed.length;C.smallAct(s,p.id,{type:'wait'},rng);ok(!s.feed.slice(before).some(e=>/작은 행동을 마쳤습니다/.test(e.text)),'작은 행동을 고르지 않으면 마쳤다는 글이 없음');}

// 6. 같은 때에 먼저 폭약을 꺼내 갔으면 그 사실을 말한다
{const s=fresh(),[a,b]=s.players.filter(p=>p.team==='mafia');s.turn=0;/* 숨긴 자리는 판마다 다르다. 마피아에게 가져가기가 생기는 장소를 찾는다 */let act=null;for(const pl of Object.keys(C.places)){a.location=pl;b.location=pl;act=S.choices(s,b,'big').find(o=>o.sceneKey==='take');if(act)break;}
 ok(!!act,'폭약 가져가기 선택지가 생기는 장소: '+(act?C.places[b.location].name:'없음'));
 for(const bomb of s.scenario.bombs.filter(x=>!String(x.where).startsWith('carry:')))if(S.choices(s,b,'big').some(o=>o.sceneKey==='take'))bomb.where='carry:'+a.id;const err=S.validate(s,b,act,'big');ok(/먼저 누군가 꺼내 간 뒤였습니다/.test(err||''),'먼저 꺼내 갔을 때의 글: '+err);}

// 7. 해석·안내 문장이 남지 않는다
{const all=['00World','04Incidents','05Scenarios','08StoryFlow'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n');
 for(const t of ['무죄라는 뜻은 아닙니다','이동은 행동을 쓰지 않습니다','왼쪽 목록에서 같은 편은','판결만으로 숨은 진영이','마피아라는 뜻은 아닙니다','흔적만으로 누가 공격했는지는','폭약이 사라졌다는 뜻은 아닙니다','개 짖는 소리뿐','또 있다는 뜻입니다','밖의 소리만으로 사람의 얼굴이나'])ok(!all.includes(t),'남지 않음: '+t);}

// 8. 현장의 일·인물·물건에 하는 일(옛 이름 이어서 행동하기) 버튼: 하나뿐이면 그 행동 이름, 여럿이면 묶음 이름과 가짓수
{const lab=UI.prototype.sceneGroupLabel;const one=[{type:'scene',sceneKey:'story-action',label:'암거래 상인 공격 · 맨손'}],two=[{type:'scene',sceneKey:'incident',label:'자루를 살핀다'},{type:'scene',sceneKey:'incident',label:'상인에게 누구 짐인지 묻는다'}];
 ok(lab.call({},one[0],one)==='암거래 상인 공격 · 맨손','하나뿐인 인물·물건에 하는 일 → '+lab.call({},one[0],one));
 ok(lab.call({},two[0],two)==='현장의 일 · 2가지','둘인 현장의 일 → '+lab.call({},two[0],two));
 ok(lab.call({},{type:'scene',sceneKey:'forge',label:'x'},[])==='출입 기록 위조하기','출입 기록 위조는 그대로');
 const three=['맨손','단검','권총'].map(w=>({type:'scene',sceneKey:'story-action',label:'암거래 상인 공격 · '+w}));ok(lab.call({},three[0],three)==='암거래 상인 공격 · 3가지','같은 일의 갈래 셋 → '+lab.call({},three[0],three));
 const mix=['도일 공격 · 맨손','도일 곁에서 지키기','해먼드 곁에서 지키기'].map(l=>({type:'scene',sceneKey:'story-action',label:l}));ok(lab.call({},mix[0],mix)==='인물·물건에 하는 일 · 3가지','섞인 묶음 → '+lab.call({},mix[0],mix));}

// 10. 아이의 목격담은 판마다 한 곳: 교회에 폭약이 있어도 아이가 다른 곳을 봤으면 "교회 종탑 밑" 장면(맨발의 아이)은 나오지 않는다
{const D=globalThis.NoirStory,def={id:'childWitness',guard:'chapelSpot'};
 const s1=fresh();s1.scenario.spots=['chapel','medbox'];s1.scenario.rumor={...s1.scenario.rumor,child:'medbox'};ok(!D.guard(s1,def),'폭약은 교회·진료소, 아이는 진료소를 봄 → 교회 장면 없음');
 const s2=fresh();s2.scenario.spots=['chapel','medbox'];s2.scenario.rumor={...s2.scenario.rumor,child:'chapel'};ok(!!D.guard(s2,def),'아이가 교회를 봄 → 교회 장면 있음');
 const s3=fresh();s3.scenario.spots=['chapel','cart'];s3.scenario.rumor={...s3.scenario.rumor,child:undefined};ok(!!D.guard(s3,def),'아이가 본 곳이 따로 없으면 처음 숨긴 곳(교회)');}

// 11. 이야기 행동이 같은 때에 먼저 일어난 일로 할 수 없게 되면 보이는 까닭을 말한다
{const D=globalThis.NoirStory,s=fresh(),p=s.players.find(o=>o.team==='town');s.turn=0;const m=D.merchant.state(s),n=D.npc(s,'merchant');p.location='rail';n.location='rail';m.credit[p.id]=1;p.money=9;
 const buy=S.choices(s,p,'small').find(o=>o.sceneKey==='story-action'&&o.verb==='buyItem');ok(!!buy,'상인에게서 살 것이 있음: '+(buy?.label||'없음'));
 if(buy){const g=D.merchant.GOODS[buy.item];m.stock[buy.item]=0;ok(S.validate(s,p,buy,'small')==='상인에게 '+C.pp(g.name,'이','가')+' 남아 있지 않습니다.','물건이 다 떨어졌을 때: '+S.validate(s,p,buy,'small'));m.stock[buy.item]=3;p.money=0;ok(S.validate(s,p,buy,'small')==='돈이 모자랍니다.','돈이 모자랄 때: '+S.validate(s,p,buy,'small'));}
 const s2=fresh(),q=s2.players.find(o=>o.team==='town');s2.turn=0;const doyle=D.npc(s2,'doyle');q.location=doyle.location;const act=S.choices(s2,q,'big').find(o=>o.sceneKey==='story-action'&&o.npc==='doyle');ok(!!act,'도일에게 하는 일이 있음: '+(act?.label||'없음'));
 if(act){doyle.location=doyle.location==='hall'?'tavern':'hall';ok(S.validate(s2,q,act,'big')==='도일이 이 자리에 없습니다.','도일이 떠났을 때: '+S.validate(s2,q,act,'big'));doyle.location=q.location;doyle.hp=0;ok(S.validate(s2,q,act,'big')==='도일은 이미 쓰러져 있습니다.','도일이 쓰러졌을 때: '+S.validate(s2,q,act,'big'));}}

// 9. 띄어쓰기
{const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(!/큰 행동1회|사람1명당|제삼자1명당|하루1회/.test(ui),'숫자 앞 띄어쓰기(큰 행동 1회, 사람 1명당, 하루 1회)');}
