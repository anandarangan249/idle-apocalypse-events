"""
Simulated Annealing optimizer for Idle Apocalypse Other Tower.

Key insight: the optimal strategy can be represented as a *priority ordering*
of all possible upgrade steps. At each game tick, buy the highest-priority
upgrade you can currently afford.

This reduces an RL problem (continuous state/action space, 1728-step episodes)
to combinatorial optimisation over a permutation of ~81 items — a much better
fit for simulated annealing than for PPO.

How it works:
  1. Build a list of all upgrade steps (Fiona L1→L2, Jingles unlock, ...) = 81 items
  2. Randomly shuffle the list to create an initial candidate ordering
  3. SA: repeatedly perturb the ordering, accept improvements + occasional degradations
  4. Return the best ordering found, plus its full purchase log
"""

import random
import math
import time
from typing import Optional

from config import EVENT_CONFIG
from simulation import GameSim

STEP_MS = 60_000   # 1-minute steps → 864 steps per 14.4-hour episode


# ============================================================
# Priority-list representation
# ============================================================

def build_template():
    """
    Return the list of ALL upgrade steps across all creatures and boosts.
    Each entry is (kind, uid, display_name).  Multiple entries with the same
    uid represent successive levels (the simulation tracks which level is next).

    Total: ~81 entries for the Other Tower event.
    """
    steps = []
    for c in EVENT_CONFIG['creatures']:
        # unlocked-by-default creatures start at Lv1, so 9 upgrade steps
        n = c['maxLevel'] if not c.get('unlockedByDefault') else c['maxLevel'] - 1
        for _ in range(n):
            steps.append(('creature', c['id'], c['name']))
    for b in EVENT_CONFIG.get('boosts', []):
        for _ in range(b['maxLevel']):
            steps.append(('boost', b['id'], b['name']))
    return steps


def _build_pos_map(priority):
    """
    priority → dict: (kind, uid) → [sorted positions in the priority list]

    positions[i] holds the priority-list index of the i-th purchase of that uid.
    E.g. if Fiona appears at positions 3, 15, 40 …, then after buying Fiona L2
    (counts = 1) we look at position 15 to decide her relative priority for L3.
    """
    pos_map = {}
    for pos, (kind, uid, _) in enumerate(priority):
        key = (kind, uid)
        if key not in pos_map:
            pos_map[key] = []
        pos_map[key].append(pos)
    return pos_map


# ============================================================
# Simulation with priority list
# ============================================================

def simulate(priority) -> float:
    """
    Simulate a full event following the given priority ordering.
    Returns total damage dealt.
    """
    sim     = GameSim(EVENT_CONFIG)
    pos_map = _build_pos_map(priority)
    counts  = {key: 0 for key in pos_map}
    n       = len(priority)

    while not sim.is_done():
        best_pos = n        # sentinel — no affordable upgrade found yet
        best_key = None

        for key, positions in pos_map.items():
            c = counts[key]
            if c >= len(positions):
                continue        # all levels of this item already purchased
            p = positions[c]
            if p >= best_pos:
                continue        # can't beat current best — early exit
            kind, uid = key
            cost = (sim.get_creature_upgrade_cost(uid) if kind == 'creature'
                    else sim.get_boost_upgrade_cost(uid))
            if cost and sim.can_afford(cost):
                best_pos = p
                best_key = key

        if best_key is not None:
            kind, uid = best_key
            if kind == 'creature':
                sim.upgrade_creature(uid)
            else:
                sim.upgrade_boost(uid)
            counts[best_key] += 1

        sim.advance(STEP_MS)

    return sim.total_damage


def simulate_with_log(priority):
    """Like simulate() but also records every purchase and returns the final sim."""
    sim     = GameSim(EVENT_CONFIG)
    pos_map = _build_pos_map(priority)
    name_map = {(kind, uid): name for kind, uid, name in priority}
    counts  = {key: 0 for key in pos_map}
    log     = []
    n       = len(priority)

    while not sim.is_done():
        best_pos = n
        best_key = None

        for key, positions in pos_map.items():
            c = counts[key]
            if c >= len(positions):
                continue
            p = positions[c]
            if p >= best_pos:
                continue
            kind, uid = key
            cost = (sim.get_creature_upgrade_cost(uid) if kind == 'creature'
                    else sim.get_boost_upgrade_cost(uid))
            if cost and sim.can_afford(cost):
                best_pos = p
                best_key = key

        if best_key is not None:
            kind, uid = best_key
            name = name_map[best_key]
            t_h  = sim.time_elapsed_ms / 3_600_000

            if kind == 'creature':
                sim.upgrade_creature(uid)
                lv = sim.creature_levels[uid]
                label = (f"Unlock {name}" if lv == 1
                         else f"Upgrade {name} → Lv{lv}")
            else:
                sim.upgrade_boost(uid)
                lv = sim.boost_levels[uid]
                label = f"Buy {name} Lv{lv}"

            log.append({'time_h': t_h, 'action': label})
            counts[best_key] += 1

        sim.advance(STEP_MS)

    return sim.total_damage, log, sim


# ============================================================
# Simulated Annealing
# ============================================================

