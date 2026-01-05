// ============================================
// OTHER TOWER EVENT - Configuration
// ============================================
// Data sourced from: https://idleapocalypse.fandom.com/wiki/Other_Tower

// --------------------------------------------
// TIME CONSTANTS (change these to adjust event timing)
// --------------------------------------------
const HOURS = 60 * 60 * 1000; // 1 hour in milliseconds
const EVENT_DURATION_HOURS = 72; // 3 days

const EVENT_CONFIG = {
    // --------------------------------------------
    // EVENT METADATA
    // --------------------------------------------
    id: 'other-tower',
    name: 'Other Tower',
    description: 'Defeat Enid by gathering gems and powering up your champions!',
    icon: 'icons/tower.png', // Optional: add a tower icon
    duration: EVENT_DURATION_HOURS * HOURS,

    // --------------------------------------------
    // RESOURCES
    // --------------------------------------------
    resources: [
        {
            id: 'sapphires',
            name: 'Sapphires',
            icon: 'icons/sapphire.png',
            color: '#5dade2',
            description: 'Basic gems for hiring champions'
        },
        {
            id: 'emeralds',
            name: 'Emeralds',
            icon: 'icons/emerald.png',
            color: '#58d68d',
            description: 'Precious gems for advanced champions'
        },
        {
            id: 'rubies',
            name: 'Rubies',
            icon: 'icons/ruby.png',
            color: '#ec7063',
            description: 'Rare gems for ultimate power'
        }
    ],

    // --------------------------------------------
    // REWARD TIERS
    // --------------------------------------------
    rewardTiers: [
        { rank: 1, damage: 300e9, label: '1st', rewards: '300 Gems + Enid Skin' },
        { rank: 2, damage: 150e9, label: '2nd', rewards: '200 Gems + Crown' },
        { rank: 3, damage: 50e9, label: '3rd', rewards: '150 Gems' },
        { rank: 4, damage: 5e9, label: '4th', rewards: '100 Gems' },
        { rank: 5, damage: 500e6, label: '5th', rewards: '75 Gems' },
        { rank: 6, damage: 50e6, label: '6th', rewards: '50 Gems' },
        { rank: 7, damage: 5e6, label: '7th', rewards: '30 Gems' },
        { rank: 8, damage: 500e3, label: '8th', rewards: '20 Gems' },
        { rank: 9, damage: 0, label: '9th', rewards: '10 Gems' }
    ],

    // --------------------------------------------
    // CREATURES
    // --------------------------------------------
    creatures: [
        {
            id: 'fiona',
            name: 'Feral Fiona',
            icon: 'icons/Feral_Fiona.png',
            description: 'A ferocious feline fighter',

            unlockedByDefault: true,
            produces: 'sapphires',
            spawnTime: 5000, // 5 seconds

            maxLevel: 10,
            productionByLevel: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            damageByLevel: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],

            unlockCost: null, // Free

            // Upgrade costs (level 1→2, 2→3, etc.)
            upgradeCosts: [
                { sapphires: 5 },                              // Level 2
                { sapphires: 50 },                             // Level 3
                { emeralds: 25 },                              // Level 4
                { emeralds: 100, sapphires: 250 },             // Level 5
                { emeralds: 2500 },                            // Level 6
                { sapphires: 5000 },                           // Level 7
                { rubies: 100 },                               // Level 8
                { rubies: 500, emeralds: 10000 },              // Level 9
                { rubies: 2500 }                               // Level 10
            ]
        },
        {
            id: 'jingles',
            name: 'Jingles',
            icon: 'icons/Jingles.png',
            description: 'A jingling jester of chaos',

            unlockedByDefault: false,
            produces: 'emeralds',
            spawnTime: 10000, // 10 seconds

            maxLevel: 10,
            productionByLevel: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            damageByLevel: [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000],

            unlockCost: { sapphires: 250 },

            // Upgrade costs (level 1→2, 2→3, etc.)
            upgradeCosts: [
                { emeralds: 50, sapphires: 250 },              // Level 2
                { emeralds: 250 },                             // Level 3
                { emeralds: 500, sapphires: 1000 },            // Level 4
                { emeralds: 2500 },                            // Level 5
                { emeralds: 3000, sapphires: 10000 },          // Level 6
                { rubies: 250 },                               // Level 7
                { rubies: 750, emeralds: 5000 },               // Level 8
                { rubies: 3000 },                              // Level 9
                { emeralds: 10000, sapphires: 25000 }          // Level 10
            ]
        },
        {
            id: 'ox',
            name: 'Ox',
            icon: 'icons/Ox.png',
            description: 'A powerful beast of burden',

            unlockedByDefault: false,
            produces: 'sapphires',
            spawnTime: 15000, // 15 seconds

            maxLevel: 10,
            productionByLevel: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            damageByLevel: [375, 750, 1875, 3750, 7500, 18750, 37500, 75000, 187500, 375000],

            unlockCost: { emeralds: 1000 },

            // Upgrade costs (level 1→2, 2→3, etc.)
            upgradeCosts: [
                { sapphires: 2500 },                           // Level 2
                { emeralds: 3000 },                            // Level 3
                { emeralds: 2500, sapphires: 2500 },           // Level 4
                { rubies: 1000 },                              // Level 5
                { emeralds: 5000, sapphires: 5000 },           // Level 6
                { rubies: 2500, sapphires: 5000 },             // Level 7
                { rubies: 4000 },                              // Level 8
                { rubies: 3000, emeralds: 6000 },              // Level 9
                { sapphires: 50000 }                           // Level 10
            ]
        },
        {
            id: 'batilda',
            name: 'Batilda',
            icon: 'icons/Batilda.png',
            description: 'A vampiric bat queen',

            unlockedByDefault: false,
            produces: 'rubies',
            spawnTime: 20000, // 20 seconds

            maxLevel: 10,
            productionByLevel: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            damageByLevel: [1250, 2500, 6250, 12500, 25000, 62500, 125000, 250000, 500000, 1250000],

            unlockCost: { emeralds: 5000, sapphires: 10000 },

            // Upgrade costs (level 1→2, 2→3, etc.)
            upgradeCosts: [
                { rubies: 2500, emeralds: 2500 },              // Level 2
                { rubies: 5000 },                              // Level 3
                { rubies: 7500, emeralds: 7500 },              // Level 4
                { rubies: 10000 },                             // Level 5
                { rubies: 15000, sapphires: 10000 },           // Level 6
                { rubies: 20000, emeralds: 5000 },             // Level 7
                { rubies: 25000 },                             // Level 8
                { rubies: 30000, emeralds: 10000 },            // Level 9
                { rubies: 50000, sapphires: 25000 }            // Level 10
            ]
        }
    ],

    // --------------------------------------------
    // GAME SETTINGS
    // --------------------------------------------
    settings: {
        maxOfflineTime: EVENT_DURATION_HOURS * HOURS, // Match event duration (no offline cap)
        saveInterval: 30000,
        tickRate: 60
    }
};
