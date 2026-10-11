"""Twin Signal game core.  Transport-agnostic: a Room talks to anything with `await conn.send(dict)`.

Server is authoritative.  A client only ever receives:
  * its own card and door for each round (plus the win/miss bit, after the round),
  * its pair's shared gauges, and aggregate scores.
Doors for a whole half-mission are drawn at LOCK time from the knobs as they are then, so nothing
that happens during the silent run can influence them (no-signalling by construction).
"""
from __future__ import annotations

import asyncio
import random
import datetime
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import quantum as Q

CODENAMES = ["FOX", "WREN", "LYNX", "OTTER", "HARE", "MOTH", "PIKE", "ROOK"]

MISSIONS = {
    1: dict(id=1, name="TRAINING DAY", mode="classical", V=1.0, rounds=200, quota=140, drift=False, drifts=0,
            cheat_ok=False, meeting=False, noise="OFF", stars=(146, 150), mods=[],
            blurb="Link offline. Agree on fixed answers and find out where the 75% wall is.",
            story="HQ // 06:00. Welcome to the Twin Desk. Two sealed rooms, one card and one door each. "
                  "Today the Link is dark. Agree your answers now. Nobody beats three in four. Find out why."),
    2: dict(id=2, name="TWIN LINK ONLINE", mode="quantum", V=1.0, rounds=200, quota=160, drift=False, drifts=0,
            cheat_ok=True, meeting=True, noise="LOW", stars=(166, 170), mods=[],
            blurb="The Twin Link is live. Tune your knobs until the gauges clear the wall.",
            story="HQ // 09:40. The Twin Link is live. Two particles, one shared secret. "
                  "Turn your knobs until all four gauges clear the wall. Do not talk during the run."),
    3: dict(id=3, name="THE JAMMER", mode="quantum", V=0.8, rounds=200, quota=154, drift=True, drifts=1,
            cheat_ok=True, meeting=True, noise="HIGH", stars=(158, 164), mods=[],
            blurb="Jamming adds noise, and halfway through a knob drifts one snap. One recalibration token.",
            story="HQ // 13:15. Enemy jamming. Expect noise, and a knob will slip a snap halfway through. "
                  "You hold one recalibration token. Spend it, or retune by hand."),
    4: dict(id=4, name="THE MOLE", mode="quantum", V=1.0, rounds=200, quota=160, drift=False, drifts=0,
            cheat_ok=True, meeting=True, noise="LOW", stars=(166, 170), mods=["blackout"],
            blurb="Last mission. One agent's link may be a fake. Watch the scores.",
            story="HQ // 23:55. One of you is not who they say. Their link may be a fake. "
                  "One gauge is blacked out tonight. Trust the numbers, not the story."),
}

STAR_RATE_NAMES = {0: "NO STARS", 1: "1 STAR", 2: "2 STARS", 3: "3 STARS"}


def _thresholds(p: float, n: int) -> tuple[int, tuple[int, int]]:
    """quota and (2-star, 3-star) win counts for a link whose best win probability is p."""
    sd = (n * p * (1 - p)) ** 0.5
    return int(n * p - 0.9 * sd), (int(n * p - 0.1 * sd), int(n * p + 0.7 * sd))


def _noise_label(V: float) -> str:
    return "OFF" if V <= 0 else ("LOW" if V >= 0.93 else ("MID" if V >= 0.84 else "HIGH"))


def endless_mission(k: int, rng: random.Random) -> dict:
    """Endless: the link degrades a little every level.  The 75% wall is only beatable while V > 0.707."""
    V = max(0.5, round(1.0 - 0.06 * (k - 1), 3))
    mods = []
    if k >= 3:
        pool = ([["blackout"], ["drift"], ["blackout", "drift"]] if k < 6
                else [["blackout", "drift"], ["double_drift"], ["blackout", "double_drift"]])
        mods = list(rng.choice(pool))
    drifts = 2 if "double_drift" in mods else (1 if "drift" in mods else 0)
    return dict(id=100 + k, name=f"LEVEL {k}", mode="quantum", V=V, rounds=100, quota=76, drift=drifts > 0, drifts=drifts,
                cheat_ok=False, meeting=False, noise=_noise_label(V), stars=(82, 85), mods=mods,
                blurb=f"Link quality {round(V * 100)}%. Clear the wall before the link dies.",
                story=f"HQ // LEVEL {k}. Link quality {round(V * 100)}%. "
                      + ("Below 71% no quantum advantage is left. " if V < 0.78 else "The jamming grows every round. ")
                      + "Two misses and the line goes dead.")


def daily_missions(seed: str) -> list[dict]:
    r = random.Random("daily:" + seed)
    out = []
    plans = [(r.uniform(0.92, 1.0), r.choice([[], ["blackout"]])),
             (r.uniform(0.84, 0.9), r.choice([["blackout"], ["drift"]])),
             (r.uniform(0.76, 0.82), r.choice([["double_drift"], ["blackout", "drift"], ["blackout", "double_drift"]]))]
    for i, (V, mods) in enumerate(plans, start=1):
        V = round(V, 3)
        drifts = 2 if "double_drift" in mods else (1 if "drift" in mods else 0)
        quota, st = _thresholds(Q.noisy(Q.TSIRELSON, V), 200)
        out.append(dict(id=200 + i, name=f"CASE FILE {i}", mode="quantum", V=V, rounds=200, quota=quota, drift=drifts > 0,
                        drifts=drifts, cheat_ok=False, meeting=False, noise=_noise_label(V), stars=st, mods=list(mods),
                        blurb=f"Daily case {seed}. Link quality {round(V * 100)}%. Everyone gets the same cards today.",
                        story=f"HQ // CASE FILE {i} of 3, {seed}. Same cards for every team on the wire today. "
                              f"Link quality {round(V * 100)}%. Make your numbers count."))
    return out


@dataclass
class Timing:
    brief: float = 60.0
    lock: float = 2.5
    round_s: float = 0.055
    drift_pause: float = 12.0
    debrief: float = 20.0
    meeting: float = 45.0
    meeting_8p: float = 70.0
    reveal: float = 14.0
    bot_ready_min: float = 5.0
    bot_vote_lo: float = 4.0
    bot_vote_hi: float = 22.0


@dataclass
class Seat:
    idx: int
    name: str                      # display name (codename in 4P/8P)
    codename: str
    conn: Any = None               # live connection or None (bot-controlled)
    role: str = "agent"            # agent | mole
    burned: bool = False
    knobs: list = field(default_factory=lambda: [0, 0])   # snap index k per card colour (0 blue, 1 red)
    drift: int = 0
    ready: bool = False
    vote: Any = "unset"            # "unset" | "skip" | seat idx
    cheat: bool = False            # Mole only: cheating this mission
    bot_ready_at: float = 0.0
    bot_vote_at: float = 0.0
    persona: str = ""              # bots only: CAUTIOUS | HOTHEAD | CHATTY
    alibi_used: bool = False
    final_eff: list = field(default_factory=lambda: [0, 0])   # knobs (incl. drift) in force at the end of a run

    @property
    def human(self) -> bool:
        return self.conn is not None

    @property
    def pair(self) -> int:
        return self.idx // 2

    @property
    def partner(self) -> int:
        return self.idx ^ 1

    @property
    def is_alice(self) -> bool:
        return self.idx % 2 == 0

    def eff(self) -> list:
        return [self.knobs[0] + self.drift, self.knobs[1] + self.drift]


