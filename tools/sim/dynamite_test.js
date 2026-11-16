// 폭약: 판마다 다른 두 곳에 하나씩(본거지 없음), 단서가 있어야 찾음, 모두 맡기면 갱도 재개, NPC 앞에서 꺼내면 고발·달아나기, 설치하면 다음 때가 끝날 때 터짐(NPC 포함). 사용: node dynamite_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라'];
function game(seed){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.rng=rng;return s;}
const where=s=>s.scenario.bombs.map(b=>b.where);
// 1. 2026-11-16 사용자 결정으로 바뀜: 예전 "여섯 개를 두 개씩, 본거지 포함" → 지금 "두 개를 마을 안 서로 다른 두 곳에 하나씩, 본거지 없음"
{const seen=new Set();let okSplit=true;for(let i=1;i<=40;i++){const s=game(i*7);const w=where(s);if(w.length!==2||w.includes('hideout')||new Set(w).size!==2)okSplit=false;seen.add(s.scenario.spots.join('+'));if(s.scenario.spots.includes('chapel')&&s.scenario.spots[0]!=='chapel')okSplit=false;}
 ok(okSplit,'폭약 두 개가 마을 안 서로 다른 두 곳에 하나씩, 본거지에는 없음 (교회가 뽑히면 첫 번째)');ok(seen.size>=4,'판마다 숨긴 곳이 달라짐 ('+seen.size+'가지 조합: '+[...seen].join(', ')+')');}
// 2. 단서 없이는 현장 수색에 성공해도 찾지 못하고, 단서를 들으면 찾는다
{const s=game(3);s.scenario.spots=['chapel','barrel'];s.scenario.bombs=[{id:'d0',where:'chapel'},{id:'d1',where:'spot:barrel'}];/* 폭약은 두 개 */s.scenario.discovered=true;
 const p=s.players.find(p=>p.team==='town');const sure=()=>0.99;p.location='chapel';p.storyKnown=[];for(let i=0;i<4;i++)S.investigate(s,p,sure);ok(!p.storyKnown.some(k=>k.startsWith('cache:')),'단서 없이 교회를 뒤져도 폭약이 나오지 않음');
 /* 2026-11-16부터 숨긴 곳은 현장 수색이 아니라 들은 사람의 '살핀다'로 찾는다 */p.npcHeard=['lead:chapel'];S.resolve(s,p,{type:'scene',sceneKey:'search:chapel'},sure);ok(p.storyKnown.some(k=>k.startsWith('cache:')),'아이의 말을 들은 뒤 종탑 아래를 살피면 찾음');ok(S.choices(s,p,'big').some(a=>a.sceneKey==='take'),'찾은 뒤 "발견한 폭약 가져가기"가 보임');
 const q=s.players.find(o=>o.team==='town'&&o.id!==p.id);q.location='tavern';q.storyKnown=[];for(let i=0;i<4;i++)S.investigate(s,q,sure);ok(!q.storyKnown.some(k=>k.startsWith('spot:barrel')),'술집 주인의 말 없이 뒷마당을 뒤져도 나오지 않음');q.npcHeard=['lead:barrel'];S.resolve(s,q,{type:'scene',sceneKey:'search:barrel'},sure);ok(q.storyKnown.some(k=>k.startsWith('spot:barrel')),'술집 주인의 말을 들은 뒤 술통을 살피면 찾음');
 const m=s.players.find(o=>o.team==='mafia');m.location='tavern';ok(S.choices(s,m,'big').some(a=>a.sceneKey==='take'),'마피아는 자기들이 숨긴 곳에서 바로 꺼낼 수 있음');m.location='hideout';s.turn=2;ok(!S.choices(s,m,'big').some(a=>a.sceneKey==='take'),'본거지에는 폭약이 없어 꺼낼 것이 없음(2026-11-16 사용자 결정)');s.turn=0;}
