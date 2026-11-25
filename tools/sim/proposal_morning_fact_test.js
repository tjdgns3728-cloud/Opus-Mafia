// 제안 E3(사용자 허락 전, proposal/morning-fact): 매일 아침 지난밤 사실 하나를 모두에게 알린다. 사용: node proposal_morning_fact_test.js <저장소 경로>
// 확인: 사실이 참인지(실제 밤 일과 맞음), 직업·이름이 새지 않는지(복면 습격자 이름 없음), 아무 일 없던 밤은 그렇다고 알리는지, 아침에 한 번만인지.
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=4703;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const ROLE_WORDS=['마피아','대부','조직원','대행자','보안관','탐정','의사','기자','간수','퇴역군인','교도관','시민','조언자'];
const fresh=()=>{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);return s;};
const toNight=s=>{s.day=2;s.turn=1;C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
const facts=(s,n0)=>s.feed.slice(n0).filter(e=>String(e.text).startsWith('[아침 소식]'));
const night=(plans,prep)=>{const s=fresh();toNight(s);const m=s.players.find(p=>p.team==='mafia'),tw=s.players.filter(p=>p.team==='town');prep?.(s,m,tw);s.plans=plans(s,m,tw);for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);const day=s.day,n0=s.feed.length;C.nextTurn(s);return {s,m,tw,n0,day,f:facts(s,n0)};};
const noLeak=(txt,s,m)=>!ROLE_WORDS.some(w=>txt.includes(w))&&!txt.includes(m.name)&&!/undefined|null|NaN/.test(txt);
// 1. 자는 사람 집 습격(단검): 그 집 쪽 부딪히는 소리, 모두에게 한 번, 습격자 이름·직업 없음
{let good=0,n=20,first=null;for(let i=0;i<n;i++){const {s,m,tw,f,day}=night((s,m,tw)=>({[m.id]:{type:'attack',target:tw[0].id,weapon:'knife',nightRaid:true,flee:'stay'}}));const V=tw[0],alive=C.alive(s);
 const hit=s.events.some(e=>e.type==='attack'&&e.day===day&&e.turn===2);const txt=f[0]?.text||'';
 const c={once:f.length===1,toAll:f[0]&&alive.every(p=>f[0].to.includes(p.id)),truth:hit?txt.includes(V.name+'의 집 쪽에서'):/문 앞까지 왔다 갔습니다/.test(txt),leak:noLeak(txt,s,m),note:alive.every(p=>p.known.some(k=>k.source==='아침 소식'&&k.text.includes('아침 소식:')))};
 if(Object.values(c).every(Boolean))good++;else if(!first)first={c,txt};}
 ok(good===n,'습격 밤: 그 집 쪽 소리(또는 문 앞까지 옴)를 모두에게 한 번, 이름·직업 없음, 수첩에 남음 ('+good+'/'+n+')'+(first?' · 첫 실패 '+JSON.stringify(first):''));}
// 2. 권총 습격이 닿으면 총성
{let gun=0,tried=0;for(let i=0;i<20;i++){const {s,m,tw,f,day}=night((s,m,tw)=>({[m.id]:{type:'attack',target:tw[0].id,weapon:'pistol',nightRaid:true,flee:'stay'}}),(s,m)=>{m.items.pistol=1;m.items.ammo=3;});const shot=s.events.some(e=>e.type==='attack'&&e.day===day&&e.turn===2&&e.weapon==='pistol');if(shot){tried++;if(/총성이 울렸습니다/.test(f[0]?.text||''))gun++;}}
 ok(tried>0&&gun===tried,'권총 습격이 닿은 밤은 "총성이 울렸습니다" ('+gun+'/'+tried+')');}
