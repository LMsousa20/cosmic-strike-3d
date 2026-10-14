import * as THREE from 'three';
import { PX, rand, clamp } from '../core/math.js';
import { flashVisual, updateFlash, animateVisual } from '../core/ModelLibrary.js';

/* ==========================================================================
   ENEMY ENTITY (INIMIGOS 3D E MONSTROS)
   Gerencia inteligência artificial, padrões de movimento e disparos.
   ========================================================================== */
export class Enemy {
  constructor(scene, modelLibrary, enemyDef, spawnX = 0, spawnZ = -14) {
    this.scene = scene;
    this.modelLibrary = modelLibrary;
    this.def = enemyDef;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Instancia visual
    this.visual = this.modelLibrary.instantiate('enemies', enemyDef.id, enemyDef);
    this.root.add(this.visual);

    // Inimigos olham para baixo (+Z, em direção ao jogador)
    this.root.rotation.y = Math.PI;

    this.position = this.root.position;
    this.position.set(spawnX, 0, spawnZ);

    this.hp = enemyDef.hp || 3;
    this.maxHp = this.hp;
    this.speed = (enemyDef.speed || 160) * PX * 2.2;
    this.radius = (this.visual.userData.radius || 0.8) * 0.8;
    this.isDead = false;

    // Parâmetros de comportamento
    this.behavior = enemyDef.behavior || 'straight';
    this.baseX = spawnX;
    this.timeAlive = 0;
    this.wobbleSpeed = rand(2.2, 3.5);
    this.wobbleAmp = rand(1.5, 3.2);

    // Disparos
    this.firePattern = enemyDef.firePattern || 'none';
    this.fireInterval = (enemyDef.fireRate || 1500) / 1000;
    this.lastShotTime = performance.now() / 1000 + rand(0.2, 0.8);

    // Subdivisão se for meteoro / splitter
    this.isMini = false;
    this.vx = 0;
  }

  takeDamage(amount) {
    if (this.isDead) return false;
    this.hp -= amount;
    flashVisual(this.visual, 0.05, 0xffffff);
    return this.hp <= 0;
  }

  update(dt, playerPos, projectiles, soundEngine) {
    if (this.isDead) return;

    this.timeAlive += dt;
    animateVisual(this.visual, this.timeAlive, dt);
    updateFlash(this.visual);

    // 1. Movimento pelo comportamento
    switch (this.behavior) {
      case 'sine':
        this.position.z += this.speed * dt;
        this.position.x = this.baseX + Math.sin(this.timeAlive * this.wobbleSpeed) * this.wobbleAmp;
        break;

      case 'zigzag':
        this.position.z += this.speed * dt;
        this.position.x += Math.sign(Math.sin(this.timeAlive * 2)) * this.speed * 0.8 * dt;
        break;

      case 'kamikaze':
        this.position.z += this.speed * 1.3 * dt;
        // Curva em direção ao jogador
        const dx = playerPos.x - this.position.x;
        this.position.x += clamp(dx, -2, 2) * dt * 1.8;
        break;

      case 'shooter':
        // Desce até Z = -4 e desacelera
        if (this.position.z < -4) {
          this.position.z += this.speed * dt;
        } else {
          this.position.z += this.speed * 0.25 * dt;
          this.position.x = this.baseX + Math.sin(this.timeAlive * 1.5) * 1.0;
        }
        break;

      case 'straight':
      case 'splitter':
      default:
        this.position.z += this.speed * dt;
        if (this.vx) {
          this.position.x += this.vx * dt;
          this.vx *= 0.95; // atrito suave
        }
        break;
    }

    // 2. Disparo de tiros (fragmentos mini não atiram)
    if (!this.isMini && this.firePattern !== 'none' && this.position.z > -12 && this.position.z < playerPos.z - 2) {
      const now = performance.now() / 1000;
      if (now > this.lastShotTime + this.fireInterval) {
        this.lastShotTime = now;
        this.executeFirePattern(playerPos, projectiles, soundEngine);
      }
    }
  }

  executeFirePattern(playerPos, projectiles, soundEngine) {
    const x = this.position.x;
    const z = this.position.z + 0.5;
    const speed = (this.def.bulletSpeed || 250) * PX * 2.2;
    const dmg = this.def.bulletDamage || 15;

    soundEngine?.playEnemyShoot();

    if (this.firePattern === 'aimed') {
      const angle = Math.atan2(playerPos.z - z, playerPos.x - x);
      projectiles.spawnEnemyBullet(x, z, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ef4444', dmg);
    } else if (this.firePattern === 'spread3') {
      projectiles.spawnEnemySpread(x, z, 3, speed, Math.PI / 2, 0.28, '#ef4444', dmg);
    } else if (this.firePattern === 'ring') {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        projectiles.spawnEnemyBullet(x, z, Math.cos(a) * speed, Math.sin(a) * speed, '#22d3ee', dmg);
      }
    }
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
