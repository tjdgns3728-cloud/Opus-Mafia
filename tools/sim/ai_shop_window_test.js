// 2026-11-25 F1 판: AI가 진료소 [물건 구매하기]에서 "붕대"를 골라 5번 모두 "고른 항목으로 할 수 있는 행동이 없음".
// 구매 선택지 {type:'buy',item:'bandage'}에 맞는 고를 칸이 창에 없어, 고른 행동을 찾는 곳이 item을 맞춰 보다 실패했다.
// 사람 화면도 같은 코드라 [이 행동 하기]가 켜져 있는데 눌러도 아무 일이 없었다. 사람·AI가 같은 창에서 붕대를 사는지 본다.
// 사용: node ai_shop_window_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
let UI=null;globalThis.WebEngine={room(){},Component:class{},define(n,c){if(n==='TRPGUI')UI=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;let seed=163;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=money=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';
 for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}const P=s.players.find(p=>p.team!=='mafia');P.location='clinic';P.money=money;P.items.bandage=0;return {s,P};};
// 1) AI 화면: 창에 파는 물건이 보이고, "붕대"를 골라 누르면 사람과 같은 구매 요청이 됨
{const {s,P}=fresh(5),v=C.view(s,P.id),scr=NS.read(v);const b=scr.buttons.find(b=>b.name==='물건 구매하기'||b.label==='물건 구매하기');
 ok(!!b,'진료소 AI 화면에 [물건 구매하기] · '+(b?b.name:scr.buttons.map(x=>x.name).join('|')));
 ok(/■ 창 · \[물건 구매하기\][\s\S]*붕대 · 피를 멎게 하거나 상처를 싸맵니다 \| 1 \|/.test(scr.text),'창에 파는 물건 표(붕대·값 1)');
 const r=NS.press(v,scr,{'버튼':b?.name,'고른 것':['붕대'],'적은 글':''});ok(!r.error&&r.req?.action?.type==='buy'&&r.req.action.item==='bandage','"붕대"를 골라 누르면 구매 요청 · '+(r.error||JSON.stringify(r.req?.action)));
 const r2=NS.press(v,scr,{'버튼':b?.name});ok(!r2.error&&r2.req?.action?.type==='buy','고른 것 없이 눌러도 사람처럼 붕대 구매(창에 고를 칸이 없음) · '+(r2.error||''));
 if(!r.error){const before=P.money,err=C.smallAct(s,P.id,r.req.action,rng);ok(!err&&P.money===before-1&&P.items.bandage===1,'엔진에 넣으면 붕대 1개, 소지금 -1 · '+(err||P.money+' / '+P.items.bandage));}}
// 2) 사람 화면: 같은 창에서 [이 행동 하기]를 누르면 구매 행동을 보냄
{const {s,P}=fresh(5),v=C.view(s,P.id);const u=Object.create(UI.prototype);let sent=null;
 Object.assign(u,{now:{view:v,room:'',round:0},sound:{enabled:false},selected:null,tab:'self',draft:'',chatMode:'say',overlay:null,feedTab:'story',peopleTab:'players',typing:new Map(),stayEpoch:v.epoch,engine:{room:{}},actionSlot:'small'});
 u.optionsBySlot={small:C.choices(s,P.id,'small'),big:C.choices(s,P.id,'big')};u.options=u.optionsBySlot.small;u.render=()=>{};u.action=async(a,slot)=>{sent={a,slot};};
 u.actionPicker={type:'buy',epoch:v.epoch,stage:v.stage,slot:'small'};const html=u.pickerView(v);ok(/data-do="submit-picker"(?![^>]*disabled)/.test(html),'사람 구매 창의 [이 행동 하기]가 켜져 있음');
 (async()=>{await u.click({isTrusted:false,target:{closest:()=>({dataset:{do:'submit-picker'},disabled:false})}});ok(sent&&sent.a.type==='buy'&&sent.a.item==='bandage'&&sent.slot==='small','사람이 [이 행동 하기]를 누르면 붕대 구매를 보냄 · '+JSON.stringify(sent));
 // 3) 소지금이 없으면 사람·AI 모두 같은 결과(구매 선택지가 없거나 엔진이 같은 안내를 냄)
 {const {s,P}=fresh(0),v=C.view(s,P.id),scr=NS.read(v);const has=C.choices(s,P.id,'small').some(a=>a.type==='buy'),b=scr.buttons.find(b=>b.name==='물건 구매하기'||b.label==='물건 구매하기');
  if(!has)ok(!b,'소지금 0: 사람 선택지에 구매가 없으면 AI 화면에도 [물건 구매하기] 없음');
  else{const r=NS.press(v,scr,{'버튼':b?.name,'고른 것':['붕대']});const err=r.req?C.smallAct(s,P.id,r.req.action,rng):r.error;ok(typeof err==='string'&&/소지금/.test(err)&&P.items.bandage===0,'소지금 0: 눌러도 사람과 같은 엔진 안내 · '+err);}}
 // 4) 다른 창은 그대로: 건네기는 item 칸이 있어 고른 물건대로
 {const {s,P}=fresh(5);const Q=s.players.find(p=>p.id!==P.id);Q.location='clinic';P.items.bandage=1;P.items.medicine=1;const v=C.view(s,P.id),scr=NS.read(v);const g=scr.buttons.find(b=>b.win?.kinds?.some(k=>k.kind==='give'));
  if(g){ok(/■ 창 · \[사람에게 하는 일\][\s\S]*무엇을 건넵니까\?[\s\S]*- 치료제/.test(scr.text),'묶음 창에도 "무엇을 건넵니까?" 칸(붕대·치료제)이 사람·AI 화면에 나옴');const r=NS.press(v,scr,{'버튼':g.name,'고른 것':['아이템 주기','치료제',Q.name]});ok(!r.error&&r.req.action.item==='medicine','건네기는 고른 물건(치료제)대로 · '+(r.error||JSON.stringify(r.req.action)));}else ok(true,'(건네기 버튼이 없는 화면)');}
 })();}
