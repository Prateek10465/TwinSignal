"""Tests for stars/points/wager, Endless, Daily, blackout, double drift, alibi, Bell meter, rematch, leaderboard."""
import asyncio, json, os, pathlib, sys, tempfile
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
os.environ.setdefault("TS_LEADERBOARD", os.path.join(tempfile.mkdtemp(), "lb.json"))
import quantum as Q
import game as G
from game import Room, Timing
from hub import Hub
import leaderboard
from test_game import FakeConn, FAST, setup, set_knobs


async def drive(hub, h, room, me_tune=True, wager=False, until="nerd", on_result=None, on_drift=None, on_meeting=None, timeout=60):
    """Play whatever comes: tune at each brief, ready up, handle drift/meeting, until a message type arrives."""
    end = asyncio.get_event_loop().time() + timeout
    me = room.seats[h.room.conns[h]["seat"]]
    while asyncio.get_event_loop().time() < end:
        m = await asyncio.wait_for(h.q.get(), timeout)
        t = m["type"]
        if t == until:
            return m
        if t == "phase" and m["name"] == "brief":
            if me_tune:
                await set_knobs(hub, h, Q.OPT_ALICE if me.is_alice else Q.OPT_BOB)
            if wager:
                await hub.on_message(h, {"type": "wager", "on": True})
            await hub.on_message(h, {"type": "ready", "v": True})
        elif t == "phase" and m["name"] == "drift":
            if on_drift:
                await on_drift(me)
        elif t == "phase" and m["name"] == "debrief":
            await hub.on_message(h, {"type": "ready", "v": True})
        elif t == "result" and on_result:
            on_result(m)
        elif t == "meeting":
            if on_meeting:
                await on_meeting(m, me)
            await hub.on_message(h, {"type": "vote", "target": None})
        elif t == "phase" and m["name"] == "reveal":
            await hub.on_message(h, {"type": "ready", "v": True})
    raise TimeoutError(until)


def test_wager_stars_points_and_race():
    async def go():
        hub, room, (h,) = await setup("4p", 1, 5)
        results = []
        qmsgs = []
        # watch the quota messages as they come
        await h.until("phase", name="brief")
        base = room.mission["quota"]
        await hub.on_message(h, {"type": "wager", "on": True})
        q = [m for m in h.of("quota")][-1]
        assert q["wager"] and q["quota"] == base + 10 and q["base"] == base
        await hub.on_message(h, {"type": "wager", "on": False})
        assert [m for m in h.of("quota")][-1]["quota"] == base
        await hub.on_message(h, {"type": "ready", "v": True})
        r = await h.until("result")
        assert r["stars"] in (0, 1, 2, 3) and r["points"] >= 0 and r["total_points"] == r["points"]
        assert len(r["race"]["actual"]) == 200 and len(r["race"]["classical"]) == 200
        assert sum(map(int, r["race"]["actual"])) == r["wins"]
        # the fixed classical codebook on the same cards wins 3 of 4 on average
        assert 0.6 < sum(map(int, r["race"]["classical"])) / 200 < 0.9
        assert r["best_streak"] >= 1 and not r["wager"]
        room._task.cancel()
    asyncio.run(go())


def test_wager_pays_double_or_halves():
    async def go():
        for wager in (False, True):
            hub, room, (h,) = await setup("4p", 1, 6)
            got = []
            await h.until("phase", name="brief")
            await hub.on_message(h, {"type": "wager", "on": wager})
            await hub.on_message(h, {"type": "ready", "v": True})
            r = await h.until("result")
            base = r["wins"] * 10 + r["best_streak"] * 25 + r["stars"] * 250
            if not wager:
                assert r["points"] == base
            elif r["wager_ok"]:
                assert r["points"] == base * 2 and r["quota"] == room.mission["quota"] + 10
            else:
                assert r["points"] == base // 2
            room._task.cancel()
    asyncio.run(go())


