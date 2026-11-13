// fx module: particle effects drawn on a Canvas (🎨) on the same object. Effects are made from four pieces, so a game
// keeps its own effects as data: burst (many small pieces), ring (a growing circle), flash (a bright glow), streak
// (a line drawn quickly). Times are in frames at 60 per second and speeds in pixels per frame, like most effect tools.
// Code: const fx = node.get("Particles"); fx.play([{burst: {...}}, {ring: {...}}], x, y) or fx.burst(x, y, n, o).
(function () {
  const {Component, define} = WebEngine;
  const rnd = (a, b) => a + Math.random() * (b - a), pick = l => l[Math.floor(Math.random() * l.length)];
  define("Particles", class extends Component {
    static icon = "✨"; static title = "입자 효과";
    static help = "같은 오브젝트의 그리기 판에 입자 효과를 그린다 (튀는 조각·고리·번쩍임·선). 코드: node.get(\"Particles\").play(효과 목록, x, y)";
    static props = {limit: {type: "number", default: 600, label: "입자 최대 수", help: "넘으면 오래된 것부터 지운다", unit: "개", min: 10, max: 5000}};
    start() { this.parts = []; this.strokes = []; this.node.on("draw", ctx => this.draw(ctx), this); }
    get count() { return this.parts.length + this.strokes.length; }
    // o: {n, angle, spread, speed: [a, b], life: [a, b], size: [a, b], colors: [..], gravity, drag, shape: "dot"|"splinter"|"plus", grow}
    burst(x, y, n, o = {}) {
      for (let i = 0; i < (n ?? o.n ?? 10); i++) {
        const ang = o.angle !== undefined ? o.angle + rnd(-(o.spread || 0), o.spread || 0) : rnd(0, Math.PI * 2), sp = rnd(...(o.speed || [1, 3]));
        this.parts.push({x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: rnd(...(o.life || [20, 40])), age: 0, size: rnd(...(o.size || [2, 4])),
          color: pick(o.colors || ["#fff"]), g: o.gravity || 0, drag: o.drag ?? 0.96, shape: o.shape || "dot", rot: rnd(0, 6.28), vr: rnd(-0.3, 0.3), grow: o.grow || 0});
      }
      if (this.parts.length > this.props.limit) this.parts.splice(0, this.parts.length - this.props.limit);
    }
    ring(x, y, o = {}) { this.strokes.push({kind: "ring", x, y, r: o.from ?? 4, max: o.max ?? 50, color: o.color || "#fff", width: o.width ?? 3, age: 0, life: o.life ?? 22}); }
    flash(x, y, o = {}) { this.strokes.push({kind: "flash", x, y, radius: o.radius ?? 70, inner: o.inner || "rgba(255,250,220,1)", outer: o.outer || "rgba(255,200,80,0)", age: 0, life: o.life ?? 8}); }
    // a line from (x + dx1, y + dy1) toward (x + dx2, y + dy2), drawn over the first third of its life, then fading
    streak(x, y, o = {}) { this.strokes.push({kind: "streak", x, y, from: o.from || [-40, -30], to: o.to || [40, 30], color: o.color || "#f4f1ea", width: o.width ?? 4, age: 0, life: o.life ?? 18}); }
    // An effect as data: a list of pieces, each {burst: {...}} · {ring: {...}} · {flash: {...}} · {streak: {...}}; {at: [dx, dy]} moves a piece.
    play(list, x, y) {
      for (const piece of [].concat(list || [])) {
        const [dx, dy] = piece.at || [0, 0];
        if (piece.burst) this.burst(x + dx, y + dy, piece.burst.n, piece.burst);
        if (piece.ring) this.ring(x + dx, y + dy, piece.ring);
        if (piece.flash) this.flash(x + dx, y + dy, piece.flash);
        if (piece.streak) this.streak(x + dx, y + dy, piece.streak);
      }
    }
    clear() { this.parts = []; this.strokes = []; }
    update(dt) {
      const k = Math.min(3, dt * 60);              // the effects are made in frames; keep their speed on any screen
      for (const p of this.parts) { p.age += k; p.vx *= p.drag ** k; p.vy = p.vy * p.drag ** k + p.g * k; p.x += p.vx * k; p.y += p.vy * k; p.rot += p.vr * k; p.size += p.grow * k; }
      this.parts = this.parts.filter(p => p.age < p.life);
      for (const s of this.strokes) s.age += k;
      this.strokes = this.strokes.filter(s => s.age < s.life);
    }
    draw(fx) {
      for (const p of this.parts) {
        fx.globalAlpha = Math.max(0, 1 - p.age / p.life); fx.fillStyle = p.color; fx.strokeStyle = p.color;
        if (p.shape === "splinter") { fx.save(); fx.translate(p.x, p.y); fx.rotate(p.rot); fx.fillRect(-p.size, -1.2, p.size * 2, 2.4); fx.restore(); }
        else if (p.shape === "plus") { fx.lineWidth = 2; fx.beginPath(); fx.moveTo(p.x - p.size, p.y); fx.lineTo(p.x + p.size, p.y); fx.moveTo(p.x, p.y - p.size); fx.lineTo(p.x, p.y + p.size); fx.stroke(); }
        else { fx.beginPath(); fx.arc(p.x, p.y, Math.max(0, p.size), 0, 6.28); fx.fill(); }
      }
      for (const s of this.strokes) {
        const t = s.age / s.life; fx.globalAlpha = Math.max(0, 1 - t);
        if (s.kind === "ring") { fx.strokeStyle = s.color; fx.lineWidth = s.width; fx.beginPath(); fx.arc(s.x, s.y, s.r + (s.max - s.r) * t, 0, 6.28); fx.stroke(); }
        if (s.kind === "flash") { const g = fx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius); g.addColorStop(0, s.inner); g.addColorStop(1, s.outer); fx.fillStyle = g; fx.beginPath(); fx.arc(s.x, s.y, s.radius, 0, 6.28); fx.fill(); }
        if (s.kind === "streak") {
          const L = Math.min(1, t * 3), [x1, y1] = s.from, [x2, y2] = s.to;
          fx.strokeStyle = s.color; fx.lineWidth = s.width * (1 - t) + 1; fx.beginPath(); fx.moveTo(s.x + x1, s.y + y1); fx.lineTo(s.x + x1 + (x2 - x1) * L, s.y + y1 + (y2 - y1) * L); fx.stroke();
        }
      }
      fx.globalAlpha = 1;
    }
  }, "builtin", "fx");
})();
