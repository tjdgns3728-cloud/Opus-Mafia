// 제안(사용자 허락 전, proposal/judgment-and-trial 브랜치): 탐정 +2, 연속 실패 보정, 표결 첫 30초 최종 변론. 사용: node proposal_judgment_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');eval(src.replace(/\}\)\(\);\s*$/,'globalThis.__v={voteDone};})();'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,V=globalThis.__v;let seed=141;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}return s;};
const roll=(s,P,T,r)=>{P.used={big:false,small:false};const n0=s.feed.length;C.smallAct(s,P.id,{type:'investigate',target:T.id},()=>r);return s.feed.slice(n0).find(e=>e.roll?.label==='인물 조사')?.roll;};
{const s=fresh(),D=s.players.find(p=>p.role==='detective')||s.players[0];D.role='detective';const T=s.players.find(p=>p.id!==D.id);const r=roll(s,D,T,0.5);ok(r&&r.terms.some(t=>t.label==='탐정 · 사람을 잘 파악함'&&t.value===2),'탐정 조사 +2');}
{const s=fresh(),P=s.players.find(p=>!['detective','sheriff'].includes(p.role)),T=s.players.find(p=>p.id!==P.id);P.stats.observe=0;
 const a=roll(s,P,T,0.01);s.epoch++;const b=roll(s,P,T,0.01);s.epoch++;const c=roll(s,P,T,0.01);s.epoch++;const d=roll(s,P,T,0.01);s.epoch++;const e=roll(s,P,T,0.01);
 const v=x=>x?.terms.find(t=>t.label==='연속 실패 보정')?.value||0;ok(v(a)===0&&v(b)===2&&v(c)===4&&v(d)===6&&v(e)===6,'연속 실패마다 +2, 최대 +6 ('+[a,b,c,d,e].map(v).join(',')+')');
 P.stats.observe=10;s.epoch++;const f=roll(s,P,T,0.99);s.epoch++;const g=roll(s,P,T,0.01);ok(f?.success&&v(g)===0,'성공하면 0으로 ('+v(f)+' 뒤 성공 → '+v(g)+')');}
{const s=fresh();s.stage='vote';s.opened=100;s.trial={id:'c1',target:'p0',votes:{}};for(const p of s.players.slice(1))s.trial.votes[p.id]='guilty';const waits=[];const r={state:s,engine:{time:110},after(sec,fn){waits.push(sec);},closePhase(){}};V.voteDone(r);ok(waits[0]===20,'모두 표를 내도 표결이 열린 뒤 30초까지는 기다림(10초에 다 냄 → 20초 뒤) · '+waits.join(','));}
// 제안 C3: 유죄가 투표한 사람(기권 포함)의 과반이어야 처형
{const mk=(g,n,a)=>{const s=fresh();s.stage='vote';const T=s.players[0];s.trial={id:'c1',target:T.id,by:s.players[1].id,reason:'시험',evidence:[],votes:{}};let k=1;for(let i=0;i<g;i++)s.trial.votes[s.players[k++].id]='guilty';for(let i=0;i<n;i++)s.trial.votes[s.players[k++].id]='innocent';for(let i=0;i<a;i++)s.trial.votes[s.players[k++].id]='abstain';s.cases.push({...s.trial,day:s.day,closed:false});C.judge(s);return s.verdict;};
 const a=mk(2,1,4),b=mk(4,1,2),c=mk(3,1,3);ok(a&&!a.guilty,'유죄 2·무죄 1·기권 4 → 무죄(과반 아님)');ok(b&&b.guilty,'유죄 4·무죄 1·기권 2 → 유죄');ok(c&&!c.guilty,'유죄 3·무죄 1·기권 3 → 무죄(run31 7일 같은 표)');}
// 제안 D1: 사람 이동 15초
ok(C.config.moveSeconds===15&&fs.readFileSync(path.join(dir,'20Interface.js'),'utf8').includes('15초 안에 정하지 않으면'),'사람 이동 시간 15초(설정과 화면 글)');
