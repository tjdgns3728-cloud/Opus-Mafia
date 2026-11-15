// 대화 기록에서 사용자 말만 뽑는다. 사용: node usermsgs.js <기록.jsonl> <출력.txt>
const fs=require('fs'),rl=require('readline');
const out=[];const r=rl.createInterface({input:fs.createReadStream(process.argv[2])});
r.on('line',l=>{let o;try{o=JSON.parse(l)}catch{return}
 if(o.type!=='user'||o.isMeta||o.isSidechain)return;const c=o.message?.content;let t='';
 if(typeof c==='string')t=c;else if(Array.isArray(c))t=c.filter(x=>x.type==='text').map(x=>x.text).join('\n');
 t=t.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g,'').trim();if(!t)return;
 const m=t.match(/The user sent a new message while you were working:\n([\s\S]*?)\n\nThis is how/);if(m)t=m[1];
 else if(t.startsWith('<'))return;
 if(/^This session is being continued|^Caveat:|tool_use_error|^\[Request interrupted/.test(t))return;
 out.push((o.timestamp||'').slice(5,16).replace('T',' ')+' | '+t.replace(/\s+/g,' ').slice(0,400));});
r.on('close',()=>{fs.writeFileSync(process.argv[3],out.join('\n'));console.log(out.length);});
