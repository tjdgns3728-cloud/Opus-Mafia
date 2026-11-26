// 11인 채팅 마피아(game/games/chat-mafia)의 규칙 시험(2026-11-26 스타2 마피아 직업). 사용: node chat_mafia_test.js <저장소 경로>
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
const M = globalThis.ChatMafia, RR = globalThis.ChatMafiaRoles, rules = W.roomRules();
const data = p => { try { return JSON.parse(fs.readFileSync(path.join(game, 'assets', p), 'utf8')); } catch { return null; } };
let failed = 0;
const ok = (c, m) => { console.log((c ? '통과 ' : '실패 ') + m); if (!c) { failed++; process.exitCode = 1; } };

// ① 바탕
const cfg = M.config(data('settings.json'));
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const FIXED = ['sheriff', 'doctor', 'investigator', 'bodyguard', 'vigilante', 'citizen', 'mayor', 'godfather', 'framer', 'jester', 'serialkiller'];
const make = roles => {
  const S = {cfg, day: 2, stage: 'talk', epoch: 1, endsAt: 100, log: [], votes: {}, acquitted: [], accused: null, verdict: {}, night: {acts: {}}, typing: {}, result: null};
  S.players = roles.map((r, i) => { const p = {id: 's' + (i + 1), no: i + 1, name: '이름' + (i + 1), bot: i > 0, alive: true, will: '', died: null, crimes: [], doused: false, revealed: false, won: false, startRole: r}; RR.fresh(p, r); return p; });
  return S;
};
const base = () => make(FIXED);
const who = (S, r) => S.players.find(p => p.role === r);
{
  // 나누기: 칸마다 무리에서 하나(시민 편 7 · 마피아 2 · 중립 2), 시장·대부는 하나만
  let okDeal = true, seen = new Set();
  for (let n = 0; n < 300; n++) {
    const ps = M.deal(Array.from({length: 11}, (_, i) => ({id: 's' + i, name: 'n' + i})), cfg, rnd), t = k => ps.filter(p => RR.team(p) === k).length;
    ps.forEach(p => seen.add(p.role));
    if (t('town') !== 7 || t('mafia') !== 2 || t('neutral') !== 2 || ps.filter(p => p.role === 'mayor').length > 1 || !ps.some(p => p.role === 'godfather') || !ps.some(p => p.role === 'sheriff') || !ps.some(p => p.role === 'doctor')) okDeal = false;
    const ex = ps.find(p => p.role === 'executioner'); if (ex && !(ps.find(p => p.id === ex.target) && RR.team(ps.find(p => p.id === ex.target)) === 'town')) okDeal = false;
  }
  ok(okDeal, '나누기 300번: 늘 시민 편 7·마피아 2·중립 2, 보안관·의사·대부 있음, 시장은 많아야 하나, 처형인 목표는 시민 편');
  ok(Object.values(RR.POOLS).flat().filter(k => k !== 'mafioso').every(k => seen.has(k)), '나누기 300번 동안 무리의 직업이 모두 한 번 이상 나옴: ' + seen.size + '가지');
  // 승패
  const S = base(), kill = (...rs) => rs.forEach(r => { who(S, r).alive = false; });
  ok(M.winner(S) === null, '처음에는 승패 없음');
  kill('godfather', 'framer', 'serialkiller');
  ok(M.winner(S) && M.winner(S).winner === 'town', '마피아와 연쇄살인마가 모두 죽으면 시민 편 승리(광대가 살아 있어도)');
  const S2 = base(); S2.players.forEach(p => { if (!['godfather', 'framer', 'sheriff', 'jester'].includes(p.role)) p.alive = false; });
  ok(M.winner(S2) && M.winner(S2).winner === 'mafia', '중립 살인이 없고 마피아 2 ≥ 나머지 2면 마피아 승리');
  const S3 = base(); S3.players.forEach(p => { if (!['serialkiller', 'sheriff'].includes(p.role)) p.alive = false; });
  ok(M.winner(S3) && M.winner(S3).winner === 'serialkiller', '연쇄살인마와 둘만 남으면 연쇄살인마 승리');
  const S4 = base(); S4.players.forEach(p => { if (!['framer', 'citizen'].includes(p.role)) p.alive = false; });
  ok(M.winner(S4) && M.winner(S4).winner === 'town', '마피아와 시민(직업) 둘만 남으면 시민 승리');
  const S5 = make(['sheriff', 'doctor', 'godfather', 'consort', 'survivor', 'witch']); S5.players.forEach(p => { if (!['godfather', 'consort', 'survivor', 'witch'].includes(p.role)) p.alive = false; });
  const w5 = M.winner(S5);
  ok(w5 && w5.winner === 'mafia' && RR.winners(S5, 'mafia').length === 4, '시민 편이 다 죽으면 마피아 승리 · 살아 있는 생존자와 마녀도 함께 이김');
  const S6 = base(); kill('godfather', 'framer', 'serialkiller'); 
  ok(RR.winners(S, 'town').every(id => RR.team(S.players.find(p => p.id === id)) === 'town'), '시민 편 승리에는 처형되지 않은 광대가 들지 않음');
  ok(RR.weight(Object.assign(who(S, 'mayor'), {revealed: true})) === 3 && RR.weight(who(S, 'sheriff')) === 1, '밝힌 시장의 표는 3');
}
{
  const S = base(), maf = who(S, 'godfather'), cit = who(S, 'citizen'), cit2 = who(S, 'mayor');
  S.log.push({i: 1, day: 1, stage: 'night', kind: 'mafia', to: M.mafiaRoom(S), from: maf.id, name: M.label(maf), text: '비밀'});
  S.log.push({i: 2, day: 2, stage: 'talk', kind: 'whisper', to: [cit.id, cit2.id], from: cit.id, name: M.label(cit), toName: M.label(cit2), text: '귓말'});
  const vc = M.view(S, cit.id, 0), vm = M.view(S, maf.id, 0), vo = M.view(S, who(S, 'sheriff').id, 0);
  ok(!vc.log.some(l => l.text === '비밀') && vm.log.some(l => l.text === '비밀'), '마피아 밤 대화는 마피아에게만 보임');
  ok(vc.log.some(l => l.text === '귓말') && !vo.log.some(l => l.text === '귓말'), '귓속말 내용은 두 사람에게만 보임');
  ok(vc.players.filter(p => !p.me).every(p => p.role === null) && vm.players.filter(p => p.ally).length === 1, '시민은 남의 직업을 모르고, 대부는 동료 마피아(모함꾼)를 앎');
  const txt = M.screenText(vm);
  ok(txt.includes('비밀') && txt.includes('규칙:') && txt.includes(`${M.label(maf)}(나)`.replace(/^\d+번 /, '')), '화면 글에 보기의 대화·규칙·내 자리가 들어감');
  S.stage = 'vote';
  const vv = M.view(S, cit.id, 0);
  ok(vv.buttons.filter(b => b.act.type === 'vote').length === 10 && M.screenText(vv).includes('에게 투표"'), '투표 시간: 나를 뺀 산 사람 10명에게 투표 버튼, 화면 글에도 같은 버튼 이름');
  S.stage = 'night';
  ok(M.view(S, cit.id, 0).buttons.filter(b => b.act.type !== 'will').map(b => b.label).join() === '방탄조끼 입기 (남은 1개)' && !M.view(S, cit.id, 0).chat.channel, '밤의 시민: 방탄조끼 입기 하나(유언 고치기 빼고), 말할 수 없음');
  ok(M.view(S, maf.id, 0).chat.channel === 'mafia', '밤의 마피아: 마피아끼리 말할 수 있음');
}
{
  // 치는 시간(2026-11-26 사용자 선택 "사람의 손과 눈 맞추기"): 글자 수만큼, 상한 없음
  const R = globalThis.ChatMafiaRoom;
  ok(R.typeSecs('가'.repeat(80), 4, cfg.AI) === 20 && R.typeSecs('ㅇㅇ', 4, cfg.AI) === cfg.AI.입력최소초, '치는 시간: 80자는 초당 4자로 20초(8초 상한 없음), 짧은 글은 최소 시간');
  // 보낼 때 칸이 바뀌었으면 버린다(실제 판 RWLK: 찬반 때 쓰던 글이 밤의 마피아끼리로, 최후 변론이 죽은 사람끼리로 올라감)
  const S = base(), maf = who(S, 'godfather'), cit = who(S, 'citizen');
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
  // 밤 처리(00Roles.js, 스타2 마피아 위키 기본값)
  const night = (roles, picks, prep) => {
    const S = make(roles); S.stage = 'night'; S.night = {acts: {}};
    if (prep) prep(S);
    for (const [r, a] of picks) { const p = typeof r === 'string' ? who(S, r) : S.players[r]; const x = {}; for (const k of ['target', 'target2']) if (a[k] != null) x[k] = (typeof a[k] === 'string' ? who(S, a[k]) : S.players[a[k]]).id; if (a.mode) x.mode = a.mode;
      if (x.target2) { const r1 = RR.chooseNight(S, p, {target: x.target}); if (!r1.ok) throw new Error('고르기 실패 ' + p.role + ': ' + r1.error); }
      const r2 = RR.chooseNight(S, p, x); if (!r2.ok) throw new Error('고르기 실패 ' + p.role + ': ' + r2.error); }
    const res = RR.resolveNight(S, () => 0.3); const after = RR.applyNight(S, res);
    const dead = r => !(typeof r === 'string' ? who(S, r) : S.players[r]).alive, told = (r, re) => res.tell.concat(after.tells).some(t => t.id === (typeof r === 'string' ? who(S, r) : S.players[r]).id && re.test(t.text));
    return {S, res, after, dead, told};
  };
  const R6 = ['sheriff', 'doctor', 'citizen', 'godfather', 'escort', 'bodyguard', 'busdriver', 'vigilante', 'veteran', 'investigator', 'detective', 'lookout', 'framer', 'janitor', 'serialkiller', 'arsonist', 'massmurderer', 'witch', 'jester', 'executioner', 'amnesiac', 'mayor'];
  let n = night(R6, [['godfather', {target: 'sheriff'}]]);
  ok(n.dead('sheriff') && n.S.players.find(p => p.role === 'sheriff').died.how === '마피아에게 죽음', '대부가 고른 사람이 죽음');
  n = night(R6, [['godfather', {target: 'sheriff'}], ['doctor', {target: 'sheriff'}]]);
  ok(!n.dead('sheriff') && n.told('doctor', /살렸습니다/), '의사가 치료하면 살고, 의사는 공격이 있었다는 것을 앎');
  n = night(R6, [['godfather', {target: 'sheriff'}], ['bodyguard', {target: 'sheriff'}]]);
  ok(!n.dead('sheriff') && n.dead('bodyguard') && n.dead('godfather'), '경호원: 지킨 사람은 살고 경호원과 공격한 대부가 둘 다 죽음(밤에 안 죽는 대부도)');
  n = night(R6, [['godfather', {target: 'citizen'}], ['citizen', {mode: 'self'}]]);
  ok(!n.dead('citizen') && n.S.players.find(p => p.role === 'citizen').uses === 0, '시민이 방탄조끼를 입으면 살고 조끼는 다 씀');
  n = night(R6, [['vigilante', {target: 'godfather'}]]);
  ok(!n.dead('godfather') && n.told('godfather', /버텨 냈습니다/) && n.S.players.find(p => p.role === 'vigilante').uses === 1, '대부는 밤에 쏴도 죽지 않고, 총알은 한 발 줄어듦');
  n = night(R6, [['godfather', {target: 'sheriff'}], ['escort', {target: 'godfather'}]]);
  ok(!n.dead('sheriff') && n.told('godfather', /붙잡아 두었습니다/), '말동무가 대부를 붙잡아 두면 아무도 죽지 않음');
  n = night(R6, [['godfather', {target: 'sheriff'}], ['busdriver', {target: 'sheriff', target2: 'mayor'}]]);
  ok(!n.dead('sheriff') && n.dead('mayor'), '버스 기사가 둘을 바꾸면 대부의 공격이 다른 사람에게 감');
  n = night(R6, [['godfather', {target: 'sheriff'}], ['witch', {target: 'godfather', target2: 'mayor'}]]);
  ok(!n.dead('sheriff') && n.dead('mayor') && n.told('godfather', /조종당해/), '마녀가 대부를 조종하면 마녀가 고른 사람이 죽고 대부는 조종당한 것을 앎');
  n = night(R6, [['veteran', {mode: 'self'}], ['investigator', {target: 'veteran'}], ['lookout', {target: 'veteran'}], ['godfather', {target: 'veteran'}]]);
  ok(n.dead('investigator') && !n.dead('lookout') && !n.dead('veteran') && !n.dead('godfather'), '경계 선 퇴역 군인: 찾아온 조사관은 죽고 망꾼은 살고, 공격받아도 안 죽고, 밤에 안 죽는 대부는 못 죽임');
  n = night(R6, [['sheriff', {target: 'godfather'}], ['framer', {target: 'mayor'}]]);
  ok(n.told('sheriff', /수상하지 않습니다/), '보안관이 대부를 조사하면 수상하지 않음');
  n = night(R6, [['sheriff', {target: 'mayor'}], ['framer', {target: 'mayor'}]]);
  ok(n.told('sheriff', /마피아 일원입니다/), '모함당한 사람은 보안관에게 마피아 일원으로 나옴');
  n = night(R6, [['sheriff', {target: 'serialkiller'}]]);
  ok(n.told('sheriff', /연쇄살인마입니다/), '보안관: 연쇄살인마는 연쇄살인마로 나옴');
  n = night(R6, [['investigator', {target: 'godfather'}], ['godfather', {target: 'mayor'}]]);
  ok(n.told('investigator', /범죄 기록 없음/), '조사관이 대부를 보면 범죄 기록 없음');
  n = night(R6, [['investigator', {target: 'vigilante'}], ['vigilante', {target: 'jester'}]]);
  ok(n.told('investigator', /무단 침입|살인/), '그날 밤 쏜 자경단의 범죄 기록: 무단 침입이나 살인');
  n = night(R6, [['investigator', {target: 'mayor'}]]);
  ok(n.told('investigator', /범죄 기록 없음/), '아무것도 안 한 사람은 범죄 기록 없음');
  n = night(R6, [['godfather', {target: 'mayor'}], ['detective', {target: 'godfather'}], ['lookout', {target: 'mayor'}]]);
  ok(n.told('detective', /4번 이름4님을|이름22/) || n.told('detective', /이름22님을 찾아갔습니다/), '형사: 대부가 찾아간 사람(시장)을 앎');
  ok(n.told('lookout', /이름4님이 찾아왔습니다/), '망꾼: 시장 집에 찾아온 대부를 앎');
  n = night(R6, [['godfather', {target: 'mayor'}], ['janitor', {target: 'mayor'}]]);
  { const may = who(n.S, 'mayor'); n.S.stage = 'morning';
    ok(may.cleaned && M.view(n.S, who(n.S, 'sheriff').id, 0).players.find(p => p.id === may.id).role === '알 수 없음' && n.told('janitor', /유언/), '청소부가 청소한 사람이 죽으면 직업이 "알 수 없음", 청소부는 유언을 봄'); }
  n = night(R6, [['arsonist', {mode: 'ignite'}], ['doctor', {target: 'mayor'}]], S => { who(S, 'mayor').doused = true; who(S, 'sheriff').doused = true; });
  ok(n.dead('mayor') && n.dead('sheriff'), '방화범이 불태우면 기름 부은 사람이 모두 죽음(치료해도)');
  n = night(R6, [['arsonist', {target: 'mayor'}], ['escort', {target: 'arsonist'}]]);
  ok(!who(n.S, 'mayor').doused && who(n.S, 'escort').doused, '방화범을 붙잡아 두면 기름은 못 붓고, 붙잡은 사람에게 기름이 묻음');
  n = night(R6, [['massmurderer', {target: 'mayor'}], ['sheriff', {target: 'mayor'}], ['investigator', {target: 'citizen'}]]);
  ok(n.dead('mayor') && n.dead('sheriff') && !n.dead('investigator'), '대량살인마: 집에 있던 시장과 찾아온 보안관이 죽음(다른 집에 간 사람은 무사)');
  n.S.day = 3; n.S.night = {acts: {}};
  ok(RR.nightButtons(n.S, who(n.S, 'massmurderer')).length === 0, '대량살인마는 살육한 다음 밤에 쉼(버튼 없음)');
  n = night(R6, [['massmurderer', {target: 'mayor'}], ['doctor', {target: 'mayor'}]]);
  ok(!n.dead('mayor') && n.dead('doctor'), '대량살인마: 찾아온 의사는 죽지만 치료받은 집주인은 삶(위키: 의사가 살릴 수 있음)');
  n = night(R6, [], S => { S.haunt = [who(S, 'mayor').id]; });
  ok(n.dead('mayor'), '광대가 처형된 다음 밤: 찬성한 사람이 죽음(막을 수 없음)');
  n = night(R6, [['godfather', {target: 'sheriff'}]], S => { who(S, 'executioner').target = who(S, 'sheriff').id; });
  ok(who(n.S, 'executioner') === undefined && n.S.players.find(p => p.startRole === 'executioner').role === 'jester', '처형인의 목표가 밤에 죽으면 처형인은 광대가 됨');
  n = night(R6, [['amnesiac', {target: 'sheriff'}]], S => { who(S, 'sheriff').alive = false; });
  ok(n.S.players.find(p => p.startRole === 'amnesiac').role === 'sheriff' && n.after.msgs.some(m => /보안관/.test(m)), '기억상실자가 죽은 보안관을 기억하면 보안관이 되고 모두에게 알려짐');
  n = night(R6, [['vigilante', {target: 'mayor'}]], S => { who(S, 'godfather').alive = false; });
  ok(n.S.players.find(p => p.startRole === 'framer').role === 'mafioso' || who(n.S, 'framer') === undefined, '대부가 죽어 죽일 사람이 없으면 남은 마피아가 조직원이 됨');
  { const S = make(R6); S.stage = 'night'; S.night = {acts: {}}; const bd = who(S, 'busdriver');
    const b1 = RR.nightButtons(S, bd); RR.chooseNight(S, bd, {target: who(S, 'sheriff').id}); const b2 = RR.nightButtons(S, bd);
    ok(b1.every(b => /태우기$/.test(b.label)) && b2.some(b => /와 .* 자리 바꾸기$/.test(b.label)) && b2.some(b => b.label === '고른 것 취소'), '버스 기사: 첫째를 고른 뒤 둘째 버튼이 나옴(취소 가능)');
    who(S, 'vigilante').uses = 0;
    ok(RR.nightButtons(S, who(S, 'vigilante')).length === 0, '총알을 다 쓴 자경단은 버튼 없음'); }
  { const S = make(R6); S.silenced = {[who(S, 'mayor').id]: 2}; S.day = 2; S.stage = 'talk';
    ok(!M.chatPlace(S, who(S, 'mayor')).channel && /협박/.test(M.chatPlace(S, who(S, 'mayor')).why), '협박받은 사람은 다음 날 낮에 말할 수 없음'); }
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
    S.stage = 'over'; S.result = {winner: 'town', text: '시민 편 승리', winners: [], day: 2, roles: []}; S.bots = {};
    for (const p of S.players.filter(q => q.bot)) S.bots[p.id] = {};
    S.log.push({i: 1, day: 2, stage: 'talk', kind: 'chat', to: 'all', from: 's2', name: M.label(S.players[1]), text: '난 의무실에 있었어'});
    const room = {state: S, engine: {time: 0}, ai: {mode: 'on', ask: async (prompt, info) => {
      asks.push({prompt, info});
      return {ok: true, text: JSON.stringify({'받아들여진 말': '이름3이 내 말에 대답함', '안 받아들여진 말': '없음', '왜 그랬나': '구체적이었다', '다음 판에 말할 때': '본 것을 먼저 말한다'})};
    }}};
    await R.review(room);
    const rows = fs.readFileSync(process.env.CHAT_MAFIA_NOTES_FILE, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    ok(asks.length === 10 && asks.every(a => a.info.purpose === '말 돌아보기'), '말 돌아보기: AI 자리 열 모두에게 물음(이긴 쪽 포함)');
    ok(asks[1].prompt.includes('난 의무실에 있었어') && asks[1].prompt.includes('알아듣고 받아들였는지'), '말 돌아보기 물음에 끝난 화면의 대화가 들어감');
    ok(rows.length === 10 && rows.every(r => r.next === '본 것을 먼저 말한다'), '메모가 자리마다 한 줄씩 남음');
    ok(rows.filter(r => r.name !== '이름3').every(r => !r.landed.includes('이름3') && /사람[A-Z]/.test(r.landed)), '메모 속 다른 사람 닉네임은 사람A·사람B로 바뀜');
    const B = {style: '반말', defeats: [], notes: R.loadNotes('이름2')};
    ok(B.notes.length === 1 && R.promptFor(S.players[1], B, '(화면)').includes('네 말을 돌아보고 직접 남긴 메모') && R.promptFor(S.players[1], B, '(화면)').includes('본 것을 먼저 말한다'), '다음 판 물음에 그 자리의 메모가 들어감');
    try { fs.unlinkSync(process.env.CHAT_MAFIA_NOTES_FILE); } catch {}
  }
  const logs = [];
  const host = createHost({WebEngine: W, rules, data, log: m => logs.push(m), opts: {name: '시험', timeScale: 60, aiMode: 'fake', away: 9999, hold: 0, seed: 1234}});
  const c = await host.handle({op: 'create', name: '사람'});
  ok(c.ok, '방 만들기');
  for (let i = 0; i < 10; i++) await host.handle({op: 'bot_add', room: c.room, key: c.key});
  const s = await host.handle({op: 'start', room: c.room, key: c.key});
  ok(s.ok, '열한 자리(사람 1 + AI 10)로 시작');
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
  ok(now.status === 'over' && S.result && S.result.winner && Array.isArray(S.result.winners), `판이 끝남: ${S.result ? S.result.text : '끝나지 않음'}, ${S.day}일째`);
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
  for (let i = 0; i < 11; i++) await host.handle({op: 'bot_add', room: w.room, key: w.key});
  const ws = await host.handle({op: 'start', room: w.room, key: w.key});
  ok(ws.ok, 'AI 열한 자리로 시작');
  const WR = host.rooms.get(w.room);
  ok(WR.api.seats().length === 11 && WR.api.seats().every(s => s.bot) && new Set(WR.api.seats().map(s => s.name)).size === 11, 'AI 열하나의 이름이 모두 다름: ' + WR.api.seats().map(s => s.name).join(', '));
  const wa = await host.handle({op: 'act', room: w.room, key: w.key, action: {type: 'will', text: 'x'}});
  const wc = await host.handle({op: 'chat', room: w.room, key: w.key, text: '안녕'});
  ok(!wa.ok && wa.code === 'watching' && !wc.ok && wc.code === 'watching', '보는 사람은 행동·채팅을 보낼 수 없음');
  let wn = await host.handle({op: 'news', room: w.room, key: w.key, since: 0});
  ok(wn.watching && wn.view && wn.view.watching && wn.view.players.length === 11 && wn.view.players.every(p => p.role), '보는 사람의 보기: 열하나 모두의 직업이 보임');
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
  ok(wn.status === 'over' && WS.result && Array.isArray(WS.result.winners), `관전 방의 판이 끝남: ${WS.result ? WS.result.text : '끝나지 않음'}, ${WS.day}일째`);
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
