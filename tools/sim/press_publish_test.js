// 2026-11-25 run33: 기자 AI가 신문 제목과 본문을 "제목: …\n본문: …" 한 글로 적어 누름 실패. 칸 이름을 붙여 적은 글을 두 칸으로 읽는지, 칸 이름이 없으면 그대로 오류인지.
// 사용: node press_publish_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;let seed=161;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='plan';
for(const p of s.players){p.location='hall';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
const R=s.players.find(p=>p.role==='reporter')||s.players[0];R.role='reporter';R.items.camera=1;const T=s.players.find(p=>p.id!==R.id);
s.plans={[R.id]:{type:'photograph',target:T.id}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.resolveBig(s,rng);s.stage='plan';for(const p of s.players)p.used={big:false,small:false};if(!(R.photos||[]).length)throw new Error('사진이 찍히지 않음');
const v=C.view(s,R.id),scr=NS.read(v);const btn=scr.buttons.find(b=>/신문 만들기/.test(b.name));ok(!!btn,'기자 화면에 [신문 만들기]');
if(btn){const one=NS.press(v,scr,{'버튼':btn.name,'고른 것':[],'적은 글':'제목: 보안관을 자처한 시온\n본문: 2일째 낮 회관에서 찍은 사진입니다.'});ok(one.req?.action?.type==='publish'&&one.req.action.headline==='보안관을 자처한 시온'&&/회관에서 찍은 사진/.test(one.req.action.article),'"제목: …\n본문: …" 한 글 → 제목과 본문 두 칸 · '+(one.error||one.req?.action?.headline));
 const bad=NS.press(v,scr,{'버튼':btn.name,'고른 것':[],'적은 글':'그냥 한 줄만 적음'});ok(!!bad.error,'칸 이름이 없는 한 글은 그대로 오류(대신 나누지 않음) · '+bad.error);}
