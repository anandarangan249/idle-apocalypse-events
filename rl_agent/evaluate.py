# ============================================
# Evaluation — Greedy baseline vs SA optimizer
# ============================================
# Usage:
#   cd rl_agent
#   python evaluate.py
# ============================================

import copy

from simulation import GameSim
from config import EVENT_CONFIG
from optimizer import optimize, simulate_with_log

STEP_MS = 30_000


# ============================================================
# Helper
# ============================================================

def fmt(n):
    if n >= 1e12: return f"{n/1e12:.2f}T"
    if n >= 1e9:  return f"{n/1e9:.2f}B"
    if n >= 1e6:  return f"{n/1e6:.2f}M"
    if n >= 1e3:  return f"{n/1e3:.2f}K"
    return f"{n:.0f}"


# ============================================================
# Strategy 1 — Greedy baseline
# ============================================================

def _score_upgrade(sim_orig, kind, uid, time_remaining_ms):
    """
    Score an upgrade by:
        DPS gain × time_remaining_s / total_resource_cost
    Higher = better investment.
    Returns None if unaffordable or invalid.
    """
    if kind == 'creature':
        cost = sim_orig.get_creature_upgrade_cost(uid)
    else:
        cost = sim_orig.get_boost_upgrade_cost(uid)

    if cost is None or not sim_orig.can_afford(cost):
        return None

    current_dps = sim_orig.get_dps()

    sim2 = copy.copy(sim_orig)
    sim2.resources         = dict(sim_orig.resources)
    sim2.creature_levels   = dict(sim_orig.creature_levels)
    sim2.creature_unlocked = dict(sim_orig.creature_unlocked)
    sim2.boost_levels      = dict(sim_orig.boost_levels)

    if kind == 'creature':
        sim2.upgrade_creature(uid)
    else:
        sim2.upgrade_boost(uid)

    dps_gain   = sim2.get_dps() - current_dps
    time_s     = time_remaining_ms / 1000.0
    total_cost = sum(cost.values()) or 1.0

    return dps_gain * time_s / total_cost


def run_greedy():
    sim       = GameSim(EVENT_CONFIG)
    log       = []
    creatures = EVENT_CONFIG['creatures']
    boosts    = EVENT_CONFIG.get('boosts', [])

    while not sim.is_done():
        best_score = -1.0
        best_kind  = None
        best_uid   = None
        best_name  = None
        time_rem   = sim.duration_ms - sim.time_elapsed_ms

        for c in creatures:
            s = _score_upgrade(sim, 'creature', c['id'], time_rem)
            if s is not None and s > best_score:
                best_score = s
                best_kind  = 'creature'
                best_uid   = c['id']
                best_name  = c['name']

        for b in boosts:
            s = _score_upgrade(sim, 'boost', b['id'], time_rem)
            if s is not None and s > best_score:
                best_score = s
                best_kind  = 'boost'
                best_uid   = b['id']
                best_name  = b['name']

        if best_kind == 'creature':
            sim.upgrade_creature(best_uid)
            lv = sim.creature_levels[best_uid]
            log.append({'time_h': sim.time_elapsed_ms / 3_600_000,
                        'action': f"Upgrade {best_name} → Lv{lv}"})
        elif best_kind == 'boost':
            sim.upgrade_boost(best_uid)
            lv = sim.boost_levels[best_uid]
            log.append({'time_h': sim.time_elapsed_ms / 3_600_000,
                        'action': f"Buy {best_name} Lv{lv}"})

        sim.advance(STEP_MS)

    return sim.total_damage, log, sim


# ============================================================
# Strategy 2 — Simulated Annealing optimizer
# ============================================================

def run_sa(n_iter=30_000, n_restarts=5, seed=42):
    """Multi-restart SA + hill climbing."""
    best_priority, _ = optimize(
        n_iter=n_iter, n_restarts=n_restarts,
        hill_climb_passes=3, verbose=True, seed=seed,
    )
    damage, log, sim = simulate_with_log(best_priority)
    return damage, log, sim


# ============================================================
# Pretty-printing helpers
# ============================================================

def print_purchase_log(log):
    if not log:
        print("    (no purchases)")
        return
    for entry in log:
        print(f"    {entry['time_h']:5.2f}h  {entry['action']}")


def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# ============================================================
# Main
# ============================================================

def main():
    print("\n" + "="*60)
    print("  Idle Apocalypse — Strategy Evaluator")
    print("="*60)

    # ---- Greedy baseline ----
    print("\nRunning greedy baseline… ", end="", flush=True)
    greedy_dmg, greedy_log, greedy_sim = run_greedy()
    print(fmt(greedy_dmg))

    print_section("GREEDY BASELINE")
    print(f"  Final damage : {fmt(greedy_dmg)}")
    print(f"\n  Purchase log:")
    print_purchase_log(greedy_log)
    print(f"\n  Final state:\n{greedy_sim.summary()}")

    # ---- Simulated Annealing optimizer ----
    print_section("SIMULATED ANNEALING OPTIMIZER")
    sa_dmg, sa_log, sa_sim = run_sa(n_iter=30_000, n_restarts=5, seed=42)
    pct = (sa_dmg / greedy_dmg - 1) * 100 if greedy_dmg > 0 else 0
    print(f"\n  Final damage : {fmt(sa_dmg)}  ({pct:+.1f}% vs greedy)")
    print(f"\n  Purchase log:")
    print_purchase_log(sa_log)
    print(f"\n  Final state:\n{sa_sim.summary()}")

    # ---- Summary ----
    print_section("SUMMARY")
    print(f"  {'Strategy':<24} {'Damage':>12}  {'vs Greedy':>10}")
    print(f"  {'-'*48}")
    print(f"  {'Greedy':<24} {fmt(greedy_dmg):>12}  {'(baseline)':>10}")
    print(f"  {'Simulated Annealing':<24} {fmt(sa_dmg):>12}  {pct:>+9.1f}%")
    print()


if __name__ == "__main__":
    main()
