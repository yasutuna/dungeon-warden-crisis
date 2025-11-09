const OFFENSIVE_ACTIVE_SKILL_TYPES = new Set([

    'instant_damage',

    'multi_shot',

    'aoe_freeze',

    'cone_attack',

    'aoe_stun',

    'aoe_damage',

    'stun',

    'debuff_enemies'

]);

const GROUND_TRAVERSABLE_TILES = new Set(['path', 'spawn', 'core']);

const FLYING_TRAVERSABLE_TILES = new Set(['elevated', 'path', 'spawn', 'core']);



// モンスタークラス

class Monster {

    constructor(data, x, y, level = 1) {

        this.data = deepCopy(data);

        this.id = data.id;

        this.name = data.name;

        this.gridX = x;

        this.gridY = y;

        this.level = level;



        // レベルによるステータススケーリング

        const hpScale = 1 + (level - 1) * 0.2; // レベル毎に+20% HP

        const damageScale = 1 + (level - 1) * 0.15; // レベル毎に+15% 攻撃力



        // 座標はplaceMonsterで設定されるため、ここでは初期化のみ

        this.x = 0;

        this.y = 0;

        this.hp = Math.floor(data.hp * hpScale);

        this.maxHp = Math.floor(data.maxHp * hpScale);



        // 攻撃力のスケーリング

        this.attack = deepCopy(data.attack);

        if (this.attack && this.attack.damage) {

            this.attack.damage = Math.floor(this.attack.damage * damageScale);

        }



        this.moveSpeed = data.moveSpeed || 1.0;

        this.baseSpeed = this.moveSpeed;

        this.flying = data.flying || false;

        this.active = true;

        this.dead = false;

        this.attackCooldown = 0;

        this.activeCooldown = 0;

        this.target = null;

        this.statusEffects = new StatusEffectManager(this);

        this.skillRangeTiles = this.data.active && this.data.active.effect

            ? (this.data.active.effect.range || 0)

            : 0;

        this.demonLordBuff = null;

        this.deathProcessed = false;

        this.shouldSplit = false;

        this.shouldShowReviveEffect = false;

        this.barrier = 0;

        this.fireVulnerability = 1.0;

        this.healingReceivedMultiplier = 1.0;



        // 攻撃アニメーション用

        this.attackAnimationTimer = 0;

        this.isAttackAnimating = false;



        // 経験値システム

        this.exp = 0;

        this.expToNextLevel = this.calculateExpToNextLevel();

        this.killCount = 0; // 撃破数



        // スキルシステム

        this.learnedSkills = []; // 習得したスキルのリスト

        this.skillMap = new Map(); // スキルの高速検索用Map（パフォーマンス最適化）

        this.damageBonus = 0; // 攻撃力ボーナス

        this.critChance = 0; // クリティカル確率

        this.critMultiplier = 1.5; // クリティカル倍率

        this.lifeStealRate = 0; // 吸血率

        this.attackSpeedBonus = 0; // 攻撃速度ボーナス

        this.skillRuntime = new Map();



        // 初期スキルを1つランダムで習得

        this.learnInitialSkill();



        // AI状態

        this.state = 'idle'; // idle, moving, attacking

        this.patrolRadius = data.patrolRadius || MONSTER_AI_CONSTANTS.DEFAULT_PATROL_RADIUS;



        // ゴブリン工兵専用の設定

        if (this.id === 'goblin_engineer') {

            this.trapPlacementCount = 0; // 設置した罠の数

            this.maxTrapPlacements = level; // レベルの数だけ罠を設置可能

            this.wanderTarget = null; // ランダム移動先

            this.wanderTimer = 0; // 次のランダム移動までの時間

        }



        // ゴーレムの挑発設定

        if (this.id === 'golem' && data.taunt) {

            this.taunt = data.taunt;

            this.isTaunting = true; // 挑発フラグ

        }

    }



    calculateExpToNextLevel() {

        // レベルアップに必要な経験値（指数的に増加）

        return Math.floor(100 * Math.pow(1.5, this.level - 1));

    }



    learnInitialSkill() {

        // 初期スキルを1つランダムで習得

        const availableSkills = [];

        for (const skillId in SKILL_POOL) {

            availableSkills.push(SKILL_POOL[skillId]);

        }



        if (availableSkills.length > 0) {

            const selectedSkill = this.selectSkillByRarity(availableSkills);

            if (selectedSkill) {

                this.learnedSkills.push(selectedSkill);

                this.skillMap.set(selectedSkill.id, selectedSkill); // Map に登録（高速検索用）

                this.applySkillEffect(selectedSkill);

            }

        }

    }



    gainExp(amount) {

        this.exp += amount;



        // レベルアップチェック

        while (this.exp >= this.expToNextLevel) {

            this.levelUp();

        }

    }



    levelUp() {

        this.exp -= this.expToNextLevel;

        this.level++;



        // ステータス上昇

        const hpIncrease = Math.floor(this.data.hp * 0.2);

        this.maxHp += hpIncrease;

        this.hp += hpIncrease; // レベルアップ時にHPも回復



        if (this.attack && this.attack.damage) {

            const damageIncrease = Math.floor(this.data.attack.damage * 0.15);

            this.attack.damage += damageIncrease;

        }



        this.expToNextLevel = this.calculateExpToNextLevel();



        // ゴブリン工兵のレベルアップ時に罠設置上限を増やす

        if (this.id === 'goblin_engineer') {

            this.maxTrapPlacements = this.level;

        }



        // スキル習得（2レベル毎）

        if (this.level % 2 === 0) {

            this.learnRandomSkill();

        }



        // レベルアップエフェクト（ゲームから呼ばれる）

        return true;

    }



