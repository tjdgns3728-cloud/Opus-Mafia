// 재판 때 NPC가 회관에 모임(2026-11-20 사용자 "재판은 모든 npc가 재판 장소에 있어야해요", "아 암거래 상인 빼고요")
// 모든 행위를 숫자로 남김(같은 날 "당신이 이 게임을 이해하려면 모든 행위에 대해서 기록하는게 좋습니다", "숫자로 기록할 수 있는 것이면 기록을 하는게 좋습니다").
// 사용: node trial_npcs_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=7;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['사람','도현','서아','시온','하준','나린','이안','수현'].map((n,i)=>({id:'p'+i,name:n,bot:i>0})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';s.scenario.discovered=true;for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};}return s;};
/* 재판 신청은 큰 행동(화면은 따로 신청 창, AI 선택지에는 없음) */const fileBig=(s,id,target)=>{const e=C.queue(s,id,{type:'file',target,reason:'시험'});for(const p of C.alive(s))if(p.id!==id&&!s.plans[p.id])C.queue(s,p.id,{type:'wait'});C.resolveBig(s,rng);return e;};
const npcs=s=>Object.values(s.scenario.continuation.npcs);

// 1. 재판이 열리면 살아 있는 NPC가 모두 회관에, 암거래 상인과 죽은 NPC는 그대로. 끝나면 있던 곳으로
{const s=fresh(),gf=s.players.find(p=>p.role==='godfather'),filer=s.players.find(p=>p.team==='town');
 const N=s.scenario.continuation.npcs;N.barkeep.location='tavern';N.landlady.location='chapel';N.nurse.hp=0;N.nurse.location='clinic';
 const before=Object.fromEntries(npcs(s).map(n=>[n.id,n.location]));
 filer.location='hall';ok(!fileBig(s,filer.id,gf.id)&&s.cases.some(q=>q.target===gf.id),'재판 신청');
 const c=s.cases.find(q=>q.target===gf.id);C.beginConsent(s,c);C.beginTrial(s,c);
 const alive=npcs(s).filter(n=>n.hp>0&&n.id!=='merchant'&&before[n.id]);
 ok(alive.length>0&&alive.every(n=>n.location==='hall'),'살아 있는 NPC '+alive.length+'명이 모두 회관에');
 ok(N.merchant.location===before.merchant,'암거래 상인은 제자리('+N.merchant.location+')');
 ok(N.nurse.location==='clinic','죽은 NPC는 옮기지 않음');
 const v=C.view(s,filer.id);ok(JSON.stringify(v).includes('하숙집 주인'),'재판 중 화면 데이터에 회관의 NPC가 보임');
 s.stage='vote';for(const o of C.alive(s))s.trial.votes[o.id]=o.id===gf.id?'innocent':(o.team==='mafia'?'innocent':'abstain');C.judge(s);
 ok(alive.every(n=>n.location===before[n.id]),'재판이 끝나면 있던 곳으로 돌아감');
 // 2. 사람마다의 표가 지표로 남음
 const votes=(s.metrics||[]).filter(m=>m.kind==='vote');
 ok(votes.length===C.alive(s).filter(o=>o.id!==gf.id).length,'표 '+votes.length+'개가 지표로');
 ok(votes.every(m=>m.targetTeam==='mafia'&&['guilty','innocent','abstain'].includes(m.vote)&&m.team),'표 지표에 누가(편)·무엇을·피고의 편');
 ok(votes.some(m=>m.team==='mafia'&&m.vote==='innocent'),'마피아의 무죄 표가 남음');
}

// 3. 모든 큰·작은 행동이 act로, 판정이 roll로 한 번씩, 재판 동의·반대가 caseResponse로
{const s=fresh(),t=s.players.find(p=>p.team==='town'&&p.name!=='사람'),gf=s.players.find(p=>p.role==='godfather');
 C.smallAct(s,t.id,{type:'cover'},rng);
 const sm=(s.metrics||[]).filter(m=>m.kind==='act'&&m.slot==='small');
 ok(sm.length===1&&sm[0].type==='cover'&&sm[0].place==='tavern'&&typeof sm[0].others==='number','작은 행동 하나가 act 하나로(종류·장소·같은 자리 사람 수)');
 const g=C.choices(s,gf.id,'big').find(a=>a.type==='guardPlayer')||{type:'wait'};C.queue(s,gf.id,g);for(const p of C.alive(s))if(p.id!==gf.id)C.queue(s,p.id,{type:'wait'});const planned=Object.keys(s.plans).length;C.resolveBig(s,rng);
 const big=(s.metrics||[]).filter(m=>m.kind==='act'&&m.slot==='big');
 ok(planned>1&&big.length===planned&&big.some(m=>m.actor===gf.id&&m.type===g.type),'정한 큰 행동이 모두 act로('+big.length+'/'+planned+')');
 // 같은 판정을 여러 사람에게 보여 줘도 한 번
 const r=C.check(gf,'observe',rng,{label:'시험 판정',dc:10});const k0=(s.metrics||[]).filter(m=>m.kind==='roll'&&m.label==='시험 판정').length;
 C.emit(s,[gf.id],'check','a',{roll:r});C.emit(s,[t.id],'check','b',{roll:r});
 ok((s.metrics||[]).filter(m=>m.kind==='roll'&&m.label==='시험 판정').length===k0+1,'같은 판정은 roll 한 번');
 // 재판 동의·반대
 const filer=s.players.find(p=>p.team==='town'&&p.id!==t.id);filer.location='hall';filer.used={big:false,small:false};
 s.stage='plan';s.plans={};for(const p of s.players)p.used={big:false,small:false};fileBig(s,filer.id,gf.id);const c=s.cases.find(q=>q.target===gf.id);s.stage='plan';
 const y=s.players.find(p=>p.team==='town'&&p.id!==filer.id&&p.id!==t.id);y.location='hall';C.support(s,y.id,c.id,false);
 const cr=(s.metrics||[]).filter(m=>m.kind==='caseResponse');
 ok(cr.length===1&&cr[0].yes===false&&cr[0].targetTeam==='mafia'&&cr[0].byTeam==='town','재판 신청에 대한 반대가 caseResponse로');
 const fl=(s.metrics||[]).filter(m=>m.kind==='act'&&m.type==='file');
 ok(fl.length===1&&fl[0].targetTeam==='mafia','재판 신청이 act(file)로, 지목한 사람의 편과 함께');
}
