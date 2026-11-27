// 변장(얼굴 가리기) 번호와 잡히는 길(2026-11-19 사용자). 마피아의 "○○처럼 변장"은 disguise_test.js. 사용: node facecover_test.js <저장소 경로>
// "변장한 사람 1 변장한 사람 2 이런식으로", "행동으로 먼저 변장을 했으면 그사람이 1", 체력바는 늘 가득, 숨은 게 아니니 행동 대상이 됨,
// "숨어서 변장을 하면 들키진 않겠지만", "대놓고 변장하면 누가 변장했는지 보이겠죠", 잡히는 길 네 가지("이렇게 해주세요").
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,M=globalThis.NoirMinds;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=5;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['사람','도현','서아','시온','하준','나린','이안','수현'].map((n,i)=>({id:'p'+i,name:n,bot:i>0})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};}return s;};
const town=s=>s.players.filter(p=>p.team==='town'&&p.name!=='사람');/* '사람'은 흔한 낱말이라 글 바꾸기에서 빠진다 */
const small=(s,p,a)=>{p.used.small=false;return C.smallAct(s,p.id,a,rng);};
const feedOf=(s,p)=>s.feed.filter(e=>e.to.includes(p.id)).map(e=>String(e.text));

// 1. 번호: 먼저 변장한 사람이 1, 다음이 2. 벗었다 다시 해도 같은 번호. 턴이 지나도 이어짐
{const s=fresh(),[a,b,c]=town(s);a.location='hall';
 ok(small(s,a,{type:'cover'})===null&&s.aliases[a.id]===1&&a.faceCover,'혼자 있을 때 먼저 변장한 사람이 변장한 사람 1');
 b.location='chapel';ok(small(s,b,{type:'cover'})===null&&s.aliases[b.id]===2,'두 번째로 변장한 사람은 변장한 사람 2');
 c.location='hall';ok(C.nameFor(s,c,a)==='변장한 사람 1'&&C.idFor(s,c,a)==='v1','나중에 온 사람에게는 변장한 사람 1');
 s.epoch++;s.turn=1;ok(C.nameFor(s,c,a)==='변장한 사람 1','턴이 지나도 변장은 이어짐');
 a.location='chapel';ok(small(s,a,{type:'uncover'})===null&&!a.faceCover,'가리개 벗기');
 a.location='bank';s.players.filter(o=>o!==a).forEach(o=>{if(o.location==='bank')o.location='tavern';});small(s,a,{type:'cover'});ok(s.aliases[a.id]===1,'다시 변장해도 같은 번호(같은 옷차림)');}

// 2. 대놓고 변장하면 본 사람은 누군지 앎, 숨어서 변장하면 아무도 모름
{const s=fresh(),[a,b,c]=town(s);a.location='hall';b.location='hall';
 small(s,a,{type:'cover'});ok(C.nameFor(s,b,a)===a.name&&b.aliasKnown?.[1]?.id===a.id,'곁에서 변장하는 것을 본 사람은 누군지 앎');
 ok(feedOf(s,b).some(t=>t.includes('얼굴을 가림')&&t.includes(a.name)),'본 사람에게 "○○이 천과 모자로 얼굴을 가립니다"');
 ok(feedOf(s,a).some(t=>t.includes('변장한 사람 1.')&&t.includes(b.name)),'변장한 사람은 자기 번호와 누가 보았는지 앎');
 c.location='hall';ok(C.nameFor(s,c,a)==='변장한 사람 1','그 뒤에 온 사람은 모름');
 const s2=fresh(),[d,e]=town(s2);d.location='hall';e.location='hall';d.hidden=true;d.spotted=[];
 small(s2,d,{type:'cover'});ok(C.nameFor(s2,e,d)==='변장한 사람 1'&&!e.aliasKnown,'숨어서 변장하면 같은 자리 사람도 모름');}