// 3. 지키러 나간 사람의 빈 집 습격(닿지 않음): 문 앞까지 왔다 갔음, 지켜지는 집 이름은 나오지 않음
{let good=0,n=20,first=null;for(let i=0;i<n;i++){const {s,m,tw,f}=night((s,m,tw)=>({[tw[0].id]:{type:'guardHouse',target:tw[1].id},[m.id]:{type:'attack',target:tw[0].id,weapon:'knife',nightRaid:true,flee:'stay'}}));const txt=f[0]?.text||'';
 const c={door:txt==='[아침 소식] 지난밤 누군가 '+tw[0].name+'의 집 문 앞까지 왔다 갔습니다.',notGuarded:!txt.includes(tw[1].name),leak:noLeak(txt,s,m)};if(Object.values(c).every(Boolean))good++;else if(!first)first={c,txt};}
 ok(good===n,'빈 집 습격: "누군가 A의 집 문 앞까지 왔다 갔습니다", 지켜지는 집은 안 나옴 ('+good+'/'+n+')'+(first?' · 첫 실패 '+JSON.stringify(first):''));}
// 4. 복면 쓴 습격자도 이름이 나오지 않음
{let good=0,n=15;for(let i=0;i<n;i++){const {s,m,f}=night((s,m,tw)=>({[m.id]:{type:'attack',target:tw[0].id,weapon:'knife',nightRaid:true,flee:'stay'}}),(s,m)=>{m.masked=true;});if(f.length===1&&noLeak(f[0].text,s,m))good++;}
 ok(good===n,'복면 습격자: 이름·직업이 아침 소식에 없음 ('+good+'/'+n+')');}
// 5. 아무 일 없는 밤: 그렇다고 알림
{const {s,m,f}=night(()=>({}));ok(f.length===1&&f[0].text==='[아침 소식] 지난밤 마을에는 소란도, 밤길을 걷는 발소리도 없었습니다.','조용한 밤: "소란도, 밤길을 걷는 발소리도 없었습니다" · '+(f[0]?.text||'없음'));ok(s.metrics.some(x=>x.kind==='morningFact'&&x.fact==='quiet'),'기록(metrics)에 아침 소식 종류가 남음');}
// 6. 밤길 발소리: 밤 이동 사건이 있으면 그 장소(비밀 장소는 "마을 밖")
{/* 밤 이동 사건을 밤 정리(resolveBig) 전에 넣어 둔다 */const t=fresh();toNight(t);const m2=t.players.find(p=>p.team==='mafia');for(const p of t.players)t.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};C.announceClashes(t);t.stage='plan';C.recordEvent(t,'move',m2.id,null,'시험 이동','tavern');C.resolveBig(t,rng);const n0=t.feed.length;C.nextTurn(t);const f=facts(t,n0);
 ok(f.length===1&&f[0].text==='[아침 소식] 지난밤 광부 술집 쪽에서 누군가 밤길을 걷는 발소리가 들렸습니다.'&&!f[0].text.includes(m2.name),'밤 이동: "광부 술집 쪽에서 누군가 밤길을 걷는 발소리" (이름 없음) · '+(f[0]?.text||'없음'));
 const u=fresh();toNight(u);const m3=u.players.find(p=>p.team==='mafia');for(const p of u.players)u.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};C.announceClashes(u);u.stage='plan';C.recordEvent(u,'move',m3.id,null,'시험 이동','hideout');C.resolveBig(u,rng);const n1=u.feed.length;C.nextTurn(u);const g=facts(u,n1);
 ok(g.length===1&&g[0].text==='[아침 소식] 지난밤 누군가 마을 밖으로 걸어가는 발소리가 들렸습니다.'&&!g[0].text.includes('본거지'),'비밀 장소로 간 밤 이동은 "마을 밖"으로만 · '+(g[0]?.text||'없음'));}
// 7. 낮 → 밤으로 넘어갈 때는 알리지 않음
{const s=fresh();s.day=3;s.turn=0;s.stage='plan';const n0=s.feed.length;C.nextTurn(s);ok(s.turn===2&&facts(s,n0).length===0,'낮에서 밤으로 넘어갈 때는 아침 소식 없음');}
// 8. 규칙 글
{const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(ui.includes('아침 소식(제안): 매일 아침 지난밤에 일어난 일 하나'),'게임 정보 규칙 글에 아침 소식');}
