// 리스의 마지막 단서가 범인으로 이어지는지: 범인 둘, 판마다 단서 종류, 장화 크기, 조사하기로 짝 맞추기, 흔적 감추기. 사용: node reese_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라'];
function game(seed){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);s.rng=rng;return s;}
const sure=()=>0.99;
// 1. 범인 둘(대행자 먼저), 판마다 단서 종류가 달라짐, 장화 크기
{const types=new Set();let fine=true;for(let i=1;i<=30;i++){const s=game(i*13),R=s.scenario.reese,[A,B]=R.killers.map(id=>C.find(s,id));types.add(R.clue);if(!A||A.team!=='mafia'||A.boots!=='big'||A.reeseMark?.type!==R.clue||(B&&(B.team!=='mafia'||B.boots!=='small')))fine=false;if(s.players.some(p=>!['big','mid','small'].includes(p.boots)))fine=false;const mf=s.players.find(p=>p.role==='mafioso');if(mf&&A.id!==mf.id)fine=false;}
 ok(fine,'범인은 마피아 둘(대행자가 먼저), 큰 장화·작은 장화, 첫 범인에게 몸의 흔적');ok(types.size===2,'판마다 단서 종류가 달라짐: '+[...types].join(', '));}
// 2. 진료소에서 리스의 마지막 흔적을 찾고, 의사는 처음부터 안다
{const s=game(7);const p=s.players.find(p=>p.team==='town'&&p.role!=='doctor');p.location='clinic';S.investigate(s,p,sure);ok(p.storyKnown.includes('reese-last'),'진료소 현장 수색으로 리스의 마지막 흔적을 찾음');const d=s.players.find(p=>p.role==='doctor');if(d)ok(d.storyKnown.includes('reese-last')&&s.feed.some(e=>e.to.includes(d.id)&&/리스 시신 오른손|리스 손톱 밑/.test(e.text)),'의사는 처음부터 앎');}
// 3. 조사하기로 범인의 몸에서 짝을 찾는다. 단서를 아는 사람에게만 무엇과 맞는지 덧붙는다
{const s=game(11);const A=C.find(s,s.scenario.reese.killers[0]),town=s.players.filter(p=>p.team==='town'),[v,w]=town;/* 2026-11-25 인물 조사가 관찰 대 은신 대결이 됨(사용자 결정): 아래 조사는 조사하는 쪽 주사위 10, 상대 1이 나오게 함 */s.day=2;s.turn=0;s.stage='small';for(const p of s.players){p.location='hall';p.hidden=false;p.used={big:false,small:false};}
 v.storyKnown.push('reese-last','footprints');C.smallAct(s,v.id,{type:'investigate',target:A.id},(()=>{let n=0;return ()=>(n++%2===0?0.99:0.0);})());const tv=s.feed.filter(e=>e.to.includes(v.id)&&/의 몸가짐:/.test(e.text)).map(e=>e.text).join(' ');
 ok(/(단추 하나가 떨어져|긁힌 상처)/.test(tv)&&/(리스가 쥐고 있던 단추|손톱자국 모양)/.test(tv)&&/큰 발자국과 크기가 맞습니다/.test(tv),'단서를 아는 사람: 몸의 흔적과 발자국이 맞는다고 보임');ok(v.known.some(k=>/의 몸가짐:/.test(k.text)),'수첩에 남아 재판 근거로 쓸 수 있음');
 w.storyKnown=[];C.smallAct(s,w.id,{type:'investigate',target:A.id},(()=>{let n=0;return ()=>(n++%2===0?0.99:0.0);})());const tw=s.feed.filter(e=>e.to.includes(w.id)&&/의 몸가짐:/.test(e.text)).map(e=>e.text).join(' ');ok(/(단추 하나가 떨어져|긁힌 상처)/.test(tw)&&!/리스가/.test(tw)&&!/발자국/.test(tw),'단서를 모르는 사람: 흔적만 보이고 무엇과 맞는지는 모름');
 const inno=town.find(p=>p.boots==='mid');if(inno){const u=town.find(p=>p.id!==v.id&&p.id!==inno.id&&p.id!==w.id)||w;u.used={big:false,small:false};u.storyKnown=['reese-last','footprints'];C.smallAct(s,u.id,{type:'investigate',target:inno.id},(()=>{let n=0;return ()=>(n++%2===0?0.99:0.0);})());const tu=s.feed.filter(e=>e.to.includes(u.id)&&/의 몸가짐:/.test(e.text)).map(e=>e.text).join(' ');ok(/보통 크기의 장화/.test(tu)&&!/(단추|긁힌)/.test(tu),'범인이 아닌 사람에게는 그런 흔적이 없음');}}
// 4. 범인은 흔적을 감출 수 있지만 완전히 지워지지 않는다
{const s=game(19);const A=C.find(s,s.scenario.reese.killers[0]);s.day=2;s.turn=0;s.stage='small';const opt=S.choices(s,A,'small').find(a=>a.sceneKey==='hideMark');ok(!!opt,'범인에게 "흔적 감추기"가 보임: '+(opt?.label||'없음'));S.resolve(s,A,opt,s.rng);ok(A.reeseMark.hidden,'감추면 흔적이 바뀜');const v=s.players.find(p=>p.team==='town');v.storyKnown=['reese-last'];ok(/(하나만 새것|붕대를 감고)/.test(S.bodyMarks(s,v,A)),'감춘 뒤에는 "하나만 새것"이나 "붕대"로 보임');ok(!S.choices(s,A,'small').some(a=>a.sceneKey==='hideMark'),'한 번만 감출 수 있음');}
