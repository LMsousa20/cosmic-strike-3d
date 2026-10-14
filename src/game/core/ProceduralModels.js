/* ==========================================================================
   MODELOS PROCEDURAIS LOW-POLY
   Usados quando o item não tem .glb nem .png cadastrado.
   Convenção: a "frente" do modelo aponta para -Z (topo da tela).
   Filhos nomeados recebem animação automática:
     "spin"    → gira no eixo Y (userData.spinSpeed)
     "pulse"   → brilho pulsante
     "segment" → ondulação lateral (Leviatã)
   ========================================================================== */
import * as THREE from 'three';

const C = (c) => new THREE.Color(c);

const hull = (color, o = {}) =>
  new THREE.MeshStandardMaterial({ color: C(color), metalness: 0.55, roughness: 0.38, flatShading: true, ...o });
const glow = (color, intensity = 2.2, o = {}) =>
  new THREE.MeshStandardMaterial({ color: 0x0b0b0b, emissive: C(color), emissiveIntensity: intensity, roughness: 0.5, metalness: 0, ...o });
const glass = (color) =>
  new THREE.MeshStandardMaterial({ color: 0x050a18, emissive: C(color), emissiveIntensity: 0.9, metalness: 0.9, roughness: 0.12 });

function mesh(geo, mat, x = 0, y = 0, z = 0, name = '') {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (name) m.name = name;
  return m;
}

/** Converte geometria com eixo +Y para eixo -Z (frente). */
function alongZ(geo) {
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** Placa extrudada a partir de pontos 2D (x lateral, y frente). */
function plate(points, depth = 0.1, bevel = 0.025) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -depth / 2, 0);
  return g;
}

/** Espelha uma lista de pontos do lado direito para formar um contorno simétrico. */
function mirror(rightSide) {
  const left = rightSide
    .slice()
    .reverse()
    .filter((p) => p[0] !== 0)
    .map(([x, y]) => [-x, y]);
  return [...rightSide, ...left];
}

function rockGeometry(radius, detail = 1, roughness = 0.28, seed = 1) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // hash determinístico pela posição → vértices duplicados recebem o mesmo deslocamento
    const h = Math.sin(v.x * 12.9898 * seed + v.y * 78.233 + v.z * 37.719) * 43758.5453;
    const n = (h - Math.floor(h)) * 2 - 1;
    v.multiplyScalar(1 + n * roughness);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function engines(group, list, accent, radius = 0.11) {
  const dark = hull(0x1e293b);
  const flame = glow(accent, 3);
  group.userData.engines = [];
  for (const [x, y, z] of list) {
    group.add(mesh(alongZ(new THREE.CylinderGeometry(radius, radius * 1.25, 0.32, 8)), dark, x, y, z));
    group.add(mesh(new THREE.SphereGeometry(radius * 0.9, 8, 6), flame, x, y, z + 0.17));
    group.userData.engines.push([x, y, z + 0.25]);
  }
}

/* ==========================================================================
   NAVES JOGÁVEIS
   ========================================================================== */
function fighter(color, accent) {
  const g = new THREE.Group();
  const white = hull(0xe2e8f0);
  const main = hull(color);
  const acc = glow(accent, 2.4);
  g.add(mesh(alongZ(new THREE.ConeGeometry(0.26, 1.5, 6)), white, 0, 0.05, -0.25));
  g.add(mesh(alongZ(new THREE.CylinderGeometry(0.26, 0.32, 0.7, 6)), white, 0, 0.05, 0.85));
  g.add(mesh(plate(mirror([[0, 0.5], [1.05, -0.45], [1.05, -0.75], [0.25, -0.6], [0, -0.75]]), 0.08), main, 0, 0, 0.25));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.07, 0.55), acc, 1.05, 0, 0.82));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.07, 0.55), acc, -1.05, 0, 0.82));
  for (const x of [-0.62, 0.62]) {
    g.add(mesh(alongZ(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6)), white, x, 0.06, 0.15));
    g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), acc, x, 0.06, -0.27));
  }
  const cockpit = mesh(new THREE.SphereGeometry(0.2, 12, 8), glass(accent), 0, 0.2, -0.2);
  cockpit.scale.set(0.8, 0.6, 1.9);
  g.add(cockpit);
  g.add(mesh(new THREE.BoxGeometry(0.04, 0.35, 0.5), main, 0, 0.26, 0.95));
  engines(g, [[-0.18, 0.05, 1.3], [0.18, 0.05, 1.3]], accent);
  g.scale.setScalar(0.85);
  return g;
}

