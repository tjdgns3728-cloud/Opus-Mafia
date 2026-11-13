"""Pictures for a game, made while authoring through the user's subscriptions (never API keys) and saved as assets.
Makers are listed in ai.json "그림" (the editor's 🖼 그림 만들기 offers them):
  codex  — the ChatGPT subscription's image tool through the Codex CLI (bundled with the VS Code ChatGPT extension) → PNG
  claude — Claude writes the picture as SVG code through the Claude Code CLI → SVG
Each picture is saved with a note (<name>.prompt.json: maker, model, prompt, art style, size, time) so it can be made
again in the same style. The project's art style (project.json settings.art_style) is added to every prompt.
Calls are logged to logs/ai_calls.jsonl with role 그림. Pictures are made at authoring time, never while a game is played.
"""

from __future__ import annotations

import base64
import json
import os
import re
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from . import ai, store

DEFAULTS = {"기본": "gpt", "timeout": 900,
            "만드는것": {"gpt": {"이름": "GPT 그림 (ChatGPT 구독)", "도구": "codex", "모델": ""},
                     "claude-svg": {"이름": "Claude SVG (Claude 구독)", "도구": "claude", "모델": "claude-sonnet-5-5"}}}
SIZES = {"가로": "wide landscape, 3:2", "세로": "tall portrait, 2:3", "정사각": "square, 1:1"}
IMAGE_EXT = (".png", ".jpg", ".jpeg", ".webp")
NAME_RE = re.compile(r"[\w가-힣\-]+")


def settings() -> dict:
    s = ai.settings().get("그림") or {}
    return {**DEFAULTS, **s, "만드는것": {**DEFAULTS["만드는것"], **(s.get("만드는것") or {})}}


def find_codex() -> str | None:
    on_path = shutil.which("codex")
    if on_path and (os.name != "nt" or Path(on_path).suffix.lower() == ".exe"):
        return on_path
    exe = "codex.exe" if os.name == "nt" else "codex"
    found = list((Path.home() / ".vscode" / "extensions").glob(f"openai.chatgpt-*/bin/*/{exe}"))
    return str(max(found, key=lambda p: p.stat().st_mtime)) if found else None


def codex_models() -> list[dict]:
    """The models the ChatGPT subscription offers in the Codex CLI (from its own cache), for the editor's model list."""
    p = Path.home() / ".codex" / "models_cache.json"
    try:
        ms = json.loads(p.read_text(encoding="utf-8")).get("models") or []
    except (OSError, json.JSONDecodeError):
        return []
    return [{"id": m["slug"], "이름": m.get("display_name") or m["slug"]} for m in ms if m.get("slug") and m.get("visibility") == "list"]


def makers() -> dict:
    s = settings()
    return {"기본": s["기본"], "만드는것": s["만드는것"], "크기": list(SIZES), "codex_models": codex_models(),
            "있음": {"codex": bool(find_codex()), "claude": bool(ai.find_cli())}}


def _new_images(folder: Path, since: float) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted((p for p in folder.rglob("*") if p.suffix.lower() in IMAGE_EXT and p.is_file() and p.stat().st_mtime >= since),
                  key=lambda p: p.stat().st_mtime, reverse=True)


def _b64_image(text: str) -> bytes | None:
    """A base64 PNG/JPEG/WebP inside the CLI's JSON events, if the picture came back that way."""
    for m in re.finditer(r'"([A-Za-z0-9+/=]{2000,})"', text):
        raw = base64.b64decode(m.group(1) + "=" * (-len(m.group(1)) % 4))
        if raw[:8] == b"\x89PNG\r\n\x1a\n" or raw[:3] == b"\xff\xd8\xff" or raw[8:12] == b"WEBP":
            return raw
    return None


