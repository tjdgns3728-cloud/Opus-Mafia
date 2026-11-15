// 거리와 소리 범위 확인. 사용: node sound_test.js <저장소 경로>
const path=require('path');const dir=path.join(path.resolve(process.argv[2]||'.'),'game','games','noir-trpg','scripts');
for(const f of ['00World','01Narrative','02Press','04Incidents','05Scenarios','06StoryDirector','07StoryActions','08StoryFlow'])require(path.join(dir,f+'.js'));
const C=globalThis.NoirTRPG;let seed=3;const rng=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
const ok=(c,m)=>{console.log((c?'통과 ':'실패 ')+m);if(!c)process.exitCode=1;};
const places=Object.keys(C.places);
console.log('거리표: '+places.map(a=>C.places[a].short+'('+places.filter(b=>b!==a).map(b=>C.places[b].short+C.distance(a,b)).join(' ')+')').join(' / '));
ok(places.every(a=>places.every(b=>C.distance(a,b)===C.distance(b,a))),'거리는 양쪽이 같음');
const seats=places.map((pl,i)=>({id:'p'+i,name:['가람','나래','다온','라희','마루','바다'][i],bot:true}));
const s=C.create(seats,rng);globalThis.NoirScenarios?.start?.(s);s.players.forEach((p,i)=>{p.location=places[i];});
const heard=(src,kind)=>{const before=s.feed.length;C.noise(s,src,'소리 '+kind,kind);return s.feed.slice(before).flatMap(e=>e.to).map(id=>C.find(s,id).location).sort();};
for(const src of s.players){const g=heard(src,'gun'),b=heard(src,'blast');const exp=k=>places.filter(pl=>pl!==src.location&&C.distance(pl,src.location)<=k).sort();
 ok(JSON.stringify(g)===JSON.stringify(exp(1)),C.places[src.location].short+' 총성 → '+(g.map(x=>C.places[x].short).join(',')||'아무도 못 들음'));
 ok(JSON.stringify(b)===JSON.stringify(exp(2)),C.places[src.location].short+' 폭발 → '+(b.map(x=>C.places[x].short).join(',')||'아무도 못 들음'));}
// 밤 주택가: 이웃집은 '가까운 집에서', 거리 1인 회관은 방향만
s.turn=2;const a=s.players[0],v=s.players[1],nb=s.players[2],far=s.players[3];a.location='home';a.houseId=v.id;v.location='home';v.houseId=v.id;nb.location='home';nb.houseId=nb.id;far.location='hall';
const before=s.feed.length;C.noise(s,a,'비명과 다투는 소리가 들렸습니다.','fight');const got=s.feed.slice(before);
ok(got.some(e=>e.to.includes(nb.id)&&e.text.startsWith('가까운 집에서')),'밤 칼부림: 이웃집에 "가까운 집에서" 들림');
ok(!got.some(e=>e.to.includes(far.id)),'밤 칼부림: 회관(거리 1)에는 비명이 들리지 않음');
for(const src of s.players.filter(p=>p.location!=='home')){const f=heard(src,'fight');ok(f.length===0,C.places[src.location].short+' 비명 → '+(f.map(x=>C.places[x].short).join(',')||'다른 장소는 못 들음'));}
ok(!got.some(e=>e.to.includes(v.id)||e.to.includes(a.id)),'같은 집 안 사람에게는 주변 소리로 보내지 않음');