// 3. 화면·AI 정보: 따로 된 사람으로, 체력은 늘 가득, 진짜 그 사람은 "여기 없음"과 구별되지 않음
{const s=fresh(),[a,b]=town(s);a.location='hall';small(s,a,{type:'cover'});a.hp=3;b.location='hall';
 const v=C.view(s,b.id),st=v.strangers.find(p=>p.id==='v1');
 ok(st&&st.name==='변장한 사람 1'&&st.alive===true&&st.condition==='활동 가능'&&st.hp===undefined,'변장한 사람은 따로(체력 숫자 없이 늘 활동 가능)');
 const real=v.people.find(p=>p.id===a.id);ok(real&&!real.here&&real.location===null,'진짜 그 사람의 칸은 "여기 없음"');
 ok(!Object.keys(v.aliases||{}).includes(a.id)&&!JSON.stringify(v.strangers).includes(a.id),'정보 어디에도 번호와 진짜 사람을 잇는 것이 없음');
 ok(v.environment.some(t=>t.includes('변장한 사람 1')&&!t.includes(a.name)),'"지금 보이는 사람"에도 번호로');}

// 4. 행동 대상: 번호로 고르고, 처리는 진짜 그 사람에게, 내 계획은 번호로 보임
{const s=fresh(),[a,b]=town(s);a.location='hall';small(s,a,{type:'cover'});b.location='hall';
 const opts=C.choices(s,b.id,'big');ok(opts.some(o=>o.type==='attack'&&o.target==='v1'&&o.label.startsWith('변장한 사람 1 공격'))&&opts.some(o=>o.type==='guardPlayer'&&o.target==='v1'),'공격·지키기 대상으로 "변장한 사람 1"');
 ok(!opts.some(o=>o.target===a.id),'진짜 id는 선택지에 나오지 않음');
 ok(C.queue(s,b.id,{type:'attack',target:'v1',weapon:'fist'})===null&&s.plans[b.id].target===a.id,'번호로 고른 공격은 진짜 그 사람에게');
 ok(C.view(s,b.id).plans.target==='v1','내 계획에는 번호로 보임');
 ok(C.choices(s,b.id,'small').some(o=>o.type==='investigate'&&o.target==='v1'),'조사하기 대상으로도');
 ok(C.validate(s,b.id,{type:'file',target:'v1',reason:'수상'},'big')==='누군지 모르는 사람은 재판에 올릴 수 없습니다.','번호로는 재판 신청을 못 함');}

// 5. 글: 모르는 사람에게는 번호로, 아는 사람에게는 이름으로('○○의 집'은 그대로)
{const s=fresh(),[a,b,c]=town(s);a.location='hall';b.location='hall';small(s,a,{type:'cover'});c.location='hall';
 C.emit(s,[b.id,c.id],'story',a.name+'이 문을 엽니다. '+a.name+'의 집 열쇠가 떨어집니다.');
 const fb=feedOf(s,b).at(-1),fc=feedOf(s,c).at(-1);ok(fb.startsWith(a.name)&&fc.startsWith('변장한 사람 1')&&fc.includes(a.name+'의 집'),'아는 사람에게는 이름, 모르는 사람에게는 번호, 집 이름은 그대로');
 const k=C.learn(s,c.id,a.name+'이 칼을 들었다.',a.id,'직접 목격','observed');ok(k.text.startsWith('변장한 사람 1')&&k.about==='v1','본 것도 번호의 일로 적힘');}

// 6. 잡히는 길 3: 한 일을 직접 본 사람이 그 자리에서 붙잡아 고발 → 가리개가 벗겨지고, 동의 없이 재판, 본 일이 증거
{const s=fresh(),[a,b,c,d]=town(s);a.location='hall';small(s,a,{type:'cover'});b.location='hall';c.location='hall';d.location='hall';
 ok(!C.choices(s,b.id,'small').some(o=>o.type==='seize'),'한 일을 본 것이 없으면 붙잡아 고발하기가 없음');
 const ev=C.recordEvent(s,'attack',a.id,d.id,a.name+'이 '+d.name+'을 공격했습니다.');C.witness(s,ev,a.id,d.id,()=>0.99);
 ok(b.known.some(k=>k.about==='v1'&&k.source==='직접 목격'),'공격을 본 사람에게 "변장한 사람 1이 공격" 기록');
 ok(C.choices(s,b.id,'small').some(o=>o.type==='seize'&&o.target==='v1'&&o.label==='변장한 사람 1 붙잡아 고발하기'),'본 사람은 그 자리에서 붙잡아 고발할 수 있음');
 const before=M.suspicion(s,c,a.id).score;
 ok(small(s,b,{type:'seize',target:'v1'})===null&&!a.faceCover&&a.jailEpoch===s.epoch+1,'붙잡히면 가리개가 벗겨지고 다음 턴 큰 행동을 못 함');
 ok(c.aliasKnown?.[1]?.id===a.id&&feedOf(s,c).some(t=>t.includes('변장한 사람 1')&&t.includes(a.name+'입니다')),'그 자리 사람은 변장한 사람 1이 누군지 알게 됨');
 const cs=s.cases.find(q=>q.target===a.id&&q.caughtKind==='seize');ok(cs&&cs.caught&&cs.evidence.some(e=>/변장한 사람 1이/.test(e.text)),'동의 없이 열리는 재판, 본 일이 증거로');
 ok(M.suspicion(s,c,a.id).score>before,'컴퓨터 자리도 누군지 알게 되면 변장한 사람 1의 일을 그 사람의 일로 봄(잡히는 길 4)');
 const s2=fresh(),[e,f]=town(s2);e.location='hall';small(s2,e,{type:'cover'});f.location='hall';s2.turn=2;
 ok(C.validate(s2,f.id,{type:'seize',target:'v1'},'small')!==null,'밤에는 붙잡아 고발할 수 없음');}

