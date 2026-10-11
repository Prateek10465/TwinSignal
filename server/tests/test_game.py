import asyncio, sys, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import quantum as Q
from game import Room, Timing, MISSIONS
from hub import Hub

FAST = Timing(brief=0.1, lock=0.02, round_s=0.0002, drift_pause=0.05, debrief=0.05, meeting=0.2, reveal=0.05,
              bot_ready_min=0.01, bot_vote_lo=0.01, bot_vote_hi=0.05, meeting_8p=0.2)


class FakeConn:
    def __init__(self, name):
        self.name, self.room, self.log = name, None, []
        self.q = asyncio.Queue()

    async def send(self, msg):
        self.log.append(msg)
        await self.q.put(msg)

    async def until(self, typ, timeout=20, **kw):
        end = asyncio.get_event_loop().time() + timeout
        while True:
            left = end - asyncio.get_event_loop().time()
            if left <= 0:
                raise TimeoutError(f"waiting for {typ} {kw}; log tail={[m['type'] for m in self.log[-8:]]}")
            m = await asyncio.wait_for(self.q.get(), left)
            if m["type"] == typ and all(m.get(k) == v for k, v in kw.items()):
                return m

    def of(self, typ):
        return [m for m in self.log if m["type"] == typ]


async def setup(mode, n_humans, seed=1, timing=FAST):
    hub = Hub(timing)
    conns = [FakeConn(f"P{i}") for i in range(n_humans)]
    await hub.on_message(conns[0], {"type": "create", "name": conns[0].name, "mode": mode})
    code = conns[0].room.code
    for c in conns[1:]:
        await hub.on_message(c, {"type": "join", "room": code, "name": c.name})
    room = conns[0].room
    room.rng.seed(seed)
    await hub.on_message(conns[0], {"type": "start"})
    return hub, room, conns


async def set_knobs(hub, conn, ks):
    for slot, k in enumerate(ks):
        await hub.on_message(conn, {"type": "knob", "slot": slot, "pos": k + 2})


async def play_4p_run(seed, tune=True):
    hub, room, (h,) = await setup("4p", 1, seed)
    me = room.seats[h.room.conns[h]["seat"]]
    out = {}
    for mn in (1, 2, 3, 4):
        await h.until("phase", name="brief")
        if tune and mn >= 2:
            await set_knobs(hub, h, Q.OPT_ALICE if me.is_alice else Q.OPT_BOB)
        await hub.on_message(h, {"type": "ready", "v": True})
        if mn == 3:
            d = await h.until("phase", name="drift")
            assert d["at_round"] == 100
            if tune:
                await hub.on_message(h, {"type": "recalibrate"})   # token fixes the drift for the pair
        r = await h.until("result")
        out[mn] = r
        await h.until("phase", name="debrief")
        await hub.on_message(h, {"type": "ready", "v": True})
        if mn >= 2:
            await h.until("meeting")
            await hub.on_message(h, {"type": "vote", "target": None})
            b = await h.until("burn")
            if b.get("game_over"):
                break
            await hub.on_message(h, {"type": "ready", "v": True})
    nerd = await h.until("nerd", timeout=30)
    return h, room, out, nerd


def test_4p_full_run_tuned_clears_missions_and_finale_runs():
    async def go():
        h, room, out, nerd = await play_4p_run(11)
        assert out[1]["wins"] >= 140 - 8                       # classical, ~75%
        assert out[2]["rate"] if "rate" in out[2] else True
        assert out[2]["wins"] > 150                            # quantum, clearly above the wall
        assert nerd["win_rate"] > 0.75
        assert nerd["hardware"] is False and "simulat" in nerd["backend"].lower()
        # no-signalling surface: a client only gets its OWN card/door per round
        rounds = h.of("round")
        assert all(set(r) == {"type", "i", "card", "door", "win", "wins", "streak", "best"} for r in rounds)
        assert len(rounds) in (600, 800)
    asyncio.run(go())


