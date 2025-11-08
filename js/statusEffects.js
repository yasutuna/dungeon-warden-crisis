// 状態異常システム

class StatusEffect {
    constructor(type, duration, data = {}) {
        this.type = type; // bleed, burn, freeze, slow, stun, oiled, shield, confused
        this.duration = duration;
        this.remainingTime = duration;
        this.data = data;
        this.stacks = data.stacks || 1;
    }

    update(deltaTime) {
        this.remainingTime -= deltaTime;
        return this.remainingTime <= 0;
    }

    apply(target, deltaTime) {
        switch (this.type) {
            case 'bleed':
                // 毎秒ダメージ
                target.takeDamage((this.data.dps || 5) * deltaTime, 'bleed');
                break;

            case 'burn':
                // 毎秒火炎ダメージ
                let burnDamage = (this.data.dps || 12) * deltaTime;
                // 油濡れ状態なら倍化
                if (target.statusEffects && target.statusEffects.hasEffect('oiled')) {
                    burnDamage *= 2;
                }
                target.takeDamage(burnDamage, 'fire');
                break;

            case 'freeze':
                // 移動停止
                target.moveSpeed = 0;
                break;

            case 'slow':
                // 移動速度低下
                const slowAmount = this.data.amount || 0.4;
                target.moveSpeed *= (1 - slowAmount);
                break;

            case 'stun':
                // 行動不能
                target.stunned = true;
                target.moveSpeed = 0;
                break;

            case 'oiled':
                // 油濡れ状態（火炎ダメージ増加、移動速度低下）
                target.moveSpeed *= 0.8;
                target.fireVulnerability = 1.5;
                break;

            case 'shield':
                // バリア（ダメージ吸収）
                if (!target.barrier) {
                    target.barrier = this.data.amount || 50;
                }
                break;

            case 'confused':
                // 混乱（ターゲット優先度乱れ）
                target.confused = true;
                break;
        }
    }

    remove(target) {
        // 効果終了時の処理
        switch (this.type) {
            case 'freeze':
            case 'stun':
                target.stunned = false;
                break;

            case 'oiled':
                target.fireVulnerability = 1.0;
                break;

            case 'confused':
                target.confused = false;
                break;
        }
    }
}

class StatusEffectManager {
    constructor(entity) {
        this.entity = entity;
        this.effects = [];
    }

    addEffect(effect) {
        // 既存の同じタイプの効果を確認
        const existingEffect = this.effects.find(e => e.type === effect.type);

        if (existingEffect) {
            // スタック可能な効果（出血など）
            if (effect.type === 'bleed' && existingEffect.stacks < 3) {
                existingEffect.stacks++;
                existingEffect.data.dps += effect.data.dps;
                existingEffect.remainingTime = Math.max(existingEffect.remainingTime, effect.remainingTime);
            } else {
                // 持続時間をリフレッシュ
                existingEffect.remainingTime = effect.duration;
            }
        } else {
            this.effects.push(effect);
        }
    }

    hasEffect(type) {
        return this.effects.some(e => e.type === type);
    }

    getEffect(type) {
        return this.effects.find(e => e.type === type);
    }

    update(deltaTime) {
        // リセット（毎フレーム再計算）
        this.entity.moveSpeed = this.entity.baseSpeed || this.entity.speed;
        this.entity.stunned = false;
        this.entity.confused = false;
        this.entity.fireVulnerability = 1.0;

        // 効果の更新
        this.effects = this.effects.filter(effect => {
            effect.apply(this.entity, deltaTime);
            const expired = effect.update(deltaTime);

            if (expired) {
                effect.remove(this.entity);
            }

            return !expired;
        });
    }

    clear() {
        for (const effect of this.effects) {
            effect.remove(this.entity);
        }
        this.effects = [];
    }

    // 浄化（デバフ解除）
    cleanse() {
        const debuffs = ['bleed', 'burn', 'freeze', 'slow', 'stun', 'oiled', 'confused'];
        this.effects = this.effects.filter(effect => {
            const isDebuff = debuffs.includes(effect.type);
            if (isDebuff) {
                effect.remove(this.entity);
            }
            return !isDebuff;
        });
    }

    getActiveEffects() {
        return this.effects.map(e => ({
            type: e.type,
            remainingTime: e.remainingTime,
            stacks: e.stacks
        }));
    }
}
