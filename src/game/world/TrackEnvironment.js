import * as THREE from 'three';
import { rand } from '../core/math.js';
import { resolveAssetUrl } from '../../shared/assetResolver.js';

/* ==========================================================================
   TRACK ENVIRONMENT (CENÁRIO 3D & PISTAS)
   Renderiza a pista/terreno 3D em rolagem contínua com estilos visuais:
   - neonGrid: Grade futurista synthwave
   - lava: Crosta de magma vulcânico
   - rocky: Planeta rochoso/glacial
   - deepSpace: Vácuo sideral com estrelas volumétricas
   Suporta texturas personalizadas cadastradas pelo painel administrativo.
   ========================================================================== */
export class TrackEnvironment {
  constructor(scene, engine, modelLibrary) {
    this.scene = scene;
    this.engine = engine;
    this.modelLibrary = modelLibrary;

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.scrollSpeed = 6;
    this.trackOffset = 0;

    // Dimensões do piso da pista
    this.floorWidth = 36;
    this.floorLength = 80;

    // Criar piso e estrelas
    this.createFloor();
    this.createStarfields();
  }

  createFloor() {
    // Geometria do terreno plano abaixo da arena de combate (Y = -2)
    const geo = new THREE.PlaneGeometry(this.floorWidth, this.floorLength, 32, 64);
    geo.rotateX(-Math.PI / 2);

    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x05060f,
      roughness: 0.8,
      metalness: 0.3,
      flatShading: true
    });

    this.floorMesh = new THREE.Mesh(geo, this.floorMaterial);
    this.floorMesh.position.set(0, -2.5, 0);
    this.root.add(this.floorMesh);

    // Grade Néon Dinâmica sobreposta
    this.gridHelper = new THREE.GridHelper(this.floorWidth, 32, 0x00f0ff, 0x1e293b);
    this.gridHelper.position.set(0, -2.48, 0);
    this.root.add(this.gridHelper);
  }

  createStarfields() {
    // Camada 1: Estrelas distantes (pequenas e lentas)
    this.starsFar = this.buildStarLayer(600, 0.12, 0x64748b, 45, 120);
    this.root.add(this.starsFar);

    // Camada 2: Estrelas próximas néon (rápidas com rastro visual)
    this.starsNear = this.buildStarLayer(250, 0.28, 0x38bdf8, 25, 80);
    this.root.add(this.starsNear);
  }

  buildStarLayer(count, size, colorHex, spreadX, spreadZ) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = rand(-spreadX, spreadX);
      positions[i * 3 + 1] = rand(-6, 25);
      positions[i * 3 + 2] = rand(-spreadZ, spreadZ);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: size,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    points.userData.spreadZ = spreadZ;
    return points;
  }

  async applyTrackConfig(trackDef) {
    if (!trackDef) return;

    this.scrollSpeed = (trackDef.scrollSpeed || 150) * 0.04;

    // Atualiza tema de luz e névoa da Engine
    this.engine.setLightingTheme(trackDef.lightColor || '#a5f3fc', trackDef.fogColor || '#0b0720');

    // Estilo da pista
    const style = trackDef.style || 'neonGrid';
    if (style === 'deepSpace') {
      this.floorMesh.visible = false;
      this.gridHelper.visible = false;
    } else {
      this.floorMesh.visible = true;
      this.gridHelper.visible = style === 'neonGrid';
      this.floorMaterial.color.set(trackDef.groundColor || '#05060f');

      // Se houver textura personalizada cadastrada no painel
      if (trackDef.groundTexture) {
        try {
          const url = await resolveAssetUrl(trackDef.groundTexture);
          if (url) {
            const tex = await this.modelLibrary.loadTexture(url);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(4, 12);
            this.floorMaterial.map = tex;
            this.floorMaterial.needsUpdate = true;
          }
        } catch (e) {
          console.warn('[track] Falha ao carregar textura do chão:', e);
        }
      } else {
        this.floorMaterial.map = null;
        this.floorMaterial.needsUpdate = true;
      }
    }

    // Cores da grade
    if (trackDef.gridColor && this.gridHelper.material) {
      this.gridHelper.material.color.set(trackDef.gridColor);
    }
  }

  update(dt) {
    const moveZ = this.scrollSpeed * dt;
    this.trackOffset += moveZ;

    // Rolagem da textura do chão
    if (this.floorMaterial.map) {
      this.floorMaterial.map.offset.y = -(this.trackOffset * 0.1) % 1;
    }

    // Rolagem da grade
    this.gridHelper.position.z = (this.trackOffset % (this.floorLength / 32));

    // Rolagem das estrelas distantes
    this.updateStarPositions(this.starsFar, moveZ * 0.35);

    // Rolagem das estrelas próximas
    this.updateStarPositions(this.starsNear, moveZ * 1.25);
  }

  updateStarPositions(points, speed) {
    const pos = points.geometry.attributes.position;
    const count = pos.count;
    const limitZ = points.userData.spreadZ;

    for (let i = 0; i < count; i++) {
      let z = pos.getZ(i) + speed;
      if (z > limitZ) {
        z = -limitZ;
        pos.setX(i, rand(-points.userData.spreadZ * 0.5, points.userData.spreadZ * 0.5));
      }
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  }
}
