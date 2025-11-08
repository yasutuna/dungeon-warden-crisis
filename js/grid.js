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
        const spawnTier = Math.min(3, 1 + Math.floor((Math.max(1, waveNumber) - 1) / 15));
        let selectedPattern;

        if (spawnTier === 1) {
            const patterns = ['straight', 'zigzag', 'split', 'maze'];
            selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        } else if (spawnTier === 2) {
            selectedPattern = 'dual_spawn';
        } else {
            selectedPattern = 'triple_spawn';
        }

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
        }

        this.markPathTilesWalkable();
    }


    // ASCII文字列からマップを生成するヘルパーメソッド
    loadMapFromString(mapString) {
        // マップ記号の説明:
        // S = spawn (スポーン地点)
        // C = core (コア)
        // # = path (灰色マス、地上ユニット用の道)
        // E = elevated (紫マス、空戦ユニット専用)
        // X = pit (落とし穴)
        // . = empty (空きマス、罠設置可能)

        this.pathTiles = [];
        const lines = mapString.trim().split('\n').map(line => line.trim());
        this.spawnPoints = [];

        for (let y = 0; y < this.rows && y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < this.cols && x < line.length; x++) {
                const char = line[x];
                const tile = this.tiles[y][x];

                switch(char) {
                    case 'S':
                        tile.type = 'spawn';
                        tile.walkable = true;
                        this.pathTiles.push({ x, y });
                        this.spawnPoints.push({ x, y });
                        break;
                    case 'C':
                        tile.type = 'core';
                        tile.walkable = true;
                        this.pathTiles.push({ x, y });
                        break;
                    case '#':
                        tile.type = 'path';
                        tile.walkable = true;
                        this.pathTiles.push({ x, y });
                        break;
                    case 'E':
                        tile.type = 'elevated';
                        tile.walkable = true;
                        break;
                    case 'X':
                        tile.type = 'pit';
                        tile.walkable = false;
                        break;
                    case '.':
                    default:
                        tile.type = 'empty';
                        tile.walkable = false;
                        break;
                }
            }
        }
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
        // ASCII形式で直感的にマップを定義
        // S = spawn, C = core, # = path, E = elevated, X = pit, . = empty
        //
        // 条件:
        // 1. 紫マス(E)は空戦ユニット専用（灰色マスと重ならない）
        // 2. 紫マスは灰色マスと隣接（空戦ユニットが乗り降り可能）
        // 3. X軸のみの移動でS→Cに到達不可（Y軸移動が必須）
        // 4. 紫マスは分断されている（途中で灰色マス経由が必要）
        // 5. 3x3以上の部屋と迷路的な複雑な道順
        const map = `
....................
........EEEEE.......
...X#############...
..####..######......
..########...#......
S#####X..#X..####...
..####.####..####...
.....######..######.
....E#X#######.X.#C.
....E#######X....#..
....E#.....#######..
....................
        `;

        this.loadMapFromString(map);
    }

    setupZigzagPath() {
        // ダンジョン風のジグザグ迷路
        // 大きな部屋と複雑な経路を持つ
        const map = `
.EEE................
X#####..............
S#####..............
.#####X..EE.........
.....######.........
.....X#####.........
......#####X####....
......#####.####X#C.
...#############E#..
...E.....X#E####.#X.
............######..
....................
        `;

        this.loadMapFromString(map);
    }

    setupSplitPath() {
        // 分岐路とダンジョンの部屋を持つマップ
        // 3x3の部屋を複数持つ構造
        const map = `
....EEX.............
....######..........
..####..X#E.........
..####.E###.........
S#####X####.........
.X####.####.#####...
....#######X#####X..
....##E####.#####E..
....#####E..######C.
....E########.X.....
....................
....................
        `;

        this.loadMapFromString(map);
    }

    setupMazePath() {
        // 複雑な迷路構造のダンジョンマップ
        // 複数の部屋と曲がりくねった通路
        const map = `
...X.E..............
..E#####............
..####.#X####.......
S#####X#E#E##.......
.E######.#.##.###...
.....#X######X#####.
.....############E#.
.....X###########.#.
.....E#####X#####.#.
......##########EXC.
....................
....................
        `;

        this.loadMapFromString(map);
    }

    setupDualSpawnPath() {
        const maps = [
`
....................
....E...............
.S####..............
..##X#####..........
..#...#..#.E........
..#...##X######E....
..#...#####....#E...
..##########X#####C.
..#.......#....#....
..##########E..#....
..#..X....#.........
..#...E...#.........
.S###########.......
......E.............
....................
`,
`
....................
....E...X.....E.....
.S#########.........
...#......#.........
...#......#.........
...##X#...#.........
...#..#...#.....E...
...#..#####.........
...#..#...########C.
...#..###X#.#.......
...###E######.......
...#........#..E....
.S###########.......
....................
....................
`,
`
....................
..E..E..............
........#....X.E....
.S#######...........
....#######.........
....X...#.#E........
........##########..
........#X#......#..
........#.#####..#..
......X.#........#C.
........#...######..
.S#######...E.......
....#######.........
...E..........E.....
....................
`,
`
....................
.....E.....X...E....
.........#########S.
.........#......#...
.........#......#...
.........#...#X##...
...E.....#...#..#...
.........#####..#...
.C########...#..#...
.......#.#X###..#...
.......######E###...
....E..#........#...
.......###########S.
....................
....................
`
        ];

        const map = maps[Math.floor(Math.random() * maps.length)];
        this.loadMapFromString(map);
    }

    setupTripleSpawnPath() {
        const maps = [
`
....................
.....E..............
.S####.....E.....#..
..#.#########....#..
..#..#X.....#.E..#..
..################..
..#..#.##X###...E#..
.S####.#....######C.
..#..#.##.###X...#..
..################..
..#..#X.....E.#..#..
..#.##########X..#..
.S####...........#..
.....E..............
....................
`,
`
....................
....E.......E.......
.S######............
.......#.X....E.....
.......#..########..
.....X.#...#.E...#..
.....########....#..
.S######..X#.....#..
.......###########..
.......#.X.#.....#C.
.......#...#######..
.S######............
.......#.......E....
...E................
....................
`,
`
....................
....E.....E.........
.S###########.......
............#.......
........X...#..E....
.....########.......
.....#X.....E.......
.S########..........
.....#...#..........
.....#############C.
.......X..#...#.....
.S#########...#.....
....E........E#.....
....##X########.....
....................
`
        ];

        const map = maps[Math.floor(Math.random() * maps.length)];
        this.loadMapFromString(map);
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
            // 空戦ユニット: elevated、path、spawn、coreに配置可能（pitとemptyは不可）
            return tile.type === 'elevated' || tile.type === 'path' || tile.type === 'spawn' || tile.type === 'core';
        } else {
            // 地上ユニット: path、spawn、coreにのみ配置可能（elevated、pit、emptyは不可）
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
