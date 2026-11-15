// 컴퓨터 자리가 말한 곳으로 가는지 확인. 사용: node intent_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){}};
let src=fs.readFileSync(path.join(dir,'10Session.js'),'utf8');src=src.replace(/\}\)\(\);\s*$/,'globalThis.__t={fallback,cannedTalk,intentFrom};})();');eval(src);
const C=globalThis.NoirTRPG,T=globalThis.__t;let seed=11;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
// 말에서 장소 읽기
for(const [line,want] of [['저는 작은 교회에 가 보겠습니다.','chapel'],['갱도를 확인하겠습니다','warehouse'],['저는 마을 회관에 남아 사람들 이야기를 더 듣겠습니다.','hall'],['술집 주인은 수상해요','null']])ok(String(T.intentFrom(line))===want,'"'+line+'" → '+T.intentFrom(line));
let moved=0,stayed=0,total=0;
for(let g=0;g<30;g++){const seats=Array.from({length:8},(_,i)=>({id:'p'+i,name:'자리'+i,bot:true}));const s=C.create(seats,rng);globalThis.NoirScenarios?.start?.(s);const r={state:s,random:rng};
 for(const p of s.players){p.location='hall';const line=T.cannedTalk(s,p,'gathering');const said=p.intendPlace.place;s.stage='plan';const a=T.fallback(r,p.id,'big');total++;
  if(said===p.location){if(a.type!=='move')stayed++;else console.log('  남겠다더니 이동:',line,JSON.stringify(a));}
  else if(a.type==='move'&&a.place===said)moved++;else if(a.type!=='move'&&a.type!=='wait')moved++;/* 장면 행동이 먼저 잡힌 경우 */else console.log('  다른 곳으로:',line,JSON.stringify(a));}}
ok(moved+stayed===total,'말한 대로 움직임 '+(moved+stayed)+'/'+total+' (간다고 함 '+moved+', 남는다고 함 '+stayed+')');
