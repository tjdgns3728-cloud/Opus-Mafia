"""Play server (standard library only): ONE game, its shared rooms, and nothing else (docs/ROOM.md).

  python -m server.play --game <게임 id 또는 폴더>      (from webengine/) → http://127.0.0.1:8790

What it gives out: the play screen, the engine's runtime files, that one game's files (read only) and the room paths
(/room/…). What it does not have at all: the editor page, the editor's key, writing/removing/restoring files, any path
by which a SCREEN asks the AI, other games. The handler below has no path that writes a file.
AI (--ai on): only the room's RULES may ask (the Node host sends the ask here, server.ai runs the subscription CLI with
the game's cap and call log) — and only when this server listens on this computer alone. Records (room.record): one
line appended to logs/room_records/<game>.jsonl, from the rules only, on this computer alone.
The rooms and the game's rules live in a Node process next to it (server/room_host.js); this file only passes requests.
When either process stops, every room is gone (nothing is saved)."""

from __future__ import annotations

import json
import mimetypes
import os
import shutil
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
PORT = 8790
ROOM_OPS = {"info", "create", "join", "start", "intent", "act", "chat", "news", "bye", "leave", "reopen", "bot_add", "bot_remove"}
MAX_BODY = 16 * 1024                 # a request is a short text or a small choice
TEST_PAGE = False                    # --test: also give out /roomtest (several seats on one page, for checks)
TEST_RESULT: dict = {}               # what the /roomtest page reported (server/roomtest.py waits for it)
TEST_DONE = threading.Event()


def env_port() -> int:
    raw = os.environ.get("WEBENGINE_PLAY_PORT", "").strip()
    if not raw:
        return PORT
    if not (raw.isascii() and raw.isdigit()) or not 0 < int(raw) < 65536:
        raise ValueError(f"WEBENGINE_PLAY_PORT 값이 잘못됨: '{raw[:20]}' (1~65535 사이의 숫자)")
    return int(raw)


def node() -> str | None:
    return shutil.which("node")