function interceptor(color, accent) {
  const g = new THREE.Group();
  const main = hull(color);
  const dark = hull(0x1f2937);
  const acc = glow(accent, 2.4);
  g.add(mesh(alongZ(new THREE.ConeGeometry(0.2, 2.1, 6)), main, 0, 0.05, -0.3));
  g.add(mesh(plate(mirror([[0.15, -0.1], [1.0, 0.35], [1.12, 0.15], [0.35, -0.75], [0, -0.75]]), 0.07), dark, 0, 0, 0.35));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), acc, 1.02, 0, 0.15));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), acc, -1.02, 0, 0.15));
  for (const s of [-1, 1]) {
    const fin = mesh(new THREE.BoxGeometry(0.04, 0.4, 0.45), main, s * 0.28, 0.22, 0.85);
    fin.rotation.z = s * -0.35;
    g.add(fin);
  }
  const cockpit = mesh(new THREE.SphereGeometry(0.17, 12, 8), glass(accent), 0, 0.17, -0.35);
  cockpit.scale.set(0.8, 0.6, 2.2);
  g.add(cockpit);
  engines(g, [[0, 0.05, 0.95]], accent, 0.16);
  g.scale.setScalar(0.85);
  return g;
}

function heavy(color, accent) {
  const g = new THREE.Group();
  const main = hull(color);
  const dark = hull(0x27272a);
  const acc = glow(accent, 2.2);
  g.add(mesh(new THREE.BoxGeometry(0.9, 0.45, 2.0), main, 0, 0.05, 0.1));
  g.add(mesh(alongZ(new THREE.CylinderGeometry(0.0, 0.45, 0.6, 4)), main, 0, 0.05, -1.2));
  g.add(mesh(plate(mirror([[0.45, 0.45], [1.35, 0.1], [1.35, -0.7], [0.45, -0.85], [0, -0.85]]), 0.14), dark, 0, 0, 0.3));
  for (const x of [-1.15, 1.15]) {
    g.add(mesh(new THREE.BoxGeometry(0.3, 0.3, 1.1), main, x, 0.08, 0.3));
    g.add(mesh(alongZ(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 6)), dark, x, 0.1, -0.5));
    g.add(mesh(new THREE.SphereGeometry(0.09, 6, 4), acc, x, 0.1, -0.85));
  }
  const cockpit = mesh(new THREE.BoxGeometry(0.45, 0.2, 0.6), glass(accent), 0, 0.33, -0.35);
  g.add(cockpit);
  engines(g, [[-0.3, 0.05, 1.15], [0.3, 0.05, 1.15], [-1.15, 0.08, 0.95], [1.15, 0.08, 0.95]], accent, 0.12);
  g.scale.setScalar(0.8);
  return g;
}

function stealth(color, accent) {
  const g = new THREE.Group();
  const pts = mirror([[0, 1.15], [1.2, -0.8], [0.5, -0.55], [0, -0.85]]);
  g.add(mesh(plate(pts, 0.16), hull(color, { metalness: 0.8, roughness: 0.25 })));
  const edge = mesh(plate(pts, 0.04, 0), glow(accent, 1.8), 0, -0.07, 0);
  edge.scale.set(1.06, 1, 1.06);
  g.add(edge);
  const cockpit = mesh(new THREE.SphereGeometry(0.2, 12, 8), glass(accent), 0, 0.12, -0.3);
  cockpit.scale.set(0.9, 0.5, 2);
  g.add(cockpit);
  engines(g, [[-0.28, 0.02, 0.75], [0.28, 0.02, 0.75]], accent, 0.1);
  g.scale.setScalar(0.85);
  return g;
}

/* ==========================================================================
   INIMIGOS (construídos com frente em -Z; o jogo vira para baixo)
   ========================================================================== */
