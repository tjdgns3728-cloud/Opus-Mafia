"""Command line for the AI 웹게임엔진. Talks to the running server (python -m server.app), like the editor does,
so every write is checked, backed up and logged.

  python tool.py projects | new "이름" | open <id> | delete <id>
  python tool.py ls                         # files of the open project
  python tool.py cat <path>                 # print a file (scenes/main.json, scripts/x.js, project.json)
  python tool.py write <path> <local file>  # save a file (checked first)
  python tool.py rm <path> | check | history | restore <path> <backup>
  python tool.py test                       # engine tests (Python + JS)
  python tool.py uitest first_scene [--keep] [--wait 120] # build through the editor's own buttons (editor/ui_cases/<name>.json);
                                            # --wait: seconds this command waits for the result (a long test needs ≥ its budget)
  WEBENGINE_PORT=8781 python tool.py ...    # talk to the server started with the same WEBENGINE_PORT (default 8780)
"""

from __future__ import annotations

import argparse
import base64
import errno
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = "http://127.0.0.1:8780"


def connection_error_message(error):
    """Classify connection failures without assuming the server stopped or exposing raw reasons."""
    reason = getattr(error, "reason", error)
    codes = {getattr(reason, "errno", None), getattr(reason, "winerror", None)}
    if isinstance(reason, PermissionError) or codes & {errno.EACCES, errno.EPERM, 10013}:
        return "엔진 연결 접근 거부: 실행 권한을 확인하세요. 이 오류만으로 서버 종료를 단정할 수 없습니다."
    if isinstance(reason, ConnectionRefusedError) or codes & {errno.ECONNREFUSED, 10061}:
        return "엔진 연결 거부: 서버의 실행 상태와 연결 주소를 확인하세요."
    if isinstance(reason, TimeoutError) or codes & {errno.ETIMEDOUT, 10060}:
        return "엔진 연결 시간 초과: 응답을 받지 못했습니다. 서버 종료를 단정할 수 없습니다."
    return "엔진 연결 실패(원인 미확인): 서버 실행 상태·주소·실행 권한을 확인하세요."


WAIT = 120                                # seconds a command waits for the server's answer (uitest --wait changes it)


def api(path: str, body=None, wait: float = WAIT):
    if body is None:
        req = urllib.request.Request(BASE + path)
    else:
        tok = (ROOT / ".token").read_text(encoding="utf-8").strip() if (ROOT / ".token").is_file() else ""
        req = urllib.request.Request(BASE + path, data=json.dumps(body, ensure_ascii=False).encode("utf-8"), method="POST",
                                     headers={"Content-Type": "application/json", "X-Token": tok})
    try:
        with urllib.request.urlopen(req, timeout=wait) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        return json.loads(err.read().decode("utf-8") or "{}")
    except (urllib.error.URLError, TimeoutError) as err:
        sys.exit(connection_error_message(err))


def done(r: dict, ok_text: str):
    if r.get("ok"):
        print(ok_text.format(**r))
    else:
        print("하지 않았습니다:")
        for e in r.get("errors") or [r.get("error")]:
            print(" -", e)
        sys.exit(1)


