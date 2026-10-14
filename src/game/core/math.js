/* Utilitários matemáticos compartilhados pelo jogo */

/** Converte unidades "pixel" da config (herdadas do jogo 2D 540x960) para unidades do mundo 3D. */
export const PX = 1 / 40;

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const chance = (p) => Math.random() < p;
export const dist2 = (ax, az, bx, bz) => (ax - bx) ** 2 + (az - bz) ** 2;
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

export function weightedPick(list, weightKey = 'spawnWeight') {
  const total = list.reduce((s, it) => s + Math.max(0, it[weightKey] || 0), 0);
  if (total <= 0) return list[0] || null;
  let r = Math.random() * total;
  for (const it of list) {
    r -= Math.max(0, it[weightKey] || 0);
    if (r <= 0) return it;
  }
  return list[list.length - 1];
}

/** Gira um ângulo em direção a outro com passo máximo. */
export function rotateTowards(current, target, maxStep) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + clamp(diff, -maxStep, maxStep);
}

export function hexToInt(hex) {
  return parseInt(String(hex || '#ffffff').replace('#', ''), 16);
}
