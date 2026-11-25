// 2026-11-25 run45(3일 밤): 시온이 남의 집을 지키러 나가 시온의 집이 비었는데, 민재·이안이 시온의 집 앞을 지키고 있었다.
// 습격자 둘은 빈 집에 놓여 "상대가 자리를 옮겨 닿을 수 없었습니다"만 받고 문 앞 지킴이와 만나지 않았고, 지킴이는 "시온의 집을 지켰습니다"만 받았다(결과 없음).
// 고친 뒤: 지켜지는 집이면 집주인이 없어도 습격자는 문 앞 지킴이와 먼저 맞붙는다(집주인이 있을 때와 같은 길). 지킴이는 늘 결과를 받는다.
// 같은 편 습격자끼리는 서로의 습격 대상을 이름으로 본다("같은 곳의 누군가" 대신). 집을 비운 집주인은 아무것도 모른다.
// 사용: node empty_house_guards_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=4519;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);return s;};
const toNight=s=>{s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
const to=(s,n0,p)=>s.feed.slice(n0).filter(e=>e.to.includes(p.id)).map(e=>e.text).join(' / ');
// opts: ownerAway(집주인 O가 X의 집 앞을 지키러 나감), guards(O의 집 앞 지킴이 수), raiders(습격자 수, 0이면 습격 없음)
const setup=({ownerAway,guards,raiders})=>{const s=fresh();toNight(s);const ms=s.players.filter(p=>p.team==='mafia').slice(0,raiders),tw=s.players.filter(p=>p.team==='town');const [O,X,...rest]=tw,G=rest.slice(0,guards);
 s.plans={[O.id]:ownerAway?{type:'guardHouse',target:X.id}:{type:'sleep'}};for(const g of G)s.plans[g.id]={type:'guardHouse',target:O.id};for(const m of ms)s.plans[m.id]={type:'attack',target:O.id,weapon:'knife',nightRaid:true,flee:'stay'};
 for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};
 const n0=s.feed.length;C.announceClashes(s);const placed={O:{h:O.houseId,a:O.alley},G:G.map(g=>({h:g.houseId,a:g.alley})),M:ms.map(m=>m.houseId)};s.stage='plan';C.resolveBig(s,rng);return {s,O,X,G,ms,n0,placed};};
const metRe=(s,g,O)=>new RegExp(g.name+'[이가] '+O.name+'의 집 앞을 지키고 있었음');
const mafiaN=fresh().players.filter(p=>p.team==='mafia').length;console.log('이 판의 마피아 수',mafiaN);
// run45: 집주인이 나가 있고, 지킴이 둘, 습격자 둘
{const n=40;let place=0,met=0,guardRes=0,ownerQuiet=0,xQuiet=0,noEmptyWhileGuard=0,mate=0,mateN=0,noLeak=0,first=null;
 for(let i=0;i<n;i++){const {s,O,X,G,ms,n0,placed}=setup({ownerAway:true,guards:2,raiders:2});const fm=ms.map(m=>to(s,n0,m)),fg=G.map(g=>to(s,n0,g)),fo=to(s,n0,O),fx=to(s,n0,X);
  const c={place:placed.G.every(x=>x.h===O.id&&x.a==='guard')&&placed.M.every(h=>h===O.id)&&placed.O.h===X.id&&placed.O.a==='guard',
   met:G.some(g=>metRe(s,g,O).test(fm[0])),
   guardRes:G.every((g,k)=>g.hp<=0||new RegExp(O.name+'의 집 앞을 지키다 |함께 '+O.name+'의 집 앞을 지키던 .+ 습격자와 맞붙었습니다').test(fg[k])&&!/아무도 오지 않았습니다/.test(fg[k])),
   ownerQuiet:!/문을 밀고 들어옴|집에 들어옴|쳐들어왔다|공격 시도|습격자/.test(fo)&&!O.known.some(k=>/내 집에 쳐들어왔다/.test(k.text)),
   xQuiet:!/문을 밀고 들어옴|집에 들어옴|공격 시도/.test(fx),
   noEmptyWhileGuard:ms.every((m,k)=>!/자리를 옮겨 닿을 수 없었습니다/.test(fm[k])||G.every(g=>g.hp<=0)),
   noLeak:!s.feed.slice(n0).some(e=>e.to.some(id=>s.players.find(p=>p.id===id)?.team!=='mafia')&&/에게 공격 시도/.test(e.text)&&ms.some(m=>e.text.includes(m.name+'이 ')||e.text.includes(m.name+'가 ')))};
  if(ms.length>1){mateN++;if(new RegExp(ms[0].name+'[이가] '+O.name+'에게 공격 시도').test(fm[1])&&!/같은 곳의 누군가에게 공격 시도/.test(fm.join(' ')))mate++;}
  for(const k of Object.keys(c))if(c[k])eval(k+'++');if(!Object.values(c).every(Boolean)&&!first)first={c,fm0:fm[0].slice(0,300),fg:fg.map(x=>x.slice(0,200))};}
 ok(place===n,'자리: 집주인은 남의 집 앞, 지킴이 둘은 집주인의 집 앞, 습격자는 집주인의 집 ('+place+'/'+n+')');
 ok(met===n,'습격자가 문 앞 지킴이와 맞붙음("…의 집 앞을 지키고 있었음") ('+met+'/'+n+')'+(first?' · 첫 실패 '+JSON.stringify(first):''));
 ok(guardRes===n,'살아 있는 지킴이 둘 모두 결과를 받음(맞붙음 또는 "함께 … 지키던 …이 습격자와 맞붙었습니다"), "아무도 오지 않았습니다" 없음 ('+guardRes+'/'+n+')');
 ok(noEmptyWhileGuard===n,'지킴이가 살아 있으면 "상대가 자리를 옮겨 닿을 수 없었습니다"를 받지 않음 ('+noEmptyWhileGuard+'/'+n+')');
 ok(ownerQuiet===n,'집을 비운 집주인은 습격을 모름 ('+ownerQuiet+'/'+n+')');ok(xQuiet===n,'집주인이 지키던 집 주인도 얽히지 않음 ('+xQuiet+'/'+n+')');
 ok(noLeak===n,'마피아 아닌 사람에게 습격자의 공격 시도 줄이 가지 않음 ('+noLeak+'/'+n+')');
 if(mafiaN>1)ok(mate===mateN,'같은 편 습격자는 서로의 대상을 이름으로 봄("'+'…이 (집주인)에게 공격 시도", "같은 곳의 누군가" 없음) ('+mate+'/'+mateN+')');else console.log('건너뜀: 마피아가 하나라 같은 편 줄 시험 없음');}
