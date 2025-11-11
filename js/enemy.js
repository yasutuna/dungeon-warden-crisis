const ENEMY_BEHAVIOR_PROFILES = {
    normal: {
        advance: 1.0,
        pressure_traps: 0.6,
        hunt: 0.8,
        support: 0.4,
        regroup: 0.3
    },
    cautious: {
        advance: 0.9,
        pressure_traps: 1.1,
        hunt: 0.5,
        support: 0.6,
        regroup: 0.6
    },
    aggressive: {
        advance: 1.2,
        pressure_traps: 0.3,
        hunt: 1.2,
        support: 0.2,
        regroup: 0.2
    },
    sniper: {
        advance: 0.9,
        pressure_traps: 0.5,
        hunt: 1.0,
        support: 0.3,
        regroup: 0.4
    },
    support: {
        advance: 0.7,
        pressure_traps: 0.4,
        hunt: 0.3,
        support: 1.3,
        regroup: 0.9
    }
};

const ENEMY_INTENT_SPEED_MODIFIERS = {
    advance: 1.05,
    pressure_traps: 0.85,
    hunt: 1.0,
    support: 1.1,
    regroup: 0.75
};

const ENEMY_INTENT_ORDER = ['advance', 'pressure_traps', 'hunt', 'support', 'regroup'];

function pickIntentByWeight(weights) {
    let total = 0;
    for (const intent of ENEMY_INTENT_ORDER) {
        const weight = Math.max(0, weights[intent] || 0);
        total += weight;
    }

    if (total <= 0) {
        return 'advance';
    }

    let roll = Math.random() * total;
    for (const intent of ENEMY_INTENT_ORDER) {
        const weight = Math.max(0, weights[intent] || 0);
        if (weight === 0) continue;
        roll -= weight;
        if (roll <= 0) {
            return intent;
        }
    }

    return 'advance';
}

function pickRandomIntent() {
    const idx = Math.floor(Math.random() * ENEMY_INTENT_ORDER.length);
    return ENEMY_INTENT_ORDER[idx] || 'advance';
}

function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

const ENEMY_CARDINAL_DIRECTIONS = {
    up: { name: 'up', dx: 0, dy: -1 },
    down: { name: 'down', dx: 0, dy: 1 },
    left: { name: 'left', dx: -1, dy: 0 },
    right: { name: 'right', dx: 1, dy: 0 }
};
const ENEMY_DIRECTION_ORDER = ['up', 'down', 'left', 'right'];
/**
 * 敵クラス
 * プレイヤーのコアを目指して侵攻してくる敵ユニット
 */
class Enemy {
    // 定数は constants.js から取得
    static WAYPOINT_REACH_DISTANCE = PATHFINDING_CONSTANTS.WAYPOINT_REACH_DISTANCE;
    static BOSS_HEAL_THRESHOLD = ENEMY_AI_CONSTANTS.BOSS_HEAL_THRESHOLD;
    static DISARM_DURATION = ENEMY_AI_CONSTANTS.DISARM_DURATION;
    static SHATTER_MULTIPLIER = COMBAT_CONSTANTS.SHATTER_MULTIPLIER;

    constructor(data, path, game, level = 1) {
        this.data = deepCopy(data);
        this.id = data.id;
        this.name = data.name;
        this.level = level;

        // レベルに応じてステータスをスケーリング
        const scaling = data.levelScaling || {
            hpMultiplier: 1.0,
            damageMultiplier: 1.0,
            rewardMultiplier: 1.0
        };

        const levelMultiplier = level - 1; // レベル1は基本値
        const hpScale = Math.pow(scaling.hpMultiplier, levelMultiplier);
        const damageScale = Math.pow(scaling.damageMultiplier, levelMultiplier);
        const rewardScale = Math.pow(scaling.rewardMultiplier, levelMultiplier);

        this.hp = Math.floor(data.hp * hpScale);
        this.maxHp = Math.floor(data.maxHp * hpScale);
        this.speed = data.speed;
        this.baseSpeed = data.speed;
        this.moveSpeed = data.speed;
        this.flying = data.flying || false;
        this.abilities = data.abilities || [];
        this.resist = data.resist || {};
        this.dead = false;
        this.reachedCore = false;
        this.counted = false;
        this.rewarded = false;

        // スキルシステム（高速検索用）
        this.skillMap = new Map();

        // 攻撃アニメーション用
        this.attackAnimationTimer = 0;
        this.isAttackAnimating = false;
        this.attackTarget = null;

        // 攻撃力のスケーリング（攻撃を持つ敵のみ）
        if (this.data.attack && this.data.attack.damage) {
            this.data.attack.damage = Math.floor(this.data.attack.damage * damageScale);
        }

        // 回復量のスケーリング（ヒーラーのみ）
        if (this.data.heal && this.data.heal.amount) {
            this.data.heal.amount = Math.floor(this.data.heal.amount * damageScale);
        }

        // バリアのスケーリング
        if (this.data.barrier && this.data.barrier.amount) {
            this.data.barrier.amount = Math.floor(this.data.barrier.amount * damageScale);
        }

        // 自己回復のスケーリング
        if (this.data.selfHeal && this.data.selfHeal.amount) {
            this.data.selfHeal.amount = Math.floor(this.data.selfHeal.amount * damageScale);
        }

        // 経路
        this.path = path;
        this.pathIndex = 0;
        this.pathProgress = 0;
        this.stepTargetTile = null;
        this.stepTargetWorld = null;
        this.currentDirectionName = null;
        this.forceDirectionChange = false;

        // 位置
        const startPos = game.grid.gridToWorld(path[0].x, path[0].y);
        this.x = startPos.x;
        this.y = startPos.y;

        // AI
        this.attackCooldown = 0;
        this.healCooldown = 0;
        this.barrierCooldown = 0;
        this.stunned = false;
        this.confused = false;
        this.statusEffects = new StatusEffectManager(this);

        // 罠検知
        this.detectRadius = data.detectRadius || 0;
        this.disarmProgress = 0;
        this.disarmingTrap = null;

        // 報酬（レベルスケーリング適用）
        this.soulReward = Math.floor((data.soulReward || 5) * rewardScale);
        this.manaReward = Math.floor((data.manaReward || 1) * rewardScale);

        // ボス
        this.boss = data.boss || false;
        this.holyZoneCooldown = 0;
        this.selfHealCooldown = 0;

        // 脆弱性フラグ
        this.vulnerableToShatter = false;
        this.fireVulnerability = 1.0;
        this.healingReceivedMultiplier = 1.0;

        // バリア
        this.barrier = 0;

        // 聖域エフェクト
        this.holyZoneEffect = null;

        // スキルシステム
        this.learnedSkills = []; // 習得したスキルのリスト
        this.damageBonus = 0; // 攻撃力ボーナス
        this.speedBonus = 0; // 速度ボーナス
        this.damageReflect = 0; // ダメージ反射率
        this.evasionChance = 0; // 回避率
        this.lifeStealRate = 0; // 吸血率

        // レベルに応じてスキルを獲得
        this.initializeSkillsForLevel();

        // 行動意図
        this.behaviorProfile = this.createBehaviorProfile(this.data.aiType);
        this.currentIntent = 'advance';
        this.intentTimer = this.getNextIntentDuration();
        this.tacticalSnapshot = null;
        this.intentBias = this.generateIntentBias();
        this.actionPreference = this.generateActionPreference();
        this.speedJitterFactor = 1;
        this.speedJitterTimer = 0;
    }

    initializeSkillsForLevel() {
        // レベル2以上の敵はスキルを持ってスポーンする
        const skillCount = Math.floor(this.level / 2);
        for (let i = 0; i < skillCount; i++) {
            this.learnRandomSkill();
        }
    }

    createBehaviorProfile(aiType = 'normal') {
        const baseProfile = ENEMY_BEHAVIOR_PROFILES[aiType] || ENEMY_BEHAVIOR_PROFILES.normal;
        return Object.assign({}, baseProfile);
    }

    getNextIntentDuration() {
        const min = ENEMY_AI_CONSTANTS.INTENT_MIN_DURATION || 1.5;
        const max = ENEMY_AI_CONSTANTS.INTENT_MAX_DURATION || (min + 1);
        const span = Math.max(0.1, max - min);
        return min + Math.random() * span;
    }

