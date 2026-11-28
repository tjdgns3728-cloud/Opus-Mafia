// 2026-11-28 사용자: "그리고 폭약이나 총은 서로 전달할 수 있게 밤에 회의에서 서로 넘길 수 있게 설계합시다", 고른 것 "아이템 전달하기로 넣어주시고요 행동 사용하지 않습니다."
// 밤 회의 동안 같은 편에게 폭약·권총을 전달하는 버튼. 행동을 쓰지 않음. 사람 화면과 AI 화면에 같은 버튼, AI 밤 의논 물음도 누를 수 있음.
// 사용: node give_item_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]||'.'),dir=path.join(root,'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let seed=4531;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const fresh=()=>{const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.rng=rng;s.day=1;s.turn=2;s.stage='mafiaTalk';return s;};
const heard=(s,p,re)=>s.feed.some(e=>e.to.includes(p.id)&&re.test(String(e.text)));
// 1. 화면: 대부(폭약)·대행자(리스의 권총)에게 버튼
{const s=fresh(),gf=s.players.find(p=>p.role==='godfather'),mf=s.players.find(p=>p.role==='mafioso'),t=s.players.find(p=>p.team==='town');
 const vg=C.view(s,gf.id),tg=NS.read(vg).text;ok(/아이템 전달하기/.test(tg)&&tg.includes('['+mf.name+'에게 폭약 1개 전달하기]'),'대부 화면: [아이템 전달하기] 아래 ['+mf.name+'에게 폭약 1개 전달하기]');
 const tm=NS.read(C.view(s,mf.id)).text;ok(tm.includes('['+gf.name+'에게 리스의 권총 전달하기(탄환 3발)]'),'대행자 화면: ['+gf.name+'에게 리스의 권총 전달하기(탄환 3발)]');
 ok(!/아이템 전달하기/.test(NS.read(C.view(s,t.id)).text),'시민 화면에는 없음');
 // 누르면 전달, 행동은 그대로
 const r=NS.press(vg,NS.read(vg),{'버튼':mf.name+'에게 폭약 1개 전달하기'});ok(!r.error&&r.req?.type==='give-item'&&r.req.item==='dynamite'&&r.req.target===mf.id,'AI가 버튼 이름으로 누르면 같은 요청: '+JSON.stringify(r.req||r.error));
 const usedBefore=JSON.stringify([gf.used,mf.used]);const err=C.giveItem(s,gf.id,r.req.item,r.req.target);
 ok(!err&&gf.items.dynamite===0&&mf.items.dynamite===1&&s.scenario.bombs.some(b=>b.where==='carry:'+mf.id),'폭약 1개가 대행자 품으로');
 ok(JSON.stringify([gf.used,mf.used])===usedBefore,'행동을 쓰지 않음');
 ok(heard(s,gf,new RegExp(gf.name+'[이가] '+mf.name+'에게 폭약 1개를 건넸습니다'))&&heard(s,mf,/폭약 1개를 건넸습니다/)&&!heard(s,t,/건넸습니다/),'같은 편만 "○○이 ○○에게 폭약 1개를 건넸습니다"를 봄');
 const e2=C.giveItem(s,mf.id,'pistol',gf.id);ok(!e2&&gf.items.pistol===1&&gf.items.ammo===3&&gf.reesePistol&&!mf.items.pistol&&!mf.reesePistol,'리스의 권총과 탄환 3발이 대부에게(리스의 총인 것도 따라감)');}
// 2. 밤 회의가 아니면, 죽은 동료에게는, 가진 것이 없으면 안 됨
{const s=fresh(),gf=s.players.find(p=>p.role==='godfather'),mf=s.players.find(p=>p.role==='mafioso');s.stage='plan';ok(!!C.giveItem(s,gf.id,'dynamite',mf.id)&&!C.view(s,gf.id).giveOffers.length,'밤 회의가 아니면 전달 없음');
 s.stage='mafiaTalk';mf.hp=0;ok(!C.giveOffers(s,gf).some(o=>o.target===mf.id),'죽은 동료에게는 없음');mf.hp=10;
 gf.items.dynamite=0;s.scenario.bombs.forEach(b=>{if(b.where==='carry:'+gf.id)b.where='hideout';});ok(!C.giveOffers(s,gf).some(o=>o.item==='dynamite'),'폭약이 없으면 폭약 전달 없음');}
// 3. AI 밤 의논 물음이 누름을 받음, 서버가 give-item 요청을 받음
{const t=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');ok(/async function aiNightTalk[\s\S]{0,900}"누름"[\s\S]{0,700}pressAll\(r,p,v,scr,a\['누름'\],'밤 의논'\)/.test(t),'AI 밤 의논: 말과 함께 화면 버튼 누름을 받음');
 ok(/if\(a\.type==='give-item'\)\{[^}]*C\.giveItem\(s,id,a\.item,a\.target\)/.test(t),'서버: give-item 요청을 받아 전달');}
