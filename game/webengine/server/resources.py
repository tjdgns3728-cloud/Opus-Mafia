"""Resource lifecycle for long automatic development: what the engine and its tests leave on disk, and the rules for
keeping it bounded. Common to every game (nothing here knows a game).

Kinds of generated files (each with an owner, a rule and whether it can come back):
  history       <game>/history/<file>/<stamp>   save backups (store.write) — keep the newest N per file and all newer than D days
  trash         <games>/.trash/<id>_<stamp>     projects deleted by a person — keep D days
  test-sandbox  <games>/_uitest_*               copy of a game a screen test ran in (marker .uitest.json) — removed after the test;
                                                a leftover of a crashed run is removed when older than the temp rule
  evidence      logs/test-evidence/<run>        the least needed to reproduce a failed test — keep the newest N, each ≤ max KB
  temp          <system temp>/webengine-*        temporary folders of the engine and its unit tests — removed when older than H hours
  draft-state   logs/draft_*.json               resume state of an authoring run — removed when older than D days
  logs          logs/ai_calls.jsonl             the AI cost record (estimates learn from it) — never removed, only reported
  review        anything big and unknown at the top of the games folder (zip, old folders) — only reported, a person decides

Never touched: a game's project.json, scenes/, scripts/, assets/ (approved content), tests/, docs/, library/, the engine's code,
and the newest backup of every file. `plan()` only lists; `apply()` deletes only the listed items of the kinds asked for.
Rules: engine.json "보관" (a person tunes them; units in the names)."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from . import store

DEFAULTS = {"백업_파일당_최소": 10, "백업_보관일": 14, "휴지통_보관일": 14, "임시_보관시간": 24, "시험증거_개수": 10, "시험증거_최대KB": 512,
            "초안상태_보관일": 7, "경고_MB": 200}
SANDBOX_PREFIX, SANDBOX_MARK = "_uitest_", ".uitest.json"
TEMP_PREFIX = "webengine-"
PROTECTED_TOP = {"project.json", "scenes", "scripts", "assets", "tests", "docs", "library", "prefabs"}


def rules() -> dict:
    cfg = store.ROOT / "engine.json"
    s = json.loads(cfg.read_text(encoding="utf-8-sig")).get("보관", {}) if cfg.is_file() else {}
    return {**DEFAULTS, **s}


def evidence_dir() -> Path:
    return store.ROOT / "logs" / "test-evidence"


def temp_root() -> Path:
    return Path(tempfile.gettempdir())


def size_of(p: Path) -> int:
    if p.is_file():
        return p.stat().st_size
    return sum(f.stat().st_size for f in p.rglob("*") if f.is_file()) if p.is_dir() else 0


def _age_days(p: Path) -> float:
    return (time.time() - p.stat().st_mtime) / 86400


def _tracked(paths: list[Path]) -> set[str]:
    """Paths git already keeps (so a deleted copy can come back from git)."""
    try:
        top = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=store.projects_dir(), capture_output=True, text=True, timeout=20)
        if top.returncode:
            return set()
        root = Path(top.stdout.strip())
        out = subprocess.run(["git", "ls-files"], cwd=root, capture_output=True, text=True, encoding="utf-8", timeout=60)
        return {str((root / x).resolve()) for x in out.stdout.splitlines()}
    except (OSError, subprocess.SubprocessError):
        return set()


def protected(p: Path) -> bool:
    """True for anything that must never be deleted by the cleaner (sources, approved content, engine code)."""
    p = p.resolve()
    games = store.projects_dir().resolve()
    if store.ROOT.resolve() in p.parents or p == store.ROOT.resolve():
        rel = p.relative_to(store.ROOT.resolve()).parts
        return not (rel and rel[0] == "logs" and (len(rel) > 1 and (rel[1] == "test-evidence" or rel[1].startswith("draft_"))))
    if games in p.parents:
        rel = p.relative_to(games).parts
        if rel[0] in (".trash",) or rel[0].startswith(SANDBOX_PREFIX):
            return False
        if len(rel) >= 2 and rel[1] == "history":
            return False
        if len(rel) >= 2 and rel[1] == "assets" and len(rel) >= 3 and rel[2] == "drafts":
            return True                     # drafts are reported, never auto-deleted
        return True
    return temp_root().resolve() not in p.parents


def _item(kind, path: Path, action, reason, recover, size=None) -> dict:
    return {"kind": kind, "path": str(path), "bytes": size_of(path) if size is None else size, "action": action, "reason": reason, "recover": recover}


def _history_items(games: Path, R: dict, tracked: set) -> list[dict]:
    out = []
    for h in sorted(games.glob("*/history")):
        files: dict[Path, list[Path]] = {}
        for b in h.rglob("*"):
            if b.is_file() and b.name != "log.jsonl":
                files.setdefault(b.parent, []).append(b)
        for d, bs in files.items():
            bs.sort(key=lambda x: x.name, reverse=True)           # stamps sort by time
            for i, b in enumerate(bs):
                if i < R["백업_파일당_최소"] or _age_days(b) < R["백업_보관일"]:
                    continue
                src = h.parent / d.relative_to(h)
                rec = "git에 기록된 판으로 되돌릴 수 있음 (이 백업 시점 그대로는 아님)" if str(src.resolve()) in tracked else "더 새 백업이 남음 · 이 시점으로는 복구 불가"
                out.append(_item("history", b, "delete", f"파일마다 최신 {R['백업_파일당_최소']}개 넘고 {R['백업_보관일']}일 지남", rec))
    return out


def plan() -> dict:
    """Everything generated, grouped, with what the rules would remove. Nothing is deleted."""
    R, games, items = rules(), store.projects_dir(), []
    tracked = _tracked([])
    items += _history_items(games, R, tracked)
    trash = games / ".trash"
    for t in sorted(trash.iterdir()) if trash.is_dir() else []:
        old = _age_days(t) >= R["휴지통_보관일"]
        items.append(_item("trash", t, "delete" if old else "keep", f"휴지통 {R['휴지통_보관일']}일 {'지남' if old else '안 지남'}", "복구 불가 (휴지통이 마지막 사본)"))
    for s in sorted(games.glob(SANDBOX_PREFIX + "*")):
        if (s / SANDBOX_MARK).is_file():
            stale = _age_days(s) * 24 >= 1
            items.append(_item("test-sandbox", s, "delete" if stale else "keep", "끝나지 못한 화면 시험의 복사본" if stale else "진행 중인 화면 시험", "원본 게임은 그대로라 필요 없음"))
    ev, seen = sorted(evidence_dir().iterdir(), reverse=True) if evidence_dir().is_dir() else [], set()
    for i, e in enumerate(ev):
        test = e.name.split("_", 1)[-1]
        keep = i < R["시험증거_개수"] or test not in seen
        seen.add(test)
        items.append(_item("evidence", e, "keep" if keep else "delete", f"실패 증거: 최신 {R['시험증거_개수']}개 또는 그 시험의 마지막 것" if keep else "실패 증거 최신 N개 밖 (같은 시험의 더 새 증거가 있음)", "복구 불가 (재현 정보)"))
    for t in sorted(temp_root().glob(TEMP_PREFIX + "*")):
        try:
            old = _age_days(t) * 24 >= R["임시_보관시간"]
        except OSError:
            continue
        items.append(_item("temp", t, "delete" if old else "keep", f"엔진·시험의 임시 폴더, {R['임시_보관시간']}시간 {'지남' if old else '안 지남'}", "필요 없음 (실행이 끝난 임시 자료)"))
    for d in sorted((store.ROOT / "logs").glob("draft_*.json")):
        old = _age_days(d) >= R["초안상태_보관일"]
        items.append(_item("draft-state", d, "delete" if old else "keep", f"제작 AI 이어하기 상태, {R['초안상태_보관일']}일 {'지남' if old else '안 지남'}", "끊긴 제작을 이어할 수 없게 됨"))
    for lg in sorted((store.ROOT / "logs").glob("*.jsonl")):
        items.append(_item("logs", lg, "keep", "AI 비용 기록 — 예상 비용이 여기서 배운다", "지우지 않음"))
    known = {p.name for p in games.glob("*/project.json") for p in [p.parent]} | {".trash", ".active"}
    for x in sorted(games.iterdir()) if games.is_dir() else []:
        if x.name not in known and not x.name.startswith((SANDBOX_PREFIX, ".git")):
            items.append(_item("review", x, "review", "게임 폴더에 있는 프로젝트가 아닌 것", "사람이 판단 (git 기록 여부: " + ("있음" if str(x.resolve()) in tracked else "없음") + ")"))
    for g in sorted(x for x in games.glob("*/assets/drafts") if not x.parent.parent.name.startswith(SANDBOX_PREFIX)):
        items.append(_item("review", g, "review", "제작 AI 초안 — 적용한 것만 assets/data에 남음", "사람이 판단"))
    totals: dict[str, dict] = {}
    for it in items:
        t = totals.setdefault(it["kind"], {"count": 0, "bytes": 0, "delete_count": 0, "delete_bytes": 0})
        t["count"] += 1; t["bytes"] += it["bytes"]
        if it["action"] == "delete":
            t["delete_count"] += 1; t["delete_bytes"] += it["bytes"]
    total = sum(t["bytes"] for t in totals.values())
    return {"rules": R, "items": items, "totals": totals, "bytes": total, "delete_bytes": sum(t["delete_bytes"] for t in totals.values()),
            "warn": total > R["경고_MB"] * 1024 * 1024}


def _remove(p: Path) -> int:
    if protected(p):
        raise PermissionError(f"보호된 경로라 지우지 않음: {p}")
    n = size_of(p)
    if p.is_dir():
        shutil.rmtree(p, ignore_errors=True)
    elif p.exists():
        p.unlink()
    return n - size_of(p)


def apply(kinds: list[str], p: dict | None = None) -> dict:
    """Deletes the items the plan marks 'delete', only of the given kinds. Writes what it did to logs/cleanup.jsonl."""
    p = p or plan()
    done, freed, failed = [], 0, []
    for it in p["items"]:
        if it["action"] != "delete" or it["kind"] not in kinds:
            continue
        try:
            n = _remove(Path(it["path"])); freed += n; done.append({**it, "freed": n})
        except OSError as e:
            failed.append({**it, "error": str(e)})
    log = store.ROOT / "logs" / "cleanup.jsonl"
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"time": time.strftime("%Y-%m-%dT%H:%M:%S"), "kinds": kinds, "count": len(done), "freed": freed, "failed": len(failed)}, ensure_ascii=False) + "\n")
    return {"deleted": done, "freed": freed, "failed": failed}


# ---------------- screen-test sandbox and failure evidence ----------------
SKIP = {"history", "library", ".git"}


def make_sandbox(pid: str, name: str) -> str:
    """A copy of the game for one screen test (without its backups and AI library), marked so only it can be removed."""
    src = store.folder(pid)
    sid = f"{SANDBOX_PREFIX}{time.strftime('%Y%m%d%H%M%S')}{time.time_ns() % 1000:03d}"
    dest = store.projects_dir() / sid
    shutil.copytree(src, dest, ignore=lambda d, names: [n for n in names if n in SKIP and Path(d) == src])
    (dest / SANDBOX_MARK).write_text(json.dumps({"from": pid, "test": name, "time": time.strftime("%Y-%m-%dT%H:%M:%S")}, ensure_ascii=False), encoding="utf-8")
    return sid


def remove_sandbox(sid: str) -> int:
    d = store.projects_dir() / sid
    if not sid.startswith(SANDBOX_PREFIX) or not (d / SANDBOX_MARK).is_file():
        raise PermissionError(f"시험 복사본이 아님: {sid}")
    n = size_of(d)
    shutil.rmtree(d, ignore_errors=True)
    return n - size_of(d)


def remove_made(pid: str) -> int:
    """A project a test created (it did not exist before the test): removed for good, not to the trash."""
    d = store.projects_dir() / pid
    n = size_of(d)
    shutil.rmtree(d, ignore_errors=True)
    return n - size_of(d)


def _digest(d: Path) -> dict[str, bytes]:
    out = {}
    for f in d.rglob("*"):
        rel = f.relative_to(d)
        if f.is_file() and rel.parts[0] not in SKIP and f.name != SANDBOX_MARK:
            out[rel.as_posix()] = f.read_bytes()
    return out


def changed_files(original: Path, sandbox: Path) -> dict[str, list[str]]:
    a, b = _digest(original), _digest(sandbox)
    return {"changed": sorted(k for k in a.keys() & b.keys() if a[k] != b[k]), "added": sorted(b.keys() - a.keys()), "removed": sorted(a.keys() - b.keys())}


def save_evidence(name: str, result: dict, original: Path | None, sandbox: Path | None, made: list[str]) -> dict:
    """The least needed to reproduce a failure: the result (failed step, log, console), the list of files the test
    changed and their new content (small ones), and the projects it made. Capped in size; old evidence pruned."""
    R = rules()
    cap = R["시험증거_최대KB"] * 1024
    run = evidence_dir() / f"{time.strftime('%Y%m%d-%H%M%S')}-{time.time_ns() % 1_000_000:06d}_{name}"
    run.mkdir(parents=True, exist_ok=True)
    used = 0

    def put(rel: str, data: bytes) -> bool:
        nonlocal used
        if used + len(data) > cap:
            return False
        (run / rel).parent.mkdir(parents=True, exist_ok=True)
        (run / rel).write_bytes(data); used += len(data)
        return True

    # the result comes first and is always kept: the log and console tail shrink until it fits half the cap
    summary = {k: result.get(k) for k in ("ok", "scenario", "done", "total", "failed", "error")}
    n_log, n_con = 60, 4000
    while True:
        body = json.dumps({**summary, "log": (result.get("log") or [])[-n_log:], "console": (result.get("console") or "")[-n_con:]}, ensure_ascii=False, indent=1).encode("utf-8")
        if len(body) <= cap // 2 or (n_log == 0 and n_con == 0):
            break
        n_log, n_con = n_log // 2, n_con // 2
    body = body[:cap // 2] if len(body) > cap // 2 else body
    put("result.json", body)
    skipped = []
    if original and sandbox and sandbox.is_dir():
        diff = changed_files(original, sandbox)
        put("changed.json", json.dumps(diff, ensure_ascii=False, indent=1).encode("utf-8"))
        for rel in diff["changed"] + diff["added"]:
            if not put("files/" + rel, (sandbox / rel).read_bytes()):
                skipped.append(rel)
    for pid in made:
        d = store.projects_dir() / pid
        for f in sorted(d.rglob("*")) if d.is_dir() else []:
            rel = f.relative_to(d)
            if f.is_file() and rel.parts[0] not in SKIP and not put(f"made/{pid}/{rel.as_posix()}", f.read_bytes()):
                skipped.append(f"{pid}/{rel.as_posix()}")
    if skipped:
        put("skipped.json", json.dumps(skipped, ensure_ascii=False).encode("utf-8"))
    pruned = 0
    # keep the newest N, and always the newest one of each test (one test failing again and again must not wipe out
    # the evidence of another)
    runs, seen, old = sorted(evidence_dir().iterdir(), reverse=True), set(), []
    for i, o in enumerate(runs):
        test = o.name.split("_", 1)[-1]
        if i >= R["시험증거_개수"] and test in seen:
            old.append(o)
        seen.add(test)
    for o in old:                       # test-made, so pruned automatically
        pruned += size_of(o); shutil.rmtree(o, ignore_errors=True)
    return {"path": str(run), "bytes": size_of(run), "skipped": len(skipped), "pruned_bytes": pruned}


def sweep_stale_sandboxes() -> int:
    """Copies left by a screen test that never finished (server stopped mid-test): removed when older than an hour."""
    freed = 0
    for s in store.projects_dir().glob(SANDBOX_PREFIX + "*"):
        if (s / SANDBOX_MARK).is_file() and _age_days(s) * 24 >= 1:
            freed += remove_sandbox(s.name)
    return freed
