// 주변 보기: 못 찾은 것을 "없음"으로 적지 않음(2026-11-25 자율 순환, 붙여 준 평가 2번)
// 사용: node observe_honest_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=21;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};}return s;};
const last=(s,p)=>s.feed.filter(e=>e.to.includes(p.id)&&/주변 살피기/.test(e.text||'')).at(-1)?.text||'';
// 1. 아무도 숨지 않았을 때와 숨었는데 못 찾았을 때 같은 글
{const s=fresh(),[a]=s.players;a.stats.observe=1;C.smallAct(s,a.id,{type:'observe'},()=>0);const none=last(s,a);
 const s2=fresh(),[b,h]=s2.players;b.stats.observe=1;h.hidden=true;h.stats.agility=10;C.smallAct(s2,b.id,{type:'observe'},()=>0);const miss=last(s2,b);
 ok(/숨은 사람을 찾지 못함/.test(none)&&!/숨은 사람 없음/.test(none),'아무도 숨지 않았을 때: '+none.slice(0,40));ok(/숨은 사람을 찾지 못함/.test(miss)&&!/숨은 사람 없음/.test(miss)&&!miss.includes(h.name+' '),'숨었는데 못 찾았을 때도 같은 글(누가 숨었는지 안 나옴): '+miss.slice(0,40));}
// 2. 찾으면 이름이 나옴
{const s=fresh(),[a,h]=s.players;a.stats.observe=10;h.hidden=true;h.stats.agility=1;C.smallAct(s,a.id,{type:'observe'},()=>0.99);ok(/숨은 사람 발견/.test(last(s,a)),'찾으면 "숨은 사람 발견"');}
// 3. 버튼 설명과 게임 정보
{const s=fresh(),[a]=s.players;const scr=NS.read(C.view(s,a.id));ok(/숨은 사람을 찾지 못했다고 아무도 숨어 있지 않다는 뜻은 아닙니다/.test(scr.text),'게임 정보에 못 찾음 ≠ 없음');}
