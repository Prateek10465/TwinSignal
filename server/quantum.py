"""Twin Signal quantum engine.

The CHSH game: cards x, y in {0 (blue), 1 (red)}, doors a, b in {0 (L), 1 (R)}.
The pair WINS a round iff (a XOR b) == (x AND y).

Everything the live game needs is analytic (instant).  The Qiskit circuit
builder and the IonQ runner are only used by the finale ("Declassified" run)
and by the Nerd Mode screen.  Qiskit is imported lazily so the game server and
tests run even where qiskit is not installed; `statevector_probs()` is an
independent numpy simulation of exactly the same circuit used to check the maths.
"""
from __future__ import annotations

import math
import os
import random
from itertools import product
from typing import Sequence

import numpy as np

STEP = math.pi / 8                    # one snap on a knob
SNAPS = (-2, -1, 0, 1, 2)             # k, knob angle = k * pi/8  (5 snap positions)
CARDS = ((0, 0), (0, 1), (1, 0), (1, 1))   # (x, y): blue/blue, blue/red, red/blue, red/red
CLASSICAL_BOUND = 0.75
TSIRELSON = math.cos(math.pi / 8) ** 2     # 0.853553...

# Optimal knob settings, as snap indices k.  Index = card colour (0 blue, 1 red).
OPT_ALICE = (0, 2)    # theta = [0, pi/4]
OPT_BOB = (1, -1)     # theta = [pi/8, -pi/8]


def theta(k: float) -> float:
    return k * STEP


def wrap(d: float) -> float:
    """Wrap an angle difference into [-pi/2, pi/2]."""
    d = (d + math.pi / 2) % math.pi - math.pi / 2
    return d


# --------------------------------------------------------------------------
# Win probabilities.  kA, kB are (k_for_blue, k_for_red) snap indices.
# --------------------------------------------------------------------------

def p_win_ideal(x: int, y: int, kA: Sequence[float], kB: Sequence[float]) -> float:
    """Ideal entangled pair.  D = thetaA[x] - thetaB[y]."""
    D = theta(kA[x]) - theta(kB[y])
    return math.cos(D) ** 2 if x * y == 0 else math.sin(D) ** 2


def p_equal_fake(D: float) -> float:
    """Local-hidden-variable fake link: P(doors equal) = 1 - 2|D|/pi, D wrapped."""
    return 1.0 - 2.0 * abs(wrap(D)) / math.pi


def p_win_fake(x: int, y: int, kA: Sequence[float], kB: Sequence[float]) -> float:
    D = theta(kA[x]) - theta(kB[y])
    pe = p_equal_fake(D)
    return pe if x * y == 0 else 1.0 - pe


def door_classical(k: float) -> int:
    """Link OFF: a knob is just a fixed answer.  Right of centre = door R."""
    return 1 if k > 0 else 0


def p_win_classical(x: int, y: int, kA: Sequence[float], kB: Sequence[float]) -> float:
    a, b = door_classical(kA[x]), door_classical(kB[y])
    return 1.0 if (a ^ b) == (x & y) else 0.0


def noisy(p: float, V: float) -> float:
    """Link quality V in [0,1]: p' = 0.5 + V (p - 0.5).  Advantage dies below V = 1/sqrt(2)."""
    return 0.5 + V * (p - 0.5)


MODES = ("quantum", "fake", "classical")


def p_win(mode: str, x: int, y: int, kA, kB, V: float = 1.0) -> float:
    if mode == "quantum":
        return noisy(p_win_ideal(x, y, kA, kB), V)
    if mode == "fake":
        return noisy(p_win_fake(x, y, kA, kB), V)
    if mode == "classical":
        return p_win_classical(x, y, kA, kB)
    raise ValueError(mode)


def gauges(mode: str, kA, kB, V: float = 1.0) -> list[float]:
    """Win probability for each card pair, in CARDS order."""
    return [p_win(mode, x, y, kA, kB, V) for x, y in CARDS]


def team_avg(g: Sequence[float]) -> float:
    return sum(g) / 4.0     # cards are uniform, so every pair is equally likely


# --------------------------------------------------------------------------
# Sampling doors.
# --------------------------------------------------------------------------

def sample_doors(rng: random.Random, mode: str, x: int, y: int, kA, kB, V: float = 1.0) -> tuple[int, int]:
    """Return (a, b).  Each door is uniform on its own; only the correlation matters."""
    if mode == "classical":
        return door_classical(kA[x]), door_classical(kB[y])
    pw = p_win(mode, x, y, kA, kB, V)
    p_equal = pw if x * y == 0 else 1.0 - pw
    a = rng.getrandbits(1)
    b = a if rng.random() < p_equal else 1 - a
    return a, b


# --------------------------------------------------------------------------
# Rounds drawn from the circuit itself (instead of the closed-form win probability).
# --------------------------------------------------------------------------

_AER = "unset"


def _aer():
    global _AER
    if _AER == "unset":
        try:
            from qiskit_aer import AerSimulator
            _AER = AerSimulator()
        except Exception:
            _AER = None
    return _AER


