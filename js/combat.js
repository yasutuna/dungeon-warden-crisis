// 戦闘システムとダメージ計算

class CombatSystem {
    constructor() {
        this.damageLog = [];
    }

    calculateDamage(baseDamage, attacker, defender, damageType = 'physical') {
        let finalDamage = baseDamage;

        // 攻撃者の強化
        if (attacker && attacker.damageBonus) {
            finalDamage *= (1 + attacker.damageBonus);
        }

        // 防御者の耐性
        if (defender && defender.resist && defender.resist[damageType]) {
            finalDamage *= (1 - defender.resist[damageType]);
        }

        // 状態異常による修正
        if (defender && defender.statusEffects) {
            // 油濡れ + 火炎
            if (damageType === 'fire' && defender.statusEffects.hasEffect('oiled')) {
                finalDamage *= 1.5;
            }

            // 凍結中の砕き効果
            if (defender.vulnerableToShatter) {
                finalDamage *= 1.3;
            }
        }

        // クリティカル判定
        const critChance = COMBAT_CONSTANTS.BASE_CRIT_CHANCE; // 基本5%
        if (Math.random() < critChance) {
            finalDamage *= 1.5;
            this.logDamage(defender, finalDamage, damageType, true);
        } else {
            this.logDamage(defender, finalDamage, damageType, false);
        }

        return Math.max(0, finalDamage);
    }

    applyDamage(target, damage, damageType = 'physical', attacker = null) {
        const finalDamage = this.calculateDamage(damage, attacker, target, damageType);

        if (target.takeDamage) {
            target.takeDamage(finalDamage, damageType);
        }

        return finalDamage;
    }

    logDamage(target, damage, type, critical) {
        this.damageLog.push({
            target: target,
            damage: damage,
            type: type,
            critical: critical,
            timestamp: Date.now()
        });

        // ログのクリーンアップ（古いものを削除）
        if (this.damageLog.length > 100) {
            this.damageLog.shift();
        }
    }

    // 範囲攻撃
    areaAttack(centerX, centerY, radius, damage, damageType, targets, attacker = null) {
        const hitTargets = [];

        for (const target of targets) {
            if (target.dead || target.destroyed) continue;

            let targetX, targetY;
            if (target.x !== undefined) {
                targetX = target.x;
                targetY = target.y;
            } else if (target.gridX !== undefined) {
                targetX = target.gridX;
                targetY = target.gridY;
            } else {
                continue;
            }

            const dist = distance(centerX, centerY, targetX, targetY);

            if (dist <= radius) {
                this.applyDamage(target, damage, damageType, attacker);
                hitTargets.push(target);
            }
        }

        return hitTargets;
    }

    // DoT（継続ダメージ）の適用
    applyDoT(target, dps, duration, dotType) {
        if (!target.statusEffects) return;

        const dotEffect = new StatusEffect(dotType, duration, { dps: dps });
        target.statusEffects.addEffect(dotEffect);
    }
}
