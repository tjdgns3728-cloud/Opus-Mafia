// 2026-11-28 사용자: "일단 폭약을 아예 다른 사람 집에 설치할 수 있게 해주시겠어요? 거기는 누군가 폭약을 설치해도 들킬 수 없잖아요? 자기집에 있는 경우 빼고 말이죠."
// 고른 것: 터질 때 집 앞에서 지키던 사람도 죽음.
// 남의 집 안에서만 설치(자기 집 안 됨), 설치는 그 집 안 사람만 봄, 터지면 그 집 안과 집 앞 사람이 죽음, 도화선은 그 집 안에서 찾고 끊음.
// 사용: node house_bomb_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라'];
function game(seed){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.rng=rng;return s;}
const armOpt=(s,m)=>S.choices(s,m,'big').find(a=>a.sceneKey==='arm');
const saw=(p,re)=>(p.known||[]).some(k=>re.test(String(k.text)))||false;
function setup(seed){const s=game(seed),m=s.players.find(p=>p.role==='godfather'),town=s.players.filter(p=>p.team==='town'),t=town[0];
 s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='hall';p.houseId=null;p.alley=null;p.used={big:false,small:false};}
 m.location='home';m.houseId=t.id;return {s,m,t,town};}
// 1. 설치 선택지: 남의 집 안에서만
{const {s,m,t}=setup(31);const a=armOpt(s,m);ok(a?.label===t.name+'의 집에 폭약 설치하기 · 다음 때가 끝나면 집 안·집 앞 사람 모두 죽음','남의 집 안: '+(a?.label||'(없음)'));
 m.houseId=null;ok(!armOpt(s,m),'자기 집에서는 설치 없음');
 m.houseId=t.id;m.alley='guard';ok(!armOpt(s,m),'남의 집 앞(지키기)에서는 설치 없음');m.alley=null;}
// 2. 집주인이 없으면 아무도 못 봄, 집주인이 집에 있으면 봄
{const {s,m,t,town}=setup(32),o=town[1];o.location='home';o.houseId=null;S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);
 ok(s.scenario.fuse?.status==='armed'&&s.scenario.fuse.place==='home'&&s.scenario.fuse.house===t.id,'도화선: 주택가 · '+t.name+'의 집');
 ok(!saw(t,/폭약을 설치/)&&!saw(o,/폭약을 설치/),'집주인은 회관, 이웃은 자기 집 → 아무도 설치를 못 봄');}
{const {s,m,t}=setup(33);t.location='home';t.houseId=null;S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);ok(saw(t,/폭약을 설치/),'집주인이 집에 있으면 설치를 봄');}
// 3. 다음 때(밤) 끝에 터짐: 그 집 안과 집 앞 지킴이는 죽고, 이웃·집 밖은 삶
{const {s,m,t,town}=setup(34);S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);ST.beforeAdvance(s);ok(s.scenario.fuse.status==='armed','설치한 낮이 끝날 때는 안 터짐');
 C.nextTurn(s);S.nextChapter(s);s.day=2;s.turn=2;const g=town[1],n=town[2],out=town[3];
 for(const p of town){p.location='home';p.houseId=null;p.alley=null;}g.houseId=t.id;g.alley='guard';out.alley='out';out.houseId=null;m.location='hideout';m.houseId=null;
 const visitor=s.players.find(p=>p.team==='mafia'&&p.id!==m.id);if(visitor){visitor.location='home';visitor.houseId=t.id;}
 ST.beforeAdvance(s);ok(s.scenario.fuse.status==='exploded','다음 때(밤)가 끝날 때 터짐');
 ok(t.hp===0&&t.deathCause,'집 안의 집주인 죽음');ok(g.hp===0,'집 앞에서 지키던 사람도 죽음(사용자 고름)');
 if(visitor)ok(visitor.hp===0,'그 집 안에 있던 다른 사람도 죽음');
 ok(n.hp>0&&out.hp>0&&m.hp>0,'이웃(자기 집)·집 밖·본거지 사람은 삶');
 ok(Object.values(s.scenario.continuation?.npcs||{}).every(x=>x.location!=='home'||x.hp>0)&&s.scenario.doyle.hp>0,'NPC는 죽지 않음');}
// 4. 도화선 찾기·끊기는 그 집 안에서만
{const {s,m,t,town}=setup(35);S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);const u=town[1],hi=()=>0.99;
 u.location='home';u.houseId=null;S.investigate(s,u,hi);ok(!u.storyKnown.some(k=>k.startsWith('fuse:')),'자기 집에서 수색하면 남의 집 도화선을 못 찾음');
 t.location='home';t.houseId=null;S.investigate(s,t,hi);const clue=(t.known||[]).map(k=>String(k.text)).find(x=>/타들어 가는 도화선/.test(x))||'';
 ok(new RegExp(t.name+'의 집 구석을 따라').test(clue),'집주인이 자기 집에서 수색 → 도화선 단서: '+clue.slice(0,50));
 ok(S.choices(s,t,'big').some(a=>a.sceneKey==='disarm'),'찾은 사람은 그 집에서 끊기 가능');t.location='hall';ok(!S.choices(s,t,'big').some(a=>a.sceneKey==='disarm'),'집을 떠나면 끊기 없음');}
// 5. 마피아가 보는 폭약 위치·설치 뒤 글은 그 집 이름
{const {s,m,t}=setup(36);S.resolve(s,m,{type:'scene',sceneKey:'arm'},s.rng);const st=String(ST.roleStory(s,m)||'');ok(new RegExp(t.name+'의 집에서 도화선이 타들어').test(st),'설치 뒤 마피아 글: '+st.replace(/\n/g,' ').slice(0,70));}