def engine_name() -> str:
    return "Qiskit Aer (circuit)" if _aer() is not None else "numpy statevector (circuit)"


def circuit_outcomes(rng: random.Random, x: int, y: int, kA, kB, n: int, V: float = 1.0) -> list[tuple[int, int]]:
    """n measurements (a, b) of the Twin Link circuit for cards (x, y).

    Ideal circuit samples come from Aer when installed, else from the numpy statevector of the same circuit.
    Link noise is a depolarising mix: with probability 1-V the pair is replaced by two fair coins, which
    gives exactly p' = 0.5 + V (p - 0.5) for the win probability.
    """
    if n <= 0:
        return []
    out: list[tuple[int, int]] = []
    sim = _aer()
    if sim is not None:
        try:
            qc = build_circuit(x, y, kA, kB)
            res = sim.run(qc, shots=n, memory=True, seed_simulator=rng.getrandbits(31)).result()
            out = [parse_key(m) for m in res.get_memory()]
        except Exception:
            out = []
    if not out:
        pr = statevector_probs(x, y, kA, kB)
        keys = list(pr.keys())
        ps = [pr[k] for k in keys]
        out = [keys[i] for i in rng.choices(range(4), weights=ps, k=n)]
    if V < 1.0:
        out = [(rng.getrandbits(1), rng.getrandbits(1)) if rng.random() > V else o for o in out]
    return out


def sample_half_circuit(rng: random.Random, cards: list[tuple[int, int]], kA, kB, V: float = 1.0) -> list[tuple[int, int]]:
    """Doors for a list of (x, y) cards, in order, all drawn from circuit measurements (batched per card pair)."""
    by_card: dict[tuple[int, int], list] = {}
    for c in set(cards):
        by_card[c] = circuit_outcomes(rng, c[0], c[1], kA, kB, cards.count(c), V)
    pos = {c: 0 for c in by_card}
    res = []
    for c in cards:
        res.append(by_card[c][pos[c]])
        pos[c] += 1
    return res


def log_lik(w: int, n: int, p: float) -> float:
    """log P(w wins in n rounds | per-round win probability p), binomial."""
    p = min(max(p, 1e-9), 1 - 1e-9)
    return (math.lgamma(n + 1) - math.lgamma(w + 1) - math.lgamma(n - w + 1)
            + w * math.log(p) + (n - w) * math.log(1 - p))


def bell_llr(w: int, n: int, V: float = 1.0) -> float:
    """log10 of P(data | fake link) / P(data | honest tuned link).  Positive = looks like a fake."""
    return (log_lik(w, n, noisy(CLASSICAL_BOUND, V)) - log_lik(w, n, noisy(TSIRELSON, V))) / math.log(10)


def wins(a: int, b: int, x: int, y: int) -> bool:
    return (a ^ b) == (x & y)


# --------------------------------------------------------------------------
# Honest-range statistics for the meeting (exact binomial, no scipy).
# --------------------------------------------------------------------------

def _binom_pmf(n: int, p: float) -> list[float]:
    if p <= 0:
        return [1.0] + [0.0] * n
    if p >= 1:
        return [0.0] * n + [1.0]
    logs = []
    lp, lq = math.log(p), math.log(1 - p)
    for k in range(n + 1):
        logs.append(math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1) + k * lp + (n - k) * lq)
    m = max(logs)
    w = [math.exp(v - m) for v in logs]
    s = sum(w)
    return [v / s for v in w]


def binom_cdf(k: int, n: int, p: float) -> float:
    """P(X <= k)."""
    if k < 0:
        return 0.0
    return min(1.0, sum(_binom_pmf(n, p)[: k + 1]))


def binom_sf(k: int, n: int, p: float) -> float:
    """P(X >= k)."""
    if k <= 0:
        return 1.0
    return min(1.0, sum(_binom_pmf(n, p)[k:]))


def honest_range(n: int, V: float = 1.0, z: float = 2.0) -> tuple[float, float]:
    """Win-rate band an honest, well-tuned link lands in (about 95% of the time)."""
    p = noisy(TSIRELSON, V)
    sd = math.sqrt(p * (1 - p) / n)
    return max(0.0, p - z * sd), min(1.0, p + z * sd)


# --------------------------------------------------------------------------
# The real circuit.
# --------------------------------------------------------------------------

def _ry(phi: float) -> np.ndarray:
    c, s = math.cos(phi / 2), math.sin(phi / 2)
    return np.array([[c, -s], [s, c]], dtype=complex)


