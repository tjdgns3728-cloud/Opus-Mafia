"""Engine/game boundary and save-path integrity (ENGINE-003). Generic: it knows no game — it reads each project's own
names (id, script component names, data folder names) and checks that none of them appears in the engine, that the
engine's unit tests do not read the games folder, and that game code never names an AI provider (the engine's policy).
Integrity: store.integrity() with the Git HEAD copy as the baseline for files never saved through the engine."""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

from . import store

ENGINE_CODE = ["server", "runtime", "editor", "tests", "tool.py"]
SKIP = {"__pycache__", "result.json", "components.json"}
GAMES_DIR = re.compile(r"\.\./games|[\"']games/|/\s*[\"']games[\"']")   # the games folder as a path (not the word)
PROVIDERS = re.compile(r"claude-cli|claude-(opus|sonnet|haiku)|codex|anthropic|openai|gpt-\d", re.I)


def _git_root() -> Path | None:
    try:
        r = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=store.projects_dir(), capture_output=True, text=True, timeout=20)
        return Path(r.stdout.strip()) if r.returncode == 0 else None
    except (OSError, subprocess.SubprocessError):
        return None


def git_head_reader(pid: str):
    """rel → True if the file is the same as in Git HEAD (Git's own comparison, so line-ending conversion does not
    count), False if it differs, None if Git does not track it (or there is no Git)."""
    root = _git_root()
    if not root:
        return lambda rel: None
    base = (store.projects_dir() / pid).resolve()

    def read(rel: str):
        try:
            path = (base / rel).relative_to(root.resolve()).as_posix()
        except ValueError:
            return None
        tracked = subprocess.run(["git", "cat-file", "-e", f"HEAD:{path}"], cwd=root, capture_output=True, timeout=30)
        if tracked.returncode != 0:
            return None
        return subprocess.run(["git", "diff", "--quiet", "HEAD", "--", path], cwd=root, capture_output=True, timeout=30).returncode == 0
    return read


def integrity(pid: str) -> dict:
    return store.integrity(pid, git_head_reader(pid))


def game_names(pid: str) -> set[str]:
    """Names that belong to one game: its id, its script component names, its data folder names."""
    base = store.projects_dir() / pid
    names = {pid}
    for f in (base / "scripts").glob("*.js"):
        names.update(re.findall(r'WebEngine\.script\(\s*["\']([^"\']+)', f.read_text(encoding="utf-8")))
    for d in (base / "assets" / "data").glob("*"):
        if d.is_dir():
            names.add(d.name)
    return {n for n in names if len(n) >= 4}


def engine_samples() -> set[str]:
    import json
    cfg = store.ROOT / "engine.json"
    return set(json.loads(cfg.read_text(encoding="utf-8-sig")).get("경계_제외") or []) if cfg.is_file() else set()


def scan(engine_root: Path | None = None) -> dict:
    """Boundary violations. engine_root lets a test scan a copy."""
    root = engine_root or store.ROOT
    problems = []
    projects = [p.parent.name for p in store.projects_dir().glob("*/project.json") if not p.parent.name.startswith("_uitest_")]
    # the engine's own sample projects are listed in engine.json ("경계_제외") — a game cannot exempt itself
    games = [pid for pid in projects if pid not in engine_samples()]
    if not any((root / part).exists() for part in ENGINE_CODE):
        problems.append({"kind": "엔진 폴더가 없음", "file": str(root), "name": "-"})
    names = {n: pid for pid in games for n in game_names(pid)}
    for part in ENGINE_CODE:
        target = root / part
        for f in ([target] if target.is_file() else sorted(target.rglob("*")) if target.is_dir() else []):
            if not f.is_file() or f.suffix not in (".py", ".js", ".html", ".json", ".css") or any(s in f.parts or f.name == s for s in SKIP):
                continue
            text = f.read_text(encoding="utf-8", errors="replace")
            rel = f.relative_to(root).as_posix()
            for n, pid in names.items():
                if n in text:
                    problems.append({"kind": "엔진에 게임 지식", "file": rel, "name": n, "game": pid})
            if rel.startswith("tests/") and f.suffix == ".py" and GAMES_DIR.search(text):
                problems.append({"kind": "엔진 단위 시험이 게임 폴더를 읽음", "file": rel, "name": "games"})
    for pid in projects:
        for f in (store.projects_dir() / pid / "scripts").glob("*.js"):
            m = PROVIDERS.search(f.read_text(encoding="utf-8"))
            if m:
                problems.append({"kind": "게임 코드가 AI 제공자를 앎", "file": f"{pid}/scripts/{f.name}", "name": m.group(0)})
    return {"passed": not problems, "problems": problems, "games": projects, "names": len(names), "excluded": sorted(set(projects) - set(games))}
