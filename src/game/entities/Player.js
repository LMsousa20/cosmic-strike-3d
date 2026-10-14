import * as THREE from 'three';
import { damp, clamp } from '../core/math.js';
import { flashVisual, updateFlash, setOpacity } from '../core/ModelLibrary.js';

/* ==========================================================================
   PLAYER ENTITY (NAVE DO JOGADOR 3D)
   Controla a nave, rolagem bancária (banking), tiros, escudo e dano.
   ========================================================================== */
export class Player {
  constructor(scene, modelLibrary, shipDef) {
    this.scene = scene;
    this.modelLibrary = modelLibrary;
    this.shipDef = shipDef;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Instancia o modelo visual da nave selecionada
    this.visual = this.modelLibrary.instantiate('ships', shipDef.id, shipDef);
    this.root.add(this.visual);

    // Hitbox de precisão central (raio pequeno no plano)
    this.radius = 0.45;
    this.isDead = false;

    // Escudo visual 3D
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.35,
        wireframe: true
      })
    );
    this.shieldMesh.visible = false;
    this.root.add(this.shieldMesh);

    // Núcleo de Hitbox (Dot ciano neon visual)
    this.hitcoreDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ffff })
    );
    this.hitcoreDot.position.y = 0.2;
    this.root.add(this.hitcoreDot);

    // Posição e Velocidade
    this.position = this.root.position;
    this.position.set(0, 0, 7.5); // Começa na parte inferior da tela

    this.velocity = new THREE.Vector3();
    this.currentRoll = 0;
    this.currentPitch = 0;

    // Cadência e Mísseis
    this.lastShotTime = 0;
    this.lastMissileTime = 0;

    // Invulnerabilidade temporária pós-dano
    this.isInvulnerable = false;
    this.invulnerableUntil = 0;
  }

  setShip(newShipDef) {
    this.shipDef = newShipDef;
    this.root.remove(this.visual);
    this.visual = this.modelLibrary.instantiate('ships', newShipDef.id, newShipDef);
    this.root.add(this.visual);
  }

  update(dt, input, engineArenaW, engineArenaH, speedMultiplier = 1) {
    if (this.isDead) return;

    // Atualiza animações e flash do visual
    updateFlash(this.visual);

    // Atualiza estado de invulnerabilidade
    if (this.isInvulnerable) {
      if (performance.now() > this.invulnerableUntil) {
        this.isInvulnerable = false;
        setOpacity(this.visual, 1.0);
      } else {
        const blink = Math.sin(performance.now() * 0.035) > 0 ? 0.3 : 1.0;
        setOpacity(this.visual, blink);
      }
    }

    // Calcula velocidade de movimento
    const baseSpeed = 16 * (this.shipDef.speed || 1) * speedMultiplier;
    let targetVx = 0;
    let targetVz = 0;

    if (input.isKeyboardMoving()) {
      if (input.keys.left) targetVx -= baseSpeed;
      if (input.keys.right) targetVx += baseSpeed;
      if (input.keys.up) targetVz -= baseSpeed;
      if (input.keys.down) targetVz += baseSpeed;
    } else {
      // Segue suavemente o ponteiro / toque com offset
      const dx = input.targetPos.x - this.position.x;
      const dz = input.targetPos.z - this.position.z;

      if (Math.abs(dx) > 0.05) targetVx = clamp(dx * 9, -baseSpeed, baseSpeed);
      if (Math.abs(dz) > 0.05) targetVz = clamp(dz * 9, -baseSpeed, baseSpeed);
    }

    // Interpolação de velocidade
    this.velocity.x = damp(this.velocity.x, targetVx, 14, dt);
    this.velocity.z = damp(this.velocity.z, targetVz, 14, dt);

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Limites da Arena (mantém a nave dentro da tela 9:16)
    const limitX = engineArenaW * 0.44;
    const limitZ = engineArenaH * 0.44;
    this.position.x = clamp(this.position.x, -limitX, limitX);
    this.position.z = clamp(this.position.z, -limitZ, limitZ);

    // Efeito de Banking (inclina a nave lateralmente ao virar)
    const targetRoll = (-this.velocity.x / baseSpeed) * 0.65;
    this.currentRoll = damp(this.currentRoll, targetRoll, 10, dt);
    this.root.rotation.z = this.currentRoll;

    // Efeito de Pitch (inclina suavemente para frente/trás)
    const targetPitch = (this.velocity.z / baseSpeed) * 0.2;
    this.currentPitch = damp(this.currentPitch, targetPitch, 8, dt);
    this.root.rotation.x = this.currentPitch;

    // Efeito de pulso no escudo
    if (this.shieldMesh.visible) {
      this.shieldMesh.rotation.y += 1.5 * dt;
      this.shieldMesh.rotation.x += 0.8 * dt;
    }
  }

  triggerInvulnerability(durationSeconds = 1.2) {
    this.isInvulnerable = true;
    this.invulnerableUntil = performance.now() + durationSeconds * 1000;
  }

  takeHit() {
    flashVisual(this.visual, 0.08, 0xffffff);
    this.triggerInvulnerability(1.2);
  }

  setShieldActive(active) {
    this.shieldMesh.visible = active;
  }

  destroy() {
    this.scene.remove(this.root);
  }
}
