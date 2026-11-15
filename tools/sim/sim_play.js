// 사람 자리 하나가 화면에 보이는 선택지 가운데서 골라 실제로 행동하며 한 판을 끝까지 돌리고, 그 자리가 본 글을 모두 파일로 남긴다.
// 사용: node sim_play.js <저장소 경로> <seed> [timescale] [seats] [출력 파일]
// 글을 사람이 읽어 이상한 점(앞뒤가 안 맞는 이야기, 반복, 어색한 말)을 찾는 데 쓴다.
const {spawn}=require('child_process'),path=require('path'),fs=require('fs');
const repo=path.resolve(process.argv[2]||'.'),seed=Number(process.argv[3]||1),scale=Number(process.argv[4]||40),seats=Number(process.argv[5]||8),outFile=process.argv[6]||path.join(repo,'tools','sim','_play_'+seed+'.txt');
const scripts=path.join(repo,'game','games','noir-trpg','scripts');for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(scripts,f+'.js'));const C=globalThis.NoirTRPG;
const web=path.join(repo,'game','webengine','server','room_host.js'),proj=path.join(repo,'game','games','noir-trpg');
const host=spawn(process.execPath,[web,proj,'--timescale',String(scale),'--seed',String(seed),'--hold','0','--ai','off'],{stdio:['pipe','pipe','inherit']});
let buf='',nextId=0;const waits=new Map();let x=seed*7919%2147483647||1;const rnd=()=>{x=(x*16807)%2147483647;return x/2147483647;};const pick=a=>a[Math.floor(rnd()*a.length)];
host.stdout.setEncoding('utf8');host.stdout.on('data',c=>{buf+=c;for(let at;(at=buf.indexOf('\n'))>=0;){const line=buf.slice(0,at);buf=buf.slice(at+1);if(!line.trim())continue;let m;try{m=JSON.parse(line);}catch{continue;}if(m.id!==undefined&&waits.has(m.id)){waits.get(m.id)(m.res??m);waits.delete(m.id);}else if(m.ready&&waits.has('ready')){waits.get('ready')(m);waits.delete('ready');}}});
const ask=req=>new Promise(ok=>{const id=++nextId;waits.set(id,ok);host.stdin.write(JSON.stringify({id,req})+'\n');});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// 화면과 같은 방식으로 고를 수 있는 행동을 계산한다
function options(v,slot){const me=v.me,state={players:[me,...v.people.filter(p=>p.id!==me.id).map(p=>({...p,hidden:!p.here}))],turn:v.turn,stage:v.stage,epoch:v.epoch,day:v.day,cfg:v.cfg,trialDay:v.trialDay};try{return slot==='small'?[...C.choices(state,me.id,'small').filter(a=>a.type!=='wait'),...(v.sceneSmallChoices||[])]:[...C.choices(state,me.id,'big'),...(v.sceneChoices||[])];}catch(e){return [];}}
(async()=>{
 const ready=await new Promise(ok=>waits.set('ready',ok));if(!ready.rules){console.log(JSON.stringify({seed,error:'rules',detail:ready.errors}));process.exit(1);}
 const made=await ask({op:'create',name:'사람'});const me={room:made.room,key:made.key};
 for(let i=1;i<seats;i++)await ask({op:'bot_add',...me});
 await ask({op:'start',...me});
 const t0=Date.now();let last=null,done='',stuckAt=Date.now(),sig='';
 while(Date.now()-t0<300000){
  const p=await ask({op:'news',...me,since:0,e:0});const v=p&&(p.view||p.state&&p.state.view||p.mine);if(!v){await sleep(200);continue;}
  last=v;const cur=[v.time,v.stage,v.readingStep,(v.feed||[]).length].join('|');if(cur!==sig){sig=cur;stuckAt=Date.now();}
  if(v.result)break;if(Date.now()-stuckAt>30000)break;
  if(v.readingStep==='text'&&!(v.ai&&v.ai.pending)){const n=(v.feed||[]).filter(e=>!['speech','environment'].includes(e.kind)).at(-1)?.i||0;await ask({op:'act',...me,action:{type:'text-shown',last:n}});}
  else if(v.stage==='vote'&&v.trial&&!v.trial.vote&&v.me.id!==v.trial.target&&v.me.hp>0){await ask({op:'act',...me,action:{type:'vote',vote:pick(['guilty','innocent'])}});}
  else if(v.stage==='react'&&v.threats?.length&&!v.reaction){await ask({op:'act',...me,action:{type:'reaction',defense:pick(['dodge','block'])}});}
  else if(['small','plan'].includes(v.stage)&&v.me.hp>0&&!v.ready){const k=v.epoch+':'+v.stage;if(done!==k){done=k;
   if(!v.me.used?.small){const sm=options(v,'small');if(sm.length&&rnd()<.85)await ask({op:'act',...me,action:{type:'action',action:pick(sm),slot:'small',epoch:v.epoch,stage:v.stage}});}
   if(v.stage==='plan'&&!v.me.used?.big&&!v.plans){const bg=options(v,'big').filter(a=>a.type!=='wait');const pref=bg.filter(a=>['scene','move','investigate','track','heal','revive','protect','jail'].includes(a.type)||a.type==='attack'&&v.me.team==='mafia'&&v.turn===2);const a=(pref.length&&rnd()<.8?pick(pref):bg.length?pick(bg):{type:'wait'});await ask({op:'act',...me,action:{type:'action',action:a,slot:'big',epoch:v.epoch,stage:v.stage}});}
   await ask({op:'act',...me,action:{type:'ready',epoch:v.epoch,stage:v.stage}});}}
  await sleep(60);
 }
 const v=last||{};const lines=(v.feed||[]).map(e=>`[${e.time||''}${e.place?' · '+(C.places[e.place]?.short||e.place):''}] ${e.kind==='speech'?(e.name||'')+': ':''}${String(e.text||'').replace(/\n/g,' / ')}`);
 fs.writeFileSync(outFile,`seed ${seed} · ${v.me?.name} · ${C.roles[v.me?.role]?.name||v.me?.role} · ${v.me?.team} · 끝: ${v.result?v.result.team:'안 끝남'} ${v.time}\n`+lines.join('\n'));
 console.log(JSON.stringify({seed,role:v.me?.role,team:v.me?.team,ended:!!v.result,winner:v.result?.team,time:v.time,lines:lines.length,out:outFile}));host.stdin.end();setTimeout(()=>process.exit(0),200);
})();
