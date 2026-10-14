import * as THREE from 'three';
import { rotateTowards } from '../core/math.js';

/* ==========================================================================
   PROJECTILE SYSTEM (BALAS E MÍSSEIS 3D OTIMIZADOS)
   Reutiliza materiais e geometrias para alto desempenho sem travamentos.
   ========================================================================== */
export class ProjectileSystem {
  constructor(scene) {
    this.scene = scene;

    // Listas ativas
    this.playerBullets = [];
    this.homingMissiles = [];
    this.enemyBullets = [];

    // Geometrias e materiais compartilhados (cache para evitar alocação a cada frame)
    this.bulletGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6);
    this.bulletGeo.rotateX(Math.PI / 2);

    this.missileGeo = new THREE.ConeGeometry(0.12, 0.8, 6);
    this.missileGeo.rotateX(-Math.PI / 2);

    this.enemySphereGeo = new THREE.SphereGeometry(0.2, 8, 6);

    // Cache de materiais por cor para não criar novo material a cada tiro
    this.materialsCache = new Map();

    // Limites de remoção no plano
    this.limitZ = 16;
    this.limitX = 10;
  }

  getMaterial(colorHex) {
    if (!this.materialsCache.has(colorHex)) {
      this.materialsCache.set(colorHex, new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) }));
    }
    return this.materialsCache.get(colorHex);
  }

  spawnPlayerBullet(x, z, vx, vz, colorHex = '#00f0ff', damage = 1) {
    const mat = this.getMaterial(colorHex);
    const mesh = new THREE.Mesh(this.bulletGeo, mat);
    mesh.position.set(x, 0.1, z);
    this.scene.add(mesh);

    this.playerBullets.push({
      mesh,
      vx,
      vz,
      damage,
      radius: 0.3
    });
  }

  spawnHomingMissile(x, z, vx = 0, vz = -10, damage = 5) {
    const mat = this.getMaterial('#f97316');
    const mesh = new THREE.Mesh(this.missileGeo, mat);
    mesh.position.set(x, 0.1, z);
    this.scene.add(mesh);

    this.homingMissiles.push({
      mesh,
      rotation: -Math.PI / 2,
      speed: 18,
      damage,
      radius: 0.35,
      life: 3.5
    });
  }

  spawnEnemyBullet(x, z, vx, vz, colorHex = '#ef4444', damage = 15) {
    const mat = this.getMaterial(colorHex);
    const mesh = new THREE.Mesh(this.enemySphereGeo, mat);
    mesh.position.set(x, 0.1, z);
    this.scene.add(mesh);

    this.enemyBullets.push({
      mesh,
      vx,
      vz,
      damage,
      radius: 0.28
    });
  }

  spawnEnemySpread(x, z, count, speed, baseAngle = Math.PI / 2, step = 0.22, colorHex = '#ef4444', damage = 15) {
    const startAngle = baseAngle - ((count - 1) * step) / 2;
    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * step;
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      this.spawnEnemyBullet(x, z, vx, vz, colorHex, damage);
    }
  }

  clearEnemyBullets() {
    for (const b of this.enemyBullets) {
      this.scene.remove(b.mesh);
    }
    this.enemyBullets = [];
  }

  update(dt, enemiesList = []) {
    // 1. Balas do jogador
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.z += b.vz * dt;

      if (b.mesh.position.z < -this.limitZ || Math.abs(b.mesh.position.x) > this.limitX) {
        this.scene.remove(b.mesh);
        this.playerBullets.splice(i, 1);
      }
    }

    // 2. Mísseis teleguiados (CORRIGIDO: usa e.position em vez de e.mesh.position!)
    for (let i = this.homingMissiles.length - 1; i >= 0; i--) {
      const m = this.homingMissiles[i];
      m.life -= dt;

      // Busca inimigo mais próximo acima do míssil
      let closest = null;
      let minDist = 999;
      const mx = m.mesh.position.x;
      const mz = m.mesh.position.z;

      for (const e of enemiesList) {
        if (!e || e.isDead) continue;
        const ePos = e.position || e.root?.position;
        if (!ePos || ePos.z >= mz) continue;

        const dist = Math.hypot(ePos.x - mx, ePos.z - mz);
        if (dist < minDist) {
          minDist = dist;
          closest = e;
        }
      }

      if (closest) {
        const cPos = closest.position || closest.root?.position;
        if (cPos) {
          const targetAngle = Math.atan2(cPos.z - mz, cPos.x - mx);
          m.rotation = rotateTowards(m.rotation, targetAngle, 3.8 * dt);
        }
      }

      m.mesh.position.x += Math.cos(m.rotation) * m.speed * dt;
      m.mesh.position.z += Math.sin(m.rotation) * m.speed * dt;
      m.mesh.rotation.y = -m.rotation - Math.PI / 2;

      if (m.life <= 0 || m.mesh.position.z < -this.limitZ || Math.abs(m.mesh.position.x) > this.limitX) {
        this.scene.remove(m.mesh);
        this.homingMissiles.splice(i, 1);
      }
    }

    // 3. Balas inimigas
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.mesh.position.x += eb.vx * dt;
      eb.mesh.position.z += eb.vz * dt;

      if (eb.mesh.position.z > this.limitZ || eb.mesh.position.z < -this.limitZ || Math.abs(eb.mesh.position.x) > this.limitX) {
        this.scene.remove(eb.mesh);
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  clear() {
    for (const b of this.playerBullets) {
      this.scene.remove(b.mesh);
    }
    for (const m of this.homingMissiles) {
      this.scene.remove(m.mesh);
    }
    for (const eb of this.enemyBullets) {
      this.scene.remove(eb.mesh);
    }
    this.playerBullets = [];
    this.homingMissiles = [];
    this.enemyBullets = [];
  }
}
