// 섭외할 수 있는 NPC(술집 주인·간호사·종지기·하숙집 주인)와 얼굴을 가린 새 조직원을 확인. 사용: node masked_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,D=globalThis.NoirStory;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=21;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const hi=()=>0.99,lo=()=>0.01;
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);
const st=s.scenario.continuation,gf=s.players.find(p=>p.role==='godfather'),mf=s.players.find(p=>p.role==='mafioso'),town=s.players.filter(p=>p.team==='town');
const got=(p,re)=>s.feed.some(e=>e.to.includes(p.id)&&re.test(String(e.text)));
const last=(p,re)=>s.feed.filter(e=>e.to.includes(p.id)&&re.test(String(e.text))).at(-1)?.text||'';
// 1. 새 NPC 넷이 각자의 자리에 있다
ok(['barkeep','nurse','bellringer','landlady'].every(k=>st.npcs[k]?.hp===10),'새로 섭외할 수 있는 NPC 넷: 술집 주인, 간호사, 종지기, 하숙집 주인');
ok(st.npcs.barkeep.location==='tavern'&&st.npcs.nurse.location==='clinic'&&st.npcs.bellringer.location==='chapel'&&st.npcs.landlady.location==='home','각자 낮의 자리에 있음');
ok(C.view(s,town[0].id).story.cast.length===8&&C.view(s,town[0].id).story.cast.every(n=>n.title),'NPC 명단 8명(2026-11-16 암거래 상인 더함), 모두 하는 일이 적혀 있음');
// 2. 끌어들이기 선택지: NPC마다 해 주는 일이 다르게 적힘
s.day=1;s.turn=1;s.stage='plan';s.scenario.discovered=true;s.scenario.mineClosed=true;/* 2026-11-19: 갱도가 닫혀 술집 주인·종지기·하숙집 주인이 흔들리는 때 */for(const p of s.players)p.location='hall';
gf.location='tavern';const optB=S.choices(s,gf,'big').find(a=>a.verb==='recruitNpc'&&a.npc==='barkeep');
ok(optB&&/어제 술집에 누가 왔는지/.test(optB.hint)&&/두 번 성공할 때마다/.test(optB.hint),'술집 주인 끌어들이기 설명: '+(optB?.hint||'없음').slice(0,80));
ok(!S.choices(s,gf,'big').some(a=>a.verb==='threatNpc'&&a.npc==='barkeep'),'술집 주인에게는 협박장(노조·회관용)을 보내지 않음');
// 3. 끌어들이기 전에는 간호사가 약상자 귀띔을 하고, 끌어들인 뒤에는 하지 않는다
s.scenario.spots=['medbox','barrel'];s.scenario.rumor={...s.scenario.rumor,medbox:true,barrel:true};/* 간호사가 약상자 이야기를 하는 판 */const [tA,tB,tC,tD]=town;tA.location='clinic';S.arrival(s,tA);/* 2026-11-23: NPC 말은 묻는 작은 행동 때만 */S.askNpc(s,tA,'nurse');ok(tA.npcHeard.includes('lead:medbox'),'끌어들이기 전: 간호사에게 물으면 약상자 이야기를 함');
// 4. 술집 주인 끌어들이기(실패 → 성공)
gf.faceCover=s.epoch;S.resolve(s,gf,optB,lo);gf.faceCover=null;/* 얼굴을 가리고 권해 거절당함(고발 대신 말만 퍼짐) */ok(!st.npcs.barkeep.recruited&&got(gf,/내 술집에서 그런 말 마시오/),'실패하면 술집 주인의 거절 대사');
S.resolve(s,gf,S.choices(s,gf,'big').find(a=>a.verb==='recruitNpc'&&a.npc==='barkeep'),hi);/* 2026-11-19: 판정은 한 번, 성공하면 바로 넘어옴 */
ok(st.npcs.barkeep.recruited&&st.recruitWins===1,'성공하면 우리 편, 성공 1번');
ok(got(gf,/내 귀는 당신들 것이오/)&&!got(gf,/외상만 지워 준다면/)&&got(gf,/내일 아침부터 어제 술집에 누가 왔는지/),'성공 대사(돈을 받는 말 없이)와 해 줄 일');
/* 2026-11-16부터 흔적은 후보 셋 가운데 하나(또는 없음) */ok(st.artifacts.some(a=>a.kind==='trace'&&['지워진 외상 장부','새 술통','영수증 조각'].includes(a.title)),'술집 주인을 끌어들이면 그 사람의 흔적 후보 가운데 하나가 남음');
// 술집 주인은 남이 물으면 우리 편 이름을 뺀다
tB.location='tavern';s.events.push({type:'move',day:s.day,turn:1,location:'tavern',actor:mf.id},{type:'move',day:s.day,turn:1,location:'tavern',actor:tC.id});
S.talk(s,tB,'npc:barkeep:who');const said=s.feed.filter(e=>e.kind==='speech'&&e.to.includes(tB.id)).at(-1)?.text||'';ok(said.includes(tC.name)&&!said.includes(mf.name),'끌어들인 술집 주인은 마피아 이름을 빼고 말함: '+said);
// 5. 간호사도 끌어들이면 약상자 귀띔이 끊기고, 붕대가 늘어난다
gf.location='clinic';const stock=st.stock;st.npcs.nurse.pressure=3;/* 협박 행동이 쌓인 간호사 */S.resolve(s,gf,S.choices(s,gf,'big').find(a=>a.verb==='recruitNpc'&&a.npc==='nurse'),hi);
ok(st.npcs.nurse.recruited&&st.recruitWins===2&&st.stock===stock,'간호사 끌어들임: 성공 2번, 진료소 붕대는 늘지 않음(2026-11-19 사용자 결정)');
ok(got(gf,/끌어들이기에 2번 성공했습니다\. 같은 편이 쓰러지면/),'두 번째 성공: 같은 편이 쓰러지면 새 조직원을 부른다고 알려 줌');
tD.location='clinic';tD.npcHeard=[];S.arrival(s,tD);ok(!tD.npcHeard.includes('lead:medbox'),'끌어들인 뒤: 간호사는 약상자 이야기를 하지 않음');
// 6. 이기는 조건: 술집 주인·간호사는 마피아로 세지 않는다. 해먼드는 센다
{const c=JSON.parse(JSON.stringify(s));for(const p of c.players.filter(p=>p.team==='town').slice(0,3))p.hp=0;ok(C.finish(c)===null,'끌어들인 술집 주인·간호사는 이기는 조건에서 마피아로 세지 않음');
 const c2=JSON.parse(JSON.stringify(s));for(const p of c2.players.filter(p=>p.team==='town').slice(0,3))p.hp=0;c2.scenario.continuation.npcs.mayor.recruited=true;ok(C.finish(c2)?.team==='mafia','끌어들인 해먼드는 마피아 한 명으로 셈');}
