// input module: keyboard state and the pointer. engine.input.down("ArrowLeft"), .pressed("Space") (this frame only),
// .pointer {x, y} in stage coordinates. Also emits engine.bus "key" (name) for event-style code.
WebEngine.module("input", engine => {
  const held = new Set(), fresh = new Set(), pointer = {x: 0, y: 0, down: false};
  const api = {
    down: k => held.has(k), pressed: k => fresh.has(k), pointer,
    // Tests and replays can feed input without a browser.
    feed(type, k) { if (type === "down") { if (!held.has(k)) fresh.add(k); held.add(k); engine.bus.emit("key", k); } else held.delete(k); }
  };
  engine.bus.on("tick", () => fresh.clear());
  if (typeof window !== "undefined" && engine.opts.stage) {
    window.addEventListener("keydown", e => { if (e.target && e.target.tagName === "INPUT") return; api.feed("down", e.code); });
    window.addEventListener("keyup", e => api.feed("up", e.code));
    engine.opts.stage.addEventListener("pointermove", e => {
      const st = engine.render && engine.render.stage(); if (!st) return;
      const r = st.getBoundingClientRect(), s = r.width / engine.render.size.w || 1;
      pointer.x = (e.clientX - r.left) / s; pointer.y = (e.clientY - r.top) / s;
    });
    engine.opts.stage.addEventListener("pointerdown", () => { pointer.down = true; });
    window.addEventListener("pointerup", () => { pointer.down = false; });
  }
  return api;
});
