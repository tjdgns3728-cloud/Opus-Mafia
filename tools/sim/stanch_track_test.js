// 2026-11-25 run39·화면 회귀 점검: 지혈·치료제 당사자 인칭, 휴대폰 행동 트랙 높이. 사용: node stanch_track_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const root=path.resolve(process.argv[2]||'.');const dir=path.join(root,'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=21;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const mk=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아름'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=3;s.turn=0;s.stage='small';for(const p of s.players){p.location='tavern';p.houseId=null;p.hidden=false;p.used={big:false,small:false};}return s;};
const seen=(s,n0,id)=>s.feed.slice(n0).filter(e=>JSON.stringify(e.to||e.ids||e.visible||e.for||[]).includes('"'+id+'"')).map(e=>e.text).join('\n');
{const s=mk(),p=s.players[1],o=s.players[2];p.items.bandage=1;p.bleeding=true;const n0=s.feed.length;const err=C.smallAct(s,p.id,{type:'bandage',target:p.id},()=>0.99);ok(!err,'자기 지혈 됨 '+(err||''));
 const all=s.feed.slice(n0).map(e=>({t:e.text,j:JSON.stringify(e)}));const mine=all.filter(x=>x.j.includes('"'+p.id+'"')&&!x.j.includes('"'+o.id+'"'));
 ok(all.some(x=>x.t.startsWith('당신이 자기 상처를 압박했습니다')),'본인에게 "당신이 자기 상처를" · '+all.map(x=>x.t).join(' / ').slice(0,160));
 ok(!all.some(x=>x.t.includes(p.name)&&x.t.includes('자기 상처를 압박했습니다')),'자기 지혈은 본인에게만, 3인칭 줄 없음(run39: 도현이 자기 상처를…)');}
{const s=mk(),p=s.players[1],t=s.players[3];p.items.bandage=1;t.bleeding=true;const n0=s.feed.length;C.smallAct(s,p.id,{type:'bandage',target:t.id},()=>0.99);const txt=s.feed.slice(n0).map(e=>e.text);
 ok(txt.some(x=>x.startsWith('당신이 '+t.name+'의 상처를 압박했습니다')),'남을 지혈: 본인에게 "당신이 X의 상처를"');ok(txt.some(x=>x.includes('당신의 상처를 압박했습니다')),'받은 사람에게 "Y가 당신의 상처를"');}
{const css=fs.readFileSync(path.join(root,'game','games','noir-trpg','assets','trpg.css'),'utf8');const a=css.indexOf('휴대폰(800px 이하) 고침 시작'),b=css.indexOf('휴대폰(800px 이하) 고침 끝');const block=a>=0&&b>a?css.slice(a,b):'';ok(block.includes('.action-track{height:356px}'),'휴대폰 덩어리 안에 트랙 높이 356px(칸 178px × 2)');ok(block.includes('.picker-footer button{min-height:44px}'),'휴대폰 창 아래 버튼 44px');}
