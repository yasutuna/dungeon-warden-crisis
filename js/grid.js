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
        // 戦略的な迷路風パス - 紫マスの空戦ルートと落とし穴を含む
        this.pathTiles = [];
        const midY = Math.floor(this.rows / 2);

        // スポーン地点（左中央）
        this.tiles[midY][0].type = 'spawn';
        this.tiles[midY + 1][0].type = 'spawn';
        this.pathTiles.push({ x: 0, y: midY });
        this.pathTiles.push({ x: 0, y: midY + 1 });

        // メインルート - 迷路状に蛇行
        // 第1区間: 右へ進んで上に曲がる
        for (let x = 1; x <= 4; x++) {
            this.tiles[midY][x].type = 'path';
            this.tiles[midY + 1][x].type = 'path';
            this.tiles[midY][x].walkable = true;
            this.tiles[midY + 1][x].walkable = true;
            this.pathTiles.push({ x, y: midY });
            this.pathTiles.push({ x, y: midY + 1 });
        }

        // 落とし穴1: ルート上に配置（押し出しトラップ用）
        this.tiles[midY + 2][3].type = 'pit';

        // 上方向への曲がり
        for (let y = midY - 1; y >= 3; y--) {
            this.tiles[y][4].type = 'path';
            this.tiles[y][5].type = 'path';
            this.tiles[y][4].walkable = true;
            this.tiles[y][5].walkable = true;
            this.pathTiles.push({ x: 4, y });
            this.pathTiles.push({ x: 5, y });
        }

        // 第2区間: 右へ進む
        for (let x = 6; x <= 9; x++) {
            this.tiles[3][x].type = 'path';
            this.tiles[4][x].type = 'path';
            this.tiles[3][x].walkable = true;
            this.tiles[4][x].walkable = true;
            this.pathTiles.push({ x, y: 3 });
            this.pathTiles.push({ x, y: 4 });
        }

        // 落とし穴2: ルート上に配置
        this.tiles[2][7].type = 'pit';
        this.tiles[5][8].type = 'pit';

        // 下方向への曲がり
        for (let y = 5; y <= midY + 1; y++) {
            this.tiles[y][9].type = 'path';
            this.tiles[y][10].type = 'path';
            this.tiles[y][9].walkable = true;
            this.tiles[y][10].walkable = true;
            this.pathTiles.push({ x: 9, y });
            this.pathTiles.push({ x: 10, y });
        }

        // 第3区間: ゴールへ
        for (let x = 11; x < this.cols - 1; x++) {
            this.tiles[midY][x].type = 'path';
            this.tiles[midY + 1][x].type = 'path';
            this.tiles[midY][x].walkable = true;
            this.tiles[midY + 1][x].walkable = true;
            this.pathTiles.push({ x, y: midY });
            this.pathTiles.push({ x, y: midY + 1 });
        }

        // 落とし穴3: ゴール手前
        this.tiles[midY + 2][13].type = 'pit';

        // コア（右中央）
        this.tiles[midY][this.cols - 1].type = 'core';
        this.tiles[midY + 1][this.cols - 1].type = 'core';
        this.pathTiles.push({ x: this.cols - 1, y: midY });
        this.pathTiles.push({ x: this.cols - 1, y: midY + 1 });

        // 紫マス（elevated） - 空戦ユニット専用の迂回路
        // 上部に連続した空中ルートを作成
        const skyY = 1;
        for (let x = 2; x <= 14; x++) {
            this.tiles[skyY][x].type = 'elevated';
            // elevated は walkable = false のまま（飛行ユニットのみ通行可能）
        }

        // 下部にも空中ルート
        const lowSkyY = this.rows - 2;
        for (let x = 2; x <= 14; x++) {
            this.tiles[lowSkyY][x].type = 'elevated';
        }

        // 迷路エリアにも配置可能なemptyマスを追加（トラップ配置用）
        for (let y = 2; y < this.rows - 2; y++) {
            for (let x = 1; x < this.cols - 1; x++) {
                const tile = this.tiles[y][x];
                // path、spawn、core、elevated、pit以外をemptyに設定し移動可能にする
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'elevated' && tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = true; // emptyマスを移動可能に
                }
            }
        }
    }

    setupZigzagPath() {
        // ジグザグ迷路 - 空中ルートと落とし穴を戦略的に配置
        this.pathTiles = [];
        let x = 0, y = 5;

        // スポーン地点（2マス幅）
        this.tiles[y][x].type = 'spawn';
        this.tiles[y + 1][x].type = 'spawn';
        this.pathTiles.push({ x, y });
        this.pathTiles.push({ x, y: y + 1 });

        // ジグザグパスを作成（2マス幅）
        while (x < this.cols - 1) {
            x++;
            this.tiles[y][x].type = 'path';
            this.tiles[y + 1][x].type = 'path';
            this.pathTiles.push({ x, y });
            this.pathTiles.push({ x, y: y + 1 });

            // 3マスごとに上下に移動
            if (x % 3 === 0 && x < this.cols - 1) {
                const oldY = y;
                if (y <= 5) {
                    y = Math.min(y + 3, this.rows - 3);
                } else {
                    y = Math.max(y - 3, 3);
                }

                // 縦方向の移動タイルを追加（2マス幅）
                const startY = Math.min(oldY, y);
                const endY = Math.max(oldY, y);
                for (let ty = startY + 1; ty <= endY + 1; ty++) {
                    this.tiles[ty][x].type = 'path';
                    this.tiles[ty][x + 1].type = 'path';
                    this.pathTiles.push({ x, y: ty });
                    this.pathTiles.push({ x: x + 1, y: ty });
                }

                // 落とし穴をルート脇に配置
                if (oldY < y) {
                    // 下へ移動する場合、右側に落とし穴
                    if (x + 2 < this.cols) {
                        this.tiles[y][x + 2].type = 'pit';
                    }
                } else {
                    // 上へ移動する場合、左側に落とし穴
                    if (x - 1 >= 0) {
                        this.tiles[y][x - 1].type = 'pit';
                    }
                }
            }
        }

        // コア（2マス幅）
        this.tiles[y][this.cols - 1].type = 'core';
        this.tiles[y + 1][this.cols - 1].type = 'core';

        // 紫マス（elevated） - 空戦ルート
        // 上部を一直線に
        for (let px = 3; px < this.cols - 2; px++) {
            this.tiles[1][px].type = 'elevated';
        }
        // 下部も一直線に
        for (let px = 3; px < this.cols - 2; px++) {
            this.tiles[this.rows - 2][px].type = 'elevated';
        }

        // emptyマスを移動可能に
        for (let py = 2; py < this.rows - 2; py++) {
            for (let px = 1; px < this.cols - 1; px++) {
                const tile = this.tiles[py][px];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'elevated' && tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = true;
                }
            }
        }
    }

    setupSplitPath() {
        // 上下分岐ルート - 落とし穴と空中ルートを効果的に配置
        this.pathTiles = [];
        const startY = Math.floor(this.rows / 2);

        // スポーン地点（2マス幅）
        this.tiles[startY][0].type = 'spawn';
        this.tiles[startY + 1][0].type = 'spawn';
        this.pathTiles.push({ x: 0, y: startY });
        this.pathTiles.push({ x: 0, y: startY + 1 });

        // 最初の直線（2マス幅）
        for (let x = 1; x < 5; x++) {
            this.tiles[startY][x].type = 'path';
            this.tiles[startY + 1][x].type = 'path';
            this.pathTiles.push({ x, y: startY });
            this.pathTiles.push({ x, y: startY + 1 });
        }

        // 分岐点前に落とし穴
        this.tiles[startY - 1][4].type = 'pit';
        this.tiles[startY + 2][4].type = 'pit';

        // 上下に分岐
        const upperY = startY - 2;
        const lowerY = startY + 3;

        // 分岐点（x=5-6）から上ルートへの接続（2マス幅）
        for (let ty = upperY; ty <= startY + 1; ty++) {
            this.tiles[ty][5].type = 'path';
            this.tiles[ty][6].type = 'path';
            this.pathTiles.push({ x: 5, y: ty });
            this.pathTiles.push({ x: 6, y: ty });
        }

        // 分岐点（x=5-6）から下ルートへの接続（2マス幅）
        for (let ty = startY; ty <= lowerY; ty++) {
            this.tiles[ty][5].type = 'path';
            this.tiles[ty][6].type = 'path';
        }

        // 上ルート（2マス幅）
        for (let x = 7; x <= 10; x++) {
            this.tiles[upperY][x].type = 'path';
            this.tiles[upperY + 1][x].type = 'path';
            this.pathTiles.push({ x, y: upperY });
            this.pathTiles.push({ x, y: upperY + 1 });
        }

        // 上ルート脇に落とし穴
        this.tiles[upperY - 1][8].type = 'pit';

        // 下ルート（2マス幅）
        for (let x = 7; x <= 10; x++) {
            this.tiles[lowerY][x].type = 'path';
            this.tiles[lowerY - 1][x].type = 'path';
            this.pathTiles.push({ x, y: lowerY });
            this.pathTiles.push({ x, y: lowerY - 1 });
        }

        // 下ルート脇に落とし穴
        this.tiles[lowerY + 1][8].type = 'pit';

        // 合流点（x=11-12）から上ルートの接続
        for (let ty = upperY; ty <= startY + 1; ty++) {
            this.tiles[ty][11].type = 'path';
            this.tiles[ty][12].type = 'path';
        }

        // 合流点（x=11-12）から下ルートの接続
        for (let ty = startY; ty <= lowerY; ty++) {
            this.tiles[ty][11].type = 'path';
            this.tiles[ty][12].type = 'path';
        }

        // 合流後（2マス幅）
        for (let x = 13; x < this.cols; x++) {
            this.tiles[startY][x].type = 'path';
            this.tiles[startY + 1][x].type = 'path';
            this.pathTiles.push({ x, y: startY });
            this.pathTiles.push({ x, y: startY + 1 });
        }

        // 合流後にも落とし穴
        this.tiles[startY + 2][14].type = 'pit';

        // コア（2マス幅）
        this.tiles[startY][this.cols - 1].type = 'core';
        this.tiles[startY + 1][this.cols - 1].type = 'core';

        // 紫マス（elevated） - 空戦ルート: 分岐路を避けて移動できる迂回路
        // 上部ルート
        for (let x = 2; x <= 14; x++) {
            this.tiles[0][x].type = 'elevated';
        }
        // 下部ルート
        for (let x = 2; x <= 14; x++) {
            this.tiles[this.rows - 1][x].type = 'elevated';
        }
        // 中央の分岐を避けるショートカット
        for (let x = 7; x <= 10; x++) {
            this.tiles[startY][x].type = 'elevated';
        }

        // emptyマスを移動可能に
        for (let py = 1; py < this.rows - 1; py++) {
            for (let px = 1; px < this.cols - 1; px++) {
                const tile = this.tiles[py][px];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'elevated' && tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = true;
                }
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

        // パスを設定（2マス幅）
        for (let i = 0; i < path.length; i++) {
            const { x, y } = path[i];
            if (i === 0) {
                this.tiles[y][x].type = 'spawn';
                this.tiles[y + 1][x].type = 'spawn';
            } else if (i === path.length - 1) {
                this.tiles[y][x].type = 'core';
                this.tiles[y + 1][x].type = 'core';
            } else {
                this.tiles[y][x].type = 'path';
                this.tiles[y + 1][x].type = 'path';
            }
            this.pathTiles.push({ x, y });
            this.pathTiles.push({ x, y: y + 1 });
        }

        // 迷路の曲がり角に落とし穴を配置
        this.tiles[2][3].type = 'pit';  // 最初の曲がり角
        this.tiles[6][7].type = 'pit';  // 中央エリア
        this.tiles[10][9].type = 'pit'; // 最後の曲がり角手前
        this.tiles[12][5].type = 'pit'; // ゴール手前

        // 紫マス（elevated） - 空戦ルート: 迷路を無視した直線ルート
        // 上部を一直線に
        for (let x = 2; x <= 14; x++) {
            this.tiles[1][x].type = 'elevated';
        }
        // 迷路の中央を横断する空中ルート
        for (let x = 4; x <= 11; x++) {
            this.tiles[6][x].type = 'elevated';
        }
        // 下部を一直線に
        for (let x = 2; x <= 14; x++) {
            this.tiles[this.rows - 2][x].type = 'elevated';
        }

        // emptyマスを移動可能に
        for (let py = 2; py < this.rows - 2; py++) {
            for (let px = 1; px < this.cols - 1; px++) {
                const tile = this.tiles[py][px];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'elevated' && tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = true;
                }
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

        // 紫マス（elevated） - 空戦ルート: 両ルートの上空を通過
        // 上ルートの上空
        for (let x = 2; x <= mergeX + 2; x++) {
            this.tiles[1][x].type = 'elevated';
        }
        // 下ルートの下空
        for (let x = 2; x <= mergeX + 2; x++) {
            this.tiles[this.rows - 2][x].type = 'elevated';
        }
        // 合流後の空中ショートカット
        for (let x = mergeX; x <= this.cols - 2; x++) {
            this.tiles[coreY - 2][x].type = 'elevated';
        }

        // emptyマスを移動可能に
        for (let py = 2; py < this.rows - 2; py++) {
            for (let px = 1; px < this.cols - 1; px++) {
                const tile = this.tiles[py][px];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'elevated' && tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = true;
                }
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

        // 紫マス（elevated） - 空戦ルート: 3つのルートを避ける迂回路
        // 最上部を一直線に
        for (let x = 2; x <= this.cols - 2; x++) {
            this.tiles[0][x].type = 'elevated';
        }
        // 最下部を一直線に
        for (let x = 2; x <= this.cols - 2; x++) {
            this.tiles[this.rows - 1][x].type = 'elevated';
        }
        // 合流点上空のショートカット
        for (let x = mergeX - 1; x <= this.cols - 2; x++) {
            this.tiles[coreY - 1][x].type = 'elevated';
            this.tiles[coreY + 1][x].type = 'elevated';
        }

        // emptyマスを移動可能に
        for (let py = 1; py < this.rows - 1; py++) {
            for (let px = 1; px < this.cols - 1; px++) {
                const tile = this.tiles[py][px];
                if (tile.type !== 'path' && tile.type !== 'spawn' && tile.type !== 'core' &&
                    tile.type !== 'elevated' && tile.type !== 'pit') {
                    tile.type = 'empty';
                    tile.walkable = true;
                }
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
            // 飛行モンスター: 溝以外のどこにでも配置可能
            return tile.type !== 'pit';
        } else {
            // 地上モンスター: 溝と高台以外のどこにでも配置可能
            return tile.type !== 'pit' && tile.type !== 'elevated';
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
