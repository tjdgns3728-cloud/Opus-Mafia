// 2026-11-25 제안(사용자 허락 전) F1: 마피아 밤 습격은 밤마다 한 번 정하는 조직 습격. 맡은 사람의 개인 큰 행동은 따로 남음. 사용: node proposal_org_attack_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;let seed=171;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=(stage='mafiaTalk')=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=2;s.stage=stage;s.plans={};for(const p of s.players){p.location=p.team==='mafia'?'hideout':'home';p.houseId=p.team==='mafia'?null:p.id;p.hidden=false;p.used={big:false,small:false};}return s;};
{const s=fresh(),gang=s.players.filter(p=>p.team==='mafia'),m=gang[0],town=s.players.filter(p=>p.team!=='mafia');
 ok(gang.length>=2,'시험 판: 마피아 '+gang.length+'명');
 ok(!C.choices(s,m.id,'big').some(a=>a.type==='attack'&&a.nightRaid),'개인 큰 행동 목록에 밤 집 습격 없음');
 const oc=C.orgChoices(s,m.id);ok(town.every(t=>oc.some(c=>c.target===t.id&&c.weapon==='fist')),'의논 때 조직 습격 선택지: 시민 집마다 · '+oc.length+'개');
 ok(C.orgChoices(s,town[0].id).length===0,'시민에게는 조직 습격 없음');
 {const v=C.view(s,m.id),scr=NS.read(v),b=scr.buttons.find(x=>/의 집 습격 맡기/.test(x.name));ok(!!b,'의논 화면에 「○○의 집 습격 맡기」 버튼 · '+(b?.name||''));const r=b&&NS.press(v,scr,{'버튼':b.name});ok(r?.req?.type==='org-attack'&&!!r.req.target&&!!r.req.weapon,'AI 누름도 같은 요청 · '+JSON.stringify(r?.req||r));
  ok(/조직 습격 · 밤마다 한 번/.test(scr.text)&&/아직 정하지 않음/.test(scr.text),'의논 화면 글: 조직 습격 설명과 아직 정하지 않음');}
 ok(!NS.read(C.view(s,town[0].id)).buttons.some(x=>/습격 맡기/.test(x.name)),'시민 화면에는 습격 버튼 없음');
 const T=town[0],n0=s.feed.length;const err=C.orgAttack(s,m.id,{target:T.id,weapon:'fist'});ok(!err&&s.orgAttack?.actor===m.id&&s.orgAttack.target===T.id,'조직 습격 정하기 · '+(err||''));
 const note=s.feed.slice(n0).filter(e=>/조직 습격/.test(e.text||''));ok(note.length===1&&note[0].to.every(id=>gang.some(g=>g.id===id))&&gang.every(g=>note[0].to.includes(g.id)),'정한 것은 같은 편 모두에게만 알림 · '+(note[0]?.text||''));
 ok(C.view(s,gang[1].id).orgAttack?.actor===m.name&&!C.view(s,gang[1].id).orgAttack.mine&&C.view(s,m.id).orgAttack.mine,'같은 편 화면에 누가 맡았는지');ok(C.view(s,T.id).orgAttack===null,'시민 화면에는 조직 습격 정보 없음');
 {const v=C.view(s,gang[1].id),scr=NS.read(v);ok(scr.buttons.some(x=>x.name==='조직 습격 취소'),'정한 뒤에는 [조직 습격 취소] 버튼');}
 ok(!!C.orgAttack(s,m.id,{target:T.id,weapon:'pistol'})||m.items.pistol,'가지지 않은 무기로는 정할 수 없음');
 s.stage='plan';const e2=C.queue(s,m.id,{type:'attack',target:T.id,weapon:'fist',nightRaid:true});ok(/조직 습격/.test(e2||''),'개인 큰 행동으로 밤 습격을 고르면 막힘 · '+e2);
 ok(!C.queue(s,m.id,{type:'wait'})&&C.planEntries(s).filter(([id])=>id===m.id).length===2,'맡은 사람도 자기 큰 행동을 따로 고름(계획 둘)');
 {const v=C.view(s,m.id),scr=NS.read(v);ok(scr.buttons.some(x=>/의 집 습격 맡기/.test(x.name))&&/내가 맡음/.test(scr.text),'밤 행동 시간 화면에도 조직 습격(내가 맡음)');}
 for(const t of town)C.queue(s,t.id,{type:'sleep'});C.queue(s,gang[1].id,{type:'wait'});
 const n=C.announceClashes(s);ok(n===1,'조직 습격이 공격으로 알려짐 · '+n);s.stage='react';ok(C.threats(s,T.id).length===1,'습격받는 사람에게 대응 선택이 생김');
 C.resolveBig(s,rng);ok(s.events.some(e=>e.type==='attack'&&e.actor===m.id&&e.target===T.id)&&m.used.big,'조직 습격이 실제 공격으로 처리됨');
 ok(s.feed.some(e=>e.to.includes(gang[1].id)&&/조직 습격: .*의 집에 들어갔습니다/.test(e.text||'')),'맡지 않은 같은 편에게 "들어갔습니다" 알림');}
{const s=fresh(),gang=s.players.filter(p=>p.team==='mafia'),m=gang[0],town=s.players.filter(p=>p.team!=='mafia');C.orgAttack(s,m.id,{target:town[0].id,weapon:'fist'});const c1=C.orgAttack(s,gang[1].id,{target:town[1].id,weapon:'fist'});ok(!c1&&s.orgAttack.actor===gang[1].id&&s.orgAttack.target===town[1].id,'다른 사람이 누르면 맡는 사람과 집이 바뀜(밤에 한 번만)');
 ok(!C.orgAttack(s,m.id,{cancel:true})&&s.orgAttack===null&&!C.planEntries(s).some(([,a])=>a.org),'취소하면 조직 습격 없음');
 s.stage='plan';for(const t of town)C.queue(s,t.id,{type:'sleep'});for(const g of gang)C.queue(s,g.id,{type:'wait'});ok(C.announceClashes(s)===0,'정하지 않으면 그 밤 습격 없음');}
{const s=fresh('plan');s.turn=0;ok(!!C.orgAttack(s,s.players.find(p=>p.team==='mafia').id,{target:s.players.find(p=>p.team!=='mafia').id,weapon:'fist'}),'낮에는 조직 습격을 정할 수 없음');}
{const s=fresh('react'),m=s.players.find(p=>p.team==='mafia');ok(!!C.orgAttack(s,m.id,{target:s.players.find(p=>p.team!=='mafia').id,weapon:'fist'}),'의논·밤 행동 시간이 지나면 정할 수 없음');}
{const t=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(t.includes("'org-attack','org-cancel'")&&t.includes('밤마다 한 번 정하는 조직 습격'),'AI 화면 버튼 목록과 규칙 글');}
