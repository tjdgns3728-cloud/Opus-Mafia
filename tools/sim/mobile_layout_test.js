// 2026-11-25 휴대폰 화면 고침(fix/mobile-layout-1430): 800px 이하에서만 바깥 틀 스크롤·버튼 44px·작은 글자 12px 이상·이야기 칸 넓히기.
// 데스크톱의 한 화면 고정 규칙(81줄)은 그대로인지, 휴대폰 규칙이 800px 이하 미디어 쿼리 안에만 있는지 본다. 사용: node mobile_layout_test.js <저장소 경로>
const fs=require('fs'),path=require('path');
const css=fs.readFileSync(path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','assets','trpg.css'),'utf8').replace(/\r\n/g,'\n');
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const A='/* 2026-11-25 휴대폰(800px 이하) 고침 시작 */',B='/* 2026-11-25 휴대폰(800px 이하) 고침 끝 */';
const i=css.indexOf(A),j=css.indexOf(B);
ok(i>0&&j>i,'휴대폰 고침 덩어리가 있음');
const block=css.slice(i+A.length,j);
// 주석을 빼고 미디어 쿼리 하나로 감싸였는지(괄호 짝) 본다
const body=block.replace(/\/\*[\s\S]*?\*\//g,'').trim();
ok(body.startsWith('@media(max-width:800px){'),'덩어리 전체가 @media(max-width:800px) 안에 있음');
let d=0,closedAt=-1;for(let k=0;k<body.length;k++){if(body[k]==='{')d++;else if(body[k]==='}'){d--;if(d===0){closedAt=k;break;}}}
ok(closedAt===body.length-1,'미디어 쿼리가 덩어리 끝에서 닫힘(바깥으로 새는 규칙 없음)');
const has=(sel,props)=>{const re=new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\{([^}]*)\\}');const m=re.exec(body);return !!m&&props.every(p=>m[1].includes(p));};
ok(has('#noir:has(.layout)',['overflow-y:auto']),'① 바깥 틀 세로 스크롤');
ok(has('.layout',['height:auto','max-height:none']),'① 가운데·옆 칸을 감싸는 틀 높이 풀기');
ok(has('.center',['height:auto','min-height:calc(100dvh - 48px)','minmax(180px,1fr)']),'① ④ 가운데 칸은 적어도 한 화면, 이야기 줄 최소 180px');
ok(has('.center,.layout',['overscroll-behavior:auto']),'① 휠·손가락 스크롤이 바깥 틀까지 이어짐');
ok(has('.center:has(.actions .night-move)',['minmax(90px,1fr)']),'① 이동 단계(15초)에는 이야기 줄을 줄여 장소 버튼 4줄이 첫 화면에');
ok(has('.story-split',['contain:size']),'④ 이야기 글 길이가 칸 높이를 늘리지 않음');
ok(has('aside',['height:auto','overflow:visible']),'① 옆 칸(주민 수첩·내 인물)은 내용 높이대로');
ok(has('.choice-row button,.night-move button,.combat-choice button,.proposal button',['min-height:44px','font-size:13px']),'② 행동·이동·대응·제안 버튼 44px·13px');
ok(has('.actions>.ready',['min-height:44px','font-size:13px']),'② 선택 마치기 버튼 44px·13px');
ok(has('.action-deck>.fixed-arrow',['height:44px','font-size:13px']),'② 작은/큰 행동 화살표 44px·13px');
ok(has('.feed-tabs button,.reading-tools button',['min-height:40px','font-size:12px']),'③ 기록 탭 40px·12px');
ok(has('header button',['min-height:40px','font-size:12px']),'③ 머리줄 버튼 40px·12px');
ok(has('nav button',['min-height:40px','font-size:12px']),'③ 내 인물 탭 40px·12px');
ok(/\.action-progress[^{]*\{[^}]*font-size:12px/.test(body),'③ 진행 글 12px');
// 데스크톱 한 화면 고정 규칙(81줄)은 그대로
const fixed=css.indexOf('/* Fixed game viewport; only records, facts and side panels scroll. */');
const line81=css.slice(fixed,css.indexOf('\n',css.indexOf('\n',fixed)+1));
ok(fixed>0&&line81.includes('#noir:has(.layout){height:100dvh;overflow:hidden}')&&line81.includes('.center{height:100%;min-height:0;overflow:hidden;display:grid'),'데스크톱 한 화면 고정 규칙은 그대로');
ok(css.split('#noir:has(.layout){overflow-x:hidden;overflow-y:auto').length===2,'바깥 틀 스크롤 규칙은 휴대폰 덩어리 한 곳에만');
