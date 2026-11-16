// ④ 끌어들이기 흔적이 판마다 다른지(후보 셋 가운데 하나, 없을 때도 있음), 흔적 글에 해석이 없는지 확인. 사용: node trace_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory;let seed=31;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const PLACE={barkeep:'tavern',nurse:'clinic',bellringer:'chapel',miner:'warehouse',landlady:'home',mayor:'hall'};
for(const [npc,place] of Object.entries(PLACE)){const seen={},where=new Set();let none=0;
 for(let i=0;i<60;i++){const s=C.create(Array.from({length:8},(_,k)=>({id:'p'+k,name:'자리'+k,bot:true})),rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';
  const gf=s.players.find(p=>p.role==='godfather');for(const p of s.players){p.location='hall';p.used={big:false,small:false};}const n=ST.npc(s,npc);n.location=place;n.recruited=false;n.protected=false;gf.location=place;
  const opt=S.choices(s,gf,'big').find(a=>a.verb==='recruitNpc'&&a.npc===npc);if(!opt)continue;
  const before=s.scenario.continuation.artifacts.length;let first=true;S.resolve(s,gf,opt,()=>{if(first){first=false;return 0.99;}return rng();});
  if(!n.recruited)continue;const added=s.scenario.continuation.artifacts.slice(before).filter(a=>a.kind==='trace');if(!added.length)none++;for(const a of added){seen[a.title]=(seen[a.title]||0)+1;where.add(a.where);}}
 const titles=Object.keys(seen);ok(titles.length>=2&&none>0,npc+': 흔적이 판마다 다름 '+JSON.stringify(seen)+' · 없음 '+none);
 if(npc==='barkeep'||npc==='nurse'||npc==='bellringer'||npc==='mayor'||npc==='miner'||npc==='landlady')ok(where.size>=1,npc+': 흔적이 남는 자리 '+[...where].join(', '));}
const src=require('fs').readFileSync(path.join(dir,'07StoryActions.js'),'utf8'),traces=src.slice(src.indexOf('const TRACES='),src.indexOf('const RECRUIT='));
ok(!/수 있다'|받았을 수|대 주었다|거래했을|큰돈을/.test(traces),'흔적 글에 해석("거래했을 수 있다" 등)이 없음');
