/**
 * 優先度付きキュー（ミニマムヒープ実装）
 * A*経路探索のパフォーマンスを O(n log n) から O(log n) に改善
 */

class PriorityQueue {
    constructor(comparator = (a, b) => a.priority < b.priority) {
        this.heap = [];
        this.comparator = comparator;
    }

    /**
     * 要素数を返す
     */
    size() {
        return this.heap.length;
    }

    /**
     * 空かどうか
     */
    isEmpty() {
        return this.heap.length === 0;
    }

    /**
     * 最小要素を取得（削除しない）
     */
    peek() {
        return this.heap[0];
    }

    /**
     * 要素を追加
     */
    enqueue(item) {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);
    }

    /**
     * 最小要素を削除して返す
     */
    dequeue() {
        if (this.isEmpty()) {
            return null;
        }

        const min = this.heap[0];
        const last = this.heap.pop();

        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }

        return min;
    }

    /**
     * ヒープ構造を上方向に修正
     */
    bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);

            if (this.comparator(this.heap[index], this.heap[parentIndex])) {
                this.swap(index, parentIndex);
                index = parentIndex;
            } else {
                break;
            }
        }
    }

    /**
     * ヒープ構造を下方向に修正
     */
    bubbleDown(index) {
        const length = this.heap.length;

        while (true) {
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            let smallest = index;

            if (leftChild < length && this.comparator(this.heap[leftChild], this.heap[smallest])) {
                smallest = leftChild;
            }

            if (rightChild < length && this.comparator(this.heap[rightChild], this.heap[smallest])) {
                smallest = rightChild;
            }

            if (smallest !== index) {
                this.swap(index, smallest);
                index = smallest;
            } else {
                break;
            }
        }
    }

    /**
     * 要素を交換
     */
    swap(i, j) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }

    /**
     * 全要素をクリア
     */
    clear() {
        this.heap = [];
    }

    /**
     * 配列に変換
     */
    toArray() {
        return [...this.heap];
    }

    /**
     * 特定の要素が含まれているか
     */
    contains(item, compareFn = (a, b) => a === b) {
        return this.heap.some(element => compareFn(element, item));
    }

    /**
     * 条件に一致する要素を削除
     */
    remove(compareFn) {
        const index = this.heap.findIndex(compareFn);
        if (index === -1) {
            return false;
        }

        const last = this.heap.pop();

        if (index < this.heap.length) {
            this.heap[index] = last;
            this.bubbleDown(index);
            this.bubbleUp(index);
        }

        return true;
    }
}