def statevector_probs(x: int, y: int, kA, kB) -> dict[tuple[int, int], float]:
    """Independent numpy simulation of the circuit below.  Returns P(a, b).

    Qubit 0 is Alice's (a), qubit 1 is Bob's (b).  Basis order is |q1 q0>.
    """
    H = np.array([[1, 1], [1, -1]], dtype=complex) / math.sqrt(2)
    I2 = np.eye(2, dtype=complex)
    psi = np.zeros(4, dtype=complex)
    psi[0] = 1.0                                   # |00>
    psi = np.kron(I2, H) @ psi                     # H on q0   (kron(q1, q0))
    cnot = np.zeros((4, 4), dtype=complex)         # control q0, target q1
    for q1, q0 in product((0, 1), repeat=2):
        src = (q1 << 1) | q0
        dst = ((q1 ^ q0) << 1) | q0
        cnot[dst, src] = 1
    psi = cnot @ psi
    psi = np.kron(_ry(-2 * theta(kB[y])), _ry(-2 * theta(kA[x]))) @ psi
    probs = np.abs(psi) ** 2
    out = {}
    for idx in range(4):
        q0, q1 = idx & 1, idx >> 1
        out[(q0, q1)] = float(probs[idx])
    return out


def build_circuit(x: int, y: int, kA, kB):
    """Qiskit circuit for one card pair.  Needs qiskit installed."""
    from qiskit import QuantumCircuit

    qc = QuantumCircuit(2, 2, name=f"twin_link_x{x}_y{y}")
    qc.h(0)
    qc.cx(0, 1)
    qc.ry(-2 * theta(kA[x]), 0)
    qc.ry(-2 * theta(kB[y]), 1)
    qc.measure(0, 0)
    qc.measure(1, 1)
    return qc


def parse_key(key: str) -> tuple[int, int]:
    """Qiskit counts keys are little-endian: 'b a' -> q1 q0.  Return (a, b)."""
    key = key.replace(" ", "")
    return int(key[-1]), int(key[-2])


def counts_to_win_rate(counts: dict[str, int], x: int, y: int) -> float:
    tot = sum(counts.values())
    w = 0
    for key, n in counts.items():
        a, b = parse_key(key)
        if wins(a, b, x, y):
            w += n
    return w / tot if tot else 0.0


def _numpy_counts(x, y, kA, kB, shots, rng) -> dict[str, int]:
    pr = statevector_probs(x, y, kA, kB)
    keys, ps = zip(*[((a, b), p) for (a, b), p in pr.items()])
    draws = rng.choices(range(4), weights=ps, k=shots)
    counts: dict[str, int] = {}
    for d in draws:
        a, b = keys[d]
        k = f"{b}{a}"                              # little-endian, like Qiskit
        counts[k] = counts.get(k, 0) + 1
    return counts


def run_finale(shots: int = 1000, kA=OPT_ALICE, kB=OPT_BOB, seed: int | None = None) -> dict:
    """Run the four optimal circuits on the IonQ simulator if reachable, else a local simulator.

    The hackathon gives access to IonQ's *simulator* through Qollab (no separate key).  [CONFIRM] how
    Qollab exposes it; until then this tries qiskit-ionq with IONQ_API_KEY / IONQ_BACKEND and otherwise
    falls back to Aer or numpy.  The result always says which backend really produced the counts.
    """
    rng = random.Random(seed)
    api_key = os.environ.get("IONQ_API_KEY")
    backend_name = os.environ.get("IONQ_BACKEND", "simulator")
    note = ""
    per_card = []
    backend_used = None
    hardware = False

    circuits = None
    try:
        circuits = [build_circuit(x, y, kA, kB) for x, y in CARDS]
    except Exception as e:          # qiskit missing
        note = f"qiskit unavailable ({type(e).__name__}); used numpy simulation"

    results = None
    if circuits and api_key:
        try:
            from qiskit_ionq import IonQProvider

            provider = IonQProvider(token=api_key)
            backend = provider.get_backend(backend_name)
            job = backend.run(circuits, shots=shots)
            res = job.result()
            results = [res.get_counts(i) for i in range(4)]
            backend_used = f"IonQ {backend_name}"
            hardware = backend_name not in ("simulator", "ionq_simulator")
        except Exception as e:
            note = f"IonQ run failed ({type(e).__name__}: {e}); fell back to local simulation"
    elif not api_key:
        note = "IONQ_API_KEY not set; local simulation, not hardware"

    if results is None and circuits:
        try:
            from qiskit_aer import AerSimulator

            sim = AerSimulator(seed_simulator=seed)
            res = sim.run(circuits, shots=shots).result()
            results = [res.get_counts(i) for i in range(4)]
            backend_used = "Aer simulator (local, ideal)"
        except Exception:
            results = None
    if results is None:
        results = [_numpy_counts(x, y, kA, kB, shots, rng) for x, y in CARDS]
        backend_used = "numpy simulator (local, ideal)"

    tot_w = tot = 0
    for (x, y), counts in zip(CARDS, results):
        wr = counts_to_win_rate(counts, x, y)
        n = sum(counts.values())
        per_card.append({"x": x, "y": y, "counts": counts, "win": wr, "shots": n})
        tot_w += wr * n
        tot += n
    return {
        "backend": backend_used,
        "hardware": hardware,
        "shots_per_pair": shots,
        "per_card": per_card,
        "win_rate": tot_w / tot,
        "classical": CLASSICAL_BOUND,
        "ideal": TSIRELSON,
        "note": note,
    }
