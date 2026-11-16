const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','03Visuals','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])try{require(path.join(dir,f+'.js'));}catch(e){}
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=5;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const seats=Array.from({length:12},(_,i)=>({id:'p'+i,name:'자리'+i,bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);
const rep=s.players.find(p=>p.role==='reporter');if(!rep){console.log('기자 없음');process.exit(0);}const t=s.players.find(p=>p!==rep);rep.location=t.location='hall';s.stage='plan';
s.plans={[rep.id]:{type:'photograph',target:t.id}};C.resolveBig(s,rng);const ph=rep.photos[0];
s.turn=1;s.epoch++;s.stage='plan';for(const p of s.players)p.used={big:false,small:false};s.plans={[rep.id]:{type:'publish',photo:ph?.id,headline:'현장 사진',article:'본 대로 적습니다.'}};C.resolveBig(s,rng);
const note=s.feed.filter(e=>/신문을 배포/.test(e.text)).map(e=>e.text);console.log('배포 알림:',note[0]||'없음');
const other=s.players.find(p=>p!==rep&&p!==t);const v=C.view(s,other.id);console.log('다른 사람 화면의 발행인:',v.newspapers[0]?.byName,'· id:',v.newspapers[0]?.by,'· 사진사:',v.newspapers[0]?.photo?.byName);
console.log(note[0]&&!note[0].includes(rep.name)&&v.newspapers[0]?.by===null?'통과 신문에 기자 이름이 드러나지 않음':'실패 기자 이름 노출');
// 한 사진은 한 번만 신문에 싣는다(2026-11-16): 다시 실으려 하면 받지 않고, 선택지에서도 빠지고, 모두의 수첩에 같은 기록이 쌓이지 않는다
{const P=globalThis.NoirPress,again={type:'publish',photo:ph?.id,headline:'다시 싣기',article:'같은 사진입니다.'};
 const said=P.validate(s,rep,again),offered=P.choices(s,rep).some(o=>o.type==='publish'&&o.photo===ph?.id);
 s.turn=2;s.epoch++;s.stage='plan';for(const p of s.players)p.used={big:false,small:false};s.plans={[rep.id]:again};C.resolveBig(s,rng);
 const papers=(s.newspapers||[]).length,dup=other.known.filter(k=>k.source==='신문에 실린 사진 · 촬영 당시 장면').length;
 console.log(said==='이미 신문에 실은 사진입니다.'&&!offered&&papers===1&&dup===1?'통과 같은 사진은 다시 실리지 않음':'실패 같은 사진이 다시 실림 '+JSON.stringify({said,offered,papers,dup}));}