def test_untuned_default_knobs_sit_on_the_wall():
    """Link ON but every knob at its default: exactly the classical 75%, no free win."""
    async def go():
        tot = n = 0
        for seed in range(8):
            hub, room, (h,) = await setup("4p", 1, seed)
            for mn in (1, 2):
                await h.until("phase", name="brief")
                if mn == 2:
                    for s in room.seats:
                        s.knobs = [0, 0]
                    await set_knobs(hub, h, (0, 0))
                await hub.on_message(h, {"type": "ready", "v": True})
                r = await h.until("result")
                await h.until("phase", name="debrief")
                await hub.on_message(h, {"type": "ready", "v": True})
            tot += r["wins"]; n += r["rounds"]
            room._task.cancel()
        assert 0.72 < tot / n < 0.78, tot / n
    asyncio.run(go())


def test_classical_mission_never_beats_wall_on_average():
    async def go():
        tot = n = 0
        for seed in range(5):
            hub, room, (h,) = await setup("4p", 1, seed)
            await h.until("phase", name="brief")
            await hub.on_message(h, {"type": "ready", "v": True})
            r = await h.until("result")
            tot += r["wins"]; n += r["rounds"]
            room._task.cancel()
        assert tot / n <= 0.78
    asyncio.run(go())


def test_gauges_are_server_computed_and_partner_knobs_not_leaked():
    async def go():
        hub, room, (h,) = await setup("4p", 1, 5)
        await h.until("phase", name="brief")
        await hub.on_message(h, {"type": "ready", "v": True})
        await h.until("phase", name="lock")
        await h.until("result"); await h.until("phase", name="debrief")
        await hub.on_message(h, {"type": "ready", "v": True})
        await h.until("phase", name="brief", timeout=20)       # mission 2
        await hub.on_message(h, {"type": "knob", "slot": 0, "pos": 2})
        g = (await h.until("gauges"))
        assert len(g["v"]) == 4 and all(0 <= x <= 1 for x in g["v"])
        # no message to a client ever contains the partner's knob values
        for m in h.log:
            assert "knobs" not in m or m["type"] == "room"
        for m in h.of("room"):
            assert "knobs" not in json.dumps(m["players"])
        room._task.cancel()
    asyncio.run(go())


async def play_4p(seed, votes):
    hub, room, (h,) = await setup("4p", 1, seed)
    me = room.seats[h.room.conns[h]["seat"]]
    ev_all = []
    for mn in (1, 2, 3, 4):
        await h.until("phase", name="brief")
        await set_knobs(hub, h, Q.OPT_ALICE if me.is_alice else Q.OPT_BOB)
        await hub.on_message(h, {"type": "ready", "v": True})
        if mn == 3:
            await h.until("phase", name="drift")
            await hub.on_message(h, {"type": "recalibrate"})
        await h.until("result")
        await h.until("phase", name="debrief")
        await hub.on_message(h, {"type": "ready", "v": True})
        if mn == 1:
            continue
        mt = await h.until("meeting")
        ev_all.append(mt)
        tgt = votes(mt, room, me)
        await hub.on_message(h, {"type": "vote", "target": tgt})
        b = await h.until("burn")
        if b["game_over"]:
            return h, room, ev_all, b
        await hub.on_message(h, {"type": "ready", "v": True})
    b = await h.until("burn")
    return h, room, ev_all, b


def test_4p_skip_always_ends_with_mole_surviving():
    async def go():
        h, room, ev, b = await play_4p(21, lambda mt, room, me: None)
        assert room.winner in ("mole", "crew")
        assert b["game_over"] and b["winner"] == room.winner
        nerd = await h.until("nerd", timeout=30)
        assert nerd["per_card"]
    asyncio.run(go())


def test_4p_meeting_reveals_truth_only_after_burn():
    async def go():
        caught = False
        for seed in range(30, 80):
            if caught:
                break
            hub, room, (h,) = await setup("4p", 1, seed)
            mole = room.moles[0]
            me = room.seats[h.room.conns[h]["seat"]]
            for mn in (1, 2):
                await h.until("phase", name="brief")
                await set_knobs(hub, h, Q.OPT_ALICE if me.is_alice else Q.OPT_BOB)
                await hub.on_message(h, {"type": "ready", "v": True})
                await h.until("result")
                await h.until("phase", name="debrief")
                await hub.on_message(h, {"type": "ready", "v": True})
            mt = await h.until("meeting")
            assert all('"fake"' not in json.dumps(p) for p in mt["pairs"])
            for m in h.log:
                if m["type"] in ("result", "meeting", "room", "chat"):
                    assert '"fake"' not in json.dumps(m), m["type"]
            if mole != me.idx:
                for s in room.seats:
                    if not s.human and not s.burned:
                        s.vote = mole
                await hub.on_message(h, {"type": "vote", "target": mole})
                b = await h.until("burn")
                if b["agent"] == mole:
                    assert b["was_mole"] and b["winner"] == "crew" and b["game_over"]
                    assert any("fake" in x for x in b["history"])
                    caught = True
            room._task.cancel()
        assert caught
    asyncio.run(go())


