// UIマネージャー
class UIManager {
    constructor(game) {
        this.game = game;
        this.selectedTrap = null;
        this.selectedMonster = null;
        this.selectedObject = null;
        this.lastSoul = -1;
        this.lastMonsterCount = -1;
        this.paletteDirty = true; // パレット更新フラグ

        // UI更新最適化: 前回の値を保持
        this.lastCoreHp = -1;
        this.lastMana = -1;
        this.lastMaxMana = -1;
        this.lastMaterial = -1;
        this.lastWave = -1;
        this.lastWaveInProgress = null;
        this.lastGameSpeed = -1;
        this.lastPaused = null;
        this.lastScore = -1;

        // DOM要素のキャッシュ（パフォーマンス最適化）
        this.elements = {
            soulDisplay: document.getElementById('soul-display'),
            manaDisplay: document.getElementById('mana-display'),
            materialDisplay: document.getElementById('material-display'),
            coreHp: document.getElementById('core-hp'),
            waveDisplay: document.getElementById('wave-display'),
            scoreDisplay: document.getElementById('score-display'),
            startWaveBtn: document.getElementById('start-wave-btn'),
            autoWaveBtn: document.getElementById('auto-wave-btn'),
            speedBtn: document.getElementById('speed-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            helpBtn: document.getElementById('help-btn'),
            monsterStatusBtn: document.getElementById('monster-status-btn'),
            logBtn: document.getElementById('log-btn'),
            trapPalette: document.getElementById('trap-palette'),
            monsterPalette: document.getElementById('monster-palette'),
            selectionInfo: document.getElementById('selection-info'),
            monsterStatusPanel: document.getElementById('monster-status-panel'),
            logPanel: document.getElementById('log-panel'),
            monsterStatusList: document.getElementById('monster-status-list'),
            logList: document.getElementById('log-list'),
            closeMonsterStatus: document.getElementById('close-monster-status'),
            closeLog: document.getElementById('close-log')
        };

        // ログ配列
        this.gameLogs = [];
        this.maxLogs = 100;

        this.initializeUI();
    }

    initializeUI() {
        // ボタンイベント
        this.elements.startWaveBtn.addEventListener('click', () => {
            this.game.startWave();
        });

        this.elements.autoWaveBtn.addEventListener('click', () => {
            this.game.toggleAutoWave();
        });

        this.elements.speedBtn.addEventListener('click', () => {
            this.game.toggleSpeed();
        });

        this.elements.pauseBtn.addEventListener('click', () => {
            this.game.togglePause();
        });

        this.elements.helpBtn.addEventListener('click', () => {
            this.showHelp();
        });

        this.elements.monsterStatusBtn.addEventListener('click', () => {
            this.toggleMonsterStatus();
        });

        this.elements.logBtn.addEventListener('click', () => {
            this.toggleLog();
        });

        this.elements.closeMonsterStatus.addEventListener('click', () => {
            this.hideMonsterStatus();
        });

        this.elements.closeLog.addEventListener('click', () => {
            this.hideLog();
        });

        // パレットの初期化
        this.updatePalettes();

        // 初回起動時にチュートリアルを表示
        if (!localStorage.getItem('tutorialCompleted')) {
            setTimeout(() => this.showTutorial(), GAME_CONSTANTS.TUTORIAL_DELAY_MS);
        }
    }

    updatePalettes() {
        this.updateTrapPalette();
        this.updateMonsterPalette();
    }

    updateTrapPalette() {
        const paletteDiv = this.elements.trapPalette;
        paletteDiv.innerHTML = '';

        for (const trapId in TRAP_DATA) {
            const trapData = TRAP_DATA[trapId];

            if (!trapData.unlocked) continue;

            const item = document.createElement('div');
            item.className = 'palette-item';
            item.dataset.trapId = trapId;

            if (this.game.soul < trapData.cost) {
                item.classList.add('disabled');
            }

            // アイコンを追加
            const iconDiv = document.createElement('div');
            iconDiv.className = 'palette-item-icon';
            iconDiv.textContent = this.getTrapIcon(trapId);

            // XSS対策: textContentを使用
            const nameDiv = document.createElement('div');
            nameDiv.className = 'palette-item-name';
            nameDiv.textContent = trapData.name;

            const costDiv = document.createElement('div');
            costDiv.className = 'palette-item-cost';
            costDiv.textContent = `💰 ${trapData.cost}`;

            const statsDiv = document.createElement('div');
            statsDiv.className = 'palette-item-stats';
            statsDiv.textContent = `❤️ ${trapData.hp} / ⏱️ ${trapData.cooldownSec}s`;

            item.appendChild(iconDiv);
            item.appendChild(nameDiv);
            item.appendChild(costDiv);
            item.appendChild(statsDiv);

            // ツールチップ
            item.addEventListener('mouseenter', (e) => {
                this.showTooltip(e, trapData);
            });

            item.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });

            item.addEventListener('click', () => {
                console.log(`Trap clicked: ${trapId}, soul: ${this.game.soul}, cost: ${trapData.cost}`);
                if (this.game.soul >= trapData.cost) {
                    console.log(`Selecting trap: ${trapId}`);
                    this.selectTrap(trapId);
                } else {
                    console.log('Not enough soul to select trap');
                }
            });

            paletteDiv.appendChild(item);
        }
    }

    updateMonsterPalette() {
        const paletteDiv = this.elements.monsterPalette;
        paletteDiv.innerHTML = '';

        for (const monsterId in MONSTER_DATA) {
            const monsterData = MONSTER_DATA[monsterId];

            if (!monsterData.unlocked) continue;

            const item = document.createElement('div');
            item.className = 'palette-item';
            item.dataset.monsterId = monsterId;

            if (this.game.soul < monsterData.summonCost) {
                item.classList.add('disabled');
            }

            // アイコンを追加
            const iconDiv = document.createElement('div');
            iconDiv.className = 'palette-item-icon';
            iconDiv.textContent = this.getMonsterIcon(monsterId);

            // XSS対策: textContentを使用
            const nameDiv = document.createElement('div');
            nameDiv.className = 'palette-item-name';
            nameDiv.textContent = monsterData.name;

            const costDiv = document.createElement('div');
            costDiv.className = 'palette-item-cost';
            costDiv.textContent = `✨ ${monsterData.summonCost}`;

            const statsDiv = document.createElement('div');
            statsDiv.className = 'palette-item-stats';
            statsDiv.textContent = `❤️ ${monsterData.hp} / 💸 ${monsterData.upkeep}`;

            item.appendChild(iconDiv);
            item.appendChild(nameDiv);
            item.appendChild(costDiv);
            item.appendChild(statsDiv);

            // ツールチップ
            item.addEventListener('mouseenter', (e) => {
                this.showTooltip(e, monsterData);
            });

            item.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });

            item.addEventListener('click', () => {
                if (this.game.soul >= monsterData.summonCost) {
                    this.selectMonster(monsterId);
                }
            });

            paletteDiv.appendChild(item);
        }
    }

    selectTrap(trapId) {
        console.log(`=== selectTrap called: ${trapId} ===`);
        this.selectedTrap = trapId;
        this.selectedMonster = null;
        this.game.placementMode = 'trap';
        console.log(`placementMode set to: ${this.game.placementMode}`);
        console.log(`selectedTrap set to: ${this.selectedTrap}`);

        // 選択状態を更新
        document.querySelectorAll('.palette-item').forEach(item => {
            item.classList.remove('selected');
        });

        const trapElement = document.querySelector(`[data-trap-id="${trapId}"]`);
        console.log(`Trap element found:`, trapElement);
        if (trapElement) {
            trapElement.classList.add('selected');
        }
    }

    selectMonster(monsterId) {
        this.selectedMonster = monsterId;
        this.selectedTrap = null;
        this.game.placementMode = 'monster';

        // 選択状態を更新
        document.querySelectorAll('.palette-item').forEach(item => {
            item.classList.remove('selected');
        });

        document.querySelector(`[data-monster-id="${monsterId}"]`).classList.add('selected');
    }

    updateResources() {
        // UI更新最適化: 値が変化した場合のみ更新
        const soul = Math.floor(this.game.soul);
        if (soul !== this.lastSoul) {
            this.elements.soulDisplay.textContent = soul;
            this.lastSoul = soul;
        }

        const mana = Math.floor(this.game.mana);
        const maxMana = this.game.maxMana;
        if (mana !== this.lastMana || maxMana !== this.lastMaxMana) {
            this.elements.manaDisplay.textContent = `${mana}/${maxMana}`;
            this.lastMana = mana;
            this.lastMaxMana = maxMana;
        }

        const material = Math.floor(this.game.material);
        if (material !== this.lastMaterial) {
            this.elements.materialDisplay.textContent = material;
            this.lastMaterial = material;
        }

        const coreHp = Math.floor(this.game.coreHp);
        if (coreHp !== this.lastCoreHp) {
            this.elements.coreHp.textContent = coreHp;
            this.lastCoreHp = coreHp;
        }

        const currentWave = this.game.waveManager.currentWave;
        if (currentWave !== this.lastWave) {
            this.elements.waveDisplay.textContent = `${currentWave}/${this.game.waveManager.getTotalWaves()}`;
            this.lastWave = currentWave;
        }

        // スコア更新
        const score = Math.floor(this.game.totalScore);
        if (score !== this.lastScore) {
            this.elements.scoreDisplay.textContent = score.toLocaleString();
            this.lastScore = score;
        }
    }

    updateWaveButton() {
        // UI更新最適化: 状態が変化した場合のみ更新
        const waveInProgress = this.game.waveManager.isWaveInProgress();
        if (waveInProgress !== this.lastWaveInProgress) {
            const btn = this.elements.startWaveBtn;
            if (waveInProgress) {
                btn.disabled = true;
                btn.textContent = '🌊 Wave進行中';
                btn.classList.remove('highlight');
            } else {
                btn.disabled = false;
                btn.textContent = `🌊 Wave ${this.game.waveManager.currentWave + 1} 開始`;
            }
            this.lastWaveInProgress = waveInProgress;
        }
    }

    updateSpeedButton() {
        // UI更新最適化: 値が変化した場合のみ更新
        if (this.game.gameSpeed !== this.lastGameSpeed) {
            const btn = this.elements.speedBtn;
            btn.textContent = `⚡ ×${this.game.gameSpeed}`;
            this.lastGameSpeed = this.game.gameSpeed;
        }
    }

    updatePauseButton() {
        // UI更新最適化: 状態が変化した場合のみ更新
        if (this.game.paused !== this.lastPaused) {
            const btn = this.elements.pauseBtn;
            btn.textContent = this.game.paused ? '▶️ 再開' : '⏸️ 一時停止';
            this.lastPaused = this.game.paused;
        }
    }

    updateAutoWaveButton() {
        // 自動Wave進行ボタンの表示を更新
        const btn = this.elements.autoWaveBtn;
        if (this.game.autoWaveEnabled) {
            btn.textContent = '🔄 自動: ON';
            btn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
        } else {
            btn.textContent = '🔄 自動: OFF';
            btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }

    updateSelectionInfo(object) {
        const infoDiv = this.elements.selectionInfo;

        // 既存のリスナーをクリアするため、要素を再作成
        infoDiv.innerHTML = '';

        if (!object) {
            const p = document.createElement('p');
            p.textContent = 'オブジェクトを選択してください';
            infoDiv.appendChild(p);
            return;
        }

        if (object instanceof Trap) {
            const h4 = document.createElement('h4');
            h4.textContent = object.name;
            infoDiv.appendChild(h4);

            const hpP = document.createElement('p');
            hpP.textContent = `HP: ${Math.floor(object.hp)}/${object.maxHp}`;
            infoDiv.appendChild(hpP);

            const cdP = document.createElement('p');
            cdP.textContent = `クールダウン: ${object.cooldownTimer.toFixed(1)}s`;
            infoDiv.appendChild(cdP);

            const descP = document.createElement('p');
            descP.textContent = object.data.description;
            infoDiv.appendChild(descP);

            if (object.hp < object.maxHp) {
                const repairBtn = document.createElement('button');
                repairBtn.className = 'upgrade-btn';
                repairBtn.textContent = `修理 (${object.data.repairCost} ソウル)`;
                repairBtn.addEventListener('click', () => {
                    this.game.repairTrap(object.gridX, object.gridY);
                });
                infoDiv.appendChild(repairBtn);
            }
        } else if (object instanceof Monster) {
            const h4 = document.createElement('h4');
            h4.textContent = `${object.name} Lv.${object.level || 1} ${object.dead ? '(死亡)' : ''}`;
            infoDiv.appendChild(h4);

            const roleP = document.createElement('p');
            roleP.textContent = `役割: ${object.data.role || '不明'}`;
            roleP.style.fontWeight = 'bold';
            infoDiv.appendChild(roleP);

            // レベルと経験値
            if (object.level) {
                const expP = document.createElement('p');
                expP.textContent = `経験値: ${object.exp}/${object.expToNextLevel}`;
                expP.style.color = '#ffd700';
                infoDiv.appendChild(expP);

                const killP = document.createElement('p');
                killP.textContent = `撃破数: ${object.killCount}`;
                killP.style.color = '#ed8936';
                infoDiv.appendChild(killP);
            }

            const hpP = document.createElement('p');
            hpP.textContent = `HP: ${Math.floor(object.hp)}/${object.maxHp}`;
            infoDiv.appendChild(hpP);

            // 攻撃情報
            if (object.attack) {
                const attackP = document.createElement('p');
                attackP.textContent = `攻撃力: ${object.attack.damage} (${object.attack.type === 'melee' ? '近接' : '遠隔'}, 範囲${object.attack.range})`;
                infoDiv.appendChild(attackP);

                const attackSpeedP = document.createElement('p');
                attackSpeedP.textContent = `攻撃速度: ${object.attack.interval.toFixed(1)}秒/回`;
                infoDiv.appendChild(attackSpeedP);
            }

            const speedP = document.createElement('p');
            speedP.textContent = `移動速度: ${object.moveSpeed.toFixed(1)} ${object.flying ? '(飛行)' : ''}`;
            infoDiv.appendChild(speedP);

            const upkeepP = document.createElement('p');
            upkeepP.textContent = `維持コスト: ${object.data.upkeep}/Wave`;
            infoDiv.appendChild(upkeepP);

            // パッシブスキル
            if (object.data.passive) {
                const passiveP = document.createElement('p');
                passiveP.textContent = `パッシブ: ${object.data.passive.name}`;
                passiveP.style.color = '#9f7aea';
                infoDiv.appendChild(passiveP);

                const passiveDescP = document.createElement('p');
                passiveDescP.textContent = object.data.passive.effect;
                passiveDescP.style.fontSize = '0.9em';
                passiveDescP.style.fontStyle = 'italic';
                infoDiv.appendChild(passiveDescP);
            }

            // アクティブスキル
            if (object.data.active) {
                const activeP = document.createElement('p');
                activeP.textContent = `アクティブ: ${object.data.active.name} (マナ: ${object.data.active.manaCost})`;
                activeP.style.color = '#4299e1';
                infoDiv.appendChild(activeP);

                const activeDescP = document.createElement('p');
                activeDescP.textContent = object.data.active.effect.description || 'スキル効果';
                activeDescP.style.fontSize = '0.9em';
                activeDescP.style.fontStyle = 'italic';
                infoDiv.appendChild(activeDescP);

                if (object.activeCooldown > 0) {
                    const cooldownP = document.createElement('p');
                    cooldownP.textContent = `クールダウン: ${object.activeCooldown.toFixed(1)}s`;
                    infoDiv.appendChild(cooldownP);
                }
            }

            // 習得したスキル
            if (object.learnedSkills && object.learnedSkills.length > 0) {
                const skillsTitle = document.createElement('p');
                skillsTitle.textContent = '習得スキル:';
                skillsTitle.style.fontWeight = 'bold';
                skillsTitle.style.marginTop = '8px';
                skillsTitle.style.color = '#ffd700';
                infoDiv.appendChild(skillsTitle);

                for (const skill of object.learnedSkills) {
                    const skillP = document.createElement('p');
                    const rarityColor = {
                        common: '#48bb78',
                        rare: '#4299e1',
                        epic: '#9f7aea'
                    }[skill.rarity] || '#718096';

                    skillP.textContent = `・${skill.name}`;
                    skillP.style.color = rarityColor;
                    skillP.style.fontSize = '0.95em';
                    skillP.style.marginLeft = '8px';
                    skillP.style.cursor = 'help';
                    skillP.title = skill.description; // ネイティブツールチップ
                    infoDiv.appendChild(skillP);
                }
            }

            if (object.dead) {
                const reviveBtn = document.createElement('button');
                reviveBtn.className = 'upgrade-btn';
                reviveBtn.textContent = `蘇生 (${object.data.reviveCost} ソウル)`;
                reviveBtn.addEventListener('click', () => {
                    this.game.reviveMonster(object.gridX, object.gridY);
                });
                infoDiv.appendChild(reviveBtn);
            }
        } else if (object instanceof Enemy) {
            const h4 = document.createElement('h4');
            h4.textContent = `${object.name} Lv.${object.level || 1}`;
            infoDiv.appendChild(h4);

            const hpP = document.createElement('p');
            hpP.textContent = `HP: ${Math.floor(object.hp)}/${object.maxHp}`;
            infoDiv.appendChild(hpP);

            const speedP = document.createElement('p');
            speedP.textContent = `速度: ${object.moveSpeed.toFixed(1)} ${object.flying ? '(飛行)' : ''}`;
            infoDiv.appendChild(speedP);

            // 攻撃情報
            if (object.data.attack) {
                const attackP = document.createElement('p');
                attackP.textContent = `攻撃力: ${object.data.attack.damage}`;
                infoDiv.appendChild(attackP);
            }

            // 特殊能力
            if (object.abilities && object.abilities.length > 0) {
                const abilityP = document.createElement('p');
                abilityP.textContent = `能力: ${object.abilities.join(', ')}`;
                abilityP.style.color = '#ed8936';
                infoDiv.appendChild(abilityP);
            }

            // 習得したスキル
            if (object.learnedSkills && object.learnedSkills.length > 0) {
                const skillsTitle = document.createElement('p');
                skillsTitle.textContent = '習得スキル:';
                skillsTitle.style.fontWeight = 'bold';
                skillsTitle.style.marginTop = '8px';
                skillsTitle.style.color = '#ffd700';
                infoDiv.appendChild(skillsTitle);

                for (const skill of object.learnedSkills) {
                    const skillP = document.createElement('p');
                    const rarityColor = {
                        common: '#48bb78',
                        rare: '#4299e1',
                        epic: '#9f7aea'
                    }[skill.rarity] || '#718096';

                    skillP.textContent = `・${skill.name}`;
                    skillP.style.color = rarityColor;
                    skillP.style.fontSize = '0.95em';
                    skillP.style.marginLeft = '8px';
                    skillP.style.cursor = 'help';
                    skillP.title = skill.description; // ネイティブツールチップ
                    infoDiv.appendChild(skillP);
                }
            }

            const rewardP = document.createElement('p');
            rewardP.textContent = `撃破報酬: ${object.soulReward} ソウル, ${object.manaReward} マナ`;
            rewardP.style.color = '#48bb78';
            infoDiv.appendChild(rewardP);

            const descP = document.createElement('p');
            descP.textContent = object.data.description;
            descP.style.fontSize = '0.9em';
            descP.style.fontStyle = 'italic';
            infoDiv.appendChild(descP);
        }
    }

    showGameOver(victory) {
        const overlay = document.createElement('div');
        overlay.className = 'game-over-overlay';

        const content = document.createElement('div');
        content.className = `game-over-content ${victory ? 'victory' : 'defeat'}`;

        // XSS対策: innerHTMLの代わりにcreateElementとtextContentを使用
        const h2 = document.createElement('h2');
        h2.textContent = victory ? '勝利！' : '敗北...';

        const p1 = document.createElement('p');
        p1.textContent = victory ? 'すべてのWaveを防衛しました！' : 'コアが破壊されました';

        const p2 = document.createElement('p');
        p2.textContent = `到達Wave: ${this.game.waveManager.currentWave}`;

        const p3 = document.createElement('p');
        p3.textContent = `獲得ソウル: ${Math.floor(this.game.soul)}`;

        const p4 = document.createElement('p');
        p4.textContent = `総スコア: ${Math.floor(this.game.totalScore).toLocaleString()}`;
        p4.style.fontSize = '1.5em';
        p4.style.fontWeight = 'bold';
        p4.style.color = '#ffd700';
        p4.style.marginTop = '10px';

        const p5 = document.createElement('p');
        p5.textContent = `倒した敵: ${this.game.totalEnemiesDefeated}体 | 最高レベル: Lv.${this.game.highestEnemyLevel}`;
        p5.style.fontSize = '0.9em';

        const restartBtn = document.createElement('button');
        restartBtn.className = 'restart-btn';
        restartBtn.textContent = '再挑戦';
        restartBtn.addEventListener('click', () => location.reload());

        content.appendChild(h2);
        content.appendChild(p1);
        content.appendChild(p2);
        content.appendChild(p3);
        content.appendChild(p4);
        content.appendChild(p5);
        content.appendChild(restartBtn);

        overlay.appendChild(content);
        document.body.appendChild(overlay);
    }

    showMessage(text, type = 'info') {
        // メッセージ表示（簡易版）
        const messageDiv = document.createElement('div');
        messageDiv.textContent = text;
        messageDiv.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            animation: fadeInOut 2s ease-in-out;
            pointer-events: none;
        `;

        // タイプによって色を変更
        const colors = {
            success: '#48bb78',
            error: '#f56565',
            warning: '#ed8936',
            info: '#4299e1'
        };
        messageDiv.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(messageDiv);

        // 2秒後に削除
        setTimeout(() => {
            messageDiv.remove();
        }, 2000);
    }

    update() {
        this.updateResources();
        this.updateWaveButton();
        this.updateSpeedButton();
        this.updatePauseButton();
        this.updateAutoWaveButton();

        // パレットは必要な時だけ更新
        if (this.paletteDirty ||
            this.lastSoul !== Math.floor(this.game.soul) ||
            this.lastMonsterCount !== this.game.monsters.length) {
            this.updatePalettes();
            this.lastSoul = Math.floor(this.game.soul);
            this.lastMonsterCount = this.game.monsters.length;
            this.paletteDirty = false;
        }
    }

    markPaletteDirty() {
        // 新しいアイテムが解除された時などに呼び出す
        this.paletteDirty = true;
    }

    getTrapIcon(trapId) {
        const icons = {
            spike_plate: '⚔️',
            arrow_wall: '🏹',
            oil_pot: '🛢️',
            fire_vent: '🔥',
            ice_floor: '❄️',
            push_plate: '👊',
            mine: '💣',
            confusion_sign: '🌀'
        };
        return icons[trapId] || '🔧';
    }

    getMonsterIcon(monsterId) {
        const icons = {
            skeleton_guard: '💀',
            slime: '🟢',
            goblin_engineer: '🔨',
            gargoyle: '🦅',
            wisp: '💫',
            cleric_skeleton: '⚕️',
            zombie: '🧟',
            shadow_assassin: '🗡️',
            bone_archer: '🏹',
            necromancer: '☠️',
            frost_mage: '❄️',
            demon_hound: '🐺',
            golem: '🗿',
            vampire: '🦇',
            demon_lord: '👑' // 魔王は王冠で特別感を出す
        };
        return icons[monsterId] || '👹';
    }

    showTooltip(event, data) {
        this.hideTooltip(); // 既存のツールチップを削除

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.id = 'game-tooltip';

        const title = document.createElement('div');
        title.className = 'tooltip-title';
        title.textContent = data.name;

        const desc = document.createElement('div');
        desc.className = 'tooltip-description';
        desc.textContent = data.description || '';

        const stats = document.createElement('div');
        stats.className = 'tooltip-stats';

        if (data.cost !== undefined) {
            // 罠
            stats.textContent = `コスト: ${data.cost} | HP: ${data.hp} | クールダウン: ${data.cooldownSec}s`;
        } else if (data.summonCost !== undefined) {
            // モンスター
            stats.textContent = `召喚: ${data.summonCost} | HP: ${data.hp} | 維持: ${data.upkeep}`;
        }

        tooltip.appendChild(title);
        tooltip.appendChild(desc);
        tooltip.appendChild(stats);

        document.body.appendChild(tooltip);

        // 位置を設定
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
    }

    hideTooltip() {
        const tooltip = document.getElementById('game-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    showTutorial() {
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';

        const content = document.createElement('div');
        content.className = 'tutorial-content';

        // XSS対策: innerHTMLの代わりにcreateElementとtextContentを使用
        const h2 = document.createElement('h2');
        h2.textContent = '🎮 Dungeon Wardenへようこそ！';

        const p1 = document.createElement('p');
        p1.textContent = '🏰 あなたはダンジョンの主となり、侵入者から魔法のコアを守ります。';

        const p2 = document.createElement('p');
        p2.textContent = '⚔️ 罠とモンスターを配置して、勇者たちを撃退しましょう！';

        const p3 = document.createElement('p');
        p3.textContent = '🗺️ 迷路状のマップで、落とし穴と空中ルートを活用した戦略的防衛が鍵です！';
        p3.style.color = '#9f7aea';

        content.appendChild(h2);
        content.appendChild(p1);
        content.appendChild(p2);
        content.appendChild(p3);

        const buttons = document.createElement('div');
        buttons.className = 'tutorial-buttons';

        const skipBtn = document.createElement('button');
        skipBtn.className = 'tutorial-btn';
        skipBtn.textContent = 'スキップ';
        skipBtn.addEventListener('click', () => {
            overlay.remove();
            localStorage.setItem('tutorialCompleted', 'true');
        });

        const startBtn = document.createElement('button');
        startBtn.className = 'tutorial-btn primary';
        startBtn.textContent = '始める';
        startBtn.addEventListener('click', () => {
            overlay.remove();
            localStorage.setItem('tutorialCompleted', 'true');
            this.showMessage('左側から罠、右側からモンスターを選んでクリックで配置できます！', 'info');

            // Wave開始ボタンを光らせる
            setTimeout(() => {
                this.elements.startWaveBtn.classList.add('highlight');
                this.showMessage('準備ができたら「Wave開始」ボタンをクリック！', 'info');
            }, GAME_CONSTANTS.TUTORIAL_MESSAGE_DELAY_MS);
        });

        buttons.appendChild(skipBtn);
        buttons.appendChild(startBtn);
        content.appendChild(buttons);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    }

    showHelp() {
        const overlay = document.createElement('div');
        overlay.className = 'help-overlay';

        const content = document.createElement('div');
        content.className = 'help-content';

        // XSS対策: innerHTMLの代わりにcreateElementとtextContentを使用
        const h2 = document.createElement('h2');
        h2.textContent = '📖 ゲームガイド';
        content.appendChild(h2);

        // セクション1: ゲームの目的
        const section1 = document.createElement('div');
        section1.className = 'help-section';
        const h3_1 = document.createElement('h3');
        h3_1.textContent = '🎯 ゲームの目的';
        const p1_1 = document.createElement('p');
        p1_1.textContent = '50ウェーブ以上の侵入者から魔法のコアを守り抜くこと！';
        const p1_2 = document.createElement('p');
        p1_2.textContent = 'コアのHPが0になったらゲームオーバーです。';
        const p1_3 = document.createElement('p');
        p1_3.textContent = 'Wave16以降は複数スポーン、Wave30以降は3つのスポーンから敵が出現します。';
        p1_3.style.color = '#ed8936';
        section1.appendChild(h3_1);
        section1.appendChild(p1_1);
        section1.appendChild(p1_2);
        section1.appendChild(p1_3);
        content.appendChild(section1);

        // セクション2: マップの見方
        const section2 = document.createElement('div');
        section2.className = 'help-section';
        const h3_2 = document.createElement('h3');
        h3_2.textContent = '🗺️ マップの見方';
        const ul2 = document.createElement('ul');
        ['🟢 明るい緑色 (S): スポーン地点 - 敵が出現する場所',
         '🔴 明るい赤色 (C): コア - 守るべき目標',
         '◼️ グレー: 敵の移動経路（pathタイル）',
         '⬛ 濃いグレー: 空き地 - 罠とモンスターを配置可能（移動可能）',
         '🟣 紫色: 空中ルート - 飛行ユニット専用の迂回路',
         '⬛ 濃い黒色: 落とし穴 - 敵を押し出すと落下ダメージ',
         '※ 紫の空中ルートは地上敵を避けた高速移動が可能',
         '※ 落とし穴は押し出しトラップとのコンボで効果を発揮'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul2.appendChild(li);
        });
        section2.appendChild(h3_2);
        section2.appendChild(ul2);
        content.appendChild(section2);

        // セクション3: 操作方法
        const section3 = document.createElement('div');
        section3.className = 'help-section';
        const h3_3 = document.createElement('h3');
        h3_3.textContent = '🎮 操作方法';
        const ul3 = document.createElement('ul');
        ['左クリック: 罠・モンスターの配置、オブジェクトの選択',
         '右クリック: 配置モードのキャンセル',
         'マウスホバー: 詳細情報の表示'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul3.appendChild(li);
        });
        section3.appendChild(h3_3);
        section3.appendChild(ul3);
        content.appendChild(section3);

        // セクション4: リソース
        const section4 = document.createElement('div');
        section4.className = 'help-section';
        const h3_4 = document.createElement('h3');
        h3_4.textContent = '💰 リソース';
        const ul4 = document.createElement('ul');
        ['ソウル (紫): 罠とモンスターの購入・修理に使用。敵を倒すと獲得',
         'マナ (青): 自動回復、モンスターのスキルに使用。時間経過で回復',
         '素材 (橙): 将来の拡張用（現在未使用）'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul4.appendChild(li);
        });
        section4.appendChild(h3_4);
        section4.appendChild(ul4);
        content.appendChild(section4);

        // セクション5: 罠の種類
        const section5 = document.createElement('div');
        section5.className = 'help-section';
        const h3_5 = document.createElement('h3');
        h3_5.textContent = '⚔️ 罠の種類（基本）';
        const ul5 = document.createElement('ul');
        ['▲ スパイク板: 通過時にダメージと出血',
         '➤ 矢壁: 最前列の敵を自動攻撃',
         '💧 油壺: 油濡れ状態を付与（火炎ダメージ+50%）',
         '🔥 火炎孔: 範囲火炎DoT攻撃',
         '❄ 氷結床: 鈍足＋凍結スタック',
         '⬅ 押出板: ノックバック効果',
         '💣 地雷: 踏むと爆発（使い捨て）',
         '❓ 反転符: 優先順位を乱す'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul5.appendChild(li);
        });
        section5.appendChild(h3_5);
        section5.appendChild(ul5);
        content.appendChild(section5);

        // セクション6: 罠の種類（上級）
        const section6 = document.createElement('div');
        section6.className = 'help-section';
        const h3_6 = document.createElement('h3');
        h3_6.textContent = '⚔️ 罠の種類（上級）';
        const ul6 = document.createElement('ul');
        ['⚡ 雷の柱: 電撃が3体に連鎖攻撃',
         '🩸 吸血の棘: ダメージの50%を自己回復',
         '🌀 重力井戸: 敵を引き寄せて減速',
         '☠ 毒霧発生器: 毒DOT+回復50%減少',
         '🪞 反射の鏡: 受けたダメージの40%を反射',
         '⏰ 時空歪曲器: 速度60%低下+スキルCD増加',
         '⚰ 呪いの祭壇: 呪いDOT+被ダメ15%増加',
         '✨ 聖なる結界: 味方モンスターに被ダメ軽減+回復'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul6.appendChild(li);
        });
        section6.appendChild(h3_6);
        section6.appendChild(ul6);
        content.appendChild(section6);

        // セクション6.5: 経済系罠
        const section6_5 = document.createElement('div');
        section6_5.className = 'help-section';
        const h3_6_5 = document.createElement('h3');
        h3_6_5.textContent = '💰 経済系罠（後半で解禁）';
        const ul6_5 = document.createElement('ul');
        ['💀 ソウル収穫機: 範囲内で敵を倒すとソウル+3ボーナス',
         '💎 マナ結晶: 毎秒マナ+0.5を自動生成（パッシブ）',
         '※ これらはWaveクリアで段階的に解禁されます'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul6_5.appendChild(li);
        });
        section6_5.appendChild(h3_6_5);
        section6_5.appendChild(ul6_5);
        content.appendChild(section6_5);

        // セクション7: モンスター
        const section7 = document.createElement('div');
        section7.className = 'help-section';
        const h3_7 = document.createElement('h3');
        h3_7.textContent = '👹 モンスター';
        const ul7 = document.createElement('ul');
        ['💀 スケルトン兵: 前衛タンク、盾上げスキル。死亡時50%で復活(Lv毎+1%、最大80%)',
         '🟢 スライム: 鈍足攻撃、被ダメ時20%で分裂',
         '🔧 ゴブリン工兵: 罠を自動修理。敵撃破時5%でソウル+5',
         '🦅 ガーゴイル: 飛行ユニット、対空専門',
         '✨ ウィスプ: 魔法攻撃、マナ回復サポート'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul7.appendChild(li);
        });
        section7.appendChild(h3_7);
        section7.appendChild(ul7);
        content.appendChild(section7);

        // セクション8: 敵の特徴
        const section8 = document.createElement('div');
        section8.className = 'help-section';
        const h3_8 = document.createElement('h3');
        h3_8.textContent = '⚔️ 敵の特徴（新AI）';
        const ul8 = document.createElement('ul');
        ['🗡 盗賊: 罠が近くにあると減速、安全な場所では加速',
         '⚔ 戦士: HP50%以下で1.3倍加速する突進',
         '🏹 レンジャー: モンスターが近いと後退。遠距離攻撃',
         '✝ 聖職者: 負傷した味方がいると急いで近づく',
         '🦅 飛行斥候: 地上罠を無視して飛行',
         '👑 光の勇者: ボス。バリア、自己回復、聖域スキル'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul8.appendChild(li);
        });
        section8.appendChild(h3_8);
        section8.appendChild(ul8);
        content.appendChild(section8);

        // セクション9: マップパターン
        const section9 = document.createElement('div');
        section9.className = 'help-section';
        const h3_9 = document.createElement('h3');
        h3_9.textContent = '🗺️ マップパターン（戦略的迷路）';
        const ul9 = document.createElement('ul');
        ['迷路風: 蛇行する戦略的ルート + 上下の空中迂回路',
         'ジグザグ: 上下に蛇行 + ルート脇の落とし穴 + 空中直線ルート',
         'スプリット: 上下分岐 + 各所に落とし穴 + 迂回空中ルート',
         'メイズ: 複雑な迷路 + 曲がり角の落とし穴 + 空中横断ルート',
         'デュアルスポーン(Wave16~): 2つのスポーン + 空中ショートカット',
         'トリプルスポーン(Wave30~): 3つのスポーン + 密集した落とし穴',
         '※ 各Waveでランダムに選択されます',
         '⚠️ 重要: 敵は罠の配置に応じて経路を変更します',
         '✨ 飛行ユニットは紫の空中ルートを使って高速移動可能'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul9.appendChild(li);
        });
        section9.appendChild(h3_9);
        section9.appendChild(ul9);
        content.appendChild(section9);

        // セクション10: 攻略のコツ
        const section10 = document.createElement('div');
        section10.className = 'help-section';
        const h3_10 = document.createElement('h3');
        h3_10.textContent = '💡 攻略のコツ';
        const ul10 = document.createElement('ul');
        ['油壺→火炎孔のコンボが強力！',
         '氷結床で敵を遅らせて集中攻撃',
         'ゴブリン工兵で罠の耐久を維持',
         '敵は罠を避けるので、要所に集中配置しよう',
         '分岐マップでは片方に罠を集中させて誘導',
         '聖職者を優先的に倒そう（反転符が有効）',
         '飛行敵にはガーゴイルや矢壁で対応',
         '押し出しトラップで敵を落とし穴に押し込もう',
         '空中ルートにガーゴイルを配置して空戦専用防衛',
         '迷路の曲がり角に罠を集中配置すると効果的',
         'Wave間で戦略を見直そう'].forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            ul10.appendChild(li);
        });
        section10.appendChild(h3_10);
        section10.appendChild(ul10);
        content.appendChild(section10);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-help-btn';
        closeBtn.textContent = '閉じる';
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });

        content.appendChild(closeBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    }

    // モンスター情報パネル
    toggleMonsterStatus() {
        const panel = this.elements.monsterStatusPanel;
        if (panel.style.display === 'none') {
            this.showMonsterStatus();
        } else {
            this.hideMonsterStatus();
        }
    }

    showMonsterStatus() {
        this.updateMonsterStatusList();
        this.elements.monsterStatusPanel.style.display = 'flex';
    }

    hideMonsterStatus() {
        this.elements.monsterStatusPanel.style.display = 'none';
    }

    updateMonsterStatusList() {
        const list = this.elements.monsterStatusList;
        list.innerHTML = '';

        if (this.game.monsters.length === 0) {
            list.innerHTML = '<p class="empty-message">モンスターがいません</p>';
            return;
        }

        // 生存しているモンスターのみ表示
        const aliveMonsters = this.game.monsters.filter(m => !m.dead);

        if (aliveMonsters.length === 0) {
            list.innerHTML = '<p class="empty-message">生存しているモンスターがいません</p>';
            return;
        }

        for (const monster of aliveMonsters) {
            const item = document.createElement('div');
            item.className = 'monster-status-item';

            const icon = this.getMonsterIcon(monster.id);
            const hpPercent = (monster.hp / monster.maxHp * 100).toFixed(0);
            const expPercent = (monster.exp / monster.expToNextLevel * 100).toFixed(0);

            // 基本情報の構築
            // 注意: innerHTMLを使用していますが、データソースは静的なゲームデータ（MONSTER_DATA）のみです。
            // 将来的にユーザー生成コンテンツを扱う場合は、textContent/createElementに変更してください。
            const headerDiv = document.createElement('div');
            headerDiv.className = 'monster-status-header';
            headerDiv.innerHTML = `
                <span class="monster-icon">${icon}</span>
                <span class="monster-name">${monster.name} Lv.${monster.level}</span>
                <span class="monster-kills">撃破数: ${monster.killCount}</span>
            `;

            // HPバーと経験値バー（静的データのため安全）
            const barsDiv = document.createElement('div');
            barsDiv.className = 'monster-status-bars';
            barsDiv.innerHTML = `
                <div class="status-bar-row">
                    <span class="bar-label">HP:</span>
                    <div class="status-bar">
                        <div class="status-bar-fill hp-bar" style="width: ${hpPercent}%"></div>
                    </div>
                    <span class="bar-value">${monster.hp}/${monster.maxHp}</span>
                </div>
                <div class="status-bar-row">
                    <span class="bar-label">EXP:</span>
                    <div class="status-bar">
                        <div class="status-bar-fill exp-bar" style="width: ${expPercent}%"></div>
                    </div>
                    <span class="bar-value">${monster.exp}/${monster.expToNextLevel}</span>
                </div>
            `;

            const statsDiv = document.createElement('div');
            statsDiv.className = 'monster-status-stats';
            statsDiv.innerHTML = `
                <span>攻撃力: ${monster.attack.damage}</span>
                <span>射程: ${monster.attack.range}</span>
                <span>攻撃速度: ${monster.attack.interval.toFixed(2)}s</span>
            `;

            item.appendChild(headerDiv);
            item.appendChild(barsDiv);
            item.appendChild(statsDiv);

            // スキルの構築（ツールチップ付き）
            if (monster.learnedSkills.length > 0) {
                const skillsDiv = document.createElement('div');
                skillsDiv.className = 'monster-skills';

                const skillsLabel = document.createElement('span');
                skillsLabel.className = 'skills-label';
                skillsLabel.textContent = 'スキル:';
                skillsDiv.appendChild(skillsLabel);

                for (const skill of monster.learnedSkills) {
                    const skillTag = document.createElement('span');
                    skillTag.className = 'skill-tag';
                    skillTag.textContent = skill.name;

                    // レアリティに応じた色を設定
                    const rarityColors = {
                        common: '#48bb78',
                        rare: '#4299e1',
                        epic: '#9f7aea'
                    };
                    skillTag.style.borderColor = rarityColors[skill.rarity] || '#718096';
                    skillTag.style.cursor = 'help';

                    // ツールチップイベントを追加
                    skillTag.addEventListener('mouseenter', (e) => {
                        this.showSkillTooltip(e, skill);
                    });

                    skillTag.addEventListener('mouseleave', () => {
                        this.hideSkillTooltip();
                    });

                    skillsDiv.appendChild(skillTag);
                }

                item.appendChild(skillsDiv);
            }

            list.appendChild(item);
        }
    }

    // ログパネル
    toggleLog() {
        const panel = this.elements.logPanel;
        if (panel.style.display === 'none') {
            this.showLog();
        } else {
            this.hideLog();
        }
    }

    showLog() {
        this.updateLogList();
        this.elements.logPanel.style.display = 'flex';
    }

    hideLog() {
        this.elements.logPanel.style.display = 'none';
    }

    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        this.gameLogs.push({
            time: timestamp,
            message: message,
            type: type
        });

        // ログが多すぎる場合は古いものを削除
        if (this.gameLogs.length > this.maxLogs) {
            this.gameLogs.shift();
        }

        // ログパネルが開いている場合は更新
        if (this.elements.logPanel.style.display !== 'none') {
            this.updateLogList();
        }
    }

    updateLogList() {
        const list = this.elements.logList;
        list.innerHTML = '';

        if (this.gameLogs.length === 0) {
            list.innerHTML = '<p class="empty-message">ログがありません</p>';
            return;
        }

        // 最新のログを上に表示
        for (let i = this.gameLogs.length - 1; i >= 0; i--) {
            const log = this.gameLogs[i];
            const item = document.createElement('div');
            item.className = `log-item log-${log.type}`;
            item.innerHTML = `
                <span class="log-time">[${log.time}]</span>
                <span class="log-message">${log.message}</span>
            `;
            list.appendChild(item);
        }
    }

    // スキルツールチップ表示
    showSkillTooltip(event, skill) {
        this.hideSkillTooltip(); // 既存のツールチップを削除

        const tooltip = document.createElement('div');
        tooltip.className = 'skill-tooltip';
        tooltip.id = 'skill-tooltip';

        const title = document.createElement('div');
        title.className = 'skill-tooltip-title';
        title.textContent = skill.name;

        // レアリティ表示
        const rarityDiv = document.createElement('div');
        rarityDiv.className = 'skill-tooltip-rarity';
        const rarityNames = {
            common: 'コモン',
            rare: 'レア',
            epic: 'エピック'
        };
        const rarityColors = {
            common: '#48bb78',
            rare: '#4299e1',
            epic: '#9f7aea'
        };
        rarityDiv.textContent = rarityNames[skill.rarity] || skill.rarity;
        rarityDiv.style.color = rarityColors[skill.rarity] || '#718096';

        const desc = document.createElement('div');
        desc.className = 'skill-tooltip-description';
        desc.textContent = skill.description;

        const typeDiv = document.createElement('div');
        typeDiv.className = 'skill-tooltip-type';
        typeDiv.textContent = `タイプ: ${skill.type === 'passive' ? 'パッシブ' : 'アクティブ'}`;

        tooltip.appendChild(title);
        tooltip.appendChild(rarityDiv);
        tooltip.appendChild(desc);
        tooltip.appendChild(typeDiv);

        document.body.appendChild(tooltip);

        // 位置を設定
        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;

        // 画面外に出る場合は左側に表示
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = `${rect.left - tooltipRect.width - 10}px`;
        }
        if (tooltipRect.bottom > window.innerHeight) {
            tooltip.style.top = `${window.innerHeight - tooltipRect.height - 10}px`;
        }
    }

    hideSkillTooltip() {
        const tooltip = document.getElementById('skill-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    // ホバー時のユニット情報ツールチップ
    showUnitHoverTooltip(unit, mouseX, mouseY) {
        console.log('showUnitHoverTooltip called:', unit, mouseX, mouseY);
        this.hideUnitHoverTooltip(); // 既存のツールチップを削除

        const tooltip = document.createElement('div');
        tooltip.className = 'unit-hover-tooltip';
        tooltip.id = 'unit-hover-tooltip';

        console.log('Checking unit type...');
        // ユニットの種類に応じて内容を作成
        if (unit instanceof Trap) {
            console.log('Unit is Trap');
            this.createTrapTooltipContent(tooltip, unit);
        } else if (unit instanceof Monster) {
            console.log('Unit is Monster');
            this.createMonsterTooltipContent(tooltip, unit);
        } else if (unit instanceof Enemy) {
            console.log('Unit is Enemy');
            this.createEnemyTooltipContent(tooltip, unit);
        } else {
            console.log('Unit type unknown:', unit.constructor.name);
        }

        console.log('Appending tooltip to body');
        document.body.appendChild(tooltip);
        console.log('Tooltip appended:', tooltip);

        // 位置を設定（キャンバス座標をスクリーン座標に変換）
        this.positionUnitHoverTooltip(tooltip, mouseX, mouseY);
        console.log('Tooltip positioned');
    }

    createTrapTooltipContent(tooltip, trap) {
        const header = document.createElement('div');
        header.className = 'unit-hover-header';
        header.textContent = `${trap.name}${trap.level > 1 ? ` Lv.${trap.level}` : ''}`;
        header.style.color = trap.data.evolved ? '#ffd700' : '#ed8936';

        const hpBar = document.createElement('div');
        hpBar.className = 'unit-hover-hp';
        const hpPercent = Math.floor((trap.hp / trap.maxHp) * 100);
        hpBar.innerHTML = `<span>HP:</span> ${Math.floor(trap.hp)}/${trap.maxHp} <span style="color: #48bb78">(${hpPercent}%)</span>`;

        const cooldown = document.createElement('div');
        cooldown.className = 'unit-hover-stat';
        cooldown.textContent = `クールダウン: ${trap.cooldownTimer.toFixed(1)}s / ${trap.data.cooldownSec}s`;

        tooltip.appendChild(header);
        tooltip.appendChild(hpBar);
        tooltip.appendChild(cooldown);

        // レベルと経験値（レベル1以上）
        if (trap.level >= 1) {
            const expBar = document.createElement('div');
            expBar.className = 'unit-hover-stat';
            expBar.textContent = `経験値: ${trap.exp}/${trap.maxExp}`;
            expBar.style.color = '#00d4ff';
            tooltip.appendChild(expBar);
        }

        // 説明文
        if (trap.data.description) {
            const desc = document.createElement('div');
            desc.className = 'unit-hover-stat';
            desc.textContent = trap.data.description;
            desc.style.fontSize = '0.85em';
            desc.style.color = '#cbd5e0';
            desc.style.marginTop = '4px';
            tooltip.appendChild(desc);
        }
    }

    createMonsterTooltipContent(tooltip, monster) {
        const header = document.createElement('div');
        header.className = 'unit-hover-header';
        header.textContent = `${monster.name} Lv.${monster.level}`;
        header.style.color = '#48bb78';

        const hpBar = document.createElement('div');
        hpBar.className = 'unit-hover-hp';
        const hpPercent = Math.floor((monster.hp / monster.maxHp) * 100);
        hpBar.innerHTML = `<span>HP:</span> ${Math.floor(monster.hp)}/${monster.maxHp} <span style="color: #48bb78">(${hpPercent}%)</span>`;

        const expBar = document.createElement('div');
        expBar.className = 'unit-hover-stat';
        expBar.textContent = `経験値: ${monster.exp}/${monster.expToNextLevel}`;

        const attack = document.createElement('div');
        attack.className = 'unit-hover-stat';
        attack.textContent = `攻撃力: ${monster.attack.damage} / 射程: ${monster.attack.range}`;

        const kills = document.createElement('div');
        kills.className = 'unit-hover-stat';
        kills.textContent = `撃破数: ${monster.killCount}`;
        kills.style.color = '#ed8936';

        tooltip.appendChild(header);
        tooltip.appendChild(hpBar);
        tooltip.appendChild(expBar);
        tooltip.appendChild(attack);
        tooltip.appendChild(kills);

        // スキル表示（最大3つまで）
        if (monster.learnedSkills.length > 0) {
            const skillsDiv = document.createElement('div');
            skillsDiv.className = 'unit-hover-skills';
            skillsDiv.textContent = `スキル: `;
            const skillNames = monster.learnedSkills.slice(0, 3).map(s => s.name).join(', ');
            skillsDiv.textContent += skillNames;
            if (monster.learnedSkills.length > 3) {
                skillsDiv.textContent += ` +${monster.learnedSkills.length - 3}`;
            }
            skillsDiv.style.color = '#9f7aea';
            skillsDiv.style.fontSize = '0.9em';
            tooltip.appendChild(skillsDiv);
        }
    }

    createEnemyTooltipContent(tooltip, enemy) {
        const header = document.createElement('div');
        header.className = 'unit-hover-header';
        header.textContent = `${enemy.name} Lv.${enemy.level}${enemy.boss ? ' (ボス)' : ''}`;
        header.style.color = enemy.boss ? '#ffd700' : '#f56565';

        const hpBar = document.createElement('div');
        hpBar.className = 'unit-hover-hp';
        const hpPercent = Math.floor((enemy.hp / enemy.maxHp) * 100);
        hpBar.innerHTML = `<span>HP:</span> ${Math.floor(enemy.hp)}/${enemy.maxHp} <span style="color: #f56565">(${hpPercent}%)</span>`;

        const speed = document.createElement('div');
        speed.className = 'unit-hover-stat';
        speed.textContent = `速度: ${enemy.moveSpeed.toFixed(1)}${enemy.flying ? ' (飛行)' : ''}`;

        const reward = document.createElement('div');
        reward.className = 'unit-hover-stat';
        reward.textContent = `報酬: ${enemy.soulReward} ソウル, ${enemy.manaReward} マナ`;
        reward.style.color = '#48bb78';

        tooltip.appendChild(header);
        tooltip.appendChild(hpBar);
        tooltip.appendChild(speed);

        // 攻撃力表示
        if (enemy.data.attack && enemy.data.attack.damage) {
            const attack = document.createElement('div');
            attack.className = 'unit-hover-stat';
            attack.textContent = `攻撃力: ${enemy.data.attack.damage}`;
            tooltip.appendChild(attack);
        }

        // 能力表示
        if (enemy.abilities && enemy.abilities.length > 0) {
            const abilities = document.createElement('div');
            abilities.className = 'unit-hover-stat';
            abilities.textContent = `能力: ${enemy.abilities.slice(0, 2).join(', ')}`;
            abilities.style.color = '#ed8936';
            abilities.style.fontSize = '0.9em';
            tooltip.appendChild(abilities);
        }

        // スキル表示（最大3つまで）
        if (enemy.learnedSkills && enemy.learnedSkills.length > 0) {
            const skillsDiv = document.createElement('div');
            skillsDiv.className = 'unit-hover-skills';
            skillsDiv.textContent = `スキル: `;
            const skillNames = enemy.learnedSkills.slice(0, 3).map(s => s.name).join(', ');
            skillsDiv.textContent += skillNames;
            if (enemy.learnedSkills.length > 3) {
                skillsDiv.textContent += ` +${enemy.learnedSkills.length - 3}`;
            }
            skillsDiv.style.color = '#9f7aea';
            skillsDiv.style.fontSize = '0.9em';
            tooltip.appendChild(skillsDiv);
        }

        tooltip.appendChild(reward);
    }

    positionUnitHoverTooltip(tooltip, mouseX, mouseY) {
        // キャンバスの位置を取得
        const canvas = document.getElementById('game-canvas');
        const canvasRect = canvas.getBoundingClientRect();

        // キャンバス座標をスクリーン座標に変換
        const scaleX = canvasRect.width / canvas.width;
        const scaleY = canvasRect.height / canvas.height;
        const screenX = canvasRect.left + mouseX * scaleX;
        const screenY = canvasRect.top + mouseY * scaleY;

        // ツールチップの位置を設定（マウスの右下）
        const offsetX = 15;
        const offsetY = 15;
        tooltip.style.left = `${screenX + offsetX}px`;
        tooltip.style.top = `${screenY + offsetY}px`;

        // 画面外に出ないように調整
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = `${screenX - tooltipRect.width - offsetX}px`;
        }
        if (tooltipRect.bottom > window.innerHeight) {
            tooltip.style.top = `${screenY - tooltipRect.height - offsetY}px`;
        }
    }

    updateUnitHoverTooltipPosition(mouseX, mouseY) {
        const tooltip = document.getElementById('unit-hover-tooltip');
        if (tooltip) {
            this.positionUnitHoverTooltip(tooltip, mouseX, mouseY);
        }
    }

    hideUnitHoverTooltip() {
        const tooltip = document.getElementById('unit-hover-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
}
