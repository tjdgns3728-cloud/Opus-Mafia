// actors module: who takes part in a phase (engine.phase) — people ("human") and bots ("bot") — and where their intents
// may come from. A person's intent comes only through a declared input source; a bot only acts for itself, through its
// policy, which sees only its own view.
// engine.actors.add("a", {kind: "human"}) · .add("b", {kind: "bot", policy: (view, ctx) => intent})
// engine.actors.input("screen") → handle; handle.submit(phase, "a", intent). Declared sources: "screen" always,
//   "test-autoplayer" only when the page was opened with the address option auto (?auto=1). Every intent keeps its source.
//   "room" only on the engine a room host runs for one shared room (see room.js, docs/ROOM.md).
// const ph = engine.actors.begin("밤 1") (every actor, or a list) · engine.actors.decide(ph, id => view, {draws})
//   asks each waiting bot: policy(view of that bot only, {id, phase, pick(table)}).
// engine.actors.weightedPick(table, u) → {pick, table, total, u}: table {value: weight} or [[value, weight], …]; each value
//   owns its own interval of the running total; a weight ≤ 0 (or not a number) is never picked. ctx.pick records every
//   table it drew from in engine.actors.picks.
WebEngine.module("actors", engine => {
  const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  const KINDS = ["human", "bot"];
  const list = new Map();
  const handles = new WeakSet(), botPass = new WeakMap();
  const picks = [];
  let inPolicy = null;                     // the bot whose policy is running (no person's input can be made then)

  const flagged = () => {
    const v = engine.opts.auto ?? (engine.opts.params || {}).auto;
    return !!v && !["0", "false", "아니오"].includes(String(v).toLowerCase());
  };
  // "room": an intent that came from a seat of a shared room (server/room_host.js checked the seat key first). Declared
  // only on the engine a room host made (opts.room) — a page can never open it for itself.
  const sources = () => ["screen", ...(engine.opts.room === true ? ["room"] : []), ...(flagged() ? ["test-autoplayer"] : [])];

  function add(id, {kind = "bot", policy = null} = {}) {
    if (!KINDS.includes(kind)) throw new Error(`행위자 종류는 ${KINDS.join("·")} 중 하나 — '${kind}'`);
    if (kind === "bot" && policy !== null && typeof policy !== "function") throw new Error(`봇 '${id}'의 정책은 함수여야 함`);
    list.set(id, {id, kind, policy});
    return {id, kind};
  }

  function input(source) {
    if (inPolicy !== null) throw new Error(`봇 정책('${inPolicy}') 안에서는 사람의 입력원을 만들 수 없음`);
    if (!sources().includes(source))
      throw new Error(source === "test-autoplayer" ? "시험 자동 플레이어는 주소 옵션 auto가 있을 때만 쓸 수 있음" : `선언되지 않은 입력원 '${source}' (있는 것: ${sources().join("·")})`);
    const h = Object.freeze({source, submit: (phase, actor, intent) => phase.submit(actor, intent, h)});
    handles.add(h);
    return h;
  }

  // The phase's gate: why an intent is refused, or null to take it.
  function gate(actor, via) {
    const a = list.get(actor);
    if (!a) return "등록되지 않은 행위자";
    if (a.kind === "human") {
      if (inPolicy !== null) return `봇 정책('${inPolicy}')이 사람의 의도를 넣으려 함`;
      if (!handles.has(via)) return "선언된 입력원으로 들어오지 않음";
      if (!sources().includes(via.source)) return `선언되지 않은 입력원 '${via.source}'`;
      return null;
    }
    return botPass.get(via) === actor ? null : "봇의 의도는 그 봇의 정책으로만";
  }

  function begin(name, ids) {
    return engine.phase.begin(name, ids || [...list.keys()], {gate});
  }

  function weightedPick(table, u) {
    const rows = (Array.isArray(table) ? table : Object.entries(table || {})).map(([value, w]) => [value, Number(w)]);
    const total = rows.reduce((s, [, w]) => s + (Number.isFinite(w) && w > 0 ? w : 0), 0);
    let pick = null;
    if (total > 0) {
      const at = u * total;
      let low = 0;
      for (const [value, w] of rows) {
        if (!(Number.isFinite(w) && w > 0)) continue;
        const high = low + w;
        if (at >= low && at < high) { pick = value; break; }
        low = high;
      }
      if (pick === null) pick = rows.filter(([, w]) => Number.isFinite(w) && w > 0).pop()[0];   // u rounding at the very top
    }
    return {pick, table: rows, total, u};
  }

  function decide(phase, viewFor, {draws = null} = {}) {
    const d = draws || engine.phase.draws();
    for (const id of phase.waiting()) {
      const a = list.get(id);
      if (!a || a.kind !== "bot" || !a.policy) continue;
      const pass = Object.freeze({source: "bot"});
      botPass.set(pass, id);
      const ctx = Object.freeze({id, phase: phase.name, pick: table => {
        const r = weightedPick(table, d.draw());
        picks.push({actor: id, phase: phase.name, ...r});
        return r.pick;
      }});
      let intent;
      inPolicy = id;
      try { intent = a.policy(clone(viewFor(id)), ctx); }
      catch (e) { engine.error(`행위자 ${id}`, "봇 정책 실행", e); intent = undefined; }
      finally { inPolicy = null; }
      if (intent !== undefined) phase.submit(id, intent, pass);
    }
    return phase;
  }

  return {add, get: id => list.has(id) ? {id, kind: list.get(id).kind} : null, list: () => [...list.values()].map(a => ({id: a.id, kind: a.kind})),
          remove: id => list.delete(id), clear: () => list.clear(), sources, input, begin, decide, weightedPick, picks};
});
