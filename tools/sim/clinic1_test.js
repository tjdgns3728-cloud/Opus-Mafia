// 진료소 고침(2026-11-24 사용자): 시작 소지금 시민 3·마피아 5, 진료소 재고 붕대 3·치료제 3, 지혈은 붕대를 씀(진료소에서나 의사가 하면 체력 +2), 간호사 치료(큰 행동, 소지금 2, 진료소 치료제 1개, 체력 +6, 출혈 멎음).
// 사용: node clinic1_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const settings=JSON.parse(fs.readFileSync(path.join(dir,'..','assets','settings.json'),'utf8'));
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=9;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng,settings);S.start(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='clinic';p.hidden=false;p.used={big:false,small:false};}const town=s.players.filter(p=>p.team==='town');for(const p of s.players)if(p.role==='doctor')p.role='reporter';town[0].role='doctor';return {s,doc:town[0],a:town[1],b:town[2]};};
const resolve=(s,plans)=>{s.plans={...plans};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,()=>0.99);};
// 1. 시작 소지금과 진료소 재고
{const {s}=fresh(),st=s.scenario.continuation;ok(s.players.every(p=>p.money===(p.team==='mafia'?5:3)),'시작 소지금 시민 3·마피아 5');ok(st.stock===3&&st.medStock===3,'진료소 재고 붕대 3·치료제 3');}
// 2. 지혈은 붕대를 씀, 진료소에서는 체력 +2
{const {s,a,b}=fresh();b.hp=5;b.bleeding=true;a.items.bandage=0;ok(!!C.validate(s,a.id,{type:'bandage',target:b.id},'small'),'붕대가 없으면 진료소에서도 지혈 불가');
 a.items.bandage=1;C.smallAct(s,a.id,{type:'bandage',target:b.id},()=>0.99);ok(a.items.bandage===0,'지혈하면 붕대 1개를 씀');ok(!b.bleeding&&b.hp===7,'진료소에서 지혈하면 출혈이 멎고 체력 +2 (5 → '+b.hp+')');}
// 3. 의사가 지혈하면 어디서든 체력 +2, 다른 사람이 진료소 밖에서 하면 체력 그대로
{const {s,doc,a,b}=fresh();for(const p of s.players)p.location='tavern';b.hp=5;b.bleeding=true;doc.items.bandage=1;C.smallAct(s,doc.id,{type:'bandage',target:b.id},()=>0.99);ok(!b.bleeding&&b.hp===7,'의사가 술집에서 지혈해도 체력 +2 (→ '+b.hp+')');
 const c=s.players.find(p=>p!==doc&&p!==a&&p!==b);c.hp=5;c.bleeding=true;a.items.bandage=1;C.smallAct(s,a.id,{type:'bandage',target:c.id},()=>0.99);ok(!c.bleeding&&c.hp===5,'의사가 아닌 사람이 진료소 밖에서 지혈하면 체력 그대로');}
// 4. 간호사 치료: 큰 행동, 소지금 2, 진료소 치료제 1개, 체력 +6, 출혈 멎음
{const {s,a}=fresh(),st=s.scenario.continuation;a.hp=3;a.bleeding=true;const o=C.choices(s,a.id,'big').find(x=>x.type==='nurseCare');ok(!!o&&/소지금 2 · 체력 \+6/.test(o.label),'진료소에서 큰 행동에 간호사 치료: '+(o?.label||'없음'));ok(!C.choices(s,a.id,'small').some(x=>x.type==='nurseCare'),'작은 행동에는 없음');
 resolve(s,{[a.id]:{type:'nurseCare'}});ok(a.hp===9&&!a.bleeding&&a.money===1&&st.medStock===2,'치료받음: 체력 3 → '+a.hp+', 출혈 멎음, 소지금 3 → '+a.money+', 진료소 치료제 3 → '+st.medStock);}
// 5. 간호사 치료를 못 받는 때: 다치지 않음, 소지금 모자람, 치료제가 떨어짐, 진료소 밖
{const {s,a,b}=fresh(),st=s.scenario.continuation;ok(!!C.validate(s,a.id,{type:'nurseCare'},'big'),'다친 데가 없으면 받지 않음');a.hp=4;a.money=1;ok(/소지금 2/.test(C.validate(s,a.id,{type:'nurseCare'},'big')||''),'소지금이 2보다 적으면 받지 않음');a.money=3;st.medStock=0;ok(/떨어졌/.test(C.validate(s,a.id,{type:'nurseCare'},'big')||''),'진료소 치료제가 0이면 받지 않음');st.medStock=3;a.location='tavern';ok(!!C.validate(s,a.id,{type:'nurseCare'},'big'),'진료소 밖에서는 받지 않음');}
// 6. 같은 때 넷이 고르면 치료제 3개만큼만 치료받음
{const {s}=fresh(),st=s.scenario.continuation,four=s.players.slice(0,4);for(const p of four){p.hp=4;p.money=3;}resolve(s,Object.fromEntries(four.map(p=>[p.id,{type:'nurseCare'}])));ok(four.filter(p=>p.hp===10).length===3&&st.medStock===0,'넷 중 셋만 치료받고 진료소 치료제 0 ('+four.map(p=>p.hp).join(',')+')');}
// 7. 사람 화면: 버튼과 진료소 표, 게임 정보
{const {s,a}=fresh();a.hp=4;const v=C.view(s,a.id),scr=NS.read(v);const m=NS.press(v,scr,{'버튼':'간호사에게 치료받기'});ok(m.req?.action?.type==='nurseCare'&&m.req.slot==='big','사람 화면: [간호사에게 치료받기] 버튼을 누르면 큰 행동으로 냄'+(m.error?' ('+m.error+')':''));
 const rules=NS.rulebook(v);ok(/간호사에게 치료받을 수 있습니다\(큰 행동, 소지금 2, 체력 \+6/.test(rules)&&/시작 소지금은 시민 3, 마피아 5/.test(rules),'게임 정보에 간호사 치료와 시작 소지금');}