class Host:
    """The Node process that keeps the rooms. One JSON line per request, one per answer (matched by id)."""

    def __init__(self, game: Path, extra: list[str] | None = None, log=print, ai_limit: float | None = None, local: bool = False):
        self.ai_limit, self.local = ai_limit, local          # the board's cap in won · this computer only (records allowed)
        self.game, self.log, self.info = game, log, {"ready": False, "rules": False, "errors": ["방 주인 프로그램이 뜨지 않음"]}
        self.lock, self.waiting, self.next_id, self.proc = threading.Lock(), {}, 0, None
        exe = node()
        if not exe:
            self.info["errors"] = ["node가 없어 게임의 규칙을 서버에서 돌릴 수 없음"]
            return
        self.proc = subprocess.Popen([exe, str(ROOT / "server" / "room_host.js"), str(game), *(extra or [])], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                     text=True, encoding="utf-8", bufsize=1)
        first = self.proc.stdout.readline()
        try:
            self.info = json.loads(first)
        except json.JSONDecodeError:
            self.info["errors"] = [f"방 주인 프로그램의 첫 줄을 읽지 못함: {first[:200]}"]
        threading.Thread(target=self._read, daemon=True).start()

    def _read(self):
        for line in self.proc.stdout:
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue
            if "log" in msg:
                self.log(msg["log"])
                continue
            if "ai" in msg:                      # the rules ask the AI: never on the reader thread (an answer takes seconds)
                threading.Thread(target=self._ai, args=(msg["ai"],), daemon=True).start()
                continue
            if "aiLog" in msg:
                self._ai_log(msg["aiLog"])
                continue
            if "record" in msg:
                self._record(msg["record"])
                continue
            with self.lock:
                slot = self.waiting.pop(msg.get("id"), None)
            if slot:
                slot[1] = msg.get("res")
                slot[0].set()
        with self.lock:                        # the process ended: nobody waits for ever
            for slot in self.waiting.values():
                slot[0].set()
            self.waiting.clear()

    def _send(self, obj: dict) -> None:
        with self.lock:
            try:
                self.proc.stdin.write(json.dumps(obj, ensure_ascii=False) + "\n")
                self.proc.stdin.flush()
            except (OSError, ValueError):
                pass

    def _ai(self, req: dict) -> None:
        """One ask from a room's rules: the engine's own AI path (subscription CLI, the batch's cap in won, the call log)."""
        from . import ai
        session = str(req.get("session") or "")
        try:
            text = ai.run("실행", str(req.get("prompt") or ""), str(req.get("purpose") or ""), tag=str(req.get("tag") or "")[:40], session=session,
                          limit_won=self.ai_limit if session else None, timeout=float(req.get("timeout") or 0) or None)
            res = {"ok": True, "text": text}
        except ai.AIBudget as err:
            ai._log({"time": time.strftime("%Y-%m-%dT%H:%M:%S"), "role": "실행", "purpose": "상한 거절", "ok": False, "budget": True, "won": 0, "session": session})
            res = {"ok": False, "budget": True, "error": str(err)}
        except ai.AIError as err:
            res = {"ok": False, "error": str(err)}
        except Exception as err:                 # noqa: BLE001 — an ask never ends the server
            res = {"ok": False, "error": f"AI 요청 중 오류 ({type(err).__name__})"}
        self._send({"aiRes": req.get("id"), "res": res})

    def _ai_log(self, row: dict) -> None:
        """Rows the host counts itself (fake answers, AI off, the count cap, a board's start and end) → the same call log."""
        from . import ai
        stamp = time.strftime("%Y-%m-%dT%H:%M:%S")
        if row.get("board"):
            entry = {"time": stamp, "role": "판", "purpose": row["board"], "status": row["board"], "ok": True, "won": 0, "session": str(row.get("session") or ""),
                     **{k: row[k] for k in ("asked", "sent", "answered", "blocked", "failed", "seconds") if k in row}}
        else:
            entry = {"time": stamp, "role": "실행", "purpose": "상한 거절" if row.get("budget") else str(row.get("purpose") or ""), "provider": "room-" + str(row.get("mode") or "off"),
                     "ok": bool(row.get("ok")), "won": 0, "session": str(row.get("session") or ""), "seconds": row.get("seconds"), "prompt_chars": row.get("prompt_chars"),
                     **({"budget": True} if row.get("budget") else {}), **({"tag": str(row["tag"])[:40]} if row.get("tag") else {}), **({"error": "no_answer"} if not row.get("ok") else {})}
        try:
            ai._log(entry)
        except OSError:
            pass

    def _record(self, line) -> None:
        if not self.local or not isinstance(line, str) or len(line) > 64 * 1024 or "\n" in line:
            return
        try:
            folder = ROOT / "logs" / "room_records"
            folder.mkdir(parents=True, exist_ok=True)
            with open(folder / (self.game.name + ".jsonl"), "a", encoding="utf-8") as f:
                f.write(line + "\n")
        except OSError as err:
            self.log(f"기록을 남기지 못함: {err.strerror}")

    def alive(self) -> bool:
        return bool(self.proc) and self.proc.poll() is None

    def ask(self, req: dict, wait: float = 40) -> dict:
        if not self.alive():
            return {"ok": False, "error": "서버에서 게임의 규칙을 돌릴 수 없습니다: " + " / ".join(self.info.get("errors") or ["방 주인 프로그램이 멈춤"]), "down": True}
        slot = [threading.Event(), None]
        with self.lock:
            self.next_id += 1
            rid = self.next_id
            self.waiting[rid] = slot
            try:
                self.proc.stdin.write(json.dumps({"id": rid, "req": req}, ensure_ascii=False) + "\n")
                self.proc.stdin.flush()
            except (OSError, ValueError):
                self.waiting.pop(rid, None)
                return {"ok": False, "error": "방 주인 프로그램이 멈췄습니다.", "down": True}
        slot[0].wait(wait)
        return slot[1] if isinstance(slot[1], dict) else {"ok": False, "error": "서버가 답하지 않았습니다.", "down": not self.alive()}

    def stop(self):
        if self.alive():
            try:
                self.proc.stdin.close()
                self.proc.wait(5)
            except (OSError, subprocess.TimeoutExpired):
                self.proc.kill()


