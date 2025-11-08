// グリッドシステム
class Grid {
    constructor(cols, rows, tileSize) {
        this.cols = cols;
        this.rows = rows;
        this.tileSize = tileSize;
        this.tiles = [];

        // グリッド初期化
        for (let y = 0; y < rows; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < cols; x++) {
                this.tiles[y][x] = {
                    x: x,
                    y: y,
                    type: 'empty', // empty, path, spawn, core, elevated, pit
                    trap: null,
                    monster: null,
                    enemy: null,
                    cost: 1, // 経路探索用コスト
                    walkable: true
                };
            }
        }

        // デフォルトパスを設定
        this.setupDefaultPath();
    }

    setupDefaultPath(waveNumber = 1) {
        // Wave番号に応じてマップパターンを選択
        let patterns;
        if (waveNumber >= 30) {
            // Wave30以降: 3スポーン地点を含むパターンも選択可能
            patterns = ['straight', 'zigzag', 'split', 'maze', 'dual_spawn', 'triple_spawn'];
        } else if (waveNumber >= 16) {
            // Wave16以降: 2スポーン地点を含むパターンも選択可能
            patterns = ['straight', 'zigzag', 'split', 'maze', 'dual_spawn'];
        } else {
            // Wave15以前: 従来の単一スポーンパターンのみ
            patterns = ['straight', 'zigzag', 'split', 'maze'];
        }

        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];

        // まず全てのタイルを歩行不可に設定
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                this.tiles[y][x].walkable = false;
            }
        }

        switch(selectedPattern) {
            case 'straight':
                this.setupStraightPath();
                break;
            case 'zigzag':
                this.setupZigzagPath();
                break;
            case 'split':
                this.setupSplitPath();
                break;
            case 'maze':
                this.setupMazePath();
                break;
            case 'dual_spawn':
                this.setupDualSpawnPath();
                break;
            case 'triple_spawn':
                this.setupTripleSpawnPath();
                break;
            default:
                this.setupStraightPath();
        }

        // パスタイルを歩行可能に設定
        this.markPathTilesWalkable();
    }

    markPathTilesWalkable() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const tile = this.tiles[y][x];
                if (tile.type === 'spawn' || tile.type === 'path' || tile.type === 'core') {
                    tile.walkable = true;
                }
            }
        }
    }

    setupStraightPath() {
        // 戦略的マップ: 大部屋、迷路、デッドエンド、空中ルートを含む
        this.pathTiles = [];
        const midY = Math.floor(this.rows / 2);

        // === スポーンエリア（2×2の広場） ===
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const y = midY + dy;
                const x = dx;
                this.tiles[y][x].type = dx === 0 && dy === 0 ? 'spawn' : 'path';
                this.tiles[y][x].walkable = true;
                this.pathTiles.push({ x, y });
            }
        }

        // === 第1通路（チョークポイント）2マス ===
        for (let x = 2; x <= 3; x++) {
            this.tiles[midY][x].type = 'path';
            this.tiles[midY][x].walkable = true;
            this.pathTiles.push({ x, y: midY });
        }

        // === 第1大部屋（4×3の戦闘エリア）===
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = 4; dx <= 7; dx++) {
                const y = midY + dy;
                this.tiles[y][dx].type = 'path';
                this.tiles[y][dx].walkable = true;
                this.pathTiles.push({ x: dx, y });
            }
        }

        // === 迷路分岐点（ここから3方向）===
        // メインルート: 右へ
        for (let x = 8; x <= 9; x++) {
            this.tiles[midY][x].type = 'path';
            this.tiles[midY][x].walkable = true;
            this.pathTiles.push({ x, y: midY });
        }

        // デッドエンド1: 上へ（罠エリア）
        for (let y = midY - 2; y < midY; y++) {
            this.tiles[y][7].type = 'path';
            this.tiles[y][7].walkable = true;
            this.pathTiles.push({ x: 7, y });
        }
        // デッドエンドの先に落とし穴
        this.tiles[midY - 3][7].type = 'pit';

        // デッドエンド2: 下へ（罠エリア）
        for (let y = midY + 2; y <= midY + 3; y++) {
            this.tiles[y][7].type = 'path';
            this.tiles[y][7].walkable = true;
            this.pathTiles.push({ x: 7, y });
        }
        // デッドエンドの先に落とし穴
        this.tiles[midY + 4][7].type = 'pit';

        // === 第2大部屋（3×3の集団戦エリア）===
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = 10; dx <= 12; dx++) {
                const y = midY + dy;
                this.tiles[y][dx].type = 'path';
                this.tiles[y][dx].walkable = true;
                this.pathTiles.push({ x: dx, y });
            }
        }

        // === 最終通路（チョークポイント）===
        for (let x = 13; x <= 15; x++) {
            this.tiles[midY][x].type = 'path';
            this.tiles[midY][x].walkable = true;
            this.pathTiles.push({ x, y: midY });
        }

        // === コアエリア（3×2の広場）===
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 16; dx < this.cols; dx++) {
                const y = midY + dy;
                this.tiles[y][dx].type = dx === this.cols - 1 && dy === 0 ? 'core' : 'path';
                this.tiles[y][dx].walkable = true;
                this.pathTiles.push({ x: dx, y });
            }
        }

        // === 落とし穴（戦略的配置）===
        this.tiles[midY - 2][10].type = 'pit'; // 第2大部屋の上
        this.tiles[midY + 2][12].type = 'pit'; // 第2大部屋の下

        // === emptyマス（罠設置専用エリア）===
        for (let y = 1; y < this.rows - 1; y++) {
            for (let x = 1; x < this.cols - 1; x++) {
                const tile = this.tiles[y][x];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = false;
                }
            }
        }

        // === 紫マス（elevated）- 空中ルート ===
        // スポーンから第1大部屋上空
        for (let x = 0; x <= 7; x++) {
            const y = midY - 3;
            if (this.tiles[y] && this.tiles[y][x]) {
                this.tiles[y][x].type = 'elevated';
                this.tiles[y][x].walkable = true;
            }
        }
        // 第2大部屋上空からコア
        for (let x = 10; x < this.cols; x++) {
            const y = midY - 3;
            if (this.tiles[y] && this.tiles[y][x]) {
                this.tiles[y][x].type = 'elevated';
                this.tiles[y][x].walkable = true;
            }
        }
        // 空中ルート接続（第1大部屋との接続ポイント）
        this.tiles[midY - 2][7].type = 'elevated';
        this.tiles[midY - 2][7].walkable = true;
        // 空中ルート接続（第2大部屋との接続ポイント）
        this.tiles[midY - 2][10].type = 'elevated';
        this.tiles[midY - 2][10].walkable = true;

        // 下部の空中ルート
        for (let x = 0; x < this.cols; x++) {
            const y = midY + 4;
            if (this.tiles[y] && this.tiles[y][x]) {
                this.tiles[y][x].type = 'elevated';
                this.tiles[y][x].walkable = true;
            }
        }
        // 下部接続ポイント
        this.tiles[midY + 2][7].type = 'elevated';
        this.tiles[midY + 2][7].walkable = true;
        this.tiles[midY + 3][12].type = 'elevated';
        this.tiles[midY + 3][12].walkable = true;
    }

    setupZigzagPath() {
        // ジグザグ迷路 - 空中ルートと落とし穴を戦略的に配置
        this.pathTiles = [];
        let x = 0, y = 5;

        // スポーン地点（1マス幅）
        this.tiles[y][x].type = 'spawn';
        this.pathTiles.push({ x, y });

        // ジグザグパスを作成（1マス幅）
        while (x < this.cols - 1) {
            x++;
            this.tiles[y][x].type = 'path';
            this.pathTiles.push({ x, y });

            // 3マスごとに上下に移動
            if (x % 3 === 0 && x < this.cols - 1) {
                const oldY = y;
                if (y <= 5) {
                    y = Math.min(y + 3, this.rows - 3);
                } else {
                    y = Math.max(y - 3, 3);
                }

                // 縦方向の移動タイルを追加（1マス幅）
                const startY = Math.min(oldY, y);
                const endY = Math.max(oldY, y);
                for (let ty = startY + 1; ty <= endY; ty++) {
                    this.tiles[ty][x].type = 'path';
                    this.pathTiles.push({ x, y: ty });
                }

                // 落とし穴をルート脇に配置
                if (oldY < y) {
                    // 下へ移動する場合、右側に落とし穴
                    if (x + 1 < this.cols) {
                        this.tiles[y][x + 1].type = 'pit';
                    }
                } else {
                    // 上へ移動する場合、左側に落とし穴
                    if (x - 1 >= 0) {
                        this.tiles[y][x - 1].type = 'pit';
                    }
                }
            }
        }

        // コア（1マス幅）
        this.tiles[y][this.cols - 1].type = 'core';

        // emptyマスを罠設置のみ可能に（移動・召喚不可）
        for (let py = 2; py < this.rows - 2; py++) {
            for (let px = 1; px < this.cols - 1; px++) {
                const tile = this.tiles[py][px];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = false;
                }
            }
        }

        // 紫マス（elevated） - 空戦ルート
        // 上部の空中ルート（y=3）
        for (let px = 3; px < this.cols - 2; px++) {
            if (this.tiles[3] && this.tiles[3][px]) {
                this.tiles[3][px].type = 'elevated';
                this.tiles[3][px].walkable = true;
            }
        }
        // 下部の空中ルート（y=this.rows-4）
        const lowerElevatedY = this.rows - 4;
        for (let px = 3; px < this.cols - 2; px++) {
            if (this.tiles[lowerElevatedY] && this.tiles[lowerElevatedY][px]) {
                this.tiles[lowerElevatedY][px].type = 'elevated';
                this.tiles[lowerElevatedY][px].walkable = true;
            }
        }
    }

    setupSplitPath() {
        // 上下分岐ルート - 落とし穴と空中ルートを効果的に配置
        this.pathTiles = [];
        const startY = Math.floor(this.rows / 2);

        // スポーン地点（1マス幅）
        this.tiles[startY][0].type = 'spawn';
        this.pathTiles.push({ x: 0, y: startY });

        // 最初の直線（1マス幅）
        for (let x = 1; x < 5; x++) {
            this.tiles[startY][x].type = 'path';
            this.pathTiles.push({ x, y: startY });
        }

        // 分岐点前に落とし穴
        this.tiles[startY - 1][4].type = 'pit';
        this.tiles[startY + 2][4].type = 'pit';

        // 上下に分岐
        const upperY = startY - 2;
        const lowerY = startY + 2;

        // 分岐点（x=5）から上ルートへの接続（1マス幅）
        for (let ty = upperY; ty <= startY; ty++) {
            this.tiles[ty][5].type = 'path';
            this.pathTiles.push({ x: 5, y: ty });
        }

        // 分岐点（x=5）から下ルートへの接続（1マス幅）
        for (let ty = startY; ty <= lowerY; ty++) {
            this.tiles[ty][5].type = 'path';
        }

        // 上ルート（1マス幅）
        for (let x = 6; x <= 10; x++) {
            this.tiles[upperY][x].type = 'path';
            this.pathTiles.push({ x, y: upperY });
        }

        // 上ルート脇に落とし穴
        this.tiles[upperY - 1][8].type = 'pit';

        // 下ルート（1マス幅）
        for (let x = 6; x <= 10; x++) {
            this.tiles[lowerY][x].type = 'path';
            this.pathTiles.push({ x, y: lowerY });
        }

        // 下ルート脇に落とし穴
        this.tiles[lowerY + 1][8].type = 'pit';

        // 合流点（x=11）から上ルートの接続
        for (let ty = upperY; ty <= startY; ty++) {
            this.tiles[ty][11].type = 'path';
        }

        // 合流点（x=11）から下ルートの接続
        for (let ty = startY; ty <= lowerY; ty++) {
            this.tiles[ty][11].type = 'path';
        }

        // 合流後（1マス幅）
        for (let x = 12; x < this.cols; x++) {
            this.tiles[startY][x].type = 'path';
            this.pathTiles.push({ x, y: startY });
        }

        // 合流後にも落とし穴
        this.tiles[startY + 1][14].type = 'pit';

        // コア（1マス幅）
        this.tiles[startY][this.cols - 1].type = 'core';

        // emptyマスを罠設置のみ可能に（移動・召喚不可）
        for (let py = 1; py < this.rows - 1; py++) {
            for (let px = 1; px < this.cols - 1; px++) {
                const tile = this.tiles[py][px];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = false;
                }
            }
        }

        // 紫マス（elevated） - 空戦ルート: 分岐路を避けて移動できる迂回路
        // 上ルートの一部を空中ルート化
        for (let x = 7; x <= 10; x++) {
            if (this.tiles[upperY] && this.tiles[upperY][x]) {
                this.tiles[upperY][x].type = 'elevated';
                this.tiles[upperY][x].walkable = true;
            }
        }
        // 下ルートの一部を空中ルート化
        for (let x = 7; x <= 10; x++) {
            if (this.tiles[lowerY] && this.tiles[lowerY][x]) {
                this.tiles[lowerY][x].type = 'elevated';
                this.tiles[lowerY][x].walkable = true;
            }
        }
        // 中央の分岐を避けるショートカット
        for (let x = 7; x <= 10; x++) {
            if (this.tiles[startY] && this.tiles[startY][x]) {
                this.tiles[startY][x].type = 'elevated';
                this.tiles[startY][x].walkable = true;
            }
        }
    }

    setupMazePath() {
        // 複雑な迷路パス - 落とし穴と空中ルートを含む
        this.pathTiles = [];
        const path = [
            { x: 0, y: 6 }, // スポーン
            { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 },
            { x: 3, y: 5 }, { x: 3, y: 4 }, { x: 3, y: 3 },
            { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 },
            { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 6 },
            { x: 7, y: 6 }, { x: 8, y: 6 }, { x: 9, y: 6 },
            { x: 9, y: 7 }, { x: 9, y: 8 }, { x: 9, y: 9 },
            { x: 10, y: 9 }, { x: 11, y: 9 }, { x: 12, y: 9 },
            { x: 12, y: 8 }, { x: 12, y: 7 }, { x: 12, y: 6 },
            { x: 13, y: 6 }, { x: 14, y: 6 }, { x: 15, y: 6 } // コア
        ];

        // パスを設定（1マス幅）
        for (let i = 0; i < path.length; i++) {
            const { x, y } = path[i];
            if (i === 0) {
                this.tiles[y][x].type = 'spawn';
            } else if (i === path.length - 1) {
                this.tiles[y][x].type = 'core';
            } else {
                this.tiles[y][x].type = 'path';
            }
            this.pathTiles.push({ x, y });
        }

        // 迷路の曲がり角に落とし穴を配置
        this.tiles[2][3].type = 'pit';  // 最初の曲がり角
        this.tiles[6][7].type = 'pit';  // 中央エリア
        this.tiles[10][9].type = 'pit'; // 最後の曲がり角手前
        this.tiles[12][5].type = 'pit'; // ゴール手前

        // emptyマスを罠設置のみ可能に（移動・召喚不可）
        for (let py = 2; py < this.rows - 2; py++) {
            for (let px = 1; px < this.cols - 1; px++) {
                const tile = this.tiles[py][px];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = false;
                }
            }
        }

        // 紫マス（elevated） - 空戦ルート: 迷路を無視した直線ルート
        // y=3あたりの横断ルート
        for (let x = 2; x <= 14; x++) {
            if (this.tiles[3] && this.tiles[3][x]) {
                this.tiles[3][x].type = 'elevated';
                this.tiles[3][x].walkable = true;
            }
        }
        // 迷路の中央を横断する空中ルート（y=6）
        for (let x = 4; x <= 11; x++) {
            if (this.tiles[6] && this.tiles[6][x]) {
                this.tiles[6][x].type = 'elevated';
                this.tiles[6][x].walkable = true;
            }
        }
        // y=9あたりの横断ルート
        for (let x = 2; x <= 14; x++) {
            if (this.tiles[9] && this.tiles[9][x]) {
                this.tiles[9][x].type = 'elevated';
                this.tiles[9][x].walkable = true;
            }
        }
    }

    setupDualSpawnPath() {
        // 2つのスポーン地点から出発 - 空中ルートと落とし穴を配置
        this.pathTiles = [];
        this.spawnPoints = []; // 複数スポーン地点を保存

        const upperSpawnY = 3;
        const lowerSpawnY = this.rows - 4;
        const mergeX = Math.floor(this.cols / 2);
        const coreY = Math.floor(this.rows / 2);

        // 上側のスポーン地点
        this.tiles[upperSpawnY][0].type = 'spawn';
        this.spawnPoints.push({ x: 0, y: upperSpawnY });

        // 下側のスポーン地点
        this.tiles[lowerSpawnY][0].type = 'spawn';
        this.spawnPoints.push({ x: 0, y: lowerSpawnY });

        // 上ルート（スポーン -> 合流点）
        for (let x = 1; x < mergeX; x++) {
            this.tiles[upperSpawnY][x].type = 'path';
        }

        // 下ルート（スポーン -> 合流点）
        for (let x = 1; x < mergeX; x++) {
            this.tiles[lowerSpawnY][x].type = 'path';
        }

        // 上ルート脇に落とし穴
        this.tiles[upperSpawnY - 1][4].type = 'pit';
        this.tiles[upperSpawnY + 1][6].type = 'pit';

        // 下ルート脇に落とし穴
        this.tiles[lowerSpawnY - 1][6].type = 'pit';
        this.tiles[lowerSpawnY + 1][4].type = 'pit';

        // 合流点から上ルートへの接続
        for (let y = upperSpawnY; y <= coreY; y++) {
            this.tiles[y][mergeX].type = 'path';
        }

        // 合流点から下ルートへの接続
        for (let y = coreY; y <= lowerSpawnY; y++) {
            this.tiles[y][mergeX].type = 'path';
        }

        // 合流点に落とし穴
        this.tiles[coreY - 1][mergeX - 1].type = 'pit';
        this.tiles[coreY + 1][mergeX + 1].type = 'pit';

        // 合流後の直線
        for (let x = mergeX + 1; x < this.cols; x++) {
            this.tiles[coreY][x].type = 'path';
        }

        // ゴール手前の落とし穴
        this.tiles[coreY + 1][this.cols - 3].type = 'pit';

        // コア
        this.tiles[coreY][this.cols - 1].type = 'core';

        // pathTilesは各スポーンからコアへのパスを保存
        // スポーン1からのパス
        for (let x = 0; x < mergeX; x++) {
            this.pathTiles.push({ x: x, y: upperSpawnY });
        }
        for (let y = upperSpawnY; y <= coreY; y++) {
            this.pathTiles.push({ x: mergeX, y: y });
        }
        for (let x = mergeX + 1; x <= this.cols - 1; x++) {
            this.pathTiles.push({ x: x, y: coreY });
        }

        // emptyマスを罠設置のみ可能に（移動・召喚不可）
        for (let py = 2; py < this.rows - 2; py++) {
            for (let px = 1; px < this.cols - 1; px++) {
                const tile = this.tiles[py][px];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = false;
                }
            }
        }

        // 紫マス（elevated） - 空戦ルート: 両ルートの上空を通過
        // 上ルートの一部を空中ルート化
        for (let x = 2; x <= mergeX + 2; x++) {
            if (this.tiles[upperSpawnY] && this.tiles[upperSpawnY][x]) {
                this.tiles[upperSpawnY][x].type = 'elevated';
                this.tiles[upperSpawnY][x].walkable = true;
            }
        }
        // 下ルートの一部を空中ルート化
        for (let x = 2; x <= mergeX + 2; x++) {
            if (this.tiles[lowerSpawnY] && this.tiles[lowerSpawnY][x]) {
                this.tiles[lowerSpawnY][x].type = 'elevated';
                this.tiles[lowerSpawnY][x].walkable = true;
            }
        }
        // 合流後の空中ショートカット
        for (let x = mergeX; x <= this.cols - 2; x++) {
            if (this.tiles[coreY] && this.tiles[coreY][x]) {
                this.tiles[coreY][x].type = 'elevated';
                this.tiles[coreY][x].walkable = true;
            }
        }
    }

    setupTripleSpawnPath() {
        // 3つのスポーン地点から出発 - 空中ルートと落とし穴を配置
        this.pathTiles = [];
        this.spawnPoints = []; // 複数スポーン地点を保存

        const topSpawnY = 2;
        const midSpawnY = Math.floor(this.rows / 2);
        const botSpawnY = this.rows - 3;
        const mergeX = Math.floor(this.cols / 2);
        const coreY = Math.floor(this.rows / 2);

        // 3つのスポーン地点
        this.tiles[topSpawnY][0].type = 'spawn';
        this.spawnPoints.push({ x: 0, y: topSpawnY });

        this.tiles[midSpawnY][0].type = 'spawn';
        this.spawnPoints.push({ x: 0, y: midSpawnY });

        this.tiles[botSpawnY][0].type = 'spawn';
        this.spawnPoints.push({ x: 0, y: botSpawnY });

        // 上ルート
        for (let x = 1; x < mergeX; x++) {
            this.tiles[topSpawnY][x].type = 'path';
        }

        // 中ルート
        for (let x = 1; x < mergeX; x++) {
            this.tiles[midSpawnY][x].type = 'path';
        }

        // 下ルート
        for (let x = 1; x < mergeX; x++) {
            this.tiles[botSpawnY][x].type = 'path';
        }

        // 各ルートに落とし穴を配置
        this.tiles[topSpawnY - 1][3].type = 'pit';
        this.tiles[topSpawnY + 1][5].type = 'pit';
        this.tiles[midSpawnY - 1][4].type = 'pit';
        this.tiles[midSpawnY + 1][6].type = 'pit';
        this.tiles[botSpawnY - 1][5].type = 'pit';
        this.tiles[botSpawnY + 1][3].type = 'pit';

        // 合流点への接続
        for (let y = topSpawnY; y <= botSpawnY; y++) {
            this.tiles[y][mergeX].type = 'path';
        }

        // 合流点周辺に落とし穴
        this.tiles[topSpawnY][mergeX - 1].type = 'pit';
        this.tiles[botSpawnY][mergeX + 1].type = 'pit';

        // 合流後の直線
        for (let x = mergeX + 1; x < this.cols; x++) {
            this.tiles[coreY][x].type = 'path';
        }

        // ゴール手前の落とし穴
        this.tiles[coreY - 1][this.cols - 4].type = 'pit';
        this.tiles[coreY + 1][this.cols - 2].type = 'pit';

        // コア
        this.tiles[coreY][this.cols - 1].type = 'core';

        // pathTilesは最初のスポーンからコアへのパスを保存
        for (let x = 0; x < mergeX; x++) {
            this.pathTiles.push({ x: x, y: midSpawnY });
        }
        for (let y = topSpawnY; y <= botSpawnY; y++) {
            this.pathTiles.push({ x: mergeX, y: y });
        }
        for (let x = mergeX + 1; x <= this.cols - 1; x++) {
            this.pathTiles.push({ x: x, y: coreY });
        }

        // emptyマスを罠設置のみ可能に（移動・召喚不可）
        for (let py = 1; py < this.rows - 1; py++) {
            for (let px = 1; px < this.cols - 1; px++) {
                const tile = this.tiles[py][px];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = false;
                }
            }
        }

        // 紫マス（elevated） - 空戦ルート: 3つのルートを避ける迂回路
        // 上ルートの一部を空中ルート化
        for (let x = 2; x <= this.cols - 2; x++) {
            if (this.tiles[topSpawnY] && this.tiles[topSpawnY][x]) {
                this.tiles[topSpawnY][x].type = 'elevated';
                this.tiles[topSpawnY][x].walkable = true;
            }
        }
        // 中ルートの一部を空中ルート化
        for (let x = 2; x <= this.cols - 2; x++) {
            if (this.tiles[midSpawnY] && this.tiles[midSpawnY][x]) {
                this.tiles[midSpawnY][x].type = 'elevated';
                this.tiles[midSpawnY][x].walkable = true;
            }
        }
        // 下ルートの一部を空中ルート化
        for (let x = 2; x <= this.cols - 2; x++) {
            if (this.tiles[botSpawnY] && this.tiles[botSpawnY][x]) {
                this.tiles[botSpawnY][x].type = 'elevated';
                this.tiles[botSpawnY][x].walkable = true;
            }
        }
        // 合流後の空中ショートカット
        for (let x = mergeX - 1; x <= this.cols - 2; x++) {
            if (this.tiles[coreY] && this.tiles[coreY][x]) {
                this.tiles[coreY][x].type = 'elevated';
                this.tiles[coreY][x].walkable = true;
            }
        }
    }

    getTile(x, y) {
        // エラーハンドリング: 境界チェック
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
            return null;
        }
        // 追加の安全チェック: 配列が正しく初期化されているか
        if (!this.tiles || !this.tiles[y]) {
            console.error(`Grid getTile エラー: 無効なタイル位置 (${x}, ${y})`);
            return null;
        }
        return this.tiles[y][x];
    }

    getTileAtPos(px, py) {
        const x = Math.floor(px / this.tileSize);
        const y = Math.floor(py / this.tileSize);
        return this.getTile(x, y);
    }

    worldToGrid(px, py) {
        return {
            x: Math.floor(px / this.tileSize),
            y: Math.floor(py / this.tileSize)
        };
    }

    gridToWorld(gx, gy) {
        return {
            x: gx * this.tileSize + this.tileSize / 2,
            y: gy * this.tileSize + this.tileSize / 2
        };
    }

    canPlaceTrap(x, y, allowOverwrite = false) {
        console.log(`canPlaceTrap: x=${x}, y=${y}, allowOverwrite=${allowOverwrite}`);
        const tile = this.getTile(x, y);

        if (!tile) {
            console.log('canPlaceTrap: No tile - returning false');
            return false;
        }

        console.log(`canPlaceTrap: tile.type=${tile.type}`);

        // 配置可能なタイルタイプか
        if (tile.type !== 'empty' && tile.type !== 'path' && tile.type !== 'elevated') {
            console.log('canPlaceTrap: Invalid tile type - returning false');
            return false;
        }

        console.log(`canPlaceTrap: tile.trap=`, tile.trap);

        // 罠がない場合は配置可能
        if (!tile.trap) {
            console.log('canPlaceTrap: No trap - returning true');
            return true;
        }

        // 上書き許可の場合は配置可能
        if (allowOverwrite) {
            console.log('canPlaceTrap: Overwrite allowed - returning true');
            return true;
        }

        // 破壊された罠（HP0以下）は上書き可能
        const result = tile.trap.hp <= 0;
        console.log(`canPlaceTrap: trap.hp=${tile.trap.hp}, result=${result}`);
        return result;
    }

    canPlaceMonster(x, y, flying = false) {
        const tile = this.getTile(x, y);
        if (!tile) return false;

        // 既に他のモンスターがいる場合は配置不可
        if (tile.monster !== null) {
            return false;
        }

        if (flying) {
            // 飛行モンスター: 溝とempty以外に配置可能（path、spawn、core、elevatedはOK）
            return tile.type !== 'pit' && tile.type !== 'empty';
        } else {
            // 地上モンスター: path、spawn、coreにのみ配置可能（elevated、pit、emptyは不可）
            return tile.type === 'path' || tile.type === 'spawn' || tile.type === 'core';
        }
    }

    placeTrap(x, y, trap) {
        console.log(`grid.placeTrap: x=${x}, y=${y}`);
        const tile = this.getTile(x, y);

        if (!tile) {
            console.log('grid.placeTrap: No tile - returning false');
            return false;
        }

        console.log(`grid.placeTrap: tile.type=${tile.type}`);

        // タイルタイプチェック（配置可能なタイプか）
        if (tile.type !== 'empty' && tile.type !== 'path' && tile.type !== 'elevated') {
            console.log('grid.placeTrap: Invalid tile type - returning false');
            return false;
        }

        // 罠を配置（game.jsで既に上書きチェック済み）
        console.log('grid.placeTrap: Placing trap');
        tile.trap = trap;
        trap.gridX = x;
        trap.gridY = y;
        console.log('grid.placeTrap: Success - returning true');
        return true;
    }

    placeMonster(x, y, monster) {
        const tile = this.getTile(x, y);
        if (tile && this.canPlaceMonster(x, y, monster.flying)) {
            tile.monster = monster;
            monster.gridX = x;
            monster.gridY = y;
            const pos = this.gridToWorld(x, y);
            monster.x = pos.x;
            monster.y = pos.y;
            return true;
        }
        return false;
    }

    removeTrap(x, y) {
        const tile = this.getTile(x, y);
        if (tile && tile.trap) {
            const trap = tile.trap;
            tile.trap = null;
            return trap;
        }
        return null;
    }

    removeMonster(x, y) {
        const tile = this.getTile(x, y);
        if (tile && tile.monster) {
            const monster = tile.monster;
            tile.monster = null;
            return monster;
        }
        return null;
    }

    getNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            { dx: 0, dy: -1 }, // 上
            { dx: 1, dy: 0 },  // 右
            { dx: 0, dy: 1 },  // 下
            { dx: -1, dy: 0 }  // 左
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            const tile = this.getTile(nx, ny);
            if (tile && tile.walkable) {
                neighbors.push({ x: nx, y: ny, cost: tile.cost });
            }
        }

        return neighbors;
    }

    draw(ctx) {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const tile = this.tiles[y][x];
                const px = x * this.tileSize;
                const py = y * this.tileSize;

                // タイルの描画
                switch (tile.type) {
                    case 'spawn':
                        ctx.fillStyle = '#48bb78';
                        break;
                    case 'core':
                        ctx.fillStyle = '#f56565';
                        break;
                    case 'path':
                        ctx.fillStyle = '#4a5568';
                        break;
                    case 'elevated':
                        ctx.fillStyle = '#805ad5';
                        break;
                    case 'pit':
                        ctx.fillStyle = '#1a202c';
                        break;
                    default:
                        ctx.fillStyle = '#2d3748';
                }

                ctx.fillRect(px, py, this.tileSize, this.tileSize);

                // グリッド線
                ctx.strokeStyle = '#1a202c';
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, this.tileSize, this.tileSize);

                // タイプラベル
                if (tile.type === 'spawn') {
                    // 複数スポーン地点の場合は番号を表示
                    if (this.spawnPoints && this.spawnPoints.length > 1) {
                        const spawnIndex = this.spawnPoints.findIndex(sp => sp.x === x && sp.y === y);
                        if (spawnIndex !== -1) {
                            drawCenteredText(ctx, `S${spawnIndex + 1}`, px + this.tileSize / 2, py + this.tileSize / 2, 'bold 12px Arial', '#fff');
                        }
                    } else {
                        drawCenteredText(ctx, 'S', px + this.tileSize / 2, py + this.tileSize / 2, '12px Arial', '#fff');
                    }
                } else if (tile.type === 'core') {
                    drawCenteredText(ctx, 'C', px + this.tileSize / 2, py + this.tileSize / 2, '12px Arial', '#fff');
                }
            }
        }
    }
}