def test_endless_degrades_then_ends_and_posts_to_leaderboard():
    async def go():
        hub = Hub(FAST)
        h = FakeConn("ENDLESS")
        await hub.on_message(h, {"type": "create", "name": "ENDLESS", "variant": "endless"})
        room = h.room
        assert room.variant == "endless" and room.mode == "4p"
        room.rng.seed(3)
        await hub.on_message(h, {"type": "start"})
        seen = []
        await drive(hub, h, room, until="nerd", on_result=seen.append,
                    on_drift=lambda me: hub.on_message(h, {"type": "recalibrate"}))
        assert len(seen) >= 2 and room.strikes == 2
        assert seen[0]["variant"] == "endless" and seen[-1]["strikes"] == 2
        s = h.of("summary")[-1]
        assert s["variant"] == "endless" and s["total_points"] > 0 and "TWIN SIGNAL" in s["text"]
        lb = h.of("leaderboard")[-1]
        assert lb["rank"] >= 1 and lb["endless"]["entries"][0]["points"] >= s["total_points"] - 1
        # level V degrades monotonically
        Vs = [G.endless_mission(k, room.rng)["V"] for k in range(1, 10)]
        assert Vs == sorted(Vs, reverse=True) and Vs[-1] < 0.7071
    asyncio.run(go())


def test_daily_cards_are_identical_for_everyone_and_modifiers_seeded():
    async def go():
        seqs = []
        for _ in range(2):
            r = Room("ABCD", FAST, seed=None)
            r.variant, r.daily_seed = "daily", "2026-10-09"
            r.daily_list = G.daily_missions("2026-10-09")
            r.mission = r.daily_list[0]
            r.mission_no = 1
            seqs.append(r._cards_for(0, 0, 200))
        assert seqs[0] == seqs[1]
        assert G.daily_missions("2026-10-09") == G.daily_missions("2026-10-09")
        assert G.daily_missions("2026-10-09") != G.daily_missions("2026-10-10")
    asyncio.run(go())


def test_blackout_hides_one_gauge_and_double_drift_pauses_twice():
    async def go():
        # find a daily seed whose case file 3 has both a blackout and a double drift
        seed = next(f"2027-01-{d:02d}" for d in range(1, 29)
                    if {"blackout", "double_drift"} <= set(G.daily_missions(f"2027-01-{d:02d}")[2]["mods"]))
        hub = Hub(FAST)
        h = FakeConn("DD")
        await hub.on_message(h, {"type": "create", "name": "DD", "variant": "daily"})
        room = h.room
        room.daily_seed = seed
        room.rng.seed(2)
        await hub.on_message(h, {"type": "start"})
        drifts = []
        res = []

        async def on_drift(me):
            drifts.append(room.mission_no)
        await drive(hub, h, room, until="nerd", on_result=res.append, on_drift=on_drift)
        assert len(res) == 3
        m3 = G.daily_missions(seed)[2]
        assert drifts.count(3) == 2, drifts
        g = [x for x in h.of("gauges")]
        assert any(x["hidden"] is not None and x["v"][x["hidden"]] is None and x["avg"] is None for x in g)
        # blackout never rings the lock-on bell
        assert all(not x["best"] for x in g if x["hidden"] is not None)
        sm = h.of("summary")[-1]
        assert sm["variant"] == "daily" and len(sm["missions"]) == 6
    asyncio.run(go())


