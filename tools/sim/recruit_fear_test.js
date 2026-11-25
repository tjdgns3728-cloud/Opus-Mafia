// 끌어들이기·행동 협박·공포·얼굴 가리기(2026-11-19 사용자 결정). 사용: node recruit_fear_test.js <저장소 경로>
// 이야기로 흔들려야 넘어옴, 처음 이긴 판정은 "생각해 보겠소", 거절하면 고발(공포가 클수록 덜, 얼굴을 가렸으면 말만 퍼짐), 돈 끌어들이기 없음,
// 행동으로 하는 협박(보이지 않는 압박과 공포, 지위가 높으면 덜, 암거래 상인은 뺌), 공포가 크면 폭약을 꺼내도 NPC가 눈을 돌림, 누구나 하는 얼굴 가리기.
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,M=globalThis.NoirMinds;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=11;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const hi=()=>0.99,lo=()=>0.01;
const fresh=()=>{const s=C.create(['사람','도현','서아','시온','하준','나린','이안','수현'].map((n,i)=>({id:'p'+i,name:n,bot:i>0})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';s.scenario.discovered=true;for(const p of s.players){p.location='hall';p.used={big:false,small:false};}return s;};
const roles=s=>({gf:s.players.find(p=>p.role==='godfather'),town:s.players.filter(p=>p.team==='town')});
const got=(s,p,re)=>s.feed.some(e=>e.to?.includes(p.id)&&re.test(String(e.text)));
const big=(s,p)=>S.choices(s,p,'big'),find=(s,p,verb,npc)=>big(s,p).find(a=>a.verb===verb&&a.npc===npc);

// 1. 얼굴 가리기(변장): 누구나, 모르는 사람에게는 "변장한 사람 n"(먼저 변장한 차례로 번호), 벗을 때까지 이어짐. 자세한 것은 disguise_test.js
const veil=(s,p)=>{s.aliases??={};s.aliases[p.id]=(s.aliasSeq=(s.aliasSeq||0)+1);p.faceCover=true;};/* 아무도 보지 않는 데서 변장한 것과 같음 */
{const s=fresh(),{gf,town}=roles(s),t=town[0],o=town[1];
 ok(C.choices(s,t.id,'small').some(a=>a.type==='cover')&&C.choices(s,gf.id,'small').some(a=>a.type==='cover'),'시민도 마피아도 작은 행동으로 얼굴을 가릴 수 있음');
 ok(C.validate(s,t.id,{type:'cover'},'small')===null,'얼굴 가리기는 검사를 통과');
 veil(s,t);ok(C.nameFor(s,o,t)==='변장한 사람 1'&&C.idFor(s,o,t)==='v1','다른 사람에게는 "변장한 사람 1"(번호로 따로 된 사람)');
 ok(C.nameFor(s,t,t)===t.name,'자기 자신에게는 자기 이름');
 veil(s,gf);const mates=s.players.filter(p=>p.team==='mafia'&&p.id!==gf.id);ok(mates.every(m=>C.nameFor(s,m,gf)===gf.name)&&C.nameFor(s,o,gf)==='변장한 사람 2','마피아끼리는 알아봄, 시민에게는 두 번째로 변장한 사람이라 변장한 사람 2');
 ok(!C.choices(s,t.id,'small').some(a=>a.type==='cover')&&C.choices(s,t.id,'small').some(a=>a.type==='uncover'),'이미 변장했으면 다시 고르지 않고, 벗기를 고를 수 있음');
 s.epoch++;ok(C.nameFor(s,o,t)==='변장한 사람 1','다음 턴에도 변장은 이어짐');
 ok(/변장한 사람 2가 /.test(C.korean(s,'변장한 사람 2이 왔다'))&&/변장한 사람 1이 /.test(C.korean(s,'변장한 사람 1가 왔다')),'조사는 번호를 읽는 소리에 맞춤(2가, 1이)');}

// 2. 돈 끌어들이기 없음. 아무것도 하지 않았을 때 난이도 20(설득 10인 대부가 주사위 10 = 10%), 해먼드는 22. 거절당하면 맨얼굴이면 공포 0에서 고발
// 2026-11-19 사용자 "그러니깐 아무것도 안했을 때 확률은 10%정도이고 뭔가 겁을 먹게하거나 이야기 전개 방식이 마피아를 따를 수 밖에 없으면 난이도를 낮추는 식으로 해달라는 의미였어요"
const mid=v=>()=>v;/* 주사위 = 1+floor(v*10) */const rollOf=(s,p,label)=>s.feed.filter(e=>e.to?.includes(p.id)&&e.roll?.label===label).at(-1)?.roll;
{const s=fresh(),{gf}=roles(s);s.scenario.mineClosed=false;gf.location='tavern';const n=s.scenario.continuation.npcs.barkeep;n.location='tavern';
 ok(!big(s,gf).some(a=>a.verb==='recruitNpcPaid'),'돈을 쥐여 주며 끌어들이기는 없음');
 S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),mid(0.85));const r1=rollOf(s,gf,'술집 주인 끌어들이기');
 ok(r1&&r1.difficulty===10&&!n.recruited&&n.refusals===1&&got(s,gf,/흔들릴 까닭이 없어 보입니다/),'아무것도 하지 않았으면 난이도 10(설득은 더하지 않음): 주사위 9면 거절(판정은 함)');
 const c=s.cases.find(c=>c.target===gf.id&&c.by==='barkeep');ok(!!c&&c.npcKind==='recruit'&&c.caught,'맨얼굴로 권했다 거절당하면 공포 0인 술집 주인이 고발');
 const s2=fresh(),g2=roles(s2).gf;s2.scenario.mineClosed=false;g2.location='tavern';const n2=s2.scenario.continuation.npcs.barkeep;n2.location='tavern';S.resolve(s2,g2,find(s2,g2,'recruitNpc','barkeep'),hi);
 ok(n2.recruited,'아무것도 하지 않았어도 주사위 10이면 넘어옴(10%)');
 const s4=fresh(),maf=s4.players.find(p=>p.role==='mafioso');if(maf){maf.location='tavern';const n4=s4.scenario.continuation.npcs.barkeep;n4.location='tavern';s4.scenario.mineClosed=false;const a4=S.choices(s4,maf,'big').find(a=>a.verb==='recruitNpc'&&a.npc==='barkeep');if(a4){S.resolve(s4,maf,a4,hi);ok(n4.recruited&&rollOf(s4,maf,'술집 주인 끌어들이기')?.stat===0,'설득이 4인 대행자도 대부와 같은 확률(설득을 더하지 않음, 주사위 10이면 넘어옴)');}else ok(false,'대행자 끌어들이기 선택지 없음');}
 const s3=fresh(),g3=roles(s3).gf;g3.location='hall';const m3=s3.scenario.continuation.npcs.mayor;m3.location='hall';const a3=find(s3,g3,'recruitNpc','mayor');if(a3){S.resolve(s3,g3,a3,hi);ok(rollOf(s3,g3,'해먼드 끌어들이기')?.difficulty===12&&!m3.recruited,'지위가 높은 해먼드는 난이도 12: 아무것도 하지 않으면 주사위 10이어도 넘어오지 않음');}else ok(false,'해먼드 끌어들이기 선택지 없음');}

// 3. 얼굴을 가리고 권했다 거절당하면 고발 없이 말만 퍼진다
{const s=fresh(),{gf,town}=roles(s);s.scenario.mineClosed=false;gf.location='tavern';veil(s,gf);const n=s.scenario.continuation.npcs.barkeep;n.location='tavern';
 S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),hi);
 ok(!s.cases.some(c=>c.target===gf.id),'얼굴을 가렸으면 고발하지 않음');
 ok(town.every(t=>t.known.some(k=>/변장한 사람 1이 나더러 마피아 편에 서라고 했소/.test(k.text)&&k.about==='v1')),'"변장한 사람 1이 권했다"는 말이 그 번호의 일로 퍼짐(누군지는 모름)');}

