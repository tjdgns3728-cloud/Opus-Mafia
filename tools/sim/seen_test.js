// 남의 체력은 보기만 해서는 갱신되지 않고(조사·공격 목격은 leak_test.js), 쓰러짐은 같은 곳에서 보이며, 죽음은 바로 보이는지 확인. 사용: node seen_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=3;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);
const [a,b,c]=s.players.filter(p=>p.team==='town');s.turn=1;for(const p of s.players){p.location='hall';p.hidden=false;}
const look=(viewer,target)=>C.view(s,viewer.id).people.find(p=>p.id===target.id);
ok(look(a,b).condition==='활동 가능'&&look(a,b).hp===undefined,'처음에는 회관에서 본 그대로(활동 가능, 체력 숫자 없음)');
b.location='warehouse';b.hp=4;ok(look(a,b).condition==='활동 가능','다른 곳에서 다친 사람은 상태가 바뀌지 않음 (보이는 값 '+look(a,b).condition+')');
b.hp=0;b.downed={left:2,epoch:s.epoch,cause:'공격'};const far=look(a,b);ok(!far.downed&&far.condition!=='죽어가는 중','다른 곳에서 쓰러진 사람은 쓰러졌다고 보이지 않음');
a.location='warehouse';const near=look(a,b);ok(near.downed&&near.condition==='죽어가는 중'&&near.alive===false,'같은 곳에 가면 쓰러진 것이 보임');
a.location='hall';ok(look(a,b).downed,'떠난 뒤에도 마지막으로 본 쓰러진 모습이 남음');
c.location='hall';c.hidden=true;const before=look(a,c).condition;c.hp=3;ok(look(a,c).condition===before,'같은 곳이라도 숨어 있는 사람은 갱신되지 않음 (보이는 값 '+look(a,c).condition+')');
/* 2026-11-16 사용자 지시로 규칙이 바뀜: 예전에는 "숨기에서 나오면(보이면) 갱신", 지금은 조사하거나 맞는 것을 봐야 갱신 */c.hidden=false;ok(look(a,c).condition===before,'숨기에서 나와 보이기만 해서는 상태가 갱신되지 않음 (보이는 값 '+look(a,c).condition+')');
const d=s.players.find(p=>p.team==='town'&&![a,b,c].includes(p));d.location='chapel';d.hp=0;d.downed=null;ok(look(a,d).condition==='사망'&&look(a,d).alive===false,'죽음은 다른 곳에 있어도 바로 보임');
a.hp=6;ok(C.view(s,a.id).people.find(p=>p.id===a.id).hp===6,'내 체력은 언제나 바로 보임');
