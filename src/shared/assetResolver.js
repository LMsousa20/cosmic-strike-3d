/* ==========================================================================
   ASSET RESOLVER
   Referências de asset salvas na config podem ser:
   - "assets/enemies/batedor.png"  → arquivo da pasta public/assets
   - "idb:<id>"                    → upload salvo no IndexedDB
   ========================================================================== */
import { getBlob } from './db.js';

const urlCache = new Map();

export const isUploadRef = (ref) => typeof ref === 'string' && ref.startsWith('idb:');

export async function resolveAssetUrl(ref) {
  if (!ref) return null;
  if (!isUploadRef(ref)) return ref;
  if (urlCache.has(ref)) return urlCache.get(ref);
  const record = await getBlob(ref.slice(4)).catch(() => null);
  if (!record?.blob) return null;
  const url = URL.createObjectURL(record.blob);
  urlCache.set(ref, url);
  return url;
}

export async function resolveAssetInfo(ref) {
  if (!ref) return null;
  if (isUploadRef(ref)) {
    const record = await getBlob(ref.slice(4)).catch(() => null);
    if (!record) return null;
    return { name: record.name, kind: isModelName(record.name) ? 'model' : 'image', url: await resolveAssetUrl(ref) };
  }
  return { name: ref.split('/').pop(), kind: isModelName(ref) ? 'model' : 'image', url: ref };
}

export const isModelName = (name = '') => /\.(glb|gltf)$/i.test(name);

let manifestPromise = null;
export function loadManifest(force = false) {
  if (!manifestPromise || force) {
    manifestPromise = fetch(`assets-manifest.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { files: [] }))
      .catch(() => ({ files: [] }));
  }
  return manifestPromise;
}
