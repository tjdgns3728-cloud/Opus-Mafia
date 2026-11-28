// 2026-11-28 G443·D8BB 판에서 찾음: 묶음 단추([인물·현장] 등)에 할 일이 하나뿐이면 사람이 누르는 순간 창 없이 그 행동이 골라졌고,
// AI 화면에는 그 단추의 창 글이 없어 무엇을 하는지 알 수 없었다(예: 노조 사무실에서 폭약을 품은 대부의 [인물·현장] = 폭약 설치하기).
// 묶음 이름만 보이는 단추는 하나뿐이어도 창을 열고, 이름이 곧 행동인 단추(잠자기 등)는 예전처럼 바로 고른다.
// 사용: node single_group_window_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]||'.'),dir=path.join(root,'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let seed=53;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const fresh=()=>{const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.rng=rng;return s;};
// 1. 노조 사무실의 대부: 큰 행동은 폭약 설치 하나 → [인물·현장] 창에 그 행동이 보이고, 고르면 설치
{const s=fresh();s.day=2;s.turn=0;s.stage='plan';const g=s.players.find(p=>p.role==='godfather');g.location='union';
 const big=C.choices(s,g.id,'big').filter(a=>a.type!=='wait');ok(big.length===1&&big[0].sceneKey==='arm','(전제) 큰 행동은 폭약 설치 하나: '+big.map(a=>a.label).join(' / '));
 const v=C.view(s,g.id),r=NS.read(v),tx=r.text;
 ok(/■ 창 · \[인물·현장\]을 누르면 열리는 창\n[\s\S]*- 노조 사무실에 폭약 설치하기/.test(tx),'AI 화면: [인물·현장] 창에 "노조 사무실에 폭약 설치하기"');
 const p=NS.press(v,r,{'버튼':'인물·현장','고른 것':[big[0].label]});ok(p?.req?.type==='plan'||p?.req?.action?.sceneKey==='arm'||JSON.stringify(p).includes('"arm"'),'창에서 고르면 폭약 설치로 처리: '+JSON.stringify(p).slice(0,160));}
// 2. 이름이 곧 행동인 단추(밤 시민 잠자기)는 예전처럼 창 없이 바로
{const s=fresh();s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter?.(s);s.stage='plan';const t=s.players.find(p=>p.team==='town');
 const v=C.view(s,t.id),r=NS.read(v),tx=r.text;ok(tx.includes('[잠자기]')&&!tx.includes('■ 창 · [잠자기]'),'[잠자기]는 창 없이 바로');
 const p=NS.press(v,r,{'버튼':'잠자기'});ok(JSON.stringify(p).includes('"sleep"'),'[잠자기]를 누르면 잠: '+JSON.stringify(p).slice(0,120));}
