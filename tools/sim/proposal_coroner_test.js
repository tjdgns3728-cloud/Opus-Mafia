// 제안(사용자 허락 전, proposal/role-coroner): 검시인 — 낮 작은 행동 [시신 검안]. 사용: node proposal_coroner_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=311;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아름','자람','차오','하늘'];
const make=n=>{const s=C.create(names.slice(0,n).map((x,i)=>({id:'p'+i,name:x,bot:true})),rng);S.start(s);return s;};
{let c8=0,c11=0,rep8=0;for(let i=0;i<40;i++){const a=make(8),b=make(11);if(a.players.some(p=>p.role==='coroner'))c8++;if(a.players.some(p=>p.role==='reporter'))rep8++;if(b.players.some(p=>p.role==='coroner'))c11++;}ok(c8===40&&c11===40,'8명·11명 판에 검시인이 늘 있음('+c8+'/'+c11+')');ok(rep8===0,'제안에서 8명 판은 기자 대신 검시인');}
const setup=()=>{const s=make(8);s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location='hall';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}const co=s.players.find(p=>p.role==='coroner'),d=s.players.find(p=>p.team==='town'&&p.id!==co.id),k=s.players.find(p=>p.team==='mafia');return {s,co,d,k};};
{const {s,co}=setup();ok(!C.choices(s,co.id,'small').some(a=>a.type==='autopsy'),'시신이 없으면 [시신 검안] 버튼이 없음');}
const kill=(s,d,k,boots)=>{d.hp=0;d.downed=null;d.deathCause='쓰러진 채 숨을 거둠';d.diedAt={day:2,turn:2};d.marks=[{kind:'cut'}];s.events.push({id:'e9001',type:'attack',actor:k.id,target:d.id,boots,day:2,turn:2,location:'home'});};
{const {s,co,d,k}=setup();kill(s,d,k,'big');const ch=C.choices(s,co.id,'small').filter(a=>a.type==='autopsy');ok(ch.length===1&&ch[0].target===d.id,'시신이 있으면 그 사람 [시신 검안]이 하나');
 const nonCo=s.players.find(p=>p.role!=='coroner'&&p.hp>0);ok(!C.choices(s,nonCo.id,'small').some(a=>a.type==='autopsy'),'검시인이 아니면 버튼 없음');
 s.turn=2;ok(!C.choices(s,co.id,'small').some(a=>a.type==='autopsy'),'밤에는 버튼 없음');s.turn=0;
 const n0=s.feed.length;const err=C.smallAct(s,co.id,{type:'autopsy',target:d.id},()=>0.99);const out=s.feed.slice(n0).map(e=>e.text).join(' / ');
 ok(!err,'검안 요청이 받아들여짐 '+(err||''));ok(/칼에 베인 흔적/.test(out)&&/2일째 밤/.test(out),'상처 종류와 숨진 때: '+out.slice(0,120));ok(/크고 깊은/.test(out)&&/쓰러진 채 숨을 거두었습니다/.test(out),'성공하면 장화 자국과 숨진 까닭');ok(!out.includes(k.name),'공격한 사람의 이름은 안 나옴');ok(!/대부|대행자|조언자|납치범|마피아/.test(out),'직업·편은 안 나옴');
 ok(co.notebook?.some?.(n=>/시신을 검안했습니다/.test(n.text||''))||JSON.stringify(co).includes('시신을 검안했습니다'),'수첩에 남음');
 co.used={big:false,small:false};ok(!C.choices(s,co.id,'small').some(a=>a.type==='autopsy'),'한 번 검안한 시신은 다시 안 나옴');}
{const {s,co,d,k}=setup();kill(s,d,k,'small');const n0=s.feed.length;C.smallAct(s,co.id,{type:'autopsy',target:d.id},()=>0.0);const out=s.feed.slice(n0).map(e=>e.text).join(' / ');ok(/칼에 베인 흔적/.test(out)&&/더 자세한 것은 알아보지 못했습니다/.test(out)&&!/작고 얕은/.test(out),'실패해도 상처·숨진 때는 나오고 장화는 안 나옴');}
{const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(ui.includes("'observe','evidence','investigate','autopsy'")&&ui.includes("autopsy:'시신 검안'"),'화면: 살펴보기 묶음과 버튼 이름');}
