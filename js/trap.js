/**
 * 罠クラス
 * グリッドに配置して敵を攻撃・妨害する防衛設備
 */
class Trap {
    constructor(data, x, y) {
        this.data = deepCopy(data);
        this.id = data.id;
        this.name = data.name;
        this.gridX = x;
        this.gridY = y;
        this.hp = data.hp;
        this.maxHp = data.maxHp;
        this.cooldownTimer = 0;
        this.active = true;
        this.destroyed = false;

        // レベルシステム
        this.level = data.level || TRAP_CONSTANTS.DEFAULT_LEVEL;
        this.exp = data.exp || TRAP_CONSTANTS.DEFAULT_EXP;
        this.maxExp = data.maxExp || TRAP_CONSTANTS.DEFAULT_MAX_EXP;
        this.expPerLevel = data.expPerLevel || TRAP_CONSTANTS.DEFAULT_EXP_PER_LEVEL;
    }

    /**
     * 経験値を獲得してレベルアップ判定
     */
    gainExp(amount) {
        this.exp += amount;

        while (this.exp >= this.maxExp) {
            this.levelUp();
            this.exp -= this.maxExp;
            this.maxExp += this.expPerLevel;
        }
    }

    /**
     * レベルアップ時の処理
     */
    levelUp() {
        this.level++;

        // レベルアップでステータス向上
        const hpIncrease = Math.floor(this.data.maxHp * TRAP_CONSTANTS.LEVEL_UP_HP_MULTIPLIER);
        this.maxHp += hpIncrease;
        this.hp += hpIncrease;

        // ダメージ系のステータスも向上
        if (this.data.effect.damage) {
            this.data.effect.damage = Math.floor(this.data.effect.damage * TRAP_CONSTANTS.LEVEL_UP_DAMAGE_MULTIPLIER);
        }
        if (this.data.effect.instant) {
            this.data.effect.instant = Math.floor(this.data.effect.instant * TRAP_CONSTANTS.LEVEL_UP_DAMAGE_MULTIPLIER);
        }
        if (this.data.effect.dot && this.data.effect.dot.dps) {
            this.data.effect.dot.dps = Math.floor(this.data.effect.dot.dps * TRAP_CONSTANTS.LEVEL_UP_DAMAGE_MULTIPLIER);
        }
    }

    update(deltaTime, enemies, game) {
        if (this.destroyed || !this.active) return;

        // クールダウン更新
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
        }

