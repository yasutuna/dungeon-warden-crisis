/**
 * メインゲームクラス
 * タワーディフェンスゲームの中核となるゲームループとロジックを管理
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // ゲーム状態
        this.running = true;
        this.paused = false;
        this.gameSpeed = 1;
        this.gameOver = false;
        this.autoWaveEnabled = false; // Wave自動進行フラグ

        // リソース
        this.soul = GAME_CONSTANTS.INITIAL_SOUL;
        this.coreHp = GAME_CONSTANTS.INITIAL_CORE_HP;
        this.maxCoreHp = GAME_CONSTANTS.INITIAL_CORE_HP;

        // スコアシステム
        this.totalScore = 0; // 累積スコア
        this.highestEnemyLevel = 0; // 倒した敵の最高レベル
        this.totalEnemiesDefeated = 0; // 倒した敵の総数

        // グリッド
        this.grid = new Grid(GRID_CONSTANTS.COLS, GRID_CONSTANTS.ROWS, GRID_CONSTANTS.TILE_SIZE);

        // 経路探索
        this.pathFinder = new PathFinder(this.grid);

        // エンティティ
        this.traps = [];
        this.monsters = [];
        this.enemies = [];

        // 空間分割（パフォーマンス最適化）
        const boundary = new Rectangle(0, 0, this.canvas.width, this.canvas.height);
        this.quadtree = new Quadtree(boundary, 4);
        this.quadtreeDirty = true;  // Quadtree再構築フラグ

        // エフェクトプール（メモリ効率化）
        this.effectPool = new EffectPool();

        // システム
        this.combatSystem = new CombatSystem();
        this.waveManager = new WaveManager(this);
        this.ui = new UIManager(this);

        // 配置モード
        this.placementMode = null; // 'trap' or 'monster'
        this.selectedObject = null;

        // マウス
        this.mouseX = 0;
        this.mouseY = 0;
        this.hoveredUnit = null; // ホバー中のユニット

        // ドラッグ&ドロップ用
        this.isDragging = false;
        this.draggedMonster = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        this.setupInput();

        // 魔王を初期配置（C地点）
        this.initializeDemonLord();

        // ゲームループ
        this.lastTime = Date.now();
        this.gameLoop();
    }

    /**
     * 魔王をC地点（コア）に初期配置
     */
    initializeDemonLord() {
        // C地点（パスの最後の位置）を取得
        const coreTile = this.grid.pathTiles[this.grid.pathTiles.length - 1];
        if (!coreTile) return;

        const coreX = coreTile.x;
        const coreY = coreTile.y;

        // 魔王を召喚（レベル1で開始）
        const demonLordData = MONSTER_DATA['demon_lord'];
        if (demonLordData && demonLordData.unlocked) {
            const demonLord = new Monster(demonLordData, coreX, coreY, 1);
            if (this.grid.placeMonster(coreX, coreY, demonLord)) {
                this.monsters.push(demonLord);
                this.quadtreeDirty = true;
                this.ui.showMessage('魔王がC地点に配置されました', 'info');
            }
        }
    }

    setupInput() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Canvasのスケール補正を追加
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;

            // ホバー中のユニットを検出
            this.updateHoveredUnit();
        });

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;

            // 配置モードでない場合、モンスターのドラッグを開始
            if (!this.placementMode) {
                const clickedMonster = this.getMonsterAtPosition(clickX, clickY);
                if (clickedMonster) {
                    this.isDragging = true;
                    this.draggedMonster = clickedMonster;
                    this.dragOffsetX = clickX - clickedMonster.x;
                    this.dragOffsetY = clickY - clickedMonster.y;
                    this.canvas.style.cursor = 'grabbing';
                }
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (this.isDragging && this.draggedMonster) {
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const dropX = (e.clientX - rect.left) * scaleX;
                const dropY = (e.clientY - rect.top) * scaleY;

                // ドロップ位置のグリッド座標を取得
                const gridPos = this.grid.worldToGrid(dropX, dropY);

                // 移動先が有効かチェック
                if (this.canMoveMonsterTo(this.draggedMonster, gridPos.x, gridPos.y)) {
                    this.moveMonster(this.draggedMonster, gridPos.x, gridPos.y);
                } else {
                    // 元の位置に戻す
                    const oldGridPos = this.grid.worldToGrid(this.draggedMonster.x, this.draggedMonster.y);
                    const worldPos = this.grid.gridToWorld(oldGridPos.x, oldGridPos.y);
                    this.draggedMonster.x = worldPos.x;
                    this.draggedMonster.y = worldPos.y;
                    this.ui.showMessage('そこには移動できません', 'error');
                }

                this.isDragging = false;
                this.draggedMonster = null;
                this.canvas.style.cursor = 'default';
            } else if (!this.isDragging) {
                // 通常のクリック処理
                console.log('=== Canvas clicked ===');
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                const clickX = (e.clientX - rect.left) * scaleX;
                const clickY = (e.clientY - rect.top) * scaleY;
                console.log(`Click coordinates: clientX=${e.clientX}, clientY=${e.clientY}, clickX=${clickX}, clickY=${clickY}`);
                this.handleClick(clickX, clickY);
            }
        });

        // 右クリックでキャンセル
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();

            // ドラッグ中の場合はキャンセル
            if (this.isDragging && this.draggedMonster) {
                const oldGridPos = this.grid.worldToGrid(this.draggedMonster.x, this.draggedMonster.y);
                const worldPos = this.grid.gridToWorld(oldGridPos.x, oldGridPos.y);
                this.draggedMonster.x = worldPos.x;
                this.draggedMonster.y = worldPos.y;
                this.isDragging = false;
                this.draggedMonster = null;
                this.canvas.style.cursor = 'default';
            }

            this.placementMode = null;
            this.ui.selectedTrap = null;
            this.ui.selectedMonster = null;
            document.querySelectorAll('.palette-item').forEach(item => {
                item.classList.remove('selected');
            });
        });
    }

    updateHoveredUnit() {
        // マウス位置にいるユニットを検出
        const hoverRadius = this.grid.tileSize * 0.6;
        let hoveredUnit = null;

        // モンスターをチェック
        for (const monster of this.monsters) {
            if (monster.dead) continue;
            const dist = distance(this.mouseX, this.mouseY, monster.x, monster.y);
            if (dist <= hoverRadius) {
                hoveredUnit = monster;
                break;
            }
        }

        // 敵をチェック
        if (!hoveredUnit) {
            for (const enemy of this.enemies) {
                if (enemy.dead) continue;
                const dist = distance(this.mouseX, this.mouseY, enemy.x, enemy.y);
                const enemyRadius = enemy.boss ? hoverRadius * 1.5 : hoverRadius;
                if (dist <= enemyRadius) {
                    hoveredUnit = enemy;
                    break;
                }
            }
        }

        // 罠をチェック
        if (!hoveredUnit) {
            const gridPos = this.grid.worldToGrid(this.mouseX, this.mouseY);
            const tile = this.grid.getTile(gridPos.x, gridPos.y);
            if (tile && tile.trap && !tile.trap.destroyed) {
                hoveredUnit = tile.trap;
            }
        }

        // ホバー対象が変わった場合、UIを更新
        if (hoveredUnit !== this.hoveredUnit) {
            this.hoveredUnit = hoveredUnit;
            console.log('Hovered unit changed, calling showUnitHoverTooltip');
            if (hoveredUnit) {
                this.ui.showUnitHoverTooltip(hoveredUnit, this.mouseX, this.mouseY);
            } else {
                this.ui.hideUnitHoverTooltip();
            }
        } else if (hoveredUnit) {
            // 同じユニットでもマウス位置が変わった場合、ツールチップ位置を更新
            this.ui.updateUnitHoverTooltipPosition(this.mouseX, this.mouseY);
        }
    }

    handleClick(x, y) {
        const gridPos = this.grid.worldToGrid(x, y);

        if (this.placementMode === 'trap' && this.ui.selectedTrap) {
            this.placeTrap(gridPos.x, gridPos.y, this.ui.selectedTrap);
        } else if (this.placementMode === 'monster' && this.ui.selectedMonster) {
            this.placeMonster(gridPos.x, gridPos.y, this.ui.selectedMonster);
        } else {
            // オブジェクト選択
            this.selectObject(gridPos.x, gridPos.y);
        }
    }

    /**
     * 罠を配置する
     * @param {number} gx - グリッドX座標
     * @param {number} gy - グリッドY座標
     * @param {string} trapId - 罠のID
     */
    placeTrap(gx, gy, trapId) {
        const trapData = TRAP_DATA[trapId];
        const tile = this.grid.getTile(gx, gy);

        if (!tile) {
            this.ui.showMessage('無効な位置です', 'error');
            return;
        }

        // 既存の罠がある場合（HP > 0の場合のみ上書き処理）
        if (tile.trap && tile.trap.hp > 0) {
            this.overwriteTrap(gx, gy, trapId);
            return;
        }

        // ソウルチェック
        if (this.soul < trapData.cost) {
            this.ui.showMessage('ソウルが足りません', 'error');
            return;
        }

        // 配置可能かチェック（破壊された罠がある場合は上書き可能）
        const canPlace = this.grid.canPlaceTrap(gx, gy, false);

        if (!canPlace) {
            this.ui.showMessage('ここには配置できません', 'error');
            return;
        }

        // 既存の破壊された罠を削除
        if (tile.trap && tile.trap.hp <= 0) {
            this.traps = this.traps.filter(t => t !== tile.trap);
            tile.trap = null;
        }

        // 罠を配置
        const trap = new Trap(trapData, gx, gy);
        const placeResult = this.grid.placeTrap(gx, gy, trap);

        if (placeResult) {
            this.traps.push(trap);
            this.soul -= trapData.cost;

            // 経路コストを更新
            this.pathFinder.updateTrapCosts(this.traps);

            // 経路キャッシュを無効化
            this.waveManager.invalidatePathCache();

            // Quadtreeを無効化
            this.quadtreeDirty = true;

            this.ui.showMessage(`${trapData.name}を配置しました`, 'success');

            // 配置モードをリセット
            this.placementMode = null;
            this.ui.selectedTrap = null;
            document.querySelectorAll('.palette-item').forEach(item => {
                item.classList.remove('selected');
            });
        } else {
            this.ui.showMessage('罠の配置に失敗しました', 'error');
        }
    }

    /**
     * 罠の上書き処理
     * @param {number} gx - グリッドX座標
     * @param {number} gy - グリッドY座標
     * @param {string} newTrapId - 新しい罠のID
     */
    overwriteTrap(gx, gy, newTrapId) {
        const tile = this.grid.getTile(gx, gy);
        if (!tile || !tile.trap) return;

        const existingTrap = tile.trap;
        const newTrapData = TRAP_DATA[newTrapId];

        // 進化判定
        const evolutionResult = this.checkTrapEvolution(existingTrap.id, newTrapId);

        if (evolutionResult) {
            // 進化する場合
            const evolvedTrapData = TRAP_DATA[evolutionResult];
            if (!evolvedTrapData) {
                this.ui.showMessage('進化先の罠データが見つかりません', 'error');
                return;
            }

            // ソウルコストは差額のみ
            const costDiff = Math.max(0, evolvedTrapData.cost - existingTrap.data.cost);

            if (this.soul < costDiff) {
                this.ui.showMessage('ソウルが足りません', 'error');
                return;
            }

            // 経験値を引き継ぐ
            const totalExp = existingTrap.exp + existingTrap.level * existingTrap.expPerLevel;

            // 既存の罠を削除
            this.traps = this.traps.filter(t => t !== existingTrap);

            // 進化後の罠を配置
            const evolvedTrap = new Trap(evolvedTrapData, gx, gy);
            evolvedTrap.gainExp(totalExp);

            tile.trap = evolvedTrap;
            this.traps.push(evolvedTrap);
            this.soul -= costDiff;

            this.quadtreeDirty = true;
            this.ui.showMessage(`${existingTrap.name}が${evolvedTrap.name}に進化しました！`, 'success');
            return;
        }

        // 進化しない場合は経験値加算
        if (this.soul < newTrapData.cost) {
            this.ui.showMessage('ソウルが足りません', 'error');
            return;
        }

        // 上書きする罠の経験値を既存の罠に加算
        const expFromNewTrap = Math.floor(newTrapData.cost * 0.5);
        existingTrap.gainExp(expFromNewTrap);

        this.soul -= newTrapData.cost;
        this.ui.showMessage(`${existingTrap.name}に経験値+${expFromNewTrap}を加算しました`, 'info');

        // レベルアップした場合の通知
        if (existingTrap.level > 1) {
            this.ui.showMessage(`${existingTrap.name}がLv.${existingTrap.level}になりました！`, 'success');
        }
    }

    /**
     * 罠の進化判定
     * @param {string} existingTrapId - 既存の罠のID
     * @param {string} newTrapId - 新しい罠のID
     * @returns {string|null} - 進化先の罠ID、進化しない場合はnull
     */
    checkTrapEvolution(existingTrapId, newTrapId) {
        const existingTrapData = TRAP_DATA[existingTrapId];

        // 進化情報がない場合
        if (!existingTrapData.evolution) return null;

        // 進化テーブルを確認
        const evolvedId = existingTrapData.evolution[newTrapId];
        if (evolvedId && TRAP_DATA[evolvedId]) {
            return evolvedId;
        }

        // 逆パターンもチェック（新しい罠が矢壁で、既存の罠が属性罠の場合）
        const newTrapData = TRAP_DATA[newTrapId];
        if (newTrapData.evolution) {
            const reverseEvolvedId = newTrapData.evolution[existingTrapId];
            if (reverseEvolvedId && TRAP_DATA[reverseEvolvedId]) {
                return reverseEvolvedId;
            }
        }

        return null;
    }

    placeMonster(gx, gy, monsterId) {
        const monsterData = MONSTER_DATA[monsterId];

        if (this.soul < monsterData.summonCost) {
            this.ui.showMessage('ソウルが足りません', 'error');
            return;
        }

        // 魔王の場合、既に存在するかチェック
        if (monsterData.unique) {
            const existingUnique = this.monsters.find(m => m.id === monsterId && !m.dead);
            if (existingUnique) {
                this.ui.showMessage(`${monsterData.name}は1体しか召喚できません`, 'error');
                return;
            }
        }

        if (!this.grid.canPlaceMonster(gx, gy, monsterData.flying)) {
            this.ui.showMessage('ここには配置できません', 'error');
            return;
        }

        // 既存のモンスターの最高レベルを取得
        let maxLevel = 1;
        for (const existingMonster of this.monsters) {
            if (!existingMonster.dead && existingMonster.level > maxLevel) {
                maxLevel = existingMonster.level;
            }
        }

        // 最高レベルで召喚
        const monster = new Monster(monsterData, gx, gy, maxLevel);
        if (this.grid.placeMonster(gx, gy, monster)) {
            this.monsters.push(monster);
            this.soul -= monsterData.summonCost;

            // Quadtreeを無効化
            this.quadtreeDirty = true;

            this.ui.showMessage(`${monsterData.name} Lv.${maxLevel}を召喚しました`, 'success');

            // 配置モードをリセット
            this.placementMode = null;
            this.ui.selectedMonster = null;
            document.querySelectorAll('.palette-item').forEach(item => {
                item.classList.remove('selected');
            });
        }
    }

    selectObject(gx, gy) {
        const tile = this.grid.getTile(gx, gy);
        if (!tile) return;

        if (tile.trap) {
            this.selectedObject = tile.trap;
            this.ui.updateSelectionInfo(tile.trap);
        } else if (tile.monster) {
            this.selectedObject = tile.monster;
            this.ui.updateSelectionInfo(tile.monster);
        } else {
            // 敵を選択
            for (const enemy of this.enemies) {
                const enemyGridPos = this.grid.worldToGrid(enemy.x, enemy.y);
                if (enemyGridPos.x === gx && enemyGridPos.y === gy) {
                    this.selectedObject = enemy;
                    this.ui.updateSelectionInfo(enemy);
                    return;
                }
            }

            this.selectedObject = null;
            this.ui.updateSelectionInfo(null);
        }
    }

    repairTrap(gx, gy) {
        const tile = this.grid.getTile(gx, gy);
        if (!tile || !tile.trap) return;

        const trap = tile.trap;

        if (this.soul < trap.data.repairCost) {
            this.ui.showMessage('ソウルが足りません', 'error');
            return;
        }

        trap.repair(trap.maxHp * 0.4);
        this.soul -= trap.data.repairCost;
        this.ui.showMessage(`${trap.name}を修理しました`, 'success');
    }

    reviveMonster(gx, gy) {
        const tile = this.grid.getTile(gx, gy);
        if (!tile || !tile.monster) return;

        const monster = tile.monster;

        if (this.soul < monster.data.reviveCost) {
            this.ui.showMessage('ソウルが足りません', 'error');
            return;
        }

        monster.hp = monster.maxHp;
        monster.dead = false;
        monster.deathProcessed = false;
        monster.shouldSplit = false;
        monster.shouldShowReviveEffect = false;
        this.soul -= monster.data.reviveCost;
        this.ui.showMessage(`${monster.name}を蘇生しました`, 'success');
    }

    startWave() {
        if (this.waveManager.isWaveInProgress()) return;
        this.waveManager.startWave();
    }

    toggleSpeed() {
        const speeds = GAME_CONSTANTS.GAME_SPEED_OPTIONS;
        const currentIndex = speeds.indexOf(this.gameSpeed);
        this.gameSpeed = speeds[(currentIndex + 1) % speeds.length];
    }

    togglePause() {
        this.paused = !this.paused;
    }

    toggleAutoWave() {
        this.autoWaveEnabled = !this.autoWaveEnabled;
        if (this.autoWaveEnabled) {
            this.ui.showMessage('Wave自動進行をONにしました', 'success');
        } else {
            this.ui.showMessage('Wave自動進行をOFFにしました', 'info');
        }
    }

    update(deltaTime) {
        if (this.paused || this.gameOver) return;

        const dt = deltaTime * this.gameSpeed;

        // ドラッグ中のモンスターの位置を更新
        if (this.isDragging && this.draggedMonster) {
            this.draggedMonster.x = this.mouseX - this.dragOffsetX;
            this.draggedMonster.y = this.mouseY - this.dragOffsetY;
        }

        // Quadtree更新最適化: ダーティフラグがtrueの時のみ再構築
        if (this.quadtreeDirty) {
            this.rebuildQuadtree();
            this.quadtreeDirty = false;
        }

        // エフェクトプールの更新
        this.effectPool.updateEffects(dt);

        // Waveマネージャー
        this.waveManager.update(dt);

        // 罠の更新
        for (const trap of this.traps) {
            trap.update(dt, this.enemies, this);
        }

        // モンスターの更新とスライム分裂チェック
        for (const monster of this.monsters) {
            monster.update(dt, this.enemies, this);

            // スライム分裂処理（攻撃を受けた際にSLIME_CONSTANTS.SPLIT_CHANCEで分裂判定）
            if (monster.id === 'slime' && monster.shouldSplit && !monster.dead) {
                console.log('[ゲーム] スライム分裂処理開始');
                this.handleSlimeSplit(monster);
                monster.shouldSplit = false; // 処理後にフラグをリセット（次の攻撃で再度判定可能）
            }

            // スケルトン兵の蘇生エフェクト表示
            if (monster.shouldShowReviveEffect) {
                const reviveChance = Math.min(
                    (monster.data.passive.reviveChance || 0.5) + (monster.level - 1) * (monster.data.passive.reviveChancePerLevel || 0.01),
                    monster.data.passive.maxReviveChance || 0.8
                );
                const revivePercent = Math.floor(reviveChance * 100);
                this.ui.showMessage(`${monster.name} Lv.${monster.level}が蘇生しました！ (確率${revivePercent}%)`, 'success');
                this.ui.addLog(`${monster.name} Lv.${monster.level}が不死の呪いで蘇生しました！`, 'success');
                monster.shouldShowReviveEffect = false;
            }
        }
        this.cleanupDeadMonsters();
        this.applyDemonLordAuraBonuses();

        // 敵の更新
        for (const enemy of this.enemies) {
            enemy.update(dt, this);

            // コアに到達チェック
            if (enemy.reachedCore && !enemy.counted) {
                this.coreHp -= GAME_CONSTANTS.CORE_DAMAGE_PER_ENEMY;
                enemy.counted = true;
                this.ui.showMessage(`コアがダメージを受けました！ 残りHP: ${this.coreHp}`, 'warning');

                if (this.coreHp <= 0) {
                    this.defeat();
                }
            }
        }

        // 死亡した敵を削除して報酬を与える
        const enemiesBeforeFilter = this.enemies.length;
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.dead && !enemy.rewarded) {
                let soulReward = enemy.soulReward;

                // ソウル収穫機のボーナス
                for (const trap of this.traps) {
                    if (trap.destroyed || !trap.data.effect) continue;
                    if (trap.data.effect.type === 'soul_generation') {
                        const trapPos = this.grid.gridToWorld(trap.gridX, trap.gridY);
                        const dist = distance(trapPos.x, trapPos.y, enemy.x, enemy.y);
                        const range = trap.data.effect.radius * this.grid.tileSize;

                        if (dist <= range) {
                            soulReward += trap.data.effect.soulPerKill;
                        }
                    }
                }

                this.soul += soulReward;
                enemy.rewarded = true;

                // スコアとレベル記録
                const score = this.calculateEnemyScore(enemy);
                this.totalScore += score;
                this.totalEnemiesDefeated++;
                if (enemy.level > this.highestEnemyLevel) {
                    this.highestEnemyLevel = enemy.level;
                }

                // 全モンスターに経験値を配分
                this.distributeExpToAllMonsters(enemy);
            }
            return !enemy.dead;
        });
        if (this.enemies.length !== enemiesBeforeFilter) {
            this.quadtreeDirty = true;  // 敵が削除されたらQuadtree更新
        }

        // 破壊された罠を削除
        const trapsBeforeFilter = this.traps.length;
        this.traps = this.traps.filter(trap => {
            if (trap.destroyed && trap.hp <= 0) {
                const tile = this.grid.getTile(trap.gridX, trap.gridY);
                if (tile) tile.trap = null;

                // 罠破壊通知を追加（破壊時に1回だけ）
                if (!trap.destructionNotified) {
                    this.ui.showMessage(`${trap.name} Lv.${trap.level}が破壊されました！`, 'warning');
                    this.ui.addLog(`${trap.name} Lv.${trap.level}が破壊されました`, 'warning');
                    trap.destructionNotified = true;
                }

                return false;
            }
            return true;
        });
        if (this.traps.length !== trapsBeforeFilter) {
            this.quadtreeDirty = true;  // 罠が削除されたらQuadtree更新
        }
    }

    draw() {
        // 背景
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // グリッド
        this.grid.draw(this.ctx);

        // 罠
        for (const trap of this.traps) {
            trap.draw(this.ctx, this);
        }

        // モンスター
        for (const monster of this.monsters) {
            monster.draw(this.ctx, this);
        }

        // 敵
        for (const enemy of this.enemies) {
            enemy.draw(this.ctx, this);
        }

        // 配置プレビュー
        if (this.placementMode) {
            this.drawPlacementPreview();
        }

        // ドラッグ中のプレビュー
        if (this.isDragging && this.draggedMonster) {
            this.drawDragPreview();
        }

        // 選択オブジェクトのハイライト
        if (this.selectedObject) {
            this.drawSelectionHighlight();
        }

        // エフェクトの描画
        this.effectPool.drawEffects(this.ctx);
    }

    drawPlacementPreview() {
        const gridPos = this.grid.worldToGrid(this.mouseX, this.mouseY);
        const worldPos = this.grid.gridToWorld(gridPos.x, gridPos.y);

        let canPlace = false;

        if (this.placementMode === 'trap') {
            // 上書き可能な場所も含めて判定
            canPlace = this.grid.canPlaceTrap(gridPos.x, gridPos.y, true);
        } else if (this.placementMode === 'monster') {
            const monsterData = MONSTER_DATA[this.ui.selectedMonster];
            canPlace = this.grid.canPlaceMonster(gridPos.x, gridPos.y, monsterData.flying);
        }

        this.ctx.fillStyle = canPlace ? 'rgba(72, 187, 120, 0.3)' : 'rgba(245, 101, 101, 0.3)';
        this.ctx.fillRect(
            worldPos.x - this.grid.tileSize / 2,
            worldPos.y - this.grid.tileSize / 2,
            this.grid.tileSize,
            this.grid.tileSize
        );

        this.ctx.strokeStyle = canPlace ? '#48bb78' : '#f56565';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            worldPos.x - this.grid.tileSize / 2,
            worldPos.y - this.grid.tileSize / 2,
            this.grid.tileSize,
            this.grid.tileSize
        );
    }

    drawDragPreview() {
        const gridPos = this.grid.worldToGrid(this.draggedMonster.x, this.draggedMonster.y);
        const worldPos = this.grid.gridToWorld(gridPos.x, gridPos.y);

        // 移動可能かチェック
        const canPlace = this.canMoveMonsterTo(this.draggedMonster, gridPos.x, gridPos.y);

        // プレビューの背景
        this.ctx.fillStyle = canPlace ? 'rgba(72, 187, 120, 0.3)' : 'rgba(245, 101, 101, 0.3)';
        this.ctx.fillRect(
            worldPos.x - this.grid.tileSize / 2,
            worldPos.y - this.grid.tileSize / 2,
            this.grid.tileSize,
            this.grid.tileSize
        );

        // 枠線
        this.ctx.strokeStyle = canPlace ? '#48bb78' : '#f56565';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            worldPos.x - this.grid.tileSize / 2,
            worldPos.y - this.grid.tileSize / 2,
            this.grid.tileSize,
            this.grid.tileSize
        );

        // ドラッグ中のモンスターを半透明で表示
        this.ctx.globalAlpha = 0.7;
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(this.draggedMonster.x, this.draggedMonster.y, this.grid.tileSize * 0.6, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
    }

    drawSelectionHighlight() {
        let x, y;

        if (this.selectedObject instanceof Trap) {
            const pos = this.grid.gridToWorld(this.selectedObject.gridX, this.selectedObject.gridY);
            x = pos.x;
            y = pos.y;
        } else if (this.selectedObject instanceof Monster) {
            x = this.selectedObject.x;
            y = this.selectedObject.y;
        } else if (this.selectedObject instanceof Enemy) {
            x = this.selectedObject.x;
            y = this.selectedObject.y;
        } else {
            return;
        }

        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.grid.tileSize * 0.6, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    victory() {
        this.gameOver = true;
        this.ui.showGameOver(true);
    }

    defeat() {
        this.gameOver = true;
        this.ui.showGameOver(false);
    }

    /**
     * Quadtreeを再構築
     * 全エンティティをQuadtreeに登録して高速な近隣検索を可能にする
     */
    rebuildQuadtree() {
        this.quadtree.clear();

        // 敵を登録
        for (const enemy of this.enemies) {
            if (!enemy.dead) {
                this.quadtree.insert(enemy);
            }
        }

        // モンスターを登録
        for (const monster of this.monsters) {
            if (!monster.dead) {
                this.quadtree.insert(monster);
            }
        }

        // 罠を登録（ワールド座標に変換）
        for (const trap of this.traps) {
            if (!trap.destroyed) {
                const worldPos = this.grid.gridToWorld(trap.gridX, trap.gridY);
                trap.x = worldPos.x;
                trap.y = worldPos.y;
                this.quadtree.insert(trap);
            }
        }
    }

    /**
     * Quadtreeを使用した円形範囲検索
     * 従来のO(n)線形探索をO(log n)に改善
     */
    queryEntitiesInRadius(x, y, radius) {
        return this.quadtree.queryCircle(x, y, radius);
    }

    /**
     * 敵撃破時のスコア計算
     * レベルとタイプに応じてスコアを計算
     */
    calculateEnemyScore(enemy) {
        // 基本スコア = ソウル報酬 x レベル
        let baseScore = enemy.soulReward * enemy.level;

        // ボスは追加ボーナス
        if (enemy.boss) {
            baseScore *= 5;
        }

        return Math.floor(baseScore);
    }

    /**
     * 全モンスターに経験値を配分
     * 敵が倒された時に、その敵の経験値を全モンスターに付与
     * @param {Object} enemy - 倒された敵
     * @param {Object|null} killerMonster - 倒したモンスター（nullの場合は罠が倒した）
     */
    distributeExpToAllMonsters(enemy, killerMonster = null) {
        // 基本経験値計算（敵のレベルとソウル報酬に基づく）
        const baseExp = Math.floor(enemy.soulReward * 10 + enemy.level * 20);

        // 罠が倒した場合は20%、モンスターが倒した場合は10%を配分
        const sharedExpRate = killerMonster ? 0.1 : 0.2;
        const sharedExp = Math.floor(baseExp * sharedExpRate);

        if (sharedExp <= 0) return;

        // 生きているモンスターにのみ経験値を配分
        for (const monster of this.monsters) {
            if (monster.dead) continue;

            // 倒したモンスター本人の場合はスキップ（別途100%もらう）
            if (monster === killerMonster) continue;

            const oldLevel = monster.level;
            const oldSkillCount = monster.learnedSkills.length;
            monster.gainExp(sharedExp);

            // レベルアップした場合（ログのみ、通知は表示しない）
            if (monster.level > oldLevel) {
                this.ui.addLog(`${monster.name}がLv.${monster.level}にレベルアップしました！`, 'success');

                // スキル習得通知（ログのみ）
                if (monster.learnedSkills.length > oldSkillCount) {
                    const newSkill = monster.learnedSkills[monster.learnedSkills.length - 1];
                    this.ui.addLog(`${monster.name}がスキル「${newSkill.name}」を習得しました！`, 'info');
                }
            }
        }
    }

    /**
     * スライム分裂処理
     * ダメージを受けた時にSLIME_CONSTANTS.SPLIT_CHANCEで現在レベルのスライムを再生成
     */

    calculateManualSkillCost(monster, skill) {
        if (!monster || !skill || !SOUL_INVESTMENT_CONSTANTS) {
            return Infinity;
        }

        const base = SOUL_INVESTMENT_CONSTANTS.SKILL_BASE_COST || 0;
        const levelCost = monster.level * (SOUL_INVESTMENT_CONSTANTS.SKILL_PER_LEVEL_COST || 0);
        const learnedCost = monster.learnedSkills.length * (SOUL_INVESTMENT_CONSTANTS.SKILL_PER_SKILL_COST || 0);
        const rarityMultiplier = (SOUL_INVESTMENT_CONSTANTS.SKILL_RARITY_MULTIPLIERS &&
            SOUL_INVESTMENT_CONSTANTS.SKILL_RARITY_MULTIPLIERS[skill.rarity]) || 1.5;
        const rawCost = (base + levelCost + learnedCost) * rarityMultiplier;
        const minCost = SOUL_INVESTMENT_CONSTANTS.SKILL_MIN_COST || 0;
        return Math.max(minCost, Math.floor(rawCost));
    }

    purchaseSkillForMonster(monster, skill) {
        if (!monster || !skill) {
            return { success: false, reason: 'invalid_target' };
        }

        if (monster.skillMap.has(skill.id)) {
            this.ui.showMessage('すでに習得済みのスキルです', 'warning');
            return { success: false, reason: 'already_learned' };
        }

        const cost = this.calculateManualSkillCost(monster, skill);
        if (!Number.isFinite(cost)) {
            return { success: false, reason: 'cost_unavailable' };
        }

        if (this.soul < cost) {
            this.ui.showMessage('ソウルが不足しています', 'error');
            return { success: false, reason: 'not_enough_soul', cost };
        }

        const learned = monster.learnSpecificSkill(skill);
        if (!learned) {
            this.ui.showMessage('スキルの習得に失敗しました', 'error');
            return { success: false, reason: 'learn_failed' };
        }

        this.soul -= cost;
        this.ui.addLog(`${monster.name}がソウル${cost}を消費してスキル「${skill.name}」を習得しました！`, 'success');
        this.ui.showMessage(`${monster.name}が${skill.name}を獲得！`, 'success');
        return { success: true, cost };
    }

    investSoulForExp(monster, soulAmount) {
        if (!monster) {
            return { success: false, reason: 'invalid_target' };
        }

        const constants = SOUL_INVESTMENT_CONSTANTS;
        const amount = Math.floor(soulAmount);

        if (!Number.isFinite(amount) || amount < constants.MIN_SOUL_SPEND) {
            this.ui.showMessage(`最低${constants.MIN_SOUL_SPEND}以上のソウルを指定してください`, 'warning');
            return { success: false, reason: 'invalid_amount' };
        }

        if (amount > this.soul) {
            this.ui.showMessage('ソウルが不足しています', 'error');
            return { success: false, reason: 'not_enough_soul' };
        }

        const expGain = amount * constants.EXP_PER_SOUL;
        const previousLevel = monster.level;

        this.soul -= amount;
        monster.gainExp(expGain);

        this.ui.addLog(`${monster.name}に${expGain}の経験値を付与（ソウル${amount}消費）`, 'info');
        this.ui.showMessage(`${monster.name}に${expGain}EXPを付与しました`, 'info');

        if (monster.level > previousLevel) {
            this.ui.addLog(`${monster.name}がLv.${previousLevel}→Lv.${monster.level}に成長しました！`, 'success');
        }

        return {
            success: true,
            expGain,
            amountSpent: amount,
            leveledUp: monster.level > previousLevel
        };
    }

    handleSlimeSplit(originalSlime) {
        const slimeData = MONSTER_DATA['slime'];

        // 新しいレベルは元のレベルの半分（最低1）
        const newLevel = Math.max(1, Math.floor(originalSlime.level / 2));

        // マップ全体から最寄りの配置可能マスを探索（BFSで広範囲探索）
        const spawnTile = this.findNearestMonsterPlacement(originalSlime.gridX, originalSlime.gridY, false);
        if (!spawnTile) {
            // マップ全体に配置可能なマスが1つもない場合（極めて稀）
            console.warn('Slime split failed: no available placement tile in entire map.');
            return;
        }

        // 新しいレベルで新規スライムを生成
        const newSlime = new Monster(slimeData, spawnTile.x, spawnTile.y, newLevel);

        if (this.grid.placeMonster(spawnTile.x, spawnTile.y, newSlime)) {
            this.monsters.push(newSlime);
            this.quadtreeDirty = true;
            // 分裂通知はログのみ（通知は表示しない）
            this.ui.addLog(`スライム Lv.${newLevel}が分裂し新たなスライムが誕生しました！`, 'info');
        }
    }

    /**
     * 指定位置から最寄りの配置可能マスを探索
     */
    findNearestMonsterPlacement(startX, startY, flying = false) {
        const directions = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
            { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
        ];
        const visited = new Set([`${startX},${startY}`]);
        const queue = [{ x: startX, y: startY }];
        let index = 0;

        while (index < queue.length) {
            const current = queue[index++];

            if ((current.x !== startX || current.y !== startY) &&
                this.grid.canPlaceMonster(current.x, current.y, flying)) {
                return current;
            }

            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;

                if (nx < 0 || nx >= this.grid.cols || ny < 0 || ny >= this.grid.rows) {
                    continue;
                }

                const key = `${nx},${ny}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }

        return null;
    }
    cleanupDeadMonsters() {
        for (const monster of this.monsters) {
            if (monster.dead && !monster.deathProcessed) {
                this.handleFriendlyDeath(monster);
            }
        }
    }

    handleFriendlyDeath(monster) {
        monster.deathProcessed = true;

        const tile = this.grid.getTile(monster.gridX, monster.gridY);
        if (tile && tile.monster === monster) {
            tile.monster = null;
        }

        // 自ユニット死亡通知を追加
        this.ui.showMessage(`${monster.name} Lv.${monster.level}が倒されました！`, 'warning');
        this.ui.addLog(`${monster.name} Lv.${monster.level}が倒されました`, 'warning');

        const bonusExp = Math.floor(monster.exp * 0.1);
        if (bonusExp <= 0) {
            return;
        }

        this.distributeDeathExperience(monster, bonusExp);
    }

    distributeDeathExperience(fallenMonster, bonusExp) {
        const livingMonsters = this.monsters.filter(m => !m.dead && m !== fallenMonster);
        this.distributeEvenly(bonusExp, livingMonsters, (ally, share) => {
            if (share > 0) {
                ally.gainExp(share);
            }
        });

        const activeTraps = this.traps.filter(trap => !trap.destroyed);
        this.distributeEvenly(bonusExp, activeTraps, (trap, share) => {
            if (share > 0) {
                trap.gainExp(share);
            }
        });
    }

    distributeEvenly(amount, recipients, applyFn) {
        if (amount <= 0 || recipients.length === 0) return;
        let remaining = amount;
        let remainingRecipients = recipients.length;

        for (const target of recipients) {
            if (remaining <= 0) break;
            let share = Math.floor(remaining / remainingRecipients);
            if (share <= 0) {
                share = 1;
            }
            share = Math.min(share, remaining);
            applyFn(target, share);
            remaining -= share;
            remainingRecipients--;
        }
    }

    applyDemonLordAuraBonuses() {
        for (const monster of this.monsters) {
            if (typeof monster.removeDemonLordAuraBonus === 'function') {
                monster.removeDemonLordAuraBonus();
            }
        }

        const demonLord = this.monsters.find(m => !m.dead && m.id === 'demon_lord');
        if (!demonLord) {
            return;
        }

        const bonus = {
            attack: Math.max(1, Math.floor(demonLord.attack.damage * 0.1)),
            maxHp: Math.max(1, Math.floor(demonLord.maxHp * 0.1))
        };

        for (const monster of this.monsters) {
            if (monster === demonLord || monster.dead) continue;
            if (typeof monster.applyDemonLordAuraBonus === 'function') {
                monster.applyDemonLordAuraBonus(bonus);
            }
        }
    }

    getMonsterAtPosition(x, y) {
        const hoverRadius = this.grid.tileSize * 0.6;
        for (const monster of this.monsters) {
            if (monster.dead) continue;
            const dist = distance(x, y, monster.x, monster.y);
            if (dist <= hoverRadius) {
                return monster;
            }
        }
        return null;
    }

    /**
     * モンスターを指定位置に移動できるかチェック
     */
    canMoveMonsterTo(monster, gx, gy) {
        // グリッド範囲内か
        if (gx < 0 || gx >= this.grid.cols || gy < 0 || gy >= this.grid.rows) {
            return false;
        }

        const tile = this.grid.getTile(gx, gy);
        if (!tile) return false;

        // 空戦ユニットの場合
        if (monster.flying) {
            // elevated、path、spawn、coreに移動可能（pitとemptyは不可）
            if (tile.type !== 'elevated' && tile.type !== 'path' &&
                tile.type !== 'spawn' && tile.type !== 'core') {
                return false;
            }
        } else {
            // 地上ユニットの場合: path、spawn、coreにのみ移動可能（elevated、pit、emptyは不可）
            if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core') {
                return false;
            }
        }

        // 既に別のモンスターがいる場合は移動不可
        if (tile.monster && tile.monster !== monster) {
            return false;
        }

        return true;
    }

    /**
     * モンスターを移動する
     */
    moveMonster(monster, gx, gy) {
        // 現在のグリッド位置を取得
        const oldGridPos = this.grid.worldToGrid(monster.x, monster.y);
        const oldTile = this.grid.getTile(oldGridPos.x, oldGridPos.y);

        // 古いタイルからモンスターを削除
        if (oldTile && oldTile.monster === monster) {
            oldTile.monster = null;
        }

        // 新しい位置に移動
        const newTile = this.grid.getTile(gx, gy);
        if (newTile) {
            // 落とし穴チェック: 空戦ユニット以外が落とし穴に移動したら即死
            if (newTile.type === 'pit' && !monster.flying) {
                this.ui.showMessage(`${monster.name}が落とし穴に落ちて即死しました！`, 'warning');
                monster.hp = 0;
                monster.dead = true;
                // タイルには登録しない
                return;
            }

            newTile.monster = monster;
            const worldPos = this.grid.gridToWorld(gx, gy);
            monster.x = worldPos.x;
            monster.y = worldPos.y;
            monster.gridX = gx;
            monster.gridY = gy;
            this.quadtreeDirty = true;
        }
    }

    gameLoop() {
        const now = Date.now();
        const deltaTime = (now - this.lastTime) / 1000; // 秒単位
        this.lastTime = now;

        this.update(deltaTime);
        this.draw();
        this.ui.update();

        if (this.running) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// ゲーム開始
// グローバル変数の改善: IIFE内に閉じ込める
(function() {
    let game;
    window.addEventListener('load', () => {
        game = new Game();
    });

    // デバッグ用にwindow.gameとしてアクセス可能にする（必要な場合のみ）
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'game', {
            get: function() { return game; },
            set: function() {
                console.warn('window.gameは読み取り専用です');
            }
        });
    }
})();
