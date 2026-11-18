// 컴퓨터 자리의 판단(09Minds.js, 2026-11-18 사용자 요청): 직접 본 것·남의 근거·신용으로 의심을 세고, 마피아는 같은 편을 감싸는지 확인. 사용: node minds_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,M=globalThis.NoirMinds;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let seed=41;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s);S.afterGathering?.(s);
s.day=2;s.turn=0;for(const q of s.players){q.location='hall';q.hidden=false;q.filedDay=null;}
const mafia=s.players.filter(p=>p.team==='mafia'),town=s.players.filter(p=>p.team==='town');const [m1,m2]=mafia,[t1,t2,t3,t4,t5]=town;
// 판 상황을 직접 만든다: t1은 m1이 공격하는 것을 직접 봤다
const ev={id:'e'+(++s.serial),type:'attack',actor:m1.id,target:t5.id,day:2,turn:0,text:`${m1.name}이 ${t5.name}을 단검으로 공격했습니다.`};s.events.push(ev);
const seen={id:'k'+(++s.serial),text:ev.text,about:m1.id,source:'직접 목격',kind:'observed',time:'2일째 낮 1',event:ev.id};t1.known.push(seen);
// 1. 직접 본 공격
ok(M.suspicion(s,t1,m1.id).score>=8,'직접 공격을 본 시민은 공격자를 강하게 의심함');
const aim=M.fileTarget(s,t1);ok(aim?.target===m1.id&&aim.facts.includes(seen.id),'그 시민은 본 기록을 근거로 붙여 공격자를 고발하려 함');
ok(M.suspicion(s,t2,m1.id).score===0&&!M.fileTarget(s,t2),'아무것도 모르는 시민은 의심하지 않고 고발하지 않음');
// 2. 근거가 붙은 신청이 공고되면, 보지 못한 시민도 근거와 신용으로 판단한다
const mk=(by,target,reason,evidence=[])=>{const c={id:'c'+(++s.serial),day:s.day,closed:false,target,by,reason,reasons:[{by,text:reason}],evidence,support:[by],responses:{[by]:true},order:s.serial};s.cases.push(c);for(const o of C.alive(s)){o.knownCases??=[];o.knownCases.push(c.id);}return c;};
const c1=mk(t1.id,m1.id,seen.text,[{id:seen.id,by:t1.id,text:seen.text,source:seen.source,kind:'observed'}]);
ok(M.suspicion(s,t2,m1.id).score>=4,'근거(남의 직접 목격)가 붙은 신청을 본 시민은 피고를 의심함');
ok(M.consent(s,t2,c1)===true&&M.vote(s,t2,{target:m1.id})==='guilty','그 시민은 재판에 동의하고 유죄로 표를 냄');
// 3. 근거 없는 고발은 약하다
const c2=mk(t3.id,t4.id,'그냥 수상합니다.');
ok(M.suspicion(s,t2,t4.id).score<2&&M.consent(s,t2,c2)===false&&M.vote(s,t2,{target:t4.id})==='innocent','근거 없는 고발만으로는 동의하지 않고 무죄로 표를 냄');
// 4. 마피아는 같은 편을 감싸고 고발한 사람을 위협으로 본다
ok(M.consent(s,m2,c1)===false&&M.vote(s,m2,{target:m1.id})==='innocent','마피아는 같은 편의 재판에 반대하고 무죄로 표를 냄');
ok(M.vote(s,m2,{target:t4.id})==='guilty','마피아는 시민의 재판에는 유죄로 표를 냄');
ok(M.threat(s,m2,t1.id)>=8&&M.threat(s,m2,t3.id)===0,'같은 편을 근거 붙여 고발한 시민이 가장 큰 위협(고발 5 + 근거 3)');
ok(M.nightTarget(s,mafia,()=>0)?.id===t1.id,'밤 습격 대상으로 그 시민을 고름');
const counter=M.counterFile(s,m2,()=>0);ok(counter?.target===t1.id&&!counter.facts,'마피아는 같은 편을 고발한 시민을 근거 없이 되받아 고발하려 함');
// 5. 신용: 시민 t1이 마피아에게 거짓으로 고발당하면, t1은 고발한 마피아를 의심하고 그 사람의 말을 덜 믿는다
const c3=mk(m2.id,t1.id,counter.reason);
ok(M.trust(s,t1,m2.id)<=0.3,'거짓으로 고발당한 시민에게 고발한 사람의 신용이 떨어짐');
ok(M.suspicion(s,t1,m2.id).why.includes('나를 거짓으로 고발함'),'거짓으로 고발당한 시민은 고발한 사람을 의심함');
ok(M.consent(s,t1,c3)===false,'자기에 대한 신청에는 동의하지 않음');
ok(M.suspicion(s,t2,t1.id).score<2,'다른 시민은 근거 없는 되받아 고발만으로 피고를 의심하지 않음');
// 6. 신용이 오른다: 내가 직접 본 공격자를 고발한 사람
ok(M.trust(s,t1,t4.id)===1,'관계없는 사람의 신용은 그대로');
mk(t3.id,m1.id,'저 사람이 수상합니다.');ok(M.trust(s,t1,t3.id)>=1.3,'내가 직접 본 공격자를 고발한 사람의 신용이 오름');
// 7. 여럿 앞에서 붙잡힌 재판은 강하게, NPC의 폭약 고발은 약하게
const c4={...mk(t3.id,t4.id,'붙잡힘'),caught:true,caughtKind:'attack'};s.cases[s.cases.length-1]=c4;
ok(M.vote(s,t2,{target:t4.id})==='guilty','여럿 앞에서 공격하다 붙잡힌 재판은 유죄');
const c5={...mk(t3.id,t5.id,'폭약'),caught:true,caughtKind:'npc'};s.cases[s.cases.length-1]=c5;
ok(M.vote(s,t2,{target:t5.id})==='innocent','NPC의 폭약 고발만으로는 무죄(찾아낸 시민도 걸리므로)');
// 8. AI 자리 지시문에 붙는 글: 자기 시야 안의 것만, 다른 사람의 진영은 쓰지 않음
const b=M.brief(s,t2);ok(b.includes(m1.name)&&!/마피아|진영|godfather|mafioso/.test(b),'시민의 참고 판단에는 의심하는 사람과 까닭만 있고 진영은 없음');
ok(M.principles(m1).includes('같은 편')&&M.principles(t1).includes('신용'),'편마다 다른 판단 원칙');
