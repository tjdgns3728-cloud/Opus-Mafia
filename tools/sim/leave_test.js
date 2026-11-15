// 떠나는 사람은 그 자리 장면을 못 보는지, 큰 행동 뒤에도 작은 행동이 되는지 확인. 사용: node leave_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=13;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const seats=Array.from({length:6},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다'][i],bot:true}));
const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';
const d=s.scenario.doyle;d.location='warehouse';d.hp=10;d.protected=false;
const [actor,leaver,stayer,far]=s.players;for(const p of [actor,leaver,stayer])p.location='warehouse';far.location='hall';
const protect=S.choices(s,actor,'big').find(a=>a.sceneKey==='protect');ok(!!protect,'도일 곁에서 지키기 선택지 있음');
s.plans={[actor.id]:protect,[leaver.id]:{type:'move',place:'tavern'},[stayer.id]:{type:'wait'},[far.id]:{type:'wait'}};
const before=s.feed.length;C.resolveBig(s,rng);const got=id=>s.feed.slice(before).some(e=>e.to.includes(id)&&/도일 곁에서/.test(e.text));
ok(got(actor.id),'지킨 사람은 자기 행동을 봄');ok(got(stayer.id),'그 자리에 남은 사람은 봄');ok(!got(leaver.id),'이번 턴에 떠난 사람은 보지 못함 (지금 '+C.places[leaver.location].short+')');ok(!got(far.id),'다른 장소 사람은 보지 못함');
// 큰 행동을 먼저 고른 뒤 작은 행동
s.turn=1;s.epoch++;s.stage='plan';s.plans={};for(const p of s.players)p.used={big:false,small:false};
const p=stayer;ok(!C.queue(s,p.id,{type:'wait'}),'큰 행동(기다리기) 먼저 고름');const err=C.smallAct(s,p.id,{type:'observe'},rng);ok(!err&&p.used.small,'큰 행동 뒤에도 작은 행동(주변 보기) 가능'+(err?' · '+err:''));
