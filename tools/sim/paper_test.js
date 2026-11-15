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
