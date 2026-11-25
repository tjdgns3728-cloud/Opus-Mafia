// 2026-11-25 사용자: "이건 상대방과 대결해야하는 부분이라 고정 난이도이면 안됩니다. 단순히 탐정이 보정이 높아야할 필요도 없고요"
// 인물 조사 = 내 d10+관찰(+시야·조사 직업) 대 상대 d10+은신, 같으면 실패. 현장 수색은 난이도 12 그대로. 사용: node investigate_opposed_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const w=fs.readFileSync(path.join(dir,'00World.js'),'utf8'),ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=313;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=(loc='hall')=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location=loc;p.houseId=null;p.hidden=false;p.tired=false;p.used={big:false,small:false};}return s;};
const inv=(s,P,T,r=rng)=>{P.used={big:false,small:false};const n0=s.feed.length;C.smallAct(s,P.id,{type:'investigate',target:T.id},r);return s.feed.slice(n0).find(e=>e.roll?.label==='인물 조사')?.roll;};
const pick=(s,not)=>s.players.find(p=>!not.includes(p.role));
// 1 대결 결과
{const s=fresh(),P=pick(s,['sheriff','consigliere']),T=s.players.find(p=>p!==P);const r=inv(s,P,T);
 ok(r&&r.kind==='opposed'&&r.label==='인물 조사'&&r.actor.statKey==='observe'&&r.opponent.statKey==='agility'&&r.actor.who===P.id&&r.opponent.who===T.id,'인물 조사는 대결: 내 관찰 대 상대 은신');
 ok(r&&r.actor.difficulty===null&&r.success===(r.actor.total>r.opponent.total),'고정 난이도 없음, 성공은 내가 더 높을 때');}
// 2 같으면 실패
{const s=fresh(),P=pick(s,['sheriff','consigliere']),T=s.players.find(p=>p!==P);P.stats.observe=6;T.stats.agility=6;const r=inv(s,P,T,()=>0.55);
 ok(r&&r.tie===true&&r.success===false,'합계가 같으면 실패 (합계 '+(r&&r.actor.total)+' : '+(r&&r.opponent.total)+')');
 const before=P.known.length;ok(!P.known.slice(before).some(k=>/몸 상태/.test(k.text)),'같으면 몸 상태를 알아내지 못함');}
// 3 어둠은 조사하는 쪽에
{const s=fresh(),P=s.players[0],T=s.players[1];P.role='mafioso';P.team='mafia';s.turn=2;const r=inv(s,P,T);/* 밤에 시민은 작은 행동을 못 하므로 마피아(조직원, 조사 직업 아님)로 */
 ok(r&&r.actor.terms.some(t=>t.label==='밤의 시야'&&t.value===-2)&&!r.opponent.terms.length,'밤의 시야 -2는 조사하는 쪽에만');}
{const s=fresh('warehouse'),P=pick(s,['sheriff','consigliere']),T=s.players.find(p=>p!==P);P.items.flashlight=0;const r=inv(s,P,T);
 ok(r&&r.actor.terms.some(t=>/어두운 시야/.test(t.label)),'어두운 장소의 시야 보정도 그대로');}
// 4 보안관·조언자 +3 그대로, 탐정은 추가 보정 없음
{const s=fresh(),P=s.players[0],T=s.players[1];P.role='sheriff';const r=inv(s,P,T);ok(r&&r.actor.terms.some(t=>t.label==='조사에 익숙한 직업'&&t.value===3),'보안관 +3 그대로');}
{const s=fresh(),P=s.players[0],T=s.players[1];P.role='consigliere';const r=inv(s,P,T);ok(r&&r.actor.terms.some(t=>t.label==='조사에 익숙한 직업'&&t.value===3),'조언자 +3 그대로');}
{const s=fresh(),P=s.players[0],T=s.players[1];P.role='detective';const r=inv(s,P,T);ok(r&&!r.actor.terms.some(t=>t.value>0),'탐정은 추가 보정 없음(사용자: 탐정 보정이 높을 필요 없음)');}
// 5 상대 은신이 결과를 바꿈
{let lo=0,hi=0;const N=400;for(let i=0;i<N;i++){const s=fresh(),P=pick(s,['sheriff','consigliere']),T=s.players.find(p=>p!==P);P.stats.observe=6;T.stats.agility=2;if(inv(s,P,T)?.success)lo++;const s2=fresh(),P2=pick(s2,['sheriff','consigliere']),T2=s2.players.find(p=>p!==P2);P2.stats.observe=6;T2.stats.agility=9;if(inv(s2,P2,T2)?.success)hi++;}
 ok(lo>hi+N*0.3,'은신 낮은 상대가 훨씬 쉬움 (은신 2: '+lo+'/'+N+', 은신 9: '+hi+'/'+N+')');}
// 6 현장 수색은 난이도 12 그대로
ok(w.includes("check(p,'observe',rng,{label:'현장 수색',dc:12,terms:[...sightTerms(s,p)]})"),'현장 수색은 고정 난이도 12 그대로(코드)');
{const s=fresh('tavern'),P=s.players[0],T=s.players[1];s.events.push({id:'ev1',type:'attack',actor:T.id,target:s.players[2].id,location:'tavern',day:3,turn:0,time:'3일째 낮',weapon:'knife'});P.used={big:false,small:false};const n0=s.feed.length;C.smallAct(s,P.id,{type:'evidence'},rng);const r=s.feed.slice(n0).find(e=>e.roll)?.roll;
 ok(r&&r.kind==='check'&&r.difficulty===12,'현장 수색은 대결이 아니라 고정 난이도 12 판정 그대로 ('+(r&&r.kind)+' '+(r&&r.label)+' '+(r&&r.difficulty)+')');}
// 7 사람 화면·AI 화면: 숫자 없이 대결 결과만
{const s=fresh(),P=pick(s,['sheriff','consigliere']),T=s.players.find(p=>p!==P);inv(s,P,T);const v=C.view(s,P.id),fr=v.feed.filter(e=>e.roll).at(-1)?.roll;
 ok(fr&&fr.kind==='contest'&&fr.label==='인물 조사'&&fr.side==='actor'&&!('total' in fr)&&!('actor' in fr),'사람 화면 기록: 대결 결과만(주사위·능력치·합계 없음)');
 const scr=NS.read(v);ok(/인물 조사 · (크게|여유 있게|아슬아슬하게) (이김|밀림)|인물 조사 · 막상막하/.test(scr.text),'AI 화면에도 같은 대결 결과 글');
 const tv=C.view(s,T.id);ok(!tv.feed.some(e=>e.roll&&e.roll.label==='인물 조사'),'조사당한 사람에게는 판정이 보이지 않음(전과 같음)');}
// 8 화면 글
ok(ui.includes('인물 조사는 내 관찰 대 상대 은신 대결(같으면 실패)')&&!ui.includes('인물 조사 난이도14')&&!ui.includes('시야 ≥ 14'),'규칙 글·조사 안내에 고정 난이도 14 없음, 대결로 설명');
ok(ui.includes("investigate:'조사하기: 내 d10 + 관찰 + 시야(보안관·조언자는 +3) 대 상대 d10 + 은신의 대결입니다."),'조사 판정 안내: 관찰 대 은신');
