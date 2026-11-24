// 다시 설계 2단계(2026-11-24 사용자 "2단계도 만들어 주세요", docs/REDESIGN_V1.md 3-2·3-6): 버튼 묶음(한 칸 6개까지), 인물·현장 셋까지, 마피아 밤의 흔적 손보기, 화면에 없던 규칙 적기.
// 사용: node redesign2_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=33;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.hidden=false;p.used={big:false,small:false};}return s;};
const deck=(scr,slot)=>scr.buttons.filter(b=>['action-group','trial-open','scene-choice'].includes(b.do)&&(b.data['data-slot']===slot||b.do==='trial-open'&&slot==='big'));
// 1. 여러 판·때·자리에서 한 칸의 버튼은 6개까지, 기다리기 버튼은 없음
{let most={small:0,big:0},waitBtn=0,shots=0;for(let g=0;g<6;g++){let y=900+g*131;const r2=()=>{y=(y*16807)%2147483647;return y/2147483647;};const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),r2);S.start(s);S.afterGathering?.(s);
 for(let k=0;k<12&&!s.result;k++){s.stage='plan';for(const p of C.alive(s))if(r2()<0.5)p.location=['hall','tavern','clinic','chapel','home','warehouse','office','union','rail'][Math.floor(r2()*9)];
  for(const p of C.alive(s)){const scr=NS.read(C.view(s,p.id));shots++;for(const sl of ['small','big'])most[sl]=Math.max(most[sl],deck(scr,sl).length);if(scr.buttons.some(b=>b.label==='기다리기'))waitBtn++;}
  for(const p of C.alive(s)){const sm=C.choices(s,p.id,'small').filter(a=>a.type!=='wait');if(sm.length&&r2()<0.6)C.smallAct(s,p.id,sm[Math.floor(r2()*sm.length)],r2);}s.plans={};for(const p of C.alive(s)){const bg=C.choices(s,p.id,'big');const a=bg[Math.floor(r2()*bg.length)]||{type:'wait'};if(C.validate(s,p.id,a,'big')||C.queue(s,p.id,a))C.queue(s,p.id,{type:'wait'});}C.announceClashes(s);s.stage='plan';C.resolveBig(s,r2);C.nextTurn(s);if(S.nextChapter)S.nextChapter(s);}}
 ok(most.small<=6&&most.big<=6,'화면 '+shots+'장에서 한 칸의 버튼 수 가장 많을 때 작은 '+most.small+'·큰 '+most.big+'(6개까지)');ok(waitBtn===0,'기다리기 버튼 없음(고르지 않고 마치면 기다리기)');}
// 2. 묶음 창: 사람에게 하는 일 → 추적하기 → 사람, 살펴보기 → 조사하기 → 사람, 감추기 → 얼굴 가리기
{const s=fresh(),[a,b]=s.players;const v=C.view(s,a.id),scr=NS.read(v);
 const m1=NS.press(v,scr,{'버튼':'사람에게 하는 일','고른 것':['추적하기',b.name]});ok(m1.req?.action?.type==='track'&&m1.req.action.target===b.id&&m1.req.slot==='big','사람에게 하는 일 → 추적하기 → '+b.name);
 const m2=NS.press(v,scr,{'버튼':'살펴보기','고른 것':['조사하기',b.name]});ok(m2.req?.action?.type==='investigate'&&m2.req.action.target===b.id&&m2.req.slot==='small','살펴보기 → 조사하기 → '+b.name);
 const m3=NS.press(v,scr,{'버튼':'감추기','고른 것':['얼굴 가리기']});ok(m3.req?.action?.type==='cover','감추기 → 얼굴 가리기');
 ok(!m1.req?.action?._kind,'보내는 요청에 화면용 값(_kind)이 섞이지 않음');
 const w=scr.text.slice(scr.text.indexOf('■ 창 · [사람에게 하는 일]'));ok(/무엇을 합니까\?/.test(w)&&/「곁에서 지키기」을 고르면:/.test(w),'AI 화면 글: 묶음 창에 "무엇을 합니까?"와 행동마다 이어지는 목록');}
// 3. 인물·현장은 셋까지, 대부에게는 도일 협박·해먼드 끌어들이기가 먼저
{const s=fresh(),gf=s.players.find(p=>p.role==='godfather');gf.location='hall';s.scenario&&(s.scenario.discovered=true);const v=C.view(s,gf.id),scr=NS.read(v);const b=scr.buttons.find(b=>/^인물·현장/.test(b.name)&&b.data['data-slot']==='big');
 if(b){ok(b.win?.kinds?.length<=3,'인물·현장 창은 셋까지('+b.win.kinds.length+'가지)');ok(b.win.kinds.some(k=>/해먼드 끌어들이기/.test(k.name)),'대부의 인물·현장에 해먼드 끌어들이기가 보임: '+b.win.kinds.map(k=>k.name).join(' / '));}
 else ok(false,'대부의 큰 행동에 인물·현장이 있음');}
// 4. 마피아 밤의 흔적 손보기
{const s=fresh(),m=s.players.find(p=>p.team==='mafia'),v0=s.players.find(p=>p.team==='town');m.items.knife=1;s.plans={[m.id]:{type:'attack',target:v0.id,weapon:'knife',flee:'stay'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);
 const e=s.events.find(e=>e.type==='attack'&&e.actor===m.id);s.turn=2;s.stage='plan';for(const p of s.players)p.used={big:false,small:false};const v=C.view(s,m.id);
 ok(e&&v.tamperChoices?.some(a=>a.trace===e.id&&a.mode==='erase'),'밤에 마피아에게 우리 편 흔적 손보기가 보임');ok(!C.view(s,v0.id).tamperChoices?.length,'시민에게는 보이지 않음');
 const to=['big','mid','small'].find(z=>z!==e.boots);s.plans={[m.id]:{type:'tamper',trace:e.id,mode:to}};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);ok(e.boots===to&&e.tampered,'흔적 손보기로 장화 자국 크기가 바뀜');}
// 5. 화면에 없던 규칙과 재판 순서·소지품 쓰임
{const s=fresh(),p=s.players.find(p=>p.team==='town');p.items.bandage=1;p.items.medicine=1;const t=NS.read(C.view(s,p.id)).text;
 ok(/불침번[^\n]*나 \+2/.test(t)&&/잠든 채라 습격자 공격 \+3/.test(t)&&/퇴역군인 \+2 더/.test(t),'게임 정보에 밤의 판정 수치');
 ok(/9 \+ 변장한 사람의 은신/.test(t)&&/재판 신청 대상에 나오지 않습니다/.test(t),'변장 알아보기 조건, 얼굴 가린 사람은 재판 신청 대상 아님');
 ok(/순서: ① /.test(t),'재판 신청 창에 순서');ok(/지혈\(피를 멎게 함\)에 씀/.test(t)&&/체력을 돌림/.test(t),'소지품에 붕대·치료제 쓰임');
 ok(!/미개정/.test(fs.readFileSync(path.join(dir,'00World.js'),'utf8')),'"미개정" 대신 "열리지 않음"');}
