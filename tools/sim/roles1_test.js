// 직업 고침 1(2026-11-24 사용자 "탐정 같은 경우는 추적하기를 대상이 어디에 있던 할 수 있게 해주세요", "의사만 치료할 수 있게 하고 사람을 살릴 수 있게 해주세요", "죽은 사람을 살리는게 아니라 죽어가는 사람을요").
// 사용: node roles1_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=5;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.hidden=false;p.used={big:false,small:false};}const town=s.players.filter(p=>p.team==='town');for(const p of s.players)if(['doctor','detective'].includes(p.role))p.role='reporter';town[0].role='detective';town[1].role='doctor';return {s,det:town[0],doc:town[1],other:town[2]};};
// 1. 탐정은 다른 곳에 있는 사람도 추적, 다른 직업은 같은 곳만
{const {s,det,other}=fresh(),far=s.players.find(p=>p!==det&&p!==other);far.location='tavern';
 ok(C.choices(s,det.id,'big').some(a=>a.type==='track'&&a.target===far.id),'탐정: 술집에 있는 '+far.name+' 추적하기가 보임');
 ok(!C.validate(s,det.id,{type:'track',target:far.id},'big'),'탐정: 다른 곳 추적을 받음');
 ok(!C.choices(s,other.id,'big').some(a=>a.type==='track'&&a.target===far.id)&&!!C.validate(s,other.id,{type:'track',target:far.id},'big'),'다른 직업: 다른 곳 추적은 없음');
 s.turn=2;ok(!!C.validate(s,det.id,{type:'track',target:far.id},'big'),'밤에는 탐정도 추적할 수 없음');s.turn=0;
 const v=C.view(s,det.id),scr=NS.read(v),m=NS.press(v,scr,{'버튼':'사람에게 하는 일','고른 것':['추적하기',far.name]});ok(m.req?.action?.type==='track'&&m.req.action.target===far.id,'사람 화면: 사람에게 하는 일 → 추적하기 → '+far.name);
 // 추적이 이기면 상대가 있는 곳으로 따라가 무엇을 했는지 본다
 s.plans={[det.id]:{type:'track',target:far.id}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,()=>0.99);
 ok(s.feed.some(e=>e.to.includes(det.id)&&new RegExp(far.name+'의 뒤를 밟').test(e.text||'')),'추적 결과 글이 탐정에게 남음: '+(s.feed.filter(e=>e.to.includes(det.id)&&/뒤를 밟/.test(e.text||'')).at(-1)?.text||'없음'));}
// 2. 치료는 의사만
{const {s,doc,other}=fresh(),hurt=s.players.find(p=>p!==doc&&p!==other);hurt.hp=4;doc.items.medicine=1;other.items.medicine=1;
 ok(C.choices(s,doc.id,'big').some(a=>a.type==='heal'&&a.target===hurt.id),'의사: 치료하기가 보임');
 ok(!C.choices(s,other.id,'big').some(a=>a.type==='heal'),'의사가 아니면 치료하기가 없음');other.location=hurt.location='clinic';ok(!!C.validate(s,other.id,{type:'heal',target:hurt.id},'big'),'의사가 아니면 진료소에서도 치료를 받지 않음');}
// 3. 쓰러져 죽어 가는 사람을 살리는 것은 의사만
{const {s,doc,other}=fresh(),d=s.players.find(p=>p!==doc&&p!==other);d.hp=0;C.death(s,d,'공격');s.stage='plan';
 ok(d.downed&&C.choices(s,doc.id,'big').some(a=>a.type==='revive'&&a.target===d.id),'의사: 쓰러진 '+d.name+' 살리기가 보임');
 ok(!C.choices(s,other.id,'big').some(a=>a.type==='revive')&&!!C.validate(s,other.id,{type:'revive',target:d.id},'big'),'의사가 아니면 살리기가 없고 받지 않음');
 const t=NS.read(C.view(s,other.id)).text;ok(/치료는 의사만 할 수 있습니다/.test(t)&&/같은 곳의 의사가 큰 행동으로 살려 볼 수 있습니다/.test(t),'게임 정보에 의사만 치료·살리기');
 C.nextTurn(s);ok(s.feed.some(e=>/의사가 (다음 )?큰 행동으로 살려 볼 수 있습니다/.test(e.text||'')),'다음 때에 쓰러진 사람 알림이 "의사가 … 살려 볼 수 있습니다"');}
