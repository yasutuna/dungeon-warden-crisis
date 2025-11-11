// Waveマネージャー
class WaveManager {
    constructor(game) {
        this.game = game;
        this.currentWave = 0;
        this.waveInProgress = false;
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.waveComplete = false;
        this.cachedPath = null; // 経路キャッシュ
        this.pathDirty = false; // 経路再計算フラグ
    }

    startWave() {
        if (this.waveInProgress) return;

        this.currentWave++;
        this.waveInProgress = true;
        this.waveComplete = false;

        // Wave16以降またはWave30以降でグリッドを再生成
        if (this.currentWave === 16 || this.currentWave === 30) {
            this.regenerateGrid();
        }

        // Wave解放要素を適用
        const waveData = WAVE_DATA[this.currentWave - 1] || null;
        if (waveData && waveData.unlocks) {
            this.unlockContent(waveData.unlocks);
        }

        // スポーンキューを準備
        this.prepareSpawnQueue(waveData);

        this.game.ui.showMessage(`Wave ${this.currentWave} 開始!`, 'info');
    }

    regenerateGrid() {
        // 既存の罠とモンスターを保存
        const existingTraps = [...this.game.traps];
        const existingMonsters = [...this.game.monsters];
        const previousGrid = this.game.grid;

        // グリッドを再生成（初期グリッドと同じスケールを使用）
        const cols = (typeof GRID_CONSTANTS !== 'undefined' && GRID_CONSTANTS.COLS) || previousGrid?.cols || 16;
        const rows = (typeof GRID_CONSTANTS !== 'undefined' && GRID_CONSTANTS.ROWS) || previousGrid?.rows || 12;
        const tileSize = (typeof GRID_CONSTANTS !== 'undefined' && GRID_CONSTANTS.TILE_SIZE) || previousGrid?.tileSize || 50;
        const previousCols = previousGrid?.cols || cols;
        const previousRows = previousGrid?.rows || rows;
        this.game.grid = new Grid(cols, rows, tileSize);
        this.game.grid.setupDefaultPath(this.currentWave);

        // 経路探索を更新
        this.game.pathFinder = new PathFinder(this.game.grid);

        // 保存した罠を再配置（配置可能な場合のみ）
        this.game.traps = [];
        for (const trap of existingTraps) {
            // 破壊されていない罠を再配置（allowOverwrite=falseで上書き禁止）
            if (!trap.destroyed && this.game.grid.canPlaceTrap(trap.gridX, trap.gridY, false)) {
                if (this.game.grid.placeTrap(trap.gridX, trap.gridY, trap)) {
                    this.game.traps.push(trap);
                }
            }
        }

        // 保存したモンスターを再配置（配置可能な場合のみ）
        this.game.monsters = [];

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const projectCoordinate = (value, oldSize, newSize) => {
            if (typeof value !== 'number' || newSize <= 0) {
                return 0;
            }
            if (!oldSize || oldSize <= 1) {
                return clamp(Math.round(value) || 0, 0, Math.max(0, newSize - 1));
            }
            const ratio = clamp(value, 0, oldSize - 1) / (oldSize - 1);
            return clamp(Math.round(ratio * (newSize - 1)), 0, Math.max(0, newSize - 1));
        };

        // �V�����}�b�v�ő����X�^�[��̉ڑ�
        const findRelocationTile = (startX, startY, flying) => {
            if (this.game.grid.cols === 0 || this.game.grid.rows === 0) {
                return null;
            }

            const directions = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];

            const targetX = clamp(Math.round(startX), 0, this.game.grid.cols - 1);
            const targetY = clamp(Math.round(startY), 0, this.game.grid.rows - 1);
            const visited = new Set();
            const queue = [{ x: targetX, y: targetY }];
            visited.add(`${targetX},${targetY}`);

            while (queue.length > 0) {
                const current = queue.shift();
                if (this.game.grid.canPlaceMonster(current.x, current.y, flying)) {
                    return current;
                }

                for (const dir of directions) {
                    const nx = current.x + dir.x;
                    const ny = current.y + dir.y;
                    if (nx < 0 || ny < 0 || nx >= this.game.grid.cols || ny >= this.game.grid.rows) {
                        continue;
                    }
                    const key = `${nx},${ny}`;
                    if (visited.has(key)) {
                        continue;
                    }
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }

            // �p�X�}�X��S�Ẵ^�C�����C���ł̉��L�X�^�[��T��
            for (const tile of this.game.grid.pathTiles || []) {
                if (this.game.grid.canPlaceMonster(tile.x, tile.y, flying)) {
                    return { x: tile.x, y: tile.y };
                }
            }

            return null;
        };

        for (const monster of existingMonsters) {
            if (monster.dead) continue;

            const projectedX = projectCoordinate(monster.gridX ?? 0, previousCols, this.game.grid.cols);
            const projectedY = projectCoordinate(monster.gridY ?? 0, previousRows, this.game.grid.rows);
            const relocationTile = findRelocationTile(projectedX, projectedY, monster.flying);

            if (relocationTile && this.game.grid.placeMonster(relocationTile.x, relocationTile.y, monster)) {
                this.game.monsters.push(monster);
            } else {
                console.warn('�����X�^�[�����V�����}�b�v�̋󔒂œ��L�ł��܂���ł���', monster);
            }
        }

        // 罠コストを更新
        this.game.pathFinder.updateTrapCosts(this.game.traps);

        // Quadtreeを無効化
        this.game.quadtreeDirty = true;

        // UIに通知
        this.game.ui.showMessage('新しいマップが生成されました！罠とモンスターはそのまま維持されます', 'info');
        this.game.ui.markPaletteDirty();
    }

