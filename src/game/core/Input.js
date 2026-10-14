import * as THREE from 'three';

/* ==========================================================================
   INPUT CONTROLLER
   Teclado (WASD/Setas/Espaço), Mouse e Touch com offset vertical ergonômico.
   Converte coordenadas de tela diretamente para o plano 3D (Y = 0).
   ========================================================================== */
export class InputController {
  constructor(canvasElement, camera, arenaWidth, arenaHeight) {
    this.canvas = canvasElement;
    this.camera = camera;
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;

    // Estado do teclado
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false
    };

    // Posição alvo contínua no plano do mundo (X, Z)
    this.targetPos = new THREE.Vector3(0, 0, arenaHeight * 0.35);
    this.hasActivePointer = false;
    this.isTouch = false;

    // Offset vertical no touch: desloca o alvo ~65px para cima para que o dedo não tampe a nave
    this.touchOffsetY = 70;

    // Raycaster e plano de interseção do combate (Y = 0)
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.pointerNdc = new THREE.Vector2();
    this.intersection = new THREE.Vector3();

    // Callbacks de ações rápidas para PC e Touch
    this.onBombTrigger = null;
    this.onWingmanTrigger = null;
    this.onUpgradeHpTrigger = null;
    this.onUpgradeSpeedTrigger = null;
    this.onUpgradeMagnetTrigger = null;
    this.onBuyBombTrigger = null;
    this.onPauseTrigger = null;

    this.setupListeners();
  }

  setupListeners() {
    // Teclado
    window.addEventListener('keydown', (e) => {
      // Ignora se estiver digitando em formulários
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.keys.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys.down = true;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = true;

      // Bomba EMP: Espaço, B ou Q
      if (code === 'Space' || code === 'KeyB' || code === 'KeyQ') {
        if (!e.repeat && this.onBombTrigger) this.onBombTrigger();
        if (code === 'Space') this.keys.space = true;
      }

      // Chamar Reforço (Wingman): R ou E
      if (code === 'KeyR' || code === 'KeyE') {
        if (!e.repeat && this.onWingmanTrigger) this.onWingmanTrigger();
      }

      // Atalhos Rápidos da Oficina no PC:
      // 1: HP / Blindagem
      if (code === 'Digit1' || code === 'Numpad1') {
        if (!e.repeat && this.onUpgradeHpTrigger) this.onUpgradeHpTrigger();
      }
      // 2: Turbinas / Velocidade
      if (code === 'Digit2' || code === 'Numpad2') {
        if (!e.repeat && this.onUpgradeSpeedTrigger) this.onUpgradeSpeedTrigger();
      }
      // 3: Campo Magnético / Ímã
      if (code === 'Digit3' || code === 'Numpad3') {
        if (!e.repeat && this.onUpgradeMagnetTrigger) this.onUpgradeMagnetTrigger();
      }
      // 4: Recarregar Bomba EMP
      if (code === 'Digit4' || code === 'Numpad4') {
        if (!e.repeat && this.onBuyBombTrigger) this.onBuyBombTrigger();
      }

      // Pausa: ESC ou P
      if ((code === 'Escape' || code === 'KeyP') && this.onPauseTrigger) {
        this.onPauseTrigger();
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.keys.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = false;
      if (code === 'Space') this.keys.space = false;
    });

    // Pointer / Mouse / Touch
    this.canvas.addEventListener('pointerdown', (e) => {
      this.hasActivePointer = true;
      this.isTouch = e.pointerType === 'touch';
      this.updatePointerTarget(e.clientX, e.clientY);
    });

    window.addEventListener('pointermove', (e) => {
      if (this.hasActivePointer || e.pointerType === 'mouse') {
        this.isTouch = e.pointerType === 'touch';
        this.updatePointerTarget(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointerup', () => {
      this.hasActivePointer = false;
    });

    window.addEventListener('pointercancel', () => {
      this.hasActivePointer = false;
    });
  }

  updatePointerTarget(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Aplica o offset se for touch para que o dedo não cubra a nave
    let adjustedY = clientY;
    if (this.isTouch) {
      adjustedY = clientY - this.touchOffsetY;
    }

    // Coordenadas Normalizadas NDC [-1, 1]
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((adjustedY - rect.top) / rect.height) * 2 + 1;

    // Raycast para o plano Y = 0
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
      // Limita à área da arena
      const halfW = this.arenaWidth * 0.45;
      const halfH = this.arenaHeight * 0.45;
      this.targetPos.x = THREE.MathUtils.clamp(this.intersection.x, -halfW, halfW);
      this.targetPos.z = THREE.MathUtils.clamp(this.intersection.z, -halfH, halfH);
    }
  }

  isKeyboardMoving() {
    return this.keys.up || this.keys.down || this.keys.left || this.keys.right;
  }
}
