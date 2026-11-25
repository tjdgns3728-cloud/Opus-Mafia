// 2026-11-25 사용자: 8명 마피아 2명(대부·대행자), 11명 마피아 3명(대부·대행자 + 대행자·조언자·납치범 중 무작위). 로비·시작은 8·11명만. 사용: node mafia_count_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]||'.'),dir=path.join(root,'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(o){globalThis.__room=o;},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
eval(fs.readFileSync(path.join(dir,'10Session.js'),'utf8'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ROOM=globalThis.__room;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라','자람','차오','하늘'];
const mk=(n,sd)=>{let seed=sd;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const s=C.create(Array.from({length:n},(_,i)=>({id:'p'+i,name:names[i],bot:true})),rng);return {s,rng};};
const mafiaRoles=s=>s.players.filter(p=>p.team==='mafia').map(p=>p.role).sort();
{let all=true;for(let k=1;k<=200;k++){const {s}=mk(8,k*7919);if(JSON.stringify(mafiaRoles(s))!==JSON.stringify(['godfather','mafioso']))all=false;}ok(all,'8명: 200판 모두 마피아 2명 = 대부·대행자');}
{const third={};let all=true,town=true;const pool=['sheriff','doctor','jailor','guard','detective','reporter','lawyer','pharmacist'];
 for(let k=1;k<=300;k++){const {s}=mk(11,k*104729);const m=mafiaRoles(s);if(m.length!==3||!m.includes('godfather')||!m.includes('mafioso')){all=false;continue;}const rest=[...m];rest.splice(rest.indexOf('godfather'),1);rest.splice(rest.indexOf('mafioso'),1);third[rest[0]]=(third[rest[0]]||0)+1;
  const t=s.players.filter(p=>p.team==='town').map(p=>p.role).sort();if(JSON.stringify(t)!==JSON.stringify([...pool].sort()))town=false;}
 ok(all,'11명: 300판 모두 마피아 3명이고 대부·대행자 포함');
 ok(Object.keys(third).sort().join(',')==='consigliere,kidnapper,mafioso','11명: 세 번째 자리에 대행자·조언자·납치범이 모두 나옴 ('+JSON.stringify(third)+')');
 ok(town,'11명: 시민 8명 = 시민 직업 8개가 하나씩');}
{let found=null;for(let k=1;k<=400&&!found;k++){const r=mk(11,k*7907);if(r.s.players.filter(p=>p.role==='mafioso').length===2)found=r;}
 ok(!!found,'대행자 둘인 11명 판을 찾음');
 if(found){const {s,rng}=found;let err=null;try{S.start(s);S.afterGathering?.(s);}catch(e){err=e;}ok(!err,'대행자 둘인 11명 판 시작 오류 없음'+(err?' ('+err.message+')':''));
  const ms=s.players.filter(p=>p.role==='mafioso');
  ok(ms.filter(p=>p.reesePistol).length===1&&ms.filter(p=>p.items.pistol).length===1,'대행자 둘이어도 리스의 권총은 한 명만');
  ok(ms.every(p=>p.items.knife),'대행자 둘 모두 단검');
  ok(!JSON.stringify(C.view(s,ms[1].id)).includes('undefined'),'두 번째 대행자 화면 정보에 빈 값 없음');
  err=null;let planned=0;try{s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter(s);s.stage='plan';const tgt=s.players.filter(p=>p.team==='town');s.plans={};
   ms.forEach((m,i)=>{const a=[...C.choices(s,m.id,'big'),...S.choices(s,m,'big')].find(x=>x.type==='attack'&&x.nightRaid&&x.target===tgt[i].id);if(a){s.plans[m.id]=a;planned++;}});
   C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);C.nextTurn(s);}catch(e){err=e;}
  ok(planned===2,'대행자 둘 모두 밤 습격 선택지가 있음');
  ok(!err,'대행자 둘이 밤에 습격해도 오류 없음'+(err?' ('+err.message+')':''));
  ok(!s.feed.some(e=>String(e.text).includes('undefined')),'그 밤의 글에 빈 값 없음');}}
{const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(ui.includes('<option value="8">8명</option><option value="11">11명</option></select>')&&!/value="(4|6|12)">/.test(ui),'로비 참가 인원은 8명·11명만');
 ok(ui.includes('8명(마피아 2명) 또는 11명(마피아 3명)일 때 시작할 수 있습니다'),'대기실에 시작 가능 인원 안내');}
ok(ROOM.min===8&&ROOM.max===11,'방 인원 8~11');
ok(ROOM.canStart(null,8).ok&&ROOM.canStart(null,11).ok&&ROOM.canStart(null,9).ok===false&&ROOM.canStart(null,10).error==='8명 또는 11명일 때 시작할 수 있습니다 (지금 10명).','시작은 8명·11명만, 9·10명은 안내와 함께 거절');
ok(fs.readFileSync(path.join(root,'game','webengine','server','room_host.js'),'utf8').includes('rules.canStart(R.api, here)'),'엔진이 시작 전에 게임의 canStart를 물음');
