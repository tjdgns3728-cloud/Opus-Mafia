// 2026-11-25 run30·31: AI가 [이동하기 (행동 소모 없음)]을 "이동하기"로 줄여 눌러 누름 실패. 앞부분이 맞는 버튼이 하나뿐이면 그 버튼으로 받는지, 여럿이면 받지 않는지.
// 사용: node press_prefix_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;let seed=151;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=2;s.stage='plan';
for(const p of s.players){p.location=p.team==='mafia'?'hideout':'home';p.houseId=p.team==='mafia'?null:p.id;p.hidden=false;p.used={big:false,small:false};}
const m=s.players.find(p=>p.team==='mafia');const v=C.view(s,m.id),scr=NS.read(v);const names=scr.buttons.map(b=>b.name);
const full=names.find(n=>/^이동하기 \(/.test(n));ok(!!full,'밤 마피아 화면에 [이동하기 (…)] 버튼 · '+full);
const r=NS.press(v,scr,{'버튼':'이동하기','고른 것':['광부 술집']});ok(!r.error,'"이동하기"로 줄여 눌러도 그 버튼으로 받음 · '+(r.error||JSON.stringify(r.req?.action||r.req)));
const amb=names.filter(n=>/^인물·현장 /.test(n));if(amb.length>1){const r2=NS.press(v,scr,{'버튼':'인물·현장'});ok(!!r2.error||names.includes('인물·현장'),'앞부분이 맞는 버튼이 여럿이면 줄인 이름으로 고르지 않음');}else ok(true,'(앞부분이 겹치는 버튼이 없는 화면)');
{const fake={buttons:[{name:'인물·현장 · 작은 행동',label:'인물·현장',do:'action-group',data:{}},{name:'인물·현장 · 큰 행동',label:'인물·현장',do:'action-group',data:{}}]};const r3=NS.press(v,fake,{'버튼':'인물·현장 ·'});
 ok(!!r3.error,'앞부분이 맞는 버튼이 둘이면 받지 않음(오류) · '+(r3.error||''));}
