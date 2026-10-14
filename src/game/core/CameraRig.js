import * as THREE from 'three';
import { lerp, damp, rand } from './math.js';

/* ==========================================================================
   CAMERA RIG 2.5D
   Câmera em perspectiva inclinada atrás e acima do plano de combate (X, Z).
   Inclui interpolação suave seguindo a nave lateralmente e screen shake.
   ========================================================================== */
export class CameraRig {
  constructor(arenaWidth = 14, arenaHeight = 24) {
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;

    // A câmera é inclinada para baixo a ~58 graus
    this.camera = new THREE.PerspectiveCamera(52, 9 / 16, 0.1, 100);
    
    // Altura e distância padrão para enquadrar a arena 9:16
    this.baseY = 22;
    this.baseZ = 12;
    this.targetZ = 0; // Ponto central de mira no plano

    this.camera.position.set(0, this.baseY, this.baseZ);
    this.camera.lookAt(0, 0, this.targetZ);

    // Efeito de Screen Shake
    this.shakeIntensity = 0;
    this.shakeDecay = 4.5;
    this.shakeOffset = new THREE.Vector3();

    // Rastreamento suave do jogador (parallax sutil)
    this.targetX = 0;
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  triggerShake(intensity = 0.4) {
    this.shakeIntensity = Math.min(1.2, this.shakeIntensity + intensity);
  }

  update(dt, playerX = 0) {
    // Acompanhamento sutil lateral
    this.targetX = damp(this.targetX, playerX * 0.18, 4, dt);

    // Atualização de Screen Shake
    if (this.shakeIntensity > 0.005) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
      this.shakeOffset.set(
        rand(-1, 1) * this.shakeIntensity,
        rand(-0.6, 0.6) * this.shakeIntensity,
        rand(-1, 1) * this.shakeIntensity
      );
    } else {
      this.shakeIntensity = 0;
      this.shakeOffset.set(0, 0, 0);
    }

    this.camera.position.x = this.targetX + this.shakeOffset.x;
    this.camera.position.y = this.baseY + this.shakeOffset.y;
    this.camera.position.z = this.baseZ + this.shakeOffset.z;

    this.camera.lookAt(this.targetX * 0.6, 0, this.targetZ);
  }
}
