"""Project storage: one folder per game. Files are written only through here, so every write is checked, backed
up and logged, and any file can be put back. Paths can never leave the project folder.

  project.json      name, start scene, engine modules, settings
  scenes/<n>.json   a scene: tree of nodes and their components
  scripts/<n>.js    game code (script components)
  assets/<...>      images, sounds, fonts, data
  tests/<n>.json    the game's screen tests (ENGINE-003: also through this path)

Integrity (ENGINE-003): every save logs the sha256 of what was written; integrity() compares the files on disk with the
last logged hash, so a change made outside this path (a script editing the file directly) is found and fails the check."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import shutil
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KINDS = {"project.json": "project", "scenes": "scene", "scripts": "script", "assets": "asset"}


class StoreError(ValueError):
    pass


def projects_dir() -> Path:
    """Where the games live: WEBENGINE_PROJECTS, else engine.json "projects" (relative to the engine folder), else
    projects/ inside the engine. Games are kept outside the engine so each is saved (git) on its own."""
    if os.environ.get("WEBENGINE_PROJECTS"):
        return Path(os.environ["WEBENGINE_PROJECTS"])
    cfg = ROOT / "engine.json"
    if cfg.is_file():
        import json
        p = json.loads(cfg.read_text(encoding="utf-8-sig")).get("projects")
        if p:
            return (ROOT / p).resolve()
    return ROOT / "projects"


def _active_file() -> Path:
    return projects_dir() / ".active"


def folder(pid: str) -> Path:
    f = projects_dir() / pid
    if not re.fullmatch(r"[\w가-힣\-]+", pid or "") or not (f / "project.json").is_file():
        raise StoreError(f"없는 프로젝트: {pid}")
    return f


def kind_of(rel: str) -> str:
    first = rel.split("/")[0]
    if rel == "project.json":
        return "project"
    if first == "scenes" and rel.endswith(".json"):
        return "scene"
    if first == "scripts" and rel.endswith(".js"):
        return "script"
    if first == "prefabs" and rel.endswith(".json"):
        return "prefab"
    if first == "assets":
        return "asset"
    if first == "tests" and rel.endswith(".json") and rel.count("/") == 1:
        return "test"
    raise StoreError(f"여기에는 파일을 둘 수 없음: {rel} (project.json, scenes/*.json, scripts/*.js, prefabs/*.json, assets/…, tests/*.json)")


def resolve(pid: str, rel: str) -> Path:
    rel = rel.replace("\\", "/").strip("/")
    base = folder(pid).resolve()
    p = (base / rel).resolve()
    if base != p and base not in p.parents or "history" in Path(rel).parts or rel.startswith("."):
        raise StoreError(f"프로젝트 밖의 경로: {rel}")
    kind_of(rel)
    return p


# ---------------- projects ----------------
def list_projects() -> list[dict]:
    d = projects_dir()
    return [{**json.loads(p.read_text(encoding="utf-8")), "id": p.parent.name} for p in sorted(d.glob("*/project.json"))] if d.is_dir() else []


def active() -> str | None:
    f = _active_file()
    pid = f.read_text(encoding="utf-8").strip() if f.is_file() else None
    if pid and (projects_dir() / pid / "project.json").is_file():
        return pid
    ps = [x for x in list_projects() if not x["id"].startswith("_uitest_")]      # a screen-test copy is never the default
    return ps[0]["id"] if ps else None


def set_active(pid: str) -> None:
    folder(pid)
    _active_file().write_text(pid, encoding="utf-8")


def create(name: str) -> str:
    """An empty project: one empty scene as the start."""
    base = re.sub(r"[^\w가-힣\-]+", "_", name.strip()).strip("_") or "game"
    pid, n = base, 2
    while (projects_dir() / pid).exists():
        pid, n = f"{base}_{n}", n + 1
    f = projects_dir() / pid
    (f / "scenes").mkdir(parents=True)
    (f / "scripts").mkdir()
    (f / "assets").mkdir()
    (f / "project.json").write_text(json.dumps({"name": name, "start": "main", "modules": [], "created": time.strftime("%Y-%m-%d")},
                                               ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (f / "scenes" / "main.json").write_text(json.dumps({"name": "main", "nodes": []}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for rel in ("project.json", "scenes/main.json"):          # the first files are logged like any save (ENGINE-003 integrity)
        _log(pid, rel, "새 프로젝트", None, _sha(f / rel))
    set_active(pid)
    return pid


def delete(pid: str) -> str:
    src = folder(pid)
    trash = projects_dir() / ".trash"
    trash.mkdir(parents=True, exist_ok=True)
    dest = trash / f"{pid}_{time.strftime('%Y%m%d-%H%M%S')}"
    shutil.move(str(src), dest)
    if _active_file().is_file() and _active_file().read_text(encoding="utf-8").strip() == pid:
        _active_file().unlink()
    return dest.name


# ---------------- files ----------------
def files(pid: str) -> list[dict]:
    base = folder(pid)
    out = []
    for p in sorted(base.rglob("*")):
        rel = p.relative_to(base).as_posix()
        if p.is_file() and not rel.startswith(("history/", ".")):
            try:
                out.append({"path": rel, "kind": kind_of(rel), "size": p.stat().st_size})
            except StoreError:
                continue
    return out


def read(pid: str, rel: str):
    p = resolve(pid, rel)
    if not p.is_file():
        raise StoreError(f"없는 파일: {rel}")
    k = kind_of(rel)
    if k in ("project", "scene", "prefab", "test"):
        return json.loads(p.read_text(encoding="utf-8-sig"))
    if k == "script":
        return p.read_text(encoding="utf-8")
    return base64.b64encode(p.read_bytes()).decode("ascii")


def write(pid: str, rel: str, content, note: str = "", check=None) -> dict:
    """Checks (check(kind, rel, content) → errors), backs up the old file, writes, logs. Nothing is written on errors."""
    p = resolve(pid, rel)
    k = kind_of(rel)
    errors = check(k, rel, content) if check else []
    if errors:
        return {"ok": False, "errors": errors}
    stamp = _backup(pid, rel, p)
    p.parent.mkdir(parents=True, exist_ok=True)
    if k == "test" and not isinstance(content, dict):
        return {"ok": False, "errors": [f"{rel}: 시험 파일은 JSON 묶음이어야 함"]}
    if k in ("project", "scene", "prefab", "test"):
        p.write_text(json.dumps(content, ensure_ascii=False, indent=2 if k != "test" else 1) + "\n", encoding="utf-8")
    elif k == "script":
        p.write_text(content, encoding="utf-8")
    else:
        p.write_bytes(base64.b64decode(content))
    _log(pid, rel, note or "저장", stamp, _sha(p))
    return {"ok": True, "backup": stamp}


def remove(pid: str, rel: str, note: str = "") -> dict:
    p = resolve(pid, rel)
    if rel == "project.json" or not p.is_file():
        raise StoreError(f"지울 수 없음: {rel}")
    stamp = _backup(pid, rel, p)
    p.unlink()
    _log(pid, rel, note or "삭제", stamp, None)
    return {"ok": True, "backup": stamp}


def _backup(pid: str, rel: str, p: Path) -> str | None:
    if not p.is_file():
        return None
    stamp = time.strftime("%Y%m%d-%H%M%S") + f"-{time.time_ns() % 1_000_000:06d}"
    dest = folder(pid) / "history" / rel
    dest.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, dest / stamp)
    return stamp


def _sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def _log(pid: str, rel: str, note: str, stamp, sha="-") -> None:
    log = folder(pid) / "history" / "log.jsonl"
    log.parent.mkdir(parents=True, exist_ok=True)
    row = {"time": time.strftime("%Y-%m-%dT%H:%M:%S"), "path": rel, "note": note, "backup": stamp}
    if sha != "-":
        row["sha256"] = sha                     # None = deleted through this path
    with log.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


# ---------------- integrity (ENGINE-003) ----------------
def integrity(pid: str, git_head=None) -> dict:
    """Compares each managed file with the last hash this module logged for it.
    ok: same · changed: different (written outside the engine) · missing: logged but gone · unknown: never logged with a
    hash and no Git copy — fails too, since nothing shows it came through this path · baseline_git: never logged but the
    same as Git HEAD (git_head(rel) → True / False / None). File times are not evidence (they can be set by hand)."""
    last: dict = {}
    log = folder(pid) / "history" / "log.jsonl"
    for line in (log.read_text(encoding="utf-8").splitlines() if log.is_file() else []):
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        if "sha256" in e:
            last[e["path"]] = e["sha256"]
    out = {"ok": [], "changed": [], "missing": [], "unknown": [], "baseline_git": []}
    base = folder(pid)
    for f in files(pid):
        rel = f["path"]
        h = _sha(base / rel)
        if rel in last:
            (out["ok"] if last[rel] == h else out["changed"]).append(rel)
        else:
            g = git_head(rel) if git_head else None      # True: same as Git HEAD · False: differs · None: not in Git
            if g is True:
                out["baseline_git"].append(rel)
            elif g is False:
                out["changed"].append(rel)
            else:
                out["unknown"].append(rel)
    for rel, h in last.items():
        if h and not (base / rel).is_file():
            out["missing"].append(rel)
    out["passed"] = not out["changed"] and not out["missing"] and not out["unknown"]
    return out


def record_baseline(pid: str, rels: list, note: str) -> None:
    """Logs the current hash of files known to be good (equal to Git HEAD) — no content change, no backup."""
    for rel in rels:
        _log(pid, rel, note, None, _sha(folder(pid) / rel))


def history(pid: str) -> list[dict]:
    """The save log, newest first. A backup removed by the retention rules (server/resources.py) shows as backup None,
    so the editor offers no 'put back' for it."""
    log = folder(pid) / "history" / "log.jsonl"
    rows = [json.loads(x) for x in reversed(log.read_text(encoding="utf-8").splitlines()) if x.strip()] if log.is_file() else []
    for r in rows:
        if r.get("backup") and not (folder(pid) / "history" / r["path"] / r["backup"]).is_file():
            r["backup"], r["pruned"] = None, True
    return rows


def restore(pid: str, rel: str, backup: str, check=None) -> dict:
    """Puts back the file as it was before the save that made `backup` (a deleted file comes back too)."""
    src = folder(pid) / "history" / rel / Path(backup).name
    if not src.is_file():
        return {"ok": False, "errors": ["백업이 없음"]}
    k = kind_of(rel)
    raw = src.read_bytes()
    content = json.loads(raw.decode("utf-8")) if k in ("project", "scene", "prefab", "test") else raw.decode("utf-8") if k == "script" else base64.b64encode(raw).decode("ascii")
    return write(pid, rel, content, f"되돌림: {backup}", check)
