// 2026-11-28 사용자: "폭약의 갯수가 너무 적은 것 같습니다. 3개로 늘려주세요", "그리고 1개는 마피아한테 줘버리죠? 어차피 설치 자체가 상당히 번거롭잖아요".
// 고른 것: 숨긴 곳 2개 + 처음부터 마피아 1개, 그 1개는 대부. 글의 없어진 폭약 수는 셋.
// 사용: node bombs_three_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
function game(seed,n=8){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(Array.from({length:n},(_,i)=>({id:'p'+i,name:'사람'+i,bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.rng=rng;return s;}
for(const [seed,n] of [[61,8],[62,8],[63,11]]){const s=game(seed,n),q=s.scenario,gf=s.players.find(p=>p.role==='godfather');
 const hidden=q.bombs.filter(b=>!String(b.where).startsWith('carry:'));
 ok(q.bombs.length===3&&hidden.length===2&&q.bombs.filter(b=>b.where==='carry:'+gf.id).length===1,n+'명 판(씨앗 '+seed+'): 폭약 3개 = 숨긴 곳 2 + 대부 품 1 — '+q.bombs.map(b=>b.where).join(','));
 ok(gf.items.dynamite===1&&s.players.filter(p=>p.id!==gf.id).every(p=>!p.items.dynamite),'처음 소지품: 대부만 폭약 1');}
{const s=game(64),gf=s.players.find(p=>p.role==='godfather');s.day=1;s.turn=0;s.stage='plan';gf.location='tavern';gf.used={big:false,small:false};
 const arm=S.choices(s,gf,'big').find(a=>a.sceneKey==='arm');ok(!!arm,'대부는 1일째부터 술집에서 [폭약 설치하기]를 볼 수 있음: '+(arm?.label||'(없음)'));
 const known=(s.feed||[]).filter(e=>e.to?.includes(gf.id)).map(e=>e.text).join(' ')+JSON.stringify(gf.known||[]);ok(/폭약 세 개를 가져왔/.test(known),'대부가 아는 작전 글: 세 개를 가져왔고 하나는 대부 품에');}
{const flow=fs.readFileSync(path.join(dir,'08StoryFlow.js'),'utf8'),sc=fs.readFileSync(path.join(dir,'05Scenarios.js'),'utf8'),inc=fs.readFileSync(path.join(dir,'04Incidents.js'),'utf8');
 for(const [name,t] of [['08StoryFlow',flow],['05Scenarios',sc],['04Incidents',inc]])ok(!/폭약 (두 개가 없|2개가 없|2개 없|두 개는 모두|2개 모두|2개를 찾|두 개를 모두|두 개가 회관)/.test(t)&&!/없어진 폭약 (2개|두 개)/.test(t),name+': 없어진·회수한 폭약 수를 둘로 말하는 글 없음');
 ok(/'세 개의 행방'/.test(flow)&&/\/세 개\/\.test/.test(flow),'대부 안내 「세 개의 행방」, 화약고 안내가 "세 개" 글을 알아봄');}
