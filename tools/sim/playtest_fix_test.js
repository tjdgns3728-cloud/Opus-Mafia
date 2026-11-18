// 2026-11-18 사용자 시험 플레이에서 찾은 것을 고친 뒤: 첫 회관 잡담, 누구나 곁에서 지키기(퇴역군인 보정), 폭약을 NPC 앞에서 꺼내지 않기,
// 찾았다고 말했는지에 따른 폭약 고발, 재판 화면 맨 위 표시, 게임 기록. 사용: node playtest_fix_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(name,cls){globalThis.__UI=cls;}};
const src10=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src10.replace(/\}\)\(\);\s*$/,'globalThis.__t={cannedTalk,saveRecord,recordTrial};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,M=globalThis.NoirMinds,T=globalThis.__t;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=11;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.hidden=false;p.used={big:false,small:false};}return s;};
// 1. 첫 회관 대화: 잡담, 판단 원칙은 큰 행동 지시문에만
ok(src10.includes('사람들이 처음 회관에 모인 자리다')&&src10.includes('잡담을 한다'),'첫 회관 AI 지시문은 잡담하는 자리');
ok(src10.split('NoirMinds.principles').length-1===1,'판단 원칙은 큰 행동 지시문 한 곳에만');
ok(!/RULE_FACTS|숨긴 폭약의 자리는 처음에 마피아만 안다/.test(src10),'AI 지시문에 폭약 행동을 가르치는 글을 넣지 않음(사용자: 지시 대신 패배기록으로)');
{const s=fresh(),p=s.players[0];const line=T.cannedTalk(s,p,'hall');ok(line&&!/가 보겠습니다|남아 사람들 이야기/.test(line)&&p.intendPlace,'AI 끈 컴퓨터 자리의 첫 회관 말은 잡담(갈 곳은 따로 정해 둠): '+line);}
// 2. 곁에서 지키기: 누구나, 낮에만, 같은 곳. 퇴역군인은 막아설 때 보정 +2
{const s=fresh(),maf=s.players.find(p=>p.team==='mafia'),town=s.players.find(p=>p.team==='town'&&p.role!=='guard'),other=s.players.find(p=>p.id!==maf.id&&p.id!==town.id);
 ok(C.choices(s,maf.id,'big').some(a=>a.type==='guardPlayer'&&a.target===other.id),'마피아(대행자 등)도 사람 곁에서 지키기를 고를 수 있음');
 ok(C.choices(s,town.id,'big').some(a=>a.type==='guardPlayer'),'퇴역군인이 아닌 시민도 고를 수 있음');
 s.turn=2;ok(!!C.validate(s,town.id,{type:'guardPlayer',target:other.id},'big'),'밤에는 고를 수 없음');s.turn=0;
 other.location='clinic';ok(!!C.validate(s,town.id,{type:'guardPlayer',target:other.id},'big'),'다른 곳에 있는 사람은 지킬 수 없음');}
const guardFight=role=>{const s=fresh(),[atk]=s.players.filter(p=>p.team==='mafia'),[g,t]=s.players.filter(p=>p.team==='town');g.role=role;atk.items.knife=1;const before=t.hp;
 C.queue(s,g.id,{type:'guardPlayer',target:t.id});C.queue(s,atk.id,{type:'attack',target:t.id,weapon:'knife'});C.resolveBig(s,rng);
 const e=s.feed.find(e=>e.kind==='combat'&&e.to.includes(g.id)&&e.roll?.defReason);return {s,g,t,before,e};};
{const r=guardFight('doctor');ok(r.s.feed.some(e=>/앞을 막아서 대신 맞섭니다/.test(e.text))&&r.t.hp===r.before,'곁을 지키면 공격을 대신 맞고, 지켜진 사람은 다치지 않음');}
{const s=fresh(),[atk]=s.players.filter(p=>p.team==='mafia'),[g]=s.players.filter(p=>p.team==='town');atk.items.knife=1;g.role='doctor';const plain=C.attackRoll(s,atk,g,{weapon:'knife',guarded:true},rng).defReason;g.role='guard';const vet=C.attackRoll(s,atk,g,{weapon:'knife',guarded:true},rng).defReason;
 ok(!/퇴역군인/.test(plain)&&/퇴역군인 · 막아서기에 익숙함 \+2/.test(vet),'퇴역군인이 막아서면 방어 보정 +2가 더 붙음(다른 직업은 없음)');}
{const r=guardFight('guard');ok(r.e===undefined&&r.s.feed.filter(e=>e.kind==='combat'&&e.to.includes(r.g.id)).every(e=>!e.roll||!/퇴역군인|defReason|attackRoll/.test(JSON.stringify(e.roll))),'화면에 가는 대결 결과에는 보정·주사위가 없어 퇴역군인인지 드러나지 않음');}
{const src07=fs.readFileSync(path.join(dir,'07StoryActions.js'),'utf8');ok(!src07.includes("['guard','jailor','sheriff'].includes(p.role))add('guardNpc'")&&/퇴역군인은 6까지/.test(src07)&&src07.includes("guard.role==='guard'?6:4"),'NPC 곁에서 지키기도 누구나, 퇴역군인은 6까지 막음');}
// 3·4. 폭약: 컴퓨터 자리는 NPC가 보는 낮에 꺼내지 않는다. NPC가 고발하면 꺼내기 전에 찾았다고 말했는지 남긴다
const PLACE={chapel:'chapel',cart:'warehouse','spot:barrel':'tavern','spot:medbox':'clinic'};
const atBomb=s=>{const b=s.scenario.bombs.find(b=>PLACE[b.where]);const maf=s.players.find(p=>p.team==='mafia');maf.location=PLACE[b.where];const q=s.scenario;for(const n of [q.doyle,...Object.values(q.continuation?.npcs||{})].filter(Boolean))n.location='office';return {maf,place:maf.location,q};};
{const s=fresh(),{maf,place,q}=atBomb(s);ok(S.botAction(s,maf,'big')?.sceneKey==='take','NPC가 없으면 컴퓨터 마피아가 폭약을 꺼냄');
 q.doyle.location=place;q.doyle.cowed=false;ok(S.botAction(s,maf,'big')===null,'NPC(도일)가 보는 낮에는 꺼내지 않음');}