PERSONAS = {
    # vote threshold on P(honest <= score), ready-delay multiplier, wager appetite
    "CAUTIOUS": dict(thr=0.04, ready=1.3, wager=0.0),
    "HOTHEAD": dict(thr=0.25, ready=0.6, wager=0.7),
    "CHATTY": dict(thr=0.10, ready=1.0, wager=0.3),
}

PERSONA_LINES = {
    "CAUTIOUS": ["I would not burn anyone without a retest first", "within the band is within the band, let's stay calm",
                 "one weak mission is not proof"],
    "HOTHEAD": ["somebody is faking, I say we burn now", "that score smells wrong to me", "no more waiting, vote"],
    "CHATTY": ["random thought: red/red is always the hard one", "did anyone else's gauges flicker?",
               "I keep thinking about the numbers, did we cross the wall every time?"],
}


def _pers(s: "Seat") -> dict:
    return PERSONAS.get(s.persona or "CHATTY", PERSONAS["CHATTY"])


class Room:
    def __init__(self, code: str, timing: Timing | None = None, seed: int | None = None):
        self.code = code
        self.t = timing or Timing()
        self.rng = random.Random(seed)
        self.mode = "4p"
        self.variant = "story"                  # story | endless | daily
        self.daily_seed = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
        self.on_finish = None                   # async callback(room, summary), set by the Hub
        self.conns: dict[Any, dict] = {}        # conn -> {"name","seat"|None,"spectator":bool}
        self.host: Any = None
        self._task: asyncio.Task | None = None
        self._wake = asyncio.Event()
        self._reset_state()

    def _reset_state(self):
        self.seats: list[Seat] = []
        self.started = False
        self.phase = "lobby"
        self.phase_ends: float = 0.0
        self.mission: dict | None = None
        self.mission_no = 0
        self.mission_ids: list[int] = []
        self.history: dict[int, list] = {}      # pair -> [{m, rate, wins, n, fake}]
        self.pair_energy: dict[int, int] = {p: 1 for p in self._pairs()}
        self.energy = sum(self.pair_energy.values())
        self.shadow = 2 if self.mode == "4p" else 3
        self.jammed: dict[int, float] = {}
        self.tokens = 0
        self.wrong_burns = 0
        self.cheats_used = 0
        self.cheat_log: list[int] = []
        self.moles: list[int] = []
        self.bot_cheat_missions: set[int] = set()
        self.bot_cheat_schedule: dict[int, set[int]] = {}
        self.finished = False
        self.winner: str | None = None
        self.nerd: dict | None = None
        self.round_idx = 0
        self.pair_mode: dict[int, str] = {}
        self.last_result: dict | None = None
        self.retests: list[dict] = []
        self.wager: dict[int, bool] = {0: False, 1: False, 2: False, 3: False}
        self.blackout: dict[int, Any] = {0: None, 1: None, 2: None, 3: None}
        self.points: dict[int, int] = {0: 0, 1: 0, 2: 0, 3: 0}
        self.stars: dict[int, list] = {0: [], 1: [], 2: [], 3: []}
        self.strikes = 0
        self.missions_log: list[dict] = []      # per-mission, per-pair results for the case file
        self.timeline: list[dict] = []
        self.summary: dict | None = None
        self.card_plan: dict = {}
        self.engine = Q.engine_name()
        self.bet_votes: list = []

    # ------------------------------------------------------------------ helpers
    def now(self) -> float:
        return time.monotonic()

    def _pairs(self) -> list[int]:
        return [0, 1] if self.mode == "4p" else [0, 1, 2, 3]

    def _seat_conns(self, seat: Seat):
        return [seat.conn] if seat.conn else []

    def _all_conns(self):
        return list(self.conns.keys())

    async def _send(self, conn, msg: dict):
        try:
            await conn.send(msg)
        except Exception:
            pass

    async def _bcast(self, msg: dict, only_pair: int | None = None, only_seats: list[int] | None = None):
        """Broadcast to every connection (spectators included) or to a subset."""
        for conn, info in list(self.conns.items()):
            s = info.get("seat")
            if only_pair is not None:
                if s is None:
                    if info.get("watch_pair") != only_pair:
                        continue
                elif self.seats[s].pair != only_pair:
                    continue
            if only_seats is not None and (s is None or s not in only_seats):
                continue
            await self._send(conn, msg)

    def _bump(self):
        self._wake.set()

    async def _sleep_until(self, deadline: float, cond=None):
        """Sleep until deadline or until cond() is true.  Wakes on any state change."""
        while True:
            if cond and cond():
                return
            rem = deadline - self.now()
            if rem <= 0:
                return
            self._wake.clear()
            try:
                await asyncio.wait_for(self._wake.wait(), timeout=min(rem, 0.25))
            except asyncio.TimeoutError:
                pass

    async def _set_phase(self, name: str, dur: float = 0.0, **extra):
        self.phase = name
        self.phase_ends = self.now() + dur
        msg = {"type": "phase", "name": name, "ends_in": round(dur, 2), "mission": self._mission_pub(), **extra}
        await self._bcast(msg)

    def _mission_pub(self):
        m = self.mission
        if not m:
            return None
        return {"id": m["id"], "n": self.mission_no, "of": len(self.mission_ids), "name": m["name"],
                "rounds": m["rounds"], "quota": m["quota"], "noise": m["noise"], "drift": m["drift"],
                "drifts": m.get("drifts", 0), "mods": list(m.get("mods", [])), "stars": list(m["stars"]),
                "V": m["V"], "variant": self.variant,
                "blurb": m["blurb"], "mode": m["mode"] if m["mode"] == "classical" else "link"}

    # ------------------------------------------------------------------ naming
    def _seat_label(self, s: Seat) -> str:
        return s.name

    def players_pub(self) -> list[dict]:
        out = []
        for s in self.seats:
            out.append({"seat": s.idx, "name": s.name, "codename": s.codename, "pair": s.pair,
                        "human": s.human, "bot": not s.human, "burned": s.burned, "ready": s.ready,
                        "voted": s.vote != "unset" and not s.burned,
                        "persona": (s.persona or "CHATTY") if not s.human else ""})
        return out

    async def send_room(self, conn=None):
        targets = [conn] if conn else self._all_conns()
        for c in targets:
            info = self.conns.get(c)
            if info is None:
                continue
            si = info.get("seat")
            seat = self.seats[si] if si is not None else None
            you = {"seat": si, "name": info["name"], "pair": seat.pair if seat else info.get("watch_pair"),
                   "spectator": seat is None and self.started, "host": c is self.host}
            if seat:
                you["name"] = seat.name
                you["role"] = seat.role
                you["codename"] = seat.codename
                you["is_alice"] = seat.is_alice
                you["knobs"] = [k + 2 for k in seat.knobs]
                if seat.role == "mole":
                    you["shadow"] = self.shadow
                    you["cheats_left"] = self.shadow
                    you["cheat_now"] = seat.cheat
                    cell = [{"seat": m_idx, "name": self.seats[m_idx].name, "pair": self.seats[m_idx].pair}
                            for m_idx in self.moles if m_idx < len(self.seats)]
                    you["moles"] = cell
                    you["cell"] = cell
            msg = {"type": "room", "code": self.code, "mode": self.mode, "started": self.started,
                   "variant": self.variant, "daily": self.daily_seed, "engine": self.engine,
                   "can_rematch": self.phase == "finale" and self.nerd is not None,
                   "phase": self.phase, "you": you, "players": self.players_pub(),
                   "lobby": [{"name": i["name"], "host": cc is self.host} for cc, i in self.conns.items()
                             if i.get("seat") is not None or not self.started],
                   "mission": self._mission_pub(), "energy": self.energy, "pair_energy": dict(self.pair_energy), "tokens": self.tokens,
                   "wrong_burns": self.wrong_burns, "max_wrong": 2 if self.mode == "4p" else 3}
            await self._send(c, msg)

    # ------------------------------------------------------------------ connections
    async def join(self, conn, name: str) -> bool:
        raw_name = (name or "").strip().upper()[:8]
        used_names = {info["name"] for info in self.conns.values()}
        if raw_name:
            assigned_name = raw_name
            has_nickname = True
        else:
            assigned_name = next((c for c in CODENAMES if c not in used_names), CODENAMES[len(self.conns) % len(CODENAMES)])
            has_nickname = False

        if self.started:
            await self._send(conn, {"type": "error", "msg": "That room's mission is already under way."})
            return False
        humans = sum(1 for i in self.conns.values())
        if humans >= (4 if self.mode == "4p" else 8):
            await self._send(conn, {"type": "error", "msg": "Room is full."})
            return False
        self.conns[conn] = {"name": assigned_name, "seat": None, "has_nickname": has_nickname, "raw_nickname": raw_name}
        if self.host is None:
            self.host = conn
        await self.send_room()
        return True

    async def leave(self, conn):
        info = self.conns.pop(conn, None)
        if info is None:
            return
        si = info.get("seat")
        if si is not None:
            self.seats[si].conn = None          # a bot takes over
        if conn is self.host:
            self.host = next(iter(self.conns), None)
        if not self.started:
            await self.send_room()
        if not self.conns and self._task:
            self._task.cancel()
        self._bump()

    # ------------------------------------------------------------------ messages
    async def on_message(self, conn, msg: dict):
        t = msg.get("type")
        info = self.conns.get(conn)
        if info is None:
            return
        seat = self.seats[info["seat"]] if info.get("seat") is not None else None

        if t == "set_mode" and conn is self.host and not self.started:
            if msg.get("mode") in ("4p", "8p") and len(self.conns) <= (4 if msg["mode"] == "4p" else 8):
                self.mode = msg["mode"]
                if self.mode == "8p":
                    self.variant = "story"
                await self.send_room()
        elif t == "set_variant" and conn is self.host and not self.started:
            v = msg.get("variant")
            if v in ("story", "endless", "daily"):
                if self.mode == "8p" and v != "story":
                    return
                self.variant = v
                if v != "story":
                    self.mode = "4p"             # Endless and Daily are 4-player co-op runs
                await self.send_room()
        elif t == "start" and conn is self.host and not self.started:
            await self.start()
        elif t == "rematch" and conn is self.host and self.phase == "finale" and self.nerd is not None:
            await self.rematch()
        elif t == "wager" and seat and self.phase == "brief" and not seat.burned:
            self.wager[seat.pair] = bool(msg.get("on"))
            for o in self.pair_seats(seat.pair):
                o.ready = False
            await self._send_quota(seat.pair)
            await self._send_room_ready()
        elif t == "alibi" and seat and self.phase == "meeting" and not seat.burned and not seat.alibi_used:
            await self._alibi(seat)
        elif t == "forge" and seat and seat.role == "mole" and self.phase == "meeting" and not seat.burned and not seat.alibi_used:
            if self.shadow > 0:
                self.shadow -= 1
                await self._forge_alibi(seat)
                await self.send_room()
        elif t == "jam" and seat and seat.role == "mole" and self.phase == "brief" and not seat.burned:
            pair = msg.get("pair")
            if (isinstance(pair, int) and pair in self._pairs()
                    and pair != seat.pair and pair not in self.jammed
                    and self.shadow > 0):
                self.shadow -= 1
                self.jammed[pair] = 0.18
                await self._send(conn, {"type": "toast", "text": f"PAIR {pair + 1} JAMMED"})
                await self.send_room()
        elif t == "knob" and seat and self.phase in ("brief", "drift") and not seat.burned:
            slot, pos = msg.get("slot"), msg.get("pos")
            if slot in (0, 1) and isinstance(pos, int) and 0 <= pos <= 4:
                seat.knobs[slot] = pos - 2
                seat.ready = False
                await self._send_gauges(seat.pair)
                await self._send_room_ready()
        elif t == "ready" and seat and self.phase in ("brief", "debrief", "reveal") and not seat.burned:
            seat.ready = bool(msg.get("v", True))
            if self.phase == "brief" and seat.ready:
                for o in self.seats:
                    if not o.human and o.pair == seat.pair:
                        o.bot_ready_at = max(o.bot_ready_at, self.now() + min(1.2, self.t.bot_ready_min * 2))
            await self._send_room_ready()
            self._bump()
        elif t == "mole_choice" and seat and seat.role == "mole" and self.phase == "brief":
            want = bool(msg.get("cheat"))
            if want and (self.shadow <= 0 or not self.mission["cheat_ok"]):
                want = False
            seat.cheat = want
            await self._send_room_ready()
            await self.send_room(conn)
        elif t == "chat" and self.phase in ("brief", "drift", "meeting", "debrief", "reveal"):
            text = str(msg.get("text", "")).strip()[:140]
            if text and (seat is not None and not seat.burned):
                scope = msg.get("scope")
                if scope == "mole" and seat.role == "mole" and self.phase in ("brief", "drift", "meeting"):
                    m_msg = {"type": "chat", "seat": seat.idx, "from": seat.name, "text": text, "scope": "mole"}
                    await self._bcast(m_msg, only_seats=self.moles)
                else:
                    await self._chat(seat, text)
        elif t == "vote" and seat and self.phase == "meeting" and not seat.burned:
            tgt = msg.get("target")
            if tgt is None:
                seat.vote = "skip"
            elif isinstance(tgt, int) and 0 <= tgt < len(self.seats) and tgt != seat.idx and not self.seats[tgt].burned:
                seat.vote = tgt
            else:
                return
            await self._send_votes()
            self._bump()
        elif t == "probe" and seat and self.phase == "meeting" and not seat.burned:
            await self._retest(msg.get("pair"), caller_seat=seat)
        elif t == "recalibrate" and seat and self.phase == "drift" and not seat.burned:
            if self.tokens > 0:
                self.tokens -= 1
                for s in self.seats:
                    if s.pair == seat.pair:
                        s.drift = 0
                await self._send_gauges(seat.pair)
                await self._bcast({"type": "toast", "text": "LINK RECALIBRATED"}, only_pair=seat.pair)
                await self.send_room()

    async def _send_room_ready(self):
        await self._bcast({"type": "ready", "players": [{"seat": s.idx, "ready": s.ready,
                                                          "voted": s.vote != "unset" and not s.burned}
                                                         for s in self.seats]})

    async def _chat(self, seat: Seat, text: str):
        msg = {"type": "chat", "seat": seat.idx, "from": seat.name, "text": text, "scope": "all"}
        if self.phase in ("brief", "drift"):
            msg["scope"] = "pair"
            await self._bcast(msg, only_pair=seat.pair)
        else:
            await self._bcast(msg)

    async def _hq(self, text: str, **extra):
        await self._bcast({"type": "chat", "seat": -1, "from": "HQ", "text": text, "scope": "all", **extra})

    # ------------------------------------------------------------------ gauges
    def pair_seats(self, pair: int) -> tuple[Seat, Seat]:
        return self.seats[pair * 2], self.seats[pair * 2 + 1]

    def pair_cheating(self, pair: int) -> bool:
        return any(s.role == "mole" and s.cheat and s.pair == pair for s in self.seats)

    def _gauges_for(self, pair: int, truth: bool) -> list[float]:
        A, B = self.pair_seats(pair)
        m = self.mission
        mode = m["mode"]
        if truth and mode != "classical" and self.pair_cheating(pair):
            mode = "fake"
        return Q.gauges(mode, A.eff(), B.eff(), m["V"])

    def _gauge_payload(self, g: list, pair: int, mode_hint: str) -> dict:
        hide = self.blackout.get(pair)
        avg = Q.team_avg(g)
        best = (avg >= Q.TSIRELSON - 0.005) if mode_hint != "classical" else (avg >= Q.CLASSICAL_BOUND - 1e-9)
        v = list(g)
        if hide is not None:
            v[hide] = None
            avg = None
            best = False
        return {"type": "gauges", "v": v, "avg": avg, "wall": Q.CLASSICAL_BOUND, "max": Q.TSIRELSON,
                "best": best, "hidden": hide}

    async def _send_gauges(self, pair: int):
        """Honest gauges to the partner; the Mole (who knows it is faking) sees the truth."""
        if not self.mission:
            return
        shown = self._gauges_for(pair, truth=False)
        truth = self._gauges_for(pair, truth=True)
        mode = self.mission["mode"]
        drift = any(x.drift for x in self.pair_seats(pair))
        for s in self.pair_seats(pair):
            g = truth if (s.role == "mole" and s.cheat) else shown
            if s.conn:
                await self._send(s.conn, {**self._gauge_payload(g, pair, mode), "drift": drift})
        for conn, info in self.conns.items():
            if info.get("seat") is None and info.get("watch_pair") == pair:
                await self._send(conn, {**self._gauge_payload(shown, pair, mode), "drift": False})

    def _eff_quota(self, pair: int) -> int:
        return self.mission["quota"] + (10 if self.wager.get(pair) else 0)

    async def _send_quota(self, pair: int):
        m = self.mission
        await self._bcast({"type": "quota", "quota": self._eff_quota(pair), "base": m["quota"],
                           "wager": bool(self.wager.get(pair)), "s2": m["stars"][0], "s3": m["stars"][1],
                           "rounds": m["rounds"]}, only_pair=pair)

    # ------------------------------------------------------------------ alibi
    def _pair_tuning(self, pair: int) -> float:
        """Win rate the pair's knobs *would* give on an ideal link (what an alibi can prove)."""
        A, B = self.pair_seats(pair)
        return Q.team_avg(Q.gauges("quantum", A.final_eff, B.final_eff, 1.0))

    async def _alibi(self, seat: Seat):
        seat.alibi_used = True
        ideal = self._pair_tuning(seat.pair)
        msg = {"type": "alibi", "seat": seat.idx, "name": seat.name, "pair": seat.pair,
               "knobs": [k + 2 for k in seat.knobs], "drift": seat.drift, "ideal": ideal,
               "tuned": ideal >= Q.TSIRELSON - 0.01}
        await self._bcast(msg)
        self.timeline.append({"t": "alibi", "mission": self.mission_no, "name": seat.name, "tuned": msg["tuned"]})

    async def _forge_alibi(self, seat: Seat):
        seat.alibi_used = True
        knobs = [k + 2 for k in (Q.OPT_ALICE if seat.is_alice else Q.OPT_BOB)]
        base = {"type": "alibi", "seat": seat.idx, "name": seat.name, "pair": seat.pair,
                "knobs": knobs, "drift": 0, "ideal": round(Q.TSIRELSON, 4), "tuned": True}
        for conn, info in list(self.conns.items()):
            s = info.get("seat")
            is_mole = (s is not None and s < len(self.seats) and self.seats[s].role == "mole")
            payload = {**base, "forged": True} if is_mole else dict(base)
            await self._send(conn, payload)
        self.timeline.append({"t": "alibi", "mission": self.mission_no, "name": seat.name, "tuned": True, "forged": True})


    # ------------------------------------------------------------------ start
    async def start(self):
        self.started = True
        n = 4 if self.mode == "4p" else 8
        humans = [c for c in self.conns]
        self.rng.shuffle(humans)
        for i in range(n):
            code = CODENAMES[i]
            self.seats.append(Seat(idx=i, name=code, codename=code))
        for i, c in enumerate(humans[:n]):
            s = self.seats[i]
            s.conn = c
            self.conns[c]["seat"] = i
            info = self.conns[c]
            if info.get("has_nickname"):
                s.name = info["name"]
            else:
                s.name = s.codename
                info["name"] = s.codename
        # bots get a personality (visible tag; it says nothing about who the Mole is)
        names = list(PERSONAS)
        self.rng.shuffle(names)
        for j, s in enumerate([x for x in self.seats if not x.human]):
            s.persona = names[j % len(names)]
        self.pair_energy = {p: 1 for p in self._pairs()}
        self.energy = sum(self.pair_energy.values())
        self.shadow = 2 if self.mode == "4p" else 3
        if self.variant == "story":
            eligible = [i for i, m in MISSIONS.items() if m["cheat_ok"]]
            if self.mode == "4p":
                m = self.rng.randrange(4)
                self.moles = [m]
                self.seats[m].role = "mole"
                self.bot_cheat_missions = set(self.rng.sample(eligible, 2))
            else:
                p1, p2 = self.rng.sample(range(4), 2)
                m1 = p1 * 2 + self.rng.randrange(2)
                m2 = p2 * 2 + self.rng.randrange(2)
                self.moles = [m1, m2]
                self.seats[m1].role = "mole"
                self.seats[m2].role = "mole"
                c_pool = list(eligible)
                self.rng.shuffle(c_pool)
                self.bot_cheat_schedule = {m1: set(c_pool[:2]), m2: set(c_pool[2:])}
        else:
            self.moles = []
        if self.variant == "daily":
            self.daily_list = daily_missions(self.daily_seed)
            self.mission_ids = [m["id"] for m in self.daily_list]
        elif self.variant == "endless":
            self.mission_ids = []
        else:
            self.mission_ids = [1, 2, 3, 4]
        for p in self._pairs():
            self.history[p] = []
        self._task = asyncio.create_task(self._flow())
        await self.send_room()

    def _missions(self):
        if self.variant == "story":
            for mid in self.mission_ids:
                m_info = dict(MISSIONS[mid])
                if mid == 4 and self.mode == "8p":
                    m_info["blurb"] = "Last mission. A mole network is operating on the wire. Watch the scores."
                    m_info["story"] = ("HQ // 23:55. A mole network is operating on the wire. Fake links may still be active. "
                                       "One gauge is blacked out tonight. Trust the numbers, not the story.")
                yield m_info
        elif self.variant == "daily":
            for m in self.daily_list:
                yield dict(m)
        else:
            k = 1
            while self.strikes < 2 and k <= 40:
                yield endless_mission(k, self.rng)
                k += 1

    async def rematch(self):
        """Back to the lobby with the same people, same settings."""
        if self._task and not self._task.done():
            self._task.cancel()
        for info in self.conns.values():
            info["seat"] = None
            info.pop("watch_pair", None)
        self._reset_state()
        await self.send_room()

    # ------------------------------------------------------------------ main flow
    async def _flow(self):
        try:
            for mn, m in enumerate(self._missions(), start=1):
                self.mission = m
                self.mission_no = mn
                await self._brief()
                await self._lock()
                await self._run()
                await self._debrief()
                if self.variant == "story" and self.mission["meeting"]:
                    done = await self._meeting()
                    if done:
                        break
            if self.variant == "story" and not self.finished:
                self.finished = True
                self.winner = "mole"
                await self._end("survived")
            await self._send_summary()
            await self._finale()
        except asyncio.CancelledError:
            raise
        except Exception as e:           # never die silently
            import traceback
            traceback.print_exc()
            await self._bcast({"type": "error", "msg": f"Server error: {type(e).__name__}"})

    def _live_humans(self) -> list[Seat]:
        return [s for s in self.seats if s.human and not s.burned]

    # ---- brief
    async def _brief(self):
        m = self.mission
        for s in self.seats:
            s.ready = False
            s.vote = "unset"
            s.drift = 0
            s.cheat = False
            s.alibi_used = False
            if not s.human:
                mult = _pers(s)["ready"]
                s.bot_ready_at = self.now() + self.t.bot_ready_min * (1 + self.rng.random() * 0.6) * mult
        self.tokens = 1 if m["drift"] else 0
        self.jammed = {}
        # bots set their optimal knobs; a bot Mole decides privately
        for s in self.seats:
            if not s.human:
                s.knobs = list(Q.OPT_ALICE if s.is_alice else Q.OPT_BOB)
                if m["mode"] == "classical":
                    s.knobs = [0, 0]
        if m["cheat_ok"]:
            if self.mode == "4p":
                if self.moles and not self.seats[self.moles[0]].human:
                    m_seat = self.seats[self.moles[0]]
                    if m["id"] in self.bot_cheat_missions and self.shadow > 0:
                        m_seat.cheat = True
                        other_pairs = [p for p in self._pairs() if p != m_seat.pair and p not in self.jammed]
                        if other_pairs and self.shadow > 1:
                            tgt = self.rng.choice(other_pairs)
                            self.shadow -= 1
                            self.jammed[tgt] = 0.18
            else:
                for m_idx in self.moles:
                    s = self.seats[m_idx]
                    if not s.human and not s.burned and self.shadow > 0:
                        want = m["id"] in self.bot_cheat_schedule.get(m_idx, set())
                        other_cheating = any(self.seats[o].cheat for o in self.moles if o != m_idx)
                        pool_forces = (self.shadow >= len(self.moles) and m["id"] == 4)
                        if want and (not other_cheating or pool_forces):
                            s.cheat = True
                            other_pairs = [p for p in self._pairs() if p != s.pair and p not in self.jammed]
                            if other_pairs and self.shadow > 1:
                                tgt = self.rng.choice(other_pairs)
                                self.shadow -= 1
                                self.jammed[tgt] = 0.18
        for p in self._pairs():
            A, B = self.pair_seats(p)
            self.wager[p] = False
            if not A.human and not B.human and m["mode"] != "classical":
                self.wager[p] = self.rng.random() < _pers(A)["wager"]
            self.blackout[p] = self.rng.randrange(4) if "blackout" in m["mods"] else None
        await self._set_phase("brief", self.t.brief)
        await self.send_room()
        for p in self._pairs():
            await self._send_gauges(p)
            await self._send_quota(p)
        await self._send_room_ready()
        await self._hq(m["story"], typewriter=True)
        asyncio.create_task(self._bot_brief_chat(m["id"]))
        deadline = self.phase_ends
        while self.now() < deadline:
            for s in self.seats:
                if not s.human and not s.ready and self.now() >= s.bot_ready_at:
                    s.ready = True
                    await self._send_room_ready()
            if all(s.ready for s in self.seats):
                break
            await self._sleep_until(min(deadline, self.now() + 0.3))
        # commit the Mole's choice
        for m_idx in self.moles:
            ms = self.seats[m_idx]
            if ms.cheat:
                if self.shadow > 0:
                    self.shadow -= 1
                    self.cheats_used += 1
                    self.cheat_log.append(self.mission_no)
                else:
                    ms.cheat = False

    async def _bot_brief_chat(self, mid: int):
        await asyncio.sleep(min(9.0, self.t.brief * 0.15))
        if self.phase != "brief" or self.mission["id"] != mid or self.mission["mode"] == "classical":
            return
        names = ["BLUE · BLUE", "BLUE · RED", "RED · BLUE", "RED · RED"]
        for p in self._pairs():
            A, B = self.pair_seats(p)
            bot = next((x for x in (A, B) if not x.human and not x.burned), None)
            mate = self.seats[bot.partner] if bot else None
            if not bot or not mate.human:
                continue
            g = self._gauges_for(p, truth=False)
            hide = self.blackout.get(p)
            cand = [i for i in range(4) if i != hide]
            low = min(cand, key=lambda i: g[i])
            if Q.team_avg(g) >= Q.TSIRELSON - 0.005:
                await self._chat(bot, "all four gauges are green. lock it in?")
            else:
                await self._chat(bot, f"{names[low].lower()} is dragging us down")

    # ---- lock + run
    async def _lock(self):
        await self._set_phase("lock", self.t.lock)
        await self._sleep_until(self.now() + self.t.lock)

    def _cards_for(self, p: int, lo: int, hi: int) -> list[tuple[int, int]]:
        if self.variant == "daily":                       # same cards for every team on the wire today
            key = (self.mission_no, p)
            if key not in self.card_plan:
                r = random.Random(f"{self.daily_seed}:{self.mission_no}")
                self.card_plan[key] = [(r.getrandbits(1), r.getrandbits(1)) for _ in range(self.mission["rounds"])]
            return self.card_plan[key][lo:hi]
        return [(self.rng.getrandbits(1), self.rng.getrandbits(1)) for _ in range(lo, hi)]

    def _draw(self, mode: str, cards: list, kA, kB, V: float) -> list[tuple[int, int]]:
        """Doors for a run of cards.  Quantum rounds come from circuit measurements."""
        if mode == "quantum":
            return Q.sample_half_circuit(self.rng, cards, kA, kB, V)
        return [Q.sample_doors(self.rng, mode, x, y, kA, kB, V) for x, y in cards]

    def _sample_half(self, lo: int, hi: int) -> dict[int, list]:
        m = self.mission
        out = {}
        for p in self._pairs():
            A, B = self.pair_seats(p)
            mode = m["mode"]
            if mode != "classical" and self.pair_cheating(p):
                mode = "fake"
            self.pair_mode[p] = mode
            cards = self._cards_for(p, lo, hi)
            eff_V = max(0.5, m["V"] - self.jammed.get(p, 0.0))
            doors = self._draw(mode, cards, A.eff(), B.eff(), eff_V)
            out[p] = [(lo + j, x, y, a, b, Q.wins(a, b, x, y)) for j, ((x, y), (a, b)) in enumerate(zip(cards, doors))]
        return out

    async def _stream(self, rows_by_pair: dict[int, list], wins: dict[int, int]):
        n = len(next(iter(rows_by_pair.values())))
        for k in range(n):
            for p, rows in rows_by_pair.items():
                i, x, y, a, b, w = rows[k]
                wins[p] += int(w)
                self.streak[p] = self.streak[p] + 1 if w else 0
                self.best_streak[p] = max(self.best_streak[p], self.streak[p])
                self.bits[p].append(int(w))
                self.base_bits[p].append(0 if (x and y) else 1)      # fixed classical codebook on the same cards
                A, B = self.pair_seats(p)
                for s, card, door in ((A, x, a), (B, y, b)):
                    msg = {"type": "round", "i": i, "card": card, "door": door, "win": w, "wins": wins[p],
                           "streak": self.streak[p], "best": self.best_streak[p]}
                    if s.conn:
                        await self._send(s.conn, msg)
                for conn, info in self.conns.items():       # burned humans watch their old pair
                    if info.get("seat") is None and info.get("watch_pair") == p:
                        await self._send(conn, {"type": "round", "i": i, "card": -1, "door": -1, "win": w,
                                                "wins": wins[p], "streak": self.streak[p], "best": self.best_streak[p]})
            self.round_idx = rows_by_pair[next(iter(rows_by_pair))][k][0] + 1
            if self.t.round_s > 0.001:
                await asyncio.sleep(self.t.round_s)
            elif k % 50 == 0:
                await asyncio.sleep(0)

    async def _drift_step(self, N: int, at: int):
        # the Jammer nudges one agent in every pair by a snap (drift accumulates, never beyond two snaps)
        for p in self._pairs():
            s = self.rng.choice(self.pair_seats(p))
            d = self.rng.choice((-1, 1))
            if abs(s.drift + d) > 2:
                d = -d
            s.drift += d
            for x in self.pair_seats(p):
                x.ready = False
        await self._set_phase("drift", self.t.drift_pause, at_round=at)
        await self.send_room()
        for p in self._pairs():
            await self._send_gauges(p)
        asyncio.create_task(self._bots_retune_after(self.t.drift_pause * 0.4))
        await self._sleep_until(self.now() + self.t.drift_pause)

    async def _run(self):
        m = self.mission
        N = m["rounds"]
        wins = {p: 0 for p in self._pairs()}
        self.streak = {p: 0 for p in self._pairs()}
        self.best_streak = {p: 0 for p in self._pairs()}
        self.bits = {p: [] for p in self._pairs()}
        self.base_bits = {p: [] for p in self._pairs()}
        self.round_idx = 0
        await self._set_phase("run", N * self.t.round_s + 1)
        for p in self._pairs():
            await self._send_gauges(p)
            await self._send_quota(p)
        drifts = m.get("drifts", 0)
        cuts = [] if not drifts else ([N // 2] if drifts == 1 else [N // 3, (2 * N) // 3])
        bounds = [0] + cuts + [N]
        for si in range(len(bounds) - 1):
            if si > 0:
                await self._drift_step(N, bounds[si])
                await self._set_phase("run", (N - bounds[si]) * self.t.round_s + 1)
            await self._stream(self._sample_half(bounds[si], bounds[si + 1]), wins)
        for s in self.seats:
            s.final_eff = list(s.eff())
        # record
        per_pair = []
        for p in self._pairs():
            w = wins[p]
            quota = self._eff_quota(p)
            base = m["quota"]
            stars = int(w >= base) + int(w >= m["stars"][0]) + int(w >= m["stars"][1])
            wag = bool(self.wager.get(p))
            wager_ok = wag and w >= quota
            base_pts = w * 10 + self.best_streak[p] * 25 + stars * 250
            pts = base_pts * 2 if wager_ok else (base_pts // 2 if wag else base_pts)
            self.points[p] += pts
            self.stars[p].append(stars)
            fake = self.pair_mode.get(p) == "fake"
            self.history[p].append({"m": self.mission_no, "wins": w, "n": N, "rate": w / N,
                                    "fake": fake, "mode": self.pair_mode.get(p), "stars": stars, "points": pts})
            a_, b_ = self.pair_seats(p)
            self.missions_log.append({"mission": self.mission_no, "name": m["name"], "pair": p,
                                      "names": [a_.name, b_.name], "wins": w, "n": N, "rate": w / N, "stars": stars,
                                      "points": pts, "wager": wag, "wager_ok": wager_ok, "streak": self.best_streak[p],
                                      "fake": fake, "quota": quota})
            self.timeline.append({"t": "result", "mission": self.mission_no, "name": m["name"], "pair": p,
                                  "rate": w / N, "stars": stars, "points": pts, "wager": wag, "wager_ok": wager_ok})
            per_pair.append({"pair": p, "wins": w, "rounds": N, "rate": w / N, "quota": quota,
                             "passed": w >= quota, "stars": stars, "points": pts})
        if self.variant == "endless":
            if not all(r["passed"] for r in per_pair):
                self.strikes += 1
        self.last_result = {"mission": self.mission_no, "per_pair": per_pair}
        for p in self._pairs():
            mine = next(r for r in per_pair if r["pair"] == p)
            race = {"actual": "".join(map(str, self.bits[p])), "classical": "".join(map(str, self.base_bits[p])),
                    "cuts": cuts}
            await self._bcast({"type": "result", "mission": self.mission_no, "wins": mine["wins"],
                               "rounds": N, "quota": mine["quota"], "passed": mine["passed"],
                               "stars": mine["stars"], "points": mine["points"], "total_points": self.points[p],
                               "best_streak": self.best_streak[p], "wager": bool(self.wager.get(p)),
                               "wager_ok": bool(self.wager.get(p)) and mine["passed"], "race": race,
                               "s2": m["stars"][0], "s3": m["stars"][1], "strikes": self.strikes,
                               "engine": self.engine if m["mode"] != "classical" else "fixed codebook",
                               "variant": self.variant,
                               "per_pair": [mine], "history": self._hist_pub(p, truth=False)}, only_pair=p)

    def _hist_pub(self, pair: int, truth: bool):
        return [{"m": h["m"], "rate": h["rate"], "wins": h["wins"], "n": h["n"], "stars": h.get("stars", 0),
                 **({"fake": h["fake"]} if truth else {})} for h in self.history[pair]]

    async def _bots_retune_after(self, delay: float):
        """A drifted bot retunes its own knobs a few seconds in; if the snap range can't fix it, it spends the token."""
        await asyncio.sleep(delay)
        if self.phase != "drift":
            return
        for s in self.seats:
            if s.human or not s.drift:
                continue
            base = Q.OPT_ALICE if s.is_alice else Q.OPT_BOB
            want = [base[0] - s.drift, base[1] - s.drift]
            if all(-2 <= k <= 2 for k in want):
                s.knobs = want
            elif self.tokens > 0:
                self.tokens -= 1
                for x in self.pair_seats(s.pair):
                    x.drift = 0
            else:
                s.knobs = [max(-2, min(2, k)) for k in want]
        for p in self._pairs():
            await self._send_gauges(p)
        await self.send_room()

    # ---- debrief
    async def _debrief(self):
        for s in self.seats:
            s.ready = False
        await self._set_phase("debrief", self.t.debrief)
        await self._send_room_ready()
        asyncio.create_task(self._bot_debrief_chat())
        end = self.phase_ends
        await self._sleep_until(end, cond=lambda: all(s.ready or not s.human or s.burned for s in self.seats))

    async def _bot_debrief_chat(self):
        await asyncio.sleep(min(3.0, self.t.debrief * 0.1))
        if self.phase != "debrief" or not self.last_result:
            return
        for p in self._pairs():
            A, B = self.pair_seats(p)
            bot = next((x for x in (A, B) if not x.human and not x.burned), None)
            mate = self.seats[bot.partner] if bot else None
            if not bot or not mate.human:
                continue
            r = next(x for x in self.last_result["per_pair"] if x["pair"] == p)
            if r["stars"] >= 3:
                line = "three stars. that was clean"
            elif r["passed"]:
                line = f"{r['wins']} of {r['rounds']}. we cleared the quota"
            else:
                line = f"{r['wins']} of {r['rounds']}, short of the quota. retune?"
            await self._chat(bot, line)

    # ---- meeting
    def _pair_evidence(self, p: int) -> dict:
        m = self.mission
        h = self.history[p][-1]
        w, n = h["wins"], h["n"]
        exact_rate = h["rate"]
        # rounded pair rates (nearest 2%)
        rate = round(round(exact_rate * 50) / 50, 4)
        if exact_rate >= 0.82:
            tag = "solid"
        elif exact_rate >= 0.76:
            tag = "noisy"
        else:
            tag = "weak"
        a, b = self.pair_seats(p)
        return {"pair": p, "names": [a.name, b.name], "wins": w, "n": n, "rate": rate,
                "tag": tag, "history": self._hist_pub(p, truth=False)}

    def _llr(self, p: int) -> float:
        """Bell meter: log10 likelihood ratio fake:honest, this mission's run plus any retests of the pair."""
        h = self.history[p][-1]
        V = self.mission["V"]
        tot = Q.bell_llr(h["wins"], h["n"], V)
        for r in self.retests:
            if r["pair"] == p:
                tot += Q.bell_llr(r["wins"], r["n"], V)
        return tot

    async def _meeting(self) -> bool:
        for s in self.seats:
            s.vote = "unset"
            s.ready = False
            s.alibi_used = False
            if not s.human and not s.burned:
                s.bot_vote_at = self.now() + self.t.bot_vote_lo + self.rng.random() * (self.t.bot_vote_hi - self.t.bot_vote_lo)
        ev = [self._pair_evidence(p) for p in self._pairs()]
        self.retests = []
        dur = self.t.meeting if self.mode == "4p" else getattr(self.t, "meeting_8p", 70.0)
        await self._set_phase("meeting", dur)
        await self._bcast({"type": "meeting", "pairs": ev, "noise": self.mission["noise"],
                           "energy": self.energy, "pair_energy": dict(self.pair_energy), "mission": self.mission_no,
                           "mission_name": self.mission["name"]})
        await self.send_room()
        await self._send_votes()
        await self._bot_chatter(ev)
        deadline = self.phase_ends
        while self.now() < deadline:
            for s in self.seats:
                if not s.human and not s.burned and s.vote == "unset" and self.now() >= s.bot_vote_at:
                    s.vote = self._bot_vote(s, ev)
                    await self._send_votes()
            if all(s.vote != "unset" for s in self.seats if not s.burned):
                break
            await self._sleep_until(min(deadline, self.now() + 0.3))
        # tally: skip is a candidate; unique plurality wins; tie burns nobody
        tally: dict[Any, int] = {}
        for s in self.seats:
            if s.burned:
                continue
            v = "skip" if s.vote in ("unset", "skip") else s.vote
            tally[v] = tally.get(v, 0) + 1
        top = max(tally.values()) if tally else 0
        leaders = [k for k, v in tally.items() if v == top]
        burned = leaders[0] if len(leaders) == 1 and leaders[0] != "skip" else None
        votes = [{"from": s.name, "seat": s.idx,
                  "to": (self.seats[s.vote].name if isinstance(s.vote, int) else None)}
                 for s in self.seats if not s.burned]
        await self._reveal(burned, tally, votes)
        return self.finished

    def _bot_vote(self, s: Seat, ev: list) -> Any:
        alive = [x for x in self.seats if not x.burned and x.idx != s.idx]
        if s.role == "mole":
            honest = [x for x in alive if x.role != "mole"]
            own = ev[s.pair]
            if own["tag"] != "solid":
                return s.partner if not self.seats[s.partner].burned else (self.rng.choice(honest).idx if honest else "skip")
            other = [x for x in honest if x.pair != s.pair] or honest
            return self.rng.choice(other).idx if (other and self.rng.random() < 0.6) else "skip"
        worst = min(ev, key=lambda e: e["rate"])
        if worst["tag"] == "weak":
            cands = [x for x in alive if x.pair == worst["pair"]]
            if cands:
                return self.rng.choice(cands).idx
        elif worst["tag"] == "noisy" and _pers(s)["thr"] >= 0.15:
            cands = [x for x in alive if x.pair == worst["pair"]]
            if cands:
                return self.rng.choice(cands).idx
        return "skip"

    async def _bot_chatter(self, ev: list):
        bots = [s for s in self.seats if not s.human and not s.burned]
        if not bots:
            return
        worst = min(ev, key=lambda e: e["rate"])
        for s in self.rng.sample(bots, k=min(2, len(bots))):
            if self.rng.random() < 0.45:
                line = self.rng.choice(PERSONA_LINES[s.persona or "CHATTY"])
            elif s.role == "mole" and s.pair == worst["pair"]:
                line = self.rng.choice(["noise got us, that happens", "we tuned it the same as before",
                                        "one bad round is not proof"])
            elif s.pair == worst["pair"]:
                line = self.rng.choice(["our score dropped, I did not touch anything",
                                        "we kept the same angles as last mission"])
            else:
                line = self.rng.choice([f"we got {round(ev[s.pair]['rate'] * 100)}%, no complaints",
                                        "their drop looks odd to me"])
            await self._chat(s, line)
            if s.pair == worst["pair"] and worst["tag"] != "solid" and not s.alibi_used and self.phase == "meeting":
                await asyncio.sleep(min(1.5, self.t.meeting * 0.05))
                if self.phase == "meeting" and not s.alibi_used:
                    if s.role == "mole" and worst["tag"] == "weak" and self.shadow > 0:
                        self.shadow -= 1
                        await self._forge_alibi(s)
                    else:
                        await self._alibi(s)

    async def _send_votes(self):
        voted = [s.idx for s in self.seats if not s.burned and s.vote != "unset"]
        total = sum(1 for s in self.seats if not s.burned)
        await self._bcast({"type": "votes", "voted": voted, "count": len(voted), "total": total})

    async def _retest(self, pair, caller_seat: Optional[Seat] = None):
        if pair not in self._pairs():
            return
        caller_pair = caller_seat.pair if caller_seat else None
        if caller_pair is not None:
            if self.pair_energy.get(caller_pair, 0) <= 0:
                if caller_seat and caller_seat.conn:
                    await self._send(caller_seat.conn, {"type": "toast", "text": "YOUR PAIR HAS ALREADY USED ITS SIGNAL ENERGY"})
                return
            self.pair_energy[caller_pair] -= 1
        elif self.energy > 0:
            for p in self._pairs():
                if self.pair_energy.get(p, 0) > 0:
                    self.pair_energy[p] -= 1
                    caller_pair = p
                    break
        else:
            return

        self.energy = sum(self.pair_energy.values())
        A, B = self.pair_seats(pair)
        mode = self.pair_mode.get(pair, self.mission["mode"])
        n = 20
        cards = [(self.rng.getrandbits(1), self.rng.getrandbits(1)) for _ in range(n)]
        doors = self._draw(mode, cards, A.final_eff, B.final_eff, self.mission["V"])
        w = sum(Q.wins(a, b, x, y) for (x, y), (a, b) in zip(cards, doors))
        r = {"type": "retest", "pair": pair, "wins": w, "n": n, "energy": self.energy,
             "pair_energy": dict(self.pair_energy), "by_pair": caller_pair}
        self.retests.append(r)
        self.timeline.append({"t": "retest", "mission": self.mission_no, "pair": pair, "wins": w, "n": n})
        await self._bcast(r)
        await self._hq(f"RETEST · PAIR {pair + 1} · {w} OF {n} SYNC")
        llr = self._llr(pair)
        meter = "LOW" if llr < -0.5 else ("HIGH" if llr > 0.5 else "MID")
        await self._bcast({"type": "bell", "pair": pair, "meter": meter, "llr": meter})

    async def _reveal(self, burned: Optional[int], tally: dict, votes: list | None = None):
        msg: dict = {"type": "burn", "agent": burned, "tally": {str(k): v for k, v in tally.items()},
                     "votes": votes or [],
                     "mission": self.mission_no, "of": len(self.mission_ids)}
        game_over = False
        max_wrong = 2 if self.mode == "4p" else 3
        if burned is not None:
            s = self.seats[burned]
            was_mole = s.role == "mole"
            s.burned = True
            msg.update({"name": s.name, "was_mole": was_mole, "pair": s.pair,
                        "history": self._hist_pub(s.pair, truth=True),
                        "cheats_used": self.cheats_used})
            if s.conn:
                info = self.conns[s.conn]
                info["seat"] = None
                info["watch_pair"] = s.pair
                s.conn = None                      # a bot takes the seat
            if was_mole:
                all_moles_burned = all(self.seats[m].burned for m in self.moles)
                if all_moles_burned:
                    self.finished, self.winner, game_over = True, "crew", True
            else:
                self.wrong_burns += 1
                if self.wrong_burns >= max_wrong:
                    self.finished, self.winner, game_over = True, "mole", True
            msg["wrong_burns"] = self.wrong_burns
            msg["max_wrong"] = max_wrong
        else:
            msg.update({"name": None, "was_mole": False, "wrong_burns": self.wrong_burns,
                        "max_wrong": max_wrong})
        msg["game_over"] = game_over
        msg["winner"] = self.winner
        msg["moles_burned"] = sum(1 for m in self.moles if self.seats[m].burned)
        msg["moles_total"] = len(self.moles)
        self.timeline.append({"t": "vote", "mission": self.mission_no, "burned": msg.get("name"),
                              "was_mole": bool(msg.get("was_mole")), "tally": msg["tally"]})
        if game_over and self.winner == "mole":
            mole_names = [self.seats[m].name for m in self.moles]
            msg["moles"] = mole_names
            msg["mole"] = " & ".join(mole_names)
            msg["reason"] = "wrong_burns"
            if self.moles:
                ms = self.seats[self.moles[0]]
                msg["mole_history"] = self._hist_pub(ms.pair, truth=True)
        await self._set_phase("reveal", self.t.reveal)
        await self._bcast(msg)
        await self.send_room()
        for s in self.seats:
            s.ready = False
        if game_over:
            return
        await self._sleep_until(self.phase_ends, cond=lambda: all(s.ready or not s.human or s.burned for s in self.seats))

    async def _end(self, reason: str):
        mole_names = [self.seats[m].name for m in self.moles]
        mole_hist = self._hist_pub(self.seats[self.moles[0]].pair, truth=True) if self.moles else []
        await self._set_phase("reveal", 0)
        await self._bcast({"type": "burn", "agent": None, "name": None, "was_mole": False, "game_over": True,
                           "winner": self.winner, "reason": reason, "moles": mole_names,
                           "mole": " & ".join(mole_names),
                           "mole_history": mole_hist,
                           "wrong_burns": self.wrong_burns, "max_wrong": 2 if self.mode == "4p" else 3,
                           "cheats_used": self.cheats_used,
                           "mission": self.mission_no, "of": len(self.mission_ids)})

    # ---- finale
    async def _finale(self):
        await self._set_phase("finale", 0)
        await self._bcast({"type": "nerd_pending"})
        import os
        shots = int(os.environ.get("IONQ_SHOTS", "1000"))        # [CONFIRM] shot limit for your IonQ plan
        try:
            res = await asyncio.to_thread(Q.run_finale, shots)
        except Exception as e:
            res = {"backend": "unavailable", "hardware": False, "per_card": [], "win_rate": None,
                   "shots_per_pair": shots, "note": f"finale failed: {e}", "classical": 0.75, "ideal": Q.TSIRELSON}
        self.nerd = res
        await self._bcast({"type": "nerd", **res})
        await self.send_room()           # tells the host a rematch is possible

    # ---- case file
    def _summary_text(self, total: int, stars: int, rows: list) -> str:
        title = {"daily": f"DAILY CASE FILE {self.daily_seed}", "endless": "ENDLESS",
                 "story": "EIGHT-AGENT OPERATION" if self.mode == "8p" else "FOUR-AGENT OPERATION"}[self.variant]
        lines = [f"TWIN SIGNAL // {title}"]
        for r in rows:
            lines.append(f"{r['name']}: {'★' * r['stars']}{'☆' * (3 - r['stars'])} {round(r['rate'] * 100)}%")
        lines.append(f"{total:,} pts · {stars} stars · classical wall 75%, entangled ceiling 85.4%")
        if self.variant == "story":
            moles_str = "the Moles were" if len(self.moles) > 1 else "the Mole was"
            lines.append(f"CREW WON, {moles_str} burned." if self.winner == "crew" else "THE MOLE NETWORK got away with it." if len(self.moles) > 1 else "THE MOLE got away with it.")
        elif self.variant == "endless":
            lines.append(f"Link died after {max(0, self.mission_no - (1 if self.strikes >= 2 else 0))} levels.")
        return "\n".join(lines)

    async def _send_summary(self):
        pairs = self._pairs()
        total = sum(self.points[p] for p in pairs)
        stars = sum(sum(self.stars[p]) for p in pairs)
        rows = self.missions_log
        # one share-line row per mission: the best pair that mission
        best_rows = {}
        for r in rows:
            if r["mission"] not in best_rows or r["points"] > best_rows[r["mission"]]["points"]:
                best_rows[r["mission"]] = r
        text = self._summary_text(total, stars, [best_rows[k] for k in sorted(best_rows)])
        mole_name = self.seats[self.moles[0]].name if self.moles else None
        mole_names = [self.seats[m].name for m in self.moles]
        summary = {"type": "summary", "variant": self.variant, "mode": self.mode, "daily": self.daily_seed,
                   "winner": self.winner, "total_points": total, "stars": stars, "missions": rows,
                   "events": self.timeline, "text": text, "engine": self.engine,
                   "mole": mole_name,
                   "moles": mole_names,
                   "cheat_missions": list(self.cheat_log) if self.moles else [],
                   "levels": len([r for r in rows if r["pair"] == 0])}
        self.summary = summary
        await self._bcast(summary)
        if self.on_finish and self.variant in ("daily", "endless"):
            try:
                await self.on_finish(self, summary)
            except Exception:
                import traceback
                traceback.print_exc()
