// 남에게 새면 안 되는 정보 확인: 상대 판정 수치, 낮의 집 안, 조사·목격 없이 바뀌는 체력, 행동 시간 2분. 사용: node leak_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=57;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const hi=()=>0.99;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.houseId=null;p.used={big:false,small:false};p.hidden=false;}return s;};
const look=(s,viewer,target)=>C.view(s,viewer.id).people.find(p=>p.id===target.id);
const opposedFor=(s,who)=>C.view(s,who.id).feed.filter(e=>e.roll?.kind==='opposed').map(e=>e.roll);
const bare=r=>r.secret&&!('stat' in r)&&!('total' in r)&&!('roll' in r)&&!('rolls' in r)&&!('terms' in r);

// 1. 맞붙는 판정: 내 수치는 보이고 상대 수치는 보이지 않는다
{let s,P,T,mine,theirs;for(let i=0;i<60;i++){s=fresh();[P,T]=s.players.filter(p=>p.team==='town');s.plans={[P.id]:{type:'track',target:T.id},[T.id]:{type:'wait'}};C.resolveBig(s,rng);mine=opposedFor(s,P)[0];theirs=opposedFor(s,T)[0];if(mine&&theirs)break;}
 ok(!!mine&&!!theirs,'추적에 실패해 양쪽 모두 판정 기록을 받음');
 ok(mine&&!mine.actor.secret&&typeof mine.actor.stat==='number','뒤를 밟은 사람: 내 은신 수치는 보임');
 ok(mine&&bare(mine.opponent),'뒤를 밟은 사람: 상대 관찰의 주사위·능력치·합계는 오지 않음');
 ok(theirs&&bare(theirs.actor),'뒤를 밟힌 사람: 상대 은신의 주사위·능력치·합계는 오지 않음');
 ok(theirs&&!theirs.opponent.secret&&typeof theirs.opponent.stat==='number','뒤를 밟힌 사람: 내 관찰 수치는 보임');
 ok(s.feed.some(e=>e.roll?.kind==='opposed'&&typeof e.roll.opponent.stat==='number'),'게임 안의 원래 기록은 그대로(화면으로 보낼 때만 가림)');}

// 2. 낮에도 집은 각자의 집이다
{const s=fresh();const [A,B]=s.players.filter(p=>p.team==='town');s.turn=0;A.location='home';B.location='home';
 ok(!look(s,A,B).here,'낮에 각자 집에 있으면 서로 보이지 않음');
 ok(!C.view(s,A.id).environment.some(t=>t.includes(B.name)),'낮에 집에 있을 때 주변 사람 목록에 이웃 이름이 없음');
 ok(/의 집$/.test(C.view(s,A.id).locationName),'낮에 집에 있으면 위치가 "~의 집"으로 보임 ('+C.view(s,A.id).locationName+')');
 A.houseId=B.id;ok(look(s,A,B).here,'남의 집에 찾아가면 그 집 사람은 보임');
 s.turn=2;A.houseId=null;ok(!look(s,A,B).here,'밤에도 각자 집이면 서로 보이지 않음');}

// 3. 남의 체력: 보기만 해서는 안 바뀌고, 조사에 성공하거나 맞는 것을 보면 바뀐다. 마피아끼리는 늘 안다
{const s=fresh();const [a,b]=s.players.filter(p=>p.team==='town');b.hp=4;
 ok(look(s,a,b).hp===10,'같은 곳에서 보이기만 해서는 체력이 그대로 (보이는 값 '+look(s,a,b).hp+')');
 C.smallAct(s,a.id,{type:'investigate',target:b.id},hi);/* 조사는 작은 행동 */
 ok(look(s,a,b).hp===4,'조사에 성공하면 그때의 체력으로 갱신 (보이는 값 '+look(s,a,b).hp+')');
 b.hp=2;ok(look(s,a,b).hp===4,'조사 뒤에 바뀐 체력은 다시 조사하기 전까지 모름');}
{const s=fresh();const town=s.players.filter(p=>p.team==='town'),[t,w]=town,m=s.players.find(p=>p.role==='mafioso');
 const far=town.find(p=>p.id!==t.id&&p.id!==w.id);far.location='warehouse';/* 공격 전에 다른 곳에 가 있던 사람 */
 s.plans={[m.id]:{type:'attack',target:t.id,weapon:'fist'}};C.resolveBig(s,hi);
 ok(t.hp<10,'공격이 들어감 (체력 '+t.hp+')');
 ok(look(s,m,t).hp===t.hp,'공격한 사람은 맞은 사람의 체력을 앎');
 const seen=C.view(s,w.id).feed.some(e=>/공격/.test(String(e.text)));
 ok(!seen||look(s,w,t).hp===t.hp,'공격을 본 사람은 맞은 사람의 체력을 앎'+(seen?'':' (이번에는 목격 못 함)'));
 ok(look(s,far,t).hp===10,'공격 때 다른 곳에 있던 사람은 모름 (보이는 값 '+look(s,far,t).hp+')');}
{const s=fresh();const gf=s.players.find(p=>p.role==='godfather'),mf=s.players.find(p=>p.role==='mafioso');mf.location='warehouse';mf.hp=5;
 ok(look(s,gf,mf).hp===5,'마피아끼리는 떨어져 있어도 체력을 앎');}

// 4. 행동 선택 시간은 2분
{const s=fresh();ok(s.cfg.planSeconds===120,'행동 선택 시간 120초 (지금 '+s.cfg.planSeconds+')');}