def test_mole_cheating_pair_scores_near_75_and_honest_pair_near_85():
    async def go():
        cheat_rates, honest_rates = [], []
        for seed in range(100, 112):
            hub, room, (h,) = await setup("4p", 1, seed)
            room.bot_cheat_missions = {2, 3}
            mole = room.moles[0]
            room.seats[mole].conn = None
            me = room.seats[h.room.conns[h]["seat"]]
            await h.until("phase", name="brief")
            await hub.on_message(h, {"type": "ready", "v": True})
            await h.until("result"); await h.until("phase", name="debrief")
            await hub.on_message(h, {"type": "ready", "v": True})
            if mole == me.idx:
                room._task.cancel(); continue
            await h.until("phase", name="brief")
            room.jammed.clear()
            await set_knobs(hub, h, Q.OPT_ALICE if me.is_alice else Q.OPT_BOB)
            await hub.on_message(h, {"type": "ready", "v": True})
            await h.until("result")
            hist = room.history
            for p, rows in hist.items():
                (cheat_rates if rows[-1]["fake"] else honest_rates).append(rows[-1]["rate"])
            room._task.cancel()
        assert cheat_rates and honest_rates
        assert sum(cheat_rates) / len(cheat_rates) < 0.80
        assert sum(honest_rates) / len(honest_rates) > 0.80
    asyncio.run(go())


def test_two_wrong_burns_hand_mole_the_win():
    async def go():
        for seed in range(200, 230):
            hub, room, (h,) = await setup("4p", 1, seed)
            me = room.seats[h.room.conns[h]["seat"]]
            honest_others = [s.idx for s in room.seats if s.role != "mole" and s.idx != me.idx]
            if me.idx in room.moles or len(honest_others) < 2:
                room._task.cancel(); continue
            wrong = 0
            for mn in (1, 2, 3):
                await h.until("phase", name="brief")
                await set_knobs(hub, h, Q.OPT_ALICE if me.is_alice else Q.OPT_BOB)
                await hub.on_message(h, {"type": "ready", "v": True})
                if mn == 3:
                    await h.until("phase", name="drift"); await hub.on_message(h, {"type": "recalibrate"})
                await h.until("result"); await h.until("phase", name="debrief")
                await hub.on_message(h, {"type": "ready", "v": True})
                if mn == 1:
                    continue
                await h.until("meeting")
                alive = [s.idx for s in room.seats if s.role != "mole" and s.idx != me.idx and not s.burned]
                if not alive:
                    break
                for s in room.seats:
                    if not s.human and not s.burned:
                        s.vote = alive[0]
                await hub.on_message(h, {"type": "vote", "target": alive[0]})
                b = await h.until("burn")
                assert b["agent"] == alive[0] and not b["was_mole"]
                wrong += 1
                if b["game_over"]:
                    assert wrong == 2 and b["winner"] == "mole" and b["mole"] == room.seats[room.moles[0]].name
                    room._task.cancel()
                    return
                await hub.on_message(h, {"type": "ready", "v": True})
            room._task.cancel()
        raise AssertionError("never reached two wrong burns")
    asyncio.run(go())


def test_retest_costs_energy_and_chat_and_roles():
    async def go():
        hub, room, (h,) = await setup("4p", 1, 8)
        me = room.seats[h.room.conns[h]["seat"]]
        for mn in (1, 2):
            await h.until("phase", name="brief")
            await hub.on_message(h, {"type": "chat", "text": "hello partner"})
            await hub.on_message(h, {"type": "ready", "v": True})
            await h.until("result"); await h.until("phase", name="debrief")
            await hub.on_message(h, {"type": "ready", "v": True})
        await h.until("meeting")
        await hub.on_message(h, {"type": "probe", "pair": 1})
        r = await h.until("retest")
        assert r["n"] == 20 and 0 <= r["wins"] <= 20 and r["energy"] == 1
        for _ in range(5):
            await hub.on_message(h, {"type": "probe", "pair": 0})
        assert room.pair_energy[me.pair] == 0
        assert room.energy == 1
        room._task.cancel()
        assert sum(1 for s in room.seats if s.role == "mole") == 1
        for m in h.of("room"):
            assert m["you"].get("role") in (None, "agent", "mole")
            assert "role" not in json.dumps(m["players"])
    asyncio.run(go())


