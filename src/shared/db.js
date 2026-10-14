/* ==========================================================================
   WRAPPER DO INDEXEDDB
   - store "kv": configuração editada no painel (chave "config")
   - store "blobs": imagens/modelos enviados por upload no painel
   ========================================================================== */
const DB_NAME = 'cosmic_strike_db';
const DB_VERSION = 1;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(storeName, mode);
        const store = t.objectStore(storeName);
        const result = fn(store);
        t.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

/* ---------- Key/Value ---------- */
export const kvGet = (key) => tx('kv', 'readonly', (s) => s.get(key));
export const kvSet = (key, value) => tx('kv', 'readwrite', (s) => s.put(value, key));
export const kvDelete = (key) => tx('kv', 'readwrite', (s) => s.delete(key));

/* ---------- Blobs (uploads) ---------- */
export async function putBlob(file, category = 'uploads') {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const record = {
    id,
    name: file.name || `upload-${id}`,
    type: file.type || guessMime(file.name),
    size: file.size,
    category,
    createdAt: Date.now(),
    blob: file
  };
  await tx('blobs', 'readwrite', (s) => s.put(record));
  return record;
}

export async function putBlobRecord(record) {
  await tx('blobs', 'readwrite', (s) => s.put(record));
  return record;
}

export const getBlob = (id) => tx('blobs', 'readonly', (s) => s.get(id));
export const listBlobs = () => tx('blobs', 'readonly', (s) => s.getAll());
export const deleteBlob = (id) => tx('blobs', 'readwrite', (s) => s.delete(id));
export const clearBlobs = () => tx('blobs', 'readwrite', (s) => s.clear());

export function guessMime(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  return (
    {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      glb: 'model/gltf-binary',
      gltf: 'model/gltf+json'
    }[ext] || 'application/octet-stream'
  );
}

export function blobKind(record) {
  const n = (record.name || '').toLowerCase();
  if (n.endsWith('.glb') || n.endsWith('.gltf') || (record.type || '').startsWith('model/')) return 'model';
  if ((record.type || '').startsWith('audio/')) return 'audio';
  return 'image';
}
