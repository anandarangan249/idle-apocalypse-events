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
        this.boostStates = this.createBoostStates();
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

    createBoostStates() {
        const states = {};
        if (this.config.boosts) {
            this.config.boosts.forEach(boost => {
                states[boost.id] = { level: 0 };
            });
        }
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

    formatRate(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        if (num >= 10) return num.toFixed(1);
        return num.toFixed(2).replace(/\.?0+$/, '');
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
        return config.productionByLevel[state.level - 1] + this.getProductionBonus(config.produces);
    }

    getCreatureDamage(creatureId) {
        const config = this.getCreatureConfig(creatureId);
        const state = this.getCreatureState(creatureId);
        if (!state.unlocked || state.level === 0) return 0;
        return Math.floor(config.damageByLevel[state.level - 1] * this.getDamageMultiplier());
    }

    getResourceRate(resourceId) {
        let rate = 0;
        this.config.creatures.forEach(creature => {
            if (creature.produces !== resourceId) return;
            const state = this.getCreatureState(creature.id);
            if (!state.unlocked || state.level === 0) return;
            rate += this.getCreatureProduction(creature.id) / (this.getEffectiveSpawnTime(creature) / 1000);
        });
        return rate;
    }

    getTotalDamageRate() {
        let rate = 0;
        this.config.creatures.forEach(creature => {
            const state = this.getCreatureState(creature.id);
            if (!state.unlocked || state.level === 0) return;
            rate += this.getCreatureDamage(creature.id) / (this.getEffectiveSpawnTime(creature) / 1000);
        });
        return rate;
    }

    // ============================================
    // BOOST SYSTEM
    // ============================================

    getBoostConfig(boostId) {
        return this.config.boosts ? this.config.boosts.find(b => b.id === boostId) : null;
    }

    getBoostState(boostId) {
        return this.boostStates[boostId];
    }

    getProductionBonus(resourceId) {
        if (!this.config.boosts) return 0;
        let bonus = 0;
        this.config.boosts.forEach(boost => {
            if (boost.type === 'production-bonus' && boost.resource === resourceId) {
                const level = this.boostStates[boost.id]?.level || 0;
                if (level > 0) bonus = boost.bonusByLevel[level - 1];
            }
        });
        return bonus;
    }

    getSpeedMultiplier() {
        if (!this.config.boosts) return 1;
        const speedBoost = this.config.boosts.find(b => b.type === 'speed');
        if (!speedBoost) return 1;
        const level = this.boostStates[speedBoost.id]?.level || 0;
        if (level === 0) return 1;
        return 1 - speedBoost.bonusByLevel[level - 1];
    }

    getDamageMultiplier() {
        if (!this.config.boosts) return 1;
        const dmgBoost = this.config.boosts.find(b => b.type === 'damage');
        if (!dmgBoost) return 1;
        const level = this.boostStates[dmgBoost.id]?.level || 0;
        if (level === 0) return 1;
        return 1 + dmgBoost.bonusByLevel[level - 1];
    }

    getEffectiveSpawnTime(creature) {
        return creature.spawnTime * this.getSpeedMultiplier();
    }

    getBoostUpgradeCost(boostId) {
        const config = this.getBoostConfig(boostId);
        if (!config) return null;
        const state = this.getBoostState(boostId);
        if (state.level >= config.maxLevel) return null;
        return config.costs[state.level];
    }

    upgradeBoost(boostId) {
        const cost = this.getBoostUpgradeCost(boostId);
        if (!cost || !this.canAfford(cost)) return false;
        this.spendResources(cost);
        this.boostStates[boostId].level++;
        this.updateUI();
        this.saveGame();
        return true;
    }

    getBoostEffectText(boost, level) {
        if (level === 0) return 'Not purchased';
        if (boost.type === 'production-bonus') {
            const resourceName = boost.resource.charAt(0).toUpperCase() + boost.resource.slice(1);
            return `+${boost.bonusByLevel[level - 1]} ${resourceName} per spawn`;
        }
        if (boost.type === 'speed') {
            return `-${boost.bonusByLevel[level - 1] * 100}% spawn time`;
        }
        if (boost.type === 'damage') {
            return `+${boost.bonusByLevel[level - 1] * 100}% damage`;
        }
        return '-';
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

        const effectiveSpawnTime = this.getEffectiveSpawnTime(config);
        while (state.currentProgress >= effectiveSpawnTime) {
            state.currentProgress -= effectiveSpawnTime;

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
                <span id="${resource.id}-rate" class="resource-rate">+0/s</span>
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
                            +<span id="${creature.id}-production">0</span> ${this.getResourceIcon(creature.produces)} /<span id="${creature.id}-spawn-time">${creature.spawnTime / 1000}s</span>
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

    renderBoostCard(boost) {
        const state = this.boostStates[boost.id];
        const cost = this.getBoostUpgradeCost(boost.id);
        const isMax = state.level >= boost.maxLevel;

        const pips = Array.from({length: boost.maxLevel}, (_, i) =>
            `<span class="level-pip${i < state.level ? ' filled' : ''}"></span>`
        ).join('');

        return `
            <div class="boost-card" id="${boost.id}-card">
                <div class="boost-icon-frame">
                    ${boost.icon ? this.renderIcon(boost.icon, 'boost-icon-img') : '<span class="boost-icon-fallback">⚡</span>'}
                </div>
                <div class="boost-body">
                    <div class="boost-header-row">
                        <span class="boost-name">${boost.name}</span>
                        <div class="boost-pips" id="${boost.id}-pips">${pips}</div>
                    </div>
                    <p class="boost-desc">${boost.description}</p>
                    <p id="${boost.id}-effect" class="boost-effect">${this.getBoostEffectText(boost, state.level)}</p>
                </div>
                <div class="boost-action">
                    <button id="${boost.id}-btn" class="boost-buy-btn${isMax ? ' max-level' : ''}" ${isMax || !this.canAfford(cost) ? 'disabled' : ''}>
                        ${isMax ? 'MAX' : 'BUY'}
                    </button>
                    <span id="${boost.id}-cost" class="boost-cost-label">${!isMax && cost ? this.formatCost(cost) : ''}</span>
                </div>
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
                    <span id="damage-rate" class="damage-rate">+0 DPS</span>
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

            <!-- Shop Section -->
            ${this.config.boosts ? `
            <section class="shop-section">
                <h2>Shop</h2>
                <div class="boosts-list">
                    ${this.config.boosts.map(b => this.renderBoostCard(b)).join('')}
                </div>
            </section>` : ''}

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
        // Update resources and their rates
        this.config.resources.forEach(resource => {
            const countEl = document.getElementById(`${resource.id}-count`);
            if (countEl) countEl.textContent = this.formatNumber(this.state.resources[resource.id]);

            const rateEl = document.getElementById(`${resource.id}-rate`);
            if (rateEl) rateEl.textContent = '+' + this.formatRate(this.getResourceRate(resource.id)) + '/s';
        });

        // Update damage and DPS
        const damageEl = document.getElementById('total-damage');
        if (damageEl) damageEl.textContent = this.formatNumber(this.state.totalDamage);

        const dpsEl = document.getElementById('damage-rate');
        if (dpsEl) dpsEl.textContent = '+' + this.formatRate(this.getTotalDamageRate()) + ' DPS';

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

        // Update shop boosts
        this.updateBoostUI();
    }

    updateBoostUI() {
        if (!this.config.boosts) return;
        this.config.boosts.forEach(boost => {
            const state = this.boostStates[boost.id];
            const cost = this.getBoostUpgradeCost(boost.id);
            const isMax = state.level >= boost.maxLevel;

            // Update level pips
            const pipsEl = document.getElementById(`${boost.id}-pips`);
            if (pipsEl) {
                pipsEl.innerHTML = Array.from({length: boost.maxLevel}, (_, i) =>
                    `<span class="level-pip${i < state.level ? ' filled' : ''}"></span>`
                ).join('');
            }

            // Update effect text
            const effectEl = document.getElementById(`${boost.id}-effect`);
            if (effectEl) effectEl.textContent = this.getBoostEffectText(boost, state.level);

            // Update cost label
            const costLabel = document.getElementById(`${boost.id}-cost`);
            if (costLabel) {
                costLabel.innerHTML = (!isMax && cost) ? this.formatCost(cost) : '';
            }

            // Update button
            const btn = document.getElementById(`${boost.id}-btn`);
            if (btn) {
                if (isMax) {
                    btn.textContent = 'MAX';
                    btn.classList.add('max-level');
                    btn.disabled = true;
                } else {
                    btn.textContent = 'BUY';
                    btn.classList.remove('max-level');
                    btn.disabled = !this.canAfford(cost);
                }
            }
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
                const progress = (state.currentProgress / this.getEffectiveSpawnTime(config)) * 100;
                progressBar.style.width = progress + '%';
            } else {
                progressBar.style.width = '0%';
            }
        }

        // Update spawn time display
        const spawnTimeSpan = document.getElementById(`${creatureId}-spawn-time`);
        if (spawnTimeSpan) {
            spawnTimeSpan.textContent = (this.getEffectiveSpawnTime(config) / 1000).toFixed(1) + 's';
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
        const timerEl = document.getElementById('event-timer');
        if (!timerEl) return;

        if (!this.state.eventStartTime) {
            timerEl.textContent = this.formatTime(this.config.duration);
            return;
        }

        const elapsed = Date.now() - this.state.eventStartTime;
        const remaining = Math.max(0, this.config.duration - elapsed);

        if (remaining <= 0) {
            timerEl.textContent = 'EVENT ENDED';
            timerEl.style.color = '#888';
        } else {
            timerEl.textContent = this.formatTime(remaining);
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
            creatures: this.creatureStates,
            boosts: this.boostStates
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

            // Load boost states (must be before offline progress so boosts apply)
            if (data.boosts) {
                for (const boostId in data.boosts) {
                    if (this.boostStates[boostId]) {
                        this.boostStates[boostId] = {
                            ...this.boostStates[boostId],
                            ...data.boosts[boostId]
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

            const ticks = Math.floor(processTime / this.getEffectiveSpawnTime(creature));
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
        this.boostStates = this.createBoostStates();
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

        // Boost buttons
        if (this.config.boosts) {
            this.config.boosts.forEach(boost => {
                const btn = document.getElementById(`${boost.id}-btn`);
                if (btn) btn.addEventListener('click', () => this.upgradeBoost(boost.id));
            });
        }

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

    // Phase 1: render UI and load save — does NOT start loops
    initialize(containerId) {
        this.renderGame(containerId);
        this.loadGame();
        this.setupEventListeners();
        this.updateUI();
        this.updateTimer();
    }

    // Phase 2: start the game loops (call after player confirms via popup)
    beginEventLoop() {
        if (!this.state.eventStartTime) {
            this.state.eventStartTime = Date.now();
        }

        const tickRate = this.config.settings.tickRate || 60;
        this.intervals.push(
            setInterval(() => this.gameLoop(), 1000 / tickRate)
        );

        this.intervals.push(
            setInterval(() => this.updateTimer(), 1000)
        );

        const saveInterval = this.config.settings.saveInterval || 30000;
        this.intervals.push(
            setInterval(() => this.saveGame(), saveInterval)
        );

        this.isRunning = true;
        console.log(`${this.config.name} event started!`);
    }

    // Combined: initialize + begin (kept for convenience)
    start(containerId) {
        this.initialize(containerId);
        this.beginEventLoop();
    }

    stop() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.isRunning = false;
        this.saveGame();
        console.log(`${this.config.name} event stopped.`);
    }
}
