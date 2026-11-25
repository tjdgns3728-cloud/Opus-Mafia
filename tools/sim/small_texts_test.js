// 2026-11-25 사람 화면 UI 점검에서 찾은 작은 글 문제 확인. 사용: node small_texts_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=131;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
ok(C.pp('B3CK','을','를')==='B3CK를'&&C.pp('96BH','을','를')==='96BH를'&&C.pp('ROOM','을','를')==='ROOM을'&&C.pp('A1L','이','가')==='A1L이','영문 끝 글자 뒤 조사: B3CK를, 96BH를, ROOM을, A1L이');
const ui=fs.readFileSync(path.join(dir,'20Interface.js'),'utf8'),w=fs.readFileSync(path.join(dir,'00World.js'),'utf8');
ok(ui.includes('인물 조사는 내 관찰 대 상대 은신 대결(같으면 실패)')&&!ui.includes('인물 조사 난이도14')&&!ui.includes('인물 흔적16'),'규칙 글: 인물 조사는 관찰 대 은신 대결(2026-11-25 사용자 결정, 실제 판정과 같음)');
ok(ui.includes("${p.bot?'AI 자리':"),'자리 카드도 "AI 자리"(버튼 "AI 자리 추가"와 같은 말)');
ok(w.includes("sleep:'잠을 잤습니다',watch:'불침번을 섰습니다',shelter:'집 안에 숨었습니다'"),'[내 행동] 줄을 문장으로');
ok(ui.includes("(p.alive===false?' (숨짐)':'')"),'집 목록에 숨진 사람의 집은 "(숨짐)"');
// 사람 조사 기록 출처는 "직접 조사"
{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
 const D=s.players.find(p=>p.role==='detective')||s.players[0],T=s.players.find(p=>p.id!==D.id);D.stats.observe=10;C.smallAct(s,D.id,{type:'investigate',target:T.id},()=>0.99);
 const srcs=[...new Set(D.known.filter(k=>k.about===T.id).map(k=>k.source))];ok(srcs.length&&!srcs.some(x=>/현장 조사$/.test(x)),'사람 조사 기록 출처에 "○○ 현장 조사"가 없음 · '+srcs.join(', '));}
// 남의 집 안에서는 "내 집에 남은 물건을 살핀다"가 없음
{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location='home';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}
 const me=s.players[1],host=s.players[2];const own=(S.choices(s,me,'small')||[]).concat(S.choices(s,me,'big')||[]).some(a=>/내 집에 남은 물건/.test(a.label||''));me.houseId=host.id;const away=(S.choices(s,me,'small')||[]).concat(S.choices(s,me,'big')||[]).some(a=>/내 집에 남은 물건/.test(a.label||''));
 ok(own&&!away,'내 집에서는 "내 집에 남은 물건을 살핀다"가 있고, 남의 집 안에서는 없음 ('+own+'/'+away+')');}
