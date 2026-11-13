// tween module: change numbers smoothly over time (movement, fading, growing).
// engine.tween.to(node.get("Transform").props, {x: 300, opacity: 0}, 0.5, "out") → Promise when done.
// Easing: "linear", "in", "out", "inout", "bounce". Works on any object's number fields.
WebEngine.module("tween", engine => {
  const EASE = {linear: t => t, in: t => t * t, out: t => 1 - (1 - t) * (1 - t), inout: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
                bounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; }};
  let list = [];
  engine.bus.on("tick", dt => {
    for (const tw of [...list]) {
      tw.t = tw.t + dt / tw.seconds > 1 - 1e-9 ? 1 : tw.t + dt / tw.seconds;   // tiny float leftovers count as done
      const k = tw.ease(tw.t);
      for (const [key, [a, b]] of Object.entries(tw.span)) tw.target[key] = a + (b - a) * k;
      if (tw.t >= 1) { list = list.filter(x => x !== tw); tw.done(); }
    }
  });
  return {
    to(target, values, seconds = 0.3, ease = "out") {
      list = list.filter(x => x.target !== target || !Object.keys(values).some(k => k in x.span));   // a new tween on the same field replaces the old one
      return new Promise(done => {
        const span = {};
        for (const [k, v] of Object.entries(values)) span[k] = [Number(target[k]) || 0, Number(v)];
        list.push({target, span, seconds: Math.max(1e-6, seconds), t: 0, ease: EASE[ease] || EASE.out, done});
      });
    },
    stop(target) { list = list.filter(x => x.target !== target); },
    count: () => list.length
  };
});