function scout(color, accent) {
  const g = new THREE.Group();
  g.add(mesh(plate([[0, 0.9], [0.95, -0.6], [0, -0.3], [-0.95, -0.6]], 0.1), hull(color)));
  const pod = mesh(new THREE.SphereGeometry(0.28, 10, 8), hull(0x1f2937), 0, 0.08, 0);
  pod.scale.set(1, 0.7, 1.6);
  g.add(pod);
  g.add(mesh(new THREE.SphereGeometry(0.13, 8, 6), glow(accent, 3), 0, 0.22, -0.15, 'pulse'));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.05, 0.4), glow(accent, 2), 0.7, 0, -0.35));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.05, 0.4), glow(accent, 2), -0.7, 0, -0.35));
  return g;
}

function gunship(color, accent) {
  const g = new THREE.Group();
  const main = hull(color);
  g.add(mesh(new THREE.BoxGeometry(0.95, 0.45, 1.35), main));
  g.add(mesh(plate(mirror([[0.45, 0.35], [1.35, -0.15], [1.35, -0.6], [0.45, -0.5], [0, -0.5]]), 0.1), hull(0x312e81)));
  g.add(mesh(new THREE.SphereGeometry(0.3, 12, 8), glow(accent, 2.6), 0, 0.32, -0.1, 'pulse'));
  for (const x of [-0.3, 0.3]) g.add(mesh(alongZ(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 6)), hull(0x0f172a), x, 0.1, -0.85));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), glow(accent, 1.6), 1.3, 0, -0.35));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), glow(accent, 1.6), -1.3, 0, -0.35));
  return g;
}

function meteor(color, accent, radius = 0.8) {
  const g = new THREE.Group();
  const rock = mesh(
    rockGeometry(radius, 1, 0.25, Math.random() * 3 + 1),
    hull(color, { metalness: 0.1, roughness: 0.95, emissive: C(accent), emissiveIntensity: 0.12 }),
    0, 0, 0, 'spin'
  );
  rock.userData.spinSpeed = 1.2;
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  g.add(rock);
  return g;
}

function dart(color, accent) {
  const g = new THREE.Group();
  g.add(mesh(alongZ(new THREE.ConeGeometry(0.22, 1.8, 5)), hull(color)));
  g.add(mesh(plate([[0, -0.2], [0.55, -0.95], [0, -0.7], [-0.55, -0.95]], 0.06), hull(0x0f172a), 0, 0, 0.25));
  g.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), glow(accent, 3.2), 0, 0, 0.9, 'pulse'));
  return g;
}

function wasp(color, accent) {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.34, 12, 8), hull(color));
  body.scale.set(0.8, 0.6, 1.7);
  g.add(body);
  g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), glow(accent, 2.4), 0, 0.05, -0.62, 'pulse'));
  const wingMat = glow(accent, 1.2, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  for (const s of [-1, 1]) {
    const w1 = mesh(plate([[0, 0], [s * 1.15, 0.45], [s * 1.25, 0.05], [s * 0.1, -0.25]], 0.02, 0), wingMat, 0, 0.15, -0.1);
    const w2 = mesh(plate([[0, 0], [s * 0.85, -0.15], [s * 0.9, -0.45], [s * 0.1, -0.3]], 0.02, 0), wingMat, 0, 0.12, 0.25);
    g.add(w1, w2);
  }
  return g;
}

function orb(color, accent) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(0.55, 16, 12), hull(color, { metalness: 0.85, roughness: 0.2, flatShading: false })));
  g.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), glow(accent, 3), 0, 0.1, -0.45, 'pulse'));
  const ring = new THREE.Group();
  ring.name = 'spin';
  ring.userData.spinSpeed = 2.4;
  const torus = mesh(new THREE.TorusGeometry(0.85, 0.06, 6, 32), glow(accent, 2.2));
  torus.rotation.x = Math.PI / 2;
  ring.add(torus);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ring.add(mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), hull(0x0f172a), Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85));
  }
  ring.rotation.z = 0.25;
  g.add(ring);
  return g;
}

/* ==========================================================================
   CHEFÕES
   ========================================================================== */