    generateIntentBias() {
        const variance = ENEMY_AI_CONSTANTS.INTENT_PERSONALITY_VARIANCE || 0.2;
        const bias = {};
        for (const intent of ENEMY_INTENT_ORDER) {
            bias[intent] = randomInRange(-variance, variance);
        }
        return bias;
    }

    generateActionPreference() {
        const variance = ENEMY_AI_CONSTANTS.ACTION_PREF_VARIANCE || 0.2;
        return {
            ranged_attack: randomInRange(-variance, variance),
            area_attack: randomInRange(-variance, variance),
            heal: randomInRange(-variance, variance),
            barrier: randomInRange(-variance, variance)
        };
    }

    learnRandomSkill() {
        // 習得可能なスキルをフィルタリング
        const availableSkills = [];
        for (const skillId in ENEMY_SKILL_POOL) {
            const skill = ENEMY_SKILL_POOL[skillId];
            // まだ習得していないスキルのみ（Mapで高速チェック）
            if (!this.skillMap.has(skillId)) {
                availableSkills.push(skill);
            }
        }

        if (availableSkills.length === 0) {
            return null; // 全スキル習得済み
        }

        // レアリティに基づいて重み付き抽選
        const selectedSkill = this.selectSkillByRarity(availableSkills);

        if (selectedSkill) {
            this.learnedSkills.push(selectedSkill);
            this.skillMap.set(selectedSkill.id, selectedSkill); // Map に登録（高速検索用）
            this.applySkillEffect(selectedSkill);
            return selectedSkill;
        }

        return null;
    }

    selectSkillByRarity(skills) {
        // 共通関数を使用（utils.jsで定義）
        return selectSkillByRarity(skills, SKILL_RARITY_WEIGHTS);
    }

    applySkillEffect(skill) {
        const effect = skill.effect;

        switch (effect.type) {
            case 'damage_bonus':
                this.damageBonus += effect.value;
                // 攻撃力に反映
                if (this.data.attack && this.data.attack.damage) {
                    this.data.attack.damage = Math.floor(this.data.attack.damage * (1 + effect.value));
                }
                break;

            case 'move_speed':
                this.speedBonus += effect.value;
                this.baseSpeed = this.baseSpeed * (1 + effect.value);
                this.moveSpeed = this.baseSpeed;
                break;

            case 'max_hp_bonus':
                const hpBonus = Math.floor(this.maxHp * effect.value);
                this.maxHp += hpBonus;
                this.hp += hpBonus;
                break;

            case 'barrier_on_spawn':
                this.barrier = effect.value;
                break;

            case 'damage_reflect':
                this.damageReflect += effect.value;
                break;

            case 'life_steal':
                this.lifeStealRate += effect.value;
                break;

            case 'evasion':
                this.evasionChance += effect.value;
                break;

            // その他のスキルは戦闘時に動的に適用
            default:
                break;
        }
    }

    updateBehaviorState(deltaTime, game) {
        if (!game) return;

        const dt = Math.max(0, deltaTime || 0);
        this.updateSpeedJitter(dt);

        this.tacticalSnapshot = this.buildTacticalSnapshot(game);
        const forcedIntent = this.getForcedIntent(this.tacticalSnapshot);

        if (forcedIntent && forcedIntent !== this.currentIntent) {
            this.setIntent(forcedIntent);
            return;
        }

        const chaosChance = (ENEMY_AI_CONSTANTS.CHAOTIC_INTENT_CHANCE || 0) * dt;
        if (chaosChance > 0 && Math.random() < chaosChance) {
            this.setIntent(pickRandomIntent());
            return;
        }

        this.intentTimer -= dt;
        if (this.intentTimer > 0) {
            return;
        }

        const weights = this.computeIntentWeights(this.tacticalSnapshot);
        const nextIntent = pickIntentByWeight(weights);
        this.setIntent(nextIntent);
    }

    setIntent(intent) {
        this.currentIntent = intent || 'advance';
        this.intentTimer = this.getNextIntentDuration();
    }

    buildTacticalSnapshot(game) {
        const snapshot = {
            hpRatio: this.maxHp > 0 ? this.hp / this.maxHp : 0,
            pathProgress: this.pathProgress || 0,
            injuredAllies: [],
            nearbyTraps: [],
            nearbyMonsters: []
        };

        const allyThreshold = ENEMY_AI_CONSTANTS.SUPPORT_LOW_HP_THRESHOLD || 0.65;

        for (const enemy of game.enemies) {
            if (enemy.dead || enemy === this) continue;
            const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
            if (hpRatio < 1) {
                const dist = distance(this.x, this.y, enemy.x, enemy.y);
                snapshot.injuredAllies.push({ enemy, hpRatio, dist, critical: hpRatio < allyThreshold });
            }
        }

        const trapRange = Math.max(1, this.detectRadius || 1) * game.grid.tileSize * 1.5;
        for (const trap of game.traps) {
            if (trap.destroyed) continue;
            const trapPos = game.grid.gridToWorld(trap.gridX, trap.gridY);
            const dist = distance(this.x, this.y, trapPos.x, trapPos.y);
            if (dist <= trapRange) {
                const danger = this.calculateTrapDanger(trap);
                snapshot.nearbyTraps.push({ trap, dist, danger });
            }
        }
        snapshot.trapDangerScore = snapshot.nearbyTraps.reduce((sum, info) => sum + info.danger, 0);

        const monsterRange = (this.data.attack ? this.data.attack.range : 1) * game.grid.tileSize * 1.75;
        for (const monster of game.monsters) {
            if (monster.dead) continue;
            const dist = distance(this.x, this.y, monster.x, monster.y);
            if (dist <= monsterRange) {
                snapshot.nearbyMonsters.push({ monster, dist });
            }
        }

        return snapshot;
    }

    calculateTrapDanger(trap) {
        if (!trap || !trap.data || !trap.data.effect) {
            return 0;
        }

        const effect = trap.data.effect;
        let danger = 0;
        if (effect.damage) danger += effect.damage;
        if (effect.instant) danger += effect.instant;
        if (effect.dot) {
            danger += (effect.dot.dps || 0) * (effect.dot.duration || 0);
        }
        if (effect.slow && effect.slow.amount) {
            danger += effect.slow.amount * 20;
        }

        return danger;
    }

    computeIntentWeights(snapshot) {
        const weights = this.createBehaviorProfile(this.data.aiType);
        for (const intent of ENEMY_INTENT_ORDER) {
            weights[intent] = (weights[intent] || 0) + (this.intentBias[intent] || 0);
        }

        if (!snapshot) {
            return weights;
        }

        const hpRatio = snapshot.hpRatio || 0;
        const allyCount = snapshot.injuredAllies.length;
        const criticalAllies = snapshot.injuredAllies.filter(a => a.critical).length;
        const trapCount = snapshot.nearbyTraps.length;
        const monsterCount = snapshot.nearbyMonsters.length;

        weights.advance += Math.max(0, 1 - (snapshot.pathProgress || 0)) * 0.4;
        weights.hunt += monsterCount * 0.3;
        weights.pressure_traps += trapCount * 0.2 + (snapshot.trapDangerScore || 0) * 0.002;
        weights.support += allyCount * 0.2 + criticalAllies * 0.4;
        weights.regroup += Math.max(0, (ENEMY_AI_CONSTANTS.RETREAT_HP_THRESHOLD || 0.3) - hpRatio) * 2;

        // Sticky intent keeps variety without thrashing
        weights[this.currentIntent] = (weights[this.currentIntent] || 0) + 0.2;

        const noise = ENEMY_AI_CONSTANTS.INTENT_RANDOM_NOISE || 0.2;
        for (const intent of ENEMY_INTENT_ORDER) {
            weights[intent] = (weights[intent] || 0) + Math.random() * noise;
        }

        return weights;
    }

    updateSpeedJitter(deltaTime) {
        const variance = ENEMY_AI_CONSTANTS.MICRO_SPEED_JITTER || 0;
        if (variance <= 0) {
            this.speedJitterFactor = 1;
            return;
        }

        this.speedJitterTimer -= deltaTime;
        if (this.speedJitterTimer <= 0 || !isFinite(this.speedJitterTimer)) {
            this.speedJitterFactor = 1 + randomInRange(-variance, variance);
            this.speedJitterTimer = 0.8 + Math.random() * 1.2;
        }
    }

