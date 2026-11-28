// 장소 안내(도착하면 뜨는 가운데 창, 이동 목록의 장소 정보)가 화면에서 볼 수 있는 것만 담는지 확인. 사용: node guide_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=13;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';
for(const n of [s.scenario.doyle,...Object.values(s.scenario.continuation?.npcs||{})])if(n?.name==='도일')n.location='warehouse';
const town=s.players.filter(p=>p.team==='town'),p=town[0];for(const q of s.players){q.used={big:false,small:false};q.location='hall';q.houseId=null;}p.location='warehouse';
const G=()=>C.view(s,p.id).placeGuide,all=g=>JSON.stringify(g);

// 1. 지금 있는 곳: 실제로 있는 사람과 물을 것, 이곳에서만 할 수 있는 일
let g=G();const w=g.places.warehouse;
ok(w.here&&g.here==='warehouse','지금 있는 곳은 갱도 입구');
ok(w.people.some(x=>x.name==='도일'&&x.asks.includes('화약고 열쇠')),'도일과 물을 수 있는 것(화약고 열쇠)이 나옴');
ok(w.only.some(a=>a.label==='도일을 설득해 화약고 열어 보기'&&/열쇠는 넘겨주지 않습니다/.test(a.hint)),'이곳에서만 할 수 있는 일에 도일 설득과 그 설명이 나옴');
ok(!w.only.some(a=>/ 공격 · |조사하기|주변 보기|현장 수색/.test(a.label)),'어디서나 되는 일(공격·조사·주변 보기·수색)은 "여기서만"에 넣지 않음');
ok(/살피기 −2/.test(w.feature)&&/숨기 \+2/.test(w.feature),'어둡고 숨을 곳이 많다는 특징과 판정 보정이 나옴');

// 2. 다른 장소: 지금 누가 있는지는 알려 주지 않는다
const t=g.places.tavern;
ok(!t.here&&t.only.length===0,'다른 장소는 "여기서만 할 수 있는 일"을 도착 전에 보여 주지 않음');
ok(t.people.map(x=>x.name).join()==='술집 주인,젊은 광부','다른 장소는 지금 있는 사람이 아니라 주로 만나는 사람만 적음');
const other=town[1];other.location='tavern';ok(all(G().places.tavern)===all(t),'다른 장소에 누가 들어가도 그곳 정보는 바뀌지 않음(위치가 새지 않음)');

// 3. 조사해야 아는 단서와 모르는 이야기는 넣지 않는다
ok(!/담배꽁초|광차에|술통|약상자|세 번째/.test(all(G())),'원고에만 있는 단서(담배꽁초, 숨긴 곳, 열쇠 세 번째 주인)가 없음');
const heardBefore=s.feed.some(e=>e.to.includes(p.id)&&/폭약/.test(String(e.text))&&/두 개/.test(String(e.text)));
ok(/두 개가 없어졌다는/.test(G().places.warehouse.why)===heardBefore,'폭약 두 개 이야기는 화면에서 본 뒤에만 붙음 (본 적 '+heardBefore+')');
C.emit(s,[p.id],'story','도일: 폭약 세 개가 없어졌소.');/* 2026-11-28 폭약 3개 */ok(/세 개가 없어졌다는/.test(G().places.warehouse.why),'도일에게 들은 뒤에는 화약고 설명에 붙음');

// 4. 밤에는 지금 있는 곳 안내를 만들지 않는다(시민은 움직이지 않음)
s.turn=2;p.location='home';ok(!G().places.home.here,'밤에는 지금 있는 곳 안내가 없음');
