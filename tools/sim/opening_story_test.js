// 2026-11-25 사용자: "단서나 내 단서 같은 것은 게임 시스템에 단서로 넣고 볼 수 있게 하고 게임마스터가 게임을 이야기 하듯 설명해주는게 맞는데"
// 첫 이야기는 진행자 서술(꼬리표 없는 이야기 글), 단서는 수첩에 한 줄씩(처음 사건·처음 단서·내 단서·목표). 사용: node opening_story_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};
for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;let seed=77;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아름','자람','차람','카람'];
for(const n of [8,11]){
 const s=C.create(names.slice(0,n).map((x,i)=>({id:'p'+i,name:x,bot:true})),rng);S.start(s);
 const opening=s.feed.slice(0);const tagged=opening.filter(e=>['사건','단서','내 단서','목표'].includes(e.tag));
 ok(tagged.length===0,n+'명: 첫 이야기에 [사건]·[단서]·[내 단서]·[목표] 꼬리표 줄 없음 · '+tagged.length);
 const common=opening.find(e=>e.source==='P-confirmed-opening');
 ok(!!common&&/리스가 얼굴을 가린 자들과 싸우다 숨졌습니다/.test(common.text)&&/일째 아침에야 닿습니다/.test(common.text)&&s.players.every(p=>common.to.includes(p.id)),n+'명: 모두에게 진행자 서술(사건)');
 ok(opening.some(e=>/화약고 문 앞에는 끝을 비틀어 만 꽁초/.test(e.text)&&/수첩에서 다시 볼 수 있습니다/.test(e.text)),n+'명: 꽁초 장면도 서술, 수첩 안내');
 for(const p of s.players){
  const src=k=>p.known.filter(x=>x.source===k);
  if(!(src('처음 사건').length===1&&src('처음 단서').length===1&&/꽁초/.test(src('처음 단서')[0].text))){ok(false,n+'명 '+p.name+': 처음 사건·처음 단서가 수첩에');break;}
  const mine=src('내 단서');if(!mine.length){ok(false,n+'명 '+p.name+'('+p.role+'): 내 단서가 수첩에 없음');break;}
  const priv=opening.filter(e=>e.to.length===1&&e.to[0]===p.id&&e.private);if(!priv.length){ok(false,n+'명 '+p.name+': 나만 보는 서술 없음');break;}
  if(p.team!=='mafia'&&p.known.some(x=>x.teamOnly)){ok(false,n+'명 '+p.name+': 시민 수첩에 팀 전용 기록');break;}
  if(p.team==='mafia'&&!mine.every(x=>x.teamOnly)){ok(false,n+'명 '+p.name+': 마피아의 내 단서는 팀 전용이어야 함');break;}
 }
 ok(true,n+'명: 모두의 수첩에 처음 사건·처음 단서·내 단서, 나만 보는 서술, 팀 전용 구분 확인');
 const sh=s.players.find(p=>p.role==='sheriff');if(sh){const m=sh.known.filter(x=>x.source==='내 단서').map(x=>x.text);ok(m.length===4&&m.some(t=>/화약고 열쇠 주인/.test(t))&&sh.known.some(x=>x.source==='내 단서'&&x.kind==='claim'&&/^소문:/.test(x.text)),n+'명: 보안관 내 단서 4개(소문은 "전해 들은 주장")');}
 const town=s.players.find(p=>p.team!=='mafia');const townSaw=s.feed.filter(e=>e.to.includes(town.id)).map(e=>e.text).join('\n');
 ok(!/우리 편은 화약고에서 가져온 폭약/.test(townSaw)&&!/같은 편은/.test(townSaw),n+'명: 시민에게 마피아 서술이 가지 않음');
 // AI 화면: 사람 화면과 같은 글(기록·수첩)
 const v=C.view(s,town.id),scr=NS.read(v).text;ok(/리스가 얼굴을 가린 자들과 싸우다 숨졌습니다/.test(scr)&&/처음 단서/.test(scr)&&/내 단서/.test(scr),n+'명: AI 화면에 서술과 수첩의 단서가 보임');
}
