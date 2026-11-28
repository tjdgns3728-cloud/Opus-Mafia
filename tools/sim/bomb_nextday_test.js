// 2026-11-28 사용자: "왜 아직도 폭약으로 사람을 죽이지 못하죠?" → CM이 찾은 것: 낮에 장소에 설치하면 시민이 모두 집에 있는 밤 끝에 터졌다.
// 고른 것: "가안으로"(터지는 때를 '다음 날 낮이 끝날 때'로), "집은 그대로 (권장)"(남의 집 폭약은 예전처럼 다음 때가 끝날 때).
// 장소 폭약: 낮에 설치해도 밤에 설치해도 다음 날 낮이 끝날 때 터짐. 열차 전에 터지지 않는 때에는 설치 단추가 없음. 글도 같은 규칙.
// 사용: node bomb_nextday_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]||'.'),dir=path.join(root,'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라'];
function game(seed){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.rng=rng;return s;}
const carry=(s,m,place)=>{m.location=place;s.scenario.bombs.forEach((b,i)=>b.where=i<1?'carry:'+m.id:'hideout');m.items.dynamite=1;};
const armOpt=(s,m)=>S.choices(s,m,'big').find(a=>a.sceneKey==='arm');
const next=s=>{C.nextTurn(s);S.nextChapter(s);};
// 1. 낮에 회관에 설치 → 그날 낮 끝·그날 밤 끝에는 안 터지고, 다음 날 낮이 끝날 때 터짐(그때 회관 사람 모두 죽음)
{const s=game(31),m=s.players.find(p=>p.team==='mafia'),town=s.players.filter(p=>p.team==='town');s.day=2;s.turn=0;carry(s,m,'hall');
 ok(armOpt(s,m)?.label==='마을 회관에 폭약 설치하기 · 다음 날 낮이 끝나면 이곳 사람 모두 죽음','낮 설치 단추: '+armOpt(s,m)?.label);
 S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);ok(s.scenario.fuse?.armedDay===2,'설치한 날을 남김');
 ok(s.feed.some(e=>e.to.includes(m.id)&&/도화선은 다음 날 낮이 끝날 무렵 폭약에 닿습니다/.test(e.text)),'설치한 사람에게 "다음 날 낮이 끝날 무렵"');
 ST.beforeAdvance(s);ok(s.scenario.fuse.status==='armed','설치한 낮이 끝날 때 안 터짐');next(s);
 for(const o of town)o.location='home';m.location='hideout';ST.beforeAdvance(s);ok(s.scenario.fuse.status==='armed'&&town.every(o=>o.hp>0),'그날 밤이 끝날 때도 안 터짐(시민은 모두 집)');next(s);
 const at=town.slice(0,4),away=town.slice(4);for(const o of at)o.location='hall';for(const o of away)o.location='chapel';m.location='tavern';
 ok(s.day===3&&s.turn===0,'(전제) 다음 날 낮');ST.beforeAdvance(s);
 ok(['lit','exploded'].includes(s.scenario.fuse.status)||(s.scenario.blasts||[]).some(b=>b.place==='hall'),'다음 날 낮이 끝날 때 터짐('+s.scenario.fuse.status+')');
 S.resolveHazard?.(s);ok(at.every(o=>o.hp===0)&&away.every(o=>o.hp>0)&&m.hp>0,'그때 회관에 있던 시민 '+at.length+'명 죽고, 다른 곳 사람은 삶');}
// 2. 밤에 회관에 설치 → 다음 날 낮이 끝날 때 터짐(예전과 같은 때)
{const s=game(33),m=s.players.find(p=>p.team==='mafia'),t=s.players.find(p=>p.team==='town');s.day=2;s.turn=2;carry(s,m,'hall');
 ok(armOpt(s,m)?.label.endsWith('다음 날 낮이 끝나면 이곳 사람 모두 죽음'),'밤 설치 단추도 "다음 날 낮이 끝나면"');
 S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);ST.beforeAdvance(s);ok(s.scenario.fuse.status==='armed','설치한 밤이 끝날 때 안 터짐');next(s);
 t.location='hall';m.location='tavern';ST.beforeAdvance(s);S.resolveHazard?.(s);ok(t.hp===0&&m.hp>0,'다음 날 낮이 끝날 때 터져 회관 사람 죽음');}
