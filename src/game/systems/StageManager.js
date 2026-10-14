import { weightedPick, rand } from '../core/math.js';
import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { Obstacle } from '../entities/Obstacle.js';

/* ==========================================================================
   STAGE MANAGER (DIRETOR DE FASES E SPAWNER)
   Controla a progressão entre pistas, ondas de monstros e invocação de chefões.
   ========================================================================== */
export class StageManager {
  constructor(scene, modelLibrary, config, trackEnvironment, soundEngine) {
    this.scene = scene;
    this.modelLibrary = modelLibrary;
    this.config = config;
    this.trackEnvironment = trackEnvironment;
    this.soundEngine = soundEngine;

    this.tracks = (config.tracks || []).filter((t) => t.enabled);
    if (this.tracks.length === 0) {
      this.tracks = [{ id: 'default', name: 'Setor 1', duration: 45, enemies: [], obstacles: [] }];
    }

    this.currentTrackIndex = 0;
    this.currentTrack = this.tracks[0];

    // Temporizadores
    this.stageTimer = 0;
    this.lastEnemySpawn = 0;
    this.lastObstacleSpawn = 0;

    // Estado do Chefão
    this.activeBoss = null;
    this.isBossSpawned = false;

    // Callbacks de eventos
    this.onBossWarning = null;
    this.onStageClear = null;
  }

  async startTrack(index = 0) {
    this.currentTrackIndex = index % this.tracks.length;
    this.currentTrack = this.tracks[this.currentTrackIndex];

    this.stageTimer = 0;
    this.lastEnemySpawn = 0;
    this.lastObstacleSpawn = 0;
    this.activeBoss = null;
    this.isBossSpawned = false;

    await this.trackEnvironment.applyTrackConfig(this.currentTrack);
  }

  getStageName() {
    return `FASE ${this.currentTrackIndex + 1}: ${this.currentTrack.name.toUpperCase()}`;
  }

  update(dt, enemiesList, obstaclesList, arenaW) {
    // Se o chefão estiver em campo, não gera ondas comuns
    if (this.activeBoss && !this.activeBoss.isDead) return;

    this.stageTimer += dt;
    const duration = this.currentTrack.duration || 50;

    // Chegou a hora do Chefão?
    if (this.stageTimer >= duration && !this.isBossSpawned) {
      this.triggerBossEncounter();
      return;
    }

    // Spawn de Inimigos
    const now = performance.now();
    const spawnInterval = this.currentTrack.spawnInterval || 1100;
    if (now - this.lastEnemySpawn > spawnInterval) {
      this.lastEnemySpawn = now;
      this.spawnEnemyWave(enemiesList, arenaW);
    }

    // Spawn de Obstáculos
    const obsInterval = this.currentTrack.obstacleInterval || 6000;
    if (now - this.lastObstacleSpawn > obsInterval) {
      this.lastObstacleSpawn = now;
      this.spawnObstacle(obstaclesList, arenaW);
    }
  }

  spawnEnemyWave(enemiesList, arenaW) {
    // Filtra inimigos permitidos nesta pista
    const allowedIds = new Set(this.currentTrack.enemies || []);
    const available = (this.config.enemies || []).filter(
      (e) => e.enabled && (allowedIds.size === 0 || allowedIds.has(e.id))
    );

    if (available.length === 0) return;

    const chosen = weightedPick(available, 'spawnWeight');
    if (!chosen) return;

    const squadSize = chosen.squadSize || 1;
    const startX = rand(-arenaW * 0.35, arenaW * 0.35);

    for (let i = 0; i < squadSize; i++) {
      setTimeout(() => {
        if (!this.activeBoss) {
          const spawnX = squadSize === 1 ? startX : startX + (i - (squadSize - 1) / 2) * 1.5;
          const enemy = new Enemy(this.scene, this.modelLibrary, chosen, spawnX, -15 - i * 1.8);
          enemiesList.push(enemy);
        }
      }, i * 200);
    }
  }

  spawnObstacle(obstaclesList, arenaW) {
    const allowedIds = new Set(this.currentTrack.obstacles || []);
    const available = (this.config.obstacles || []).filter(
      (o) => o.enabled && (allowedIds.size === 0 || allowedIds.has(o.id))
    );

    if (available.length === 0) return;

    const chosen = weightedPick(available, 'spawnWeight');
    if (!chosen) return;

    const spawnX = rand(-arenaW * 0.32, arenaW * 0.32);
    const obs = new Obstacle(this.scene, this.modelLibrary, chosen, spawnX, -16);
    obstaclesList.push(obs);
  }

  triggerBossEncounter() {
    this.isBossSpawned = true;

    // Busca o chefão da pista
    const bossId = this.currentTrack.boss;
    const bossDef =
      (this.config.bosses || []).find((b) => b.id === bossId) ||
      this.config.bosses[0];

    if (!bossDef) return;

    if (this.onBossWarning) {
      this.onBossWarning(bossDef.warningText || 'AMEAÇA COLOSSAL DETECTADA');
    }

    this.soundEngine?.playBossSiren();

    // Surge após o alerta sonoro e visual
    setTimeout(() => {
      this.activeBoss = new Boss(this.scene, this.modelLibrary, bossDef);
    }, 2400);
  }
}
