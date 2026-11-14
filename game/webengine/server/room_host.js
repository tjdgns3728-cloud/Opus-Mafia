// Room host: keeps every shared room of ONE game in this process and runs the game's rules here, without a browser.
// The play server (server/play.py) starts it and passes each request as one JSON line; the answer is one JSON line.
//   usage: node room_host.js <project dir> [--timescale N] [--seed N]
//   in : {"id": 1, "op": "create" | "join" | "start" | "intent" | "act" | "chat" | "news" | "bye" | "info", …}
//   out: {"id": 1, "res": {...}}   ·   {"log": "why something was refused"}   ·   {"ready": true, "rules": true | false, …}
// It loads runtime/*.js (the same engine files the browser loads — as rules_runner.js does) and the project's scripts;
// one of them registers the rules with WebEngine.room({...}) (runtime/room.js, docs/ROOM.md).
// What is trusted from a screen: its seat key and nothing else. The seat, the name and the state come from here.
// Nothing is written to disk: when this process ends, every room is gone.
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";      // no I, O, 0, 1: a code is read aloud and typed
const HEADLESS = ["phase", "actors", "knowledge", "timer", "state", "korean", "cond", "match", "ai"];   // engine modules a room's rules use (no screen, no sound; ai asks through this host, never from a page)

function loadEngine(runtimeDir) {
  for (const f of fs.readdirSync(runtimeDir).filter(f => f.endsWith(".js")).sort((a, b) => a === "core.js" ? -1 : b === "core.js" ? 1 : a.localeCompare(b)))
    require(path.join(runtimeDir, f));
  return globalThis.WebEngine;
}

