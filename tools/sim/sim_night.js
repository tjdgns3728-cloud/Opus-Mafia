// 화면 없이 한 판을 끝까지 돌린다. 사용: node sim.js <저장소 경로> <seed> [timescale] [seats] [verbose]
// 사람 자리 하나(방을 만든 자리)는 글을 읽었다는 확인과 '선택 마치기'만 보낸다(행동은 기다리기). 나머지 자리는 게임의 규칙 진행(AI 꺼짐)으로 움직인다.
const {spawn}=require('child_process'),path=require('path');
const repo=process.argv[2],seed=Number(process.argv[3]||1),scale=Number(process.argv[4]||40),seats=Number(process.argv[5]||8),verbose=process.argv[6]==='v';
const web=path.join(repo,'game','webengine','server','room_host.js'),proj=path.join(repo,'game','games','noir-trpg');
const host=spawn(process.execPath,[web,proj,'--timescale',String(scale),'--seed',String(seed),'--hold','0','--ai','off'],{stdio:['pipe','pipe','inherit']});
let buf='',nextId=0;const waits=new Map(),logs=[];
host.stdout.setEncoding('utf8');host.stdout.on('data',c=>{buf+=c;for(let at;(at=buf.indexOf('\n'))>=0;){const line=buf.slice(0,at);buf=buf.slice(at+1);if(!line.trim())continue;let m;try{m=JSON.parse(line);}catch{continue;}if(m.log)logs.push(m.log);if(m.id!==undefined&&waits.has(m.id)){waits.get(m.id)(m.res);waits.delete(m.id);}if(m.ready!==undefined&&waits.has('ready')){waits.get('ready')(m);waits.delete('ready');}}});
const ask=req=>new Promise(ok=>{const id=++nextId;waits.set(id,ok);host.stdin.write(JSON.stringify({id,req})+'\n');});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const ready=await new Promise(ok=>waits.set('ready',ok));if(!ready.rules){console.log(JSON.stringify({seed,error:'rules',detail:ready.errors}));process.exit(1);}
 const made=await ask({op:'create',name:'사람'});const me={room:made.room,key:made.key};
 for(let i=1;i<seats;i++)await ask({op:'bot_add',...me});
 await ask({op:'start',...me});
 const t0=Date.now();let last=null,acked=0,sentReady='',stuckAt=Date.now(),sig='';
 while(Date.now()-t0<240000){
  const p=await ask({op:'news',...me,since:0,e:0});const v=p&&(p.view||p.state&&p.state.view||p.mine);
  if(!v){if(verbose)console.log('payload keys',Object.keys(p||{}));await sleep(200);continue;}
  last=v;
  const cur=[v.time,v.stage,v.readingStep,(v.feed||[]).length].join('|');if(cur!==sig){sig=cur;stuckAt=Date.now();if(verbose)console.log(cur);}
  if(v.result)break;
  if(Date.now()-stuckAt>30000)break;
  if(v.readingStep==='text'&&!(v.ai&&v.ai.pending)){const n=(v.feed||[]).filter(e=>!['speech','environment'].includes(e.kind)).at(-1)?.i||0;if(n!==acked||true){await ask({op:'act',...me,action:{type:'text-shown',last:n}});acked=n;}}
  else if(['small','plan'].includes(v.stage)){const k=v.epoch+':'+v.stage;if(sentReady!==k&&!v.ready){sentReady=k;await ask({op:'act',...me,action:{type:'ready',epoch:v.epoch,stage:v.stage}});}}
  await sleep(60);
 }
 const v=last||{};const people=v.people||[];
 const out={seed,seats,ended:!!v.result,winner:v.result?v.result.team:null,why:v.result?String(v.result.text||v.result.reason||'').slice(0,60):null,day:v.day,time:v.time,stage:v.stage,alive:people.filter(p=>p.hp>0).length,mafiaAlive:people.filter(p=>p.hp>0&&p.team==='mafia').length,mafiaTotal:people.filter(p=>p.team==='mafia').length,humanRole:v.me&&v.me.role,humanTeam:v.me&&v.me.team,humanAlive:v.me?v.me.hp>0:null,realSeconds:Math.round((Date.now()-t0)/1000),stuck:!v.result,logs:logs.slice(-3)};
 for(const e of (v.feed||[]).filter(e=>e.kind==='speech'||/본거지|의논|불침번|숨|잠자리|아침의 첫 이동|오늘 밤/.test(e.text||'')))console.log(e.time,'|',e.kind,'|',(e.name?e.name+': ':'')+String(e.text).slice(0,110));console.log(JSON.stringify({winner:out.winner,stuck:out.stuck}));host.stdin.end();setTimeout(()=>process.exit(0),200);
})();