// 대조: 습격 없음 → 지킴이는 "아무도 오지 않았습니다" 한 줄
{const n=20;let fine=0,first=null;for(let i=0;i<n;i++){const {s,O,G,n0}=setup({ownerAway:true,guards:1,raiders:0});const fg=to(s,n0,G[0]);const c=(fg.match(new RegExp('밤새 '+O.name+'의 집 앞을 지켰지만 아무도 오지 않았습니다','g'))||[]).length===1&&!/함께 /.test(fg);if(c)fine++;else if(!first)first=fg.slice(0,300);}
 ok(fine===n,'대조: 습격이 없으면 지킴이는 "아무도 오지 않았습니다" 한 줄 ('+fine+'/'+n+')'+(first?' · 첫 실패 '+first:''));}
// 대조: 집주인이 집에 있고 지킴이 하나 → 예전 그대로 지킴이가 문 앞에서 맞섬, 집주인은 침입을 모름
{const n=30;let met=0,quiet=0,noExtra=0;for(let i=0;i<n;i++){const {s,O,G,ms,n0,placed}=setup({ownerAway:false,guards:1,raiders:1});const fm=to(s,n0,ms[0]),fo=to(s,n0,O),fg=to(s,n0,G[0]);
  if(placed.G[0].h===(O.houseId||O.id)&&metRe(s,G[0],O).test(fm)&&!/자리를 옮겨/.test(fm))met++;if(!/문을 밀고 들어옴|집에 들어옴|잠결에/.test(fo))quiet++;if(!/함께 |아무도 오지 않았습니다/.test(fg))noExtra++;}
 ok(met===n,'대조: 집주인이 있으면 지킴이가 문 앞에서 맞섬 ('+met+'/'+n+')');ok(quiet===n,'대조: 지켜지는 집 주인은 침입 글을 받지 않음 ('+quiet+'/'+n+')');ok(noExtra===n,'대조: 지킴이 하나면 덧붙는 줄 없음 ('+noExtra+'/'+n+')');}
// 대조: 집주인이 집에 있고 지킴이 둘 → 맞붙지 않은 지킴이도 결과를 받음
{const n=20;let fine=0;for(let i=0;i<n;i++){const {s,O,G,n0}=setup({ownerAway:false,guards:2,raiders:1});const fg=G.map(g=>to(s,n0,g));if(G.every((g,k)=>g.hp<=0||new RegExp(O.name+'의 집 앞을 지키다 |함께 '+O.name+'의 집 앞을 지키던 .+ 습격자와 맞붙었습니다').test(fg[k])))fine++;}
 ok(fine===n,'대조: 집주인이 있어도 지킴이 둘 모두 결과를 받음 ('+fine+'/'+n+')');}