// createHost({WebEngine, rules, data, log, opts}) → {handle(req) → Promise(res), rooms, stop()}
//   opts: timeScale (game seconds per real second) · hold (seconds a "news" request that asked to wait is kept open
//   when there is nothing new) · away (seconds without a request before a seat counts as gone) · seed (a fixed seed, for tests) · maxRooms · idle (seconds before an unused room is dropped)
//   · lobbyGrace (seconds a seat whose screen went away is kept in the waiting room before it is given up)
//   · emptyClose (seconds a started room with no person's screen is kept) · aiMode "off" | "on" | "fake" | "fail" ·
//   aiSend(req) → Promise({ok, text} | {ok: false, budget, error}) the real asker (the play server) · aiLog(row) ·
//   limitCalls (AI asks one board may send; null = no count cap) · record(line) → true when the bundle was kept
function createHost({WebEngine, rules, data = () => null, log = () => {}, opts = {}}) {
  const O = {timeScale: 1, hold: 10, away: 4, seed: null, maxRooms: 50, idle: 1800, lobbyGrace: 20, emptyClose: 300, name: "게임",
             aiMode: "off", aiSend: null, aiLog: null, limitCalls: null, record: null, ...opts};
  const BOT = rules && rules.bot && typeof rules.bot === "object" && typeof rules.bot.decide === "function" ? rules.bot : null;
  const rooms = new Map();
  const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  const limit = (v, fallback) => { const x = typeof v === "function" ? v(data) : v; return Number.isFinite(Number(x)) && Number(x) > 0 ? Math.floor(Number(x)) : fallback; };
  const MIN = rules ? limit(rules.min, 1) : 1, MAX = rules ? Math.max(MIN, limit(rules.max, 16)) : 16;
  // Every refusal has a name (code) and a plain text. The text is the engine's; a game gives its own words with
  // rules.texts = {code: "글" | info => "글"} (docs/ROOM.md lists the codes) — a screen can also switch on the code.
  const TEXTS = rules && rules.texts && typeof rules.texts === "object" ? rules.texts : {};
  const refuse = (code, why, extra = {}) => {
    let text = why;
    const own = TEXTS[code];
    try { if (typeof own === "function") text = String(own(extra) ?? why); else if (typeof own === "string" && own) text = own; } catch { text = why; }
    return {ok: false, code, error: text, ...extra};
  };
  const gone = code => refuse("room_gone", `'${String(code || "").slice(0, 12)}' 방이 없습니다. 서버가 다시 켜졌거나 방이 닫혔습니다.`, {gone: true, room: String(code || "").slice(0, 12)});
  const PHASE_CODES = [["늦음", "phase_late"], ["행위자가 아님", "phase_not_actor"], ["중복", "phase_duplicate"]];      // engine.phase's own words → names
  const PHASE_TEXTS = {phase_late: "이미 다음으로 넘어갔습니다.", phase_not_actor: "지금은 고를 차례가 아닙니다.", phase_duplicate: "이미 골랐습니다."};

  function newCode() {
    for (let tries = 0; tries < 200; tries++) {
      const code = Array.from(crypto.randomBytes(4), b => CODE_LETTERS[b % CODE_LETTERS.length]).join("");
      if (!rooms.has(code)) return code;
    }
    throw new Error("방 이름을 만들지 못함");
  }
  function cleanName(raw) {
    const name = String(raw ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (!name) return {error: refuse("name_empty", "부를 이름을 넣으세요.")};
    if ([...name].length > 12) return {error: refuse("name_long", "부를 이름은 12자까지입니다.", {max: 12})};
    return {name};
  }

  function makeRoom(code) {
    const seed = O.seed ?? crypto.randomBytes(4).readUInt32LE(0);
    const engine = new WebEngine.Engine({seed, room: true, timeScale: O.timeScale, modules: HEADLESS.filter(m => WebEngine.modules().includes(m)),
                                         ai: {kind: "한판", session: "room", ask: (prompt, info, fake) => askAI(prompt, info, fake)}});
    engine.bus.on("error", e => log(`방 ${code} 오류 — ${e.where} ${e.what}: ${e.message}`));
    const input = engine.actors.input("room");
    const R = {code, seed, engine, input, seats: [], byKey: new Map(), status: "lobby", version: 1, events: [], waiters: [], phase: null,
               result: null, fault: "", touched: Date.now(), api: null,
               nextSeat: 1, round: 1, from: 0, left: new Set(), emptyAt: 0, bots: 0,
               ai: {asked: 0, sent: 0, answered: 0, blocked: 0, failed: 0, seconds: 0}};
    const seatInfo = s => ({id: s.id, name: s.name, host: s.host, on: s.on, bot: s.bot});
    const session = () => `play:room:${code}:${R.round}`;
    const people = () => R.seats.some(s => !s.bot && s.on);
    let touched = false;                              // something for the screens changed outside a request (a timer, an AI answer): one bump for all of it
    const touch = () => { if (touched) return; touched = true; queueMicrotask(() => { touched = false; if (rooms.has(code)) bump(); }); };
    // One AI ask of this room's rules (engine.ai's tools all come through here — runtime/ai.js). Never throws; "no answer"
    // is {ok: false, error} and the tool then uses the game's own fallback text. Counted per board; nothing is asked when the
    // AI is off, when the board's count cap is reached, or when no person's screen is in the room.
    async function askAI(prompt, info = {}, fake = null) {
      const S = R.ai, t0 = Date.now(), ses = session();
      S.asked++;
      const end = (res, kind, extra = {}) => {
        const seconds = Math.round((Date.now() - t0) / 100) / 10;
        if (R.ai === S) { S[kind]++; S.seconds = Math.round((S.seconds + seconds) * 10) / 10; }
        if (O.aiLog && (O.aiMode !== "on" || fake || extra.local))      // a real call (and its cap in won) is logged by the asker itself
          O.aiLog({session: ses, purpose: String(info.purpose || ""), tag: String(info.tag || ""), ok: !!res.ok, seconds, mode: fake ? "fake" : O.aiMode, prompt_chars: String(prompt).length, ...(res.budget ? {budget: true} : {}), ...(res.ok ? {} : {why: res.error})});
        touch();
        return res;
      };
      if (!people()) return end({ok: false, error: "방에 사람이 없음"}, "failed", {local: true});
      if (O.aiMode === "off" && !fake) return end({ok: false, off: true, error: "AI가 꺼져 있음"}, "failed");
      if (O.limitCalls != null && S.sent >= O.limitCalls) return end({ok: false, budget: true, error: `한 판 한도 ${O.limitCalls}번에 닿음`}, "blocked", {local: true});
      S.sent++;
      if (O.aiMode === "fail") return end({ok: false, error: "시험: AI 장애 흉내"}, "failed");
      if (fake || O.aiMode === "fake") {
        let v = null;
        try { v = fake ? await fake(prompt, info) : null; } catch (e) { return end({ok: false, error: "가짜 답 오류 — " + e.message}, "failed"); }
        return v == null || v === false ? end({ok: false, error: "가짜 답 없음"}, "failed") : end({ok: true, text: String(v), fake: true}, "answered");
      }
      if (!O.aiSend) return end({ok: false, error: "AI를 부를 길이 없음"}, "failed", {local: true});
      let r;
      try { r = await O.aiSend({prompt: String(prompt), purpose: String(info.purpose || ""), tag: String(info.tag || ""), session: ses, timeout: Number(info.timeout) || 0}); }
      catch (e) { r = {ok: false, error: String(e && e.message || e)}; }
      return end(r && typeof r === "object" ? r : {ok: false, error: "답이 없음"}, r && r.ok ? "answered" : r && r.budget ? "blocked" : "failed");
    }

    const bump = () => { R.version++; const w = R.waiters; R.waiters = []; for (const x of w) x(); };
    // Game code runs inside guard: a broken rule is reported with its place, shown on every screen, and never kills the host.
    const guard = (what, fn) => {
      try { return fn(); }
      catch (err) { R.fault = `${what}: ${err.message}`; log(`방 ${code} 규칙 오류 — ${R.fault}`); return undefined; }
    };
    const ids = () => R.seats.map(s => s.id);
    const targets = to => {
      if (to === "all" || to === undefined) return "all";
      const list = (Array.isArray(to) ? to : [to]).map(String).filter(id => ids().includes(id));
      return [...new Set(list)];
    };
    const event = (type, to, body) => { R.events.push({i: R.events.length + 1, type, to, at: Math.round(engine.time * 10) / 10, ...body}); touch(); };
    // A line of chat from one seat — a person's (op "chat") or a computer seat's (room.say): the same hook decides who gets
    // it, the same record keeps it, the text is never changed. → null when sent, or [code, text] why not.
    function chat(seat, text, asked) {
      if (typeof text !== "string" || !text.trim()) return ["chat_empty", "빈 글은 보내지 않습니다."];
      if ([...text].length > 500) return ["chat_long", "글이 너무 깁니다 (500자까지)."];
      if (!rules.chat) return ["no_chat", "이 게임에는 채팅이 없습니다."];
      const d = guard(`자리 ${seat.id}의 채팅`, () => rules.chat(R.api, seat.id, {text, to: asked}));
      const to = d && typeof d === "object" && !Array.isArray(d) ? d.to : d;
      if (to === null || to === undefined || to === false || (Array.isArray(to) && !to.length)) return ["chat_refused", "지금은 그 글을 보낼 수 없습니다."];
      const tag = d && typeof d === "object" && !Array.isArray(d) && d.tag ? {tag: String(d.tag)} : {};
      event("chat", targets(to), {from: seat.id, name: seat.name, text, ...tag});
      return null;
    }
    // Computer seats state their intent through engine.actors' bot path (source "bot", never "room"): the game's
    // bot.decide(view of that seat only, {id, phase, pick}) — it gets no other seat's view and not the room's state.
    function decideBots(p, due) {
      if (R.phase !== p || p.closed) return;
      p.due = new Set(due);
      engine.actors.decide(p.ph, id => guard(`자리 ${id}의 보기`, () => clone(rules.view(R.api, id))));
      p.due = new Set();
      settle(p);
    }
    // Closes the phase when everyone has sent — or, with closeOn "humans", as soon as every person in it has (the computer
    // seats that have not sent yet are asked right then, so nobody waits for them).
    function settle(p) {
      if (R.phase !== p || p.closed) return;
      const waiting = p.ph.waiting();
      if (!waiting.length) return finish(false);
      const humans = p.ids.filter(id => !isBot(id));
      if (p.closeOn === "humans" && humans.length && !humans.some(id => waiting.includes(id))) {
        const bots = waiting.filter(isBot);
        if (bots.length && !p.asked) { p.asked = true; return decideBots(p, bots); }
        return finish(false);
      }
      bump();
    }
    const isBot = id => { const s = R.seats.find(x => x.id === id); return !!s && s.bot; };

    function finish(timeout) {
      const p = R.phase;
      if (!p || p.closed) return;
      p.closed = true;
      if (p.cancel) p.cancel();
      const raw = p.ph.close();
      const intents = Object.fromEntries(Object.entries(raw).map(([id, v]) => [id, v.intent]));
      const missing = p.ids.filter(id => !(id in raw));
      R.phase = null;
      guard(`단계 '${p.name}' 풀기`, () => p.done && p.done(intents, {name: p.name, timeout, missing, raw}));
      bump();
    }

    // What the game's rules get. Everything that reaches a screen goes through view() and tell()/chat.
    R.api = {
      code, seed, engine, state: {},
      data,                                                       // data("data/x.json") → the game's own data file, or null
      seats: () => R.seats.map(seatInfo),                          // {id, name, host, on, bot} — bot: a seat the computer plays
      seat: id => { const s = R.seats.find(x => x.id === id); return s ? seatInfo(s) : null; },
      // The AI tools of engine.ai (docs/TALK.md: propose · narrate · speakAs · check · fake · calls), asked from the rules.
      // They never stop the board: each returns a Promise, phases and chat go on meanwhile. mode: "off" | "on" | "fake" | "fail".
      // stats: this board's {asked, sent, answered, blocked, failed, seconds, limit}.
      ai: Object.defineProperties(engine.ai, {mode: {get: () => O.aiMode, configurable: true},
                                               stats: {get: () => ({...R.ai, limit: O.limitCalls}), configurable: true}}),
      // A computer seat says something: the same way as a person's chat (rules.chat decides who gets it). Only for computer
      // seats — the engine never speaks for a person. → true when it was sent.
      say(seatId, text, to = "all") {
        const seat = R.seats.find(x => x.id === String(seatId));
        if (!seat || !seat.bot) throw new Error(`'${seatId}'는 컴퓨터가 맡은 자리가 아님 (사람의 말은 사람만 한다)`);
        if (R.status === "lobby") return false;
        return chat(seat, String(text ?? ""), to === "all" || to === undefined ? "all" : targets(to)) === null;
      },
      // fn after `seconds` of the room's clock (cancelled by the returned function). Errors are reported like any rule error.
      after(seconds, fn) { return engine.timer.after(Math.max(0.01, Number(seconds) || 0), () => { if (rooms.has(code)) { guard("나중에 하기", fn); touch(); } }); },
      // One bundle (any JSON) appended as one line to this computer's record folder (logs/room_records/). Only when the
      // server is open on this computer alone → true when kept, false when not (not allowed, or too big).
      record(bundle) {
        if (!O.record) return false;
        let line;
        try { line = JSON.stringify({time: new Date().toISOString(), room: code, round: R.round, data: bundle === undefined ? null : bundle}); } catch { return false; }
        return line.length <= 64 * 1024 && O.record(line) === true;
      },
      random: () => engine.random(),
      get status() { return R.status; },
      // the open phase; intents = what each seat has sent so far ({seatId: intent}) — for view(), never sent by the engine itself
      get current() {
        if (!R.phase) return null;
        const got = R.phase.ph.intents();
        return {name: R.phase.name, seats: [...R.phase.ids], waiting: R.phase.ph.waiting(), left: left(), intents: Object.fromEntries(Object.entries(got).map(([id, v]) => [id, v.intent]))};
      },
      get round() { return R.round; },
      // One step: the listed seats each state one intent; it closes when all have, when the time is up, or on closePhase().
      // done(intents, {timeout, missing, raw}) — a seat that sent nothing is simply not in intents ("did nothing").
      // check(seatId, intent) → nothing to take it, or "까닭" (or {error}) to refuse it — the seat may then send another.
      // showWaiting: true sends the ids of the seats that have not sent yet to EVERY screen (do not use it when who takes
      // part in the phase is itself hidden); "count" sends only how many.
      // closeOn: "all" (default) | "humans" — close as soon as every PERSON in it has sent (computer seats are asked then).
      // bots: when the computer seats send — seconds after the phase opens (0 = at once), seatId => seconds, or false
      // (not by themselves). Default: the game's bot.delay, else at once.
      phase(name, {seats = null, seconds = 0, done = null, showWaiting = false, check = null, closeOn = "all", bots = undefined} = {}) {
        if (R.status !== "play") throw new Error("판이 진행 중일 때만 단계를 열 수 있음");
        if (R.phase) throw new Error(`앞 단계 '${R.phase.name}'가 아직 열려 있음`);
        const who = (seats || ids()).map(String).filter(id => ids().includes(id));
        const secs = Number(seconds) > 0 ? Number(seconds) : 0;
        if (!who.length && !secs) throw new Error("뜻을 낼 자리도 시간도 없는 단계는 끝나지 않음");
        const p = {name: String(name), ids: who, seconds: secs, done, showWaiting: showWaiting === "count" ? "count" : !!showWaiting, check: typeof check === "function" ? check : null, closed: false, ph: engine.actors.begin(String(name), who),
                   endsAt: secs ? engine.time + secs : null, cancel: null};
        if (secs) p.cancel = engine.timer.after(secs, () => finish(true));
        p.closeOn = closeOn === "humans" ? "humans" : "all"; p.due = new Set(); p.asked = false;
        R.phase = p;
        const when = bots === undefined ? (BOT && BOT.delay !== undefined ? BOT.delay : 0) : bots;
        if (BOT && when !== false) for (const id of who.filter(isBot)) {
          let d = 0;
          try { d = Number(typeof when === "function" ? when(id) : when) || 0; } catch (e) { log(`방 ${code} 규칙 오류 — 컴퓨터 자리 ${id}의 때: ${e.message}`); }
          engine.timer.after(Math.max(0.05, d), () => decideBots(p, [id]));      // never inside phase(): the game's own code finishes first
        }
        return {name: p.name};
      },
      closePhase() { finish(false); },
      // The open timed phase ends `seconds` later than planned. false when no timed phase is open.
      extendPhase(seconds) { const p = R.phase, add = Number(seconds) || 0; if (!p || p.closed || p.endsAt == null || add <= 0) return false; if (p.cancel) p.cancel(); p.endsAt += add; p.seconds += add; p.cancel = engine.timer.after(Math.max(0.01, p.endsAt - engine.time), () => finish(true)); bump(); return true; },
      // An event for some seats only ("all", one id, or a list). Kept in order; a seat that comes back gets its own again.
      tell(to, body) { event("tell", targets(to), {data: clone(body)}); },
      // Back to the waiting room with the same seats and keys (after end): the game's state is emptied, earlier events
      // are no longer sent again, seats whose screens are away may be given up, and new people can come in by the room name.
      reopen() { reopen(); },
      end(result) {
        if (R.phase) { R.phase.closed = true; if (R.phase.cancel) R.phase.cancel(); R.phase = null; }
        if (R.status === "play" && O.aiLog) O.aiLog({board: "done", session: session(), ...R.ai});
        R.status = "over"; R.result = clone(result ?? null); touch();
      },
      refresh: bump
    };
    function reopen() {
      if (R.status !== "over") throw new Error("끝난 판만 다시 열 수 있음");
      R.status = "lobby"; R.phase = null; R.result = null; R.fault = "";
      for (const k of Object.keys(R.api.state)) delete R.api.state[k];
      R.round++; R.from = R.events.length;
      engine.actors.clear();
      const t = Date.now();
      for (const s of R.seats) if (!s.on) s.offAt = t;            // the grace of the waiting room starts now
      rehost(R);
      bump();
    }
    const left = () => R.phase && R.phase.endsAt != null ? Math.max(0, (R.phase.endsAt - engine.time) / engine.timeScale) : null;

    R.payload = (seat, since) => {
      const p = R.phase;
      const view = rules && R.status !== "lobby" ? guard(`자리 ${seat.id}의 보기`, () => clone(rules.view(R.api, seat.id))) : null;
      const own = p && p.ids.includes(seat.id) ? p.ph.intents()[seat.id] : null;
      return {ok: true, n: R.version, room: code, game: O.name, status: R.status, round: R.round, min: MIN, max: MAX, me: seat.id, host: seat.host,
        seats: R.seats.map(seatInfo), bots: !!BOT,
        phase: p ? {name: p.name, left: left(), seconds: p.seconds / engine.timeScale, mine: p.ids.includes(seat.id), sent: !!own, own: own ? own.intent : null,
                    ...(p.showWaiting === true ? {waiting: p.ph.waiting()} : {}), ...(p.showWaiting ? {waitingCount: p.ph.waiting().length} : {})} : null,
        view: view ?? null, result: R.status === "over" ? R.result : null, fault: R.fault,
        events: R.events.filter(ev => ev.i > Math.max(since, R.from) && (ev.to === "all" || ev.to.includes(seat.id) || ev.from === seat.id))
                        .map(ev => ({...ev, to: ev.to === "all" ? "all" : [...ev.to]}))};
    };
    R.bump = bump; R.guard = guard; R.finish = finish; R.event = event; R.targets = targets; R.chat = chat; R.settle = settle; R.session = session;
    // the bot policy the engine's actors call: only for the seats that are due now
    R.policy = (view, ctx) => R.phase && R.phase.due.has(ctx.id) ? BOT.decide(view, ctx) : undefined;
    engine.load({name: "room", nodes: []});
    engine.run();                                   // the room's clock: timers fire by game time (timeScale for tests)
    rooms.set(code, R);
    return R;
  }

  function addSeat(R, name, host, bot = false) {
    const key = bot ? "" : crypto.randomBytes(18).toString("base64url");      // a computer seat has no key: no screen can sit in it
    const seat = {id: "s" + R.nextSeat++, name, host, key, on: true, seen: Date.now(), pending: 0, closed: [], offAt: 0, bot};
    R.seats.push(seat); if (!bot) R.byKey.set(key, seat);
    return seat;
  }
  // The maker's seat is gone or away when the room is (again) a waiting room: the first seat with a screen makes the start.
  function rehost(R) {
    const host = R.seats.find(s => s.host);
    if (host && host.on) return;
    const next = R.seats.find(s => s.on && !s.bot);
    if (!next) return;
    if (host) host.host = false;
    next.host = true;
  }
  // Waiting room only: the seat is given up — its key stops working, and somebody else can take the place.
  function removeSeat(R, seat) {
    R.seats = R.seats.filter(s => s !== seat);
    if (!seat.bot) { R.byKey.delete(seat.key); R.left.add(seat.key); }
    if (!R.seats.some(s => !s.bot)) { log(`방 ${R.code} 닫음 — 기다리는 방에 아무도 남지 않음`); return dropRoom(R); }
    rehost(R);
    R.bump();
  }
  function dropRoom(R) { R.engine.stop(); const w = R.waiters; R.waiters = []; for (const x of w) x(); rooms.delete(R.code); }

  // A request from a seat: the room must exist and the key must be one this room gave out. Anything else is refused and logged.
  function seated(req, op) {
    const R = rooms.get(String(req.room || "").toUpperCase());
    if (!R) return {res: gone(req.room)};
    const seat = typeof req.key === "string" && req.key ? R.byKey.get(req.key) : null;
    if (!seat) {
      if (typeof req.key === "string" && R.left.has(req.key))
        return {res: refuse("seat_gone", "자리를 비운 사이 그 자리가 비워졌습니다. 방 이름으로 다시 들어오세요.", {gone: true, room: R.code})};
      log(`받지 않음: ${op} — 방 ${R.code}, 자리 열쇠 ${req.key ? "틀림" : "없음"}`);
      return {res: refuse("no_key", "자리 열쇠가 없거나 맞지 않습니다.", {nokey: true})};
    }
    R.touched = Date.now();
    if (typeof req.tab === "string" && seat.closed.includes(req.tab)) return {R, seat};      // a late request of a window that already said goodbye
    seat.seen = Date.now();
    if (!seat.on) { seat.on = true; seat.offAt = 0; if (rules && rules.presence && R.status === "play") R.guard("자리 돌아옴", () => rules.presence(R.api, seat.id, true)); R.bump(); }
    return {R, seat};
  }

  async function handle(req) {
    const op = String(req.op || "");
    if (op === "info") return {ok: true, game: O.name, min: MIN, max: MAX, rules: !!rules, aiMode: O.aiMode};
    if (!rules) return refuse("no_rules", "이 게임에는 방의 규칙(WebEngine.room)이 없어 서버에서 판을 돌릴 수 없습니다.");
    if (op === "create" || op === "join") {
      const n = cleanName(req.name);
      if (n.error) return n.error;
      if (op === "create") {
        if (rooms.size >= O.maxRooms) return refuse("rooms_limit", "지금은 방을 더 만들 수 없습니다.");
        const R = makeRoom(newCode());
        const seat = addSeat(R, n.name, true);
        return {ok: true, room: R.code, seat: seat.id, key: seat.key};
      }
      const R = rooms.get(String(req.room || "").toUpperCase());
      if (!R) return gone(req.room);
      if (R.status !== "lobby") return refuse(R.status === "over" ? "room_over" : "room_started", R.status === "over" ? "이 방의 판은 끝났습니다. 방에 있는 사람이 방을 다시 열면 들어올 수 있습니다." : "이 방은 이미 판을 시작했습니다.");
      if (R.seats.length >= MAX) {                         // full — but a seat whose screen is away gives its place to the newcomer
        const away = R.seats.filter(s => !s.on).sort((a, b) => a.offAt - b.offAt)[0];
        if (!away) return refuse("room_full", `방이 가득 찼습니다 (${MAX}명).`, {max: MAX});
        removeSeat(R, away);
      }
      if (R.seats.some(s => s.name === n.name)) return refuse("name_taken", "같은 이름이 이미 있습니다. 다른 이름을 넣으세요.");
      const seat = addSeat(R, n.name, false);
      R.touched = Date.now();
      R.bump();
      return {ok: true, room: R.code, seat: seat.id, key: seat.key};
    }
    if (!["start", "intent", "act", "chat", "news", "bye", "leave", "reopen", "bot_add", "bot_remove"].includes(op)) return refuse("bad_op", "없는 일");
    const s = seated(req, op);
    if (s.res) return s.res;
    const {R, seat} = s;
    if (op === "news") {
      const since = Number(req.since), e = Math.max(0, Number(req.e) || 0);
      if (!(R.version > since) && req.wait === true && O.hold > 0) {      // a screen that may keep a request open waits here for news
        seat.pending++;
        await new Promise(ok => { const t = setTimeout(ok, O.hold * 1000); R.waiters.push(() => { clearTimeout(t); ok(); }); });
        seat.pending--;
      }
      if (!rooms.has(R.code)) return gone(R.code);
      if (seat.on) seat.seen = Date.now();
      return R.payload(seat, e);
    }
    if (op === "bye") {                                   // the window closed: the seat stays, the others are told
      if (typeof req.tab === "string" && req.tab) { seat.closed.push(req.tab.slice(0, 24)); if (seat.closed.length > 20) seat.closed.shift(); }
      seat.seen = 0;
      away(R, seat);
      return {ok: true};
    }
    if (op === "leave") {                                 // the person chose to go: in the waiting room the seat is given up at once
      if (R.status === "lobby") removeSeat(R, seat);
      else { seat.seen = 0; away(R, seat); }
      return {ok: true};
    }
    if (op === "bot_add" || op === "bot_remove") {        // computer seats: the maker only, in the waiting room only
      if (!BOT) return refuse("no_bots", "이 게임에는 컴퓨터가 맡는 자리가 없습니다.");
      if (!seat.host) { log(`받지 않음: ${op} — 방 ${R.code}, 방을 만든 자리가 아님 (${seat.id})`); return refuse("not_host", "방을 만든 사람만 컴퓨터 자리를 넣고 뺄 수 있습니다."); }
      if (R.status !== "lobby") return refuse("not_lobby", "컴퓨터 자리는 기다리는 방에서만 넣고 뺄 수 있습니다.");
      if (op === "bot_remove") {
        const bots = R.seats.filter(x => x.bot), gone = req.bot ? bots.find(x => x.id === String(req.bot)) : bots[bots.length - 1];
        if (!gone) return refuse("no_such_bot", "뺄 컴퓨터 자리가 없습니다.");
        removeSeat(R, gone);
        return {ok: true, seat: gone.id};
      }
      if (R.seats.length >= MAX) {
        const off = R.seats.filter(x => !x.on).sort((a, b) => a.offAt - b.offAt)[0];
        if (!off) return refuse("room_full", `방이 가득 찼습니다 (${MAX}명).`, {max: MAX});
        removeSeat(R, off);
      }
      const taken = R.seats.map(x => x.name);
      let name = "";
      if (BOT.name) name = String(R.guard("컴퓨터 자리의 이름", () => BOT.name(R.api, ++R.bots, [...taken])) ?? "").trim().slice(0, 12); else R.bots++;
      for (let k = R.bots; !name || taken.includes(name); k++) name = `컴퓨터 ${k}`;      // the game gave none (or one that is taken)
      const made = addSeat(R, name, false, true);
      R.bump();
      return {ok: true, seat: made.id, name};
    }
    if (op === "reopen") {                                // after the end: back to the waiting room, same seats and keys
      if (R.status !== "over") return refuse("not_over", "판이 끝난 뒤에만 방을 다시 열 수 있습니다.");
      const host = R.seats.find(x => x.host);
      const say = rules.reopen ? R.guard(`자리 ${seat.id}의 다시 열기`, () => rules.reopen(R.api, seat.id)) : (seat.host || !host || !host.on);
      if (say === false || (say && say.ok === false)) return refuse("cannot_reopen", String((say && say.error) || "방을 만든 사람만 방을 다시 열 수 있습니다."));
      if (host && !host.on && host !== seat) { host.host = false; seat.host = true; }      // the maker's screen is away: the one who opens it makes the start
      if (R.status === "over") R.api.reopen();            // (the game's own hook may already have done it)
      return {ok: true};
    }
    if (op === "start") {
      if (!seat.host) { log(`받지 않음: start — 방 ${R.code}, 방을 만든 자리가 아님 (${seat.id})`); return refuse("not_host", "방을 만든 사람만 시작할 수 있습니다."); }
      if (R.status !== "lobby") return refuse("already_started", "이미 시작했습니다.");
      const here = R.seats.filter(x => x.on).length;      // seats whose screens are away take no part: they are given up at the start
      if (here < MIN) return refuse("too_few", `${MIN}명부터 시작할 수 있습니다 (지금 ${here}명).`, {min: MIN, now: here});
      for (const x of R.seats.filter(x => !x.on)) removeSeat(R, x);
      R.status = "play";
      R.ai = {asked: 0, sent: 0, answered: 0, blocked: 0, failed: 0, seconds: 0};      // the AI count of this board starts here
      if (O.aiLog) O.aiLog({board: "start", session: R.session()});
      for (const x of R.seats) R.engine.actors.add(x.id, x.bot ? {kind: "bot", policy: R.policy} : {kind: "human"});
      R.guard("판 시작", () => rules.start && rules.start(R.api));
      R.bump();
      return {ok: true};
    }
    if (R.status === "lobby") return refuse("not_playing", "아직 판을 시작하지 않았습니다.");
    if (R.status !== "play" && op === "intent") return refuse("game_over", "판이 끝났습니다.");
    if (op === "intent") {
      const p = R.phase;
      if (!p) return refuse("no_phase", "지금은 고를 때가 아닙니다.");
      const intent = req.intent === undefined ? null : req.intent;
      if (p.check && p.ids.includes(seat.id) && p.ph.waiting().includes(seat.id)) {
        const no = R.guard(`자리 ${seat.id}의 뜻 살피기`, () => p.check(seat.id, clone(intent)));
        if (no) return refuse("phase_refused", String(typeof no === "object" ? no.error || "받지 않음" : no));
      }
      const r = R.input.submit(p.ph, seat.id, intent);
      if (!r.ok) { const code = (PHASE_CODES.find(([word]) => String(r.reason).includes(word)) || [, "phase_refused"])[1]; return refuse(code, PHASE_TEXTS[code] || "지금은 받을 수 없습니다."); }
      R.settle(p);
      return {ok: true};
    }
    if (op === "act") {
      if (!rules.act) return refuse("no_act", "이 게임은 이 일을 받지 않습니다.");
      const r = R.guard(`자리 ${seat.id}의 행동`, () => rules.act(R.api, seat.id, clone(req.action ?? null)));
      R.bump();
      return r && r.ok === false ? refuse("act_refused", String(r.error || r.reason || "받지 않음")) : {ok: true};
    }
    if (op === "chat") {
      const no = R.chat(seat, typeof req.text === "string" ? req.text : "", req.to === "all" || req.to === undefined ? "all" : R.targets(req.to));
      if (no) return refuse(no[0], no[1], no[0] === "chat_long" ? {max: 500} : {});
      R.bump();
      return {ok: true};
    }
    return refuse("bad_op", "없는 일");
  }

  function away(R, seat) {
    if (!seat.on) return;
    seat.on = false; seat.offAt = Date.now();
    if (rules && rules.presence && R.status === "play") R.guard("자리 끊김", () => rules.presence(R.api, seat.id, false));
    R.bump();
  }
  const sweep = setInterval(() => {
    const t = Date.now();
    for (const R of [...rooms.values()]) {
      for (const seat of [...R.seats]) {
        if (seat.bot) continue;
        if (seat.on && !seat.pending && t - seat.seen > O.away * 1000) away(R, seat);
        if (R.status === "lobby" && !seat.on && t - seat.offAt > O.lobbyGrace * 1000) removeSeat(R, seat);     // gone from the waiting room for good
      }
      if (!rooms.has(R.code)) continue;
      // a started room with no person's screen: its AI is already silent (askAI); after a while the room is closed
      if (R.seats.some(s => !s.bot && s.on)) R.emptyAt = 0;
      else if (!R.emptyAt) R.emptyAt = t;
      else if (R.status !== "lobby" && t - R.emptyAt > O.emptyClose * 1000) { log(`방 ${R.code} 닫음 — 사람의 화면이 하나도 없음`); dropRoom(R); continue; }
      if (t - R.touched > O.idle * 1000) { log(`방 ${R.code} 닫음 — ${Math.round(O.idle / 60)}분 동안 아무도 오지 않음`); dropRoom(R); }
    }
  }, 1000);
  if (sweep.unref) sweep.unref();

  return {handle, rooms, min: MIN, max: MAX, stop() { clearInterval(sweep); for (const R of [...rooms.values()]) dropRoom(R); }};
}

module.exports = {createHost, loadEngine};

if (require.main === module) {
  const args = process.argv.slice(2), proj = args[0];
  const opt = (name, fallback) => { const i = args.indexOf("--" + name); return i > 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : fallback; };
  const say = o => process.stdout.write(JSON.stringify(o) + "\n");
  const log = msg => say({log: msg});
  let rules = null, name = "게임";
  const errors = [];
  try {
    const W = loadEngine(path.join(__dirname, "..", "runtime"));
    try { name = JSON.parse(fs.readFileSync(path.join(proj, "project.json"), "utf8").replace(/^﻿/, "")).name || name; } catch {}
    const sdir = path.join(proj, "scripts");
    if (fs.existsSync(sdir)) for (const f of fs.readdirSync(sdir).filter(f => f.endsWith(".js")).sort()) {
      try { new Function("WebEngine", fs.readFileSync(path.join(sdir, f), "utf8"))(W); }
      catch (e) { errors.push(`scripts/${f}: 불러오지 못함 — ${e.message}`); }
    }
    rules = W.roomRules();
    if (!rules) errors.push("게임 스크립트에 WebEngine.room({...})이 없음");
    const data = p => { try { return JSON.parse(fs.readFileSync(path.join(proj, "assets", String(p)), "utf8").replace(/^﻿/, "")); } catch { return null; } };
    const word = (name, fallback) => { const i = args.indexOf("--" + name); return i > 0 && args[i + 1] !== undefined ? String(args[i + 1]) : fallback; };
    const asks = new Map();
    let askId = 0;
    const aiSend = req => new Promise(ok => {                 // the play server asks (subscription CLI) and answers on stdin
      const id = ++askId;
      const t = setTimeout(() => { asks.delete(id); ok({ok: false, late: true, error: "답이 오지 않음"}); }, ((req.timeout || 600) + 15) * 1000);
      asks.set(id, res => { clearTimeout(t); ok(res); });
      say({ai: {id, ...req}});
    });
    const limitCalls = opt("limitcalls", null);
    const host = createHost({WebEngine: W, rules, data, log, opts: {name, timeScale: opt("timescale", 1), seed: opt("seed", null), hold: opt("hold", 10), away: opt("away", 4), lobbyGrace: opt("lobbygrace", 20),
      emptyClose: opt("emptyclose", 300), aiMode: ["on", "fake", "fail"].includes(word("ai", "off")) ? word("ai", "off") : "off", aiSend, aiLog: row => say({aiLog: row}),
      limitCalls: Number.isFinite(limitCalls) && limitCalls >= 0 ? limitCalls : null, record: word("records", "0") === "1" ? line => { say({record: line}); return true; } : null}});
    process.on("unhandledRejection", err => log(`규칙의 기다리던 일에서 오류 — ${err && err.message || err}`));      // a game's broken async code must not end every room
    say({ready: true, rules: !!rules, errors, game: name, min: host.min, max: host.max});
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => {
      buf += chunk;
      for (let at; (at = buf.indexOf("\n")) >= 0;) {
        const line = buf.slice(0, at); buf = buf.slice(at + 1);
        if (!line.trim()) continue;
        let req;
        try { req = JSON.parse(line); } catch { continue; }
        if (req.aiRes !== undefined) { const done = asks.get(req.aiRes); asks.delete(req.aiRes); if (done) done(req.res && typeof req.res === "object" ? req.res : {ok: false, error: "답이 없음"}); continue; }
        host.handle(req.req || {}).then(res => say({id: req.id, res}), err => { log(`요청 처리 오류 (${(req.req || {}).op}): ${err.message}`); say({id: req.id, res: {ok: false, error: "서버 오류"}}); });
      }
    });
    process.stdin.on("end", () => process.exit(0));          // the play server went away: so do the rooms
  } catch (e) {
    say({ready: false, rules: false, errors: [...errors, "방 주인 프로그램 오류: " + e.message]});
    process.exit(1);
  }
}
