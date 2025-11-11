// 罠データ定義
const TRAP_DATA = {
    // ===== 基本罠 =====
    spike_plate: {
        id: "spike_plate",
        name: "スパイク板",
        cost: 60,
        repairCost: 20,
        hp: 80,
        maxHp: 80,
        cooldownSec: 5,
        range: 0,
        effect: {
            type: "physical",
            instant: 20,
            dot: {
                dps: 5,
                duration: 3,
                tag: "bleed"
            }
        },
        targeting: "on_pass",
        synergyTags: ["bleed", "physical"],
        unlocked: true,
        description: "通過時にダメージと出血を付与"
    },

    arrow_wall: {
        id: "arrow_wall",
        name: "矢壁",
        cost: 80,
        repairCost: 25,
        hp: 100,
        maxHp: 100,
        cooldownSec: 0.8,
        range: 4,
        effect: {
            type: "physical",
            damage: 15,
            pierce: 0
        },
        targeting: "frontmost",
        destructible: true, // 遠距離ダメージ罠 - 敵が破壊可能
        synergyTags: ["physical", "projectile"],
        unlocked: true,
        description: "最前列の敵を攻撃",
        evolution: {
            arrow_wall: "rapid_arrow_wall",
            fire_vent: "flame_arrow_wall",
            ice_floor: "frost_arrow_wall",
            poison_cloud: "poison_arrow_wall",
            venom_blossom: "poison_arrow_wall",
            lightning_rod: "lightning_arrow_wall",
            cursed_altar: "curse_arrow_wall"
        }
    },

    oil_pot: {
        id: "oil_pot",
        name: "油壺",
        cost: 70,
        repairCost: 20,
        hp: 70,
        maxHp: 70,
        cooldownSec: 8,
        range: 1.5,
        effect: {
            type: "oil",
            debuff: "oiled",
            duration: 3,
            aoeRadius: 1.5,
            slow: 0.5
        },
        targeting: "area",
        synergyTags: ["fire_synergy", "slow"],
        unlocked: true,
        description: "油濡れ状態を付与し火炎ダメージ+50%、移動速度50%減少",
        evolution: {
            fire_vent: "wildfire_trap"
        }
    },

    fire_vent: {
        id: "fire_vent",
        name: "火炎孔",
        cost: 100,
        repairCost: 35,
        hp: 90,
        maxHp: 90,
        cooldownSec: 6,
        range: 1.5,
        effect: {
            type: "fire",
            dot: {
                dps: 12,
                duration: 2,
                tag: "burn"
            },
            aoeRadius: 1.5
        },
        targeting: "area",
        synergyTags: ["fire", "fire_synergy"],
        unlocked: false,
        description: "範囲火炎ダメージ。油濡れ状態の敵に追加ボーナス",
        evolution: {
            oil_pot: "wildfire_trap"
        }
    },

    wildfire_trap: {
        id: "wildfire_trap",
        name: "延焼罠",
        cost: 180,
        repairCost: 60,
        hp: 110,
        maxHp: 110,
        cooldownSec: 7,
        range: 1.5,
        effect: {
            type: "wildfire",
            duration: 6,
            damagePerTile: 10,
            neighborBonus: 0.1,
            spreadChance: 0.1,
            extinguishChance: 0.05,
            spreadRadius: 2,
            neighborRadius: 2
        },
        targeting: "area",
        synergyTags: ["fire", "oil", "status"],
        unlocked: false,
        description: "油壺と火炎孔の融合。延焼を付与し毎秒伝播判定を行う",
        evolved: true
    },

    ice_floor: {
        id: "ice_floor",
        name: "氷結床",
        cost: 90,
        repairCost: 30,
        hp: 85,
        maxHp: 85,
        cooldownSec: 0,
        range: 0,
        effect: {
            type: "ice",
            slow: 0.4,
            freezeStacks: 3,
            freezeDuration: 1
        },
        targeting: "on_pass",
        synergyTags: ["ice", "freeze"],
        unlocked: false,
        description: "移動速度低下、3回で凍結"
    },

    push_plate: {
        id: "push_plate",
        name: "押し出し板",
        cost: 85,
        repairCost: 25,
        hp: 80,
        maxHp: 80,
        cooldownSec: 7,
        range: 2,
        effect: {
            type: "knockback",
            distance: 2,
            direction: "forward"
        },
        targeting: "line",
        synergyTags: ["cc"],
        unlocked: false,
        description: "前方にノックバック"
    },

    mine: {
        id: "mine",
        name: "地雷",
        cost: 90,
        repairCost: 90,
        hp: 1,
        maxHp: 1,
        cooldownSec: 0,
        range: 1,
        effect: {
            type: "burst",
            damage: 60,
            knockback: 1,
            aoeRadius: 1
        },
        targeting: "on_trigger",
        synergyTags: ["burst"],
        unlocked: false,
        description: "踏むと爆発してノックバック"
    },

    confusion_sign: {
        id: "confusion_sign",
        name: "反転符",
        cost: 75,
        repairCost: 25,
        hp: 75,
        maxHp: 75,
        cooldownSec: 10,
        range: 3,
        effect: {
            type: "debuff",
            debuff: "confused",
            duration: 4
        },
        targeting: "priority_targets",
        synergyTags: ["cc", "debuff"],
        unlocked: false,
        description: "優先順位を乱す、ヒーラー対策"
    },

    soul_harvester: {
        id: "soul_harvester",
        name: "ソウル収穫機",
        cost: 120,
        repairCost: 40,
        hp: 100,
        maxHp: 100,
        cooldownSec: 0,
        range: 2,
        effect: {
            type: "soul_generation",
            soulPerKill: 3,
            radius: 2
        },
        targeting: "passive",
        synergyTags: ["economy"],
        unlocked: false,
        description: "範囲内で敵を倒すとソウル+3"
    },

    lightning_rod: {
        id: "lightning_rod",
        name: "雷の柱",
        cost: 110,
        repairCost: 35,
        hp: 95,
        maxHp: 95,
        cooldownSec: 4,
        range: 3,
        effect: {
            type: "lightning",
            damage: 25,
            chainTargets: 3,
            chainDamageReduction: 0.3
        },
        targeting: "chain",
        synergyTags: ["aoe", "magic", "lightning"],
        unlocked: false,
        description: "電撃が3体に連鎖、各連鎖で30%減衰"
    },

    vampire_thorn: {
        id: "vampire_thorn",
        name: "吸血の棘",
        cost: 95,
        repairCost: 30,
        hp: 85,
        maxHp: 85,
        cooldownSec: 3,
        range: 1.5,
        effect: {
            type: "physical",
            damage: 18,
            lifesteal: 0.5
        },
        targeting: "nearest",
        synergyTags: ["sustain", "physical"],
        unlocked: false,
        description: "ダメージの50%を自身のHPに回復"
    },

    gravity_well: {
        id: "gravity_well",
        name: "重力井戸",
        cost: 105,
        repairCost: 35,
        hp: 90,
        maxHp: 90,
        cooldownSec: 8,
        range: 2.5,
        effect: {
            type: "pull",
            pullStrength: 1.5,
            damage: 5,
            duration: 2
        },
        targeting: "area",
        synergyTags: ["cc", "aoe"],
        unlocked: false,
        description: "範囲内の敵を引き寄せて鈍足"
    },

    poison_cloud: {
        id: "poison_cloud",
        name: "毒霧発生器",
        cost: 100,
        repairCost: 30,
        hp: 80,
        maxHp: 80,
        cooldownSec: 10,
        range: 2,
        effect: {
            type: "poison",
            dot: {
                dps: 8,
                duration: 5,
                tag: "poison"
            },
            healingReduction: 0.5
        },
        targeting: "area",
        synergyTags: ["dot", "debuff", "poison"],
        unlocked: false,
        description: "毒DOT+回復50%減少"
    },

    venom_blossom: {
        id: "venom_blossom",
        name: "ベノムブロッサム",
        cost: 110,
        repairCost: 35,
        hp: 70,
        maxHp: 70,
        cooldownSec: 7,
        range: 1.8,
        effect: {
            type: "poison",
            dot: {
                dps: 9,
                duration: 4,
                tag: "poison",
                maxStacks: 4
            },
            healingReduction: 0.4
        },
        targeting: "area",
        synergyTags: ["poison", "dot", "debuff"],
        unlocked: true,
        description: "毒蓄積ダメージとHP回復阻害を付与",
        evolution: {
            arrow_wall: "poison_arrow_wall",
            slow_zone: "toxic_swamp"
        }
    },

    mirror_trap: {
        id: "mirror_trap",
        name: "反射の鏡",
        cost: 130,
        repairCost: 45,
        hp: 110,
        maxHp: 110,
        cooldownSec: 6,
        range: 0,
        effect: {
            type: "reflect",
            reflectPercentage: 0.4,
            duration: 3
        },
        targeting: "on_pass",
        synergyTags: ["defensive"],
        unlocked: false,
        description: "通過した敵が受けたダメージの40%を反射"
    },

    time_warp: {
        id: "time_warp",
        name: "時空歪曲器",
        cost: 140,
        repairCost: 50,
        hp: 100,
        maxHp: 100,
        cooldownSec: 15,
        range: 2,
        effect: {
            type: "time",
            slow: 0.6,
            cooldownIncrease: 2,
            duration: 3
        },
        targeting: "area",
        synergyTags: ["cc", "debuff"],
        unlocked: false,
        description: "敵の速度60%低下+スキルCD+2秒"
    },

    cursed_altar: {
        id: "cursed_altar",
        name: "呪いの祭壇",
        cost: 115,
        repairCost: 40,
        hp: 95,
        maxHp: 95,
        cooldownSec: 7,
        range: 2.5,
        effect: {
            type: "curse",
            dot: {
                dps: 6,
                duration: 6,
                tag: "curse"
            },
            damageAmplify: 0.15
        },
        targeting: "area",
        synergyTags: ["debuff", "synergy", "curse"],
        unlocked: false,
        description: "呪いDOT+被ダメ15%増加"
    },

    holy_barrier: {
        id: "holy_barrier",
        name: "聖なる結界",
        cost: 125,
        repairCost: 45,
        hp: 120,
        maxHp: 120,
        cooldownSec: 0,
        range: 1.5,
        effect: {
            type: "buff_allies",
            damageReduction: 0.2,
            healPerSec: 3
        },
        targeting: "passive",
        synergyTags: ["support"],
        unlocked: false,
        description: "範囲内の味方モンスターに被ダメ軽減+回復"
    },

    mana_crystal: {
        id: "mana_crystal",
        name: "マナ結晶",
        cost: 100,
        repairCost: 35,
        hp: 90,
        maxHp: 90,
        cooldownSec: 0,
        range: 0,
        effect: {
            type: "mana_generation",
            manaPerSec: 0.5
        },
        targeting: "passive",
        synergyTags: ["economy"],
        unlocked: false,
        description: "毎秒マナ+0.5を生成"
    },

    healing_fountain: {
        id: "healing_fountain",
        name: "回復の泉",
        cost: 110,
        repairCost: 40,
        hp: 100,
        maxHp: 100,
        cooldownSec: 0,
        range: 2,
        effect: {
            type: "heal_allies_aura",
            healPerSec: 5,
            radius: 2
        },
        targeting: "passive",
        synergyTags: ["support"],
        unlocked: false,
        description: "範囲内の味方モンスターを毎秒回復"
    },

    berserk_sigil: {
        id: "berserk_sigil",
        name: "バーサーク符",
        cost: 120,
        repairCost: 45,
        hp: 95,
        maxHp: 95,
        cooldownSec: 0,
        range: 2.5,
        effect: {
            type: "attack_speed_buff",
            attackSpeedBonus: 0.3,
            radius: 2.5
        },
        targeting: "passive",
        synergyTags: ["support", "buff"],
        unlocked: false,
        description: "範囲内の味方の攻撃速度+30%"
    },

    shield_generator: {
        id: "shield_generator",
        name: "シールド発生装置",
        cost: 130,
        repairCost: 50,
        hp: 110,
        maxHp: 110,
        cooldownSec: 10,
        range: 2,
        effect: {
            type: "shield_aura",
            shieldAmount: 30,
            radius: 2,
            interval: 10
        },
        targeting: "passive",
        synergyTags: ["support", "defensive"],
        unlocked: false,
        description: "10秒毎に範囲内の味方にバリア付与"
    },

    // ===== 新規追加罠 =====
    acid_pool: {
        id: "acid_pool",
        name: "酸の水溜り",
        cost: 85,
        repairCost: 28,
        hp: 75,
        maxHp: 75,
        cooldownSec: 0,
        range: 0,
        effect: {
            type: "acid",
            dot: {
                dps: 10,
                duration: 4,
                tag: "acid"
            },
            armorReduction: 0.3
        },
        targeting: "on_pass",
        synergyTags: ["dot", "debuff", "acid"],
        unlocked: false,
        description: "通過時に酸DOT+防御力30%減少"
    },

    slow_zone: {
        id: "slow_zone",
        name: "減速フィールド",
        cost: 70,
        repairCost: 25,
        hp: 80,
        maxHp: 80,
        cooldownSec: 0,
        range: 0,
        effect: {
            type: "slow_field",
            slow: 0.5,
            duration: 2
        },
        targeting: "on_pass",
        synergyTags: ["cc", "slow"],
        unlocked: true,
        description: "通過時に移動速度50%減少",
        evolution: {
            venom_blossom: "toxic_swamp"
        }
    },

    electric_net: {
        id: "electric_net",
        name: "電撃ネット",
        cost: 95,
        repairCost: 32,
        hp: 85,
        maxHp: 85,
        cooldownSec: 8,
        range: 2,
        effect: {
            type: "electric",
            damage: 20,
            stun: 0.5,
            aoeRadius: 2
        },
        targeting: "area",
        synergyTags: ["cc", "lightning", "aoe"],
        unlocked: false,
        description: "範囲電撃ダメージ+0.5秒スタン"
    },

    blood_altar: {
        id: "blood_altar",
        name: "血の祭壇",
        cost: 110,
        repairCost: 40,
        hp: 90,
        maxHp: 90,
        cooldownSec: 12,
        range: 2.5,
        effect: {
            type: "blood_sacrifice",
            damage: 30,
            healAlly: 15,
            aoeRadius: 2.5
        },
        targeting: "area",
        synergyTags: ["support", "damage"],
        unlocked: false,
        description: "範囲ダメージ+味方を半分回復"
    },

    wind_trap: {
        id: "wind_trap",
        name: "風の罠",
        cost: 80,
        repairCost: 28,
        hp: 75,
        maxHp: 75,
        cooldownSec: 10,
        range: 3,
        effect: {
            type: "wind",
            knockback: 2,
            damage: 10,
            aoeRadius: 3
        },
        targeting: "area",
        synergyTags: ["cc", "knockback"],
        unlocked: false,
        description: "範囲ノックバック+軽微ダメージ"
    },

    void_portal: {
        id: "void_portal",
        name: "虚無のポータル",
        cost: 150,
        repairCost: 60,
        hp: 120,
        maxHp: 120,
        cooldownSec: 20,
        range: 2,
        effect: {
            type: "void",
            damage: 50,
            dispel: true,
            silenceDuration: 3
        },
        targeting: "area",
        synergyTags: ["magic", "debuff"],
        unlocked: false,
        description: "大ダメージ+バフ解除+沈黙"
    },

    turret: {
        id: "turret",
        name: "機関砲塔",
        cost: 120,
        repairCost: 40,
        hp: 110,
        maxHp: 110,
        cooldownSec: 0.3,
        range: 5,
        effect: {
            type: "rapid_fire",
            damage: 8,
            pierce: 1
        },
        targeting: "nearest",
        destructible: true, // 遠距離ダメージ罠 - 敵が破壊可能
        synergyTags: ["physical", "rapid"],
        unlocked: false,
        description: "高速連射で最も近い敵を攻撃"
    },

    blade_spinner: {
        id: "blade_spinner",
        name: "回転刃",
        cost: 105,
        repairCost: 35,
        hp: 95,
        maxHp: 95,
        cooldownSec: 0,
        range: 1.5,
        effect: {
            type: "spin_damage",
            dps: 15,
            radius: 1.5
        },
        targeting: "passive",
        synergyTags: ["physical", "aoe"],
        unlocked: false,
        description: "範囲内の敵に継続ダメージ"
    },

    dark_ritual: {
        id: "dark_ritual",
        name: "闇の儀式",
        cost: 140,
        repairCost: 50,
        hp: 100,
        maxHp: 100,
        cooldownSec: 15,
        range: 3,
        effect: {
            type: "dark_magic",
            damage: 40,
            lifesteal: 0.5,
            damageOverTime: {
                dps: 10,
                duration: 5,
                tag: "dark"
            }
        },
        targeting: "area",
        synergyTags: ["magic", "dot", "sustain"],
        unlocked: false,
        description: "範囲ダメージ+DOT+吸血"
    },

    sleep_rune: {
        id: "sleep_rune",
        name: "睡眠のルーン",
        cost: 95,
        repairCost: 32,
        hp: 80,
        maxHp: 80,
        cooldownSec: 18,
        range: 2,
        effect: {
            type: "sleep",
            duration: 3,
            aoeRadius: 2
        },
        targeting: "area",
        synergyTags: ["cc"],
        unlocked: false,
        description: "範囲の敵を3秒眠らせる"
    },

    // ===== 進化後の罠（矢壁の進化系） =====
    rapid_arrow_wall: {
        id: "rapid_arrow_wall",
        name: "連射矢壁",
        cost: 200,
        repairCost: 50,
        hp: 150,
        maxHp: 150,
        cooldownSec: 0.4,
        range: 5,
        effect: {
            type: "physical",
            damage: 20,
            pierce: 1
        },
        targeting: "frontmost",
        destructible: true, // 遠距離ダメージ罠 - 敵が破壊可能
        synergyTags: ["physical", "projectile"],
        unlocked: false,
        description: "矢壁の上位互換。高速連射+貫通",
        maxExp: 150,
        expPerLevel: 75,
        evolved: true
    },

    flame_arrow_wall: {
        id: "flame_arrow_wall",
        name: "炎矢壁",
        cost: 200,
        repairCost: 50,
        hp: 140,
        maxHp: 140,
        cooldownSec: 0.8,
        range: 4,
        effect: {
            type: "fire_physical",
            damage: 18,
            dot: {
                dps: 8,
                duration: 3,
                tag: "burn"
            }
        },
        targeting: "frontmost",
        destructible: true, // 遠距離ダメージ罠 - 敵が破壊可能
        synergyTags: ["physical", "fire", "projectile"],
        unlocked: false,
        description: "矢+炎。物理ダメージ+燃焼DOT",
        maxExp: 150,
        expPerLevel: 75,
        evolved: true
    },

    frost_arrow_wall: {
        id: "frost_arrow_wall",
        name: "氷矢壁",
        cost: 200,
        repairCost: 50,
        hp: 140,
        maxHp: 140,
        cooldownSec: 0.8,
        range: 4,
        effect: {
            type: "ice_physical",
            damage: 18,
            slow: 0.5,
            slowDuration: 2
        },
        targeting: "frontmost",
        destructible: true, // 遠距離ダメージ罠 - 敵が破壊可能
        synergyTags: ["physical", "ice", "projectile"],
        unlocked: false,
        description: "矢+氷。物理ダメージ+鈍足",
        maxExp: 150,
        expPerLevel: 75,
        evolved: true
    },

    poison_arrow_wall: {
        id: "poison_arrow_wall",
        name: "毒矢壁",
        cost: 200,
        repairCost: 50,
        hp: 140,
        maxHp: 140,
        cooldownSec: 0.8,
        range: 4,
        effect: {
            type: "poison_physical",
            damage: 15,
            dot: {
                dps: 10,
                duration: 5,
                tag: "poison"
            },
            healingReduction: 0.3
        },
        targeting: "frontmost",
        destructible: true, // 遠距離ダメージ罠 - 敵が破壊可能
        synergyTags: ["physical", "poison", "projectile"],
        unlocked: false,
        description: "矢+毒。物理ダメージ+毒DOT+回復阻害",
        maxExp: 150,
        expPerLevel: 75,
        evolved: true
    },

    lightning_arrow_wall: {
        id: "lightning_arrow_wall",
        name: "雷矢壁",
        cost: 200,
        repairCost: 50,
        hp: 140,
        maxHp: 140,
        cooldownSec: 0.8,
        range: 4,
        effect: {
            type: "lightning_physical",
            damage: 20,
            chainTargets: 2,
            chainDamageReduction: 0.5
        },
        targeting: "frontmost",
        destructible: true, // 遠距離ダメージ罠 - 敵が破壊可能
        synergyTags: ["physical", "lightning", "projectile"],
        unlocked: false,
        description: "矢+雷。物理ダメージ+2体に連鎖",
        maxExp: 150,
        expPerLevel: 75,
        evolved: true
    },

    curse_arrow_wall: {
        id: "curse_arrow_wall",
        name: "呪矢壁",
        cost: 200,
        repairCost: 50,
        hp: 140,
        maxHp: 140,
        cooldownSec: 0.8,
        range: 4,
        effect: {
            type: "curse_physical",
            damage: 18,
            dot: {
                dps: 5,
                duration: 4,
                tag: "curse"
            },
            damageAmplify: 0.1
        },
        targeting: "frontmost",
        destructible: true, // 遠距離ダメージ罠 - 敵が破壊可能
        synergyTags: ["physical", "curse", "projectile"],
        unlocked: false,
        description: "矢+呪い。物理ダメージ+呪いDOT+被ダメ増加",
        maxExp: 150,
        expPerLevel: 75,
        evolved: true
    },
    // ===== ベノムブロッサムの進化系 =====
    toxic_swamp: {
        id: "toxic_swamp",
        name: "毒沼",
        cost: 200,
        repairCost: 50,
        hp: 100,
        maxHp: 100,
        cooldownSec: 0,
        range: 0,
        effect: {
            type: "toxic_swamp",
            dot: {
                dps: 12,
                duration: 20,
                tag: "poison",
                maxStacks: 5
            },
            root: {
                duration: 20,
                breakOnDamage: false
            },
            healingReduction: 0.6,
            slow: 1.0
        },
        targeting: "on_pass",
        synergyTags: ["poison", "dot", "cc", "debuff"],
        unlocked: false,
        description: "毒沼+減速。20秒間移動不可+強力な毒DOT",
        maxExp: 150,
        expPerLevel: 75,
        evolved: true
    }
};
