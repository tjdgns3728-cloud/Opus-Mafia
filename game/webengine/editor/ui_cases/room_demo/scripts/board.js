// 엔진 본보기 「함께 하는 방」의 규칙 — 서버(server/room_host.js)에서 돈다. 어느 게임의 것도 아닌 작은 판이다:
// 저마다 숨은 숫자 하나를 받고, 차례마다 모두가 한꺼번에 하나씩 고르고, 채팅을 주고받는다.
// 값(사람 수·차례 수·시간·고를 것)은 assets/data/board.json에 있다.
(function () {
  const DEFAULTS = {사람_최소: 2, 사람_최대: 8, 차례_수: 3, 고르는_시간: 30, 선택지: ["가", "나", "다"], 컴퓨터_고르는_시간: [1, 4], 컴퓨터_말: ["잘 부탁해요."]};
  const BOT_NAMES = ["하나", "두리", "세찬", "네온", "다온", "여울", "일곱", "여든"];

  // 컴퓨터 자리가 한마디 한다. 무엇을 말할지(미리 써 둔 줄)는 이 판이 정하고, room.ai.speakAs는 그 자리의 말로 옮길 뿐이다.
  // AI가 답하지 못하면(꺼짐·한도·늦음·버린 답) 미리 써 둔 줄이 그대로 나간다. 그 자리의 숨은 숫자는 말하지 못하게 숨길 것으로 준다.
  function speak(room, bot, question) {
    const S = room.state, seat = room.seat(bot);
    if (!seat || room.status !== "play") return;
    const line = S.cfg.컴퓨터_말[S.lineAt++ % S.cfg.컴퓨터_말.length];
    room.ai.speakAs({persona: `${seat.name}. 짧게 한두 문장으로 말한다.`, knows: [`지금은 ${S.round}번째 차례다.`], hide: [String(S.secret[bot])], say: [line],
                     question: question || "", fallback: line, limitSeconds: 20})
      .then(r => { S.talk.said++; if (r.usedFallback) S.talk.fallback++; room.say(bot, r.text); });
  }
  const read = data => ({...DEFAULTS, ...(data("data/board.json") || {})});

  function next(room) {
    const S = room.state;
    if (S.round >= S.cfg.차례_수) {
      room.tell("all", {text: "모든 차례가 끝났습니다."});
      return room.end({tally: S.tally});
    }
    S.round++;
    const round = S.round;
    const [early, late] = S.cfg.컴퓨터_고르는_시간;
    room.phase(`고르기 ${round}/${S.cfg.차례_수}`, {seconds: S.cfg.고르는_시간, showWaiting: true,
      closeOn: "humans",                                             // 사람이 모두 고르면 컴퓨터 자리를 기다리지 않는다
      bots: () => early + room.random() * Math.max(0, late - early),  // 컴퓨터 자리는 이 사이의 어느 때에 고른다
      check: (seat, intent) => intent && S.cfg.선택지.includes(intent.pick) ? null : "고를 수 없는 것이에요.",     // 받을 때 살핀다: 거절된 자리는 다시 고를 수 있다
      done(intents, info) {
      const counts = Object.fromEntries(S.cfg.선택지.map(o => [o, 0]));
      let none = 0;
      for (const seat of room.seats()) {
        const pick = intents[seat.id] && S.cfg.선택지.includes(intents[seat.id].pick) ? intents[seat.id].pick : null;   // 화면이 보낸 것은 고를 것 안에서만 받는다
        if (pick) counts[pick]++; else none++;
        S.mine[seat.id].push(pick);
        room.tell(seat.id, {text: pick ? `${round}번째 차례에 나는 '${pick}'를 골랐다.` : `${round}번째 차례에 나는 고르지 않았다.`});   // 그 자리에만 가는 소식
      }
      S.tally.push({round, counts, none});
      const bots = room.seats().filter(s => s.bot);
      if (bots.length) room.after(1, () => speak(room, bots[round % bots.length].id, `${round}번째 차례가 끝났다. 한마디 한다면?`));
      room.tell("all", {text: `${round}번째 차례: ` + S.cfg.선택지.map(o => `${o} ${counts[o]}명`).join(" · ") + ` · 안 고름 ${none}명` + (info.timeout ? " (시간이 다 됨)" : "")});
      next(room);
    }});
  }

  WebEngine.room({
    // 방 도구의 거절 글을 이 판의 말투로 바꾼다 (까닭의 이름 → 글). 적지 않은 것은 방 도구의 글이 그대로 나간다.
    texts: {phase_duplicate: "이미 골랐어요.", phase_late: "한발 늦었어요. 이미 다음 차례예요.", name_empty: "부를 이름을 먼저 적어 주세요.",
            room_full: info => `방이 다 찼어요 (${info.max}명).`},
    min: data => read(data).사람_최소,
    max: data => read(data).사람_최대,
    start(room) {
      const S = room.state;
      Object.assign(S, {cfg: read(room.data), round: 0, secret: {}, mine: {}, tally: [], lineAt: 0, talk: {said: 0, fallback: 0}, turn: 0});
      // 가짜 답으로 띄운 서버(--ai fake)에서는 이 판이 정한 가짜 답으로 돈다 (AI를 부르지 않는다)
      if (room.ai.mode === "fake") room.ai.fake((prompt, info) => `(가짜 답) ${(prompt.match(/말할 것:\n- (.*)/) || [, "네."])[1]}`);
      room.seats().filter(s => s.bot).forEach((s, i) => room.after(1 + i * 0.6, () => speak(room, s.id, "판이 시작됐다. 인사한다면?")));
      const used = new Set();
      for (const seat of room.seats()) {                    // 자리마다 서로 다른 여섯 자리 숫자 (방의 씨앗 난수)
        let n;
        do { n = 100000 + Math.floor(room.random() * 900000); } while (used.has(n));
        used.add(n); S.secret[seat.id] = n; S.mine[seat.id] = [];
      }
      room.tell("all", {text: "판을 시작합니다. 저마다 숨은 숫자 하나를 받았습니다."});
      next(room);
    },
    // 그 자리가 봐도 되는 것만: 제 숨은 숫자, 제가 고른 것, 모두가 아는 집계. 남의 숫자와 남이 고른 것은 넣지 않는다.
    view(room, seat) {
      const S = room.state;
      const ai = room.ai.stats;
      return {secret: S.secret[seat], round: S.round, rounds: S.cfg.차례_수, options: S.cfg.선택지, mine: S.mine[seat] || [], tally: S.tally,
              talk: {...S.talk, mode: room.ai.mode, asked: ai.asked, blocked: ai.blocked, limit: ai.limit}};      // 컴퓨터 자리가 한 말의 수 · 미리 써 둔 말로 이어 간 수 · AI에 물은 수 · 한도에 막힌 수
    },
    // 컴퓨터가 맡는 자리: 이름은 이 판이 정하고, 고르기는 제 자리의 보기만 보고 한다 (고를 것 가운데 아무거나).
    bot: {
      name: (room, n, taken) => BOT_NAMES.find(x => !taken.includes(x)) || `컴퓨터 ${n}`,
      decide: (view, ctx) => ({pick: ctx.pick(Object.fromEntries((view.options || []).map(o => [o, 1])))})
    },
    // 단계 밖의 일: '기록 남기기' — 이 컴퓨터 안에서만 연 서버일 때 기록 폴더에 한 줄이 남는다.
    act(room, seat, action) {
      if (!action || action.type !== "record") return {ok: false, error: "모르는 일이에요."};
      const S = room.state;
      const kept = room.record({by: room.seat(seat).name, round: S.round, tally: S.tally, talk: S.talk, ai: room.ai.stats, note: String(action.note || "").slice(0, 200)});
      room.tell(seat, {text: kept ? "기록을 남겼습니다 (이 컴퓨터의 기록 폴더)." : "이 서버에서는 기록을 남길 수 없습니다."});
    },
    // 본보기에서는 보낸 사람이 고른 자리에만 전한다 ("all" 또는 자리 목록).
    // 사람이 말하면 컴퓨터 자리 하나가 차례로 대꾸한다 (컴퓨터 자리끼리는 대꾸하지 않는다).
    chat(room, seat, {text, to}) {
      const S = room.state, bots = room.seats().filter(s => s.bot && (to === "all" || to.includes(s.id)));
      if (room.status === "play" && !room.seat(seat).bot && bots.length) { const b = bots[S.turn++ % bots.length]; room.after(1, () => speak(room, b.id, text)); }
      return to;
    },
    presence(room, seat, on) { room.tell("all", {text: `${room.seat(seat).name} 님의 화면이 ${on ? "돌아왔습니다" : "끊겼습니다"}.`}); }
  });
})();