    prepareSpawnQueue(waveData) {
        this.spawnQueue = [];
        let spawnTime = 0;

        // Wave30以降は動的にWaveデータを生成
        if (!waveData) {
            waveData = this.generateDynamicWave();
        }

        const enemyLevel = waveData.enemyLevel || 1;

        // Wave進行に応じた数の増加（Wave5以降、3Waveごとに+10%、最大+50%）
        const countMultiplier = this.currentWave >= 5
            ? Math.min(1.5, 1 + Math.floor((this.currentWave - 5) / 3) * 0.1)
            : 1;

        // Wave進行に応じた出現速度の増加（Wave5以降、出現間隔を短縮、最大-30%）
        const intervalMultiplier = this.currentWave >= 5
            ? Math.max(0.7, 1 - Math.floor((this.currentWave - 5) / 3) * 0.1)
            : 1;

        for (const enemyGroup of waveData.enemies) {
            const enemyData = ENEMY_DATA[enemyGroup.type];

            // 敵の数を増加（小数点以下は確率的に追加）
            const baseCount = enemyGroup.count * countMultiplier;
            const count = Math.floor(baseCount) + (Math.random() < (baseCount % 1) ? 1 : 0);

            // 出現間隔を短縮
            const interval = enemyGroup.interval * intervalMultiplier;

            for (let i = 0; i < count; i++) {
                this.spawnQueue.push({
                    type: enemyGroup.type,
                    data: enemyData,
                    level: enemyLevel,
                    spawnTime: spawnTime
                });

                spawnTime += interval;
            }
        }

        // スポーン時間でソート
        this.spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);
        this.spawnTimer = 0;
    }

    update(deltaTime) {
        // 自動Wave進行が有効で、Wave進行中でない場合は自動的に開始
        if (!this.waveInProgress && this.game.autoWaveEnabled) {
            this.startWave();
            return;
        }

        if (!this.waveInProgress) return;

        this.spawnTimer += deltaTime;

        // 敵のスポーン
        while (this.spawnQueue.length > 0 && this.spawnQueue[0].spawnTime <= this.spawnTimer) {
            const spawnData = this.spawnQueue.shift();
            this.spawnEnemy(spawnData);
        }

        // Wave完了チェック
        if (this.spawnQueue.length === 0 && this.game.enemies.length === 0) {
            this.completeWave();
        }
    }

    spawnEnemy(spawnData) {
        // 各敵が現在の罠配置に基づいて独自の経路を計算
        // これによりタワーディフェンスの戦略性が生まれる
        this.game.pathFinder.updateTrapCosts(this.game.traps);

        // 複数スポーン地点がある場合はランダムに選択
        let startPoint, endPoint;

        if (this.game.grid.spawnPoints && this.game.grid.spawnPoints.length > 1) {
            // ランダムにスポーン地点を選択
            const randomSpawn = this.game.grid.spawnPoints[Math.floor(Math.random() * this.game.grid.spawnPoints.length)];
            startPoint = randomSpawn;
        } else {
            // 単一スポーン地点
            startPoint = this.game.grid.pathTiles[0];
        }

        // コアは常にpathTilesの最後
        endPoint = this.game.grid.pathTiles[this.game.grid.pathTiles.length - 1];

        const path = this.game.pathFinder.findPath(
            startPoint.x,
            startPoint.y,
            endPoint.x,
            endPoint.y
        );

        // 出現位置の重複チェック - 空いている位置を探す
        const spawnPosition = this.findAvailableSpawnPosition(startPoint);
        if (!spawnPosition) {
            console.warn('利用可能なスポーン位置が見つかりませんでした');
            return;
        }

        const enemy = new Enemy(spawnData.data, path, this.game, spawnData.level);

        // 空いている位置に配置
        const worldPos = this.game.grid.gridToWorld(spawnPosition.x, spawnPosition.y);
        enemy.x = worldPos.x;
        enemy.y = worldPos.y;

        // 敵のグリッド座標を設定
        enemy.gridX = spawnPosition.x;
        enemy.gridY = spawnPosition.y;

        // タイルに敵を登録（既に他の敵がいなければ）
        const tile = this.game.grid.getTile(spawnPosition.x, spawnPosition.y);
        if (tile && !tile.enemy) {
            tile.enemy = enemy;
        }

        this.game.enemies.push(enemy);

        // Quadtreeを無効化（新しい敵が追加されたため）
        this.game.quadtreeDirty = true;
    }

    /**
     * 空いているスポーン位置を探す
     * 常にSマスを最優先し、全てのSマスが埋まっている場合のみ近くのパスマスを使用
     */
    findAvailableSpawnPosition(preferredStart) {
        // ステップ1: まずSマス（spawn）で空いている場所を探す
        const spawnTiles = [];
        for (let y = 0; y < this.game.grid.rows; y++) {
            for (let x = 0; x < this.game.grid.cols; x++) {
                const tile = this.game.grid.getTile(x, y);
                if (tile && tile.type === 'spawn' && !this.isPositionOccupied(x, y)) {
                    spawnTiles.push({ x, y });
                }
            }
        }

        // ステップ2: Sマスに空きがあれば必ずそこを使う（最優先）
        if (spawnTiles.length > 0) {
            const chosenTile = spawnTiles[Math.floor(Math.random() * spawnTiles.length)];
            return chosenTile;
        }

        // Sマスが全て埋まっている場合、Sマスから最も近いパスマス（path）を探す
        // 全てのSマスの位置を取得
        const allSpawnTiles = [];
        for (let y = 0; y < this.game.grid.rows; y++) {
            for (let x = 0; x < this.game.grid.cols; x++) {
                const tile = this.game.grid.getTile(x, y);
                if (tile && tile.type === 'spawn') {
                    allSpawnTiles.push({ x, y });
                }
            }
        }

        if (allSpawnTiles.length === 0) {
            return null; // Sマスが存在しない
        }

        // 空いているパスマスを取得し、Sマスからの距離順にソート
        const pathTiles = [];
        for (let y = 0; y < this.game.grid.rows; y++) {
            for (let x = 0; x < this.game.grid.cols; x++) {
                const tile = this.game.grid.getTile(x, y);
                if (tile && tile.type === 'path' && !this.isPositionOccupied(x, y)) {
                    // 全てのSマスから最も近い距離を計算
                    let minDist = Infinity;
                    for (const spawn of allSpawnTiles) {
                        const dist = Math.abs(x - spawn.x) + Math.abs(y - spawn.y); // マンハッタン距離
                        minDist = Math.min(minDist, dist);
                    }
                    pathTiles.push({ x, y, distFromSpawn: minDist });
                }
            }
        }

        if (pathTiles.length === 0) {
            return null; // 利用可能な位置がない
        }

        // Sマスから近い順にソート
        pathTiles.sort((a, b) => a.distFromSpawn - b.distFromSpawn);

        // 最も近い位置（または同距離の中からランダム）を選択
        const minDist = pathTiles[0].distFromSpawn;
        const closestTiles = pathTiles.filter(t => t.distFromSpawn === minDist);
        const chosenTile = closestTiles[Math.floor(Math.random() * closestTiles.length)];

        return chosenTile;
    }

    /**
     * 指定位置に既に敵がいるかチェック
     */
    isPositionOccupied(gx, gy) {
        // ワールド座標での近接チェックを優先
        // タイルのenemyプロパティは複数の敵が同じタイルを通過する際に更新が遅れる可能性があるため
        const worldPos = this.game.grid.gridToWorld(gx, gy);
        const checkRadius = this.game.grid.tileSize * 0.4; // タイルサイズの40%以内に敵がいるかチェック

        for (const enemy of this.game.enemies) {
            if (enemy.dead) continue;
            const dist = distance(worldPos.x, worldPos.y, enemy.x, enemy.y);
            if (dist < checkRadius) {
                return true;
            }
        }

        return false;
    }

    invalidatePathCache() {
        // 罠配置時などに呼び出して経路を無効化
        // 注: 各敵が独自に経路計算するため、このメソッドは不要になった
        // 互換性のため残しておく
        this.pathDirty = true;
    }

    completeWave() {
        if (this.waveComplete) return;

        this.waveComplete = true;
        this.waveInProgress = false;

        // Wave報酬
        const baseReward = 50 + (this.currentWave * 10);
        this.game.soul += baseReward;
        this.game.material += Math.floor(this.currentWave / 2);

        // モンスターの最高レベルを保存（次のWaveに引き継ぐ）
        let maxMonsterLevel = 1;
        for (const monster of this.game.monsters) {
            if (!monster.dead && monster.level > maxMonsterLevel) {
                maxMonsterLevel = monster.level;
            }
        }

        // 敵の最高レベルも更新（次のWaveで敵のレベルが上昇）
        const nextWaveData = WAVE_DATA[this.currentWave];
        if (nextWaveData && this.game.highestEnemyLevel > 0) {
            // 敵のレベルを最高撃破レベルに応じて上昇
            const levelBonus = Math.floor(this.game.highestEnemyLevel / 3);
            nextWaveData.enemyLevel = (nextWaveData.enemyLevel || 1) + levelBonus;
        }

        this.game.ui.showMessage(`Wave ${this.currentWave} クリア! 報酬: ${baseReward} ソウル | スコア: ${this.game.totalScore}`, 'success');
    }

    unlockContent(unlocks) {
        if (!unlocks || unlocks.length === 0) return;

        for (const unlockId of unlocks) {
            // 罠の解放
            if (TRAP_DATA[unlockId]) {
                TRAP_DATA[unlockId].unlocked = true;
                this.game.ui.showMessage(`罠解放: ${TRAP_DATA[unlockId].name}`, 'success');
            }

            // モンスターの解放
            if (MONSTER_DATA[unlockId]) {
                MONSTER_DATA[unlockId].unlocked = true;
                this.game.ui.showMessage(`モンスター解放: ${MONSTER_DATA[unlockId].name}`, 'success');
            }

            // その他の解放（祭壇、研究など）
            // TODO: 実装
        }

        // UIを更新
        this.game.ui.markPaletteDirty();
    }

    getCurrentWave() {
        return this.currentWave;
    }

    getTotalWaves() {
        return '∞'; // 無限に続く
    }

    isWaveInProgress() {
        return this.waveInProgress;
    }

    /**
     * Wave30以降の動的Wave生成
     * レベルと敵の種類・数を自動的にスケーリング
     */
    generateDynamicWave() {
        const waveNumber = this.currentWave;
        const baseLevel = Math.floor(waveNumber * 0.8); // Waveごとにレベル上昇

        // 全ての敵タイプを取得（新しい敵を含む）
        const normalEnemyTypes = [
            'thief', 'warrior', 'ranger', 'cleric', 'elementalist',
            'siege_soldier', 'flying_scout', 'assassin', 'knight',
            'berserker', 'necromancer', 'battle_mage', 'paladin',
            'dragon_knight', 'archmage', 'titan', 'shadow_walker', 'war_priest'
        ];

        const bossTypes = ['light_hero', 'demon_lord'];

        // Wave難易度に応じて敵の種類と数を増加
        const enemyVariety = Math.min(Math.floor(waveNumber / 4) + 3, 12);
        const baseCount = Math.floor(waveNumber / 1.5) + 10;

        const enemies = [];

        // ランダムに敵タイプを選択
        const selectedTypes = [];
        const shuffled = [...normalEnemyTypes].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(enemyVariety, shuffled.length); i++) {
            selectedTypes.push(shuffled[i]);
        }

        // 各タイプの敵を追加
        for (const type of selectedTypes) {
            const count = baseCount + Math.floor(Math.random() * baseCount / 2);
            const interval = 1.2 + Math.random() * 1.3;

            enemies.push({
                type: type,
                count: count,
                interval: interval
            });
        }

        // 10Waveごとにボスを追加（複数種類）
        if (waveNumber % 10 === 0) {
            const bossCount = Math.floor(waveNumber / 15) + 1;

            // 光の勇者を追加
            enemies.push({
                type: 'light_hero',
                count: bossCount,
                interval: 5
            });

            // Wave40以降は使徒も追加
            if (waveNumber >= 40) {
                enemies.push({
                    type: 'demon_lord',
                    count: Math.max(1, Math.floor(bossCount / 2)),
                    interval: 8
                });
            }
        }

        // Wave5の倍数でエリート敵（タイタン・竜騎士・大魔導士）を追加
        if (waveNumber % 5 === 0 && waveNumber % 10 !== 0) {
            const eliteTypes = ['titan', 'dragon_knight', 'archmage'];
            const eliteType = eliteTypes[Math.floor(Math.random() * eliteTypes.length)];
            enemies.push({
                type: eliteType,
                count: Math.floor(waveNumber / 10) + 2,
                interval: 3
            });
        }

        return {
            wave: waveNumber,
            enemyLevel: baseLevel,
            enemies: enemies,
            unlocks: [],
            boss: waveNumber % 10 === 0
        };
    }
}
