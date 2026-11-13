// match module: free text → what it names, from words written as data. A game decides what each entry means.
// An entry: {id, words: ["…"], hidden?: true, where?: {field: value}}. Spaces, case and marks do not matter; the longest
// word found wins, ties go to the earlier entry. A hidden entry is never offered — it appears only when the text names it.
//   engine.match.find(text, entries)        → [{id, word, score, entry}]  every entry the text names, best first
//   engine.match.options(text, entries)     → entries to offer: all that are not hidden + hidden ones the text names
//   engine.match.slots(text, groups)        → {group: best | null}  e.g. groups {action: […], place: […], target: […]}
//   engine.match.topicFacts(topic, facts)   → facts (a list or a {key: fact} map) whose fields match topic.where
//   engine.match.topics(text, topics, facts) → [{id, word, facts}]  topics the text names, each with its facts
//   const m = engine.match.create({fallback, onMatch, need}) · m.handle(text, groups) → what a handler returned
// handle never refuses: when nothing (or not every `need` group) matches, or onMatch gives nothing back or fails, the
// fallback is called with the same result — so every text gets a result. create() without a fallback is an error.
WebEngine.module("match", engine => {
  const norm = t => String(t ?? "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const asList = facts => Array.isArray(facts) ? facts : Object.values(facts || {});

  function find(text, entries = []) {
    const t = norm(text), out = [];
    if (!t) return out;
    entries.forEach((entry, i) => {
      let best = null;
      for (const w of entry.words || []) { const n = norm(w); if (n && t.includes(n) && (!best || n.length > best.n.length)) best = {w, n}; }
      if (best) out.push({id: entry.id, word: best.w, score: best.n.length, order: i, entry});
    });
    return out.sort((a, b) => b.score - a.score || a.order - b.order).map(({order, ...m}) => m);
  }
  function options(text, entries = []) {
    const named = new Set(find(text, entries).map(m => m.entry));
    return entries.filter(e => !e.hidden || named.has(e));
  }
  function slots(text, groups = {}) {
    return Object.fromEntries(Object.entries(groups).map(([g, entries]) => [g, find(text, entries)[0] || null]));
  }
  function topicFacts(topic, facts) {
    const where = (topic && topic.where) || null;
    if (!where) return [];
    const test = (v, want) => Array.isArray(want) ? want.includes(v) : v === want;
    return asList(facts).filter(f => f && Object.entries(where).every(([k, want]) => test(f[k], want)));
  }
  function topics(text, list = [], facts = []) {
    return find(text, list).map(m => ({id: m.id, word: m.word, facts: topicFacts(m.entry, facts)}));
  }
  function create({fallback, onMatch = null, need = null} = {}) {
    if (typeof fallback !== "function") throw new Error("match.create: 맞는 것이 없을 때 부를 fallback 함수가 필요함");
    return {
      handle(text, groups = {}) {
        const result = {text: String(text ?? ""), slots: slots(text, groups)};
        const names = need && need.length ? need : Object.keys(groups);
        result.matched = need && need.length ? names.every(g => result.slots[g]) : names.some(g => result.slots[g]);
        if (result.matched && typeof onMatch === "function") {
          try {
            const r = onMatch(result);
            if (r !== undefined && r !== null) return r;
          } catch (e) { engine.error("맞추기", "onMatch", e); }
        }
        return fallback(result);
      }
    };
  }
  return {normalize: norm, find, options, slots, topicFacts, topics, create};
});
