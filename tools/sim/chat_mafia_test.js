// 8인 채팅 마피아(game/games/chat-mafia)의 규칙 시험. 사용: node chat_mafia_test.js <저장소 경로>
// ① 규칙의 바탕(나눔·승패·보기의 숨김·화면 글) ② 방 하나를 가짜 AI 답으로 처음부터 끝까지 돌린다(실제 AI는 부르지 않는다).
const path = require('path'), fs = require('fs'), os = require('os');
const repo = path.resolve(process.argv[2] || '.');
const game = path.join(repo, 'game', 'games', 'chat-mafia');
process.env.CHAT_MAFIA_DEFEAT_FILE = path.join(os.tmpdir(), 'chat_mafia_defeats_test.jsonl');   // 시험은 패배기록 파일을 건드리지 않는다(가짜 답 판은 어차피 쓰지 않음)
const {createHost, loadEngine} = require(path.join(repo, 'game', 'webengine', 'server', 'room_host.js'));
const W = loadEngine(path.join(repo, 'game', 'webengine', 'runtime'));
for (const f of fs.readdirSync(path.join(game, 'scripts')).filter(f => f.endsWith('.js')).sort())
  new Function('WebEngine', fs.readFileSync(path.join(game, 'scripts', f), 'utf8'))(W);
const M = globalThis.ChatMafia, rules = W.roomRules();
const data = p => { try { return JSON.parse(fs.readFileSync(path.join(game, 'assets', p), 'utf8')); } catch { return null; } };
let failed = 0;
const ok = (c, m) => { console.log((c ? '통과 ' : '실패 ') + m); if (!c) { failed++; process.exitCode = 1; } };

// ① 바탕
const cfg = M.config(data('settings.json'));
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const base = () => {
  const S = {cfg, day: 2, stage: 'talk', epoch: 1, endsAt: 100, log: [], votes: {}, acquitted: [], accused: null, verdict: {}, night: null, typing: {}, result: null};
  S.players = M.deal(Array.from({length: 8}, (_, i) => ({id: 's' + (i + 1), name: '이름' + (i + 1), bot: i > 0})), cfg, rnd);
  return S;
};
{
  const S = base(), count = r => S.players.filter(p => p.role === r).length;
  ok(count('mafia') === 2 && count('helper') === 1 && count('police') === 1 && count('doctor') === 1 && count('citizen') === 3, '나눔: 마피아 2, 조력자 1, 경찰 1, 의사 1, 시민 3');
  ok(M.winner(S) === null, '처음에는 승패 없음');
  const maf = S.players.filter(p => p.role === 'mafia'), town = S.players.filter(p => M.ROLES[p.role].team === 'town');
  for (const p of maf) p.alive = false;
  ok(M.winner(S) === 'town', '마피아가 모두 죽으면 시민 편 승리(조력자가 살아 있어도)');
  for (const p of maf) p.alive = true;
  for (const p of town.slice(0, 3)) p.alive = false;              // 산 사람: 마피아 2, 조력자 1, 시민 편 2
  ok(M.winner(S) === null, '접선 안 한 조력자는 마피아 편 수에 들지 않음(2 대 3)');
  S.players.find(p => p.role === 'helper').contacted = true;
  ok(M.winner(S) === 'mafia', '접선한 조력자는 마피아 편 수에 듦(3 대 2 → 마피아 편 승리)');
}
{
  const S = base(), maf = S.players.find(p => p.role === 'mafia'), cit = S.players.find(p => p.role === 'citizen'), cit2 = S.players.filter(p => p.role === 'citizen')[1];
  S.log.push({i: 1, day: 1, stage: 'night', kind: 'mafia', to: M.mafiaRoom(S), from: maf.id, name: M.label(maf), text: '비밀'});
  S.log.push({i: 2, day: 2, stage: 'talk', kind: 'whisper', to: [cit.id, cit2.id], from: cit.id, name: M.label(cit), toName: M.label(cit2), text: '귓말'});
  const vc = M.view(S, cit.id, 0), vm = M.view(S, maf.id, 0), vo = M.view(S, S.players.find(p => p.role === 'police').id, 0);
  ok(!vc.log.some(l => l.text === '비밀') && vm.log.some(l => l.text === '비밀'), '마피아 밤 대화는 마피아에게만 보임');
  ok(vc.log.some(l => l.text === '귓말') && !vo.log.some(l => l.text === '귓말'), '귓속말 내용은 두 사람에게만 보임');
  ok(vc.players.filter(p => !p.me).every(p => p.role === null) && vm.players.filter(p => p.ally).length === 1, '시민은 남의 직업을 모르고, 마피아는 동료 마피아를 앎');
  const txt = M.screenText(vm);
  ok(txt.includes('비밀') && txt.includes('규칙:') && txt.includes(`${M.label(maf)}(나)`.replace(/^\d+번 /, '')), '화면 글에 보기의 대화·규칙·내 자리가 들어감');
  S.stage = 'vote';
  const vv = M.view(S, cit.id, 0);
  ok(vv.buttons.filter(b => b.act.type === 'vote').length === 7 && M.screenText(vv).includes('에게 투표"'), '투표 시간: 나를 뺀 산 사람 7명에게 투표 버튼, 화면 글에도 같은 버튼 이름');
  S.stage = 'night';
  ok(M.view(S, cit.id, 0).buttons.every(b => b.act.type === 'will') && !M.view(S, cit.id, 0).chat.channel, '밤의 시민: 유언 고치기 말고 버튼 없음, 말할 수 없음');
  ok(M.view(S, maf.id, 0).chat.channel === 'mafia', '밤의 마피아: 마피아끼리 말할 수 있음');
}

