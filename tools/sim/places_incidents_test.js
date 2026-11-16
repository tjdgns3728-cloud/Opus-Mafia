// 새 장소 네 곳의 사건(2026-11-16): 정해진 때에 그 장소에서 열리는지, 판마다 내용이 다른지, 효과와 실패 결과, 아무도 손대지 않았을 때. 사용: node places_incidents_test.js <저장소 경로>
const path=require('path'),fs=require('fs');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,D=globalThis.NoirStory,M=D.merchant;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};const hi=()=>0.99,lo=()=>0.01;
const game=(n=11)=>{let seed=n;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s);S.afterGathering?.(s);
 for(const q of s.players){q.used={big:false,small:false};q.hidden=false;}return s;};
const at=(s,day,turn)=>{s.day=day;s.turn=turn;s.stage='plan';s.epoch=(day-1)*3+turn+1;D.refreshIncidents(s);};
const opts=(s,p,slot)=>D.incidentChoices(s,p,slot);
const fed=(s,p)=>s.feed.filter(e=>e.to.includes(p.id)).map(e=>String(e.text)).join(' | ');
const town=s=>s.players.filter(p=>p.team==='town');
const IDS=['vagrant','goldSack','officeBreakIn','unionVote','duesBox','satchel'];
// 판마다 열리는 조건이 맞는 판을 고른다
const find=(test,from=1)=>{for(let i=from;i<400;i++){const s=game(i);if(test(s))return s;}return null;};
const open=(s,id)=>{const def=globalThis.BlackRidgeIncidents.find(e=>e.id===id);return D.guard(s,def);};

// 1. 여섯 사건이 데이터에 있고, 장소는 새 장소 네 곳
{const L=globalThis.BlackRidgeIncidents;const got=IDS.map(id=>L.find(e=>e.id===id));ok(got.every(Boolean),'새 사건 여섯 개가 있음');ok(new Set(got.map(e=>e.place)).size===4&&got.every(e=>['rail','office','union','bridge'].includes(e.place)),'장소는 선로 옆·보안관 사무소·노조 사무실·협곡 다리');}
// 2. 판마다 있을 수도 없을 수도: 떠돌이·자루·털린 사무소·가방은 판마다 열리는지가 다르다
{const cnt={vagrant:0,goldSack:0,officeBreakIn:0,satchel:0},N=60;for(let i=1;i<=N;i++){const s=game(i*7);for(const k of Object.keys(cnt))if(open(s,k))cnt[k]++;}
 ok(Object.values(cnt).every(v=>v>0&&v<N),'판마다 있는 판과 없는 판이 모두 있음 '+JSON.stringify(cnt)+' / '+N);}
// 3. 판마다 내용이 다르다: 떠돌이가 본 것, 가방 안, 사무소 발자국
{const vs=new Set(),ss=new Set(),bs=new Set();for(let i=1;i<=40;i++){const s=game(i*13),p=s.players[0];const t=D.text(s,p,'{vagrantFact}|{satchelFact}|{breakInFact}').split('|');vs.add(t[0].slice(0,25));ss.add(t[1].slice(0,20));bs.add(t[2].slice(0,30));}
 ok(vs.size===3&&ss.size===3,'떠돌이가 본 것 '+vs.size+'가지, 가방 안 '+ss.size+'가지');ok(bs.size>=2,'사무소 창틀 발자국 크기가 판마다 다름('+bs.size+'가지)');}
// 4. 사무소 발자국은 실제로 마피아 한 명의 장화 크기와 같다(시작 때 정해 둔 사람)
{let fine=true;for(let i=1;i<=20;i++){const s=game(i*17),p=s.players[0],f=D.text(s,p,'{breakInFact}'),m=s.players.filter(o=>o.team==='mafia');const word={big:'크고 깊다',mid:'보통 크기다',small:'작고 얕다'};if(!m.some(o=>f.includes(word[o.boots])))fine=false;}ok(fine,'사무소 창틀 발자국은 마피아 가운데 한 명의 장화 크기');}
// 5. 떠돌이: 2일째 낮 2에 선로 옆에서 열리고, 아무도 손대지 않으면 다음 때에 떠난다
{const s=find(s=>open(s,'vagrant')),[t,u]=town(s);t.location=u.location='rail';at(s,2,0);ok(!opts(s,t,'small').some(o=>o.incident==='vagrant'),'2일째 낮 1에는 아직 없음');
 at(s,2,1);const ask=opts(s,t,'small').find(o=>o.incident==='vagrant'&&o.branch==='ask');ok(!!ask,'2일째 낮 2에 선로 옆에서 떠돌이에게 물을 수 있음');
 D.resolveIncident(s,t,ask,hi);ok(/떠돌이가 말합니다/.test(fed(s,u))&&u.known.some(k=>/떠돌이의 말/.test(k.text)),'물어본 말은 곁의 사람도 듣고 수첩에 남음');
 at(s,3,0);D.aftermath(s);ok(/떠돌이가 담요를 말아 쥐고/.test(fed(s,t))&&!opts(s,t,'small').some(o=>o.incident==='vagrant'),'아무도 내보내지 않아도 다음 때에 떠돌이는 떠남');}