// 4. 이야기가 마피아를 따를 수밖에 없게 흘렀으면(흔들린 까닭) +4: 주사위 6 이상(50%). 판정은 한 번, 성공하면 바로 넘어옴
{const s=fresh(),{gf}=roles(s);s.scenario.mineClosed=true;gf.location='tavern';const n=s.scenario.continuation.npcs.barkeep;n.location='tavern';
 S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),mid(0.45));ok(!n.recruited,'흔들린 술집 주인: 주사위 5면 거절');
 const roll=rollOf(s,gf,'술집 주인 끌어들이기');ok(roll&&roll.terms.some(t=>t.label==='광부들이 외상을 갚지 못함'&&t.value===4)&&!roll.terms.some(t=>/공포|압박/.test(t.label)),'판정에는 이야기의 까닭(+4)만 보이고 공포·압박은 보이지 않음');
 const s2=fresh(),g2=roles(s2).gf;s2.scenario.mineClosed=true;g2.location='tavern';const n2=s2.scenario.continuation.npcs.barkeep;n2.location='tavern';
 S.resolve(s2,g2,find(s2,g2,'recruitNpc','barkeep'),mid(0.55));ok(n2.recruited,'흔들린 술집 주인: 주사위 6이면 첫 판정에 바로 넘어옴');
 // 겁(공포)과 행동 협박도 보이지 않게 난이도를 낮춤
 const s3=fresh(),g3=roles(s3).gf;s3.scenario.mineClosed=false;g3.location='tavern';const n3=s3.scenario.continuation.npcs.barkeep;n3.location='tavern';n3.fear=6;n3.pressure=3;
 S.resolve(s3,g3,find(s3,g3,'recruitNpc','barkeep'),mid(0.85));ok(rollOf(s3,g3,'술집 주인 끌어들이기')?.difficulty===10-3-3,'행동 협박(압박 3)과 공포 6이면 난이도 10 → 4');}

