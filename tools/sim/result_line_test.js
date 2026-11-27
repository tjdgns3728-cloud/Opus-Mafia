// 2026-11-27 사용자 선택 "결과를 한 줄로": 큰 행동을 하지 않은 사람에게도 결과 한 줄이 가는지. 사용: node result_line_test.js <저장소 경로>
// CM이 사람 자리로 한 판(YPGS)을 했을 때 1일째 사진 찍기를 고르던 창이 시간이 끝나 닫혀 "기다리기"가 됐는데, 결과에 아무 줄도 없어 무슨 일인지 몰랐다.
// (행동 종류마다 결과 줄을 돌려 본 확인에서 줄이 없던 것은 큰 행동 "기다리기"와 고르지 않은 경우뿐이었다.)
const path = require('path');
const dir = path.join(path.resolve(process.argv[2] || '.'), 'game', 'games', 'noir-trpg', 'scripts');
for (const f of ['00World', '01Narrative', '02Press', '04Incidents', '05Scenarios', '06StoryDirector', '07StoryActions', '08StoryFlow', '09Minds']) require(path.join(dir, f + '.js'));
const C = globalThis.NoirTRPG, S = globalThis.NoirScenarios;
const ok = (c, m) => { console.log((c ? '통과 ' : '실패 ') + m); if (!c) process.exitCode = 1; };
let seed = 41; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const make = (night) => {
  const s = C.create(['가람', '나래', '다온', '라희', '마루', '바다', '사랑', '아름'].map((n, i) => ({id: 'p' + i, name: n, bot: i > 0})), rng); S.start(s);
  s.day = 2; s.turn = night ? 2 : 0; s.stage = 'plan';
  for (const p of s.players) { if (night) { p.location = p.team === 'mafia' ? 'hideout' : 'home'; p.houseId = p.team === 'mafia' ? null : p.id; } else { p.location = 'hall'; p.houseId = null; } p.hidden = false; p.used = {big: false, small: false}; }
  return s;
};
const run = (s, plans) => { s.plans = plans; const n0 = s.feed.length; C.announceClashes?.(s); s.stage = 'plan'; C.resolveBig(s, rng); return s.feed.slice(n0); };
const mine = (lines, id) => lines.filter(e => e.to.includes(id) && !['speech', 'environment'].includes(e.kind));
const NONE = '시간 안에 큰 행동을 고르지 않아 이번 때에는 큰 행동을 하지 않았습니다.', WAIT = '큰 행동 없이 기다렸습니다.';
{ const s = make(false), me = s.players[0], plans = {};
  for (const p of s.players.slice(1)) plans[p.id] = {type: 'wait'};
  const L = mine(run(s, plans), me.id);
  ok(L.some(e => e.text === NONE && e.tag === '내 행동'), '낮에 큰 행동을 고르지 않으면: [내 행동] ' + NONE); }
{ const s = make(false), me = s.players[0], plans = {[me.id]: {type: 'wait'}};
  for (const p of s.players.slice(1)) plans[p.id] = {type: 'wait'};
  const L = mine(run(s, plans), me.id);
  ok(L.some(e => e.text === WAIT && e.tag === '내 행동') && !L.some(e => e.text === NONE), '"선택 마치기"로 기다리면: [내 행동] ' + WAIT); }
{ const s = make(false), me = s.players[0], t = s.players[1], plans = {[me.id]: {type: 'track', target: t.id}};
  for (const p of s.players.slice(1)) plans[p.id] = {type: 'wait'};
  const L = mine(run(s, plans), me.id);
  ok(L.length > 0 && !L.some(e => e.text === WAIT || e.text === NONE), '다른 큰 행동(뒤밟기)은 그 결과 줄만 — ' + L.map(e => e.text.slice(0, 40)).join(' / ')); }
{ const s = make(true), town = s.players.find(p => p.team === 'town'), plans = {};
  for (const p of s.players) if (p.id !== town.id) plans[p.id] = p.team === 'mafia' ? {type: 'wait'} : {type: 'sleep'};
  const L = mine(run(s, plans), town.id);
  ok(!L.some(e => e.text === NONE || e.text === WAIT), '밤의 시민은 이 줄 대신 밤 처리의 "정하지 않아 잠." 등 — ' + L.map(e => e.text.slice(0, 30)).join(' / ')); }
{ const s = make(true), maf = s.players.find(p => p.team === 'mafia'), plans = {};
  for (const p of s.players) plans[p.id] = p.team === 'mafia' ? {type: 'wait'} : {type: 'sleep'};
  const L = mine(run(s, plans), maf.id);
  ok(L.some(e => e.text === WAIT), '밤에 마피아가 기다리면: ' + WAIT); }
{ const s = make(false), me = s.players[0]; me.hp = 0; me.downed = {day: 2, asked: false}; const plans = {};
  for (const p of s.players.slice(1)) plans[p.id] = {type: 'wait'};
  const L = mine(run(s, plans), me.id);
  ok(!L.some(e => e.text === NONE || e.text === WAIT), '쓰러진 사람에게는 이 줄을 보내지 않음'); }
