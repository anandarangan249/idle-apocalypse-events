// ============================================
// IDLE EVENT GAME ENGINE
// ============================================
// Generic engine that works with any EVENT_CONFIG
// To create a new event, only modify the event config file

class IdleEventEngine {
    constructor(config) {
        this.config = config;
        this.state = this.createInitialState();
        this.creatureStates = this.createCreatureStates();
        this.intervals = [];
        this.isRunning = false;
    }

    // ============================================
    // STATE INITIALIZATION
    // ============================================

    createInitialState() {
        const resources = {};
        this.config.resources.forEach(r => {
            resources[r.id] = 0;
        });

        return {
            resources,
            totalDamage: 0,
            eventStartTime: null,
            lastUpdate: Date.now()
        };
    }

    createCreatureStates() {
        const states = {};
        this.config.creatures.forEach(creature => {
            states[creature.id] = {
                level: creature.unlockedByDefault ? 1 : 0,
                unlocked: creature.unlockedByDefault,
                currentProgress: 0
            };
        });
        return states;
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    formatNumber(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return Math.floor(num).toString();
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatCost(cost) {
        const parts = [];
        this.config.resources.forEach(resource => {
            if (cost[resource.id]) {
                parts.push(`${this.formatNumber(cost[resource.id])} ${this.renderIcon(resource.icon, 'cost-icon')}`);
            }
        });
        return parts.join(' + ');
    }

    getResourceIcon(resourceId) {
        const resource = this.config.resources.find(r => r.id === resourceId);
        return resource ? this.renderIcon(resource.icon, 'resource-icon-small') : '?';
    }

    // Render icon - supports both image paths and emoji fallback
    renderIcon(icon, className = '') {
        if (icon && (icon.endsWith('.png') || icon.endsWith('.jpg') || icon.endsWith('.gif') || icon.endsWith('.webp'))) {
            return `<img src="${icon}" alt="" class="${className}">`;
        }
        return `<span class="${className}">${icon}</span>`;
    }

    // ============================================
    // RESOURCE MANAGEMENT
    // ============================================

    canAfford(cost) {
        for (const resourceId in cost) {
            if (this.state.resources[resourceId] < cost[resourceId]) {
                return false;
            }
        }
        return true;
    }

    spendResources(cost) {
        for (const resourceId in cost) {
            this.state.resources[resourceId] -= cost[resourceId];
        }
    }

    // ============================================
    // RANK/TIER SYSTEM
    // ============================================

    getCurrentRank() {
        for (const tier of this.config.rewardTiers) {
            if (this.state.totalDamage >= tier.damage) {
                return tier;
            }
        }
        return this.config.rewardTiers[this.config.rewardTiers.length - 1];
    }

    getNextRank() {
        const currentRank = this.getCurrentRank();
        const currentIndex = this.config.rewardTiers.findIndex(t => t.rank === currentRank.rank);
        if (currentIndex > 0) {
            return this.config.rewardTiers[currentIndex - 1];
        }
        return null;
    }

    // ============================================
    // CREATURE SYSTEM
    // ============================================

    getCreatureConfig(creatureId) {
        return this.config.creatures.find(c => c.id === creatureId);
    }

    getCreatureState(creatureId) {
        return this.creatureStates[creatureId];
    }

    getCreatureProduction(creatureId) {
        const config = this.getCreatureConfig(creatureId);
        const state = this.getCreatureState(creatureId);
        if (!state.unlocked || state.level === 0) return 0;
        return config.productionByLevel[state.level - 1];
    }

    getCreatureDamage(creatureId) {
        const config = this.getCreatureConfig(creatureId);
        const state = this.getCreatureState(creatureId);
        if (!state.unlocked || state.level === 0) return 0;
        return config.damageByLevel[state.level - 1];
    }

    getUpgradeCost(creatureId) {
        const config = this.getCreatureConfig(creatureId);
        const state = this.getCreatureState(creatureId);

        if (!state.unlocked) {
            return config.unlockCost;
        }
        if (state.level >= config.maxLevel) {
            return null;
        }
        return config.upgradeCosts[state.level - 1];
    }

    upgradeCreature(creatureId) {
        const state = this.getCreatureState(creatureId);
        const cost = this.getUpgradeCost(creatureId);

        if (!cost || !this.canAfford(cost)) return false;

        this.spendResources(cost);

        if (!state.unlocked) {
            state.unlocked = true;
            state.level = 1;
        } else {
            state.level++;
        }

        this.updateUI();
        this.saveGame();
        return true;
    }

    processCreature(creatureId, deltaTime) {
        const config = this.getCreatureConfig(creatureId);
        const state = this.getCreatureState(creatureId);

        if (!state.unlocked || state.level === 0) return;

        state.currentProgress += deltaTime;

        while (state.currentProgress >= config.spawnTime) {
            state.currentProgress -= config.spawnTime;

            // Produce resources
            const production = this.getCreatureProduction(creatureId);
            this.state.resources[config.produces] += production;

            // Deal damage
            const damage = this.getCreatureDamage(creatureId);
            this.state.totalDamage += damage;
        }
    }

    // ============================================
    // GAME LOOP
    // ============================================

    gameLoop() {
        const now = Date.now();
        const deltaTime = now - this.state.lastUpdate;
        this.state.lastUpdate = now;

        // Process all creatures
        this.config.creatures.forEach(creature => {
            this.processCreature(creature.id, deltaTime);
        });

        this.updateUI();
    }

    // ============================================
    // UI RENDERING
    // ============================================

    renderResourcesBar() {
        return this.config.resources.map(resource => `
            <div class="resource ${resource.id}">
                ${this.renderIcon(resource.icon, 'resource-icon')}
                <span class="resource-name">${resource.name}</span>
                <span id="${resource.id}-count" class="resource-count" style="color: ${resource.color}">0</span>
            </div>
        `).join('');
    }

    renderCreatureCard(creature) {
        const state = this.getCreatureState(creature.id);
        const lockedClass = state.unlocked ? 'unlocked' : 'locked';
        const btnClass = state.unlocked ? 'upgrade-btn' : 'upgrade-btn unlock-btn';
        const btnText = state.unlocked ? 'Upgrade' : 'Unlock';

        return `
            <div class="creature-card ${lockedClass}" id="${creature.id}-card">
                <div class="creature-info">
                    <div class="creature-avatar">
                        ${this.renderIcon(creature.icon, '')}
                    </div>
                    <div class="creature-details">
                        <h3>${creature.name}</h3>
                        <p class="creature-level">LV <span id="${creature.id}-level">${state.level}</span>/${creature.maxLevel}</p>
                        <p class="creature-production">
                            +<span id="${creature.id}-production">0</span> ${this.getResourceIcon(creature.produces)} /${creature.spawnTime / 1000}s
                        </p>
                        <p class="creature-damage">
                            DMG: <span id="${creature.id}-damage">0</span>
                        </p>
                    </div>
                </div>
                <div class="creature-progress">
                    <div id="${creature.id}-progress-bar" class="spawn-progress-bar"></div>
                </div>
                <button id="${creature.id}-upgrade-btn" class="${btnClass}">
                    ${btnText}<br>
                    <span id="${creature.id}-cost">-</span>
                </button>
            </div>
        `;
    }

    renderRewardTiers() {
        return this.config.rewardTiers.map(tier => `
            <div class="reward-tier" data-tier="${tier.rank}" title="${tier.rewards}">
                ${tier.label}: ${this.formatNumber(tier.damage)} damage
            </div>
        `).join('');
    }

    renderGame(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <!-- Header with Timer -->
            <header class="event-header">
                <h1>${this.config.name}</h1>
                <div class="timer-container">
                    <span class="timer-label">Time Remaining:</span>
                    <span id="event-timer" class="timer">${this.formatTime(this.config.duration)}</span>
                </div>
                <button id="reset-btn" class="reset-btn" title="Restart Event">Restart</button>
            </header>

            <!-- Resources Bar -->
            <section class="resources-bar">
                ${this.renderResourcesBar()}
            </section>

            <!-- Damage & Progress Section -->
            <section class="damage-section">
                <div class="damage-display">
                    <span class="damage-label">Total Damage:</span>
                    <span id="total-damage" class="damage-value">0</span>
                </div>
                <div class="current-tier">
                    <span class="tier-label">Current Rank:</span>
                    <span id="current-rank" class="tier-value">9th</span>
                </div>
                <div class="next-tier">
                    <span id="next-tier-info">Next: 500K damage for 8th place</span>
                </div>
                <div class="damage-progress">
                    <div id="damage-progress-bar" class="progress-bar"></div>
                </div>
            </section>

            <!-- Creatures Section -->
            <section class="creatures-section">
                <h2>Champions</h2>
                ${this.config.creatures.map(c => this.renderCreatureCard(c)).join('')}
            </section>

            <!-- Reward Tiers Reference -->
            <section class="rewards-section">
                <h2>Reward Tiers</h2>
                <div class="rewards-list">
                    ${this.renderRewardTiers()}
                </div>
            </section>
        `;
    }

    updateUI() {
        // Update resources
        this.config.resources.forEach(resource => {
            const el = document.getElementById(`${resource.id}-count`);
            if (el) el.textContent = this.formatNumber(this.state.resources[resource.id]);
        });

        // Update damage
        const damageEl = document.getElementById('total-damage');
        if (damageEl) damageEl.textContent = this.formatNumber(this.state.totalDamage);

        // Update rank
        const currentRank = this.getCurrentRank();
        const nextRank = this.getNextRank();

        const rankEl = document.getElementById('current-rank');
        if (rankEl) rankEl.textContent = currentRank.label;

        const nextTierEl = document.getElementById('next-tier-info');
        const progressBar = document.getElementById('damage-progress-bar');

        if (nextRank) {
            if (nextTierEl) {
                nextTierEl.textContent = `Next: ${this.formatNumber(nextRank.damage)} damage for ${nextRank.label} place`;
            }
            if (progressBar) {
                const progress = ((this.state.totalDamage - currentRank.damage) / (nextRank.damage - currentRank.damage)) * 100;
                progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
            }
        } else {
            if (nextTierEl) nextTierEl.textContent = 'Maximum rank achieved!';
            if (progressBar) progressBar.style.width = '100%';
        }

        // Update reward tier highlights
        this.updateRewardTiers();

        // Update creatures
        this.config.creatures.forEach(creature => {
            this.updateCreatureUI(creature.id);
        });
    }

    updateCreatureUI(creatureId) {
        const config = this.getCreatureConfig(creatureId);
        const state = this.getCreatureState(creatureId);

        const card = document.getElementById(`${creatureId}-card`);
        const levelSpan = document.getElementById(`${creatureId}-level`);
        const productionSpan = document.getElementById(`${creatureId}-production`);
        const damageSpan = document.getElementById(`${creatureId}-damage`);
        const progressBar = document.getElementById(`${creatureId}-progress-bar`);
        const upgradeBtn = document.getElementById(`${creatureId}-upgrade-btn`);

        if (!card) return;

        // Update card state
        if (state.unlocked) {
            card.classList.remove('locked');
            card.classList.add('unlocked');
        } else {
            card.classList.remove('unlocked');
            card.classList.add('locked');
        }

        // Update level
        if (levelSpan) levelSpan.textContent = state.level;

        // Update production
        if (productionSpan) productionSpan.textContent = this.formatNumber(this.getCreatureProduction(creatureId));

        // Update damage
        if (damageSpan) damageSpan.textContent = this.formatNumber(this.getCreatureDamage(creatureId));

        // Update progress bar
        if (progressBar) {
            if (state.unlocked && state.level > 0) {
                const progress = (state.currentProgress / config.spawnTime) * 100;
                progressBar.style.width = progress + '%';
            } else {
                progressBar.style.width = '0%';
            }
        }

        // Update upgrade button
        const cost = this.getUpgradeCost(creatureId);
        if (upgradeBtn) {
            if (!cost) {
                upgradeBtn.textContent = 'MAX';
                upgradeBtn.classList.add('max-level');
                upgradeBtn.disabled = true;
            } else {
                const btnText = state.unlocked ? 'Upgrade' : 'Unlock';
                upgradeBtn.innerHTML = `${btnText}<br><span>${this.formatCost(cost)}</span>`;

                if (state.unlocked) {
                    upgradeBtn.classList.remove('unlock-btn');
                } else {
                    upgradeBtn.classList.add('unlock-btn');
                }

                upgradeBtn.disabled = !this.canAfford(cost);
                upgradeBtn.classList.remove('max-level');
            }
        }
    }

    updateRewardTiers() {
        const tiers = document.querySelectorAll('.reward-tier');
        const currentRank = this.getCurrentRank();

        tiers.forEach(tierEl => {
            const tierRank = parseInt(tierEl.dataset.tier);
            tierEl.classList.remove('achieved', 'current');

            if (tierRank > currentRank.rank) {
                tierEl.classList.add('achieved');
            } else if (tierRank === currentRank.rank) {
                tierEl.classList.add('current');
            }
        });
    }

    updateTimer() {
        if (!this.state.eventStartTime) {
            this.state.eventStartTime = Date.now();
        }

        const elapsed = Date.now() - this.state.eventStartTime;
        const remaining = Math.max(0, this.config.duration - elapsed);

        const timerEl = document.getElementById('event-timer');
        if (timerEl) {
            timerEl.textContent = this.formatTime(remaining);

            if (remaining <= 0) {
                timerEl.textContent = 'EVENT ENDED';
                timerEl.style.color = '#888';
            }
        }
    }

    // ============================================
    // SAVE/LOAD SYSTEM
    // ============================================

    getSaveKey() {
        return `idleEvent_${this.config.id}`;
    }

    saveGame() {
        const saveData = {
            resources: this.state.resources,
            totalDamage: this.state.totalDamage,
            eventStartTime: this.state.eventStartTime,
            lastSaveTime: Date.now(),
            creatures: this.creatureStates
        };

        localStorage.setItem(this.getSaveKey(), JSON.stringify(saveData));
    }

    loadGame() {
        const saveData = localStorage.getItem(this.getSaveKey());
        if (!saveData) return;

        try {
            const data = JSON.parse(saveData);

            // Load resources
            if (data.resources) {
                for (const resourceId in data.resources) {
                    if (this.state.resources.hasOwnProperty(resourceId)) {
                        this.state.resources[resourceId] = data.resources[resourceId];
                    }
                }
            }

            this.state.totalDamage = data.totalDamage || 0;
            this.state.eventStartTime = data.eventStartTime || null;

            // Load creature states
            if (data.creatures) {
                for (const creatureId in data.creatures) {
                    if (this.creatureStates[creatureId]) {
                        this.creatureStates[creatureId] = {
                            ...this.creatureStates[creatureId],
                            ...data.creatures[creatureId]
                        };
                    }
                }
            }

            // Calculate offline progress
            if (data.lastSaveTime) {
                const offlineTime = Date.now() - data.lastSaveTime;
                this.processOfflineProgress(offlineTime);
            }
        } catch (e) {
            console.error('Failed to load save:', e);
        }
    }

    processOfflineProgress(offlineTime) {
        const maxOffline = this.config.settings.maxOfflineTime;
        const processTime = Math.min(offlineTime, maxOffline);

        this.config.creatures.forEach(creature => {
            const state = this.getCreatureState(creature.id);
            if (!state.unlocked || state.level === 0) return;

            const ticks = Math.floor(processTime / creature.spawnTime);
            const production = this.getCreatureProduction(creature.id) * ticks;
            const damage = this.getCreatureDamage(creature.id) * ticks;

            this.state.resources[creature.produces] += production;
            this.state.totalDamage += damage;
        });

        if (processTime > 60000) {
            console.log(`Processed ${Math.floor(processTime / 1000)}s of offline progress`);
        }
    }

    resetGame() {
        localStorage.removeItem(this.getSaveKey());
        this.state = this.createInitialState();
        this.creatureStates = this.createCreatureStates();
        this.updateUI();
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    setupEventListeners() {
        // Creature upgrade buttons
        this.config.creatures.forEach(creature => {
            const btn = document.getElementById(`${creature.id}-upgrade-btn`);
            if (btn) {
                btn.addEventListener('click', () => this.upgradeCreature(creature.id));
            }
        });

        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to restart? All progress will be lost!')) {
                    this.resetGame();
                    location.reload();
                }
            });
        }
    }

    // ============================================
    // ENGINE CONTROL
    // ============================================

    start(containerId) {
        // Render the game
        this.renderGame(containerId);

        // Load saved state
        this.loadGame();

        // Setup event listeners
        this.setupEventListeners();

        // Initial UI update
        this.updateUI();
        this.updateTimer();

        // Start game loop
        const tickRate = this.config.settings.tickRate || 60;
        this.intervals.push(
            setInterval(() => this.gameLoop(), 1000 / tickRate)
        );

        // Timer update
        this.intervals.push(
            setInterval(() => this.updateTimer(), 1000)
        );

        // Auto-save
        const saveInterval = this.config.settings.saveInterval || 30000;
        this.intervals.push(
            setInterval(() => this.saveGame(), saveInterval)
        );

        this.isRunning = true;
        console.log(`${this.config.name} event started!`);
    }

    stop() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.isRunning = false;
        this.saveGame();
        console.log(`${this.config.name} event stopped.`);
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Global game instance
let game = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check if EVENT_CONFIG is defined (loaded from event config file)
    if (typeof EVENT_CONFIG === 'undefined') {
        console.error('EVENT_CONFIG not found! Make sure to load an event config file before game.js');
        return;
    }

    // Create and start the game
    game = new IdleEventEngine(EVENT_CONFIG);
    game.start('game-container');
});