// 4-1. 넘어올 때의 말은 흔들린 까닭(행동 협박 → 이야기 → 겁)에 따라 다르고, 돈을 받는 말은 없다(2026-11-19 사용자 "어떻게 행동 했냐에 따라 협박하는 대사랑 협박당하는 사람의 대사가 달라질 것입니다")
{const lines=[];for(const how of ['pressure','shaken','fear']){const s=fresh(),{gf}=roles(s);gf.location='home';const n=s.scenario.continuation.npcs.landlady;n.location='home';gf.houseId=null;
  s.scenario.mineClosed=how==='shaken';if(how==='pressure')n.pressure=3;if(how==='fear')n.fear=6;
  const a=find(s,gf,'recruitNpc','landlady');if(!a){ok(false,'하숙집 주인 끌어들이기 선택지 없음('+how+')');continue;}
  S.resolve(s,gf,a,hi);
  const said=s.feed.filter(e=>e.to?.includes(gf.id)).map(e=>String(e.text)).join(' ');lines.push(said);
  ok(n.recruited&&/낮은 목소리로 말합니다/.test(said),'하숙집 주인: '+how+'로 흔들렸을 때 마피아의 말과 함께 넘어옴');}
 ok(/창문은 갈면 그만이지/.test(lines[0])&&/하숙비 낼 광부도 없겠군/.test(lines[1])&&/문단속만으로 되겠소/.test(lines[2]),'까닭마다 마피아의 말이 다름(창문 협박 / 갱도가 닫힘 / 겁)');
 ok(new Set(lines.map(t=>(t.match(/\.\.\.|…[^"]*"/g)||[]).join())).size===3,'까닭마다 NPC의 대답이 다름');
 ok(!lines.some(t=>/하숙비만 채워 준다면|외상만 지워|임금만 나온다면|들여 준다면|배가 고프오/.test(t)),'돈을 받는 말이 없음');}

// 4-2. 규칙 봇 마피아는 흔들릴 까닭이 있는 NPC에게만 권한다(같은 날 규칙을 바꾸고 규칙 봇을 맞추지 않았던 것을 고침)
{const pick=(prep)=>{for(let e=0;e<6;e++){const s=fresh(),{gf}=roles(s);gf.stats.persuade=9;gf.location='tavern';const n=s.scenario.continuation.npcs.barkeep;n.location='tavern';s.epoch=e;prep(s,n);const a=S.botAction(s,gf,'big');if(a&&a.verb==='recruitNpc')return a;}return null;};
 ok(!pick((s,n)=>{s.scenario.mineClosed=false;}),'흔들릴 까닭이 없으면 규칙 봇이 권하지 않음');
 ok(!!pick((s,n)=>{s.scenario.mineClosed=true;}),'갱도가 닫혀 흔들린 술집 주인에게는 규칙 봇이 권함');}

// 5. 행동 협박: 일터에서만, 하루에 한 번, 압박(지위가 높으면 덜)과 공포가 쌓이고 보이지 않음, 암거래 상인은 없음
{const s=fresh(),{gf,town}=roles(s);gf.location='tavern';const st=s.scenario.continuation,n=st.npcs.barkeep;n.location='hall';
 const a=find(s,gf,'pressureNpc','barkeep');ok(!!a&&/술통/.test(a.label),'술집에서 "뒷마당 술통 깨뜨리기"를 고를 수 있음(술집 주인이 없어도)');
 ok(!town.some(t=>{t.location='tavern';return find(s,t,'pressureNpc','barkeep');}),'시민은 고를 수 없음');for(const t of town)t.location='hall';
 const f0=S.fearOf(s,n);S.resolve(s,gf,a,hi);ok(n.pressure===3&&S.fearOf(s,n)===f0+2,'압박 3, 공포 +2');
 ok(!find(s,gf,'pressureNpc','barkeep'),'같은 날에는 다시 고를 수 없음');
 ok(town.some(t=>s.feed.some(e=>e.to?.includes(t.id)&&/술통이 누군가에게 깨졌습니다/.test(String(e.text)))),'술집 주인이 없을 때는 누가 했는지 모른 채 마을에 알려짐');
 const v=JSON.stringify(C.view(s,gf.id))+JSON.stringify(C.view(s,town[0].id));ok(!/"pressure"|"fear"|"refusals"|"wavering"/.test(v),'압박·공포·거절·망설임 값은 화면 자료에 실리지 않음');
 gf.location='hall';const m=st.npcs.mayor;m.location='tavern';S.resolve(s,gf,find(s,gf,'pressureNpc','mayor'),hi);ok(m.pressure===1,'해먼드(지위가 높음)는 같은 일에 압박이 1만 쌓임');
 gf.location='rail';ok(!big(s,gf).some(a=>a.verb==='pressureNpc'&&a.npc==='merchant'),'암거래 상인은 협박하지 않음');
 gf.location='clinic';const stock=st.stock;S.resolve(s,gf,find(s,gf,'pressureNpc','nurse'),hi);ok(st.stock===Math.max(0,stock-2),'진료소 붕대 창고를 망가뜨리면 붕대가 둘 줄어듦');}

// 6. 행동 협박을 그 NPC가 보면: 공포만큼 덜한 확률로 고발, 겁에 질리면 입을 다묾
{const s=fresh(),{gf}=roles(s);gf.location='tavern';const n=s.scenario.continuation.npcs.barkeep;n.location='tavern';
 S.resolve(s,gf,find(s,gf,'pressureNpc','barkeep'),lo);ok(s.cases.some(c=>c.target===gf.id&&c.npcKind==='pressure'),'보는 앞에서 맨얼굴로 하면(주사위가 낮으면) 고발');}
{const s=fresh(),{gf}=roles(s);gf.location='tavern';const n=s.scenario.continuation.npcs.barkeep;n.location='tavern';
 S.resolve(s,gf,find(s,gf,'pressureNpc','barkeep'),hi);ok(!s.cases.some(c=>c.target===gf.id)&&got(s,gf,/겁에 질린 얼굴로 입을 다뭅니다/),'공포가 쌓여 있으면(주사위가 높으면) 입을 다묾');}

// 7. 공포: 숨진 사람(재판 처형 빼고), 그 자리의 공격, 협박이 쌓이면 폭약을 꺼내도 NPC가 눈을 돌림
{const s=fresh(),n=s.scenario.continuation.npcs.mayor;const f0=S.fearOf(s,n);
 const v=s.players.find(p=>p.team==='town'&&p.bot);v.hp=0;v.deathCause='공격';ok(S.fearOf(s,n)===f0+1,'사람이 숨지면 공포 +1');
 const w=s.players.filter(p=>p.team==='town'&&p.bot)[1];w.hp=0;w.deathCause='재판 처형';ok(S.fearOf(s,n)===f0+1,'재판 처형은 공포를 올리지 않음');
 s.events.push({type:'attack',location:n.location});ok(S.fearOf(s,n)===f0+2,'그 NPC가 있는 곳의 공격 +1');
 n.fear=20;ok(S.fearOf(s,n)===10&&S.accuseChance(s,n)===0,'공포는 10까지, 그때 고발 확률 0');}

// 7-1. 폭약 목격: 공포가 크면 눈을 돌리고, 얼굴을 가렸으면 이름 없이 소리치며, 붙잡히면 얼굴이 드러난다
function settle(s,r){/* 2026-11-25: 폭약을 꺼내다 들킨 사람은 이번 때가 끝날 때 고른다. 고르지 않으면 그대로 가져감 */if(s.scenario.confronts?.some(c=>!c.done)){s.stage='hazard';S.resolveHazard(s,r);}}
const PLACE={chapel:'chapel',cart:'warehouse','spot:barrel':'tavern','spot:medbox':'clinic'};
const atBomb=s=>{s.scenario.continuation&&(s.scenario.continuation.discoveredBy=s.scenario.continuation.discoveredBy||{});const b=s.scenario.bombs.find(b=>PLACE[b.where]);const maf=s.players.find(p=>p.team==='mafia');maf.location=PLACE[b.where];const q=s.scenario;for(const n of [q.doyle,...Object.values(q.continuation?.npcs||{})].filter(Boolean))n.location='office';q.doyle.location=maf.location;q.doyle.cowed=false;q.doyle.hp=10;return {maf,q};};
{const s=fresh(),{maf,q}=atBomb(s);q.doyle.fear=10;const take=S.choices(s,maf,'big').find(a=>a.sceneKey==='take');S.resolve(s,maf,take,rng);settle(s,rng);
 ok(take&&!s.cases.some(c=>c.target===maf.id)&&got(s,maf,/겁에 질린 얼굴로 눈을 돌립니다/),'공포가 10이면 도일이 폭약을 꺼내는 것을 보고도 눈을 돌림');}
{const s=fresh(),{maf}=atBomb(s);const take=S.choices(s,maf,'big').find(a=>a.sceneKey==='take');S.resolve(s,maf,take,rng);settle(s,rng);
 const c=s.cases.find(c=>c.target===maf.id&&c.caughtKind==='npc');ok(c&&c.npcKind==='dynamite','공포 0이면 지금처럼 고발(npcKind dynamite)');}
for(const flee of [true,false]){const s=fresh(),{maf}=atBomb(s);veil(s,maf);const take=S.choices(s,maf,'big').find(a=>a.sceneKey==='take');S.resolve(s,maf,take,flee?hi:lo);settle(s,flee?hi:lo);
 const town=s.players.filter(p=>p.team==='town');const named=s.cases.some(c=>c.target===maf.id);
 ok(town.every(t=>t.known.some(k=>/변장한 사람 1이 .*폭약을 꺼냈소/.test(k.text)&&k.about==='v1'))&&(flee?!named:named)&&(flee?!!maf.faceCover:!maf.faceCover),flee?'변장하고 달아나면 "변장한 사람 1"이 했다는 말만 퍼지고 고발 없음':'변장했어도 붙잡히면 가리개가 벗겨지고 고발됨');}

// 8. 규칙 판단: 끌어들이기·협박 고발은 폭약 고발과 다른 까닭으로 센다
{const s=fresh(),{gf}=roles(s);s.scenario.mineClosed=false;gf.location='tavern';s.scenario.continuation.npcs.barkeep.location='tavern';S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),mid(0.5));
 const c=s.cases.find(c=>c.target===gf.id);const t=s.players.find(p=>p.team==='town'&&p.bot),m=M.suspicion(s,t,gf.id);
 ok(!!c&&m.why.some(w=>w==='NPC가 직접 들은 끌어들이기 권유')&&!m.why.some(w=>/폭약 고발/.test(w)),'규칙 판단은 폭약 고발이 아니라 "NPC가 직접 들은 끌어들이기 권유"로 셈: '+m.why.join(' / '));}
