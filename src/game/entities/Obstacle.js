import * as THREE from 'three';
import { PX, rand, clamp } from '../core/math.js';
import { flashVisual, updateFlash, animateVisual } from '../core/ModelLibrary.js';

/* ==========================================================================
   OBSTACLE ENTITY (OBSTÁCULOS ESPECIAIS 3D)
   Minas, Portões Laser, Buracos Negros gravitacionais e Muros de Energia.
   ========================================================================== */
export class Obstacle {
  constructor(scene, modelLibrary, obsDef, spawnX = 0, spawnZ = -14) {
    this.scene = scene;
    this.modelLibrary = modelLibrary;
    this.def = obsDef;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Instancia visual
    this.visual = this.modelLibrary.instantiate('obstacles', obsDef.id, obsDef);
    this.root.add(this.visual);

    this.position = this.root.position;
    this.position.set(spawnX, 0, spawnZ);

    this.type = obsDef.type || 'mine';
    this.hp = obsDef.hp || 3;
    this.maxHp = this.hp;
    this.destructible = obsDef.destructible !== false;
    this.damage = obsDef.damage || 30;
    this.speed = (obsDef.speed || 100) * PX * 2.2;
    this.radius = 0.8 * (obsDef.scale || 1);
    this.isDead = false;
    this.timeAlive = 0;

    // Mecânica de Portão Laser: feixe laser visível ligando e desligando
    if (this.type === 'laserGate') {
      this.createLaserGateBeam(obsDef.size || 3.4);
    }
  }

  createLaserGateBeam(width) {
    this.gateWidth = width;
    this.beamActive = true;
    this.beamMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.15, 0.15),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.9 })
    );
    this.beamMesh.position.y = 0.2;
    this.root.add(this.beamMesh);
  }

  takeDamage(amount) {
    if (!this.destructible) return false;
    this.hp -= amount;
    flashVisual(this.visual, 0.05, 0xffffff);
    return this.hp <= 0;
  }

  update(dt, player) {
    if (this.isDead) return;

    this.timeAlive += dt;
    animateVisual(this.visual, this.timeAlive, dt);
    updateFlash(this.visual);

    this.position.z += this.speed * dt;

    // Lógica específica por tipo
    if (this.type === 'blackHole') {
      // Puxa a nave gravitacionalmente para o centro
      const pullForce = (this.def.pull || 8) * dt;
      const dx = this.position.x - player.position.x;
      const dz = this.position.z - player.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 7 && dist > 0.4) {
        player.position.x += (dx / dist) * pullForce * 0.4;
        player.position.z += (dz / dist) * pullForce * 0.4;
      }
    } else if (this.type === 'laserGate') {
      // Liga e desliga a cada 1.8 segundos
      this.beamActive = (Math.sin(this.timeAlive * 3.5) > -0.2);
      if (this.beamMesh) {
        this.beamMesh.visible = this.beamActive;
      }
    }
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
