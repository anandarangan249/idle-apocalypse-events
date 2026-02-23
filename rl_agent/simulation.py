# ============================================
# GameSim — mirrors game.js logic in Python
# ============================================
# Deterministic simulation of one full event run.
# No rendering; purely arithmetic for speed.

from config import EVENT_CONFIG


class GameSim:
    """Fast simulation of the Idle Apocalypse idle game engine."""

    def __init__(self, config=None):
        self.config = config or EVENT_CONFIG
        self.duration_ms = self.config['duration']

        # Index creatures and boosts by id for O(1) lookup
        self._creatures = {c['id']: c for c in self.config['creatures']}
        self._boosts = {b['id']: b for b in self.config.get('boosts', [])}
        self._creature_order = [c['id'] for c in self.config['creatures']]
        self._boost_order = [b['id'] for b in self.config.get('boosts', [])]

        self.reset()

    def reset(self):
        self.resources = {r['id']: 0.0 for r in self.config['resources']}
        self.creature_levels = {}
        self.creature_unlocked = {}
        self.creature_progress = {}     # ms accumulated since last spawn
        for c in self.config['creatures']:
            cid = c['id']
            self.creature_unlocked[cid] = bool(c.get('unlockedByDefault', False))
            self.creature_levels[cid] = 1 if c.get('unlockedByDefault') else 0
            self.creature_progress[cid] = 0.0

        self.boost_levels = {bid: 0 for bid in self._boost_order}
        self.total_damage = 0.0
        self.time_elapsed_ms = 0.0

    # ----------------------------------------------------------
    # Boost multipliers  (mirrors game.js helpers)
    # ----------------------------------------------------------

    def get_speed_multiplier(self):
        for bid in self._boost_order:
            b = self._boosts[bid]
            if b['type'] == 'speed':
                lv = self.boost_levels[bid]
                if lv > 0:
                    return 1.0 - b['bonusByLevel'][lv - 1]
        return 1.0

    def get_damage_multiplier(self):
        for bid in self._boost_order:
            b = self._boosts[bid]
            if b['type'] == 'damage':
                lv = self.boost_levels[bid]
                if lv > 0:
                    return 1.0 + b['bonusByLevel'][lv - 1]
        return 1.0

    def get_production_bonus(self, resource_id):
        for bid in self._boost_order:
            b = self._boosts[bid]
            if b['type'] == 'production-bonus' and b.get('resource') == resource_id:
                lv = self.boost_levels[bid]
                if lv > 0:
                    return float(b['bonusByLevel'][lv - 1])
        return 0.0

    # ----------------------------------------------------------
    # Creature stats
    # ----------------------------------------------------------

    def get_effective_spawn_time(self, creature):
        """Spawn time in ms after speed boost."""
        return creature['spawnTime'] * self.get_speed_multiplier()

    def get_creature_production(self, cid):
        c = self._creatures[cid]
        lv = self.creature_levels[cid]
        if not self.creature_unlocked[cid] or lv == 0:
            return 0.0
        return float(c['productionByLevel'][lv - 1]) + self.get_production_bonus(c['produces'])

    def get_creature_damage(self, cid):
        c = self._creatures[cid]
        lv = self.creature_levels[cid]
        if not self.creature_unlocked[cid] or lv == 0:
            return 0.0
        return float(c['damageByLevel'][lv - 1]) * self.get_damage_multiplier()

    def get_dps(self):
        """Total damage per second across all active creatures."""
        total = 0.0
        for cid in self._creature_order:
            if not self.creature_unlocked[cid] or self.creature_levels[cid] == 0:
                continue
            c = self._creatures[cid]
            spawn_s = self.get_effective_spawn_time(c) / 1000.0
            total += self.get_creature_damage(cid) / spawn_s
        return total

    # ----------------------------------------------------------
    # Simulation tick
    # ----------------------------------------------------------

    def advance(self, delta_ms):
        """
        Advance the simulation by delta_ms milliseconds.
        Accumulates resources and damage from all active creatures.
        """
        speed = self.get_speed_multiplier()
        dmg_mult = self.get_damage_multiplier()

        for cid in self._creature_order:
            if not self.creature_unlocked[cid] or self.creature_levels[cid] == 0:
                continue
            c = self._creatures[cid]
            lv = self.creature_levels[cid]

            spawn_time = c['spawnTime'] * speed
            self.creature_progress[cid] += delta_ms
            ticks = int(self.creature_progress[cid] / spawn_time)
            if ticks == 0:
                continue

            self.creature_progress[cid] -= ticks * spawn_time
            prod = float(c['productionByLevel'][lv - 1]) + self.get_production_bonus(c['produces'])
            dmg  = float(c['damageByLevel'][lv - 1]) * dmg_mult

            self.resources[c['produces']] += prod * ticks
            self.total_damage += dmg * ticks

        self.time_elapsed_ms += delta_ms

    # ----------------------------------------------------------
    # Affordability
    # ----------------------------------------------------------

    def can_afford(self, cost):
        if cost is None:
            return False
        return all(self.resources.get(r, 0.0) >= amt for r, amt in cost.items())

    def _spend(self, cost):
        for r, amt in cost.items():
            self.resources[r] -= amt

    # ----------------------------------------------------------
    # Creature upgrades
    # ----------------------------------------------------------

    def get_creature_upgrade_cost(self, cid):
        c = self._creatures[cid]
        if not self.creature_unlocked[cid]:
            return c.get('unlockCost')         # None if free (Fiona)
        lv = self.creature_levels[cid]
        if lv >= c['maxLevel']:
            return None
        return c['upgradeCosts'][lv - 1]

    def upgrade_creature(self, cid):
        cost = self.get_creature_upgrade_cost(cid)
        if cost is None or not self.can_afford(cost):
            return False
        self._spend(cost)
        if not self.creature_unlocked[cid]:
            self.creature_unlocked[cid] = True
            self.creature_levels[cid] = 1
        else:
            self.creature_levels[cid] += 1
        return True

    # ----------------------------------------------------------
    # Boost upgrades
    # ----------------------------------------------------------

    def get_boost_upgrade_cost(self, bid):
        b = self._boosts[bid]
        lv = self.boost_levels[bid]
        if lv >= b['maxLevel']:
            return None
        return b['costs'][lv]

    def upgrade_boost(self, bid):
        cost = self.get_boost_upgrade_cost(bid)
        if cost is None or not self.can_afford(cost):
            return False
        self._spend(cost)
        self.boost_levels[bid] += 1
        return True

    # ----------------------------------------------------------
    # Termination
    # ----------------------------------------------------------

    def is_done(self):
        return self.time_elapsed_ms >= self.duration_ms

    # ----------------------------------------------------------
    # Summary helpers
    # ----------------------------------------------------------

    def summary(self):
        lines = [f"  Total damage : {self.total_damage:,.0f}"]
        lines.append("  Creatures:")
        for cid in self._creature_order:
            lv  = self.creature_levels[cid]
            unk = "unlocked" if self.creature_unlocked[cid] else "locked"
            lines.append(f"    {self._creatures[cid]['name']:15s} Lv{lv:2d}  ({unk})")
        lines.append("  Boosts:")
        for bid in self._boost_order:
            lv = self.boost_levels[bid]
            mx = self._boosts[bid]['maxLevel']
            lines.append(f"    {self._boosts[bid]['name']:20s} Lv{lv}/{mx}")
        return "\n".join(lines)
