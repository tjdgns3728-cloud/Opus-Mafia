// AI 웹게임엔진 — core module.
// Scenes hold a tree of nodes; nodes hold components (built-in or scripts). Lifecycle: start → update(dt) → destroy.
// Signals: any node/component can emit; others listen. Every error is caught and reported with where it happened
// (scene / node path / component), so a broken script never stops the engine and the log says where to look.
(function (root) {
  "use strict";

  // ---------------- signals ----------------
  class Emitter {
    constructor() { this._on = {}; }
    on(name, fn, owner) { (this._on[name] = this._on[name] || []).push({fn, owner}); return () => this.off(name, fn); }
    once(name, fn, owner) { const off = this.on(name, (...a) => { off(); fn(...a); }, owner); return off; }
    off(name, fn) { this._on[name] = (this._on[name] || []).filter(h => h.fn !== fn); }
    offOwner(owner) { for (const k of Object.keys(this._on)) this._on[k] = this._on[k].filter(h => h.owner !== owner); }
    emit(name, ...args) {
      for (const h of [...(this._on[name] || [])]) {
        try {
          const r = h.fn(...args);
          if (r && typeof r.catch === "function") r.catch(e => report(this, `신호 '${name}' 처리 중 (기다리는 중)`, e, h.owner));
        } catch (e) { report(this, `신호 '${name}' 처리 중`, e, h.owner); }
      }
    }
  }
  function report(where, what, err, owner) {
    const eng = engineOf(owner) || engineOf(where);
    const place = owner instanceof Component ? owner.where() : where instanceof Node ? where.path() : where instanceof Scene ? `씬 ${where.name}` : "엔진";
    if (eng) eng.error(place, what, err); else throw err;
  }
  const engineOf = x => x && (x.engine || (x.node && x.node.engine) || (x.scene && x.scene.engine)) || null;

  // ---------------- components ----------------
  const REGISTRY = {};      // type → {cls, kind: "builtin" | "script", module}
  class Component {
    // props: what the inspector shows. A class may give `static props = {name: {type, default, help}}`.
    constructor(node, props) {
      this.node = node; this.enabled = true; this._started = false;
      const defs = this.constructor.props || {};
      this.props = {};
      for (const [k, d] of Object.entries(defs)) this.props[k] = clone(d.default);
      Object.assign(this.props, clone(props || {}));
    }
    get engine() { return this.node.engine; }
    get scene() { return this.node.scene; }
    get type() { return this.constructor.type; }
    where() { return `${this.node.path()} › ${this.type}`; }
    emit(name, ...a) { this.node.emit(name, ...a); }
    start() {} update(dt) {} destroy() {}
  }
  function define(type, cls, kind = "builtin", module = "core") {
    if (!(cls.prototype instanceof Component)) throw new Error(`컴포넌트 '${type}'는 Component를 이어받아야 함`);
    cls.type = type;
    REGISTRY[type] = {cls, kind, module};
    return cls;
  }

  // ---------------- nodes ----------------
  let nextId = 1;
  class Node extends Emitter {
    constructor(data, scene, parent) {
      super();
      this.scene = scene; this.parent = parent || null;
      this.id = data.id || `n${nextId++}`; this.name = data.name || this.id;
      this.active = data.active !== false;
      this.tags = [...(data.tags || [])];
      this.style = String(data.style || "").trim();          // style class names (project style sheets), space separated
      this.components = []; this.children = [];
      for (const c of data.components || []) this.addComponent(c.type, c.props, true);
      for (const ch of data.children || []) this.children.push(new Node(ch, scene, this));
    }
    get engine() { return this.scene.engine; }
    path() { return (this.parent ? this.parent.path() + "/" : `${this.scene.name}:`) + this.name; }
    addComponent(type, props, loading) {
      const reg = REGISTRY[type];
      if (!reg) { this.engine.error(this.path(), `없는 컴포넌트 '${type}'`, new Error("등록되지 않은 컴포넌트")); return null; }
      let c;
      try { c = new reg.cls(this, props); } catch (e) { this.engine.error(this.path(), `컴포넌트 '${type}' 만들기`, e); return null; }
      this.components.push(c);
      if (!loading && this.scene.running && this.isActive()) this.engine._startOne(c);
      return c;
    }
    get(type) { return this.components.find(c => c.type === type) || null; }
    getAll(type) { return this.components.filter(c => c.type === type); }
    removeComponent(c) { this.engine._destroyOne(c); this.components = this.components.filter(x => x !== c); }
    isActive() { return this.active && (!this.parent || this.parent.isActive()); }
    setActive(v) { this.active = !!v; if (v && this.scene.running) this.walk(n => n.components.forEach(c => this.engine._startOne(c))); }
    add(data) {
      const n = new Node(data, this.scene, this);
      this.children.push(n);
      if (this.engine.render) n.walk(x => x.style && this.engine.render.el(x));   // styled nodes show even without components
      if (this.scene.running && n.isActive()) n.walk(x => x.components.forEach(c => this.engine._startOne(c)));
      return n;
    }
    // Style classes: names from the project's style sheets (assets/**/*.css). The render module shows them.
    hasClass(c) { return this.style.split(/\s+/).includes(c); }
    addClass(...cs) { const s = new Set(this.style.split(/\s+/).filter(Boolean)); cs.forEach(c => s.add(c)); return this._setStyle([...s].join(" ")); }
    removeClass(...cs) { return this._setStyle(this.style.split(/\s+/).filter(c => c && !cs.includes(c)).join(" ")); }
    toggleClass(c, on = !this.hasClass(c)) { return on ? this.addClass(c) : this.removeClass(c); }
    _setStyle(s) { this.style = s; if (this.engine.render) this.engine.render.restyle(this); return this; }
    // A CSS variable on this node (style sheets read it: width: var(--w)). For values code decides, like a bar's length.
    cssVar(name, value) { (this._vars = this._vars || {})[name] = String(value); if (this.engine.render) this.engine.render.restyle(this); return this; }
    walk(fn) { fn(this); for (const ch of [...this.children]) ch.walk(fn); }
    find(path) {   // "child/grandchild" by names
      let cur = this;
      for (const part of String(path).split("/").filter(Boolean)) { cur = cur.children.find(c => c.name === part); if (!cur) return null; }
      return cur;
    }
    destroy() {
      this.walk(n => { n.components.forEach(c => this.engine._destroyOne(c)); n._on = {}; });
      if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this);
      this.scene._forget(this);
    }
    toJSON() {
      return {id: this.id, name: this.name, ...(this.active ? {} : {active: false}), ...(this.tags.length ? {tags: this.tags} : {}), ...(this.style ? {style: this.style} : {}),
              components: this.components.map(c => ({type: c.type, props: clone(c.props)})), children: this.children.map(c => c.toJSON())};
    }
  }

  // ---------------- scenes ----------------
  class Scene extends Emitter {
    constructor(data, engine) {
      super();
      this.engine = engine; this.name = data.name || "scene"; this.running = false;
      this.root = new Node({id: "root", name: "root", children: data.nodes || []}, this, null);
    }
    find(path) { return this.root.find(path); }
    byId(id) { let hit = null; this.root.walk(n => { if (n.id === id) hit = n; }); return hit; }
    byTag(tag) { const out = []; this.root.walk(n => { if (n.tags.includes(tag)) out.push(n); }); return out; }
    all(type) { const out = []; this.root.walk(n => n.components.forEach(c => { if (c.type === type) out.push(c); })); return out; }
    instantiate(data, parent) { return (parent || this.root).add(clone(data)); }
    _forget() {}
    toJSON() { return {name: this.name, nodes: this.root.children.map(c => c.toJSON())}; }
  }

  // ---------------- engine ----------------
  function rng(seed) {   // mulberry32: same seed, same numbers
    let a = seed >>> 0;
    return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  // Keyed draw: a number in [0, 1) from (seed, key) alone — the same key gives the same number whatever was drawn before
  // or in which order keys are asked. The key (FNV-1a hash) is mixed into the seed and the same mulberry32 is started there.
  function keyed(seed, key) {
    if (typeof key !== "string" || !key) throw new Error("열쇠 뽑기의 열쇠는 비어 있지 않은 글이어야 함");
    let h = 0x811C9DC5;
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
    return rng((seed >>> 0) ^ Math.imul(h >>> 0, 0x9E3779B1))();
  }
  const MODULES = {};      // name → install(engine): engine modules add their API here
  class Engine {
    constructor(opts = {}) {
      this.opts = opts; this.time = 0; this.frame = 0;
      // Time scale: game time runs this many times faster than the clock (?timescale=50 for test players and screen
      // tests — every timer, wait and typing goes with it, so a game needs no special fast path). 1 = normal.
      this.timeScale = Math.min(500, Math.max(0.05, Number(opts.timeScale ?? (opts.params || {}).timescale) || 1));
      this.seed = opts.seed ?? Date.now();
      this.random = rng(this.seed);
      this.random.keyed = key => keyed(this.seed, key);    // engine.random.keyed("밤1:a") — see keyed()
      this.bus = new Emitter(); this.bus.engine = this;
      this.scenes = []; this.errors = []; this.logs = [];
      this.modules = {};
      for (const [name, install] of Object.entries(MODULES)) if (!opts.modules || opts.modules.includes(name)) this.modules[name] = install(this) || {};
      Object.assign(this, this.modules);   // engine.render, engine.audio, … for scripts
    }
    get scene() { return this.scenes[this.scenes.length - 1] || null; }
    // Code that waits (async functions) can fail later: those errors are reported with the same place.
    watch(result, where, what) { if (result && typeof result.catch === "function") result.catch(e => this.error(where, what + " (기다리는 중)", e)); return result; }
    log(where, ...msg) { this.logs.push({frame: this.frame, where, msg: msg.join(" ")}); this.bus.emit("log", where, msg.join(" ")); }
    error(where, what, err) {
      const e = {frame: this.frame, where, what, message: err && err.message ? err.message : String(err), stack: err && err.stack ? String(err.stack).split("\n").slice(0, 4).join("\n") : ""};
      this.errors.push(e);
      this.bus.emit("error", e);
    }
    // Scene changes: load replaces the scene stack; push lays a scene on top (popup); pop removes the top one.
    load(data) { while (this.scenes.length) this.pop(); return this.push(data); }
    push(data) {
      const s = new Scene(clone(data), this);
      this.scenes.push(s);
      s.running = true;
      if (this.render) s.root.walk(n => n.style && this.render.el(n));       // styled nodes first, in tree order
      s.root.walk(n => { if (n.isActive()) n.components.forEach(c => this._startOne(c)); });
      this.bus.emit("scene", s.name);
      return s;
    }
    // Prefabs: saved groups of objects (opts.prefabs = {name: node data}), made again and again.
    spawn(name, parent, changes) {
      const d = this.opts.prefabs && this.opts.prefabs[name];
      if (!d) { this.error("엔진", `없는 프리팹 '${name}'`, new Error("프리팹 없음")); return null; }
      const data = clone(d);
      (function fresh(n) { delete n.id; (n.children || []).forEach(fresh); })(data);   // every copy gets its own ids
      if (changes) Object.assign(data, changes);
      const host = parent || (this.scene && this.scene.root);
      return host ? host.add(data) : null;
    }
    // By name, from the project's scenes (opts.scenes = {name: data}); push = lay it over the current one.
    change(name, push = false) {
      const d = this.opts.scenes && this.opts.scenes[name];
      if (!d) { this.error("엔진", `없는 씬 '${name}'`, new Error("씬 없음")); return null; }
      return push ? this.push(d) : this.load(d);
    }
    pop() {
      const s = this.scenes.pop();
      if (!s) return;
      s.root.walk(n => n.components.forEach(c => this._destroyOne(c)));
      this.bus.emit("unload", s);          // modules clean up what belonged to this scene (e.g. its elements)
      s.running = false;
      this.bus.offOwner(s);
    }
    _startOne(c) {
      if (c._started || !c.enabled) return;
      if (this.opts.edit && REGISTRY[c.type] && REGISTRY[c.type].kind === "script") return;   // edit mode: game code does not run
      c._started = true;
      try { this.watch(c.start(), c.where(), "start()"); } catch (e) { this.error(c.where(), "start()", e); }
    }
    _destroyOne(c) {
      if (!c._started) return;
      c._started = false;
      try { c.destroy(); } catch (e) { this.error(c.where(), "destroy()", e); }
      this.bus.offOwner(c);
    }
    // One tick. Tests and servers call step() directly; the browser loop calls it every frame.
    step(dt = 1 / 60) {
      this.time += dt; this.frame += 1;
      for (const s of [...this.scenes]) {
        if (!s.running) continue;
        s.root.walk(n => {
          if (!n.isActive()) return;
          for (const c of n.components) {
            if (!c.enabled) continue;
            if (!c._started) this._startOne(c);
            try { c.update(dt); } catch (e) { this.error(c.where(), "update()", e); c.enabled = false; }   // a broken update stops only itself
          }
        });
      }
      this.bus.emit("tick", dt);
    }
    // The browser loop: one step per drawn frame. Browsers stop drawing frames for hidden windows, so a backup
    // clock keeps game time going (a host in a background tab must keep judging; timers must still fire).
    run() {
      if (this._running) return;
      this._running = true;
      const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
      let last = now();
      const tick = (t, cap) => {
        const dt = Math.min(cap, (t - last) / 1000) * this.timeScale; last = t;
        // a fast clock is stepped in pieces of at most 1/10 s of game time, so per-frame code (typing, motion) stays smooth
        for (let left = dt; left > 1e-9; left -= 0.1) this.step(Math.min(0.1, left));
      };
      if (typeof requestAnimationFrame === "function") {
        const loop = t => { if (!this._running) return; tick(now(), 0.1); this._raf = requestAnimationFrame(loop); };
        this._raf = requestAnimationFrame(loop);
      }
      this._backup = setInterval(() => { const t = now(); if (t - last > 100) tick(t, 1); }, 50);
    }
    stop() {
      this._running = false;
      if (this._raf && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this._raf);
      if (this._backup) clearInterval(this._backup);
      this._raf = this._backup = null;
    }
  }

  // Scripts: project code registers components with engine.script("Name", class extends Component {…}).
  function script(type, cls) { return define(type, cls, "script", "project"); }
  function module(name, install) { MODULES[name] = install; }
  const clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));

  // Data rules: game code says what its data files must hold beyond their schema (e.g. "three clues per conclusion").
  // WebEngine.dataRule("data/scenario.json", (data, files) => ["오류 …"]) — the path is under assets/, "*" matches any part.
  // The editor runs them before saving, the command line (tool.py rules / draft) runs them too. files(path) reads other data.
  // Data fixes: what code can repair without asking anyone (e.g. drop keys the system does not know) — run before the rules.
  // WebEngine.dataFix("data/scenario.json", (data, files) => fixedData)
  const RULES = [], FIXES = [];
  const pathRe = p => new RegExp("^" + p.split("*").map(s => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
  function dataRule(pattern, check, title = "") { RULES.push({pattern, check, title}); }
  function dataFix(pattern, fix) { FIXES.push({pattern, fix}); }
  function fixData(path, data, files = () => null) {
    for (const f of FIXES) if (pathRe(f.pattern).test(path)) { try { data = f.fix(data, files) ?? data; } catch (e) { /* a broken fix leaves the data as it was */ } }
    return data;
  }
  function checkData(path, data, files = () => null) {
    const errs = [];
    for (const r of RULES) {
      const re = pathRe(r.pattern);
      if (!re.test(path)) continue;
      try { errs.push(...(r.check(data, files) || []).map(e => `${path}${r.title ? ` (${r.title})` : ""}: ${e}`)); }
      catch (e) { errs.push(`${path}: 규칙 검사 코드 오류 — ${e.message}`); }
    }
    return errs;
  }

  root.WebEngine = {Engine, Scene, Node, Component, Emitter, define, script, module, registry: () => ({...REGISTRY}), modules: () => Object.keys(MODULES), rng, keyed,
                    dataRule, checkData, dataFix, fixData, dataRules: () => RULES.map(r => ({pattern: r.pattern, title: r.title}))};
})(typeof window !== "undefined" ? window : globalThis);
