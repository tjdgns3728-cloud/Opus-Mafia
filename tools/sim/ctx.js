// 사용: node ctx.js <파일> <찾을 말> [앞 글자 수] [뒤 글자 수]  — 찾은 곳마다 앞뒤를 보여 준다
const fs=require('fs');const [,,file,word,before='300',after='400']=process.argv;const s=fs.readFileSync(file,'utf8');
let i=s.indexOf(word),n=0;while(i>=0&&n<20){const line=s.slice(0,i).split('\n').length;console.log('['+line+'] …'+s.slice(Math.max(0,i-Number(before)),i+Number(after)).replace(/\r?\n/g,'⏎')+'…\n');n++;i=s.indexOf(word,i+word.length);}
if(!n)console.log('없음: '+word);
