// NPC 위치가 이야기를 따라가는지, 아침 상황 문장이 반복되지 않는지 확인. 사용: node npcmove_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=17;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const seats=Array.from({length:6},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다'][i],bot:true}));
const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);const st=s.scenario.continuation,where=[];
const step=()=>{s.plans={};C.nextTurn(s);S.nextChapter(s);where.push(`${s.day}일 ${['낮1','낮2','밤'][s.turn]}: 도일 ${C.places[st.npcs.doyle.location].short} · 광부 ${C.places[st.npcs.miner.location].short} · 해먼드 ${C.places[st.npcs.mayor.location].short}`);};
for(let i=0;i<8;i++)step();console.log('   '+where.join('\n   '));
ok(where.some(w=>w.startsWith('2일 낮2: 도일 갱도')),'둘째 날 낮2 도일은 갱도(주택가 아님)');
ok(where.some(w=>/2일 낮1: .*광부 술집/.test(w)),'갱도가 닫히면 젊은 광부는 술집');
// 장소 글에 지금 있는 NPC 표시
const p=s.players.find(p=>p.team==='town');s.turn=0;s.day=3;s.epoch++;S.nextChapter(s);p.location=st.npcs.miner.location;const before=s.feed.length;S.arrival(s,p);const txt=s.feed.slice(before).map(e=>e.text).join(' ');
ok(!/지금 여기에는/.test(txt),'NPC가 있는 곳에 도착해도 "지금 여기에는 …" 글을 보내지 않음(누가 있는지는 NPC 목록의 밝기로 보여 줌)');
// 아침 상황 문장 반복 생략
const role=s.players.find(p=>p.team==='mafia');const lines=s.feed.filter(e=>e.to.includes(role.id)&&e.tag==='아침').map(e=>e.text.split('\n')[0]);
console.log('   '+lines.join('\n   '));ok(new Set(lines.map(l=>l.replace(/ ?(열차는 모레 새벽에 옴\.|오늘 밤이 지나면 열차가 옴\.)$/,'').trim()).filter(Boolean)).size===lines.map(l=>l.replace(/ ?(열차는 모레 새벽에 옴\.|오늘 밤이 지나면 열차가 옴\.)$/,'').trim()).filter(Boolean).length,'같은 상황 문장이 다시 나오지 않음');
