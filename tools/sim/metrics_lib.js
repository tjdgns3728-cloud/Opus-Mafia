// 판 지표 모아 보기(2026-11-19 사용자: "그런 것 하나하나 지표로 기록해둬야 당신이 분석하기 편합니다", "통계학을 활용하면 게임에서 몰랐던 부분을 꽤 많이 찾을 수 있을 것입니다").
// 게임이 남긴 지표({kind, day, turn, actor, role, team, bot, ...})를 판마다 받아, 종류별 수와 비율, 이긴 편과 함께 본 숫자를 만든다.
// games: [{winner:'town'|'mafia'|null, metrics:[...]}]
const pct=(a,b)=>b?Math.round(100*a/b)+'%':'-';
const by=(list,f)=>{const m={};for(const x of list){const k=f(x);m[k]=(m[k]||0)+1;}return m;};
const fmt=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+v).join(', ')||'-';
function summarize(games){
 const all=games.flatMap(g=>(g.metrics||[]).map(x=>({...x,winner:g.winner})));const of=k=>all.filter(x=>x.kind===k);
 const out=[],line=t=>out.push(t);const n=games.length,mafiaWins=games.filter(g=>g.winner==='mafia').length;
 line(`판 ${n} · 마피아 승 ${mafiaWins} (${pct(mafiaWins,n)})`);
 // 마피아가 어떻게 끝났나: 처형(무엇으로 열린 재판인지), 죽음의 까닭
 const v=of('verdict'),vm=v.filter(x=>x.team==='mafia'),vt=v.filter(x=>x.team==='town');
 line(`재판 ${v.length}: 마피아 피고 ${vm.length}(유죄 ${vm.filter(x=>x.guilty).length}) · 시민 피고 ${vt.length}(유죄 ${vt.filter(x=>x.guilty).length})`);
 line(`  마피아 피고의 재판이 열린 까닭: ${fmt(by(vm,x=>x.caught?(x.caughtKind==='npc'?'NPC 고발·'+(x.npcKind||'?'):x.caughtKind||'붙잡힘'):'사람 고발'))}`);
 line(`  시민 피고의 재판이 열린 까닭: ${fmt(by(vt,x=>x.caught?(x.caughtKind==='npc'?'NPC 고발·'+(x.npcKind||'?'):x.caughtKind||'붙잡힘'):'사람 고발'))}`);
 const d=of('death');line(`죽음 ${d.length}: 마피아 ${fmt(by(d.filter(x=>x.team==='mafia'),x=>x.cause||'?'))} | 시민 ${fmt(by(d.filter(x=>x.team==='town'),x=>x.cause||'?'))}`);
 // 끌어들이기·협박·NPC 반응
 const r=of('recruit');line(`끌어들이기 ${r.length}: ${fmt(by(r,x=>x.outcome))} | 흔들림 없는 NPC에게 권함 ${r.filter(x=>!x.open).length} · 변장하고 권함 ${r.filter(x=>x.masked).length}`);
 const pr=of('pressure');line(`행동 협박 ${pr.length}: NPC가 봄 ${pr.filter(x=>x.seen).length} · 변장 ${pr.filter(x=>x.masked).length}`);
 const nr=of('npcReact');line(`NPC 반응 ${nr.length}: ${fmt(by(nr,x=>x.act+'→'+x.outcome))}`);
 // 폭약
 const tk=of('take');line(`폭약 꺼내기 ${tk.length}: ${fmt(by(tk,x=>x.team+'·'+x.outcome))} | NPC가 보는 앞 ${tk.filter(x=>x.npcWatchers>0).length} · 경고를 보고도 ${tk.filter(x=>x.warned).length} · 변장 ${tk.filter(x=>x.masked).length}`);
 const se=of('search');line(`숨긴 곳 찾기 ${se.length}: 찾음 ${se.filter(x=>x.found).length} · 폭약이 있던 곳 ${se.filter(x=>x.bombHere).length} · 평균 확률 ${se.length?Math.round(se.reduce((a,x)=>a+x.chance,0)/se.length):0}%`);
 // 변장
 const c=of('cover');line(`변장 ${c.length}: ${fmt(by(c,x=>x.team))} | 보는 사람 앞에서 ${c.filter(x=>x.seenBy>0).length} · 숨어서 ${c.filter(x=>x.hidden).length} · 벗기 ${of('uncover').length}`);
 const sz=of('seize');line(`붙잡아 고발하기 ${sz.length}: 붙잡힌 쪽 ${fmt(by(sz,x=>x.targetTeam))} · 가리개 벗겨짐(그 밖의 까닭 포함) ${of('unmasked').length}`);
 const w=of('warnIgnored');line(`경고를 보고도 한 행동 ${w.length}: ${fmt(by(w,x=>(x.sceneKey||x.type)+(x.bot?'(컴퓨터)':'(사람)')))}`);
 // 이긴 판과 진 판에서 마피아가 한 일(판마다 평균)
 const per=(k,team,win)=>{const gs=games.filter(g=>(g.winner==='mafia')===win);return gs.length?((gs.flatMap(g=>(g.metrics||[]).filter(x=>x.kind===k&&x.team===team)).length)/gs.length).toFixed(1):'-';};
 line(`마피아가 한 일, 판마다 평균(마피아 이긴 판 / 진 판): 끌어들이기 ${per('recruit','mafia',true)} / ${per('recruit','mafia',false)} · 협박 ${per('pressure','mafia',true)} / ${per('pressure','mafia',false)} · 변장 ${per('cover','mafia',true)} / ${per('cover','mafia',false)} · 폭약 꺼내기 ${per('take','mafia',true)} / ${per('take','mafia',false)}`);
 return {text:out.join('\n'),all};
}
// 판 기록 파일(logs/room_records/noir-trpg.jsonl)의 줄들 → 방마다 {winner, metrics}
function gamesFromRecords(lines){const rooms=new Map();for(const l of lines){let x;try{x=typeof l==='string'?JSON.parse(l):l;}catch{continue;}if(!x?.data)continue;const g=rooms.get(x.room)||{room:x.room,winner:null,metrics:[],started:false};rooms.set(x.room,g);const d=x.data;if(d.event==='start')g.started=true;if(d.event==='metrics')g.metrics.push(...(d.list||[]));if(d.event==='end')g.winner=d.result?.team||null;}return [...rooms.values()].filter(g=>g.started);}
module.exports={summarize,gamesFromRecords};
