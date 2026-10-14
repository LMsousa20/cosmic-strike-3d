import * as THREE from 'three';
import { damp } from '../core/math.js';

/* ==========================================================================
   WINGMAN SQUADRON (REFORÇO ALIADO ACUMULATIVO EM FORMAÇÃO)
   Permite convocar múltiplos drones de apoio com valor exponencial.
   Cada drone herda a quantidade de tiros da nave do jogador (limitado a 8).
   ========================================================================== */

const FORMATION_SLOTS = [
  { x: -1.35, z: 0.35 },  // 1: Ala esquerda próxima
  { x:  1.35, z: 0.35 },  // 2: Ala direita próxima
  { x: -2.35, z: 1.05 },  // 3: Flanco esquerdo recuado
  { x:  2.35, z: 1.05 },  // 4: Flanco direito recuado
  { x: -1.00, z: 1.75 },  // 5: Retaguarda esquerda
  { x:  1.00, z: 1.75 },  // 6: Retaguarda direita
  { x: -3.30, z: 1.75 },  // 7: Extremo flanco esquerdo
  { x:  3.30, z: 1.75 },  // 8: Extremo flanco direito
];

export class Wingman {
  constructor(scene, modelLibrary) {
    this.scene = scene;
    this.modelLibrary = modelLibrary;
    this.drones = [];
  }

  /** Retorna a contagem atual de drones ativos no esquadrão */
  getActiveCount() {
    return this.drones.length;
  }

  /**
   * Convoca mais um drone de apoio na formação tática.
   * @param {THREE.Vector3} playerPos Posição atual da nave do jogador
   * @param {number} duration Duração do reforço em segundos (padrão 15s)
   */
  deploy(playerPos, duration = 15) {
    const slotIdx = this.drones.length % FORMATION_SLOTS.length;
    const slot = FORMATION_SLOTS[slotIdx];

    const root = new THREE.Group();
    const visual = this.modelLibrary.instantiate('items', 'drone');
    root.add(visual);

    // Efeito de escala inicial para animação de entrada ("warp in")
    root.scale.set(0.1, 0.1, 0.1);

    // Posiciona o drone vindo de trás e deslizando para o slot
    root.position.set(playerPos.x + slot.x, 0, playerPos.z + slot.z + 3);
    this.scene.add(root);

    const drone = {
      root,
      visual,
      position: root.position,
      offset: new THREE.Vector3(slot.x, 0, slot.z),
      timeRemaining: duration,
      maxDuration: duration,
      scale: 0.1,
      targetScale: 1.0,
      phaseOffset: Math.random() * Math.PI * 2
    };

    this.drones.push(drone);
    return this.drones.length;
  }

  /** Remove todos os drones ativos */
  dismiss() {
    for (const d of this.drones) {
      this.scene.remove(d.root);
    }
    this.drones = [];
  }

  /** Atualiza voo em formação, animação e expiração dos drones */
  update(dt, playerPos, playerRotation, onDroneExpire = null) {
    const now = performance.now() * 0.005;

    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i];
      d.timeRemaining -= dt;

      // Animação de entrada
      if (d.scale < d.targetScale) {
        d.scale = Math.min(d.targetScale, d.scale + dt * 3.5);
        d.root.scale.setScalar(d.scale);
      }

      // Acompanha suavemente o jogador na formação
      const targetX = playerPos.x + d.offset.x;
      const targetZ = playerPos.z + d.offset.z;
      d.position.x = damp(d.position.x, targetX, 11, dt);
      d.position.z = damp(d.position.z, targetZ, 11, dt);

      // Leve flutuação e inclinação nas curvas
      d.position.y = Math.sin(now + d.phaseOffset) * 0.18;
      d.root.rotation.z = (playerRotation ? playerRotation.z : 0) * 0.85;

      // Expiração do drone
      if (d.timeRemaining <= 0) {
        this.scene.remove(d.root);
        this.drones.splice(i, 1);
        if (onDroneExpire) onDroneExpire(this.drones.length);
      }
    }
  }

  /**
   * Dispara tiros a partir de cada drone do esquadrão.
   * A quantidade de tiros por drone espelha a do jogador, limitada a 8!
   * @param {Object} projectiles Sistema de projéteis
   * @param {number} bulletCount Quantidade de tiros herdada da nave
   * @param {number} baseDamage Dano base do tiro
   * @param {number} bulletSpeed Velocidade dos disparos
   * @param {string} bulletColor Cor dos lasers do reforço
   */
  fire(projectiles, bulletCount = 1, baseDamage = 1, bulletSpeed = 28, bulletColor = '#10b981') {
    if (this.drones.length === 0) return;

    // Limita a quantidade de tiros entre 1 e 8
    const count = Math.max(1, Math.min(8, bulletCount));
    const dmg = Math.max(0.5, baseDamage * 0.75); // dano de suporte

    for (const d of this.drones) {
      const wx = d.position.x;
      const wz = d.position.z - 0.4;

      if (count === 1) {
        projectiles.spawnPlayerBullet(wx, wz, 0, -bulletSpeed, bulletColor, dmg);
      } else if (count === 2) {
        projectiles.spawnPlayerBullet(wx - 0.18, wz, 0, -bulletSpeed, bulletColor, dmg);
        projectiles.spawnPlayerBullet(wx + 0.18, wz, 0, -bulletSpeed, bulletColor, dmg);
      } else if (count === 3) {
        projectiles.spawnPlayerBullet(wx, wz - 0.1, 0, -bulletSpeed * 1.05, bulletColor, dmg);
        projectiles.spawnPlayerBullet(wx - 0.22, wz, -3.2, -bulletSpeed, bulletColor, dmg);
        projectiles.spawnPlayerBullet(wx + 0.22, wz, 3.2, -bulletSpeed, bulletColor, dmg);
      } else if (count === 4) {
        projectiles.spawnPlayerBullet(wx - 0.12, wz - 0.05, 0, -bulletSpeed * 1.05, bulletColor, dmg);
        projectiles.spawnPlayerBullet(wx + 0.12, wz - 0.05, 0, -bulletSpeed * 1.05, bulletColor, dmg);
        projectiles.spawnPlayerBullet(wx - 0.32, wz, -4.5, -bulletSpeed, bulletColor, dmg);
        projectiles.spawnPlayerBullet(wx + 0.32, wz, 4.5, -bulletSpeed, bulletColor, dmg);
      } else {
        // Para 5, 6, 7 e 8 tiros: distribuição harmônica em leque
        for (let b = 0; b < count; b++) {
          const t = b / (count - 1); // 0.0 a 1.0
          const angle = (t - 0.5) * 0.42; // ~24 graus de abertura total
          const vx = Math.sin(angle) * bulletSpeed;
          const vz = -Math.cos(angle) * bulletSpeed;
          const px = wx + (t - 0.5) * 0.55;
          projectiles.spawnPlayerBullet(px, wz, vx, vz, bulletColor, dmg);
        }
      }
    }
  }

  destroy() {
    this.dismiss();
  }
}
