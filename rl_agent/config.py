# ============================================
# Python mirror of events/otherTower.js
# Keep this in sync with the JS config file.
# ============================================

TIME_FACTOR = 5
HOURS = 60 * 60 * 1000          # milliseconds per hour
EVENT_DURATION_HOURS = 72 / TIME_FACTOR   # 14.4 hours

EVENT_CONFIG = {
    'id': 'other-tower',
    'name': 'Other Tower',
    'duration': EVENT_DURATION_HOURS * HOURS,   # 51,840,000 ms

    'resources': [
        {'id': 'sapphires'},
        {'id': 'emeralds'},
        {'id': 'rubies'},
    ],

    'creatures': [
        {
            'id': 'fiona', 'name': 'Feral Fiona',
            'unlockedByDefault': True,
            'produces': 'sapphires',
            'spawnTime': 5000 / TIME_FACTOR,    # 1000 ms
            'maxLevel': 10,
            'productionByLevel': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            'damageByLevel':     [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
            'unlockCost': None,
            'upgradeCosts': [
                {'sapphires': 5},
                {'sapphires': 50},
                {'emeralds': 25},
                {'emeralds': 100, 'sapphires': 250},
                {'emeralds': 2500},
                {'sapphires': 5000},
                {'rubies': 100},
                {'rubies': 500, 'emeralds': 10000},
                {'rubies': 2500},
            ],
        },
        {
            'id': 'jingles', 'name': 'Jingles',
            'unlockedByDefault': False,
            'produces': 'emeralds',
            'spawnTime': 10000 / TIME_FACTOR,   # 2000 ms
            'maxLevel': 10,
            'productionByLevel': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            'damageByLevel':     [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000],
            'unlockCost': {'sapphires': 250},
            'upgradeCosts': [
                {'emeralds': 50, 'sapphires': 250},
                {'emeralds': 250},
                {'emeralds': 500, 'sapphires': 1000},
                {'emeralds': 2500},
                {'emeralds': 3000, 'sapphires': 10000},
                {'rubies': 250},
                {'rubies': 750, 'emeralds': 5000},
                {'rubies': 3000},
                {'emeralds': 10000, 'sapphires': 25000},
            ],
        },
        {
            'id': 'ox', 'name': 'Ox',
            'unlockedByDefault': False,
            'produces': 'sapphires',
            'spawnTime': 15000 / TIME_FACTOR,   # 3000 ms
            'maxLevel': 10,
            'productionByLevel': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            'damageByLevel':     [375, 750, 1875, 3750, 7500, 18750, 37500, 75000, 187500, 375000],
            'unlockCost': {'emeralds': 1000},
            'upgradeCosts': [
                {'sapphires': 2500},
                {'emeralds': 3000},
                {'emeralds': 2500, 'sapphires': 2500},
                {'rubies': 1000},
                {'emeralds': 5000, 'sapphires': 5000},
                {'rubies': 2500, 'sapphires': 5000},
                {'rubies': 4000},
                {'rubies': 3000, 'emeralds': 6000},
                {'sapphires': 50000},
            ],
        },
        {
            'id': 'batilda', 'name': 'Batilda',
            'unlockedByDefault': False,
            'produces': 'rubies',
            'spawnTime': 20000 / TIME_FACTOR,   # 4000 ms
            'maxLevel': 10,
            'productionByLevel': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            'damageByLevel':     [1250, 2500, 6250, 12500, 25000, 62500, 125000, 250000, 500000, 1250000],
            'unlockCost': {'emeralds': 5000, 'sapphires': 10000},
            'upgradeCosts': [
                {'rubies': 2500, 'emeralds': 2500},
                {'rubies': 5000},
                {'rubies': 7500, 'emeralds': 7500},
                {'rubies': 10000},
                {'rubies': 15000, 'sapphires': 10000},
                {'rubies': 20000, 'emeralds': 5000},
                {'rubies': 25000},
                {'rubies': 30000, 'emeralds': 10000},
                {'rubies': 50000, 'sapphires': 25000},
            ],
        },
        {
            'id': 'murky-mandy', 'name': 'Murky Mandy',
            'unlockedByDefault': False,
            'produces': 'emeralds',
            'spawnTime': 25000 / TIME_FACTOR,   # 5000 ms
            'maxLevel': 10,
            'productionByLevel': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            'damageByLevel':     [10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000],
            'unlockCost': {'rubies': 2500},
            'upgradeCosts': [
                {'sapphires': 25000},
                {'rubies': 2500, 'emeralds': 15000},
                {'emeralds': 15000, 'sapphires': 30000},
                {'rubies': 7500},
                {'sapphires': 75000},
                {'emeralds': 25000, 'sapphires': 50000},
                {'emeralds': 50000},
                {'rubies': 30000, 'sapphires': 90000},
                {'rubies': 40000},
            ],
        },
        {
            'id': 'patches', 'name': 'Patches',
            'unlockedByDefault': False,
            'produces': 'rubies',
            'spawnTime': 30000 / TIME_FACTOR,   # 6000 ms
            'maxLevel': 10,
            'productionByLevel': [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            'damageByLevel':     [25000, 50000, 125000, 250000, 500000, 1250000, 2500000, 5000000, 12500000, 25000000],
            'unlockCost': {'rubies': 5000},
            'upgradeCosts': [
                {'emeralds': 10000},
                {'sapphires': 50000},
                {'rubies': 7500, 'emeralds': 15000},
                {'sapphires': 100000},
                {'emeralds': 30000},
                {'rubies': 30000},
                {'rubies': 25000, 'sapphires': 75000},
                {'emeralds': 60000},
                {'rubies': 50000, 'sapphires': 150000},
            ],
        },
    ],

    'boosts': [
        {
            'id': 'sapphire-boost', 'name': 'Sapphire Boost',
            'type': 'production-bonus', 'resource': 'sapphires',
            'maxLevel': 5,
            'bonusByLevel': [1, 2, 3, 4, 5],
            'costs': [
                {'emeralds': 100},
                {'sapphires': 1000},
                {'emeralds': 2500},
                {'rubies': 1000},
                {'emeralds': 10000},
            ],
        },
        {
            'id': 'emerald-boost', 'name': 'Emerald Boost',
            'type': 'production-bonus', 'resource': 'emeralds',
            'maxLevel': 5,
            'bonusByLevel': [1, 2, 3, 4, 5],
            'costs': [
                {'sapphires': 500},
                {'emeralds': 1000},
                {'rubies': 500},
                {'sapphires': 15000},
                {'rubies': 5000},
            ],
        },
        {
            'id': 'ruby-boost', 'name': 'Ruby Boost',
            'type': 'production-bonus', 'resource': 'rubies',
            'maxLevel': 3,
            'bonusByLevel': [1, 2, 3],
            'costs': [
                {'rubies': 500},
                {'emeralds': 25000},
                {'sapphires': 75000},
            ],
        },
        {
            'id': 'champion-speed', 'name': 'Champion Speed',
            'type': 'speed',
            'maxLevel': 5,
            'bonusByLevel': [0.05, 0.10, 0.15, 0.20, 0.25],
            'costs': [
                {'sapphires': 10000},
                {'emeralds': 25000},
                {'rubies': 15000},
                {'sapphires': 100000},
                {'emeralds': 100000},
            ],
        },
        {
            'id': 'champion-damage', 'name': 'Champion Damage',
            'type': 'damage',
            'maxLevel': 4,
            'bonusByLevel': [0.25, 0.50, 0.75, 1.00],
            'costs': [
                {'sapphires': 25000},
                {'emeralds': 50000},
                {'rubies': 25000},
                {'sapphires': 200000},
            ],
        },
    ],
}
