// 2026-11-25 사람 화면 UI 점검: 두 신청자가 같은 기록을 근거로 내면 근거가 "8건"처럼 부풀려졌다. 같은 글은 한 번만 들어가는지 확인.
// 사용: node evidence_dedupe_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=111;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='plan';
for(const p of s.players){p.location='hall';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
const [A,B,T]=s.players;const same='다온이 나래를 단검으로 공격했습니다.';
const ka=C.learn(s,A.id,same,T.id,'직접 목격','observed'),ka2=C.learn(s,A.id,same,T.id,'직접 목격','observed'),kb=C.learn(s,B.id,same,T.id,'직접 목격','observed'),kb2=C.learn(s,B.id,'다온의 장화는 크다.',T.id,'직접 조사','observed');
s.plans={[A.id]:{type:'file',target:T.id,reason:'시험',facts:[ka.id,ka2.id]},[B.id]:{type:'file',target:T.id,reason:'시험',facts:[kb.id,kb2.id]}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};
C.resolveBig(s,rng);const c=s.cases.find(c=>c.target===T.id&&!c.caught);
ok(!!c,'재판 신청이 생김');const texts=(c?.evidence||[]).map(e=>e.text);
ok(texts.length===2&&new Set(texts).size===2,'같은 글은 한 번만: 근거 '+texts.length+'건 · '+texts.join(' | '));
const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(ui.includes("return kn===k.source?'':' · '+kn;"),'근거 머리 글에서 출처와 같은 갈래 이름(직접 목격 · 직접 목격)을 되풀이하지 않음');
ok(ui.includes('최근 기록이 위에 있습니다.')&&ui.includes("p.known.map((k,i)=>[k,i]).reverse()"),'수첩: 최근 기록이 위, 번호는 그대로');
