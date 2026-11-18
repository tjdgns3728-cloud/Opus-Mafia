// 견본 ①: 광부의 광차 이야기는 판마다 다르고(있을 수도 없을 수도), 들은 사람에게만 "광차를 살핀다"가 생기며, 결과는 판정이 정하는지 확인. 사용: node cart_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=17;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const hi=()=>0.99;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const seq=list=>{let i=0;return ()=>list[Math.min(i++,list.length-1)];};
const game=()=>{const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';s.scenario.discovered=true;for(const q of s.players){q.used={big:false,small:false};q.location='hall';q.houseId=null;q.hidden=false;}return s;};
const find=want=>{for(let i=0;i<400;i++){const s=game();if(s.scenario.spots.includes('cart')===want)return s;}return null;};
const opt=(s,p)=>S.choices(s,p,'big').find(a=>a.sceneKey==='search:cart');/* 2026-11-19: 숨긴 곳 찾기는 큰 행동 *//* 2026-11-16 네 곳에 같은 방식을 넣으며 이름을 search:cart로 바꿈 */
const mine=(s,p)=>s.feed.filter(e=>e.to.includes(p.id)).map(e=>String(e.text)).join(' / ');

// 1. 소문은 판마다 다르다
let withCart=[0,0],noCart=[0,0];for(let i=0;i<300;i++){const s=game();const c=s.scenario.spots.includes('cart');(c?withCart:noCart)[s.scenario.rumor.cart?0:1]++;}
ok(withCart[0]>0&&withCart[1]>0,'광차에 폭약이 있어도 광부가 말하지 않는 판이 있음 (말함 '+withCart[0]+' / 안 함 '+withCart[1]+')');
ok(noCart[0]>0&&noCart[1]>0,'광차가 비어 있어도 광부가 말하는 판이 있음 (말함 '+noCart[0]+' / 안 함 '+noCart[1]+')');
ok(withCart[0]/(withCart[0]+withCart[1])>noCart[0]/(noCart[0]+noCart[1]),'그래도 폭약이 있을 때 더 자주 말함');

// 2. 들은 사람에게만 생긴다
{const s=find(true),[t,u]=s.players.filter(p=>p.team==='town'),m=s.players.find(p=>p.team==='mafia');for(const p of [t,u,m])p.location='warehouse';
 ok(!opt(s,t),'광부 말을 듣기 전에는 "광차를 살핀다"가 없음');
 t.npcHeard=['lead:cart'];m.npcHeard=['lead:cart'];ok(!!opt(s,t)&&!opt(s,u),'들은 사람에게만 생기고, 듣지 않은 사람에게는 없음');
 ok(!opt(s,m),'마피아에게는 생기지 않음(숨긴 곳을 이미 앎)');
 t.location='hall';ok(!opt(s,t),'갱도 입구가 아니면 없음');t.location='warehouse';
 ok(!/알 수 있을지 모릅니다/.test(require('fs').readFileSync(path.join(dir,'08StoryFlow.js'),'utf8').match(/lead=\{cart:'[^']*'/)[0]),'광부의 말에 조언("살펴보면 알 수 있을지 모릅니다")이 없음');
 // 3. 성공: 폭약이 있으면 찾고, 가져가는 행동이 열린다
 ok(!S.choices(s,t,'big').some(a=>a.sceneKey==='take'),'찾기 전에는 "발견한 폭약 가져가기"가 없음');
 S.resolve(s,t,opt(s,t),()=>0.01);/* 2026-11-19: 주사위가 찾을 확률보다 낮으면 찾음 */ok(t.storyKnown.includes('cart')&&/폭약 \d개입니다/.test(mine(s,t)),'성공하면 광차의 폭약을 찾음');
 ok(S.choices(s,t,'big').some(a=>a.sceneKey==='take'),'찾은 뒤에는 "발견한 폭약 가져가기"가 생김');
 ok(!opt(s,t),'찾은 뒤에는 "광차를 살핀다"가 사라짐');
 // 현장 수색만으로는 광차 폭약이 드러나지 않는다
 u.npcHeard=['lead:cart'];for(let i=0;i<8;i++)S.investigate(s,u,hi);ok(!u.storyKnown.includes('cart'),'현장 수색만으로는 광차의 폭약이 드러나지 않음(광차를 살펴야 함)');}

// 4. 비어 있어도 못 찾은 것과 같은 글이라 비었는지는 알 수 없고, 다음 때 다시 할 수 있다(2026-11-19)
{const s=find(false),t=s.players.find(p=>p.team==='town');t.location='warehouse';t.npcHeard=['lead:cart'];
 S.resolve(s,t,opt(s,t),()=>0.01);ok(/이번에는 찾지 못했습니다/.test(mine(s,t))&&!t.known.some(k=>/비어 있었다/.test(String(k.text))),'광차가 비었어도 "이번에는 찾지 못했습니다"(비었는지 모름)');
 s.epoch++;ok(!!opt(s,t),'비었어도 다음 때 다시 할 수 있음');}

// 5. 실패: 같은 자리 사람이 보거나, 손자국이 남거나, 아무 일도 없다
{const s=find(true),[t,u]=s.players.filter(p=>p.team==='town');t.location=u.location='warehouse';t.npcHeard=['lead:cart'];
 S.resolve(s,t,opt(s,t),seq([0.99,0.5]));ok(/이번에는 찾지 못했습니다/.test(mine(s,t))&&!t.storyKnown.includes('cart'),'운이 없으면 찾지 못함');
 ok(u.known.some(k=>/모습이 보입니다/.test(String(k.text))),'같은 자리 사람이 뒤지는 모습을 봄');
 ok(!opt(s,t),'같은 때에는 다시 할 수 없음');s.epoch++;ok(!!opt(s,t),'다음 때에는 다시 할 수 있음');
 S.resolve(s,t,opt(s,t),seq([0.99,0.1]));ok((s.scenario.traces||[]).some(x=>x.where==='warehouse'&&x.who===t.id),'실패해서 덮개에 손자국이 남음');
 const tb=(s.scenario.traces||[]).length;s.epoch++;S.resolve(s,t,opt(s,t),seq([0.99,0.9]));ok((s.scenario.traces||[]).length===tb&&/이번에는 찾지 못했습니다/.test(mine(s,t)),'운이 없었지만 손자국은 남지 않을 때도 있음(뒤지는 모습은 2026-11-19부터 늘 보임)');}
