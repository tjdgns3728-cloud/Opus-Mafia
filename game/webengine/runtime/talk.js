// talk module: parts for games played by reading and writing text — any such game can attach them.
//   Feed (이야기 칸)       feed.say({who, text, kind}) → Promise (all letters out) · click = show everything now · feed.clear()
//                         kind: "say" a named line (default with who) · "narr" narration (default without who) · "me" the
//                         player's own line · "note" a small notice. Lines come one after another, letter by letter (the
//                         Text component's reveal), and the box follows the newest line down.
//   Choices (번호 선택지)   choices.show(list) → shown items · signals on the node: "pick" {id, index, item, by} · "hover" item | null
//                         list: ["글", …] or [{id, label, desc?, disabled?}] — at most `max` (4). Number keys pick.
//                         await choices.ask(list) → the pick · await choices.confirm("할 일") → true / false ("이렇게 할까요?")
//   Gauge (막대)           gauge.set(value) (flashes when the value changes) · gauge.preview("up" | "down" | null, amount?)
//   Hotspots (그림 위 구역) zones as data [{id, label, note?, rect: [x, y, w, h] | points: [[x, y], …] (percent), disabled?}]
//                         · signals: "pick" {id, zone, by} · "hover" zone | null. A zone lights up under the pointer.
// Every part draws itself with plain defaults; with '글자 크기' 0 only the layout is set and a style sheet gives the look
// (class names: we-feed · we-line we-line-<kind> · we-who · we-text · we-choices · we-choice · we-key · we-gauge · we-zone).
// Nothing here knows a game: who speaks, what can be chosen and what a zone means all come from the game.
(function () {
  const {Component, define} = WebEngine;
  const el = c => c.engine.render ? c.engine.render.el(c.node) : null;
  const elOf = (c, node) => c.engine.render ? c.engine.render.el(node) : null;
  const changed = c => { const k = JSON.stringify(c.props); if (k === c._last) return false; c._last = k; return true; };
  const text = (t, o = {}) => ({type: "Text", props: {text: String(t ?? ""), size: 0, color: "", ...o}});
  const KINDS = ["say", "narr", "me", "note"];

  // ---------------- Feed ----------------
  define("Feed", class extends Component {
    static icon = "💬"; static title = "이야기 칸";
    static help = "이름표 붙은 말과 서술을 차례로 쌓는다. 한 글자씩 나오고, 누르면 다 보이고, 새 글을 따라 끝으로 내려간다. 코드: await node.get(\"Feed\").say({who: \"이름\", text: \"글\", kind: \"say\"}) — kind는 say(말)·narr(서술)·me(내 말)·note(알림)";
    static props = {
      speed: {type: "number", default: 40, label: "글 빠르기", help: "한 글자씩 나오는 빠르기. 0 = 바로 다 나옴", unit: "글자/초", min: 0, max: 200},
      size: {type: "number", default: 17, label: "글자 크기", help: "0 = 스타일 시트를 따름 (모양 전부)", unit: "px", min: 0},
      color: {type: "color", default: "#e8e6e1", label: "글자 색"},
      nameColor: {type: "color", default: "#9ec1ff", label: "이름표 색"},
      back: {type: "color", default: "", label: "배경색", help: "비우면 투명"},
      gap: {type: "number", default: 12, label: "줄 사이 간격", unit: "px", min: 0, max: 60},
      follow: {type: "bool", default: true, label: "새 글을 따라 내려가기", help: "끄면 읽던 자리에 머문다"},
      keep: {type: "number", default: 200, label: "남겨 둘 줄 수", help: "넘으면 가장 오래된 줄부터 지운다", unit: "줄", min: 10, max: 2000}};
    start() {
      this.lines = []; this._queue = Promise.resolve(); this._waiting = []; this._typing = null; this._gen = 0;
      const e = el(this);
      this._near = true;      // the reader is at the newest line (false once they scroll up to read: then nothing pulls them down)
      if (e) {
        e.classList.add("we-feed"); e.addEventListener("click", () => this.skip());
        e.addEventListener("scroll", () => { this._near = e.scrollHeight - e.scrollTop - e.clientHeight < 40; }, {passive: true});
      }
      this.apply();
    }
    update() { if (changed(this)) this.apply(); }
    apply() {
      const e = el(this); if (!e) return;
      const p = this.props;
      Object.assign(e.style, {overflowY: "auto", display: "flex", flexDirection: "column", gap: p.gap + "px"});
      if (p.size) Object.assign(e.style, {fontSize: p.size + "px", color: p.color || "", lineHeight: "1.6", padding: "12px 14px", boxSizing: "border-box",
        background: p.back || "", borderRadius: p.back ? "8px" : ""});
    }
    get revealing() { return !!(this._typing && this._typing.revealing); }
    // One line. Resolves with the line's node when every letter is out. Lines asked while another is typing wait their turn.
    say(line) {
      const o = typeof line === "string" ? {text: line} : {...(line || {})};
      const entry = {who: String(o.who ?? ""), text: String(o.text ?? ""), kind: KINDS.includes(o.kind) ? o.kind : (o.who ? "say" : "narr"), instant: !!o.instant};
      const gen = this._gen;
      this._waiting.push(entry);
      const done = this._queue.then(() => gen === this._gen ? this._show(entry) : null);
      this._queue = done.catch(() => null);
      return done;
    }
    // Resolves when everything asked so far is on screen.
    wait() { return this._queue; }
    async _show(entry) {
      this._waiting = this._waiting.filter(x => x !== entry);
      const p = this.props, speed = entry.instant || entry.rush ? 0 : p.speed;
      const kids = [];
      // looks go through the Text parts' own settings (a Text redraws itself from them), sizes relative to this box's
      const dim = entry.kind === "note" ? 0.86 : 1;
      if (entry.who) kids.push({name: "이름", style: "we-who", components: [text(entry.who, {bold: true, size: Math.round(p.size * 0.86), color: p.size ? p.nameColor : ""})]});
      kids.push({name: "글", style: "we-text", components: [text("", {reveal: speed, size: Math.round(p.size * dim), color: p.size ? p.color : ""})]});
      const node = this.node.add({name: "줄", style: `we-line we-line-${entry.kind}`, children: kids});
      this._dress(node, entry);
      this.lines.push({who: entry.who, text: entry.text, kind: entry.kind});
      while (this.node.children.length > p.keep) { this.node.children[0].destroy(); this.lines.shift(); }
      const t = node.find("글").get("Text");
      this._typing = t;
      if (p.follow) { this._near = true; this.toEnd(); }
      const stop = this.engine.timer ? this.engine.timer.every(0.2, () => { if (this._near && p.follow) this.toEnd(); }, this) : () => {};
      await t.set(entry.text);
      stop();
      if (this._typing === t) this._typing = null;
      if (this._near && p.follow) this.toEnd();
      this.node.emit("line", {who: entry.who, text: entry.text, kind: entry.kind}, node);
      return node;
    }
    // Layout is always set here; colours and sizes only when this part draws itself (글자 크기 > 0).
    _dress(node, entry) {
      const e = elOf(this, node); if (!e) return;
      const p = this.props, me = entry.kind === "me", note = entry.kind === "note";
      Object.assign(e.style, {position: "relative", flex: "none", alignSelf: me ? "flex-end" : note ? "center" : "stretch", maxWidth: me ? "80%" : ""});
      for (const ch of node.children) { const c = elOf(this, ch); if (c) Object.assign(c.style, {position: "relative"}); }
      if (!p.size) return;
      if (me) Object.assign(e.style, {background: "rgba(158,193,255,.16)", borderRadius: "10px", padding: "6px 12px"});
      else if (note) Object.assign(e.style, {opacity: "0.72", textAlign: "center"});
      else if (entry.kind === "say") Object.assign(e.style, {borderLeft: `3px solid ${p.nameColor || "#888"}`, paddingLeft: "10px"});
    }
    toEnd() { const e = this.node._el; if (e) e.scrollTop = e.scrollHeight; }
    // One press shows everything asked so far: the line being typed and the lines still waiting.
    skip() {
      const was = this.revealing || this._waiting.length > 0;
      for (const w of this._waiting) w.rush = true;
      if (this._typing) this._typing.skip();
      if (was) this.node.emit("skip");
      return was;
    }
    clear() {
      this._gen++; this._waiting = [];
      if (this._typing) this._typing.skip();
      this._typing = null; this.lines = [];
      [...this.node.children].forEach(c => c.destroy());
    }
  }, "builtin", "talk");

  // ---------------- Choices ----------------
  define("Choices", class extends Component {
    static icon = "🔢"; static title = "번호 선택지";
    static help = "번호가 붙은 고를 것을 보인다. 누르거나 숫자 키로 고르면 'pick' 신호({id, index, item}), 마우스를 올리거나 길게 누르면 'hover' 신호. 코드: node.get(\"Choices\").show([{id: \"a\", label: \"글\"}]) · const 고른것 = await ….ask(목록) · await ….confirm(\"할 일\")";
    static props = {
      max: {type: "number", default: 4, label: "선택지 최대 수", help: "이보다 많이 주면 앞에서부터 이만큼만 보인다", unit: "개", min: 1, max: 9},
      keys: {type: "bool", default: true, label: "숫자 키로 고르기"},
      once: {type: "bool", default: true, label: "고르면 닫기", help: "하나를 고르면 선택지를 치운다 (두 번 고르지 못하게)"},
      longPress: {type: "number", default: 0.4, label: "길게 누르기 시간", help: "터치에서 이만큼 누르고 있으면 고르지 않고 올림 신호만 보낸다", unit: "초", min: 0.1, max: 2},
      size: {type: "number", default: 16, label: "글자 크기", help: "0 = 스타일 시트를 따름 (모양 전부)", unit: "px", min: 0},
      color: {type: "color", default: "#232a3a", label: "칸 색"},
      textColor: {type: "color", default: "#ffffff", label: "글자 색"},
      accent: {type: "color", default: "#9ec1ff", label: "강조 색", help: "번호와, 올렸을 때의 테두리"},
      gap: {type: "number", default: 8, label: "사이 간격", unit: "px", min: 0, max: 40},
      confirmQuestion: {type: "text", default: "이렇게 할까요?", label: "되묻는 글", help: "confirm()이 고르기 전에 보이는 글"},
      confirmYes: {type: "text", default: "이렇게 한다", label: "되묻기 — 한다"},
      confirmNo: {type: "text", default: "아니다", label: "되묻기 — 안 한다"}};
    start() {
      this.items = []; this.title = ""; this._buttons = []; this._pending = null;
      const e = el(this); if (e) e.classList.add("we-choices");
      this.engine.bus.on("key", k => {
        const m = /^(?:Digit|Numpad)(\d)$/.exec(k);
        if (!m || !this.props.keys || !this.node.isActive() || !this.items.length) return;
        const now = Date.now();      // a key held down repeats: it must not also answer the list that comes next
        if (now - (this._keyAt || 0) < 250) return;
        if (this.pick(+m[1] - 1, "key")) this._keyAt = now;
      }, this);
      this.apply();
    }
    update() { if (changed(this)) { this.apply(); if (this.items.length) this._draw(); } }
    apply() {
      const e = el(this); if (!e) return;
      Object.assign(e.style, {display: "flex", flexDirection: "column", gap: this.props.gap + "px"});
    }
    // Shows the list (replacing what was there). Returns the items really shown — never more than `max`.
    show(list, {title = ""} = {}) {
      this._settle(null);
      const all = (list || []).map((c, i) => typeof c === "string" ? {id: String(i + 1), label: c} : {...c, id: String(c.id ?? i + 1), label: String(c.label ?? c.id ?? "")});
      const max = Math.max(1, Math.min(9, Math.floor(this.props.max) || 4));
      if (all.length > max) this.engine.log(this.where(), `선택지 ${all.length}개 중 앞의 ${max}개만 보임 (선택지 최대 수)`);
      this.items = all.slice(0, max); this.title = String(title || "");
      this._draw();
      return this.items;
    }
    hide() { return this.show([]); }
    get showing() { return this.items.length > 0; }
    // show + wait: resolves with {id, index, item, by}, or null when the list is replaced or hidden before a pick.
    ask(list, o) {
      const shown = this.show(list, o);
      if (!shown.length) return Promise.resolve(null);
      return new Promise(ok => { this._pending = ok; });
    }
    // "이렇게 할까요?" — nothing happens until the player presses. true = do it. What was shown before comes back after.
    async confirm(what, {question = this.props.confirmQuestion, yes = this.props.confirmYes, no = this.props.confirmNo} = {}) {
      const before = {items: this.items, title: this.title};
      const r = await this.ask([{id: "yes", label: what ? `${yes}: ${what}` : yes}, {id: "no", label: no}], {title: question});
      if (r) { this.items = before.items; this.title = before.title; this._draw(); }
      return !!r && r.id === "yes";
    }
    pick(index, by = "code") {
      const item = this.items[index];
      if (!item || item.disabled) return false;
      const hit = {id: item.id, index, item, by};
      if (this.props.once) { this.items = []; this.title = ""; this._draw(); }
      this.node.emit("pick", hit);
      this._settle(hit);
      return true;
    }
    hover(index, by = "code") {
      const item = index == null ? null : this.items[index] || null;
      if (item === this._hot) return;      // one signal per change
      this._hot = item; this.node.emit("hover", item, {by}); this._mark();
    }
    _settle(v) { const ok = this._pending; this._pending = null; if (ok) ok(v); }
    _mark() {
      const p = this.props;
      this._buttons.forEach((b, i) => { if (!b._el) return; const on = this._hot === this.items[i]; b._el.classList.toggle("we-hot", on); if (p.size) b._el.style.borderColor = on ? p.accent : "transparent"; });
    }
    _draw() {
      [...this.node.children].forEach(c => c.destroy());
      this._buttons = []; this._hot = null;
      const p = this.props;
      if (this.title) {
        const t = this.node.add({name: "묻는글", style: "we-choices-title", components: [text(this.title, {bold: true, size: p.size, color: p.size ? p.accent : ""})]}), te = elOf(this, t);
        if (te) te.style.position = "relative";
      }
      this.items.forEach((item, i) => {
        const kids = [{name: "번호", style: "we-key", components: [text(String(i + 1), {bold: true, size: p.size, color: p.size ? p.accent : ""})]},
                      {name: "글", style: "we-label", components: [text(item.label, {size: p.size, color: p.size ? p.textColor : ""})]}];
        if (item.desc) kids.push({name: "설명", style: "we-desc", components: [text(item.desc, {size: Math.round(p.size * 0.84), color: p.size ? p.textColor : ""})]});
        const b = this.node.add({name: `선택${i + 1}`, style: "we-choice" + (item.disabled ? " we-off" : ""),
          components: [{type: "Button", props: {label: "", size: 0, color: p.size ? p.color : "", textColor: p.size ? p.textColor : "", disabled: !!item.disabled}}], children: kids});
        this._buttons.push(b);
        b.on("click", () => { if (this._held) { this._held = false; return; } this.pick(i, "click"); }, this);
        const e = elOf(this, b); if (!e) return;
        e.dataset.choice = item.id; e.tabIndex = item.disabled ? -1 : 0;
        Object.assign(e.style, {position: "relative", display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "10px", alignItems: "baseline", flex: "none"});
        for (const ch of b.children) { const c = elOf(this, ch); if (c) c.style.position = "relative"; }
        const d = b.find("설명"); if (d && d._el) d._el.style.gridColumn = "2";
        if (p.size) {
          Object.assign(e.style, {borderRadius: "8px", padding: "7px 14px", border: "2px solid transparent", userSelect: "none"});
          const k = b.find("번호"); if (k && k._el) k._el.style.minWidth = "1.2em";
          if (d && d._el) d._el.style.opacity = "0.72";
        }
        // after a touch the browser also sends made-up mouse and focus events: those must not undo what the press showed
        const touched = () => Date.now() - (this._touchAt || 0) < 900;
        const on = by => () => { if (!touched()) this.hover(i, by); }, off = () => { if (!touched() && this._hot === item) this.hover(null, "leave"); };
        e.addEventListener("mouseenter", on("pointer")); e.addEventListener("mouseleave", off);
        e.addEventListener("focusin", on("focus")); e.addEventListener("focusout", off);
        e.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); this.pick(i, "key"); } });
        let t = null;      // touch: a long press only shows what the choice is about (hover), it does not pick
        e.addEventListener("pointerdown", ev => {
          if (ev.pointerType !== "touch") return;
          this._touchAt = Date.now(); this._held = false; clearTimeout(t);
          t = setTimeout(() => { this._held = true; this._touchAt = Date.now(); this.hover(i, "press"); }, this.props.longPress * 1000);
        });
        for (const n of ["pointerup", "pointercancel", "pointerleave"]) e.addEventListener(n, ev => { if (ev.pointerType === "touch") this._touchAt = Date.now(); clearTimeout(t); });
      });
    }
  }, "builtin", "talk");

  // ---------------- Gauge ----------------
  define("Gauge", class extends Component {
    static icon = "📊"; static title = "막대";
    static help = "값을 막대로 보인다. 값이 바뀌면 짧게 번쩍이고, 미리 보기로 '오르면 여기까지'(초록)·'내리면 여기까지'(빨강)를 보인다. 코드: node.get(\"Gauge\").set(7) · .preview(\"up\") · .preview(\"down\", 2) · .preview(null)";
    static props = {
      label: {type: "text", default: "", label: "이름", help: "막대 앞에 보이는 글"},
      value: {type: "number", default: 0, label: "값"},
      max: {type: "number", default: 10, label: "가장 큰 값", min: 1},
      step: {type: "number", default: 1, label: "미리 보기 크기", help: "preview()에 크기를 주지 않았을 때 보이는 변화량", min: 0},
      flash: {type: "number", default: 0.45, label: "번쩍임 길이", help: "값이 바뀌었을 때 번쩍이는 시간. 0 = 번쩍이지 않음", unit: "초", min: 0, max: 3},
      showNumber: {type: "bool", default: true, label: "숫자 보이기", help: "막대 뒤에 '값 / 가장 큰 값'"},
      size: {type: "number", default: 14, label: "글자 크기", help: "0 = 스타일 시트를 따름 (모양 전부)", unit: "px", min: 0},
      color: {type: "color", default: "#6aa9ff", label: "막대 색"},
      back: {type: "color", default: "#2a2f3a", label: "빈 곳 색"},
      upColor: {type: "color", default: "#4caf6a", label: "오름 색", help: "오르는 미리 보기와 오른 뒤의 번쩍임"},
      downColor: {type: "color", default: "#d9534f", label: "내림 색", help: "내리는 미리 보기와 내린 뒤의 번쩍임"}};
    start() {
      this._shown = this.props.value; this._preview = null; this._flashDir = null;
      const e = el(this);
      if (e) {
        e.classList.add("we-gauge");
        const d = e.ownerDocument, mk = cls => { const x = d.createElement("div"); x.className = cls; return x; };
        this._p = {label: mk("we-gauge-label"), track: mk("we-gauge-track"), fill: mk("we-gauge-fill"), ghost: mk("we-gauge-preview"), num: mk("we-gauge-num")};
        this._p.track.append(this._p.fill, this._p.ghost);
        e.append(this._p.label, this._p.track, this._p.num);
      }
      this.apply();
    }
    update() { if (changed(this)) { if (this.props.value !== this._shown) this._changed(this._shown, this.props.value); this.apply(); } }
    get value() { return this.props.value; }
    // A new value (kept inside 0 … max). A change flashes for `flash` seconds and sends "change" {value, old, dir}.
    set(value, {quiet = false} = {}) {
      const old = this.props.value, v = Math.max(0, Math.min(this.props.max, Number(value) || 0));
      this.props.value = v; this._last = JSON.stringify(this.props);
      if (v !== old && !quiet) this._changed(old, v); else this._shown = v;
      this.apply();
      return v;
    }
    _changed(old, v) {
      this._shown = v;
      const dir = v > old ? "up" : "down";
      this.node.emit("change", {value: v, old, dir});
      if (!(this.props.flash > 0)) return;
      this._flashDir = dir;
      const tok = this._tok = (this._tok || 0) + 1;
      if (this.engine.timer) this.engine.timer.after(this.props.flash, () => { if (this._tok === tok) { this._flashDir = null; this.apply(); } }, this);
    }
    get flashing() { return this._flashDir; }
    // What a change would do, before it happens: "up" (green, from the value upward) · "down" (red, the part that would go) · null.
    preview(dir, amount) {
      const d = dir === "up" || dir > 0 ? "up" : dir === "down" || dir < 0 ? "down" : null;
      this._preview = d ? {dir: d, amount: Math.max(0, amount ?? this.props.step)} : null;
      this.apply();
      return this._preview;
    }
    apply() {
      const e = el(this), q = this._p; if (!e || !q) return;
      const p = this.props, pct = v => Math.max(0, Math.min(100, p.max ? v / p.max * 100 : 0)), pv = this._preview, fl = this._flashDir;
      Object.assign(e.style, {display: "flex", alignItems: "center", gap: "8px"});
      q.label.textContent = p.label; q.label.style.display = p.label ? "" : "none";
      q.num.textContent = `${p.value} / ${p.max}`; q.num.style.display = p.showNumber ? "" : "none";
      Object.assign(q.track.style, {position: "relative", flex: "1", height: "0.8em", minWidth: "40px", overflow: "hidden"});
      Object.assign(q.fill.style, {position: "absolute", left: "0", top: "0", bottom: "0", width: pct(p.value) + "%"});
      const from = pv ? (pv.dir === "up" ? p.value : Math.max(0, p.value - pv.amount)) : 0, to = pv ? (pv.dir === "up" ? Math.min(p.max, p.value + pv.amount) : p.value) : 0;
      Object.assign(q.ghost.style, {position: "absolute", top: "0", bottom: "0", left: pct(from) + "%", width: (pct(to) - pct(from)) + "%", display: pv ? "" : "none"});
      for (const c of ["we-up", "we-down"]) { q.ghost.classList.toggle(c, !!pv && "we-" + pv.dir === c); e.classList.toggle(c.replace("we-", "we-flash-"), !!fl && "we-" + fl === c); }
      e.classList.toggle("we-flash", !!fl);
      if (!p.size) return;
      const tone = d => d === "up" ? p.upColor : p.downColor;
      Object.assign(e.style, {fontSize: p.size + "px", color: "#e8e6e1"});
      Object.assign(q.track.style, {background: p.back, borderRadius: "999px", boxShadow: fl ? `0 0 0 2px ${tone(fl)}, 0 0 12px ${tone(fl)}` : "none", transition: "box-shadow .12s"});
      Object.assign(q.fill.style, {background: fl ? tone(fl) : p.color, transition: "width .25s, background .12s"});
      Object.assign(q.ghost.style, {background: pv ? tone(pv.dir) : "", opacity: "0.85"});
      Object.assign(q.num.style, {minWidth: "3.6em", textAlign: "right", fontVariantNumeric: "tabular-nums"});
      q.label.style.whiteSpace = "nowrap";
    }
  }, "builtin", "talk");

  // ---------------- Hotspots ----------------
  define("Hotspots", class extends Component {
    static icon = "🗺"; static title = "그림 위 구역";
    static help = "그림(또는 상자) 위에 누를 구역을 둔다. 올리면 밝아지고 이름이 뜨며, 누르면 'pick' 신호({id, zone}), 올리면 'hover' 신호. 터치는 한 번 누르면 이름만, 한 번 더 누르면 고른다. 코드: node.get(\"Hotspots\").set(구역들) · node.on(\"pick\", h => …)";
    static props = {
      zones: {type: "json", default: [], label: "구역들", help: "[{\"id\": \"a\", \"label\": \"이름\", \"note\": \"한 줄 설명\", \"rect\": [왼쪽, 위, 너비, 높이]}] — 숫자는 그림 크기의 퍼센트. 네모가 아니면 \"points\": [[x, y], …]. \"disabled\": true면 이름만 보이고 고를 수 없다"},
      light: {type: "color", default: "#fff3c4", label: "밝아지는 색", help: "올린 구역에 덮이는 빛"},
      strength: {type: "number", default: 0.35, label: "밝기", help: "0 = 안 밝아짐 · 1 = 색으로 덮임", min: 0, max: 1},
      outline: {type: "bool", default: false, label: "구역 늘 보이기", help: "올리지 않아도 구역을 옅게 보인다 (배치를 볼 때)"},
      tips: {type: "bool", default: true, label: "이름 띄우기", help: "올린 구역의 이름과 설명을 그 곁에 보인다"},
      size: {type: "number", default: 14, label: "글자 크기", help: "0 = 스타일 시트를 따름 (모양 전부)", unit: "px", min: 0}};
    start() { this._hot = null; this._els = {}; const e = el(this); if (e) e.classList.add("we-hotspots"); this.apply(); }
    update() { if (changed(this)) this.apply(); }
    set(zones) { this.props.zones = JSON.parse(JSON.stringify(zones || [])); this._last = JSON.stringify(this.props); this._hot = null; this.apply(); return this.zones; }
    get zones() { return (Array.isArray(this.props.zones) ? this.props.zones : []).filter(z => z && z.id != null && (z.rect || z.points)); }
    static points(z) { if (z.points) return z.points; const [x, y, w, h] = z.rect; return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
    zone(id) { return this.zones.find(z => String(z.id) === String(id)) || null; }
    pick(id, by = "code") {
      const z = this.zone(id);
      if (!z || z.disabled) return false;
      this.node.emit("pick", {id: z.id, zone: z, by});
      return true;
    }
    hover(id, by = "code") {
      const z = id == null ? null : this.zone(id);
      if ((this._hot && this._hot.id) === (z && z.id)) return;
      this._hot = z; this.node.emit("hover", z, {by}); this._mark();
    }
    _mark() {
      const p = this.props, hot = this._hot;
      for (const [id, e] of Object.entries(this._els)) {
        const on = !!hot && String(hot.id) === id;
        e.classList.toggle("we-hot", on);
        e.style.background = on ? p.light : p.outline ? "#ffffff" : "transparent";
        e.style.opacity = on ? String(p.strength) : p.outline ? "0.12" : "0";
      }
      const tip = this._tip; if (!tip) return;
      if (!hot || !p.tips) { tip.style.display = "none"; return; }
      const pts = this.constructor.points(hot), xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
      tip.replaceChildren();
      const d = tip.ownerDocument, name = d.createElement("b"); name.textContent = hot.label ?? hot.id; tip.append(name);
      if (hot.note) { const n = d.createElement("div"); n.textContent = hot.note; tip.append(n); }
      const below = Math.max(...ys) < 78;      // the name goes under the zone, or above it near the bottom edge
      Object.assign(tip.style, {display: "block", left: Math.max(2, Math.min(98, (Math.min(...xs) + Math.max(...xs)) / 2)) + "%", top: below ? Math.max(...ys) + "%" : "", bottom: below ? "" : (100 - Math.min(...ys)) + "%",
        transform: `translate(-50%, ${below ? "6px" : "-6px"})`});
    }
    apply() {
      const e = el(this); if (!e) return;
      const p = this.props, d = e.ownerDocument;
      for (const x of Object.values(this._els)) x.remove();
      if (this._tip) this._tip.remove();
      this._els = {};
      let pointer = "mouse";
      for (const z of this.zones) {
        const id = String(z.id), h = this._els[id] = d.createElement("div");
        h.className = "we-zone" + (z.disabled ? " we-off" : ""); h.dataset.zone = id; h.tabIndex = 0;
        h.setAttribute("role", "button"); h.setAttribute("aria-label", String(z.label ?? id));
        Object.assign(h.style, {position: "absolute", inset: "0", clipPath: "polygon(" + this.constructor.points(z).map(([x, y]) => `${x}% ${y}%`).join(",") + ")",
          cursor: z.disabled ? "default" : "pointer", transition: "opacity .12s", outline: "none"});
        h.addEventListener("pointerdown", ev => { pointer = ev.pointerType === "mouse" ? "mouse" : "touch"; if (pointer === "touch") this._shownBefore = !!this._hot && String(this._hot.id) === id; });
        h.addEventListener("pointerenter", ev => { if (ev.pointerType === "mouse") this.hover(id, "pointer"); });
        h.addEventListener("pointerleave", ev => { if (ev.pointerType === "mouse" && this._hot && String(this._hot.id) === id) this.hover(null, "leave"); });
        h.addEventListener("focus", () => this.hover(id, "focus"));
        h.addEventListener("blur", () => { if (this._hot && String(this._hot.id) === id) this.hover(null, "leave"); });
        // touch: the first tap only shows the name (the tap itself also focuses the zone, so "was it shown before this tap" is kept at pointerdown)
        h.addEventListener("click", ev => { ev.stopPropagation(); if (pointer === "touch" && !this._shownBefore) return this.hover(id, "press"); this.pick(id, "click"); });
        h.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); this.pick(id, "key"); } });
        e.appendChild(h);
      }
      const tip = this._tip = d.createElement("div");
      tip.className = "we-zone-tip";
      Object.assign(tip.style, {position: "absolute", display: "none", pointerEvents: "none", zIndex: "2", whiteSpace: "nowrap"});
      if (p.size) Object.assign(tip.style, {fontSize: p.size + "px", background: "rgba(16,18,24,.92)", color: "#f2efe8", padding: "5px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,.25)", lineHeight: "1.45"});
      e.appendChild(tip);
      if (this._hot && !this.zone(this._hot.id)) this._hot = null;
      this._mark();
    }
  }, "builtin", "talk");
})();
