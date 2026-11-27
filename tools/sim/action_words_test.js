// 2026-11-28 사용자: "그냥 행동하기 글만 잘 적어도 어떤 식으로 작동되는지 직관적으로 이해할 수 있게 해야 합니다",
// "행동하기 단어만 잘 적고 UI 시스템만 이해하기 쉽게 보여줘도 어떻게 할 수 있는지 직관적으로 이해할 수 있습니다".
// 마피아의 두 큰 수(권총·폭약)의 행동 단어: 보는 사람·복면·숨음에 따라 단어가 바뀌고, 사람 화면과 AI 화면에 같은 단어.
// 사용: node action_words_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라'];
function game(seed){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s,rng);S.afterGathering?.(s);s.rng=rng;return s;}
// 폭약이 술집 뒷마당에 있고, 대행자가 술집에 있다. 다른 사람과 NPC는 회관에.
function atTavern(seed){const s=game(seed);s.day=2;s.turn=0;s.stage='plan';s.scenario.spots=['cart','barrel'];s.scenario.bombs=[{id:'d0',where:'cart'},{id:'d1',where:'spot:barrel'}];s.scenario.discovered=true;
 const q=s.scenario;for(const n of [q.doyle,...Object.values(q.continuation?.npcs||{})].filter(Boolean))n.location='office';
 for(const o of s.players){o.location='hall';o.hidden=false;o.faceCover=null;o.used={big:false,small:false};}
 const m=s.players.find(o=>o.team==='mafia'&&o.role!=='godfather'),t=s.players.find(o=>o.team==='town');m.location='tavern';return {s,m,t,bk:ST.npc(s,'barkeep')};}
const take=(s,p)=>S.choices(s,p,'big').find(a=>a.sceneKey==='take');
// 1. 폭약: 보는 사람이 없으면 "몰래 꺼내기", NPC가 있으면 "맨얼굴로 훔치기"와 누가 막아서는지, 복면이면 "복면 쓴 채 훔치기"
{const {s,m,bk}=atTavern(31);const a=take(s,m);ok(a?.label==='폭약 몰래 꺼내기'&&!a.warn,'아무도 없으면 [폭약 몰래 꺼내기] · 경고 없음: '+a?.label);
 bk.location='tavern';bk.hp=10;bk.recruited=false;const b=take(s,m);ok(b?.label==='맨얼굴로 폭약 훔치기'&&/보는 사람: 술집 주인/.test(b.warn)&&/술집 주인이 막아섬/.test(b.warn)&&/붙잡히면 빼앗김/.test(b.warn),'술집 주인이 있으면 [맨얼굴로 폭약 훔치기] · '+b?.warn);
 s.aliasSeq=1;m.faceCover=true;C.ensureAlias?.(s,m);const c=take(s,m);ok(c?.label==='복면 쓴 채 폭약 훔치기','복면을 썼으면 [복면 쓴 채 폭약 훔치기]: '+c?.label);
 m.faceCover=null;bk.recruited=true;const d=take(s,m);ok(d?.label==='폭약 몰래 꺼내기'&&!d.warn,'술집 주인이 우리 편이면 보는 사람에서 빠져 [폭약 몰래 꺼내기]: '+d?.label);}
{const {s,m,t}=atTavern(33);t.location='tavern';const a=take(s,m);ok(a?.label==='맨얼굴로 폭약 훔치기'&&a.warn.includes(t.name)&&/수첩에 남음/.test(a.warn),'시민 플레이어만 보면 [맨얼굴로 폭약 훔치기] · '+a?.warn);
 const ally=s.players.find(o=>o.team==='mafia'&&o.id!==m.id);t.location='hall';ally.location='tavern';const b=take(s,m);ok(b?.label==='폭약 몰래 꺼내기','같은 편만 있으면 [폭약 몰래 꺼내기]');}
{const {s,t}=atTavern(35);t.location='tavern';t.storyKnown=[...(t.storyKnown||[]),'spot:barrel:1'];const a=take(s,t);ok(a?.label==='발견한 폭약 가져가기','시민은 찾은 폭약을 [발견한 폭약 가져가기] 그대로: '+a?.label);}
// 2. 설치 단어에 그 뒤 일
{const {s,m}=atTavern(37);m.items.dynamite=1;s.scenario.bombs[1].where='carry:'+m.id;m.location='hall';const a=S.choices(s,m,'big').find(o=>o.sceneKey==='arm');ok(a?.label==='마을 회관에 폭약 설치하기 · 다음 때가 끝나면 이곳 사람 모두 죽음','설치: '+a?.label);}
// 3. 권총: 숨어 있으면 [숨은 채 권총 쏘기], 아니면 [권총 쏘기] — 사람 화면을 그대로 읽는 AI 화면에도 같은 단어
{const {s,m,t}=atTavern(39);t.location='tavern';m.items.pistol=1;m.items.ammo=3;m.items.knife=1;
 const read=()=>NS.read(C.view(s,m.id)).text;let w=read();ok(/- 권총 쏘기 · 피해 9~10 맞으면 출혈/.test(w)&&/- 단검으로 찌르기 · 피해 3~5 맞으면 출혈/.test(w)&&!/숨은 채 권총 쏘기/.test(w),'숨지 않았으면 공격 창에 [권총 쏘기] [단검으로 찌르기]');
 m.hidden=true;w=read();ok(/- 숨은 채 권총 쏘기 · 피해 9~10 맞으면 출혈/.test(w),'숨어 있으면 공격 창에 [숨은 채 권총 쏘기]');
 const scr=NS.read(C.view(s,m.id)),btn=scr.buttons.find(b=>/공격하기/.test(b.name));const r=btn&&NS.press(C.view(s,m.id),scr,{'버튼':btn.name,'고른 것':['숨은 채 권총 쏘기 · 피해 9~10 맞으면 출혈',t.name]});ok(r?.req?.action?.weapon==='pistol','AI가 [숨은 채 권총 쏘기]를 누르면 권총으로 공격: '+JSON.stringify(r?.req?.action||r?.error));}
