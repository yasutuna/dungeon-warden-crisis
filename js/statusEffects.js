// 状態異常システム

class StatusEffect {
    constructor(type, duration, data = {}) {
        this.type = type;
        this.duration = duration;
        this.remainingTime = duration;
        this.data = typeof deepCopy === 'function'
            ? deepCopy(data)
            : JSON.parse(JSON.stringify(data || {}));
        this.runtime = {};
        this.stacks = data.stacks || 1;
    }

    update(deltaTime) {
        this.remainingTime -= deltaTime;
        return this.remainingTime <= 0;
    }

    apply(target, deltaTime, game) {
        switch (this.type) {
            case 'bleed': {
                target.takeDamage((this.data.dps || 5) * deltaTime, 'bleed');
                break;
            }

            case 'burn': {
                let burnDamage = (this.data.dps || 12) * deltaTime;
                if (target.statusEffects && target.statusEffects.hasEffect('oiled')) {
                    burnDamage *= 2;
                }
                target.takeDamage(burnDamage, 'fire');
                break;
            }

            case 'freeze':
                target.moveSpeed = 0;
                break;

            case 'slow': {
                const slowAmount = this.data.amount || 0.4;
                target.moveSpeed *= (1 - slowAmount);
                break;
            }

            case 'stun':
                target.stunned = true;
                target.moveSpeed = 0;
                break;

            case 'oiled':
                target.moveSpeed *= 0.8;
                target.fireVulnerability = 1.5;
                break;

            case 'shield': {
                const amount = this.data.amount || 50;
                if (!this.runtime.shieldApplied) {
                    // Grant the barrier a single time per effect instance so it can be depleted normally
                    const currentBarrier = target.barrier || 0;
                    target.barrier = Math.max(currentBarrier, amount);
                    this.runtime.shieldApplied = true;
                    this.runtime.shieldAmount = amount;
                }
                break;
            }

            case 'confused':
                target.confused = true;
                break;

            case 'wildfire':
                this.applyWildfire(target, deltaTime, game);
                break;
        }
    }

    remove(target) {
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

    applyWildfire(target, deltaTime, game) {
        if (!game || !target) return;

        if (!this.runtime.initialized) {
            this.runtime.initialized = true;
            this.runtime.lastX = target.x;
            this.runtime.lastY = target.y;
            this.runtime.distanceBuffer = 0;
            this.runtime.secondAccumulator = 0;
        }

        const dx = target.x - this.runtime.lastX;
        const dy = target.y - this.runtime.lastY;
        const traveled = Math.sqrt(dx * dx + dy * dy);
        this.runtime.distanceBuffer += traveled;
        this.runtime.lastX = target.x;
        this.runtime.lastY = target.y;

        const tileSize = this.data.tileSize || game.grid?.tileSize || 40;
        const tilesCrossed = Math.floor(this.runtime.distanceBuffer / tileSize);

        if (tilesCrossed > 0) {
            this.runtime.distanceBuffer -= tilesCrossed * tileSize;
            let damage = tilesCrossed * (this.data.damagePerTile || 10);
            const bonus = this.countWildfireNeighbors(target, game) * (this.data.neighborBonus || 0.1);
            damage *= (1 + bonus);
            target.takeDamage(damage, 'fire');
        }

        this.runtime.secondAccumulator += deltaTime;
        while (this.runtime.secondAccumulator >= 1) {
            this.runtime.secondAccumulator -= 1;

            if (Math.random() < (this.data.spreadChance || 0.1)) {
                this.spreadWildfire(target, game);
            }

            if (Math.random() < (this.data.extinguishChance || 0.05)) {
                this.remainingTime = 0;
                break;
            }
        }
    }

    countWildfireNeighbors(target, game) {
        const pool = this.getWildfirePool(target, game);
        if (!pool || pool.length === 0) return 0;

        const radius = (this.data.neighborRadius || 2) * (this.data.tileSize || game.grid?.tileSize || 40);
        let burning = 0;

        for (const entity of pool) {
            if (entity === target || entity.dead || !entity.statusEffects) continue;
            if (!entity.statusEffects.hasEffect('wildfire')) continue;
            if (distance(entity.x, entity.y, target.x, target.y) <= radius) {
                burning++;
            }
        }

        return burning;
    }

    spreadWildfire(target, game) {
        const pool = this.getWildfirePool(target, game);
        if (!pool || pool.length === 0) return;

        const radius = (this.data.spreadRadius || 2) * (this.data.tileSize || game.grid?.tileSize || 40);
        const candidates = pool.filter(entity => {
            if (entity === target || entity.dead || !entity.statusEffects) return false;
            if (entity.statusEffects.hasEffect('wildfire')) return false;
            return distance(entity.x, entity.y, target.x, target.y) <= radius;
        });

        if (candidates.length === 0) return;

        const next = candidates[Math.floor(Math.random() * candidates.length)];
        const dataCopy = typeof deepCopy === 'function'
            ? deepCopy(this.data)
            : JSON.parse(JSON.stringify(this.data));
        const newEffect = new StatusEffect('wildfire', this.duration, dataCopy);
        next.statusEffects.addEffect(newEffect);
    }

    getWildfirePool(target, game) {
        if (!game) return [];
        if (Array.isArray(game.enemies) && game.enemies.includes(target)) {
            return game.enemies;
        }
        if (Array.isArray(game.monsters) && game.monsters.includes(target)) {
            return game.monsters;
        }
        return game.enemies || [];
    }
}

class StatusEffectManager {
    constructor(entity) {
        this.entity = entity;
        this.effects = [];
    }

    addEffect(effect) {
        const existingEffect = this.effects.find(e => e.type === effect.type);

        if (existingEffect) {
            if (effect.type === 'bleed' && existingEffect.stacks < 3) {
                existingEffect.stacks++;
                existingEffect.data.dps += effect.data.dps;
                existingEffect.remainingTime = Math.max(existingEffect.remainingTime, effect.remainingTime);
            } else {
                existingEffect.remainingTime = effect.duration;
                if (effect.type === 'shield') {
                    existingEffect.runtime.shieldApplied = false;
                    existingEffect.data = typeof deepCopy === 'function'
                        ? deepCopy(effect.data)
                        : JSON.parse(JSON.stringify(effect.data || {}));
                }
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

    update(deltaTime, game) {
        this.entity.moveSpeed = this.entity.baseSpeed || this.entity.speed;
        this.entity.stunned = false;
        this.entity.confused = false;
        this.entity.fireVulnerability = 1.0;

        this.effects = this.effects.filter(effect => {
            effect.apply(this.entity, deltaTime, game);
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

    cleanse() {
        const debuffs = ['bleed', 'burn', 'freeze', 'slow', 'stun', 'oiled', 'confused', 'wildfire'];
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
