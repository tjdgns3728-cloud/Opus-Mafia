// 2026-11-25 사용자: "협박을 이야기가 진행하면서 하는것은 너무 어려우니깐 마피아는 협박을 할 수 있게 하고 협박을 하면 할수록 npc를 마피아편으로 섭외하기 쉽게",
// "대부의 특수 능력이 아니라 모든 마피아가 가능하면", "협박하기 클릭하고 거기서 어떤 대상으로 협박할건지 선택하게".
// 협박은 하나의 행동(threatNpc, "X 협박하기")이고, 마피아면 누구나 같은 자리의 NPC(암거래 상인 빼고)에게 하루 한 번 할 수 있으며,
// 쌓인 압박·공포가 끌어들이기 난이도를 낮추는지, 도일도 끌어들이면 노조를 넘기는지 확인. 사용: node threat_all_mafia_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const hi=()=>0.99,lo=()=>0.01;
function game(){let x=21;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
 const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);
 s.day=1;s.turn=0;s.stage='plan';s.scenario.discovered=true;
 const st=s.scenario.continuation;for(const p of s.players)p.location='rail';
 return {s,st,mf:s.players.find(p=>p.role==='mafioso'),gf:s.players.find(p=>p.role==='godfather'),town:s.players.filter(p=>p.team==='town')};}
const big=(s,p)=>S.choices(s,p,'big');
const threat=(s,p,npc)=>big(s,p).find(a=>a.verb==='threatNpc'&&a.npc===npc);
const recruit=(s,p,npc)=>big(s,p).find(a=>a.verb==='recruitNpc'&&a.npc===npc);
const lastRoll=(s,p,re)=>s.feed.filter(e=>e.to?.includes(p.id)&&e.roll&&re.test(String(e.roll.label||''))).at(-1)?.roll;

// 1. 대행자(대부 아님)도 1일째 낮 회관에서 해먼드·도일을 협박할 수 있고, 글은 "X 협박하기"
{const {s,st,mf}=game();mf.location='hall';st.npcs.mayor.location='hall';s.scenario.doyle.location='hall';
 const a=threat(s,mf,'mayor'),d=threat(s,mf,'doyle');
 ok(!!a&&a.label==='해먼드 협박하기','대행자가 1일째 낮 회관에서 [해먼드 협박하기]를 고를 수 있음: '+(a?.label||'없음'));
 ok(!!d&&d.label==='도일 협박하기','1일째에도 [도일 협박하기](예전: 2일째부터·대부 설득 판정): '+(d?.label||'없음'));
 ok(!big(s,mf).some(x=>x.verb==='pressureNpc'||x.sceneKey==='threaten'),'따로 있던 겁주기·도일 노조 협박 선택지는 없음');}

// 2. 일터가 아닌 곳에서도, 그 NPC가 같은 자리에 있으면 협박할 수 있음(이야기·장소 조건 없음). 시민은 못 함. 상인은 제외
{const {s,st,mf,town}=game();mf.location='union';st.npcs.barkeep.location='union';st.npcs.merchant.location='union';
 ok(!!threat(s,mf,'barkeep'),'노조 사무실에 함께 있는 술집 주인을 협박할 수 있음(일터 조건 없음)');
 ok(!threat(s,mf,'merchant'),'암거래 상인은 협박하지 않음(2026-11-19 사용자 결정 그대로)');
 for(const t of town)t.location='union';ok(!town.some(t=>threat(s,t,'barkeep')),'시민은 협박할 수 없음');}

// 3. 하루에 NPC마다 한 번, 다음 날 다시 가능. 압박 3·공포 2(해먼드·도일은 압박 1)
{const {s,st,mf,gf}=game();mf.location='tavern';gf.location='tavern';const n=st.npcs.barkeep;n.location='tavern';
 const f0=S.fearOf(s,n);S.resolve(s,mf,threat(s,mf,'barkeep'),hi);
 ok(n.pressure===3&&S.fearOf(s,n)===f0+2,'협박 한 번: 압박 3, 공포 +2 (압박 '+n.pressure+')');
 ok(!threat(s,mf,'barkeep')&&!threat(s,gf,'barkeep'),'같은 날에는 누구도 다시 협박할 수 없음');
 s.day=2;ok(!!threat(s,mf,'barkeep'),'다음 날에는 다시 협박할 수 있음');
 const m=st.npcs.mayor;m.location='tavern';S.resolve(s,mf,threat(s,mf,'mayor'),hi);ok(m.pressure===1,'해먼드는 압박 1만 쌓임');
 const d=s.scenario.doyle;d.location='tavern';S.resolve(s,mf,threat(s,mf,'doyle'),hi);ok(d.pressure===1&&d.threatened===true,'도일도 압박 1, 협박받은 것으로 남음(다음 날 아침 털어놓는 이야기)');}

