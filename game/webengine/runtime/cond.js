// cond module: safe, structured conditions written as data (no code is run). A game decides what a path means.
// engine.cond.check(cond, lookup) → true/false · engine.cond.problems(cond, where, vars) → ["…"] (for data checks)
//   {"all": [c, …]} · {"any": [c, …]} · {"not": c} · {"has": "path"} (truthy) · {"is": ["path", value]} ·
//   {"cmp": ["path", "<"|"<="|">"|">="|"=="|"!=", number]} · true / false · null or missing = true (no condition)
// lookup(path) returns the game's value for a path (e.g. "fact.big_glove"). An unknown form is reported and counts as false;
// a lookup that throws (an unknown path) is reported and makes the WHOLE condition false — even under "not".
WebEngine.module("cond", engine => {
  const OPS = {"<": (a, b) => a < b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, ">=": (a, b) => a >= b, "==": (a, b) => a === b, "!=": (a, b) => a !== b};
  const FORMS = ["all", "any", "not", "has", "is", "cmp"];
  // vars (ENGINE-004): the names a game declared in project.json "vars" — {"oil": "number", "fact.*": "bool"} — with
  // number · bool · text · any. Given, every path must be declared, cmp needs a number and is needs a value of that kind.
  const KINDS = {number: v => typeof v === "number", bool: v => typeof v === "boolean", text: v => typeof v === "string", any: () => true};
  const KIND_TEXT = {number: "수", bool: "예/아니오", text: "글", any: "아무거나"};
  function varKind(path, vars) {
    if (Object.prototype.hasOwnProperty.call(vars, path)) return vars[path];
    const group = Object.keys(vars).filter(k => k.endsWith(".*") && path.startsWith(k.slice(0, -1)) && path.length > k.length - 1)
      .sort((a, b) => b.length - a.length)[0];
    return group ? vars[group] : undefined;
  }
  function nameProblems(k, v, where, vars) {
    const path = k === "has" ? v : v[0], kind = varKind(path, vars);
    if (kind === undefined) return [`${where}.${k}: 선언되지 않은 이름 '${path}' (⚙ 게임 설정 › 조건에 쓰는 이름)`];
    if (k === "cmp" && kind !== "number" && kind !== "any") return [`${where}.cmp: '${path}'은(는) ${KIND_TEXT[kind] || kind}라 크기를 비교할 수 없음`];
    if (k === "is" && KINDS[kind] && !KINDS[kind](v[1])) return [`${where}.is: '${path}'은(는) ${KIND_TEXT[kind]}인데 값이 ${JSON.stringify(v[1])}`];
    return [];
  }
  function problems(c, where = "조건", vars = null) {
    const bad = formProblems(c, where);
    if (bad.length || !vars || typeof vars !== "object" || !Object.keys(vars).length) return bad;
    const walk = (x, w) => {
      if (x === null || x === undefined || typeof x !== "object") return [];
      const [k] = Object.keys(x), v = x[k];
      if (k === "all" || k === "any") return v.flatMap((y, i) => walk(y, `${w}.${k}[${i}]`));
      if (k === "not") return walk(v, `${w}.not`);
      return nameProblems(k, v, w, vars);
    };
    return walk(c, where);
  }
  function formProblems(c, where) {
    if (c === null || c === undefined || c === true || c === false) return [];
    if (typeof c !== "object" || Array.isArray(c)) return [`${where}: 조건은 묶음({…})이어야 함 — ${JSON.stringify(c).slice(0, 60)}`];
    const keys = Object.keys(c);
    if (keys.length !== 1 || !FORMS.includes(keys[0])) return [`${where}: 모르는 조건 ${JSON.stringify(keys)} (${FORMS.join("·")})`];
    const [k] = keys, v = c[k];
    if (k === "all" || k === "any") return Array.isArray(v) ? v.flatMap((x, i) => formProblems(x, `${where}.${k}[${i}]`)) : [`${where}.${k}: 목록이어야 함`];
    if (k === "not") return formProblems(v, `${where}.not`);
    if (k === "has") return typeof v === "string" && v ? [] : [`${where}.has: 경로 글이어야 함`];
    if (k === "is") return Array.isArray(v) && v.length === 2 && typeof v[0] === "string" ? [] : [`${where}.is: ["경로", 값]`];
    if (k === "cmp") return Array.isArray(v) && v.length === 3 && typeof v[0] === "string" && OPS[v[1]] && typeof v[2] === "number" ? [] : [`${where}.cmp: ["경로", 비교, 수]`];
    return [];
  }
  function check(c, lookup, where = "조건") {
    try { return evaluate(c, lookup, where); }
    catch (e) { engine.error("조건", `${where}: ${e.message}`, e); return false; }
  }
  function evaluate(c, lookup, where) {
    if (c === null || c === undefined || c === true) return true;
    if (c === false) return false;
    const bad = problems(c, where);
    if (bad.length) { engine.error("조건", bad[0], new Error(bad[0])); return false; }
    const [k] = Object.keys(c), v = c[k];
    if (k === "all") return v.every(x => evaluate(x, lookup, where));
    if (k === "any") return v.some(x => evaluate(x, lookup, where));
    if (k === "not") return !evaluate(v, lookup, where);
    if (k === "has") return !!lookup(v);
    if (k === "is") return lookup(v[0]) === v[1];
    const a = Number(lookup(v[0]));
    return Number.isFinite(a) && OPS[v[1]](a, v[2]);
  }
  return {check, problems, KIND_TEXT};
});
