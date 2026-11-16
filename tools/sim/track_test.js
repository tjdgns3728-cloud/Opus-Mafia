// 추적하기 확인(은신 대 관찰 대결, 처리될 때 숨기, 서로 추적, 숨기는 그 턴만). 사용: node track_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=31;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:6},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.used={big:false,small:false};p.hidden=false;}return s;};
let s=fresh();const [P,T,X]=s.players;
ok(C.choices(s,P.id,'big').some(a=>a.type==='track'&&a.target===T.id),'같은 곳에 보이는 사람에게 추적하기 선택지');
T.hidden=true;T.spotted=[];ok(!C.choices(s,P.id,'big').some(a=>a.type==='track'&&a.target===T.id)&&!C.choices(s,P.id,'big').some(a=>a.type==='attack'&&a.target===T.id),'숨은 사람은 추적·공격 대상에 없음');T.hidden=false;
X.location='tavern';ok(!C.choices(s,P.id,'big').some(a=>a.target===X.id),'다른 장소 사람은 대상에 없음');X.location='hall';
s.turn=2;ok(!!C.validate(s,P.id,{type:'track',target:T.id},'big'),'밤에는 추적 불가');s.turn=0;
// 2. 고르는 순간에는 숨지 않는다(방패로 못 씀)
{const s=fresh();const [P,T,A]=s.players;ok(!C.queue(s,P.id,{type:'track',target:T.id}),'추적 고름');ok(!P.hidden,'고르는 순간에는 숨지 않음');ok(C.choices(s,A.id,'big').some(a=>a.type==='attack'&&a.target===P.id),'추적을 고른 사람도 그 턴에 공격 대상으로 고를 수 있음');}
// 1. 이기면 따라가 보고 들키지 않는다. 지면 놓치고 들킨다
/* 2026-11-16부터 큰 행동의 이동이 없어져, 상대는 그 자리에서 행동하고 이겼는지는 판정 결과로 본다 */let win=0,lose=0,bad=[];for(let i=0;i<60;i++){const s=fresh();const [P,T]=s.players;s.plans={[P.id]:{type:'track',target:T.id},[T.id]:{type:'wait'}};C.resolveBig(s,rng);const saw=P.known.some(k=>/추적: .*그 자리에 머물렀습니다/.test(k.text)),caught=T.known.some(k=>/내 뒤를 밟았다/.test(k.text)),res=s.feed.filter(e=>e.to.includes(P.id)&&e.roll?.kind==='opposed').at(-1)?.roll;
 if(res?res.success:saw){win++;if(!saw||caught||!P.hidden)bad.push('이김:'+[saw,caught,P.hidden]);}else{lose++;if(saw||!caught||P.hidden)bad.push('짐:'+[saw,caught,P.hidden]);}}
ok(win>0&&lose>0,'대결이라 이기기도 지기도 함 (이김 '+win+' / 짐 '+lose+')');ok(!bad.length,'이기면 따라가 숨은 채 보고 들키지 않음, 지면 못 따라가고 들킴'+(bad.length?' · '+bad.slice(0,3).join(' '):''));
// 4. 추적으로 생긴 숨기는 다음 턴이 시작되면 풀린다
{let s,P;for(let i=0;i<30;i++){s=fresh();[P]=s.players;const T=s.players[1];s.plans={[P.id]:{type:'track',target:T.id},[T.id]:{type:'wait'}};C.resolveBig(s,rng);if(P.hidden)break;}ok(P.hidden,'이긴 추적자는 그 턴 숨은 상태');C.nextTurn(s);ok(!P.hidden,'다음 턴이 시작되면 숨기가 풀림');}
// 3. 서로 추적하면 둘 다 알아채고 숨기가 풀린다
{const s=fresh();const [P,T]=s.players;ok(!C.queue(s,P.id,{type:'track',target:T.id})&&!C.queue(s,T.id,{type:'track',target:P.id}),'서로를 추적 대상으로 고를 수 있음');s.stage='plan';C.resolveBig(s,rng);ok(P.known.some(k=>/내 뒤를 밟으려 했다/.test(k.text))&&T.known.some(k=>/내 뒤를 밟으려 했다/.test(k.text)),'둘 다 상대가 자기 뒤를 밟으려 한 것을 앎');ok(!P.hidden&&!T.hidden,'둘 다 숨기가 풀림');}
// 대상 화면에서 이긴 추적자는 보이지 않는다
{let s,P,T;for(let i=0;i<30;i++){s=fresh();[P,T]=s.players;s.plans={[P.id]:{type:'track',target:T.id},[T.id]:{type:'wait'}};C.resolveBig(s,rng);if(P.hidden)break;}ok(!C.view(s,T.id).people.find(p=>p.id===P.id).here,'대상 화면에서 이긴 추적자가 보이지 않음');}
