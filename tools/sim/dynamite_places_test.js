// 2026-11-27 사용자 선택 "B1·B2 폭약 목표", 범위 "집·본거지를 뺀 모든 장소", 흔적 "현장 수색으로만".
// 폭약을 갱도 말고도 사람이 모이는 곳에 설치할 수 있고, 터지면 그곳의 사람·NPC가 모두 죽으며, 도화선은 그곳에서 현장 수색으로 찾아 끊는다.
// 사용: node dynamite_places_test.js <저장소 경로>
const path = require('path');
const dir = path.join(path.resolve(process.argv[2] || '.'), 'game', 'games', 'noir-trpg', 'scripts');
for (const f of ['00World', '01Narrative', '02Press', '04Incidents', '05Scenarios', '06StoryDirector', '07StoryActions', '08StoryFlow']) require(path.join(dir, f + '.js'));
const C = globalThis.NoirTRPG, S = globalThis.NoirScenarios, ST = globalThis.NoirStory;
const ok = (c, m) => { console.log((c ? '통과 ' : '실패 ') + m); if (!c) process.exitCode = 1; };
const names = ['가람', '나래', '다온', '라희', '마루', '바다', '사랑', '아라'];
function game(seed) { let x = seed; const rng = () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; const s = C.create(names.map((n, i) => ({id: 'p' + i, name: n, bot: true})), rng); S.start(s, rng); S.afterGathering?.(s); s.rng = rng; return s; }
const armed = (s, m, place) => { m.location = place; s.scenario.bombs.forEach((b, i) => b.where = i < 1 ? 'carry:' + m.id : 'hideout'); m.items.dynamite = 1; };
const armOpt = (s, m) => S.choices(s, m, 'big').find(a => a.sceneKey === 'arm');
// 1. 설치할 수 있는 곳
{ const s = game(21), m = s.players.find(p => p.team === 'mafia'); s.day = 2; s.turn = 0;
  const can = {}; for (const place of ['hall', 'tavern', 'clinic', 'chapel', 'office', 'union', 'warehouse', 'rail', 'bridge', 'home', 'hideout']) { armed(s, m, place); if (place === 'home') m.houseId = m.id; can[place] = !!armOpt(s, m); }
  ok(['hall', 'tavern', 'clinic', 'chapel', 'office', 'union', 'warehouse', 'rail', 'bridge'].every(k => can[k]) && !can.home && !can.hideout, '집·본거지를 뺀 모든 장소에서 "폭약 설치하기" — ' + JSON.stringify(can));
  armed(s, m, 'hall'); ok(armOpt(s, m).label === '마을 회관에 폭약 설치하기', '단추 이름에 장소: ' + armOpt(s, m).label);
  armed(s, m, 'warehouse'); ok(armOpt(s, m).label === '갱도에 폭약 설치하기', '갱도는 예전 이름 그대로'); }
