// 제안(사용자 허락 전, proposal/night-stay-over): 밤에 남의 집에서 묵기.
// 사용자: "집의 역할은 서로 귓속말하는 역할이 될 수도 있겠네요", "밤에 같이 있으면 같이 자면서 대화할 수 있는거겠죠", "서로 보초를 대신해주거나", "아니면 배신을 당할 수도 있겠죠 서로를 공격할 수도 있으니깐요"
// 사용: node proposal_stay_over_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=5101;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);return s;};
const to=(s,n0,p)=>s.feed.slice(n0).filter(e=>e.to.includes(p.id)).map(e=>e.text).join(' / ');
// 낮: guest가 host의 집에 있음 → 묵기 고르기 → 밤으로
const dayStay=(guestTeam)=>{const s=fresh();s.day=1;s.turn=1;s.stage='small';const town=s.players.filter(p=>p.team==='town'),maf=s.players.find(p=>p.team==='mafia');const host=town[0],guest=guestTeam==='mafia'?maf:town[1];
 for(const p of s.players){p.used={big:false,small:false};}host.location='home';host.houseId=null;guest.location='home';guest.houseId=host.id;guest.alley=undefined;
 const opt=C.choices(s,guest.id,'small').find(a=>a.type==='stayOver');const n0=s.feed.length;const err=opt?C.smallAct(s,guest.id,{type:'stayOver',target:host.id},rng):'선택지 없음';
 return {s,host,guest,maf,opt,err,n0};};
const toNight=s=>{C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
// 1. 낮에 남의 집에 있으면 [묵기]가 있고, 고르면 결과 글이 남음
{const {s,host,guest,opt,err,n0}=dayStay('town');ok(!!opt&&/의 집에서 오늘 밤 묵기/.test(opt.label),'남의 집에 있으면 "'+host.name+'의 집에서 오늘 밤 묵기" 선택지 · '+(opt&&opt.label));ok(!err&&guest.stayOver&&guest.stayOver.host===host.id,'고르면 묵기로 정함 · '+(err||''));
 ok(/오늘 밤 .+의 집에서 묵기로 했습니다/.test(to(s,n0,guest)),'고른 사람에게 결과 글 · '+to(s,n0,guest).slice(0,80));ok(/오늘 밤 이 집에서 묵겠다고 합니다/.test(to(s,n0,host)),'같은 집 사람(집주인)도 봄 · '+to(s,n0,host).slice(0,80));
 const s2=fresh();s2.day=1;s2.turn=1;const g2=s2.players.find(p=>p.team==='town');g2.location='home';g2.houseId=null;ok(!C.choices(s2,g2.id,'small').some(a=>a.type==='stayOver'),'자기 집에서는 묵기 선택지가 없음');}
// 2. 밤이 되면 묵기로 한 사람은 그 집에 남고, 다른 사람은 각자 집 / 밤 대화는 그 집 안에서만(같은 공간)
{const {s,host,guest}=dayStay('town');toNight(s);const other=s.players.find(p=>p.team==='town'&&p.id!==host.id&&p.id!==guest.id);
 ok(s.turn===2&&guest.location==='home'&&guest.houseId===host.id,'밤에 묵는 사람은 '+host.name+'의 집에 남음 · houseId '+guest.houseId);ok(host.houseId===host.id&&other.houseId===other.id,'집주인과 다른 사람은 각자 집');
 ok(C.sameSpace(s,guest,host)&&!C.sameSpace(s,guest,other),'밤에 같은 집 사람끼리만 같은 공간(그 집 안에서 나눈 말은 둘만 들음)');}
// 2b. 묵기를 고르지 않으면 지금처럼 자기 집으로
{const s=fresh();s.day=1;s.turn=1;const town=s.players.filter(p=>p.team==='town');const [h,g]=town;h.location='home';h.houseId=null;g.location='home';g.houseId=h.id;toNight(s);ok(g.houseId===g.id,'묵기를 안 고르면 밤에 자기 집으로(지금과 같음)');}
const night=(st,plansFn)=>{st.plans={};plansFn(st);for(const p of st.players)if(!st.plans[p.id])st.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};const n0=st.feed.length;C.announceClashes(st);st.stage='plan';C.resolveBig(st,rng);return n0;};
// 3. 보초를 대신해 줌: 집주인 집을 습격했는데 묵는 사람이 불침번이면 그 사람이 깨어 맞섬
{let met=0,n=20,first=null;for(let i=0;i<n;i++){const {s,host,guest,maf}=dayStay('town');toNight(s);const n0=night(s,st=>{st.plans[guest.id]={type:'watch'};st.plans[host.id]={type:'sleep'};st.plans[maf.id]={type:'attack',target:host.id,weapon:'knife',nightRaid:true,flee:'stay'};});
  const fm=to(s,n0,maf),fg=to(s,n0,guest);const c={raider:new RegExp(guest.name+'.{0,3}'+host.name+'의 집 안에서 깨어 있었음').test(fm),guest:new RegExp(host.name+'의 집에서 묵다가').test(fg),note:guest.known.some(k=>new RegExp('밤에 '+host.name+'의 집에서 묵다가').test(k.text))};
  if(Object.values(c).every(Boolean))met++;else if(!first)first={c,fm:fm.slice(0,220),fg:fg.slice(0,220)};}
 ok(met===n,'묵는 사람이 불침번이면 습격자와 깨어 맞섬 · 글·수첩은 "'+'집에서 묵다가" ('+met+'/'+n+')'+(first?' · 첫 실패 '+JSON.stringify(first):''));}
