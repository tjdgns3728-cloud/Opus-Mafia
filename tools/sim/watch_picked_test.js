// 2026-11-28 사용자: "ai들이 하는것을 관전할 수 있게 설계를 바꿔주실 수 있나요?", "그러니깐 본 게임은 그대로 있고 관전기능도 넣는거죠",
// 고른 것: "똑같이 게임 화면으로 볼 수 있게하고 왼쪽에 플레이어를 클릭하면 그 플레이어 화면을 볼 수 있게 합니다",
// "어떤 행동을 눌렀는지 직관적으로 표현할 수 있게 합니다. 지금 게임 시스템도 버튼을 사라지게 하지말고 누르면 색깔이나 강조 표시를 바꿔서 어떤 행동을 선택했는지 직관적으로 볼 수 있게 해야 합니다."
// ① 고른 행동 단추 강조(사람 화면 class picked, AI 화면 "(고른 것)"), 작은 행동을 쓴 뒤에도 단추가 남음 ② 관전 방: 규칙 watch, 고른 플레이어 화면, 시작 화면 단추.
// 사용: node watch_picked_test.js <저장소 경로>
const fs=require('fs'),path=require('path'),os=require('os');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
const tmp=path.join(os.tmpdir(),'noir_watch_picked_test_'+process.pid+'.jsonl');process.env.NOIR_DEFEAT_FILE=tmp;try{fs.unlinkSync(tmp);}catch{}
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
let UI=null;globalThis.WebEngine={room(){},Component:class{},define(n,c){if(n==='TRPGUI')UI=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src.replace(/\}\)\(\);\s*$/,'globalThis.__t={ROOM,aiTurn};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen,T=globalThis.__t;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=53;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['관전','도현','서아','시온','하준','나린','이안','수현'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players)p.location='hall';return s;};
const ui=v=>{const u=Object.create(UI.prototype);Object.assign(u,{now:{view:v,room:'',round:0},sound:{enabled:false},selected:null,tab:'self',draft:'',chatMode:'say',overlay:null,feedTab:'story',peopleTab:'players',typing:new Map(),stayEpoch:v?.epoch,actionSlot:'big',name:'관전'});return u;};
const deck=(s,id,slot)=>{const v=C.view(s,id),u=ui(v);u.actionSlot=slot;return u.play(v);};
const sec=(h,size)=>(h.split('<section class="action-page action-slot slot-'+size)[1]||'').split('</section>')[0];
const btns=h=>[...h.matchAll(/<button([^>]*data-do="action-group"[^>]*)>([\s\S]*?)<\/button>/g)].map(m=>({name:m[2].replace(/<[^>]+>/g,'').trim(),picked:/class="picked"/.test(m[1]),off:/disabled/.test(m[1])}));
// 1. 큰 행동을 고르면 그 단추가 강조되고 단추는 그대로, AI 화면에 "(고른 것)"
{const s=fresh(),me=s.players[0],a=C.choices(s,me.id,'big').find(a=>a.type==='attack');C.queue(s,me.id,a);
 const b=btns(sec(deck(s,me.id,'big'),'big'));ok(b.find(x=>x.name==='공격하기')?.picked&&b.filter(x=>x.picked).length===1,'큰 행동: [공격하기]만 강조 · '+b.map(x=>x.name+(x.picked?'★':'')).join(', '));
 ok(/\[공격하기\] \(고른 것\)/.test(NS.read(C.view(s,me.id)).text),'AI 화면: [공격하기] (고른 것)');
 s.ready.push(me.id);const b2=btns(sec(deck(s,me.id,'big'),'big'));ok(b2.find(x=>x.name==='공격하기')?.picked&&b2.every(x=>x.off),'선택을 마친 뒤에도 강조가 남음(모두 누를 수 없음)');}
// 2. 작은 행동을 쓴 뒤에도 그 칸의 단추가 남고(누를 수 없음), 쓴 단추가 강조
{const s=fresh(),me=s.players[0];const before=btns(sec(deck(s,me.id,'small'),'small')).map(x=>x.name);
 const a=C.choices(s,me.id,'small').find(a=>a.type==='observe');C.smallAct(s,me.id,a,rng);ok(C.view(s,me.id).smallTaken?.type==='observe','화면 정보에 이번 때 쓴 작은 행동(주변 보기)');
 const h=sec(deck(s,me.id,'small'),'small'),after=btns(h);
 ok(before.every(n=>after.some(x=>x.name===n)),'쓰기 전 단추가 모두 남음: '+before.join(', ')+' → '+after.map(x=>x.name+(x.picked?'★':'')+(x.off?'(꺼짐)':'')).join(', '));
 ok(after.find(x=>x.name==='살펴보기')?.picked&&after.find(x=>x.name==='감추기')?.off,'[살펴보기] 강조, [감추기]는 누를 수 없음');
 ok(/사용: 주변 보기/.test(h),'작은 행동 칸에 "사용: 주변 보기"');
 ok(/\[살펴보기\] \(고른 것\) \(지금 누를 수 없음\)/.test(NS.read(C.view(s,me.id)).text),'AI 화면: [살펴보기] (고른 것) (지금 누를 수 없음)');
 C.nextTurn(s);ok(!C.view(s,me.id).smallTaken,'다음 때에는 작은 행동 강조가 없음');}
// 3. 밤 시민: [잠자기]를 고르면 강조
{const s=fresh();s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter?.(s);s.stage='plan';const t=s.players.find(p=>p.team==='town');C.queue(s,t.id,C.choices(s,t.id,'big').find(a=>a.type==='sleep'));
 const b=btns(sec(deck(s,t.id,'big'),'big'));ok(b.find(x=>x.name==='잠자기')?.picked&&b.filter(x=>x.picked).length===1,'밤 시민: [잠자기] 강조 · '+b.map(x=>x.name+(x.picked?'★':'')).join(', '));}
// 3-1. 갈 곳 정하기: 고른 장소(머물기 포함) 단추가 강조(2026-11-28 LQD9 확인: 강조가 없었음)
{const s=fresh();s.stage='move';s.moveChoice={};const me=s.players[0];C.chooseMove(s,me.id,{type:'move',place:'tavern'});const v=C.view(s,me.id),h=ui(v).play(v);
 ok(/<button data-do="move-choice" data-place="tavern" class="picked" disabled>광부 술집/.test(h)&&(h.match(/class="picked"/g)||[]).length===1,'갈 곳: [광부 술집]만 강조');ok((h.match(/data-do="move-(choice|home)"[^>]*disabled/g)||[]).length>=8&&/쪽으로 가기로 했습니다/.test(h),'고른 뒤에도 장소 단추가 남음(누를 수 없음, '+(h.match(/data-do="move-(choice|home)"/g)||[]).length+'개)과 "광부 술집 쪽으로 가기로 했습니다"');
 ok(/\[광부 술집[^\]\n]*\] \(고른 것\) \(지금 누를 수 없음\)/.test(NS.read(v).text),'AI 화면: [광부 술집] (고른 것) (지금 누를 수 없음)');
 C.chooseMove(s,me.id,{type:'stay'});const v2=C.view(s,me.id),h2=ui(v2).play(v2);ok(/data-place="" class="picked" disabled>여기 머물기/.test(h2),'머물기를 고르면 [여기 머물기] 강조');}
