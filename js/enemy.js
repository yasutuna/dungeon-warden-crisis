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
    }

    initializeSkillsForLevel() {
        // レベル2以上の敵はスキルを持ってスポーンする
        const skillCount = Math.floor(this.level / 2);
        for (let i = 0; i < skillCount; i++) {
            this.learnRandomSkill();
        }
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
        this.statusEffects.update(deltaTime);

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
            this.hp = Math.min(this.hp + healAmount, this.maxHp);
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

        // 近くのモンスターを探す
        const nearbyMonster = this.findNearbyMonster(game);

        if (nearbyMonster) {
            // 攻撃範囲内かチェック
            const dist = distance(this.x, this.y, nearbyMonster.x, nearbyMonster.y);
            const attackRange = this.data.attack
                ? this.data.attack.range * game.grid.tileSize
                : game.grid.tileSize * 0.8;

            if (dist <= attackRange) {
                // 射程内: 戦闘モード（移動停止）
                this.combatMonster(nearbyMonster, deltaTime, game);
                return;
            } else {
                // 射程外: モンスターに向かって移動
                this.moveTowardsMonster(nearbyMonster, deltaTime, game);
                return;
            }
        }

        // AI行動パターンを適用
        this.applyAIBehavior(game);

        const targetPos = game.grid.gridToWorld(
            this.path[this.pathIndex].x,
            this.path[this.pathIndex].y
        );

        const dx = targetPos.x - this.x;
        const dy = targetPos.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const moveAmount = this.moveSpeed * game.grid.tileSize * deltaTime;

        if (dist < Enemy.WAYPOINT_REACH_DISTANCE) {
            // 次のウェイポイントへ
            this.pathIndex++;
            this.pathProgress = this.pathIndex / this.path.length;
        } else {
            // 移動先の位置を計算
            const newX = this.x + (dx / dist) * moveAmount;
            const newY = this.y + (dy / dist) * moveAmount;

            // 他の敵との衝突チェック
            if (!this.wouldCollideWithEnemy(newX, newY, game)) {
                this.x = newX;
                this.y = newY;

                // グリッド上の位置を更新
                this.updateGridPosition(game);
            }
            // 衝突する場合は移動しない（その場で待機）
        }
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

            // 新しいタイルに他の敵がいない場合のみ登録
            // 既に他の敵がいる場合は上書きしない（複数の敵が同じタイルにいることは許容）
            if (newTile && !newTile.enemy) {
                newTile.enemy = this;
            }
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
            this.hp = Math.min(this.hp + healAmount, this.maxHp);
        }

        // ダメージエフェクト
        game.effectPool.createDamageText(monster.x, monster.y, actualDamage, false);

        // 攻撃クールダウンをリセット
        this.attackCooldown = this.data.attack.interval || 1.0;
    }

    applyAIBehavior(game) {
        const aiType = this.data.aiType || 'normal';

        switch(aiType) {
            case 'cautious':
                // 盗賊: 罠を避ける動き
                this.cautiousBehavior(game);
                break;
            case 'aggressive':
                // 戦士: HP減少で加速
                this.aggressiveBehavior();
                break;
            case 'sniper':
                // レンジャー: 距離を保つ
                this.sniperBehavior(game);
                break;
            case 'support':
                // 聖職者: 味方に近づく
                this.supportBehavior(game);
                break;
            default:
                this.moveSpeed = this.baseSpeed;
        }
    }

    cautiousBehavior(game) {
        // 罠が近くにあれば減速
        const nearbyTraps = game.traps.filter(trap => {
            const trapPos = game.grid.gridToWorld(trap.gridX, trap.gridY);
            const dist = distance(this.x, this.y, trapPos.x, trapPos.y);
            return dist < game.grid.tileSize * 2 && !trap.destroyed;
        });

        if (nearbyTraps.length > 0) {
            this.moveSpeed = this.baseSpeed * 0.5; // 50%減速
        } else {
            this.moveSpeed = this.baseSpeed * 1.1; // 安全な場所では加速
        }
    }

    aggressiveBehavior() {
        // HP50%以下で加速
        if (this.hp < this.maxHp * 0.5 && this.data.chargeSpeed) {
            this.moveSpeed = this.baseSpeed * this.data.chargeSpeed;
        } else {
            this.moveSpeed = this.baseSpeed;
        }
    }

    sniperBehavior(game) {
        // モンスターが近すぎたら後退
        const nearbyMonsters = game.monsters.filter(monster => {
            if (monster.dead) return false;
            const dist = distance(this.x, this.y, monster.x, monster.y);
            return dist < game.grid.tileSize * 2;
        });

        if (nearbyMonsters.length > 0) {
            // 後退モード: 少し遅く
            this.moveSpeed = this.baseSpeed * 0.7;
        } else {
            this.moveSpeed = this.baseSpeed;
        }
    }

    supportBehavior(game) {
        // 負傷した味方がいれば急ぐ
        const injuredAllies = game.enemies.filter(enemy => {
            return !enemy.dead && enemy !== this && enemy.hp < enemy.maxHp * 0.7;
        });

        if (injuredAllies.length > 0) {
            this.moveSpeed = this.baseSpeed * 1.2; // 急いで近づく
        } else {
            this.moveSpeed = this.baseSpeed;
        }
    }

    updateAbilities(deltaTime, game) {
        // クールダウン更新
        if (this.attackCooldown > 0) this.attackCooldown -= deltaTime;
        if (this.healCooldown > 0) this.healCooldown -= deltaTime;
        if (this.barrierCooldown > 0) this.barrierCooldown -= deltaTime;
        if (this.selfHealCooldown > 0) this.selfHealCooldown -= deltaTime;
        if (this.holyZoneCooldown > 0) this.holyZoneCooldown -= deltaTime;

        // レンジャー - 遠隔攻撃
        if (this.abilities.includes('ranged_attack') && this.attackCooldown <= 0) {
            this.rangedAttack(game);
        }

        // 砲撃兵 - 範囲攻撃
        if (this.abilities.includes('area_attack') && this.attackCooldown <= 0) {
            this.areaAttack(game);
        }

        // 聖職者 - 回復
        if (this.abilities.includes('heal') && this.healCooldown <= 0) {
            this.healAllies(game);
        }

        // 精霊使い - バリア
        if (this.abilities.includes('barrier') && this.barrierCooldown <= 0) {
            this.applyBarrier(game);
        }

        // 罠解除
        if (this.abilities.includes('disarm')) {
            this.attemptDisarm(deltaTime, game);
        }

        // ボススキル
        if (this.boss) {
            if (this.selfHealCooldown <= 0 && this.hp < this.maxHp * Enemy.BOSS_HEAL_THRESHOLD) {
                this.selfHeal();
            }

            if (this.holyZoneCooldown <= 0) {
                this.createHolyZone(game);
            }
        }

        // 聖域エフェクトの更新
        if (this.holyZoneEffect) {
            this.holyZoneEffect.duration -= deltaTime;
            if (this.holyZoneEffect.duration > 0) {
                this.hp = Math.min(this.hp + this.holyZoneEffect.healPerSec * deltaTime, this.maxHp);
            } else {
                this.holyZoneEffect = null;
            }
        }
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
            return;
        }

        // 近くの罠またはモンスターを攻撃
        const targets = [...game.traps, ...game.monsters];
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

        if (closestTarget) {
            // 攻撃アニメーション開始
            this.isAttackAnimating = true;
            this.attackAnimationTimer = 0.3;
            this.attackTarget = closestTarget;

            closestTarget.takeDamage(this.data.attack.damage);
            this.attackCooldown = this.data.attack.interval;
        }
    }

    areaAttack(game) {
        // データ構造の検証
        if (!this.data.attack || !this.data.attack.range || !this.data.attack.damage || !this.data.attack.areaRadius) {
            console.warn(`${this.name}(ID:${this.data.id})の範囲攻撃データが不完全です。`);
            return;
        }

        // 攻撃対象を探す
        const targets = [...game.traps, ...game.monsters];
        let bestTarget = null;
        let maxHitCount = 0;
        let bestTargetPos = null;
        const attackRange = this.data.attack.range * game.grid.tileSize;
        const areaRadius = this.data.attack.areaRadius * game.grid.tileSize;

        // 各ターゲットを中心にした場合のヒット数をカウント
        for (const target of targets) {
            if (target.dead || target.destroyed) continue;

            let targetX, targetY;

            // 座標取得
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

            // 射程内かチェック
            const dist = distance(this.x, this.y, targetX, targetY);
            if (dist > attackRange) continue;

            // この位置を中心にした場合のヒット数をカウント
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

                // 範囲内かチェック
                const areaDist = distance(targetX, targetY, tx, ty);
                if (areaDist <= areaRadius) {
                    hitCount++;
                }
            }

            // 最もヒット数の多い位置を選択
            if (hitCount > maxHitCount) {
                maxHitCount = hitCount;
                bestTarget = target;
                bestTargetPos = { x: targetX, y: targetY };
            }
        }

        if (bestTarget && bestTargetPos) {
            // 攻撃アニメーション開始
            this.isAttackAnimating = true;
            this.attackAnimationTimer = 0.5; // 範囲攻撃は少し長め
            this.attackTarget = bestTarget;
            this.attackTargetPos = bestTargetPos; // 範囲攻撃の中心位置を記録

            // 範囲内の全ターゲットにダメージ
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

                const areaDist = distance(bestTargetPos.x, bestTargetPos.y, tx, ty);
                if (areaDist <= areaRadius) {
                    const actualDamage = target.takeDamage ?
                        target.takeDamage(this.data.attack.damage) :
                        this.data.attack.damage;

                    // ダメージエフェクト
                    if (game.effectPool) {
                        game.effectPool.createDamageText(tx, ty, actualDamage || this.data.attack.damage, false);
                    }
                }
            }

            // 範囲攻撃エフェクトを作成
            if (game.effectPool) {
                game.effectPool.createExplosion(bestTargetPos.x, bestTargetPos.y, areaRadius);
            }

            this.attackCooldown = this.data.attack.interval;
        }
    }

    healAllies(game) {
        // データ構造の検証
        if (!this.data.heal || !this.data.heal.range || !this.data.heal.amount) {
            return;
        }

        const healRange = this.data.heal.range * game.grid.tileSize;
        let healedCount = 0;

        for (const enemy of game.enemies) {
            if (enemy.dead || enemy === this) continue;

            const dist = distance(this.x, this.y, enemy.x, enemy.y);

            if (dist < healRange && enemy.hp < enemy.maxHp) {
                enemy.hp = Math.min(enemy.hp + this.data.heal.amount, enemy.maxHp);
                healedCount++;

                // 浄化
                if (this.abilities.includes('cleanse')) {
                    enemy.statusEffects.cleanse();
                }
            }
        }

        if (healedCount > 0) {
            this.healCooldown = this.data.heal.interval;
        }
    }

    applyBarrier(game) {
        // データ構造の検証
        if (!this.data.barrier || !this.data.barrier.range || !this.data.barrier.amount) {
            return;
        }

        const barrierRange = this.data.barrier.range * game.grid.tileSize;
        const allies = [];

        for (const enemy of game.enemies) {
            if (enemy.dead || enemy === this) continue;

            const dist = distance(this.x, this.y, enemy.x, enemy.y);

            if (dist < barrierRange) {
                allies.push({ enemy, dist });
            }
        }

        // 距離でソート
        allies.sort((a, b) => a.dist - b.dist);

        // 最大ターゲット数まで
        const maxTargets = this.data.barrier.targets || 3;
        for (let i = 0; i < Math.min(maxTargets, allies.length); i++) {
            allies[i].enemy.barrier = (allies[i].enemy.barrier || 0) + this.data.barrier.amount;
        }

        this.barrierCooldown = this.data.barrier.interval;
    }

    attemptDisarm(deltaTime, game) {
        // 近くの罠を検知
        if (!this.disarmingTrap) {
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

        this.hp = Math.min(this.hp + this.data.selfHeal.amount, this.maxHp);
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

        let finalDamage = amount;

        // 回避スキル
        if (this.evasionChance > 0 && Math.random() < this.evasionChance) {
            // 回避成功
            return 0;
        }

        // 耐性の適用
        if (this.resist && this.resist[type]) {
            finalDamage *= (1 - this.resist[type]);
        }

        // 地上罠無効（飛行）
        if (this.flying && this.resist && this.resist.ground_trap && type === 'trap') {
            finalDamage *= (1 - this.resist.ground_trap);
        }

        // 凍結中は砕き効果
        if (this.vulnerableToShatter && this.statusEffects.hasEffect('freeze')) {
            finalDamage *= Enemy.SHATTER_MULTIPLIER;
            this.vulnerableToShatter = false;
        }

        // 火炎脆弱性
        if (type === 'fire' && this.fireVulnerability > 1.0) {
            finalDamage *= this.fireVulnerability;
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
            artillery: '#ff6347'
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
            artillery: '💣'
        };
        return icons[this.id] || '👤';
    }
}