// 3b. 대조: 아무도 깨어 있지 않으면 지금처럼(집주인이 잠결에 습격받음)
{const {s,host,guest,maf}=dayStay('town');toNight(s);const n0=night(s,st=>{st.plans[guest.id]={type:'sleep'};st.plans[host.id]={type:'sleep'};st.plans[maf.id]={type:'attack',target:host.id,weapon:'knife',nightRaid:true,flee:'stay'};});ok(!/집에서 묵다가|집 안에서 깨어 있었음/.test(to(s,n0,maf)+to(s,n0,guest)),'대조: 아무도 불침번이 아니면 묵기 맞대결 글 없음');}
// 4. 묵는 사람 자기 집을 습격하면 빈 집
{const {s,host,guest,maf}=dayStay('town');toNight(s);const n0=night(s,st=>{st.plans[maf.id]={type:'attack',target:guest.id,weapon:'knife',nightRaid:true,flee:'stay'};});ok(maf.houseId===guest.id&&/자리를 옮겨 닿을 수 없었습니다/.test(to(s,n0,maf)),'남의 집에서 묵는 사람의 집을 습격하면 빈 집 · 습격자 위치 '+maf.houseId);}
// 1b. 화면 버튼 이름(사람·AI 같은 화면): 실제 서버 확인 판에서 버튼이 "stayOver"로 나온 것을 고침
{const ui=require('fs').readFileSync(require('path').join(dir,'20Interface.js'),'utf8');ok(ui.includes("stayOver:'이 집에서 묵기'")&&ui.includes("stayOver:'오늘 밤 집으로 돌아가지 않고"),'버튼 이름 "이 집에서 묵기"와 설명이 있음(전: stayOver 그대로)');}
// 5. 배신: 마피아가 시민 집에서 묵으면 밤에 그 집 사람을 바로 공격할 수 있음(기존 공격 처리)
{const {s,host,guest:maf,err}=dayStay('mafia');ok(!err&&maf.stayOver,'마피아도 남의 집에서 묵기를 고를 수 있음 · '+(err||''));toNight(s);ok(maf.location==='home'&&maf.houseId===host.id,'밤에 마피아가 '+host.name+'의 집에 남음(본거지로 가지 않음)');
 const atk=C.choices(s,maf.id,'big').find(a=>a.type==='attack'&&a.target===host.id&&!a.nightRaid);ok(!!atk,'밤에 같은 집 사람 바로 공격 선택지 · '+(atk&&atk.label));
 if(atk){const hp0=host.hp;const n0=night(s,st=>{st.plans[maf.id]={...atk};st.plans[host.id]={type:'sleep'};});const fh=to(s,n0,host);ok(/공격/.test(fh)||host.hp<hp0,'같은 집에서 공격하면 기존 공격 처리로 결과가 남음 · 체력 '+hp0+'→'+host.hp+' · '+fh.slice(0,120));}}