// 3-2. 재판 동의: 응답한 뒤에도 [반대]·[동의]가 남고(누를 수 없음) 고른 것이 강조, 재판 표결: 고른 표 강조
{const s=fresh();for(const p of s.players){p.hidden=false;p.used={big:false,small:false};}const gf=s.players.find(q=>q.team==='mafia'),f=s.players.find(q=>q.team==='town'),o=s.players.find(q=>q.team==='town'&&q!==f);
 C.queue(s,f.id,{type:'file',target:gf.id,reason:'시험'});for(const p of C.alive(s))if(!s.plans[p.id])C.queue(s,p.id,{type:'wait'});C.resolveBig(s,rng);const c=s.cases.find(q=>q.target===gf.id);C.beginConsent(s,c);
 const err=C.support(s,o.id,c.id,true);const v=C.view(s,o.id),h=ui(v).consentDialog(v)/* 재판 동의는 덧창 */;
 ok(!err&&/class="gold picked" data-do="consent-yes"[^>]*disabled>동의/.test(h)&&/data-do="consent-no"[^>]*disabled>반대/.test(h)&&/동의로 응답했습니다/.test(h),'재판 동의: 응답한 뒤에도 [반대]·[동의]가 남고 [동의] 강조'+(err?' · '+err:''));
 ok(/\[동의\] \(고른 것\) \(지금 누를 수 없음\)/.test(NS.read(v).text),'AI 화면: [동의] (고른 것)');
 C.beginTrial(s,c);s.stage='vote';s.trial.votes=s.trial.votes||{};s.trial.votes[o.id]='innocent';const v2=C.view(s,o.id),h2=ui(v2).play(v2);
 ok(/data-vote="innocent" class="picked">무죄/.test(h2)&&!/data-vote="guilty" class="picked"/.test(h2),'재판 표결: 고른 [무죄] 강조');
 ok(/\[무죄\] \(고른 것\)/.test(NS.read(v2).text),'AI 화면: [무죄] (고른 것)');}
