// 폭약: 판마다 다른 두 곳 + 본거지, 단서가 있어야 찾음, 네 개면 갱도 재개, 설치하면 다음 때가 끝날 때 터짐(NPC 포함). 사용: node dynamite_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라'];
function game(seed){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.rng=rng;return s;}
const where=s=>s.scenario.bombs.map(b=>b.where);
// 1. 여섯 개를 두 개씩: 마을 안 두 곳 + 본거지. 판마다 숨긴 곳이 달라진다
{const seen=new Set();let okSplit=true;for(let i=1;i<=40;i++){const s=game(i*7);const w=where(s),c={};for(const v of w)c[v]=(c[v]||0)+1;const keys=Object.keys(c);if(w.length!==6||c.hideout!==2||keys.length!==3||Object.values(c).some(n=>n!==2))okSplit=false;seen.add(s.scenario.spots.join('+'));if(s.scenario.spots.includes('chapel')&&s.scenario.spots[0]!=='chapel')okSplit=false;}
 ok(okSplit,'여섯 개가 마을 안 두 곳과 본거지에 두 개씩 (교회가 뽑히면 첫 번째)');ok(seen.size>=4,'판마다 숨긴 곳이 달라짐 ('+seen.size+'가지 조합: '+[...seen].join(', ')+')');}
// 2. 단서 없이는 현장 수색에 성공해도 찾지 못하고, 단서를 들으면 찾는다
{const s=game(3);s.scenario.spots=['chapel','barrel'];s.scenario.bombs.forEach((b,i)=>b.where=['chapel','chapel','spot:barrel','spot:barrel','hideout','hideout'][i]);s.scenario.discovered=true;
 const p=s.players.find(p=>p.team==='town');const sure=()=>0.99;p.location='chapel';p.storyKnown=[];for(let i=0;i<4;i++)S.investigate(s,p,sure);ok(!p.storyKnown.some(k=>k.startsWith('cache:')),'단서 없이 교회를 뒤져도 폭약이 나오지 않음');
 p.npcHeard=['lead:chapel'];for(let i=0;i<4;i++)S.investigate(s,p,sure);ok(p.storyKnown.some(k=>k.startsWith('cache:')),'아이의 말을 들은 뒤에는 종탑 아래에서 찾음');ok(S.choices(s,p,'big').some(a=>a.sceneKey==='take'),'찾은 뒤 "발견한 폭약 가져가기"가 보임');
 const q=s.players.find(o=>o.team==='town'&&o.id!==p.id);q.location='tavern';q.storyKnown=[];for(let i=0;i<4;i++)S.investigate(s,q,sure);ok(!q.storyKnown.some(k=>k.startsWith('spot:barrel')),'술집 주인의 말 없이 뒷마당을 뒤져도 나오지 않음');q.npcHeard=['lead:barrel'];for(let i=0;i<4;i++)S.investigate(s,q,sure);ok(q.storyKnown.some(k=>k.startsWith('spot:barrel')),'술집 주인의 말을 들은 뒤에는 술통에서 찾음');
 const m=s.players.find(o=>o.team==='mafia');m.location='tavern';ok(S.choices(s,m,'big').some(a=>a.sceneKey==='take'),'마피아는 자기들이 숨긴 곳에서 바로 꺼낼 수 있음');m.location='hideout';s.turn=2;ok(S.choices(s,m,'big').some(a=>a.sceneKey==='take'),'마피아는 본거지의 폭약을 꺼낼 수 있음');s.turn=0;}
// 3. 폭약이 사라진 것이 알려지기 전(첫날 낮 1)에는 단서가 있어도 찾지 못한다
{const s=game(5);s.scenario.spots=['chapel','cart'];s.scenario.bombs.forEach((b,i)=>b.where=['chapel','chapel','cart','cart','hideout','hideout'][i]);s.scenario.discovered=false;const p=s.players.find(p=>p.team==='town');p.location='chapel';p.npcHeard=['lead:chapel'];S.investigate(s,p,()=>0.99);ok(!p.storyKnown.some(k=>k.startsWith('cache:')),'첫날 낮 1에는 찾지 못함');}
// 4. 아이와 NPC가 숨긴 곳을 가리킨다
{const s=game(9);s.scenario.spots=['barrel','medbox'];s.scenario.discovered=true;const p=s.players.find(p=>p.team==='town');s.turn=1;p.location='home';S.arrival(s,p);ok(p.npcHeard?.includes('lead:barrel')&&s.feed.some(e=>e.to.includes(p.id)&&/술집 뒷마당으로 가는 걸 봤어/.test(e.text)),'아이가 첫 번째 숨긴 곳(술집 뒷마당)을 가리킴');p.location='clinic';S.arrival(s,p);ok(p.npcHeard?.includes('lead:medbox'),'간호사가 약상자 이야기를 함');ok(!s.feed.some(e=>e.to.includes(p.id)&&/교회 종탑 밑에서/.test(e.text)),'교회가 숨긴 곳이 아니면 아이가 교회 이야기를 하지 않음');}
// 5. 네 개를 회관에 맡기면 갱도가 다시 열린다
{const s=game(11);const p=s.players.find(p=>p.team==='town');s.scenario.bombs.forEach((b,i)=>b.where=i<4?'carry:'+p.id:'hideout');C.find(s,p.id).items.dynamite=4;p.location='hall';s.turn=0;S.resolve(s,p,{type:'scene',sceneKey:'secure'},s.rng);ok(s.scenario.secured===true,'네 개를 맡기면 회수한 것으로 침');}
// 6. 설치하면 다음 때가 끝날 때 터지고, 그 자리의 사람과 NPC가 죽는다. 불 붙이기 단추는 없다
{const s=game(13);const m=s.players.find(p=>p.team==='mafia'),t=s.players.find(p=>p.team==='town');s.day=2;s.turn=0;m.location='warehouse';s.scenario.bombs.forEach((b,i)=>b.where=i<2?'carry:'+m.id:'hideout');m.items.dynamite=2;
 ok(S.choices(s,m,'big').some(a=>a.sceneKey==='arm')&&!S.choices(s,m,'big').some(a=>a.sceneKey==='ignite'),'설치하기는 있고 따로 불 붙이기는 없음');S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);ok(s.scenario.fuse?.status==='armed','설치하면 도화선이 타기 시작');
 ST.beforeAdvance(s);ok(!s.scenario.exploded,'설치한 그 때가 끝날 때는 아직 터지지 않음');C.nextTurn(s);S.nextChapter(s);
 m.location='hall';t.location='warehouse';const doyle=s.scenario.doyle;doyle.location='warehouse';doyle.hp=10;const mn=Object.values(s.scenario.continuation.npcs).find(n=>n.id==='miner');mn.location='warehouse';mn.hp=10;
 ST.beforeAdvance(s);ok(s.scenario.exploded,'다음 때가 끝날 때 터짐');ok(t.hp===0&&m.hp>0,'그때 갱도에 있던 사람은 죽고, 떠난 사람은 살아남음');ok(doyle.hp===0&&mn.hp===0,'갱도에 있던 NPC(도일, 젊은 광부)도 죽음');}