def test_alibi_bell_meter_rematch_and_no_role_leak():
    async def go():
        hub, room, (h,) = await setup("4p", 1, 31)
        me = room.seats[h.room.conns[h]["seat"]]
        got = {}

        async def on_meeting(mt, me_):
            got["meeting"] = mt
            await hub.on_message(h, {"type": "alibi"})
            await hub.on_message(h, {"type": "alibi"})            # second one is ignored
            await hub.on_message(h, {"type": "probe", "pair": 0})
            await asyncio.sleep(0.05)
        await drive(hub, h, room, until="burn", on_meeting=on_meeting)
        mt = got["meeting"]
        assert all("tag" in p and "llr" not in p and "p_honest_le" not in p and "lo" not in p for p in mt["pairs"])
        al = h.of("alibi")
        assert len(al) >= 1 and sum(1 for a in al if a["seat"] == me.idx) == 1
        mine = next(a for a in al if a["seat"] == me.idx)
        assert mine["tuned"] and mine["ideal"] > Q.TSIRELSON - 0.01 and mine["knobs"] == [k + 2 for k in me.knobs]
        bell = h.of("bell")
        assert bell and bell[-1]["pair"] == 0 and bell[-1]["meter"] in ("LOW", "MID", "HIGH")
        b = h.of("burn")[-1]
        assert "votes" in b and all("from" in v for v in b["votes"])
        for m in h.log:
            if m["type"] in ("alibi", "bell", "quota", "gauges", "result", "meeting", "round"):
                assert '"fake"' not in json.dumps(m), m["type"]
        # rematch only after the finale; same people, back in the lobby
        await hub.on_message(h, {"type": "rematch"})
        assert room.phase != "lobby"
        await h.until("nerd", timeout=40)
        await h.until("room", can_rematch=True, timeout=10)
        await hub.on_message(h, {"type": "rematch"})
        r = await h.until("room", started=False)
        assert r["phase"] == "lobby" and r["players"] == [] or r["phase"] == "lobby"
        assert room.seats == [] and not room.started and h in room.conns
    asyncio.run(go())


def test_leaderboard_ranking_and_cap():
    d = tempfile.mkdtemp()
    leaderboard.PATH = pathlib.Path(d) / "lb.json"
    for i in range(60):
        leaderboard.submit("endless", {"name": f"N{i}", "points": i})
    assert len(leaderboard.top("endless", 100)) == 50
    assert leaderboard.top("endless", 1)[0]["points"] == 59
    assert leaderboard.submit("endless", {"name": "X", "points": 1000}) == 1


def test_circuit_rounds_match_formula():
    import random
    rng = random.Random(4)
    cards = [(rng.getrandbits(1), rng.getrandbits(1)) for _ in range(8000)]
    for V in (1.0, 0.8):
        d = Q.sample_half_circuit(rng, cards, Q.OPT_ALICE, Q.OPT_BOB, V)
        r = sum(Q.wins(a, b, x, y) for (a, b), (x, y) in zip(d, cards)) / len(cards)
        assert abs(r - Q.noisy(Q.TSIRELSON, V)) < 0.02
    assert Q.bell_llr(150, 200) > 1 and Q.bell_llr(172, 200) < -1


def test_nicknames_and_codenames():
    async def go():
        hub = Hub(FAST)
        c1 = FakeConn("c1")
        c2 = FakeConn("c2")
        # c1 enters custom nickname "VIPER", c2 enters nothing ("")
        await hub.on_message(c1, {"type": "create", "name": "VIPER", "mode": "4p"})
        code = c1.room.code
        await hub.on_message(c2, {"type": "join", "room": code, "name": ""})
        room = c1.room

        # In lobby: c1 has custom nickname "VIPER", c2 has an assigned codename (not "AGENT")
        assert room.conns[c1]["name"] == "VIPER"
        assert room.conns[c1]["has_nickname"] is True
        assert room.conns[c2]["name"] in G.CODENAMES
        assert room.conns[c2]["has_nickname"] is False

        # Start the game
        await hub.on_message(c1, {"type": "start"})
        s1 = room.seats[room.conns[c1]["seat"]]
        s2 = room.seats[room.conns[c2]["seat"]]

        # s1 entered nickname, so s1.name MUST be "VIPER", NOT their codename
        assert s1.name == "VIPER"
        assert s1.codename in G.CODENAMES

        # s2 did NOT enter a nickname, so s2.name MUST be their seat's codename
        assert s2.name == s2.codename
        assert s2.name in G.CODENAMES

        # Bots also have their seat's codename
        for s in room.seats:
            if not s.human:
                assert s.name == s.codename
                assert s.name in G.CODENAMES

    asyncio.run(go())

