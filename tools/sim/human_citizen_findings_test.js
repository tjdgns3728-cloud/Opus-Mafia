// 2026-11-25 사람 자리 시민 판에서 찾은 것: 진행자 메타 문장, 남의 집 지키기 겹친 글, 잠 글, 건네기 인칭, 조사 안내, 시작 버튼 반응, 재판 아래 버튼 글.
// 사용: node human_citizen_findings_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const classes={};globalThis.WebEngine={room(){},Component:class{},define(n,c){classes[n]=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const sessionSrc=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(sessionSrc.replace(/\}\)\(\);\s*$/,'globalThis.__v={dropNarratorMeta:typeof dropNarratorMeta=="function"?dropNarratorMeta:undefined};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,V=globalThis.__v,UI=classes.TRPGUI;let seed=211;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8'),world=fs.readFileSync(path.join(dir,'00World.js'),'utf8');
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='plan';for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}return s;};
const run=(s,plans)=>{s.plans=plans;for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes?.(s);s.stage='plan';const n0=s.feed.length;C.resolveBig(s,rng);return s.feed.slice(n0);};

// 1. 진행자 메타 문장
ok(typeof V?.dropNarratorMeta==='function','진행 묘사 거르기 함수가 있음');
{const facts=['도현의 집 앞을 지켰습니다.'],drop=typeof V?.dropNarratorMeta==='function'?V.dropNarratorMeta:()=>'(거르기 함수 없음)'/* 2026-11-25 시험 보강: 함수가 없으면 멈추지 않고 실패 줄 */;
 ok(drop('밤새 도현의 집 앞을 지켰습니다. 진행자는 이 한 가지 사실만 전하며, 그 밖의 장면은 덧붙이지 않습니다.',facts)==='밤새 도현의 집 앞을 지켰습니다.','진행자를 말하는 문장을 뺌');
 ok(drop('그 순간 진행자는 이 한 장면을 그대로 이어 전합니다.',facts)===facts.join(' '),'모두 메타 문장이면 사실 그대로');
 ok(drop('문이 열렸습니다. 아무도 없었습니다.',facts)==='문이 열렸습니다. 아무도 없었습니다.','메타 문장이 없으면 그대로');
 ok(sessionSrc.includes('진행 묘사 1~2문장(사실이 하나면 1문장)')&&sessionSrc.includes('진행자·서술자 자신이나 전하는 방식에 대한 말은 쓰지 않는다'),'진행 묘사 지시: 1~2문장, 진행자 자신 말하지 않기');
 ok(!sessionSrc.includes("style:'한국어 게임 진행 묘사 2문장."),'옛 "2문장" 지시 없음');}

// 2. 습격이 없던 남의 집 지키기: 한 줄만
{const s=fresh();s.turn=2;const town=s.players.filter(p=>p.team==='town'),[G,T]=town;for(const p of s.players){p.location=p.team==='mafia'?'hideout':'home';p.houseId=p.team==='mafia'?null:p.id;}
 const plans={[G.id]:{type:'guardHouse',target:T.id}};for(const p of s.players)if(!plans[p.id])plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};
 const mine=run(s,plans).filter(e=>e.to.includes(G.id)).map(e=>e.text);
 ok(mine.filter(t=>/아무도 오지 않았습니다/.test(t)).length===1,'습격이 없으면 "아무도 오지 않았습니다" 한 줄 · '+mine.filter(t=>/지켰/.test(t)).join(' / '));
 ok(!mine.some(t=>new RegExp('^'+T.name+'의 집을 지켰습니다').test(t)),'따로 "X의 집을 지켰습니다" 줄이 겹치지 않음');}
// 습격이 있었으면 [내 행동] 줄은 그대로(습격 결과가 따로 이어짐)
{const s=fresh();s.turn=2;const town=s.players.filter(p=>p.team==='town'),[G,T]=town,A=s.players.find(p=>p.role==='mafioso');for(const p of s.players){p.location=p.team==='mafia'?'hideout':'home';p.houseId=p.team==='mafia'?null:p.id;}
 const plans={[G.id]:{type:'guardHouse',target:T.id},[A.id]:{type:'attack',target:T.id,weapon:'fist',nightRaid:true}};for(const p of s.players)if(!plans[p.id])plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};
 const mine=run(s,plans).filter(e=>e.to.includes(G.id)).map(e=>e.text);
 ok(!mine.some(t=>/아무도 오지 않았습니다/.test(t)),'습격이 있었으면 "아무도 오지 않았습니다"가 없음 · '+mine.slice(0,3).join(' / ').slice(0,120));}

