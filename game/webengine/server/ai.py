"""AI calls through the user's Claude subscription (Claude Code CLI). Never API keys: key variables are removed from the
environment so the CLI uses its subscription login. Tools, web and MCP are off — the model only reads the prompt and
writes text. Models are chosen per role (ai.json): 규칙 (designing rules — guides, schemas, checks: the good model, rare) ·
작성 (filling content inside those rules: the value model) · 올림 (when 작성 fails twice on a part: one step up) ·
검토 (review) · 실행 (in game: the value model). Every call is logged to logs/ai_calls.jsonl (role, purpose, model, sizes, seconds, ok) for cost checks.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

from . import store

SETTINGS = store.ROOT / "ai.json"
LOG = store.ROOT / "logs" / "ai_calls.jsonl"
# 상한원: spending caps per batch of calls, in won (the API price of the same use, converted with 환율 — the
# subscription itself is flat; the cap keeps a game cheap for later public play and saves the subscription's quota).
# A project overrides them in project.json settings.ai_limits.
DEFAULTS = {"roles": {"규칙": "claude-opus-5-5", "작성": "claude-haiku-5-5", "올림": "claude-sonnet-5-5", "검토": "claude-sonnet-5-5",
                      "실행": "claude-haiku-5-5"}, "timeout": 600,
            "환율": 1400, "상한원": {"한판": 10, "시험": 300, "제작": 3000}}
KEY_VARIABLES = {"ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL", "OPENAI_API_KEY"}


class AIError(RuntimeError):
    pass


class AIBudget(AIError):
    """The batch (one game, one test, one authoring run) reached its cap: no call was made."""


def limit_for(kind: str, pid: str | None = None) -> float | None:
    """The cap in won for a kind of batch (한판 · 시험 · 제작): the project's setting, else the engine default."""
    lim = dict(settings()["상한원"])
    if pid:
        try:
            lim.update((store.read(pid, "project.json").get("settings") or {}).get("ai_limits") or {})
        except store.StoreError:
            pass
    return lim.get(kind)


_ROWS_CACHE: dict = {"key": None, "rows": []}


def _rows() -> list[dict]:
    """The call log as rows. Read again only when the file changed (size or time) — every call's estimate reads it,
    and with thousands of rows a fresh read per call delayed calls by seconds when several seats asked at once."""
    if not LOG.is_file():
        return []
    st = LOG.stat()
    key = (st.st_size, st.st_mtime_ns)
    if _ROWS_CACHE["key"] == key:
        return _ROWS_CACHE["rows"]
    out = []
    for line in LOG.read_text(encoding="utf-8").splitlines():
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    _ROWS_CACHE.update(key=key, rows=out)
    return out