// 6. 금 광석 자루: 챙기면 가진 물건이 되고 상인과의 거래가 끊긴다
{const s=find(s=>open(s,'goldSack')),[t]=town(s);t.location='rail';at(s,3,0);const m=M.state(s);m.credit[t.id]=2;
 const look=opts(s,t,'small').find(o=>o.incident==='goldSack'&&o.branch==='look');D.resolveIncident(s,t,look,hi);ok(t.known.some(k=>/금빛이 섞인 광석 자루/.test(k.text)),'자루를 살피면(관찰 판정) 금빛 광석이라는 기록이 남음');
 const take=opts(s,t,'big').find(o=>o.incident==='goldSack'&&o.branch==='take');D.resolveIncident(s,t,take,hi);
 const own=s.scenario.continuation.artifacts.find(a=>a.owner===t.id&&a.kind==='gold');ok(!!own&&M.credit(s,t)===0&&m.locked[t.id],'자루를 챙기면 가진 물건이 되고 상인 신용은 0으로 굳음');}
// 7. 털린 사무소: 회관에 알리면 모두가 듣는다
{const s=find(s=>open(s,'officeBreakIn')),[t,u]=town(s);t.location='office';u.location='tavern';at(s,3,0);
 const rep=opts(s,t,'big').find(o=>o.incident==='officeBreakIn'&&o.branch==='report');D.resolveIncident(s,t,rep,hi);ok(/보안관 사무소 창이 깨지고/.test(fed(s,u)),'회관에 알리면 다른 곳에 있던 사람도 소식을 들음');}
// 8. 노조 표결: 설득에 성공하면 내일 갱도가 열리고 상인 신용이 오른다. 표결 전에 갱도가 열려 있으면 열리지 않는다
{const s=game(23),[t]=town(s);t.location='union';s.scenario.mineClosed=true;at(s,3,1);const re=opts(s,t,'big').find(o=>o.incident==='unionVote'&&o.branch==='reopen');ok(!!re,'갱도가 닫혀 있으면 3일째 낮 2에 노조 사무실에서 표결이 열림');
 D.resolveIncident(s,t,re,hi);ok(s.scenario.continuation.flags.reopenTomorrow===4&&M.credit(s,t)===1,'설득에 성공하면 다음 날 갱도가 다시 열리기로 하고 상인 신용 +1');
 const s2=game(29),[t2]=town(s2);t2.location='union';s2.scenario.mineClosed=false;at(s2,3,1);ok(!opts(s2,t2,'big').some(o=>o.incident==='unionVote'),'갱도가 이미 열려 있으면 표결은 열리지 않음');}
// 9. 회비 상자: 노조에 새 돈이 들어갔으면 새 지폐 다발이 보인다
{const s=game(31),[t]=town(s);t.location='union';at(s,4,0);const a=D.text(s,t,'{duesFact}');s.scenario.continuation.flags.unionFunded=true;const b=D.text(s,t,'{duesFact}');ok(/장부의 금액과 맞았다/.test(a)&&/새 지폐 다발/.test(b),'회비 상자는 노조 기금이 들어가면 새 지폐 다발, 아니면 장부와 맞음');
 ok(opts(s,t,'small').some(o=>o.incident==='duesBox'&&o.branch==='open'),'4일째 낮 1에 노조 사무실에서 회비 상자를 살필 수 있음');}
// 10. 다리 밑 가방: 실패하면 미끄러져 체력 -2(최소 1), 가방은 그대로. 성공하면 꺼낸다
{const s=find(s=>open(s,'satchel')),[t]=town(s);t.location='bridge';t.hp=10;at(s,3,0);const climb=()=>opts(s,t,'big').find(o=>o.incident==='satchel'&&o.branch==='climb');
 D.resolveIncident(s,t,climb(),lo);ok(t.hp===8&&/발이 미끄러져/.test(fed(s,t))&&!!climb(),'못 내려가면 미끄러져 체력 -2, 가방은 아직 걸려 있음');
 t.hp=2;D.resolveIncident(s,t,climb(),lo);ok(t.hp===1,'떨어져도 체력은 1 아래로 내려가지 않음');
 D.resolveIncident(s,t,climb(),hi);ok(t.known.some(k=>/협곡 다리 밑 가방/.test(k.text))&&!climb(),'내려가 가방을 꺼내면 안의 것이 수첩에 남고 사건이 끝남');}
// 11. 남은 해석 문장을 뺐다
{const src=fs.readFileSync(path.join(dir,'06StoryDirector.js'),'utf8');ok(!/다른 곳에도 없다는 뜻은 아닙니다|새로운 신원 정보가 더해지지는 않습니다|플레이어 범행의 흔적으로 볼 수 없다/.test(src),'06의 해석 문장 세 개가 없음');
 const L=globalThis.BlackRidgeIncidents.filter(e=>IDS.includes(e.id));ok(!L.some(e=>/알 수 없|뜻하지|증거는 아닙|의심받|해야 합니다/.test(JSON.stringify(e))),'새 사건 글에 해석·조언 문장이 없음');}
