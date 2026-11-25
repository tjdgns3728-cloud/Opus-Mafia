// 제안(사용자 허락 전, proposal/partial-success 브랜치) A3: 인물 조사 부분 성공(난이도 14에 1~3 모자라면 몸 상태만). 사용: node proposal_partial_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const defs={};globalThis.WebEngine={room(){},Component:class{},define(n,c){defs[n]=c;}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=141;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}return s;};
// 주사위 6(rng 0.55)으로 관찰을 바꿔 합계를 맞춘다. 조사하는 사람은 조사 직업 보정이 없는 사람.
const run=(observe,{attacker=false}={})=>{const s=fresh(),P=s.players.find(p=>!['sheriff','consigliere','detective'].includes(p.role)),T=s.players.find(p=>p.id!==P.id);P.stats.observe=observe;T.bleeding=true;
 if(attacker){const V=s.players.find(p=>p.id!==P.id&&p.id!==T.id);s.events.push({id:'e-test',type:'attack',actor:T.id,target:V.id,location:'tavern',day:3,turn:0,time:'3일째 낮',weapon:'knife'});s.events.push({id:'e-test2',type:'attack',actor:V.id,target:T.id,location:'tavern',day:3,turn:0,time:'3일째 낮',weapon:'fist'});}
 const k0=P.known.length,n0=s.feed.length;C.smallAct(s,P.id,{type:'investigate',target:T.id},()=>0.55);const feed=s.feed.slice(n0),roll=feed.find(e=>e.roll?.label==='인물 조사')?.roll,known=P.known.slice(k0).map(k=>k.text);return {s,P,T,roll,feed:feed.map(e=>e.text||'').join('\n'),known};};
// 합계 = 6 + 관찰. 관찰 8 → 14(성공), 7 → 13, 5 → 11(부분), 4 → 10(실패)
{const a=run(7,{attacker:true});ok(a.roll&&a.roll.total===13&&a.roll.partial===true&&a.roll.success===false&&a.roll.partialFrom===11,'합계 13 → 부분 성공(성공은 아님) · 합계 '+a.roll?.total);
 ok(/부분 성공입니다\. 겉으로 보이는 몸 상태: 출혈\./.test(a.feed),'부분 성공 글에 몸 상태(출혈)');
 ok(a.known.some(t=>/몸 상태: 출혈/.test(t)),'부분 성공: 몸 상태를 수첩에');
 ok(!a.known.some(t=>/싸운 흔적|연결되는 증거|공격당한 상처/.test(t))&&!/최근 누군가와 싸운 흔적이 남아|공격당한 상처도/.test(a.feed),'부분 성공: 싸운 흔적·공격 증거·상처는 주지 않음');
 ok(!(a.P.hpSeen&&a.P.hpSeen[a.T.id]),'부분 성공: 체력은 주지 않음');}
{const b=run(5);ok(b.roll&&b.roll.total===11&&b.roll.partial===true,'합계 11 → 부분 성공(난이도 −3까지) · 합계 '+b.roll?.total);}
{const c=run(4);ok(c.roll&&c.roll.total===10&&!c.roll.partial&&!c.roll.success,'합계 10 → 실패 · 합계 '+c.roll?.total);ok(!c.known.some(t=>/몸 상태/.test(t))&&/제대로 알아보지 못했습니다/.test(c.feed),'실패: 몸 상태 없음, 지금과 같은 글');}
{const d=run(8,{attacker:true});ok(d.roll&&d.roll.success===true&&!d.roll.partial,'합계 14 → 성공 · 합계 '+d.roll?.total);ok(/최근 누군가와 싸운 흔적이 남아 있습니다/.test(d.feed)&&d.known.some(t=>/싸운 흔적|연결되는 증거/.test(t)),'성공은 지금처럼 싸운 흔적·증거까지');}
// 현장 수색은 바꾸지 않음
{const s=fresh(),P=s.players[1];P.stats.observe=4;const n0=s.feed.length;C.smallAct(s,P.id,{type:'evidence'},()=>0.55);const r=s.feed.slice(n0).find(e=>e.roll?.label==='현장 수색')?.roll;ok(!r||(!r.partial&&r.partialFrom==null),'현장 수색에는 부분 성공 없음');}
// 화면: 판정 상자와 규칙 글
{const UI=Object.values(defs).find(c=>c&&c.prototype&&typeof c.prototype.roll==='function');const a=run(7);let html='';try{html=UI.prototype.roll.call(Object.create(UI.prototype),a.roll);}catch(e){html='오류 '+e.message;}
 ok(/· 부분 성공/.test(html)&&/목표 난이도 14 이상이면 성공\(11~13은 부분 성공\)/.test(html),'판정 상자: "부분 성공"과 "11~13은 부분 성공"');
 const t=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(t.includes('1~3 모자라면 부분 성공으로 몸 상태(출혈·피곤함)만 알아냅니다.')&&t.includes('인물 조사 난이도14(11~13이면 부분 성공: 몸 상태만).'),'조사 안내 글과 규칙 글');}