// 7. 사람들 앞에서 벗으면 누군지 앎, 다시 변장해도 그 사람은 앎
{const s=fresh(),[a,b]=town(s);a.location='hall';small(s,a,{type:'cover'});b.location='hall';
 ok(C.nameFor(s,b,a)==='변장한 사람 1','벗기 전에는 모름');small(s,a,{type:'uncover'});
 ok(feedOf(s,b).some(t=>t.includes('변장한 사람 1')&&t.includes('가리개를 벗습니다')&&t.includes(a.name)),'벗는 것을 보면 "변장한 사람 1이 가리개를 벗습니다. ○○입니다."');
 b.location='tavern';small(s,a,{type:'cover'});b.location='hall';ok(C.nameFor(s,b,a)===a.name,'한 번 알게 된 번호는 다시 변장해도 앎');}

// 8. 재판에 불려 나오면 벗는다
{const s=fresh(),[a,b]=town(s);a.location='hall';small(s,a,{type:'cover'});
 s.cases.push({id:'c1',day:s.day,closed:false,target:a.id,by:b.id,reason:'수상',reasons:[],evidence:[],support:[],responses:{},order:1});C.beginConsent(s,s.cases[0]);C.beginTrial(s,s.cases[0]);
 ok(!a.faceCover,'재판에 불려 나오면 가리개를 벗음');}

// 9. 경고(2026-11-19 사용자 "숨지도 않고 사람 있는 곳에서 변장을 하면 다른 사람한테 들킬 수 있다는 경고를 보여주세요", "경고 메세지를 미리 보여주고 선택하게")
{const s=fresh(),[a,b,c]=town(s);a.location='hall';
 ok(!C.choices(s,a.id,'small').find(o=>o.type==='cover').warn,'혼자 있으면 변장에 경고 없음');
 b.location='hall';const w=C.choices(s,a.id,'small').find(o=>o.type==='cover').warn;ok(w&&w.includes('누가 변장했는지 압니다')&&w.includes(b.name),'보는 사람이 있으면 변장에 경고(보이는 사람 이름과 함께)');
 a.hidden=true;a.spotted=[];ok(!C.choices(s,a.id,'small').find(o=>o.type==='cover').warn,'숨어 있으면 경고 없음');}
{const s=fresh(),maf=s.players.find(p=>p.team==='mafia'),q=s.scenario;const b=q.bombs[0];b.where=b.spot;maf.location=b.spot==='cart'?'warehouse':b.spot;maf.npcHeard=['lead:'+b.spot];q.discovered=true;
 const near=[q.doyle,...Object.values(q.continuation?.npcs||{})].filter(n=>n&&n.hp>0);for(const n of near)n.location='nowhere';
 const S2=globalThis.NoirScenarios,take0=S2.choices(s,maf,'big').find(o=>o.sceneKey==='take');
 if(take0){ok(!take0.warn,'NPC가 없으면 폭약 꺼내기에 경고 없음');const n=near.find(n=>n.name!=='도일')||near[0];n.location=maf.location;const take1=S2.choices(s,maf,'big').find(o=>o.sceneKey==='take');ok(take1&&take1.warn&&take1.warn.includes(n.name)&&take1.warn.includes('막아섬'),'NPC가 보는 앞이면 폭약 꺼내기에 경고(2026-11-28: 누가 보는지와 막아섬)');}
 else ok(false,'폭약 꺼내기 선택지를 만들지 못함(시험 준비 확인)');}
