// 제안(사용자 허락 전, proposal/night-info-press 브랜치): E2 불침번이 밤에 집을 드나드는 사람·남의 집 앞에 선 사람을 봄, H1 기자의 사진 찍기를 작은 행동으로. 사용: node proposal_night_press_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=77;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const hi=()=>0.95,lo=()=>0;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);return s;};
const toNight=s=>{s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
const roleNames=Object.values(C.roles).map(r=>r.name);
// H1: 사진 찍기는 작은 행동
{const s=fresh();s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
 const Rp=s.players.find(p=>p.role==='reporter')||s.players.find(p=>p.team==='town');Rp.role='reporter';Rp.items.camera=1;
 const T=s.players.find(p=>p.id!==Rp.id&&p.team==='town'),A=s.players.find(p=>p.id!==Rp.id&&p.id!==T.id&&p.team==='town');
 for(const p of s.players)if(![Rp.id,T.id,A.id].includes(p.id))p.location='chapel';
 ok(C.choices(s,Rp.id,'small').some(a=>a.type==='photograph'&&a.target===T.id),'작은 행동에 사진 찍기');
 ok(!C.choices(s,Rp.id,'big').some(a=>a.type==='photograph'),'큰 행동에는 사진 찍기 없음');
 const err=C.smallAct(s,Rp.id,{type:'photograph',target:T.id},rng);
 ok(!err&&Rp.used.small&&!Rp.used.big&&!(Rp.photos||[]).length,'사진 찍기를 고르면 작은 행동만 쓰고, 찍히는 것은 큰 행동이 처리될 때 · '+(err||''));
 ok(s.feed.some(e=>e.to?.includes(Rp.id)&&/사진기를 준비했습니다/.test(e.text||'')),'고른 순간 결과 글: 사진기를 준비함');
 ok(!C.validate(s,Rp.id,{type:'wait'},'big'),'같은 때 큰 행동은 그대로 쓸 수 있음');
 s.plans={[A.id]:{type:'attack',target:T.id,weapon:'fist',flee:'stay'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);
 const ph=(Rp.photos||[])[0];ok(!!ph,'큰 행동이 처리될 때 사진이 찍힘');ok(ph&&(ph.moments.length>0||ph.frames.length>0),'사진에 같은 때의 다툼 장면이 남음 · '+(ph?ph.moments.join(' ').slice(0,60):''));
 s.epoch++;s.stage='plan';for(const p of s.players)p.used={big:false,small:false};
 ok(C.choices(s,Rp.id,'big').some(a=>a.type==='publish'&&a.photo===ph?.id),'다음 때 큰 행동에 그 사진으로 신문 만들기');}
// E2: 불침번
const night=(setup,r)=>{const s=fresh();toNight(s);const town=s.players.filter(p=>p.team==='town'),maf=s.players.filter(p=>p.team==='mafia');const [W,G,H,G2]=town;W.stats.observe=5;const ctx={s,W,G,H,G2,town,maf};setup(ctx);for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};C.announceClashes(s);s.stage='plan';const n0=s.feed.length;C.resolveBig(s,r);ctx.out=s.feed.slice(n0).filter(e=>e.to?.length===1&&e.to[0]===W.id&&e.tag==='불침번').map(e=>e.text).join(' / ');return ctx;};
{const c=night(({s,W,G,H,G2})=>{s.plans={[W.id]:{type:'watch'},[G.id]:{type:'guardHouse',target:H.id},[G2.id]:{type:'guardHouse',target:W.id}};},hi);
 ok(c.out.includes(C.pp(c.G.name,'이','가')+' '+c.H.name+'의 집 앞에 서 있음.'),'불침번은 남의 집 앞에 선 사람을 봄 · '+c.out);
 ok(!c.out.includes(c.G2.name),'내 집 앞을 지키는 사람은 보지 않음(집주인은 모름)');
 ok(c.W.known.some(k=>/집 앞에 서 있는 것을 봤다/.test(k.text)&&k.kind==='observed'),'수첩에 직접 목격으로 남음');}
{const c=night(({s,W,maf})=>{const [M,M2]=maf;s.plans={[W.id]:{type:'watch'}};const e1=C.smallAct(s,M.id,{type:'move',place:'home'},rng);if(e1)console.log('실패 밤 이동 거절: '+e1);if(M2){M2.location='home';M2.houseId=null;const e2=C.smallAct(s,M2.id,{type:'move',place:'warehouse'},rng);if(e2)console.log('실패 밤 이동 거절: '+e2);}},hi);
 const [M,M2]=c.maf;
 ok(c.out.includes('밤늦게 주택가로 들어와 집으로 들어감.'),'불침번은 밤에 주택가로 들어오는 사람을 봄 · '+c.out);
 ok(!M2||c.out.includes('집을 나서 '+C.places.warehouse.name+' 쪽으로 감.'),'불침번은 밤에 집을 나서는 사람과 간 쪽을 봄');
 ok(!/본거지/.test(c.out),'온 곳(본거지)은 드러나지 않음');
 ok(!roleNames.some(n=>c.out.includes(n)),'불침번 결과에 직업 이름 없음');}
{const c=night(({s,W,G,H,maf})=>{s.plans={[W.id]:{type:'watch'},[G.id]:{type:'guardHouse',target:H.id}};C.smallAct(s,maf[0].id,{type:'move',place:'home'},rng);},lo);
 ok(c.out==='이상한 움직임 없음.','판정에 실패하면 지금처럼 "이상한 움직임 없음." · '+c.out);}
{const s=fresh();toNight(s);const W=s.players.find(p=>p.team==='town');const opts=C.choices(s,W.id,'big');
 ok(opts.find(a=>a.type==='watch')?.label.includes('밤에 집을 드나드는 사람을 볼 수 있음'),'불침번 버튼 글에 볼 수 있는 것');
 ok(opts.filter(a=>a.type==='guardHouse').every(a=>a.label.includes('불침번 서는 이웃은 볼 수 있음')),'남의 집 지키기 버튼 글에 이웃이 볼 수 있음');}
