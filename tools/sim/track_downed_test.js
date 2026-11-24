// 2026-11-25 자율 순환(run27): 탐정이 다른 곳(집)에서 쓰러진 사람을 추적 대상으로 고를 때 오류 없이 받고, 쓰러짐을 새로 알려 주지 않는지 확인.
// 사용: node track_downed_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=41;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:6},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);s.day=3;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.used={big:false,small:false};p.hidden=false;}return s;};
const s=fresh();const D=s.players.find(p=>p.role==='detective')||s.players[0];D.role='detective';const T=s.players.find(p=>p.id!==D.id);
T.location='home';T.houseId=T.id;T.hp=0;T.downed={left:1};
/* 화면(20Interface)은 보는 사람이 아는 것으로 선택지를 만든다. 다른 곳에서 쓰러진 사람은 쓰러진 줄 모르니 추적 목록에 나온다 */{const vp=C.view(s,D.id).people.find(x=>x.id===T.id);ok(vp&&!vp.downed&&vp.alive!==false,'탐정 화면 정보: 다른 곳(집)에서 쓰러진 사람은 쓰러진 줄 모름 → 화면 추적 목록에 나옴');}
const err=C.validate(s,D.id,{type:'track',target:T.id},'big');ok(!err,'고르면 오류 없이 받음'+(err?' · '+err:''));
s.plans={[D.id]:{type:'track',target:T.id}};const before=s.feed.length;C.resolveBig(s,rng);const mine=s.feed.slice(before).filter(e=>e.to.includes(D.id)).map(e=>e.text).join(' / ');
ok(/뒤를 밟았습니다/.test(mine)&&/그 자리에 머물렀습니다/.test(mine),'결과: 뒤를 밟았고 그 사람은 그 자리에 머묾 · '+mine.slice(0,160));
ok(!/쓰러|살아 있는 대상/.test(mine),'쓰러졌다는 것을 새로 알려 주지 않음');
// 같은 곳의 쓰러진 사람, 탐정이 아닌 사람은 그대로 오류
{const s=fresh();const P=s.players.find(p=>p.role!=='detective');const T=s.players.find(p=>p.id!==P.id&&p.role!=='detective');T.location='home';T.houseId=T.id;T.hp=0;T.downed={left:1};ok(!!C.validate(s,P.id,{type:'track',target:T.id},'big'),'탐정이 아니면 다른 곳 사람 추적은 그대로 안 됨');}
{const s=fresh();const D=s.players.find(p=>p.role==='detective')||s.players[0];D.role='detective';const T=s.players.find(p=>p.id!==D.id);T.hp=0;T.downed={left:1};ok(!!C.validate(s,D.id,{type:'track',target:T.id},'big'),'같은 곳에 쓰러진 사람은(보이니까) 추적 대상이 아님');}
