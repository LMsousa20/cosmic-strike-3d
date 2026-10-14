/* ==========================================================================
   MODEL LIBRARY
   Pré-carrega o visual de cada item da config e cria cópias instantâneas
   durante o jogo. Prioridade: .glb → .png (billboard) → procedural.
   ========================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildProcedural } from './ProceduralModels.js';
import { resolveAssetUrl } from '../../shared/assetResolver.js';

/** Diâmetro alvo (unidades do mundo) para cada tipo de entidade com escala 1. */
export const BASE_SIZE = {
  ships: 1.8,
  enemies: 1.6,
  bosses: 6,
  obstacles: 1.6,
  items: 0.8,
  drone: 1.0
};

const OBSTACLE_SHAPE = {
  asteroidField: 'asteroid',
  mine: 'mine',
  laserGate: 'pylon',
  blackHole: 'blackHole',
  energyWall: 'pylon'
};

export class ModelLibrary {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.texLoader = new THREE.TextureLoader();
    this.gltfCache = new Map();
    this.texCache = new Map();
    this.protos = new Map();
  }

  key(collection, id) {
    return `${collection}:${id}`;
  }

  loadTexture(url) {
    if (!this.texCache.has(url)) {
      this.texCache.set(
        url,
        new Promise((resolve, reject) => {
          this.texLoader.load(
            url,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.anisotropy = 4;
              resolve(tex);
            },
            undefined,
            reject
          );
        })
      );
    }
    return this.texCache.get(url);
  }

  loadGltf(url) {
    if (!this.gltfCache.has(url)) {
      this.gltfCache.set(
        url,
        new Promise((resolve, reject) => this.gltfLoader.load(url, (g) => resolve(g.scene), undefined, reject))
      );
    }
    return this.gltfCache.get(url);
  }

  /** Constrói (assíncrono) o visual de uma definição. Usado pelo jogo e pelo preview do painel. */
  async buildVisual(def, collection) {
    const target = (BASE_SIZE[collection] || 1.6) * (def.scale || 1);
    const rotation = THREE.MathUtils.degToRad(def.modelRotation || 0);
    const root = new THREE.Group();
    let source = 'procedural';

    // 1) Modelo GLB
    if (def.model) {
      try {
        const url = await resolveAssetUrl(def.model);
        if (url) {
          const scene = (await this.loadGltf(url)).clone(true);
          const box = new THREE.Box3().setFromObject(scene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          const s = target / Math.max(size.x, size.z, 0.001);
          scene.position.sub(center.multiplyScalar(s));
          scene.scale.multiplyScalar(s);
          const pivot = new THREE.Group();
          pivot.add(scene);
          pivot.rotation.y = rotation;
          root.add(pivot);
          source = 'model';
        }
      } catch (e) {
        console.warn(`[assets] Falha ao carregar modelo de "${def.name}"`, e);
      }
    }

    // 2) Imagem PNG como billboard
    if (source === 'procedural' && def.sprite) {
      try {
        const url = await resolveAssetUrl(def.sprite);
        if (url) {
          const tex = await this.loadTexture(url);
          const aspect = tex.image ? tex.image.width / tex.image.height : 1;
          const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, rotation, depthWrite: false });
          const sprite = new THREE.Sprite(mat);
          const h = aspect >= 1 ? target / aspect : target;
          sprite.scale.set(h * aspect, h, 1);
          sprite.position.y = 0.2;
          root.add(sprite);
          root.userData.isSprite = true;
          source = 'sprite';
        }
      } catch (e) {
        console.warn(`[assets] Falha ao carregar imagem de "${def.name}"`, e);
      }
    }

    // 3) Procedural
    if (source === 'procedural') {
      let shape = def.shape;
      if (collection === 'obstacles') shape = OBSTACLE_SHAPE[def.type] || 'mine';
      const model = buildProcedural(shape, def.color, def.accent);
      if (collection !== 'items') model.scale.multiplyScalar(def.scale || 1);
      root.add(model);
      if (model.userData.engines) root.userData.engines = model.userData.engines.map((p) => p.map((v) => v * model.scale.x));
    }

    root.userData.source = source;
    root.userData.radius = target * 0.42;
    return root;
  }

  async preloadConfig(config, onProgress = () => {}) {
    this.protos.clear();
    const jobs = [];
    for (const col of ['ships', 'enemies', 'bosses', 'obstacles']) {
      for (const def of config[col] || []) jobs.push([col, def]);
    }
    let done = 0;
    await Promise.all(
      jobs.map(async ([col, def]) => {
        const visual = await this.buildVisual(def, col);
        this.protos.set(this.key(col, def.id), visual);
        onProgress(++done / (jobs.length + 1));
      })
    );
    // Itens fixos e drone
    const items = {
      coin: buildProcedural('coin'),
      powerup: buildProcedural('capsule_powerup'),
      shield: buildProcedural('capsule_shield'),
      bomb: buildProcedural('capsule_bomb')
    };
    for (const [k, v] of Object.entries(items)) {
      v.userData.radius = 0.45;
      this.protos.set(this.key('items', k), v);
    }
    onProgress(1);
  }

  /** Cria uma cópia sincrona com materiais próprios (para flash de dano individual). */
  instantiate(collection, id, fallbackDef = null) {
    let proto = this.protos.get(this.key(collection, id));
    if (!proto) {
      const def = fallbackDef || { shape: 'scout', color: '#f43f5e', accent: '#fde047' };
      proto = buildProcedural(collection === 'obstacles' ? OBSTACLE_SHAPE[def.type] || 'mine' : def.shape, def.color, def.accent);
      proto.userData.radius = (BASE_SIZE[collection] || 1.6) * 0.42 * (def.scale || 1);
    }
    const obj = proto.clone(true);
    obj.traverse((o) => {
      if (o.isMesh || o.isSprite) {
        o.material = o.material.clone();
        const m = o.material;
        m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null;
        m.userData.baseEmissiveIntensity = m.emissiveIntensity ?? 1;
        m.userData.baseColor = m.color ? m.color.clone() : null;
      }
    });
    obj.userData.pulseList = [];
    obj.userData.spinList = [];
    obj.userData.segmentList = [];
    obj.traverse((o) => {
      if (o.name === 'pulse') obj.userData.pulseList.push(o);
      if (o.name === 'spin') obj.userData.spinList.push(o);
      if (o.name === 'segment') obj.userData.segmentList.push(o);
    });
    return obj;
  }
}

