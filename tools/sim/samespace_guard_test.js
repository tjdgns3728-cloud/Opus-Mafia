// 2026-11-25 run38: 다른 집 앞 지킴이끼리는 다른 공간(정보 샘 고침). 사용: node samespace_guard_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=11;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);const P=s.players;for(const p of P){p.location='home';p.houseId=null;p.alley=undefined;}
const [a,b,c,d,e]=P;a.alley='guard';a.houseId=d.id;b.alley='guard';b.houseId=e.id;c.alley='guard';c.houseId=d.id;
ok(!C.sameSpace(s,a,b),'다른 집 앞 지킴이끼리는 다른 공간(전: 같은 공간)');
ok(C.sameSpace(s,a,c),'같은 집 앞 지킴이끼리는 같은 공간');
const t1=P[5],t2=P[6];t1.alley='talk';t2.alley='talk';ok(C.sameSpace(s,t1,t2),'낮 골목 대화(talk)는 집이 달라도 같은 공간(그대로)');
ok(!C.sameSpace(s,a,t1),'지킴이와 골목 대화는 다른 공간(그대로)');
ok(!C.sameSpace(s,a,d),'지킴이와 집 안 집주인은 다른 공간(그대로, 집주인은 모름)');
ok(C.sameSpace(s,d,{...d}),'집 안끼리는 그대로');
