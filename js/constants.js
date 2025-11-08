/**
 * ゲーム定数の一元管理
 * すべてのマジックナンバーをここで定義
 */

// ゲームコア設定
const GAME_CONSTANTS = {
    CORE_DAMAGE_PER_ENEMY: 10,
    MAX_MONSTERS: 5,
    INITIAL_SOUL: 500,
    INITIAL_MANA: 100,
    MAX_MANA: 200,
    INITIAL_CORE_HP: 100,
    MANA_REGEN_RATE: 2,
    GAME_SPEED_OPTIONS: [1, 2, 3],
    MONSTER_MOVE_SPEED_MULTIPLIER: 0.5,
    TUTORIAL_DELAY_MS: 500,
    TUTORIAL_MESSAGE_DELAY_MS: 3000
};

// ビジュアル定数
const VISUAL_CONSTANTS = {
    // エンティティサイズ
    ENEMY_NORMAL_SIZE_MULTIPLIER: 0.5,
    ENEMY_BOSS_SIZE_MULTIPLIER: 1.5,
    MONSTER_SIZE_MULTIPLIER: 0.6,
    TRAP_SIZE_MULTIPLIER: 0.7,

    // HPバーサイズ
    HP_BAR_HEIGHT: 5,
    HP_BAR_OFFSET: 5,

    // アイコンサイズ
    ICON_SIZE_NORMAL: 14,
    ICON_SIZE_BOSS: 24,
    ICON_SIZE_MONSTER: 16,
    ICON_SIZE_TRAP: 20,
    STATUS_ICON_SIZE: 12,
    STATUS_ICON_SPACING: 15,

    // バリア表示
    BARRIER_OUTLINE_OFFSET: 3,
    BARRIER_LINE_WIDTH: 3,

    // 配置プレビュー
    PLACEMENT_PREVIEW_ALPHA: 0.3,
    PLACEMENT_PREVIEW_LINE_WIDTH: 2,

    // 選択ハイライト
    SELECTION_HIGHLIGHT_SIZE: 0.6,
    SELECTION_HIGHLIGHT_LINE_WIDTH: 3,

    // クールダウン表示
    COOLDOWN_OVERLAY_ALPHA: 0.5
};

// 経路探索定数
const PATHFINDING_CONSTANTS = {
    WAYPOINT_REACH_DISTANCE: 5,
    DEFAULT_TILE_COST: 1,
    MAX_TRAP_COST: 10,
    QUADTREE_CAPACITY: 4
};

// 戦闘定数
const COMBAT_CONSTANTS = {
    BASE_CRIT_CHANCE: 0.05, // 5%
    CRIT_MULTIPLIER: 1.5,
    SHATTER_MULTIPLIER: 1.3,
    OIL_FIRE_MULTIPLIER: 1.5,
    DAMAGE_LOG_MAX_SIZE: 100
};

// 敵AI定数
const ENEMY_AI_CONSTANTS = {
    BOSS_HEAL_THRESHOLD: 0.7,
    DISARM_DURATION: 1.0,
    ATTACK_RANGE_MULTIPLIER: 1.0,
    HEAL_RANGE_MULTIPLIER: 1.0,
    BARRIER_RANGE_MULTIPLIER: 1.0
};

// モンスターAI定数
const MONSTER_AI_CONSTANTS = {
    PATROL_RADIUS: 6,
    PATROL_RADIUS_MULTIPLIER: 1.5,
    MOVE_SPEED_MULTIPLIER: 0.5,
    ATTACK_RANGE_TOLERANCE: 1,
    DEFAULT_PATROL_RADIUS: 6  // デフォルト巡回半径
};

// 状態異常定数
const STATUS_EFFECT_CONSTANTS = {
    // 出血
    BLEED_BASE_DPS: 5,
    BLEED_MAX_STACKS: 3,

    // 燃焼
    BURN_BASE_DPS: 12,
    BURN_OIL_MULTIPLIER: 2.0,

    // 鈍足
    SLOW_DEFAULT_AMOUNT: 0.4,

    // 油濡れ
    OILED_MOVE_SPEED_MULTIPLIER: 0.8,
    OILED_FIRE_VULNERABILITY: 1.5,

    // 氷結
    FREEZE_STACKS_REQUIRED: 3,

    // バリア
    BARRIER_DEFAULT_AMOUNT: 50
};