def _codex(model: str, prompt: str, timeout: int) -> tuple[bytes, str]:
    """One picture through the Codex CLI → (bytes, extension). Tests replace this."""
    exe = find_codex()
    if not exe:
        raise ai.AIError("Codex CLI를 찾지 못했습니다 (VS Code의 ChatGPT 확장이 필요, ChatGPT 계정으로 로그인).")
    ask = ("Use your image generation tool to create exactly one image for this request. Then save the image file as "
           "out.png in the current directory. Do not write any other file. Reply with one word: done.\n\nRequest:\n" + prompt)
    started = time.time() - 1
    with tempfile.TemporaryDirectory(prefix="webengine-img-", ignore_cleanup_errors=True) as ws:
        args = [exe, "exec", "--json", "--skip-git-repo-check", "--ephemeral", "--sandbox", "workspace-write", "-C", ws]
        if model:
            args += ["-m", model]
        env = {k: v for k, v in os.environ.items() if k.upper() not in ai.KEY_VARIABLES}
        r = subprocess.run(args + [ask], stdin=subprocess.DEVNULL, capture_output=True, text=True, encoding="utf-8", errors="replace",
                           cwd=ws, env=env, timeout=timeout, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        out = r.stdout + "\n" + r.stderr
        if "usage limit" in out.lower():
            m = re.search(r"try again at ([^.\"\n]+)", out)
            raise ai.AIError("ChatGPT 구독 사용 한도에 닿음" + (f" — {m.group(1).strip()}에 다시" if m else "") + " (구매하지 않음)")
        # the image tool keeps its original under ~/.codex/generated_images (readable); a copy the model saves inside the
        # sandbox folder may carry the sandbox's permissions (Windows: unreadable), so the original comes first
        found = _new_images(Path.home() / ".codex" / "generated_images", started) or _new_images(Path(ws), started)
        if found:
            # the CLI's helper may still hold the file for a moment (Windows: PermissionError) — wait and read again
            for _ in range(20):
                try:
                    return found[0].read_bytes(), found[0].suffix.lower().replace(".jpeg", ".jpg")
                except PermissionError:
                    time.sleep(0.5)
            raise ai.AIError(f"그림 파일을 읽을 권한이 없음: {found[0]} (Codex 샌드박스가 잠갔을 수 있음)")
        raw = _b64_image(out)
        if raw:
            return raw, ".png" if raw[:4] == b"\x89PNG" else ".jpg" if raw[:3] == b"\xff\xd8\xff" else ".webp"
        raise ai.AIError("그림을 받지 못했습니다: " + (out.strip()[-400:] or f"종료 코드 {r.returncode}"))


def _claude_svg(model: str, prompt: str, timeout: int) -> tuple[bytes, str]:
    text = ai.run("그림", "Draw this picture as one self-contained SVG (viewBox, no external files, no text unless asked). "
                         "Rich detail: layered shapes, gradients, lighting, texture filters. Answer with the SVG code only.\n\n" + prompt,
                  purpose="그림:svg", model=model)
    m = re.search(r"<svg[\s\S]*</svg>", text)
    if not m:
        raise ai.AIError("SVG를 받지 못했습니다: " + text[:200])
    return m.group(0).encode("utf-8"), ".svg"


def make(pid: str, prompt: str, name: str, maker: str = "", model: str | None = None, size: str = "가로", style: str | None = None) -> dict:
    """Makes one picture and saves it as assets/images/<name>.<ext> with its note. Uses subscription quota."""
    if not NAME_RE.fullmatch(name or ""):
        raise ai.AIError("그림 이름은 띄어쓰기·기호 없이 영어·숫자·한글로 (예: innkeeper_stern)")
    if not prompt.strip():
        raise ai.AIError("무엇을 그릴지 적어 주세요")
    cfg = settings()
    key = maker or cfg["기본"]
    mk = cfg["만드는것"].get(key)
    if not mk:
        raise ai.AIError(f"모르는 그림 도구: {key} (있는 것: {list(cfg['만드는것'])})")
    model = mk.get("모델", "") if model is None else model
    if style is None:
        style = (store.read(pid, "project.json").get("settings") or {}).get("art_style", "")
    full = prompt.strip() + (f"\n\nArt style: {style.strip()}" if style.strip() else "") + f"\nFormat: {SIZES.get(size, size)}."
    entry = {"time": time.strftime("%Y-%m-%dT%H:%M:%S"), "role": "그림", "purpose": f"그림:{name}", "model": model or mk["도구"],
             "maker": key, "prompt_chars": len(full)}
    started = time.time()
    try:
        raw, ext = (_codex if mk["도구"] == "codex" else _claude_svg)(model, full, cfg["timeout"])
        entry.update(ok=True, bytes=len(raw))
    except subprocess.TimeoutExpired as err:
        entry.update(ok=False, error="timeout")
        raise ai.AIError(f"{cfg['timeout']}초 안에 그림이 오지 않았습니다.") from err
    except ai.AIError as err:
        entry.update(ok=False, error=str(err)[:300])
        raise
    finally:
        entry["seconds"] = round(time.time() - started, 1)
        if mk["도구"] == "codex":          # claude calls are logged by ai.run
            ai._log(entry)
    rel = f"assets/images/{name}{ext}"
    w = store.write(pid, rel, base64.b64encode(raw).decode("ascii"), f"그림 만들기 ({mk['이름']})")
    if not w.get("ok"):
        raise ai.AIError("저장 실패: " + "; ".join(w.get("errors") or []))
    note = {"만든것": key, "도구": mk["도구"], "모델": model, "글": prompt.strip(), "그림체": style, "크기": size,
            "시각": entry["time"], "파일": rel}
    note_rel = f"assets/images/{name}.prompt.json"
    store.write(pid, note_rel, base64.b64encode(json.dumps(note, ensure_ascii=False, indent=1).encode("utf-8")).decode("ascii"), "그림 기록")
    return {"ok": True, "path": rel, "note": note_rel, "seconds": entry["seconds"]}