        // パッシブ罠の処理（毎フレーム実行）
        if (this.data.targeting === 'passive') {
            this.handleSpecialTraps([], game, deltaTime);
        } else {
            // 罠の種類に応じて動作
            if (this.canActivate()) {
                const targets = this.findTargets(enemies, game);

                if (targets.length > 0) {
                    this.activate(targets, game);
                }
            }
        }
    }

    canActivate() {
        return this.cooldownTimer <= 0 && this.hp > 0;
    }

    findTargets(enemies, game) {
        const targets = [];
        const worldPos = game.grid.gridToWorld(this.gridX, this.gridY);

        for (const enemy of enemies) {
            if (enemy.dead) continue;

            const dist = distance(worldPos.x, worldPos.y, enemy.x, enemy.y);
            const range = this.data.range * game.grid.tileSize;

            if (this.data.targeting === 'on_pass') {
                // 接触型
                if (dist < game.grid.tileSize * TRAP_CONSTANTS.ON_PASS_RANGE_MULTIPLIER) {
                    targets.push(enemy);
                }
            } else if (this.data.targeting === 'on_trigger') {
                // 地雷など
                if (dist < game.grid.tileSize * TRAP_CONSTANTS.ON_TRIGGER_RANGE_MULTIPLIER) {
                    targets.push(enemy);
                }
            } else if (dist <= range) {
                targets.push(enemy);
            }
        }

        // ターゲット優先順位
        if (this.data.targeting === 'frontmost') {
            // 最前列
            targets.sort((a, b) => b.pathProgress - a.pathProgress);
        } else if (this.data.targeting === 'priority_targets') {
            // ヒーラー優先
            targets.sort((a, b) => {
                const aPriority = a.data.abilities?.includes('heal') ? 10 : 0;
                const bPriority = b.data.abilities?.includes('heal') ? 10 : 0;
                return bPriority - aPriority;
            });
        }

        return targets;
    }

    activate(targets, game) {
        const effect = this.data.effect;

        for (const target of targets) {
            // 飛行ユニットは一部の罠のみ有効
            if (target.flying && !TRAP_CONSTANTS.CAN_HIT_FLYING_TYPES.includes(this.data.id)) {
                continue;
            }

            // 敵のHP記録（経験値獲得判定用）
            const wasAlive = !target.dead;

            // エフェクトを適用
            this.applyEffect(target, effect, game);

            // 経験値獲得判定（敵を倒した場合）
            if (wasAlive && target.dead) {
                const expGained = Math.floor(
                    target.level * TRAP_CONSTANTS.EXP_PER_ENEMY_LEVEL +
                    target.soulReward * TRAP_CONSTANTS.EXP_PER_SOUL_REWARD
                );
                this.gainExp(expGained);
            }
        }

        // 特殊罠の処理
        this.handleSpecialTraps(targets, game, 0);

        // クールダウン開始
        this.cooldownTimer = this.data.cooldownSec;

        // 単体攻撃は1体のみ
        if (this.data.targeting === 'frontmost' || this.data.targeting === 'priority_targets') {
            return;
        }
    }

    /**
     * エフェクトを適用（switch文を分割してリファクタリング）
     */
    applyEffect(target, effect, game) {
        switch (effect.type) {
            case 'physical':
                this.applyPhysicalEffect(target, effect);
                break;

            case 'fire':
                this.applyFireEffect(target, effect);
                break;

            case 'wildfire':
                this.applyWildfireEffect(target, effect, game);
                break;

            case 'ice':
                this.applyIceEffect(target, effect);
                break;

            case 'debuff':
                this.applyDebuffEffect(target, effect);
                break;

            case 'oil':
                this.applyOilEffect(target, effect);
                break;

            case 'knockback':
                this.applyKnockbackEffect(target, effect, game);
                break;

            case 'burst':
                this.applyBurstEffect(target, effect, game);
                break;

            case 'lightning':
                this.applyLightningEffect(target, effect, game, this.findTargets(game.enemies, game));
                break;

            case 'poison':
                this.applyPoisonEffect(target, effect);
                break;

            case 'curse':
                this.applyCurseEffect(target, effect);
                break;

            case 'pull':
                this.applyPullEffect(target, effect, game);
                break;

            case 'time':
                this.applyTimeEffect(target, effect);
                break;

            case 'reflect':
                this.applyReflectEffect(target, effect);
                break;

            case 'acid':
                this.applyAcidEffect(target, effect);
                break;

            case 'slow_field':
                this.applySlowFieldEffect(target, effect);
                break;

            case 'electric':
                this.applyElectricEffect(target, effect);
                break;

            case 'blood_sacrifice':
                this.applyBloodSacrificeEffect(target, effect, game);
                break;

            case 'wind':
                this.applyWindEffect(target, effect, game);
                break;

            case 'void':
                this.applyVoidEffect(target, effect);
                break;

            case 'rapid_fire':
                this.applyRapidFireEffect(target, effect);
                break;

            case 'spin_damage':
                // パッシブで継続ダメージ（handleSpecialTrapsで処理）
                break;

            case 'dark_magic':
                this.applyDarkMagicEffect(target, effect);
                break;

            case 'sleep':
                this.applySleepEffect(target, effect);
                break;

            // 進化後の罠タイプ
            case 'fire_physical':
                this.applyFirePhysicalEffect(target, effect);
                break;

            case 'ice_physical':
                this.applyIcePhysicalEffect(target, effect);
                break;

            case 'poison_physical':
                this.applyPoisonPhysicalEffect(target, effect);
                break;

            case 'lightning_physical':
                this.applyLightningPhysicalEffect(target, effect, game, this.findTargets(game.enemies, game));
                break;

            case 'curse_physical':
                this.applyCursePhysicalEffect(target, effect);
                break;
        }
    }

    // ========== エフェクト適用メソッド ==========

    applyPhysicalEffect(target, effect) {
        if (effect.instant) {
            target.takeDamage(effect.instant, 'physical');
        }
        if (effect.dot) {
            const statusEffect = new StatusEffect(
                effect.dot.tag,
                effect.dot.duration,
                { dps: effect.dot.dps }
            );
            target.statusEffects.addEffect(statusEffect);
        }
        if (effect.damage) {
            target.takeDamage(effect.damage, 'physical');
        }
        // 吸血処理
        if (effect.lifesteal) {
            this.applyLifesteal(effect.damage || effect.instant || 0, effect.lifesteal);
        }
    }

    applyFireEffect(target, effect) {
        if (effect.dot) {
            const burnEffect = new StatusEffect(
                effect.dot.tag,
                effect.dot.duration,
                { dps: effect.dot.dps }
            );
            target.statusEffects.addEffect(burnEffect);
        }
    }

    applyWildfireEffect(target, effect, game) {
        const tileSize = game?.grid?.tileSize || GRID_CONSTANTS.TILE_SIZE || 40;
        const wildfireEffect = new StatusEffect('wildfire', effect.duration, {
            damagePerTile: effect.damagePerTile || 10,
            neighborBonus: effect.neighborBonus || 0.1,
            spreadChance: effect.spreadChance || 0.1,
            extinguishChance: effect.extinguishChance || 0.05,
            spreadRadius: effect.spreadRadius || effect.aoeRadius || 2,
            neighborRadius: effect.neighborRadius || 2,
            tileSize
        });
        target.statusEffects.addEffect(wildfireEffect);
    }

    applyIceEffect(target, effect) {
        // 氷結床
        if (!target.freezeStacks) target.freezeStacks = 0;
        target.freezeStacks++;

        const slowEffect = new StatusEffect('slow', 0.5, { amount: effect.slow });
        target.statusEffects.addEffect(slowEffect);

        if (target.freezeStacks >= effect.freezeStacks) {
            const freezeEffect = new StatusEffect('freeze', effect.freezeDuration, {});
            target.statusEffects.addEffect(freezeEffect);
            target.freezeStacks = 0;
            target.vulnerableToShatter = true; // 砕き効果
        }
    }

    applyDebuffEffect(target, effect) {
        const debuffEffect = new StatusEffect(
            effect.debuff,
            effect.duration,
            {}
        );
        target.statusEffects.addEffect(debuffEffect);
    }

    applyOilEffect(target, effect) {
        // 油壷: 油濡れ状態 + 移動速度減少
        const oiledEffect = new StatusEffect(
            effect.debuff,
            effect.duration,
            {}
        );
        target.statusEffects.addEffect(oiledEffect);

        // 移動速度減少
        if (effect.slow) {
            const oilSlowEffect = new StatusEffect('slow', effect.duration, { amount: effect.slow });
            target.statusEffects.addEffect(oilSlowEffect);
        }
    }

    applyKnockbackEffect(target, effect, game) {
        if (!target.data.resist?.knockback || Math.random() > target.data.resist.knockback) {
            this.applyKnockback(target, game);
        }
    }

    applyBurstEffect(target, effect, game) {
        // 地雷
        target.takeDamage(effect.damage, 'physical');
        if (effect.knockback) {
            this.applyKnockback(target, game);
        }
        this.hp = 0; // 破壊
    }

    applyLightningEffect(target, effect, game, allTargets) {
        this.applyChainAttack(target, allTargets, effect, game, true);
    }

    applyPoisonEffect(target, effect) {
        // 毒DOT
        const poisonEffect = new StatusEffect(
            effect.dot.tag,
            effect.dot.duration,
            { dps: effect.dot.dps, healingReduction: effect.healingReduction }
        );
        target.statusEffects.addEffect(poisonEffect);
    }

    applyCurseEffect(target, effect) {
        // 呪いDOT+被ダメ増加
        const curseEffect = new StatusEffect(
            effect.dot.tag,
            effect.dot.duration,
            { dps: effect.dot.dps, damageAmplify: effect.damageAmplify }
        );
        target.statusEffects.addEffect(curseEffect);
    }

    applyPullEffect(target, effect, game) {
        const worldPos = game.grid.gridToWorld(this.gridX, this.gridY);
        const dx = worldPos.x - target.x;
        const dy = worldPos.y - target.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            const pullX = (dx / dist) * effect.pullStrength;
            const pullY = (dy / dist) * effect.pullStrength;

            target.x += pullX;
            target.y += pullY;
        }

        // 軽いダメージ
        target.takeDamage(effect.damage, 'magic');

        // 減速効果
        const slowEffect = new StatusEffect('slow', effect.duration, { amount: 0.5 });
        target.statusEffects.addEffect(slowEffect);
    }

    applyTimeEffect(target, effect) {
        // 時空歪曲
        const timeEffect = new StatusEffect('time_warp', effect.duration, {
            slow: effect.slow,
            cooldownIncrease: effect.cooldownIncrease
        });
        target.statusEffects.addEffect(timeEffect);
    }

    applyReflectEffect(target, effect) {
        // 反射の鏡
        const reflectEffect = new StatusEffect('reflect', effect.duration, {
            reflectPercentage: effect.reflectPercentage
        });
        target.statusEffects.addEffect(reflectEffect);
    }

    applyAcidEffect(target, effect) {
        const acidEffect = new StatusEffect(
            effect.dot.tag,
            effect.dot.duration,
            { dps: effect.dot.dps, armorReduction: effect.armorReduction }
        );
        target.statusEffects.addEffect(acidEffect);
    }

    applySlowFieldEffect(target, effect) {
        const slowEffect = new StatusEffect('slow', effect.duration, { amount: effect.slow });
        target.statusEffects.addEffect(slowEffect);
    }

    applyElectricEffect(target, effect) {
        target.takeDamage(effect.damage, 'lightning');
        if (effect.stun) {
            const stunEffect = new StatusEffect('stun', effect.stun, {});
            target.statusEffects.addEffect(stunEffect);
        }
    }

    applyBloodSacrificeEffect(target, effect, game) {
        target.takeDamage(effect.damage, 'magic');
        // 味方回復処理
        const allyHealRange = effect.aoeRadius * game.grid.tileSize;
        const trapPos = game.grid.gridToWorld(this.gridX, this.gridY);
        for (const monster of game.monsters) {
            if (monster.dead) continue;
            const dist = distance(trapPos.x, trapPos.y, monster.x, monster.y);
            if (dist <= allyHealRange) {
                monster.hp = Math.min(monster.hp + effect.healAlly, monster.maxHp);
            }
        }
    }

    applyWindEffect(target, effect, game) {
        target.takeDamage(effect.damage, 'physical');
        if (effect.knockback && (!target.data.resist?.knockback || Math.random() > target.data.resist.knockback)) {
            this.applyKnockback(target, game);
        }
    }

    applyVoidEffect(target, effect) {
        target.takeDamage(effect.damage, 'magic');
        // バフ解除
        if (effect.dispel) {
            target.statusEffects.effects = target.statusEffects.effects.filter(e =>
                !['buff', 'shield'].includes(e.type)
            );
        }
        // 沈黙
        const silenceEffect = new StatusEffect('silence', effect.silenceDuration, {});
        target.statusEffects.addEffect(silenceEffect);
    }

    applyRapidFireEffect(target, effect) {
        target.takeDamage(effect.damage, 'physical');
    }

    applyDarkMagicEffect(target, effect) {
        target.takeDamage(effect.damage, 'magic');
        if (effect.damageOverTime) {
            const darkEffect = new StatusEffect(
                effect.damageOverTime.tag,
                effect.damageOverTime.duration,
                { dps: effect.damageOverTime.dps }
            );
            target.statusEffects.addEffect(darkEffect);
        }
        // 吸血
        if (effect.lifesteal) {
            this.applyLifesteal(effect.damage, effect.lifesteal);
        }
    }

    applySleepEffect(target, effect) {
        const sleepEffect = new StatusEffect('sleep', effect.duration, {});
        target.statusEffects.addEffect(sleepEffect);
    }

    // 進化後の罠エフェクト
    applyFirePhysicalEffect(target, effect) {
        target.takeDamage(effect.damage, 'physical');
        if (effect.dot) {
            const burnEffect = new StatusEffect(
                effect.dot.tag,
                effect.dot.duration,
                { dps: effect.dot.dps }
            );
            target.statusEffects.addEffect(burnEffect);
        }
    }

    applyIcePhysicalEffect(target, effect) {
        target.takeDamage(effect.damage, 'physical');
        if (effect.slow) {
            const iceSlowEffect = new StatusEffect('slow', effect.slowDuration, { amount: effect.slow });
            target.statusEffects.addEffect(iceSlowEffect);
        }
    }

    applyPoisonPhysicalEffect(target, effect) {
        target.takeDamage(effect.damage, 'physical');
        if (effect.dot) {
            const poisonPhysicalEffect = new StatusEffect(
                effect.dot.tag,
                effect.dot.duration,
                { dps: effect.dot.dps, healingReduction: effect.healingReduction }
            );
            target.statusEffects.addEffect(poisonPhysicalEffect);
        }
    }

    applyLightningPhysicalEffect(target, effect, game, allTargets) {
        target.takeDamage(effect.damage, 'physical');
        // 連鎖攻撃
        if (effect.chainTargets > 1) {
            this.applyChainAttack(target, allTargets, effect, game, false);
        }
    }

    applyCursePhysicalEffect(target, effect) {
        target.takeDamage(effect.damage, 'physical');
        if (effect.dot) {
            const cursePhysicalEffect = new StatusEffect(
                effect.dot.tag,
                effect.dot.duration,
                { dps: effect.dot.dps, damageAmplify: effect.damageAmplify }
            );
            target.statusEffects.addEffect(cursePhysicalEffect);
        }
    }

    // ========== ユーティリティメソッド ==========

    /**
     * 吸血処理（統合）
     */
    applyLifesteal(damage, lifestealRatio) {
        const healAmount = damage * lifestealRatio;
        this.hp = Math.min(this.hp + healAmount, this.maxHp);
    }

    /**
     * 連鎖攻撃処理（統合）
     */
    applyChainAttack(firstTarget, allTargets, effect, game, dealInitialDamage = true) {
        let currentTarget = firstTarget;
        let damage = effect.damage;
        const hitTargets = new Set([currentTarget]);

        // 初撃ダメージ
        if (dealInitialDamage) {
            currentTarget.takeDamage(damage, 'lightning');
        } else {
            damage *= 0.5; // 既にダメージ済みなので連鎖分は半減
        }

        // 連鎖攻撃
        const maxChains = dealInitialDamage ? effect.chainTargets : effect.chainTargets - 1;
        for (let i = 1; i < maxChains; i++) {
            damage *= (1 - effect.chainDamageReduction);

            // 最も近い未ヒットの敵を探す
            let nextTarget = null;
            let minDist = Infinity;

            for (const target of allTargets) {
                if (hitTargets.has(target) || target.dead) continue;

                const dist = distance(currentTarget.x, currentTarget.y, target.x, target.y);
                if (dist < minDist) {
                    minDist = dist;
                    nextTarget = target;
                }
            }

            if (!nextTarget || minDist > game.grid.tileSize * TRAP_CONSTANTS.CHAIN_ATTACK_MAX_RANGE) break;

            nextTarget.takeDamage(damage, 'lightning');
            hitTargets.add(nextTarget);
            currentTarget = nextTarget;
        }
    }

    applyKnockback(target, game) {
        // 簡易ノックバック（後方に移動）
        if (target.pathIndex > 0) {
            target.pathIndex = Math.max(0, target.pathIndex - TRAP_CONSTANTS.KNOCKBACK_PATH_STEP);
            const newPos = game.grid.gridToWorld(
                target.path[target.pathIndex].x,
                target.path[target.pathIndex].y
            );
            target.x = newPos.x;
            target.y = newPos.y;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.destroyed = true;
        }
    }

    repair(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
        // 完全修理時のみdestroyedフラグをリセット
        if (this.hp >= this.maxHp * TRAP_CONSTANTS.REPAIR_MIN_HP_RATIO) {
            this.destroyed = false;
        }
    }

    draw(ctx, game) {
        const worldPos = game.grid.gridToWorld(this.gridX, this.gridY);
        const size = game.grid.tileSize * VISUAL_CONSTANTS.TRAP_SIZE_MULTIPLIER;

        // 罠の描画
        ctx.save();
        ctx.translate(worldPos.x, worldPos.y);

        // 背景
        if (this.hp <= 0) {
            ctx.fillStyle = '#555';
        } else if (this.cooldownTimer > 0) {
            ctx.fillStyle = '#888';
        } else {
            ctx.fillStyle = this.getTrapColor();
        }

        ctx.fillRect(-size / 2, -size / 2, size, size);

        // 枠（進化済みの罠は金色）
        if (this.data.evolved) {
            ctx.strokeStyle = '#ffd700';
        } else {
            ctx.strokeStyle = this.hp > 0 ? '#fff' : '#f00';
        }
        ctx.lineWidth = 2;
        ctx.strokeRect(-size / 2, -size / 2, size, size);

        // アイコン（簡易）
        drawCenteredText(ctx, this.getTrapIcon(), 0, -5, `${VISUAL_CONSTANTS.ICON_SIZE_TRAP}px Arial`, '#fff');

        // レベル表示
        if (this.level > 1) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Lv.${this.level}`, 0, 10);
        }

        // HPバー
        if (this.hp < this.maxHp) {
            drawHealthBar(ctx, -size / 2, size / 2 + VISUAL_CONSTANTS.HP_BAR_OFFSET,
                         size, VISUAL_CONSTANTS.HP_BAR_HEIGHT,
                         this.hp, this.maxHp, '#333', '#4ade80');
        }

        // 経験値バー（レベル1以上の場合）
        if (this.level >= 1 && this.exp > 0) {
            const expBarY = size / 2 + (this.hp < this.maxHp ? 12 : 7);
            const expRatio = this.exp / this.maxExp;

            // 背景
            ctx.fillStyle = '#222';
            ctx.fillRect(-size / 2, expBarY, size, 3);

            // 経験値バー
            ctx.fillStyle = '#00d4ff';
            ctx.fillRect(-size / 2, expBarY, size * expRatio, 3);
        }

        // クールダウン表示
        if (this.cooldownTimer > 0) {
            const cooldownRatio = this.cooldownTimer / this.data.cooldownSec;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-size / 2, -size / 2, size, size * cooldownRatio);
        }

        ctx.restore();
    }

    getTrapColor() {
        const colors = {
            spike_plate: '#e53e3e',
            arrow_wall: '#805ad5',
            oil_pot: '#dd6b20',
            fire_vent: '#f56565',
            ice_floor: '#4299e1',
            push_plate: '#48bb78',
            mine: '#ed8936',
            confusion_sign: '#9f7aea',
            soul_harvester: '#2d3748',
            lightning_rod: '#ecc94b',
            vampire_thorn: '#c53030',
            gravity_well: '#6b46c1',
            poison_cloud: '#38a169',
            mirror_trap: '#90cdf4',
            time_warp: '#4a5568',
            cursed_altar: '#553c9a',
            holy_barrier: '#fbd38d',
            mana_crystal: '#3182ce',
            healing_fountain: '#48bb78',
            berserk_sigil: '#c05621',
            shield_generator: '#63b3ed',
            acid_pool: '#9ae6b4',
            slow_zone: '#718096',
            electric_net: '#f6e05e',
            blood_altar: '#742a2a',
            wind_trap: '#e2e8f0',
            void_portal: '#1a202c',
            turret: '#4a5568',
            blade_spinner: '#cbd5e0',
            dark_ritual: '#2d3748',
            sleep_rune: '#b794f4',
            // 進化後の罠
            rapid_arrow_wall: '#9f7aea',
            flame_arrow_wall: '#fc8181',
            frost_arrow_wall: '#63b3ed',
            poison_arrow_wall: '#68d391',
            lightning_arrow_wall: '#f6e05e',
            curse_arrow_wall: '#805ad5'
        };
        return colors[this.id] || '#718096';
    }

    getTrapIcon() {
        const icons = {
            spike_plate: '▲',
            arrow_wall: '➤',
            oil_pot: '💧',
            fire_vent: '🔥',
            ice_floor: '❄',
            push_plate: '⬅',
            mine: '💣',
            confusion_sign: '❓',
            soul_harvester: '💀',
            lightning_rod: '⚡',
            vampire_thorn: '🩸',
            gravity_well: '🌀',
            poison_cloud: '☠',
            mirror_trap: '🪞',
            time_warp: '⏰',
            cursed_altar: '⚰',
            holy_barrier: '✨',
            mana_crystal: '💎',
            healing_fountain: '⛲',
            berserk_sigil: '⚔',
            shield_generator: '🛡',
            acid_pool: '🧪',
            slow_zone: '🐌',
            electric_net: '⚡',
            blood_altar: '🩸',
            wind_trap: '💨',
            void_portal: '🌑',
            turret: '🔫',
            blade_spinner: '⚙',
            dark_ritual: '🌙',
            sleep_rune: '💤',
            // 進化後の罠
            rapid_arrow_wall: '⏩',
            flame_arrow_wall: '🔥',
            frost_arrow_wall: '❄',
            poison_arrow_wall: '☠',
            lightning_arrow_wall: '⚡',
            curse_arrow_wall: '⚰'
        };
        return icons[this.id] || '■';
    }

    handleSpecialTraps(targets, game, deltaTime) {
        const effect = this.data.effect;

        // ソウル収穫機
        if (effect.type === 'soul_generation') {
            // パッシブ効果: game.jsで敵撃破時に処理
            // ここでは何もしない
        }

        // マナ結晶
        if (effect.type === 'mana_generation') {
            // パッシブ効果: game.jsで毎フレーム処理
        }

        // 回転刃
        if (effect.type === 'spin_damage') {
            const worldPos = game.grid.gridToWorld(this.gridX, this.gridY);
            const range = effect.radius * game.grid.tileSize;

            for (const enemy of game.enemies) {
                if (enemy.dead) continue;
                const dist = distance(worldPos.x, worldPos.y, enemy.x, enemy.y);
                if (dist <= range) {
                    // deltaTimeを使用して正確なダメージ計算
                    enemy.takeDamage(effect.dps * deltaTime, 'physical');
                }
            }
        }

        // 聖なる結界
        if (effect.type === 'buff_allies') {
            const worldPos = game.grid.gridToWorld(this.gridX, this.gridY);
            const range = this.data.range * game.grid.tileSize;

            for (const monster of game.monsters) {
                if (monster.dead) continue;

                const dist = distance(worldPos.x, worldPos.y, monster.x, monster.y);
                if (dist <= range) {
                    // バフを適用
                    monster.damageReduction = effect.damageReduction;
                    monster.hp = Math.min(monster.hp + effect.healPerSec * deltaTime, monster.maxHp);
                }
            }
        }

        // 回復の泉
        if (effect.type === 'heal_allies_aura') {
            const worldPos = game.grid.gridToWorld(this.gridX, this.gridY);
            const range = effect.radius * game.grid.tileSize;

            for (const monster of game.monsters) {
                if (monster.dead) continue;

                const dist = distance(worldPos.x, worldPos.y, monster.x, monster.y);
                if (dist <= range && monster.hp < monster.maxHp) {
                    // deltaTimeを使用
                    monster.hp = Math.min(monster.hp + effect.healPerSec * deltaTime, monster.maxHp);
                }
            }
        }

        // バーサーク符
        if (effect.type === 'attack_speed_buff') {
            const worldPos = game.grid.gridToWorld(this.gridX, this.gridY);
            const range = effect.radius * game.grid.tileSize;

            for (const monster of game.monsters) {
                if (monster.dead) continue;

                const dist = distance(worldPos.x, worldPos.y, monster.x, monster.y);
                if (dist <= range) {
                    // 攻撃速度バフを適用
                    monster.attackSpeedBonus = effect.attackSpeedBonus;
                }
            }
        }

        // シールド発生装置
        if (effect.type === 'shield_aura') {
            if (!this.shieldTimer) this.shieldTimer = 0;
            this.shieldTimer += deltaTime;

            if (this.shieldTimer >= effect.interval) {
                const worldPos = game.grid.gridToWorld(this.gridX, this.gridY);
                const range = effect.radius * game.grid.tileSize;

                for (const monster of game.monsters) {
                    if (monster.dead) continue;

                    const dist = distance(worldPos.x, worldPos.y, monster.x, monster.y);
                    if (dist <= range) {
                        // バリア付与
                        if (!monster.barrier) monster.barrier = 0;
                        monster.barrier += effect.shieldAmount;
                    }
                }

                this.shieldTimer = 0;
            }
        }

        // 吸血の棘（範囲攻撃時の吸血）
        if (effect.type === 'physical' && effect.lifesteal && targets.length > 0) {
            const totalDamage = effect.damage * targets.length;
            this.applyLifesteal(totalDamage, effect.lifesteal);
        }
    }
}