// 4. 관전 방 규칙: 모든 플레이어의 화면
{ok(typeof T.ROOM.watch==='function','규칙에 watch가 있음(엔진이 관전 방을 열 수 있음)');ok(T.ROOM.watch({state:null})===null,'판 전에는 보기 없음');
 const s=fresh(),w=T.ROOM.watch({state:s});ok(w.order.length===8&&w.order.every(o=>w.views[o.id]?.me?.id===o.id),'플레이어 8명의 화면이 모두 있음(각 화면의 나 = 그 플레이어)');
 const gf=s.players.find(p=>p.role==='godfather');ok(w.views[gf.id].me.role==='godfather','대부의 화면은 대부가 보는 것 그대로');}
// 5. 관전 화면: 고른 플레이어의 화면, 왼쪽 이름을 누르면 그 사람
{const s=fresh(),w=T.ROOM.watch({state:s}),u=ui(null);const n={watching:true,status:'play',room:'K7QM',watchers:1,view:w};
 let m=u.watchPick(n);ok(m.view?.me?.id===w.order[0].id&&u.watchAll,'처음엔 첫 플레이어의 화면');
 u.watchId=w.order[3].id;m=u.watchPick(n);ok(m.view?.me?.id===w.order[3].id,'고른 플레이어('+w.order[3].name+')의 화면');
 u.now=m;const h=u.play(m.view);ok(/관전 · <b>/.test(u.mast())&&u.mast().includes(w.order[3].name),'위쪽에 "관전 · '+w.order[3].name+'의 화면"');
 ok(/id="draft"[^>]*disabled/.test(h),'관전 중에는 말 칸을 쓸 수 없음');
 {const ids=[...new Set([...h.matchAll(/data-do="person"[^>]*data-id="([^"]+)"|data-id="([^"]+)"[^>]*data-do="person"/g)].map(m=>m[1]||m[2]))];const hit=ids.filter(id=>w.views[id]);ok(hit.length===8,'왼쪽 이름 단추 '+ids.length+'개 중 '+hit.length+'개가 그 플레이어의 화면으로 이어짐');}
 const plain={watching:false,status:'play',view:C.view(s,s.players[0].id)};ok(u.watchPick(plain)===plain&&u.watchAll===null,'관전이 아닌 방은 그대로');}
// 5-1. 밤(모두 각자 집)에도 왼쪽 목록에 모든 플레이어가 있어 넘어갈 수 있음(2026-11-28 76JT 확인: 밤엔 '나' 하나만 남았음)
{const s=fresh();s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter?.(s);s.stage='plan';const w=T.ROOM.watch({state:s}),u=ui(null);const m=u.watchPick({watching:true,status:'play',room:'K7QM',watchers:1,view:w});u.now=m;const h=u.play(m.view);
 const ids=[...new Set([...h.matchAll(/data-do="person"[^>]*data-id="([^"]+)"|data-id="([^"]+)"[^>]*data-do="person"/g)].map(x=>x[1]||x[2]))].filter(id=>w.views[id]);ok(ids.length===8,'밤 관전: 왼쪽 이름 단추 '+ids.length+'개가 플레이어 화면으로 이어짐');
 const plain=ui(m.view);const ph=plain.play(m.view);const pids=[...new Set([...ph.matchAll(/data-do="person"[^>]*data-id="([^"]+)"|data-id="([^"]+)"[^>]*data-do="person"/g)].map(x=>x[1]||x[2]))];ok(pids.length<8,'판을 하는 사람 화면은 그대로(밤엔 보이는 사람만, '+pids.length+'명)');}
