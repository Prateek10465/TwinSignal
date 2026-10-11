"""Tiny JSON-file leaderboard for the Daily Case File and Endless boards."""
from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path

PATH = Path(os.environ.get("TS_LEADERBOARD", Path(__file__).resolve().parent / "data" / "leaderboard.json"))
_lock = threading.Lock()


def _load() -> dict:
    try:
        return json.loads(PATH.read_text())
    except Exception:
        return {}


def submit(board: str, entry: dict) -> int:
    """Store an entry, keep the best 50, return its 1-based rank (0 if it fell off)."""
    entry = {**entry, "at": int(time.time())}
    with _lock:
        data = _load()
        rows = data.get(board, [])
        rows.append(entry)
        rows.sort(key=lambda r: (-r.get("points", 0), r.get("at", 0)))
        rows = rows[:50]
        data[board] = rows
        try:
            PATH.parent.mkdir(parents=True, exist_ok=True)
            tmp = PATH.with_suffix(".tmp")
            tmp.write_text(json.dumps(data))
            tmp.replace(PATH)
        except Exception:
            pass
        for i, r in enumerate(rows, start=1):
            if r is entry:
                return i
    return 0


def top(board: str, n: int = 10) -> list[dict]:
    with _lock:
        return _load().get(board, [])[:n]


def snapshot(daily_seed: str, n: int = 10) -> dict:
    return {"daily": {"date": daily_seed, "entries": top("daily:" + daily_seed, n)},
            "endless": {"entries": top("endless", n)}}
