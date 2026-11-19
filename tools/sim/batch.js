// 여러 판을 돌려 결과를 모은다. 사용: node batch.js <저장소 경로> <판 수> [seats] [timescale] [동시 실행 수]
const {spawn}=require('child_process'),path=require('path');
const repo=process.argv[2],games=Number(process.argv[3]||10),seats=Number(process.argv[4]||8),scale=Number(process.argv[5]||40),par=Number(process.argv[6]||5);
const run=seed=>new Promise(ok=>{const p=spawn(process.execPath,[path.join(__dirname,'sim.js'),repo,String(seed),String(scale),String(seats)],{stdio:['ignore','pipe','ignore']});let out='';p.stdout.on('data',c=>out+=c);p.on('close',()=>{try{ok(JSON.parse(out.trim().split('\n').pop()));}catch{ok({seed,error:'no result',raw:out.slice(-200)});}});});
(async()=>{const seeds=Array.from({length:games},(_,i)=>1000+i*37),res=[];let at=0;await Promise.all(Array.from({length:par},async()=>{while(at<seeds.length){const s=seeds[at++];res.push(await run(s));}}));
 res.sort((a,b)=>a.seed-b.seed);
 for(const r of res)console.log(r.error?`seed ${r.seed}: 오류 ${r.error}`:`seed ${String(r.seed).padEnd(5)} ${r.ended?(r.winner==='mafia'?'마피아 승':'시민 승  '):'끝나지 않음'} | 끝난 때 ${r.time} | 생존 ${r.alive}/${r.seats} (마피아 ${r.mafiaAlive}/${r.mafiaTotal}) | 사람 자리: ${r.humanTeam==='mafia'?'마피아':'시민'} ${r.humanRole} ${r.humanAlive?'생존':'사망'}`);
 const done=res.filter(r=>r.ended),m=done.filter(r=>r.winner==='mafia').length,t=done.filter(r=>r.winner==='town').length;
 const early=done.filter(r=>r.day<=7).length,hm=done.filter(r=>r.humanTeam==='mafia');
 console.log(`\n합계: ${res.length}판 중 끝난 판 ${done.length} | 마피아 승 ${m} (${done.length?Math.round(100*m/done.length):0}%) · 시민 승 ${t} (${done.length?Math.round(100*t/done.length):0}%)`);
 console.log(`일곱째 날 밤 전에 끝난 판: ${early} | 끝날 때 평균 생존자 ${(done.reduce((a,r)=>a+r.alive,0)/Math.max(1,done.length)).toFixed(1)}명 / ${seats}명 | 사람 자리가 죽은 판: ${done.filter(r=>!r.humanAlive).length}`);
 console.log(`사람 자리가 마피아였던 판 ${hm.length} (그중 마피아 승 ${hm.filter(r=>r.winner==='mafia').length})`);
 /* 지표(2026-11-19 사용자): 판마다 게임이 남긴 지표를 모아 본다 */console.log('\n지표:\n'+require('./metrics_lib.js').summarize(done).text);
})();
