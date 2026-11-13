"""Runs the room screen test: a play server for the engine's sample board (editor/ui_cases/room_demo) on a free port, a
headless browser on /roomtest?auto=1 (eight seats on one page, driven through the real buttons — editor/roomtest.html),
and the result the page sends back. Nothing is left behind: the rooms live in memory, the browser profile is temporary."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import threading
import time
from http.server import ThreadingHTTPServer

from . import play, uitest


def run(budget: int = 150, timescale: float = 10) -> dict:
    exe = uitest.browser()
    if not exe:
        return {"ok": False, "error": uitest.not_found()}
    game = play.ROOT / "editor" / "ui_cases" / "room_demo"
    logs: list[str] = []
    host = play.Host(game, ["--timescale", str(timescale)], logs.append)
    if not host.info.get("ready") or not host.info.get("rules"):
        host.stop()
        return {"ok": False, "error": "서버에서 본보기 판의 규칙을 돌릴 수 없음: " + " / ".join(host.info.get("errors") or [])}
    was = play.TEST_PAGE
    play.TEST_PAGE = True
    play.TEST_RESULT.clear()
    srv = ThreadingHTTPServer(("127.0.0.1", 0), play.make_handler(game, host))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    res: dict = {"ok": False, "error": "결과가 오지 않음 (시간 초과)"}
    try:
        # the browser's helper processes may still write for a moment after it ends: cleanup must not fail the test
        with tempfile.TemporaryDirectory(prefix="webengine-browser-", ignore_cleanup_errors=True) as profile:
            p = subprocess.Popen([*uitest.flags(exe), f"--user-data-dir={profile}", "--window-size=1600,900",
                                  f"http://127.0.0.1:{srv.server_address[1]}/roomtest?auto=1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                if play.TEST_DONE.wait(budget):
                    res = dict(play.TEST_RESULT)
            finally:
                p.terminate()
                try:
                    p.wait(10)
                except subprocess.TimeoutExpired:
                    p.kill()
                    p.wait(10)
                for _ in range(20):                       # leave nothing behind (tool.py test counts leftovers)
                    shutil.rmtree(profile, ignore_errors=True)
                    if not os.path.exists(profile):
                        break
                    time.sleep(0.25)
    finally:
        play.TEST_DONE.clear()
        play.TEST_PAGE = was
        srv.shutdown()
        srv.server_close()
        host.stop()
    res["server_log"] = logs
    return res