// 5-2. 왼쪽 목록은 누구를 보든 자리 순서로 고정, 죽은 사람도 제자리(2026-11-28 사용자 "왼쪽에 플레이어 위치가 고정되지 않아서")
{const s=fresh();const dead=s.players[2];dead.hp=0;dead.deathCause='시험';const w=T.ROOM.watch({state:s}),order=w.order.map(o=>o.id);
 const list=id=>{const u=ui(null);u.watchId=id;const m=u.watchPick({watching:true,status:'play',room:'K7QM',watchers:1,view:w});u.now=m;const h=u.play(m.view);const side=(h.split('<div class="people-list">')[1]||'').split('</div>')[0]||h;return [...side.matchAll(/data-do="person" data-id="([^"]+)"/g)].map(x=>x[1]);};
 const a1=list(order[0]),a2=list(order[5]),a3=list(order[2]);
 ok(a1.join()===order.join()&&a2.join()===order.join(),'누구를 보든 왼쪽 순서가 자리 순서 그대로: '+w.order.map(o=>o.name).join(' '));
 ok(a3.join()===order.join(),'죽은 사람('+dead.name+')도 제자리에 있고, 그 사람을 볼 때도 순서가 같음');}
// 6. 시작 화면과 대기실
{const u=ui(null);ok(/data-do="watch-ai"[^>]*>AI끼리 하는 판 보기</.test(u.home()),'시작 화면에 [AI끼리 하는 판 보기]');
 ok(/data-do="solo"[^>]*>혼자 하기 · AI 자리 채우기</.test(u.home()),'[혼자 하기 · AI 자리 채우기]는 그대로');
 u.now={room:'K7QM',watching:true,host:true,seats:Array.from({length:8},(_,i)=>({name:'주민'+i,bot:true,on:true})),status:'lobby'};u.isStarting=()=>false;ok(/같이 볼 수 있습니다/.test(u.lobby())&&/마을 이야기 시작/.test(u.lobby()),'관전 방 대기실: 같이 볼 수 있다는 글, 방장은 시작 단추');}
try{fs.unlinkSync(tmp);}catch{}
// 밤 장소 선택과 도착 후 행동은 실제 AI 실행 경로에서 별개의 화면이다.
async function nightDecision(move){
 const s=fresh(),p=s.players.find(o=>o.team==='mafia'),town=s.players.find(o=>o.team==='town');
 Object.assign(s,{day:6,turn:2,stage:'plan',epoch:12});p.location='hideout';
 const watcher=ui(null);watcher.watchId=p.id;
 const watch=()=>{watcher.now=watcher.watchPick({status:'play',room:'TEST',watching:true,view:T.ROOM.watch(r)});return watcher.actionPanel(watcher.now.view);};
 const prompts=[];
 const r={state:s,random:rng,engine:{time:0,timeScale:1},seat:()=>({on:true}),refresh(){},after(){},closePhase(){},ai:{mode:'on',async ask(prompt,{purpose}){
  const v=C.view(s,p.id),buttons=NS.read(v).buttons,first=prompts.length===0;prompts.push(purpose);
  if(first){
   ok(watch().includes('여기 머물기')&&buttons.some(b=>b.do==='stay-here')&&!buttons.some(b=>b.name==='살펴보기'),'관전·AI 첫 밤 화면에 장소 선택');
   const missing=NS.press(v,NS.read(v),{'버튼':'이동하기 (행동 소모 없음)','고른 것':[]});ok(!!missing.error,'목적지 없는 이동은 자동 선택하지 않음');
  }else{
   ok(p.location===(move?'hall':'hideout')&&!p.used.small&&!p.used.big,'장소 확정 후 두 행동 기회 유지');
   ok(!buttons.some(b=>b.do==='stay-here')&&watch().includes('이번 밤 선택'),'관전·AI 모두 현재 장소의 행동으로 넘어감');
  }
  const pick=first?(move?{'버튼':'이동하기 (행동 소모 없음)','고른 것':['마을 회관']}:{'버튼':'여기 머물기'}):{'버튼':'살펴보기','고른 것':['현장 수색']};
  return {ok:true,text:JSON.stringify({'누름':[pick]})};
 }}};
 await T.aiTurn(r,p.id);
 ok(prompts.join('/')==='밤 장소 선택/참가자 행동'&&p.nightChoice?.lastSmall?.type==='evidence','AI가 장소 다음에 현장 수색을 선택해 게임이 처리함');
 ok(watch().includes(move?'이동 · 마을 회관':'본거지에 머물기')&&/이번 밤 선택<\/b>[^<]*현장 수색/.test(watch()),'관전에 장소와 후속 행동 표시');
 ok(!T.ROOM.act(r,p.id,{type:'night-stay',stage:s.stage,epoch:s.epoch}).ok,'이미 정한 장소를 다시 확정할 수 없음');
 ok(!NS.read(C.view(s,town.id)).buttons.some(b=>b.do==='stay-here'),'시민의 기존 밤 행동 유지');
}
nightDecision(false).then(()=>nightDecision(true)).catch(e=>{console.error(e);process.exitCode=1;});