// ② 방 하나를 가짜 AI 답으로 끝까지
(async () => {
  const logs = [];
  const host = createHost({WebEngine: W, rules, data, log: m => logs.push(m), opts: {name: '시험', timeScale: 60, aiMode: 'fake', away: 9999, hold: 0, seed: 1234}});
  const c = await host.handle({op: 'create', name: '사람'});
  ok(c.ok, '방 만들기');
  for (let i = 0; i < 7; i++) await host.handle({op: 'bot_add', room: c.room, key: c.key});
  const s = await host.handle({op: 'start', room: c.room, key: c.key});
  ok(s.ok, '여덟 자리(사람 1 + AI 7)로 시작');
  const t0 = Date.now();
  let now;
  while (Date.now() - t0 < 90000) {
    now = await host.handle({op: 'news', room: c.room, key: c.key, since: 0});
    if (now.status === 'over') break;
    // 사람 자리도 투표 시간에는 아무에게나 표를 준다(시험용)
    const v = now.view;
    if (v && v.me.alive) { const b = v.buttons.find(b => b.act.type === 'vote' || b.act.type === 'verdict'); if (b && Math.random() < 0.2) await host.handle({op: 'act', room: c.room, key: c.key, action: b.act}); }
    await new Promise(r => setTimeout(r, 100));
  }
  const R = host.rooms.get(c.room), S = R.api.state;
  ok(now.status === 'over' && S.result && ['town', 'mafia'].includes(S.result.winner), `판이 끝남: ${S.result ? S.result.text : '끝나지 않음'}, ${S.day}일째`);
  ok(!R.fault, '규칙 오류 없음' + (R.fault ? ': ' + R.fault : ''));
  const kinds = k => S.log.filter(l => l.kind === k).length;
  ok(kinds('chat') > 0 && kinds('vote') > 0, `대화 ${kinds('chat')}줄, 투표 줄 ${kinds('vote')}줄`);
  ok(S.log.some(l => /재판에 섰습니다|과반을 받은 사람이 없어/.test(l.text)), '투표 시간이 재판이나 "과반 없음"으로 끝남');
  ok(S.log.some(l => /밤사이/.test(l.text)), '아침 발표가 있음');
  const asked = Object.values(S.bots).reduce((a, B) => a + B.asks, 0), said = Object.values(S.bots).reduce((a, B) => a + B.said, 0);
  ok(asked > 0 && said > 0, `AI 자리가 물음 ${asked}번, 말 ${said}번(가짜 답)`);
  ok(!logs.some(m => /오류/.test(m)), '서버 기록에 오류 없음' + (logs.length ? ' — ' + logs.slice(0, 3).join(' / ') : ''));
  host.stop();
  console.log(failed ? `실패 ${failed}건` : '모두 통과');
})();
