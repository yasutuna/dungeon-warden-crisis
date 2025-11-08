# Dungeon Warden - 設定ガイド

## 📁 設定ファイルの場所

### ゲーム定数
**ファイル**: `js/constants.js`

このファイルでゲームバランスやビジュアル設定を調整できます。

#### 主要な設定項目

##### ゲームバランス（GAME_CONSTANTS）
```javascript
CORE_DAMAGE_PER_ENEMY: 10,    // 敵1体あたりのコアダメージ
MAX_MONSTERS: 5,               // 召喚可能なモンスター上限
INITIAL_SOUL: 300,             // 開始時のソウル
INITIAL_MANA: 100,             // 開始時のマナ
MAX_MANA: 200,                 // マナ上限
MANA_REGEN_RATE: 2             // マナ回復速度（毎秒）
```

##### 戦闘バランス（COMBAT_CONSTANTS）
```javascript
BASE_CRIT_CHANCE: 0.05,        // クリティカル率（5%）
CRIT_MULTIPLIER: 1.5,          // クリティカル倍率
SHATTER_MULTIPLIER: 1.3,       // 砕き効果倍率
OIL_FIRE_MULTIPLIER: 1.5       // 油濡れ+火炎倍率
```

##### 状態異常（STATUS_EFFECT_CONSTANTS）
```javascript
BLEED_BASE_DPS: 5,             // 出血ダメージ
BURN_BASE_DPS: 12,             // 燃焼ダメージ
SLOW_DEFAULT_AMOUNT: 0.4,      // 鈍足効果（40%減速）
FREEZE_STACKS_REQUIRED: 3      // 凍結に必要なスタック数
```

### データファイル

#### 罠データ
**ファイル**: `data/traps.js`

各罠の性能を調整：
- `cost`: 配置コスト
- `hp`: 耐久値
- `cooldownSec`: クールダウン時間
- `effect`: 効果の詳細

#### モンスターデータ
**ファイル**: `data/monsters.js`

各モンスターの性能を調整：
- `summonCost`: 召喚コスト
- `hp`: HP
- `attack`: 攻撃力と射程
- `active`: アクティブスキル

#### 敵データ
**ファイル**: `data/enemies.js`

各敵の性能を調整：
- `hp`: HP
- `speed`: 移動速度
- `abilities`: 特殊能力
- `resist`: 耐性

#### Waveデータ
**ファイル**: `data/waves.js`

各Waveの構成を調整：
- `enemies`: 出現する敵のタイプと数
- `interval`: 敵の出現間隔
- `unlocks`: Wave開始時に解放されるアイテム

### CSS変数
**ファイル**: `style.css`

`:root`セクションでUIの見た目を調整：

```css
--color-primary: #667eea;      /* メインカラー */
--color-success: #48bb78;      /* 成功カラー */
--color-error: #f56565;        /* エラーカラー */
--spacing-md: 10px;            /* 標準スペーシング */
--radius-lg: 8px;              /* 標準ボーダーラジウス */
```

## 🎮 ゲームバランス調整のヒント

### 難易度を下げたい場合
1. `INITIAL_SOUL: 500` に増やす
2. `CORE_DAMAGE_PER_ENEMY: 5` に減らす
3. `MAX_MONSTERS: 7` に増やす

### 難易度を上げたい場合
1. `INITIAL_SOUL: 200` に減らす
2. `敵のHP`を10-20%増やす
3. `Wave間隔`を短くする

### 状態異常を強化したい場合
1. `BLEED_BASE_DPS` を増やす
2. `BURN_BASE_DPS` を増やす
3. `FREEZE_STACKS_REQUIRED: 2` に減らす

## 🔧 パフォーマンス設定

**ファイル**: `js/constants.js` の `PERFORMANCE_CONSTANTS`

```javascript
QUADTREE_INITIAL_CAPACITY: 4,  // Quadtree容量（低いほど細分化）
OBJECT_POOL_INITIAL_SIZE: 10,  // オブジェクトプール初期サイズ
PARTICLE_POOL_SIZE: 50,         // パーティクルプール容量
TARGET_FPS: 60                  // 目標FPS
```

**低スペックPC向け**:
- `PARTICLE_POOL_SIZE: 20` に減らす
- エフェクトを無効化

**高スペックPC向け**:
- `PARTICLE_POOL_SIZE: 100` に増やす
- `QUADTREE_INITIAL_CAPACITY: 8` に増やす

## 📝 変更を反映する方法

1. 設定ファイルを編集
2. ブラウザでページをリロード（Ctrl+R / Cmd+R）
3. キャッシュをクリア（Ctrl+Shift+R / Cmd+Shift+R）

## ⚠️ 注意事項

- データファイルのJavaScript構文を壊さないよう注意
- 数値は妥当な範囲に設定（負の値や極端な値は避ける）
- 変更前にバックアップを取ることを推奨

## 🐛 トラブルシューティング

### ゲームが動かない
- ブラウザのコンソールでエラーを確認
- 構文エラーがないかチェック
- デフォルト値に戻す

### バランスがおかしい
- `data/` フォルダのファイルを確認
- 敵のHPと罠のダメージのバランスを調整
- Waveの進行速度を調整

## 📚 さらなるカスタマイズ

詳細なカスタマイズについては、各ファイルのコメントを参照してください。