// スライム分裂定数
const SLIME_CONSTANTS = {
    SPLIT_HP_THRESHOLD: 0.5,
    SPLIT_COUNT: 2,
    SPLIT_HP_MULTIPLIER: 0.5,
    SPLIT_MAX_SEARCH_RADIUS: 2
};

// UI定数
const UI_CONSTANTS = {
    MESSAGE_DURATION: 2000, // ミリ秒
    MESSAGE_FADE_ANIMATION: 'fadeInOut 2s ease-in-out',
    TOOLTIP_MAX_WIDTH: 320,
    TOOLTIP_PADDING: 12,
    PALETTE_UPDATE_THROTTLE: 100 // ms
};

// グリッド定数
const GRID_CONSTANTS = {
    COLS: 16,
    ROWS: 12,
    TILE_SIZE: 50,
    GRID_LINE_WIDTH: 1,
    TRAP_PLACEMENT_TOLERANCE: 0.6,
    MINE_TRIGGER_RANGE: 0.5
};

// 罠定数
const TRAP_CONSTANTS = {
    // デフォルトレベルシステム
    DEFAULT_LEVEL: 1,
    DEFAULT_EXP: 0,
    DEFAULT_MAX_EXP: 100,
    DEFAULT_EXP_PER_LEVEL: 50,

    // レベルアップ時のステータス上昇率
    LEVEL_UP_HP_MULTIPLIER: 0.1,
    LEVEL_UP_DAMAGE_MULTIPLIER: 1.1,

    // 経験値計算
    EXP_PER_ENEMY_LEVEL: 10,
    EXP_PER_SOUL_REWARD: 2,

    // 飛行ユニット攻撃可能な罠タイプ
    CAN_HIT_FLYING_TYPES: ['arrow_wall', 'confusion_sign', 'rapid_arrow_wall',
                           'flame_arrow_wall', 'frost_arrow_wall', 'poison_arrow_wall',
                           'lightning_arrow_wall', 'curse_arrow_wall', 'turret'],

    // ターゲット判定の距離倍率
    ON_PASS_RANGE_MULTIPLIER: 0.6,
    ON_TRIGGER_RANGE_MULTIPLIER: 0.5,

    // 連鎖攻撃
    CHAIN_ATTACK_MAX_RANGE: 4,

    // ノックバック
    KNOCKBACK_PATH_STEP: 2,

    // 修理
    REPAIR_MIN_HP_RATIO: 0.99  // 99%以上で完全修理とみなす
};

// アニメーション定数
const ANIMATION_CONSTANTS = {
    DAMAGE_TEXT_RISE_SPEED: 20, // pixels/second
    DAMAGE_TEXT_DURATION: 1.0, // seconds
    PARTICLE_DEFAULT_LIFE: 1.0, // seconds
    PARTICLE_DEFAULT_SIZE: 2,
    CRITICAL_DAMAGE_FONT_SIZE: 20,
    NORMAL_DAMAGE_FONT_SIZE: 16
};

// パフォーマンス定数
const PERFORMANCE_CONSTANTS = {
    QUADTREE_INITIAL_CAPACITY: 4,
    OBJECT_POOL_INITIAL_SIZE: 10,
    PARTICLE_POOL_SIZE: 50,
    DAMAGE_TEXT_POOL_SIZE: 30,
    TARGET_FPS: 60,
    DELTA_TIME_CAP: 0.1 // 最大デルタタイム（秒）
};

