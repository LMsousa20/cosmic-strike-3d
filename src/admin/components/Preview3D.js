import * as THREE from 'three';
import { ModelLibrary } from '../../game/core/ModelLibrary.js';

/* ==========================================================================
   PREVIEW 3D COMPONENT (MINI-CENA THREE.JS PARA O PAINEL ADMIN)
   Renderiza qualquer entidade 3D girando 360° com atualização em tempo real.
   ========================================================================== */
export class Preview3D {
  constructor(containerElement) {
    this.container = containerElement;
    this.modelLibrary = new ModelLibrary();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020308);

    // Câmera
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    this.camera.position.set(0, 2.5, 4.5);
    this.camera.lookAt(0, 0, 0);

    // Renderizador
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.container.appendChild(this.renderer.domElement);

    // Luzes
    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    const dir = new THREE.DirectionalLight(0x00f0ff, 1.8);
    dir.position.set(3, 8, 4);
    this.scene.add(amb, dir);

    // Grade sutil no chão do preview
    const grid = new THREE.GridHelper(6, 12, 0x00f0ff, 0x1e293b);
    grid.position.y = -1.2;
    this.scene.add(grid);

    this.currentObject = null;
    this.isRunning = true;

    this.resize();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const w = this.container.clientWidth || 300;
    const h = this.container.clientHeight || 300;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  async updatePreview(def, collectionKey) {
    if (this.currentObject) {
      this.scene.remove(this.currentObject);
      this.currentObject = null;
    }

    try {
      const visual = await this.modelLibrary.buildVisual(def, collectionKey);
      this.currentObject = visual;
      this.scene.add(visual);

      // Enquadra a câmera conforme a escala
      const s = def.scale || 1;
      this.camera.position.set(0, 2.5 * s, 4.5 * s);
      this.camera.lookAt(0, 0, 0);
    } catch (e) {
      console.warn('Erro ao gerar preview 3D:', e);
    }
  }

  animate() {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    if (this.currentObject) {
      this.currentObject.rotation.y += 0.015;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.isRunning = false;
    this.renderer.dispose();
  }
}
