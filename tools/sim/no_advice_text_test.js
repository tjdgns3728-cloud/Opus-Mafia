// 2026-11-28 사용자: "글로 게임 플레이를 권장하지 말라는 것입니다 잘 만든게임들은 대부분 그렇습니다.", 정리 초안에 "1·2 고치기".
// 역할 상황 글(08StoryFlow)에 하라는 문장이 다시 들어오지 않는지, 사실 문장으로 바꾼 세 곳이 남았는지 본다.
// 사용: node no_advice_text_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const flow=fs.readFileSync(path.join(dir,'08StoryFlow.js'),'utf8');
// 상황 글 묶음(town:{ … kidnapper:{ … })만 떼어 본다
const lines=flow.split(/\r?\n/),a=lines.findIndex((l,i)=>/^\s*town:\{\s*$/.test(l)&&/exploded:/.test(lines[i+1]||'')),b=lines.findIndex((l,i)=>i>a&&/^\s*kidnapper:\{\s*$/.test(l));
let e=b;while(e<lines.length&&!/^\s*\},?\s*$/.test(lines[e]))e++;const block=lines.slice(a,e+1).join('\n');
ok(a>0&&b>a,'상황 글 묶음을 찾음('+(a+1)+'~'+(e+1)+'줄)');
const strs=[...block.matchAll(/"([^"]*[가-힣][^"]*)"|'([^']*[가-힣][^']*)'/g)].map(m=>m[1]||m[2]).join(' ');
for(const re of [/십시오/,/서둘러야 합니다/,/때입니다\.(?![^"]*그자들)/,/이유가 없습니다/,/가장 확실합니다/,/세어 봅니다/,/있어서는 안 됩니다/,/물어야 합니다/,/막아야 합니다/,/찾아야 합니다/,/정해야 합니다/])
 ok(!re.test(strs.replace('마지막 수를 준비할 때입니다.','')),'상황 글에 '+re.source+' 없음'+(re.test(strs)?' — '+(strs.match(new RegExp('[^.]{0,40}'+re.source+'[^.]{0,10}'))||[''])[0]:''));
for(const s of ['설치한 사람도 그때 그 자리에 있으면 죽습니다.','골목의 두 발자국(크고 무거운 것, 작고 가벼운 것)은 함께 움직였습니다.','폭약이 터질 때 그 자리에 있는 사람은 누구든 죽습니다.'])ok(block.includes(s),'사실 문장으로 바꾼 곳: '+s);
// 남겨야 할 규칙·사실이 지워지지 않았는지 몇 곳
for(const s of ['들은 말은 근거가 되지 않습니다.','다음 낮이 끝날 때까지는 살릴 수 있고','사람 수만 맞으면 들켜도 이깁니다.','너무 열심히 감싸면 그것만으로 의심받습니다.','찾은 사람과 놓은 사람이 같을 때가 있습니다.'])ok(block.includes(s),'남긴 사실: '+s);
