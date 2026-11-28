// 2026-11-28 사용자: "이동하기에서 지역에 대한 설명 중에 갱도 - 주민들의 삶을 터전입니다. 마피아에게 뺏기면 주민들이 쉽게 마피아에게 넘어옵니다 이것보다 더 이해하기 쉽고 간결한 설명이 있다면 그렇게 적어주세요".
// 이동 창 두 곳(이동 단계 단추, [이동하기] 창)에 갱도 한 줄 설명. 설명이 실제 규칙(갱도가 닫히면 끌어들이기 쉬워짐)과 맞는지도 본다.
// 사용: node mine_note_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const NOTE='마을의 일터입니다. 갱도가 닫히면 품삯이 끊긴 주민들이 마피아에게 쉽게 넘어갑니다.';
let x=71;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);
s.day=2;s.turn=0;s.stage='plan';for(const o of s.players){o.location='hall';o.used={big:false,small:false};}
const t=s.players.find(o=>o.team==='town'),m=s.players.find(o=>o.team==='mafia');
{const txt=NS.read(C.view(s,t.id)).text,i=txt.indexOf('■ 창 · [이동하기');ok(i>=0&&txt.slice(i,i+600).includes('- 갱도 입구 · '+NOTE),'[이동하기] 창: 갱도 입구 · '+NOTE);
 ok(!/광부 술집 · 마을의 일터/.test(txt),'다른 장소에는 붙지 않음');}
{s.stage='move';const v=C.view(s,m.id),scr=NS.read(v);ok(scr.text.includes('갱도 입구')&&scr.text.includes(NOTE),'이동 단계 단추에도 같은 설명');
 const r=NS.press(v,scr,{'버튼':'갱도 입구'});ok(!r.error&&JSON.stringify(r.req||{}).includes('warehouse'),'AI가 "갱도 입구"만 눌러도 그 단추: '+JSON.stringify(r.req||r.error).slice(0,100));}
{const act=fs.readFileSync(path.join(dir,'07StoryActions.js'),'utf8');ok(/miner:\(s,x\)=>x\.mineClosed\?/.test(act)&&/barkeep:\(s,x\)=>x\.mineClosed\?/.test(act),'설명이 규칙과 맞음: 갱도가 닫히면 광부·술집 주인이 흔들림(끌어들이기 쉬움)');}
