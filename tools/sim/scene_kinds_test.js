// 인물·현장 창: 대상만 다른 행동은 한 종류로, 종류를 고른 뒤 대상을 고른다(2026-11-25 사용자).
// "끌어드리기는 하나의 행동만 보여야죠", "협박도 여러 인물을 따로 행동으로 만드는게 아니라", "협박하기 클릭하고 거기서 어떤 대상으로 협박할건지 선택하게 해야죠".
// 사용: node scene_kinds_test.js <저장소 경로>
const fs=require('fs'),path=require('path'),os=require('os');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
const tmp=path.join(os.tmpdir(),'noir_scene_kinds_test_'+process.pid+'.jsonl');process.env.NOIR_DEFEAT_FILE=tmp;try{fs.unlinkSync(tmp);}catch{}
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라'];
let x=41;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const game=()=>{const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';s.scenario.discovered=true;for(const p of s.players){p.location='hall';p.used={big:false,small:false};p.hidden=false;}return s;};
// 마피아가 NPC 둘(술집 주인 + 한 명 더)이 있는 술집에서, 술통 밑에 숨긴 폭약을 본 상태
const setup=()=>{const s=game();s.scenario.spots=['cart','barrel'];s.scenario.bombs=[{id:'d0',where:'cart'},{id:'d1',where:'spot:barrel'}];
 const npcs=s.scenario.continuation.npcs;const bk=ST.npc(s,'barkeep');bk.location='tavern';bk.hp=10;bk.recruited=false;
 const other=Object.values(npcs).find(n=>!['barkeep','doyle','merchant','child','miner'].includes(n.id)&&n.hp>0);other.location='tavern';other.recruited=false;
 for(const n of Object.values(npcs))if(n!==bk&&n!==other&&n.location==='tavern')n.location='hall';
 const m=s.players.find(o=>o.team==='mafia');m.location='tavern';return {s,m,bk,other};};
const winOf=(scr,re)=>scr.buttons.find(b=>re.test(b.name)&&b.data['data-slot']==='big');
{const {s,m,bk,other}=setup();
 const raw=S.choices(s,m,'big').filter(a=>a.type==='scene');const rec=raw.filter(a=>a.verb==='recruitNpc');
 ok(rec.length>=2&&raw.some(a=>a.sceneKey==='take'),'준비: 장면 행동에 끌어들이기 '+rec.length+'개(대상마다)와 발견한 폭약 가져가기가 있음 — '+raw.map(a=>a.label).join(' / '));
 const v=C.view(s,m.id),scr=NS.read(v),b=winOf(scr,/^인물·현장/);ok(!!b&&b.win?.kind==='group','큰 행동에 인물·현장 묶음 창');
 const kinds=b?.win?.kinds||[];const names2=kinds.map(k=>k.name);
 ok(names2.includes('발견한 폭약 가져가기'),'인물·현장 창에 [발견한 폭약 가져가기]가 보임: '+names2.join(' / '));
 ok(names2.filter(n=>n==='끌어들이기').length===1&&!names2.some(n=>/ 끌어들이기$/.test(n)),'끌어들이기는 한 번만, 대상 이름이 붙은 끌어들이기 종류는 없음');
 const K=kinds.find(k=>k.name==='끌어들이기'),nf=K?.fields?.find(f=>f.key==='npc');
 ok(!!nf&&nf.options.some(o=>o.name===bk.name)&&nf.options.some(o=>o.name===other.name),'끌어들이기를 고르면 "누구에게" 칸에 '+bk.name+'·'+other.name+': '+(nf?.options||[]).map(o=>o.name).join(', '));
 // AI 화면 글도 같게
 const w=scr.text.slice(scr.text.indexOf('■ 창 · ['+b.name+']'));const w1=w.slice(0,(w.indexOf('\n■ ',3)+1||w.length+1)-1);
 ok(/- 발견한 폭약 가져가기/.test(w1)&&(w1.match(/- 끌어들이기/g)||[]).length===1,'AI 화면 글: 종류 목록에 발견한 폭약 가져가기, 끌어들이기 한 줄');
 ok(/「끌어들이기」를 고르면:/.test(w1)||w1.indexOf('누구에게 합니까?')>=0,'AI 화면 글: 끌어들이기 다음에 고를 대상 칸');
 ok(w1.includes(bk.name+' 끌어들이기')&&w1.includes(other.name+' 끌어들이기'),'AI 화면 글: 대상을 고르면 사람 화면에 나오는 행동 글이 대상마다');
 // 누르기: 끌어들이기 → 두 번째 NPC
 const r=NS.press(v,scr,{'버튼':b.name,'고른 것':['끌어들이기',other.name]});
 ok(r.req?.action?.verb==='recruitNpc'&&r.req.action.npc===other.id&&r.req.slot==='big'&&!r.req.action._kind,'누르기: 인물·현장 → 끌어들이기 → '+other.name+' 이면 그 NPC에게 감('+JSON.stringify(r.req?.action?.npc||r.error)+')');
 const r2=NS.press(v,scr,{'버튼':b.name,'고른 것':['끌어들이기',bk.name]});ok(r2.req?.action?.npc===bk.id,'누르기: 끌어들이기 → '+bk.name);
 const r3=NS.press(v,scr,{'버튼':b.name,'고른 것':['발견한 폭약 가져가기']});ok(r3.req?.action?.sceneKey==='take','누르기: 발견한 폭약 가져가기');
 // 협박(쪽지·겁주기·협박하기) 쪽도 대상 이름이 붙은 종류가 없음
 ok(!names2.some(n=>/에게 협박 쪽지 전달$| 협박하기$/.test(n)),'협박 행동도 대상 이름이 붙은 종류로 나뉘지 않음');}
// 해먼드와 도일이 있는 회관: 협박 쪽지(또는 협박하기)는 한 종류, 대상 칸에 둘
{const s=game(),m=s.players.find(o=>o.team==='mafia');m.location='hall';const v=C.view(s,m.id),scr=NS.read(v),b=winOf(scr,/^인물·현장/);const kinds=b?.win?.kinds||[];
 const th=kinds.filter(k=>/협박하기|협박 쪽지/.test(k.name)||k.kind==='scene:threatNpc');const K=kinds.find(k=>k.kind==='scene:threatNpc');const nf=K?.fields?.find(f=>f.key==='npc');
 ok(!!K&&K.name==='협박하기'&&nf?.options?.length>=2,'회관: 협박하기 한 종류, 대상 칸 '+(nf?.options||[]).map(o=>o.name).join(', ')+' (종류: '+kinds.map(k=>k.name).join(' / ')+')');
 const t2=nf?.options?.[1];if(t2){const r=NS.press(v,scr,{'버튼':b.name,'고른 것':['협박하기',t2.name]});ok(r.req?.action?.verb==='threatNpc'&&r.req.action.npc===t2.value,'누르기: 협박하기 → '+t2.name);}
 ok(kinds.length>3||kinds.length===new Set(kinds.map(k=>k.name)).size,'인물·현장 종류는 셋으로 자르지 않음('+kinds.length+'가지), 이름이 겹치지 않음');}
// 숨는 행동이 없음: 인물·현장에 들어갈 장면 행동의 글이 모두 어느 종류의 고를 것 안에 있음(셋까지 자르던 것을 없앰)
for(const [where,mk] of [['술집',()=>setup()],['회관',()=>{const s=game(),m=s.players.find(o=>o.team==='mafia');m.location='hall';return {s,m};}]]){const {s,m}=mk();const v=C.view(s,m.id),scr=NS.read(v),b=winOf(scr,/^인물·현장/);
 const shown=new Set((b?.win?.kinds||[]).flatMap(k=>(k.opts||[]).map(o=>o.label)));const want=S.choices(s,m,'big').filter(a=>a.type==='scene'&&a.verb!=='attackNpc'&&!['inspectArtifact','searchHouse'].includes(a.verb)&&!String(a.sceneKey||'').startsWith('search:')).map(a=>a.label);
 const miss=want.filter(l=>!shown.has(l));ok(want.length>3&&!miss.length,where+': 장면 행동 '+want.length+'개가 모두 창 안에 있음'+(miss.length?' — 빠진 것: '+miss.join(' / '):''));}
try{fs.unlinkSync(tmp);}catch{}
