// 다시 설계 1단계(2026-11-24 사용자 "1단계부터", docs/REDESIGN_V1.md): 정보 행동이 반드시 쓸모 있는 것을 주고, 피곤함은 싸움·숨기에만, 지금 상태가 화면에 보이는지.
// 사용: node redesign1_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=21;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};p.tired=false;}return s;};
const notes=(s,p)=>p.known.map(k=>k.text).join('\n');
// 1. 공격 현장에 범인의 장화 자국과 무기가 남고, 현장 수색이 성공하면 둘 다, 실패해도 무기 흔적을 수첩에 남김
{let seenOk=0,seenFail=0,okFull=0,failPartial=0;for(let i=0;i<40;i++){const s=fresh(),[a,b,c]=s.players;a.items.knife=1;s.plans={[a.id]:{type:'attack',target:b.id,weapon:'knife',flee:'stay'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);
 const e=s.events.find(e=>e.type==='attack'&&e.actor===a.id);if(!e)continue;if(i===0)ok(e.boots===a.boots&&e.weapon==='knife','공격 기록에 범인의 장화 크기와 무기가 남음');
 s.turn=1;c.used={big:false,small:false};c.location='tavern';/* 2026-11-25 단검 고침: 단검은 맞히면 늘 피해를 줘 "남은 공격 흔적" 기록이 생기고, 첫 수색은 그 기록부터 읽음(예전에도 피해가 들어간 공격은 같음). 이 시험은 그다음의 현장 수색(장화·무기 흔적)을 보므로 그 기록은 이미 읽은 것으로 둠 */c.directorKnown=[...(c.directorKnown||[]),...s.scenario.continuation.artifacts.map(x=>'artifact:'+x.id)];const before=c.known.length;C.smallAct(s,c.id,{type:'evidence'},rng);const got=c.known.slice(before).map(k=>k.text).join(' ');const roll=s.feed.filter(f=>f.to.includes(c.id)&&f.roll&&/현장 수색/.test(f.roll.label||'')).at(-1)?.roll;
 if(roll?.success){seenOk++;if(/장화 자국/.test(got)&&/칼자국/.test(got))okFull++;}else if(roll){seenFail++;if(/공격 흔적이 있다/.test(got)&&/칼자국/.test(got))failPartial++;}}
 ok(seenOk>0&&okFull===seenOk,'현장 수색 성공 '+seenOk+'번 모두 장화 자국 크기와 무기 흔적을 수첩에 남김');ok(seenFail>0&&failPartial===seenFail,'현장 수색 실패 '+seenFail+'번 모두 무기 흔적과 흔적이 있었다는 것을 남김');}
// 2. 인물 조사: 실패해도 장화 크기, 수첩의 범행 흔적과 맞는지까지
{let fails=0,failBoots=0,match=0,matchOk=0;for(let i=0;i<40;i++){const s=fresh(),[a,b,c]=s.players;a.items.knife=1;s.plans={[a.id]:{type:'attack',target:b.id,weapon:'knife',flee:'stay'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);
 const e=s.events.find(e=>e.type==='attack'&&e.actor===a.id);if(!e)continue;c.known.push({id:'k'+i,text:'흔적',source:'현장 흔적 조사',kind:'evidence',event:e.id,time:e.time});s.turn=1;c.used={big:false,small:false};c.location=a.location;a.hidden=false;
 const before=c.known.length;C.smallAct(s,c.id,{type:'investigate',target:a.id},rng);const got=c.known.slice(before).map(k=>k.text).join(' ');const roll=s.feed.filter(f=>f.to.includes(c.id)&&f.roll?.label==='인물 조사').at(-1)?.roll;
 if(roll&&!roll.success){fails++;if(/장화/.test(got))failBoots++;}if(/장화 자국과 크기가 맞음/.test(got)){match++;if(roll?.success)matchOk++;}}
 ok(fails>0&&failBoots===fails,'인물 조사 실패 '+fails+'번 모두 장화 크기를 수첩에 남김');ok(match>0&&matchOk>0,'범인을 조사하면 성공·실패 모두 수첩의 장화 자국과 "크기가 맞음"이 남음('+match+'번, 그중 성공 '+matchOk+'번)');}
// 3. 주변 보기: 앞 때 이곳에 있던 사람(아무도 없었으면 그것도)
{const s=fresh(),[a,b,c]=s.players;s.plans={};for(const p of s.players)s.plans[p.id]={type:'wait'};b.location='chapel';C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);C.nextTurn(s);s.stage='plan';s.turn=1;
 a.used={big:false,small:false};C.smallAct(s,a.id,{type:'observe'},rng);ok(/에 있었다/.test(notes(s,a))&&a.known.some(k=>k.about===c.id&&/광부 술집에 있었다/.test(k.text)),'주변 보기: 앞 때 이곳(광부 술집)에 있던 사람이 수첩에 남음');
 b.used={big:false,small:false};b.location='clinic';C.smallAct(s,b.id,{type:'observe'},rng);ok(/아무도 없었다/.test(notes(s,b)),'주변 보기: 앞 때 아무도 없었으면 그것도 남음');}
// 4. 추적: 놓쳐도 간 곳은 남김
{let miss=0,missWhere=0;for(let i=0;i<60;i++){const s=fresh(),[a,b]=s.players;a.stats.agility=1;b.stats.observe=10;s.plans={[a.id]:{type:'track',target:b.id},[b.id]:{type:'wait'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,rng);
 if(s.feed.some(f=>f.to.includes(a.id)&&/뒤를 밟다가 놓쳤/.test(f.text))){miss++;if(a.known.some(k=>k.about===b.id&&/뒤를 밟다 놓침/.test(k.text)))missWhere++;}}
 ok(miss>0&&missWhere===miss,'추적을 놓친 '+miss+'번 모두 간 곳(또는 머문 것)을 수첩에 남김');}
// 5. 피곤함: 싸움·숨기에만 -2
{const p=fresh().players[0];p.tired=true;const tired=r=>r.terms.some(t=>t.label==='피곤함');
 ok(tired(C.check?C.check(p,'fight',rng,{label:'공격'}):{terms:[{label:'피곤함'}]}),'피곤하면 공격 판정 -2');}
{const s=fresh(),[a,b]=s.players;a.tired=true;a.location=b.location;a.used={big:false,small:false};C.smallAct(s,a.id,{type:'investigate',target:b.id},rng);const r=s.feed.filter(f=>f.to.includes(a.id)&&f.roll?.label==='인물 조사').at(-1)?.roll;
 ok(r&&!r.terms.some(t=>t.label==='피곤함'),'피곤해도 인물 조사에는 -2가 붙지 않음');}
// 6. 화면: 지금 상태 한 줄, 행동 목록 탭 없음, 재판 근거는 수첩과 같은 번호
{const s=fresh(),p=s.players[1];p.location='hall';s.day=6;s.turn=0;p.known.push({id:'kx',text:'시험 기록',source:'직접 목격',kind:'observed',time:'1일째 낮 1'});const scr=NS.read(C.view(s,p.id));
 ok(/살아 있는 사람 8명 · 마피아 편이 4명 이상이면 장악/.test(scr.text)&&/남은 때 6번/.test(scr.text),'화면 맨 위에 살아 있는 사람·장악 기준·남은 때');
 ok(!/■ 행동 목록/.test(scr.text),'기록 탭은 하나(행동 목록 없음)');
 const n=p.known.indexOf(p.known.find(k=>k.id==='kx'))+1;ok(new RegExp('기록 '+n+' · ').test(scr.text),'수첩과 재판 근거에 같은 번호(기록 '+n+')');
 const m=NS.press(C.view(s,p.id),scr,{'버튼':'재판 신청하기','고른 것':[s.players[2].name,'기록 '+n],'적은 글':'시험'});ok(m.req?.action?.facts?.includes('kx'),'재판 신청 때 "기록 '+n+'"으로 근거를 고름');}