def estimate(model: str, prompt_chars: int, purpose: str = "", expect_out: int | None = None) -> dict:
    """Expected cost of one call in won, before making it. Learns from the log: tokens per prompt character, the
    output length of earlier calls with the same purpose, and how far past estimates were from the real cost."""
    if provider() in ("fake", "off"):        # no real AI: nothing to pay, nothing to block (ENGINE-002)
        return {"model": model, "usd": 0.0, "won": 0.0, "raw_usd": 0.0, "out_tokens": 0}
    # provider() reads the settings file — once here, not once per log row (2026-11-26: 7,858 rows took 2.8 s per estimate)
    prov = provider()
    cfg, rows = settings(), [r for r in _rows() if r.get("ok") and (prov != "codex-cli" or r.get("provider") == "codex-cli")]
    p_in, p_out = (cfg.get("가격") or {}).get(model, [3, 15])
    ratios = [((r.get("tokens_in") or 0) + (r.get("cache_read") or 0) + (r.get("cache_write") or 0)) / r["prompt_chars"]
              for r in rows if r.get("prompt_chars", 0) > 200 and (r.get("tokens_in") or r.get("cache_read") or r.get("cache_write"))]
    tok_per_char = sorted(ratios)[len(ratios) // 2] if ratios else 0.7
    base = purpose.split(":fix")[0]
    outs = [r.get("tokens_out") or 0 for r in rows if r.get("purpose", "").split(":fix")[0] == base and r.get("tokens_out")]
    out_tok = expect_out or (sum(outs) / len(outs) if outs else 3000)
    usd = (prompt_chars * tok_per_char * p_in + out_tok * p_out) / 1e6
    # calibration: the real cost over the list price of the tokens really used (so a wrong guess of the output length
    # does not leak into the price), for this model
    ks = [r["cost_usd"] / r["price_usd"] for r in rows if r.get("model") == model and r.get("price_usd") and r.get("cost_usd")]
    k = sorted(ks)[len(ks) // 2] if ks else 1.0
    return {"model": model, "usd": usd * k, "won": usd * k * cfg["환율"], "raw_usd": usd, "out_tokens": round(out_tok)}


def pick_model(role: str, prompt_chars: int, purpose: str, remaining_won: float | None, calls_left: int = 1) -> tuple[str, dict]:
    """The best model on the role's ladder whose expected cost fits this call's share of what is left
    (remaining ÷ calls left). As the budget shrinks the choice steps down; when even the cheapest does not fit what is
    left, no call is made (AIBudget)."""
    cfg = settings()
    ladder = (cfg.get("사다리") or {}).get(role) or [cfg["roles"].get(role)]
    ests = [estimate(m, prompt_chars, purpose) for m in ladder]
    if remaining_won is None:
        return ladder[0], ests[0]
    share = remaining_won / max(1, calls_left)
    for e in ests:
        if e["won"] <= share:
            return e["model"], e
    if ests[-1]["won"] <= remaining_won:
        return ests[-1]["model"], ests[-1]
    raise AIBudget(f"남은 예산 {remaining_won:.0f}원으로는 가장 싼 모델({ests[-1]['model']})도 예상 {ests[-1]['won']:.0f}원 — 부르지 않음")


def spent(session: str) -> float:
    """Won spent so far by the calls of one batch."""
    if not session or not LOG.is_file():
        return 0.0
    total = 0.0
    for line in LOG.read_text(encoding="utf-8").splitlines():
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        if r.get("session") == session:
            total += r.get("won") or 0
    return total


def settings() -> dict:
    s = json.loads(SETTINGS.read_text(encoding="utf-8-sig")) if SETTINGS.is_file() else {}
    return {**DEFAULTS, **s, "roles": {**DEFAULTS["roles"], **s.get("roles", {})}}


def find_cli() -> str | None:
    on_path = shutil.which("claude")
    if on_path and (os.name != "nt" or Path(on_path).suffix.lower() == ".exe"):
        return on_path
    found = list((Path.home() / ".vscode" / "extensions").glob("anthropic.claude-code-*/resources/native-binary/claude.exe"))
    return str(max(found, key=lambda p: p.stat().st_mtime)) if found else None


# Why the CLI failed, without keeping any of its text (AI-CLI-FAILLOG C-A2): the log gets a class, the fixed words below
# that were found (ASCII case does not matter), and the size and a short hash of stdout/stderr — never the output, the
# prompt or the CLI's path. The first class (in this order) with a found word wins. Wordings: δ-A3 a7.txt (≤60 words).
_SIGNALS = {
    "auth": ("login", "logged in", "unauthorized", "authentication", "invalid api key", "oauth", "401", "403", "forbidden",
             "has disabled"),
    "quota_or_rate": ("429", "529", "rate limit", "rate_limit", "quota", "credit", "usage limit", "overloaded", "limit reached",
                      "hit your limit"),
    "model_not_found": ("invalid model", "model not found", "not_found_error", "404", "selected model"),
    "unknown_option": ("unknown option", "unknown argument", "unrecognized", "invalid option", "allowed choices"),
    "network": ("enotfound", "econnrefused", "econnreset", "etimedout", "eai_again", "certificate", "cert_in_chain", "socket hang up",
                "fetch failed", "network", "connection error", "unable to connect", "connectionrefused", "internet connection", "timed out"),
    "permission": ("eacces", "eperm", "permission denied", "access is denied", "operation not permitted"),
}
_CANON = {w: w for ws in _SIGNALS.values() for w in ws}
# a whole token only (429 is not found in 429ms or 14290, oauth not in OAuthClient), ASCII-only case folding (re.A: ſ, İ,
# ı and the Kelvin sign K do not count as s, i, k), longest word first
_SIGNAL_RE = re.compile(r"(?<![A-Za-z0-9])(?:" + "|".join(re.escape(w) for w in sorted(_CANON, key=len, reverse=True)) + r")(?![A-Za-z0-9])",
                        re.I | re.A)


def _as_bytes(out) -> bytes:
    return out if isinstance(out, bytes) else str(out or "").encode("utf-8", "replace")


def _signals(*outs) -> list[str]:
    """The fixed words of _SIGNALS found in the outputs, sorted (never any other text)."""
    found = set()
    for out in outs:
        text = out.decode("utf-8", "replace") if isinstance(out, bytes) else str(out or "")
        found.update(_CANON[m.group(0).lower()] for m in _SIGNAL_RE.finditer(text) if m.group(0).lower() in _CANON)
    return sorted(found)                            # only values of _CANON: the allowlist's own strings


def _classify(signals: list[str], fallback: str) -> str:
    for cls, words in _SIGNALS.items():
        if any(w in signals for w in words):
            return cls
    return fallback


def _shape(name: str, out) -> dict:
    """An output's size and short hash: two failures can be told apart or matched without keeping the text."""
    raw = _as_bytes(out)
    return {f"{name}_len": len(raw), f"{name}_sha12": hashlib.sha256(raw).hexdigest()[:12]}


def _why(fallback: str, stderr=None, stdout=None, signals=None, fixed: bool = False) -> dict:
    """The C-A2 fields of one failure (only ever computed on a failure): class, words, and sizes/hashes when there was output."""
    signals = _signals(stderr, stdout) if signals is None else signals
    shape = {**_shape("stderr", stderr), **_shape("stdout", stdout)} if stderr is not None or stdout is not None else {}
    return {"error_class": fallback if fixed else _classify(signals, fallback), "signals": signals, **shape}


_CLASSES = {"auth", "quota_or_rate", "unknown_option", "model_not_found", "network", "permission", "not_found", "timeout", "bad_json",
            "provider_error", "other"}


def _safe_failure(value) -> dict:
    """Like _safe_diagnostic: the C-A2 fields are checked at the logging boundary; anything else is dropped."""
    d = value if type(value) is dict else {}
    out = {}
    if type(d.get("error_class")) is str and d["error_class"] in _CLASSES:
        out["error_class"] = d["error_class"]
    if type(d.get("signals")) is list:
        out["signals"] = sorted({_CANON[w] for w in d["signals"] if type(w) is str and w in _CANON})
    for k in ("stderr_len", "stdout_len"):
        if type(d.get(k)) is int and d[k] >= 0:
            out[k] = d[k]
    for k in ("stderr_sha12", "stdout_sha12"):
        if type(d.get(k)) is str and re.fullmatch(r"[0-9a-f]{12}", d[k]):
            out[k] = d[k]
    return out


def _log(entry: dict) -> None:
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


class _CLIPayload(dict):
    """Host-owned metadata is carried separately from the JSON payload."""


class _CLIError(AIError):
    pass


_CATEGORIES = {"CLI_NOT_FOUND", "PROCESS_START_FAILURE", "CLI_NONZERO_EXIT", "CLI_TIMEOUT",
               "RESPONSE_PARSE_FAILURE", "PROVIDER_REPORTED_ERROR", "SUCCESS", "PROCESSING_FAILURE", "UNKNOWN"}
_PHASES = {"discovery", "execute", "parse", "provider", "complete", "processing", "unknown"}


def _safe_diagnostic(value):
    """Validate every field at the logging boundary; never carry arbitrary values."""
    d = value if type(value) is dict else {}
    elapsed = d.get("elapsed_seconds")
    elapsed = elapsed if type(elapsed) in (int, float) and math.isfinite(elapsed) and elapsed >= 0 else None
    code = d.get("exit_code")
    return {"status": d.get("status") if type(d.get("status")) is str and d.get("status") in ("ok", "error") else "unknown",
            "provider": d.get("provider") if d.get("provider") in ("claude-cli", "codex-cli") else "claude-cli", "phase": d.get("phase") if type(d.get("phase")) is str and d.get("phase") in _PHASES else "unknown",
            "category": d.get("category") if type(d.get("category")) is str and d.get("category") in _CATEGORIES else "UNKNOWN",
            "exit_code": code if type(code) is int else None, "elapsed_seconds": elapsed,
            "response_received": d.get("response_received") if type(d.get("response_received")) is bool else False,
            "model_inference_confirmed": False}


def _diagnostic(status, phase, category, started, response=False, code=None):
    return _safe_diagnostic({"status": status, "provider": "claude-cli", "phase": phase, "category": category,
                             "exit_code": code, "elapsed_seconds": time.monotonic() - started,
                             "response_received": response, "model_inference_confirmed": False})


def _cli(model: str, prompt: str, timeout: int) -> dict:
    """One CLI call with host-owned per-call metadata. A failure also says why without any of the CLI's text
    (AI-CLI-FAILLOG C-A2): err.failure = class, fixed words found, size and hash of stdout/stderr."""
    started = time.monotonic()
    def fail(phase, category, message, response=False, code=None, failure=None):
        err = _CLIError(message)
        err.diagnostic = _diagnostic("error", phase, category, started, response, code)
        err.failure = failure or {}
        raise err from None
    try:
        exe = find_cli()
    except OSError:
        fail("discovery", "PROCESS_START_FAILURE", "CLI 탐색 실패", failure=_why("other"))
    if not exe:
        fail("discovery", "CLI_NOT_FOUND", "Claude Code CLI를 찾지 못했습니다", failure=_why("not_found"))
    try:
        with tempfile.TemporaryDirectory(prefix="webengine-ai-", ignore_cleanup_errors=True) as ws:
            args = [exe, "-p", "--model", model, "--output-format", "json", "--tools", "", "--no-session-persistence", "--strict-mcp-config"]
            env = {k: v for k, v in os.environ.items() if k.upper() not in KEY_VARIABLES}
            r = subprocess.run(args, input=prompt, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=ws, env=env,
                               timeout=timeout, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except subprocess.TimeoutExpired as err:
        fail("execute", "CLI_TIMEOUT", "CLI 응답 시간이 초과되었습니다", bool(err.stdout), failure=_why("timeout", err.stderr or "", err.stdout or "", fixed=True))
    except OSError:                    # no errno, no message: CLI-DIAGNOSTICS-001 keeps spawn errors unrecorded
        fail("execute", "PROCESS_START_FAILURE", "CLI 시작 실패", failure=_why("other"))
    response = bool(r.stdout)
    stderr = getattr(r, "stderr", None)
    if r.returncode != 0:
        fail("execute", "CLI_NONZERO_EXIT", "Claude 실행 실패", response, r.returncode, _why("other", stderr, r.stdout))
    try:
        payload = json.loads(r.stdout)
    except (ValueError, TypeError, RecursionError):      # not JSON, nothing, or too deep to read ([[[[…): never a crash
        fail("parse", "RESPONSE_PARSE_FAILURE", "Claude 응답을 읽을 수 없음", response, r.returncode, _why("bad_json", stderr, r.stdout))
    if not isinstance(payload, dict):
        fail("parse", "RESPONSE_PARSE_FAILURE", "Claude 응답 형식 오류", response, r.returncode, _why("bad_json", stderr, r.stdout))
    if payload.get("is_error"):
        # the provider's own reason, as fixed words only
        fail("provider", "PROVIDER_REPORTED_ERROR", "Claude 제공자 오류", response, r.returncode,
             _why("provider_error", stderr, r.stdout, signals=_signals(payload.get("subtype"), payload.get("result"))))
    result = _CLIPayload(payload)
    result.diagnostic = _diagnostic("ok", "complete", "SUCCESS", started, response, r.returncode)
    return result


# ---------------- providers (ENGINE-002: the AI connection is separate from game rules) ----------------
# Games and the runtime never name a provider; ai.json "제공자" picks one here. Each takes (model, prompt, timeout) and returns
# the CLI-shaped payload {result, usage, total_cost_usd, is_error}. A later public API or local model is one more adapter.
def _fake(model: str, prompt: str, timeout: int) -> dict:
    """Tests: a fixed answer, no call, no cost (ai.json "fake_answer" can set the text)."""
    return {"result": settings().get("fake_answer", '{"scores": {}, "why": "fake"}'), "usage": {"input_tokens": len(prompt) // 3, "output_tokens": 10},
            "total_cost_usd": 0}


def _off(model: str, prompt: str, timeout: int) -> dict:
    raise AIError("AI 제공자가 꺼져 있음 (ai.json 제공자 = off) — 게임은 규칙과 저장된 결과로 진행")


def _codex(model, prompt, timeout):
    from .codex_cli import call
    return call(model, prompt, timeout)


PROVIDERS = {"claude-cli": lambda m, p, t: _cli(m, p, t), "codex-cli": _codex, "fake": _fake, "off": _off}


def provider() -> str:
    return str(settings().get("제공자") or "claude-cli")


def _call(model: str, prompt: str, timeout: int) -> dict:
    name = provider()
    if name not in PROVIDERS:
        raise AIError(f"모르는 AI 제공자 '{name}' (있는 것: {list(PROVIDERS)})")
    return PROVIDERS[name](model, prompt, timeout)


def run(role: str, prompt: str, purpose: str = "", model: str | None = None, session: str = "", limit_won: float | None = None,
        calls_left: int = 1, tag: str = "", timeout: float | None = None) -> str:
    """Asks the AI and returns its text. Uses subscription quota.
    The model: `model` if given; else, with a cap (session + limit_won), the best model on the role's ladder whose
    expected cost fits this call's share of what is left (calls_left = calls still to come in this batch, this one
    included); else the role's model. When the batch has spent its cap, no call is made (AIBudget)."""
    cfg = settings()
    # timeout: the caller will not wait longer than this (a storyteller's answer that comes too late is not used) —
    # never longer than the engine's own limit, never shorter than 5 seconds
    wait = cfg["timeout"] if not timeout else max(5, min(int(cfg["timeout"]), int(math.ceil(timeout))))
    if role not in cfg["roles"] and not model:
        raise AIError(f"모르는 AI 역할: {role} (있는 것: {list(cfg['roles'])})")
    remaining = None
    if session and limit_won is not None:
        used = spent(session)
        if used >= limit_won:
            raise AIBudget(f"AI 비용 상한 {limit_won:g}원에 닿음 (이번 묶음 {used:.1f}원 사용) — 부르지 않음")
        remaining = limit_won - used
    if model:
        est = estimate(model, len(prompt), purpose)
    else:
        model, est = pick_model(role, len(prompt), purpose, remaining, calls_left)
    entry = {"time": time.strftime("%Y-%m-%dT%H:%M:%S"), "role": role, "purpose": purpose, "model": model, "provider": provider(), "prompt_chars": len(prompt),
             "est_usd": round(est["raw_usd"], 5), "est_won": round(est["won"], 1), **({"session": session} if session else {}), **({"tag": tag} if tag else {})}
    started = time.monotonic()
    try:
        payload = _call(model, prompt, wait)
        if isinstance(payload, _CLIPayload):
            entry["diagnostic"] = _safe_diagnostic(getattr(payload, "diagnostic", None))
        if payload.get("is_error"):
            signals = _signals(payload.get("subtype"), payload.get("result"))    # the provider's own reason, as fixed words only
            entry.update(error_class=_classify(signals, "provider_error"), signals=signals)
            raise AIError("Claude 제공자 오류")
        text = str(payload.get("result", ""))
        usage = payload.get("usage") or {}
        if not isinstance(usage, dict):
            raise AIError("AI 사용량 형식 오류")
        usd = payload.get("total_cost_usd") or 0
        p_in, p_out = (cfg.get("가격") or {}).get(model, [3, 15])
        tin = (usage.get("input_tokens") or 0) + (usage.get("cache_read_input_tokens") or 0) + (usage.get("cache_creation_input_tokens") or 0)
        entry["price_usd"] = round((tin * p_in + (usage.get("output_tokens") or 0) * p_out) / 1e6, 6)
        entry.update(ok=True, output_chars=len(text), cost_usd=usd, won=round(usd * cfg["환율"], 2),
                     tokens_in=usage.get("input_tokens"), tokens_out=usage.get("output_tokens"),
                     cache_read=usage.get("cache_read_input_tokens"), cache_write=usage.get("cache_creation_input_tokens"))
        if provider() == "codex-cli":
            # Codex reports tokens, not the user's subscription bill. Retain the
            # existing won guard using an explicitly labelled API-equivalent estimate.
            # No cache discount is taken. It is not measured monetary expenditure.
            entry["price_usd"] = round(entry["price_usd"] + (usage.get("cache_creation_input_tokens") or 0) * p_in * .25 / 1e6, 8)
            entry.update(cost_usd=None, actual_charge=None, won=round(entry["price_usd"] * cfg["환율"], 4),
                         budget_basis="api_equivalent_without_cache_discount",
                         codex_usage=payload.get("codex_usage"),
                         startup_notices=payload.get("startup_notices",0),
                         cost_note="구독 청구액 미제공; 토큰과 설정 단가로 계산한 내부 제한값")
        return text
    except subprocess.TimeoutExpired as err:
        entry.update(ok=False, error="CLI_TIMEOUT")
        raise AIError(f"{wait}초 안에 답이 오지 않았습니다.") from err
    except AIError as err:
        entry.update(ok=False, error="ai_error")
        if isinstance(err, _CLIError):
            entry["diagnostic"] = _safe_diagnostic(getattr(err, "diagnostic", None))
            entry.update(_safe_failure(getattr(err, "failure", None)))
        elif "diagnostic" in entry:
            entry["diagnostic"].update(status="error", phase="processing", category="PROCESSING_FAILURE")
        message = "AI 제공자가 꺼져 있음 (ai.json 제공자 = off) — 게임은 규칙과 저장된 결과로 진행" if provider() == "off" else "AI 처리 중 오류가 발생했습니다"
        raise AIError(message) from None
    except Exception:
        entry.update(ok=False, error="unexpected_error")
        if "diagnostic" in entry:
            entry["diagnostic"].update(status="error", phase="processing", category="PROCESSING_FAILURE")
        raise AIError("AI 처리 중 오류가 발생했습니다") from None
    finally:
        entry["seconds"] = round(time.monotonic() - started, 1)
        _log(entry)


def extract_json(text: str):
    """The first JSON object or array in a model's answer (it may wrap it in ``` fences or words)."""
    t = text.strip()
    if "```" in t:
        parts = t.split("```")
        for p in parts[1::2]:
            p = p[p.index("\n") + 1:] if p[:10].strip().isalpha() and "\n" in p else p
            try:
                return json.loads(p)
            except json.JSONDecodeError:
                continue
    for open_, close in (("{", "}"), ("[", "]")):
        i, j = t.find(open_), t.rfind(close)
        if 0 <= i < j:
            try:
                return json.loads(t[i:j + 1])
            except json.JSONDecodeError:
                pass
    raise AIError("답에서 JSON을 찾지 못했습니다: " + t[:200])


# ---------------- measurement (ENGINE-002 #6) ----------------
def cost_report(rows: list[dict] | None = None, users: int = 0, plays_per_user: float = 1.0, days: int = 30) -> dict:
    """AI use per batch kind (한판 = one game, 시험 = one test, 제작 = authoring): calls, tokens and won per batch (average
    and max), how often a stored judgment answered instead of the AI, and — from the measured average of a game — the
    expected cost for `users` players each playing `plays_per_user` games a day. Won = the API price of the same use
    (the subscription is flat); a public service's real price must be checked before release (ENGINE-002 #8)."""
    rows = _rows() if rows is None else rows
    kind_of = lambda s: "한판" if s.startswith("play:") else "시험" if s.startswith("test:") else "제작" if s.startswith("make:") else "기타"
    batches: dict[str, dict] = {}
    store_hit = store_miss = nobatch = 0
    marks: dict[str, set] = {}
    for r in rows:
        if r.get("role") == "판":
            marks.setdefault(r.get("session") or "", set()).add(r.get("status"))
            continue
        if r.get("role") == "저장소":
            store_hit += 1 if r.get("hit") else 0
            store_miss += 0 if r.get("hit") else 1
            continue
        s = r.get("session") or ""
        if not s:
            nobatch += 1
            continue
        b = batches.setdefault(s, {"kind": kind_of(s), "calls": 0, "fail": 0, "tokens_in": 0, "tokens_out": 0, "won": 0.0, "tags": set()})
        if r.get("tag"):
            b["tags"].add(r["tag"])           # the game's label — the engine only groups by it
        b["calls"] += 1; b["fail"] += 0 if r.get("ok") else 1
        b["tokens_in"] += (r.get("tokens_in") or 0) + (r.get("cache_read") or 0) + (r.get("cache_write") or 0)
        b["tokens_out"] += r.get("tokens_out") or 0; b["won"] += r.get("won") or 0
    kinds: dict[str, dict] = {}
    for b in batches.values():
        k = kinds.setdefault(b["kind"], {"batches": 0, "calls": 0, "fail": 0, "tokens": 0, "won": 0.0, "max_won": 0.0})
        k["batches"] += 1; k["calls"] += b["calls"]; k["fail"] += b["fail"]; k["tokens"] += b["tokens_in"] + b["tokens_out"]
        k["won"] += b["won"]; k["max_won"] = max(k["max_won"], b["won"])
    for k in kinds.values():
        n = k["batches"]
        k.update(avg_calls=round(k["calls"] / n, 2), avg_tokens=round(k["tokens"] / n), avg_won=round(k["won"] / n, 2), won=round(k["won"], 2), max_won=round(k["max_won"], 2))
    # games (ENGINE-002 Q3): every started game counts, AI or not — by kind, started / completed / unfinished,
    # average per started game and per completed game, and by the tags the game put on its calls (ENGINE-003: the engine
    # does not know what a tag means — e.g. a game tags its free-action calls and sees those games apart)
    games: dict[str, dict] = {}
    for s, st in marks.items():
        if "start" not in st or not s:
            continue
        g = games.setdefault(kind_of(s), {"started": 0, "completed": 0, "unfinished": 0, "no_ai": 0, "won_started": 0.0, "won_completed": 0.0,
                                           "by_tag": {}})
        b = batches.get(s, {"calls": 0, "won": 0.0, "tags": set()})
        g["started"] += 1; g["won_started"] += b["won"]; g["no_ai"] += 0 if b["calls"] else 1
        if "done" in st:
            g["completed"] += 1; g["won_completed"] += b["won"]
        else:
            g["unfinished"] += 1
        for tag in (sorted(b["tags"]) or ["(태그 없음)"]):     # games grouped by the tags the game put on its AI calls
            t = g["by_tag"].setdefault(tag, {"games": 0, "won": 0.0})
            t["games"] += 1; t["won"] += b["won"]
    for g in games.values():
        g.update(avg_per_started=round(g["won_started"] / g["started"], 2), avg_per_completed=round(g["won_completed"] / g["completed"], 2) if g["completed"] else None,
                 estimate=True)
        for t in g["by_tag"].values():
            t["avg_won"] = round(t["won"] / t["games"], 2)
    looked = store_hit + store_miss
    marked = games.get("한판") or games.get("시험")
    game = kinds.get("한판") or kinds.get("시험") or {}
    per_game = marked["avg_per_started"] if marked else game.get("avg_won", 0.0)
    projection = None
    if users:
        daily = per_game * users * plays_per_user
        based = ("한판" if "한판" in games else "시험") if marked else ("한판" if "한판" in kinds else "시험")
        projection = {"users": users, "plays_per_user": plays_per_user, "per_game_won": per_game, "based_on": based, "counted": "시작된 판 전체(AI 0번 포함)" if marked else "AI를 부른 판만",
                      "daily_won": round(daily, 1), "period_days": days, "period_won": round(daily * days, 1)}
    if projection and projection["based_on"] == "시험":
        projection["warning"] = "실제 한 판 기록이 없어 '시험' 평균으로 계산함 — 시험은 AI 판단을 일부러 만드는 경우가 많아 실제보다 클 수 있음"
    if projection:
        projection["note"] = ("시작된 판 전체 평균(AI 0번 판 포함)" if marked else "판 기록(시작·완료)이 없어 AI를 부른 판의 평균") + " — 추정치, 실제 플레이 기록이 쌓이기 전에는 확정이 아님"
    return {"no_batch_calls": nobatch, "games": games, "kinds": kinds, "store": {"hit": store_hit, "miss": store_miss, "hit_rate": round(store_hit / looked, 3) if looked else None},
            "projection": projection}