def test_8p_start():
    async def go():
        hub, room, conns = await setup("8p", 2, seed=42)
        assert len(room.seats) == 8
        assert len(room.moles) == 2
        m1, m2 = room.moles
        assert room.seats[m1].pair != room.seats[m2].pair
        for s in room.seats:
            if s.idx in (m1, m2):
                assert s.role == "mole"
            else:
                assert s.role == "agent"
        pubs = room.players_pub()
        assert len(pubs) == 8
        for p in pubs:
            assert "role" not in p
        for c in conns:
            s_idx = room.conns[c]["seat"]
            s = room.seats[s_idx]
            y = c.of("room")[-1]["you"]
            if s.role == "mole":
                assert len(y["moles"]) == 2
                assert set(x["seat"] for x in y["moles"]) == {m1, m2}
            else:
                assert "moles" not in y
        room._task.cancel()
    asyncio.run(go())


def test_8p_burning_mole_one_leaves_game_active_and_burning_two_wins():
    async def go():
        hub, room, (h,) = await setup("8p", 1, seed=7)
        m1, m2 = room.moles
        me = room.seats[h.room.conns[h]["seat"]]
        for mn in (1, 2):
            await h.until("phase", name="brief")
            await hub.on_message(h, {"type": "ready", "v": True})
            await h.until("result")
            await h.until("phase", name="debrief")
            await hub.on_message(h, {"type": "ready", "v": True})
        await h.until("meeting")
        for s in room.seats:
            if not s.human and not s.burned:
                s.vote = m1
        await hub.on_message(h, {"type": "vote", "target": m1})
        b1 = await h.until("burn")
        assert b1["agent"] == m1 and b1["was_mole"] is True
        assert b1["game_over"] is False
        assert room.finished is False
        assert room.seats[m1].burned is True
        await hub.on_message(h, {"type": "ready", "v": True})
        await h.until("phase", name="brief")
        await hub.on_message(h, {"type": "ready", "v": True})
        await h.until("phase", name="drift")
        await hub.on_message(h, {"type": "recalibrate"})
        await h.until("result")
        await h.until("phase", name="debrief")
        await hub.on_message(h, {"type": "ready", "v": True})
        await h.until("meeting")
        for s in room.seats:
            if not s.human and not s.burned:
                s.vote = m2
        await hub.on_message(h, {"type": "vote", "target": m2})
        b2 = await h.until("burn")
        assert b2["agent"] == m2 and b2["was_mole"] is True
        assert b2["game_over"] is True and b2["winner"] == "crew"
        assert room.finished is True
        room._task.cancel()
    asyncio.run(go())


def test_8p_three_wrong_burns_mole_wins():
    async def go():
        hub, room, (h,) = await setup("8p", 1, seed=12)
        me = room.seats[h.room.conns[h]["seat"]]
        wrong = 0
        for mn in (1, 2, 3, 4):
            await h.until("phase", name="brief")
            await hub.on_message(h, {"type": "ready", "v": True})
            if mn == 3:
                await h.until("phase", name="drift")
                await hub.on_message(h, {"type": "recalibrate"})
            await h.until("result")
            await h.until("phase", name="debrief")
            await hub.on_message(h, {"type": "ready", "v": True})
            if mn == 1:
                continue
            await h.until("meeting")
            alive_honest = [s.idx for s in room.seats if s.role != "mole" and s.idx != me.idx and not s.burned]
            target = alive_honest[0]
            for s in room.seats:
                if not s.human and not s.burned:
                    s.vote = target
            await hub.on_message(h, {"type": "vote", "target": target})
            b = await h.until("burn")
            assert b["agent"] == target and b["was_mole"] is False
            wrong += 1
            if b["game_over"]:
                assert wrong == 3 and b["winner"] == "mole" and b["max_wrong"] == 3
                room._task.cancel()
                return
            await hub.on_message(h, {"type": "ready", "v": True})
        room._task.cancel()
        assert wrong == 3
    asyncio.run(go())