function bossDreadnought(color, accent) {
  const g = new THREE.Group();
  const main = hull(color);
  const dark = hull(0x111827);
  const acc = glow(accent, 2.6);
  g.add(mesh(plate(mirror([[0, 2.0], [2.8, -1.2], [2.8, -1.8], [0, -1.4]]), 0.4), main));
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.6, 2.6), dark, 0, 0.4, -0.1));
  g.add(mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), main, 0, 0.9, 0.5));
  for (const x of [-2.25, 2.25]) {
    g.add(mesh(new THREE.BoxGeometry(0.55, 0.55, 1.8), dark, x, 0.25, -0.6));
    g.add(mesh(new THREE.SphereGeometry(0.2, 8, 6), acc, x, 0.25, -1.55));
  }
  for (const x of [-1.2, 1.2]) g.add(mesh(alongZ(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6)), dark, x, 0.35, -1.1));
  g.add(mesh(new THREE.SphereGeometry(0.6, 16, 12), glow(accent, 3.2), 0, 0.65, -0.6, 'pulse'));
  engines(g, [[-1.5, 0.1, 1.5], [-0.6, 0.1, 1.2], [0.6, 0.1, 1.2], [1.5, 0.1, 1.5]], accent, 0.22);
  return g;
}

function bossHive(color, accent) {
  const g = new THREE.Group();
  g.add(mesh(rockGeometry(1.5, 1, 0.12, 2), hull(color, { roughness: 0.6, metalness: 0.2 })));
  g.add(mesh(new THREE.SphereGeometry(0.55, 16, 12), glow(accent, 3.2), 0, 0.4, -1.2, 'pulse'));
  const crown = new THREE.Group();
  crown.name = 'spin';
  crown.userData.spinSpeed = 0.8;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    crown.add(mesh(new THREE.SphereGeometry(0.42, 10, 8), glow(accent, 1.8), Math.cos(a) * 2.1, 0, Math.sin(a) * 2.1));
    const spike = mesh(new THREE.ConeGeometry(0.15, 0.9, 5), hull(0x1e1b4b), Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55);
    spike.rotation.z = -Math.PI / 2;
    spike.rotation.y = -a;
    crown.add(spike);
  }
  g.add(crown);
  return g;
}

function bossLeviathan(color, accent) {
  const g = new THREE.Group();
  const main = hull(color);
  const head = new THREE.Group();
  head.add(mesh(alongZ(new THREE.ConeGeometry(1.0, 2.4, 6)), main, 0, 0, -1.2));
  head.add(mesh(new THREE.SphereGeometry(0.28, 8, 6), glow(accent, 3.2), 0.55, 0.45, -1.0, 'pulse'));
  head.add(mesh(new THREE.SphereGeometry(0.28, 8, 6), glow(accent, 3.2), -0.55, 0.45, -1.0));
  for (const s of [-1, 1]) {
    const horn = mesh(alongZ(new THREE.ConeGeometry(0.18, 1.4, 5)), glow(accent, 1.4), s * 1.0, 0.2, 0.1);
    horn.rotation.y = s * 0.6;
    head.add(horn);
  }
  g.add(head);
  for (let i = 0; i < 6; i++) {
    const r = 0.95 - i * 0.12;
    const seg = new THREE.Group();
    seg.name = 'segment';
    seg.userData.segIndex = i + 1;
    seg.position.z = 0.4 + i * 0.95;
    seg.add(mesh(new THREE.IcosahedronGeometry(r, 0), main));
    seg.add(mesh(new THREE.TorusGeometry(r * 0.9, 0.05, 4, 16), glow(accent, 1.6)));
    g.add(seg);
  }
  return g;
}

/* ==========================================================================
   OBSTÁCULOS
   ========================================================================== */
function mine(color, accent) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  body.name = 'spin';
  body.userData.spinSpeed = 1.5;
  body.add(mesh(new THREE.SphereGeometry(0.45, 12, 10), hull(color)));
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.7, 0.7, 0], [-0.7, 0.7, 0]];
  const spikeMat = hull(0x9ca3af);
  for (const d of dirs) {
    const v = new THREE.Vector3(...d).normalize();
    const sp = mesh(new THREE.ConeGeometry(0.09, 0.42, 6), spikeMat);
    sp.position.copy(v.clone().multiplyScalar(0.55));
    sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
    body.add(sp);
  }
  g.add(body);
  const band = mesh(new THREE.TorusGeometry(0.47, 0.05, 6, 24), glow(accent, 3), 0, 0, 0, 'pulse');
  band.rotation.x = Math.PI / 2;
  g.add(band);
  return g;
}

