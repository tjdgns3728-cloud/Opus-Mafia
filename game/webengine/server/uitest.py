"""Runs an interface test: a headless browser opens the editor with ?uitest=<name> (editor/uitest.js drives the real
buttons), and the result is read back.

Lifecycle (server/resources.py): the test runs in a copy of the open game (without its backups and AI library), so a
test — even one that fails half-way — never changes the real game. After a passing test the copy and every project the
test made are removed for good; after a failing one only the least evidence is kept (logs/test-evidence, capped).
keep=True keeps the copy and the made projects. The result tells how much was made and removed ("storage")."""

from __future__ import annotations

import html
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from . import store

EDGES = [Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"), Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe")]
CHROMES = [Path("/opt/pw-browsers/chromium"), Path("/usr/bin/chromium"), Path("/usr/bin/chromium-browser"), Path("/usr/bin/google-chrome"),
           Path("/usr/bin/google-chrome-stable"), Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
           Path("/Applications/Chromium.app/Contents/MacOS/Chromium")]
PW_BROWSERS = Path("/opt/pw-browsers")        # Playwright's Chromium (chromium-<build>/chrome-linux*/chrome), newest build first
ON_PATH = ("chromium", "chromium-browser", "google-chrome")
ENV = "WEBENGINE_BROWSER"                     # a browser chosen by hand (a path, or a name on PATH) — tried before all others


def _build(chrome: Path) -> int:
    n = chrome.parts[-3].rsplit("-", 1)[-1]               # chromium-1243/chrome-linux64/chrome → 1243 (as a number: 999 < 1243)
    return int(n) if n.isdigit() else -1


def candidates() -> list[tuple[str, Path | None]]:
    """Where a headless browser is looked for, in order: WEBENGINE_BROWSER → Edge (Windows) → known Chromium/Chrome
    paths → chromium/chromium-browser/google-chrome on PATH. Each entry is (what was searched, the file or None)."""
    out: list[tuple[str, Path | None]] = []
    want = os.environ.get(ENV, "").strip()
    if want:
        hit = Path(want) if Path(want).is_file() else (Path(w) if (w := shutil.which(want)) else None)
        out.append((f"{ENV}={want}", hit))
    out += [(str(e), e) for e in EDGES]
    pattern = "chromium-*/chrome-linux*/chrome"
    pw = [(str(c), c) for c in sorted(PW_BROWSERS.glob(pattern) if PW_BROWSERS.is_dir() else [], key=_build, reverse=True)]
    out += [(str(CHROMES[0]), CHROMES[0]), *(pw or [(str(PW_BROWSERS / pattern), None)]), *((str(c), c) for c in CHROMES[1:])]
    out += [(f"PATH:{n}", Path(w) if (w := shutil.which(n)) else None) for n in ON_PATH]
    return out


def browser() -> Path | None:
    return next((p for _, p in candidates() if p and p.is_file()), None)


def as_root() -> bool:
    return os.name != "nt" and hasattr(os, "geteuid") and os.geteuid() == 0


def flags(exe: Path) -> list[str]:
    """Headless flags. Chromium refuses to start as root unless its sandbox is off — only then (never on Windows)."""
    # Use the shipped browser settings, not machine-specific field-trial experiments.
    return [str(exe), "--headless=new", "--disable-gpu", "--disable-field-trial-config", *(["--no-sandbox"] if as_root() else [])]


def not_found() -> str:
    return ("헤드리스 브라우저(Edge·Chromium·Chrome)를 찾지 못함 — 찾아본 곳: " + ", ".join(w for w, _ in candidates())
            + f" (다른 브라우저는 환경 변수 {ENV}에 경로를 넣으세요)")


def run(name: str, port: int, keep: bool = False) -> dict:
    edge = browser()
    if not edge:
        return {"ok": False, "error": not_found()}
    from .app import case_file
    case = case_file(f"{name}.json")              # the open game's tests/ first, then the engine's ui_cases
    if not case.is_file():
        return {"ok": False, "error": f"시나리오 없음: {name}"}
    scenario = json.loads(case.read_text(encoding="utf-8"))
    budget = int(scenario.get("budget", 120))
    media = ["--force-prefers-reduced-motion"] if scenario.get("reduced_motion") is True else []
    from . import resources
    was = store.active()
    if was and was.startswith(resources.SANDBOX_PREFIX):          # left active by a run that never finished
        mark = store.projects_dir() / was / resources.SANDBOX_MARK
        was = json.loads(mark.read_text(encoding="utf-8")).get("from") if mark.is_file() else None
    swept = resources.sweep_stale_sandboxes()
    sid = resources.make_sandbox(was, name) if was else None
    made_bytes = resources.size_of(store.projects_dir() / sid) if sid else 0
    before = {p["id"] for p in store.list_projects()}
    try:
        if sid:
            store.set_active(sid)
        # Each run owns a disposable profile: no writes to the user's browser profile (or read-only home).
        with tempfile.TemporaryDirectory(prefix="webengine-browser-") as profile:
            p = subprocess.run([*flags(edge), f"--user-data-dir={profile}", *media,
                                f"--virtual-time-budget={budget * 1000}", "--dump-dom",
                                f"http://127.0.0.1:{port}/?uitest={name}"], capture_output=True, text=True, encoding="utf-8", errors="replace",
                               timeout=max(300, budget * 3))
        m = re.search(r'<pre id="uiResult"[^>]*>(.*?)</pre>', p.stdout or "", re.S)
        try:
            res = json.loads(html.unescape(m.group(1))) if m and m.group(1).strip() else {
                "ok": False, "error": "결과가 없음 (편집기가 멈췄거나 스크립트 오류)",
                "browser_exit": p.returncode, "browser_stderr": (p.stderr or "")[-2000:]}
        except json.JSONDecodeError:
            res = {"ok": False, "error": "결과를 읽지 못함"}
    except subprocess.TimeoutExpired:
        res = {"ok": False, "error": "시간 초과 (브라우저가 끝나지 않음)"}
    except Exception as e:                    # noqa: BLE001 — the browser did not start, or anything else broke: still cleaned up below
        res = {"ok": False, "error": f"화면 시험 중 오류 ({type(e).__name__}): {e}"}
    finally:
        if was and (store.projects_dir() / was / "project.json").is_file():
            store.set_active(was)
    made = [x["id"] for x in store.list_projects() if x["id"] not in before]
    made_bytes += sum(resources.size_of(store.projects_dir() / x) for x in made)
    res["projects"] = made
    storage = {"made_bytes": made_bytes, "removed_bytes": 0, "evidence": None, "stale_removed_bytes": swept, "sandbox": sid}
    if keep:
        storage["kept"] = [sid, *made]
    else:
        if not res.get("ok"):
            try:
                storage["evidence"] = resources.save_evidence(name, res, store.projects_dir() / was if was else None,
                                                              store.projects_dir() / sid if sid else None, made)
            except Exception as e:            # noqa: BLE001 — evidence that cannot be saved must not keep the copy
                storage["evidence"] = {"error": f"증거를 남기지 못함 ({type(e).__name__}): {e}"}
        for pid in made:
            storage["removed_bytes"] += resources.remove_made(pid)
        if sid:
            storage["removed_bytes"] += resources.remove_sandbox(sid)
    res["storage"] = storage
    return res
