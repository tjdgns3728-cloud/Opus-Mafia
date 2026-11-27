// 2026-11-27 사용자 선택 "빈 단계 넘기기", 범위 "이야기·결과 단계 모두": 이야기·채팅 시간(readSeconds)인 읽기 단계도 사람 자리가 모두 확인을 누르면 바로 넘어가는지.
// 사용: node skip_read_test.js <저장소 경로>
// ① 진행 칸(몇 명 확인했나)과 화면 글 ② 실제 방(사람 1 + 규칙 봇 7, AI 없음)에서 도입 이야기 단계에 확인을 누르면 40초를 기다리지 않고 넘어감
const fs = require('fs'), path = require('path');
const repo = path.resolve(process.argv[2] || '.');
const dir = path.join(repo, 'game', 'games', 'noir-trpg', 'scripts');
const ok = (c, m) => { console.log((c ? '통과 ' : '실패 ') + m); if (!c) process.exitCode = 1; };

for (const f of ['00World', '01Narrative', '02Press', '04Incidents', '05Scenarios', '06StoryDirector', '07StoryActions', '08StoryFlow', '09Minds']) require(path.join(dir, f + '.js'));
let UI = null; globalThis.WebEngine = {room() {}, Component: class {}, define(n, c) { if (n === 'TRPGUI') UI = c; }};
for (const f of ['03Visuals', '20Interface']) new Function('WebEngine', fs.readFileSync(path.join(dir, f + '.js'), 'utf8'))(globalThis.WebEngine);
const C = globalThis.NoirTRPG, S = globalThis.NoirScenarios, NS = globalThis.NoirScreen;
let x = 97; const rng = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
{
  const s = C.create(['가람', '나래', '다온', '라희', '마루', '바다', '사랑', '아름'].map((n, i) => ({id: 'p' + i, name: n, bot: i > 1})), rng); S.start(s);
  s.cfg.readSeconds = 40; s.stage = 'result'; s.readingStep = 'text'; s.ready = ['p1'];
  const v = C.view(s, 'p0');
  ok(/모두 확인하면 다음으로/.test(v.progress.label) && v.progress.done === 1 && v.progress.total === 2 && !v.progress.private, '진행 칸: 사람 자리 2명 중 1명 확인 — ' + v.progress.label + ' ' + v.progress.done + '/' + v.progress.total);
  const scr = NS.read(v).text;
  ok(/시간이 끝나거나 사람 플레이어가 모두 확인을 누르면 다음으로 넘어갑니다/.test(scr), '화면 글: 시간이 끝나거나 모두 확인하면 넘어간다는 안내');
  // 사람 화면의 확인 단추(AI 화면 글에는 이 단추가 원래 없음)
  const u = Object.create(UI.prototype), btn = () => (u.actionPanel(C.view(s, 'p0')).match(/<button class="ready gold"[^>]*>[^<]*<\/button>/) || [''])[0];
  s.ready = [];
  ok(!/disabled/.test(btn()) && /읽었습니다 · 다음으로/.test(btn()), '사람 화면: 이번 때 기록이 있으면 "읽었습니다 · 다음으로"가 켜져 있음 — ' + btn());
  s.chapter = {id: 't', from: Math.max(0, ...s.feed.map(e => e.i || 0)) + 1};
  ok(!/disabled/.test(btn()) && /새 기록 없음 · 확인/.test(btn()), '사람 화면: 이번 때 나에게 온 기록이 없으면 "새 기록 없음 · 확인" — ' + btn());
  s.ready = ['p0'];
  ok(/disabled/.test(btn()) && /다른 주민을 기다립니다/.test(btn()), '확인한 뒤에는 "다른 주민을 기다립니다"(꺼짐)');
  s.ready = ['p1'];
  s.stage = 'gathering'; s.readingStep = null;
  ok(C.view(s, 'p0').progress.private, '처음 회관 대화는 그대로(확인으로 넘기지 않음)');
}
const ses = fs.readFileSync(path.join(dir, '10Session.js'), 'utf8');
ok(/if\(!s\.players\.some\(p=>!p\.bot\)\)\{if\(timedRead\(s\)\)return;/.test(ses), '사람 자리가 없는 판(AI만)은 이야기·채팅 시간을 그대로 둠');

(async () => {
  const {createHost, loadEngine} = require(path.join(repo, 'game', 'webengine', 'server', 'room_host.js'));
  const W = loadEngine(path.join(repo, 'game', 'webengine', 'runtime'));
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) new Function('WebEngine', fs.readFileSync(path.join(dir, f), 'utf8'))(W);
  const rules = W.roomRules(), assets = path.join(repo, 'game', 'games', 'noir-trpg', 'assets');
  const data = p => { try { return JSON.parse(fs.readFileSync(path.join(assets, p), 'utf8')); } catch { return null; } };
  const host = createHost({WebEngine: W, rules, data, log: () => {}, opts: {name: '시험', timeScale: 1, aiMode: 'off', away: 9999, hold: 0, seed: 77}});
  const c = await host.handle({op: 'create', name: '사람'});
  for (let i = 0; i < 7; i++) await host.handle({op: 'bot_add', room: c.room, key: c.key});
  await host.handle({op: 'start', room: c.room, key: c.key});
  const news = () => host.handle({op: 'news', room: c.room, key: c.key, since: 0});
  let now = await news();
  ok(now.view && now.view.stage === 'opening' && now.view.readingStep === 'text', '시작하면 도입 이야기(이야기·채팅 40초) — ' + (now.view && now.view.stage));
  await new Promise(r => setTimeout(r, 2600));                     // 단계가 열리고 2초가 지나야 확인을 받는다
  const t0 = Date.now();
  const res = await host.handle({op: 'act', room: c.room, key: c.key, action: {type: 'ready'}});
  ok(res && res.ok, '도입 이야기에서 확인을 누를 수 있음' + (res && !res.ok ? ' — ' + JSON.stringify(res) : ''));
  for (let k = 0; k < 40 && (now = await news()).view.stage === 'opening'; k++) await new Promise(r => setTimeout(r, 50));
  ok(now.view.stage !== 'opening' && Date.now() - t0 < 3000, `사람 자리가 모두(1명) 확인하자 바로 다음 단계: ${now.view.stage} (${Date.now() - t0}ms, 40초를 기다리지 않음)`);
  process.exit(process.exitCode || 0);
})();