function pylon(color, accent) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.35, 1.4, 8), hull(color), 0, 0.5, 0));
  g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8), glow(accent, 3), 0, 1.25, 0, 'pulse'));
  g.add(mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 16), glow(accent, 2), 0, 0.6, 0));
  return g;
}

function blackHole(color, accent) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0x000000 })));
  const disk = new THREE.Group();
  disk.name = 'spin';
  disk.userData.spinSpeed = 1.8;
  const ringMat = glow(accent, 2.2, { transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  const r1 = mesh(new THREE.RingGeometry(1.15, 2.3, 48, 1), ringMat);
  r1.rotation.x = -Math.PI / 2;
  disk.add(r1);
  const r2 = mesh(new THREE.TorusGeometry(1.1, 0.08, 6, 48), glow('#ffffff', 2.5));
  r2.rotation.x = Math.PI / 2;
  disk.add(r2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    disk.add(mesh(new THREE.BoxGeometry(0.5, 0.04, 0.12), glow(accent, 3), Math.cos(a) * 1.8, 0.02, Math.sin(a) * 1.8));
  }
  disk.rotation.z = 0.2;
  g.add(disk);
  return g;
}

/* ==========================================================================
   ITENS
   ========================================================================== */
function coin() {
  const g = new THREE.Group();
  const spinner = new THREE.Group();
  spinner.name = 'spin';
  spinner.userData.spinSpeed = 5;
  const disc = mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.08, 20),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 1, roughness: 0.25, emissive: C('#b45309'), emissiveIntensity: 0.9 })
  );
  disc.rotation.z = Math.PI / 2;
  spinner.add(disc);
  const inner = mesh(new THREE.BoxGeometry(0.1, 0.3, 0.06), glow('#fde047', 2.2));
  inner.position.x = 0;
  inner.rotation.y = Math.PI / 2;
  spinner.add(inner);
  g.add(spinner);
  return g;
}

function capsule(kind) {
  const colors = { powerup: '#3b82f6', shield: '#06b6d4', bomb: '#ef4444' };
  const g = new THREE.Group();
  const spinner = new THREE.Group();
  spinner.name = 'spin';
  spinner.userData.spinSpeed = 2.5;
  const col = colors[kind] || '#ffffff';
  let shell;
  if (kind === 'shield') shell = new THREE.IcosahedronGeometry(0.38, 0);
  else if (kind === 'bomb') shell = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  else shell = new THREE.OctahedronGeometry(0.42, 0);
  spinner.add(mesh(shell, glow(col, 1.6, { transparent: true, opacity: 0.9 })));
  spinner.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), glow(kind === 'bomb' ? '#fde047' : '#ffffff', 3), 0, 0, 0, 'pulse'));
  g.add(spinner);
  return g;
}

function drone(color, accent) {
  const g = fighter(color, accent);
  g.scale.setScalar(0.55);
  return g;
}

/* ==========================================================================
   API PÚBLICA
   ========================================================================== */
const BUILDERS = {
  fighter, interceptor, heavy, stealth,
  scout, gunship, meteor, dart, wasp, orb,
  boss_dreadnought: bossDreadnought, boss_hive: bossHive, boss_leviathan: bossLeviathan,
  mine, pylon, blackHole,
  asteroid: (c, a) => meteor(c, a, 0.65),
  coin, drone,
  capsule_powerup: () => capsule('powerup'),
  capsule_shield: () => capsule('shield'),
  capsule_bomb: () => capsule('bomb')
};

export function buildProcedural(shape, color = '#38bdf8', accent = '#00f0ff') {
  const fn = BUILDERS[shape] || BUILDERS.scout;
  return fn(color, accent);
}

export const PROCEDURAL_SHAPES = Object.keys(BUILDERS);
