// 변장 확인. 사용: node disguise_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=23;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));
const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.epoch=10;s.stage='plan';
const [M,M2]=s.players.filter(p=>p.team==='mafia'),town=s.players.filter(p=>p.team==='town');const [A,T,W,W2]=town;
for(const p of s.players){p.location='tavern';p.used={big:false,small:false};}A.location='chapel';W.stats.observe=1;W2.stats.observe=1;M.stats.agility=9;
ok(C.choices(s,M.id,'small').some(a=>a.type==='disguise'&&a.target===A.id),'마피아 작은 행동에 "가람처럼 변장" 있음');
ok(!C.choices(s,T.id,'small').some(a=>a.type==='disguise'),'시민은 변장 불가');
ok(!!C.validate(s,M.id,{type:'disguise',target:T.id},'small'),'진짜 그 시민이 같은 자리에 있으면 변장 불가');
ok(!C.smallAct(s,M.id,{type:'disguise',target:A.id},rng),'변장 성공');
ok(C.nameFor(s,W,M)===A.name,'관찰 낮은 사람 눈에는 '+A.name+'으로 보임');ok(C.nameFor(s,M2,M)===M.name,'같은 편 마피아는 알아봄');
const v=C.view(s,W.id);ok(v.people.find(p=>p.id===M.id).location===null&&v.people.find(p=>p.id===A.id).location==='tavern','목록: 마피아는 안 보이고 가람이 술집에 있는 것처럼 보임');
ok(/지금 보이는 사람: .*가람/.test(C.view(s,W.id).environment.join(' ')),'"지금 보이는 사람"에 가람으로 나옴');
// 공격(목격자는 W 한 명만 남김)
for(const p of s.players)if(![M.id,T.id,W.id].includes(p.id))p.location='hall';
s.plans={[M.id]:{type:'attack',target:T.id,weapon:'knife',flee:'stay'}};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);
const rec=W.known.find(k=>/공격/.test(k.text));ok(rec&&rec.text.includes(A.name)&&rec.about===A.id,'목격자 수첩: '+(rec?.text||'없음')+' (대상 '+(rec?.about===A.id?'가람':'?')+')');
ok(!W.known.some(k=>/공격/.test(k.text)&&k.about===M.id),'목격자 기록에 진짜 이름 없음');
// 진짜와 마주치면 들통
A.location='hall';M.location='hall';const before=s.feed.length;C.checkDisguises(s);ok(M.disguise.broken&&s.feed.slice(before).some(e=>/이 둘입니다/.test(e.text)),'진짜 가람과 같은 자리에 서면 들통');
// 하루 한 번, 다음 턴에는 풀림
ok(!!C.validate(s,M.id,{type:'disguise',target:W.id},'small'),'하루에 한 번만');s.epoch++;M.disguise.broken=false;ok(C.nameFor(s,W,M)===M.name,'다음 턴에는 변장이 풀림');
// 붙잡히면 정체가 드러남
s.day=3;s.epoch++;s.turn=0;for(const p of s.players){p.used={big:false,small:false};p.location='clinic';p.jailEpoch=0;}const X=town.find(p=>p.hp>0&&p!==A&&p.id!==T.id);A.location='chapel';C.smallAct(s,M.id,{type:'disguise',target:A.id},rng);
s.plans={[M.id]:{type:'attack',target:X.id,weapon:'fist',flee:'stay'}};C.announceClashes(s);s.stage='plan';const b2=s.feed.length;C.resolveBig(s,rng);
ok(s.feed.slice(b2).some(e=>/붙잡고 보니/.test(e.text)),'여럿 앞에서 공격하다 붙잡히면 "붙잡고 보니 가람처럼 꾸민 '+M.name+'"');
