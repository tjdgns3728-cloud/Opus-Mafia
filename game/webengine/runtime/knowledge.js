// knowledge module: who knows what, kept per holder (a player, a bot, a character). A game decides what a fact means.
// const book = engine.knowledge.create({hide: ["truth"]})   — hide: fact fields never shown in a holder's view
//   book.add({key, …fields}, holder?, {via, from, at})  → {key, first}  a fact (its fields never change after the first add)
//   book.learn(key, holder, {via, from, at})            → true/false   the holder now knows it; the way is appended (acq)
//   book.publish(key)                                    everyone knows it from now on (cannot be undone)
//   book.hear(listener, key, {p, draw | rng, from, via, at}) → {heard, p, draw}  heard only when draw < p (truth unchanged)
//   book.knows(holder, key) · book.knownBy(key) · book.get(key) · book.viewFor(holder) · book.about(holder, where) · book.dump()
// Append only: nothing is ever removed or rewritten — a holder never forgets, a way never disappears, a public fact
// stays public. Every read returns a copy, so changing what comes back changes nothing here.
// viewFor(holder) is all a holder may see: public facts and facts the holder knows, without hidden fields, without who
// else knows, and with only the holder's own ways (acq). Nothing about facts the holder does not know is in it.
WebEngine.module("knowledge", engine => {
  const copy = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
  const SYSTEM = ["key", "knownBy", "acq", "public"];     // fields the book keeps itself

  function create({hide = []} = {}) {
    const facts = new Map(), hidden = new Set(hide);
    const need = key => { const f = facts.get(String(key)); if (!f) throw new Error(`모르는 사실: ${key}`); return f; };
    const way = (f, holder, {via = "", from = null, at = null} = {}) => {
      f.acq.push({n: f.acq.length + 1, holder, via: String(via || ""), from: from ?? null, at: at ?? null});
    };
    const book = {
      add(fact, holder = null, how = {}) {
        if (!fact || typeof fact !== "object" || fact.key === undefined || fact.key === null || fact.key === "") throw new Error("사실에는 key가 있어야 함");
        const key = String(fact.key);
        let f = facts.get(key), first = !f;
        if (first) {
          const fields = copy(fact);
          for (const k of SYSTEM) delete fields[k];
          f = {...fields, key, knownBy: [], acq: [], public: false};
          facts.set(key, f);
          if (fact.public === true) f.public = true;
        }
        if (holder !== null && holder !== undefined) book.learn(key, holder, how);
        return {key, first};
      },
      learn(key, holder, how = {}) {
        const f = need(key), h = String(holder);
        const added = !f.knownBy.includes(h);
        if (added) f.knownBy.push(h);
        way(f, h, how);
        return added;
      },
      publish(key) { need(key).public = true; },
      // A listener hears a fact from someone who knows it, with chance p: heard only when draw < p.
      // draw comes from the caller (a recorded number) or from rng() — never from a hidden source, so the same numbers
      // give the same result. p that is not a finite number counts as 0 (nothing is heard).
      hear(listener, key, {p = 0, draw, rng, from = null, via = "hear", at = null} = {}) {
        const f = need(key);
        if (draw === undefined) {
          if (typeof rng !== "function") throw new Error("hear: draw(정한 수) 또는 rng가 필요함");
          draw = rng();
        }
        const pp = typeof p === "number" && Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
        const d = Number(draw);
        if (from !== null && from !== undefined && !f.public && !f.knownBy.includes(String(from))) return {heard: false, p: pp, draw: d, reason: "말한 쪽이 모름"};
        if (!(Number.isFinite(d) && d < pp)) return {heard: false, p: pp, draw: d};
        book.learn(key, listener, {via, from, at});
        return {heard: true, p: pp, draw: d};
      },
      knows(holder, key) { const f = facts.get(String(key)); return !!f && (f.public || f.knownBy.includes(String(holder))); },
      knownBy(key) { const f = facts.get(String(key)); return f ? [...f.knownBy] : []; },
      get(key) { return copy(facts.get(String(key))) || null; },
      keys() { return [...facts.keys()]; },
      viewFor(holder) {
        const h = String(holder), out = {};
        for (const [key, f] of facts) {
          if (!f.public && !f.knownBy.includes(h)) continue;
          const v = {};
          for (const [k, val] of Object.entries(f)) if (k !== "knownBy" && k !== "acq" && !hidden.has(k)) v[k] = copy(val);
          v.acq = f.acq.filter(a => a.holder === h).map(copy);
          out[key] = v;
        }
        return out;
      },
      // The holder's facts whose fields match `where` ({field: value} or {field: [values]}) — e.g. a topic.
      about(holder, where = {}) {
        const view = book.viewFor(holder), test = (v, want) => Array.isArray(want) ? want.includes(v) : v === want;
        return Object.values(view).filter(f => Object.entries(where).every(([k, want]) => test(f[k], want)));
      },
      dump() { return [...facts.values()].map(copy); }
    };
    return book;
  }
  return {create};
});
