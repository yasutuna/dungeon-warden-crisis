// A*経路探索アルゴリズム

class PathFinder {
    constructor(grid) {
        this.grid = grid;
    }

    // A*アルゴリズムで経路を探索（優先度付きキュー使用）
    findPath(startX, startY, goalX, goalY) {
        const openSet = new PriorityQueue((a, b) => a.priority < b.priority);
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${startX},${startY}`;
        const goalKey = `${goalX},${goalY}`;

        const startNode = {
            x: startX,
            y: startY,
            priority: this.heuristic(startX, startY, goalX, goalY)
        };
        openSet.enqueue(startNode);
        gScore.set(startKey, 0);
        fScore.set(startKey, startNode.priority);

        while (!openSet.isEmpty()) {
            // fScoreが最小のノードを選択（O(log n)）
            const current = openSet.dequeue();
            const currentKey = `${current.x},${current.y}`;

            // ゴールに到達
            if (current.x === goalX && current.y === goalY) {
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(currentKey);

            // 隣接タイルを探索
            const neighbors = this.grid.getNeighbors(current.x, current.y);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                if (closedSet.has(neighborKey)) {
                    continue;
                }

                const tentativeGScore = (gScore.get(currentKey) || Infinity) + neighbor.cost;

                const isInOpenSet = openSet.contains({ x: neighbor.x, y: neighbor.y },
                    (a, b) => a.x === b.x && a.y === b.y);

                if (!isInOpenSet) {
                    // 新しいノードを追加
                    const f = tentativeGScore + this.heuristic(neighbor.x, neighbor.y, goalX, goalY);
                    openSet.enqueue({ x: neighbor.x, y: neighbor.y, priority: f });
                } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                    continue;
                }

                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor.x, neighbor.y, goalX, goalY));
            }
        }

        // 経路が見つからない場合
        console.warn(`経路探索失敗: (${startX}, ${startY}) -> (${goalX}, ${goalY}) の経路が見つかりませんでした`);
        console.log('スタート地点のタイル情報:', this.grid.getTile(startX, startY));
        console.log('ゴール地点のタイル情報:', this.grid.getTile(goalX, goalY));

        // デフォルトパスが存在する場合はそれを使用
        if (this.grid.pathTiles && this.grid.pathTiles.length > 0) {
            console.log('デフォルトパスを使用します。pathTiles長さ:', this.grid.pathTiles.length);
            return [...this.grid.pathTiles]; // コピーを返す
        }

        // 緊急フォールバック: 敵を動かさない（コアダメージを防ぐ）
        console.error('デフォルトパスも存在しません。緊急フォールバック: 敵を固定します。');
        // pathIndexが増えないように、十分に長いダミーパスを返す
        const dummyPath = [];
        for (let i = 0; i < 1000; i++) {
            dummyPath.push({ x: startX, y: startY });
        }
        return dummyPath;
    }

    heuristic(x1, y1, x2, y2) {
        // マンハッタン距離
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = `${current.x},${current.y}`;

        while (cameFrom.has(currentKey)) {
            current = cameFrom.get(currentKey);
            path.unshift(current);
            currentKey = `${current.x},${current.y}`;
        }

        return path;
    }

    // 罠の配置でコストを更新（危険な場所は避けるように）
    updateTrapCosts(traps) {
        // リセット
        for (let y = 0; y < this.grid.rows; y++) {
            for (let x = 0; x < this.grid.cols; x++) {
                const tile = this.grid.getTile(x, y);
                if (tile) {
                    tile.cost = 1;
                }
            }
        }

        // 罠のあるタイルのコストを上げる
        for (const trap of traps) {
            const tile = this.grid.getTile(trap.gridX, trap.gridY);
            if (tile) {
                // 罠の危険度に応じてコストを計算
                const dangerScore = this.calculateTrapDanger(trap);
                tile.cost = 1 + dangerScore;
            }
        }
    }

    calculateTrapDanger(trap) {
        let danger = 0;

        if (trap.data.effect.instant) {
            danger += trap.data.effect.instant / 10;
        }

        if (trap.data.effect.damage) {
            danger += trap.data.effect.damage / 10;
        }

        if (trap.data.effect.dot) {
            danger += (trap.data.effect.dot.dps * trap.data.effect.dot.duration) / 10;
        }

        // 再装填時間が短いほど危険
        if (trap.data.cooldownSec > 0) {
            danger *= (10 / trap.data.cooldownSec);
        }

        return Math.min(danger, 10); // 最大10
    }
}
