import { loadConfig, onConfigChange } from '../shared/configStore.js';
import { Engine } from './core/Engine.js';
import { ModelLibrary } from './core/ModelLibrary.js';
import { InputController } from './core/Input.js';
import { TrackEnvironment } from './world/TrackEnvironment.js';
import { ProjectileSystem } from './entities/Projectiles.js';
import { ParticleSystem } from './fx/ParticleSystem.js';
import { DropsSystem } from './entities/Drops.js';
import { Player } from './entities/Player.js';
import { Wingman } from './entities/Wingman.js';
import { Enemy } from './entities/Enemy.js';
import { GameState } from './state/GameState.js';
import { StageManager } from './systems/StageManager.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { Hud } from './ui/Hud.js';

/* ==========================================================================
   COSMIC STRIKE 3D - PONTO DE ENTRADA PRINCIPAL
   ========================================================================== */
export async function bootstrapGame() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // 1. Carrega configuração (do IndexedDB ou do seed JSON)
  const { config } = await loadConfig();

  // 2. Inicializa Motor Three.js
  const engine = new Engine(container);

  // 3. Biblioteca de modelos 3D e procedural
  const modelLibrary = new ModelLibrary();
  await modelLibrary.preloadConfig(config);

  // 4. Cenário de Pista 3D
  const trackEnv = new TrackEnvironment(engine.scene, engine, modelLibrary);

  // 5. Sistemas de Entidades e Efeitos
  const projectiles = new ProjectileSystem(engine.scene);
  const particles = new ParticleSystem(engine.scene);
  const drops = new DropsSystem(engine.scene, modelLibrary);

  // 6. Estado e Economia
  const gameState = new GameState(config);

  // 7. Jogador e Wingman
  const player = new Player(engine.scene, modelLibrary, gameState.getCurrentShipDef());
  const wingman = new Wingman(engine.scene, modelLibrary);

  // 8. Entrada de Controles
  const input = new InputController(engine.renderer.domElement, engine.camera, engine.arenaWidth, engine.arenaHeight);

  // 9. Diretor de Fases e Spawner
  const stageManager = new StageManager(engine.scene, modelLibrary, config, trackEnv, SoundEngine);
  await stageManager.startTrack(0);

  // Listas ativas de combate
  const enemiesList = [];
  const obstaclesList = [];

  let isGameRunning = false;
  let isPaused = false;

  // 10. HUD e Integração com DOM
  const hud = new Hud(
    gameState,
    // onSelectShip
    (ship) => {
      player.setShip(ship);
    },
    // onBuyShip
    (ship) => {
      SoundEngine.playPowerup();
      player.setShip(ship);
    },
    // onDeployWingman
    () => {
      deployWingmanAction();
    },
    // onDetonateBomb
    () => {
      detonateEmpBomb();
    },
    // onBuyBomb
    () => {
      buyBombAction();
    },
    // onStartGame
    () => {
      isGameRunning = true;
      engine.start();
    },
    // onRestartGame
    () => {
      restartGame();
    }
  );

  // Ações Rápidas (acionadas por clique ou atalhos de teclado no PC)
  function deployWingmanAction() {
    if (!isGameRunning || player.isDead || isPaused) return;
    const cost = gameState.getWingmanCost();
    if (gameState.buyWingman()) {
      const activeCount = wingman.deploy(player.position, gameState.economy.wingmanDuration || 15);
      gameState.setWingmanCount(activeCount);
      SoundEngine.playPowerup();
      hud.showToast(`🚀 REFORÇO x${activeCount} CONVOCADO! (-${cost} 🪙)`, '#10b981');
      hud.updateAll();
    }
  }

  function buyUpgradeAction(type, label) {
    if (!isGameRunning && !hud.screenMenu.classList.contains('hidden')) return;
    if (gameState.upgradePermanent(type)) {
      SoundEngine.playPowerup();
      hud.showToast(`⚡ ${label} MELHORADO!`, '#38bdf8');
      hud.updateAll();
    }
  }

  function buyBombAction() {
    const bombCost = gameState.economy.bombPrice || 250;
    const maxBombs = gameState.economy.maxBombs || 5;
    if (gameState.bombs >= maxBombs) {
      hud.showToast('💣 CAPACIDADE MÁXIMA DE BOMBAS!', '#ef4444');
      return;
    }
    if (gameState.spendCoins(bombCost)) {
      gameState.bombs++;
      SoundEngine.playPowerup();
      hud.showToast('💣 BOMBA EMP RECARREGADA!', '#f59e0b');
      hud.updateAll();
    }
  }

  // Eventos de alerta de chefão
  stageManager.onBossWarning = (text) => hud.showBossWarning(text);

  // Ações de entrada e atalhos do modo PC
  input.onBombTrigger = () => detonateEmpBomb();
  input.onWingmanTrigger = () => deployWingmanAction();
  input.onUpgradeHpTrigger = () => buyUpgradeAction('hpLevel', 'BLINDAGEM (+HP)');
  input.onUpgradeSpeedTrigger = () => buyUpgradeAction('speedLevel', 'TURBINAS (+VEL)');
  input.onUpgradeMagnetTrigger = () => buyUpgradeAction('magnetLevel', 'ÍMÃ (+CAMPO)');
  input.onBuyBombTrigger = () => buyBombAction();
  input.onPauseTrigger = () => togglePause();

  function togglePause() {
    if (!isGameRunning || player.isDead) return;
    isPaused = !isPaused;
    if (isPaused) {
      hud.showPause();
    } else {
      hud.hidePause();
    }
  }

  function detonateEmpBomb() {
    if (gameState.bombs <= 0 || player.isDead || isPaused) return;
    gameState.bombs--;
    hud.showToast('💥 BOMBA EMP DETONADA!', '#00f0ff');
    hud.updateAll();

    SoundEngine.playBombBlast();
    engine.cameraRig.triggerShake(0.8);
    particles.createShockwave(player.position.x, player.position.z, '#00f0ff', 14);

    // Limpa todas as balas inimigas
    projectiles.clearEnemyBullets();

    // Dano a todos os inimigos na tela
    const bombDmg = gameState.economy.bombDamage || 400;
    for (let i = enemiesList.length - 1; i >= 0; i--) {
      const e = enemiesList[i];
      if (!e || e.isDead) continue;
      if (e.takeDamage(bombDmg)) {
        killEnemy(e, i, false);
      }
    }

    // Dano ao chefão
    if (stageManager.activeBoss && !stageManager.activeBoss.isDead) {
      if (stageManager.activeBoss.takeDamage(bombDmg)) {
        killBoss(stageManager.activeBoss);
      }
    }
  }

  function killEnemy(enemy, index, killedByPlayerContact = false) {
    if (!enemy || enemy.isDead) return;
    enemy.isDead = true;

    try {
      particles.createExplosion(enemy.position.x, enemy.position.z, enemy.def.accent || '#f43f5e', 14);
      SoundEngine.playExplosion(false);
    } catch (err) {
      console.warn('Erro ao criar explosão de inimigo:', err);
    }

    // Drops apenas se não for fragmento mini e se NÃO foi destruído por impacto físico com a nave
    if (!enemy.isMini && !killedByPlayerContact) {
      const coinsToDrop = Math.max(1, enemy.def.coins || 1);
      for (let c = 0; c < coinsToDrop; c++) {
        drops.spawnCoin(
          enemy.position.x + (Math.random() - 0.5) * 0.4,
          enemy.position.z + (Math.random() - 0.5) * 0.4,
          false,
          gameState.economy.coinValue || 25
        );
      }
      if (Math.random() < (enemy.def.powerupChance || 0.12)) {
        const roll = Math.random();
        const kind = roll < 0.5 ? 'powerup' : roll < 0.8 ? 'shield' : 'bomb';
        drops.spawnPowerup(enemy.position.x, enemy.position.z, kind);
      }
    }

    // Se for splitter (meteoro), cria 2 fragmentos menores que se espalham lateralmente e NÃO dropam moedas
    if (enemy.def.behavior === 'splitter' && !enemy.isMini) {
      for (const s of [-1, 1]) {
        const spawnX = enemy.position.x + s * 1.3;
        const spawnZ = enemy.position.z - 0.6;
        const mini = new Enemy(engine.scene, modelLibrary, enemy.def, spawnX, spawnZ);
        mini.isMini = true;
        mini.hp = 1;
        mini.radius = (mini.radius || 0.8) * 0.5;
        mini.speed = (enemy.speed || 3) * 1.25;
        mini.vx = s * 4.0;
        mini.root.scale.setScalar(0.5);
        enemiesList.push(mini);
      }
    }

    if (!enemy.isMini) {
      gameState.registerScore((enemy.def.score || 100) * gameState.comboMultiplier);
      gameState.addCombo();
    }

    enemy.destroy();
    const idx = enemiesList.indexOf(enemy);
    if (idx !== -1) {
      enemiesList.splice(idx, 1);
    }
  }

  function killBoss(boss) {
    if (!boss || boss.isDead) return;
    boss.isDead = true;

    try {
      particles.createExplosion(boss.position.x, boss.position.z, '#ffd700', 36, true);
      SoundEngine.playExplosion(true);
      engine.cameraRig.triggerShake(1.2);
    } catch (err) {
      console.warn('Erro ao criar explosão de chefão:', err);
    }

    // Fonte massiva de moedas
    for (let i = 0; i < 12; i++) {
      drops.spawnCoin(boss.position.x, boss.position.z, true, gameState.economy.bigCoinValue || 100);
    }
    drops.spawnPowerup(boss.position.x, boss.position.z, 'powerup');

    gameState.addCoins(boss.def.reward || 1000);
    gameState.registerScore(boss.def.score || 5000);

    boss.destroy();
    stageManager.activeBoss = null;
    hud.setBossHud(null);

    // Avança para a próxima pista
    setTimeout(async () => {
      gameState.addCoins(gameState.economy.stageClearBonus || 500);
      await stageManager.startTrack(stageManager.currentTrackIndex + 1);
      const stageBadge = document.getElementById('ui-stage-badge');
      if (stageBadge) stageBadge.innerText = `FASE ${stageManager.currentTrackIndex + 1}`;
      hud.updateAll();
    }, 2500);
  }

  function handlePlayerTakeDamage(damage) {
    if (player.isInvulnerable || player.isDead) return;

    // Escudo absorve o golpe
    if (gameState.shieldHits > 0) {
      gameState.shieldHits--;
      player.setShieldActive(gameState.shieldHits > 0);
      player.takeHit();
      SoundEngine.playExplosion(false);
      hud.updateAll();
      return;
    }

    gameState.currentHp -= damage;
    player.takeHit();
    SoundEngine.playExplosion(false);
    engine.cameraRig.triggerShake(0.5);
    gameState.resetCombo();
    hud.updateAll();

    if (gameState.currentHp <= 0) {
      player.isDead = true;
      particles.createExplosion(player.position.x, player.position.z, '#ef4444', 30, true);
      SoundEngine.playExplosion(true);
      player.destroy();
      setTimeout(() => {
        hud.showGameOver(gameState.score, gameState.coins);
      }, 1000);
    }
  }

  function restartGame() {
    projectiles.clear();
    particles.clear();
    drops.clear();

    for (const e of enemiesList) e.destroy();
    for (const o of obstaclesList) o.destroy();
    enemiesList.length = 0;
    obstaclesList.length = 0;

    if (stageManager.activeBoss) {
      stageManager.activeBoss.destroy();
      stageManager.activeBoss = null;
    }

    gameState.score = 0;
    gameState.calculateStats();
    gameState.bombs = gameState.economy.startBombs || 2;
    gameState.shieldHits = 0;
    gameState.setWingmanCount(0);
    wingman.dismiss();

    player.isDead = false;
    engine.scene.add(player.root);
    player.position.set(0, 0, 7.5);
    player.setShieldActive(false);

    stageManager.startTrack(0);
    hud.updateAll();
  }

  // Quantidade de tiros da nave do jogador por nível (limitado a 8)
  function getPlayerBulletCount(weaponLevel) {
    if (weaponLevel === 1) return 2;
    if (weaponLevel === 2) return 3;
    if (weaponLevel === 3) return 4;
    if (weaponLevel === 4) return 5;
    return 8; // Nível 5: Overdrive Total com 8 tiros
  }

  // Disparo Contínuo do Jogador
  function handleShooting(elapsedTime) {
    if (!isGameRunning || player.isDead || isPaused) return;

    const fireInterval = (player.shipDef.fireRate || 220) / 1000;
    if (elapsedTime - player.lastShotTime < fireInterval) return;
    player.lastShotTime = elapsedTime;

    const px = player.position.x;
    const pz = player.position.z;
    const lvl = gameState.weaponLevel;
    const bColor = player.shipDef.bulletColor || '#00f0ff';
    const dmg = (player.shipDef.damage || 1) * gameState.getDamageMultiplier();
    const speed = 28;

    SoundEngine.playLaser(lvl);

    if (lvl === 1) {
      projectiles.spawnPlayerBullet(px - 0.35, pz - 0.4, 0, -speed, bColor, dmg);
      projectiles.spawnPlayerBullet(px + 0.35, pz - 0.4, 0, -speed, bColor, dmg);
    } else if (lvl === 2) {
      projectiles.spawnPlayerBullet(px, pz - 0.5, 0, -speed * 1.05, bColor, dmg);
      projectiles.spawnPlayerBullet(px - 0.4, pz - 0.3, -3.5, -speed, bColor, dmg);
      projectiles.spawnPlayerBullet(px + 0.4, pz - 0.3, 3.5, -speed, bColor, dmg);
    } else if (lvl === 3) {
      projectiles.spawnPlayerBullet(px - 0.2, pz - 0.5, 0, -speed * 1.1, bColor, dmg);
      projectiles.spawnPlayerBullet(px + 0.2, pz - 0.5, 0, -speed * 1.1, bColor, dmg);
      projectiles.spawnPlayerBullet(px - 0.55, pz - 0.3, -5, -speed, bColor, dmg);
      projectiles.spawnPlayerBullet(px + 0.55, pz - 0.3, 5, -speed, bColor, dmg);
    } else if (lvl === 4) {
      projectiles.spawnPlayerBullet(px, pz - 0.6, 0, -speed * 1.15, bColor, dmg);
      projectiles.spawnPlayerBullet(px - 0.3, pz - 0.4, -4, -speed * 1.1, bColor, dmg);
      projectiles.spawnPlayerBullet(px + 0.3, pz - 0.4, 4, -speed * 1.1, bColor, dmg);
      projectiles.spawnPlayerBullet(px - 0.6, pz - 0.2, -8, -speed, bColor, dmg);
      projectiles.spawnPlayerBullet(px + 0.6, pz - 0.2, 8, -speed, bColor, dmg);
    } else {
      // Nível 5: Overdrive Total (8 Tiros em Leque e Paralelos)
      projectiles.spawnPlayerBullet(px - 0.18, pz - 0.6, 0, -speed * 1.2, bColor, dmg);
      projectiles.spawnPlayerBullet(px + 0.18, pz - 0.6, 0, -speed * 1.2, bColor, dmg);
      projectiles.spawnPlayerBullet(px - 0.4, pz - 0.45, -3.2, -speed * 1.15, bColor, dmg);
      projectiles.spawnPlayerBullet(px + 0.4, pz - 0.45, 3.2, -speed * 1.15, bColor, dmg);
      projectiles.spawnPlayerBullet(px - 0.65, pz - 0.3, -6.5, -speed * 1.1, bColor, dmg);
      projectiles.spawnPlayerBullet(px + 0.65, pz - 0.3, 6.5, -speed * 1.1, bColor, dmg);
      projectiles.spawnPlayerBullet(px - 0.9, pz - 0.15, -10.5, -speed * 1.05, bColor, dmg);
      projectiles.spawnPlayerBullet(px + 0.9, pz - 0.15, 10.5, -speed * 1.05, bColor, dmg);
    }

    // Mísseis Teleguiados nos Níveis 4 e 5
    if (lvl >= 4 && elapsedTime - player.lastMissileTime > 0.55) {
      player.lastMissileTime = elapsedTime;
      projectiles.spawnHomingMissile(px - 0.7, pz);
      projectiles.spawnHomingMissile(px + 0.7, pz);
      SoundEngine.playMissile();
    }

    // Disparo do Esquadrão de Reforço (Wingman)
    // Se o jogador tem 4 tiros, o reforço dispara 4 tiros (limitado a 8)
    if (wingman.getActiveCount() > 0) {
      const droneShots = Math.min(8, getPlayerBulletCount(lvl));
      wingman.fire(projectiles, droneShots, dmg, speed, '#10b981');
    }
  }

  // LOOP DE COMBATE DO THREE.JS
  engine.onUpdate((dt, elapsedTime) => {
    if (isPaused) return;

    // 1. Atualiza cenário 3D da pista
    trackEnv.update(dt);

    // 2. Atualiza câmera e screen shake
    engine.cameraRig.update(dt, player.position.x);

    // 3. Atualiza jogador e esquadrão de reforço
    player.update(dt, input, engine.arenaWidth, engine.arenaHeight, gameState.getSpeedMultiplier());
    if (wingman.getActiveCount() > 0) {
      wingman.update(dt, player.position, player.root.rotation, (remainingCount) => {
        gameState.setWingmanCount(remainingCount);
        hud.updateAll();
      });
    }

    // 4. Disparos
    handleShooting(elapsedTime);

    // 5. Atualiza Spawner e Diretor de Fases
    if (isGameRunning) {
      stageManager.update(dt, enemiesList, obstaclesList, engine.arenaWidth);
    }

    // 6. Atualiza Chefão
    if (stageManager.activeBoss && !stageManager.activeBoss.isDead) {
      stageManager.activeBoss.update(dt, player.position, projectiles, SoundEngine);
      hud.setBossHud(stageManager.activeBoss);
    }

    // 7. Atualiza Inimigos
    for (let i = enemiesList.length - 1; i >= 0; i--) {
      const e = enemiesList[i];
      e.update(dt, player.position, projectiles, SoundEngine);
      if (e.position.z > 14) {
        e.destroy();
        enemiesList.splice(i, 1);
      }
    }

    // 8. Atualiza Obstáculos
    for (let i = obstaclesList.length - 1; i >= 0; i--) {
      const obs = obstaclesList[i];
      obs.update(dt, player);
      if (obs.position.z > 14) {
        obs.destroy();
        obstaclesList.splice(i, 1);
      }
    }

    // 9. Atualiza Projéteis e Mísseis
    projectiles.update(dt, enemiesList);

    // 10. Atualiza Partículas e Ondas de Choque
    particles.update(dt);

    // 11. Atualiza Drops e Coletas
    drops.update(dt, player.position, gameState.getMagnetRadius(), (drop) => {
      if (drop.type === 'coin') {
        gameState.addCoins(drop.value);
        SoundEngine.playCoin();
        hud.updateCoins(gameState.coins);
      } else if (drop.type === 'powerup') {
        gameState.weaponLevel = Math.min(5, gameState.weaponLevel + 1);
        SoundEngine.playPowerup();
        hud.updateAll();
      } else if (drop.type === 'shield') {
        gameState.shieldHits = 3;
        player.setShieldActive(true);
        SoundEngine.playPowerup();
        hud.updateAll();
      } else if (drop.type === 'bomb') {
        gameState.bombs = Math.min(gameState.economy.maxBombs || 5, gameState.bombs + 1);
        SoundEngine.playPowerup();
        hud.updateAll();
      }
    });

    // 12. DETECÇÃO DE COLISÕES
    // Balas do Jogador vs Inimigos
    for (let bi = projectiles.playerBullets.length - 1; bi >= 0; bi--) {
      const b = projectiles.playerBullets[bi];
      let bulletHit = false;

      for (let ei = enemiesList.length - 1; ei >= 0; ei--) {
        const e = enemiesList[ei];
        if (!e || e.isDead) continue;
        if (Math.hypot(e.position.x - b.mesh.position.x, e.position.z - b.mesh.position.z) < e.radius + b.radius) {
          bulletHit = true;
          if (e.takeDamage(b.damage)) {
            killEnemy(e, ei, false);
          }
          break;
        }
      }

      // Balas vs Chefão
      if (!bulletHit && stageManager.activeBoss && !stageManager.activeBoss.isDead) {
        const boss = stageManager.activeBoss;
        if (Math.hypot(boss.position.x - b.mesh.position.x, boss.position.z - b.mesh.position.z) < boss.radius + b.radius) {
          bulletHit = true;
          if (boss.takeDamage(b.damage)) {
            killBoss(boss);
          }
        }
      }

      // Balas vs Obstáculos
      if (!bulletHit) {
        for (let oi = obstaclesList.length - 1; oi >= 0; oi--) {
          const obs = obstaclesList[oi];
          if (Math.hypot(obs.position.x - b.mesh.position.x, obs.position.z - b.mesh.position.z) < obs.radius + b.radius) {
            bulletHit = true;
            if (obs.takeDamage(b.damage)) {
              obs.isDead = true;
              particles.createExplosion(obs.position.x, obs.position.z, obs.def.color || '#ef4444', 12);
              SoundEngine.playExplosion(false);
              obs.destroy();
              obstaclesList.splice(oi, 1);
            }
            break;
          }
        }
      }

      if (bulletHit) {
        engine.scene.remove(b.mesh);
        b.mesh.material.dispose();
        projectiles.playerBullets.splice(bi, 1);
      }
    }

    // Mísseis do Jogador vs Inimigos e Chefão
    for (let mi = projectiles.homingMissiles.length - 1; mi >= 0; mi--) {
      const m = projectiles.homingMissiles[mi];
      let missileHit = false;

      for (let ei = enemiesList.length - 1; ei >= 0; ei--) {
        const e = enemiesList[ei];
        if (!e || e.isDead) continue;
        if (Math.hypot(e.position.x - m.mesh.position.x, e.position.z - m.mesh.position.z) < e.radius + m.radius) {
          missileHit = true;
          particles.createExplosion(m.mesh.position.x, m.mesh.position.z, '#f97316', 10);
          if (e.takeDamage(m.damage)) {
            killEnemy(e, ei, false);
          }
          break;
        }
      }

      if (!missileHit && stageManager.activeBoss && !stageManager.activeBoss.isDead) {
        const boss = stageManager.activeBoss;
        if (Math.hypot(boss.position.x - m.mesh.position.x, boss.position.z - m.mesh.position.z) < boss.radius + m.radius) {
          missileHit = true;
          particles.createExplosion(m.mesh.position.x, m.mesh.position.z, '#f97316', 12);
          if (boss.takeDamage(m.damage)) {
            killBoss(boss);
          }
        }
      }

      if (missileHit) {
        engine.scene.remove(m.mesh);
        m.mesh.material.dispose();
        projectiles.homingMissiles.splice(mi, 1);
      }
    }

    // Projéteis Inimigos vs Jogador
    for (let ebi = projectiles.enemyBullets.length - 1; ebi >= 0; ebi--) {
      const eb = projectiles.enemyBullets[ebi];
      if (Math.hypot(player.position.x - eb.mesh.position.x, player.position.z - eb.mesh.position.z) < player.radius + eb.radius) {
        engine.scene.remove(eb.mesh);
        eb.mesh.material.dispose();
        projectiles.enemyBullets.splice(ebi, 1);
        handlePlayerTakeDamage(eb.damage);
      }
    }

    // Inimigos Colidindo com o Jogador
    for (let ei = enemiesList.length - 1; ei >= 0; ei--) {
      const e = enemiesList[ei];
      if (!e || e.isDead) continue;
      if (Math.hypot(player.position.x - e.position.x, player.position.z - e.position.z) < player.radius + e.radius) {
        handlePlayerTakeDamage(e.def.contactDamage || 25);
        killEnemy(e, ei, true);
      }
    }

    // Obstáculos Colidindo com o Jogador
    for (let oi = obstaclesList.length - 1; oi >= 0; oi--) {
      const obs = obstaclesList[oi];
      let collision = false;
      if (obs.type === 'laserGate') {
        // Colisão com feixe se estiver ativo e fora da brecha central
        if (obs.beamActive && Math.abs(player.position.z - obs.position.z) < 0.4) {
          if (Math.abs(player.position.x - obs.position.x) > 1.2) {
            collision = true;
          }
        }
      } else {
        if (Math.hypot(player.position.x - obs.position.x, player.position.z - obs.position.z) < player.radius + obs.radius) {
          collision = true;
        }
      }
      if (collision) {
        handlePlayerTakeDamage(obs.damage);
        if (obs.destructible) {
          obs.destroy();
          obstaclesList.splice(oi, 1);
        }
      }
    }
  });

  // Ouve alterações feitas no Painel Administrativo em tempo real
  onConfigChange(async () => {
    const { config: updated } = await loadConfig();
    await modelLibrary.preloadConfig(updated);
    gameState.config = updated;
    gameState.economy = updated.economy;
    hud.updateAll();
  });
}

// Inicia automaticamente quando a página carrega
window.addEventListener('DOMContentLoaded', () => {
  bootstrapGame();
});
