// 밤 개편 확인. 사용: node night_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=21;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);return s;};
const toNight=s=>{s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
let s=fresh();toNight(s);
const mafia=s.players.filter(p=>p.team==='mafia'),town=s.players.filter(p=>p.team==='town');
ok(mafia.every(p=>p.location==='hideout'),'밤: 마피아는 본거지('+C.places.hideout.name+')');
ok(town.every(p=>p.location==='home'),'밤: 시민은 집');
ok(!s.feed.some(e=>String(e.text).includes('undefined')),'밤 시작 글에 빈 값 없음');
const tOpts=C.choices(s,town[0].id,'big').map(a=>a.type);/* 2026-11-24 사용자: 밤에 시민 누구나 남의 집 지키기 */ok(JSON.stringify([...new Set(tOpts)])==='["sleep","watch","shelter","guardHouse"]'&&tOpts.filter(t=>t==='guardHouse').length===s.players.filter(p=>p.hp>0&&p.id!==town[0].id&&!p.masked).length,'시민 밤 큰 행동: 잠·불침번·숨기·다른 사람마다 집 지키기 ('+[...new Set(tOpts)].join(',')+')');
ok(C.choices(s,town[0].id,'small').length===0,'시민 밤 작은 행동 없음');
ok(!!C.validate(s,town[0].id,{type:'move',place:'hall'},'big'),'시민은 밤에 이동 불가');
const mOpts=[...C.choices(s,mafia[0].id,'big'),...S.choices(s,mafia[0],'big')];
ok(!mOpts.some(a=>a.type==='attack'&&a.nightRaid)&&(()=>{const st=s.stage;s.stage='plan';const o=C.orgChoices(s,mafia[0].id);s.stage=st;return o.length>0;})(),'마피아: 밤 집 습격은 개인 선택지가 아니라 조직 습격 선택지(제안 F1)');
ok(!mOpts.some(a=>a.type==='move'&&a.place==='hideout'),'본거지로 가는 이동 선택지 없음');
ok(!!C.validate(s,town[0].id,{type:'move',place:'hideout'},'small'),'시민은 본거지로 갈 수 없음');
ok(!C.validate(s,mafia[0].id,{type:'move',place:'chapel'},'small'),'마피아 밤 무료 이동 가능(교회)');
ok(C.view(s,town[0].id).people.find(p=>p.id===mafia[0].id).location===null,'시민 화면에 마피아 위치(본거지) 안 보임');
// 습격 판정 반복: 숨기·불침번·잠자기
const tally={shelterMiss:0,shelterFound:0,watchRepel:0,watchLose:0,sleepHit:0,sleepHeal:0,watchSaw:0};
for(let i=0;i<300;i++){s=fresh();toNight(s);const m=s.players.find(p=>p.team==='mafia'),tw=s.players.filter(p=>p.team==='town');const [v,w,z]=tw;const stance=['shelter','watch','sleep'][i%3];
 s.plans={[m.id]:{type:'attack',target:v.id,weapon:'knife',nightRaid:true,flee:'stay'},[v.id]:{type:stance},[w.id]:{type:'watch'},[z.id]:{type:'sleep'}};z.hp=7;
 C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);const txt=s.feed.map(e=>e.text).join('\n');
 if(stance==='shelter'){if(/숨은 사람을 찾지 못하고/.test(txt))tally.shelterMiss++;if(/숨어 있던 .*찾아냈습니다/.test(txt))tally.shelterFound++;}
 if(stance==='watch'){if(/쫓아내고/.test(txt))tally.watchRepel++;if(/맞붙었지만 밀림/.test(txt))tally.watchLose++;}
 if(stance==='sleep'&&s.feed.some(e=>e.kind==='combat'))tally.sleepHit++;
 if(z.hp===8)tally.sleepHeal++;if(w.known.some(k=>/집에 들어가는 것을 봤다/.test(k.text)))tally.watchSaw++;}
