// Wave構成データ
const WAVE_DATA = [
    // Wave 1
    {
        wave: 1,
        enemyLevel: 1,
        enemies: [
            { type: "thief", count: 12, interval: 1.8 },
            { type: "warrior", count: 6, interval: 2.5 }
        ],
        unlocks: []
    },
    // Wave 2
    {
        wave: 2,
        enemyLevel: 1,
        enemies: [
            { type: "warrior", count: 10, interval: 2 },
            { type: "thief", count: 10, interval: 1.8 },
            { type: "assassin", count: 4, interval: 3 }
        ],
        unlocks: ["skeleton_guard", "zombie"]
    },
    // Wave 3
    {
        wave: 3,
        enemyLevel: 2,
        enemies: [
            { type: "ranger", count: 10, interval: 2 },
            { type: "warrior", count: 8, interval: 2.5 },
            { type: "shadow_walker", count: 5, interval: 2.5 }
        ],
        unlocks: ["ice_floor", "bone_archer"]
    },
    // Wave 4
    {
        wave: 4,
        enemyLevel: 2,
        enemies: [
            { type: "siege_soldier", count: 5, interval: 3.5 },
            { type: "warrior", count: 10, interval: 2 },
            { type: "berserker", count: 6, interval: 2.5 }
        ],
        unlocks: ["goblin_engineer", "demon_hound"]
    },
    // Wave 5 - 小ボス
    {
        wave: 5,
        enemyLevel: 3,
        enemies: [
            { type: "elementalist", count: 4, interval: 4 },
            { type: "warrior", count: 8, interval: 2 },
            { type: "ranger", count: 8, interval: 2 },
            { type: "knight", count: 3, interval: 4 }
        ],
        unlocks: ["cursed_altar", "push_plate", "mine"],
        boss: false
    },
    // Wave 6
    {
        wave: 6,
        enemyLevel: 3,
        enemies: [
            { type: "flying_scout", count: 12, interval: 1.5 },
            { type: "ranger", count: 10, interval: 2 },
            { type: "battle_mage", count: 5, interval: 3 }
        ],
        unlocks: ["gargoyle", "shadow_assassin"]
    },
    // Wave 7
    {
        wave: 7,
        enemyLevel: 4,
        enemies: [
            { type: "siege_soldier", count: 8, interval: 2.5 },
            { type: "cleric", count: 4, interval: 4 },
            { type: "warrior", count: 10, interval: 2 },
            { type: "war_priest", count: 3, interval: 4.5 }
        ],
        unlocks: ["fire_vent", "frost_mage"]
    },
    // Wave 8
    {
        wave: 8,
        enemyLevel: 4,
        enemies: [
            { type: "thief", count: 15, interval: 1.2 },
            { type: "ranger", count: 10, interval: 2 },
            { type: "assassin", count: 8, interval: 2 },
            { type: "shadow_walker", count: 6, interval: 2.5 }
        ],
        unlocks: ["confusion_sign", "necromancer"]
    },
    // Wave 9
    {
        wave: 9,
        enemyLevel: 5,
        enemies: [
            { type: "warrior", count: 12, interval: 1.8 },
            { type: "cleric", count: 4, interval: 4 },
            { type: "siege_soldier", count: 6, interval: 3 },
            { type: "berserker", count: 8, interval: 2 }
        ],
        unlocks: ["lightning_rod", "vampire_thorn", "gravity_well"]
    },
    // Wave 10 - 小ボス
    {
        wave: 10,
        enemyLevel: 5,
        enemies: [
            { type: "knight", count: 5, interval: 3 },
            { type: "siege_soldier", count: 8, interval: 2.5 },
            { type: "cleric", count: 4, interval: 4 },
            { type: "warrior", count: 10, interval: 2 },
            { type: "necromancer", count: 3, interval: 5 }
        ],
        unlocks: ["mirror_trap", "poison_cloud", "time_warp"],
        boss: false
    },
    // Wave 11
    {
        wave: 11,
        enemyLevel: 6,
        enemies: [
            { type: "flying_scout", count: 14, interval: 1.5 },
            { type: "ranger", count: 12, interval: 2 },
            { type: "elementalist", count: 5, interval: 4 },
            { type: "battle_mage", count: 6, interval: 3 }
        ],
        unlocks: ["wisp", "golem"]
    },
    // Wave 12
    {
        wave: 12,
        enemyLevel: 6,
        enemies: [
            { type: "warrior", count: 15, interval: 1.8 },
            { type: "ranger", count: 12, interval: 2 },
            { type: "elementalist", count: 5, interval: 4 },
            { type: "paladin", count: 4, interval: 4 }
        ],
        unlocks: ["vampire", "holy_barrier", "soul_harvester"]
    },
    // Wave 13
    {
        wave: 13,
        enemyLevel: 7,
        enemies: [
            { type: "thief", count: 18, interval: 1.2 },
            { type: "siege_soldier", count: 8, interval: 2.5 },
            { type: "ranger", count: 12, interval: 2 },
            { type: "dragon_knight", count: 4, interval: 4 }
        ],
        unlocks: ["cleric_skeleton", "acid_pool", "turret"]
    },
    // Wave 14
    {
        wave: 14,
        enemyLevel: 8,
        enemies: [
            { type: "warrior", count: 15, interval: 1.8 },
            { type: "ranger", count: 12, interval: 2 },
            { type: "elementalist", count: 6, interval: 3.5 },
            { type: "cleric", count: 5, interval: 4 },
            { type: "archmage", count: 3, interval: 5 }
        ],
        unlocks: ["harpy", "sky_knight", "electric_net"]
    },
    // Wave 15 - ボス
    {
        wave: 15,
        enemyLevel: 10,
        enemies: [
            { type: "light_hero", count: 2, interval: 0 },
            { type: "knight", count: 6, interval: 2.5 },
            { type: "warrior", count: 12, interval: 2 },
            { type: "cleric", count: 5, interval: 4 },
            { type: "elementalist", count: 5, interval: 4 },
            { type: "paladin", count: 4, interval: 4 }
        ],
        unlocks: [],
        boss: true
    },
    // Wave 16 - 複数スポーン地点開始
    {
        wave: 16,
        enemyLevel: 11,
        enemies: [
            { type: "thief", count: 20, interval: 1.2 },
            { type: "warrior", count: 15, interval: 1.8 },
            { type: "ranger", count: 12, interval: 2 },
            { type: "assassin", count: 10, interval: 2 },
            { type: "shadow_walker", count: 8, interval: 2.5 }
        ],
        unlocks: []
    },
    // Wave 17
    {
        wave: 17,
        enemyLevel: 12,
        enemies: [
            { type: "warrior", count: 18, interval: 1.6 },
            { type: "siege_soldier", count: 10, interval: 2.5 },
            { type: "cleric", count: 6, interval: 4 },
            { type: "titan", count: 3, interval: 5 },
            { type: "knight", count: 8, interval: 2.5 }
        ],
        unlocks: []
    },
    // Wave 18
    {
        wave: 18,
        enemyLevel: 13,
        enemies: [
            { type: "flying_scout", count: 18, interval: 1.2 },
            { type: "elementalist", count: 8, interval: 3 },
            { type: "ranger", count: 15, interval: 1.8 },
            { type: "dragon_knight", count: 6, interval: 3.5 },
            { type: "battle_mage", count: 8, interval: 2.5 }
        ],
        unlocks: []
    },
    // Wave 19
    {
        wave: 19,
        enemyLevel: 14,
        enemies: [
            { type: "thief", count: 25, interval: 1 },
            { type: "warrior", count: 18, interval: 1.6 },
            { type: "siege_soldier", count: 8, interval: 2.5 },
            { type: "berserker", count: 12, interval: 2 },
            { type: "necromancer", count: 5, interval: 4 }
        ],
        unlocks: []
    },
    // Wave 20
    {
        wave: 20,
        enemyLevel: 15,
        enemies: [
            { type: "demon_lord", count: 1, interval: 0 },
            { type: "warrior", count: 20, interval: 1.6 },
            { type: "cleric", count: 6, interval: 3.5 },
            { type: "elementalist", count: 6, interval: 3.5 },
            { type: "siege_soldier", count: 10, interval: 2.5 },
            { type: "paladin", count: 6, interval: 3.5 },
            { type: "archmage", count: 5, interval: 4 }
        ],
        unlocks: [],
        boss: true
    },
    // Wave 21
    {
        wave: 21,
        enemyLevel: 16,
        enemies: [
            { type: "flying_scout", count: 20, interval: 1.2 },
            { type: "ranger", count: 18, interval: 1.6 },
            { type: "elementalist", count: 8, interval: 3 },
            { type: "dragon_knight", count: 8, interval: 3 },
            { type: "battle_mage", count: 10, interval: 2.5 }
        ],
        unlocks: []
    },
    // Wave 22
    {
        wave: 22,
        enemyLevel: 17,
        enemies: [
            { type: "thief", count: 30, interval: 1 },
            { type: "warrior", count: 20, interval: 1.5 },
            { type: "cleric", count: 8, interval: 3.5 },
            { type: "assassin", count: 15, interval: 1.5 },
            { type: "shadow_walker", count: 12, interval: 2 }
        ],
        unlocks: []
    },
    // Wave 23
    {
        wave: 23,
        enemyLevel: 18,
        enemies: [
            { type: "siege_soldier", count: 15, interval: 2 },
            { type: "warrior", count: 20, interval: 1.5 },
            { type: "ranger", count: 15, interval: 1.8 },
            { type: "titan", count: 5, interval: 4 },
            { type: "knight", count: 12, interval: 2 }
        ],
        unlocks: []
    },
    // Wave 24
    {
        wave: 24,
        enemyLevel: 19,
        enemies: [
            { type: "elementalist", count: 10, interval: 3 },
            { type: "cleric", count: 8, interval: 3.5 },
            { type: "warrior", count: 22, interval: 1.5 },
            { type: "necromancer", count: 8, interval: 3.5 },
            { type: "war_priest", count: 6, interval: 4 }
        ],
        unlocks: []
    },
    // Wave 25
    {
        wave: 25,
        enemyLevel: 20,
        enemies: [
            { type: "light_hero", count: 2, interval: 0 },
            { type: "demon_lord", count: 1, interval: 5 },
            { type: "warrior", count: 25, interval: 1.5 },
            { type: "cleric", count: 8, interval: 3.5 },
            { type: "elementalist", count: 8, interval: 3.5 },
            { type: "paladin", count: 8, interval: 3 },
            { type: "archmage", count: 6, interval: 4 },
            { type: "knight", count: 10, interval: 2.5 }
        ],
        unlocks: [],
        boss: true
    },
    // Wave 26
    {
        wave: 26,
        enemyLevel: 21,
        enemies: [
            { type: "thief", count: 35, interval: 1 },
            { type: "flying_scout", count: 22, interval: 1.2 },
            { type: "ranger", count: 20, interval: 1.5 },
            { type: "assassin", count: 18, interval: 1.5 },
            { type: "shadow_walker", count: 15, interval: 1.8 },
            { type: "berserker", count: 15, interval: 1.8 }
        ],
        unlocks: []
    },
    // Wave 27
    {
        wave: 27,
        enemyLevel: 22,
        enemies: [
            { type: "warrior", count: 25, interval: 1.4 },
            { type: "siege_soldier", count: 15, interval: 2 },
            { type: "cleric", count: 10, interval: 3 },
            { type: "titan", count: 8, interval: 3.5 },
            { type: "knight", count: 15, interval: 2 },
            { type: "paladin", count: 8, interval: 3 }
        ],
        unlocks: []
    },
    // Wave 28
    {
        wave: 28,
        enemyLevel: 23,
        enemies: [
            { type: "elementalist", count: 12, interval: 2.5 },
            { type: "flying_scout", count: 25, interval: 1.2 },
            { type: "warrior", count: 22, interval: 1.5 },
            { type: "dragon_knight", count: 10, interval: 2.5 },
            { type: "battle_mage", count: 12, interval: 2.5 },
            { type: "archmage", count: 8, interval: 3.5 }
        ],
        unlocks: []
    },
    // Wave 29
    {
        wave: 29,
        enemyLevel: 24,
        enemies: [
            { type: "siege_soldier", count: 18, interval: 2 },
            { type: "cleric", count: 10, interval: 3 },
            { type: "ranger", count: 20, interval: 1.5 },
            { type: "necromancer", count: 10, interval: 3 },
            { type: "war_priest", count: 8, interval: 3.5 },
            { type: "titan", count: 8, interval: 3.5 }
        ],
        unlocks: []
    },
    // Wave 30 - 3スポーン地点開始
    {
        wave: 30,
        enemyLevel: 25,
        enemies: [
            { type: "demon_lord", count: 2, interval: 0 },
            { type: "light_hero", count: 3, interval: 5 },
            { type: "warrior", count: 30, interval: 1.4 },
            { type: "cleric", count: 12, interval: 3 },
            { type: "elementalist", count: 12, interval: 3 },
            { type: "siege_soldier", count: 15, interval: 2 },
            { type: "paladin", count: 10, interval: 2.5 },
            { type: "archmage", count: 8, interval: 3 },
            { type: "knight", count: 15, interval: 2 },
            { type: "titan", count: 8, interval: 3 },
            { type: "dragon_knight", count: 10, interval: 2.5 }
        ],
        unlocks: [],
        boss: true
    }
];
