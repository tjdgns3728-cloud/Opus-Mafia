// 2026-11-27 사용자 선택 "결말에 직업 공개": 판이 끝나면 모두의 직업이 보이는 결말이 뜨는지. 사용: node end_screen_test.js <저장소 경로>
// CM이 사람 자리로 한 판(YPGS, AI 없음)을 끝까지 했을 때 밤 결과로 마피아가 이겼는데, 단계가 '집계 결과(decision)'에 머물러 결말(모두의 직업)이 뜨지 않았다.
// ① 화면 글: 끝 단계면 결말에 모두의 직업, 읽기(decision) 중이면 아직 없음 ② 실제 방 하나를 AI 없이 끝까지 돌려 끝 단계로 바뀌는지
const fs = require('fs'), path = require('path');
const repo = path.resolve(process.argv[2] || '.');
const dir = path.join(repo, 'game', 'games', 'noir-trpg', 'scripts');
const ok = (c, m) => { console.log((c ? '통과 ' : '실패 ') + m); if (!c) process.exitCode = 1; };

// ① 화면 글(사람 화면과 같은 칸을 글로 옮긴 AI 화면 글)
for (const f of ['00World', '01Narrative', '02Press', '04Incidents', '05Scenarios', '06StoryDirector', '07StoryActions', '08StoryFlow', '09Minds']) require(path.join(dir, f + '.js'));
globalThis.WebEngine = {room() {}, Component: class {}, define() {}};
for (const f of ['03Visuals', '20Interface']) new Function('WebEngine', fs.readFileSync(path.join(dir, f + '.js'), 'utf8'))(globalThis.WebEngine);
const C = globalThis.NoirTRPG, S = globalThis.NoirScenarios, NS = globalThis.NoirScreen;
let x = 97; const rng = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
{
  const s = C.create(['가람', '나래', '다온', '라희', '마루', '바다', '사랑', '아름'].map((n, i) => ({id: 'p' + i, name: n, bot: i > 0})), rng); S.start(s);
  for (const p of s.players.filter(p => p.team === 'town').slice(1)) { p.hp = 0; p.downed = null; p.deathCause = '시험'; }
  const res = C.finish(s);
  ok(!!res && !!s.result, '시험 판: 시민 편을 줄이면 승패가 정해짐 — ' + (s.result && s.result.text));
  const me = s.players[0];
  s.stage = 'decision'; s.readingStep = 'text';
  const reading = NS.read(C.view(s, me.id)).text;
  s.stage = 'end'; s.readingStep = null;
  const done = NS.read(C.view(s, me.id)).text;
  const roleNames = s.players.map(p => C.roles[p.role].name);
  ok(!reading.includes('이야기의 끝') && done.includes('이야기의 끝'), '결말 칸: 읽기(decision) 중에는 없고, 끝 단계에서 나옴');
  ok(s.players.every(p => new RegExp(`${p.name} · ${C.roles[p.role].name} · ${p.team === 'mafia' ? '마피아' : '시민'}`).test(done)), '끝 단계 결말에 모두의 이름 · 직업 · 편: ' + roleNames.join(', '));
}
const ui = fs.readFileSync(path.join(dir, '20Interface.js'), 'utf8'), ses = fs.readFileSync(path.join(dir, '10Session.js'), 'utf8');
ok(ui.includes("${v.result&&v.stage!=='decision'&&!this.dismissEnd?this.ending(v):''}"), '사람 화면: 결과가 있고 읽기(decision)가 아니면 결말(모두의 직업)을 띄움');
ok(/function end\(r\)\{[^]*?if\(!s\.ended\)\{s\.ended=true;[^]*?s\.stage='end';s\.readingStep=null;/.test(ses), '판이 끝나면 끝 단계로 바꿈(10Session.js end)');

// ② 실제 방 하나를 AI 없이(사람 자리 하나 + 규칙 봇 일곱) 빠르게 끝까지
(async () => {
  const {createHost, loadEngine} = require(path.join(repo, 'game', 'webengine', 'server', 'room_host.js'));
  const W = loadEngine(path.join(repo, 'game', 'webengine', 'runtime'));
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) new Function('WebEngine', fs.readFileSync(path.join(dir, f), 'utf8'))(W);
  const rules = W.roomRules(), assets = path.join(repo, 'game', 'games', 'noir-trpg', 'assets');
  const data = p => { try { return JSON.parse(fs.readFileSync(path.join(assets, p), 'utf8')); } catch { return null; } };
  const logs = [];
  const host = createHost({WebEngine: W, rules, data, log: m => logs.push(m), opts: {name: '시험', timeScale: 200, aiMode: 'off', away: 9999, hold: 0, seed: 4321}});
  const c = await host.handle({op: 'create', name: '사람'});
  for (let i = 0; i < 7; i++) await host.handle({op: 'bot_add', room: c.room, key: c.key});
  const st = await host.handle({op: 'start', room: c.room, key: c.key});
  ok(c.ok && st.ok, '방 만들기와 시작(사람 1 + 규칙 봇 7)');
  const t0 = Date.now(); let now;
  while (Date.now() - t0 < 240000) {
    now = await host.handle({op: 'news', room: c.room, key: c.key, since: 0});
    if (now && now.status === 'over') break;
    if (now && now.view && now.view.stage === 'move') await host.handle({op: 'act', room: c.room, key: c.key, action: {type: 'stay'}});
    await new Promise(r => setTimeout(r, 50));
  }
  const R = host.rooms.get(c.room), s = R && R.api.state;
  ok(now && now.status === 'over' && s && s.result, `판이 끝남: ${s && s.result ? s.result.text : '끝나지 않음'} (${Math.round((Date.now() - t0) / 1000)}초)`);
  ok(s && s.stage === 'end', '끝난 판의 단계가 끝(end) — 지금 ' + (s && s.stage));
  const v = now && now.view;
  ok(v && v.result && v.stage === 'end' && v.people.length === 8 && v.people.every(p => p.role && C.roles[p.role]), '사람 자리의 마지막 보기에 결과와 모두의 직업이 있음');
  ok(!logs.some(m => /오류|Error/.test(m)), '서버 기록에 오류 없음' + (logs.length ? ' — ' + logs.slice(0, 2).join(' / ').slice(0, 200) : ''));
  process.exit(process.exitCode || 0);
})();
