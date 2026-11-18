// 보호하기: 같은 곳의 공격받는 사람을 대신해 맞서고(막기 +2), 비슷하면 서로 다치는지 확인. 사용: node protect_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
function setup(seed){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);
 const A=s.players.find(p=>p.team==='mafia'),town=s.players.filter(p=>p.team==='town'),[V,G,F]=town;for(const p of s.players)p.location='chapel';F.location='hall';s.day=2;s.turn=0;s.stage='plan';s.plans={};
 const err=C.queue(s,A.id,{type:'attack',target:V.id,weapon:'fist'});C.announceClashes(s);s.stage='react';return {s,rng,A,V,G,F,err};}
// 1. 같은 곳의 다른 사람에게만 보호하기가 보인다
{const {s,A,V,G,F,err}=setup(11);ok(!err,'공격 계획 '+(err||''));const g=C.view(s,G.id).guardable.map(x=>x.id),f=C.view(s,F.id).guardable,a=C.view(s,A.id).guardable,v=C.view(s,V.id).guardable;
 ok(g.includes(V.id),'같은 곳 사람에게 "'+V.name+' 보호하기"가 보임');ok(!f.length,'다른 곳 사람에게는 보이지 않음');ok(!a.length&&!v.length,'공격하는 사람과 공격받는 사람에게는 보이지 않음');}
// 2. 보호하면 공격받던 사람은 다치지 않고, 막아선 사람이 막기 +2로 대신 맞선다
{const {s,rng,V,G}=setup(13);s.protects={[V.id]:G.id};G.hidden=true;s.stage='plan';C.resolveBig(s,rng);
 ok(V.hp===10,'공격받던 사람은 다치지 않음 (체력 '+V.hp+')');ok(s.feed.some(e=>/앞을 막아서 대신 맞섭니다/.test(e.text)),'막아서는 장면이 나옴');
 ok(/막아서기 방어 보정 \+2/.test(C.attackRoll(s,s.players.find(p=>p.team==='mafia'),G,{weapon:'knife',guarded:true},rng).defReason||''),'막아서기 방어 보정 +2가 판정에 들어감(화면에는 대결 결과만 보임)');}
// 3. 결과가 비슷하면(차이 2 이하) 공격한 사람도 다친다. 차이가 크면 다치지 않는다
{let close=null,wide=null;for(let seed=1;seed<400&&(!close||!wide);seed++){const {s,rng,A,V,G}=setup(seed);s.protects={[V.id]:G.id};s.stage='plan';const before=A.hp;C.resolveBig(s,rng);const ev=s.events.filter(e=>e.type==='attack').at(-1);const r=s.feed.some(e=>/막상막하였습니다/.test(e.text));if(r&&!close)close={hurt:A.hp<before};if(!r&&!wide)wide={hurt:A.hp<before};}
 ok(close&&close.hurt,'비슷한 결과에서는 공격한 사람도 다침');ok(wide&&!wide.hurt,'차이가 큰 결과에서는 공격한 사람이 다치지 않음');}
