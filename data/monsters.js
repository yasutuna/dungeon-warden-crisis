// モンスターデータ定義
const MONSTER_DATA = {
    skeleton_guard: {
        id: "skeleton_guard",
        name: "スケルトン兵",
        role: "tank",
        summonCost: 90,
        upkeep: 5,
        reviveCost: 45,
        hp: 200,
        maxHp: 200,
        attack: {
            type: "melee",
            damage: 10,
            range: 1,
            interval: 1.0
        },
        moveSpeed: 1.0,
        passive: {
            name: "不死の呪い",
            effect: "死亡時に50%の確率で即座に復活する（レベル毎に+1%、最大80%）",
            reviveChance: 0.5,  // 基本蘇生確率50%
            reviveChancePerLevel: 0.01,  // レベル毎に+1%
            maxReviveChance: 0.8  // 最大蘇生確率80%
        },
        active: {
            name: "盾上げ",
            manaCost: 30,
            cooldown: 15,
            effect: {
                type: "self_buff",
                damageReduction: 0.2,
                duration: 5
            }
        },
        unlocked: true,
        description: "前衛タンク、被ダメ軽減スキル、死亡時復活チャンス"
    },
    slime: {
        id: "slime",
        name: "スライム",
        role: "cc",
        summonCost: 80,
        upkeep: 5,
        reviveCost: 40,
        hp: 260,
        maxHp: 260,
        attack: {
            type: "melee",
            damage: 5,
            range: 1,
            interval: 1.2,
            effect: "slow"
        },
        moveSpeed: 0.7,
        active: {
            name: "分裂",
            manaCost: 0,
            cooldown: 0,
            effect: {
                type: "split",
                trigger: "hp_half",
                count: 2
            }
        },
        unlocked: true,
        description: "接触で鈍足、HP半分で分裂"
    },
    goblin_engineer: {
        id: "goblin_engineer",
        name: "ゴブリン工兵",
        role: "support",
        summonCost: 100,
        upkeep: 6,
        reviveCost: 50,
        hp: 140,
        maxHp: 140,
        attack: {
            type: "melee",
            damage: 5,
            range: 1,
            interval: 1.0
        },
        moveSpeed: 1.1,
        passive: {
            name: "スクラップ回収",
            effect: "近くで敵が倒されると5%の確率でソウル+5"
        },
        active: {
            name: "罠修理",
            manaCost: 25,
            cooldown: 10,
            effect: {
                type: "repair_trap",
                healAmount: 40,
                range: 2
            }
        },
        unlocked: true,
        description: "罠を修理できるサポート、敵撃破でソウル追加獲得"
    },
    gargoyle: {
        id: "gargoyle",
        name: "ガーゴイル",
        role: "anti_air",
        summonCost: 120,
        upkeep: 7,
        reviveCost: 60,
        hp: 160,
        maxHp: 160,
        attack: {
            type: "ranged",
            damage: 14,
            range: 8,  // 射程距離を5から8に増加
            interval: 1.1,
            priority: "flying"
        },
        moveSpeed: 1.2,
        flying: true,
        patrolRadius: 10,  // 索敵範囲を明示的に設定（デフォルト6から10に増加）
        active: {
            name: "空中強襲",
            manaCost: 35,
            cooldown: 12,
            effect: {
                type: "stun",
                duration: 0.7,
                damage: 20
            }
        },
        unlocked: false,
        description: "飛行敵に特化した遠隔攻撃"
    },
    wisp: {
        id: "wisp",
        name: "ウィスプ",
        role: "mage_support",
        summonCost: 110,
        upkeep: 6,
        reviveCost: 55,
        hp: 120,
        maxHp: 120,
        attack: {
            type: "magic",
            damage: 9,
            range: 4,
            interval: 0.9
        },
        moveSpeed: 1.0,
        flying: true,
        active: {
            name: "癒しの光",
            manaCost: 35,
            cooldown: 12,
            effect: {
                type: "heal_allies",
                healAmount: 50,
                range: 3,
                maxTargets: 2
            }
        },
        unlocked: false,
        description: "魔法攻撃、味方を回復"
    },
    cleric_skeleton: {
        id: "cleric_skeleton",
        name: "聖職者スケルトン",
        role: "healer",
        summonCost: 130,
        upkeep: 7,
        reviveCost: 65,
        hp: 150,
        maxHp: 150,
        attack: {
            type: "magic",
            damage: 6,
            range: 3,
            interval: 1.2
        },
        moveSpeed: 0.8,
        passive: {
            name: "祝福のオーラ",
            effect: "周囲の味方の回復力+10%"
        },
        active: {
            name: "範囲回復",
            manaCost: 40,
            cooldown: 15,
            effect: {
                type: "heal_allies",
                healAmount: 70,
                range: 3.5,
                maxTargets: 3
            }
        },
        unlocked: false,
        description: "範囲回復に特化したヒーラー"
    },
    zombie: {
        id: "zombie",
        name: "ゾンビ",
        role: "tank",
        summonCost: 70,
        upkeep: 4,
        reviveCost: 35,
        hp: 300,
        maxHp: 300,
        attack: {
            type: "melee",
            damage: 8,
            range: 1,
            interval: 1.5
        },
        moveSpeed: 0.6,
        passive: {
            name: "アンデッド軍団",
            effect: "敵撃破時に10%+レベル%の確率（最大50%）で敵のレベルとスキルを継承したゾンビを生成",
            zombifyChance: 0.1,  // 基本10%
            zombifyChancePerLevel: 0.01,  // レベル毎に+1%
            maxZombifyChance: 0.5  // 最大50%
        },
        active: {
            name: "疫病の咆哮",
            manaCost: 25,
            cooldown: 20,
            effect: {
                type: "debuff_enemies",
                slowAmount: 0.3,
                duration: 4,
                range: 2
            }
        },
        unlocked: false,
        description: "遅いが頑丈な前衛タンク、敵を倒すとゾンビ化させる"
    },
    shadow_assassin: {
        id: "shadow_assassin",
        name: "影の暗殺者",
        role: "dps",
        summonCost: 150,
        upkeep: 8,
        reviveCost: 75,
        hp: 100,
        maxHp: 100,
        attack: {
            type: "melee",
            damage: 25,
            range: 1,
            interval: 0.8
        },
        moveSpeed: 1.5,
        passive: {
            name: "影の一撃",
            effect: "攻撃時30%の確率でクリティカル(2倍ダメージ)"
        },
        active: {
            name: "暗殺",
            manaCost: 50,
            cooldown: 15,
            effect: {
                type: "instant_damage",
                damage: 100,
                range: 1
            }
        },
        unlocked: false,
        description: "高火力だが脆い、クリティカル攻撃が強力"
    },
    bone_archer: {
        id: "bone_archer",
        name: "骨の射手",
        role: "ranged_dps",
        summonCost: 110,
        upkeep: 6,
        reviveCost: 55,
        hp: 130,
        maxHp: 130,
        attack: {
            type: "ranged",
            damage: 15,
            range: 6,
            interval: 1.0
        },
        moveSpeed: 1.0,
        passive: {
            name: "貫通射撃",
            effect: "攻撃が敵を貫通する"
        },
        active: {
            name: "一斉射撃",
            manaCost: 35,
            cooldown: 12,
            effect: {
                type: "multi_shot",
                count: 3,
                damage: 12,
                range: 6
            }
        },
        unlocked: false,
        description: "遠距離から複数の敵を攻撃"
    },
    necromancer: {
        id: "necromancer",
        name: "ネクロマンサー",
        role: "summoner",
        summonCost: 180,
        upkeep: 10,
        reviveCost: 90,
        hp: 120,
        maxHp: 120,
        attack: {
            type: "magic",
            damage: 12,
            range: 4,
            interval: 1.3
        },
        moveSpeed: 0.9,
        passive: {
            name: "死霊術",
            effect: "敵撃破時に10%の確率でスケルトンを召喚"
        },
        active: {
            name: "死者の軍勢",
            manaCost: 60,
            cooldown: 25,
            effect: {
                type: "summon_skeletons",
                count: 2,
                duration: 20
            }
        },
        unlocked: false,
        description: "スケルトンを召喚して戦わせる"
    },
    frost_mage: {
        id: "frost_mage",
        name: "氷結魔導師",
        role: "cc_mage",
        summonCost: 140,
        upkeep: 7,
        reviveCost: 70,
        hp: 110,
        maxHp: 110,
        attack: {
            type: "magic",
            damage: 10,
            range: 5,
            interval: 1.1,
            effect: "freeze"
        },
        moveSpeed: 1.0,
        passive: {
            name: "氷のオーラ",
            effect: "周囲の敵の移動速度-20%"
        },
        active: {
            name: "ブリザード",
            manaCost: 45,
            cooldown: 18,
            effect: {
                type: "aoe_freeze",
                damage: 30,
                duration: 2,
                range: 3
            }
        },
        unlocked: false,
        description: "敵を凍結させて行動を封じる"
    },
    demon_hound: {
        id: "demon_hound",
        name: "地獄の猟犬",
        role: "scout",
        summonCost: 95,
        upkeep: 5,
        reviveCost: 47,
        hp: 150,
        maxHp: 150,
        attack: {
            type: "melee",
            damage: 12,
            range: 1,
            interval: 0.9
        },
        moveSpeed: 1.8,
        passive: {
            name: "血の渇望",
            effect: "敵のHPが50%以下の時、移動速度+30%、敵撃破時に最大HPの30%回復",
            lowHpSpeedBonus: 0.3,
            killHealPercent: 0.3  // 敵撃破時に30%回復
        },
        active: {
            name: "火炎の息",
            manaCost: 30,
            cooldown: 10,
            effect: {
                type: "cone_attack",
                damage: 25,
                range: 2
            }
        },
        unlocked: false,
        description: "素早い移動で敵を追い詰め、撃破時にHPを回復"
    },
    golem: {
        id: "golem",
        name: "石のゴーレム",
        role: "tank",
        summonCost: 160,
        upkeep: 9,
        reviveCost: 80,
        hp: 400,
        maxHp: 400,
        attack: {
            type: "melee",
            damage: 15,
            range: 1,
            interval: 2.0
        },
        moveSpeed: 0.5,
        passive: {
            name: "挑発のオーラ",
            effect: "周囲の敵を自身に引き付ける（受けるダメージ-30%）"
        },
        taunt: {
            range: 4, // 挑発範囲（タイル数）
            priority: 10 // 敵のターゲット優先度ボーナス
        },
        active: {
            name: "地震",
            manaCost: 50,
            cooldown: 20,
            effect: {
                type: "aoe_stun",
                duration: 1.5,
                range: 2.5
            }
        },
        unlocked: false,
        description: "最強の防御力を持つタンク、敵を引き付ける挑発能力、範囲スタン持ち"
    },
    vampire: {
        id: "vampire",
        name: "吸血鬼",
        role: "sustain_dps",
        summonCost: 170,
        upkeep: 9,
        reviveCost: 85,
        hp: 180,
        maxHp: 180,
        attack: {
            type: "melee",
            damage: 18,
            range: 1,
            interval: 1.0
        },
        moveSpeed: 1.3,
        passive: {
            name: "吸血",
            effect: "与えたダメージの30%を回復"
        },
        active: {
            name: "血の盟約",
            manaCost: 40,
            cooldown: 16,
            effect: {
                type: "lifesteal_boost",
                amount: 0.5,
                duration: 6
            }
        },
        unlocked: false,
        description: "攻撃しながらHPを回復する持久戦型"
    },
    demon_lord: {
        id: "demon_lord",
        name: "魔王",
        role: "special",
        summonCost: 500,
        upkeep: 20,
        reviveCost: 250,
        hp: 250,
        maxHp: 250,
        attack: {
            type: "magic",
            damage: 20,
            range: 4,  // ウィスプと同等の攻撃範囲
            interval: 1.2
        },
        moveSpeed: 0, // 移動しない
        passive: {
            name: "魔王の支配",
            effect: "Wave進行中に10秒に1度、一番遠いスライムを他のユニットに変換する（スライム5体以上の時のみ）、攻撃したダメージ分自分が回復",
            conversionCooldown: 10,  // 10秒に1度
            lifeStealRate: 1.0  // 100%吸血
        },
        active: {
            name: "魔王の威光",
            manaCost: 80,
            cooldown: 30,
            effect: {
                type: "buff_allies",
                damageBoost: 0.3,
                duration: 10,
                range: 4
            }
        },
        unlocked: true,
        unique: true, // 1体しか出現できない
        initialPlacement: "core", // C地点（コア）に初期配置
        description: "スライムを他のユニットに変換できる特殊ユニット、攻撃で回復、1体のみ召喚可能、移動不可"
    }
};
