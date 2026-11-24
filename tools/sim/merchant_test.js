// 암거래 상인의 신용(2026-11-16 사용자 결정): 신용 단계별 물건, 부탁·소개·지킴·광산으로 오름(하루 한 번), 공격하면 굳음, 마피아와 적대·동맹, 방탄복, 손님 정보 없음. 사용: node merchant_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,ST=globalThis.NoirStory,M=ST.merchant;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};const hi=()=>0.99,lo=()=>0.01;
const game=(n=43)=>{let seed=n;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const s=C.create(Array.from({length:8},(_,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다','사랑','아라'][i],bot:true})),rng);S.start(s);S.afterGathering?.(s);
 s.day=2;s.turn=0;s.stage='plan';for(const q of s.players){q.used={big:false,small:false};q.location='rail';q.hidden=false;q.money=0;q.role=q.role==='shopkeeper'?'lawyer':q.role;}s.scenario.continuation.merchant=null;return s;};
const acts=(s,p,slot='small')=>S.choices(s,p,slot).filter(a=>a.sceneKey==='story-action');
const fed=(s,p)=>s.feed.filter(e=>e.to.includes(p.id)).map(e=>String(e.text)).join(' | ');
const town=s=>s.players.filter(p=>p.team==='town'),mafia=s=>s.players.filter(p=>p.team==='mafia');

// 1. 신용 0: 팔지 않고, 물건을 물으면 판마다 다른 부탁을 한다
{const s=game(),[t,u,w]=town(s),m=M.state(s);for(const k of Object.keys(m.stock))m.stock[k]=2;t.money=9;
 ok(!acts(s,t).some(a=>a.verb==='buyItem'),'신용 0이면 살 수 있는 물건이 없음');
 S.talk(s,t,'npc:merchant:goods');ok(t.npcHeard.includes('lead:merchantJob')&&!u.npcHeard?.includes('lead:merchantJob'),'부탁은 물어본 사람에게만 생김');
 const j=M.JOBS[m.job];if(j.npc){const n=ST.npc(s,j.npc);n.location=j.place;n.hp=10;}t.location=u.location=w.location=j.place;u.npcHeard=['lead:merchantJob'];
 const job=acts(s,t).find(a=>a.verb==='merchantJob');ok(!!job&&!acts(s,w).some(a=>a.verb==='merchantJob'),'부탁 받은 곳에서 부탁 받은 사람에게만 "'+j.label+'"이 생김');
 S.resolve(s,u,acts(s,u).find(a=>a.verb==='merchantJob'),lo);ok(M.credit(s,u)===0&&/모습이 보입니다/.test(fed(s,w))&&w.known.some(k=>k.about===u.id),'부탁을 못 하면 신용은 그대로이고 같은 자리 사람이 봄');
 ok(!acts(s,u).some(a=>a.verb==='merchantJob'),'못 한 부탁은 같은 때에 다시 할 수 없음');s.epoch++;ok(acts(s,u).some(a=>a.verb==='merchantJob'),'다음 때에는 다시 할 수 있음');
 S.resolve(s,t,job,hi);ok(M.credit(s,t)===1&&/조금 더 믿게/.test(fed(s,t)),'부탁을 해내면 신용 1');ok(!acts(s,t).some(a=>a.verb==='merchantJob'),'해낸 부탁은 다시 생기지 않음');
// 2. 신용 1: 곤봉·붕대만. 산 물건은 받고 돈과 재고가 줄며, 곁의 사람은 무엇을 샀는지 모른다
 t.location=w.location='rail';const buy=acts(s,t).filter(a=>a.verb==='buyItem').map(a=>a.item).sort().join(',');ok(buy==='bandage,club,flashlight','신용 1에서 살 수 있는 것: '+buy);
 S.resolve(s,t,acts(s,t).find(a=>a.item==='club'),hi);ok(t.items.club>=1&&t.money===7&&m.stock.club===1,'곤봉을 사면 받고 돈 2·재고 1이 줄어듦');
 const seen=fed(s,w);ok(/무언가를 주고받습니다/.test(seen)&&!/곤봉/.test(seen.split('|').slice(-1)[0]),'곁의 사람은 주고받는 것만 보고 무엇인지는 모름');
// 3. 하루 한 번: 같은 날 두 번째로 오른 신용은 다음 날 셈한다. 지키기는 처음 한 번만(NPC 곁에서 지키기는 퇴역군인·간수·보안관만 할 수 있다)
 t.role='guard';const guard=acts(s,t,'big').find(a=>a.verb==='guardNpc'&&a.npc==='merchant');S.resolve(s,t,guard,hi);ok(M.credit(s,t)===1&&m.pending[t.id]===1,'같은 날 두 번째로 오른 것은 미뤄 둠');
 s.day=3;M.flush(s);ok(M.credit(s,t)===2,'다음 날 셈해서 신용 2');S.resolve(s,t,acts(s,t,'big').find(a=>a.verb==='guardNpc'&&a.npc==='merchant'),hi);s.day=4;M.flush(s);ok(M.credit(s,t)===2,'상인을 두 번째 지켜도 오르지 않음');
 const buy2=acts(s,t).filter(a=>a.verb==='buyItem').map(a=>a.item).sort().join(',');ok(buy2==='bandage,club,flashlight,knife,lockpick,medicine,morphine,vest','신용 2에서 살 수 있는 것: '+buy2);
// 4. 믿는 사람(신용 2)의 소개
 const intro=acts(s,t).find(a=>a.verb==='introduceMerchant'&&a.target===w.id);ok(!!intro,'신용 2인 사람은 같은 자리 사람을 소개할 수 있음');S.resolve(s,t,intro,hi);ok(M.credit(s,w)===1,'소개받은 사람은 신용 1');
 ok(!acts(s,u).some(a=>a.verb==='introduceMerchant'),'신용이 낮으면 소개할 수 없음');}
// 5. 상인을 공격하면 그 사람은 0으로 굳고, 지키던 사람이 막으면 지킨 사람이 오른다
{const s=game(51),[t,u]=town(s),m=M.state(s);t.role='guard';m.credit[u.id]=2;m.raised[u.id]=1;
 S.resolve(s,t,acts(s,t,'big').find(a=>a.verb==='guardNpc'&&a.npc==='merchant'),hi);const before=M.credit(s,t);s.day=3;
 {let i=0;const v=[0.99,0.01,0.9];S.resolve(s,u,acts(s,u,'big').find(a=>a.verb==='attackNpc'&&a.npc==='merchant'),()=>v[i++%3]);}ok(M.credit(s,u)===0&&m.locked[u.id],'상인을 공격한 사람은 신용 0으로 굳음');
 ok(M.credit(s,t)===before+1,'지키던 사람이 공격을 막으면 신용이 오름');ok(!m.hostileMafia,'시민이 공격해도 마피아와의 관계는 그대로');}
// 6. 마피아가 공격하면 마피아 편 누구에게도 팔지 않음
{const s=game(53),[g,h]=mafia(s),m=M.state(s);if(h){m.credit[h.id]=2;m.raised[h.id]=1;}
 S.resolve(s,g,acts(s,g,'big').find(a=>a.verb==='attackNpc'&&a.npc==='merchant'),hi);ok(m.hostileMafia&&(!h||M.credit(s,h)===0),'마피아가 상인을 공격하면 마피아 편 신용이 모두 0');
 if(h){h.location='rail';S.talk(s,h,'npc:merchant:goods');ok(/거래하지 않소/.test(fed(s,h)),'적대한 상인은 마피아에게 거래를 거절함');}}
// 7. 마피아 편 누군가 신용 3이 되면 마피아 편 모두 2부터
{const s=game(57),[g,h]=mafia(s),m=M.state(s);m.credit[g.id]=2;m.pending[g.id]=1;m.raised[g.id]=1;M.flush(s);
 ok(M.credit(s,g)===3&&m.allied&&(!h||M.credit(s,h)===2),'마피아 한 명이 신용 3이 되면 동맹: 같은 편은 신용 2부터');}
// 8. 광산을 다시 열게 한 사람(여기서는 마지막 폭약을 회관에 맡긴 시민)
{const s=game(59),[t]=town(s),q=s.scenario;q.mineClosed=true;q.secured=false;q.bombs.forEach((b,i)=>b.where=i?'carry:'+t.id:'secured');t.items.dynamite=1;t.location='hall';
 const sec=S.choices(s,t,'big').find(a=>a.sceneKey==='secure');S.resolve(s,t,sec,hi);ok(q.secured&&M.credit(s,t)===1,'마지막 폭약을 회관에 맡겨 광산을 다시 열게 하면 상인 신용이 오름');}
// 9. 방탄복: 맞을 때 피해 −2, 권총 최소 피해 5는 3
{const s=game(61),[a,t]=s.players;a.location=t.location='hall';const seq=v=>{let i=0;return ()=>v[i++%v.length];};
 const plain=C.attackRoll(s,a,t,{weapon:'knife'},seq([0.99,0.01,0.9])),vt={...t,items:{...t.items,vest:1}},armored=C.attackRoll(s,a,vt,{weapon:'knife'},seq([0.99,0.01,0.9]));
 ok(plain.damage>2&&armored.damage===plain.damage-2&&armored.armor===2,'방탄복은 단검 피해를 2 줄임 ('+plain.damage+' → '+armored.damage+')');
 a.stats.fight=vt.stats.agility+1;let min=null;for(let k=0;k<10&&min===null;k++){const r=C.attackRoll(s,a,vt,{weapon:'pistol'},()=>0.05+k/10);if(r.damage>0&&r.raw+r.bonus-r.reduction<=5)min=r.damage;}ok(min===3,'약하게 맞아 권총 최소 피해 5가 적용될 때 방탄복을 입었으면 3');}
// 10. 재고와 부탁은 판마다 다르고, 밤에는 팔지 않는다
{const jobs=new Set(),stocks=new Set();for(let i=1;i<=40;i++){const s=game(i*97),m=M.state(s);jobs.add(m.job);stocks.add(JSON.stringify(m.stock));}ok(jobs.size>=2&&stocks.size>=5,'판마다 부탁('+[...jobs].join(',')+')과 재고('+stocks.size+'가지)가 다름');
 const s=game(),[t]=town(s),m=M.state(s);m.credit[t.id]=3;t.money=9;for(const k of Object.keys(m.stock))m.stock[k]=1;ok(acts(s,t).filter(a=>a.verb==='buyItem').length===10,'신용 3이면 열 가지 모두 살 수 있음');s.turn=2;ok(!acts(s,t).some(a=>a.verb==='buyItem'),'밤에는 팔지 않음');}

// 11. 군용 모르핀: 쓰러진 사람을 살릴 때 쓰면 성공 확률 +30%, 쓰면 없어진다
{const s=game(67),[r,d]=town(s);r.location=d.location='hall';d.hp=0;d.downed={left:2,epoch:s.epoch,cause:'test'};r.role='doctor';/* 2026-11-24 살리기는 의사만 */
 const base=C.choices(s,r.id,'big').find(a=>a.type==='revive'&&!a.morphine);ok(!!base&&!C.choices(s,r.id,'big').some(a=>a.morphine),'모르핀이 없으면 보통 살리기만');
 r.items.morphine=1;const mo=C.choices(s,r.id,'big').find(a=>a.type==='revive'&&a.morphine);ok(!!mo&&/군용 모르핀 · 성공 100%/.test(mo.label),'모르핀이 있으면 "살리기 · 군용 모르핀" (의사 90% → 100%) ('+(mo&&mo.label)+')');
 s.stage='plan';s.plans={[r.id]:{type:'revive',target:d.id,morphine:true}};C.resolveBig(s,()=>0.45);ok(!d.downed&&d.hp===1&&r.items.morphine===0,'주사위 46으로 100% 안에 들어 살아나고, 모르핀은 없어짐');
 const r2=s.players.find(p=>p!==r&&p!==d&&p.team==='town');ok(C.validate(s,r2.id,{type:'revive',target:d.id,morphine:true},'big')!==null,'모르핀 없이 모르핀 살리기는 받지 않음');}
// 12. 자물쇠 따개: 낮에 주인이 없는 남의 집. 못 하면 집에 있던 이웃이 보고 자물쇠에 자국이 남는다
{const s=game(71),[p,t,w,h]=town(s);p.location='home';t.location='hall';w.location='home';h.location='home';p.items.lockpick=1;
 const opts=acts(s,p).filter(a=>a.verb==='pickHouse').map(a=>a.house);ok(opts.includes(t.id)&&!opts.includes(w.id),'주인이 집에 없는 집만 딸 수 있음');
 S.resolve(s,p,acts(s,p).find(a=>a.verb==='pickHouse'&&a.house===t.id),hi);ok(/집 살피기 →/.test(fed(s,p))&&!/범행을 뜻하지는/.test(fed(s,p)),'자물쇠를 따면 그 집을 살피고, 해석 문장은 없음');
 ok(!acts(s,p).some(a=>a.verb==='pickHouse'&&a.house===t.id),'같은 때에 같은 집은 다시 따지 않음');
 const u=s.players.find(x=>x.team==='town'&&![p,t,w,h].includes(x))||s.players.find(x=>![p,t,w,h].includes(x));u.location='tavern';
 S.resolve(s,p,acts(s,p).find(a=>a.verb==='pickHouse'&&a.house===u.id),lo);ok(w.known.some(k=>k.about===p.id&&/자물쇠를 만지는/.test(k.text))&&u.known.some(k=>/긁힌 자국/.test(k.text)),'못 하면 집에 있던 이웃이 보고, 집주인은 긁힌 자국을 앎');
 s.turn=2;ok(!acts(s,p).some(a=>a.verb==='pickHouse'),'밤에는 따지 않음');}
// 13. 손전등: 어두운 곳의 관찰 벌점이 사라지고, 어두운 곳에서 숨기 -2
{const s=game(73),[p,q2]=town(s);p.location=q2.location='warehouse';const lastRoll=x=>s.feed.filter(e=>e.to.includes(x.id)&&e.roll).at(-1)?.roll||{terms:[]};
 C.smallAct(s,q2.id,{type:'observe'},hi);ok(lastRoll(q2).terms.some(x=>/어두운 시야/.test(x.label)),'손전등이 없으면 갱도에서 관찰 -2');
 p.items.flashlight=1;C.smallAct(s,p.id,{type:'observe'},hi);ok(!lastRoll(p).terms.some(x=>/어두운 시야/.test(x.label)),'손전등이 있으면 갱도에서 관찰 벌점 없음');
 s.epoch++;for(const x of s.players)x.used={big:false,small:false};C.smallAct(s,p.id,{type:'hide'},hi);ok(lastRoll(p).terms.some(x=>x.label==='손전등 불빛'&&x.value===-2),'손전등이 있으면 어두운 곳에서 숨기 -2');}