// スキル定数
const SKILL_POOL = {
    // 攻撃系スキル
    critical_strike: {
        id: 'critical_strike',
        name: 'クリティカル',
        type: 'passive',
        description: '攻撃時15%の確率で2倍ダメージ',
        rarity: 'common',
        effect: { type: 'crit_chance', value: 0.15, multiplier: 2.0 }
    },
    power_attack: {
        id: 'power_attack',
        name: '強打',
        type: 'passive',
        description: '攻撃力+20%',
        rarity: 'common',
        effect: { type: 'damage_bonus', value: 0.2 }
    },
    life_steal: {
        id: 'life_steal',
        name: '吸血',
        type: 'passive',
        description: 'ダメージの30%をHP回復',
        rarity: 'rare',
        effect: { type: 'life_steal', value: 0.3 }
    },
    chain_attack: {
        id: 'chain_attack',
        name: '連鎖攻撃',
        type: 'passive',
        description: '攻撃が近くの敵1体に50%ダメージで連鎖',
        rarity: 'rare',
        effect: { type: 'chain', range: 2, damage: 0.5 }
    },
    execute: {
        id: 'execute',
        name: '処刑',
        type: 'passive',
        description: 'HP30%以下の敵に+50%ダメージ',
        rarity: 'epic',
        effect: { type: 'execute', threshold: 0.3, bonus: 0.5 }
    },

    // 防御系スキル
    tough_skin: {
        id: 'tough_skin',
        name: '硬化',
        type: 'passive',
        description: '最大HP+25%',
        rarity: 'common',
        effect: { type: 'max_hp_bonus', value: 0.25 }
    },
    regeneration: {
        id: 'regeneration',
        name: '再生',
        type: 'passive',
        description: '毎秒HP+2%回復',
        rarity: 'common',
        effect: { type: 'hp_regen', value: 0.02 }
    },
    iron_will: {
        id: 'iron_will',
        name: '鋼の意志',
        type: 'passive',
        description: '状態異常の持続時間-50%',
        rarity: 'rare',
        effect: { type: 'status_resist', value: 0.5 }
    },
    last_stand: {
        id: 'last_stand',
        name: '背水の陣',
        type: 'passive',
        description: 'HP50%以下で攻撃力+30%',
        rarity: 'rare',
        effect: { type: 'low_hp_damage', threshold: 0.5, bonus: 0.3 }
    },

    // 速度系スキル
    swift: {
        id: 'swift',
        name: '迅速',
        type: 'passive',
        description: '移動速度+30%',
        rarity: 'common',
        effect: { type: 'move_speed', value: 0.3 }
    },
    rapid_fire: {
        id: 'rapid_fire',
        name: '連射',
        type: 'passive',
        description: '攻撃速度+25%',
        rarity: 'common',
        effect: { type: 'attack_speed', value: 0.25 }
    },

    // 特殊系スキル
    hunter: {
        id: 'hunter',
        name: '狩人',
        type: 'passive',
        description: '索敵範囲+2、敵撃破時の経験値+50%',
        rarity: 'rare',
        effect: { type: 'hunter', range: 2, exp_bonus: 0.5 }
    },
    guardian: {
        id: 'guardian',
        name: '守護者',
        type: 'passive',
        description: '近くの罠のHP+20%',
        rarity: 'rare',
        effect: { type: 'guardian', range: 3, hp_bonus: 0.2 }
    },
    veteran: {
        id: 'veteran',
        name: 'ベテラン',
        type: 'passive',
        description: '撃破数10以上で全ステータス+10%',
        rarity: 'epic',
        effect: { type: 'veteran', kills_required: 10, bonus: 0.1 }
    },

    // 追加スキル - 特殊効果系
    berserker_rage: {
        id: 'berserker_rage',
        name: '狂戦士の怒り',
        type: 'passive',
        description: 'HP30%以下で攻撃力+70%、攻撃速度+50%',
        rarity: 'epic',
        effect: { type: 'berserker_rage', threshold: 0.3, damage_bonus: 0.7, speed_bonus: 0.5 }
    },
    cleave: {
        id: 'cleave',
        name: '薙ぎ払い',
        type: 'passive',
        description: '攻撃が周囲2タイルの敵にも70%ダメージ',
        rarity: 'rare',
        effect: { type: 'cleave', range: 2, damage_ratio: 0.7 }
    },
    poison_strike: {
        id: 'poison_strike',
        name: '毒撃',
        type: 'passive',
        description: '攻撃時30%の確率で毒付与(5秒間、毎秒10ダメージ)',
        rarity: 'rare',
        effect: { type: 'poison_strike', chance: 0.3, duration: 5, dps: 10 }
    },
    frost_aura: {
        id: 'frost_aura',
        name: '冷気のオーラ',
        type: 'passive',
        description: '周囲3タイルの敵の移動速度-30%',
        rarity: 'rare',
        effect: { type: 'frost_aura', range: 3, slow_amount: 0.3 }
    },
    thorns: {
        id: 'thorns',
        name: '茨の鎧',
        type: 'passive',
        description: '受けたダメージの30%を反射',
        rarity: 'rare',
        effect: { type: 'thorns', reflect_ratio: 0.3 }
    },
    vampiric_touch: {
        id: 'vampiric_touch',
        name: '吸血の接触',
        type: 'passive',
        description: 'ダメージの40%をHP回復',
        rarity: 'epic',
        effect: { type: 'life_steal', value: 0.4 }
    },
    holy_light: {
        id: 'holy_light',
        name: '聖なる光',
        type: 'passive',
        description: '5秒毎に周囲の味方を50回復',
        rarity: 'rare',
        effect: { type: 'aoe_heal', range: 3, heal: 50, interval: 5 }
    },
    adrenaline: {
        id: 'adrenaline',
        name: 'アドレナリン',
        type: 'passive',
        description: '敵を倒す度に5秒間、攻撃速度+40%',
        rarity: 'rare',
        effect: { type: 'adrenaline', duration: 5, attack_speed_bonus: 0.4 }
    },
    fortify: {
        id: 'fortify',
        name: '要塞化',
        type: 'passive',
        description: '移動せずに5秒経過すると被ダメージ-40%',
        rarity: 'rare',
        effect: { type: 'fortify', time_required: 5, damage_reduction: 0.4 }
    },
    backstab: {
        id: 'backstab',
        name: 'バックスタブ',
        type: 'passive',
        description: '背後から攻撃時にダメージ3倍',
        rarity: 'epic',
        effect: { type: 'backstab', multiplier: 3.0 }
    },
    multi_shot: {
        id: 'multi_shot',
        name: 'マルチショット',
        type: 'passive',
        description: '攻撃が2体の敵に同時に命中',
        rarity: 'epic',
        effect: { type: 'multi_shot', targets: 2 }
    },
    splash_damage: {
        id: 'splash_damage',
        name: 'スプラッシュ',
        type: 'passive',
        description: '攻撃が周囲1.5タイルに40%ダメージ',
        rarity: 'common',
        effect: { type: 'splash', range: 1.5, damage_ratio: 0.4 }
    },
    shield_break: {
        id: 'shield_break',
        name: 'シールドブレイク',
        type: 'passive',
        description: 'バリアを持つ敵へのダメージ+100%',
        rarity: 'rare',
        effect: { type: 'shield_break', bonus: 1.0 }
    },
    armor_piercing: {
        id: 'armor_piercing',
        name: '貫通攻撃',
        type: 'passive',
        description: '敵の防御力を50%無視',
        rarity: 'rare',
        effect: { type: 'armor_piercing', ignore: 0.5 }
    },
    rampage: {
        id: 'rampage',
        name: '暴走',
        type: 'passive',
        description: '連続撃破で攻撃力が累積(最大5スタック、各+10%)',
        rarity: 'epic',
        effect: { type: 'rampage', max_stacks: 5, bonus_per_stack: 0.1 }
    }
};

