// 2026-11-25 기록 분석(run25~29): 인물 조사에 실패해서 이미 아는 장화만 보면 "새로 알게 된 것 없음"을 분명히 하고 같은 줄을 다시 적지 않는다.
// 사용: node invest_known_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=91;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';
for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
const P=s.players.find(p=>p.role!=='detective'&&p.role!=='sheriff'),T=s.players.find(p=>p.id!==P.id&&p.boots);P.stats.observe=0;const low=()=>0.01;
const look=()=>{P.used={big:false,small:false};const n0=s.feed.length;C.smallAct(s,P.id,{type:'investigate',target:T.id},low);return s.feed.slice(n0).filter(e=>e.to.includes(P.id)).map(e=>e.text).join(' / ');};
const first=look(),notes1=P.known.filter(k=>/장화/.test(k.text)&&k.about===T.id).length;
ok(/자세히 보지는 못했지만/.test(first)&&!/새로 알게 된 것은 없습니다/.test(first),'처음 실패: 장화를 봄(새 정보) · '+first.slice(0,90));
s.epoch++;const second=look(),notes2=P.known.filter(k=>/장화/.test(k.text)&&k.about===T.id).length;
ok(/이미 알던 것이라 새로 알게 된 것은 없습니다/.test(second),'두 번째 실패: "이미 알던 것이라 새로 알게 된 것은 없습니다" · '+second.slice(0,120));
ok(notes2===notes1,'수첩에 같은 장화 줄을 다시 적지 않음 ('+notes1+' → '+notes2+')');
