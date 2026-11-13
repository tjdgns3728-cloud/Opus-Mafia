// Runs a project's data rules (WebEngine.dataRule in its scripts) without a browser: node or VS Code's Electron as Node.
// usage: rules_runner.js <project dir> <asset path, e.g. data/x.json> <data file (JSON)> <out.json>
// Writes {ok, errors: [...], rules: n} to out.json.
const fs = require("fs"), path = require("path");
const [proj, rel, dataFile, out] = process.argv.slice(2);
const ROOT = path.join(__dirname, "..");
const result = {ok: false, errors: [], rules: 0};
try {
  for (const f of fs.readdirSync(path.join(ROOT, "runtime")).filter(f => f.endsWith(".js")).sort((a, b) => a === "core.js" ? -1 : b === "core.js" ? 1 : a.localeCompare(b)))
    require(path.join(ROOT, "runtime", f));
  const sdir = path.join(proj, "scripts");
  if (fs.existsSync(sdir)) for (const f of fs.readdirSync(sdir).filter(f => f.endsWith(".js")).sort()) {
    try { new Function("WebEngine", fs.readFileSync(path.join(sdir, f), "utf8"))(globalThis.WebEngine); }
    catch (e) { result.errors.push(`scripts/${f}: 불러오지 못함 — ${e.message}`); }
  }
  const files = p => { const fp = path.join(proj, "assets", p); try { return JSON.parse(fs.readFileSync(fp, "utf8").replace(/^﻿/, "")); } catch { return null; } };
  const data = globalThis.WebEngine.fixData(rel, JSON.parse(fs.readFileSync(dataFile, "utf8").replace(/^﻿/, "")), files);
  result.rules = globalThis.WebEngine.dataRules().length;
  result.errors.push(...globalThis.WebEngine.checkData(rel, data, files));
  result.data = data;                    // after the game's code fixes
  result.ok = !result.errors.length;
} catch (e) { result.errors.push("규칙 실행기 오류: " + e.message); }
fs.writeFileSync(out, JSON.stringify(result));