    learnRandomSkill() {

        // 習得可能なスキルをフィルタリング

        const availableSkills = [];

        for (const skillId in SKILL_POOL) {

            const skill = SKILL_POOL[skillId];

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

            case 'crit_chance':

                this.critChance += effect.value;

                this.critMultiplier = effect.multiplier;

                break;



            case 'damage_bonus':

                this.damageBonus += effect.value;

                break;



            case 'life_steal':

                this.lifeStealRate += effect.value;

                break;



            case 'max_hp_bonus':

                const hpBonus = Math.floor(this.maxHp * effect.value);

                this.maxHp += hpBonus;

                this.hp += hpBonus;

                break;



            case 'move_speed':

                // 移動速度が0の場合は変更しない（魔王など）

                if (this.baseSpeed > 0) {

                    this.baseSpeed = this.baseSpeed * (1 + effect.value);

                    this.moveSpeed = this.baseSpeed;

                }

                break;



            case 'attack_speed':

                this.attackSpeedBonus += effect.value;

                break;



            case 'hunter':

                this.patrolRadius += effect.range;

                break;



            // その他のスキルエフェクトは戦闘時に動的に適用

            default:

                break;

        }

    }



    update(deltaTime, enemies, game) {

        if (this.dead) return;



        // 攻撃アニメーション更新

        if (this.attackAnimationTimer > 0) {

            this.attackAnimationTimer -= deltaTime;

            if (this.attackAnimationTimer <= 0) {

                this.isAttackAnimating = false;

            }

        }



        // 状態異常更新

        this.statusEffects.update(deltaTime, game);



        // スタン中は何もしない

        if (this.stunned) {

            return;

        }



        // ゴブリン工兵の特殊AI

        if (this.id === 'goblin_engineer') {

            this.updateGoblinEngineerAI(deltaTime, enemies, game);

            return;

        }



        // 魔王の特殊AI（スライム変換）

        if (this.id === 'demon_lord') {

            this.updateDemonLordAI(deltaTime, enemies, game);

            // 魔王は移動しないため、ここで処理を終了

            // スキルエフェクトを適用

            this.applyPassiveSkillEffects(deltaTime, game);



            // クールダウン更新

            if (this.attackCooldown > 0) {

                this.attackCooldown -= deltaTime;

            }

            if (this.activeCooldown > 0) {

                this.activeCooldown -= deltaTime;

            }



            // ターゲット探索と攻撃のみ実行（移動はしない）

            this.findTarget(enemies, game);



            if (this.target && !this.target.dead) {

                const dist = distance(this.x, this.y, this.target.x, this.target.y);

                const attackRange = this.getAttackRangePixels(game);



                if (dist <= attackRange) {

                    this.state = 'attacking';

                    if (this.attackCooldown <= 0) {

                        this.performAttack(this.target, game);

                        this.attackCooldown = this.attack.interval;

                    }

                } else {

                    this.state = 'idle';

                }

            } else {

                this.state = 'idle';

            }



            // アクティブスキル（自動発動）

            if (this.data.active && this.activeCooldown <= 0) {

                this.useActiveSkill(game);

            }



            return; // 魔王は移動しないため、ここで処理終了

        }



        // スキルエフェクトを適用

        this.applyPassiveSkillEffects(deltaTime, game);



        // 攻撃速度バフをリセット（毎フレーム再計算）

        let attackSpeedBonus = 0;



        // rapid_fireスキルの効果を適用

        const rapidFire = this.skillMap.get('rapid_fire');

        if (rapidFire) {

            attackSpeedBonus += rapidFire.effect.value;

        }



        // クールダウン更新（攻撃速度バフを考慮）

        const attackSpeedMultiplier = 1 + attackSpeedBonus;

        if (this.attackCooldown > 0) {

            this.attackCooldown -= deltaTime * attackSpeedMultiplier;

        }



        if (this.activeCooldown > 0) {

            this.activeCooldown -= deltaTime;

        }



        // ターゲット探索

        this.findTarget(enemies, game);



        if (this.target && !this.target.dead) {

            const dist = distance(this.x, this.y, this.target.x, this.target.y);

            const attackRange = this.getAttackRangePixels(game);



            if (dist <= attackRange) {

                // 攻撃

                this.state = 'attacking';

                if (this.attackCooldown <= 0) {

                    this.performAttack(this.target, game);

                    this.attackCooldown = this.attack.interval;

                }

            } else if (dist < this.getTargetingRange(game) && this.moveSpeed > 0) {

                // 追跡（移動速度が0より大きい場合のみ）

                this.state = 'moving';

                this.moveTowards(this.target.x, this.target.y, deltaTime, game);

            } else {

                this.state = 'idle';

            }

        } else {

            this.state = 'idle';

        }



        // アクティブスキル（自動発動）

        if (this.data.active && this.activeCooldown <= 0) {

            this.useActiveSkill(game);

        }

    }



    updateGoblinEngineerAI(deltaTime, enemies, game) {

        // クールダウン更新

        if (this.attackCooldown > 0) {

            this.attackCooldown -= deltaTime;

        }

        if (this.activeCooldown > 0) {

            this.activeCooldown -= deltaTime;

        }



        // ウェーブが進行中でない場合は待機

        if (!game.waveManager.isWaveInProgress()) {

            this.state = 'idle';

            return;

        }



        // ワンダータイマー更新

        this.wanderTimer -= deltaTime;



        // 1. ダメージを受けている罠を索敵範囲内で探す

        const damagedTrap = this.findDamagedTrap(game);



        if (damagedTrap) {

            // 2. ダメージを受けている罠がある場合、修理に向かう

            this.state = 'repairing';

            const trapX = damagedTrap.gridX * game.grid.tileSize + game.grid.tileSize / 2;

            const trapY = damagedTrap.gridY * game.grid.tileSize + game.grid.tileSize / 2;

            // 罠までの距離を計算
            const dist = distance(this.x, this.y, trapX, trapY);

            // 衝突がない場合のみ移動



            if (dist <= game.grid.tileSize * 1.5) {

                // 罠の近くに到達したら修理

                if (this.activeCooldown <= 0) {

                    damagedTrap.repair(this.data.active.effect.healAmount);

                    this.activeCooldown = this.data.active.cooldown;

                    game.ui.showMessage(`${this.name}が罠を修理しました`, 'info');

                }

            } else {

                // 罠に向かって移動

                this.moveTowards(trapX, trapY, deltaTime, game);

            }

        } else {

            // 3. ダメージを受けている罠がない場合

            if (this.trapPlacementCount < this.maxTrapPlacements) {

                // 罠を設置可能な場合、ランダムに移動して罠を設置

                this.state = 'wandering';

                this.wanderAndPlaceTrap(deltaTime, game);

            } else {

                // 罠設置上限に達した場合、通常のAI（アイドル状態）

                this.state = 'idle';

            }

        }

    }



