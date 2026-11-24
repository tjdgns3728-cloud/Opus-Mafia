// ⑤ 기본 작은 행동: 현장 수색에서 새 단서가 없으면 오늘의 발자국, 주변 보기에서 숨은 사람이 없으면 조금 전 떠난 사람을 알려 주는지 확인. 사용: node basic_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios;let seed=37;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const hi=()=>0.99,lo=()=>0.01;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const game=()=>{const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s);S.afterGathering?.(s);s.day=2;s.turn=0;s.stage='plan';s.scenario.discovered=true;for(const q of s.players){q.used={big:false,small:false};q.location='hall';q.houseId=null;q.hidden=false;q.nightMoveEpoch=null;}return s;};
const last=(s,p)=>String(s.feed.filter(e=>e.to.includes(p.id)).at(-1)?.text||'');
const town=s=>s.players.filter(q=>q.team==='town'&&q.role!=='sheriff');

// 1. 현장 수색: 오늘 아무도 오지 않았으면 발자국이 없고 행동도 쓰지 않는다
{const s=game(),[p]=town(s);p.location='tavern';C.smallAct(s,p.id,{type:'evidence'},hi);ok(/새 발자국이 없습니다/.test(last(s,p))&&!p.used.small,'오늘 아무도 오지 않은 곳: 발자국이 없다고 하고 작은 행동은 쓰이지 않음');}
// 2. 현장 수색: 오늘 다녀간 사람 수만큼 발자국, 판정이 좋으면 그중 하나의 크기
{const s=game(),[p,a,b]=town(s);for(const o of [a,b]){C.smallAct(s,o.id,{type:'move',place:'tavern'},rng);}p.location='tavern';C.smallAct(s,p.id,{type:'evidence'},hi);const t=last(s,p);
 ok(/새 발자국이 2줄 있습니다/.test(t),'다녀간 두 사람만큼 발자국 2줄 ('+t.slice(0,60)+')');ok(/그중 하나는 (크고 깊|보통 크기|작고 얕)/.test(t)&&p.known.some(k=>/오늘 발자국 가운데 하나는/.test(String(k.text))),'판정이 좋으면 그중 하나의 크기를 알고 수첩에 남음');ok(p.used.small,'발자국을 본 경우에는 작은 행동이 쓰임');}
{const s=game(),[p,a]=town(s);C.smallAct(s,a.id,{type:'move',place:'tavern'},rng);p.location='tavern';C.smallAct(s,p.id,{type:'evidence'},lo);const t=last(s,p);ok(/새 발자국이 1줄/.test(t)&&!/그중 하나는/.test(t),'판정이 나쁘면 수만 보고 크기는 모름');}
// 3. 현장 수색: 각자의 집에서는 남의 발자국을 볼 수 없다
// (집에 원래 있는 이야기 단서(리스 골목의 발자국)가 먼저 나오므로, 단서가 다 나올 때까지 되풀이한 뒤 확인한다)
{const s=game(),[p,a]=town(s);C.smallAct(s,a.id,{type:'move',place:'home'},rng);p.location='home';const said=[];for(let i=0;i<12;i++){p.used.small=false;C.smallAct(s,p.id,{type:'evidence'},hi);said.push(last(s,p));if(!p.used.small)break;}
 ok(!said.some(t=>/오늘 이곳 바닥에 새 발자국/.test(t))&&!p.used.small&&/더 살필 것이 없습니다/.test(said.at(-1)),'집에서는 오늘의 발자국을 말하지 않고, 단서가 다 나오면 작은 행동을 돌려줌');}
// 4. 주변 보기: 숨은 사람이 없으면 조금 전 이곳을 떠난 사람을 본다
{const s=game(),[p,a]=town(s);C.smallAct(s,a.id,{type:'move',place:'clinic'},rng);C.smallAct(s,p.id,{type:'observe'},rng);const t=last(s,p);ok(/숨은 사람을 찾지 못함/.test(t)/* 2026-11-25 글 바뀜 */&&new RegExp('조금 전 '+a.name+'[이가] 마을 진료소 쪽으로 나감').test(t),'조금 전 회관을 떠난 사람과 간 곳이 보임 ('+t.slice(0,80)+')');}
{const s=game(),[p]=town(s);C.smallAct(s,p.id,{type:'observe'},rng);ok(/떠난 사람 못 봄/.test(last(s,p)),'아무도 떠나지 않았으면 그렇다고 함');}
{const s=game(),[p,a]=town(s);C.smallAct(s,a.id,{type:'move',place:'clinic'},rng);s.turn=1;s.epoch++;for(const q of s.players)q.used={big:false,small:false};C.smallAct(s,p.id,{type:'observe'},rng);ok(!/진료소 쪽으로 나감/.test(last(s,p)),'지난 시간대에 떠난 사람은 "조금 전"으로 나오지 않음');}
