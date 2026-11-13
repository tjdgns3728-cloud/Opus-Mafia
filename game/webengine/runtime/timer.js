// timer module: run code later, by game time (it stops when the game stops, and tests can step through it).
// engine.timer.after(2, () => …) · .every(1, () => …) → returns a cancel function · await engine.timer.wait(0.5)
// Timers made by a component are cancelled when that component goes away (pass it as the owner).
WebEngine.module("timer", engine => {
  let list = [];
  engine.bus.on("tick", dt => {
    for (const t of [...list]) {
      if (t.owner && t.owner._started === false && t.owner.node) { list = list.filter(x => x !== t); continue; }
      t.left -= dt;
      if (t.left > 1e-9) continue;          // adding 1/60 thirty times is not exactly 0.5: tiny leftovers count as done
      const where = t.owner && t.owner.where ? t.owner.where() : "timer";
      try { engine.watch(t.fn(), where, "타이머 실행"); } catch (e) { engine.error(where, "타이머 실행", e); }
      if (t.repeat) t.left += t.repeat; else list = list.filter(x => x !== t);
    }
  });
  const add = (seconds, fn, repeat, owner) => { const t = {left: seconds, fn, repeat, owner}; list.push(t); return () => { list = list.filter(x => x !== t); }; };
  return {
    after: (seconds, fn, owner) => add(seconds, fn, 0, owner),
    every: (seconds, fn, owner) => add(seconds, fn, Math.max(1e-6, seconds), owner),
    wait: seconds => new Promise(ok => add(seconds, ok, 0)),
    count: () => list.length
  };
});
