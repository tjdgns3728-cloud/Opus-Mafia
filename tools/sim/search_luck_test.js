// 폭약 찾기(2026-11-19 사용자 결정): 증인은 조각만, 서랍에는 리스가 죽기 전에 알 수 있었던 것만, 찾기는 큰 행동,
// 여러 번 할 수 있고 매번 같은 확률(운), 조각이 둘 이상이면 확률이 오름, 삽(종탑 아래)·손전등(광차)이 도움. 사용: node search_luck_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=21;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const game=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';s.scenario.discovered=true;for(const p of s.players){p.location='hall';p.used={big:false,small:false};}return s;};
const mine=(s,p)=>s.feed.filter(e=>e.to?.includes(p.id)).map(e=>String(e.text)).join(' / ');
const opt=(s,p,k,slot='big')=>S.choices(s,p,slot).find(a=>a.sceneKey==='search:'+k);
const pct=a=>+(a?.label.match(/찾을 확률 (\d+)%/)||[])[1];

// 1. 아이는 방향만 말하고, 출처마다 다른 조각으로 남는다
{const s=game();s.scenario.spots=['chapel','cart'];s.scenario.rumor={...s.scenario.rumor,chapel:true,child:'chapel'};const p=s.players.find(p=>p.team==='town');s.day=1;s.turn=1;/* 아이는 첫날에 나온다 */p.location='home';S.arrival(s,p);
 ok(/교회 쪽으로 가는 걸 봤어/.test(mine(s,p))&&!/종탑 밑에서|뭔가를 묻는/.test(mine(s,p)),'아이는 "교회 쪽으로 가는 걸 봤어"까지만 말함(종탑 밑이라고 집지 않음)');
 ok(p.npcHeard.includes('lead:chapel:child'),'아이의 말은 "lead:chapel:child" 조각');}

// 2. 찾기는 큰 행동, 조각 하나 20%·둘 40%, 삽 +25%, 다시 해도 같은 확률
{const s=game();s.scenario.spots=['chapel','cart'];s.scenario.bombs.forEach((b,i)=>b.where=["chapel","cart"][i%2]);const p=s.players.find(p=>p.team==='town'),m=s.players.find(p=>p.team==='mafia');p.location=m.location='chapel';
 ok(!opt(s,p,'chapel'),'조각이 없으면 찾기가 없음');
 p.npcHeard=['lead:chapel:child'];ok(!opt(s,p,'chapel','small')&&!!opt(s,p,'chapel'),'작은 행동이 아니라 큰 행동으로 나옴');ok(pct(opt(s,p,'chapel'))===20,'조각 하나: 찾을 확률 20%');
 p.npcHeard.push('lead:chapel');ok(pct(opt(s,p,'chapel'))===40,'서로 다른 출처의 조각 둘(아이·종지기): 40%');
 p.items.shovel=1;ok(pct(opt(s,p,'chapel'))===65,'삽이 있으면 종탑 아래 +25%: 65%');
 m.npcHeard=['lead:chapel:child'];ok(!opt(s,m,'chapel'),'마피아에게는 나오지 않음(숨긴 곳을 앎)');
 S.resolve(s,p,opt(s,p,'chapel'),()=>0.99);ok(/이번에는 찾지 못했습니다/.test(mine(s,p))&&!p.storyKnown.some(k=>k.startsWith('cache:')),'운이 없으면 못 찾음');
 ok(!opt(s,p,'chapel'),'같은 때에는 다시 할 수 없음');s.epoch++;ok(pct(opt(s,p,'chapel'))===65,'다음 때 다시 할 수 있고, 다시 해도 확률은 그대로(65%)');
 S.resolve(s,p,opt(s,p,'chapel'),()=>0.5);ok(p.storyKnown.some(k=>k.startsWith('cache:'))&&/폭약 \d개입니다/.test(mine(s,p)),'주사위가 확률보다 낮으면 찾음');}

// 3. 비어 있는 곳도 같은 글이라 비었는지 알 수 없다
{const s=game();s.scenario.spots=['barrel','medbox'];s.scenario.bombs.forEach((b,i)=>b.where=["spot:barrel","spot:medbox"][i%2]);const p=s.players.find(p=>p.team==='town');p.location='chapel';p.npcHeard=['lead:chapel','lead:chapel:child'];
 S.resolve(s,p,opt(s,p,'chapel'),()=>0.01);ok(/이번에는 찾지 못했습니다/.test(mine(s,p))&&!p.known.some(k=>/비어 있|파낸 자국/.test(String(k.text))),'폭약이 없는 곳은 주사위가 낮아도 "이번에는 찾지 못했습니다"(비었는지 모름)');}

// 4. 광차는 손전등 +10%, 삽은 갱도 입구 도구 창고에서 작은 행동으로
{const s=game();s.scenario.spots=['cart','barrel'];const p=s.players.find(p=>p.team==='town');p.location='warehouse';p.npcHeard=['lead:cart'];
 ok(pct(opt(s,p,'cart'))===20,'광차 조각 하나 20%');p.items.flashlight=1;ok(pct(opt(s,p,'cart'))===30,'손전등이 있으면 +10%: 30%');
 const sh=S.choices(s,p,'small').find(a=>a.sceneKey==='takeShovel');ok(!!sh,'갱도 입구에서 "도구 창고에서 삽 챙기기"(작은 행동)');S.resolve(s,p,sh,rng);ok(p.items.shovel===1&&!S.choices(s,p,'small').some(a=>a.sceneKey==='takeShovel'),'삽을 챙기면 다시 나오지 않음');
 p.location='hall';ok(!S.choices(s,p,'small').some(a=>a.sceneKey==='takeShovel'),'다른 곳에서는 삽을 챙길 수 없음');}

// 5. 리스의 서랍: 숨긴 곳 쪽지 대신 리스가 죽기 전에 받은 준비 흔적의 신고, 그 자리의 조각 하나
{const s=game();s.scenario.spots=['chapel','cart'];s.scenario.rumor={...s.scenario.rumor,memo:'spot'};const p=s.players.find(p=>p.team==='town');p.role='sheriff';p.location='office';
 S.resolve(s,p,{type:'scene',sceneKey:'search:desk'},()=>0.99);
 const desk=s.feed.filter(e=>e.to?.includes(p.id)&&/서랍 맨 아래/.test(String(e.text))).at(-1)?.text||'';ok(/교회 삽이 없어짐/.test(desk)&&!/꾸러미/.test(desk),'서랍 쪽지: "종지기 신고 — 교회 삽이 없어짐. 확인할 것."(숨긴 곳을 가리키는 꾸러미 쪽지 없음)');
 ok(p.npcHeard.includes('lead:chapel:desk'),'서랍 쪽지는 교회의 조각 하나');
 p.location='chapel';ok(pct(opt(s,p,'chapel'))===20,'서랍 쪽지만으로는 20%');}

// 6. 컴퓨터 시민 자리: 큰 행동에서 찾기를 고름
{const s=game();s.scenario.spots=['chapel','cart'];const p=s.players.find(p=>p.team==='town');p.location='chapel';p.npcHeard=['lead:chapel'];
 ok(String(S.botAction(s,p,'big')?.sceneKey||'')==='search:chapel','컴퓨터 시민은 조각이 있으면 큰 행동으로 찾기를 함');}