def js_tests(env: dict | None = None) -> dict:
    """Runs tests/js with any Node-compatible runtime: node, or VS Code's Electron as Node."""
    import os
    import shutil
    out = ROOT / "tests" / "js" / "result.json"
    cmd = shutil.which("node")
    env = dict(env or os.environ)
    if not cmd:
        code = Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Microsoft VS Code" / "Code.exe"
        if not code.is_file():
            return {"ok": False, "error": "JS 실행기(node 또는 VS Code)가 없음"}
        cmd, env["ELECTRON_RUN_AS_NODE"] = str(code), "1"
    out.unlink(missing_ok=True)            # an old result must never pass for a new run
    p = subprocess.run([cmd, str(ROOT / "tests" / "js" / "run.js"), str(out)], env=env, timeout=300, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if not out.is_file():
        return {"ok": False, "error": "JS 시험이 결과를 남기지 못하고 끝남", "failed": [{"file": "run.js", "name": "(실행기)", "error": (p.stderr or p.stdout or "")[-800:]}]}
    return json.loads(out.read_text(encoding="utf-8"))


def run_env(run: Path) -> dict:
    """The environment of one `tool.py test` run: the tests' temp folders (Python and JS) go inside this run's own
    folder, so runs side by side (other worktrees, other agents) never count each other's folders as left over."""
    return {**os.environ, "TMPDIR": str(run), "TEMP": str(run), "TMP": str(run), "WEBENGINE_TEST_RUN": str(run)}


def left_in(run: Path, prefix: str) -> list[str]:
    """What a test run left in its own folder (only its own: another run's folder is never looked at)."""
    return sorted(p.name for p in run.glob(prefix + "*"))


def main():
    global BASE
    from server.app import env_port
    try:
        BASE = f"http://127.0.0.1:{env_port()}"
    except ValueError as err:
        sys.exit(str(err))
    if len(sys.argv) > 2 and sys.argv[1] == "play":      # its own options (--port …) go to the play server as they are
        from server import play
        return play.main(["--game", sys.argv[2], *sys.argv[3:]])
    ap = argparse.ArgumentParser(description="AI 웹게임엔진 명령줄")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for c in ("projects", "ls", "check", "history", "test"):
        sub.add_parser(c)
    sub.add_parser("roomtest", help="함께 하는 방 화면 시험: 본보기 판을 창 여덟으로 처음부터 끝까지 (docs/ROOM.md)")
    p = sub.add_parser("play", help="놀이용 서버: 게임 하나와 그 방만 (편집기 없음). 뒤에 --port 8791 · --test · --timescale 3"); p.add_argument("game")
    ut = sub.add_parser("uitest"); ut.add_argument("name"); ut.add_argument("--keep", action="store_true")
    ut.add_argument("--wait", type=float, default=WAIT, help=f"결과를 기다리는 초 (기본 {WAIT}). 오래 걸리는 시험은 그 예산 이상으로")
    p = sub.add_parser("ai"); p.add_argument("prompt"); p.add_argument("--role", default="실행")
    p = sub.add_parser("rules"); p.add_argument("path"); p.add_argument("--as", dest="as_", default="", help="이 이름의 규칙으로 검사 (초안을 대상 이름으로)")
    p = sub.add_parser("draft"); p.add_argument("guide"); p.add_argument("--brief", default=""); p.add_argument("--resume", action="store_true")
    p.add_argument("--model", default="", help="이번만 다른 모델 (예: claude-sonnet-5-5)")
    p.add_argument("--plan", action="store_true", help="AI를 부르지 않고 단계별 예상 비용과 고를 모델만 보기")
    p.add_argument("--only", default="", help="이 단계만 다시 (예: 2,4)"); p.add_argument("--base", default="", help="이 초안 위에서 (예: assets/drafts/scenario.json)")
    p = sub.add_parser("apply-draft"); p.add_argument("draft"); p.add_argument("target"); p.add_argument("--note", default="제작 AI 초안 적용")
    sub.add_parser("ai-usage")
    p = sub.add_parser("integrity", help="게임 파일이 엔진 저장 경로로만 바뀌었는지 (ENGINE-003)")
    p.add_argument("--baseline", action="store_true", help="기록이 없고 Git HEAD와 같은 파일을 기준으로 등록")
    sub.add_parser("boundary", help="엔진·게임 경계 검사: 엔진에 게임 이름 · 엔진 시험의 게임 의존 · 게임 코드의 AI 제공자 (ENGINE-003)")
    p = sub.add_parser("ai-cost", help="묶음(한 판·시험·제작)별 AI 사용량과 사용자 수에 따른 예상 비용 (API 환산)")
    p.add_argument("--users", type=int, default=0, help="동시에 쓰는 사람 수 (예상용)"); p.add_argument("--plays", type=float, default=1.0, help="한 사람이 하루에 하는 판 수")
    p.add_argument("--days", type=int, default=30)
    p = sub.add_parser("resources", help="생긴 파일 종류별 용량과 정리 계획 (지우지 않음)"); p.add_argument("--all", action="store_true", help="항목 하나하나")
    p = sub.add_parser("clean", help="정리: 기본은 계획만 보임. --apply 종류,종류 로 그 종류만 지움")
    p.add_argument("--apply", default="", help="지울 종류 (history,trash,test-sandbox,evidence,temp,draft-state)")
    p = sub.add_parser("image", help="그림 만들기 (구독, assets/images/에 저장)"); p.add_argument("name"); p.add_argument("prompt")
    p.add_argument("--maker", default="", help="ai.json '그림'의 만드는것 (예: gpt, claude-svg)"); p.add_argument("--model", default=None)
    p.add_argument("--size", default="가로", help="가로 · 세로 · 정사각"); p.add_argument("--style", default=None, help="이번만 다른 그림체")
    sub.add_parser("image-makers")
    for c, args in (("new", ["name"]), ("open", ["id"]), ("delete", ["id"]), ("cat", ["path"]), ("rm", ["path"]),
                    ("write", ["path", "local"]), ("restore", ["path", "backup"])):
        p = sub.add_parser(c)
        for a in args:
            p.add_argument(a)
        p.add_argument("--note", default="")
    a = ap.parse_args()
    if a.cmd == "projects":
        d = api("/api/projects")
        for p in d["projects"]:
            print(f"{'*' if p['id'] == d['active'] else ' '} {p['id']:<20} {p['name']}")
    elif a.cmd == "new":
        done(api("/api/projects/new", {"name": a.name}), "새 프로젝트를 만들고 열었습니다: {id}")
    elif a.cmd == "open":
        done(api("/api/projects/open", {"id": a.id}), "열었습니다.")
    elif a.cmd == "delete":
        done(api("/api/projects/delete", {"id": a.id}), "휴지통으로 옮겼습니다: {trash}")
    elif a.cmd == "ls":
        d = api("/api/files")
        print(f"{d['project']} — {d['meta'].get('name')} (시작 씬: {d['meta'].get('start')})")
        for f in d["files"]:
            print(f"  {f['kind']:<8} {f['path']}  ({f['size']} B)")
    elif a.cmd == "cat":
        d = api("/api/file?path=" + urllib.request.quote(a.path))
        if "content" not in d:
            sys.exit(d.get("error"))
        c = d["content"]
        print(c if isinstance(c, str) and a.path.startswith("scripts/") else json.dumps(c, ensure_ascii=False, indent=1) if not isinstance(c, str) else f"(자원, {len(base64.b64decode(c))} B)")
    elif a.cmd == "write":
        local = Path(a.local)
        if a.path.startswith("scripts/"):
            content = local.read_text(encoding="utf-8-sig")
        elif a.path.startswith("assets/"):
            content = base64.b64encode(local.read_bytes()).decode("ascii")
        else:
            content = json.loads(local.read_text(encoding="utf-8-sig"))
        done(api("/api/file", {"path": a.path, "content": content, "note": a.note}), "저장했습니다 · 백업 {backup}")
    elif a.cmd == "rm":
        done(api("/api/file/delete", {"path": a.path, "note": a.note}), "지웠습니다 (백업 {backup})")
    elif a.cmd == "check":
        errs = api("/api/check", {})["errors"]
        print("검사 통과" if not errs else "\n".join("✖ " + e for e in errs))
        sys.exit(1 if errs else 0)
    elif a.cmd == "history":
        for h in api("/api/history")["history"][:40]:
            print(f"{h['time']}  {h['path']:<28} {h['note']}  [{h['backup']}]")
    elif a.cmd == "restore":
        done(api("/api/restore", {"path": a.path, "backup": a.backup}), "되돌렸습니다.")
    elif a.cmd == "uitest":
        if a.wait <= 0:
            sys.exit("--wait는 0보다 큰 초여야 합니다.")
        r = api("/api/uitest", {"name": a.name, "keep": a.keep}, wait=a.wait)
        st = r.get("storage") or {}
        print(f"화면 시험 '{a.name}': {'✔' if r.get('ok') else '✖'} {r.get('done', 0)}/{r.get('total', 0)} 단계 · 만든 프로젝트 {r.get('projects')}{' (남김)' if a.keep else ''}")
        if st:
            ev = st.get("evidence") or {}
            print(f"   자원: 시험이 만든 {st.get('made_bytes', 0) / 1024:.0f}KB · 지움 {st.get('removed_bytes', 0) / 1024:.0f}KB"
                  + (f" · 실패 증거 {ev['bytes'] / 1024:.0f}KB ({ev['path']})" if ev else "") + (" · 남김 " + ", ".join(st["kept"]) if st.get("kept") else ""))
        if r.get("failed"):
            print(f"   {r['failed']['step']}번째 단계: {r['failed']['error']}")
        if r.get("error"):
            print("   오류:", r["error"])
        for line in r.get("log", []):
            print("  ", line)
        if not r.get("ok"):
            print("   콘솔:", (r.get("console") or "")[:400])
        sys.exit(0 if r.get("ok") else 1)
    elif a.cmd == "roomtest":              # no editor server needed: it starts its own play server on a free port
        from server import roomtest
        r = roomtest.run()
        for s in r.get("steps") or []:
            print(("  ✔ " if s["ok"] else "  ✖ ") + s["what"] + (f" — {s['detail']}" if s.get("detail") else ""))
        if r.get("error"):
            print("오류:", r["error"])
        print(f"함께 하는 방 화면 시험: {'통과' if r.get('ok') else '실패'} · 손님 화면이 남의 숨은 것을 받은 수 {r.get('leaks')}")
        if not r.get("ok"):
            sys.exit(1)
    elif a.cmd == "integrity":             # ENGINE-003: a change made outside the engine's save path fails here
        from server import boundary, store
        pid = store.active(); r = boundary.integrity(pid)
        if a.baseline and r["baseline_git"]:     # only Git HEAD counts as a baseline (file times can be set by hand)
            store.record_baseline(pid, r["baseline_git"], "기준 등록: Git HEAD와 같음 (ENGINE-003)")
            print(f"기준 등록 {len(r['baseline_git'])}개 (Git HEAD와 같음)"); r = boundary.integrity(pid)
        print(f"저장 무결성 ({pid}): {'통과' if r['passed'] else '실패'} · 일치 {len(r['ok'])} · Git 기준 {len(r['baseline_git'])} · 기준 없음 {len(r['unknown'])}")
        for k, label in (("changed", "엔진 경로 밖에서 바뀜"), ("missing", "기록은 있는데 없음"), ("unknown", "기준 없음 — 엔진 경로로 저장한 기록도, Git 사본도 없음")):
            for f in r[k]:
                print(f"   ✖ {label}: {f}")
        sys.exit(0 if r["passed"] else 1)
    elif a.cmd == "boundary":
        from server import boundary
        r = boundary.scan()
        print(f"엔진·게임 경계: {'통과' if r['passed'] else '실패'} · 게임 {len(r['games'])}개 · 게임 이름 {r['names']}개 검사")
        for p in r["problems"]:
            print(f"   ✖ {p['kind']}: {p['file']} — '{p['name']}'" + (f" ({p['game']})" if p.get("game") else ""))
        sys.exit(0 if r["passed"] else 1)
    elif a.cmd in ("resources", "clean"):  # resource lifecycle (server/resources.py, rules: engine.json "보관")
        from server import resources
        pl = resources.plan()
        kb = lambda n: f"{n / 1024:,.0f}KB"
        print(f"생긴 자료 {kb(pl['bytes'])} · 규칙대로 지울 수 있는 것 {kb(pl['delete_bytes'])}" + (" · ⚠ 경고 용량 넘음" if pl["warn"] else ""))
        for kind, tt in pl["totals"].items():
            print(f"  {kind:<13} {tt['count']:>4}개 {kb(tt['bytes']):>9} · 지울 것 {tt['delete_count']}개 {kb(tt['delete_bytes'])}")
        show = pl["items"] if getattr(a, "all", False) else [i for i in pl["items"] if i["action"] in ("delete", "review")]
        for it in show:
            print(f"   [{it['action']}] {it['kind']} {kb(it['bytes'])} {it['path']} — {it['reason']} · 복구: {it['recover']}")
        if a.cmd == "clean":
            kinds = [x.strip() for x in a.apply.split(",") if x.strip()]
            if not kinds:
                print("계획만 보였습니다. 지우려면: python tool.py clean --apply 종류,종류")
                return
            r = resources.apply(kinds, pl)
            print(f"지움 {len(r['deleted'])}개 · {kb(r['freed'])} 확보 · 실패 {len(r['failed'])}개 (기록: logs/cleanup.jsonl)")
            for f in r["failed"][:20]:
                print("   ✖", f["path"], f["error"])
    elif a.cmd == "test":
        from server import resources
        run = Path(tempfile.mkdtemp(prefix=resources.TEMP_PREFIX + "testrun-", dir=resources.temp_root()))   # this run's own temp folder
        env = run_env(run)
        empty = tempfile.mkdtemp(prefix=resources.TEMP_PREFIX + "unit-games-", dir=run)   # unit tests need no real game (ENGINE-003)
        py = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-t", "."], cwd=ROOT, capture_output=True, text=True,
                            env={**env, "WEBENGINE_PROJECTS": str(empty)})
        shutil.rmtree(empty, ignore_errors=True)
        print("Python:", (py.stderr.strip().splitlines() or ["?"])[-1], "|", next((l for l in py.stderr.splitlines() if l.startswith("Ran ")), ""))
        if py.returncode:
            print(py.stderr[-3000:])
        js = js_tests(env)
        print(f"JS: {'OK' if js.get('ok') else 'FAILED'} ({js.get('total', 0)}개)")
        for f in js.get("failed") or []:
            print(f"  ✖ {f['file']} › {f['name']}: {f['error']} {f.get('at', '')}")
        left = left_in(run, resources.TEMP_PREFIX)
        if not left:
            shutil.rmtree(run, ignore_errors=True)     # made by this run only; kept when something was left, as evidence
        print(f"임시 폴더: 시험 뒤 남은 것 {len(left)}개" + (" — " + ", ".join(left[:5]) + f" (남겨 둠: {run})" if left else ""))
        sys.exit(0 if py.returncode == 0 and js.get("ok") and not left else 1)
    elif a.cmd == "ai":                    # one question to the model of a role (uses subscription quota)
        from server import ai
        try:
            print(ai.run(a.role, a.prompt, "tool.py ai"))
        except ai.AIError as e:
            sys.exit(f"AI 오류: {e}")
    elif a.cmd == "image":                 # one picture through a subscription → assets/images/<name>.* + .prompt.json
        from server import ai, image, store
        try:
            r = image.make(store.active(), a.prompt, a.name, a.maker, a.model, a.size, a.style)
            print(f"그림 저장: {r['path']} ({r['seconds']}초) · 기록 {r['note']}")
        except ai.AIError as e:
            sys.exit(f"그림 오류: {e}")
    elif a.cmd == "image-makers":
        from server import image
        m = image.makers()
        for k, v in m["만드는것"].items():
            print(f"{'*' if k == m['기본'] else ' '} {k:<12} {v['이름']} · 도구 {v['도구']}{' (설치됨)' if m['있음'].get(v['도구']) else ' (없음)'} · 모델 {v.get('모델') or '기본'}")
        print("  ChatGPT 모델:", ", ".join(x["id"] for x in m["codex_models"]) or "(목록 없음)")
    elif a.cmd == "rules":                 # the game's data rules on a data file of the open project
        from server import check, draft, store
        pid = store.active(); rel = a.path[7:] if a.path.startswith("assets/") else a.path
        data, err = check._decode(store.read(pid, "assets/" + rel))
        as_ = a.as_[7:] if a.as_.startswith("assets/") else a.as_
        errs = [err] if err else draft.data_rules(pid, as_ or rel, data)
        print("규칙 검사 통과" if not errs else "\n".join("✖ " + e for e in errs))
        sys.exit(1 if errs else 0)
    elif a.cmd == "draft":                 # authoring AI: a checked draft, saved under assets/drafts/ (not applied)
        from server import ai, draft, store
        pid = store.active(); guide = a.guide[7:] if a.guide.startswith("assets/") else a.guide
        print(f"제작 AI 초안: {guide}", flush=True)
        state = ROOT / "logs" / f"draft_{pid}_{Path(guide).stem}.json"
        if not a.resume:
            state.unlink(missing_ok=True)
        try:
            base = None
            if a.base:
                from server import check
                base, err = check._decode(store.read(pid, a.base))
                if err:
                    sys.exit(f"{a.base}: {err}")
            only = [int(x) for x in a.only.split(",") if x.strip()] or None
            draft.MODEL = a.model or None
            if a.plan:
                rows = draft.plan(pid, guide, a.brief, only, base)
                lim = ai.limit_for("제작", pid)
                print(f"예상 (AI를 부르지 않음) — 제작 상한 {lim:g}원 · 구독이라 실제 청구 없음, 금액은 API로 했다면의 값")
                for r in rows:
                    print(f"  {r['step']}단계 {', '.join(r['keys'])}: 프롬프트 {r['chars']:,}자 → {r['model']} · 약 {r['won']}원" + (f" · 출력 약 {r['out']:,}토큰" if r.get('out') else "") + (f" · {r['note']}" if r.get('note') else ""))
                total = sum(r["won"] or 0 for r in rows)
                print(f"  합계 약 {total:.0f}원 (+ 규칙 고침 0~2번)")
                return
            r = draft.make(pid, guide, a.brief, log=lambda m: print(m, flush=True), state=state, only=only, base=base)
        except ai.AIBudget as e:
            sys.exit(f"멈춤: {e}\n끝난 단계는 저장되어 있음 — 상한을 올리거나(⚙ 게임 설정 › AI 비용 상한) 나중에: python tool.py draft {a.guide} --resume")
        except ai.AIError as e:
            sys.exit(f"AI 오류: {e}")
        name = Path(r["report"]["target"]).stem
        out = f"assets/drafts/{name}.json"
        content = base64.b64encode(json.dumps(r["draft"], ensure_ascii=False, indent=1).encode("utf-8")).decode("ascii")
        done(api("/api/file", {"path": out, "content": content, "note": f"제작 AI 초안 ({r['report']['calls']}번 호출)"}), f"초안 저장: {out}")
        rep = out[:-5] + ".report.json"
        api("/api/file", {"path": rep, "content": base64.b64encode(json.dumps(r["report"], ensure_ascii=False, indent=1).encode("utf-8")).decode("ascii"), "note": "초안 보고"})
        print(f"호출 {r['report']['calls']}번 · 남은 오류 {len(r['report']['rule_errors'])}개" + "".join("\n  ✖ " + e for e in r["report"]["rule_errors"][:30]))
        print(f"적용: python tool.py apply-draft {out} assets/{r['report']['target']}")
        state.unlink(missing_ok=True)          # finished: the resume state is no longer needed
    elif a.cmd == "apply-draft":
        d = api(f"/api/file?path={urllib.request.quote(a.draft)}")
        if "content" not in d:
            sys.exit(f"초안 없음: {a.draft}")
        done(api("/api/file", {"path": a.target, "content": d["content"], "note": a.note}), f"적용했습니다: {a.target} (백업 {{backup}})")
    elif a.cmd == "ai-cost":               # ENGINE-002 #6: per game, stored-judgment reuse, users × plays projection
        from server import ai
        r = ai.cost_report(users=a.users, plays_per_user=a.plays, days=a.days)
        print(f"AI 사용 측정 — 제공자 {ai.provider()} · 금액은 같은 양을 API로 썼다면의 값(구독은 정액, 공개 서비스의 실제 요금은 배포 전 확인)")
        for kind, k in r["kinds"].items():
            print(f"  {kind}: 묶음 {k['batches']}개 · 묶음당 호출 {k['avg_calls']} · 토큰 {k['avg_tokens']:,} · 평균 {k['avg_won']}원 · 최대 {k['max_won']}원 · 실패 {k['fail']}")
        for kind, g in r["games"].items():
            print(f"  {kind} 판(추정): 시작 {g['started']} · 완료 {g['completed']} · 중단·진행 중 {g['unfinished']} · AI 0번 {g['no_ai']} · "
                  f"시작된 판당 {g['avg_per_started']}원 · 완료된 판당 {g['avg_per_completed']}원")
            for tag, t in g["by_tag"].items():
                print(f"      태그 '{tag}': {t['games']}판 · 판당 {t['avg_won']}원")
        s = r["store"]
        print(f"  저장된 판단: 적중 {s['hit']} · 없음 {s['miss']}" + (f" · 적중률 {s['hit_rate'] * 100:.0f}%" if s["hit_rate"] is not None else ""))
        if r["no_batch_calls"]:
            print(f"  묶음 없는 호출 {r['no_batch_calls']}개 (명령줄 제작·그림 등) — 위 표에 들어가지 않음, tool.py ai-usage로 확인")
        if r["projection"]:
            pj = r["projection"]
            print(f"  예상: {pj['users']}명 × 하루 {pj['plays_per_user']}판 × 한 판 {pj['per_game_won']}원({pj['based_on']} 평균) → 하루 {pj['daily_won']:,}원 · {pj['period_days']}일 {pj['period_won']:,}원")
            print(f"  ⚠ {pj['note']}" + (f"\n  ⚠ {pj['warning']}" if pj.get("warning") else ""))
    elif a.cmd == "ai-usage":              # what the AI calls cost (logs/ai_calls.jsonl)
        f = ROOT / "logs" / "ai_calls.jsonl"
        rows = [json.loads(l) for l in f.read_text(encoding="utf-8").splitlines()] if f.is_file() else []
        by = {}
        for r in rows:
            if r.get("role") == "저장소" or r.get("purpose") == "상한 거절":
                continue                       # not AI calls (stored-judgment lookups, refused by the cap)
            k = (r.get("role"), r.get("model"))
            s = by.setdefault(k, {"calls": 0, "fail": 0, "usd": 0.0, "sec": 0.0, "in": 0, "out": 0})
            s["calls"] += 1; s["fail"] += 0 if r.get("ok") else 1; s["usd"] += r.get("cost_usd") or 0; s["sec"] += r.get("seconds") or 0
            s["in"] += r.get("tokens_in") or 0; s["out"] += r.get("tokens_out") or 0
        print("AI 사용량 — 구독(정액)이라 따로 청구되지 않음. 토큰 = 구독 한도를 쓴 양")
        print("역할 · 모델 · 호출(실패) · 출력 토큰 · 시간  [참고: API로 했다면]")
        for (role, model), s in by.items():
            print(f"  {role} · {model} · {s['calls']}({s['fail']}) · {s['out']:,} · {s['sec']:.0f}초  [${s['usd']:.2f}]")


if __name__ == "__main__":
    main()
