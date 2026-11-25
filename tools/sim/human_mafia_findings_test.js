// 2026-11-25 사람 자리 마피아 판(분신)에서 찾은 것:
// ① 남의 집 앞을 지키던 사람이 습격을 대신 막으면 글·수첩·사건이 집주인 기준이었다("내 집에 쳐들어왔다", "하준의 집에 쳐들어갔습니다", "깨어 있었음").
// ② 사람들 앞에서 공격해 제압당한 글에 주어가 없어 이야기로 다시 쓸 때 피해자에게 붙었다.
// ③ 죽은 사람의 대화 칸이 "플레이어끼리 자유롭게 이야기합니다."이고 [행동하기]를 고를 수 있었다.
// ④ 행동 창 아래 버튼 줄이 창 밖으로 밀려 스크롤해야 보였다.
// 누가 무엇을 아는지는 그대로다(집주인은 여전히 모름 — 결정 목록 L1). 사용: node human_mafia_findings_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]||'.'),dir=path.join(root,'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=9101;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true}));const s=C.create(seats,rng);S.start(s);S.afterGathering?.(s);return s;};
const toNight=s=>{s.day=1;s.turn=1;C.nextTurn(s);S.nextChapter(s);s.stage='plan';};
const to=(s,n0,p)=>s.feed.slice(n0).filter(e=>e.to.includes(p.id)).map(e=>e.text).join(' / ');
// ① A가 B의 집 앞을 지키는 밤에 마피아가 B의 집을 습격 → A가 문 앞에서 맞섬
{let good=0,n=40,first=null;for(let i=0;i<n;i++){const s=fresh();toNight(s);const m=s.players.find(p=>p.team==='mafia'),[A,B]=s.players.filter(p=>p.team==='town');
  s.plans={[A.id]:{type:'guardHouse',target:B.id},[m.id]:{type:'attack',target:B.id,weapon:'knife',nightRaid:true,flee:'stay'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};
  const n0=s.feed.length,e0=s.events.length;C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);const fm=to(s,n0,m),fa=to(s,n0,A),fb=to(s,n0,B),ev=s.events.slice(e0).filter(e=>e.type==='attack').map(e=>e.text||'').join(' / ');
  const c={attacker:new RegExp(A.name+'[이가] '+B.name+'의 집 앞을 지키고 있었음').test(fm)&&!/깨어 있었음/.test(fm),
   guardText:new RegExp(B.name+'의 집 앞을 지키다 .+ 맞닥뜨림').test(fa)&&!/문을 밀고 들어옴/.test(fa),
   guardNote:A.known.some(k=>new RegExp('밤에 '+B.name+'의 집 앞을 지키다 .+ 맞붙었다').test(k.text))&&!A.known.some(k=>/내 집에 쳐들어왔다/.test(k.text)),
   event:new RegExp(B.name+'의 집에 쳐들어갔습니다').test(ev)&&!new RegExp(A.name+'의 집에 쳐들어갔습니다').test(ev),
   ownerQuiet:!/문을 밀고 들어옴|집에 들어옴|잠결에|맞닥뜨림/.test(fb)&&!B.known.some(k=>/쳐들어|맞붙었다/.test(k.text))};
  if(Object.values(c).every(Boolean))good++;else if(!first)first={c,fm:fm.slice(0,220),fa:fa.slice(0,220),ev:ev.slice(0,160)};}
 ok(good===n,'남의 집 앞 지킴이가 맞서면 습격자 "A가 B의 집 앞을 지키고 있었음", 지킴이 "B의 집 앞을 지키다 …와 맞닥뜨림", 수첩·사건은 B의 집 기준, 집주인 B는 여전히 모름 ('+good+'/'+n+')'+(first?' · 첫 실패 '+JSON.stringify(first):''));}
// 대조: 내 집에서 불침번을 서다 맞서면 예전 글 그대로
{let good=0,n=20;for(let i=0;i<n;i++){const s=fresh();toNight(s);const m=s.players.find(p=>p.team==='mafia'),[V]=s.players.filter(p=>p.team==='town');
  s.plans={[V.id]:{type:'watch'},[m.id]:{type:'attack',target:V.id,weapon:'knife',nightRaid:true,flee:'stay'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]=p.team==='mafia'?{type:'wait'}:{type:'sleep'};
  const n0=s.feed.length;C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);if(new RegExp(V.name+'[이가] 깨어 있었음').test(to(s,n0,m))&&/문을 밀고 들어옴/.test(to(s,n0,V))&&V.known.some(k=>/내 집에 쳐들어왔다/.test(k.text)))good++;}
 ok(good===n,'대조: 내 집 불침번은 "깨어 있었음"·"문을 밀고 들어옴"·"내 집에 쳐들어왔다" 그대로 ('+good+'/'+n+')');}
// ②
{const w=fs.readFileSync(path.join(dir,'00World.js'),'utf8');ok(w.includes("narrate(s,p.id,'당신은 사람들에게 제압당했습니다.")&&!w.includes("narrate(s,p.id,'사람들에게 제압당했습니다."),'제압당한 사람 글에 주어 "당신은"');ok(w.includes("'당신은 상대에게 제지당했습니다.")&&!w.includes("narrate(s,t.id,'상대에게 제지당했습니다."),'제지당한 사람 글에 주어 "당신은"');}
// ③
{const u=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok((u.match(/사망자끼리만 이야기합니다\. 살아 있는 사람에게는 들리지 않습니다\./g)||[]).length===2,'죽은 사람 대화 칸 안내(처음 그릴 때·다시 맞출 때)');ok(u.includes("ao.disabled=deadTalk;ao.hidden=deadTalk;")&&u.includes("${me.hp<=0&&!me.downed?'disabled hidden':''}>행동하기</option>"),'죽은 사람은 [행동하기]를 고를 수 없음');ok(u.includes("if(deadTalk&&this.chatMode!=='say')this.chatMode='say';"),'죽으면 말하기로 돌아감');}
// ④
{const css=fs.readFileSync(path.join(root,'game','games','noir-trpg','assets','trpg.css'),'utf8');ok(/\.overlay>div \.picker-footer\{position:sticky;bottom:0/.test(css)&&/\.overlay>div\{max-height:min\(88vh,calc\(100dvh - 32px\)\)\}/.test(css),'행동 창 버튼 줄은 창 아래에 붙음(sticky), 창은 화면 높이에 맞춰 스크롤');}
