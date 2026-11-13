// ai module: game code asks the AI through the engine server, within the project's cost cap.
// const r = await engine.ai.ask("…", {role: "실행", purpose: "즉흥 행동"}) → {ok, text} or {ok: false, budget, error}
// One game is one batch ("한판"); a test run is "시험" (the player passes ?kind=시험). When the batch reaches its cap
// (⚙ 게임 설정 › AI 비용 상한) the server makes no call and answers {ok: false, budget: true} — the game then uses its
// stored results or its rules instead. Without a server (tests, a file opened alone) every ask answers {ok: false}.
// await engine.ai.recall("판단", key) / engine.ai.store("판단", key, value) — the game's library (stored judgments).
// The page holds only the play key (AI and library, no file writes); which AI answers is the server's choice (ai.json 제공자).
// ?ai=fail (tests) — every ask fails as if the AI were down, so a game's fallback can be checked (ENGINE-002 #5).
// engine.ai.game("start" | "done") — marks one game for the statistics (games with no AI call count too). The session is
// kept for the tab (a refresh is the same game, counted once); "start" after "done" begins a new game with a new session.
// Three tools on top of ask, for games played by reading and writing text. The AI never decides anything: it offers one of
// the game's own candidates, or words for facts the game already settled. Each one goes through ask (same cap, same call
// log, same ?ai=fail), tells how long it took, and says so when the game's own fallback text was used instead.
//   await engine.ai.propose(text, candidates) → {candidateId, candidate, by, seconds} or null
//       candidates: [{id, label, words?}]. The player's free text → one of the candidates. An answer that names anything
//       outside the list is thrown away (null). by: "ai" | "words". Nothing is carried out here: the game asks "이렇게 할까요?" (Choices.confirm).
//   await engine.ai.narrate({facts, speaker, style, forbid, fallback, limitSeconds, names}) → {text, usedFallback, seconds, reason}
//       facts: ["…"] the only things that may be told. names: every name the game has — a name that is in the text but not in
//       the facts (or the speaker) throws the text away. forbid: ["글", {pattern: "정규식"}] throws it away too.
//       Thrown away, late (limitSeconds, default 60) or no AI → fallback (a text, or facts => text; default: the facts as given).
//   await engine.ai.speakAs({persona, knows, hide, say, question, forbid, fallback, limitSeconds, names}) → {text, usedFallback, seconds, reason}
//       An answer as one character. Only persona · knows · hide · say · question are sent to the AI.
//       hide: ["글", {text, words: ["낱말"]}] — an answer that says a hidden thing is thrown away. fallback default: `say` as given.
//   engine.ai.check(text, {facts, speaker, names, forbid, hide, maxChars}) → null (may be shown) or the reason it may not.
//   No AI (off, ?ai=fail, cap reached, late): propose answers from the candidates' own `words` (engine.match) when exactly one
//   fits — by: "words" — else null; narrate and speakAs give the fallback. Nothing is ever made up to look like a success.
//   engine.ai.fake(fn) — tests and samples: fn(prompt, {purpose}) answers instead of the server (no call, no cost).
//   engine.ai.calls → [{tool, seconds, usedFallback, reason}] this page's tool calls (how long the storyteller took) · bus signal "ai:tool".
WebEngine.module("ai", engine => {
  const o = engine.opts.ai || {}, P = engine.opts.params || {};
  const kind = o.kind || P.kind || "한판";
  const fresh = () => `${kind === "시험" ? "test" : "play"}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const KEY = "webengine-session:" + kind + ":" + (typeof location !== "undefined" ? location.pathname : "");
  const saved = (() => { try { return typeof sessionStorage !== "undefined" ? JSON.parse(sessionStorage.getItem(KEY) || "null") : null; } catch { return null; } })();
  let session = o.session || P.session || (saved && !saved.done ? saved.id : fresh()), done = false;
  const keep = () => { try { if (!o.session && !P.session && typeof sessionStorage !== "undefined") sessionStorage.setItem(KEY, JSON.stringify({id: session, done})); } catch { /* private mode: not kept */ } };
  keep();
  let last = {spent: 0, limit: null};
  let fakeFn = null;
  const api = {
    get session() { return session; }, kind,
    async game(status) {
      if (status === "start" && done && !o.session && !P.session) { session = fresh(); done = false; }   // a new game after the last one ended
      if (status === "done") done = true;
      keep();
      if (typeof fetch === "undefined" || !o.token) return false;
      try {
        return !!(await (await fetch("/api/ai/game", {method: "POST", headers: {"Content-Type": "application/json", "X-Token": o.token},
          body: JSON.stringify({session, kind, status})})).json()).ok;
      } catch { return false; }
    },
    get spent() { return last.spent; }, get limit() { return last.limit; },
    async ask(prompt, {role = "실행", purpose = "", tag = "", timeout = 0} = {}) {   // tag: the game's own label for the cost report · timeout: seconds the server may wait (0 = its own limit)
      if (P.ai === "fail") { engine.log("ai", "시험: AI 장애 흉내 (?ai=fail)"); return {ok: false, error: "시험: AI 장애 흉내"}; }
      // A room's rules on the play server (server/room_host.js): the host asks — it counts the board's calls, keeps its cap,
      // and uses the fake answers itself. No page ever has this option.
      if (typeof o.ask === "function") return o.ask(prompt, {role, purpose, tag, timeout}, fakeFn);
      if (fakeFn) {
        try { const v = await fakeFn(prompt, {role, purpose, tag}); return v == null || v === false ? {ok: false, error: "시험: 가짜 답 없음"} : {ok: true, text: String(v), fake: true}; }
        catch (e) { return {ok: false, error: "시험: 가짜 답 오류 — " + e.message}; }
      }
      if (typeof fetch === "undefined" || !o.token) return {ok: false, error: "AI를 부를 수 없음 (엔진 서버 없음)"};
      try {
        const r = await (await fetch("/api/ai", {method: "POST", headers: {"Content-Type": "application/json", "X-Token": o.token},
          body: JSON.stringify({role, prompt, purpose, session, kind, tag, ...(timeout ? {timeout} : {})})})).json();
        last = {spent: r.spent || 0, limit: r.limit ?? null};
        if (!r.ok) engine.log("ai", r.budget ? `상한 도달: ${r.error}` : `AI 오류: ${r.error}`);
        return r;
      } catch (e) { return {ok: false, error: "AI 요청 실패: " + e.message}; }
    },
    // The game's library of stored judgments (library/<name>.json): ask it first, call the AI only for what is new,
    // then store the answer. recall → the value or null. Without a server both do nothing.
    async recall(name, key) {
      if (typeof fetch === "undefined" || !o.token) return null;
      try { return (await (await fetch(`/api/library?name=${encodeURIComponent(name)}&key=${encodeURIComponent(key)}&session=${encodeURIComponent(session)}`)).json()).value ?? null; }
      catch { return null; }
    },
    async store(name, key, value) {
      if (typeof fetch === "undefined" || !o.token) return false;
      try {
        return !!(await (await fetch("/api/library", {method: "POST", headers: {"Content-Type": "application/json", "X-Token": o.token},
          body: JSON.stringify({name, key, value})})).json()).ok;
      } catch { return false; }
    },
    // ---- propose · narrate · speakAs (see the top of this file) ----
    calls: [],
    async propose(text, candidates, o) { return tools.propose(text, candidates, o); },
    async narrate(o) { return tools.narrate(o); },
    async speakAs(o) { return tools.speakAs(o); },
    // Why a text must be thrown away (a short reason), or null when it may be shown. The same check narrate and speakAs use,
    // for a game's own texts too. {facts, speaker, names, forbid, hide, maxChars} — see the top of this file.
    check(text, rules) { return check(text, rules); },
    // Tests and samples: answers come from fn(prompt, {role, purpose, tag}) instead of the server — a text, or null for
    // "no answer". No call is made and nothing is spent. fake(null) turns it off. ?ai=fail still wins.
    fake(fn) { fakeFn = typeof fn === "function" ? fn : null; return api; }
  };

  const clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
  const since = t => Math.round((clock() - t) * 100) / 100;
  const flat = t => String(t ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const list = v => (Array.isArray(v) ? v : v == null || v === "" ? [] : [v]).map(x => typeof x === "string" ? x : x && typeof x === "object" ? x : String(x));
  const words = v => list(v).map(x => typeof x === "string" ? x : String(x.text ?? "")).filter(Boolean);
  // One row per tool call: how long the player waited and whether the game's own text was used. Kept on the page only.
  const note = (tool, row) => { const r = {tool, ...row}; api.calls.push(r); if (api.calls.length > 200) api.calls.shift(); engine.bus.emit("ai:tool", r); };
  // ask, but never longer than `limit` seconds: a late answer is dropped (the wait was real time, not game time).
  const within = (prompt, opts, limit) => new Promise(ok => {
    const t = setTimeout(() => ok({ok: false, late: true, error: `${limit}초 안에 답이 오지 않음`}), Math.max(0.05, limit) * 1000);
    api.ask(prompt, {...opts, timeout: limit}).then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ok({ok: false, error: String(e && e.message || e)}); });
  });
  const why = r => r.late ? "늦음" : r.budget ? "상한에 닿음" : r.off ? "AI가 꺼져 있음" : "AI가 대답하지 못함";
  const fallbackText = (fb, given) => typeof fb === "function" ? String(fb(given) ?? "") : fb != null ? String(fb) : given.join(" ");
  const clean = t => String(t ?? "").trim().replace(/^```[a-z]*\n?|```$/g, "").trim().replace(/^["“]([^"”]*)["”]$/, "$1").trim();

  function check(text, {facts = [], speaker = "", names = [], forbid = [], hide = [], maxChars = 600, allow = []} = {}) {
    const t = String(text ?? "");
    if (!t.trim()) return "빈 글";
    if (t.length > maxChars) return `너무 김 (${t.length}자 > ${maxChars}자)`;
    const given = [...words(facts), ...words(allow), String(speaker || "")];
    for (const n of words(names)) if (t.includes(n) && !given.some(g => g.includes(n))) return `받은 사실에 없는 이름 '${n}'`;
    for (const f of list(forbid)) {
      if (f instanceof RegExp || (f && typeof f === "object" && f.pattern)) {
        let re = null;
        try { re = f instanceof RegExp ? f : new RegExp(f.pattern, f.flags || ""); } catch (e) { engine.log("ai", `금지 표현의 정규식을 읽지 못함: ${f.pattern}`); }
        const m = re && re.exec(t);
        if (m) return `금지 표현 '${m[0]}'`;
      } else if (typeof f === "string" && f && t.includes(f)) return `금지 표현 '${f}'`;
    }
    const ft = flat(t);
    for (const h of list(hide)) {
      const marks = typeof h === "string" ? [h] : [...(h.words || []), ...(h.text && !(h.words || []).length ? [h.text] : [])];
      const hit = marks.find(m => flat(m) && ft.includes(flat(m)));
      if (hit) return `숨길 것을 말함 '${hit}'`;
    }
    return null;
  }

  const tools = {
    // Free text → one of the game's candidates. The AI's answer must be exactly {"candidateId": "<an id from the list>"}.
    async propose(text, candidates, {limitSeconds = 30, useWords = true} = {}) {
      const t0 = clock(), cands = (candidates || []).filter(c => c && c.id != null), ids = cands.map(c => String(c.id));
      const done = (c, by, reason) => { const seconds = since(t0); note("propose", {seconds, usedFallback: by !== "ai", reason}); return c ? {candidateId: String(c.id), candidate: c, by, seconds} : null; };
      if (!String(text ?? "").trim() || !cands.length) return done(null, "", "글이나 후보가 없음");
      const prompt = "아래는 사람이 쓴 글(text)과 고를 수 있는 후보 목록(candidates)입니다. 글이 뜻하는 후보 하나를 고르세요.\n"
        + "응답은 {\"candidateId\":\"후보의 id\"} 꼴의 JSON 하나만 출력하세요. 다른 키, 설명, 코드 펜스는 쓰지 마세요.\n"
        + "맞는 후보가 없거나 어느 것인지 흐리면 추측하지 말고 null 만 출력하세요. 목록에 없는 id를 만들지 마세요.\n"
        + JSON.stringify({text: String(text), candidates: cands.map(c => ({id: String(c.id), label: String(c.label ?? c.id)}))});
      const r = await within(prompt, {purpose: "후보로 옮기기", tag: "propose"}, limitSeconds);
      if (r && r.ok) {
        let v; try { v = JSON.parse(clean(r.text)); } catch { return done(null, "", "답이 JSON이 아님 — 버림"); }
        if (v === null) return done(null, "", "AI가 맞는 후보가 없다고 함");
        const keys = v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v) : [];
        if (keys.length !== 1 || keys[0] !== "candidateId" || typeof v.candidateId !== "string") return done(null, "", "답의 꼴이 다름 — 버림");
        const i = ids.indexOf(v.candidateId);
        return i < 0 ? done(null, "", `후보 밖의 답 '${v.candidateId.slice(0, 40)}' — 버림`) : done(cands[i], "ai", "");
      }
      // No AI: the engine's word matching (engine.match) on the candidates' own words — only a single clear hit counts.
      const withWords = useWords && engine.match ? cands.filter(c => (c.words || []).length) : [];
      const hits = withWords.length ? engine.match.find(text, withWords) : [];
      if (hits.length && (hits.length === 1 || hits[0].score > hits[1].score)) return done(hits[0].entry, "words", why(r));
      return done(null, "", why(r));
    },
    // Words for facts the game already settled. A text with a name that was not given, or a forbidden expression, is dropped.
    async narrate({facts = [], speaker = "", style = "", forbid = [], fallback, limitSeconds = 60, names = [], maxChars = 600} = {}) {
      const t0 = clock(), given = words(facts);
      const out = (text, reason) => { const row = {text, usedFallback: !!reason, seconds: since(t0), reason}; note("narrate", {seconds: row.seconds, usedFallback: row.usedFallback, reason}); return row; };
      if (!given.length) return out(fallbackText(fallback, given), "사실이 없음");
      const prompt = ["당신은 이야기를 전하는 사람입니다. 아래 '사실'만 써서 한국어로 짧게 이야기하세요.",
        "지킬 것: 사실에 없는 사람·이름·장소·사건·까닭을 새로 만들지 마세요. 읽는 사람의 말·생각·행동을 대신 정하지 마세요. 사실을 빠뜨리거나 뒤집지 마세요. 이야기 글만 출력하세요(머리말·목록 표시·따옴표 없이).",
        speaker ? `말하는 이: ${speaker}` : "", `말투와 길이: ${style || "세 줄 아래"}`, "사실:", ...given.map(f => "- " + f)].filter(Boolean).join("\n");
      const r = await within(prompt, {purpose: "사실로 이야기", tag: "narrate"}, limitSeconds);
      if (!r || !r.ok) return out(fallbackText(fallback, given), why(r || {}));
      const text = clean(r.text), bad = check(text, {facts: given, speaker, names, forbid, maxChars});
      return bad ? out(fallbackText(fallback, given), bad + " — 버림") : out(text, "");
    },
    // An answer as one character. Only what the character is like, knows, hides and is to say goes to the AI.
    async speakAs({persona = "", knows = [], hide = [], say = [], question = "", forbid = [], fallback, limitSeconds = 60, names = [], maxChars = 400} = {}) {
      const t0 = clock(), toSay = words(say);
      const out = (text, reason) => { const row = {text, usedFallback: !!reason, seconds: since(t0), reason}; note("speakAs", {seconds: row.seconds, usedFallback: row.usedFallback, reason}); return row; };
      const prompt = ["당신은 아래 '인물'입니다. 그 사람으로서 '물음'에 한국어로 짧게(세 문장 아래) 대답하세요.",
        "지킬 것: '아는 것'과 '말할 것'에 없는 사실·이름·사건을 새로 만들지 마세요. '숨길 것'은 드러내지 마세요(모른다고 하거나 말을 돌리세요). '말할 것'이 있으면 그 뜻을 대답에 담으세요. 묻는 사람의 말·생각·행동을 대신 정하지 마세요. 대답만 출력하세요(이름표·따옴표 없이).",
        `인물: ${typeof persona === "string" ? persona : JSON.stringify(persona)}`,
        "아는 것:", ...(words(knows).length ? words(knows).map(k => "- " + k) : ["- (없음)"]),
        "숨길 것:", ...(words(hide).length ? words(hide).map(k => "- " + k) : ["- (없음)"]),
        "말할 것:", ...(toSay.length ? toSay.map(k => "- " + k) : ["- (정해진 것 없음)"]),
        `물음: ${question || "(말을 걸었다)"}`].join("\n");
      const r = await within(prompt, {purpose: "인물로서 대답", tag: "speakAs"}, limitSeconds);
      if (!r || !r.ok) return out(fallbackText(fallback, toSay), why(r || {}));
      const text = clean(r.text);
      const bad = check(text, {facts: [...words(knows), ...toSay], allow: [typeof persona === "string" ? persona : JSON.stringify(persona), String(question)], names, forbid, hide, maxChars});
      return bad ? out(fallbackText(fallback, toSay), bad + " — 버림") : out(text, "");
    }
  };
  return api;
});
