// state module: the game's shared values, kept across scene changes, and saving/loading them.
// engine.state.get("점수", 0) · .set("점수", 10) (bus signal "state:점수" and "state") · .add("점수", 1)
// engine.state.save("슬롯1") · .load("슬롯1") · .slots() · .remove("슬롯1"). Saved in the browser (localStorage);
// without one (tests) an in-memory store is used.
WebEngine.module("state", engine => {
  let values = {};
  const memory = {};
  const store = (() => {
    try { if (typeof localStorage !== "undefined") { localStorage.setItem("__we", "1"); localStorage.removeItem("__we"); return localStorage; } } catch {}
    return {getItem: k => memory[k] ?? null, setItem: (k, v) => { memory[k] = String(v); }, removeItem: k => { delete memory[k]; }, key: i => Object.keys(memory)[i], get length() { return Object.keys(memory).length; }};
  })();
  const prefix = () => `webengine:${(engine.opts.project && engine.opts.project.name) || "game"}:`;
  const clone = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  return {
    get: (k, fallback = null) => k in values ? clone(values[k]) : fallback,
    set(k, v) { const old = values[k]; values[k] = clone(v); engine.bus.emit("state:" + k, values[k], old); engine.bus.emit("state", k, values[k], old); },
    add(k, n = 1) { this.set(k, (Number(values[k]) || 0) + n); return values[k]; },
    all: () => clone(values),
    reset(v = {}) { values = clone(v); engine.bus.emit("state", null); },
    save(slot = "기본") { store.setItem(prefix() + slot, JSON.stringify({time: new Date().toISOString(), values})); return true; },
    load(slot = "기본") { const raw = store.getItem(prefix() + slot); if (!raw) return false; values = JSON.parse(raw).values || {}; engine.bus.emit("state", null); return true; },
    remove(slot) { store.removeItem(prefix() + slot); },
    slots() { const out = []; for (let i = 0; i < store.length; i++) { const k = store.key(i); if (k && k.startsWith(prefix())) out.push(k.slice(prefix().length)); } return out.sort(); }
  };
});
