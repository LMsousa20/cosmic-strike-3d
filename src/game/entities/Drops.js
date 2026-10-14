import * as THREE from 'three';
import { rand, damp } from '../core/math.js';
import { animateVisual } from '../core/ModelLibrary.js';

/* ==========================================================================
   DROPS SYSTEM (MOEDAS E CÁPSULAS DE POWER-UP 3D)
   Moedas giratórias e itens consumíveis com atração por campo magnético.
   ========================================================================== */
export class DropsSystem {
  constructor(scene, modelLibrary) {
    this.scene = scene;
    this.modelLibrary = modelLibrary;
    this.drops = [];
  }

  spawnCoin(x, z, isBig = false, value = 50) {
    const visual = this.modelLibrary.instantiate('items', 'coin');
    if (isBig) visual.scale.setScalar(1.5);

    const root = new THREE.Group();
    root.add(visual);
    root.position.set(x, 0.2, z);
    this.scene.add(root);

    this.drops.push({
      root,
      visual,
      type: 'coin',
      value: isBig ? value * 2 : value,
      radius: isBig ? 0.6 : 0.4,
      vx: rand(-3.5, 3.5),
      vz: rand(2.5, 5.0)
    });
  }

  spawnPowerup(x, z, kind = 'powerup') {
    const visual = this.modelLibrary.instantiate('items', kind);
    const root = new THREE.Group();
    root.add(visual);
    root.position.set(x, 0.2, z);
    this.scene.add(root);

    this.drops.push({
      root,
      visual,
      type: kind,
      radius: 0.5,
      vx: 0,
      vz: 3.2
    });
  }

  update(dt, playerPos, magnetRadius = 4.5, onCollect = null) {
    const now = performance.now() / 1000;

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      animateVisual(d.visual, now, dt);

      // Distância até o jogador
      const dx = playerPos.x - d.root.position.x;
      const dz = playerPos.z - d.root.position.z;
      const dist = Math.hypot(dx, dz);

      // Atração magnética se estiver no raio do ímã
      if (dist < magnetRadius && d.type === 'coin') {
        const pullSpeed = 16;
        d.vx = damp(d.vx, (dx / dist) * pullSpeed, 8, dt);
        d.vz = damp(d.vz, (dz / dist) * pullSpeed, 8, dt);
      } else {
        d.vx *= 0.96;
      }

      d.root.position.x += d.vx * dt;
      d.root.position.z += d.vz * dt;

      // Colisão de coleta com a nave
      if (dist < d.radius + 0.6) {
        if (onCollect) onCollect(d);
        this.scene.remove(d.root);
        this.drops.splice(i, 1);
        continue;
      }

      // Descarte fora da tela
      if (d.root.position.z > 14 || Math.abs(d.root.position.x) > 10) {
        this.scene.remove(d.root);
        this.drops.splice(i, 1);
      }
    }
  }

  clear() {
    for (const d of this.drops) {
      this.scene.remove(d.root);
    }
    this.drops = [];
  }
}
