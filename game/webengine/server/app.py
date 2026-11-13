"""Dev server for the AI 웹게임엔진 (standard library only). It only connects HTTP to the other modules:
store (files), check (validation). Writes need the editor's token (kept in webengine/.token).

  python -m server.app            (from webengine/) → http://127.0.0.1:8780 (another port: WEBENGINE_PORT=8781)
"""

from __future__ import annotations

import json
import os
import time
import mimetypes
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from . import check, store

ROOT = store.ROOT
PORT = 8780


def env_port() -> int:
    """WEBENGINE_PORT, else 8780: several servers (one per worktree or agent) can run side by side. tool.py reads the
    same variable, so a command talks to the server started with it. The address stays 127.0.0.1 either way."""
    raw = os.environ.get("WEBENGINE_PORT", "").strip()
    if not raw:
        return 8780
    if not (raw.isascii() and raw.isdigit()) or not 0 < int(raw) < 65536:     # ASCII only: "²" or "٨٧٨١" are digits to isdigit()
        raise ValueError(f"WEBENGINE_PORT 값이 잘못됨: '{raw[:20]}' (1~65535 사이의 숫자)")
    return int(raw)


def token() -> str:
    f = ROOT / ".token"
    if not f.is_file():
        f.write_text(secrets.token_urlsafe(16), encoding="utf-8")
    return f.read_text(encoding="utf-8").strip()


def play_token() -> str:
    """The play screen's key (ENGINE-002 #7): it may ask the AI and use the judgment library, never write files.
    The editor's write key (.token) is only put into the editor page."""
    f = ROOT / ".play_token"
    if not f.is_file() or len(f.read_text(encoding="utf-8").strip()) < 16:
        f.write_text(secrets.token_urlsafe(16), encoding="utf-8")
    return f.read_text(encoding="utf-8").strip()


# Public mode (python -m server.app --public, ENGINE-002 review MAJOR-1): only the play screen and what it needs — no
# editor page (it carries the write key), no editor API. The server, not the page, decides the batch, role and project.
PUBLIC = False
PUBLIC_GET = {"/play", "/api/library", "/api/ai/usage"}


PLAY_PATHS = {"/api/ai", "/api/library", "/api/ai/game"}      # what the play key may do


def _pid(q) -> str:
    pid = (q.get("project") or [None])[0] or store.active()
    if not pid:
        raise store.StoreError("열린 프로젝트가 없음")
    return pid


def _seconds(v) -> float | None:
    """A caller's own time limit for one AI answer (seconds), or None for the engine's."""
    try:
        return float(v) if v and float(v) > 0 else None
    except (TypeError, ValueError):
        return None


