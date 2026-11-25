// 제안(사용자 허락 전) 야경꾼: 밤 큰 행동 [골목 순찰]. 사용: node proposal_watchman_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=7301;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);return s;};
const toNight=s=>{s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
const to=(s,n0,p)=>s.feed.slice(n0).filter(e=>e.to.includes(p.id)).map(e=>e.text).join(' / ');
// 8명 판의 시민 직업에 야경꾼이 들어감(기자 대신)
{let seen=0,reporter=0;for(let i=0;i<30;i++){const s=fresh();if(s.players.some(p=>p.role==='watchman'))seen++;if(s.players.some(p=>p.role==='reporter'))reporter++;}ok(seen===30&&reporter===0,'8명 판: 야경꾼이 늘 있고 기자는 빠짐 ('+seen+'/30, 기자 '+reporter+')');}
// 야경꾼만 [골목 순찰]을 고를 수 있음
{const s=fresh();toNight(s);const w=s.players.find(p=>p.role==='watchman'),o=s.players.find(p=>p.team==='town'&&p.role!=='watchman');
 ok(C.choices(s,w.id,'big').some(a=>a.type==='patrol'),'야경꾼 밤 큰 행동에 [골목 순찰]');ok(!C.choices(s,o.id,'big').some(a=>a.type==='patrol'),'다른 시민에게는 없음');}
const run=(raid,mafiaAgility)=>{const s=fresh();toNight(s);const w=s.players.find(p=>p.role==='watchman'),m=s.players.find(p=>p.team==='mafia'),t=s.players.find(p=>p.team==='town'&&p.id!==w.id);if(mafiaAgility!=null){m.stats.agility=mafiaAgility;w.stats.observe=0;}
 s.plans={[w.id]:{type:'patrol'}};if(raid)s.plans[m.id]={type:'attack',target:t.id,weapon:'knife',nightRaid:true,flee:'stay'};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};
 const n0=s.feed.length;C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);return {s,w,m,t,txt:to(s,n0,w)};};
// 습격이 있으면 보거나(이김) 발소리(짐)
{let win=0,lose=0,other=0,leak=0;for(let i=0;i<40;i++){const {w,m,t,txt}=run(true,0);if(new RegExp(t.name+'의 집 쪽으로 들어감').test(txt))win++;else if(/누군가 지나가는 발소리/.test(txt))lose++;else other++;if(/대부|대행자|조직원|마피아/.test(txt))leak++;}
 ok(win>0&&other===0,'습격이 있으면 "…의 집 쪽으로 들어감" 또는 발소리 (봄 '+win+', 발소리 '+lose+', 그 밖 '+other+')');ok(leak===0,'직업·편 이름이 나오지 않음');}
{let lose=0,n=40;for(let i=0;i<n;i++){const {txt}=run(true,10);if(/누군가 지나가는 발소리/.test(txt))lose++;}ok(lose===n,'관찰 0 대 은신 10(능력치 최대)이면 늘 발소리만 ('+lose+'/'+n+')');}
// 아무도 드나들지 않으면 빈 결과가 아님
{const {s,w,txt}=run(false);ok(/밤새 골목에 드나든 사람 없음\. 불 켜진 집 \d+채\./.test(txt),'아무도 없으면 "밤새 골목에 드나든 사람 없음. 불 켜진 집 n채."');ok(w.tired===true,'순찰한 다음 날 피곤함');}
// 남의 집 앞을 지키는 사람은 보이지 않음(편 노출 방지)
{const s=fresh();toNight(s);const w=s.players.find(p=>p.role==='watchman'),tw=s.players.filter(p=>p.team==='town'&&p.id!==w.id);s.plans={[w.id]:{type:'patrol'},[tw[0].id]:{type:'guardHouse',target:tw[1].id}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};
 const n0=s.feed.length;C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);const txt=to(s,n0,w);ok(!txt.includes(tw[0].name),'남의 집 앞을 지키는 사람 이름은 순찰 결과에 없음');}
