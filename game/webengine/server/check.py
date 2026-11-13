"""Checks before anything is saved. Only structure the engine itself relies on — never game rules.

- project.json: name, start scene exists, known engine modules
- scenes: name, node tree (unique ids, names), components of known types (engine built-ins from
  runtime/components.json, or script components the project's scripts register), prop types for built-ins
- scripts: must register their components with WebEngine.script("Name", …) (syntax is checked in the browser /
  by the JS test runner, since Python does not parse JS)
- data (assets/**/*.json): valid JSON; if <name>.schema.json is beside it, types and ranges it describes
Every error says where: <file> › <node path> › <component>.<prop>.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from . import store

RUNTIME = store.ROOT / "runtime"
TYPES = {"number": (int, float), "text": (str,), "bool": (bool,), "color": (str,), "list": (list,), "json": (object,), "asset": (str,), "node": (str,)}


def builtins() -> dict:
    f = RUNTIME / "components.json"
    return json.loads(f.read_text(encoding="utf-8")) if f.is_file() else {}


def engine_modules() -> list[str]:
    return sorted(p.stem for p in RUNTIME.glob("*.js") if p.stem != "core") + ["core"]


SCRIPT_DEF = re.compile(r"""WebEngine\.script\(\s*["']([\w가-힣]+)["']""")


def script_components(pid: str, extra: dict | None = None) -> set:
    """Component names registered by the project's scripts (extra = scripts being saved right now)."""
    names = set()
    texts = {f["path"]: store.read(pid, f["path"]) for f in store.files(pid) if f["kind"] == "script"}
    texts.update(extra or {})
    for t in texts.values():
        names |= set(SCRIPT_DEF.findall(t or ""))
    return names


def check_project(data, pid: str) -> list[str]:
    errs = []
    if not isinstance(data, dict):
        return ["project.json: 항목이어야 함"]
    if not str(data.get("name") or "").strip():
        errs.append("project.json › name: 필수")
    scenes = {f["path"][7:-5] for f in store.files(pid) if f["kind"] == "scene"}
    if data.get("start") not in scenes:
        errs.append(f"project.json › start: 없는 씬 '{data.get('start')}' (있는 씬: {sorted(scenes)})")
    unknown = [m for m in data.get("modules") or [] if m not in engine_modules()]
    if unknown:
        errs.append(f"project.json › modules: 없는 엔진 모듈 {unknown} (있는 것: {engine_modules()})")
    bad_vars = vars_problems(data.get("vars"))
    errs += bad_vars
    if not bad_vars and data.get("vars") != (store.read(pid, "project.json") or {}).get("vars"):
        # changing the names must not break a condition already saved (ENGINE-004)
        for f in store.files(pid):
            if f["kind"] == "asset" and f["path"].endswith(".json") and not f["path"].endswith(".schema.json"):
                errs += [f"{e} — project.json의 조건 이름을 바꾸면 깨짐" for e in check_data(store.read(pid, f["path"]), f["path"], pid, data.get("vars"))]
    return errs


def check_scene(data, rel: str, pid: str, extra_scripts: dict | None = None) -> list[str]:
    errs = []
    if not isinstance(data, dict) or not isinstance(data.get("nodes"), list):
        return [f"{rel}: {{name, nodes:[…]}} 모양이어야 함"]
    if not str(data.get("name") or "").strip():
        errs.append(f"{rel} › name: 필수")
    known = builtins()
    scripts = script_components(pid, extra_scripts)
    seen = set()

    def walk(nodes, path):
        for i, n in enumerate(nodes):
            where = f"{rel} › {path}{(n.get('name') if isinstance(n, dict) else None) or f'[{i}]'}"
            if not isinstance(n, dict):
                errs.append(f"{where}: 노드는 항목이어야 함")
                continue
            if not str(n.get("name") or "").strip():
                errs.append(f"{where}: 이름(name)이 필요함")
            nid = n.get("id")
            if nid is not None:
                if nid in seen:
                    errs.append(f"{where}: 같은 id '{nid}'가 둘 있음")
                seen.add(nid)
            for c in n.get("components") or []:
                t = c.get("type") if isinstance(c, dict) else None
                cw = f"{where} › {t}"
                if t in known:
                    for k, v in (c.get("props") or {}).items():
                        spec = known[t]["props"].get(k)
                        if spec is None:
                            errs.append(f"{cw}.{k}: 이 컴포넌트에 없는 속성")
                        elif v is not None and not isinstance(v, TYPES.get(spec.get("type"), (object,))) or (spec.get("type") == "number" and isinstance(v, bool)):
                            errs.append(f"{cw}.{k}: {spec.get('type')} 형식이어야 함")
                        elif spec.get("type") == "number" and v is not None and ("min" in spec and v < spec["min"] or "max" in spec and v > spec["max"]):
                            errs.append(f"{cw}.{k}: {spec.get('min', '')}~{spec.get('max', '')} 범위여야 함 (지금 {v})")
                elif t not in scripts:
                    errs.append(f"{cw}: 없는 컴포넌트 (엔진 내장도, 프로젝트 스크립트에 등록된 것도 아님)")
            walk(n.get("children") or [], f"{path}{n.get('name')}/")
    walk(data["nodes"], "")
    return errs


def check_script(text, rel: str) -> list[str]:
    if not isinstance(text, str):
        return [f"{rel}: 글이어야 함"]
    return []


# ---- data files: assets/**/*.json, described by an optional <name>.schema.json beside them ----
# The schema is a small part of JSON Schema (type, title, description, unit, minimum, maximum, enum, properties,
# required, additionalProperties, items, minItems, maxItems, maxLength, pattern). The editor draws its data form from the same file.
JTYPES = {"object": dict, "array": list, "string": str, "boolean": bool}


def _decode(content) -> tuple:
    import base64
    try:
        return json.loads(base64.b64decode(content).decode("utf-8-sig")), None
    except Exception as e:      # noqa: BLE001 — any decode/parse failure is reported to the author
        return None, str(e)


COND_FORMS = {"all", "any", "not", "has", "is", "cmp"}
# ENGINE-004: the names a game declares for its conditions (project.json "vars"), the same rules as runtime/cond.js
VAR_KINDS = {"number": "수", "bool": "예/아니오", "text": "글", "any": "아무거나"}
VAR_NAME = re.compile(r"[\w가-힣]+(\.[\w가-힣]+)*(\.\*)?")


def vars_problems(v) -> list[str]:
    if v is None:
        return []
    if not isinstance(v, dict):
        return ["project.json › vars: {\"이름\": \"종류\"} 묶음이어야 함"]
    return [f"project.json › vars › {k}: 이름은 글자·숫자와 점(.)으로, 묶음은 끝에 .* (예: fact.*)" for k in v if not VAR_NAME.fullmatch(k)] \
        + [f"project.json › vars › {k}: 종류는 {', '.join(VAR_KINDS)} 중 하나 (지금 {t!r})" for k, t in v.items() if t not in VAR_KINDS]


def _var_kind(path: str, vars: dict):
    if path in vars:
        return vars[path]
    groups = sorted((k for k in vars if k.endswith(".*") and path.startswith(k[:-1]) and len(path) > len(k) - 1), key=len, reverse=True)
    return vars[groups[0]] if groups else None


def _name_problems(k, v, where, vars) -> list[str]:
    path = v if k == "has" else v[0]
    kind = _var_kind(path, vars)
    if kind is None:
        return [f"{where}.{k}: 선언되지 않은 이름 '{path}' (⚙ 게임 설정 › 조건에 쓰는 이름)"]
    if k == "cmp" and kind not in ("number", "any"):
        return [f"{where}.cmp: '{path}'은(는) {VAR_KINDS.get(kind, kind)}라 크기를 비교할 수 없음"]
    ok = {"number": lambda x: isinstance(x, (int, float)) and not isinstance(x, bool), "bool": lambda x: isinstance(x, bool),
          "text": lambda x: isinstance(x, str)}.get(kind, lambda x: True)
    if k == "is" and not ok(v[1]):
        return [f"{where}.is: '{path}'은(는) {VAR_KINDS[kind]}인데 값이 {json.dumps(v[1], ensure_ascii=False)}"]
    return []
COND_OPS = {"<", "<=", ">", ">=", "==", "!="}


def cond_problems(c, where: str, vars: dict | None = None) -> list[str]:
    """The engine's condition form (runtime/cond.js) checked on the server: data saved by any path keeps valid conditions.
    With vars (the game's declared names), every path must be declared and fit its kind."""
    bad = _form_problems(c, where)
    if bad or not isinstance(vars, dict) or not vars:
        return bad

    def walk(x, w):
        if not isinstance(x, dict):
            return []
        k, v = next(iter(x.items()))
        if k in ("all", "any"):
            return [e for i, y in enumerate(v) for e in walk(y, f"{w}.{k}[{i}]")]
        if k == "not":
            return walk(v, f"{w}.not")
        return _name_problems(k, v, w, vars)
    return walk(c, where)


def _form_problems(c, where: str) -> list[str]:
    if c is None or c is True or c is False:
        return []
    if not isinstance(c, dict) or len(c) != 1 or next(iter(c)) not in COND_FORMS:
        return [f"{where}: 모르는 조건 {str(c)[:60]} (all·any·not·has·is·cmp)"]
    k, v = next(iter(c.items()))
    if k in ("all", "any"):
        return [e for i, x in enumerate(v) for e in _form_problems(x, f"{where}.{k}[{i}]")] if isinstance(v, list) else [f"{where}.{k}: 목록이어야 함"]
    if k == "not":
        return _form_problems(v, f"{where}.not")
    if k == "has":
        return [] if isinstance(v, str) and v else [f"{where}.has: 경로 글이어야 함"]
    if k == "is":
        return [] if isinstance(v, list) and len(v) == 2 and isinstance(v[0], str) else [f'{where}.is: ["경로", 값]']
    return [] if isinstance(v, list) and len(v) == 3 and isinstance(v[0], str) and v[1] in COND_OPS and isinstance(v[2], (int, float)) and not isinstance(v[2], bool) else [f'{where}.cmp: ["경로", 비교, 수]']


def validate(v, s: dict, where: str, errs: list, vars: dict | None = None):
    if not isinstance(s, dict):
        return
    if s.get("format") == "condition":
        name = s.get("title")
        errs.extend(cond_problems(v, f"{where} ({name})" if name else where, vars))
        return
    t, name = s.get("type"), s.get("title") or ""
    w = f"{where}{f' ({name})' if name else ''}"
    if t in ("number", "integer"):
        if isinstance(v, bool) or not isinstance(v, (int, float)) or (t == "integer" and not float(v).is_integer()):
            errs.append(f"{w}: {'정수' if t == 'integer' else '숫자'}여야 함")
            return
        if "minimum" in s and v < s["minimum"]:
            errs.append(f"{w}: {s['minimum']} 이상이어야 함 (지금 {v})")
        if "maximum" in s and v > s["maximum"]:
            errs.append(f"{w}: {s['maximum']} 이하여야 함 (지금 {v})")
    elif t in JTYPES and not isinstance(v, JTYPES[t]):
        errs.append(f"{w}: {dict(object='항목 묶음', array='목록', string='글', boolean='예/아니오')[t]}이어야 함")
        return
    if "enum" in s and v not in s["enum"]:
        errs.append(f"{w}: {s['enum']} 중 하나여야 함")
    if isinstance(v, str):
        if "maxLength" in s and len(v) > s["maxLength"]:
            errs.append(f"{w}: {s['maxLength']}자 이하여야 함 (지금 {len(v)}자)")
        if "pattern" in s and not re.search(s["pattern"], v):
            errs.append(f"{w}: 형식이 맞지 않음 ({s['pattern']}) — 지금 '{v[:30]}'")
    if isinstance(v, dict):
        props = s.get("properties") or {}
        for k in s.get("required") or []:
            if k not in v:
                errs.append(f"{where} › {k}: 필요함")
        for k, x in v.items():
            sub = props.get(k, s.get("additionalProperties"))
            validate(x, sub, f"{where} › {k}", errs, vars)
    if isinstance(v, list):
        if len(v) < s.get("minItems", 0):
            errs.append(f"{w}: 적어도 {s['minItems']}개 필요함")
        if "maxItems" in s and len(v) > s["maxItems"]:
            errs.append(f"{w}: {s['maxItems']}개 이하여야 함 (지금 {len(v)}개)")
        for i, x in enumerate(v):
            validate(x, s.get("items"), f"{where} › {i + 1}번째", errs, vars)


def check_data(content, rel: str, pid: str, vars="project") -> list[str]:
    """vars: the declared condition names — by default read from the project's saved project.json."""
    if not rel.endswith(".json"):
        return []
    data, err = _decode(content)
    if err:
        return [f"{rel}: JSON으로 읽을 수 없음 — {err}"]
    if rel.endswith(".schema.json"):
        return []
    sp = rel[:-5] + ".schema.json"
    if not any(f["path"] == sp for f in store.files(pid)):
        return []
    schema, err = _decode(store.read(pid, sp))
    if err:
        return [f"{sp}: JSON으로 읽을 수 없음 — {err}"]
    if vars == "project":
        vars = (store.read(pid, "project.json") or {}).get("vars")
    errs = []
    validate(data, schema, rel, errs, vars)
    return errs


def checker(pid: str):
    """For store.write: check(kind, rel, content) → errors."""
    def check(kind, rel, content):
        if kind == "asset":
            return check_data(content, rel, pid)
        if kind == "project":
            return check_project(content, pid)
        if kind == "scene":
            return check_scene(content, rel, pid)
        if kind == "script":
            return check_script(content, rel)
        if kind == "test":         # a screen test: {"steps": [...]} (ENGINE-003 — saved through the engine like the rest)
            return [] if isinstance(content, dict) and isinstance(content.get("steps"), list) and all(isinstance(s, dict) and s.get("do") for s in content["steps"]) \
                else [f"{rel}: 시험은 {{\"steps\": [{{\"do\": …}}]}} 모양이어야 함"]
        if kind == "prefab":       # a prefab is one object (with what is inside it), checked like a scene's object
            return check_scene({"name": rel, "nodes": [content]}, rel, pid) if isinstance(content, dict) else [f"{rel}: 오브젝트 하나여야 함"]
        return []
    return check


def integrity_errors(pid: str) -> list[str]:
    """Files changed outside the engine's save path (ENGINE-003) — part of the project check."""
    from . import boundary
    r = boundary.integrity(pid)
    return [f"{rel}: 엔진 경로 밖에서 바뀜 (python tool.py integrity)" for rel in r["changed"]] \
        + [f"{rel}: 저장 기록에는 있는데 파일이 없음" for rel in r["missing"]] \
        + [f"{rel}: 엔진 경로로 저장한 기록도 Git 사본도 없음 (엔진으로 다시 저장하거나 지우기)" for rel in r["unknown"]]


def check_all(pid: str) -> list[str]:
    errs = []
    for f in store.files(pid):
        content = store.read(pid, f["path"])
        errs += checker(pid)(f["kind"], f["path"], content)
    return errs
