// テスト用のグリッドデバッグスクリプト
const grid = new Grid(16, 12, 50);
console.log('PathTiles:', grid.pathTiles);
console.log('Walkable tiles:');
for (let y = 0; y < grid.rows; y++) {
    let row = '';
    for (let x = 0; x < grid.cols; x++) {
        const tile = grid.getTile(x, y);
        row += tile.walkable ? '.' : '#';
    }
    console.log(row);
}
