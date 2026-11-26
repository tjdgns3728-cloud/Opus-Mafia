// 8인 채팅 마피아(game/games/chat-mafia)의 규칙 시험. 사용: node chat_mafia_test.js <저장소 경로>
// ① 규칙의 바탕(나눔·승패·보기의 숨김·화면 글) ② 방 하나를 가짜 AI 답으로 처음부터 끝까지 돌린다(실제 AI는 부르지 않는다).
const path = require('path'), fs = require('fs'), os = require('os');
const repo = path.resolve(process.argv[2] || '.');
const game = path.join(repo, 'game', 'games', 'chat-mafia');
process.env.CHAT_MAFIA_DEFEAT_FILE = path.join(os.tmpdir(), 'chat_mafia_defeats_test.jsonl');   // 시험은 패배기록 파일을 건드리지 않는다(가짜 답 판은 어차피 쓰지 않음)
process.env.CHAT_MAFIA_NOTES_FILE = path.join(os.tmpdir(), 'chat_mafia_talk_notes_test.jsonl');  // 말 돌아보기 메모도 시험용 파일에만
try { fs.unlinkSync(process.env.CHAT_MAFIA_NOTES_FILE); } catch {}
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
{
  // 치는 시간(2026-11-26 사용자 선택 "사람의 손과 눈 맞추기"): 글자 수만큼, 상한 없음
  const R = globalThis.ChatMafiaRoom;
  ok(R.typeSecs('가'.repeat(80), 4, cfg.AI) === 20 && R.typeSecs('ㅇㅇ', 4, cfg.AI) === cfg.AI.입력최소초, '치는 시간: 80자는 초당 4자로 20초(8초 상한 없음), 짧은 글은 최소 시간');
  // 보낼 때 칸이 바뀌었으면 버린다(실제 판 RWLK: 찬반 때 쓰던 글이 밤의 마피아끼리로, 최후 변론이 죽은 사람끼리로 올라감)
  const S = base(), maf = S.players.find(p => p.role === 'mafia'), cit = S.players.find(p => p.role === 'citizen');
  S.stage = 'verdict';
  ok(R.fitsPlace(S, maf.id, null, 'all'), '같은 낮(찬반)이면 모두에게 쓰던 글을 보냄');
  S.stage = 'night';
  ok(!R.fitsPlace(S, maf.id, null, 'all'), '낮에 쓰던 글은 밤이 되면 버림(마피아끼리로 가지 않음)');
  ok(R.fitsPlace(S, maf.id, null, 'mafia') && !R.fitsPlace(S, cit.id, null, 'all'), '밤에 쓰던 마피아 글은 밤에만, 시민은 밤에 못 씀');
  S.stage = 'morning';
  ok(!R.fitsPlace(S, maf.id, null, 'mafia'), '밤에 쓰던 마피아 글이 아침에 모두에게 올라가지 않음');
  S.stage = 'defense'; S.accused = cit.id; cit.alive = false;
  ok(!R.fitsPlace(S, cit.id, null, 'all'), '변론 글은 처형된 뒤 죽은 사람끼리로 가지 않음');
  S.stage = 'talk'; cit.alive = true;
  ok(R.fitsPlace(S, cit.id, 's9', 'whisper') && (S.stage = 'night', !R.fitsPlace(S, cit.id, 's9', 'whisper')), '귓속말은 낮에만');
  // 밤에 일어난 일(보는 사람·판이 끝난 화면에만)
  S.stage = 'morning';
  S.log.push({i: 1, day: 2, stage: 'night', kind: 'story', to: [], text: '1. 의사 → 치료'});
  ok(S.players.every(p => !M.view(S, p.id, 0).log.some(l => l.kind === 'story')), '밤에 일어난 일은 판에 낀 누구의 보기에도 없음');
  ok(M.watchView(S, 0).log.some(l => l.kind === 'story' && l.place === '밤에 일어난 일'), '보는 사람의 보기에는 "밤에 일어난 일"로 보임');
  S.stage = 'over';
  ok(M.screenText(M.view(S, cit.id, 0)).includes('(밤에 일어난 일) 1. 의사'), '판이 끝난 화면 글(말 돌아보기·패배기록)에는 들어감');
}
{
  // 짧은 단계에서는 실제 AI에게 묻지 않는다(답이 단계 안에 올 수 없다). 가짜 답은 막지 않는다.
  const wait = globalThis.ChatMafiaRoom.askWait, S = {cfg, endsAt: 106};
  ok(wait(S, 100, 1, 'on') === null, '실제 AI: 6초짜리 아침이 막 열렸을 때는 묻지 않음');
  ok(wait(S, 99, 1, 'on') === 6.5, '실제 AI: 7초 남으면 6.5초 기다리며 물음');
  ok(wait({cfg, endsAt: 160}, 100, 1, 'on') === 20, '실제 AI: 긴 단계는 20초까지 기다림');
  ok(wait(S, 105, 1, 'fake') === 3, '가짜 답: 남은 시간이 짧아도 물음');
}