console.log('   판정 횟수',JSON.stringify(tally));
ok(tally.shelterMiss>0&&tally.shelterFound>0,'숨기: 못 찾는 경우와 찾는 경우가 모두 나옴');
ok(tally.watchRepel>0&&tally.watchLose>0,'불침번: 물리치는 경우와 밀리는 경우가 모두 나옴(대결 판정)');
ok(tally.sleepHit>0,'잠든 사람은 습격당하면 공격이 이어짐');
ok(tally.sleepHeal>0,'습격받지 않고 잔 사람은 체력 1 회복');
ok(tally.watchSaw>0,'불침번은 다른 집 습격을 볼 수 있음');
// 아침: 본거지 → 주택가, 낮1 무료 이동
s=fresh();toNight(s);s.plans={};C.nextTurn(s);S.nextChapter(s);s.stage='plan';
ok(s.players.filter(p=>p.team==='mafia'&&p.hp>0).every(p=>p.location!=='hideout'),'아침: 본거지에 남은 마피아 없음(주택가로)');
const anyone=s.players.find(p=>p.team==='town');ok(!C.validate(s,anyone.id,{type:'move',place:'tavern'},'small'),'낮1: 시민도 행동 없이 한 번 이동 가능');
C.smallAct(s,anyone.id,{type:'move',place:'tavern'},rng);ok(anyone.location==='tavern'&&!anyone.used.small&&!anyone.used.big,'무료 이동 뒤에도 큰·작은 행동이 남음');
ok(!!C.validate(s,anyone.id,{type:'move',place:'clinic'},'small'),'무료 이동은 한 번만');
s.turn=1;s.epoch++;const another=s.players.find(p=>p.team==='town'&&p.id!==anyone.id);/* 2026-11-16 사용자 지시로 바뀜: 예전에는 "낮2에는 무료 이동 없음", 지금은 시간대가 바뀔 때마다 무료 이동, 큰 행동의 이동은 없음 */ok(!C.validate(s,another.id,{type:'move',place:'tavern'},'small'),'낮2에도 행동 없이 한 번 이동 가능');
ok(!!C.validate(s,another.id,{type:'move',place:'tavern'},'big')&&!C.choices(s,another.id,'big').some(a=>a.type==='move'),'큰 행동에는 이동이 없음');
ok(C.choices(s,another.id,'small').some(a=>a.type==='move'),'작은 행동 목록에 무료 이동이 있음');
s.turn=2;s.epoch++;ok(!!C.validate(s,another.id,{type:'move',place:'tavern'},'small')&&!C.choices(s,another.id,'small').some(a=>a.type==='move'),'밤에 시민은 이동할 수 없음');s.turn=1;
// 진료소 규칙
s=fresh();s.stage='plan';const doc=s.players.find(p=>p.role==='doctor'),nd=s.players.find(p=>p.role!=='doctor'&&p.team==='town'),hurt=s.players.find(p=>p!==nd&&p!==doc);hurt.hp=5;hurt.bleeding=true;nd.items.medicine=1;nd.items.bandage=0;nd.location=hurt.location='hall';
ok(!!C.validate(s,nd.id,{type:'heal',target:hurt.id},'big'),'의사가 아니면 진료소 밖에서 치료 불가');
ok(!!C.validate(s,nd.id,{type:'bandage',target:hurt.id},'small'),'진료소 밖에서는 붕대 없이 지혈 불가');
nd.location=hurt.location='clinic';ok(!!C.validate(s,nd.id,{type:'heal',target:hurt.id},'big'),'의사가 아니면 진료소에서도 치료 불가(2026-11-24 의사만 치료)');
ok(!!C.validate(s,nd.id,{type:'bandage',target:hurt.id},'small'),'진료소에서도 붕대 없이는 지혈 불가(2026-11-24 붕대를 씀)');
if(doc){doc.location='hall';hurt.location='hall';ok(!C.validate(s,doc.id,{type:'heal',target:hurt.id},'big'),'의사는 진료소 밖에서도 치료 가능');}
// 피곤함 확인
s=fresh();toNight(s);{const w=s.players.find(p=>p.team==='town'),z=s.players.filter(p=>p.team==='town')[1];w.hp=10;z.hp=7;s.plans={[w.id]:{type:'watch'},[z.id]:{type:'shelter'}};C.resolveBig(s,rng);
 ok(w.tired&&w.hp===5,'불침번을 서면 피곤함, 체력 10 → '+w.hp);ok(z.tired&&z.hp===4,'숨기도 피곤함, 체력 7 → '+z.hp);
 ok(C.view(s,w.id).people.find(p=>p.id===w.id).maxHp===5,'피곤하면 최대 체력 5');
 const r=C.check(w,'fight',rng,{label:'시험'});ok(r.terms.some(t=>t.label==='피곤함'&&t.value===-2),'피곤하면 주사위 판정 -2');
 w.hp=1;z.hp=2;s.day=2;s.turn=1;C.nextTurn(s);s.stage='plan';s.plans={[w.id]:{type:'sleep'}};C.resolveBig(s,rng);
 ok(!w.tired&&w.hp===2,'자면 피곤함이 풀리고 체력 1 → '+w.hp);ok(!z.tired&&z.hp===4,'행동을 안 고르면 잠든 것으로 침, 체력 2 → '+z.hp);
 const u=s.players.find(p=>p.team==='town'&&p!==w&&p!==z);ok(!u.tired,'잠잔 시민은 피곤하지 않음');
 const m=s.players.find(p=>p.team==='mafia');ok(!m.tired,'마피아는 피곤함 없음');}
