// 단검 고침(2026-11-25 사용자): "단검은 출혈을 일으키고 2번 찌르면 죽는 수준이여야해요 데미지가 7~8정도가 들어가면 좋습니다"
// 사용: node dagger1_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=11;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=()=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};p.tired=false;p.hp=10;p.bleeding=false;}const [a,b]=s.players;a.stats.fight=10;a.items.knife=1;delete b.items.vest;return {s,a,b};};
const stab=(s,a,b,r)=>{s.plans={[a.id]:{type:'attack',target:b.id,weapon:'knife',flee:'stay'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,r);};
// 1. 무기 값: 피해 7~8(주사위 2 + 6), 전투 보정 없음, 맞으면 출혈
{const w=C.weapons.knife;ok(w.base+1===7&&w.base+w.die===8&&w.noBonus&&w.bleed&&w.bleedOnHit,'단검 값: 피해 '+(w.base+1)+'~'+(w.base+w.die)+', 전투 보정 없음, 맞으면 출혈');}
// 2. 판정: 싸움 10이어도 보정 0, 주사위 피해 7~8, 들어가는 피해 = 7~8 − 감소(0·3·6)
{const {s,a,b}=fresh();let n=0,good=0;const seen=new Set();for(let i=0;i<200;i++){const r=C.attackRoll(s,a,b,{type:'attack',target:b.id,weapon:'knife'},rng);n++;seen.add(r.reduction);if(r.bonus===0&&(r.raw===7||r.raw===8)&&r.damage===Math.max(0,r.raw-r.reduction))good++;}ok(good===n,'단검 판정 '+n+'번 모두 보정 0, 주사위 피해 7~8, 피해 = 7~8 − 감소 (나온 감소: '+[...seen].sort().join('·')+')');}
// 3. 체력 10인 사람은 한 번 찔려서는 쓰러지지 않음. 완전히 피하지 못하면(체력 6 이하로 남음) 출혈, 완전히 피하면(8~9) 출혈 없음
{let n=0,good=0;const hps={};for(let i=0;i<80;i++){const {s,a,b}=fresh();stab(s,a,b,rng);n++;hps[b.hp]=(hps[b.hp]||0)+1;const want=[2,3,5,6].includes(b.hp)?b.bleeding:[8,9].includes(b.hp)?!b.bleeding:false;if(!b.downed&&b.hp>0&&want)good++;}ok(good===n,'한 번 찔린 '+n+'번 모두 쓰러지지 않고, 맞으면 출혈·완전히 피하면 출혈 없음 (남은 체력별 수: '+Object.entries(hps).map(([k,v])=>k+'→'+v).join(', ')+')');}
// 4. 두 번 제대로 찔리면 쓰러짐
{let n=0,down=0;for(let i=0;i<80&&n<10;i++){const {s,a,b}=fresh();b.stats.agility=1;b.stats.fight=1;stab(s,a,b,rng);if(![2,3].includes(b.hp))continue;s.turn=1;for(const p of s.players)p.used={big:false,small:false};const before=b.hp;stab(s,a,b,rng);if(b.hp>before-7&&!b.downed)continue;n++;if(b.downed||b.hp<=0)down++;}ok(n>0&&down===n,'두 번 제대로 찔린 '+n+'번 모두 쓰러짐');}
// 5. 사람 화면: 공격 창과 게임 정보에 새 값
{const {s,a}=fresh();const v=C.view(s,a.id),scr=NS.read(v);ok(/- 단검 · 피해 7~8 · 맞으면 출혈/.test(scr.text),'공격 창에 "단검 · 피해 7~8 · 맞으면 출혈"');ok(/단검은 전투 보정 없이 7~8이고, 완전히 피하지 못하면 체력과 관계없이 출혈/.test(scr.text),'게임 정보에 단검 규칙');}
