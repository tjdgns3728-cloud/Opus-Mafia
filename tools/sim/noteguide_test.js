// 공격을 직접 본 사람에게만 "수첩에 목격 기록으로 남았고 재판 근거로 고를 수 있다"는 안내가 붙는지 확인(2026-11-18 사용자 요청). 사용: node noteguide_test.js <저장소 경로>
const path=require('path'),fs=require('fs');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const GUIDE='방금 본 장면이 수첩에 목격 기록으로 남았습니다. 재판을 신청할 때 근거로 고를 수 있습니다.';
// 회관에 넷을 모아 두고 한 사람이 다른 사람을 공격한다. hp: 맞는 사람의 체력, hidden: 숨은 자리에서 권총을 쏴 아무도 쏜 사람을 못 보게(단검은 휘두르는 순간 드러난다)
function fight(seed0,{hp=10,hidden=false}={}){let seed=seed0;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const s=C.create(Array.from({length:4},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희'][i],bot:true})),rng);S.start(s);S.afterGathering?.(s);
 s.day=2;s.turn=0;s.stage='plan';for(const q of s.players){q.used={big:false,small:false};q.location='hall';q.hidden=false;}
 const [a,t,w,x]=s.players;a.items.knife=1;t.hp=hp;if(hidden){a.items.pistol=1;a.items.ammo=2;a.hidden=true;a.stealth=99;}
 const from=s.serial;const err=C.queue(s,a.id,{type:'attack',target:t.id,weapon:hidden?'pistol':'knife'});s.reactions[t.id]='dodge';C.resolveBig(s,rng);
 const entry=p=>s.feed.find(e=>e.i>from&&e.kind==='combat'&&e.to.includes(p.id));
 const record=p=>p.known.some(k=>k.source==='직접 목격'&&s.events.some(e=>e.id===k.event&&e.type==='attack'&&e.actor===a.id));
 return {err,a,t,w,x,entry,record};}
// 1. 보는 앞에서 공격: 본 사람은 기록과 안내를 함께 받고, 공격한 사람은 안내를 받지 않는다
{const r=fight(7);ok(!r.err,'공격이 접수됨');
 ok(r.record(r.w)&&r.entry(r.w)?.noteGuide===true,'공격을 본 다온: 수첩에 직접 목격 기록이 생기고 전투 글에 안내가 붙음');
 ok(r.record(r.x)&&r.entry(r.x)?.noteGuide===true,'공격을 본 라희도 같음');
 ok(r.entry(r.a)&&!r.entry(r.a).noteGuide,'공격한 가람의 전투 글에는 안내가 없음');
 ok(r.t.hp>0&&r.record(r.t)&&r.entry(r.t)?.noteGuide===true,'맞고도 서 있는 나래(공격한 사람을 봄)에게도 안내가 붙음');}
// 2. 맞은 사람이 쓰러지면 그 사람에게는 안내가 없다
{let r=null;for(let sd=1;sd<60&&!r;sd++){const f=fight(sd,{hp:1});if(f.t.hp===0)r=f;}
 ok(!!r,'체력 1인 나래가 공격에 쓰러지는 판을 찾음');
 if(r){ok(r.entry(r.t)&&!r.entry(r.t).noteGuide,'쓰러진 나래의 전투 글에는 안내가 없음');ok(r.entry(r.w)?.noteGuide===true,'그때도 본 다온에게는 안내가 붙음');}}
// 3. 공격한 사람이 숨어 아무도 못 봤으면, 기록이 생기지 않은 사람에게는 안내가 없다
{const r=fight(7,{hidden:true});const others=[r.t,r.w,r.x];ok(!r.err,'숨은 자리의 권총 공격이 접수됨');
 ok(others.every(p=>!r.record(p)),'숨은 자리의 권총: 아무에게도 쏜 사람의 직접 목격 기록이 생기지 않음');
 ok(others.every(p=>!r.entry(p)?.noteGuide),'숨은 자리의 권총: 아무에게도 안내가 붙지 않음');}
// 4. 화면: 안내는 이야기 글이 다 나온 뒤 보이는 칸(after-story)에, 단어 설명 버튼 없이 그대로 나온다
{const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');
 ok(ui.includes(`<div class="after-story" \${complete?'':'hidden'}>\${e.noteGuide?'<p class="note-guide">${GUIDE}</p>':''}`),'안내 글이 전투 글 아래 칸에 그대로 들어 있음');}
