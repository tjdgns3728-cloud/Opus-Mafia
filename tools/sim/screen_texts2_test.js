// 2026-11-25 사람 화면 재점검(합친 main)에서 나온 범위 안 화면 글 고침 확인. 사용: node screen_texts2_test.js <저장소 경로>
// 1 재판 머리글 판결 규칙(C3) 2 과반이 아니면 판결 줄에 이유 3 동의 창 안내(필요 수가 모이면 바로 열림) 4 시민 직업 카드 밤 행동
// 5 때가 바뀔 때의 읽기 이름 "밤이 됨 · 이야기"·"새 기록 없음" 6 모두 표를 낸 뒤 시계
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8'),ses=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=97;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location='hall';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}return s;};
// 1
ok(ui.includes('<small>유죄 표가 무죄 표보다 많고 투표한 사람(기권 포함)의 과반이면 피고는 처형되고, 아니면 풀려납니다.</small>')&&!ui.includes('무죄 표보다 많으면 피고는 처형되고'),'재판 머리글: 유죄가 많고 투표한 사람의 과반이면 처형(옛 규칙 글 없음)');
{const s=fresh();s.stage='vote';s.opened=0;const T=s.players[0];s.trial={id:'c1',target:T.id,by:s.players[1].id,reason:'시험',evidence:[],votes:{}};const v=C.view(s,s.players[2].id),scr=NS.read(v);ok(/투표한 사람\(기권 포함\)의 과반이면 피고는 처형/.test(scr.text),'AI 화면에도 같은 재판 머리글');}
// 2
{const mk=(g,n,a)=>{const s=fresh();s.stage='vote';const T=s.players[0];s.trial={id:'c1',target:T.id,by:s.players[1].id,reason:'시험',evidence:[],votes:{}};let k=1;for(let i=0;i<g;i++)s.trial.votes[s.players[k++].id]='guilty';for(let i=0;i<n;i++)s.trial.votes[s.players[k++].id]='innocent';for(let i=0;i<a;i++)s.trial.votes[s.players[k++].id]='abstain';s.cases.push({...s.trial,day:s.day,closed:false});const n0=s.feed.length;C.judge(s);return s.feed.slice(n0).map(e=>e.text||'').find(t=>t.includes('→'))||'';};
 const a=mk(1,0,2),b=mk(4,1,2),c=mk(0,3,0),d=mk(3,1,3);
 ok(a.includes('무죄, 풀려남. (유죄가 투표한 3명의 과반이 아님)'),'유죄 1·무죄 0·기권 2 → 과반 아님 이유 · '+a);
 ok(d.includes('(유죄가 투표한 7명의 과반이 아님)'),'유죄 3·무죄 1·기권 3 → 투표한 7명 · '+d);
 ok(b.includes('유죄, 처형.')&&!b.includes('과반이 아님'),'유죄 4·무죄 1·기권 2 → 이유 없이 처형');
 ok(c.includes('무죄, 풀려남.')&&!c.includes('과반이 아님'),'무죄가 더 많으면 이유를 붙이지 않음');}
// 3
ok(ui.includes('<p>동의가 필요한 수만큼 모이면 바로 열리고, 아니면 모두 응답하거나 1분이 끝나면 집계합니다.</p>')&&/st\.yes>=st\.needed\)r\.closePhase\(\)/.test(ses),'동의 창 안내가 실제(필요 수가 모이면 바로 열림)와 같음');
// 4
ok(ui.includes('밤에는 집에서 잠자기·불침번 서기·집 안에 숨기·남의 집 지키기 중 하나를 고릅니다(옮길 수 없음).')&&!ui.includes('밤에는 행동하지 않습니다'),'시민 직업 카드: 실제 밤 큰 행동 넷');
{const s=fresh();s.turn=2;s.stage='plan';const me=s.players.find(p=>p.team==='town');const big=C.choices(s,me.id,'big').map(a=>a.type);ok(['sleep','watch','shelter','guardHouse'].every(t=>big.includes(t)),'시민 밤 큰 행동이 카드 글과 같음 · '+[...new Set(big)].join(','));}
// 5
ok(ses.includes("s.readingKind='turn';reading(r,'result',()=>{s.readingKind=null;resume();});"),'때가 바뀔 때의 읽기만 표시하고, 끝나면 지움(시간은 그대로)');
{const s=fresh();s.turn=2;s.stage='result';s.readingKind='turn';s.chapter={id:'t',from:Math.max(0,...s.feed.map(e=>e.i||0))+1}/* 새 때: 이 사람에게 온 새 기록 없음 */;const me=s.players.find(p=>p.team==='town');const v=C.view(s,me.id);
 ok(v.turnStart===true,'밤이 될 때의 읽기 → turnStart');const scr=NS.read(v);ok(/밤이 됨 · 이야기/.test(scr.text)&&!/행동의 결과/.test(scr.text),'화면 이름 "밤이 됨 · 이야기"(사람·AI 같은 화면)');
 ok(/새 기록 없음 · 밤이 되었습니다\./.test(scr.text)&&!/확인한 기록이 아직 없습니다/.test(scr.text),'이 사람에게 새 기록이 없으면 "새 기록 없음 · 밤이 되었습니다."(AI 화면도 같음)');}
{const s=fresh();s.turn=0;s.stage='result';s.readingKind='turn';const v=C.view(s,s.players[0].id);ok(v.turnStart&&/아침 · 이야기/.test(NS.read(v).text),'아침이 될 때 → "아침 · 이야기"');}
{const s=fresh();s.stage='result';s.readingKind=null;const v=C.view(s,s.players[0].id);ok(v.turnStart===false&&/행동의 결과/.test(NS.read(v).text),'행동 결과 읽기는 그대로 "행동의 결과"');}
ok(ui.includes("v.turnStart?'새 기록 없음 · '+(v.turn===2?'밤이 되었습니다.':'아침이 밝았습니다.')"),'새 기록이 없으면 "새 기록 없음 · 밤이 되었습니다."');
// 6
{const s=fresh();s.stage='vote';const T=s.players[0];s.trial={id:'c1',target:T.id,by:s.players[1].id,reason:'시험',evidence:[],votes:{p1:'guilty'}};const v0=C.view(s,'p2');ok(v0.voteClosing===false,'표가 다 모이기 전 voteClosing 거짓');
 s.voteClosing=s.trial;const v1=C.view(s,'p2');ok(v1.voteClosing===true&&v1.trial.vote===null,'모두 표를 내면 voteClosing 참(남의 표는 보내지 않음)');}
{// 시계 셈: 열린 뒤 10초에 모두 냄 → 남은 110초 − (120 − 30) = 20초 뒤
 const total=120,rem=left=>Math.max(0,Math.ceil(left-(total-30)));ok(rem(110)===20&&rem(85)===0,'모두 낸 뒤 시계: 10초에 냄 → 0:20 뒤, 35초 뒤 → 곧');
 ok(ui.includes("'모두 표를 냄 · '+fmt(rem)+' 뒤 판결'")&&ui.includes("'모두 표를 냄 · 곧 판결'")&&ui.includes('Math.ceil(left-(total-30))'),'화면 시계 글과 같은 셈');}