// 2. 회관에 설치 → 현장 수색으로 도화선을 찾고, 그곳에서만 끊을 수 있음
{ const s = game(23), m = s.players.find(p => p.team === 'mafia'), t = s.players.find(p => p.team === 'town'), u = s.players.find(p => p.team === 'town' && p.id !== t.id);
  s.day = 2; s.turn = 2; for (const p of s.players) if (p.team === 'town') { p.location = 'home'; p.houseId = p.id; } armed(s, m, 'hall');
  S.resolve(s, m, {type: 'scene', sceneKey: 'arm'}, s.rng);
  ok(s.scenario.fuse?.status === 'armed' && s.scenario.fuse.place === 'hall', '밤에 회관에 설치 → 도화선 장소 회관');
  ok(!(t.known || []).some(k => /폭약을 설치/.test(String(k.text))), '밤이라 집에 있던 시민은 설치를 보지 못함');
  ok(!S.choices(s, s.players.find(p => p.team === 'mafia' && p.id !== m.id) || m, 'big').some(a => a.sceneKey === 'arm'), '도화선이 타는 동안에는 더 설치할 수 없음');
  C.nextTurn(s); S.nextChapter(s); s.day = 3; s.turn = 0;
  t.location = 'hall'; u.location = 'tavern';
  ok(!S.choices(s, t, 'big').some(a => a.sceneKey === 'disarm'), '찾기 전에는 끊기 없음');
  const hi = () => 0.99; S.investigate(s, t, hi);
  const key = t.storyKnown.find(k => k.startsWith('fuse:hall:'));
  const clue = (t.known || []).map(k => String(k.text)).find(x => /타들어 가는 도화선/.test(x)) || '';
  ok(!!key, '회관에서 현장 수색 → 도화선 단서(' + key + ')');
  ok(/마을 회관 구석을 따라 타들어 가는 도화선/.test(clue) && /이번 때가 끝나면 터지고/.test(clue), '단서 글: 장소와 "이번 때가 끝나면" — ' + clue.slice(0, 80));
  ok(S.choices(s, t, 'big').some(a => a.sceneKey === 'disarm'), '찾은 사람은 회관에서 끊기 가능');
  S.investigate(s, u, hi);
  ok(!u.storyKnown.some(k => k.startsWith('fuse:')), '다른 곳(술집)에서 수색하면 도화선을 못 찾음');
  t.location = 'tavern'; ok(!S.choices(s, t, 'big').some(a => a.sceneKey === 'disarm'), '회관을 떠나면 끊기 없음'); t.location = 'hall';
  S.resolve(s, t, {type: 'scene', sceneKey: 'disarm'}, hi);
  ok(s.scenario.fuse.status === 'disarmed', '끊으면 터지지 않음(도화선 분리 판정 성공)'); }
// 3. 회관에서 터짐 → 그때 회관에 있던 사람·NPC 모두 죽고, 갱도는 무너지지 않음
{ const s = game(25), m = s.players.find(p => p.team === 'mafia'), town = s.players.filter(p => p.team === 'town');
  s.day = 2; s.turn = 2; armed(s, m, 'hall');
  S.resolve(s, m, {type: 'scene', sceneKey: 'arm'}, s.rng);
  ST.beforeAdvance(s); ok(s.scenario.fuse.status === 'armed', '설치한 그 때가 끝날 때는 아직 안 터짐');
  C.nextTurn(s); S.nextChapter(s); s.day = 3; s.turn = 0;
  const at = town.slice(0, 3), away = town.slice(3); for (const o of at) o.location = 'hall'; for (const o of away) o.location = 'chapel'; m.location = 'tavern';
  const doyle = s.scenario.doyle; doyle.location = 'hall'; doyle.hp = 10;
  ST.beforeAdvance(s);
  ok(s.scenario.fuse.status === 'exploded', '다음 때가 끝날 때 터짐');
  ok(at.every(o => o.hp === 0 && !o.downed && o.deathCause), '회관에 있던 시민 ' + at.length + '명 모두 죽음(살릴 수 없는 죽음)');
  ok(away.every(o => o.hp > 0) && m.hp > 0, '다른 곳 사람은 다치지 않음');
  ok(doyle.hp === 0, '회관에 있던 NPC(도일)도 죽음');
  ok(!s.scenario.exploded && (s.scenario.blasts || []).some(b => b.place === 'hall'), '갱도는 무너지지 않음(회관 폭발로 기록)');
  ok(!armOpt(s, m), '한 판에 한 번 터짐(터진 뒤에는 더 설치 없음, 예전 그대로)'); }
// 4. 갱도에 설치한 폭약은 예전처럼 갱도가 무너짐
{ const s = game(27), m = s.players.find(p => p.team === 'mafia'); s.day = 2; s.turn = 0; armed(s, m, 'warehouse');
  S.resolve(s, m, {type: 'scene', sceneKey: 'arm'}, s.rng); C.nextTurn(s); S.nextChapter(s); m.location = 'hall'; ST.beforeAdvance(s);
  ok(s.scenario.exploded === true && s.scenario.fuse.place === 'warehouse', '갱도 폭발은 예전처럼 갱도가 무너짐'); }
