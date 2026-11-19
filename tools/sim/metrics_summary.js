// 판 기록 파일의 지표를 모아 본다. 사용: node metrics_summary.js [판 기록 파일] [시작 줄]
// 기본 파일: game/webengine/logs/room_records/noir-trpg.jsonl (이 컴퓨터에서 연 서버의 판 기록)
const fs=require('fs'),path=require('path'),{summarize,gamesFromRecords}=require('./metrics_lib.js');
const file=process.argv[2]||path.join(__dirname,'..','..','game','webengine','logs','room_records','noir-trpg.jsonl'),from=+(process.argv[3]||0);
if(!fs.existsSync(file)){console.log('판 기록 파일이 없습니다:',file);process.exit(0);}
const games=gamesFromRecords(fs.readFileSync(file,'utf8').split('\n').filter(Boolean).slice(from));
const withMetrics=games.filter(g=>g.metrics.length);
console.log(`판 기록 ${games.length}방 · 지표가 있는 방 ${withMetrics.length}`);
console.log(summarize(withMetrics).text);
