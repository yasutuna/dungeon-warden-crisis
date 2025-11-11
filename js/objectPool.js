/**
 * オブジェクトプール - メモリ効率とパフォーマンスの最適化
 * 頻繁に生成・破棄されるオブジェクトを再利用してGCの負荷を軽減
 */

class ObjectPool {
    constructor(factory, reset, initialSize = 10) {
        this.factory = factory; // オブジェクト生成関数
        this.reset = reset;     // オブジェクトリセット関数
        this.available = [];    // 利用可能なオブジェクト
        this.inUse = [];        // 使用中のオブジェクト

        // 初期オブジェクトを生成
        for (let i = 0; i < initialSize; i++) {
            this.available.push(this.factory());
        }
    }

    /**
     * プールからオブジェクトを取得
     * 利用可能なオブジェクトがない場合は新規作成
     */
    acquire(...args) {
        let obj;

        if (this.available.length > 0) {
            obj = this.available.pop();
        } else {
            obj = this.factory();
        }

        this.reset(obj, ...args);
        this.inUse.push(obj);
        return obj;
    }

    /**
     * オブジェクトをプールに返却
     */
    release(obj) {
        const index = this.inUse.indexOf(obj);
        if (index !== -1) {
            this.inUse.splice(index, 1);
            this.available.push(obj);
        }
    }

    /**
     * 全ての使用中オブジェクトを返却
     */
    releaseAll() {
        while (this.inUse.length > 0) {
            this.available.push(this.inUse.pop());
        }
    }

    /**
     * プールの統計情報
     */
    getStats() {
        return {
            available: this.available.length,
            inUse: this.inUse.length,
            total: this.available.length + this.inUse.length
        };
    }

    /**
     * プール内の全オブジェクトを破棄
     */
    clear() {
        this.available = [];
        this.inUse = [];
    }
}

/**
 * エフェクトプール（パーティクル、ダメージ数値など）
 */
class EffectPool {
    constructor() {
        // パーティクルエフェクト用プール
        this.particlePool = new ObjectPool(
            () => ({
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                life: 0,
                maxLife: 0,
                color: '#fff',
                size: 2,
                active: false
            }),
            (particle, x, y, vx, vy, life, color, size) => {
                particle.x = x;
                particle.y = y;
                particle.vx = vx;
                particle.vy = vy;
                particle.life = life;
                particle.maxLife = life;
                particle.color = color;
                particle.size = size;
                particle.active = true;
            },
            50
        );

        // ダメージ数値表示用プール
        this.damageTextPool = new ObjectPool(
            () => ({
                x: 0,
                y: 0,
                text: '',
                life: 0,
                maxLife: 0,
                color: '#fff',
                fontSize: 16,
                active: false
            }),
            (damageText, x, y, text, color, fontSize) => {
                damageText.x = x;
                damageText.y = y;
                damageText.text = text;
                damageText.life = 1.0; // 1秒間表示
                damageText.maxLife = 1.0;
                damageText.color = color;
                damageText.fontSize = fontSize;
                damageText.active = true;
            },
            30
        );
    }

    /**
     * パーティクルエフェクトを作成
     */
    createParticle(x, y, vx, vy, life = 1.0, color = '#fff', size = 2) {
        return this.particlePool.acquire(x, y, vx, vy, life, color, size);
    }

    /**
     * ダメージ数値を作成
     */
    createDamageText(x, y, damage, critical = false) {
        const color = critical ? '#ffff00' : '#ff6565';
        const fontSize = critical ? 20 : 16;
        const text = Math.floor(damage).toString();
        return this.damageTextPool.acquire(x, y, text, color, fontSize);
    }

    /**
     * 爆発エフェクトを作成（範囲攻撃用）
     */
    createExplosion(x, y, radius) {
        const particleCount = Math.floor(radius / 3);
        const colors = ['#ff6347', '#ff8c00', '#ffd700', '#ff4500'];

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = radius * 0.5 + Math.random() * radius * 0.3;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const life = 0.4 + Math.random() * 0.3;
            const size = 3 + Math.random() * 4;

            this.createParticle(x, y, vx, vy, life, color, size);
        }
    }

    /**
     * エフェクトを更新
     */
    updateEffects(deltaTime) {
        // パーティクル更新
        const particles = this.particlePool.inUse;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            if (p.active) {
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.life -= deltaTime;

                if (p.life <= 0) {
                    p.active = false;
                    this.particlePool.release(p);
                }
            }
        }

        // ダメージテキスト更新
        const damageTexts = this.damageTextPool.inUse;
        for (let i = damageTexts.length - 1; i >= 0; i--) {
            const dt = damageTexts[i];
            if (dt.active) {
                dt.y -= 20 * deltaTime; // 上に移動
                dt.life -= deltaTime;

                if (dt.life <= 0) {
                    dt.active = false;
                    this.damageTextPool.release(dt);
                }
            }
        }
    }

    /**
     * エフェクトを描画
     */
    drawEffects(ctx) {
        // パーティクル描画
        const particles = this.particlePool.inUse;
        for (const p of particles) {
            if (p.active) {
                const alpha = p.life / p.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ダメージテキスト描画
        const damageTexts = this.damageTextPool.inUse;
        for (const dt of damageTexts) {
            if (dt.active) {
                const alpha = dt.life / dt.maxLife;
                ctx.globalAlpha = alpha;
                ctx.font = `bold ${dt.fontSize}px Arial`;
                ctx.fillStyle = dt.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(dt.text, dt.x, dt.y);
            }
        }

        ctx.globalAlpha = 1.0;
    }

    /**
     * 全エフェクトをクリア
     */
    clear() {
        this.particlePool.clear();
        this.damageTextPool.clear();
    }

    /**
     * 統計情報
     */
    getStats() {
        return {
            particles: this.particlePool.getStats(),
            damageTexts: this.damageTextPool.getStats()
        };
    }
}
