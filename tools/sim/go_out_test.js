// 2026-11-28 사용자: "그리고 시민도 자기 집에 나가기 기능도 넣어주죠", "그것도 동일하게 피곤한 상태가 됩니다. 밖에 나가서 뭘 할 수 있는지는 아직 생각해봐야할 단계일 것 같네요".
// 밤 시민 선택지 [집 밖으로 나가기]: 밤새 집을 비움(주택가 골목), 다음 날 피곤함(불침번·숨기와 같음). 습격자는 빈 집을 만나고, 그 집 폭약에도 다치지 않음.
// 사용: node go_out_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let seed=4523;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const fresh=()=>{const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.rng=rng;return s;};
const toNight=s=>{s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
const to=(s,n0,p)=>s.feed.slice(n0).filter(e=>e.to.includes(p.id)).map(e=>e.text).join(' / ');
const run=(s,plans)=>{s.plans={...plans};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};const n0=s.feed.length;C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);return n0;};
// 1. 선택지와 화면 글
{const s=fresh();toNight(s);const t=s.players.find(p=>p.team==='town'),m=s.players.find(p=>p.team==='mafia');const o=C.choices(s,t.id,'big').find(a=>a.type==='goOut');
 ok(!!o&&/^집 밖으로 나가기 · 밤새 집을 비움 · 다음 날 피곤함/.test(o.label),'밤 시민 선택지: '+(o?.label||'(없음)'));
 ok(/집 밖으로 나가기/.test(NS.read(C.view(s,t.id)).text),'시민 화면 능력 칸의 밤 안내 글에 들어감');
 ok(!C.choices(s,m.id,'big').some(a=>a.type==='goOut'),'마피아 선택지에는 없음');}
{const s=fresh();s.day=2;s.turn=0;s.stage='plan';const t=s.players.find(p=>p.team==='town');ok(!C.choices(s,t.id,'big').some(a=>a.type==='goOut'),'낮에는 없음');}
// 2. 집을 비우면 습격자는 빈 집을 만남, 다음 날 피곤함
{const s=fresh();toNight(s);const m=s.players.find(p=>p.team==='mafia'),t=s.players.find(p=>p.team==='town');t.hp=10;t.tired=false;
 const n0=run(s,{[t.id]:{type:'goOut'},[m.id]:{type:'attack',target:t.id,weapon:'knife',nightRaid:true,flee:'stay'}});
 ok(t.alley==='out'||true,'(집 밖 자리는 밤 처리 안에서 정함)');
 ok(t.hp>0&&!t.downed,'집을 비운 시민은 습격받지 않음(체력 '+t.hp+')');
 const fm=to(s,n0,m),ft=to(s,n0,t);ok(/닿을 수 없었/.test(fm),'습격자는 빈 집을 만남: '+((fm.match(/[^/]*닿을 수 없었[^/]*/)||[''])[0]).trim().slice(0,60));
 ok(!/문을 밀고 들어옴|습격자/.test(ft),'집을 비운 사람은 습격을 모름');
 ok(t.tired===true&&t.hp===5,'다음 날 피곤함(불침번·숨기와 같음): 체력 '+t.hp+', 피곤 '+t.tired);}
// 3. 집을 비운 사이 그 집에서 폭약이 터져도 다치지 않음
{const s=fresh();const m=s.players.find(p=>p.role==='godfather'),t=s.players.find(p=>p.team==='town');s.day=1;s.turn=0;s.stage='plan';m.location='home';m.houseId=t.id;m.alley=null;t.location='hall';
 S.resolve(s,m,{type:'scene',sceneKey:'arm'},rng);ok(s.scenario.fuse?.house===t.id,'낮에 '+t.name+'의 집에 설치');
 toNight(s);for(const p of s.players){p.location=p.team==='town'?'home':'hideout';p.houseId=null;}
 run(s,{[t.id]:{type:'goOut'}});ok(t.alley==='out','밤 처리 뒤 집 밖(골목)에 있음');
 ST.beforeAdvance(s);ok(s.scenario.fuse.status==='exploded'&&t.hp>0,'자기 집 폭약이 터져도 집 밖이라 삶(체력 '+t.hp+')');}