// ② 방 하나를 가짜 AI 답으로 끝까지
(async () => {
  // 판 뒤 내 말 돌아보기: AI 자리 모두가 끝난 화면을 보고 다음 판의 자기에게 메모를 남긴다(이긴 쪽도). 실제 AI 대신 정해진 답.
  {
    const S = base(), R = globalThis.ChatMafiaRoom, asks = [];
    S.stage = 'over'; S.result = {winner: 'town', text: '시민 편 승리', day: 2, roles: []}; S.bots = {};
    for (const p of S.players.filter(q => q.bot)) S.bots[p.id] = {};
    S.log.push({i: 1, day: 2, stage: 'talk', kind: 'chat', to: 'all', from: 's2', name: M.label(S.players[1]), text: '난 의무실에 있었어'});
    const room = {state: S, engine: {time: 0}, ai: {mode: 'on', ask: async (prompt, info) => {
      asks.push({prompt, info});
      return {ok: true, text: JSON.stringify({'받아들여진 말': '이름3이 내 말에 대답함', '안 받아들여진 말': '없음', '왜 그랬나': '구체적이었다', '다음 판에 말할 때': '본 것을 먼저 말한다'})};
    }}};
    await R.review(room);
    const rows = fs.readFileSync(process.env.CHAT_MAFIA_NOTES_FILE, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    ok(asks.length === 7 && asks.every(a => a.info.purpose === '말 돌아보기'), '말 돌아보기: AI 자리 일곱 모두에게 물음(이긴 쪽 포함)');
    ok(asks[1].prompt.includes('난 의무실에 있었어') && asks[1].prompt.includes('알아듣고 받아들였는지'), '말 돌아보기 물음에 끝난 화면의 대화가 들어감');
    ok(rows.length === 7 && rows.every(r => r.next === '본 것을 먼저 말한다'), '메모가 자리마다 한 줄씩 남음');
    ok(rows.filter(r => r.name !== '이름3').every(r => !r.landed.includes('이름3') && /사람[A-Z]/.test(r.landed)), '메모 속 다른 사람 닉네임은 사람A·사람B로 바뀜');
    const B = {style: '반말', defeats: [], notes: R.loadNotes('이름2')};
    ok(B.notes.length === 1 && R.promptFor(S.players[1], B, '(화면)').includes('네 말을 돌아보고 직접 남긴 메모') && R.promptFor(S.players[1], B, '(화면)').includes('본 것을 먼저 말한다'), '다음 판 물음에 그 자리의 메모가 들어감');
    try { fs.unlinkSync(process.env.CHAT_MAFIA_NOTES_FILE); } catch {}
  }
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

  // ③ AI끼리 하는 판 보기(관전 방): AI 여덟이 하고 사람은 보기만 한다
  const info = await host.handle({op: 'info'});
  ok(info.watch === true, '이 게임은 관전 방을 열 수 있음');
  const w = await host.handle({op: 'create', name: '보는이', watch: true});
  ok(w.ok && w.watch && /^w/.test(w.seat), '관전 방 만들기(보는 사람은 자리가 아님)');
  const j1 = await host.handle({op: 'join', room: w.room, name: '끼어들기'});
  ok(!j1.ok && j1.code === 'watch_only', '관전 방에는 사람 자리로 들어올 수 없음');
  const j2 = await host.handle({op: 'join', room: w.room, name: '같이봄', watch: true});
  ok(j2.ok && j2.watch, '다른 사람도 보기로 들어올 수 있음');
  const j3 = await host.handle({op: 'join', room: c.room, name: '엿보기', watch: true});
  ok(!j3.ok && j3.code === 'not_watch_room', '사람이 하는 방은 볼 수 없음');
  for (let i = 0; i < 8; i++) await host.handle({op: 'bot_add', room: w.room, key: w.key});
  const ws = await host.handle({op: 'start', room: w.room, key: w.key});
  ok(ws.ok, 'AI 여덟 자리로 시작');
  const WR = host.rooms.get(w.room);
  ok(WR.api.seats().length === 8 && WR.api.seats().every(s => s.bot) && new Set(WR.api.seats().map(s => s.name)).size === 8, 'AI 여덟의 이름이 모두 다름: ' + WR.api.seats().map(s => s.name).join(', '));
  const wa = await host.handle({op: 'act', room: w.room, key: w.key, action: {type: 'will', text: 'x'}});
  const wc = await host.handle({op: 'chat', room: w.room, key: w.key, text: '안녕'});
  ok(!wa.ok && wa.code === 'watching' && !wc.ok && wc.code === 'watching', '보는 사람은 행동·채팅을 보낼 수 없음');
  let wn = await host.handle({op: 'news', room: w.room, key: w.key, since: 0});
  ok(wn.watching && wn.view && wn.view.watching && wn.view.players.length === 8 && wn.view.players.every(p => p.role), '보는 사람의 보기: 여덟 모두의 직업이 보임');
  ok(wn.view.log.some(l => !l.pub && /에게만$/.test(l.place) && /직업은/.test(l.text)), '보는 사람의 보기: 각자에게만 간 줄(직업 알림)도 보임');
  const seatView = rules.view(WR.api, WR.api.seats()[0].id);
  ok(seatView.players.filter(p => !p.me && !p.ally).every(p => p.role === null), '판에 낀 AI 자리의 보기는 그대로 숨김(보는 사람의 보기와 따로)');
  const t1 = Date.now();
  while (Date.now() - t1 < 90000) {
    wn = await host.handle({op: 'news', room: w.room, key: w.key, since: 0});
    if (wn.status === 'over') break;
    await new Promise(r => setTimeout(r, 100));
  }
  const WS = WR.api.state;
  ok(wn.status === 'over' && WS.result, `관전 방의 판이 끝남: ${WS.result ? WS.result.text : '끝나지 않음'}, ${WS.day}일째`);
  ok(!WR.fault, '관전 방 규칙 오류 없음' + (WR.fault ? ': ' + WR.fault : ''));
  ok(WS.log.some(l => l.ch === 'mafia') ? wn.view.log.some(l => l.place === '마피아끼리') : true, '마피아에게만 간 알림은 "마피아끼리"로 보임');
  const mornings = WS.log.filter(l => l.kind === 'sys' && /밤사이/.test(l.text));
  const storyOk = mornings.every(m => { const before = WS.log.filter(l => l.kind === 'story' && l.i < m.i && l.day === m.day - 1);
    const last = before[before.length - 1], died = m.text.match(/밤사이 (.+?)님이 죽었습니다/);
    return last && (died ? last.text.includes(`${died[1]}님이 죽음`) : !/님이 죽음$/.test(last.text)); });
  ok(mornings.length > 0 && storyOk, `아침 ${mornings.length}번 모두 앞에 밤에 일어난 일이 차례로 있고, 마지막 줄이 아침 발표와 맞음`);
  const again = await host.handle({op: 'reopen', room: w.room, key: w.key});
  const again2 = await host.handle({op: 'start', room: w.room, key: w.key});
  ok(again.ok && again2.ok, '관전 방: 한 판 더(다시 열고 바로 시작)');
  await host.handle({op: 'leave', room: w.room, key: j2.key});
  ok(host.rooms.has(w.room), '보는 사람 하나가 나가도 방은 남음');
  await host.handle({op: 'leave', room: w.room, key: w.key});
  ok(!host.rooms.has(w.room), '마지막 보는 사람이 나가면 방이 닫힘(AI도 멈춤)');
  ok(!logs.some(m => /오류/.test(m)), '서버 기록에 오류 없음(관전 포함)' + (logs.length ? ' — ' + logs.slice(0, 3).join(' / ') : ''));
  host.stop();
  console.log(failed ? `실패 ${failed}건` : '모두 통과');
})();
