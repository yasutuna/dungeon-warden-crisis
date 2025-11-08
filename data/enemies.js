// 敵データ定義
const ENEMY_DATA = {
    thief: {
        id: "thief",
        name: "盗賊",
        hp: 120,
        maxHp: 120,
        speed: 2.0,
        baseSpeed: 2.0,
        abilities: ["trap_detect", "trap_evade", "disarm"],
        attack: {
            type: "melee",
            damage: 12,
            range: 1,
            interval: 1.0,
            targets: ["monster"]
        },
        resist: {
            stun: 0.0,
            fear: 0.2
        },
        detectRadius: 2,
        soulReward: 5,
        manaReward: 1,
        aiType: "cautious", // 慎重な動き
        dodgeChance: 0.3, // 回避確率
        levelScaling: {
            hpMultiplier: 1.15,
            damageMultiplier: 1.1,
            rewardMultiplier: 1.2
        },
        description: "罠を検知・回避・解除"
    },
    warrior: {
        id: "warrior",
        name: "戦士",
        hp: 280,
        maxHp: 280,
        speed: 0.9,
        baseSpeed: 0.9,
        abilities: [],
        attack: {
            type: "melee",
            damage: 15,
            range: 1,
            interval: 1.2,
            targets: ["monster"]
        },
        resist: {
            physical: 0.1,
            knockback: 0.3
        },
        soulReward: 8,
        manaReward: 1,
        aiType: "aggressive", // 積極的な直進
        chargeSpeed: 1.3, // HP50%以下で加速
        levelScaling: {
            hpMultiplier: 1.18,
            damageMultiplier: 1.12,
            rewardMultiplier: 1.2
        },
        description: "高HP前衛"
    },
    ranger: {
        id: "ranger",
        name: "レンジャー",
        hp: 160,
        maxHp: 160,
        speed: 1.0,
        baseSpeed: 1.0,
        abilities: ["ranged_attack"],
        attack: {
            type: "ranged",
            damage: 8,
            range: 4,
            interval: 1.5,
            targets: ["trap", "monster"]
        },
        resist: {},
        soulReward: 7,
        manaReward: 2,
        aiType: "sniper", // 距離を取る
        keepDistance: 3, // 敵から3タイル離れる
        levelScaling: {
            hpMultiplier: 1.12,
            damageMultiplier: 1.15,
            rewardMultiplier: 1.2
        },
        description: "罠とモンスターを遠隔攻撃"
    },
    cleric: {
        id: "cleric",
        name: "聖職者",
        hp: 170,
        maxHp: 170,
        speed: 1.0,
        baseSpeed: 1.0,
        abilities: ["heal", "cleanse"],
        heal: {
            amount: 15,
            interval: 3,
            range: 3
        },
        resist: {
            curse: 0.5
        },
        soulReward: 12,
        manaReward: 3,
        aiType: "support", // サポート優先
        supportPriority: true, // 味方に近づく
        levelScaling: {
            hpMultiplier: 1.14,
            damageMultiplier: 1.08,
            rewardMultiplier: 1.25
        },
        description: "回復とデバフ解除"
    },
    elementalist: {
        id: "elementalist",
        name: "精霊使い",
        hp: 200,
        maxHp: 200,
        speed: 1.0,
        abilities: ["barrier"],
        barrier: {
            amount: 50,
            interval: 8,
            range: 2,
            targets: 3
        },
        resist: {
            magic: 0.3
        },
        soulReward: 15,
        manaReward: 3,
        levelScaling: {
            hpMultiplier: 1.16,
            damageMultiplier: 1.1,
            rewardMultiplier: 1.25
        },
        description: "味方にバリア付与"
    },
    siege_soldier: {
        id: "siege_soldier",
        name: "破城兵",
        hp: 320,
        maxHp: 320,
        speed: 0.8,
        abilities: ["trap_destroy"],
        attack: {
            type: "melee",
            damage: 25,
            range: 1,
            interval: 2.0,
            trapDamageMultiplier: 3
        },
        resist: {
            physical: 0.2
        },
        detectRadius: 1.5,
        soulReward: 18,
        manaReward: 2,
        levelScaling: {
            hpMultiplier: 1.2,
            damageMultiplier: 1.15,
            rewardMultiplier: 1.3
        },
        description: "罠に大ダメージ"
    },
    flying_scout: {
        id: "flying_scout",
        name: "飛行斥候",
        hp: 140,
        maxHp: 140,
        speed: 1.2,
        abilities: ["flying"],
        resist: {
            ground_trap: 1.0 // 地上罠無効
        },
        flying: true,
        soulReward: 10,
        manaReward: 2,
        levelScaling: {
            hpMultiplier: 1.13,
            damageMultiplier: 1.1,
            rewardMultiplier: 1.2
        },
        description: "地上罠を無視"
    },
    light_hero: {
        id: "light_hero",
        name: "光の勇者",
        hp: 1200,
        maxHp: 1200,
        speed: 1.0,
        abilities: ["barrier", "self_heal", "holy_zone"],
        barrier: {
            amount: 100,
            interval: 10,
            range: 3,
            targets: 5
        },
        selfHeal: {
            amount: 50,
            interval: 5
        },
        holyZone: {
            healPerSec: 10,
            damageReduction: 0.2,
            radius: 3,
            duration: 8,
            cooldown: 20
        },
        resist: {
            fire: 0.4,
            curse: 0.5,
            stun: 0.7,
            knockback: 1.0
        },
        soulReward: 120,
        manaReward: 20,
        boss: true,
        levelScaling: {
            hpMultiplier: 1.25,
            damageMultiplier: 1.2,
            rewardMultiplier: 1.5
        },
        description: "ボス：バリア/自己回復/聖域"
    },
    assassin: {
        id: "assassin",
        name: "暗殺者",
        hp: 100,
        maxHp: 100,
        speed: 1.4,
        baseSpeed: 1.4,
        abilities: ["disarm", "trap_detect"],
        attack: {
            type: "melee",
            damage: 20,
            range: 1,
            interval: 0.8,
            targets: ["monster"]
        },
        resist: {
            stun: 0.4,
            fear: 0.3
        },
        detectRadius: 2.5,
        soulReward: 9,
        manaReward: 2,
        aiType: "cautious",
        dodgeChance: 0.4,
        levelScaling: {
            hpMultiplier: 1.12,
            damageMultiplier: 1.18,
            rewardMultiplier: 1.25
        },
        description: "高速・高回避・高火力"
    },
    knight: {
        id: "knight",
        name: "騎士",
        hp: 400,
        maxHp: 400,
        speed: 0.85,
        baseSpeed: 0.85,
        abilities: [],
        attack: {
            type: "melee",
            damage: 18,
            range: 1.2,
            interval: 1.5,
            targets: ["monster"]
        },
        resist: {
            physical: 0.25,
            magic: 0.15,
            knockback: 0.5
        },
        soulReward: 14,
        manaReward: 2,
        aiType: "aggressive",
        chargeSpeed: 1.4,
        levelScaling: {
            hpMultiplier: 1.22,
            damageMultiplier: 1.15,
            rewardMultiplier: 1.3
        },
        description: "超高防御前衛"
    },
    berserker: {
        id: "berserker",
        name: "狂戦士",
        hp: 220,
        maxHp: 220,
        speed: 1.1,
        baseSpeed: 1.1,
        abilities: [],
        attack: {
            type: "melee",
            damage: 22,
            range: 1,
            interval: 0.9,
            targets: ["monster", "trap"]
        },
        resist: {
            fear: 0.8,
            knockback: 0.4
        },
        soulReward: 11,
        manaReward: 2,
        aiType: "aggressive",
        chargeSpeed: 1.6,
        levelScaling: {
            hpMultiplier: 1.16,
            damageMultiplier: 1.2,
            rewardMultiplier: 1.25
        },
        description: "HP減少で超加速・高火力"
    },
    necromancer: {
        id: "necromancer",
        name: "ネクロマンサー",
        hp: 150,
        maxHp: 150,
        speed: 0.9,
        baseSpeed: 0.9,
        abilities: ["heal", "barrier"],
        heal: {
            amount: 20,
            interval: 4,
            range: 3.5
        },
        barrier: {
            amount: 40,
            interval: 10,
            range: 2.5,
            targets: 4
        },
        resist: {
            curse: 0.7,
            magic: 0.3
        },
        soulReward: 18,
        manaReward: 4,
        aiType: "support",
        supportPriority: true,
        levelScaling: {
            hpMultiplier: 1.14,
            damageMultiplier: 1.1,
            rewardMultiplier: 1.35
        },
        description: "回復とバリアの二刀流"
    },
    battle_mage: {
        id: "battle_mage",
        name: "戦闘魔道士",
        hp: 180,
        maxHp: 180,
        speed: 1.0,
        baseSpeed: 1.0,
        abilities: ["ranged_attack"],
        attack: {
            type: "ranged",
            damage: 12,
            range: 4.5,
            interval: 1.2,
            targets: ["trap", "monster"]
        },
        resist: {
            magic: 0.4,
            fire: 0.3
        },
        soulReward: 13,
        manaReward: 3,
        aiType: "sniper",
        keepDistance: 3.5,
        levelScaling: {
            hpMultiplier: 1.13,
            damageMultiplier: 1.17,
            rewardMultiplier: 1.25
        },
        description: "高威力魔法遠隔攻撃"
    },
    paladin: {
        id: "paladin",
        name: "聖騎士",
        hp: 350,
        maxHp: 350,
        speed: 0.95,
        baseSpeed: 0.95,
        abilities: ["heal", "cleanse", "self_heal"],
        attack: {
            type: "melee",
            damage: 16,
            range: 1.2,
            interval: 1.4,
            targets: ["monster"]
        },
        heal: {
            amount: 12,
            interval: 3.5,
            range: 2.5
        },
        selfHeal: {
            amount: 30,
            interval: 6
        },
        resist: {
            physical: 0.2,
            curse: 0.6,
            magic: 0.2
        },
        soulReward: 20,
        manaReward: 3,
        aiType: "support",
        supportPriority: true,
        levelScaling: {
            hpMultiplier: 1.2,
            damageMultiplier: 1.12,
            rewardMultiplier: 1.35
        },
        description: "攻撃と回復を両立"
    },
    dragon_knight: {
        id: "dragon_knight",
        name: "竜騎士",
        hp: 500,
        maxHp: 500,
        speed: 1.1,
        baseSpeed: 1.1,
        abilities: ["flying"],
        attack: {
            type: "melee",
            damage: 28,
            range: 1.5,
            interval: 1.8,
            targets: ["monster", "trap"]
        },
        resist: {
            ground_trap: 1.0,
            fire: 0.5,
            physical: 0.15
        },
        flying: true,
        soulReward: 25,
        manaReward: 4,
        aiType: "aggressive",
        chargeSpeed: 1.5,
        levelScaling: {
            hpMultiplier: 1.24,
            damageMultiplier: 1.18,
            rewardMultiplier: 1.4
        },
        description: "飛行・高火力・高HP"
    },
    archmage: {
        id: "archmage",
        name: "大魔導士",
        hp: 250,
        maxHp: 250,
        speed: 0.95,
        baseSpeed: 0.95,
        abilities: ["barrier", "ranged_attack"],
        attack: {
            type: "ranged",
            damage: 15,
            range: 5,
            interval: 1.0,
            targets: ["trap", "monster"]
        },
        barrier: {
            amount: 80,
            interval: 8,
            range: 3,
            targets: 5
        },
        resist: {
            magic: 0.5,
            curse: 0.3
        },
        soulReward: 22,
        manaReward: 5,
        aiType: "sniper",
        keepDistance: 4,
        levelScaling: {
            hpMultiplier: 1.15,
            damageMultiplier: 1.2,
            rewardMultiplier: 1.35
        },
        description: "強力魔法とバリア"
    },
    titan: {
        id: "titan",
        name: "巨人",
        hp: 600,
        maxHp: 600,
        speed: 0.7,
        baseSpeed: 0.7,
        abilities: ["trap_destroy"],
        attack: {
            type: "melee",
            damage: 35,
            range: 1.5,
            interval: 2.5,
            targets: ["monster", "trap"],
            trapDamageMultiplier: 5
        },
        resist: {
            physical: 0.3,
            knockback: 0.8
        },
        detectRadius: 2,
        soulReward: 30,
        manaReward: 3,
        aiType: "aggressive",
        levelScaling: {
            hpMultiplier: 1.25,
            damageMultiplier: 1.2,
            rewardMultiplier: 1.4
        },
        description: "超高HP・超火力・罠破壊"
    },
    demon_lord: {
        id: "demon_lord",
        name: "魔王",
        hp: 1800,
        maxHp: 1800,
        speed: 1.1,
        baseSpeed: 1.1,
        abilities: ["barrier", "self_heal", "holy_zone", "ranged_attack"],
        attack: {
            type: "ranged",
            damage: 25,
            range: 5,
            interval: 1.0,
            targets: ["trap", "monster"]
        },
        barrier: {
            amount: 150,
            interval: 8,
            range: 4,
            targets: 8
        },
        selfHeal: {
            amount: 80,
            interval: 4
        },
        holyZone: {
            healPerSec: 15,
            damageReduction: 0.3,
            radius: 4,
            duration: 10,
            cooldown: 15
        },
        resist: {
            fire: 0.6,
            curse: 0.8,
            stun: 0.9,
            knockback: 1.0,
            magic: 0.5,
            physical: 0.3
        },
        soulReward: 200,
        manaReward: 30,
        boss: true,
        levelScaling: {
            hpMultiplier: 1.3,
            damageMultiplier: 1.25,
            rewardMultiplier: 1.6
        },
        description: "ボス：全能力最強"
    },
    shadow_walker: {
        id: "shadow_walker",
        name: "影歩き",
        hp: 110,
        maxHp: 110,
        speed: 1.5,
        baseSpeed: 1.5,
        abilities: ["trap_detect", "disarm"],
        attack: {
            type: "melee",
            damage: 18,
            range: 1,
            interval: 0.7,
            targets: ["monster"]
        },
        resist: {
            stun: 0.5,
            fear: 0.4,
            magic: 0.2
        },
        detectRadius: 3,
        soulReward: 10,
        manaReward: 2,
        aiType: "cautious",
        dodgeChance: 0.5,
        levelScaling: {
            hpMultiplier: 1.1,
            damageMultiplier: 1.2,
            rewardMultiplier: 1.25
        },
        description: "超高速・超回避"
    },
    war_priest: {
        id: "war_priest",
        name: "戦闘司祭",
        hp: 240,
        maxHp: 240,
        speed: 1.0,
        baseSpeed: 1.0,
        abilities: ["heal", "cleanse", "barrier"],
        heal: {
            amount: 18,
            interval: 3,
            range: 3.5
        },
        barrier: {
            amount: 60,
            interval: 9,
            range: 2.5,
            targets: 4
        },
        resist: {
            curse: 0.7,
            magic: 0.3
        },
        soulReward: 17,
        manaReward: 4,
        aiType: "support",
        supportPriority: true,
        levelScaling: {
            hpMultiplier: 1.15,
            damageMultiplier: 1.1,
            rewardMultiplier: 1.3
        },
        description: "回復・浄化・バリア"
    },
    artillery: {
        id: "artillery",
        name: "砲撃兵",
        hp: 200,
        maxHp: 200,
        speed: 0.8,
        baseSpeed: 0.8,
        abilities: ["area_attack"],
        attack: {
            type: "area",
            damage: 20,
            range: 5,
            areaRadius: 1.5,
            interval: 3.0,
            targets: ["trap", "monster"]
        },
        resist: {
            knockback: 0.4
        },
        soulReward: 16,
        manaReward: 3,
        aiType: "sniper",
        keepDistance: 4,
        levelScaling: {
            hpMultiplier: 1.14,
            damageMultiplier: 1.18,
            rewardMultiplier: 1.3
        },
        description: "範囲攻撃・遠隔砲撃"
    },
    wyvern: {
        id: "wyvern",
        name: "ワイバーン",
        hp: 180,
        maxHp: 180,
        speed: 1.3,
        baseSpeed: 1.3,
        abilities: ["flying"],
        attack: {
            type: "melee",
            damage: 16,
            range: 1.2,
            interval: 1.3,
            targets: ["monster", "trap"]
        },
        resist: {
            ground_trap: 1.0,
            knockback: 0.3
        },
        flying: true,
        soulReward: 14,
        manaReward: 3,
        aiType: "aggressive",
        chargeSpeed: 1.5,
        levelScaling: {
            hpMultiplier: 1.16,
            damageMultiplier: 1.14,
            rewardMultiplier: 1.3
        },
        description: "空戦ユニット・地上罠無効・高速移動"
    },
    griffin: {
        id: "griffin",
        name: "グリフォン",
        hp: 220,
        maxHp: 220,
        speed: 1.4,
        baseSpeed: 1.4,
        abilities: ["flying", "ranged_attack"],
        attack: {
            type: "ranged",
            damage: 14,
            range: 4,
            interval: 1.4,
            targets: ["trap", "monster"]
        },
        resist: {
            ground_trap: 1.0,
            physical: 0.1
        },
        flying: true,
        soulReward: 16,
        manaReward: 3,
        aiType: "sniper",
        keepDistance: 3.5,
        levelScaling: {
            hpMultiplier: 1.17,
            damageMultiplier: 1.15,
            rewardMultiplier: 1.3
        },
        description: "空戦ユニット・遠隔攻撃・地上罠無効"
    },
    saboteur: {
        id: "saboteur",
        name: "破壊工作員",
        hp: 160,
        maxHp: 160,
        speed: 1.2,
        baseSpeed: 1.2,
        abilities: ["trap_destroyer"],
        attack: {
            type: "melee",
            damage: 12,
            range: 1.5,
            interval: 1.2,
            targets: ["trap", "monster"],
            canDestroyAllTraps: true // すべての罠を破壊可能
        },
        resist: {
            knockback: 0.5
        },
        soulReward: 15,
        manaReward: 3,
        aiType: "aggressive",
        levelScaling: {
            hpMultiplier: 1.15,
            damageMultiplier: 1.13,
            rewardMultiplier: 1.3
        },
        description: "罠破壊専門・全種類の罠を攻撃可能"
    }
};