    findDamagedTrap(game) {

        // 索敵範囲内でダメージを受けている罠を探す

        let closestTrap = null;

        let closestDist = Infinity;

        const searchRange = this.patrolRadius * game.grid.tileSize;



        for (const trap of game.traps) {

            if (trap.destroyed || trap.hp >= trap.maxHp) continue;



            const trapX = trap.gridX * game.grid.tileSize + game.grid.tileSize / 2;

            const trapY = trap.gridY * game.grid.tileSize + game.grid.tileSize / 2;

            const dist = distance(this.x, this.y, trapX, trapY);



            if (dist <= searchRange && dist < closestDist) {

                closestDist = dist;

                closestTrap = trap;

            }

        }



        return closestTrap;

    }



    wanderAndPlaceTrap(deltaTime, game) {

        // ランダムな目標地点に移動

        if (!this.wanderTarget || this.wanderTimer <= 0) {

            // 新しいランダムな目標を設定

            const randomX = Math.floor(Math.random() * game.grid.cols);

            const randomY = Math.floor(Math.random() * game.grid.rows);



            // 罠が無い場所のみを探す（上書きしない）

            if (game.grid.canPlaceTrap(randomX, randomY, false)) {

                this.wanderTarget = { x: randomX, y: randomY };

                this.wanderTimer = 5; // 5秒以内に到達できなければ新しい目標を設定

            }

        }



        if (this.wanderTarget) {

            const targetX = this.wanderTarget.x * game.grid.tileSize + game.grid.tileSize / 2;

            const targetY = this.wanderTarget.y * game.grid.tileSize + game.grid.tileSize / 2;

            const dist = distance(this.x, this.y, targetX, targetY);



            if (dist <= game.grid.tileSize * 0.8) {

                // 目標地点に到達したら罠を設置

                this.placeTrap(this.wanderTarget.x, this.wanderTarget.y, game);

                this.wanderTarget = null;

            } else {

                // 目標に向かって移動

                this.moveTowards(targetX, targetY, deltaTime, game);

            }

        }

    }



    placeTrap(gx, gy, game) {

        // ゴブリン工兵は矢壁のみ設置可能

        // 罠がない場所にのみ設置（上書きしない）

        if (game.grid.canPlaceTrap(gx, gy, false)) {

            // 矢壁のみを設置

            const trapId = 'arrow_wall';

            const trapData = TRAP_DATA[trapId];



            if (trapData && trapData.unlocked) {

                const trap = new Trap(trapData, gx, gy);

                game.traps.push(trap);

                game.grid.getTile(gx, gy).trap = trap;

                this.trapPlacementCount++;

                game.ui.showMessage(`${this.name}が${trapData.name}を設置しました (${this.trapPlacementCount}/${this.maxTrapPlacements})`, 'success');

            }

        }

    }



    /**

     * 魔王の特殊AI - スライム変換

     * 一番遠いスライムを他のユニットに変換する（スライム5体以上の時のみ、Wave進行中のみ）

     */

    updateDemonLordAI(deltaTime, enemies, game) {

        // Wave進行中でない場合は何もしない

        if (!game.waveManager.isWaveInProgress()) {

            return;

        }



        // 変換クールダウンの管理（10秒に1回）

        if (!this.conversionCooldown) {

            this.conversionCooldown = 0;

        }

        this.conversionCooldown -= deltaTime;



        // スライムを探して変換

        if (this.conversionCooldown <= 0) {

            const farthestSlime = this.findFarthestSlime(game);

            if (farthestSlime) {

                this.convertSlime(farthestSlime, game);

                // データから変換クールダウンを取得（デフォルト10秒）

                const cooldownTime = this.data.passive.conversionCooldown || 10;

                this.conversionCooldown = cooldownTime;

            }

        }

    }



    /**

     * 一番遠いスライムを探す（スライム5体以上の時のみ）

     */

    findFarthestSlime(game) {

        // スライムの総数をカウント

        const slimes = game.monsters.filter(m => !m.dead && m.id === 'slime');



        // スライムが4体以下の場合は変換しない

        if (slimes.length < 5) {

            return null;

        }



        // 一番遠いスライムを探す

        let farthestSlime = null;

        let farthestDist = 0;



        for (const slime of slimes) {

            const dist = distance(this.x, this.y, slime.x, slime.y);

            if (dist > farthestDist) {

                farthestDist = dist;

                farthestSlime = slime;

            }

        }



        return farthestSlime;

    }



    /**

     * スライムを他のユニットに変換

     */

    convertSlime(slime, game) {

        // スライム以外の解放済みユニットのリストを作成

        const availableMonsters = [];

        for (const monsterId in MONSTER_DATA) {

            const monsterData = MONSTER_DATA[monsterId];

            // スライム、魔王以外の解放済みユニット

            if (monsterData.unlocked && monsterId !== 'slime' && monsterId !== 'demon_lord') {

                availableMonsters.push(monsterId);

            }

        }



        if (availableMonsters.length === 0) return;



        // ランダムに変換先を選択

        const targetMonsterId = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];

        const targetMonsterData = MONSTER_DATA[targetMonsterId];



        // スライムと同じレベルで新しいユニットを生成

        const levelSource = this.id === 'demon_lord' ? this.level : slime.level;

        const newLevel = Math.max(1, levelSource);

        const newMonster = new Monster(targetMonsterData, slime.gridX, slime.gridY, newLevel);



        // スライムの習得スキルを継承

        if (slime.learnedSkills && slime.learnedSkills.length > 0) {

            for (const skill of slime.learnedSkills) {

                // スキル重複チェック

                if (!newMonster.learnedSkills.find(s => s.id === skill.id)) {

                    newMonster.learnedSkills.push(skill);

                    newMonster.applySkillEffect(skill);

                }

            }

        }



        // 位置を継承

        newMonster.x = slime.x;

        newMonster.y = slime.y;



        // グリッドから古いスライムを削除

        const tile = game.grid.getTile(slime.gridX, slime.gridY);

        if (tile) {

            tile.monster = null;

        }



        // スライムを配列から削除

