"""Authoring helper (작성 AI): writes a draft of a data file step by step, checking each step.

Who does what: the rules (guide, schema, game data rules) are designed by the good model, rarely (role 규칙). Filling
content inside those rules is the value model's job (role 작성). Only a part that 작성 fails twice goes one step up
(role 올림). Code fixes what code can (WebEngine.dataFix) before any AI fix.

Cheap by design: every call starts with the same block (rules · instructions · whole schema · reference facts) so the
model's prompt cache serves it after the first call; each step then gets only the keys it needs (step "참고칸"); a fix
writes only the keys its errors name; finished steps are saved so a cut-off run continues (--resume); a run is one
batch with a cap (project setting ai_limits.제작).

A guide (assets/ai/<name>.md) starts with a JSON block:
    ```json
    {"대상": "data/x.json",                                  target data file (under assets/)
     "참고": ["data/rules.json", "data/roles.json#cards"],   facts the AI must use (#key = only that part)
     "오류칸": {"단서": ["단서"], …},                         words in error messages → keys to fix
     "단계": [{"칸": ["a", "b"], "참고칸": ["c"], "할일": "…"}, …]}
    ```
and the rest of the guide is the instructions. The draft is returned — never applied (tool.py apply-draft).
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from . import ai, check, store

MODEL: str | None = None      # one run may use another model for 작성 (tool.py draft --model)
SESSION, LIMIT = "", None     # this run as one batch, and its cap


def _asset(pid: str, rel: str):
    data, err = check._decode(store.read(pid, "assets/" + rel))
    if err:
        raise ai.AIError(f"assets/{rel}: JSON으로 읽을 수 없음 — {err}")
    return data


def read_guide(pid: str, guide: str) -> tuple[dict, str]:
    import base64
    text = base64.b64decode(store.read(pid, "assets/" + guide)).decode("utf-8-sig")
    if not text.lstrip().startswith("```json"):
        raise ai.AIError(f"{guide}: 맨 앞에 ```json {{대상, 참고, 단계}} ``` 칸이 있어야 함")
    head, body = text.split("```json", 1)[1].split("```", 1)
    return json.loads(head), body.strip()


def js_runtime() -> tuple[str, dict] | None:
    cmd, env = shutil.which("node"), dict(os.environ)
    if cmd:
        return cmd, env
    code = Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Microsoft VS Code" / "Code.exe"
    if code.is_file():
        env["ELECTRON_RUN_AS_NODE"] = "1"
        return str(code), env
    return None


def run_rules(pid: str, rel: str, data) -> tuple[list[str], object]:
    """The game's data fixes then data rules for `rel` on `data` → (errors, data after the fixes)."""
    rt = js_runtime()
    if not rt:
        return ["데이터 규칙을 돌릴 JS 실행기(node 또는 VS Code)가 없음"], data
    with tempfile.TemporaryDirectory(prefix="webengine-rules-", ignore_cleanup_errors=True) as d:
        df, out = Path(d) / "data.json", Path(d) / "out.json"
        df.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        subprocess.run([rt[0], str(store.ROOT / "server" / "rules_runner.js"), str(store.projects_dir() / pid), rel, str(df), str(out)],
                       env=rt[1], timeout=120, capture_output=True)
        if not out.is_file():
            return ["데이터 규칙 실행기가 결과를 남기지 못함"], data
        r = json.loads(out.read_text(encoding="utf-8"))
        return r["errors"], r.get("data", data)


def data_rules(pid: str, rel: str, data) -> list[str]:
    return run_rules(pid, rel, data)[0]


def _schema_errors(section: dict, schema: dict, rel: str) -> list[str]:
    errs: list[str] = []
    props = (schema or {}).get("properties", {})
    for k, v in section.items():
        check.validate(v, props.get(k, (schema or {}).get("additionalProperties")), f"{rel} › {k}", errs)
    return errs


def merge_fix(old: dict, fixed: dict) -> dict:
    """A fix answer into the draft. A fix often sends back only the entries it corrected: when the old and the fixed
    value of a key are both objects, the other entries are kept (replacing the whole key would silently drop them)."""
    out = dict(old)
    for k, v in fixed.items():
        out[k] = {**out[k], **v} if isinstance(out.get(k), dict) and isinstance(v, dict) else v
    return out


def pick(data, parts: list[str]):
    """A part of reference data by a dotted path. "*" = every item (a list stays a list, a dict keeps its keys), so
    "nodes.*.choices.*.label" gives only the labels — the AI reads what it needs, not a whole file."""
    if not parts:
        return data
    head, rest = parts[0], parts[1:]
    if head == "*":
        if isinstance(data, list):
            out = [pick(x, rest) for x in data]
            return [y for x in out for y in (x if isinstance(x, list) and rest and "*" in rest else [x]) if y is not None]
        if isinstance(data, dict):
            return {k: v for k, v in ((k, pick(x, rest)) for k, x in data.items()) if v is not None}
        return None
    return pick(data.get(head), rest) if isinstance(data, dict) else None