// 4. 협박할수록 끌어들이기 난이도가 내려감(날마다 협박하고 그때마다 난이도를 봄)
{const {s,st,mf}=game();mf.location='chapel';const n=st.npcs.bellringer;n.location='chapel';const dcs=[];
 for(let d=1;d<=3;d++){s.day=d;S.resolve(s,mf,recruit(s,mf,'bellringer'),lo);dcs.push(lastRoll(s,mf,/끌어들이기/)?.difficulty);n.recruited=false;S.resolve(s,mf,threat(s,mf,'bellringer'),hi);}
 ok(dcs.length===3&&dcs[0]>dcs[1]&&dcs[1]>dcs[2],'협박이 쌓일수록 끌어들이기 난이도가 내려감: '+dcs.join(' → '));}

// 5. 도일도 끌어들이기 대상. 성공하면 노조를 넘기고(cowed) 이기는 조건에 마피아 편으로 셈
{const {s,mf}=game();mf.location='hall';const d=s.scenario.doyle;d.location='hall';
 const a=recruit(s,mf,'doyle');ok(!!a&&a.label==='도일 끌어들이기','[도일 끌어들이기]를 고를 수 있음');
 S.resolve(s,mf,a,hi);ok(!d.cowed&&lastRoll(s,mf,/도일 끌어들이기/)?.difficulty===12,'협박 없이는 난이도 12(해먼드와 같음)라 주사위 10으로도 안 넘어옴');
 for(const day of [2,3]){s.day=day;S.resolve(s,mf,threat(s,mf,'doyle'),hi);}/* 이틀 협박 → 압박 2·공포 +4 */
 S.resolve(s,mf,recruit(s,mf,'doyle'),hi);ok(d.cowed===true&&s.scenario.mineClosed===false,'성공하면 도일이 노조를 넘김(cowed), 갱도 폐쇄 풀림');
 ok(!recruit(s,mf,'doyle')&&!threat(s,mf,'doyle'),'노조를 넘긴 도일은 다시 끌어들이거나 협박하지 않음');
 const n=s.scenario.continuation.npcs;n.mayor.recruited=true;const r=C.finish(s);ok(r&&r.team==='mafia','넘어온 도일과 해먼드가 이기는 조건에 마피아 편으로 셈');}

// 6. 밤: 집에 있는 NPC에게 이름 없는 협박장(예전 협박 쪽지와 같은 길) — 받은 사람 집에 협박장이 남음
{const {s,st,mf}=game();s.turn=2;mf.location='hideout';const n=st.npcs.mayor;n.location='home';
 const a=threat(s,mf,'mayor');ok(!!a&&a.raid===true,'밤에 집에 있는 해먼드에게 협박할 수 있음(이름 없는 협박장)');
 S.resolve(s,mf,a,hi);ok(n.threatened===true&&st.artifacts.some(x=>x.kind==='threat'&&x.npc==='mayor'),'해먼드 집에 협박장이 남고, 협박받은 것으로 남음');}

// 7. 화면 글: 대부 설명에 대부만 하는 것처럼 쓴 협박·이기는 조건 문장이 없음
{const gd=C.roles.godfather.desc;ok(!/도일을 협박하는 일을 잘합니다/.test(gd),'대부 설명에 "도일을 협박하는 일을 잘합니다"가 없음');}

// 8. 도일 맞대응은 그대로: 협박받으면 [협박장 공개 설득], 도일 편에 서면 끌어들이기에 "곁에서 지키는 사람" -3, 광부 증언이면 -4, 넘어간 뒤 광부 증언이 있으면 [노조 지지 거두기]
{const {s,mf,town}=game();const d=s.scenario.doyle;d.location='hall';mf.location='hall';const t=town[0];t.location='hall';
 S.resolve(s,mf,threat(s,mf,'doyle'),hi);ok(big(s,t).some(a=>a.sceneKey==='disclose'),'협박받은 도일에게 시민이 [협박장 공개 설득]을 할 수 있음');
 S.resolve(s,t,big(s,t).find(a=>a.sceneKey==='protect'),hi);s.scenario.minerTestified=true;S.resolve(s,mf,recruit(s,mf,'doyle'),lo);
 const r=lastRoll(s,mf,/도일 끌어들이기/),lab=(r?.terms||[]).map(x=>x.label+x.value).join(',');
 ok(/곁에서 지키는 사람-3/.test(lab)&&/구조된 광부의 노조 증언-4/.test(lab),'도일 편에 서기 -3, 광부 증언 -4가 도일 끌어들이기 판정에 붙음: '+lab);
 d.cowed=true;ok(big(s,t).some(a=>a.sceneKey==='withdraw'),'넘어간 도일에게 광부 증언 뒤 [노조 지지 거두기 설득]을 할 수 있음');}

