// 추적하기 확인. 사용: node track_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=31;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:6},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.used={big:false,small:false};}return s;};
let s=fresh();const [P,T,X]=s.players;
ok(C.choices(s,P.id,'big').some(a=>a.type==='track'&&a.target===T.id),'같은 곳에 보이는 사람에게 추적하기 선택지');
T.hidden=true;T.spotted=[];ok(!C.choices(s,P.id,'big').some(a=>a.type==='track'&&a.target===T.id)&&!C.choices(s,P.id,'big').some(a=>a.type==='attack'&&a.target===T.id),'숨은 사람은 추적·공격 대상에 없음');T.hidden=false;
X.location='tavern';ok(!C.choices(s,P.id,'big').some(a=>a.target===X.id),'다른 장소 사람은 대상에 없음');X.location='hall';
s.turn=2;ok(!!C.validate(s,P.id,{type:'track',target:T.id},'big'),'밤에는 추적 불가');s.turn=0;
// 이동 따라가기
s.plans={[P.id]:{type:'track',target:T.id},[T.id]:{type:'move',place:'tavern'}};C.resolveBig(s,rng);
ok(P.location==='tavern','대상이 술집으로 가자 따라감 (지금 '+C.places[P.location].short+')');const rec=P.known.find(k=>/추적/.test(k.text));ok(rec&&/술집으로 갔습니다/.test(rec.text),'수첩: '+(rec?.text||'없음'));
// 공격 알아내기 + 들킴 판정이 일어나는지 여러 번
let noticed=0,sawAttack=0;for(let i=0;i<40;i++){s=fresh();const [P,T,X]=s.players;s.plans={[P.id]:{type:'track',target:T.id},[T.id]:{type:'attack',target:X.id,weapon:'fist',flee:'stay'}};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);if(P.known.some(k=>/추적: .*공격했습니다/.test(k.text)))sawAttack++;if(T.known.some(k=>/내 뒤를 밟았다/.test(k.text)))noticed++;}
ok(sawAttack===40,'대상이 공격하면 누구를 공격했는지 알아냄 ('+sawAttack+'/40)');ok(noticed>0&&noticed<40,'대상이 뒤를 밟힌 것을 알아채기도 함 ('+noticed+'/40)');
// 고르는 순간 숨은 상태
{const s=fresh();const [P,T]=s.players;ok(!C.queue(s,P.id,{type:'track',target:T.id}),'추적 고름');ok(P.hidden===true,'추적을 고르는 순간 숨은 상태');ok(!C.view(s,T.id).people.find(p=>p.id===P.id).here,'대상 화면에서 추적자가 보이지 않음');}