// レアリティ別のスキル出現確率
const SKILL_RARITY_WEIGHTS = {
    common: 60,   // 60%
    rare: 30,     // 30%
    epic: 10      // 10%
};

// 敵用スキルプール
const ENEMY_SKILL_POOL = {
    // 攻撃系
    enemy_power: {
        id: 'enemy_power',
        name: '猛攻',
        type: 'passive',
        description: '攻撃力+15%',
        rarity: 'common',
        effect: { type: 'damage_bonus', value: 0.15 }
    },
    enemy_speed: {
        id: 'enemy_speed',
        name: '疾走',
        type: 'passive',
        description: '移動速度+25%',
        rarity: 'common',
        effect: { type: 'move_speed', value: 0.25 }
    },
    enemy_armor: {
        id: 'enemy_armor',
        name: '鉄壁',
        type: 'passive',
        description: '最大HP+30%',
        rarity: 'common',
        effect: { type: 'max_hp_bonus', value: 0.3 }
    },
    enemy_regeneration: {
        id: 'enemy_regeneration',
        name: '自己再生',
        type: 'passive',
        description: '毎秒HP+1.5%回復',
        rarity: 'rare',
        effect: { type: 'hp_regen', value: 0.015 }
    },
    enemy_shield: {
        id: 'enemy_shield',
        name: 'バリア展開',
        type: 'passive',
        description: '戦闘開始時にバリア獲得',
        rarity: 'rare',
        effect: { type: 'barrier_on_spawn', value: 100 }
    },
    enemy_thorns: {
        id: 'enemy_thorns',
        name: '反射の棘',
        type: 'passive',
        description: '受けたダメージの20%を反射',
        rarity: 'rare',
        effect: { type: 'damage_reflect', value: 0.2 }
    },
    enemy_berserker: {
        id: 'enemy_berserker',
        name: 'バーサーカー',
        type: 'passive',
        description: 'HP50%以下で攻撃力+50%、速度+30%',
        rarity: 'epic',
        effect: { type: 'berserker', hp_threshold: 0.5, damage_bonus: 0.5, speed_bonus: 0.3 }
    },
    enemy_revenge: {
        id: 'enemy_revenge',
        name: '復讐',
        type: 'passive',
        description: '死亡時に周囲のモンスターに大ダメージ',
        rarity: 'epic',
        effect: { type: 'death_explosion', damage: 150, range: 3 }
    },
    enemy_life_drain: {
        id: 'enemy_life_drain',
        name: '生命吸収',
        type: 'passive',
        description: 'ダメージの25%をHP回復',
        rarity: 'rare',
        effect: { type: 'life_steal', value: 0.25 }
    },
    enemy_evasion: {
        id: 'enemy_evasion',
        name: '回避',
        type: 'passive',
        description: '20%の確率で攻撃を回避',
        rarity: 'rare',
        effect: { type: 'evasion', value: 0.2 }
    },

    // 追加の敵スキル
    enemy_assault: {
        id: 'enemy_assault',
        name: '強襲',
        type: 'passive',
        description: '移動速度+35%、攻撃力+20%',
        rarity: 'rare',
        effect: { type: 'assault', speed: 0.35, damage: 0.2 }
    },
    enemy_tank: {
        id: 'enemy_tank',
        name: '重装甲',
        type: 'passive',
        description: '最大HP+50%、移動速度-20%',
        rarity: 'rare',
        effect: { type: 'tank', hp: 0.5, speed: -0.2 }
    },
    enemy_rage: {
        id: 'enemy_rage',
        name: '怒り',
        type: 'passive',
        description: 'HPが減るほど攻撃力上昇(最大+80%)',
        rarity: 'epic',
        effect: { type: 'rage', max_bonus: 0.8 }
    },
    enemy_split: {
        id: 'enemy_split',
        name: '分裂',
        type: 'passive',
        description: '死亡時に50%の確率で2体に分裂',
        rarity: 'epic',
        effect: { type: 'split', chance: 0.5, count: 2 }
    },
    enemy_curse: {
        id: 'enemy_curse',
        name: '呪い',
        type: 'passive',
        description: '攻撃したモンスターの攻撃力-25%(10秒)',
        rarity: 'rare',
        effect: { type: 'curse', debuff: 0.25, duration: 10 }
    },
    enemy_poison: {
        id: 'enemy_poison',
        name: '毒の牙',
        type: 'passive',
        description: '攻撃時に毒付与(5秒、毎秒15ダメージ)',
        rarity: 'rare',
        effect: { type: 'poison', duration: 5, dps: 15 }
    },
    enemy_ghost: {
        id: 'enemy_ghost',
        name: '幽体化',
        type: 'passive',
        description: '罠のダメージを50%軽減',
        rarity: 'rare',
        effect: { type: 'ghost', trap_reduction: 0.5 }
    },
    enemy_rally: {
        id: 'enemy_rally',
        name: '鼓舞',
        type: 'passive',
        description: '周囲3タイルの味方の攻撃力+30%',
        rarity: 'rare',
        effect: { type: 'rally', range: 3, bonus: 0.3 }
    },
    enemy_fury: {
        id: 'enemy_fury',
        name: '狂乱',
        type: 'passive',
        description: '攻撃速度+40%、被ダメージ+20%',
        rarity: 'common',
        effect: { type: 'fury', attack_speed: 0.4, damage_taken: 0.2 }
    },
    enemy_vampire: {
        id: 'enemy_vampire',
        name: '吸血鬼',
        type: 'passive',
        description: 'ダメージの40%をHP回復、日光で弱体化',
        rarity: 'epic',
        effect: { type: 'vampire', life_steal: 0.4 }
    },
    enemy_shield_wall: {
        id: 'enemy_shield_wall',
        name: 'シールドウォール',
        type: 'passive',
        description: '前方からのダメージ-60%',
        rarity: 'rare',
        effect: { type: 'shield_wall', reduction: 0.6 }
    },
    enemy_phasing: {
        id: 'enemy_phasing',
        name: '位相移動',
        type: 'passive',
        description: '3秒毎に0.5秒間無敵',
        rarity: 'epic',
        effect: { type: 'phasing', interval: 3, duration: 0.5 }
    },
    enemy_summoner: {
        id: 'enemy_summoner',
        name: '召喚師',
        type: 'passive',
        description: '死亡時に弱い敵を2体召喚',
        rarity: 'epic',
        effect: { type: 'summoner', count: 2 }
    },
    enemy_toxic_cloud: {
        id: 'enemy_toxic_cloud',
        name: '毒霧',
        type: 'passive',
        description: '周囲2タイルに毎秒5ダメージ',
        rarity: 'rare',
        effect: { type: 'toxic_cloud', range: 2, dps: 5 }
    },
    enemy_undying: {
        id: 'enemy_undying',
        name: '不死',
        type: 'passive',
        description: '致死ダメージを1度だけ1HPで耐える',
        rarity: 'epic',
        effect: { type: 'undying', uses: 1 }
    }
};

