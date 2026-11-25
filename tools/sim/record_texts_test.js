// 2026-11-25 기록 분석(run30~33) 범위 안 글 고침 확인: 얼굴을 가린 습격자 글, 뒤밟기 결과, 붙잡기 당사자 글, 습격당한 사람의 밤 행동 줄,
// 지키던 사람이 맞선 총성 위치, 자기 지혈 글, 보호했는데 공격이 안 온 알림, 사진 글 말투. 사용: node record_texts_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=77;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const NAMES=['가람','나래','다온','라희','마루','바다','사랑','아라'];
const fresh=()=>{const s=C.create(NAMES.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);S.afterGathering?.(s);return s;};
const toNight=s=>{s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
const day=s=>{s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.houseId=null;p.used={big:false,small:false};p.hidden=false;}return s;};
const to=(s,id,n0=0)=>s.feed.slice(n0).filter(e=>e.to.includes(id));

// 2. 얼굴을 가린 습격자 대 깨어 있는 집주인
{const atk=[],host=[];let plainSeen=false;
 for(let i=0;i<160;i++){const s=fresh();toNight(s);const m=s.players.find(p=>p.team==='mafia'),[v,w]=s.players.filter(p=>p.team==='town');const covered=i%2===0;
  if(covered){m.faceCover=true;s.aliases={[m.id]:1};s.aliasSeq=1;}
  s.plans={[m.id]:{type:'attack',target:v.id,weapon:'knife',nightRaid:true,flee:'stay'},[v.id]:{type:'watch'},[w.id]:{type:'sleep'}};C.announceClashes(s);s.stage='plan';const n0=s.feed.length;C.resolveBig(s,rng);
  const a=to(s,m.id,n0).map(e=>e.text).filter(t=>/깨어 있었음/.test(t)),h=v.known.map(k=>k.text).filter(t=>/내 집에 쳐들어왔다/.test(t));
  if(covered){atk.push(...a);host.push(...h);}else if(a.some(t=>/얼굴을 들킴/.test(t)))plainSeen=true;}
 ok(atk.length>0&&!atk.some(t=>/얼굴을 들킴/.test(t))&&atk.some(t=>/얼굴을 가려 정체는 안 들킴/.test(t)),'얼굴을 가린 습격자 글에 "얼굴을 들킴" 없음 · '+(atk[0]||'(맞붙은 판 없음)'));
 ok(host.length>0&&!host.some(t=>/똑똑히 봤다/.test(t))&&host.every(t=>/누군지는 보지 못했다/.test(t)),'집주인 수첩에 "똑똑히 봤다" 없음 · '+(host[0]||'(없음)'));
 ok(plainSeen,'얼굴을 가리지 않은 습격자는 그대로 "얼굴을 들킴"');}