/* ==========================================================================
   HELPERS DE VISUAL (animação, flash, descarte)
   ========================================================================== */
export function animateVisual(obj, t, dt) {
  const ud = obj.userData;
  if (ud.spinList) for (const s of ud.spinList) s.rotation.y += (s.userData.spinSpeed || 1) * dt;
  if (ud.pulseList)
    for (const p of ud.pulseList) {
      if (p.material?.userData?.baseEmissiveIntensity !== undefined && !ud.flashing) {
        p.material.emissiveIntensity = p.material.userData.baseEmissiveIntensity * (0.7 + 0.45 * Math.sin(t * 6));
      }
    }
  if (ud.segmentList)
    for (const s of ud.segmentList) {
      const i = s.userData.segIndex || 1;
      s.position.x = Math.sin(t * 2.2 - i * 0.7) * 0.28 * i;
    }
}

export function flashVisual(obj, duration = 0.06, color = 0xffffff) {
  if (!obj || !obj.userData) return;
  obj.userData.flashUntil = performance.now() + duration * 1000;
  if (obj.userData.flashing) return;
  obj.userData.flashing = true;
  obj.traverse((o) => {
    const m = o.material;
    if (!m) return;
    if (!m.userData) m.userData = {};
    if (!m.userData._flashOrigEmissive && m.emissive) {
      m.userData._flashOrigEmissive = m.emissive.clone();
      m.userData._flashOrigIntensity = m.emissiveIntensity ?? 0;
    }
    if (!m.userData._flashOrigColor && m.color) {
      m.userData._flashOrigColor = m.color.clone();
    }
    if (o.isSprite) {
      m.color.setScalar(4);
    } else if (m.emissive) {
      m.emissive.setHex(color);
      m.emissiveIntensity = 2.5;
    }
  });
}

export function updateFlash(obj) {
  if (!obj || !obj.userData || !obj.userData.flashing) return;
  if (performance.now() < obj.userData.flashUntil) return;
  obj.userData.flashing = false;
  obj.traverse((o) => {
    const m = o.material;
    if (!m || !m.userData) return;
    if (o.isSprite && m.userData._flashOrigColor) {
      m.color.copy(m.userData._flashOrigColor);
    } else if (m.emissive) {
      if (m.userData._flashOrigEmissive) {
        m.emissive.copy(m.userData._flashOrigEmissive);
        m.emissiveIntensity = m.userData._flashOrigIntensity ?? 0;
      } else if (m.userData.baseEmissive) {
        m.emissive.copy(m.userData.baseEmissive);
        m.emissiveIntensity = m.userData.baseEmissiveIntensity ?? 0;
      } else {
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
      }
    }
  });
}

export function tintVisual(obj, hex, intensity = 1) {
  obj.traverse((o) => {
    const m = o.material;
    if (!m) return;
    if (m.emissive && m.userData.baseEmissive) {
      m.userData.baseEmissive = new THREE.Color(hex);
      m.userData.baseEmissiveIntensity = Math.max(m.userData.baseEmissiveIntensity, intensity);
      m.emissive.copy(m.userData.baseEmissive);
      m.emissiveIntensity = m.userData.baseEmissiveIntensity;
    }
  });
}

export function setOpacity(obj, opacity) {
  obj.traverse((o) => {
    const m = o.material;
    if (!m) return;
    m.transparent = true;
    m.opacity = opacity;
  });
}

export function disposeVisual(obj) {
  obj.traverse((o) => {
    if (o.material) o.material.dispose();
  });
  obj.removeFromParent();
}
