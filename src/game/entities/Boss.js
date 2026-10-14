import * as THREE from 'three';
import { PX, damp } from '../core/math.js';
import { flashVisual, updateFlash, animateVisual } from '../core/ModelLibrary.js';

/* ==========================================================================
   BOSS ENTITY (CHEFÃO COLOSSAL 3D)
   Padrões de ataque multifásicos, modo Enrage e barra de HP de topo.
   ========================================================================== */
export class Boss {
  constructor(scene, modelLibrary, bossDef) {
    this.scene = scene;
    this.modelLibrary = modelLibrary;
    this.def = bossDef;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Instancia visual colossal
    this.visual = this.modelLibrary.instantiate('bosses', bossDef.id, bossDef);
    this.root.add(this.visual);

    // Chefão olha para o jogador (+Z)
    this.root.rotation.y = Math.PI;

    this.position = this.root.position;
    this.position.set(0, 0, -18); // Começa acima da tela e desliza para dentro

    this.targetZ = -6.5;
    this.isEntering = true;

    this.hp = bossDef.hp || 1500;
    this.maxHp = this.hp;
    this.radius = 2.4 * (bossDef.scale || 1);
    this.isDead = false;

    // Movimentação lateral
    this.moveSpeed = (bossDef.speed || 120) * PX * 1.5;
    this.timeAlive = 0;
    this.moveDir = 1;

    // Padrões de ataque
    this.patterns = bossDef.patterns || ['spread', 'aimed'];
    this.fireInterval = (bossDef.fireRate || 1400) / 1000;
    this.lastAttackTime = performance.now() / 1000;
    this.attackIndex = 0;

    // Enrage
    this.isEnraged = false;
    this.enrageThreshold = (bossDef.enrageAt || 40) / 100;
  }

  takeDamage(amount) {
    this.hp -= amount;
    flashVisual(this.visual, 0.04, 0xffffff);

    if (!this.isEnraged && this.hp / this.maxHp <= this.enrageThreshold) {
      this.isEnraged = true;
      this.fireInterval *= 0.65; // Ataques 35% mais rápidos
    }

    return this.hp <= 0;
  }

  update(dt, playerPos, projectiles, soundEngine) {
    if (this.isDead) return;

    this.timeAlive += dt;
    animateVisual(this.visual, this.timeAlive, dt);
    updateFlash(this.visual);

    // 1. Entrada triunfal
    if (this.isEntering) {
      this.position.z = damp(this.position.z, this.targetZ, 2.5, dt);
      if (Math.abs(this.position.z - this.targetZ) < 0.2) {
        this.isEntering = false;
      }
      return;
    }

    // 2. Movimento oscilatório lateral
    const amp = this.isEnraged ? 4.8 : 3.8;
    this.position.x = Math.sin(this.timeAlive * (this.isEnraged ? 1.6 : 1.1)) * amp;

    // 3. Execução de padrões de ataque
    const now = performance.now() / 1000;
    if (now > this.lastAttackTime + this.fireInterval) {
      this.lastAttackTime = now;
      this.executeNextPattern(playerPos, projectiles, soundEngine);
    }
  }

  executeNextPattern(playerPos, projectiles, soundEngine) {
    const pattern = this.patterns[this.attackIndex % this.patterns.length];
    this.attackIndex++;

    const x = this.position.x;
    const z = this.position.z + 1.2;
    const speed = (this.def.bulletSpeed || 240) * PX * 2.2;
    const dmg = this.def.bulletDamage || 15;

    soundEngine?.playEnemyShoot();

    switch (pattern) {
      case 'spread':
        // Disparos duplos das asas esquerda e direita
        projectiles.spawnEnemySpread(x - 2.0, z, 3, speed, Math.PI / 2, 0.22, '#ef4444', dmg);
        projectiles.spawnEnemySpread(x + 2.0, z, 3, speed, Math.PI / 2, 0.22, '#ef4444', dmg);
        break;

      case 'aimed':
        // Rajada de 3 tiros em linha mirando no jogador
        const angle = Math.atan2(playerPos.z - z, playerPos.x - x);
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            if (!this.isDead) {
              projectiles.spawnEnemyBullet(this.position.x, this.position.z + 1.2, Math.cos(angle) * (speed + i * 2), Math.sin(angle) * (speed + i * 2), '#f59e0b', dmg);
            }
          }, i * 140);
        }
        break;

      case 'ring':
        // Anel de 12 projéteis
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          projectiles.spawnEnemyBullet(x, z, Math.cos(a) * speed, Math.sin(a) * speed, '#ef4444', dmg);
        }
        break;

      case 'spiral':
        // Espiral giratória rápida
        const baseA = this.timeAlive * 4;
        for (let i = 0; i < 4; i++) {
          const a = baseA + (i / 4) * Math.PI * 2;
          projectiles.spawnEnemyBullet(x, z, Math.cos(a) * speed, Math.sin(a) * speed, '#c084fc', dmg);
        }
        break;

      case 'rain':
        // Chuva frontal reta de 5 projéteis
        for (let i = -2; i <= 2; i++) {
          projectiles.spawnEnemyBullet(x + i * 1.4, z, 0, speed * 1.2, '#f43f5e', dmg);
        }
        break;

      default:
        projectiles.spawnEnemySpread(x, z, 4, speed, Math.PI / 2, 0.25, '#ef4444', dmg);
        break;
    }
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
