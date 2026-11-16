// 도일에게 열쇠를 물으면 맞는 대답을 하고, 설득하기에 성공하면 열쇠는 쥔 채 화약고를 함께 열어 보여 주는지 확인. 사용: node doyle_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=9;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const hi=()=>0.99,lo=()=>0.01;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const seats=Array.from({length:6},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다'][i],bot:true}));
const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';
for(const n of [s.scenario.doyle,...Object.values(s.scenario.continuation?.npcs||{})])if(n?.name==='도일')n.location='warehouse';
const [a,b,c]=s.players.filter(p=>p.team==='town');for(const p of s.players){p.location='hall';p.used={big:false,small:false};}a.location='warehouse';b.location='warehouse';
const mine=p=>s.feed.filter(e=>e.to.includes(p.id)).map(e=>String(e.text)).join(' / ');
const opt=p=>S.choices(s,p,'big').find(x=>x.verb==='persuadeDoyle');

// 1. 열쇠를 물으면 열쇠 이야기로 대답한다
ok(S.speakTopic(s,a,'도일 씨, 열쇠를 나한테 주시오')==='npc:doyle:keys','"열쇠를 달라" → 열쇠 주제로 알아들음');
S.talk(s,a,'npc:doyle:keys');ok(/열쇠는 내 손을 떠나지 않소/.test(mine(a))&&/설득해 보시오/.test(mine(a)),'도일이 열쇠를 넘기지 않는 이유와 설득하라는 말을 함');
ok(!fs.readFileSync(path.join(dir,'08StoryFlow.js'),'utf8').includes('열쇠 꾸러미를 흔들어 보입니다'),'열쇠를 흔들어 보이는 몸짓(가져가라는 것처럼 보임)이 없음');

// 2. 설득하기: 같은 곳에 있을 때 큰 행동으로 고를 수 있다
ok(!!opt(a),'갱도 입구에서 "도일을 설득해 화약고 열어 보기"를 고를 수 있음');
ok(!opt(c),'도일이 없는 곳에서는 고를 수 없음');

// 3. 실패하면 그날은 다시 못 한다
S.resolve(s,b,opt(b),lo);ok(/말로는 안 되겠소/.test(mine(b)),'실패하면 도일이 거절함');
ok(!opt(b),'실패한 날에는 다시 청할 수 없음');
s.day=3;ok(!!opt(b),'다음 날에는 다시 청할 수 있음');s.day=2;

// 4. 성공하면 열쇠는 쥔 채로 화약고를 함께 열어 보여 준다
const before=s.feed.length;S.resolve(s,a,opt(a),hi);
ok(/화약고 문을 엽니다/.test(mine(a))&&/열쇠는 다시 도일의 허리춤으로/.test(mine(a)),'성공하면 함께 열어 보여 주고 열쇠는 도일이 다시 가져감');
ok(a.known.some(k=>/도일과 함께 본 화약고/.test(String(k.text))),'본 것이 수첩에 적힘');
ok(!a.items?.key&&!a.items?.magazineKey,'열쇠를 받지 않음');
ok(!opt(a),'이미 본 사람에게는 다시 나오지 않음');
ok(!s.feed.slice(before).some(e=>e.to.includes(c.id)),'다른 곳에 있는 사람에게는 아무것도 전해지지 않음');
S.talk(s,a,'npc:doyle:keys');ok(/이미 같이 열어 보지 않았소/.test(mine(a)),'본 뒤에 열쇠를 물으면 이미 봤다고 대답함');
