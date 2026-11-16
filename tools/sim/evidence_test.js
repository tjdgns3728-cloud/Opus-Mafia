// 재판 근거 목록: 같은 편만 아는 기록(숨긴 곳, 같은 편 명단, 영입 사실)은 표시되고, 근거로 받지 않는지 확인. 사용: node evidence_test.js <저장소 경로>
const path=require('path'),fs=require('fs');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=41;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const ERR='자신이 아는 기록을 최대 다섯 개 선택하세요.';
const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s);S.afterGathering?.(s);
s.day=2;s.turn=0;s.stage='plan';for(const q of s.players){q.used={big:false,small:false};q.location='hall';q.hidden=false;}
const gf=s.players.find(p=>p.team==='mafia'),town=s.players.filter(p=>p.team==='town'),[t,u]=town;
// 1. 시작할 때 마피아가 받는 기록
const cache=gf.known.find(k=>/^우리 편은 화약고에서/.test(k.text)),mates=gf.known.find(k=>/^같은 편/.test(k.text));
ok(cache?.teamOnly&&mates?.teamOnly,'마피아의 숨긴 곳·같은 편 기록에 "같은 편만 아는 기록" 표시');
// 2. 서버는 같은 편만 아는 기록을 근거로 받지 않는다
ok(C.validate(s,gf.id,{type:'file',target:t.id,reason:'수상합니다',facts:[cache.id]},'big')===ERR,'숨긴 곳 기록을 근거로 내면 받지 않음');
ok(C.validate(s,gf.id,{type:'file',target:t.id,reason:'수상합니다',facts:[mates.id]},'big')===ERR,'같은 편 명단을 근거로 내면 받지 않음');
const plain=C.learn(s,gf.id,'회관에서 '+t.name+'을 보았다.',t.id,'직접 목격','observed');
ok(!plain.teamOnly&&C.validate(s,gf.id,{type:'file',target:t.id,reason:'수상합니다',facts:[plain.id]},'big')!==ERR,'마피아라도 보통 기록은 근거로 낼 수 있음');
const tk=C.learn(s,t.id,'회관에서 '+u.name+'을 보았다.',u.id,'직접 목격','observed');
ok(!tk.teamOnly&&C.validate(s,t.id,{type:'file',target:u.id,reason:'수상합니다',facts:[tk.id]},'big')!==ERR,'시민의 기록은 그대로 근거로 낼 수 있음');
// 3. 쪽지를 받아들여 같은 편이 되면 생기는 기록
const offer={id:'o'+(++s.serial),kind:'recruit',anonymous:true,from:gf.id,to:t.id,terms:'함께 살아남읍시다',done:false};s.offers.push(offer);
C.accept(s,t.id,offer.id,true);
const tMates=t.known.find(k=>k.source==='영입되며 안 사실'),gfNews=gf.known.find(k=>k.source==='같은 편 소식');
ok(t.team==='mafia'&&tMates?.teamOnly,'영입된 사람이 받은 같은 편 명단에 표시');ok(gfNews?.teamOnly,'같은 편이 받은 영입 소식에 표시');
ok(C.validate(s,t.id,{type:'file',target:u.id,reason:'수상합니다',facts:[tMates.id]},'big')===ERR,'영입된 사람도 같은 편 명단은 근거로 낼 수 없음');
// 4. 화면의 근거 목록도 표시된 기록을 거른다(코드 확인)
const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');
ok(/evidence-select">\$\{v\.me\.known\.some\(k=>!k\.teamOnly\)\?v\.me\.known\.filter\(k=>!k\.teamOnly\)/.test(ui),'재판 신청서의 근거 목록이 같은 편만 아는 기록을 거름');
ok(!/불침번을 섰을 수 있습니다/.test(fs.readFileSync(path.join(dir,'08StoryFlow.js'),'utf8')),'하숙집 주인의 아침 소식에 해석 문장이 없음');