def _refs(pid: str, refs: list[str]) -> str:
    out = []
    for r in refs:
        path, _, key = r.partition("#")
        data = _asset(pid, path)
        if key:
            data = pick(data, key.split("."))
        out.append(f"### {r}\n{json.dumps(data, ensure_ascii=False, separators=(',', ':'))}")
    return "\n\n".join(out)


LEFT = 1                      # calls still to come in this run (for the model choice: remaining budget ÷ calls left)


def _ask(prefix: str, rest: str, keys: list[str], purpose: str, role: str = "작성") -> dict:
    model = MODEL if role == "작성" else None
    got = ai.extract_json(ai.run(role, prefix + "\n\n" + rest, purpose, model=model, session=SESSION, limit_won=LIMIT, calls_left=LEFT))
    if not isinstance(got, dict):
        raise ai.AIError("답이 JSON 객체가 아님")
    return {k: got[k] for k in keys if k in got}


def _compact(o) -> str:
    return json.dumps(o, ensure_ascii=False, separators=(",", ":"))


def make(pid: str, guide: str, brief: str, log=print, state: Path | None = None, only: list[int] | None = None, base: dict | None = None) -> dict:
    """state: a local file where finished steps are kept (--resume). only + base: write again only these steps (1-based)
    on top of an earlier draft."""
    global SESSION, LIMIT, LEFT
    head, body = read_guide(pid, guide)
    target, steps = head["대상"], head["단계"]
    LIMIT = ai.limit_for("제작", pid)
    schema_rel = target[:-5] + ".schema.json"
    have = {f["path"] for f in store.files(pid)}
    schema = _asset(pid, schema_rel) if "assets/" + schema_rel in have else {}
    current = _asset(pid, target) if "assets/" + target in have else {}
    refs = _refs(pid, head.get("참고", []))
    # The same block starts every call (prompt cache): rules · instructions · whole schema · reference facts.
    prefix = "\n\n".join(x for x in [
        "너는 이 게임의 시나리오 작성자다. 규칙은 이미 정해져 있다: 아래 지시서·형식·참고 사실을 지켜 요청된 칸만 JSON 객체 하나로 답한다(설명·말머리 없이). "
        "참고 사실과 '다른 칸'은 바꾸지 않는다. 모든 글은 한국어.",
        f"## 지시서\n{body}", f"## 형식 (JSON Schema)\n{_compact(schema)}", f"## 참고 사실 (게임 시스템 데이터)\n{refs}" if refs else ""] if x)
    draft: dict = {}
    report = {"target": target, "steps": [], "calls": 0, "started": time.strftime("%Y-%m-%dT%H:%M:%S")}
    done_steps = 0
    if state and state.is_file():
        saved = json.loads(state.read_text(encoding="utf-8"))
        if saved.get("guide") == guide:
            draft, done_steps, report = saved["draft"], saved["done"], saved["report"]
            log(f"  이어서: {done_steps}/{len(steps)}단계까지 되어 있음")
    SESSION = report.get("session") or f"make:{guide}:{time.strftime('%Y%m%d-%H%M%S')}"
    report["session"] = SESSION
    log(f"  AI 비용 상한: {LIMIT:g}원 (이번 제작 묶음, 지금까지 {ai.spent(SESSION):.0f}원)" if LIMIT is not None else "  AI 비용 상한 없음")
    if base and not done_steps:
        draft = dict(base)

    def context(keys, need):
        others = {k: v for k, v in draft.items() if k not in keys and (need is None or k in need)}
        same = {k: (draft[k] if k in draft else current[k]) for k in keys if k in draft or k in current}
        return "\n\n".join(x for x in [
            f"## 다른 칸 (정해진 것 — 바꾸지 말 것)\n{_compact(others)}" if others else "",
            f"## 지금의 같은 칸 (고칠 때 출발점 — 좋은 것은 살린다)\n{_compact(same)}" if same else "",
            f"## 사람의 요청\n{brief or '(없음 — 지시서대로)'}"] if x)

    todo = [i for i in range(1, len(steps) + 1) if i > done_steps and (not only or i in only)]
    for i, st in enumerate(steps, 1):
        if i not in todo:
            continue
        LEFT = len([j for j in todo if j >= i]) + 1          # this step, the ones after it, and one rules fix
        keys, need = st["칸"], st.get("참고칸")
        ask = f"{context(keys, need)}\n\n## 이번 단계 ({i}/{len(steps)}): {', '.join(keys)}\n{st['할일']}\n답: {{{', '.join(json.dumps(k, ensure_ascii=False) + ': …' for k in keys)}}}"
        log(f"  {i}/{len(steps)} {', '.join(keys)} …")
        section = _ask(prefix, ask, keys, f"draft:{target}:{i}"); report["calls"] += 1
        errs = [f"칸 없음: {k}" for k in keys if k not in section] + _schema_errors(section, schema, target)
        for role in ("작성", "올림"):          # one fix by the same model, then one step up
            if not errs:
                break
            log(f"    형식 오류 {len(errs)}개 → 고침 ({role})")
            fixed = _ask(prefix, ask + f"\n\n## 지난 답\n{_compact(section)}\n\n## 고칠 것 (지난 답의 오류)\n" + "\n".join(errs[:40]),
                         keys, f"draft:{target}:{i}:fix", role); report["calls"] += 1
            section = merge_fix(section, fixed)
            errs = [f"칸 없음: {k}" for k in keys if k not in section] + _schema_errors(section, schema, target)
        draft.update(section)
        report["steps"].append({"keys": keys, "errors": errs})
        if state:
            state.parent.mkdir(parents=True, exist_ok=True)
            state.write_text(json.dumps({"guide": guide, "draft": draft, "done": i, "report": report}, ensure_ascii=False), encoding="utf-8")

    LEFT = 1
    rules, draft = run_rules(pid, target, draft)          # the game's code fixes first, then its rules
    rules += _schema_errors(draft, schema, target)
    words = head.get("오류칸") or {k: [k] for k in draft}
    for role in ("작성", "올림"):
        if not rules:
            break
        # Fix only the parts the errors name (writing the whole draft again costs the most).
        keys = [k for k in draft if any(w in e for e in rules for w, ks in words.items() if k in ks)] or list(draft)
        log(f"  규칙 오류 {len(rules)}개 → 그 칸만 고침 ({role}): {', '.join(keys)}")
        fixed = _ask(prefix, f"{context(keys, None)}\n\n## 고칠 칸 (지금)\n{_compact({k: draft[k] for k in keys})}\n\n"
                             f"## 고칠 것 (검사기의 오류) — 고칠 칸만 같은 모양의 JSON으로: {', '.join(keys)}\n" + "\n".join(rules[:60]),
                     keys, f"draft:{target}:rules", role)
        report["calls"] += 1
        draft = merge_fix(draft, fixed)
        rules, draft = run_rules(pid, target, draft)
        rules += _schema_errors(draft, schema, target)
    report["rule_errors"] = rules
    report["spent_won"] = round(ai.spent(SESSION), 1)
    return {"draft": draft, "report": report}


