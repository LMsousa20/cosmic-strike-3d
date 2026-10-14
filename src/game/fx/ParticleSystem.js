import * as THREE from 'three';
import { rand } from '../core/math.js';

/* ==========================================================================
   PARTICLE SYSTEM 3D (OTIMIZADO)
   Cache de materiais para evitar alocação e garbage collection constante.
   ========================================================================== */
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.rings = [];

    // Geometrias compartilhadas
    this.sparkGeo = new THREE.SphereGeometry(0.12, 6, 4);
    this.ringGeo = new THREE.RingGeometry(0.2, 0.45, 32);
    this.ringGeo.rotateX(-Math.PI / 2);

    // Cache de materiais por cor
    this.matCache = new Map();
    this.ringMatCache = new Map();
  }

  getSparkMaterial(colorHex) {
    if (!this.matCache.has(colorHex)) {
      this.matCache.set(
        colorHex,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(colorHex),
          transparent: true,
          opacity: 0.9,
          depthWrite: false
        })
      );
    }
    return this.matCache.get(colorHex);
  }

  getRingMaterial(colorHex) {
    if (!this.ringMatCache.has(colorHex)) {
      this.ringMatCache.set(
        colorHex,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(colorHex),
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      );
    }
    return this.ringMatCache.get(colorHex);
  }

  createExplosion(x, z, colorHex = '#f43f5e', count = 14, isLarge = false) {
    const particleCount = isLarge ? count * 2 : count;
    const baseSpeed = isLarge ? 11 : 6.5;
    const mat = this.getSparkMaterial(colorHex);

    for (let i = 0; i < particleCount; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      const scale = rand(isLarge ? 0.8 : 0.4, isLarge ? 2.0 : 1.1);
      mesh.scale.setScalar(scale);
      mesh.position.set(x, rand(-0.2, 0.5), z);

      const angle = rand(0, Math.PI * 2);
      const speed = rand(baseSpeed * 0.3, baseSpeed);
      const vx = Math.cos(angle) * speed;
      const vz = Math.sin(angle) * speed;
      const vy = rand(-2, 2.5);

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vx, vy, vz,
        life: 1.0,
        decay: rand(1.8, 3.2),
        baseScale: scale
      });
    }

    // Cria anel de onda de choque no solo
    this.createShockwave(x, z, colorHex, isLarge ? 8 : 3.8);
  }

  createShockwave(x, z, colorHex = '#00f0ff', maxRadius = 4.5) {
    const mat = this.getRingMaterial(colorHex);
    const ringMesh = new THREE.Mesh(this.ringGeo, mat);
    ringMesh.position.set(x, 0.05, z);
    this.scene.add(ringMesh);

    this.rings.push({
      mesh: ringMesh,
      radius: 0.2,
      maxRadius,
      growthSpeed: maxRadius * 3.5,
      life: 1.0,
      decay: 2.8
    });
  }

  update(dt) {
    // Limite máximo de partículas simultâneas para não estourar a GPU
    if (this.particles.length > 250) {
      const excess = this.particles.splice(0, this.particles.length - 200);
      for (const p of excess) this.scene.remove(p.mesh);
    }

    // Atualiza partículas de faísca
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vx *= 0.94;
      p.vz *= 0.94;
      p.mesh.scale.setScalar(p.life * p.baseScale);
    }

    // Atualiza anéis de onda de choque
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= r.decay * dt;
      r.radius += r.growthSpeed * dt;

      if (r.life <= 0 || r.radius >= r.maxRadius) {
        this.scene.remove(r.mesh);
        this.rings.splice(i, 1);
        continue;
      }

      r.mesh.scale.setScalar(r.radius);
    }
  }

  clear() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
    }
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
    }
    this.particles = [];
    this.rings = [];
  }
}
