// ユーティリティ関数

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function gridDistance(gx1, gy1, gx2, gy2) {
    return Math.abs(gx2 - gx1) + Math.abs(gy2 - gy1); // マンハッタン距離
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// ディープコピー
// structuredCloneを使用（モダンブラウザ対応）、フォールバックとしてJSON方式
function deepCopy(obj) {
    if (typeof structuredClone !== 'undefined') {
        return structuredClone(obj);
    }
    // フォールバック: JSON方式（関数やundefinedは失われる）
    return JSON.parse(JSON.stringify(obj));
}

// ランダムな整数を返す
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 配列からランダムに選択
function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// 色の補間
function colorLerp(color1, color2, t) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(lerp(r1, r2, t));
    const g = Math.round(lerp(g1, g2, t));
    const b = Math.round(lerp(b1, b2, t));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// HPバー描画
function drawHealthBar(ctx, x, y, width, height, current, max, backgroundColor = '#333', foregroundColor = '#4ade80') {
    const ratio = clamp(current / max, 0, 1);

    // 背景
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(x, y, width, height);

    // HP
    ctx.fillStyle = foregroundColor;
    ctx.fillRect(x, y, width * ratio, height);

    // 枠
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
}

// テキスト描画（中央揃え）
function drawCenteredText(ctx, text, x, y, font = '14px Arial', color = '#fff') {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
}

// アイコン描画（状態異常など）
function drawStatusIcon(ctx, x, y, size, type) {
    const icons = {
        bleed: '🩸',
        burn: '🔥',
        freeze: '❄️',
        slow: '🐌',
        stun: '⚡',
        oiled: '💧',
        shield: '🛡️',
        confused: '😵',
        wildfire: '♨️'
    };

    const icon = icons[type] || '?';
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y);
}

// 数値フォーマット
function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return Math.floor(num).toString();
}

/**
 * レアリティに基づいてスキルを選択する共通関数
 * @param {Array} skills - 選択可能なスキルの配列
 * @param {Object} rarityWeights - レアリティごとの重み {common, rare, epic}
 * @returns {Object|null} - 選択されたスキル、または null
 */
function selectSkillByRarity(skills, rarityWeights = SKILL_RARITY_WEIGHTS) {
    if (!skills || skills.length === 0) {
        return null;
    }

    // レアリティ別にグループ化
    const skillsByRarity = {
        common: skills.filter(s => s.rarity === 'common'),
        rare: skills.filter(s => s.rarity === 'rare'),
        epic: skills.filter(s => s.rarity === 'epic')
    };

    // 重み付き抽選
    const totalWeight = rarityWeights.common + rarityWeights.rare + rarityWeights.epic;
    let random = Math.random() * totalWeight;

    // commonから選択
    if (random < rarityWeights.common && skillsByRarity.common.length > 0) {
        return skillsByRarity.common[Math.floor(Math.random() * skillsByRarity.common.length)];
    }
    random -= rarityWeights.common;

    // rareから選択
    if (random < rarityWeights.rare && skillsByRarity.rare.length > 0) {
        return skillsByRarity.rare[Math.floor(Math.random() * skillsByRarity.rare.length)];
    }
    random -= rarityWeights.rare;

    // epicから選択
    if (skillsByRarity.epic.length > 0) {
        return skillsByRarity.epic[Math.floor(Math.random() * skillsByRarity.epic.length)];
    }

    // フォールバック：ランダムに選択
    return skills[Math.floor(Math.random() * skills.length)];
}