def plan(pid: str, guide: str, brief: str = "", only: list[int] | None = None, base: dict | None = None) -> list[dict]:
    """Before spending anything: for each step, the expected prompt size, the model the budget would pick, and the
    expected cost (from the log's past calls). Later steps are sized with the current file or the base draft."""
    head, body = read_guide(pid, guide)
    target, steps = head["대상"], head["단계"]
    limit = ai.limit_for("제작", pid)
    have = {f["path"] for f in store.files(pid)}
    schema_rel = target[:-5] + ".schema.json"
    schema = _asset(pid, schema_rel) if "assets/" + schema_rel in have else {}
    known = dict(base or (_asset(pid, target) if "assets/" + target in have else {}))
    prefix_len = len(body) + len(_compact(schema)) + len(_refs(pid, head.get("참고", []))) + 200
    todo = [i for i in range(1, len(steps) + 1) if not only or i in only]
    rows, remaining = [], limit
    for i in todo:
        st = steps[i - 1]
        need = st.get("참고칸")
        ctx = sum(len(_compact(v)) for k, v in known.items() if k not in st["칸"] and (need is None or k in need))
        same = sum(len(_compact(known[k])) for k in st["칸"] if k in known)
        chars = prefix_len + ctx + same + len(st["할일"]) + len(brief) + 300
        left = len([j for j in todo if j >= i]) + 1
        try:
            model, est = ai.pick_model("작성", chars, f"draft:{target}:{i}", remaining, left)
        except ai.AIBudget as e:
            rows.append({"step": i, "keys": st["칸"], "chars": chars, "model": "-", "won": None, "note": str(e)}); continue
        rows.append({"step": i, "keys": st["칸"], "chars": chars, "model": model, "won": round(est["won"], 1), "out": est["out_tokens"]})
        if remaining is not None:
            remaining -= est["won"]
    return rows
