// 유언(시체 발견 · 집어들기 · 소유), 죽은 사람의 관전, 출혈 시작 시점을 확인. 사용: node willwatch_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=9;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);
const [v,w,o,far]=s.players.filter(p=>p.team==='town');s.day=2;s.turn=0;s.stage='small';
for(const p of s.players)p.location='hall';v.location='tavern';w.location='tavern';far.location='chapel';
const got=(p,re)=>s.feed.some(e=>e.to.includes(p.id)&&re.test(String(e.text)));
// 1. 숨을 거두면 사망 알림은 본인에게만, 같은 곳 사람은 시체를 보는 이야기를 받는다
v.will='술집 주인이 다 봤습니다.';v.hp=0;v.downed=null;v.downedOnce=true;C.death(s,v,'공격');
ok(s.feed.some(e=>e.kind==='death'&&e.who===v.id&&e.to.length===1&&e.to[0]===v.id),'사망 알림은 본인에게만');
ok(got(w,/의 시신 · 품에 유언으로 보이는 종이/),'같은 곳 사람은 시체와 품의 종이를 봄');
ok(!got(far,/의 시신/),'다른 곳 사람은 보지 못함');
ok(!s.feed.some(e=>e.kind==='death'&&e.will),'사망 알림에 유언이 실리지 않음');
// 2. 나중에 그곳에 온 사람도 시체를 한 번 본다
o.location='tavern';S.arrival(s,o);S.arrival(s,o);ok(s.feed.filter(e=>e.to.includes(o.id)&&/^[^ ]+의 시신/.test(e.text)).length===1,'나중에 온 사람도 시체를 한 번 봄');
// 3. 유언 집어들기: 같은 곳에서 작은 행동으로, 집어 든 사람만 읽는다
const opt=S.choices(s,w,'small').find(a=>a.sceneKey==='takeWill');ok(!!opt&&/가람|나래|다온|라희|마루|바다|사랑|아라/.test(opt.label),'같은 곳에서 "유언 집어들기"가 보임: '+(opt?.label||'없음'));
ok(!S.choices(s,far,'small').some(a=>a.sceneKey==='takeWill'),'다른 곳에서는 보이지 않음');
S.resolve(s,w,opt,rng);ok(got(w,/유언을 집어 들었습니다/)&&got(w,/술집 주인이 다 봤습니다/),'집어 든 사람은 유언을 읽음');
ok(C.view(s,w.id).people.find(p=>p.id===v.id).will==='술집 주인이 다 봤습니다.','집어 든 사람의 목록에서 유언 읽기 가능');
ok(C.view(s,o.id).people.find(p=>p.id===v.id).will===null,'다른 사람은 유언을 읽을 수 없음');
ok(!S.choices(s,o,'small').some(a=>a.sceneKey==='takeWill'),'이미 집어 간 유언은 다시 집을 수 없음');
// 4. 죽은 사람은 다른 플레이어가 보는 장면을 본다. 살아 있는 사람은 볼 수 없다
v.watching=far.id;const vw=C.view(s,v.id).watch;ok(vw&&vw.id===far.id&&vw.feed.length>0,'죽은 사람은 지켜보는 사람의 장면을 받음 ('+(vw?.feed.length||0)+'개)');
w.watching=far.id;ok(C.view(s,w.id).watch===null,'살아 있는 사람은 다른 사람의 장면을 받지 못함');
// 5. 출혈은 맞은 그 턴에는 체력을 깎지 않고, 다음 턴부터 깎는다
o.hp=1;o.bleeding=true;o.bleedSince=s.epoch;C.tickBleed(s);ok(o.hp===1,'맞은 그 턴에는 출혈로 체력이 줄지 않음');s.epoch++;C.tickBleed(s);ok(o.hp===0&&!!o.downed,'다음 턴에는 출혈로 체력이 줄어 쓰러짐');
