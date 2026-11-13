// phase module: a step where every actor states one intent at the same time, then a pure function resolves them all.
// const ph = engine.phase.begin("밤 1", ["a", "b"]) · ph.submit("a", {do: "wait"}, {source}) → {ok, reason}
// ph.close() · ph.intents() → {a: {intent, source}} · ph.rejected → [{actor, reason, source}] (late or second intents)
// engine.phase.draws(seed | function | [recorded numbers]) → {draw(), record} — every draw is recorded; a recorded list
//   replays the same numbers; draws.keyed("밤1:a") is the same number for the same key in any order (recorded {key, u}).
//   engine.phase.resolve(fn, {state, intents, draws}) → {result, record}: fn({state, intents, draw, keyed}) must not
//   change its input (an error if it does), so the same state + intents + record give the same result.
// Who may submit for whom (declared input sources, bots for themselves) is engine.actors' job: begin(…, {gate}).
WebEngine.module("phase", engine => {
  const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  const snap = v => JSON.stringify(v === undefined ? null : v);

  // draw(): the next number of the stream (recorded as a number). keyed(key): the number for that key from the seed alone
  // (WebEngine.keyed), whatever was drawn before — recorded as {key, u}; a replayed record answers it by key.
  function draws(src = engine.random) {
    const record = [];
    if (Array.isArray(src)) {
      const list = src.filter(x => typeof x === "number"), byKey = new Map(src.filter(x => x && typeof x === "object").map(x => [x.key, x.u]));
      let i = 0;
      return {record, replay: true, draw() {
        if (i >= list.length) throw new Error(`난수 기록이 모자람 (${list.length}개 다 씀)`);
        record.push(list[i]); return list[i++];
      }, keyed(key) {
        if (!byKey.has(key)) throw new Error(`난수 기록에 없는 열쇠 '${key}'`);
        const u = byKey.get(key); record.push({key, u}); return u;
      }};
    }
    const seed = typeof src === "function" ? engine.seed : Number(src) || 0;
    const next = typeof src === "function" ? src : WebEngine.rng(seed);
    return {record, replay: false, draw() { const u = next(); record.push(u); return u; },
            keyed(key) { const u = WebEngine.keyed(seed, key); record.push({key, u}); return u; }};
  }

  function resolve(fn, {state = null, intents = {}, draws: d = null} = {}) {
    const input = {state: clone(state), intents: clone(intents)};
    const before = snap(input);
    const src = d || draws();
    const result = fn({state: input.state, intents: input.intents, draw: () => src.draw(), keyed: key => src.keyed(key)});
    if (result && typeof result.then === "function") throw new Error("판정 함수는 기다리지 않아야 함 (순수 함수)");
    if (snap(input) !== before) throw new Error("판정 함수가 입력(상태·의도)을 바꿈 — 결과는 새 값으로 돌려줄 것");
    return {result: clone(result), record: [...src.record]};
  }

  function begin(name, actors, {gate = null} = {}) {
    const who = new Set(actors || []);
    const got = {}, rejected = [];
    let open = true;
    const refuse = (actor, reason, source) => {
      rejected.push({actor, reason, source: source ?? null});
      engine.log("단계", `${name}: '${actor}' 의도 거부 — ${reason}`);
      return {ok: false, reason};
    };
    return {
      name, rejected,
      get open() { return open; },
      submit(actor, intent, via = {}) {
        const source = via && via.source !== undefined ? via.source : null;
        if (!open) return refuse(actor, "늦음 (단계가 닫힘)", source);
        if (!who.has(actor)) return refuse(actor, "이 단계의 행위자가 아님", source);
        if (Object.prototype.hasOwnProperty.call(got, actor)) return refuse(actor, "중복 (단계당 의도 하나)", source);
        const why = gate ? gate(actor, via) : null;
        if (why) return refuse(actor, why, source);
        got[actor] = {intent: clone(intent), source};
        return {ok: true};
      },
      close() { open = false; return this.intents(); },
      // In the phase's actor order, not arrival order: who was quicker never changes the resolution.
      intents: () => clone(Object.fromEntries([...who].filter(a => Object.prototype.hasOwnProperty.call(got, a)).map(a => [a, got[a]]))),
      waiting: () => [...who].filter(a => !Object.prototype.hasOwnProperty.call(got, a))
    };
  }

  return {begin, resolve, draws};
});
