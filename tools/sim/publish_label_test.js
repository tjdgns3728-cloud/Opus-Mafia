// 신문 만들기 버튼에 찍은 때·장소(2026-11-25 자율 순환, run25: 기자 사진 4번·신문 0번)
// 사용: node publish_label_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=61;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';
for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};}
const rep=s.players.find(p=>p.role==='reporter')||s.players[0];rep.role='reporter';rep.items.camera=1;rep.photos=[{id:'ph1',time:'1일째 낮',place:'tavern',target:s.players[1].id},{id:'ph2',time:'2일째 낮',place:'hall',target:s.players[2].id}];
const labs=C.choices(s,rep.id,'big').filter(a=>a.type==='publish').map(a=>a.label);
ok(labs.length===2&&labs[0]!==labs[1],'사진마다 신문 만들기 버튼 이름이 다름: '+labs.join(' / '));
ok(labs.some(l=>/1일째 낮/.test(l))&&labs.some(l=>/2일째 낮/.test(l)),'찍은 때가 들어감');
