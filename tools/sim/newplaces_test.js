// 새 장소 네 곳(선로 옆·보안관 사무소·노조 사무실·협곡 다리)과 암거래 상인 확인. 사용: node newplaces_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory;let seed=29;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const hi=()=>0.99;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const game=()=>{const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';s.scenario.discovered=true;for(const q of s.players){q.used={big:false,small:false};q.location='hall';q.houseId=null;q.hidden=false;q.nightMoveEpoch=null;}return s;};
const mine=(s,p)=>s.feed.filter(e=>e.to.includes(p.id)).map(e=>String(e.text)).join(' / ');
const NEW=['rail','office','union','bridge'];

// 1. 장소가 있고, 행동을 쓰지 않는 이동으로 갈 수 있으며, 들어서면 그 장소의 묘사가 나온다
{const s=game(),p=s.players.find(q=>q.team==='town');
 ok(NEW.every(k=>C.places[k]&&!C.places[k].secret),'새 장소 네 곳이 있고 모두 갈 수 있는 곳');
 ok(NEW.every(k=>C.choices(s,p.id,'small').some(a=>a.type==='move'&&a.place===k)),'무료 이동 목록에 네 곳이 모두 있음');
 for(const k of NEW){p.nightMoveEpoch=null;C.smallAct(s,p.id,{type:'move',place:k},rng);const env=C.view(s,p.id).environment.join(' ');ok(p.location===k&&!/주택가의 문들이 하나씩/.test(env),C.places[k].name+'에 들어서면 그곳 묘사가 나옴(주택가 글이 아님)');}
 ok(C.places.union.light<0&&C.places.bridge.cover===2&&C.places.office.light>0,'장소 특징: 노조 사무실은 어둡고, 협곡 다리는 숨을 곳이 많고, 사무소는 밝음');}

// 2. 암거래 상인: 선로 옆에 있고, 끌어들일 수 없으며, 손님 이야기는 판마다 다르다
{let talks=0,silent=0;for(let i=0;i<120;i++){const s=game();(s.scenario.rumor.merchantTalks?talks++:silent++);}ok(talks&&silent,'상인이 손님 이야기를 하는 판과 하지 않는 판이 모두 있음 ('+talks+' / '+silent+')');
 const s=game(),m=ST.npc(s,'merchant'),gf=s.players.find(q=>q.team==='mafia'),t=s.players.find(q=>q.team==='town');
 ok(m&&m.location==='rail'&&m.hp===10,'암거래 상인이 선로 옆에 있음');
 gf.location='rail';ok(!S.choices(s,gf,'big').some(a=>a.npc==='merchant'&&/recruit/.test(a.verb||'')),'마피아가 상인을 끌어들일 수 없음');
 t.location='rail';ok(S.speakTopic(s,t,'상인, 무슨 물건 파시오?')==='npc:merchant:goods'&&S.speakTopic(s,t,'상인, 오늘 누가 다녀갔소?')==='npc:merchant:who','상인에게 물건과 손님을 물을 수 있음');
 S.talk(s,t,'npc:merchant:goods');ok(/아무에게나 팔지는 않소/.test(mine(s,t)),'물건을 물으면 아무에게나 팔지 않는다고 함(거래는 값을 정한 뒤)');}

// 3. 보안관 사무소: 보안관은 처음부터 서랍을 살필 수 있고, 다른 사람은 해먼드에게 들어야 생긴다. 쪽지는 판마다 다르다
{const kinds={};for(let i=0;i<150;i++){const s=game();kinds[s.scenario.rumor.memo||'없음']=(kinds[s.scenario.rumor.memo||'없음']||0)+1;}ok(Object.keys(kinds).length>=3&&kinds['없음']>0,'서랍 쪽지는 판마다 다름(없을 때도 있음) '+JSON.stringify(kinds));
 const opt=(s,p)=>S.choices(s,p,'small').find(a=>a.sceneKey==='search:desk');
 let s=game();const sh=s.players.find(q=>q.role==='sheriff'),other=s.players.find(q=>q.team==='town'&&q.role!=='sheriff');
 if(sh){sh.location='office';ok(!!opt(s,sh),'보안관은 처음부터 "리스의 책상 서랍을 살핀다"가 있음');}else ok(true,'(이 판에는 보안관 없음)');
 other.location='office';ok(!opt(s,other),'다른 사람은 해먼드에게 듣기 전에는 없음');other.npcHeard=['lead:office'];ok(!!opt(s,other),'해먼드에게 들은 뒤에는 생김');
 s.scenario.rumor.memo='payday';S.resolve(s,other,opt(s,other),hi);ok(other.storyKnown.includes('desk')&&/임금날 — 술집 뒤/.test(mine(s,other)),'쪽지가 있는 판에서 성공하면 쪽지를 찾음');
 s=game();const o2=s.players.find(q=>q.team==='town');o2.location='office';o2.npcHeard=['lead:office'];s.scenario.rumor.memo=null;S.resolve(s,o2,S.choices(s,o2,'small').find(a=>a.sceneKey==='search:desk'),hi);ok(/빈 서류철뿐/.test(mine(s,o2))&&!S.choices(s,o2,'small').some(a=>a.sceneKey==='search:desk'),'쪽지가 없는 판에서는 빈 서류철뿐이라는 것을 알고 다시 나오지 않음');
 let lead=0,none=0;for(let i=0;i<120;i++){const s=game();(s.scenario.rumor.officeLead?lead++:none++);}ok(lead&&none,'해먼드가 서랍 이야기를 하는 판과 하지 않는 판이 모두 있음 ('+lead+' / '+none+')');}

// 4. 노조 장부는 노조 사무실에 있고(술집 뒤가 아님), 적힌 내용은 도일에게 손을 뻗었는지에 따라 다르다
{let s=game(),t=s.players.find(q=>q.team==='town');t.location='tavern';for(let i=0;i<8;i++)S.investigate(s,t,hi);ok(!t.storyKnown.includes('ledger'),'술집에서는 노조 장부가 나오지 않음');
 t.location='union';for(let i=0;i<8;i++)S.investigate(s,t,hi);ok(t.storyKnown.includes('ledger')&&t.known.some(k=>/임금 지급 기록만/.test(String(k.text))),'노조 사무실에서 장부를 찾음(아무도 손을 뻗지 않았으면 임금 기록만)');
 s=game();t=s.players.find(q=>q.team==='town');s.scenario.doyle.threatened=true;t.location='union';for(let i=0;i<8;i++)S.investigate(s,t,hi);ok(t.known.some(k=>/돈을 내밀며 노조를 넘기라고/.test(String(k.text))),'도일이 협박받은 판에는 거절 메모가 적혀 있음');}

// 5. 협곡 다리의 흔적은 판마다 다르고, 광부의 다리 이야기도 판마다 다르다
{const kinds={};let lead=0,none=0;for(let i=0;i<150;i++){const s=game();kinds[s.scenario.rumor.bridge]=(kinds[s.scenario.rumor.bridge]||0)+1;(s.scenario.rumor.bridgeLead?lead++:none++);}
 ok(Object.keys(kinds).length===3,'다리에 남은 흔적이 판마다 다름 '+JSON.stringify(kinds));ok(lead&&none,'광부가 다리 이야기를 하는 판과 하지 않는 판이 모두 있음 ('+lead+' / '+none+')');
 const s=game(),t=s.players.find(q=>q.team==='town');t.location='bridge';for(let i=0;i<8;i++)S.investigate(s,t,hi);ok(t.storyKnown.some(k=>k.startsWith('bridge:')),'다리에서 현장 수색으로 흔적을 찾음');}
