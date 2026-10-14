import * as THREE from 'three';
import { CameraRig } from './CameraRig.js';

/* ==========================================================================
   ENGINE THREE.JS CENTRAL
   Gerencia Renderizador, Cena, Câmera 2.5D, Loop Principal e Resize
   ========================================================================== */
export class Engine {
  constructor(containerElement) {
    this.container = containerElement;

    // Dimensões da Arena de Combate 3D (unidades do mundo)
    // Proporção de aspecto vertical estreita (largura ~14.5, altura ~26)
    this.arenaWidth = 14.5;
    this.arenaHeight = 26;

    // Cena
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060814, 0.015);

    // Câmera Rig 2.5D
    this.cameraRig = new CameraRig(this.arenaWidth, this.arenaHeight);
    this.camera = this.cameraRig.camera;

    // Renderizador WebGL de alta qualidade
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x020308, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.container.appendChild(this.renderer.domElement);

    // Sistema de Iluminação
    this.setupLighting();

    // Loop e Tempo
    this.clock = new THREE.Clock();
    this.isRunning = false;
    this.updateCallbacks = [];

    // Redimensionamento
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  setupLighting() {
    // Luz ambiente suave
    this.ambientLight = new THREE.AmbientLight(0x38bdf8, 0.6);
    this.scene.add(this.ambientLight);

    // Luz principal direcional néon vinda de cima
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    this.dirLight.position.set(5, 20, 10);
    this.scene.add(this.dirLight);

    // Luz de preenchimento de baixo/frente para realçar cascos de naves
    this.rimLight = new THREE.DirectionalLight(0x00f0ff, 0.8);
    this.rimLight.position.set(-6, -5, -8);
    this.scene.add(this.rimLight);
  }

  setLightingTheme(lightHex = '#a5f3fc', fogHex = '#0b0720') {
    this.ambientLight.color.set(lightHex);
    this.dirLight.color.set(lightHex);
    this.scene.fog.color.set(fogHex);
    this.renderer.setClearColor(fogHex, 1);
  }

  handleResize() {
    const width = this.container.clientWidth || 540;
    const height = this.container.clientHeight || 960;

    this.cameraRig.setAspect(width / height);
    this.renderer.setSize(width, height, false);
  }

  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.loop();
  }

  stop() {
    this.isRunning = false;
    this.clock.stop();
  }

  loop() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.loop());

    // Delta time limitado a 0.1s para evitar saltos enormes em aba inativa
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    for (const cb of this.updateCallbacks) {
      cb(dt, elapsedTime);
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
