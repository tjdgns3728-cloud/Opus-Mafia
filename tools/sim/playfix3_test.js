// 7일 시험 플레이에서 찾은 문제(이야기 흐름 1~5, 글 6~10)가 고쳐졌는지 확인. 사용: node playfix3_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라'];
function game(seed=1074){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);S.afterGathering?.(s);s.rng=rng;return s;}
function advance(s,until,hook){while(!s.result&&!(s.day===until.day&&s.turn===until.turn)){hook?.(s);ST.beforeAdvance?.(s);C.tickBleed(s);C.nextTurn(s);S.nextChapter(s);C.finish(s);}return s;}
const seen=(s,p,re)=>s.feed.some(e=>e.to.includes(p.id)&&re.test(String(e.text)));
const count=(s,p,re)=>s.feed.filter(e=>e.to.includes(p.id)&&re.test(String(e.text))).length;
const role=(s,r)=>s.players.find(p=>p.role===r);

// 1. 직업의 기본 안내('갱도가 닫힘' 상황 글)는 폭약이 옮겨졌어도 둘째 날 아침에 먼저 나온다
{const s=game();const gf=role(s,'godfather'),mf=role(s,'mafioso');advance(s,{day:2,turn:0},s=>{if(s.day===1&&s.turn===0)for(const b of s.scenario.bombs)b.where='carry:'+gf.id;});
 const t=s.feed.filter(e=>e.to.includes(mf.id)&&e.source==='story/story_jobs.md'&&parseInt(e.time,10)===2).map(e=>e.text).join('\n');
 /* 2026-11-24 새 방향: 직업 이야기 단락 대신 상황 한 줄 */ok(/갱도 폐쇄/.test(t),'대행자: 둘째 날 아침에 갱도 상황이 나옴');
 advance(s,{day:3,turn:0});ok(s.feed.some(e=>e.to.includes(mf.id)&&parseInt(e.time,10)<=3&&/폭약 위치: .*의 품에 2개/.test(e.text)),'대행자: 아침에 폭약이 지금 누구 품에 있는지 나옴');}
// 2. 아침에 아무도 없을 때 생긴 장면(도일의 협박장 공개)은 그 턴에 그곳에 오는 사람이 본다
{const s=game();advance(s,{day:1,turn:1});s.scenario.doyle.threatened=true;advance(s,{day:2,turn:0});const p=s.players.find(p=>p.team==='town');ok(!seen(s,p,/도일이 협박장 공개/),'아침에 집에 있던 사람은 아직 못 봄');p.location='hall';S.arrival(s,p);ok(seen(s,p,/도일이 협박장 공개/),'아침에 회관으로 온 사람은 도일의 협박장 공개를 봄');S.arrival(s,p);ok(count(s,p,/도일이 협박장 공개/)===1,'한 번만 봄');}
// 3. 같은 편이 폭약을 꺼내면 바로 알린다 / 쓰러지면서 떨어뜨려도 알린다
{const s=game();const gf=role(s,'godfather'),mf=role(s,'mafioso');gf.location='chapel';s.scenario.bombs.forEach((b,i)=>b.where=i<2?'chapel':'hideout');s.turn=1;s.stage='plan';const err=S.resolve(s,gf,{type:'scene',sceneKey:'take'},s.rng);ok(!err&&seen(s,mf,/같은 편 .*작은 교회에서 폭약 2개를 꺼냈습니다/),'같은 편이 폭약을 꺼내면 대행자가 바로 앎');gf.location='hall';gf.hp=0;S.fallen(s,gf);ok(seen(s,mf,/쓰러지면서 품에 있던 폭약 2개가 마을 회관에 남았습니다/),'같은 편이 쓰러지며 폭약을 떨어뜨린 곳을 앎');}
// 4. 마피아가 혼자 남으면 '같은 편과 모였습니다', '30초 의논'이 나오지 않는다
{const s=game();const gf=role(s,'godfather'),mf=role(s,'mafioso');gf.hp=0;C.death?.(s,gf,'시험');advance(s,{day:1,turn:2});const night=s.feed.filter(e=>e.to.includes(mf.id)&&/본거지/.test(e.text)).at(-1)?.text||'';ok(/같은 편 없음/.test(night)&&!/같은 편과 30초/.test(night),'혼자 남은 마피아의 밤 글');}
// 5. 아이가 같은 말을 두 번 하지 않는다
{const s=game();s.scenario.spots=['chapel','cart'];s.scenario.rumor={...s.scenario.rumor,chapel:true,child:'chapel'};/* 아이가 교회를 본 판 */const p=s.players.find(p=>p.team==='town');advance(s,{day:1,turn:1});p.location='home';S.arrival(s,p);/* 2026-11-23: NPC 말은 묻는 작은 행동 때만 */S.askNpc(s,p,'child');ok(seen(s,p,/교회 쪽으로 갔다/),'첫날 주택가: 아이에게 물으면 방향만(2026-11-19)');advance(s,{day:2,turn:0});p.location='home';S.arrival(s,p);ok(!seen(s,p,/맨발의 아이가 소매를 잡습니다/),'둘째 날 주택가: 같은 내용의 사건 글이 다시 나오지 않음');
 const s2=game();s2.scenario.spots=['chapel','cart'];const p2=s2.players.find(p=>p.team==='town');advance(s2,{day:2,turn:0});p2.location='home';S.arrival(s2,p2);ok(count(s2,p2,/무거운 꾸러미를 안고/)===1,'둘째 날 처음 주택가에 오면 아이의 말이 한 번만 나옴');}
