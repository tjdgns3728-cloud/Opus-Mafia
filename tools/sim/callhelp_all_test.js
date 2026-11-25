// 2026-11-25 사용자 결정 "도움을 청하면 모두가 그 집을 앎" + 남의 집에서 쓰러지면 집주인 이름. 사용: node callhelp_all_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=7;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const mk=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;}return s;};
const lines=(s,id,n0)=>s.feed.slice(n0).filter(e=>(e.to||e.ids||[]).includes?.(id)||e.who===id||true).map(e=>({to:e.to||e.ids,text:e.text}));
{const s=mk(),d=s.players[1],far=s.players[2],nb=s.players[3];d.location='home';d.houseId=null;d.hp=0;d.downed={left:1};nb.location='home';const n0=s.feed.length;const err=C.callHelp(s,d.id);ok(err==null,'도움 청하기 됨');
 const got=id=>s.feed.slice(n0).filter(e=>JSON.stringify(e).includes('"'+id+'"')).map(e=>e.text);
 ok(got(far.id).some(x=>x==='주택가 '+d.name+'의 집에서 도움을 청하는 신음 소리가 들립니다.'),'다른 곳(술집) 사람도 집을 들음');
 ok(got(nb.id).some(x=>x==='주택가 '+d.name+'의 집에서 도움을 청하는 신음 소리가 들립니다.'),'주택가 사람도 집을 들음');
 const farNote=JSON.stringify(far.known||[]);ok(farNote.includes(d.name+'의 집에서 누군가 도움을 청하는 소리'),'다른 곳 사람 수첩에 집이 남음(누가인지는 아님)');}
{const s=mk(),d=s.players[1],host=s.players[4],far=s.players[2];d.location='home';d.houseId=host.id;host.location='home';host.houseId=null;d.hp=0;d.downed={left:1};const n0=s.feed.length;C.callHelp(s,d.id);
 const txt=s.feed.slice(n0).map(e=>e.text).join('\n');ok(txt.includes('주택가 '+host.name+'의 집에서 도움을 청하는'),'남의 집에서 쓰러지면 집주인 이름('+host.name+')');ok(!txt.includes('주택가 '+d.name+'의 집에서'),'쓰러진 사람 이름의 집으로 나오지 않음');}
{const s=mk(),d=s.players[1],far=s.players[2];d.location='tavern';d.hp=0;d.downed={left:1};far.location='hall';const n0=s.feed.length;C.callHelp(s,d.id);const txt=s.feed.slice(n0).map(e=>e.text).join('\n');ok(txt.includes('쪽에서 누군가 도움을 청하는 소리'),'주택가 밖에서는 다른 곳 사람은 방향만(그대로)');}
