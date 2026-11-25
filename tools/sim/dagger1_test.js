// 단검 고침(2026-11-25 사용자): "단검은 출혈을 일으키고 2번 찌르면 죽는 수준이여야해요", "칼이 7~8이면 시민도 칼을 들면 강해지잖아요",
// "대행자가 살인에 익숙한 사람이니 보정이 들어가죠", 퇴역군인 보정 1·대행자 3, "단검은 3~5로 해주세요", "무기 데미지는 범위가 3이 적당한 것 같습니다"
// 사용: node dagger1_test.js <저장소 경로>
const fs=require('fs'),path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow','09Minds'])require(path.join(dir,f+'.js'));
globalThis.WebEngine={room(){},Component:class{},define(){}};for(const f of ['03Visuals','20Interface'])new Function('WebEngine',fs.readFileSync(path.join(dir,f+'.js'),'utf8'))(globalThis.WebEngine);
const C=globalThis.NoirTRPG,S=globalThis.NoirScenarios,NS=globalThis.NoirScreen;
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
let x=11;const rng=()=>{x=(x*16807)%2147483647;return x/2147483647;};
const fresh=role=>{const s=C.create(['가람','나래','다온','라희','마루','바다','사랑','아라'].map((n,i)=>({id:'p'+i,name:n,bot:true})),rng);S.start(s);s.day=2;s.turn=0;s.stage='plan';for(const p of s.players){p.location='tavern';p.hidden=false;p.used={big:false,small:false};p.tired=false;p.hp=10;p.bleeding=false;}const [a,b]=s.players;if(b.role===role)b.role='lawyer';a.role=role;a.stats.fight=10;a.items.knife=1;delete b.items.vest;return {s,a,b};};
const stab=(s,a,b,r)=>{s.plans={[a.id]:{type:'attack',target:b.id,weapon:'knife',flee:'stay'}};for(const p of s.players)if(!s.plans[p.id])s.plans[p.id]={type:'wait'};C.announceClashes(s);s.stage='plan';C.resolveBig(s,r);};
// 1. 무기 값: 피해 3~5(주사위 3 + 2), 보정은 직업으로만(대행자 +3, 퇴역군인 +1), 맞으면 출혈
{const w=C.weapons.knife;ok(w.base+1===3&&w.base+w.die===5&&w.roleBonus?.mafioso===3&&w.roleBonus?.guard===1&&w.bleed&&w.bleedOnHit,'단검 값: 피해 '+(w.base+1)+'~'+(w.base+w.die)+', 대행자 +3, 퇴역군인 +1, 맞으면 출혈');}
// 2. 판정: 싸움 10이어도 보정은 직업으로만. 대행자 3, 퇴역군인 1, 보안관 0. 들어가는 피해 = 3~5 + 보정 − 감소(0·3·6)
for(const [role,want] of [['mafioso',3],['guard',1],['sheriff',0]]){const {s,a,b}=fresh(role);let n=0,good=0;const raws=new Set();for(let i=0;i<200;i++){const r=C.attackRoll(s,a,b,{type:'attack',target:b.id,weapon:'knife'},rng);n++;raws.add(r.raw);if(r.bonus===want&&r.raw>=3&&r.raw<=5&&r.damage===Math.max(0,r.raw+r.bonus-r.reduction))good++;}ok(good===n&&raws.size===3,(C.roles?.[role]?.name||role)+' 단검 판정 '+n+'번 모두 보정 '+want+', 주사위 피해 '+[...raws].sort().join('·'));}
// 3. 대행자에게 한 번 찔린 체력 10인 사람: 쓰러지지 않음. 제대로 맞으면 2~4, 체력 7 이하로 남으면 출혈, 8 이상(완전히 피함)이면 출혈 없음
{let n=0,good=0;const hps={};for(let i=0;i<80;i++){const {s,a,b}=fresh('mafioso');stab(s,a,b,rng);n++;hps[b.hp]=(hps[b.hp]||0)+1;const want=b.hp<=7?b.bleeding:!b.bleeding;if(!b.downed&&b.hp>=2&&want)good++;}ok(good===n,'대행자에게 한 번 찔린 '+n+'번 모두 쓰러지지 않고, 맞으면 출혈·완전히 피하면 출혈 없음 (남은 체력별 수: '+Object.entries(hps).map(([k,v])=>k+'→'+v).join(', ')+')');}
// 4. 대행자에게 두 번 제대로 찔리면 쓰러짐
{let n=0,down=0;for(let i=0;i<120&&n<10;i++){const {s,a,b}=fresh('mafioso');b.stats.agility=1;b.stats.fight=1;stab(s,a,b,rng);if(b.hp>4)continue;s.turn=1;for(const p of s.players)p.used={big:false,small:false};const before=b.hp;stab(s,a,b,rng);if(!b.downed&&b.hp>before-6)continue;n++;if(b.downed||b.hp<=0)down++;}ok(n>0&&down===n,'대행자에게 두 번 제대로 찔린 '+n+'번 모두 쓰러짐');}
// 5. 보안관(싸움 8)이 찌르면 많아야 5
{let n=0,good=0;for(let i=0;i<60;i++){const {s,a,b}=fresh('sheriff');a.stats.fight=8;stab(s,a,b,rng);n++;if(b.hp>=5)good++;}ok(good===n,'보안관에게 찔린 '+n+'번 모두 피해 5 이하');}
// 6. 사람 화면: 공격 창과 게임 정보에 새 값
{const {s,a}=fresh('mafioso');const v=C.view(s,a.id),scr=NS.read(v);ok(/- 단검 · 피해 3~5 맞으면 출혈/.test(scr.text),'공격 창에 "단검 · 피해 3~5 맞으면 출혈"(2026-11-25 사용자: 무기 설명은 피해와 출혈만)');ok(/단검은 전투 보정 대신 직업 보정만 받고\(대행자 \+3, 퇴역군인 \+1, 다른 사람 0\)/.test(scr.text),'게임 정보에 단검 보정 규칙');}
