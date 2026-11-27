// 2026-11-28: 폭약은 2026-11-27(d7789e4)부터 집·본거지를 뺀 어디에나 설치한다. 화면 글에 "갱도에만"이 남지 않았는지,
// 마피아가 보는 폭약 위치가 설치한 장소 이름으로 나오는지 본다.
// 사용: node bomb_text_anywhere_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const flow=fs.readFileSync(path.join(dir,'08StoryFlow.js'),'utf8'),ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');
for(const old of ['갱도에 설치한 폭약은','갱도 안쪽에 설치된 것이','갱도에 폭약을 설치하면','갱도에서 일을 벌','누가 갱도에 모일지'])ok(!flow.includes(old),'이야기 글에 "'+old+'" 없음');
for(const old of ['몰래 꺼내기 판정(12','갱도에 폭약을 설치하고'])ok(!ui.includes(old),'화면 코드에 "'+old+'" 없음');
// 회관에 설치한 뒤 마피아가 보는 "폭약 위치"(bombWhere는 내보내지 않으므로 그 함수 글만 떼어 부름)
let x=41;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);
const q=s.scenario,m=s.players.find(o=>o.team==='mafia');q.discovered=true;q.bombs=[{id:'d0',where:'armed'},{id:'d1',where:'chapel'}];q.fuse={status:'armed',by:m.id,armedEpoch:s.epoch,place:'hall'};
const body=flow.split(/\r?\n/).find(l=>l.startsWith('function bombWhere(s,p){'));ok(!!body,'bombWhere 자리 있음');
const bw=new Function('C','q','s','p',body+'\nreturn bombWhere(s,p);')(C,()=>q,s,m);
ok(bw.includes('회관에 설치된 것이 1개'),'회관에 설치하면 마피아의 폭약 위치: '+bw);
// 밤에 회관에 실제로 설치한 뒤 마피아에게 뜨는 이야기 글(armed)
{let y=47;const r2=()=>{y=(y*16807)%2147483647;return y/2147483647;};const g=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),r2);S.start(g,r2);S.afterGathering?.(g);g.rng=r2;
 const mm=g.players.find(o=>o.team==='mafia');g.day=2;g.turn=2;for(const p of g.players)if(p.team==='town'){p.location='home';p.houseId=p.id;}
 mm.location='hall';g.scenario.bombs.forEach((b,i)=>b.where=i<1?'carry:'+mm.id:'hideout');mm.items.dynamite=1;S.resolve(g,mm,{type:'scene',sceneKey:'arm'},r2);
 const story=String(globalThis.NoirStory.roleStory(g,mm)||'');ok(/마을 회관에서 도화선이 타들어/.test(story)&&!/갱도/.test(story.split('\n').slice(1).join(' ')),'회관에 설치한 마피아의 이야기 글: '+story.replace(/\n/g,' ').slice(0,90));}
