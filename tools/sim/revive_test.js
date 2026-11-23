// 쓰러짐·살리기 규칙 확인. 사용: node revive_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG;let seed=7;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const seats=Array.from({length:6},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다'][i],bot:true}));
const s=C.create(seats,rng);globalThis.NoirScenarios?.start?.(s);
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const town=s.players.filter(p=>p.team==='town'),T=town[0],H=town[1],doc=s.players.find(p=>p.role==='doctor');
for(const p of s.players)p.location='hall';
// 1) 공격으로 처음 쓰러짐 → 바로 죽지 않음
T.hp=0;C.death(s,T,'공격');
ok(T.downed&&T.hp===0,'처음 쓰러지면 쓰러짐 상태(체력 0, downed)');
ok(!s.feed.some(e=>e.kind==='death'&&e.who===T.id),'사망 기록이 아직 나오지 않음');
ok(C.view(s,H.id).people.find(p=>p.id===T.id).condition==='죽어가는 중','다른 사람 화면에 죽어가는 중으로 보임');
ok(C.view(s,H.id).people.find(p=>p.id===T.id).will===null,'쓰러진 동안 유언은 보이지 않음');
ok(!C.alive(s).includes(T),'쓰러진 사람은 산 사람 수에 들지 않음');
// 2) 같은 곳의 사람에게 살리기 선택지(큰 행동), 확률 표시
s.stage='plan';const opts=C.choices(s,H.id,'big').filter(a=>a.type==='revive');
ok(opts.length===1&&opts[0].target===T.id,'같은 곳의 사람에게 살리기 선택지: '+(opts[0]?.label||'없음'));
ok(C.choices(s,H.id,'small').every(a=>a.type!=='revive'),'살리기는 작은 행동 목록에 없음');
const chanceOf=p=>{const o=C.choices(s,p.id,'big').find(a=>a.type==='revive');return o?Number(o.label.match(/(\d+)%/)[1]):null;};
if(doc&&doc.id!==T.id)ok(chanceOf(doc)===90,'의사 확률 90% → '+chanceOf(doc)+'%');
for(const p of s.players.filter(p=>p.id!==T.id&&p.role!=='doctor'))console.log('   '+C.roles[p.role].name+' 치료 '+p.stats.medical+' → '+chanceOf(p)+'%');
// 다른 곳에 있으면 선택지가 없음
const far=s.players.find(p=>p.id!==T.id&&p.id!==H.id);far.location='tavern';ok(!C.choices(s,far.id,'big').some(a=>a.type==='revive'),'다른 장소에서는 살리기 불가');far.location='hall';
// 3) 살리기 성공(확률 100%로 맞춰 시험): 의사 역할로 바꿔 90%… 대신 주사위를 고정
const realRng=rng;let fixed=()=>0.0;s.plans={[H.id]:{type:'revive',target:T.id}};C.resolveBig(s,()=>0.0);
ok(T.hp===1&&!T.downed,'살리기 성공 → 체력 1로 일어남');
ok(s.feed.some(e=>e.kind==='check'&&e.text.startsWith('살리기 판정')),'판정 결과 글: '+s.feed.filter(e=>e.text.startsWith('살리기 판정')).at(-1)?.text);
ok(H.used.big,'살리기는 큰 행동을 씀');
// 4) 두 번째로 쓰러지면 바로 사망
T.hp=0;C.death(s,T,'공격');ok(!T.downed&&s.feed.some(e=>e.kind==='death'&&e.who===T.id),'두 번째로 쓰러지면 바로 사망');
// 5) 시간이 다 되면 숨을 거둠: 낮1에 쓰러짐 → 낮2 끝에 사망
const U=town[2];for(const p of s.players)p.used={big:false,small:false};s.day=1;s.turn=0;U.hp=0;C.death(s,U,'출혈');ok(U.downed?.left===2,'출혈로 처음 쓰러져도 쓰러짐');
C.nextTurn(s);ok(U.downed&&s.turn===1,'낮1→낮2: 아직 살릴 수 있음(남은 '+U.downed?.left+')');
ok(s.feed.some(e=>e.to.includes(H.id)&&e.text.includes(U.name)&&e.text.includes('이번 낮이 지나면')),'같은 곳 사람에게 "이번 낮이 지나면 숨을 거둡니다" 알림');
C.nextTurn(s);ok(!U.downed&&s.feed.some(e=>e.kind==='death'&&e.who===U.id),'낮2가 끝나면 숨을 거둠: '+s.feed.filter(e=>e.kind==='death'&&e.who===U.id).at(-1)?.text);
// 6) 밤에 쓰러지면 내일 낮 두 번
const V=s.players.find(p=>p.hp>0&&p.team==='town'&&p.id!==H.id);if(V){s.turn=2;V.hp=0;C.death(s,V,'공격');C.nextTurn(s);ok(V.downed&&V.downed.left===2,'밤에 쓰러짐 → 아침에도 남은 낮 2');C.nextTurn(s);ok(V.downed&&V.downed.left===1,'낮1이 지나도 살릴 수 있음');C.nextTurn(s);ok(!V.downed,'낮2가 지나면 숨을 거둠');}
// 7) 재판 처형과 폭발은 그대로 사망
const W=s.players.find(p=>p.hp>0&&!p.downedOnce);if(W){W.hp=0;C.death(s,W,'재판 처형');ok(!W.downed&&s.feed.some(e=>e.kind==='death'&&e.who===W.id),'재판 처형은 바로 사망');}