// 7. 낮의 모습을 남긴다(끌어들인 사람이 전할 소식)
for(const p of s.players)p.location='hall';tC.location='tavern';tD.location='clinic';tD.hp=4;tD.bleeding=true;D.afterActions(s,[],[]);
// 8. 대행자가 숨지고 밤이 되면 얼굴을 가린 조직원이 온다
mf.hp=0;mf.downed=null;mf.downedOnce=true;C.death(s,mf,'공격');
s.turn=2;S.nextChapter(s);const m=s.players.find(p=>p.masked);
ok(!!m&&m.seat===mf.id&&s.seatAs[mf.id]===m.id&&mf.handedTo===m.id,'죽은 대행자 자리가 새 조직원을 맡음: '+(m?.name||'없음'));
ok(m&&m.location==='hideout'&&m.team==='mafia'&&m.role==='masked'&&m.hp===10,'새 조직원은 본거지에서 시작');
ok(got(m,/당신은 이제 검은 복면입니다/)&&got(gf,/마을 밖에서 얼굴을 가린 사내가 본거지로 왔습니다/),'새 조직원과 같은 편에게 알림');
ok(!C.view(s,tA.id).people.some(p=>p.id===m.id),'시민의 명단에는 없음');
ok(C.view(s,gf.id).people.some(p=>p.id===m.id&&p.role==='masked'),'같은 편의 명단에는 있음(직업: 복면 조직원)');
ok(C.consentStatus(s,{support:[]}).total===C.alive(s).length-1,'재판 동의 인원에서 빠짐');
const raid=S.choices(s,m,'big').find(a=>a.type==='attack'&&a.target===tA.id&&a.weapon==='knife');ok(!!raid,'밤에는 시민의 집을 습격할 수 있음');
// 9. 불침번에게 맞서면 다치고, 복면이라 얼굴은 보이지 않는다
s.stage='plan';s.plans={};tA.items.club=1;tA.stats.fight=9;C.queue(s,tA.id,{type:'watch'});C.queue(s,m.id,{...raid});for(const p of C.alive(s).filter(p=>p.team==='town'&&p.id!==tA.id))C.queue(s,p.id,{type:'sleep'});
C.announceClashes(s);let y=5;C.resolveBig(s,()=>{y=(y*16807)%2147483647;return y/2147483647;});
ok(tA.known.some(k=>/얼굴을 천으로 가려 누군지는 보지 못했다/.test(k.text)),'불침번은 복면 사내가 들어온 것을 보지만 얼굴은 못 봄');
const fought=last(m,/복면 덕에 얼굴은 안 들킴/);ok(!!fought,'새 조직원에게: '+fought.slice(0,70));
// 10. 아침: 소식, 말발굽 소리, 낮에는 본거지에 숨어 있음
C.nextTurn(s);S.nextChapter(s);
const news=last(gf,/끌어들인 사람들의 보고/);ok(news.includes('술집 주인: 어제 술집에 온 사람은 '+tC.name)&&/간호사: 어제 진료소에 온 사람은 .*\(다침\)\(피를 흘림\)/.test(news),'아침에 끌어들인 사람들의 소식: '+news);
ok(got(m,/끌어들인 사람들의 보고/),'새 조직원도 소식을 받음');
ok(got(tB,/낯선 말발굽 소리/),'시민은 낯선 말발굽 소리 이야기를 들음');
if(m.hp>0){ok(m.location==='hideout'&&C.choices(s,m.id,'big').length===0&&!!C.validate(s,m.id,{type:'move',place:'hall'},'small')&&!C.canAct(s,m),'낮에는 본거지에 숨어 행동하지 않음');
 ok(C.watchable(s,m)&&C.canWatch(s,m,gf)&&!C.canWatch(s,m,tB),'낮에는 같은 편의 장면만 볼 수 있음');s.turn=2;ok(!C.watchable(s,m),'밤에는 관전하지 않고 움직임');s.turn=0;}
