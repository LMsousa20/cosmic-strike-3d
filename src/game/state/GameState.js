import { upgradeCost } from '../../shared/schema.js';

/* ==========================================================================
   GAME STATE & PROGRESSION (PERSISTÊNCIA LOCALSTORAGE)
   Gerencia moedas, upgrades, naves desbloqueadas, status da partida e economia.
   ========================================================================== */
export class GameState {
  constructor(config) {
    this.config = config;
    this.economy = config.economy;

    // Estado persistente
    this.coins = 0;
    this.highScore = 0;
    this.selectedShipId = 'falcon';
    this.unlockedShipIds = ['falcon'];

    this.upgrades = {
      hpLevel: 1,
      speedLevel: 1,
      magnetLevel: 1,
      damageLevel: 1
    };

    // Estado da partida em andamento
    this.score = 0;
    this.currentStageIndex = 0;
    this.bombs = this.economy.startBombs || 2;
    this.shieldHits = 0;
    this.weaponLevel = 1;
    this.currentHp = 100;
    this.maxHp = 100;
    this.comboCount = 0;
    this.comboMultiplier = 1;

    // Wingman Esquadrão Acumulativo
    this.wingmanActiveCount = 0;

    this._saveTimer = null;

    this.loadSave();
    this.calculateStats();
  }

  loadSave() {
    try {
      const saved = localStorage.getItem('cosmic_strike_3d_save');
      if (saved) {
        const data = JSON.parse(saved);
        this.coins = data.coins ?? this.economy.startingCoins ?? 0;
        this.highScore = data.highScore || 0;
        this.selectedShipId = data.selectedShipId || 'falcon';
        this.unlockedShipIds = data.unlockedShipIds || ['falcon'];
        this.upgrades = Object.assign(this.upgrades, data.upgrades || {});
      } else {
        this.coins = this.economy.startingCoins || 0;
      }
    } catch (e) {
      console.warn('Erro ao carregar save:', e);
    }

    // Garante que naves desbloqueadas por padrão estejam na lista
    for (const ship of this.config.ships || []) {
      if (ship.unlockedByDefault && !this.unlockedShipIds.includes(ship.id)) {
        this.unlockedShipIds.push(ship.id);
      }
    }
  }

  requestSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.saveGame();
    }, 1500);
  }

  saveGame() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    try {
      const data = {
        coins: this.coins,
        highScore: this.highScore,
        selectedShipId: this.selectedShipId,
        unlockedShipIds: this.unlockedShipIds,
        upgrades: this.upgrades
      };
      localStorage.setItem('cosmic_strike_3d_save', JSON.stringify(data));
    } catch (e) {}
  }

  getCurrentShipDef() {
    return (
      (this.config.ships || []).find((s) => s.id === this.selectedShipId) ||
      this.config.ships[0] || { id: 'falcon', name: 'Falcão Estelar', hp: 100, speed: 1 }
    );
  }

  calculateStats() {
    const ship = this.getCurrentShipDef();
    const baseHp = ship.hp || 100;
    const bonusHp = (this.upgrades.hpLevel - 1) * (this.economy.hpPerLevel || 25);
    this.maxHp = baseHp + bonusHp;
    this.currentHp = this.maxHp;
    this.weaponLevel = ship.weaponStart || 1;
  }

  getSpeedMultiplier() {
    return 1 + (this.upgrades.speedLevel - 1) * (this.economy.speedPerLevel || 0.15);
  }

  getDamageMultiplier() {
    return 1 + (this.upgrades.damageLevel - 1) * (this.economy.damagePerLevel || 0.2);
  }

  getMagnetRadius() {
    const base = 3.5;
    return base + (this.upgrades.magnetLevel - 1) * 1.5;
  }

  addCoins(amount) {
    this.coins += amount;
    this.requestSave();
  }

  spendCoins(amount) {
    if (this.coins >= amount) {
      this.coins -= amount;
      this.saveGame();
      return true;
    }
    return false;
  }

  registerScore(points) {
    this.score += points;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.requestSave();
    }
  }

  addCombo() {
    this.comboCount++;
    this.comboMultiplier = 1 + Math.floor(this.comboCount / 5) * 0.5;
  }

  resetCombo() {
    this.comboCount = 0;
    this.comboMultiplier = 1;
  }

  upgradePermanent(type) {
    const eco = this.economy;
    let baseCost = 200;
    let currentLvl = this.upgrades[type] || 1;

    if (type === 'hpLevel') baseCost = eco.hpUpgradePrice || 300;
    else if (type === 'speedLevel') baseCost = eco.speedUpgradePrice || 250;
    else if (type === 'magnetLevel') baseCost = eco.magnetUpgradePrice || 200;
    else if (type === 'damageLevel') baseCost = eco.damageUpgradePrice || 400;

    const cost = upgradeCost(eco, baseCost, currentLvl);
    if (currentLvl < (eco.upgradeMaxLevel || 5) && this.spendCoins(cost)) {
      this.upgrades[type]++;
      this.calculateStats();
      this.saveGame();
      return true;
    }
    return false;
  }

  getWingmanCost() {
    const count = this.wingmanActiveCount || 0;
    if (count === 0) return 250;
    if (count === 1) return 1000;
    if (count === 2) return 2000;
    return Math.round(2000 * Math.pow(2, count - 2));
  }

  buyWingman() {
    if (this.wingmanActiveCount >= 8) return false;
    const cost = this.getWingmanCost();
    if (this.spendCoins(cost)) {
      this.wingmanActiveCount++;
      return true;
    }
    return false;
  }

  setWingmanCount(count) {
    this.wingmanActiveCount = Math.max(0, count);
  }
}