// 3. 남의 집은 그대로: 낮에 설치 → 그날 밤이 끝날 때 터짐
{const s=game(35),m=s.players.find(p=>p.role==='godfather')||s.players.find(p=>p.team==='mafia'),t=s.players.find(p=>p.team==='town');s.day=2;s.turn=0;carry(s,m,'home');m.houseId=t.id;m.alley=null;t.location='hall';
 ok(armOpt(s,m)?.label===t.name+'의 집에 폭약 설치하기 · 다음 때가 끝나면 집 안·집 앞 사람 모두 죽음','남의 집 단추는 그대로: '+armOpt(s,m)?.label);
 S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);ok(s.feed.some(e=>e.to.includes(m.id)&&/도화선은 밤이 끝날 무렵/.test(e.text)),'설치한 사람에게 "밤이 끝날 무렵"');
 next(s);for(const p of s.players){p.location=p.team==='town'?'home':'hideout';p.houseId=null;}ST.beforeAdvance(s);S.resolveHazard?.(s);ok(t.hp===0,'그날 밤이 끝날 때 터져 집주인 죽음');}
// 4. 열차 전에 터지지 않는 때에는 단추 없음(마지막 날 장소, 마지막 밤 남의 집)
{const s=game(37),m=s.players.find(p=>p.team==='mafia'),t=s.players.find(p=>p.team==='town'),L=s.cfg.days||7;
 s.day=L-1;s.turn=0;carry(s,m,'hall');ok(!!armOpt(s,m),(L-1)+'일째 낮 회관: 단추 있음(다음 날 낮 끝에 터짐)');s.turn=2;ok(!!armOpt(s,m),(L-1)+'일째 밤 회관: 단추 있음');
 s.day=L;s.turn=0;ok(!armOpt(s,m),L+'일째(마지막 날) 낮 회관: 단추 없음');
 carry(s,m,'home');m.houseId=t.id;m.alley=null;ok(!!armOpt(s,m),L+'일째 낮 남의 집: 단추 있음(그날 밤 끝)');s.turn=2;ok(!armOpt(s,m),L+'일째 밤 남의 집: 단추 없음');}
// 5. 글: 터지는 때·설치할 수 있는 곳이 새 규칙과 같음, 옛 글이 없음
{const src=['05Scenarios','08StoryFlow','20Interface'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
 ok(!/갱도에 있으면 사망/.test(src),'"그때 갱도에 있으면 사망"(갱도에만 설치하던 때의 글) 없음');
 ok(!/(?<!자기 )집(과 |·)본거지를 뺀 어느/.test(src),'"집과 본거지를 뺀 어느 장소"가 모두 "자기 집…(남의 집 안 포함)"');
 ok(!/다음 때\(낮이면 밤, 밤이면 다음 날 낮\)/.test(src),'"다음 때(낮이면 밤, 밤이면 다음 날 낮)" 옛 글 없음');
 const s=game(39),m=s.players.find(p=>p.role==='godfather')||s.players.find(p=>p.team==='mafia');s.day=2;s.turn=0;carry(s,m,'hall');ok(/장소는 다음 날 낮이 끝날 때·남의 집은 다음 때가 끝날 때 터져/.test(NS.read(C.view(s,m.id)).text),'소지품 설명(폭약을 품었을 때)에 새 규칙');S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);const n0=s.feed.length;next(s);next(s);
 const morning=s.feed.slice(n0).filter(e=>e.to.includes(m.id)).map(e=>String(e.text)).join('\n');ok(/도화선이 타는 중: 마을 회관, 오늘 낮이 끝날 무렵 터짐/.test(morning),'다음 날 아침 마피아 상황 글: "마을 회관, 오늘 낮이 끝날 무렵 터짐"');
 const tx=NS.read(C.view(s,m.id)).text;
 ok(!/그때 갱도에 있으면/.test(tx),'화면에 갱도 옛 글 없음');}
