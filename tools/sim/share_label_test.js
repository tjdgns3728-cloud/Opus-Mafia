// 기록 대화로 전하기 버튼에 기록 번호(2026-11-25 자율 순환, run25 AI 평가: 기록 번호와 #번호가 어긋남)
// 사용: node share_label_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=41;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';
for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};}const [a,b,c]=s.players;
a.known.push({id:'k1',text:b.name+'은 장화가 큽니다.',about:b.id,source:'직접 확인',kind:'observed',time:'1일째 낮'},{id:'k2',text:c.name+'은 장화가 작습니다.',about:c.id,source:'직접 확인',kind:'observed',time:'1일째 낮'});
const v=C.view(s,a.id),scr=NS.read(v),names=scr.buttons.map(b=>b.name||b);
const sh=names.filter(n=>/대화로 전하기/.test(String(n)));
ok(sh.length>0&&sh.every(n=>/^기록 \d+ 대화로 전하기$/.test(String(n))),'전하기 버튼마다 기록 번호: '+sh.slice(0,4).join(', '));
ok(!sh.some(n=>/#/.test(String(n))),'#번호가 붙지 않음');
const n1=a.known.length-1,n2=a.known.length;ok(sh.includes('기록 '+n1+' 대화로 전하기')&&sh.includes('기록 '+n2+' 대화로 전하기'),'수첩의 기록 번호와 같음(기록 '+n1+', '+n2+')');
const m=NS.press(v,scr,{'버튼':'기록 '+n2+' 대화로 전하기'});ok(!m.error,'버튼을 누를 수 있음'+(m.error?' ('+m.error+')':''));
