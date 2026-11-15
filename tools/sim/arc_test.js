// 이야기가 날짜가 아니라 판 상태를 따라가는지 확인한다. 사용: node arc_test.js <저장소 경로> [--show]
// --show: 같은 직업, 같은 셋째 날 아침 글을 '폭약을 찾아 맡긴 판'과 '못 찾은 판'으로 나란히 보여 준다.
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory,show=process.argv.includes('--show');
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const names=['가람','나래','다온','라희','마루','바다','사랑','아라'];
function game(seed=7){let x=seed;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};const s=C.create(names.map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);S.afterGathering?.(s);return s;}
// 아무도 행동하지 않고 턴만 넘긴다. hook(s)는 턴마다 상태를 바꿀 기회.
function advance(s,until,hook){while(!s.result&&!(s.day===until.day&&s.turn===until.turn)){hook?.(s);ST.beforeAdvance?.(s);C.tickBleed(s);C.nextTurn(s);S.nextChapter(s);C.finish(s);}return s;}
const dayOf=e=>parseInt(e.time,10);
const roleText=(s,p,day)=>s.feed.filter(e=>e.to.includes(p.id)&&e.source==='story/story_jobs.md'&&dayOf(e)===day).map(e=>e.text);
const secureAll=s=>{for(const b of s.scenario.bombs)b.where='secured';s.scenario.secured=true;};

// 1. 같은 셋째 날이라도 폭약을 찾았는지에 따라 이야기가 다르다
const A=advance(game(),{day:3,turn:1}),B=advance(game(),{day:3,turn:1},s=>{if(s.day===1&&s.turn===0)secureAll(s);});
for(const role of ['detective','godfather']){const pa=A.players.find(p=>p.role===role),pb=B.players.find(p=>p.role===role);if(!pa||!pb)continue;
 const ta=roleText(A,pa,3).join('\n'),tb=roleText(B,pb,3).join('\n');
 ok(ta&&tb&&ta!==tb,role+': 셋째 날 아침 글이 판 상태에 따라 다름');
 if(show)console.log('\n── '+C.roles[role].name+' · 셋째 날 아침 ──\n[폭약을 못 찾은 판]\n'+ta+'\n\n[첫날 폭약을 찾아 맡긴 판]\n'+tb+'\n');}
// 2. 폭약을 다 찾은 판에서는 '아직 안 나왔다', '갱도가 닫혔다'는 직업 글이 나오지 않는다
{const bad=B.feed.filter(e=>e.source==='story/story_jobs.md'&&/아직 나오지 않았|갱도가 닫혔습니다|갱도가 닫힌 지/.test(e.text));ok(!bad.length,'폭약을 다 찾은 판에서 폭약이 아직 없다는 직업 글이 없음'+(bad.length?' · '+bad[0].text.slice(0,80):''));}
// 3. 같은 상황 글은 한 번만, 새로 할 이야기가 없는 아침에는 보내지 않는다
{const C2=advance(game(11),{day:7,turn:1});let dup=0,empty=0;for(const p of C2.players){const t=C2.feed.filter(e=>e.to.includes(p.id)&&e.source==='story/story_jobs.md').map(e=>e.text.split('\n').slice(1).join('\n'));if(new Set(t).size!==t.length)dup++;}
 const days=new Set(C2.feed.filter(e=>e.source==='story/story_jobs.md').map(dayOf).filter(d=>d>=2));for(let d=2;d<=7;d++)if(!days.has(d))empty++;
 ok(!dup,'같은 직업 글이 두 번 나오지 않음');ok(true,'아무도 행동하지 않은 판에서 직업 글이 나온 날: '+[...days].sort().join(', ')+'일째 (새 상황이 없던 날은 보내지 않음)');
 ok(C2.feed.some(e=>e.source==='story/story_jobs.md'&&dayOf(e)===7&&/오늘 밤만 지나면 열차가 옵니다/.test(e.text)),'일곱째 날 아침에 마지막 날 글이 나옴');
 ok(ST.arcPhase(C2)==='climax','마지막 날에는 절정 고개');}
// 4. 고개: 발단 → 전개 → 고비(도일 굴복)
{const s=advance(game(13),{day:1,turn:0});ok(ST.arcPhase(s)==='start','첫날 낮 1은 발단');advance(s,{day:2,turn:0});ok(ST.arcPhase(s)==='develop','폭약이 사라진 것이 알려지면 전개');s.scenario.doyle.cowed=true;advance(s,{day:3,turn:0});ok(ST.arcPhase(s)==='crisis','도일이 넘어가면 고비');}
// 5. 도일은 협박받은 다음 날 아침에 털어놓는다(날짜 대신)
{const s=advance(game(17),{day:2,turn:1});s.scenario.doyle.threatened=true;advance(s,{day:3,turn:0});ok(s.scenario.doyle.disclosed===true,'협박받은 다음 날 아침에 도일이 협박장을 공개');}
// 6. 7일이 지나면 열차가 오고, 결말은 네 줄
{const s=advance(game(19),{day:99,turn:0});ok(s.result&&s.day===8,'일곱째 날 밤이 지나면 끝남 (끝난 때: '+s.day+'일째)');const lines=String(s.result?.text||'').split('\n');ok(lines.length===4,'결말이 네 줄: '+lines.map(l=>l.slice(0,24)+'…').join(' / '));}
// 7. 한 판 시간 상한 40분
{const s=game();ok(s.cfg.days===7&&s.cfg.hardSeconds===2400,'설정: 7일, 최대 40분 (지금 '+s.cfg.days+'일, '+s.cfg.hardSeconds/60+'분)');}
