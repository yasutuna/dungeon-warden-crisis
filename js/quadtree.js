/**
 * Quadtree - 空間分割による高速な衝突検出
 * エンティティの近隣検索を O(n²) から O(log n) に改善
 */

class Rectangle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    contains(point) {
        return (
            point.x >= this.x &&
            point.x <= this.x + this.width &&
            point.y >= this.y &&
            point.y <= this.y + this.height
        );
    }

    intersects(range) {
        return !(
            range.x > this.x + this.width ||
            range.x + range.width < this.x ||
            range.y > this.y + this.height ||
            range.y + range.height < this.y
        );
    }
}

class Quadtree {
    constructor(boundary, capacity = 4) {
        this.boundary = boundary;
        this.capacity = capacity;
        this.entities = [];
        this.divided = false;

        this.northeast = null;
        this.northwest = null;
        this.southeast = null;
        this.southwest = null;
    }

    subdivide() {
        const x = this.boundary.x;
        const y = this.boundary.y;
        const w = this.boundary.width / 2;
        const h = this.boundary.height / 2;

        const ne = new Rectangle(x + w, y, w, h);
        const nw = new Rectangle(x, y, w, h);
        const se = new Rectangle(x + w, y + h, w, h);
        const sw = new Rectangle(x, y + h, w, h);

        this.northeast = new Quadtree(ne, this.capacity);
        this.northwest = new Quadtree(nw, this.capacity);
        this.southeast = new Quadtree(se, this.capacity);
        this.southwest = new Quadtree(sw, this.capacity);

        this.divided = true;
    }

    insert(entity) {
        // エンティティの位置を取得
        const point = {
            x: entity.x !== undefined ? entity.x : 0,
            y: entity.y !== undefined ? entity.y : 0
        };

        if (!this.boundary.contains(point)) {
            return false;
        }

        if (this.entities.length < this.capacity) {
            this.entities.push(entity);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        return (
            this.northeast.insert(entity) ||
            this.northwest.insert(entity) ||
            this.southeast.insert(entity) ||
            this.southwest.insert(entity)
        );
    }

    query(range, found = []) {
        if (!this.boundary.intersects(range)) {
            return found;
        }

        for (const entity of this.entities) {
            const point = {
                x: entity.x !== undefined ? entity.x : 0,
                y: entity.y !== undefined ? entity.y : 0
            };

            if (range.contains(point)) {
                found.push(entity);
            }
        }

        if (this.divided) {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
        }

        return found;
    }

    /**
     * 円形範囲内のエンティティを検索
     */
    queryCircle(centerX, centerY, radius, found = []) {
        // まず矩形で大まかに検索
        const range = new Rectangle(
            centerX - radius,
            centerY - radius,
            radius * 2,
            radius * 2
        );

        const candidates = this.query(range, []);

        // 円形範囲内のもののみフィルタリング
        for (const entity of candidates) {
            const dx = entity.x - centerX;
            const dy = entity.y - centerY;
            const distSq = dx * dx + dy * dy;

            if (distSq <= radius * radius) {
                found.push(entity);
            }
        }

        return found;
    }

    clear() {
        this.entities = [];
        this.divided = false;
        this.northeast = null;
        this.northwest = null;
        this.southeast = null;
        this.southwest = null;
    }

    /**
     * デバッグ用：Quadtreeの境界を描画
     */
    draw(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            this.boundary.x,
            this.boundary.y,
            this.boundary.width,
            this.boundary.height
        );

        if (this.divided) {
            this.northeast.draw(ctx);
            this.northwest.draw(ctx);
            this.southeast.draw(ctx);
            this.southwest.draw(ctx);
        }
    }
}