def case_file(name: str, q=None) -> Path:
    """An interface-test scenario or its data file: the open game's tests/<name>, else the engine's editor/ui_cases/<name>."""
    name = name.replace("\\", "/").strip("/")
    if not name or ".." in name.split("/"):
        return ROOT / "editor" / "ui_cases" / "_none_"
    try:
        game = store.folder(_pid(q or {})) / "tests" / name
        if game.is_file():
            return game
    except store.StoreError:
        pass
    return ROOT / "editor" / "ui_cases" / name


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, body: bytes, ctype: str, status: int = 200):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def json(self, obj, status: int = 200):
        self.send(json.dumps(obj, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8", status)

    def file(self, p: Path, inject: str = ""):
        if not p.is_file():
            return self.json({"error": "없음"}, 404)
        body = p.read_bytes()
        if inject:
            body = body.replace(b"__TOKEN__", (token() if inject == "editor" else play_token()).encode())
        self.send(body, (mimetypes.guess_type(p.name)[0] or "application/octet-stream") + ("; charset=utf-8" if p.suffix in (".html", ".js", ".json", ".css") else ""))

    def do_GET(self):
        u = urlparse(self.path)
        u = u._replace(path=unquote(u.path))      # Korean file names arrive percent-encoded
        q = parse_qs(u.query)
        try:
            if PUBLIC and not (u.path in PUBLIC_GET or u.path.startswith(("/runtime/", "/project/"))):
                return self.json({"error": "공개 모드: 플레이 화면만"}, 404)
            if u.path in ("/", "/editor"):
                return self.file(ROOT / "editor" / "index.html", inject="editor")
            if u.path == "/play":
                return self.file(ROOT / "editor" / "play.html", inject="play")     # the play key: AI and library only, no writes
            if u.path == "/api/ai/usage":
                from . import ai
                s = (q.get("session") or [""])[0]
                return self.json({"session": s, "spent": ai.spent(s)})
            if u.path == "/api/library":             # a stored AI judgment (the game's library), or null
                from . import library
                value = library.get(_pid(q), (q.get("name") or [""])[0], (q.get("key") or [""])[0])
                from . import ai                        # ENGINE-002 #3·#6: how often a stored judgment saves an AI call
                ai._log({"time": time.strftime("%Y-%m-%dT%H:%M:%S"), "role": "저장소", "purpose": "저장된 판단 " + ("적중" if value is not None else "없음"),
                         "hit": value is not None, "ok": True, "won": 0, **({"session": q["session"][0]} if q.get("session") else {})})
                return self.json({"value": value})
            if u.path == "/api/image/makers":
                from . import image
                return self.json(image.makers())
            if u.path.startswith("/cases/"):          # an interface-test file: the open game's tests/ first, then the engine's
                return self.file(case_file(u.path[len("/cases/"):], q))
            if u.path.startswith(("/runtime/", "/editor/")) and ".." not in u.path:
                return self.file(ROOT / u.path.lstrip("/"))
            if u.path.startswith("/project/"):                     # the open project's files, for the player
                rel = u.path[len("/project/"):]
                return self.file(store.resolve(_pid(q), rel))
            if u.path == "/api/projects":
                return self.json({"projects": store.list_projects(), "active": store.active()})
            if u.path == "/api/files":
                pid = _pid(q)
                return self.json({"project": pid, "meta": store.read(pid, "project.json"), "files": store.files(pid)})
            if u.path == "/api/file":
                pid = _pid(q)
                return self.json({"path": q["path"][0], "content": store.read(pid, q["path"][0])})
            if u.path == "/api/history":
                return self.json({"history": store.history(_pid(q))})
            if u.path == "/api/engine":
                return self.json({"modules": check.engine_modules(), "components": check.builtins()})
            return self.json({"error": "없는 주소"}, 404)
        except store.StoreError as err:
            return self.json({"ok": False, "error": str(err)}, 400)

    def do_POST(self):
        u = urlparse(self.path)
        key = self.headers.get("X-Token") or ""
        is_play = bool(key) and key == play_token() and key != token()
        if PUBLIC and not is_play:
            return self.json({"error": "공개 모드: 플레이 열쇠만"}, 403)
        if key != token() and not (is_play and u.path in PLAY_PATHS):
            return self.json({"error": "편집기 토큰이 필요함" if not is_play else "플레이 화면은 이 일을 할 수 없음"}, 403)
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))).decode("utf-8") or "{}")
            q = {"project": [body.get("project")]} if body.get("project") and not is_play else {}   # the play key works on the open game only
            if u.path == "/api/projects/new":
                return self.json({"ok": True, "id": store.create(str(body.get("name") or "새 게임"))})
            if u.path == "/api/projects/open":
                store.set_active(str(body.get("id")))
                return self.json({"ok": True})
            if u.path == "/api/projects/delete":
                return self.json({"ok": True, "trash": store.delete(str(body.get("id")))})
            if u.path == "/api/uitest":
                from . import uitest
                return self.json(uitest.run(str(body.get("name") or ""), PORT, bool(body.get("keep"))))
            pid = _pid(q)
            if u.path == "/api/file":
                return self.json(store.write(pid, body["path"], body["content"], body.get("note", ""), check.checker(pid)))
            if u.path == "/api/file/delete":
                return self.json(store.remove(pid, body["path"], body.get("note", "")))
            if u.path == "/api/restore":
                return self.json(store.restore(pid, body["path"], body["backup"], check.checker(pid)))
            if u.path == "/api/check":
                return self.json({"errors": check.check_all(pid) + check.integrity_errors(pid)})
            if u.path == "/api/library":
                from . import library
                return self.json(library.put(pid, str(body.get("name") or ""), str(body.get("key") or ""), body.get("value")))
            if u.path == "/api/image":
                # 🖼 그림 만들기: one picture through a subscription, saved under assets/images/ with its prompt note
                from . import ai, image
                try:
                    return self.json(image.make(pid, str(body.get("prompt") or ""), str(body.get("name") or ""), str(body.get("maker") or ""),
                                                body.get("model"), str(body.get("size") or "가로"), body.get("style")))
                except ai.AIError as err:
                    return self.json({"ok": False, "errors": [str(err)]})
            if u.path == "/api/ai/game":           # one game's start / done for the statistics (ENGINE-002 Q3)
                from . import ai
                kind, session, status = str(body.get("kind") or "한판"), str(body.get("session") or ""), str(body.get("status") or "")
                if status not in ("start", "done") or not session or len(session) > 80 or (is_play and (kind not in (("한판",) if PUBLIC else ("한판", "시험")) or not session.startswith("play:" if kind == "한판" else "test:"))):
                    return self.json({"ok": False, "error": "잘못된 판 기록"}, 403 if is_play else 400)
                ai._log({"time": time.strftime("%Y-%m-%dT%H:%M:%S"), "role": "판", "purpose": status, "status": status, "ok": True, "won": 0, "session": session})
                return self.json({"ok": True})
            if u.path == "/api/ai":
                # A game or a test asks the AI. kind (한판 · 시험 · 제작) picks the project's cap; session groups the calls.
                from . import ai
                kind, session, role = str(body.get("kind") or "한판"), str(body.get("session") or ""), str(body.get("role") or "실행")
                if is_play:
                    # the play key: always inside a batch with a cap, only the in-game role; 시험 (test cap) only on the dev server
                    allowed = ("한판",) if PUBLIC else ("한판", "시험")
                    if kind not in allowed or role != "실행" or not session or len(session) > 80:
                        return self.json({"ok": False, "error": f"플레이 화면은 이 요청을 할 수 없음 (묶음 {kind}, 역할 {role}, 세션 {'있음' if session else '없음'})"}, 403)
                    prefix = "play:" if kind == "한판" else "test:"
                    if not session.startswith(prefix):        # a 한판 session cannot become a 시험 one (or the reverse)
                        return self.json({"ok": False, "error": f"세션 '{session[:20]}'은 '{kind}' 묶음이 아님"}, 403)
                limit = ai.limit_for(kind, pid)
                try:
                    text = ai.run(role, str(body.get("prompt") or ""), str(body.get("purpose") or ""), tag=str(body.get("tag") or "")[:40],
                                  session=session, limit_won=limit if session else None, timeout=_seconds(body.get("timeout")))
                    return self.json({"ok": True, "text": text, "spent": ai.spent(session), "limit": limit})
                except ai.AIBudget as err:
                    ai._log({"time": time.strftime("%Y-%m-%dT%H:%M:%S"), "role": role, "purpose": "상한 거절", "ok": False, "budget": True, "won": 0, "session": session})
                    return self.json({"ok": False, "budget": True, "error": str(err), "spent": ai.spent(session), "limit": limit})
                except ai.AIError as err:
                    return self.json({"ok": False, "error": str(err), "spent": ai.spent(session), "limit": limit})
            return self.json({"error": "없는 주소"}, 404)
        except store.StoreError as err:
            return self.json({"ok": False, "errors": [str(err)]})
        except (KeyError, ValueError) as err:
            return self.json({"ok": False, "errors": [f"잘못된 요청: {err}"]}, 400)


def main():
    import sys
    global PUBLIC, PORT
    PUBLIC = "--public" in sys.argv
    try:
        PORT = env_port()
    except ValueError as err:
        sys.exit(str(err))
    token(); play_token()                  # both keys exist (and are not empty) before the first request
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"AI 웹게임엔진: http://127.0.0.1:{PORT}" + (" — 공개 모드 (플레이 화면만, 편집기·쓰기 없음)" if PUBLIC else ""))
    srv.serve_forever()


if __name__ == "__main__":
    main()
