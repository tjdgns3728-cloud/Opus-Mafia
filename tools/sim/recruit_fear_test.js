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

// 1. 얼굴 가리기: 누구나, 같은 편이 아닌 사람에게는 "얼굴을 가린 사람", 누군지는 null
{const s=fresh(),{gf,town}=roles(s),t=town[0],o=town[1];
 ok(C.choices(s,t.id,'small').some(a=>a.type==='cover')&&C.choices(s,gf.id,'small').some(a=>a.type==='cover'),'시민도 마피아도 작은 행동으로 얼굴을 가릴 수 있음');
 ok(C.validate(s,t.id,{type:'cover'},'small')===null,'얼굴 가리기는 검사를 통과');
 t.faceCover=s.epoch;ok(C.nameFor(s,o,t)==='얼굴을 가린 사람'&&C.idFor(s,o,t)===null,'다른 사람에게는 "얼굴을 가린 사람", 누군지 모름(id null)');
 ok(C.nameFor(s,t,t)===t.name,'자기 자신에게는 자기 이름');
 gf.faceCover=s.epoch;const mates=s.players.filter(p=>p.team==='mafia'&&p.id!==gf.id);ok(mates.every(m=>C.nameFor(s,m,gf)===gf.name)&&C.nameFor(s,o,gf)==='얼굴을 가린 사람','마피아끼리는 알아봄, 시민에게는 얼굴을 가린 사람');
 ok(!C.choices(s,t.id,'small').some(a=>a.type==='cover'),'이미 가렸으면 다시 고르지 않음');
 s.epoch++;ok(C.nameFor(s,o,t)===t.name,'다음 턴에는 다시 이름이 보임');
 ok(/얼굴을 가린 사람이 /.test(C.korean(s,'얼굴을 가린 사람가 왔다')),'조사도 "얼굴을 가린 사람이"로 맞춤');}

// 2. 돈 끌어들이기 없음, 흔들리지 않으면 판정 없이 거절, 맨얼굴이면 공포 0에서 고발
{const s=fresh(),{gf}=roles(s);s.scenario.mineClosed=false;gf.location='tavern';const n=s.scenario.continuation.npcs.barkeep;n.location='tavern';
 ok(!big(s,gf).some(a=>a.verb==='recruitNpcPaid'),'돈을 쥐여 주며 끌어들이기는 없음');
 S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),hi);
 ok(!n.recruited&&n.refusals===1&&got(s,gf,/흔들릴 까닭이 없어 보입니다/),'흔들릴 까닭이 없으면 판정 없이 거절');
 const c=s.cases.find(c=>c.target===gf.id&&c.by==='barkeep');ok(!!c&&c.npcKind==='recruit'&&c.caught,'맨얼굴로 권했다 거절당하면 공포 0인 술집 주인이 고발');}

// 3. 얼굴을 가리고 권했다 거절당하면 고발 없이 말만 퍼진다
{const s=fresh(),{gf,town}=roles(s);s.scenario.mineClosed=false;gf.location='tavern';gf.faceCover=s.epoch;const n=s.scenario.continuation.npcs.barkeep;n.location='tavern';
 S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),hi);
 ok(!s.cases.some(c=>c.target===gf.id),'얼굴을 가렸으면 고발하지 않음');
 ok(town.every(t=>t.known.some(k=>/얼굴을 가린 사람이 나더러 마피아 편에 서라고 했소/.test(k.text)&&k.about===null)),'"얼굴을 가린 사람이 권했다"는 말이 누군지 모른 채 퍼짐');}

