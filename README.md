# Twin Signal

Co-op spy-noir game built on the CHSH game. Two agents in sealed rooms get a card (red/blue) and each picks a door.
They win a round iff `(a XOR b) == (x AND y)` (red = 1). A classical team tops out at 75%; an entangled pair
reaches cos²(π/8) ≈ 85.4%. In 4-player (1 mole) and 8-player (2 moles) modes, moles sabotage links with classical fakes
and deception tools, while the crew tracks them through fogged Bell evidence.


## Run it

```bash
python server/serve.py                              # stdlib only; http://localhost:8000
TS_TIMING=fast PORT=8001 python server/serve.py     # short timers, for demos and browser tests

# FastAPI variant (pip install fastapi "uvicorn[standard]"), put TLS in front for wss://
cd server && uvicorn app:app --host 0.0.0.0 --port 8000

# tests (numpy; pytest also works)
python server/tests/test_quantum.py
python server/tests/test_game.py
python server/tests/test_features.py
```

Open the page, CREATE ROOM, pick 4 or 8 players, START. Empty seats are filled by bots, so you can play alone.
`?demo=title|brief|run|meeting|reveal|reveal_b|nerd|role_agent|role_mole|role_coop` shows screens with the exact concept art or role reveals.

Optional: `pip install qiskit qiskit-aer qiskit-ionq`. The finale then runs real circuits (otherwise a numpy
simulator). Env vars: `IONQ_API_KEY`, `IONQ_BACKEND`, `IONQ_SHOTS`. **[CONFIRM]** how Qollab exposes the IonQ simulator.

## Game modes and features
- **Modes**:
  - **4 Players**: 4 seats, 2 pairs, 1 mole. Crew wins on 1 mole burned; moles win on 2 wrong burns or survival.
  - **8 Players**: 8 seats, 4 pairs, 2 moles from different pairs who know each other (cell network). Crew wins only after *both* moles are burned. Burning the first mole triggers "ONE CELL DOWN" and the game continues. Moles win on 3 wrong burns or survival.
- **Story**: 4 missions. Meetings follow missions 2, 3, and 4.
- **Endless & Daily Case File**: 4-player co-op only (two pairs, no moles, no meetings). Endless link degrades each level until two quotas are missed. Daily features seeded cards and modifiers. Both post to leaderboards (`server/data/leaderboard.json`, `GET /api/leaderboard`; set `TS_LEADERBOARD` to move the file).
- **Fog Meeting Evidence**: Pair rates are rounded to the nearest 2% with coarse tags (`solid`, `noisy`, `weak`). P-values, bounds, and numeric LLR are removed. Retesting a pair (1 energy, 20 rounds) engages the Bell meter as coarse `LOW | MID | HIGH`. Teams start with 3 energy (4p) or 4 energy (8p).
- **Mole Kit (Deception & Sabotage)**: Shared shadow pool (2 in 4p, 3 in 8p). Moles can spend shadow during briefing or meeting:
  1. *Cheat* (briefing): classical fake link.
  2. *Jam Pair* (briefing, 1 shadow): injects depolarizing mix into another pair's run.
  3. *Forge Alibi* (meeting, 1 shadow): broadcasts a fake tuned alibi (crew sees a normal alibi, moles see `[FORGED]`).
  4. *Cell Chat*: secure mole-only private channel (`scope: "mole"`) isolated from agent clients.
- **Role Reveal Splash (Among Us style)**: Full-screen cinematic role reveal overlay triggered on match start (`AGENT` in tactical sage/olive with mission directives, `MOLE` in sinister crimson with shadow charges, cell partner, and sabotage directives, or `AGENTS · TWIN CO-OP` for Endless/Daily). Includes custom synthesized espionage chords / stinger slides, auto-fades into briefing after 3.8s, and can be immediately dismissed via [SPACE] / [ESC] / "BEGIN MISSION".
- Stars, points, streaks, wager, blackout and double-drift modifiers, link on/off race replay, case file with share text, Bell Lab puzzle, alibis and Bell meter in meetings, vote reveal, bot personalities, rematch, invite links (`?room=CODE`), phone landscape support.
- Quantum rounds are sampled from the circuit (Aer if installed, else a numpy statevector of the same circuit) with a depolarising noise mix. The case file states which engine was used.

## Layout
- `server/quantum.py`: analytic win probabilities, noise model, fake-link sampler, Qiskit circuit builder, numpy
  statevector cross-check, finale runner.
- `server/game.py`: authoritative room state machine (briefing, lock, silent run, drift, debrief, meeting, burn, finale).
- `server/hub.py`, `serve.py`, `app.py`: routing, stdlib WebSocket server, FastAPI adapter.
- `server/leaderboard.py`: JSON-file leaderboard.
- `client/`: DOM client, no build step. `tpl_a.js` and `tpl_b.js` are the concept boards at 1280×720; `overlays.js` holds Bell Lab, race replay, case file and scores.

## Guarantees (tested)
- All four optimal card pairs ≈ 0.854; the circuit matches the formula for all 5⁴ knob settings.
- Best classical codebook is exactly 0.75; the fake link never beats 0.75 on average.
- Doors for a half-mission are drawn at LOCK; a client only receives its own card/door, its pair's gauges and
  aggregate scores; roles and cheating are never broadcast.

## Known gaps
- Qiskit, qiskit-ionq and FastAPI paths are written but were not executed in the build sandbox (PyPI blocked).
- The finale uses a local simulator unless a backend is configured; the UI states which one produced the numbers.
- Fonts (Silkscreen, JetBrains Mono) load from Google Fonts.
- Added beyond the concept art: lobby panel (modes, invite), call-sign field, Mole panel, quota and wager chip, HQ panel, alibi and Bell meter, vote strip, drift banner, Nerd Mode button, timer, toolbar. `?demo=` pages hide the additions.
- Leaderboards are unauthenticated and trust the server only; there is no account system or anti-abuse.
- Accessibility needs a pass (contrast, small text).

## License

This project is licensed under the [MIT License](LICENSE).
