/* ==========================================================================
   CONFIG STORE
   Configuração final = seed (public/data/game-config.json) OU versão editada
   no Painel (IndexedDB). Notifica outras abas via BroadcastChannel.
   ========================================================================== */
import { normalizeConfig, cleanReferences } from './schema.js';
import { kvGet, kvSet, kvDelete, listBlobs, putBlobRecord, clearBlobs } from './db.js';

const CONFIG_KEY = 'config';
const CHANNEL_NAME = 'cosmic_strike_config';
const SEED_URL = 'data/game-config.json';

let channel = null;
try {
  channel = new BroadcastChannel(CHANNEL_NAME);
} catch (e) {
  channel = null;
}

export async function loadSeed() {
  try {
    const res = await fetch(`${SEED_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return normalizeConfig(await res.json());
  } catch (e) {
    console.warn('[config] Não foi possível carregar o seed, usando config vazia.', e);
    return normalizeConfig({});
  }
}

/** Retorna { config, source: 'custom' | 'seed' } */
export async function loadConfig() {
  let stored = null;
  try {
    stored = await kvGet(CONFIG_KEY);
  } catch (e) {
    console.warn('[config] IndexedDB indisponível', e);
  }
  if (stored) {
    return { config: cleanReferences(normalizeConfig(stored)), source: 'custom' };
  }
  return { config: await loadSeed(), source: 'seed' };
}

export async function saveConfig(config) {
  const clean = cleanReferences(normalizeConfig(JSON.parse(JSON.stringify(config))));
  clean.meta = { ...(clean.meta || {}), updatedAt: Date.now() };
  await kvSet(CONFIG_KEY, clean);
  channel?.postMessage({ type: 'config-updated', at: clean.meta.updatedAt });
  return clean;
}

export async function resetConfig({ removeUploads = false } = {}) {
  await kvDelete(CONFIG_KEY);
  if (removeUploads) await clearBlobs();
  channel?.postMessage({ type: 'config-updated', at: Date.now() });
  return loadSeed();
}

export function onConfigChange(callback) {
  if (!channel) return () => {};
  const handler = (ev) => {
    if (ev.data?.type === 'config-updated') callback(ev.data);
  };
  channel.addEventListener('message', handler);
  return () => channel.removeEventListener('message', handler);
}

/* ---------- Exportar / Importar ---------- */
const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

export async function exportConfig(config, { includeUploads = true } = {}) {
  const payload = {
    app: 'cosmic-strike-3d',
    exportedAt: new Date().toISOString(),
    config: JSON.parse(JSON.stringify(config)),
    uploads: []
  };
  if (includeUploads) {
    const blobs = await listBlobs();
    for (const b of blobs) {
      payload.uploads.push({
        id: b.id,
        name: b.name,
        type: b.type,
        size: b.size,
        category: b.category,
        createdAt: b.createdAt,
        data: await blobToDataUrl(b.blob)
      });
    }
  }
  return payload;
}

export async function importConfig(payload) {
  const raw = payload?.config ? payload.config : payload;
  if (!raw || typeof raw !== 'object') throw new Error('Arquivo inválido');
  if (Array.isArray(payload?.uploads)) {
    for (const u of payload.uploads) {
      if (!u.data) continue;
      await putBlobRecord({
        id: u.id,
        name: u.name,
        type: u.type,
        size: u.size,
        category: u.category || 'uploads',
        createdAt: u.createdAt || Date.now(),
        blob: await dataUrlToBlob(u.data)
      });
    }
  }
  return saveConfig(raw);
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