// 3. 잠 글: 피곤함이 풀리면 줄었던 체력이 두 배로(최대 10)
ok(world.includes("label:'잠자기 · 피곤했으면 피곤함이 풀려 줄었던 체력이 두 배로(최대 10), 아니면 습격·출혈이 없을 때 체력 1 회복'"),'잠자기 버튼 글');
ok(ui.includes('잠: 피곤했으면 피곤함이 풀리고 줄었던 체력이 두 배로(최대 10) 돌아옵니다.')&&ui.includes('시민은 잠자기(피곤했으면 줄었던 체력이 두 배로·최대 10,'),'잠 설명 글 두 곳');
ok(!ui.includes('잠: 피곤함이 풀리고, 습격받지 않으면 체력 1 회복.')&&!ui.includes('시민은 잠자기(습격받지 않으면 체력 1 회복,')&&!world.includes('잠자기 · 피곤함이 풀리고, 습격받지 않으면 체력 1 회복'),'옛 잠 설명 없음');
{const s=fresh();s.turn=2;const P=s.players.find(p=>p.team==='town');for(const p of s.players){p.location=p.team==='mafia'?'hideout':'home';p.houseId=p.team==='mafia'?null:p.id;}P.tired=true;P.hp=5;
 const plans={};for(const p of s.players)plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};run(s,plans);if(s.stage!=='done')C.nightAfter?.(s,[],[],rng);
 ok(P.tired===false&&P.hp===10,'실제로 피곤한 채 자면 피곤함이 풀리고 체력 5 → '+P.hp);}

// 4. 건네기: 당사자는 "당신"
{const s=fresh(),[G,T,O]=s.players;G.items.bandage=1;const tb=T.items.bandage||0;const out=run(s,{[G.id]:{type:'give',target:T.id,item:'bandage'}});
 const to=id=>out.filter(e=>e.to.includes(id)&&/건넸습니다/.test(e.text)).map(e=>e.text);
 ok(to(G.id).length===1&&to(G.id)[0]===`당신이 ${T.name}에게 붕대 하나를 건넸습니다.`,'건넨 사람: '+to(G.id).join(' / '));
 ok(to(T.id).length===1&&/당신에게 붕대 하나를 건넸습니다\.$/.test(to(T.id)[0]),'받은 사람: '+to(T.id).join(' / '));
 ok(to(O.id).length===1&&new RegExp(T.name+'에게 붕대 하나를 건넸습니다').test(to(O.id)[0])&&!/당신/.test(to(O.id)[0]),'곁의 사람은 3인칭: '+to(O.id).join(' / '));
 ok(T.items.bandage===tb+1&&G.items.bandage===0,'붕대가 실제로 옮겨짐');}

// 5. 조사 안내
ok(!ui.includes('상대도 당신을 봅니다.')&&ui.includes('조사당한 사람에게는 알림이 가지 않습니다(같은 곳에 있으니 서로 보이기는 합니다).'),'조사 안내: 조사당한 사람에게 알림이 가지 않음');

// 6. 시작 버튼: 누르자마자 잠그고 "시작하는 중…", 두 번 눌러도 한 번만 시작, 실패하면 풀림
ok(typeof UI?.prototype?.isStarting==='function','시작 중 표시 메서드가 있음');
ok(ui.includes("(this.isStarting()?'시작하는 중…':'마을 이야기 시작')"),'시작 버튼 글이 시작 중에는 "시작하는 중…"');
// 7. 재판 아래 버튼 글 (2026-11-25 시험 보강: 비동기 블록 밖으로 옮겨, 앞 확인이 오류로 멈춰도 늘 돈다)
ok(ui.includes("v.stage==='trial'?'재판 대화 · 시간이 끝나면 최종 변론'")&&!ui.includes('재판 대화 3분 · 시간이 끝나면 최종 변론'),'재판 아래 버튼에 고정 "3분" 없음(30초 추가와 어긋나지 않음)');
(async()=>{
 const btn={dataset:{do:'start'},disabled:false,closest(){return this;}};
 const has=u=>typeof u.isStarting==='function';
 const mk=res=>{const u=Object.create(UI.prototype);let calls=0,renders=0;u.engine={room:{start(){calls++;return res;}}};u.now={view:null};u.render=()=>{renders++;};u.toast=()=>{};return {u,get calls(){return calls;},get renders(){return renders;}};};
 try{const m=mk({ok:true});const p1=m.u.click({target:btn});ok(has(m.u)&&!!m.u.isStarting()&&m.renders>=1,'누르자마자 시작 중으로 바뀌고 다시 그림');await m.u.click({target:btn});await p1;ok(m.calls===1,'두 번 눌러도 시작은 한 번 ('+m.calls+')');}catch(e){ok(false,'시작 버튼 두 번 누르기 — 오류: '+e.message);}
 try{const m=mk({ok:false,error:'8명 또는 11명일 때 시작할 수 있습니다'});await m.u.click({target:btn});ok(has(m.u)&&!m.u.isStarting(),'시작이 거절되면 다시 누를 수 있음');}catch(e){ok(false,'시작 거절 — 오류: '+e.message);}
})();