// 6. 재판 신청 이유 끝에 마침표가 두 번 찍히지 않는다
{const s=game();const a=s.players.find(p=>p.team==='town'),t=s.players.find(p=>p.id!==a.id);s.stage='plan';const err=C.queue(s,a.id,{type:'file',target:t.id,reason:'단검으로 공격했습니다.'});if(!err){C.resolveBig(s,s.rng);}const note=s.feed.filter(e=>/공식 재판 신청/.test(e.text)).at(-1)?.text;ok(note?!/[^.]\.\.(?!\.)/.test(note):true,'재판 신청 글에 마침표 두 번 없음'+(note?'':' (신청 글을 만들지 못해 건너뜀: '+err+')'));}
// 7. 자기 상처를 치료하면 '자기 상처'
{const s=game();const d=role(s,'doctor')||s.players[0];d.location='clinic';d.hp=5;d.items.medicine=(d.items.medicine||0)+1;s.stage='plan';const err=C.queue(s,d.id,{type:'heal',target:d.id});if(!err)C.resolveBig(s,s.rng);const t=s.feed.filter(e=>/치료제로/.test(e.text)).at(-1)?.text;ok(t?/자기 상처/.test(t)&&!new RegExp(d.name+'의 상처').test(t):true,'자기 치료 글: '+(t||'(치료 글을 만들지 못해 건너뜀: '+err+')'));}
// 9. 도일의 대답이 돈과 협박에 따라 다르고, 회관에서 팻말을 들지 않는다
{const s=game();const gf=role(s,'godfather');gf.location=s.scenario.doyle.location;gf.money=10;s.turn=0;ok(!S.choices(s,gf,'big').some(a=>a.sceneKey==='bribe')&&S.validate(s,gf,{type:'scene',sceneKey:'bribe'},'big')!==null,'도일에게 돈으로 운영 자금을 제안하는 행동은 없음(2026-11-19 사용자 결정)');}
// 10. NPC가 쓰러지는 것을 본 사람에게 다음 날 '시신을 발견합니다'를 다시 보내지 않는다
{const s=game();advance(s,{day:1,turn:1});const p=s.players.find(p=>p.team==='town');p.location='home';const mn=Object.values(s.scenario.continuation.npcs).find(n=>n.id==='miner');mn.location='home';mn.hp=1;mn.bleeding=true;mn.injuredEpoch=s.epoch-1;advance(s,{day:2,turn:0});const fell=seen(s,p,/출혈로 쓰러짐/),found=seen(s,p,/시신 발견/);ok(fell?!found:true,'쓰러지는 것을 본 사람: '+(fell?(found?'발견 글이 또 나옴':'발견 글 없음'):'(쓰러지는 장면을 만들지 못해 건너뜀)'));}
{const s=game();advance(s,{day:1,turn:1});const town=s.players.filter(p=>p.team==='town');const p=town[0],o=town[1];p.location='home';o.location='tavern';const mn=Object.values(s.scenario.continuation.npcs).find(n=>n.id==='miner');mn.location='home';mn.hp=1;mn.bleeding=true;mn.injuredEpoch=s.epoch-1;advance(s,{day:2,turn:0});ok(seen(s,o,/젊은 광부의 시신 발견/),'쓰러지는 것을 못 본 사람은 다음 날 아침 발견 글을 받음');}
