"""The game's library of stored AI judgments: library/<name>.json in the project, {key: {"value": …, "time": …}}.
A game asks the library first and calls the AI only for what is not there yet, then stores the answer — so the
library grows with every play and test play, the same situation gets the same answer, and the AI cost falls over time.
Written while a game runs (the player page has the editor token), so no backups: it is a cache that can be rebuilt.
The files are part of the game (kept in its repository) and readable in the editor.
"""

from __future__ import annotations

import json
import re
import time

from . import store

NAME_RE = re.compile(r"[\w\-]{1,60}")
MAX_VALUE = 20_000          # characters of one stored value (JSON)
MAX_FILE = 5_000_000        # bytes of one library file


def _file(pid: str, name: str):
    if not NAME_RE.fullmatch(name or ""):
        raise store.StoreError(f"저장소 이름이 잘못됨: {name}")
    return store.folder(pid) / "library" / f"{name}.json"


def _load(p) -> dict:
    try:
        return json.loads(p.read_text(encoding="utf-8")) if p.is_file() else {}
    except json.JSONDecodeError:
        return {}


def get(pid: str, name: str, key: str):
    """The stored value for key, or None."""
    hit = _load(_file(pid, name)).get(str(key))
    return hit.get("value") if isinstance(hit, dict) else None


def put(pid: str, name: str, key: str, value) -> dict:
    text = json.dumps(value, ensure_ascii=False)
    if len(text) > MAX_VALUE:
        raise store.StoreError(f"저장할 값이 너무 큼 ({len(text)}자 > {MAX_VALUE})")
    p = _file(pid, name)
    data = _load(p)
    data[str(key)] = {"value": value, "time": time.strftime("%Y-%m-%dT%H:%M:%S")}
    out = json.dumps(data, ensure_ascii=False, indent=1)
    if len(out.encode("utf-8")) > MAX_FILE:
        raise store.StoreError(f"저장소 {name}이(가) 가득 참")
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(out, encoding="utf-8")
    return {"ok": True, "size": len(data)}
