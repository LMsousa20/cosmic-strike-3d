/* ==========================================================================
   HUD & UI MANAGER (CONEXÃO DA INTERFACE HTML COM O MOTOR 3D)
   ========================================================================== */
export class Hud {
  constructor(gameState, onSelectShip, onBuyShip, onDeployWingman, onDetonateBomb, onBuyBomb, onStartGame, onRestartGame) {
    this.gameState = gameState;
    this.onSelectShip = onSelectShip;
    this.onBuyShip = onBuyShip;
    this.onDeployWingman = onDeployWingman;
    this.onDetonateBomb = onDetonateBomb;
    this.onBuyBomb = onBuyBomb;
    this.onStartGame = onStartGame;
    this.onRestartGame = onRestartGame;

    // Cache de Elementos DOM
    this.coinCount = document.getElementById('ui-coin-count');
    this.hpBar = document.getElementById('ui-hp-bar');
    this.hpText = document.getElementById('ui-hp-text');
    this.shieldBar = document.getElementById('ui-shield-bar');
    this.shieldText = document.getElementById('ui-shield-text');
    this.weaponBar = document.getElementById('ui-weapon-bar');
    this.weaponText = document.getElementById('ui-weapon-text');
    this.stageBadge = document.getElementById('ui-stage-badge');
    this.touchBombCount = document.getElementById('touch-bomb-count');

    // Boss HUD
    this.bossHudBar = document.getElementById('boss-hud-bar');
    this.bossTitle = document.getElementById('boss-hud-title');
    this.bossHpFill = document.getElementById('boss-hud-hp-fill');
    this.bossWarning = document.getElementById('boss-warning-overlay');
    this.toastEl = document.getElementById('toast-notification');
    this.touchWingmanCost = document.getElementById('touch-wingman-cost');
    this._toastTimer = null;

    // Modais
    this.screenMenu = document.getElementById('screen-main-menu');
    this.screenPause = document.getElementById('screen-pause');
    this.screenGameOver = document.getElementById('screen-game-over');
    this.finalScoreEl = document.getElementById('gameover-score');
    this.finalCoinsEl = document.getElementById('gameover-coins');

    // Seletor de Naves no Hangar
    this.shipCarouselIdx = 0;
    this.availableShips = gameState.config.ships || [];

    this.bindButtons();
    this.updateAll();
  }

