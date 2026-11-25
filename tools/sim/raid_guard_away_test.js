// 2026-11-25 run34(7일 밤): 남의 집을 지키러 나간 사람(민재 → 수현의 집 앞)을 습격하자, 습격자가 수현의 집 안에 놓였다.
// 지키던 민재는 "누군가 문을 밀고 들어옴."과 "아무도 오지 않았습니다."를 함께 받고, 자던 수현은 "같은 곳의 누군가에게 공격 시도"를 봤다.
// 고친 뒤: 습격자는 지키러 나간 사람의 빈 집으로 들어가고, 지켜지는 집과 집주인은 얽히지 않는다. 대조: 지켜지는 집을 습격하면 지키는 사람이 문 앞에서 맞선다.
// 사용: node raid_guard_away_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=4401;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);return s;};
const toNight=s=>{s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
const to=(s,n0,p)=>s.feed.slice(n0).filter(e=>e.to.includes(p.id)).map(e=>e.text).join(' / ');
const setup=target=>{const s=fresh();toNight(s);const m=s.players.find(p=>p.team==='mafia'),tw=s.players.filter(p=>p.team==='town');const [A,B]=tw;
 s.plans={[A.id]:{type:'guardHouse',target:B.id},[m.id]:{type:'attack',target:(target==='A'?A:B).id,weapon:'knife',nightRaid:true,flee:'stay'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};
 const n0=s.feed.length;C.announceClashes(s);const placed={m:m.houseId,A:A.houseId,Aalley:A.alley};s.stage='plan';C.resolveBig(s,rng);return {s,m,A,B,n0,placed};};
// run34 상황: A가 B의 집 앞을 지키는데 마피아가 A의 집을 습격
{let fine=0,n=40,first=null;for(let i=0;i<n;i++){const {s,m,A,B,n0,placed}=setup('A');const fm=to(s,n0,m),fa=to(s,n0,A),fb=to(s,n0,B);
  const c={inEmpty:placed.m===A.id&&placed.A===B.id&&placed.Aalley==='guard',bQuiet:!/공격 시도|집에 들어옴|문을 밀고/.test(fb),aNoHost:!/문을 밀고 들어옴|집에 들어옴|쳐들어왔다/.test(fa)&&!A.known.some(k=>/내 집에 쳐들어왔다/.test(k.text)),aNobody:new RegExp('밤새 '+B.name+'의 집 앞을 지켰지만 아무도 오지 않았습니다').test(fa),mEmpty:/자리를 옮겨 닿을 수 없었습니다/.test(fm)};
  if(Object.values(c).every(Boolean))fine++;else if(!first)first={c,fm:fm.slice(0,200),fa:fa.slice(0,200),fb:fb.slice(0,200)};}
 ok(fine===n,'지키러 나간 사람을 습격하면 그 사람의 빈 집으로 들어감 · 지켜지는 집 주인은 아무것도 겪지 않음 · 지키던 사람은 집주인 쪽 글 없이 "아무도 오지 않았습니다" ('+fine+'/'+n+')'+(first?' · 첫 실패 '+JSON.stringify(first):''));}
{const {s,m,A,B,n0,placed}=setup('A');ok(placed.m===A.id,'습격자 위치는 지키러 나간 사람의 집('+A.name+') · 실제 '+placed.m);ok(!s.feed.slice(n0).some(e=>e.to.includes(B.id)&&/같은 곳의 누군가에게 공격 시도/.test(e.text)),'지켜지는 집 주인에게 "같은 곳의 누군가에게 공격 시도"가 가지 않음');
 ok(!s.feed.slice(n0).some(e=>/undefined/.test(String(e.text))),'빈 값 없음');}
// 대조: A가 B의 집 앞을 지키는데 마피아가 B의 집을 습격 → A가 문 앞에서 맞섬, B는 침입을 모름(2026-11-24 설계 그대로)
{let met=0,quiet=0,n=40;for(let i=0;i<n;i++){const {s,m,A,B,n0}=setup('B');const fm=to(s,n0,m),fb=to(s,n0,B),fa=to(s,n0,A);if(new RegExp(A.name+'[이가] 깨어 있었음').test(fm)&&!/아무도 오지 않았습니다/.test(fa))met++;if(!/문을 밀고 들어옴|집에 들어옴|잠결에/.test(fb))quiet++;}
 ok(met===n,'대조: 지켜지는 집을 습격하면 지키는 사람이 문 앞에서 맞섬 ('+met+'/'+n+')');ok(quiet===n,'대조: 지켜지는 집 주인은 침입 글을 받지 않음 ('+quiet+'/'+n+')');}
// 집에서 불침번을 서는 사람은 그대로 맞붙음(남의 집 지키기를 뺀 것이 불침번에 번지지 않음)
{let duel=0,n=30;for(let i=0;i<n;i++){const s=fresh();toNight(s);const m=s.players.find(p=>p.team==='mafia'),[V]=s.players.filter(p=>p.team==='town');s.plans={[V.id]:{type:'watch'},[m.id]:{type:'attack',target:V.id,weapon:'knife',nightRaid:true,flee:'stay'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};const n0=s.feed.length;C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);if(/깨어 있었음/.test(to(s,n0,m)))duel++;}
 ok(duel===n,'불침번은 그대로 습격자와 맞붙음 ('+duel+'/'+n+')');}
