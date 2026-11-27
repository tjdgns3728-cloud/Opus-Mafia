// 2026-11-27 사용자 선택 "대가를 숫자로": 밤 행동을 고를 때 대가(피곤함)가 지금 내 체력의 숫자로 보이고, 그 숫자가 실제 밤 처리와 같은지.
// CM이 사람 자리로 한 판(YPGS)을 했을 때 "다음 날 피곤함"만 보여, 최대 체력이 절반이 되는 것을 결과에서야 알았고 다음 밤 기습 한 번에 쓰러졌다.
// 사용: node cost_numbers_test.js <저장소 경로>
const path = require('path'), fs = require('fs');
const dir = path.join(path.resolve(process.argv[2] || '.'), 'game', 'games', 'noir-trpg', 'scripts');
for (const f of ['00World', '01Narrative', '02Press', '04Incidents', '05Scenarios', '06StoryDirector', '07StoryActions', '08StoryFlow', '09Minds']) require(path.join(dir, f + '.js'));
const C = globalThis.NoirTRPG, S = globalThis.NoirScenarios;
let seed = 31; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const ok = (c, m) => { console.log((c ? '통과 ' : '실패 ') + m); if (!c) process.exitCode = 1; };
const night = () => {
  const s = C.create(['가람', '나래', '다온', '라희', '마루', '바다', '사랑', '아름'].map((n, i) => ({id: 'p' + i, name: n, bot: true})), rng); S.start(s);
  s.day = 2; s.turn = 2; s.stage = 'plan';
  for (const p of s.players) { p.location = p.team === 'mafia' ? 'hideout' : 'home'; p.houseId = p.team === 'mafia' ? null : p.id; p.hidden = false; p.used = {big: false, small: false}; }
  return s;
};
const label = (s, P, type) => ((C.choices(s, P.id, 'big').find(a => a.type === type)) || {}).label || '';
const resolve = (s, plans) => { s.plans = plans; for (const p of s.players) if (!s.plans[p.id]) s.plans[p.id] = p.team === 'mafia' ? {type: 'wait'} : {type: 'sleep'}; C.announceClashes?.(s); s.stage = 'plan'; C.resolveBig(s, rng); };

// 피곤하지 않은 체력 10
{ const s = night(), P = s.players.find(p => p.team === 'town');
  ok(/불침번 서기 · 습격해 오면 맞서 겨룸 · 다음 날 피곤함\(체력 10 → 5, 최대 체력 10 → 5, 싸움·숨기 판정 -2 · 잠을 잔 밤이 끝나면 풀림\)/.test(label(s, P, 'watch')), '불침번 글에 대가 숫자: ' + label(s, P, 'watch'));
  ok(/집 안에 숨기 .*체력 10 → 5/.test(label(s, P, 'shelter')) && /의 집 지키기 .*체력 10 → 5/.test(label(s, P, 'guardHouse')), '숨기·남의 집 지키기 글에도 같은 숫자');
  ok(label(s, P, 'sleep') === '잠자기 · 체력 그대로(10/10)', '잠자기(체력 가득): ' + label(s, P, 'sleep'));
  resolve(s, {[P.id]: {type: 'watch'}});
  ok(P.hp === 5 && P.tired, `실제 밤 처리: 불침번 뒤 체력 ${P.hp}, 피곤함 ${P.tired} — 글의 "10 → 5"와 같음`); }
// 체력 7(홀수)
{ const s = night(), P = s.players.find(p => p.team === 'town'); P.hp = 7;
  ok(/체력 7 → 4,/.test(label(s, P, 'shelter')) && label(s, P, 'sleep') === '잠자기 · 습격·출혈이 없으면 체력 7 → 8', '체력 7: 숨기 "7 → 4", 잠자기 "7 → 8" — ' + label(s, P, 'sleep'));
  resolve(s, {[P.id]: {type: 'shelter'}});
  ok(P.hp === 4, '실제 밤 처리: 숨기 뒤 체력 ' + P.hp + ' (글의 "7 → 4"와 같음)'); }
// 이미 피곤한 체력 5
{ const s = night(), P = s.players.find(p => p.team === 'town'); P.hp = 5; P.tired = true;
  ok(/불침번 서기 · 습격해 오면 맞서 겨룸 · 피곤함 계속\(최대 체력 5, 싸움·숨기 판정 -2\)/.test(label(s, P, 'watch')), '피곤할 때 불침번: "피곤함 계속" — ' + label(s, P, 'watch'));
  ok(label(s, P, 'sleep') === '잠자기 · 이 밤이 끝나면 피곤함이 풀려 체력 5 → 10, 최대 체력 10(이 밤에는 아직 피곤함)', '피곤할 때 잠자기: ' + label(s, P, 'sleep'));
  resolve(s, {[P.id]: {type: 'sleep'}});
  ok(P.hp === 10 && !P.tired, '실제 밤 처리: 잠 뒤 체력 ' + P.hp + ', 피곤함 풀림 (글의 "5 → 10"과 같음)'); }
// 행동 설명(마우스를 올리면 보이는 글)
{ const ui = fs.readFileSync(path.join(dir, '20Interface.js'), 'utf8');
  ok((ui.match(/다음 날 피곤함\(체력 절반, 최대 체력 5, 싸움·숨기 판정 -2 · 잠을 잔 밤이 끝나면 풀림\)/g) || []).length === 3 && ui.includes('피곤함은 잠을 잔 그 밤이 끝난 뒤 풀립니다.'), '행동 설명: 불침번·숨기·남의 집 지키기에 피곤함 숫자, 잠에 풀리는 때'); }