        const slimeIndex = game.monsters.indexOf(slime);

        if (slimeIndex !== -1) {

            game.monsters.splice(slimeIndex, 1);

        }



        // 新しいモンスターを配置

        if (game.grid.placeMonster(newMonster.gridX, newMonster.gridY, newMonster)) {

            game.monsters.push(newMonster);

            game.quadtreeDirty = true;

            game.ui.showMessage(`魔王が${slime.name} Lv.${newLevel}を${targetMonsterData.name} Lv.${newLevel}に変換しました！`, 'success');

            game.ui.addLog(`${slime.name}が${targetMonsterData.name}に変換されました！ (スキル継承)`, 'info');

        }

    }



    applyPassiveSkillEffects(deltaTime, game) {

        // 再生スキル(HP自然回復)

        const regeneration = this.skillMap.get('regeneration');

        if (regeneration) {

            const healRate = regeneration.effect.value ?? 0;

            const healAmount = this.maxHp * healRate * deltaTime;

            this.receiveHealing(healAmount, this);

        }



        // ベテランスキル(撃破数に応じたバフ)

        const veteran = this.skillMap.get('veteran');

        if (veteran && this.killCount >= veteran.effect.kills_required) {

            // TODO: add veteran-specific bonuses here when needed

        }



        // 背水の陣(低HP時のダメージボーナス)

        const lastStand = this.skillMap.get('last_stand');

        if (lastStand && this.hp / this.maxHp <= lastStand.effect.threshold) {

            // Damage bonus is applied contextually inside performAttack

        }



        // 守護者スキル(近くの罠へのHPボーナス)

        const guardian = this.skillMap.get('guardian');

        if (guardian && game) {

            const range = guardian.effect.range * game.grid.tileSize;

            for (const trap of game.traps) {

                const trapX = trap.gridX * game.grid.tileSize + game.grid.tileSize / 2;

                const trapY = trap.gridY * game.grid.tileSize + game.grid.tileSize / 2;

                const dist = distance(this.x, this.y, trapX, trapY);



                if (dist <= range) {

                    trap.guardianBuff = true;

                }

            }

        }



        const toxicAura = this.skillMap.get('toxic_aura');

        if (toxicAura && game) {

            const runtime = this.getSkillRuntime('toxic_aura');

            runtime.timer = (runtime.timer ?? 0) - deltaTime;

            if (runtime.timer <= 0) {

                runtime.timer = toxicAura.effect.interval || 4;

                this.applyPoisonAura(toxicAura.effect, game);

            }

        }



        const skyfallStrike = this.skillMap.get('skyfall_strike');

        if (skyfallStrike && game) {

            const runtime = this.getSkillRuntime('skyfall_strike');

            runtime.timer = (runtime.timer ?? 0) - deltaTime;

            if (runtime.timer <= 0) {

                runtime.timer = skyfallStrike.effect.interval || 8;

                this.performSkyfallStrike(skyfallStrike.effect, game);

            }

        }

    }

    findTarget(enemies, game) {

        // 現在のターゲットが有効かチェック

        if (this.target && !this.target.dead) {

            const dist = distance(this.x, this.y, this.target.x, this.target.y);

            if (dist < this.getTargetingRange(game) * 1.5) {

                return; // ターゲット維持

            }

        }



        // 新しいターゲットを探す

        const searchRange = this.getTargetingRange(game);

        let closestEnemy = null;

        let closestDist = Infinity;



        for (const enemy of enemies) {

            if (enemy.dead) continue;



            // 飛行ユニット優先（ガーゴイルなど)

            if (this.attack.priority === 'flying' && !enemy.flying) {

                continue;

            }



            const dist = distance(this.x, this.y, enemy.x, enemy.y);



            if (dist < searchRange && dist < closestDist) {

                closestDist = dist;

                closestEnemy = enemy;

            }

        }



        this.target = closestEnemy;

    }



    moveTowards(targetX, targetY, deltaTime, game) {

        // 移動速度が0の場合は移動しない(固定など)

        if (this.moveSpeed <= 0) {

            return;

        }



        // ドラッグされている間は自動移動しない

        if (game.isDragging && game.draggedMonster === this) {

            return;

        }



        const dx = targetX - this.x;

        const dy = targetY - this.y;

        const dist = Math.sqrt(dx * dx + dy * dy);



        if (dist > 1) {

            const moveAmount = this.moveSpeed * game.grid.tileSize * deltaTime * GAME_CONSTANTS.MONSTER_MOVE_SPEED_MULTIPLIER;



            // 目標位置を計算

            let newX = this.x + (dx / dist) * moveAmount;

            let newY = this.y + (dy / dist) * moveAmount;

            let candidateGrid = game.grid.worldToGrid(newX, newY);

            let candidateTile = game.grid.getTile(candidateGrid.x, candidateGrid.y);

            const allowedTiles = this.flying ? FLYING_TRAVERSABLE_TILES : GROUND_TRAVERSABLE_TILES;



            // 他のモンスターとの衝突チェック

            const collisionRadius = game.grid.tileSize * 0.4; // モンスター同士の最小距離

            let canMove = !!candidateTile && allowedTiles.has(candidateTile.type);



            if (canMove) {

                for (const otherMonster of game.monsters) {

                    if (otherMonster === this || otherMonster.dead) continue;



                    const otherDx = newX - otherMonster.x;

                    const otherDy = newY - otherMonster.y;

                    const otherDist = Math.sqrt(otherDx * otherDx + otherDy * otherDy);



                    // 他のモンスターに近すぎる場合は移動を制限

                    if (otherDist < collisionRadius) {

                        canMove = false;

                        break;

                    }

                }

            }



            // ゴブリン工兵の場合、壁やユニットにぶつかったら別方向を試す

            if (!canMove && this.id === 'goblin_engineer') {

                const alternativeDirections = this.getAlternativeDirections(dx, dy, moveAmount);

                for (const altDir of alternativeDirections) {

                    const altX = this.x + altDir.dx;

                    const altY = this.y + altDir.dy;

                    const altGrid = game.grid.worldToGrid(altX, altY);

                    const altTile = game.grid.getTile(altGrid.x, altGrid.y);



                    let altCanMove = !!altTile && allowedTiles.has(altTile.type);



                    if (altCanMove) {

                        // 他のモンスターとの衝突チェック

                        let hasCollision = false;

                        for (const otherMonster of game.monsters) {

                            if (otherMonster === this || otherMonster.dead) continue;



                            const otherDx = altX - otherMonster.x;

                            const otherDy = altY - otherMonster.y;

                            const otherDist = Math.sqrt(otherDx * otherDx + otherDy * otherDy);



                            if (otherDist < collisionRadius) {

                                hasCollision = true;

                                break;

                            }

                        }



                        if (!hasCollision) {

                            // この方向に移動可能

                            canMove = true;

                            newX = altX;

                            newY = altY;

                            candidateGrid = altGrid;

                            candidateTile = altTile;

                            break;

                        }

                    }

                }

            }



            // 衝突がない場合のみ移動Փ˂衝突がない場合のみ移動Ȃ衝突がない場合のみ移動ꍇ衝突がない場合のみ移動݈̂ړ衝突がない場合のみ移動

            if (canMove) {

                this.x = newX;

                this.y = newY;



                // グリッド位置を更新

                const gridPos = game.grid.worldToGrid(this.x, this.y);

                if (gridPos.x !== this.gridX || gridPos.y !== this.gridY) {

                    // ドラッグされている場合は自動移動に戻る

                    if (game.isDragging && game.draggedMonster === this) {

                        return;

                    }



                    const oldTile = game.grid.getTile(this.gridX, this.gridY);

                    if (oldTile && oldTile.monster === this) {

                        oldTile.monster = null;

                    }



                    this.gridX = gridPos.x;

                    this.gridY = gridPos.y;



                    const newTile = game.grid.getTile(this.gridX, this.gridY);



                    // 落とし穴チェック: 飛行ユニット以外が落とし穴に入ったら即死
                    // ドラッグ中の自ユニットは落とし穴を回避（ドラッグ後の配置時は落ちる）

                    if (newTile && newTile.type === 'pit' && !this.flying) {
                        // ドラッグ中は落とし穴の判定をスキップ
                        if (game.isDragging && game.draggedMonster === this) {
                            // ドラッグ中は落とし穴をスキップ
                        } else {
                            this.hp = 0;

                            this.dead = true;

                            game.ui.showMessage(`${this.name}が落とし穴に落ちて即死しました！`, 'warning');

                            // タイルに登録せずに終了

                            return;
                        }

                    }



                    if (newTile && !newTile.monster) {

                        newTile.monster = this;

                    }

                }

            }

        }

    }



    getAlternativeDirections(dx, dy, moveAmount) {

        // 元の方向を正規化

        const mainAngle = Math.atan2(dy, dx);



        // 試す代替方向（元の方向から45度、90度、135度、180度ずつずらす）

        const angleOffsets = [

            Math.PI / 4,      // 45度右

            -Math.PI / 4,     // 45度左

            Math.PI / 2,      // 90度右

            -Math.PI / 2,     // 90度左

            3 * Math.PI / 4,  // 135度右

            -3 * Math.PI / 4, // 135度左

            Math.PI           // 180度（反対方向）

        ];



        const alternatives = [];



        for (const offset of angleOffsets) {

            const newAngle = mainAngle + offset;

            const newDx = Math.cos(newAngle) * moveAmount;

            const newDy = Math.sin(newAngle) * moveAmount;

            alternatives.push({ dx: newDx, dy: newDy });

        }



        return alternatives;

    }



    takeDamage(amount, type = 'physical', source = null) {

        if (this.dead || amount <= 0) {

            return 0;

        }



        // amountはCombatSystemで既に計算済みのダメージ

        // ここでは耐性計算をせず、バリアと実HPの処理のみ行う

        let finalDamage = amount;



        // シールド処理前にスライム分裂判定を行う（攻撃を受けた時点で判定）

        // レベル2以上のスライムのみ分裂可能

        if (this.id === 'slime' && this.level >= 2 && finalDamage > 0) {

            const chance = SLIME_CONSTANTS.SPLIT_CHANCE ?? 0.3;

            const projectedHpWithoutBarrier = this.hp - finalDamage;

            const hpAfterBarrier = this.barrier > 0

                ? this.hp - Math.max(0, finalDamage - this.barrier)

                : projectedHpWithoutBarrier;

            if (this.hp > 0 && hpAfterBarrier > 0 && Math.random() < chance) {
                this.shouldSplit = true;
            }

        }



        // バリア処理

        if (this.barrier && this.barrier > 0) {

            if (this.barrier >= finalDamage) {

                this.barrier -= finalDamage;

                return 0;

            } else {

                finalDamage -= this.barrier;

                this.barrier = 0;

            }

        }



        this.hp -= finalDamage;



        if (this.hp <= 0) {

            if (!this.tryAutoRevive()) {

                this.hp = 0;

                this.dead = true;

                this.shouldSplit = false;

            }

        }



        return finalDamage;

    }



    tryAutoRevive() {

        const passive = this.data.passive;

        if (!passive || !passive.reviveChance) {

            return false;

        }



        const baseChance = passive.reviveChance || 0;

        const perLevel = passive.reviveChancePerLevel || 0;

        const maxChance = passive.maxReviveChance || baseChance;

        const chance = Math.min(maxChance, baseChance + (this.level - 1) * perLevel);



        if (Math.random() < chance) {

            const hpRatio = passive.reviveHpRatio || 0.5;

            this.hp = Math.max(1, Math.floor(this.maxHp * hpRatio));

            this.dead = false;

            this.shouldShowReviveEffect = true;

            this.deathProcessed = false;

            this.shouldSplit = false;

            return true;

        }



        return false;

    }



    performAttack(target, game) {

        if (!this.attack || !target || target.dead) {

            return;

        }



        this.isAttackAnimating = true;

        this.attackAnimationTimer = Math.max(0.15, Math.min(0.35, (this.attack.interval || 1) * 0.2));

        this.attackTarget = target;



        let damage = this.attack.damage || 0;



        const targetWasPoisoned = target.statusEffects?.hasEffect('poison') || false;

        const targetWasBurning = (target.statusEffects?.hasEffect('burn') || target.statusEffects?.hasEffect('wildfire')) || false;



        const lastStand = this.skillMap.get('last_stand');

        if (lastStand && this.maxHp > 0) {

            const threshold = lastStand.effect.threshold || 0.5;

            const bonus = lastStand.effect.bonus ?? lastStand.effect.damage_bonus ?? 0.3;

            if ((this.hp / this.maxHp) <= threshold) {

                damage = Math.floor(damage * (1 + bonus));

            }

        }



        const veteran = this.skillMap.get('veteran');

        if (veteran && this.killCount >= (veteran.effect.kills_required || 0)) {

            damage = Math.floor(damage * (1 + (veteran.effect.bonus || 0)));

        }



        const damageType = this.attack.type === 'magic' ? 'magic' : 'physical';

        const wasDead = target.dead;



        let actualDamage = 0;

        const combatSystem = game ? game.combatSystem : null;

        if (combatSystem) {

            actualDamage = combatSystem.applyDamage(target, damage, damageType, this);

        } else if (typeof target.takeDamage === 'function') {

            actualDamage = target.takeDamage(damage, damageType, this);

        } else {

            target.hp -= damage;

            actualDamage = damage;

        }



        if (this.lifeStealRate > 0 && actualDamage > 0) {

            const healAmount = Math.floor(actualDamage * this.lifeStealRate);

            if (healAmount > 0) {

                this.receiveHealing(healAmount, this);

            }

        }



        const poisonStrike = this.skillMap.get('poison_strike');

        if (poisonStrike && Math.random() < (poisonStrike.effect.chance ?? 0)) {

            this.applyPoisonStatus(target, poisonStrike.effect);

        }



        const flamebrand = this.skillMap.get('flamebrand');

        if (flamebrand && Math.random() < (flamebrand.effect.chance ?? 0)) {

            this.applyBurnStatus(target, flamebrand.effect);

        }



        const wildfireRitual = this.skillMap.get('wildfire_ritual');

        if (wildfireRitual && (targetWasBurning || target.statusEffects?.hasEffect('burn') || target.statusEffects?.hasEffect('wildfire'))) {

            const triggerChance = wildfireRitual.effect.chance ?? 0.35;

            if (Math.random() < triggerChance) {

                this.spreadBurnFromTarget(target, wildfireRitual.effect, game);

            }

        }



        if (!wasDead && target.dead) {

            this.killCount++;

            const venomSpread = this.skillMap.get('venom_spread');

            if (venomSpread && (targetWasPoisoned || target.statusEffects?.hasEffect('poison'))) {

                this.spreadPoisonOnDeath(target, venomSpread.effect, game);

            }

        }



        this.applyOnHitEffect(target);

    }



    applyOnHitEffect(target) {

        if (!this.attack || !this.attack.effect) return;

        if (!target || !target.statusEffects) return;



        switch (this.attack.effect) {

            case 'slow': {

                const duration = 1.5;

                const amount = STATUS_EFFECT_CONSTANTS.SLOW_DEFAULT_AMOUNT || 0.4;

                target.statusEffects.addEffect(new StatusEffect('slow', duration, { amount }));

                break;

            }

            case 'freeze': {

                const duration = 0.8;

                target.statusEffects.addEffect(new StatusEffect('freeze', duration, {}));

                target.vulnerableToShatter = true;

                break;

            }

            default:

                break;

        }

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

        const previous = this.hp;

        this.hp = Math.min(this.hp + actual, this.maxHp);

        return this.hp - previous;

    }



    applyHealingDebuff(multiplier) {

        if (typeof multiplier !== 'number') return;

        if (typeof this.healingReceivedMultiplier !== 'number') {

            this.healingReceivedMultiplier = 1.0;

        }

        this.healingReceivedMultiplier = Math.min(this.healingReceivedMultiplier, multiplier);

    }



    getAttackRangePixels(game) {

        const tileSize = game?.grid?.tileSize || 1;

        const baseRange = (this.attack?.range || 0) * tileSize;

        const phantomReach = this.skillMap.get('phantom_reach');

        if (phantomReach && phantomReach.effect?.rangeTiles) {

            return Math.max(baseRange, phantomReach.effect.rangeTiles * tileSize);

        }

        return baseRange;

    }



    getTargetingRange(game) {

        const tileSize = game?.grid?.tileSize || 1;

        let rangeTiles = this.patrolRadius;

        const phantomReach = this.skillMap.get('phantom_reach');

        if (phantomReach && phantomReach.effect?.rangeTiles) {

            rangeTiles = Math.max(rangeTiles, phantomReach.effect.rangeTiles);

        }

        return rangeTiles * tileSize;

    }



    getSkillRuntime(skillId) {

        if (!this.skillRuntime.has(skillId)) {

            this.skillRuntime.set(skillId, {});

        }

        return this.skillRuntime.get(skillId);

    }



    applyPoisonStatus(target, effect = {}) {

        if (!target || !target.statusEffects) return;

        const duration = effect.duration ?? 4;

        const data = {

            dps: effect.dps ?? (STATUS_EFFECT_CONSTANTS?.POISON_BASE_DPS ?? 6),

            healingReduction: effect.healingReduction ?? (STATUS_EFFECT_CONSTANTS?.POISON_HEALING_REDUCTION ?? 0.2),

            maxStacks: effect.maxStacks ?? (STATUS_EFFECT_CONSTANTS?.POISON_MAX_STACKS ?? 5),

            burnSynergyBonus: effect.burnSynergyBonus

        };

        target.statusEffects.addEffect(new StatusEffect('poison', duration, data));

    }



    applyBurnStatus(target, effect = {}) {

        if (!target || !target.statusEffects) return;

        const duration = effect.duration ?? 3;

        const data = { dps: effect.dps ?? (STATUS_EFFECT_CONSTANTS?.BURN_BASE_DPS ?? 12) };

        target.statusEffects.addEffect(new StatusEffect('burn', duration, data));

    }



    applyPoisonAura(effect, game) {

        if (!game || !game.enemies || !game.grid) return;

        const range = (effect.range || 2) * game.grid.tileSize;

        for (const enemy of game.enemies) {

            if (enemy.dead) continue;

            const dist = distance(this.x, this.y, enemy.x, enemy.y);

            if (dist <= range) {

                this.applyPoisonStatus(enemy, effect);

            }

        }

    }



    spreadPoisonOnDeath(target, effect, game) {

        if (!game || !game.enemies || !game.grid || !target) return;

        const radius = (effect.range || 2.5) * game.grid.tileSize;

        const poisonEffect = {

            duration: effect.duration ?? 3,

            dps: effect.dps ?? (STATUS_EFFECT_CONSTANTS?.POISON_BASE_DPS ?? 6),

            healingReduction: effect.healingReduction ?? (STATUS_EFFECT_CONSTANTS?.POISON_HEALING_REDUCTION ?? 0.2),

            maxStacks: effect.maxStacks ?? (STATUS_EFFECT_CONSTANTS?.POISON_MAX_STACKS ?? 5)

        };

        const ratio = effect.damageRatio ?? 0.5;

        poisonEffect.dps *= ratio;

        for (const enemy of game.enemies) {

            if (enemy.dead || enemy === target) continue;

            const dist = distance(target.x, target.y, enemy.x, enemy.y);

            if (dist <= radius) {

                this.applyPoisonStatus(enemy, poisonEffect);

            }

        }

    }



    spreadBurnFromTarget(target, effect, game) {

        if (!game || !game.enemies || !game.grid || !target) return;

        const radius = (effect.range || 2) * game.grid.tileSize;

        for (const enemy of game.enemies) {

            if (enemy.dead || enemy === target) continue;

            const dist = distance(target.x, target.y, enemy.x, enemy.y);

            if (dist <= radius) {

                this.applyBurnStatus(enemy, effect);

            }

        }

    }



    performSkyfallStrike(effect, game) {

        if (!game || !game.enemies || game.enemies.length === 0) return;

        const living = game.enemies.filter(enemy => !enemy.dead);

        if (living.length === 0) return;

        let strikeTarget = living[Math.floor(Math.random() * living.length)];

        if (effect.targeting === 'farthest') {

            strikeTarget = living.reduce((prev, curr) => {

                const prevDist = distance(this.x, this.y, prev.x, prev.y);

                const currDist = distance(this.x, this.y, curr.x, curr.y);

                return currDist > prevDist ? curr : prev;

            }, strikeTarget);

        }

        const baseDamage = this.attack?.damage || 0;

        const multiplier = effect.damageMultiplier ?? 1.2;

        const damage = Math.max(1, Math.floor(baseDamage * multiplier));

        this.dealDamageToTarget(strikeTarget, damage, effect.damageType || 'magic', game);

        if (effect.applyBurn) {

            this.applyBurnStatus(strikeTarget, effect.applyBurn);

        }

        if (effect.applyPoison) {

            this.applyPoisonStatus(strikeTarget, effect.applyPoison);

        }

    }



    dealDamageToTarget(target, damage, damageType, game) {

        if (!target) return 0;

        const combatSystem = game ? game.combatSystem : null;

        if (combatSystem && typeof combatSystem.applyDamage === 'function') {

            return combatSystem.applyDamage(target, damage, damageType, this);

        }

        if (typeof target.takeDamage === 'function') {

            return target.takeDamage(damage, damageType, this);

        }

        target.hp = Math.max(0, target.hp - damage);

        return damage;

    }



    useActiveSkill(game) {

        const active = this.data.active;



        if (active.effect.type === 'self_buff') {

            // 盾上げなど

            const buffEffect = new StatusEffect('shield', active.effect.duration, {

                amount: this.maxHp * active.effect.damageReduction

            });

            this.statusEffects.addEffect(buffEffect);

            this.activeCooldown = active.cooldown;

        } else if (active.effect.type === 'repair_trap') {

            // 罠修理

            const nearbyTraps = game.traps.filter(trap => {

                const dist = distance(this.x, this.y,

                    trap.gridX * game.grid.tileSize + game.grid.tileSize / 2,

                    trap.gridY * game.grid.tileSize + game.grid.tileSize / 2

                );

                return dist < active.effect.range * game.grid.tileSize && trap.hp < trap.maxHp;

            });



            if (nearbyTraps.length > 0) {

                const trap = nearbyTraps[0];

                trap.repair(active.effect.healAmount);

                this.activeCooldown = active.cooldown;

            }

        } else if (active.effect.type === 'heal_allies') {

            // 味方回復

                const healRange = active.effect.range * game.grid.tileSize;

                const maxTargets = active.effect.maxTargets || 2;

                const healAmount = active.effect.healAmount || 50;



                // 回復が必要な味方を探索

                const injuredAllies = game.monsters.filter(monster => {

                    if (monster.dead || monster === this) return false;

                    if (monster.hp >= monster.maxHp) return false;



                    const dist = distance(this.x, this.y, monster.x, monster.y);

                    return dist < healRange;

                });



                // HP割合が低い順にソート

                injuredAllies.sort((a, b) => {

                    return (a.hp / a.maxHp) - (b.hp / b.maxHp);

                });



                // 最大ターゲット数まで回復

                let healedCount = 0;

                for (let i = 0; i < Math.min(maxTargets, injuredAllies.length); i++) {

                    const ally = injuredAllies[i];

                    const actualHeal = ally.receiveHealing(healAmount, this);



                    if (actualHeal > 0) {

                        healedCount++;

                        // 回復エフェクト（必要なら追加）

                    }

                }



                if (healedCount > 0) {

                    this.activeCooldown = active.cooldown;

                    game.ui.showMessage(`${this.name}が味方を回復しました`, 'success');

                }

        }

    }



    draw(ctx, game) {

        if (this.dead) return;



        const size = game.grid.tileSize * 0.6;



        // 攻撃アニメーション用のスケールと発光効果

        let scale = 1.0;

        let glowAlpha = 0;

        if (this.isAttackAnimating && this.attackAnimationTimer > 0) {

            // アニメーションの進行度（0.0 -> 1.0）

            const progress = 1 - (this.attackAnimationTimer / 0.2);

            // パルス効果: 大きくなって元に戻る

            scale = 1.0 + Math.sin(progress * Math.PI) * 0.3;

            // 発光効果

            glowAlpha = Math.sin(progress * Math.PI) * 0.8;

        }



        ctx.save();

        ctx.translate(this.x, this.y);



        // ゴーレムの挑発範囲を表示

        if (this.isTaunting && this.taunt) {

            ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';

            ctx.lineWidth = 2;

            ctx.setLineDash([5, 5]);

            ctx.beginPath();

            ctx.arc(0, 0, this.taunt.range * game.grid.tileSize, 0, Math.PI * 2);

            ctx.stroke();

            ctx.setLineDash([]);

        }



        // 攻撃時の発光エフェクト

        if (glowAlpha > 0) {

            ctx.shadowColor = this.getMonsterColor();

            ctx.shadowBlur = 20;

            ctx.globalAlpha = glowAlpha;

            ctx.fillStyle = '#fff';

            ctx.beginPath();

            ctx.arc(0, 0, size / 2 * scale * 1.3, 0, Math.PI * 2);

            ctx.fill();

            ctx.globalAlpha = 1.0;

            ctx.shadowBlur = 0;

        }



        // スケール適用

        ctx.scale(scale, scale);



        // 本体

        ctx.fillStyle = this.getMonsterColor();

        ctx.beginPath();

        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);

        ctx.fill();



        // 枠

        ctx.strokeStyle = this.isAttackAnimating ? '#ff0' : '#fff';

        ctx.lineWidth = this.isAttackAnimating ? 3 : 2;

        ctx.stroke();



        // アイコン

        drawCenteredText(ctx, this.getMonsterIcon(), 0, 0, '16px Arial', '#fff');



        // レベル表示

        if (this.level > 1) {

            drawCenteredText(ctx, `Lv${this.level}`, 0, -size / 2 - 15, 'bold 10px Arial', '#ffd700');

        }



        // HPバー

        drawHealthBar(ctx, -size / 2, size / 2 + 5, size, 5, this.hp, this.maxHp, '#333', '#48bb78');



        // バリア表示

        if (this.barrier && this.barrier > 0) {

            ctx.strokeStyle = '#4299e1';

            ctx.lineWidth = 3;

            ctx.beginPath();

            ctx.arc(0, 0, size / 2 + 3, 0, Math.PI * 2);

            ctx.stroke();

        }



        // 状態異常アイコン

        const effects = this.statusEffects.getActiveEffects();

        let iconX = -size / 2;

        for (const effect of effects) {

            drawStatusIcon(ctx, iconX, -size / 2 - 10, 12, effect.type);

            iconX += 15;

        }



        ctx.restore();



        // アクティブスキル範囲表示

        this.drawSkillRangeIndicator(ctx, game);



        // 攻撃範囲表示（攻撃中に強調表示）

        if (this.state === 'attacking' && this.isAttackAnimating) {

            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';

            ctx.lineWidth = 2;

            ctx.beginPath();

            ctx.arc(this.x, this.y, this.getAttackRangePixels(game), 0, Math.PI * 2);

            ctx.stroke();



            // ターゲットへの攻撃ライン

            if (this.target && !this.target.dead) {

                ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';

                ctx.lineWidth = 3;

                ctx.beginPath();

                ctx.moveTo(this.x, this.y);

                ctx.lineTo(this.target.x, this.target.y);

                ctx.stroke();

            }

        }

    }



    drawSkillRangeIndicator(ctx, game) {

        if (!this.shouldShowSkillRangeIndicator()) {

            return;

        }



        const radius = this.getActiveSkillRangePixels(game);

        if (radius <= 0) return;



        ctx.save();

        ctx.strokeStyle = 'rgba(66, 153, 225, 0.45)';

        ctx.lineWidth = 1.5;

        ctx.setLineDash([6, 4]);

        ctx.beginPath();

        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);

        ctx.stroke();

        ctx.restore();

    }



    shouldShowSkillRangeIndicator() {

        if (!this.data.active || this.skillRangeTiles <= 0) return false;

        if (this.activeCooldown > 0) return false;

        const effectType = this.data.active.effect?.type;

        return effectType ? OFFENSIVE_ACTIVE_SKILL_TYPES.has(effectType) : false;

    }



    getActiveSkillRangePixels(game) {

        return (this.skillRangeTiles || 0) * game.grid.tileSize;

    }



    applyDemonLordAuraBonus(bonus) {

        if (!bonus) return;

        this.removeDemonLordAuraBonus();



        const applied = { attack: 0, maxHp: 0 };

        if (bonus.attack) {

            this.attack.damage += bonus.attack;

            applied.attack = bonus.attack;

        }



        if (bonus.maxHp) {

            this.maxHp += bonus.maxHp;

            this.hp = Math.min(this.hp + bonus.maxHp, this.maxHp);

            applied.maxHp = bonus.maxHp;

        }



        if (applied.attack || applied.maxHp) {

            this.demonLordBuff = applied;

        }

    }



    removeDemonLordAuraBonus() {

        if (!this.demonLordBuff) return;



        if (this.demonLordBuff.attack) {

            this.attack.damage = Math.max(1, this.attack.damage - this.demonLordBuff.attack);

        }



        if (this.demonLordBuff.maxHp) {

            this.maxHp = Math.max(1, this.maxHp - this.demonLordBuff.maxHp);

            this.hp = Math.min(this.hp, this.maxHp);

        }



        this.demonLordBuff = null;

    }



    getMonsterColor() {

        const colors = {

            skeleton_guard: '#a0aec0',

            slime: '#48bb78',

            goblin_engineer: '#ed8936',

            gargoyle: '#805ad5',

            wisp: '#4299e1',

            harpy: '#ff69b4',

            sky_knight: '#4682b4'

        };

        return colors[this.id] || '#718096';

    }



    getMonsterIcon() {

        const icons = {

            skeleton_guard: '💀',

            slime: '🟢',

            goblin_engineer: '🔨',

            gargoyle: '🦅',

            wisp: '💫',

            cleric_skeleton: '⚕️',

            zombie: '🧟',

            shadow_assassin: '🗡️',

            bone_archer: '🏹',

            necromancer: '☠️',

            frost_mage: '❄️',

            demon_hound: '🐺',

            golem: '🗿',

            vampire: '🦇',

            demon_lord: '👑', // 魔王は王冠で特別感を出す

            harpy: '🦜',

            sky_knight: '⚔️'

        };

        return icons[this.id] || '👹';

    }

}