    getForcedIntent(snapshot) {
        if (!snapshot) return null;

        const hpRatio = snapshot.hpRatio || 0;
        const retreatThreshold = ENEMY_AI_CONSTANTS.RETREAT_HP_THRESHOLD || 0.3;
        if (!this.boss && hpRatio <= retreatThreshold) {
            return 'regroup';
        }

        const lowHpAllies = snapshot.injuredAllies.filter(a => a.critical);
        if (lowHpAllies.length > 0 && (this.abilities.includes('heal') || this.abilities.includes('barrier'))) {
            return 'support';
        }

        if (snapshot.trapDangerScore > 60 && this.abilities.includes('disarm')) {
            return 'pressure_traps';
        }

        return null;
    }

    update(deltaTime, game) {
        if (this.dead || this.reachedCore) return;

        // 攻撃アニメーション更新
        if (this.attackAnimationTimer > 0) {
            this.attackAnimationTimer -= deltaTime;
            if (this.attackAnimationTimer <= 0) {
                this.isAttackAnimating = false;
                this.attackTarget = null;
            }
        }

        // 状態異常更新
        this.statusEffects.update(deltaTime, game);

        this.updateBehaviorState(deltaTime, game);

        // スタン中は移動しない
        if (this.stunned) {
            return;
        }

        // スキルエフェクトを適用
        this.applyPassiveSkillEffects(deltaTime, game);

        // 能力の更新
        this.updateAbilities(deltaTime, game);

        // 移動
        this.move(deltaTime, game);
    }

    applyPassiveSkillEffects(deltaTime, game) {
        // 自己再生スキル（HP自然回復）
        const regeneration = this.skillMap.get('enemy_regeneration');
        if (regeneration) {
            const healAmount = this.maxHp * regeneration.effect.value * deltaTime;
            this.receiveHealing(healAmount, this);
        }

        // バーサーカースキル（低HP時のバフ）
        const berserker = this.skillMap.get('enemy_berserker');
        if (berserker && this.hp / this.maxHp <= berserker.effect.hp_threshold) {
            // 一時的な速度ボーナス
            this.moveSpeed = this.baseSpeed * (1 + berserker.effect.speed_bonus);
        } else {
            this.moveSpeed = this.baseSpeed;
        }
    }

    move(deltaTime, game) {
        if (this.pathIndex >= this.path.length) {
            this.reachedCore = true;
            return;
        }

        // 近くの罠を探す（攻撃可能な罠のみ）
        const nearbyTrap = this.findNearbyTrap(game);
        if (nearbyTrap) {
            const trapPos = game.grid.gridToWorld(nearbyTrap.gridX, nearbyTrap.gridY);
            const dist = distance(this.x, this.y, trapPos.x, trapPos.y);
            const attackRange = this.data.attack
                ? this.data.attack.range * game.grid.tileSize
                : game.grid.tileSize * 0.8;

            if (dist <= attackRange) {
                this.clearStepTarget();
                this.combatTrap(nearbyTrap, deltaTime, game);
                return;
            } else {
                this.clearStepTarget();
                this.moveTowardsTrap(nearbyTrap, deltaTime, game);
                return;
            }
        }

        // 近くのモンスターを探索
        const nearbyMonster = this.findNearbyMonster(game);

        if (nearbyMonster) {
            // 攻撃範囲内かチェック
            const dist = distance(this.x, this.y, nearbyMonster.x, nearbyMonster.y);
            const attackRange = this.data.attack
                ? this.data.attack.range * game.grid.tileSize
                : game.grid.tileSize * 0.8;

            if (dist <= attackRange) {
                // 射程内: 戦闘モード(移動停止)
                this.clearStepTarget();
                this.combatMonster(nearbyMonster, deltaTime, game);
                return;
            } else {
                // 射程外: モンスターに向かって移動
                this.clearStepTarget();
                this.moveTowardsMonster(nearbyMonster, deltaTime, game);
                return;
            }
        }

        // AI行動パターンを適用
        this.applyAIBehavior(game);

        this.ensureStepTarget(game);

        if (!this.stepTargetWorld) {
            return;
        }

        this.advanceTowardsStepTarget(deltaTime, game);
    }

    clearStepTarget(resetForce = true) {
        this.stepTargetTile = null;
        this.stepTargetWorld = null;
        if (resetForce) {
            this.forceDirectionChange = false;
        }
    }

    ensureStepTarget(game) {
        if (this.stepTargetTile) {
            if (this.isTileBlocked(this.stepTargetTile.x, this.stepTargetTile.y, game)) {
                this.forceDirectionChange = true;
                this.clearStepTarget(false);
            } else {
                return;
            }
        }

        const currentTile = game.grid.worldToGrid(this.x, this.y);
        if (!currentTile) {
            return;
        }

        const direction = this.chooseRandomDirection(currentTile, game, this.forceDirectionChange);
        this.forceDirectionChange = false;

        if (!direction) {
            return;
        }

        const targetTile = {
            x: currentTile.x + direction.dx,
            y: currentTile.y + direction.dy
        };

        this.stepTargetTile = targetTile;
        this.stepTargetWorld = game.grid.gridToWorld(targetTile.x, targetTile.y);
        this.currentDirectionName = direction.name;
    }

    chooseRandomDirection(currentTile, game, forcedChange = false) {
        const forwardDir = this.getForwardDirection(currentTile);
        const attempted = new Set();

        for (let i = 0; i < 8; i++) {
            const continueRoll = forcedChange ? 1 : Math.random();
            let candidateName = null;

            if (continueRoll < 0.6 && forwardDir) {
                candidateName = forwardDir.name;
            } else {
                const directionRoll = Math.random();
                if (directionRoll < 0.25) {
                    candidateName = 'up';
                } else if (directionRoll < 0.5) {
                    candidateName = 'down';
                } else if (directionRoll < 0.75) {
                    candidateName = 'left';
                } else {
                    candidateName = 'right';
                }
            }

            forcedChange = false;

            if (attempted.has(candidateName)) {
                if (attempted.size >= 4) {
                    break;
                }
                continue;
            }

            attempted.add(candidateName);

            if (this.canMoveToDirection(candidateName, currentTile, game)) {
                return ENEMY_CARDINAL_DIRECTIONS[candidateName];
            }

            if (forwardDir && candidateName === forwardDir.name) {
                forcedChange = true;
            }
        }

        for (const dirName of ENEMY_DIRECTION_ORDER) {
            if (this.canMoveToDirection(dirName, currentTile, game)) {
                return ENEMY_CARDINAL_DIRECTIONS[dirName];
            }
        }

        return null;
    }

    getForwardDirection(currentTile) {
        if (!this.path || this.path.length === 0) {
            return null;
        }

        for (let i = this.pathIndex; i < this.path.length; i++) {
            const waypoint = this.path[i];
            if (!waypoint) continue;

            if (waypoint.x === currentTile.x && waypoint.y === currentTile.y) {
                continue;
            }

            const diffX = waypoint.x - currentTile.x;
            const diffY = waypoint.y - currentTile.y;

            if (Math.abs(diffX) >= Math.abs(diffY)) {
                if (diffX > 0) return ENEMY_CARDINAL_DIRECTIONS.right;
                if (diffX < 0) return ENEMY_CARDINAL_DIRECTIONS.left;
            }

            if (diffY > 0) return ENEMY_CARDINAL_DIRECTIONS.down;
            if (diffY < 0) return ENEMY_CARDINAL_DIRECTIONS.up;
        }

        return null;
    }

    canMoveToDirection(directionName, currentTile, game) {
        const dir = ENEMY_CARDINAL_DIRECTIONS[directionName];
        if (!dir) return false;

        const targetX = currentTile.x + dir.dx;
        const targetY = currentTile.y + dir.dy;

        if (this.isTileBlocked(targetX, targetY, game)) {
            return false;
        }

        const worldPos = game.grid.gridToWorld(targetX, targetY);
        return !this.wouldCollideWithEnemy(worldPos.x, worldPos.y, game);
    }

    isTileBlocked(tileX, tileY, game) {
        const tile = game.grid.getTile(tileX, tileY);
        if (!tile || !tile.walkable) {
            return true;
        }

        // Friendly presence is handled via wouldCollideWithEnemy() so we allow entering
        // the tile to avoid deadlocks when allies queue up behind a single unit.
        return false;
    }