// 4. 권총 안내 글이 규칙과 같음(숨은 채 쏘면 아무도 못 봄 — "꺼내는 순간 모두가 앎"은 틀린 글이었다)
{const src=fs.readFileSync(path.join(dir,'05Scenarios.js'),'utf8'),ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8');ok(!/꺼내는 순간 모두가/.test(src)&&/사람들 앞에서 쏘다 붙잡히면 리스의 총인 것이 드러남/.test(src),'권총 안내: "사람들 앞에서 쏘다 붙잡히면 리스의 총인 것이 드러남"');ok(/숨은 채 권총을 쏘면 드러나지 않습니다/.test(ui),'규칙 글: 숨은 채 권총을 쏘면 정체가 드러나지 않음');}
// 5. NPC가 막아섰을 때 고르는 단어
{const {s,m,bk}=atTavern(41);bk.location='tavern';bk.hp=10;bk.recruited=false;S.resolve(s,m,take(s,m),()=>0.5);s.stage='hazard';const v=S.hazardView(s,m);ok(v?.choices?.map(c=>c.label).join(' | ')==='폭약 돌려주기 · 고발 없음 | 폭약 들고 달아나기 · 붙잡히면 빼앗김','막아섰을 때: '+v?.choices?.map(c=>c.label).join(' | '));}
// 6. 이동 창: 폭약이 있는 줄 아는 곳 옆에 짧게(마피아는 "숨겨 둔 폭약", 찾지 못한 시민은 없음) — 사람 화면을 읽는 AI 화면에도 같음
{const {s,m,t}=atTavern(43);m.location='hall';t.location='hall';const mv=p=>{const v=C.view(s,p.id),txt=NS.read(v).text;return {v,txt};};
 const a=mv(m);ok(a.v.bombPlaces.includes('tavern')&&a.v.bombPlaces.includes('warehouse')&&/광부 술집[^\n]{0,4}\n?[^\n]{0,3}숨겨 둔 폭약|광부 술집 · 숨겨 둔 폭약/.test(a.txt),'마피아 이동 창: 광부 술집·갱도 옆에 "숨겨 둔 폭약" — '+a.v.bombPlaces.join(','));
 const b=mv(t);ok(!b.v.bombPlaces.length&&!/숨겨 둔 폭약|찾은 폭약/.test(b.txt),'찾지 못한 시민 이동 창에는 없음');
 t.storyKnown=[...(t.storyKnown||[]),'spot:barrel:1'];const c=mv(t);ok(c.v.bombPlaces.join()==='tavern'&&/찾은 폭약/.test(c.txt),'술통에서 찾은 시민: 광부 술집 옆에 "찾은 폭약"');}
{const {s,m}=atTavern(45);m.location='hall';s.stage='move';const v=C.view(s,m.id),scr=NS.read(v);ok(/\[광부 술집 · 숨겨 둔 폭약\]/.test(scr.text),'이동 단계 단추: [광부 술집 · 숨겨 둔 폭약]');
 const r=NS.press(v,scr,{'버튼':'광부 술집'});ok(!r.error&&JSON.stringify(r.req||{}).includes('tavern'),'AI가 "광부 술집"만 눌러도 그 단추로 받음: '+JSON.stringify(r.req||r.error).slice(0,120));}
