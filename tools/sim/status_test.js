// 다른 사람 상태는 조사·목격으로 안 것만, 실시간이 아니게. 사용: node status_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=41;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));
const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';
const town=s.players.filter(p=>p.team==='town'),[W,T,U]=town;for(const p of s.players){p.location='hall';p.used={big:false,small:false};}W.role='sheriff';W.stats.observe=10;
const pv=(v,id)=>v.people.find(p=>p.id===id);
T.bleeding=true;T.tired=true;T.hp=4;ok(!pv(C.view(s,W.id),T.id).bleeding&&pv(C.view(s,W.id),T.id).maxHp===10,'처음에는 남의 출혈·피곤함이 보이지 않음');
ok(pv(C.view(s,T.id),T.id).bleeding&&pv(C.view(s,T.id),T.id).maxHp===5,'내 상태는 보임');
let tries=0;while(!W.statusSeen?.[T.id]&&tries<30){W.used.small=false;C.smallAct(s,W.id,{type:'investigate',target:T.id},rng);tries++;}
ok(!!W.statusSeen?.[T.id],'조사 성공('+tries+'번째)');ok(pv(C.view(s,W.id),T.id).bleeding&&pv(C.view(s,W.id),T.id).maxHp===5,'조사 뒤 출혈·피곤함이 보임');
T.location='clinic';T.bleeding=false;ok(pv(C.view(s,W.id),T.id).bleeding,'안 보는 곳에서 지혈해도 조사했던 상태(출혈) 그대로');
T.location='hall';T.bleeding=true;const H=U;H.items.bandage=2;H.location='hall';let bt=0;while(T.bleeding&&bt<20){H.used.small=false;C.smallAct(s,H.id,{type:'bandage',target:T.id},rng);bt++;}
ok(!T.bleeding&&!pv(C.view(s,W.id),T.id).bleeding,'눈앞에서 지혈하는 것을 보면 출혈이 사라짐');
// 숨는 모습을 봄 → 숨음, 드러나는 모습을 봄 → 숨음 사라짐
s.epoch++;for(const p of s.players)p.used={big:false,small:false};W.stats.observe=10;T.location=W.location="warehouse";T.stats.agility=9;let ht=0;while(!(T.hidden&&T.spotted?.includes(W.id))&&ht<30){T.used.small=false;T.hidden=false;C.smallAct(s,T.id,{type:'hide'},rng);ht++;}
console.log("   debug hidden",T.hidden,"spotted",JSON.stringify(T.spotted),"seen",JSON.stringify(W.statusSeen?.[T.id]),"tries",ht);ok(pv(C.view(s,W.id),T.id).hiddenKnown,"숨는 모습을 본 사람에게 숨음");T.hidden=false;ok(!pv(C.view(s,W.id),T.id).hiddenKnown,'드러난 모습을 보면 "숨음" 사라짐');
// 변장: 선택지와 선택 창 이름
const [M]=s.players.filter(p=>p.team==='mafia');const A=town.find(p=>p!==W&&p!==T&&p!==U);A.location="chapel";M.location="hall";W.location="hall";M.used.small=false;M.disguiseDay=0;C.smallAct(s,M.id,{type:'disguise',target:A.id},rng);W.stats.observe=0;
const lbl=C.choices(s,W.id,'big').find(a=>a.type==='attack'&&a.target===M.id)?.label||'';ok(lbl.startsWith(A.name),'선택지에 변장 이름: '+lbl);ok(C.view(s,W.id).aliases[M.id]===A.name,'선택 창용 이름도 변장 이름');
// 누구나 쓰는 '조사하기': 몸 상태와 싸움 흔적
{const s2=C.create(seats,rng);S.start(s2);S.afterGathering?.(s2);s2.day=2;s2.turn=0;s2.stage='plan';for(const p of s2.players){p.location='tavern';p.used={big:false,small:false};}
 const tw=s2.players.filter(p=>p.team==='town'&&!['sheriff','consigliere'].includes(p.role)),[V,Q,R]=tw;Q.bleeding=true;Q.tired=true;Q.hp=4;V.stats.observe=10;
 ok(C.choices(s2,V.id,'small').some(a=>a.type==='investigate'&&a.target===Q.id&&/조사하기/.test(a.label)),'보안관이 아니어도 "조사하기" 선택지 있음');
 ok(!C.choices(s2,V.id,'small').some(a=>a.type==='examine'),'"상태 살피기"는 따로 없음');
 // Q가 지난 턴 다른 곳에서 R을 공격했다는 기록
 s2.events.push({id:'eX',type:'attack',actor:Q.id,target:R.id,location:'chapel',day:1,turn:2,time:'1일째 밤',text:'x'});
 let n=0;while(!V.statusSeen?.[Q.id]&&n<20){V.used.small=false;C.smallAct(s2,V.id,{type:'investigate',target:Q.id},rng);n++;}
 const e=C.view(s2,V.id).people.find(p=>p.id===Q.id);ok(e.bleeding&&e.maxHp===5,'조사 성공('+n+'번째) 뒤 출혈·피곤함이 보임');
 ok(V.known.some(k=>/싸운 흔적/.test(k.text)&&k.about===Q.id),'다른 곳에서 공격한 사람에게 "싸운 흔적"');
 let m=0;V.statusSeen={};while(!V.statusSeen?.[R.id]&&m<20){V.used.small=false;C.smallAct(s2,V.id,{type:'investigate',target:R.id},rng);m++;}
 ok(V.known.some(k=>/공격당한 상처/.test(k.text)&&k.about===R.id),'공격당한 사람에게 "공격당한 상처"');
 Q.hidden=true;Q.spotted=[];ok(!C.choices(s2,V.id,'small').some(a=>a.type==='investigate'&&a.target===Q.id),'숨은 사람은 조사할 수 없음');}