    advanceTowardsStepTarget(deltaTime, game) {
        if (!this.stepTargetWorld) {
            return;
        }

        const dx = this.stepTargetWorld.x - this.x;
        const dy = this.stepTargetWorld.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < Enemy.WAYPOINT_REACH_DISTANCE || dist === 0) {
            this.x = this.stepTargetWorld.x;
            this.y = this.stepTargetWorld.y;
            this.updateGridPosition(game);
            this.handleStepTargetReached();
            return;
        }

        const moveAmount = this.moveSpeed * game.grid.tileSize * deltaTime;
        const travel = Math.min(moveAmount, dist);
        const newX = this.x + (dx / dist) * travel;
        const newY = this.y + (dy / dist) * travel;

        if (this.wouldCollideWithEnemy(newX, newY, game)) {
            this.forceDirectionChange = true;
            this.clearStepTarget(false);
            return;
        }

        this.x = newX;
        this.y = newY;
        this.updateGridPosition(game);

        const remaining = distance(this.x, this.y, this.stepTargetWorld.x, this.stepTargetWorld.y);
        if (remaining < Enemy.WAYPOINT_REACH_DISTANCE) {
            this.handleStepTargetReached();
        }
    }

    handleStepTargetReached() {
        this.clearStepTarget();
    }


    /**
     * 指定位置で他の敵と衝突するかチェック
     */
    wouldCollideWithEnemy(x, y, game) {
        const collisionRadius = game.grid.tileSize * 0.3; // 衝突判定の半径

        for (const enemy of game.enemies) {
            if (enemy === this || enemy.dead) continue;

            const dist = distance(x, y, enemy.x, enemy.y);
            if (dist < collisionRadius) {
                return true;
            }
        }

        return false;
    }

    /**
     * グリッド上の位置を更新
     */
    updateGridPosition(game) {
        const gridPos = game.grid.worldToGrid(this.x, this.y);
        const oldGridPos = this.gridX !== undefined ? { x: this.gridX, y: this.gridY } : null;

        // 位置が変わった場合のみ更新
        if (!oldGridPos || oldGridPos.x !== gridPos.x || oldGridPos.y !== gridPos.y) {
            // 古いタイルから削除
            if (oldGridPos) {
                const oldTile = game.grid.getTile(oldGridPos.x, oldGridPos.y);
                if (oldTile && oldTile.enemy === this) {
                    oldTile.enemy = null;
                }
            }

            // 新しいタイルに登録（常にグリッド座標は更新する）
            const newTile = game.grid.getTile(gridPos.x, gridPos.y);
            this.gridX = gridPos.x;
            this.gridY = gridPos.y;
            // 落とし穴チェック: 空戦ユニット以外が落とし穴に入ったら即死
            // 敵ユニットは常に落とし穴の効果を受ける（自ユニットのドラッグは無関係）
            if (newTile && newTile.type === 'pit' && !this.flying) {
                console.log(`[落とし穴] ${this.name}が落とし穴に落ちました`);
                this.hp = 0;
                this.dead = true;
                game.ui.showMessage(`${this.name}が落とし穴に落ちて即死しました！`, 'success');
                // タイルに登録せずに終了
                return;
            }

            // 新しいタイルに他の敵がいない場合のみ登録
            // 既に他の敵がいる場合は上書きしない（複数の敵が同じタイルにいることは許容）
            if (newTile && !newTile.enemy) {
                newTile.enemy = this;
            }

            if (newTile) {
                this.updatePathProgressFromTile(newTile);
            }
        }
    }

    updatePathProgressFromTile(tile) {
        if (!this.path || this.path.length === 0) {
            return;
        }

        for (let i = this.pathIndex; i < this.path.length; i++) {
            const waypoint = this.path[i];
            if (!waypoint) continue;

            if (waypoint.x === tile.x && waypoint.y === tile.y) {
                this.pathIndex = i + 1;
                this.pathProgress = Math.min(1, this.pathIndex / this.path.length);
                break;
            }
        }

        if (tile.type === 'core' || this.pathIndex >= this.path.length) {
            this.reachedCore = true;
        }
    }

    findNearbyMonster(game) {
        // 近くのモンスターを探す（検知範囲内）
        // 検知範囲は攻撃範囲よりも広く設定
        const detectionRange = this.data.attack
            ? this.data.attack.range * game.grid.tileSize * 1.5 // 攻撃範囲の1.5倍
            : game.grid.tileSize * 1.2; // 接触判定より少し広め

        let closestMonster = null;
        let closestDist = Infinity;
        let taunterMonster = null; // 挑発持ちモンスター

        for (const monster of game.monsters) {
            if (monster.dead) continue;

            const dist = distance(this.x, this.y, monster.x, monster.y);

            // ゴーレムの挑発チェック
            if (monster.isTaunting && monster.taunt) {
                const tauntRange = monster.taunt.range * game.grid.tileSize;
                if (dist <= tauntRange) {
                    // 挑発範囲内にいる場合、ゴーレムを優先ターゲット
                    if (!taunterMonster || dist < distance(this.x, this.y, taunterMonster.x, taunterMonster.y)) {
                        taunterMonster = monster;
                    }
                }
            }

            // 通常の最近接モンスターも記録
            if (dist <= detectionRange && dist < closestDist) {
                closestMonster = monster;
                closestDist = dist;
            }
        }

        // 挑発モンスターがいる場合はそちらを優先
        return taunterMonster || closestMonster;
    }

    findNearbyTrap(game) {
        // 攻撃データがない場合は罠を探さない
        if (!this.data.attack) return null;

        // targets配列に"trap"が含まれていない場合は罠を探さない
        if (!this.data.attack.targets || !this.data.attack.targets.includes("trap")) {
            return null;
        }

        // 罠攻撃の制限：canDestroyAllTrapsがtrueの場合はすべての罠、それ以外は破壊可能な罠のみ
        const canDestroyAllTraps = this.data.attack.canDestroyAllTraps || false;

        const detectionRange = this.data.attack.range * game.grid.tileSize * 1.5;
        let closestTrap = null;
        let closestDist = Infinity;

        for (const trap of game.traps) {
            if (trap.destroyed) continue;

            // 罠の破壊可能性をチェック
            if (!canDestroyAllTraps && !(trap.data && trap.data.destructible)) {
                continue;
            }

            const trapPos = game.grid.gridToWorld(trap.gridX, trap.gridY);
            const dist = distance(this.x, this.y, trapPos.x, trapPos.y);

            if (dist <= detectionRange && dist < closestDist) {
                closestTrap = trap;
                closestDist = dist;
            }
        }

        return closestTrap;
    }

    moveTowardsTrap(trap, deltaTime, game) {
        const trapPos = game.grid.gridToWorld(trap.gridX, trap.gridY);
        const dx = trapPos.x - this.x;
        const dy = trapPos.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
            const moveAmount = this.moveSpeed * game.grid.tileSize * deltaTime;
            const newX = this.x + (dx / dist) * moveAmount;
            const newY = this.y + (dy / dist) * moveAmount;

            if (!this.wouldCollideWithEnemy(newX, newY, game)) {
                this.x = newX;
                this.y = newY;
                this.updateGridPosition(game);
            }
        }
    }

    combatTrap(trap, deltaTime, game) {
        if (!this.data.attack) return;

        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
            return;
        }

        this.isAttackAnimating = true;
        this.attackAnimationTimer = 0.3;
        this.attackTarget = trap;

        let damage = this.data.attack.damage;

        // バーサーカースキル（低HP時のダメージボーナス）
        const berserker = this.skillMap.get('enemy_berserker');
        if (berserker && this.hp / this.maxHp <= berserker.effect.hp_threshold) {
            damage = Math.floor(damage * (1 + berserker.effect.damage_bonus));
        }

        const trapPos = game.grid.gridToWorld(trap.gridX, trap.gridY);
        trap.takeDamage(damage);

        // ダメージエフェクト
        if (game.effectPool) {
            game.effectPool.createDamageText(trapPos.x, trapPos.y, damage, false);
        }

        this.attackCooldown = this.data.attack.interval;
    }

    moveTowardsMonster(monster, deltaTime, game) {
        // モンスターに向かって移動
        const dx = monster.x - this.x;
        const dy = monster.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
            const moveAmount = this.moveSpeed * game.grid.tileSize * deltaTime;
            const newX = this.x + (dx / dist) * moveAmount;
            const newY = this.y + (dy / dist) * moveAmount;

            // 他の敵との衝突チェック
            if (!this.wouldCollideWithEnemy(newX, newY, game)) {
                this.x = newX;
                this.y = newY;
                this.updateGridPosition(game);
            }
        }
    }

    combatMonster(monster, deltaTime, game) {
        // 攻撃を持たない敵は立ち止まるだけ（モンスターをすり抜けない）
        if (!this.data.attack) {
            return;
        }

        // 攻撃クールダウン更新
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
            return;
        }

        // 攻撃アニメーション開始
        this.isAttackAnimating = true;
        this.attackAnimationTimer = 0.3; // 0.3秒間アニメーション
        this.attackTarget = monster;

        // モンスターを攻撃
        let damage = this.data.attack.damage;

        // バーサーカースキル（低HP時のダメージボーナス）
        const berserker = this.skillMap.get('enemy_berserker');
        if (berserker && this.hp / this.maxHp <= berserker.effect.hp_threshold) {
            damage = Math.floor(damage * (1 + berserker.effect.damage_bonus));
        }

        const oldHp = monster.hp;
        const actualDamage = game.combatSystem.applyDamage(monster, damage, 'physical', this);

        // 吸血スキル
        if (this.lifeStealRate > 0 && actualDamage > 0) {
            const healAmount = Math.floor(actualDamage * this.lifeStealRate);
            this.receiveHealing(healAmount, this);
        }

        // ダメージエフェクト
        game.effectPool.createDamageText(monster.x, monster.y, actualDamage, false);

        // 攻撃クールダウンをリセット
        this.attackCooldown = this.data.attack.interval || 1.0;
    }

    applyAIBehavior(game) {
        const intent = this.currentIntent || 'advance';
        const intentModifier = ENEMY_INTENT_SPEED_MODIFIERS[intent] || 1;
        let speed = this.baseSpeed * intentModifier;

        const archetypeModifier = this.applyArchetypeBehavior(game);
        speed *= archetypeModifier;
        const jitter = this.speedJitterFactor || 1;
        speed *= jitter;

        const minSpeed = this.baseSpeed * 0.4;
        const maxSpeed = this.baseSpeed * 1.8;
        this.moveSpeed = Math.max(minSpeed, Math.min(maxSpeed, speed));
    }

    applyArchetypeBehavior(game) {
        const aiType = this.data.aiType || 'normal';

        switch(aiType) {
            case 'cautious':
                return this.cautiousBehavior(game);
            case 'aggressive':
                return this.aggressiveBehavior();
            case 'sniper':
                return this.sniperBehavior(game);
            case 'support':
                return this.supportBehavior(game);
            default:
                return 1;
        }
    }

    cautiousBehavior(game) {
        const nearbyTraps = game.traps.filter(trap => {
            const trapPos = game.grid.gridToWorld(trap.gridX, trap.gridY);
            const dist = distance(this.x, this.y, trapPos.x, trapPos.y);
            return dist < game.grid.tileSize * 2 && !trap.destroyed;
        });

        if (nearbyTraps.length > 0) {
            return 0.5;
        }

        return 1.1;
    }

    aggressiveBehavior() {
        if (this.hp < this.maxHp * 0.5 && this.data.chargeSpeed) {
            return this.data.chargeSpeed;
        }

        return 1;
    }

    sniperBehavior(game) {
        const nearbyMonsters = game.monsters.filter(monster => {
            if (monster.dead) return false;
            const dist = distance(this.x, this.y, monster.x, monster.y);
            return dist < game.grid.tileSize * 2;
        });

        if (nearbyMonsters.length > 0) {
            return 0.7;
        }

        return 1;
    }

    supportBehavior(game) {
        const injuredAllies = game.enemies.filter(enemy => {
            return !enemy.dead && enemy !== this && enemy.hp < enemy.maxHp * 0.7;
        });

        if (injuredAllies.length > 0) {
            return 1.2;
        }

        return 1;
    }

    updateAbilities(deltaTime, game) {
        if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;
        if (this.healCooldown > 0) this.healCooldown -= deltaTime;
        if (this.barrierCooldown > 0) this.barrierCooldown -= deltaTime;
        if (this.selfHealCooldown > 0) this.selfHealCooldown -= deltaTime;
        if (this.holyZoneCooldown > 0) this.holyZoneCooldown -= deltaTime;

        const candidates = this.buildActionCandidates(game);
        const selectionVariance = ENEMY_AI_CONSTANTS.ACTION_SELECTION_VARIANCE || 0.2;

        for (const candidate of candidates) {
            const preference = this.actionPreference[candidate.name] || 0;
            candidate.score = Math.max(0, candidate.score + preference);
            candidate.orderScore = candidate.score + Math.random() * selectionVariance;
        }

        candidates.sort((a, b) => (b.orderScore || 0) - (a.orderScore || 0));

        for (const candidate of candidates) {
            if (candidate.score <= 0) continue;
            if (candidate.cooldownKey && this[candidate.cooldownKey] > 0) continue;
            const executed = candidate.execute();
            if (executed && typeof candidate.afterExecute === 'function') {
                candidate.afterExecute();
            }
        }

        if (this.abilities.includes('disarm')) {
            this.attemptDisarm(deltaTime, game);
        }

        if (this.boss) {
            if (this.selfHealCooldown <= 0 && this.hp < this.maxHp * Enemy.BOSS_HEAL_THRESHOLD) {
                this.selfHeal();
            }

            if (this.holyZoneCooldown <= 0) {
                this.createHolyZone(game);
            }
        }

        if (this.holyZoneEffect) {
            this.holyZoneEffect.duration -= deltaTime;
            if (this.holyZoneEffect.duration > 0) {
                this.receiveHealing(this.holyZoneEffect.healPerSec * deltaTime, this);
            } else {
                this.holyZoneEffect = null;
            }
        }
    }


    buildActionCandidates(game) {
        const candidates = [];
        if (!game) {
            return candidates;
        }

        if (this.abilities.includes('ranged_attack') && this.data.attack && this.attackCooldown <= 0) {
            const rangedScore = this.evaluateRangedAction(game);
            if (rangedScore > 0) {
                candidates.push({
                    name: 'ranged_attack',
                    score: rangedScore,
                    cooldownKey: 'attackCooldown',
                    execute: () => this.rangedAttack(game)
                });
            }
        }

        if (this.abilities.includes('area_attack') && this.data.attack && this.data.attack.areaRadius && this.attackCooldown <= 0) {
            const areaPlan = this.planAreaAttack(game);
            if (areaPlan && areaPlan.hitCount > 0) {
                const baseScore = 1 + areaPlan.hitCount * 0.5;
                const intentBonus = this.currentIntent === 'hunt' ? 0.4 : 0;
                candidates.push({
                    name: 'area_attack',
                    score: baseScore + intentBonus,
                    cooldownKey: 'attackCooldown',
                    execute: () => this.areaAttack(game, areaPlan)
                });
            }
        }

        if (this.abilities.includes('heal') && this.data.heal && this.healCooldown <= 0) {
            const healScore = this.evaluateHealAction(game);
            if (healScore.score > 0) {
                candidates.push({
                    name: 'heal',
                    score: healScore.score,
                    cooldownKey: 'healCooldown',
                    execute: () => this.healAllies(game, healScore.targets)
                });
            }
        }

        if (this.abilities.includes('barrier') && this.data.barrier && this.barrierCooldown <= 0) {
            const barrierScore = this.evaluateBarrierAction(game);
            if (barrierScore.score > 0) {
                candidates.push({
                    name: 'barrier',
                    score: barrierScore.score,
                    cooldownKey: 'barrierCooldown',
                    execute: () => this.applyBarrier(game, barrierScore.targets)
                });
            }
        }

        return candidates;
    }


    rangedAttack(game) {
        // データ構造の検証（エラーログ強化）
        if (!this.data.attack || !this.data.attack.range || !this.data.attack.damage) {
            if (!this.data.attack) {
                console.warn(`${this.name}(ID:${this.data.id})のattackデータが未定義です。攻撃をスキップします。`);
            } else if (!this.data.attack.range) {
                console.warn(`${this.name}(ID:${this.data.id})のattack.rangeが未定義です。現在のattackデータ:`, this.data.attack);
            } else if (!this.data.attack.damage) {
                console.warn(`${this.name}(ID:${this.data.id})のattack.damageが未定義です。現在のattackデータ:`, this.data.attack);
            }
            return false;
        }

        if (this.attackCooldown > 0) {
            return false;
        }

        // 近くの罠またはモンスターを攻撃
        // targets配列をチェックして、罠を攻撃対象に含むか確認
        const canTargetTraps = this.data.attack.targets && this.data.attack.targets.includes("trap");

        // 罠攻撃の制限：canDestroyAllTrapsがtrueの場合はすべての罠、それ以外は破壊可能な罠のみ
        const canDestroyAllTraps = this.data.attack.canDestroyAllTraps || false;
        const attackableTraps = canTargetTraps ? game.traps.filter(trap => {
            if (trap.destroyed) return false;
            return canDestroyAllTraps || (trap.data && trap.data.destructible);
        }) : [];
        const targets = [...attackableTraps, ...game.monsters];
        let closestTarget = null;
        let closestDist = Infinity;
        const attackRange = this.data.attack.range * game.grid.tileSize;

        for (const target of targets) {
            if (target.dead || target.destroyed) continue;

            let targetX, targetY;

            // バグ修正: グリッド座標とワールド座標の統一
            if (target.gridX !== undefined && target.gridY !== undefined) {
                // グリッドベースの対象（罠など）- ワールド座標に変換
                const pos = game.grid.gridToWorld(target.gridX, target.gridY);
                targetX = pos.x;
                targetY = pos.y;
            } else if (target.x !== undefined && target.y !== undefined) {
                // ワールド座標ベースの対象（モンスター）
                targetX = target.x;
                targetY = target.y;
            } else {
                // 座標が不明な場合はスキップ
                console.warn('攻撃対象の座標が不明:', target);
                continue;
            }

            // 距離計算（ワールド座標で統一）
            const dist = distance(this.x, this.y, targetX, targetY);

            if (dist < attackRange && dist < closestDist) {
                closestDist = dist;
                closestTarget = target;
            }
        }

        if (!closestTarget) {
            return false;
        }

        // 攻撃アニメーション開始
        this.isAttackAnimating = true;
        this.attackAnimationTimer = 0.3;
        this.attackTarget = closestTarget;

        closestTarget.takeDamage(this.data.attack.damage);
        this.attackCooldown = this.data.attack.interval;

        return true;
    }

    areaAttack(game, attackPlan = null) {
        if (!this.data.attack || !this.data.attack.range || !this.data.attack.damage || !this.data.attack.areaRadius) {
            console.warn(`${this.name}(ID:${this.data.id})の範囲攻撃データが不完全です。`);
            return false;
        }

        const plan = attackPlan || this.planAreaAttack(game);
        if (!plan) {
            return false;
        }

        // targets配列をチェックして、罠を攻撃対象に含むか確認
        const canTargetTraps = this.data.attack.targets && this.data.attack.targets.includes("trap");

        // 罠攻撃の制限：canDestroyAllTrapsがtrueの場合はすべての罠、それ以外は破壊可能な罠のみ
        const canDestroyAllTraps = this.data.attack.canDestroyAllTraps || false;
        const attackableTraps = canTargetTraps ? game.traps.filter(trap => {
            if (trap.destroyed) return false;
            return canDestroyAllTraps || (trap.data && trap.data.destructible);
        }) : [];
        const targets = [...attackableTraps, ...game.monsters];
        this.isAttackAnimating = true;
        this.attackAnimationTimer = 0.5;
        this.attackTarget = plan.primaryTarget;
        this.attackTargetPos = plan.position;

        for (const target of targets) {
            if (target.dead || target.destroyed) continue;

            let tx, ty;
            if (target.gridX !== undefined && target.gridY !== undefined) {
                const pos = game.grid.gridToWorld(target.gridX, target.gridY);
                tx = pos.x;
                ty = pos.y;
            } else if (target.x !== undefined && target.y !== undefined) {
                tx = target.x;
                ty = target.y;
            } else {
                continue;
            }

            const areaDist = distance(plan.position.x, plan.position.y, tx, ty);
            if (areaDist <= plan.areaRadius) {
                const actualDamage = target.takeDamage ?
                    target.takeDamage(this.data.attack.damage) :
                    this.data.attack.damage;

                if (game.effectPool) {
                    game.effectPool.createDamageText(tx, ty, actualDamage || this.data.attack.damage, false);
                }
            }
        }

        if (game.effectPool) {
            game.effectPool.createExplosion(plan.position.x, plan.position.y, plan.areaRadius);
        }

        this.attackCooldown = this.data.attack.interval;
        return true;
    }

    planAreaAttack(game) {
        if (!game || !this.data.attack || !this.data.attack.range || !this.data.attack.areaRadius) {
            return null;
        }

        // targets配列をチェックして、罠を攻撃対象に含むか確認
        const canTargetTraps = this.data.attack.targets && this.data.attack.targets.includes("trap");

        // 罠攻撃の制限：canDestroyAllTrapsがtrueの場合はすべての罠、それ以外は破壊可能な罠のみ
        const canDestroyAllTraps = this.data.attack.canDestroyAllTraps || false;
        const attackableTraps = canTargetTraps ? game.traps.filter(trap => {
            if (trap.destroyed) return false;
            return canDestroyAllTraps || (trap.data && trap.data.destructible);
        }) : [];
        const targets = [...attackableTraps, ...game.monsters];
        let bestPlan = null;
        let maxHitCount = 0;
        const attackRange = this.data.attack.range * game.grid.tileSize;
        const areaRadius = this.data.attack.areaRadius * game.grid.tileSize;

        for (const target of targets) {
            if (target.dead || target.destroyed) continue;

            let targetX, targetY;
            if (target.gridX !== undefined && target.gridY !== undefined) {
                const pos = game.grid.gridToWorld(target.gridX, target.gridY);
                targetX = pos.x;
                targetY = pos.y;
            } else if (target.x !== undefined && target.y !== undefined) {
                targetX = target.x;
                targetY = target.y;
            } else {
                continue;
            }

            const dist = distance(this.x, this.y, targetX, targetY);
            if (dist > attackRange) continue;

            let hitCount = 0;
            for (const t of targets) {
                if (t.dead || t.destroyed) continue;

                let tx, ty;
                if (t.gridX !== undefined && t.gridY !== undefined) {
                    const pos = game.grid.gridToWorld(t.gridX, t.gridY);
                    tx = pos.x;
                    ty = pos.y;
                } else if (t.x !== undefined && t.y !== undefined) {
                    tx = t.x;
                    ty = t.y;
                } else {
                    continue;
                }

                const areaDist = distance(targetX, targetY, tx, ty);
                if (areaDist <= areaRadius) {
                    hitCount++;
                }
            }

            if (hitCount > maxHitCount) {
                maxHitCount = hitCount;
                bestPlan = {
                    primaryTarget: target,
                    position: { x: targetX, y: targetY },
                    areaRadius,
                    hitCount
                };
            }
        }

        return bestPlan;
    }

    evaluateRangedAction(game) {
        if (!game || !this.data.attack || !this.data.attack.range) {
            return 0;
        }

        const attackRange = this.data.attack.range * game.grid.tileSize;
        let monsterCount = 0;
        let trapCount = 0;

        for (const monster of game.monsters) {
            if (monster.dead) continue;
            const dist = distance(this.x, this.y, monster.x, monster.y);
            if (dist <= attackRange) {
                monsterCount++;
            }
        }

        for (const trap of game.traps) {
            if (trap.destroyed) continue;
            const trapPos = game.grid.gridToWorld(trap.gridX, trap.gridY);
            const dist = distance(this.x, this.y, trapPos.x, trapPos.y);
            if (dist <= attackRange) {
                trapCount++;
            }
        }

        const totalTargets = monsterCount + trapCount;
        if (totalTargets === 0) {
            return 0;
        }

        let score = 1 + totalTargets * 0.25;
        if (this.currentIntent === 'hunt') {
            score += monsterCount * 0.4;
        }
        if (this.currentIntent === 'pressure_traps') {
            score += trapCount * 0.4;
        }

        return score;
    }

    evaluateHealAction(game) {
        if (!game || !this.data.heal || !this.data.heal.range || !this.data.heal.amount) {
            return { score: 0, targets: [] };
        }

        const healRange = this.data.heal.range * game.grid.tileSize;
        const targets = [];

        for (const enemy of game.enemies) {
            if (enemy.dead || enemy === this) continue;
            if (enemy.hp >= enemy.maxHp) continue;

            const dist = distance(this.x, this.y, enemy.x, enemy.y);
            if (dist <= healRange) {
                targets.push(enemy);
            }
        }

        if (targets.length === 0) {
            return { score: 0, targets: [] };
        }

        const lowHpThreshold = ENEMY_AI_CONSTANTS.SUPPORT_LOW_HP_THRESHOLD || 0.65;
        const criticalTargets = targets.filter(enemy => (enemy.hp / enemy.maxHp) < lowHpThreshold).length;

        let score = 1 + targets.length * 0.3 + criticalTargets * 0.4;
        if (this.currentIntent === 'support') {
            score += 0.8;
        }

        return { score, targets };
    }

    evaluateBarrierAction(game) {
        if (!game || !this.data.barrier || !this.data.barrier.range || !this.data.barrier.amount) {
            return { score: 0, targets: [] };
        }

        const barrierRange = this.data.barrier.range * game.grid.tileSize;
        const allies = [];

        for (const enemy of game.enemies) {
            if (enemy.dead || enemy === this) continue;
            const dist = distance(this.x, this.y, enemy.x, enemy.y);
            if (dist <= barrierRange) {
                allies.push({
                    enemy,
                    dist,
                    hpRatio: enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0
                });
            }
        }

        if (allies.length === 0) {
            return { score: 0, targets: [] };
        }

        allies.sort((a, b) => {
            if (a.hpRatio === b.hpRatio) {
                return a.dist - b.dist;
            }
            return a.hpRatio - b.hpRatio;
        });

        const maxTargets = this.data.barrier.targets || 3;
        const vulnerableAllies = allies.filter(info => !info.enemy.barrier || info.enemy.barrier <= 0).length;

        let score = 0.8 + Math.min(maxTargets, allies.length) * 0.25 + vulnerableAllies * 0.2;
        if (this.currentIntent === 'support') {
            score += 0.5;
        }

        return { score, targets: allies };
    }

    healAllies(game, presetTargets = null) {
        if (!this.data.heal || !this.data.heal.range || !this.data.heal.amount) {
            return false;
        }

        const healRange = this.data.heal.range * game.grid.tileSize;
        const targets = Array.isArray(presetTargets) && presetTargets.length
            ? presetTargets
            : game.enemies.filter(enemy => {
                if (enemy.dead || enemy === this || enemy.hp >= enemy.maxHp) return false;
                const dist = distance(this.x, this.y, enemy.x, enemy.y);
                return dist <= healRange;
            });

        if (targets.length === 0) {
            return false;
        }

        let healedCount = 0;
        for (const enemy of targets) {
            if (enemy.dead || enemy === this) continue;
            if (!presetTargets) {
                const dist = distance(this.x, this.y, enemy.x, enemy.y);
                if (dist > healRange) continue;
            }

            const actualHeal = enemy.receiveHealing(this.data.heal.amount, this);
            if (actualHeal > 0) {
                healedCount++;
            }

            if (this.abilities.includes('cleanse') && enemy.statusEffects) {
                enemy.statusEffects.cleanse();
            }
        }

        if (healedCount > 0) {
            this.healCooldown = this.data.heal.interval;
            return true;
        }

        return false;
    }

    applyBarrier(game, presetTargets = null) {
        if (!this.data.barrier || !this.data.barrier.range || !this.data.barrier.amount) {
            return false;
        }

        const barrierRange = this.data.barrier.range * game.grid.tileSize;
        let allies = [];

        if (Array.isArray(presetTargets) && presetTargets.length) {
            allies = presetTargets.map(entry => ({
                enemy: entry.enemy || entry,
                dist: entry.dist !== undefined && entry.dist !== null
                    ? entry.dist
                    : distance(this.x, this.y, entry.enemy ? entry.enemy.x : entry.x, entry.enemy ? entry.enemy.y : entry.y)
            }));
        } else {
            for (const enemy of game.enemies) {
                if (enemy.dead || enemy === this) continue;
                const dist = distance(this.x, this.y, enemy.x, enemy.y);
                if (dist <= barrierRange) {
                    allies.push({ enemy, dist });
                }
            }
        }

        if (allies.length === 0) {
            return false;
        }

        allies.sort((a, b) => a.dist - b.dist);
        const maxTargets = this.data.barrier.targets || 3;
        const limit = Math.min(maxTargets, allies.length);

        for (let i = 0; i < limit; i++) {
            const ally = allies[i].enemy;
            if (!ally || ally.dead) continue;
            ally.barrier = (ally.barrier || 0) + this.data.barrier.amount;
        }

        this.barrierCooldown = this.data.barrier.interval;
        return true;
    }

    attemptDisarm(deltaTime, game) {
        // 近くの罠を検知
        if (!this.disarmingTrap) {
            if (this.currentIntent !== 'pressure_traps') {
                return;
            }
            let mostDangerous = null;
            let highestDanger = 0;

            for (const trap of game.traps) {
                if (trap.destroyed || trap.hp <= 0) continue;

                const trapPos = game.grid.gridToWorld(trap.gridX, trap.gridY);
                const dist = distance(this.x, this.y, trapPos.x, trapPos.y);

                if (dist < this.detectRadius * game.grid.tileSize) {
                    // 危険度計算
                    let danger = 0;
                    if (trap.data.effect.damage) danger += trap.data.effect.damage;
                    if (trap.data.effect.instant) danger += trap.data.effect.instant;
                    if (trap.data.effect.dot) {
                        danger += trap.data.effect.dot.dps * trap.data.effect.dot.duration;
                    }

                    if (danger > highestDanger) {
                        highestDanger = danger;
                        mostDangerous = trap;
                    }
                }
            }

            this.disarmingTrap = mostDangerous;
            this.disarmProgress = 0;
        }

        // 解除作業
        if (this.disarmingTrap) {
            const trapPos = game.grid.gridToWorld(
                this.disarmingTrap.gridX,
                this.disarmingTrap.gridY
            );
            const dist = distance(this.x, this.y, trapPos.x, trapPos.y);

            if (dist > this.detectRadius * game.grid.tileSize) {
                // 範囲外
                this.disarmingTrap = null;
                this.disarmProgress = 0;
            } else {
                this.disarmProgress += deltaTime;

                if (this.disarmProgress >= Enemy.DISARM_DURATION) {
                    // 解除成功
                    this.disarmingTrap.takeDamage(this.disarmingTrap.maxHp);
                    this.disarmingTrap = null;
                    this.disarmProgress = 0;
                }
            }
        }
    }

    selfHeal() {
        // データ構造の検証
        if (!this.data.selfHeal || !this.data.selfHeal.amount) {
            return;
        }

        this.receiveHealing(this.data.selfHeal.amount, this);
        this.selfHealCooldown = this.data.selfHeal.interval;
    }

    createHolyZone(game) {
        // データ構造の検証
        if (!this.data.holyZone || !this.data.holyZone.radius || !this.data.holyZone.healPerSec) {
            return;
        }

        // 聖域を作成（継続的な回復効果）
        const zoneRange = this.data.holyZone.radius * game.grid.tileSize;

        for (const enemy of game.enemies) {
            if (enemy.dead) continue;

            const dist = distance(this.x, this.y, enemy.x, enemy.y);

            if (dist < zoneRange) {
                // 継続的な回復効果を適用
                enemy.holyZoneEffect = {
                    healPerSec: this.data.holyZone.healPerSec,
                    duration: this.data.holyZone.duration
                };
            }
        }

        this.holyZoneCooldown = this.data.holyZone.cooldown;
    }

    takeDamage(amount, type = 'physical', source = null) {
        if (amount <= 0) return 0;

        // amountはCombatSystemで既に計算済みのダメージ
        // ここでは回避、バリア、ダメージ反射、実HPの処理のみ行う
        let finalDamage = amount;

        // 回避スキル
        if (this.evasionChance > 0 && Math.random() < this.evasionChance) {
            // 回避成功
            return 0;
        }

        // バリアで吸収
        if (this.barrier > 0) {
            if (this.barrier >= finalDamage) {
                this.barrier -= finalDamage;
                return 0;
            } else {
                finalDamage -= this.barrier;
                this.barrier = 0;
            }
        }

        // ダメージ反射スキル
        if (this.damageReflect > 0 && source && source.takeDamage) {
            const reflectDamage = Math.floor(finalDamage * this.damageReflect);
            source.takeDamage(reflectDamage, 'physical');
        }

        // HPにダメージを適用
        this.hp -= finalDamage;

        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;

            // グリッドタイルから削除（gameオブジェクトがない場合も考慮）
            if (this.gridX !== undefined && this.gridY !== undefined) {
                const game = (source && source.game) ? source.game : null;
                if (game) {
                    const tile = game.grid.getTile(this.gridX, this.gridY);
                    if (tile && tile.enemy === this) {
                        tile.enemy = null;
                    }
                }
            }

            // 復讐スキル（死亡時爆発）
            const revenge = this.skillMap.get('enemy_revenge');
            if (revenge && source && source.game) {
                this.triggerDeathExplosion(revenge.effect, source.game);
            }
        }

        return finalDamage;
    }


    receiveHealing(amount, source = null) {
        if (this.dead || !isFinite(amount) || amount <= 0) {
            return 0;
        }
        if (typeof this.healingReceivedMultiplier !== 'number') {
            this.healingReceivedMultiplier = 1.0;
        }
        const multiplier = Math.max(0, Math.min(1, this.healingReceivedMultiplier));
        const actual = amount * multiplier;
        const before = this.hp;
        this.hp = Math.min(this.hp + actual, this.maxHp);
        return this.hp - before;
    }

    applyHealingDebuff(multiplier) {
        if (typeof multiplier !== 'number') return;
        if (typeof this.healingReceivedMultiplier !== 'number') {
            this.healingReceivedMultiplier = 1.0;
        }
        this.healingReceivedMultiplier = Math.min(this.healingReceivedMultiplier, multiplier);
    }

    triggerDeathExplosion(effect, game) {
        // 周囲のモンスターにダメージ
        const range = effect.range * game.grid.tileSize;
        const damage = effect.damage;

        for (const monster of game.monsters) {
            if (monster.dead) continue;

            const dist = distance(this.x, this.y, monster.x, monster.y);
            if (dist <= range) {
                monster.takeDamage(damage, 'physical');
                game.effectPool.createDamageText(monster.x, monster.y, damage, false);
            }
        }
    }

    draw(ctx, game) {
        if (this.dead) return;

        const size = game.grid.tileSize * 0.5;

        // 攻撃アニメーション用のスケールと発光効果
        let scale = 1.0;
        let glowAlpha = 0;
        if (this.isAttackAnimating && this.attackAnimationTimer > 0) {
            // アニメーションの進行度（0.0 -> 1.0）
            const progress = 1 - (this.attackAnimationTimer / 0.3);
            // パルス効果: 大きくなって元に戻る
            scale = 1.0 + Math.sin(progress * Math.PI) * 0.2;
            // 発光効果
            glowAlpha = Math.sin(progress * Math.PI) * 0.6;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // 攻撃時の発光エフェクト
        if (glowAlpha > 0) {
            ctx.shadowColor = this.getEnemyColor();
            ctx.shadowBlur = 15;
            ctx.globalAlpha = glowAlpha;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            const radius = this.boss ? size * 1.5 : size / 2;
            ctx.arc(0, 0, radius * scale * 1.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        }

        // スケール適用
        ctx.scale(scale, scale);

        // 本体
        ctx.fillStyle = this.getEnemyColor();
        ctx.beginPath();

        if (this.boss) {
            // ボスは大きい
            ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
        } else {
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        }
        ctx.fill();

        // 枠
        ctx.strokeStyle = (this.boss ? '#ffd700' : '#f56565');
        if (this.isAttackAnimating) {
            ctx.strokeStyle = '#ff0'; // 攻撃時は黄色
        }
        ctx.lineWidth = this.boss ? 3 : 2;
        ctx.stroke();

        // アイコン
        const iconSize = this.boss ? '24px' : '14px';
        drawCenteredText(ctx, this.getEnemyIcon(), 0, 0, `${iconSize} Arial`, '#fff');

        // レベル表示（レベル2以上の場合）
        if (this.level > 1) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const levelY = this.boss ? -size * 1.5 - 25 : -size / 2 - 20;
            ctx.fillText(`Lv.${this.level}`, 0, levelY);
        }

        // HPバー
        const barWidth = this.boss ? size * 3 : size;
        const barY = this.boss ? size * 1.5 + 10 : size / 2 + 5;
        drawHealthBar(ctx, -barWidth / 2, barY, barWidth, 5, this.hp, this.maxHp, '#333', '#f56565');

        // バリア表示
        if (this.barrier && this.barrier > 0) {
            ctx.strokeStyle = '#4299e1';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const radius = this.boss ? size * 1.5 + 3 : size / 2 + 3;
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 状態異常アイコン
        const effects = this.statusEffects.getActiveEffects();
        let iconX = -size / 2;
        const iconY = this.boss ? -size * 1.5 - 15 : -size / 2 - 10;
        for (const effect of effects) {
            drawStatusIcon(ctx, iconX, iconY, 12, effect.type);
            iconX += 15;
        }

        // 解除中の表示
        if (this.disarmingTrap) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.fillRect(-size / 2, -size, size * this.disarmProgress, 3);
        }

        ctx.restore();

        // 攻撃ターゲットへの攻撃ライン表示
        if (this.isAttackAnimating && this.attackTarget && !this.attackTarget.dead) {
            // 範囲攻撃の場合
            if (this.data.attack && this.data.attack.type === 'area' && this.attackTargetPos) {
                // 弾道ライン
                ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.attackTargetPos.x, this.attackTargetPos.y);
                ctx.stroke();

                // 着弾点の範囲表示
                const progress = 1 - (this.attackAnimationTimer / 0.5);
                const currentRadius = this.data.attack.areaRadius * game.grid.tileSize * Math.min(progress * 2, 1);

                ctx.fillStyle = `rgba(255, 100, 0, ${0.3 * (1 - progress)})`;
                ctx.beginPath();
                ctx.arc(this.attackTargetPos.x, this.attackTargetPos.y, currentRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = 'rgba(255, 80, 0, 0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.attackTargetPos.x, this.attackTargetPos.y, currentRadius, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                // 通常攻撃
                ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.attackTarget.x, this.attackTarget.y);
                ctx.stroke();

                // 攻撃範囲の円を表示
                if (this.data.attack && this.data.attack.range) {
                    ctx.strokeStyle = 'rgba(255, 80, 80, 0.4)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.data.attack.range * game.grid.tileSize, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
    }

    getEnemyColor() {
        const colors = {
            thief: '#9f7aea',
            warrior: '#e53e3e',
            ranger: '#48bb78',
            cleric: '#ecc94b',
            elementalist: '#4299e1',
            siege_soldier: '#805ad5',
            flying_scout: '#ed8936',
            light_hero: '#ffd700',
            assassin: '#8b008b',
            knight: '#4169e1',
            berserker: '#dc143c',
            necromancer: '#2f4f4f',
            battle_mage: '#9370db',
            paladin: '#ffe4b5',
            dragon_knight: '#ff4500',
            archmage: '#1e90ff',
            titan: '#8b4513',
            demon_lord: '#8b0000',
            shadow_walker: '#191970',
            war_priest: '#daa520',
            artillery: '#ff6347',
            wyvern: '#8a2be2',
            griffin: '#dda0dd'
        };
        return colors[this.id] || '#718096';
    }

    getEnemyIcon() {
        const icons = {
            thief: '🗡',
            warrior: '⚔',
            ranger: '🏹',
            cleric: '✝',
            elementalist: '🔮',
            siege_soldier: '🔨',
            flying_scout: '🦅',
            light_hero: '👑',
            assassin: '🔪',
            knight: '🛡',
            berserker: '⚡',
            necromancer: '💀',
            battle_mage: '🌟',
            paladin: '⚜',
            dragon_knight: '🐉',
            archmage: '✨',
            titan: '🗿',
            demon_lord: '😈',
            shadow_walker: '👤',
            war_priest: '☨',
            artillery: '💣',
            wyvern: '🐲',
            griffin: '🦁'
        };
        return icons[this.id] || '👤';
    }
}