// 9. 대부의 능력(2026-11-25 사용자 "NPC가 고발안하게 하죠"): NPC는 대부를 고발하지 않음. 사람은 그대로 고발 가능
{const setup=role=>{const {s,st,mf,gf}=game();const m=role==='godfather'?gf:mf;s.day=2;m.location='tavern';m.faceCover=null;const n=st.npcs.barkeep;n.location='tavern';n.fear=0;return {s,m,n};};
 {const {s,m,n}=setup('godfather');ok(S.accuseChance(s,n)>=0.9,'고발 확률이 높은 술집 주인('+S.accuseChance(s,n)+')');S.resolve(s,m,threat(s,m,'barkeep'),lo);
  ok(!s.cases.some(c=>c.target===m.id),'얼굴을 드러낸 대부가 술집 주인 앞에서 협박해도 고발 사건이 생기지 않음');
  ok(s.feed.some(e=>e.to?.includes(m.id)&&/겁에 질린 얼굴로 입을 다뭅니다/.test(String(e.text))),'대부에게는 지금 있는 "입을 다묾" 글이 그대로 나옴');}
 {const {s,m}=setup('mafioso');S.resolve(s,m,threat(s,m,'barkeep'),lo);ok(s.cases.some(c=>c.target===m.id&&c.npcKind==='pressure'),'같은 조건에서 대행자는 고발됨');}
 {const {s,m}=setup('godfather');const h=threat(s,m,'barkeep').hint,r=recruit(s,m,'barkeep').hint;ok(/대부를 고발하지 않습니다/.test(h)&&!/고발당할 수 있습니다/.test(h)&&/대부를 고발하지 않습니다/.test(r)&&!/당신을 고발할 수 있습니다/.test(r),'대부 본인 화면의 협박하기·끌어들이기 설명은 "고발하지 않습니다"');
  const {s:s2,m:m2}=setup('mafioso');ok(/고발당할 수 있습니다/.test(threat(s2,m2,'barkeep').hint),'대행자 화면 설명은 그대로 "고발당할 수 있습니다"');}
 ok(/대부를 두려워해서, 대부가 하는 일을 봐도 고발하지 않습니다\. 사람은 고발할 수 있습니다\./.test(C.roles.godfather.desc),'대부 직업 설명에 NPC가 고발하지 않는다는 문장');}

// 10. 대부가 NPC 앞에서 폭약을 꺼내도 15초 대치·고발이 없음(대행자는 대치)
{const setup=role=>{const {s,st,mf,gf}=game();const m=role==='godfather'?gf:mf;s.day=2;s.scenario.spots=['cart','barrel'];s.scenario.bombs=[{id:'d0',where:'cart'},{id:'d1',where:'spot:barrel'}];m.storyKnown=[...(m.storyKnown||[]),'cache:barrel'];
  const n=st.npcs.barkeep;n.location='tavern';n.fear=0;m.location='tavern';m.faceCover=null;return {s,m};};
 {const {s,m}=setup('godfather');const opt=big(s,m).find(a=>a.sceneKey==='take');ok(!opt||/대부를 고발하지 않습니다/.test(opt.warn||'')&&!/고발당할 수 있습니다/.test(opt.warn||''),'대부 화면의 폭약 꺼내기 경고는 "고발하지 않습니다": '+(opt?.warn||'(선택지 없음)'));
  S.resolve(s,m,{type:'scene',sceneKey:'take'},lo);ok(!(s.scenario.confronts||[]).some(c=>c.pid===m.id)&&!s.cases.some(c=>c.target===m.id),'대부가 술집 주인 앞에서 폭약을 꺼내도 대치·고발 없음');
  ok(s.scenario.bombs.some(b=>b.where==='carry:'+m.id),'폭약은 대부 품에 있음');}
 {const {s,m}=setup('mafioso');S.resolve(s,m,{type:'scene',sceneKey:'take'},lo);ok((s.scenario.confronts||[]).some(c=>c.pid===m.id),'같은 조건에서 대행자는 술집 주인이 막아서 대치');}}