// 色定数
const COLOR_CONSTANTS = {
    // 敵の色
    ENEMY_THIEF: '#9f7aea',
    ENEMY_WARRIOR: '#e53e3e',
    ENEMY_RANGER: '#48bb78',
    ENEMY_CLERIC: '#ecc94b',
    ENEMY_ELEMENTALIST: '#4299e1',
    ENEMY_SIEGE: '#805ad5',
    ENEMY_FLYING: '#ed8936',
    ENEMY_BOSS: '#ffd700',
    ENEMY_DEFAULT: '#718096',

    // モンスターの色
    MONSTER_SKELETON: '#a0aec0',
    MONSTER_SLIME: '#48bb78',
    MONSTER_GOBLIN: '#ed8936',
    MONSTER_GARGOYLE: '#805ad5',
    MONSTER_WISP: '#4299e1',
    MONSTER_DEFAULT: '#718096',

    // 罠の色
    TRAP_SPIKE: '#e53e3e',
    TRAP_ARROW: '#805ad5',
    TRAP_OIL: '#dd6b20',
    TRAP_FIRE: '#f56565',
    TRAP_ICE: '#4299e1',
    TRAP_PUSH: '#48bb78',
    TRAP_MINE: '#ed8936',
    TRAP_CONFUSION: '#9f7aea',
    TRAP_DEFAULT: '#718096',

    // UI色
    HP_BAR_BACKGROUND: '#333',
    HP_BAR_FOREGROUND: '#f56565',
    HP_BAR_FRIENDLY: '#48bb78',
    BARRIER_COLOR: '#4299e1',
    SELECTION_COLOR: '#ffd700',

    // ダメージ表示
    DAMAGE_NORMAL: '#ff6565',
    DAMAGE_CRITICAL: '#ffff00',

    // グリッド
    GRID_BACKGROUND: '#0f0f1e',
    GRID_LINE: '#1a202c',
    GRID_SPAWN: '#48bb78',
    GRID_CORE: '#f56565',
    GRID_PATH: '#4a5568',
    GRID_ELEVATED: '#805ad5',
    GRID_PIT: '#1a202c',
    GRID_EMPTY: '#2d3748'
};
