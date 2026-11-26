// room module: several people, each in their own browser, play one board together (docs/ROOM.md).
// The board's state lives on the play server (server/play.py → server/room_host.js). A screen only ever receives what
// its own seat may see, and only ever sends "what this seat wants" — never a seat name, a role or a state.
//
// Rules side (runs on the server, in the game's scripts):   WebEngine.room({min, max, start, view, chat, act, presence})
//   start(room)                 the maker pressed start: deal, then open the first phase
//   view(room, seatId) → data   all this seat may see of the board (sent to that seat's screen only)
//   chat(room, seatId, {text, to}) → "all" | [seatId, …] | {to, tag} | null   who receives the line (null = not sent)
//   act(room, seatId, action)   something a seat does right away, outside a phase (optional)
//   presence(room, seatId, on)  a seat's screen went away or came back (optional)
//   watch(room) → data          the whole board for those who watch a room of computer seats only (optional; needs bot)
//   room: code · seed · state (the game's own object) · engine (phase · actors · knowledge · random) · seats() · seat(id)
//         phase(name, {seats, seconds, done(intents, info), showWaiting, check}) · current · closePhase()
//         tell(to, data) · end(result) · reopen() · refresh() · random() · round
//   texts: {code: "글"} the game's own words for refusals · reopen(room, seatId) → false to refuse (default: the maker)
//   bot: {name(room, n, taken) → "이름", decide(view, ctx) → intent, delay} seats the computer plays (decide gets that
//        seat's own view only) · room.say(botSeat, text, to) · room.after(seconds, fn) · room.record(bundle)
//   room.ai — engine.ai's tools (propose · narrate · speakAs · check · fake) asked by the rules · room.ai.mode · room.ai.stats
//
// Screen side (runs in each browser):   engine.room
//   await create(name, {watch}?) · await join(code, name, {watch}?) · await resume() → {ok, room, seat} or {ok: false, error, gone}
//   (watch: a room where only computer seats play and people watch — rules.watch(room) gives their view; now.watching)
//   await start() · await submit(intent) · await act(action) · await chat(text, to?) · await reopen() · leave()
//   await addBot() · await removeBot(seatId?) — the maker, in the waiting room
//   now → the newest news {room, status, seats, me, host, phase, view, result} · left() → seconds left in the phase · events
//   bus signals: "room" (news) · "room:event" (event, old) · "room:gone" (reason, code) · "room:offline" (true / false)
//                · "room:reopened" (round) — the ended room is a waiting room again
//   every refusal is {ok: false, code, error}: code is a fixed name, error a text the game may replace (rules.texts)
// The seat key stays in this browser (localStorage, under the room code and seat); the address keeps only ?room=&seat=,
// so the same address in the same browser comes back to the same seat, and the address alone gives nobody a seat.
(function () {
  let RULES = null;
  WebEngine.room = def => {
    if (!def || typeof def !== "object" || typeof def.view !== "function") throw new Error("WebEngine.room: 자리의 보기 함수 view(room, seat)가 있어야 함");
    RULES = def;
    return def;
  };
  WebEngine.roomRules = () => RULES;

  WebEngine.module("room", engine => {
    const P = engine.opts.params || {};
    const base = engine.opts.roomBase || "/room/";
    const clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const memory = {};
    const store = (() => {
      try { if (typeof localStorage !== "undefined") { localStorage.setItem("__we", "1"); localStorage.removeItem("__we"); return localStorage; } } catch {}
      return {getItem: k => memory[k] ?? null, setItem: (k, v) => { memory[k] = String(v); }, removeItem: k => { delete memory[k]; }};
    })();
    const slot = (code, seat) => `webengine:room:${code}:${seat}`;
    const me = {code: "", seat: "", key: ""};
    let now = null, n = 0, e = 0, got = 0, run = 0, offline = false, first = true;
    const events = [];
    // How news comes. A browser keeps only a few requests open to one server (six), shared by all its windows — so at
    // most LONG windows of one browser keep a request open and wait for news (no delay, no timers); the others ask
    // again every EVERY ms. A window knows its kind by taking one of LONG locks (Web Locks; freed when it closes).
    const LONG = 3, EVERY = 300;
    let patient = false, wake = null;
    const claim = () => {
      if (patient || typeof navigator === "undefined" || !navigator.locks) return;
      for (let k = 1; k <= LONG; k++)
        navigator.locks.request("webengine-room-wait-" + k, {ifAvailable: true}, lock => lock && !patient ? (patient = true, new Promise(() => {})) : null).catch(() => {});
    };
    // The pause between two asks. A hidden window's own timers are slowed down by the browser (to once a minute after
    // a while); a worker's are not, so the tick comes from a worker when there is one.
    let ticker = null;
    const pause = ms => new Promise(ok => {
      wake = ok;
      if (ticker === null) {
        try { ticker = new Worker(URL.createObjectURL(new Blob(["onmessage = e => setTimeout(() => postMessage(0), e.data)"], {type: "text/javascript"}))); ticker.onmessage = () => { const w = wake; wake = null; if (w) w(); }; }
        catch { ticker = false; }
      }
      if (ticker) ticker.postMessage(ms); else setTimeout(ok, ms);
    });
    const nudge = () => { const w = wake; wake = null; if (w) w(); };

    async function post(op, body) {
      const res = await fetch(base + op, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body || {})});
      if (op !== "news") nudge();                     // after something this window did, ask for the news at once
      return res.json();
    }
    let tab = Math.random().toString(36).slice(2, 12);             // this page load (the server ignores what arrives after its goodbye)
    if (typeof window !== "undefined") window.addEventListener("pageshow", ev => { if (ev.persisted) { tab = Math.random().toString(36).slice(2, 12); nudge(); } });
    const mine = body => ({room: me.code, key: me.key, tab, ...body});
    const address = (code, seat) => {
      if (typeof location === "undefined" || typeof history === "undefined") return;
      const q = new URLSearchParams(location.search);
      if (code) { q.set("room", code); q.set("seat", seat); } else { q.delete("room"); q.delete("seat"); }
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
    };

    let round = 0;
    function take(r) {
      n = r.n; got = clock();
      if (round && r.round !== round) { events.length = 0; engine.bus.emit("room:reopened", r.round); }   // the room was opened again: a new board, an empty record
      round = r.round;
      const fresh = r.events || [];
      now = {...r};
      delete now.events;
      engine.bus.emit("room", now);
      for (const ev of fresh) { if (ev.i <= e) continue; e = ev.i; events.push(ev); engine.bus.emit("room:event", ev, first); }
      first = false;
    }
    function gone(reason, code) {
      run++; round = 0;
      if (me.code) store.removeItem(slot(me.code, me.seat));
      Object.assign(me, {code: "", seat: "", key: ""});
      now = null; address("", "");
      engine.bus.emit("room:gone", reason || "방이 없음", code || "room_gone");
    }
    async function loop(id) {
      while (id === run) {
        let r;
        const before = n, asked = clock();
        try { r = await post("news", mine({since: n, e, wait: patient})); }
        catch {
          if (id !== run) return;
          if (!offline) { offline = true; engine.bus.emit("room:offline", true); }
          await pause(1500);
          continue;
        }
        if (id !== run) return;
        if (offline) { offline = false; engine.bus.emit("room:offline", false); }
        if (r.gone) return gone(r.error, r.code);
        if (r.ok) { take(r); if (r.n === before && clock() - asked < EVERY) await pause(EVERY); }   // nothing new and the server did not wait
        else if (r.nokey) return gone(r.error, r.code);
        else await pause(1500);
      }
    }
    function enter(r) {
      Object.assign(me, {code: r.room, seat: r.seat, key: r.key});
      store.setItem(slot(me.code, me.seat), me.key);
      address(me.code, me.seat);
      n = 0; e = 0; events.length = 0; first = true; round = 0;
      claim();
      const id = ++run;
      return post("news", mine({since: -1, e: 0})).then(r0 => {
        if (r0.gone) { gone(r0.error, r0.code); return {ok: false, gone: true, code: r0.code, error: r0.error}; }
        if (!r0.ok) { run++; store.removeItem(slot(me.code, me.seat)); Object.assign(me, {code: "", seat: "", key: ""}); address("", ""); return r0; }
        take(r0);
        engine.watch(loop(id), "room", "새 소식 받기");
        return {ok: true, room: me.code, seat: me.seat};
      });
    }
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.sendBeacon)
      window.addEventListener("pagehide", () => { if (me.key) navigator.sendBeacon(base + "bye", JSON.stringify(mine())); });
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", nudge);

    return {
      get now() { return now; },
      get code() { return me.code; },
      get seat() { return me.seat; },
      events,
      // seconds left in the open phase, counted down here from the server's number (every screen shows the same)
      left() { return now && now.phase && now.phase.left != null ? Math.max(0, now.phase.left - (clock() - got) / 1000) : null; },
      async info() { return post("info", {}); },
      // {watch: true}: a watch room — only computer seats play, this screen (and any who join it the same way) watches
      async create(name, opts = {}) {
        const r = await post("create", {name: String(name ?? ""), ...(opts && opts.watch ? {watch: true} : {})});
        return r.ok ? enter(r) : r;
      },
      async join(code, name, opts = {}) {
        const r = await post("join", {room: String(code ?? "").trim().toUpperCase(), name: String(name ?? ""), ...(opts && opts.watch ? {watch: true} : {})});
        return r.ok ? enter(r) : r;
      },
      // The address says ?room=&seat= and this browser still holds that seat's key: come back to the same seat.
      async resume() {
        const code = String(P.room || "").toUpperCase(), seat = String(P.seat || "");
        if (!code || !seat) return {ok: false, error: ""};
        const key = store.getItem(slot(code, seat));
        if (!key) { address("", ""); return {ok: false, code: "no_key_here", error: "이 브라우저에는 그 자리의 열쇠가 없습니다. 방 이름으로 들어오세요.", room: code}; }
        Object.assign(me, {code, seat});
        return enter({room: code, seat, key});
      },
      start: () => post("start", mine()),
      submit: intent => post("intent", mine({intent})),
      act: action => post("act", mine({action})),
      chat: (text, to) => post("chat", mine({text: String(text ?? ""), to: to ?? "all"})),
      reopen: () => post("reopen", mine()),
      addBot: () => post("bot_add", mine()),              // the maker, in the waiting room: one more seat the computer plays
      removeBot: id => post("bot_remove", mine(id ? {bot: String(id)} : {})),   // that computer seat (or the last one)               // after the end: back to the waiting room with the same people
      leave() { run++; round = 0; if (me.key) post("leave", mine()).catch(() => {}); if (me.code) store.removeItem(slot(me.code, me.seat)); Object.assign(me, {code: "", seat: "", key: ""}); now = null; address("", ""); }
    };
  });
})();