// 3. 곁에서 지키던 사람을 밟으면 "곁을 지켰습니다"(2026-11-25 시험 보강: 주사위를 고정해 밟기가 늘 성공하게 하고, 실패를 "밟기 성공 없음"과 "글이 틀림"으로 나눔)
{const s=day(fresh());const [P,T,X]=s.players;P.stats.agility=10;T.stats.observe=1;s.plans={[P.id]:{type:'track',target:T.id},[T.id]:{type:'guardPlayer',target:X.id},[X.id]:{type:'wait'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.resolveBig(s,()=>0.99);
 const k=P.known.map(k=>k.text).filter(t=>/^추적/.test(t));
 ok(k.length>0,'밟기 성공(주사위 고정, 은신 10 대 관찰 1) · '+(k[0]||'밟기 성공 없음'));
 ok(k.length>0&&k.some(t=>/곁을 지켰습니다/.test(t))&&!k.some(t=>/무언가를 했습니다/.test(t)),'곁에서 지키기를 밟은 결과가 "○○의 곁을 지켰습니다" · '+(k.length?'글: '+k.join(' / '):'밟기 성공 없음'));}

// 4. 붙잡기 글: 행동한 사람·붙잡힌 사람·지켜본 사람
{const s=day(fresh());const P=s.players.find(p=>p.role==='jailor')||s.players[0];P.role='jailor';const [T,X]=s.players.filter(p=>p!==P);s.plans={[P.id]:{type:'jail',target:T.id}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};const n0=s.feed.length;C.resolveBig(s,rng);
 const a=to(s,P.id,n0).map(e=>e.text).join(' / '),b=to(s,T.id,n0).map(e=>e.text).join(' / '),c=to(s,X.id,n0).map(e=>e.text).join(' / ');
 const pn=P.name,tn=T.name,PP=C.pp(pn,'이','가'),TP=C.pp(tn,'을','를');ok(a.includes('당신이 '+TP+' 붙잡으려 했습니다')&&!a.includes(PP+' '+TP+' 붙잡으려'),'행동한 사람: "당신이 ○○를 붙잡으려 했습니다" · '+(a.match(/[^/]*붙잡으려[^/]*/)||[''])[0].trim());
 ok(b.includes(PP+' 당신을 붙잡으려 했습니다')&&!b.includes(TP+' 붙잡으려'),'붙잡힌 사람: "○○가 당신을 붙잡으려 했습니다" · '+(b.match(/[^/]*붙잡으려[^/]*/)||[''])[0].trim());
 ok(c.includes(PP+' '+TP+' 붙잡으려 했습니다'),'지켜본 사람은 그대로 3인칭 · '+(c.match(/[^/]*붙잡으려[^/]*/)||[''])[0].trim());
 ok(s.feed.slice(n0).filter(e=>/붙잡으려 했습니다/.test(e.text)).every(e=>e.roll),'세 글 모두 판정이 붙음');}

// 5. 습격당한 사람의 [내 행동] 줄이 문장
{let line=null;for(let i=0;i<40&&!line;i++){const s=fresh();toNight(s);const m=s.players.find(p=>p.team==='mafia'),[v]=s.players.filter(p=>p.team==='town');s.plans={[m.id]:{type:'attack',target:v.id,weapon:'knife',nightRaid:true,flee:'stay'},[v.id]:{type:'sleep'}};const n0=s.feed.length;C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);
  const mine=to(s,v.id,n0).filter(e=>e.tag==='내 행동').map(e=>e.text);if(mine.length)line=mine;}
 ok(line&&line.includes('잠을 잤습니다')&&!line.includes('잠'),'습격당한 사람의 밤 행동 줄 "잠을 잤습니다" · '+(line||[]).join(', '));}

// 6. 집을 지키던 사람이 대신 맞서다 진 뒤의 총성은 원래 집 쪽에서
{let shot=null,owner=null,guard=null;for(let i=0;i<300&&!shot;i++){const s=fresh();toNight(s);const m=s.players.find(p=>p.team==='mafia'),town=s.players.filter(p=>p.team==='town'),[v,g]=town;m.items.pistol=true;m.items.ammo=2;
  const plans={[m.id]:{type:'attack',target:v.id,weapon:'pistol',nightRaid:true,flee:'stay'},[g.id]:{type:'guardHouse',target:v.id}};for(const p of town)if(!plans[p.id])plans[p.id]={type:'sleep'};s.plans=plans;C.announceClashes(s);s.stage='plan';const n0=s.feed.length;C.resolveBig(s,rng);
  const e=s.feed.slice(n0).find(x=>/집 쪽에서 총성\./.test(x.text)&&s.events.some(ev=>ev.type==='attack'&&ev.target===g.id));if(e){shot=e.text;owner=v.name;guard=g.name;}}
 ok(shot&&shot.startsWith(owner+'의 집')&&!shot.startsWith(guard+'의 집'),'지키던 사람이 맞서도 총성은 쳐들어간 집 쪽 · '+(shot||'(지키던 사람이 진 판 없음)')+' (집주인 '+owner+', 지킨 사람 '+guard+')');}

// 7. 자기 출혈을 막으면 "자기 상처를"
{const s=day(fresh());s.stage='small';const P=s.players[0];P.bleeding=true;P.hp=6;P.items.bandage=1;const n0=s.feed.length;const err=C.smallAct(s,P.id,{type:'bandage',target:P.id},rng);const t=to(s,P.id,n0).map(e=>e.text).join(' / ');
 ok(!err&&/자기 상처를 압박했습니다/.test(t)&&!/가람의 상처를/.test(t),'자기 지혈: "자기 상처를 압박했습니다" · '+(err||(t.match(/[^/]*압박했습니다[^/]*/)||[''])[0].trim()));}

// 8. 보호하기를 눌렀는데 공격이 닿지 않으면 알림, 맞섰으면 그 줄 없음
{const setup=()=>{const s=fresh();const A=s.players.find(p=>p.team==='mafia'),[V,G]=s.players.filter(p=>p.team==='town');for(const p of s.players)p.location='chapel';s.day=2;s.turn=0;s.stage='plan';s.plans={};C.queue(s,A.id,{type:'attack',target:V.id,weapon:'fist'});C.announceClashes(s);s.stage='react';s.protects={[V.id]:G.id};return {s,A,V,G};};
 {const {s,V,G}=setup();V.location='hall';s.stage='plan';const n0=s.feed.length;C.resolveBig(s,rng);const t=to(s,G.id,n0).map(e=>e.text).join(' / ');ok(new RegExp('이번 때 '+V.name+'[을를] 향한 공격은 오지 않았습니다').test(t),'공격받을 사람이 자리를 옮기면 막아선 사람에게 "공격은 오지 않았습니다" · '+(t.match(/[^/]*오지 않았습니다[^/]*/)||[t.slice(0,60)])[0].trim());}
 {const {s,G}=setup();s.stage='plan';const n0=s.feed.length;C.resolveBig(s,rng);const t=to(s,G.id,n0).map(e=>e.text).join(' / ');ok(!/오지 않았습니다/.test(t)&&/앞을 막아서 대신 맞섭니다/.test(t),'공격을 대신 맞섰으면 그 줄 없음');}}

// 사진 글 말투
{const t=fs.readFileSync(path.join(dir,'02Press.js'),'utf8');ok(!/셔터를 누른다|필름에 남는다|정하지 않았다\.|그대로 둔다/.test(t)&&/셔터를 눌렀습니다/.test(t),'사진 찍기 글이 합니다체');}