ok(C.canWatch(s,mf,gf)&&!C.canWatch(s,mf,tB),'죽은 마피아는 같은 편의 장면만 볼 수 있음');
{const dead=town.find(p=>p.hp===0&&!p.downed)||(()=>{const d=tC;d.hp=0;d.downed=null;d.downedOnce=true;C.death(s,d,'공격');return d;})();ok(C.canWatch(s,dead,tB)&&C.canWatch(s,dead,gf),'죽은 시민은 누구의 장면이든 볼 수 있음');}
// 11. 하숙집 주인은 간밤 복면 사내 이야기를 한다(끌어들이지 않았을 때)
const tE=town.find(p=>p.hp>0&&p.location==='home');/* 2026-11-23: NPC 말은 묻는 작은 행동 때만 */if(tE)S.askNpc(s,tE,'landlady');ok(!!tE&&got(tE,/얼굴을 천으로 가린 낯선 사내가 주택가 골목을 지나갔다/),'하숙집 주인에게 물으면 복면 사내를 본 이야기를 함');
// 12. 복면 조직원이 숨지면 이튿날 시신 이야기
m.hp=0;m.downed=null;C.death(s,m,'공격');ok(m.hp===0&&!m.downed&&m.deathCause,'복면 조직원은 쓰러짐 없이 바로 숨짐');
s.turn=2;S.nextChapter(s);C.nextTurn(s);S.nextChapter(s);ok(s.scenario.continuation.placeScenes.some(e=>/얼굴을 가린 낯선 사내의 시신 발견/.test(e.text)),'이튿날 아침 복면 사내의 시신 이야기');
// 13. 끌어들이기 두 번이 더 쌓이면, 다시 죽은 자리가 새 조직원을 맡는다
s.turn=1;s.stage='plan';gf.location='chapel';S.resolve(s,gf,S.choices(s,gf,'big').find(a=>a.verb==='recruitNpc'&&a.npc==='bellringer'),hi);ok(st.artifacts.some(a=>a.kind==='trace'&&['새 종줄','묵직한 헌금함','이름 적힌 쪽지'].includes(a.title)),'종지기를 끌어들이면 새 종줄 흔적');
gf.location='home';S.resolve(s,gf,S.choices(s,gf,'big').find(a=>a.verb==='recruitNpc'&&a.npc==='landlady'),hi);ok(got(gf,/오늘 밤 마을 밖에서 얼굴을 가린 조직원이 본거지로 옵니다/),'네 번째 성공: 오늘 밤 새 조직원이 온다고 알림');
s.turn=2;S.nextChapter(s);const m2=s.players.find(p=>p.masked&&p.hp>0);ok(!!m2&&m2.name==='회색 복면'&&s.seatAs[mf.id]===m2.id,'두 번째 새 조직원: '+(m2?.name||'없음'));
// 14. 컴퓨터 자리 대부도 NPC를 끌어들인다
s.turn=0;gf.location='hall';st.npcs.mayor.location='hall';st.npcs.mayor.houseId=null;const b=S.botAction(s,gf,'big');
{let n=0;for(let e=1;e<=6;e++){s.epoch=e;const a=S.botAction(s,gf,'big');if(a&&/^recruitNpc/.test(a.verb||''))n++;}ok(n===0,'컴퓨터 대부는 해먼드를 끌어들이지 않음(해먼드는 이기는 조건에 세므로 사람 대부만)');}
{st.npcs.miner.location='hall';st.npcs.miner.houseId=null;let n=0,who='';for(let e=1;e<=6;e++){s.epoch=e;const a=S.botAction(s,gf,'big');if(a&&/^recruitNpc/.test(a.verb||'')){n++;who=a.npc;}}ok(n>=2&&who==='miner','젊은 광부 앞의 컴퓨터 대부는 여섯 번 가운데 '+n+'번 끌어들이기를 고름');}
// 15. 서버 쪽: 죽은 대행자 자리의 화면·행동·말은 새 조직원에게 간다
{let def=null;globalThis.WebEngine={room:d=>{def=d;}};require(path.join(dir,'10Session.js'));
 const r={state:s,seat:()=>({on:true}),refresh(){},after(){},phase(){},closePhase(){},engine:{time:0},record(){},end(){},ai:{mode:'off'},random:rng,data:()=>({})};
 const alive=s.players.find(p=>p.masked&&p.hp>0);s.turn=2;s.stage='plan';
 const v=def.view(r,mf.id);ok(v.me.id===alive.id&&v.me.masked,'대행자 자리의 화면은 새 조직원의 화면');
 const t=town.find(p=>p.hp>0);let a=def.act(r,mf.id,{type:'watch',target:t.id});ok(a.ok===false,'밤의 새 조직원은 관전할 수 없음');
 s.turn=0;a=def.act(r,mf.id,{type:'watch',target:t.id});ok(a.ok===false&&/같은 편/.test(a.error),'낮에도 시민의 장면은 볼 수 없음');
 a=def.act(r,mf.id,{type:'watch',target:gf.id});ok(a.ok===true&&def.view(r,mf.id).watch?.id===gf.id,'낮에 같은 편의 장면은 볼 수 있음');
 s.turn=2;gf.location='hideout';gf.houseId=null;alive.location='hideout';def.chat(r,mf.id,{text:'오늘 밤은 술집 쪽으로 갑시다'});ok(s.feed.some(e=>e.kind==='speech'&&e.to.includes(gf.id)&&e.name===alive.name),'대행자 자리에서 한 말은 '+alive.name+'의 말로 들림');
 s.stage='vote';s.trial={target:t.id,votes:{}};a=def.act(r,mf.id,{type:'vote',vote:'guilty'});ok(a.ok===false,'새 조직원은 재판 표를 던질 수 없음');}
