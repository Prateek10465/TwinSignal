"""Room registry + message routing shared by every transport (stdlib ws server, FastAPI)."""
from __future__ import annotations

import random
import string

import datetime

import leaderboard
from game import Room, Timing

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class Hub:
    def __init__(self, timing: Timing | None = None):
        self.rooms: dict[str, Room] = {}
        self.timing = timing

    def _new_code(self) -> str:
        while True:
            code = "".join(random.choice(ALPHABET) for _ in range(4))
            if code not in self.rooms:
                return code

    async def on_message(self, conn, msg: dict):
        if not isinstance(msg, dict):
            return
        t = msg.get("type")
        room: Room | None = getattr(conn, "room", None)
        if t == "create" and room is None:
            code = self._new_code()
            room = self.rooms[code] = Room(code, self.timing)
            room.on_finish = self._on_finish
            if msg.get("mode") in ("4p", "8p"):
                room.mode = msg["mode"]
            if msg.get("variant") in ("endless", "daily"):
                room.variant, room.mode = msg["variant"], "4p"
            if await room.join(conn, msg.get("name", "")):
                conn.room = room
            else:
                self.rooms.pop(code, None)
        elif t == "join" and room is None:
            code = str(msg.get("room", "")).strip().upper()
            r = self.rooms.get(code)
            if r is None:
                await conn.send({"type": "error", "msg": f"No room {code or '????'}. Check the code."})
                return
            if await r.join(conn, msg.get("name", "")):
                conn.room = r
        elif t == "get_leaderboard":
            await conn.send({"type": "leaderboard", **self.board()})
        elif room is not None:
            await room.on_message(conn, msg)

    @staticmethod
    def today() -> str:
        return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

    def board(self) -> dict:
        return leaderboard.snapshot(self.today())

    async def _on_finish(self, room: Room, summary: dict):
        humans = [i["name"] for i in room.conns.values()] or ["AGENTS"]
        entry = {"name": "+".join(humans)[:20], "points": summary["total_points"], "stars": summary["stars"],
                 "levels": summary["levels"]}
        key = ("daily:" + room.daily_seed) if room.variant == "daily" else "endless"
        rank = leaderboard.submit(key, entry)
        await room._bcast({"type": "leaderboard", "rank": rank, "board": key, **leaderboard.snapshot(room.daily_seed)})

    async def on_close(self, conn):
        room: Room | None = getattr(conn, "room", None)
        if room is None:
            return
        await room.leave(conn)
        conn.room = None
        if not room.conns:
            self.rooms.pop(room.code, None)
