// 게임 기록을 읽기 쉬운 쪽으로 만든다(2026-11-18 사용자: "게임 하는 내용도 기록으로 저장할 수 있게", "당신이 게임 상황이나 이야기를 기록으로 보지 못한다는게 문제입니다").
// 사용: node tools/play_record.js [방 이름] [--list]
//   방 이름을 빼면 가장 최근에 기록이 시작된 방. 결과: outputs/play_records/<방>.html 과 같은 내용의 .md (이 컴퓨터에만, git에 올리지 않음)
// 기록에는 모든 자리의 배역과 숨은 일이 들어 있으니, 진행 중인 판의 플레이어에게 보여 주지 않는다.
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'),SRC=path.join(ROOT,'game','webengine','logs','room_records','noir-trpg.jsonl'),OUT=path.join(ROOT,'outputs','play_records');
const args=process.argv.slice(2),list=args.includes('--list'),want=args.find(a=>!a.startsWith('--'));
if(!fs.existsSync(SRC)){console.log('기록 파일이 없습니다: '+SRC);process.exit(1);}
const rows=fs.readFileSync(SRC,'utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l);}catch{return null;}}).filter(Boolean);
const rooms=[...new Map(rows.filter(r=>r.data?.event==='start').map(r=>[r.room,r.time])).entries()];
if(list){for(const [room,time] of rooms)console.log(room,time);process.exit(0);}
const room=want||rooms.at(-1)?.[0];if(!room){console.log('진행 기록이 남은 방이 없습니다(2026-11-18 이전 판은 끝 요약만 남아 있습니다).');process.exit(1);}
const mine=rows.filter(r=>r.room===room).map(r=>r.data);
const start=mine.find(d=>d.event==='start'),states=mine.filter(d=>d.event==='state'),last=states.at(-1),end=mine.find(d=>d.event==='end');
const players=start?.players||[],ids=players.map(p=>p.id),nm=id=>players.find(p=>p.id===id)?.name||id,team=id=>{const p=(last?.players||players).find(p=>p.id===id);return p?.team==='mafia'?'마피아':'시민';};
const feed=mine.filter(d=>d.event==='feed').flatMap(d=>d.entries).sort((a,b)=>a.i-b.i);
const who=to=>{const t=(to||[]).filter(id=>ids.includes(id));return t.length>=players.length?'모두':t.map(nm).join(', ');};
const KIND={story:'이야기',speech:'말',notice:'알림',trial:'재판',combat:'전투',check:'판정',death:'죽음',environment:'주변',gm:'진행자',scene:'장면'};
const md=[];const esc=t=>String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
md.push(`# 게임 기록 · 방 ${room}`,'',`기록 시작 ${rooms.find(x=>x[0]===room)?.[1]||'?'} · 마지막 기록 ${last?`${last.day}일째`:'?'}${end?' · 판이 끝남':' · 판이 끝나지 않음(마지막 저장까지)'}`,'');
md.push('## 사람과 배역','');for(const p of players){const s=(last?.players||[]).find(x=>x.id===p.id);md.push(`- ${p.name} · ${p.roleName||p.role} · ${team(p.id)} 편 · ${p.bot?'컴퓨터':'사람'}${s?` · 체력 ${s.hp}${s.deathCause?' · '+s.deathCause:''}${s.downed?' · 쓰러짐':''}`:''}`);}
md.push('','## 재판','');for(const t of mine.filter(d=>d.event==='trial')){const votes=Object.entries(t.votes||{}).map(([id,v])=>`${nm(id)}(${team(id)}) ${v==='guilty'?'유죄':v==='innocent'?'무죄':'기권'}`);
 md.push(`- ${t.day}일째 · 피고 ${nm(t.target)}(${team(t.target)}) · 고발 ${t.byName||nm(t.by)}${t.caught?' · 붙잡힘('+(t.caughtKind==='npc'?'NPC':'공격')+')':''}`,`  - 이유: ${t.reason}`,...(t.evidence||[]).map(e=>`  - 근거(${nm(e.by)} · ${e.source}): ${e.text}`),`  - 표: ${votes.join(', ')||'없음'}`);}
md.push('','## 시간 순서','');let cur='';
for(const e of feed){if(e.time!==cur){cur=e.time;md.push('',`### ${cur}`,'');}
 const label=e.kind==='speech'?`말 · ${e.name||nm(e.who)}`:`${KIND[e.kind]||e.kind} · ${who(e.to)}`;md.push(`- [${label}] ${String(e.text).replace(/\n+/g,' / ')}`);}
if(end)md.push('','## 결과','',String(end.result?.text||''));
fs.mkdirSync(OUT,{recursive:true});const base=path.join(OUT,room);fs.writeFileSync(base+'.md',md.join('\n'));
const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>게임 기록 ${esc(room)}</title><style>:root{--bg:#f7f5f0;--fg:#1d1b18;--muted:#6b665e;--line:#e2ddd2}@media (prefers-color-scheme:dark){:root{--bg:#161412;--fg:#ece7de;--muted:#a39b8f;--line:#33302b}}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.65 "Malgun Gothic","Apple SD Gothic Neo",sans-serif}main{max-width:900px;margin:0 auto;padding:24px 16px 60px}h2{border-top:1px solid var(--line);padding-top:12px}h3{font-size:15px;color:var(--muted);margin:18px 0 4px}li{margin:3px 0}</style></head><body><main>${md.map(l=>l.startsWith('### ')?`<h3>${esc(l.slice(4))}</h3>`:l.startsWith('## ')?`<h2>${esc(l.slice(3))}</h2>`:l.startsWith('# ')?`<h1>${esc(l.slice(2))}</h1>`:l.startsWith('  - ')?`<ul><li>${esc(l.slice(4))}</li></ul>`:l.startsWith('- ')?`<li>${esc(l.slice(2))}</li>`:l?`<p>${esc(l)}</p>`:'').join('\n')}</main></body></html>`;
fs.writeFileSync(base+'.html',html);console.log(`방 ${room}: 글 ${feed.length}개, 재판 ${mine.filter(d=>d.event==='trial').length}건 → ${base}.html (.md도 같은 내용)`);
