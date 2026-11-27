// 2026-11-27 사용자 선택 "창에 남은 시간": 행동을 고르는 창마다 재판 신청 창처럼 남은 시간이 보이는지. 사용: node window_clock_test.js <저장소 경로>
// CM이 사람 자리로 한 판(YPGS)을 했을 때 "살펴보기"·"인물·현장" 창을 읽다가 1분이 끝나 큰 행동이 들어가지 않았다(재판 신청 창에만 시계가 있었음).
const fs = require('fs'), path = require('path');
const repo = path.resolve(process.argv[2] || '.');
const dir = path.join(repo, 'game', 'games', 'noir-trpg', 'scripts');
const ok = (c, m) => { console.log((c ? '통과 ' : '실패 ') + m); if (!c) process.exitCode = 1; };
for (const f of ['00World', '01Narrative', '02Press', '04Incidents', '05Scenarios', '06StoryDirector', '07StoryActions', '08StoryFlow', '09Minds']) require(path.join(dir, f + '.js'));
let UI = null; globalThis.WebEngine = {room() {}, Component: class {}, define(n, c) { if (n === 'TRPGUI') UI = c; }};
for (const f of ['03Visuals', '20Interface']) new Function('WebEngine', fs.readFileSync(path.join(dir, f + '.js'), 'utf8'))(globalThis.WebEngine);
const C = globalThis.NoirTRPG, S = globalThis.NoirScenarios;
const ui = fs.readFileSync(path.join(dir, '20Interface.js'), 'utf8'), css = fs.readFileSync(path.join(repo, 'game', 'games', 'noir-trpg', 'assets', 'trpg.css'), 'utf8');
const clock = '<p class="win-clock" data-win-clock></p>';
// 창 틀마다 시계 자리
const after = (head) => ui.includes(head + clock);
ok(after('<h2 id="picker-title">${E(GROUP_NAME[q.type]||this.actionName(q.type))}</h2>'), '행동 고르기 창(작은·큰 행동, 살펴보기·사람에게 하는 일 등)에 남은 시간');
ok(after("<h2>${q.sceneKey==='forge'?'출입 기록 위조하기':E(a.label)}</h2>"), '인물·현장(장면) 창에 남은 시간');
ok(after('<h2 id="consent-title">이 재판을 여는 데 동의합니까?</h2>'), '재판 개정 동의 창에 남은 시간');
ok(after('<h2>현장에서 말 걸기</h2>'), '현장에서 말 걸기 창에 남은 시간');
ok(after('<h2 id="trial-title">재판 신청하기</h2>') && after('<h2 id="press-title">사진으로 신문 만들기</h2>'), '재판 신청·신문 만들기 창은 예전처럼 남은 시간');
ok(/querySelectorAll\('\[data-win-clock\]'\)\)\{el\.textContent='남은 시간 '\+fmt\(left\);el\.classList\.toggle\('urgent',left<=10\);\}/.test(ui) && /\.win-clock\.urgent\{color:/.test(css), '시계는 매 틱 "남은 시간 m:ss", 10초 이하면 붉은 글(urgent)');
// 실제로 창을 그려 시계 자리가 있는지(행동 고르기 창)
{
  let x = 97; const rng = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
  const s = C.create(['가람', '나래', '다온', '라희', '마루', '바다', '사랑', '아름'].map((n, i) => ({id: 'p' + i, name: n, bot: i > 0})), rng); S.start(s);
  s.day = 2; s.turn = 0; s.stage = 'plan'; for (const p of s.players) { p.location = 'hall'; p.houseId = null; p.hidden = false; p.used = {big: false, small: false}; }
  const v = C.view(s, 'p0'), u = Object.create(UI.prototype);
  u.now = {view: v}; u.engine = {room: {left: () => 42}};
  const big = C.choices(s, 'p0', 'big');
  const pick = big.find(a => a.type === 'attack') || big.find(a => a.type !== 'scene') || big[0];
  u.options = big; u.optionsBySlot = {big, small: C.choices(s, 'p0', 'small')};
  u.actionPicker = {type: pick.type, slot: 'big', epoch: v.epoch, stage: v.stage};
  let html = ''; try { html = u.pickerView(v) || ''; } catch (e) { html = 'ERR ' + e.message; }
  ok(html.includes('action-picker') && html.includes(clock), `그린 행동 창(${pick.type})에 시계 자리가 있음` + (html.includes('action-picker') ? '' : ' — 창을 그리지 못함: ' + html.slice(0, 120)));
}
