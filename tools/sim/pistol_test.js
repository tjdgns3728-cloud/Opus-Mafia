// 2026-11-25 사용자 "권총은 데미지를 다른 사람이 쏘더라도 최대 데미지가 10이여야하고 대행자가 쏘더라도 체력이 최소 9이여서
// 맞으면 무조건 출혈이 나고 최소 데미지더라도 출혈을 막지 않으면 죽어가는 중으로 만들죠" 확인. 사용: node pistol_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=71;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.hidden=false;p.used={big:false,small:false};}return s;};
// 1. 누가 쏘든 맞으면 9~10, 일부 피해도 줄지 않음, 완전히 피하면 0
{const s=fresh();const shooters=[s.players.find(p=>p.role==='mafioso'),s.players.find(p=>p.team==='town')];const t=s.players.find(p=>!shooters.includes(p));const seen={};
 for(const sh of shooters){seen[sh.role]={hit:new Set(),partial:new Set(),miss:new Set()};for(let i=0;i<300;i++){const r=C.attackRoll(s,sh,t,{weapon:'pistol'},rng),d=r.attack-r.defense,k=d<0?'miss':d<=2?'partial':'hit';seen[sh.role][k].add(r.damage);}}
 for(const [role,v] of Object.entries(seen)){const hits=[...v.hit,...v.partial];ok(hits.length&&hits.every(x=>x===9||x===10),C.pp(C.roles[role].name,'이','가')+' 쏘면 맞을 때 피해 9~10 ('+[...new Set(hits)].sort().join(',')+')');ok(v.partial.size===0||[...v.partial].every(x=>x>=9),C.roles[role].name+': 일부 피해도 줄지 않음');ok([...v.miss].every(x=>x===0),C.roles[role].name+': 완전히 피하면 빗나감');}}
// 2. 맞으면 늘 출혈, 9를 맞으면 체력 1 → 막지 않으면 다음 턴 쓰러짐(죽어가는 중)
{let done=false;for(let i=0;i<200&&!done;i++){const s=fresh();const a=s.players.find(p=>p.team==='town'),t=s.players.find(p=>p.team==='town'&&p.id!==a.id);a.items.pistol=1;a.items.ammo=3;t.hp=10;
 s.plans={[a.id]:{type:'attack',target:t.id,weapon:'pistol'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};s.reactions[t.id]='dodge';C.announceClashes?.(s);s.stage='plan';C.resolveBig(s,rng);
 if(t.hp===1){done=true;ok(t.bleeding,'9를 맞아 체력 1: 출혈');s.epoch++;C.tickBleed(s);ok(t.hp===0&&!!t.downed,'출혈을 막지 않으면 다음 턴 쓰러짐(죽어가는 중)');}
 else if(t.hp===0&&i>150){}}
 ok(done,'9를 맞는 경우가 나옴');}
// 3. 화면 글
{const fs=require('fs');const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(ui.includes("pistol:'피해 9~10 맞으면 출혈'")&&!ui.includes('최소5 피해'),'화면 글: 권총 피해 9~10, 맞으면 출혈');}