// 3. 폭약이 사라진 것이 알려지기 전(첫날 낮 1)에는 단서가 있어도 찾지 못한다
{const s=game(5);s.scenario.spots=['chapel','cart'];s.scenario.bombs.forEach((b,i)=>b.where=['chapel','chapel','cart','cart','hideout','hideout'][i]);s.scenario.discovered=false;const p=s.players.find(p=>p.team==='town');p.location='chapel';p.npcHeard=['lead:chapel'];S.investigate(s,p,()=>0.99);ok(!p.storyKnown.some(k=>k.startsWith('cache:')),'첫날 낮 1에는 찾지 못함');}
// 4. 아이와 NPC가 숨긴 곳을 가리킨다
{const s=game(9);s.scenario.spots=['barrel','medbox'];/* 소문도 이 상황에 맞춘다(아이는 처음 숨긴 곳을, 간호사는 약상자를 말하는 판) */s.scenario.rumor={...s.scenario.rumor,barrel:true,medbox:true,chapel:false,child:'barrel'};s.scenario.discovered=true;const p=s.players.find(p=>p.team==='town');s.turn=1;p.location='home';S.arrival(s,p);ok(p.npcHeard?.includes('lead:barrel')&&s.feed.some(e=>e.to.includes(p.id)&&/술집 뒷마당으로 가는 걸 봤어/.test(e.text)),'아이가 첫 번째 숨긴 곳(술집 뒷마당)을 가리킴');p.location='clinic';S.arrival(s,p);ok(p.npcHeard?.includes('lead:medbox'),'간호사가 약상자 이야기를 함');ok(!s.feed.some(e=>e.to.includes(p.id)&&/교회 종탑 밑에서/.test(e.text)),'교회가 숨긴 곳이 아니면 아이가 교회 이야기를 하지 않음');}
// 5. 네 개를 회관에 맡기면 갱도가 다시 열린다
{const s=game(11);const p=s.players.find(p=>p.team==='town');s.scenario.bombs.forEach((b,i)=>b.where=i<4?'carry:'+p.id:'hideout');C.find(s,p.id).items.dynamite=4;p.location='hall';s.turn=0;S.resolve(s,p,{type:'scene',sceneKey:'secure'},s.rng);ok(s.scenario.secured===true,'네 개를 맡기면 회수한 것으로 침');}
// 6. 설치하면 다음 때가 끝날 때 터지고, 그 자리의 사람과 NPC가 죽는다. 불 붙이기 단추는 없다
{const s=game(13);const m=s.players.find(p=>p.team==='mafia'),t=s.players.find(p=>p.team==='town');s.day=2;s.turn=0;m.location='warehouse';s.scenario.bombs.forEach((b,i)=>b.where=i<2?'carry:'+m.id:'hideout');m.items.dynamite=2;
 ok(S.choices(s,m,'big').some(a=>a.sceneKey==='arm')&&!S.choices(s,m,'big').some(a=>a.sceneKey==='ignite'),'설치하기는 있고 따로 불 붙이기는 없음');S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);ok(s.scenario.fuse?.status==='armed','설치하면 도화선이 타기 시작');
 ST.beforeAdvance(s);ok(!s.scenario.exploded,'설치한 그 때가 끝날 때는 아직 터지지 않음');C.nextTurn(s);S.nextChapter(s);
 m.location='hall';t.location='warehouse';const doyle=s.scenario.doyle;doyle.location='warehouse';doyle.hp=10;const mn=Object.values(s.scenario.continuation.npcs).find(n=>n.id==='miner');mn.location='warehouse';mn.hp=10;
 ST.beforeAdvance(s);ok(s.scenario.exploded,'다음 때가 끝날 때 터짐');ok(t.hp===0&&m.hp>0,'그때 갱도에 있던 사람은 죽고, 떠난 사람은 살아남음');ok(doyle.hp===0&&mn.hp===0,'갱도에 있던 NPC(도일, 젊은 광부)도 죽음');}
// 6. 숨긴 폭약을 꺼내는 것을 마피아 편이 아닌 NPC가 보면 고발되고, 꺼낸 사람은 은신 판정으로 달아난다(2026-11-16 사용자 결정)
{const setup=()=>{const s=game(11);s.day=2;s.turn=0;s.stage='plan';s.scenario.spots=['cart','barrel'];s.scenario.bombs=[{id:'d0',where:'cart'},{id:'d1',where:'spot:barrel'}];s.scenario.discovered=true;const bk=ST.npc(s,'barkeep');bk.location='tavern';bk.hp=10;bk.recruited=false;const m=s.players.find(o=>o.team==='mafia'),w=s.players.find(o=>o.team==='town');for(const o of s.players){o.location='hall';o.used={big:false,small:false};o.hidden=false;}m.location=w.location='tavern';return {s,m,w};};
 const seq=list=>{let i=0;return ()=>list[Math.min(i++,list.length-1)];};
 let {s,m,w}=setup();S.resolve(s,m,{type:'scene',sceneKey:'take'},seq([0.99,0.3]));
 const c=s.cases.find(c=>c.target===m.id&&c.caught&&!c.closed);ok(!!c&&c.byName==='술집 주인','술집 주인이 보고 고발함 (재판은 동의 없이 열림)');
 ok(w.known.some(k=>/숨겨 둔 폭약 1개를 꺼내 챙기는 것을 봤다/.test(String(k.text))),'같은 자리의 시민 수첩에 직접 목격으로 남음');
 ok(m.location!=='tavern'&&s.scenario.bombs.some(b=>b.where==='carry:'+m.id),'달아나기에 성공하면 폭약을 품고 다른 곳으로 감 ('+C.places[m.location].name+')');
 ({s,m}=setup());S.resolve(s,m,{type:'scene',sceneKey:'take'},seq([0.01]));
 ok(m.location==='tavern'&&s.scenario.bombs.find(b=>b.id==='d1').where==='secured'&&m.jailEpoch===s.epoch+1,'달아나기에 실패하면 붙잡혀 폭약을 빼앗기고 다음 때 큰 행동을 못 함');
 ok(s.cases.some(c=>c.target===m.id&&c.caught),'붙잡혀도 고발은 남음');
 ({s,m}=setup());ST.npc(s,'barkeep').recruited=true;S.resolve(s,m,{type:'scene',sceneKey:'take'},seq([0.99,0.3]));ok(!s.cases.some(c=>c.target===m.id),'끌어들인 NPC는 보고도 고발하지 않음');
 ({s,m}=setup());ST.npc(s,'barkeep').location='hall';S.resolve(s,m,{type:'scene',sceneKey:'take'},seq([0.99]));ok(!s.cases.some(c=>c.target===m.id)&&m.location==='tavern','본 NPC가 없으면 고발도 달아나기도 없음');}
// 7. 터지면 그 자리 사람은 모두 죽고, 살릴 수 없다(2026-11-16 사용자 결정)
{const s=game(13);s.day=3;s.turn=1;s.scenario.fuse={status:'lit'};const at=s.players.slice(0,3),away=s.players.slice(3);for(const o of at)o.location='warehouse';for(const o of away)o.location='hall';S.resolveHazard(s);
 ok(at.every(o=>o.hp===0&&!o.downed),'갱도에 있던 사람은 모두 죽고, 살릴 수 있는 쓰러짐 상태가 아님');ok(away.every(o=>o.hp>0),'다른 곳 사람은 다치지 않음');
 const doc=away[0];doc.location='warehouse';ok(!C.choices(s,doc.id,'big').some(a=>a.type==='revive'),'죽은 사람을 살리는 행동이 나오지 않음');}