def simulated_annealing(n_iter: int = 20_000,
                        verbose: bool = True,
                        seed: Optional[int] = None):
    """
    Find a near-optimal purchase priority ordering via simulated annealing.

    Args:
        n_iter:  Number of SA iterations.  ~20K gives good results in ~2 min.
        verbose: Print progress every 2000 iterations.
        seed:    Random seed for reproducibility.

    Returns:
        (best_priority, best_damage)
    """
    if seed is not None:
        random.seed(seed)

    template = build_template()
    n        = len(template)

    if verbose:
        print(f"  Template size: {n} upgrade steps")
        print(f"  Running {n_iter:,} SA iterations…\n")

    # ---- Initial solution: random shuffle ----
    current       = list(template)
    random.shuffle(current)
    current_score = simulate(current)

    best       = list(current)
    best_score = current_score

    # ---- Temperature schedule ----
    # Start: accept ~30% of degradations.  End: accept almost nothing.
    T_start = 0.30
    T_end   = 0.0001
    cooling = (T_end / T_start) ** (1.0 / max(n_iter - 1, 1))
    temp    = T_start

    t0       = time.time()
    n_accept = 0

    for i in range(n_iter):
        # ---- Perturbation: one of three operators ----
        r   = random.random()
        nbr = list(current)

        if r < 0.50:
            # Swap two random positions (fine-grained)
            a, b = random.sample(range(n), 2)
            nbr[a], nbr[b] = nbr[b], nbr[a]

        elif r < 0.85:
            # Relocate: remove one item and re-insert elsewhere (medium)
            a    = random.randrange(n)
            b    = random.randrange(n - 1)
            item = nbr.pop(a)
            nbr.insert(b, item)

        else:
            # Reverse a short segment (good for local re-ordering)
            a      = random.randrange(n)
            length = random.randint(2, min(8, n))
            b      = min(a + length, n)
            nbr[a:b] = nbr[a:b][::-1]

        nbr_score = simulate(nbr)
        delta     = nbr_score - current_score

        # Accept if better; accept worse with Boltzmann probability
        if delta > 0 or random.random() < math.exp(delta / (temp * max(current_score, 1e6))):
            current       = nbr
            current_score = nbr_score
            n_accept     += 1
            if nbr_score > best_score:
                best       = list(nbr)
                best_score = nbr_score

        temp *= cooling

        if verbose and (i + 1) % 2000 == 0:
            elapsed = time.time() - t0
            rate    = (i + 1) / elapsed
            pct     = n_accept / (i + 1) * 100
            print(f"  [{i+1:5d}/{n_iter}]  best={best_score/1e9:8.3f}B  "
                  f"temp={temp:.5f}  accept={pct:.1f}%  "
                  f"speed={rate:.0f} iter/s")

    elapsed = time.time() - t0
    if verbose:
        print(f"\n  Done in {elapsed:.1f}s  ({n_iter/elapsed:.0f} iter/s)")

    return best, best_score


# ============================================================
# Hill climbing — exhaustive single-pass swap search
# ============================================================

def hill_climb(priority, verbose=True):
    """
    Try every pairwise swap (n*(n-1)/2 candidates).
    Apply the single best improvement found, then return.
    Call repeatedly until it returns improved=False to reach a local optimum.
    """
    n          = len(priority)
    base_score = simulate(priority)
    best_score = base_score
    best_i = best_j = -1

    if verbose:
        total = n * (n - 1) // 2
        print(f"  Hill-climb: scanning {total} swaps…", end="", flush=True)

    for i in range(n):
        for j in range(i + 1, n):
            nbr       = list(priority)
            nbr[i], nbr[j] = nbr[j], nbr[i]
            s = simulate(nbr)
            if s > best_score:
                best_score = s
                best_i, best_j = i, j

    if best_i >= 0:
        result = list(priority)
        result[best_i], result[best_j] = result[best_j], result[best_i]
        if verbose:
            print(f"  {base_score/1e9:.3f}B → {best_score/1e9:.3f}B")
        return result, best_score, True

    if verbose:
        print(f"  local optimum at {base_score/1e9:.3f}B")
    return list(priority), base_score, False


# ============================================================
# Full optimisation pipeline
# ============================================================

def optimize(n_iter=30_000,
             n_restarts=5,
             hill_climb_passes=3,
             verbose=True,
             seed=None):
    """
    Multi-restart SA followed by exhaustive hill-climbing.

    Args:
        n_iter:             SA iterations per restart.
        n_restarts:         Number of independent SA runs (different random seeds).
        hill_climb_passes:  Max exhaustive swap passes after SA (stops early if no gain).
        verbose:            Print progress.
        seed:               Master random seed.

    Returns:
        (best_priority, best_score)
    """
    if seed is not None:
        random.seed(seed)

    global_best       = None
    global_best_score = 0.0

    for r in range(n_restarts):
        if verbose:
            print(f"\n{'─'*60}")
            print(f"  SA restart {r + 1} / {n_restarts}")
            print(f"{'─'*60}")

        sub_seed         = random.randint(0, 2 ** 31)
        priority, score  = simulated_annealing(n_iter=n_iter, verbose=verbose, seed=sub_seed)

        if verbose:
            tag = "  *** new global best ***" if score > global_best_score else ""
            print(f"  Restart score: {score/1e9:.3f}B{tag}")

        if score > global_best_score:
            global_best       = list(priority)
            global_best_score = score

    if verbose:
        print(f"\n{'='*60}")
        print(f"  Best across {n_restarts} restarts: {global_best_score/1e9:.3f}B")
        print(f"  Running up to {hill_climb_passes} hill-climb passes…")

    for p in range(hill_climb_passes):
        if verbose:
            print(f"\n  Pass {p + 1} / {hill_climb_passes}")
        global_best, global_best_score, improved = hill_climb(global_best, verbose=verbose)
        if not improved:
            if verbose:
                print("  Converged — stopping early.")
            break

    if verbose:
        print(f"\n  Final score: {global_best_score/1e9:.3f}B")

    return global_best, global_best_score
