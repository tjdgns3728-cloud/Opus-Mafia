// 2026-11-25 사용자 허락("C2·C3·D1부터"): 표결 첫 30초 최종 변론(C2), 유죄가 투표한 사람(기권 포함)의 과반이어야 처형(C3), 사람 이동 15초(D1). 사용: node trial_rules_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src.replace(/\}\)\(\);\s*$/,'globalThis.__v={voteDone};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,V=globalThis.__v;let seed=141;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}return s;};
// C2
{const s=fresh();s.stage='vote';s.opened=100;s.trial={id:'c1',target:'p0',votes:{}};for(const p of s.players.slice(1))s.trial.votes[p.id]='guilty';const waits=[];const r={state:s,engine:{time:110},after(sec,fn){waits.push(sec);},closePhase(){}};V.voteDone(r);ok(waits[0]===20,'모두 표를 내도 표결이 열린 뒤 30초까지는 기다림(10초에 다 냄 → 20초 뒤) · '+waits.join(','));}
{const s=fresh();s.stage='vote';s.opened=100;s.trial={id:'c1',target:'p0',votes:{}};for(const p of s.players.slice(1))s.trial.votes[p.id]='guilty';const waits=[];const r={state:s,engine:{time:150},after(sec,fn){waits.push(sec);},closePhase(){}};V.voteDone(r);ok(waits[0]===1,'30초가 지난 뒤 모두 내면 곧 끝남(1초 뒤) · '+waits.join(','));}
{const s=fresh();s.stage='vote';s.opened=100;s.trial={id:'c1',target:'p0',votes:{p1:'guilty'}};const waits=[];const r={state:s,engine:{time:150},after(sec,fn){waits.push(sec);},closePhase(){}};ok(V.voteDone(r)===false&&!waits.length,'표가 다 모이지 않으면 일찍 끝내지 않음');}
// C3
{const mk=(g,n,a)=>{const s=fresh();s.stage='vote';const T=s.players[0];s.trial={id:'c1',target:T.id,by:s.players[1].id,reason:'시험',evidence:[],votes:{}};let k=1;for(let i=0;i<g;i++)s.trial.votes[s.players[k++].id]='guilty';for(let i=0;i<n;i++)s.trial.votes[s.players[k++].id]='innocent';for(let i=0;i<a;i++)s.trial.votes[s.players[k++].id]='abstain';s.cases.push({...s.trial,day:s.day,closed:false});C.judge(s);return {v:s.verdict,T,s};};
 const a=mk(2,1,4),b=mk(4,1,2),c=mk(3,1,3),d=mk(4,3,0);ok(a.v&&!a.v.guilty&&a.T.alive!==false,'유죄 2·무죄 1·기권 4 → 무죄(과반 아님), 살아 있음');ok(b.v&&b.v.guilty,'유죄 4·무죄 1·기권 2 → 유죄');ok(c.v&&!c.v.guilty,'유죄 3·무죄 1·기권 3 → 무죄(run31 7일 같은 표)');ok(d.v&&d.v.guilty,'유죄 4·무죄 3 → 유죄(기권 없음)');
 ok(a.s.feed.some(e=>/무죄, 풀려남/.test(e.text||'')),'과반이 아니면 판결 글도 "무죄, 풀려남"');}
{const t=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok((t.match(/투표한 사람\(기권 포함\)의 과반이면 처형/g)||[]).length===2,'규칙 글 두 곳에 과반 조건');ok(!t.includes('(모두 표를 내면 바로 끝)'),'"모두 표를 내면 바로 끝"만 적힌 글 없음');ok(t.includes('첫 30초 뒤 모두 표를 내면 끝'),'표결 단계 이름에 첫 30초');}
// D1
ok(C.config.moveSeconds===15&&fs.readFileSync(path.join(dir,'20Interface.js'),'utf8').includes('15초 안에 정하지 않으면'),'사람 이동 시간 15초(설정과 화면 글)');
