// 폭약 찾기는 주사위 판정, 꺼내다 NPC에게 들키면 돌려줄지 가져갈지 고른다(2026-11-25 사용자).
// "폭약은 단서를 하나도 못찾으면 찾을 수 없게하고 탐색 능력이 뛰어나면 찾을 확률이 증가되야 합니다. TRPG 판정 룰을 따르고 있나요?", "그냥 고정 확률이 아니라 주사위를 굴리는 개념이잖아요",
// "그럼 npc한테 알려주면서 폭약을 돌려줄건지 아니면 그대로 폭약을 가져갈건지 선택지를 줘야죠". 사용: node dynamite_dice_test.js <저장소 경로>
const fs=require('fs'),path=require('path'),os=require('os');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
const tmp=path.join(os.tmpdir(),'noir_dyn_dice_test_'+process.pid+'.jsonl');process.env.NOIR_DEFEAT_FILE=tmp;try{fs.unlinkSync(tmp);}catch{}
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src.replace(/\}\)\(\);\s*$/,'globalThis.__a={aiHazard};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory,A=globalThis.__a;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라'];
let x=29;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const seq=list=>{let i=0;return ()=>list[Math.min(i++,list.length-1)];};
const game=()=>{const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';s.scenario.discovered=true;for(const p of s.players){p.location='hall';p.used={big:false,small:false};p.hidden=false;}return s;};
const opt=(s,p,k)=>S.choices(s,p,'big').find(a=>a.sceneKey==='search:'+k);
const mine=(s,p)=>s.feed.filter(e=>e.to?.includes(p.id)).map(e=>String(e.text)).join(' / ');
const lastRoll=(s,p)=>s.feed.filter(e=>e.to?.includes(p.id)&&e.roll).at(-1)?.roll;
const search=(s,p,k,r)=>{S.resolve(s,p,opt(s,p,k),r);return lastRoll(s,p);};

// 1. 단서가 하나도 없으면 살필 수 없다. 단서마다 +2, 관찰이 높을수록 총합이 오른다(주사위 d10 + 관찰 + 단서 ≥ 16)
{const s=game();s.scenario.spots=['chapel','barrel'];s.scenario.bombs=[{id:'d0',where:'chapel'},{id:'d1',where:'spot:barrel'}];const p=s.players.find(o=>o.team==='town');p.location='tavern';
 ok(!opt(s,p,'barrel'),'단서가 없으면 "술통을 살핀다"가 없음');
 const table=[];for(const obs of [6,10])for(const n of [1,2,3]){const t=game();t.scenario.spots=['chapel','barrel'];t.scenario.bombs=[{id:'d0',where:'chapel'},{id:'d1',where:'spot:barrel'}];const q=t.players.find(o=>o.team==='town');q.location='tavern';q.stats.observe=obs;q.npcHeard=['lead:barrel','lead:barrel:child','lead:barrel:desk'].slice(0,n);
  const a=opt(t,q,'barrel');const r=search(t,q,'barrel',()=>0.45);/* 주사위 5 */table.push(obs+'/'+n+'='+r.total);
  ok(a&&!/%/.test(a.label)&&/관찰 난이도 16 · 단서 \d개/.test(a.label)&&r.label==='숨긴 곳 살피기'&&r.difficulty===16&&r.stat===obs&&r.total===5+obs+2*Math.min(n,(a.label.match(/단서 (\d+)개/)||[])[1]*1),'관찰 '+obs+' · '+a?.label.match(/단서 \d개/)?.[0]+': 주사위 5 + 관찰 '+obs+' + 단서 = '+r.total+(r.success?' 성공':' 실패'));}
 console.log('   (주사위 5일 때 총합: '+table.join(', ')+')');}

// 2. 같은 단서라도 주사위가 정한다: 1이면 실패(다시 찾아볼 수 있음), 10이면 성공. 판정 상자(roll)가 나온다
{const mk=()=>{const s=game();s.scenario.spots=['chapel','barrel'];s.scenario.bombs=[{id:'d0',where:'chapel'},{id:'d1',where:'spot:barrel'}];const p=s.players.find(o=>o.team==='town');p.location='tavern';p.stats.observe=6;p.stats.agility=3;p.npcHeard=['lead:barrel','lead:barrel:child'];return {s,p};};
 let {s,p}=mk();let r=search(s,p,'barrel',seq([0.01,0.95]));ok(r&&!r.success&&r.total===1+6+4&&/이번에는 찾지 못했습니다\. 다시 찾아볼 수 있습니다/.test(mine(s,p))&&!p.storyKnown.some(k=>k.startsWith('spot:barrel')),'주사위 1: 1 + 6 + 4 = 11 < 16 → 못 찾음, "다시 찾아볼 수 있습니다", 판정 상자 있음');
 ok(!(s.scenario.traces||[]).length,'실패해도 은신 판정(주사위 10 + 3 = 13 ≥ 12)에 이기면 손자국이 남지 않음');
 ({s,p}=mk());search(s,p,'barrel',seq([0.01,0.05]));ok((s.scenario.traces||[]).some(t=>t.who===p.id),'실패하고 은신 판정(1 + 3 < 12)에도 지면 손자국이 남음');
 ({s,p}=mk());r=search(s,p,'barrel',()=>0.99);ok(r&&r.success&&r.total===10+6+4&&p.storyKnown.some(k=>k.startsWith('spot:barrel'))&&/폭약 1개입니다/.test(mine(s,p))&&!/확률/.test(mine(s,p)),'주사위 10: 10 + 6 + 4 = 20 ≥ 16 → 찾음(글에 확률 없음)');}

// 3. 도구: 종탑 아래는 삽 +3, 광차는 갱도의 어둠 −2를 손전등이 없앤다
{const s=game();s.scenario.spots=['chapel','cart'];s.scenario.bombs=[{id:'d0',where:'chapel'},{id:'d1',where:'cart'}];const p=s.players.find(o=>o.team==='town');p.stats.observe=6;p.location='chapel';p.npcHeard=['lead:chapel'];
 let r=search(s,p,'chapel',()=>0.01);ok(r.total===1+6+2&&!r.terms.some(t=>t.label==='삽'),'삽 없이 종탑 아래: 1 + 6 + 2 = 9');
 s.epoch++;p.items.shovel=1;r=search(s,p,'chapel',()=>0.01);ok(r.total===1+6+2+3&&r.terms.some(t=>t.label==='삽'&&t.value===3),'삽이 있으면 +3: 12');
 p.location='warehouse';p.npcHeard.push('lead:cart');r=search(s,p,'cart',()=>0.01);ok(r.total===1+6+2-2&&r.terms.some(t=>/어둠/.test(t.label)),'광차는 갱도의 어둠 −2: 7');
 s.epoch++;p.items.flashlight=1;r=search(s,p,'cart',()=>0.01);ok(r.total===1+6+2&&!r.terms.some(t=>/어둠/.test(t.label)),'손전등이 있으면 어둠 −2가 없어짐: 9');}

// 4. 판정에 성공했는데 그 자리에 폭약이 없으면 비었다는 것을 안다
{const s=game();s.scenario.spots=['chapel','cart'];s.scenario.bombs=[{id:'d0',where:'chapel'},{id:'d1',where:'cart'}];const p=s.players.find(o=>o.team==='town');p.stats.observe=6;p.location='tavern';p.npcHeard=['lead:barrel'];
 const r=search(s,p,'barrel',()=>0.99);ok(r.success&&/술통은 비어 있습니다/.test(mine(s,p))&&p.known.some(k=>/빈 술통은 비어 있었다/.test(String(k.text))),'성공했는데 비었으면 "술통은 비어 있습니다"가 나오고 수첩에 남음');}

// 5. 꺼내다 NPC에게 들키면: 바로 고발하지 않고, 이번 때가 끝날 때 [폭약을 돌려준다] / [그대로 가져간다]를 고른다
const setup=(masked=false)=>{const s=game();s.scenario.spots=['cart','barrel'];s.scenario.bombs=[{id:'d0',where:'cart'},{id:'d1',where:'spot:barrel'}];const bk=ST.npc(s,'barkeep');bk.location='tavern';bk.hp=10;bk.recruited=false;const m=s.players.find(o=>o.team==='mafia');m.location='tavern';if(masked){s.aliases??={};s.aliases[m.id]=(s.aliasSeq=(s.aliasSeq||0)+1);m.faceCover=true;}S.resolve(s,m,{type:'scene',sceneKey:'take'},rng);return {s,m};};
{const {s,m}=setup();const v=S.hazardView(s,m);
 ok(s.scenario.bombs.find(b=>b.id==='d1').where==='carry:'+m.id&&!s.cases.some(c=>c.target===m.id),'꺼낸 직후: 폭약은 품에 있고 아직 고발 없음');
 ok(/앞을 막아섭니다/.test(mine(s,m))&&/15초 안에 폭약을 술집 주인에게 돌려줄지, 그대로 가져갈지/.test(mine(s,m)),'술집 주인이 막아서고, 때가 끝날 때 고른다고 알려 줌');
 ok(v?.kind==='confront'&&v.choices.map(c=>c.label).join('|')==='폭약을 돌려준다|그대로 가져간다','대응 화면: [폭약을 돌려준다] [그대로 가져간다]');
 ok(S.hazardAction(s,m,'return',rng)==='지금 선택할 수 없는 대응입니다.','대응 시간 전에는 고를 수 없음');
 s.stage='hazard';ok(S.hazardAction(s,m,'escape',rng)==='지금 선택할 수 없는 대응입니다.','들킨 자리에서는 도화선 대응(대피)을 누를 수 없음');
 ok(S.hazardAction(s,m,'return',rng)===null&&S.hazardAction(s,m,'keep',rng)==='지금 선택할 수 없는 대응입니다.','한 번 고르면 바꿀 수 없음');
 S.resolveHazard(s,rng);ok(s.scenario.bombs.find(b=>b.id==='d1').where==='secured'&&!s.cases.some(c=>c.target===m.id)&&m.location==='tavern'&&!m.jailEpoch,'돌려주면: 폭약은 회관에 봉인, 고발 없음, 붙잡히지 않음');
 ok(/폭약 1개를 술집 주인에게 돌려주었습니다/.test(mine(s,m))&&!S.hazardView(s,m),'돌려준 글이 남고 대응 화면은 닫힘');}
{const {s,m}=setup();s.stage='hazard';S.hazardAction(s,m,'keep',rng);S.resolveHazard(s,seq([0.01]));const c=s.cases.find(c=>c.target===m.id&&c.caught);
 ok(!!c&&c.npcKind==='dynamite'&&c.byName==='술집 주인'&&s.scenario.bombs.find(b=>b.id==='d1').where==='secured'&&m.jailEpoch===s.epoch+1,'그대로 가져가고 달아나기에 실패하면: 고발 + 붙잡혀 폭약을 빼앗김');}
{const {s,m}=setup();s.stage='hazard';S.hazardAction(s,m,'keep',rng);S.resolveHazard(s,seq([0.99,0.5]));
 ok(s.cases.some(c=>c.target===m.id&&c.caught)&&s.scenario.bombs.find(b=>b.id==='d1').where==='carry:'+m.id&&m.location!=='tavern','그대로 가져가고 달아나면: 폭약을 품고 다른 곳으로, 고발은 남음');}
{const {s,m}=setup();s.stage='hazard';S.resolveHazard(s,seq([0.01]));ok(s.cases.some(c=>c.target===m.id&&c.caught),'15초 안에 고르지 않으면 그대로 가져간 것과 같음(고발)');}
{const {s,m}=setup(true);const v=S.hazardView(s,m);ok(v?.kind==='confront'&&!s.cases.some(c=>c.target===m.id)&&s.players.filter(o=>o.team==='town').every(o=>o.known.some(k=>/변장한 사람 1이 .*폭약을 꺼냈소/.test(String(k.text)))),'얼굴을 가렸으면: 이름 없는 말이 퍼지고, 같은 선택이 나옴');
 s.stage='hazard';S.hazardAction(s,m,'return',rng);S.resolveHazard(s,rng);ok(!s.cases.some(c=>c.target===m.id)&&!!m.faceCover&&s.scenario.bombs.find(b=>b.id==='d1').where==='secured','변장한 채 돌려주면 고발 없이 폭약만 회관으로');}

// 6. AI도 사람과 같은 화면 글과 버튼으로 고른다(지시문에 조언 없음)
(async()=>{const {s,m}=setup();s.stage='hazard';const prompts=[];const r={state:s,random:rng,engine:{time:100},ai:{mode:'on',async ask(p,info){prompts.push({p,purpose:info?.purpose});return {ok:true,text:JSON.stringify({누름:[{버튼:'폭약을 돌려준다'}]})};}},record(){return true;},refresh(){},closePhase(){},phase(){},after(){},seat(){return {on:true};}};
 await A.aiHazard(r,m);const pr=prompts[0]?.p||'';
 ok(/폭약을 돌려준다/.test(pr)&&/그대로 가져간다/.test(pr)&&/폭약을 꺼내다 들켜/.test(pr)&&!/돌려주는 편이|가져가는 편이|유리|추천/.test(pr),'AI 물음에 같은 화면의 두 버튼이 있고 조언 문장은 없음');
 ok(S.confrontPending(s,m)?.choice==='return','AI가 "폭약을 돌려준다"를 누르면 그 선택이 들어감');
 try{fs.unlinkSync(tmp);}catch{}})();