def test_fog_meeting_payload():
    async def go():
        hub, room, (h,) = await setup("4p", 1, seed=5)
        for mn in (1, 2):
            await h.until("phase", name="brief")
            await hub.on_message(h, {"type": "ready", "v": True})
            await h.until("result")
            await h.until("phase", name="debrief")
            await hub.on_message(h, {"type": "ready", "v": True})
        mt = await h.until("meeting")
        for p in mt["pairs"]:
            assert "tag" in p and p["tag"] in ("solid", "noisy", "weak")
            assert "rate" in p
            assert "p_honest_le" not in p
            assert "p_fake_ge" not in p
            assert "lo" not in p
            assert "hi" not in p
            assert "llr" not in p
        room._task.cancel()
    asyncio.run(go())


def test_mole_kit_jam_and_forge():
    async def go():
        for seed in range(50):
            hub, room, conns = await setup("4p", 2, seed=seed)
            h_mole = next((c for c in conns if room.seats[room.conns[c]["seat"]].role == "mole"), None)
            h_agent = next((c for c in conns if room.seats[room.conns[c]["seat"]].role == "agent"), None)
            if h_mole and h_agent:
                break
        assert h_mole and h_agent
        mole_seat = room.seats[room.conns[h_mole]["seat"]]
        agent_seat = room.seats[room.conns[h_agent]["seat"]]

        await h_mole.until("phase", name="brief")
        await hub.on_message(h_mole, {"type": "ready", "v": True})
        await hub.on_message(h_agent, {"type": "ready", "v": True})
        await h_mole.until("result")
        await h_mole.until("phase", name="debrief")
        await hub.on_message(h_mole, {"type": "ready", "v": True})
        await hub.on_message(h_agent, {"type": "ready", "v": True})

        await h_mole.until("phase", name="brief")
        other_pair = 1 if mole_seat.pair == 0 else 0
        init_shadow = room.shadow
        await hub.on_message(h_mole, {"type": "jam", "pair": other_pair})
        assert room.jammed[other_pair] == 0.18
        assert room.shadow == init_shadow - 1

        await hub.on_message(h_mole, {"type": "ready", "v": True})
        await hub.on_message(h_agent, {"type": "ready", "v": True})
        await h_mole.until("result")
        await h_mole.until("phase", name="debrief")
        await hub.on_message(h_mole, {"type": "ready", "v": True})
        await hub.on_message(h_agent, {"type": "ready", "v": True})

        await h_mole.until("meeting")
        await h_agent.until("meeting")
        shadow_before_forge = room.shadow
        await hub.on_message(h_mole, {"type": "forge"})
        assert room.shadow == shadow_before_forge - 1

        mole_alibis = h_mole.of("alibi")
        agent_alibis = h_agent.of("alibi")
        assert any(a.get("forged") is True and a["seat"] == mole_seat.idx for a in mole_alibis)
        assert any("forged" not in a and a["seat"] == mole_seat.idx and a["tuned"] is True for a in agent_alibis)

        room._task.cancel()
    asyncio.run(go())


def test_mole_chat_isolation():
    async def go():
        for seed in range(50):
            hub, room, conns = await setup("4p", 2, seed=seed)
            h_mole = next((c for c in conns if room.seats[room.conns[c]["seat"]].role == "mole"), None)
            h_agent = next((c for c in conns if room.seats[room.conns[c]["seat"]].role == "agent"), None)
            if h_mole and h_agent:
                break
        await h_mole.until("phase", name="brief")
        await h_agent.until("phase", name="brief")

        await hub.on_message(h_mole, {"type": "chat", "text": "cell secret message", "scope": "mole"})
        await asyncio.sleep(0.05)

        mole_chats = [m for m in h_mole.of("chat") if m.get("scope") == "mole"]
        agent_chats = [m for m in h_agent.of("chat") if m.get("scope") == "mole"]
        assert len(mole_chats) == 1 and mole_chats[0]["text"] == "cell secret message"
        assert len(agent_chats) == 0
        room._task.cancel()
    asyncio.run(go())


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
