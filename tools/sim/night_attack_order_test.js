// 2026-11-25 마피아 밤 분석(오늘 AI 판 10개, 마피아 밤 화면 125번 중 약 90번): 밤 본거지 습격 창 "누구를 공격합니까?" 맨 위가
// 같은 곳의 사람(= 같은 편)이었다. 화면 규칙은 "고르지 않은 목록은 맨 위 항목"이라 대상을 바꾸지 않고 누르면 같은 편을 공격한다.
// [공격하기] 설명("밤에는 집")에 맞춰 밤에는 집 습격이 맨 위, 같은 편은 그 뒤(여전히 고를 수 있음). 낮 순서는 그대로. AI 화면도 같은 순서.
// 사용: node night_attack_order_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
let UI=null;globalThis.WebEngine={room(){},Component:class{},define(n,c){if(n==='TRPGUI')UI=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;let seed=211;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아름'];
const game=()=>{const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);return s;};
const uiFor=(s,P,slot)=>{const v=C.view(s,P.id),u=Object.create(UI.prototype);
 Object.assign(u,{now:{view:v,room:'',round:0},sound:{enabled:false},selected:null,tab:'self',draft:'',chatMode:'say',overlay:null,feedTab:'story',peopleTab:'players',typing:new Map(),stayEpoch:v.epoch,engine:{room:{}},actionSlot:slot});
 u.optionsBySlot={small:C.choices(s,P.id,'small'),big:C.choices(s,P.id,'big')};u.options=u.optionsBySlot[slot];u.render=()=>{};return {u,v};};
const radioOrder=(html,key)=>[...html.matchAll(new RegExp('name="pick-'+key+'" data-pick-field="'+key+'" value="([^"]*)"','g'))].map(m=>m[1]);
const checked=(html,key)=>(new RegExp('name="pick-'+key+'" data-pick-field="'+key+'" value="([^"]*)" checked').exec(html)||[])[1];
// 밤: 마피아 둘이 본거지, 시민은 각자 집
{const s=game();s.day=2;s.turn=2;s.stage='small';const mafia=s.players.filter(p=>p.team==='mafia'),P=mafia.find(p=>p.role==='mafioso')||mafia[0],mate=mafia.find(p=>p.id!==P.id);
 for(const p of s.players){p.hidden=false;p.used={big:false,small:false};if(p.team==='mafia'){p.location='hideout';p.houseId=null;}else{p.location='home';p.houseId=null;}}
 P.items.knife=1;const {u,v}=uiFor(s,P,'big');u.actionPicker={type:'attack',epoch:v.epoch,stage:v.stage,slot:'big'};
 const list=u.pickerChoices(),html=u.pickerView(v),order=radioOrder(html,'target'),town=s.players.filter(p=>p.team!=='mafia').map(p=>p.id);
 ok(list.length>0&&list[0].nightRaid===true,'밤 본거지: 고를 목록의 첫 항목이 집 습격 · '+(list[0]?list[0].label||list[0].target:'없음'));
 ok(order.length>1&&town.includes(order[0]),'밤 사람 창 "누구를 공격합니까?" 맨 위가 시민의 집 · '+order.slice(0,3).join(','));
 ok(checked(html,'target')===order[0]&&town.includes(checked(html,'target')),'고르지 않으면 미리 골라진 대상도 집(같은 편 아님) · '+checked(html,'target'));
 const raidsEnd=order.findIndex(x=>!town.includes(x)&&!String(x).includes(':raid'));
 ok(!!mate&&order.includes(mate.id),'같은 편도 여전히 목록에 있음(지우지 않음) · '+order.join(','));
 ok(raidsEnd===-1||order.slice(raidsEnd).every(x=>!town.includes(x)),'집 습격이 모두 같은 곳의 사람보다 앞 · 첫 사람 자리 '+raidsEnd);
 // AI 화면: 같은 창의 목록 순서와 미리 고른 대상이 사람 화면과 같음
 const scr=NS.read(v),b=scr.buttons.find(b=>b.name==='공격하기'||b.label==='공격하기');ok(!!b,'AI 화면에 [공격하기]');
 const m=/누구를 공격합니까\?([\s\S]*?)(?:\n\n|■|$)/.exec(scr.text),aiLines=m?m[1].split('\n').map(x=>x.trim()).filter(x=>x.startsWith('- ')):[];
 const humanNames=[...html.matchAll(/name="pick-target"[^>]*><b>([^<]*)<\/b>/g)].map(x=>x[1]);
 ok(aiLines.length>0&&aiLines[0].includes(humanNames[0]),'AI 화면 목록 첫 대상 = 사람 화면 첫 대상 · AI '+(aiLines[0]||'없음')+' / 사람 '+humanNames[0]);
 ok(humanNames.every((n,i)=>(aiLines[i]||'').includes(n)),'AI 화면 목록 순서 = 사람 화면 순서 ('+humanNames.length+'개)');
 const r=NS.press(v,scr,{'버튼':b?.name,'고른 것':[],'적은 글':''});ok(!r.error&&r.req?.action?.type==='attack'&&town.includes(r.req.action.target),'AI가 대상을 고르지 않고 누르면 같은 편이 아니라 집 습격 · '+(r.error||JSON.stringify(r.req?.action)));}
// 낮: 같은 곳의 사람 공격 순서는 그대로(집 습격이 없으므로 원래 순서)
{const s=game();s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
 const P=s.players.find(p=>p.team==='mafia');P.items.knife=1;const {u,v}=uiFor(s,P,'big');u.actionPicker={type:'attack',epoch:v.epoch,stage:v.stage,slot:'big'};
 const raw=u.options.filter(a=>a.type==='attack').map(a=>a.target+'|'+a.weapon),got=u.pickerChoices().filter(a=>a.type==='attack'&&!a._scene).map(a=>a.target+'|'+a.weapon);
 ok(raw.length>0&&JSON.stringify(raw)===JSON.stringify(got),'낮 공격 목록 순서는 원래 그대로('+raw.length+'개)');
 ok(!u.pickerChoices().some(a=>a.nightRaid),'낮에는 집 습격 선택지가 없음');}