  bindButtons() {
    // Touch Bomba e Wingman
    document.getElementById('btn-touch-bomb')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onDetonateBomb();
    });

    document.getElementById('btn-touch-wingman')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onDeployWingman();
    });

    // Hangar Sidebar Botões
    document.getElementById('ui-btn-wingman')?.addEventListener('click', () => this.onDeployWingman());
    document.getElementById('ui-btn-buy-bomb')?.addEventListener('click', () => this.onBuyBomb());

    // Upgrades Permanentes
    document.getElementById('btn-up-hp')?.addEventListener('click', () => {
      if (this.gameState.upgradePermanent('hpLevel')) this.updateAll();
    });
    document.getElementById('btn-up-speed')?.addEventListener('click', () => {
      if (this.gameState.upgradePermanent('speedLevel')) this.updateAll();
    });
    document.getElementById('btn-up-magnet')?.addEventListener('click', () => {
      if (this.gameState.upgradePermanent('magnetLevel')) this.updateAll();
    });

    // Carrossel de Naves
    document.getElementById('btn-ship-prev')?.addEventListener('click', () => {
      this.shipCarouselIdx = (this.shipCarouselIdx - 1 + this.availableShips.length) % this.availableShips.length;
      this.updateShipCard();
    });
    document.getElementById('btn-ship-next')?.addEventListener('click', () => {
      this.shipCarouselIdx = (this.shipCarouselIdx + 1) % this.availableShips.length;
      this.updateShipCard();
    });

    document.getElementById('btn-ship-action')?.addEventListener('click', () => {
      const ship = this.availableShips[this.shipCarouselIdx];
      if (!ship) return;
      const isUnlocked = this.gameState.unlockedShipIds.includes(ship.id);

      if (isUnlocked) {
        this.gameState.selectedShipId = ship.id;
        this.gameState.calculateStats();
        this.gameState.saveGame();
        this.onSelectShip(ship);
        this.updateAll();
      } else {
        if (this.gameState.spendCoins(ship.price)) {
          this.gameState.unlockedShipIds.push(ship.id);
          this.gameState.selectedShipId = ship.id;
          this.gameState.calculateStats();
          this.gameState.saveGame();
          this.onBuyShip(ship);
          this.updateAll();
        }
      }
    });

    // Botões dos Modais
    document.getElementById('btn-menu-play')?.addEventListener('click', () => {
      this.screenMenu.classList.add('hidden');
      this.onStartGame();
    });

    document.getElementById('btn-pause-resume')?.addEventListener('click', () => {
      this.hidePause();
    });

    document.getElementById('btn-gameover-restart')?.addEventListener('click', () => {
      this.screenGameOver.classList.add('hidden');
      this.onRestartGame();
    });

    // Gaveta Drawer Mobile
    const hangarSidebar = document.getElementById('hangar-sidebar');
    document.getElementById('mobile-hangar-toggle')?.addEventListener('click', () => {
      hangarSidebar?.classList.add('open');
    });
    document.getElementById('btn-close-hangar')?.addEventListener('click', () => {
      hangarSidebar?.classList.remove('open');
    });
  }

  showBossWarning(text) {
    if (this.bossWarning) {
      this.bossWarning.innerHTML = `⚠️ ALERTA MÁXIMO ⚠️<br><span style="font-size: 11px; color: #ffd700;">${text}</span>`;
      this.bossWarning.classList.add('active');
      setTimeout(() => this.bossWarning.classList.remove('active'), 3200);
    }
  }

  showToast(text, color = '#00f0ff') {
    if (!this.toastEl) return;
    this.toastEl.innerText = text;
    this.toastEl.style.borderColor = color;
    this.toastEl.classList.remove('hidden');

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.add('hidden');
    }, 1400);
  }

  setBossHud(boss) {
    if (!boss || boss.isDead) {
      if (this.bossHudBar) this.bossHudBar.style.display = 'none';
      return;
    }
    if (this.bossHudBar) this.bossHudBar.style.display = 'flex';
    if (this.bossTitle) this.bossTitle.innerText = `⚠️ CHEFÃO: ${boss.def.name.toUpperCase()}`;
    if (this.bossHpFill) {
      const pct = Math.max(0, (boss.hp / boss.maxHp) * 100);
      this.bossHpFill.style.width = pct + '%';
    }
  }

  showGameOver(score, coins) {
    if (this.finalScoreEl) this.finalScoreEl.innerText = score;
    if (this.finalCoinsEl) this.finalCoinsEl.innerText = coins;
    this.screenGameOver.classList.remove('hidden');
  }

  showPause() {
    this.screenPause.classList.remove('hidden');
  }

  hidePause() {
    this.screenPause.classList.add('hidden');
  }

  updateShipCard() {
    const ship = this.availableShips[this.shipCarouselIdx];
    if (!ship) return;

    const nameEl = document.getElementById('ship-card-name');
    const descEl = document.getElementById('ship-card-desc');
    const actionBtn = document.getElementById('btn-ship-action');

    if (nameEl) nameEl.innerText = ship.name;
    if (descEl) descEl.innerText = ship.description || `HP: ${ship.hp} | Vel: ${ship.speed}x`;

    const isUnlocked = this.gameState.unlockedShipIds.includes(ship.id);
    const isSelected = this.gameState.selectedShipId === ship.id;

    if (actionBtn) {
      if (isSelected) {
        actionBtn.innerText = 'SELECIONADA';
        actionBtn.className = 'ship-btn-select';
        actionBtn.disabled = true;
      } else if (isUnlocked) {
        actionBtn.innerText = 'ESCOLHER';
        actionBtn.className = 'ship-btn-select';
        actionBtn.disabled = false;
      } else {
        actionBtn.innerText = `DESBLOQUEAR (${ship.price} 🪙)`;
        actionBtn.className = 'ship-btn-buy';
        actionBtn.disabled = this.gameState.coins < ship.price;
      }
    }
  }

  updateCoins(coins) {
    if (this.coinCount) this.coinCount.innerText = coins;
  }

  updateAll() {
    // Moedas
    if (this.coinCount) this.coinCount.innerText = this.gameState.coins;

    // HP
    const hpPct = Math.max(0, (this.gameState.currentHp / this.gameState.maxHp) * 100);
    if (this.hpBar) {
      this.hpBar.style.width = hpPct + '%';
      if (hpPct < 30) this.hpBar.style.background = '#ef4444';
      else if (hpPct < 60) this.hpBar.style.background = '#f59e0b';
      else this.hpBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    }
    if (this.hpText) this.hpText.innerText = `${Math.ceil(this.gameState.currentHp)} / ${this.gameState.maxHp}`;

    // Escudo
    const sHits = this.gameState.shieldHits;
    if (this.shieldBar) this.shieldBar.style.width = (sHits / 3 * 100) + '%';
    if (this.shieldText) this.shieldText.innerText = sHits > 0 ? `${sHits} CARGAS` : 'DESATIVADO';

    // Arma
    const wLvl = this.gameState.weaponLevel;
    const wNames = [
      'NÍVEL 1 (DUPLO)',
      'NÍVEL 2 (TRIPLO EM LEQUE)',
      'NÍVEL 3 (TURBO QUÁDRUPLO)',
      'NÍVEL 4 (5-WAY + MÍSSEIS)',
      'NÍVEL 5 (OVERDRIVE MÁXIMO)'
    ];
    if (this.weaponBar) this.weaponBar.style.width = (wLvl * 20) + '%';
    if (this.weaponText) this.weaponText.innerText = wNames[wLvl - 1] || 'OVERDRIVE';

    // Bombas
    if (this.touchBombCount) this.touchBombCount.innerText = `x${this.gameState.bombs}`;

    // Atualiza botões de upgrades permanentes
    this.updateUpgradeButton('btn-up-hp', 'cost-hp', 'lvl-hp', 'hpLevel', this.gameState.economy.hpUpgradePrice || 300);
    this.updateUpgradeButton('btn-up-speed', 'cost-speed', 'lvl-speed', 'speedLevel', this.gameState.economy.speedUpgradePrice || 250);
    this.updateUpgradeButton('btn-up-magnet', 'cost-magnet', 'lvl-magnet', 'magnetLevel', this.gameState.economy.magnetUpgradePrice || 200);

    // Botão de Reforço Acumulativo Exponencial
    const btnWingman = document.getElementById('ui-btn-wingman');
    const costText = document.getElementById('wingman-cost-text');
    const wingmanCount = this.gameState.wingmanActiveCount || 0;
    const wingmanCost = this.gameState.getWingmanCost();
    const maxWingman = 8;

    if (btnWingman) {
      const activeLabel = wingmanCount > 0 ? ` (x${wingmanCount} ATIVO)` : '';
      const labelSpan = btnWingman.querySelector('span:first-child');
      if (labelSpan) {
        labelSpan.innerHTML = `🚀 <kbd class="kbd-hint">R</kbd> REFORÇO${activeLabel}`;
      }
      if (costText) {
        costText.innerText = wingmanCount >= maxWingman ? 'MÁX (8)' : `${wingmanCost} 🪙`;
      }
      btnWingman.disabled = (this.gameState.coins < wingmanCost || wingmanCount >= maxWingman);
    }

    if (this.touchWingmanCost) {
      this.touchWingmanCost.innerText = wingmanCount >= maxWingman ? 'MAX' : `${wingmanCost}`;
    }

    const btnBuyBomb = document.getElementById('ui-btn-buy-bomb');
    if (btnBuyBomb) {
      btnBuyBomb.disabled = (this.gameState.coins < (this.gameState.economy.bombPrice || 250) || this.gameState.bombs >= (this.gameState.economy.maxBombs || 5));
    }

    this.updateShipCard();
  }

  updateUpgradeButton(btnId, costId, lvlId, key, baseCost) {
    const btn = document.getElementById(btnId);
    const costEl = document.getElementById(costId);
    const lvlEl = document.getElementById(lvlId);
    const lvl = this.gameState.upgrades[key] || 1;
    const maxLvl = this.gameState.economy.upgradeMaxLevel || 5;

    let cost = baseCost * lvl;
    if (this.gameState.economy.costMode === 'exponential') {
      cost = Math.round(baseCost * Math.pow(this.gameState.economy.costGrowth || 1.6, lvl - 1));
    }

    if (lvlEl) lvlEl.innerText = `(Nv. ${lvl})`;
    if (costEl) costEl.innerText = lvl >= maxLvl ? 'MÁXIMO' : `${cost} 🪙`;
    if (btn) btn.disabled = (this.gameState.coins < cost || lvl >= maxLvl);
  }
}