for(const said of [true,false]){const s=fresh(),{maf,place,q}=atBomb(s);q.doyle.location=place;q.doyle.cowed=false;q.doyle.hp=10;
 if(said)C.emit(s,[maf.id],'speech','수색하다 숨겨 둔 폭약을 찾았습니다.',{who:maf.id,name:maf.name});
 const take=S.choices(s,maf,'big').find(a=>a.sceneKey==='take');S.resolve(s,maf,take,rng);const c=s.cases.find(c=>c.target===maf.id&&c.caughtKind==='npc');
 ok(c&&c.explained===said&&(said?/꺼내기 전에 폭약을 찾았다고 말했다/:/찾았다는 말은 없었다/).test(c.reason),`NPC 고발에 찾았다고 말했는지(${said?'말함':'말 안 함'})가 남음`);
 const voter=s.players.find(p=>p.team==='town');for(const o of C.alive(s)){o.knownCases??=[];if(!o.knownCases.includes(c.id))o.knownCases.push(c.id);}
 const sc=M.suspicion(s,voter,maf.id).score;ok(said?sc<1:sc>=4,`판단: ${said?'찾았다고 말하고 꺼냄 → 약하게':'말없이 꺼냄 → 강하게(처음엔 마피아만 안다)'} (${sc})`);}
// 5. 재판 화면 맨 위 표시
{const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(ui.includes('trial-banner')&&ui.includes('피고 <strong>')&&ui.includes('유죄 표가 무죄 표보다 많으면 피고는 처형되고'),'재판 중에는 이야기 칸 위에 피고·고발·근거·혐의·판결 규칙을 보임');
 const s=fresh(),t=s.players[1];s.cases.push({id:'c77',day:s.day,closed:false,target:t.id,by:'npc:간호사',byName:'간호사',reason:'폭약',reasons:[],evidence:[],support:[],responses:{},order:1,caught:true,caughtKind:'npc'});C.beginTrial(s,s.cases.at(-1));
 ok(C.view(s,s.players[0].id).trial?.byName==='간호사','화면에 NPC 고발자의 이름이 전해짐');}
// 6. 게임 기록: 진행 중에 이어서, 한 줄 64KB 아래로
{const s=fresh(),rec=[],r={state:s,record(b){rec.push(b);return true;}};for(let i=0;i<400;i++)C.emit(s,s.players.map(p=>p.id),'story','긴 이야기 '.repeat(30)+i);
 T.saveRecord(r,'시험');const start=rec.find(b=>b.event==='start'),feeds=rec.filter(b=>b.event==='feed'),state=rec.find(b=>b.event==='state');
 ok(start&&start.players.length===8&&start.players.every(p=>p.role&&p.team&&p.roleName),'처음 기록에 모두의 직업·편');
 ok(feeds.length>1&&feeds.every(b=>JSON.stringify(b).length<60000)&&feeds.flatMap(b=>b.entries).length===s.feed.length,'글을 나눠 모두 남김(한 줄 64KB 아래)');
 ok(state&&state.players.every(p=>'hp' in p&&'location' in p),'모두의 상태를 남김');
 const n=rec.length;C.emit(s,[s.players[0].id],'story','새 글');T.saveRecord(r,'시험');ok(rec.slice(n).filter(b=>b.event==='feed').flatMap(b=>b.entries).length===1,'다음 기록에는 새로 늘어난 글만');
 s.cases.push({id:'c88',day:s.day,closed:false,target:s.players[2].id,by:s.players[3].id,reason:'수상',reasons:[],evidence:[],support:[],responses:{},order:2});C.beginTrial(s,s.cases.at(-1));s.trial.votes={[s.players[4].id]:'guilty'};
 T.recordTrial(r);ok(rec.at(-1).event==='trial'&&rec.at(-1).votes[s.players[4].id]==='guilty','재판마다 누가 어디에 표를 냈는지 남김');}