def server_log(msg: str):
    """Why something was refused, and room errors — never a chat text or a seat key."""
    line = f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {msg}"
    print(line, flush=True)
    try:
        (ROOT / "logs").mkdir(exist_ok=True)
        with open(ROOT / "logs" / "room.log", "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def game_files(game: Path) -> list[dict]:
    """What the play screen loads: the same list the editor's /api/files gives, read here without the store."""
    out = []
    for p in sorted(game.rglob("*")):
        rel = p.relative_to(game).as_posix()
        first = rel.split("/")[0]
        if not p.is_file() or rel.startswith(".") or "/." in rel or first in ("history", "tests"):
            continue
        kind = ("project" if rel == "project.json" else "scene" if first == "scenes" and rel.endswith(".json") else "script" if first == "scripts" and rel.endswith(".js")
                else "prefab" if first == "prefabs" and rel.endswith(".json") else "asset" if first == "assets" else None)
        if kind:
            out.append({"path": rel, "kind": kind, "size": p.stat().st_size})
    return out


def game_path(game: Path, rel: str) -> Path | None:
    """A file of the game that the list above names — nothing outside it, no backups, no hidden files."""
    rel = rel.replace("\\", "/").strip("/")
    return game / rel if any(f["path"] == rel for f in game_files(game)) else None


def make_handler(game: Path, host: Host):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def send(self, body: bytes, ctype: str, status: int = 200):
            try:
                self.send_response(status)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):      # the window closed while it waited
                pass

        def json(self, obj, status: int = 200):
            self.send(json.dumps(obj, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8", status)

        def file(self, p: Path | None, page: bool = False):
            if not p or not p.is_file():
                return self.json({"error": "없음"}, 404)
            body = p.read_bytes()
            if page:
                body = body.replace(b"__TOKEN__", b"")           # no key of any kind goes to a play screen here
            self.send(body, (mimetypes.guess_type(p.name)[0] or "application/octet-stream") + ("; charset=utf-8" if p.suffix in (".html", ".js", ".json", ".css") else ""))

        def do_GET(self):
            u = urlparse(self.path)
            path, q = unquote(u.path), parse_qs(u.query)
            if path in ("/", "/play"):
                return self.file(ROOT / "editor" / "play.html", page=True)
            if path == "/roomtest" and TEST_PAGE:
                return self.file(ROOT / "editor" / "roomtest.html")
            if path.startswith("/runtime/") and ".." not in path and path.count("/") == 2 and path.endswith((".js", ".json")):
                return self.file(ROOT / path.lstrip("/"))
            if path == "/api/engine":
                return self.json({"modules": sorted(p.stem for p in (ROOT / "runtime").glob("*.js") if p.stem != "core") + ["core"]})
            if path == "/api/files":
                meta = json.loads((game / "project.json").read_text(encoding="utf-8-sig"))
                return self.json({"project": game.name, "meta": meta, "files": game_files(game)})
            if path == "/api/file":
                rel = (q.get("path") or [""])[0]
                p = game_path(game, rel)
                if not p or p.suffix != ".json" or rel.split("/")[0] not in ("scenes", "prefabs"):
                    return self.json({"error": "없음"}, 404)
                return self.json({"path": rel, "content": json.loads(p.read_text(encoding="utf-8-sig"))})
            if path.startswith("/project/"):
                return self.file(game_path(game, path[len("/project/"):]))
            return self.json({"error": "없는 주소"}, 404)

        def do_POST(self):
            path = urlparse(self.path).path
            op = path[len("/room/"):] if path.startswith("/room/") else ""
            report = TEST_PAGE and path == "/roomtest/result"
            if op not in ROOM_OPS and not report:
                return self.json({"error": "없는 주소"}, 404)
            try:
                size = int(self.headers.get("Content-Length", 0))
            except ValueError:
                size = -1
            if report and 0 <= size <= 16 * MAX_BODY:           # the screen test's own result (only with --test)
                try:
                    TEST_RESULT.update(json.loads(self.rfile.read(size).decode("utf-8")))
                except (ValueError, UnicodeDecodeError):
                    TEST_RESULT.update({"ok": False, "error": "결과를 읽지 못함"})
                TEST_DONE.set()
                return self.json({"ok": True})
            if not 0 <= size <= MAX_BODY:
                server_log(f"받지 않음: {op} — 요청이 너무 큼 ({size}바이트)")
                return self.json({"ok": False, "error": "요청이 너무 큽니다."}, 413)
            try:
                body = json.loads(self.rfile.read(size).decode("utf-8") or "{}")
                if not isinstance(body, dict):
                    raise ValueError
            except (ValueError, UnicodeDecodeError):
                return self.json({"ok": False, "error": "잘못된 요청"}, 400)
            # only these fields go on — a screen cannot name its seat, its role or any state
            req = {"op": op, **{k: body[k] for k in ("room", "key", "name", "intent", "action", "text", "to", "since", "e", "wait", "tab", "bot") if k in body}}
            result = host.ask(req)
            if op == "info" and result.get("ok"):
                from . import ai
                cfg = ai.settings()
                result["aiLabel"] = (str(cfg.get("표시이름") or ai.provider())[:100]
                                     if result.get("aiMode") == "on" else "사람끼리 플레이 · AI 꺼짐")
            return self.json(result)

    return Handler


def ai_limits(game: Path) -> dict:
    """One board's AI caps, the game's own values: project.json › settings › ai_limits › "한판" (won — the engine's
    existing cap, default from ai.json 상한원) and "한판_호출" (how many asks one board may send; none = no count cap)."""
    try:
        own = (json.loads((game / "project.json").read_text(encoding="utf-8-sig")).get("settings") or {}).get("ai_limits") or {}
    except (OSError, ValueError):
        own = {}
    won = own.get("한판")
    if not isinstance(won, (int, float)) or isinstance(won, bool) or won < 0:
        try:
            cfg = json.loads((ROOT / "ai.json").read_text(encoding="utf-8-sig"))
        except (OSError, ValueError):
            cfg = {}
        won = (cfg.get("상한원") or {}).get("한판", 10)
    calls = own.get("한판_호출")
    return {"won": float(won), "calls": int(calls) if isinstance(calls, (int, float)) and not isinstance(calls, bool) and calls >= 0 else None}


def find_game(arg: str) -> Path:
    p = Path(arg)
    if not (p / "project.json").is_file():
        from . import store                      # reading side only: where the games folder is
        p = store.projects_dir() / arg
    if not (p / "project.json").is_file():
        raise SystemExit(f"게임을 찾지 못함: {arg} (게임 폴더의 길, 또는 게임 폴더 안의 id)")
    return p.resolve()


def main(argv: list[str] | None = None):
    import argparse
    global TEST_PAGE
    ap = argparse.ArgumentParser(description="놀이용 서버: 게임 하나와 그 방만 내준다 (편집기 없음)")
    ap.add_argument("--game", required=True, help="게임 id (게임 폴더 안) 또는 게임 폴더의 길")
    ap.add_argument("--port", type=int, default=None, help=f"문 번호 (기본 {PORT}, 또는 WEBENGINE_PLAY_PORT)")
    ap.add_argument("--host", default="127.0.0.1", help="듣는 주소. 기본은 이 기계 안에서만(127.0.0.1) — 바깥에는 암호로 싸는 길(https)을 앞에 두고 연다")
    ap.add_argument("--timescale", type=float, default=1, help="판의 시계 빠르기 (시험용, 1 = 보통)")
    ap.add_argument("--lobby-grace", type=float, default=20, help="기다리는 방에서 화면이 사라진 사람의 자리를 비우기까지 기다리는 시간 (초)")
    ap.add_argument("--ai", choices=("off", "on", "fake", "fail"), default="off",
                    help="방의 규칙이 AI를 부르는 길. off(기본): 늘 '답 없음' · on: 이 컴퓨터의 구독 명령줄 · fake: 게임이 정한 가짜 답 · fail: 장애 흉내. 이 컴퓨터 안에서만 열 때만 켤 수 있다")
    ap.add_argument("--open", action="store_true", help="켠 뒤 이 컴퓨터의 브라우저로 연다")
    ap.add_argument("--seed", type=int, default=None, help="뽑기의 씨앗을 고정 (시험용)")
    ap.add_argument("--test", action="store_true", help="여러 자리를 한 화면에 여는 시험 쪽(/roomtest)도 내준다")
    a = ap.parse_args(argv)
    try:
        port = a.port or env_port()
    except ValueError as err:
        sys.exit(str(err))
    TEST_PAGE = a.test
    local = a.host in ("127.0.0.1", "localhost", "::1")
    if a.ai != "off" and not local:
        sys.exit("바깥에 여는 서버에서는 AI를 켤 수 없습니다 (--ai는 --host 없이, 이 컴퓨터 안에서만 열 때 쓴다).")
    game = find_game(a.game)
    limits = ai_limits(game)
    extra = ["--timescale", str(a.timescale), "--lobbygrace", str(a.lobby_grace), "--ai", a.ai, "--records", "1" if local else "0"] + (["--seed", str(a.seed)] if a.seed is not None else [])
    if limits["calls"] is not None:
        extra += ["--limitcalls", str(limits["calls"])]
    host = Host(game, extra, server_log, ai_limit=limits["won"], local=local)
    if not host.info.get("ready") or not host.info.get("rules"):
        # the rules cannot run on the server: stop here — never fall back to one screen judging (docs/ROOM.md)
        host.stop()
        sys.exit("서버에서 게임의 규칙을 돌릴 수 없어 멈춤: " + " / ".join(host.info.get("errors") or ["까닭 모름"]))
    for e in host.info.get("errors") or []:
        server_log(f"게임 스크립트 알림: {e}")
    try:
        srv = ThreadingHTTPServer((a.host, port), make_handler(game, host))
    except OSError as err:
        host.stop()
        sys.exit(f"문 번호 {port}를 열지 못함 ({err.strerror}). 다른 번호: --port 8791")
    srv.daemon_threads = True
    print(f"놀이용 서버: http://{a.host}:{port} — 게임 '{host.info.get('game')}' ({host.info.get('min')}~{host.info.get('max')}명), 편집기 없음", flush=True)
    how = {"off": "꺼짐 (방의 규칙이 물으면 늘 '답 없음')", "on": "켜짐 (이 컴퓨터의 구독 명령줄)", "fake": "가짜 답 (AI를 부르지 않음)", "fail": "장애 흉내 (AI를 부르지 않음)"}[a.ai]
    cap = f"한 판 한도 {limits['won']:g}원" + (f" · {limits['calls']}번" if limits["calls"] is not None else " · 번수 한도 없음")
    print(f"AI: {how} — {cap} (게임의 project.json › settings › ai_limits)", flush=True)
    if a.ai == "on":
        # The cap in won is checked against the EXPECTED cost of a call before it is made (server/ai.py): a cap below one
        # call's estimate refuses every ask. Say so at the start instead of letting a whole board fall back silently.
        from . import ai
        try:
            one = ai.estimate(ai.settings()["roles"]["실행"], 600, "인물로서 대답")["won"]
            if limits["won"] < one:
                print(f"알림: 한 판 한도 {limits['won']:g}원이 물음 하나의 예상 값(약 {one:.0f}원)보다 작습니다 — 모든 물음이 막혀 '답 없음'이 됩니다. "
                      "게임의 project.json › settings › ai_limits › \"한판\"을 올리세요.", flush=True)
            else:
                print(f"물음 하나의 예상 값 약 {one:.0f}원 — 이 한도로 한 판에 {int(limits['won'] // max(one, 0.01))}번쯤 (실제 값이 기록에 쌓이면 예상이 바뀝니다)", flush=True)
        except Exception:                        # noqa: BLE001 — a hint only
            pass
    if a.open:
        import webbrowser
        threading.Timer(0.5, lambda: webbrowser.open(f"http://127.0.0.1:{port}/")).start()
    if a.host not in ("127.0.0.1", "localhost", "::1"):
        print("알림: 이 기계 밖에서도 들어올 수 있게 열었습니다. 채팅과 자리 열쇠가 오가므로 암호로 싸는 길(https) 없이 바깥에 두지 마세요.", flush=True)
    import signal
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))      # a service manager's stop ends it cleanly too
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        host.stop()


if __name__ == "__main__":
    main()
