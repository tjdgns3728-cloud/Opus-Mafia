// ③-1: 술통·약상자·종탑 아래도 광차와 같은 방식인지 확인(소문은 판마다 다르고, 들은 사람에게만 "살핀다"가 생기며, 결과는 판정이 정함). 아이의 목격담도 판마다 다른지. 사용: node spots_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=23;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const hi=()=>0.99;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const seq=list=>{let i=0;return ()=>list[Math.min(i++,list.length-1)];};
const game=()=>{const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';s.scenario.discovered=true;for(const q of s.players){q.used={big:false,small:false};q.location='hall';q.houseId=null;q.hidden=false;}return s;};
const SP={barrel:'tavern',medbox:'clinic',chapel:'chapel'};
const find=(k,want)=>{for(let i=0;i<500;i++){const s=game();if(s.scenario.spots.includes(k)===want)return s;}return null;};
const opt=(s,p,k)=>S.choices(s,p,'small').find(a=>a.sceneKey==='search:'+k);
const mine=(s,p)=>s.feed.filter(e=>e.to.includes(p.id)).map(e=>String(e.text)).join(' / ');

// 1. 소문은 네 곳 모두 판마다 다르다
const tally={};for(let i=0;i<400;i++){const s=game();for(const k of ['cart','barrel','medbox','chapel']){const has=s.scenario.spots.includes(k);const t=(tally[k+(has?'+':'-')]??=[0,0]);t[s.scenario.rumor[k]?0:1]++;}}
for(const k of ['barrel','medbox','chapel']){const y=tally[k+'+'],n=tally[k+'-'];ok(y[0]&&y[1]&&n[0]&&n[1]&&y[0]/(y[0]+y[1])>n[0]/(n[0]+n[1]),k+': 있어도 말 안 하는 판, 없어도 말하는 판이 모두 있고, 있을 때 더 자주 말함 (있음 '+y[0]+'/'+y[1]+', 없음 '+n[0]+'/'+n[1]+')');}

// 2. 아이의 목격담도 판마다 다르다(대개 처음 숨긴 곳, 가끔 엉뚱한 곳)
{let right=0,wrong=0;for(let i=0;i<300;i++){const s=game();(s.scenario.rumor.child===s.scenario.spots[0]?right++:wrong++);}ok(right>wrong&&wrong>0,'아이는 대개 처음 숨긴 곳을 말하지만 엉뚱한 곳을 말하는 판도 있음 (맞음 '+right+' / 엉뚱함 '+wrong+')');}

// 3. 세 곳 모두: 들은 사람에게만 생기고, 성공하면 찾거나 비었음을 알고, 실패하면 판정에 따른 일이 생긴다
for(const [k,place] of Object.entries(SP)){
 {const s=find(k,true),[t,u]=s.players.filter(p=>p.team==='town'),m=s.players.find(p=>p.team==='mafia');for(const p of [t,u,m])p.location=place;
  ok(!opt(s,t,k),k+': 그 자리 이야기를 듣기 전에는 "살핀다"가 없음');
  t.npcHeard=['lead:'+k];m.npcHeard=['lead:'+k];ok(!!opt(s,t,k)&&!opt(s,u,k)&&!opt(s,m,k),k+': 들은 시민에게만 생김(듣지 않은 시민·마피아에게는 없음)');
  for(let i=0;i<8;i++)S.investigate(s,u,hi);ok(!u.storyKnown.some(x=>/^(cache:|spot:)/.test(x)),k+': 현장 수색만으로는 드러나지 않음');
  S.resolve(s,t,opt(s,t,k),hi);ok(/폭약 \d개입니다/.test(mine(s,t))&&S.choices(s,t,'big').some(a=>a.sceneKey==='take'),k+': 성공하면 폭약을 찾고 "발견한 폭약 가져가기"가 생김');
  ok(!opt(s,t,k),k+': 찾은 뒤에는 다시 나오지 않음');}
 {const s=find(k,false),t=s.players.find(p=>p.team==='town');t.location=place;t.npcHeard=['lead:'+k];S.resolve(s,t,opt(s,t,k),hi);
  ok(t.known.some(x=>/비어 있었다|약병만 있었다|파낸 자국/.test(String(x.text)))&&!opt(s,t,k),k+': 비었으면 비었다는 것을 알고 다시 나오지 않음');}
 {const s=find(k,true),[t,u]=s.players.filter(p=>p.team==='town');t.location=u.location=place;t.npcHeard=['lead:'+k];t.stats.observe=0;/* 실패 장면을 만들려고 관찰을 낮춘다(관찰이 높으면 주사위 1에도 성공) */
  S.resolve(s,t,opt(s,t,k),seq([0.01,0.2]));ok(u.known.some(x=>/뒤지는 것을 봤다|파는 것을 봤다/.test(String(x.text))),k+': 실패해서 같은 자리 사람이 봄');
  s.epoch++;S.resolve(s,t,opt(s,t,k),seq([0.01,0.6]));ok((s.scenario.traces||[]).some(x=>x.where===place&&x.who===t.id),k+': 실패해서 손자국이 남음');}}