// 4. 흔들린 NPC: 처음 이긴 판정은 "생각해 보겠소", 다른 때에 다시 이기면 넘어옴
{const s=fresh(),{gf}=roles(s);s.scenario.mineClosed=true;gf.location='tavern';const n=s.scenario.continuation.npcs.barkeep;n.location='tavern';
 S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),hi);ok(!n.recruited&&n.wavering===s.epoch&&got(s,gf,/생각해 보겠소/),'처음 이긴 판정: 생각해 보겠소(넘어오지 않음)');
 S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),hi);ok(!n.recruited,'같은 때에 다시 이겨도 넘어오지 않음');
 S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),lo);ok(!n.recruited&&!s.cases.some(c=>c.target===gf.id)&&got(s,gf,/아직 마음을 정하지 못했소/),'망설이는 중에 판정에 지면 고발 없이 "아직 마음을 정하지 못했소"');
 s.epoch++;S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),hi);ok(n.recruited,'다른 때에 다시 이기면 넘어옴');
 const roll=s.feed.filter(e=>e.to?.includes(gf.id)&&e.roll?.label==='술집 주인 끌어들이기').at(-1)?.roll;ok(roll&&roll.terms.some(t=>t.label==='광부들이 외상을 갚지 못함')&&!roll.terms.some(t=>/공포|압박/.test(t.label)),'판정에는 이야기의 까닭만 보이고 공포·압박은 보이지 않음');}

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
const PLACE={chapel:'chapel',cart:'warehouse','spot:barrel':'tavern','spot:medbox':'clinic'};
const atBomb=s=>{s.scenario.continuation&&(s.scenario.continuation.discoveredBy=s.scenario.continuation.discoveredBy||{});const b=s.scenario.bombs.find(b=>PLACE[b.where]);const maf=s.players.find(p=>p.team==='mafia');maf.location=PLACE[b.where];const q=s.scenario;for(const n of [q.doyle,...Object.values(q.continuation?.npcs||{})].filter(Boolean))n.location='office';q.doyle.location=maf.location;q.doyle.cowed=false;q.doyle.hp=10;return {maf,q};};
{const s=fresh(),{maf,q}=atBomb(s);q.doyle.fear=10;const take=S.choices(s,maf,'big').find(a=>a.sceneKey==='take');S.resolve(s,maf,take,rng);
 ok(take&&!s.cases.some(c=>c.target===maf.id)&&got(s,maf,/겁에 질린 얼굴로 눈을 돌립니다/),'공포가 10이면 도일이 폭약을 꺼내는 것을 보고도 눈을 돌림');}
{const s=fresh(),{maf}=atBomb(s);const take=S.choices(s,maf,'big').find(a=>a.sceneKey==='take');S.resolve(s,maf,take,rng);
 const c=s.cases.find(c=>c.target===maf.id&&c.caughtKind==='npc');ok(c&&c.npcKind==='dynamite','공포 0이면 지금처럼 고발(npcKind dynamite)');}
for(const flee of [true,false]){const s=fresh(),{maf}=atBomb(s);maf.faceCover=s.epoch;const take=S.choices(s,maf,'big').find(a=>a.sceneKey==='take');S.resolve(s,maf,take,flee?hi:lo);
 const town=s.players.filter(p=>p.team==='town');const named=s.cases.some(c=>c.target===maf.id);
 ok(town.every(t=>t.known.some(k=>/얼굴을 가린 사람이 .*폭약을 꺼냈소/.test(k.text)&&k.about===null))&&(flee?!named:named),flee?'얼굴을 가리고 달아나면 "얼굴을 가린 사람"이라는 말만 퍼지고 고발 없음':'얼굴을 가렸어도 붙잡히면 얼굴이 드러나 고발됨');}

// 8. 규칙 판단: 끌어들이기·협박 고발은 폭약 고발과 다른 까닭으로 센다
{const s=fresh(),{gf}=roles(s);s.scenario.mineClosed=false;gf.location='tavern';s.scenario.continuation.npcs.barkeep.location='tavern';S.resolve(s,gf,find(s,gf,'recruitNpc','barkeep'),hi);
 const c=s.cases.find(c=>c.target===gf.id);const t=s.players.find(p=>p.team==='town'&&p.bot),m=M.suspicion(s,t,gf.id);
 ok(!!c&&m.why.some(w=>w==='NPC가 직접 들은 끌어들이기 권유')&&!m.why.some(w=>/폭약 고발/.test(w)),'규칙 판단은 폭약 고발이 아니라 "NPC가 직접 들은 끌어들이기 권유"로 셈: '+m.why.join(' / '));}
