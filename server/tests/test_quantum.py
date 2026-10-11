import math, random, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from itertools import product
import quantum as q

TOL = 1e-9


def test_optimal_pairs_are_tsirelson():
    for x, y in q.CARDS:
        assert abs(q.p_win_ideal(x, y, q.OPT_ALICE, q.OPT_BOB) - q.TSIRELSON) < TOL
    assert abs(q.TSIRELSON - 0.8535533905932737) < TOL


def test_circuit_matches_formula_for_every_knob_pair():
    """numpy simulation of H, CNOT, Ry(-2a), Ry(-2b) agrees with cos^2 / sin^2 for all 5^4 settings."""
    for ka in product(q.SNAPS, repeat=2):
        for kb in product(q.SNAPS, repeat=2):
            for x, y in q.CARDS:
                pr = q.statevector_probs(x, y, ka, kb)
                pw = sum(p for (a, b), p in pr.items() if q.wins(a, b, x, y))
                assert abs(pw - q.p_win_ideal(x, y, ka, kb)) < 1e-9, (ka, kb, x, y)
                # each door alone is a fair coin (no signalling)
                assert abs(sum(p for (a, b), p in pr.items() if a == 1) - 0.5) < 1e-9
                assert abs(sum(p for (a, b), p in pr.items() if b == 1) - 0.5) < 1e-9


def test_best_classical_codebook_is_exactly_75():
    best = 0.0
    for ka in product(q.SNAPS, repeat=2):
        for kb in product(q.SNAPS, repeat=2):
            avg = q.team_avg(q.gauges("classical", ka, kb))
            best = max(best, avg)
    assert abs(best - 0.75) < TOL


def test_fake_link_never_beats_75_on_average():
    best = 0.0
    for ka in product(q.SNAPS, repeat=2):
        for kb in product(q.SNAPS, repeat=2):
            best = max(best, q.team_avg(q.gauges("fake", ka, kb)))
    assert best <= 0.75 + 1e-9
    # and it reaches 75 exactly at the optimal quantum angles
    assert abs(q.team_avg(q.gauges("fake", q.OPT_ALICE, q.OPT_BOB)) - 0.75) < TOL


def test_fake_link_equals_formula_by_hidden_variable_monte_carlo():
    rng = random.Random(1)
    ka, kb = q.OPT_ALICE, q.OPT_BOB
    n = 200000
    for x, y in q.CARDS:
        w = 0
        for _ in range(n // 4):
            lam = rng.uniform(0, math.pi)
            a = 1 if math.cos(2 * (q.theta(ka[x]) - lam)) < 0 else 0
            b = 1 if math.cos(2 * (q.theta(kb[y]) - lam)) < 0 else 0
            w += q.wins(a, b, x, y)
        assert abs(w / (n // 4) - q.p_win_fake(x, y, ka, kb)) < 0.01


def test_noise_kills_advantage_below_0707():
    assert q.noisy(q.TSIRELSON, 0.7) < 0.75
    assert q.noisy(q.TSIRELSON, 0.72) > 0.75
    assert abs(q.noisy(q.TSIRELSON, 1) - q.TSIRELSON) < TOL
    assert abs(q.noisy(q.TSIRELSON, 0) - 0.5) < TOL


def test_default_knobs_sit_on_the_wall():
    g = q.gauges("quantum", (0, 0), (0, 0))
    assert abs(q.team_avg(g) - 0.75) < TOL


def test_sampling_matches_probabilities():
    rng = random.Random(7)
    n = 40000
    for x, y in q.CARDS:
        w = a1 = 0
        for _ in range(n):
            a, b = q.sample_doors(rng, "quantum", x, y, q.OPT_ALICE, q.OPT_BOB)
            w += q.wins(a, b, x, y)
            a1 += a
        assert abs(w / n - q.TSIRELSON) < 0.012
        assert abs(a1 / n - 0.5) < 0.012


def test_qiskit_key_parsing_is_little_endian():
    assert q.parse_key("10") == (0, 1)      # q1=1, q0=0 -> a=0, b=1
    assert q.parse_key("0 1") == (1, 0)
    assert q.counts_to_win_rate({"00": 10}, 0, 0) == 1.0
    assert q.counts_to_win_rate({"10": 10}, 1, 1) == 1.0


def test_finale_local_run_close_to_ideal():
    r = q.run_finale(shots=4000, seed=3)
    assert abs(r["win_rate"] - q.TSIRELSON) < 0.02
    assert r["win_rate"] > q.CLASSICAL_BOUND
    assert r["hardware"] is False


def test_binomial_helpers():
    assert abs(q.binom_cdf(5, 10, 0.5) - 0.623046875) < 1e-9
    assert abs(q.binom_sf(5, 10, 0.5) - 0.623046875) < 1e-9
    lo, hi = q.honest_range(200)
    assert lo < q.TSIRELSON < hi


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
