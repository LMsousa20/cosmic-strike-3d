import { loadManifest } from '../../shared/assetResolver.js';
import { putBlob, listBlobs } from '../../shared/db.js';

/* ==========================================================================
   ASSET PICKER MODAL (SELETOR DE ARQUIVOS E UPLOAD INDEXEDDB)
   Permite escolher assets da pasta pública ou enviar arquivos por upload.
   ========================================================================== */
export class AssetPicker {
  static open({ accept = 'all', currentValue = '', onSelect }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="font-family: var(--font-display); font-size: 13px; color: var(--neon-cyan);">
            📁 BIBLIOTECA DE ASSETS (${accept.toUpperCase()})
          </h3>
          <button id="modal-close-btn" class="btn-table-action">✖</button>
        </div>

        <div class="asset-dropzone" id="asset-dropzone">
          <div style="font-size: 24px; margin-bottom: 6px;">📤</div>
          <div style="font-family: var(--font-display); font-size: 11px; font-weight: bold; color: #fff;">
            CLIQUE OU ARRASTE ARQUIVOS AQUI
          </div>
          <div style="font-size: 10px; color: var(--text-dim); margin-top: 4px;">
            Suporta imagens (.png, .jpg, .webp) e modelos 3D (.glb)
          </div>
          <input type="file" id="asset-file-input" style="display: none;" ${accept === 'model' ? 'accept=".glb,.gltf"' : accept === 'image' ? 'accept="image/*"' : ''}>
        </div>

        <div style="padding: 0 16px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: var(--text-dim);">Arquivos disponíveis:</span>
          ${currentValue ? '<button id="btn-clear-asset" class="btn-table-action btn-del">Limpar Seleção</button>' : ''}
        </div>

        <div class="asset-grid-list" id="asset-grid-list">
          <div style="color: var(--text-dim); font-size: 11px; padding: 12px;">Carregando assets...</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#modal-close-btn').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    overlay.querySelector('#btn-clear-asset')?.addEventListener('click', () => {
      onSelect('');
      close();
    });

    const dropzone = overlay.querySelector('#asset-dropzone');
    const fileInput = overlay.querySelector('#asset-file-input');

    dropzone.onclick = () => fileInput.click();

    fileInput.onchange = async () => {
      if (fileInput.files && fileInput.files[0]) {
        await handleUpload(fileInput.files[0]);
      }
    };

    dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = '#00f0ff'; };
    dropzone.ondragleave = () => { dropzone.style.borderColor = 'rgba(0, 240, 255, 0.4)'; };
    dropzone.ondrop = async (e) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        await handleUpload(e.dataTransfer.files[0]);
      }
    };

    async function handleUpload(file) {
      const record = await putBlob(file, 'uploads');
      onSelect(`idb:${record.id}`);
      close();
    }

    // Carrega arquivos da pasta pública e do IndexedDB
    async function renderList() {
      const grid = overlay.querySelector('#asset-grid-list');
      grid.innerHTML = '';

      const manifest = await loadManifest(true);
      const uploads = await listBlobs();

      let items = [];

      // Itens da pasta public/assets
      for (const f of manifest.files || []) {
        if (accept === 'model' && f.kind !== 'model') continue;
        if (accept === 'image' && f.kind !== 'image') continue;
        items.push({
          ref: f.path,
          name: f.name,
          kind: f.kind,
          isPublic: true
        });
      }

      // Itens enviados por upload (IndexedDB)
      for (const u of uploads) {
        const isModel = u.name.toLowerCase().endsWith('.glb') || u.name.toLowerCase().endsWith('.gltf');
        const kind = isModel ? 'model' : 'image';
        if (accept === 'model' && kind !== 'model') continue;
        if (accept === 'image' && kind !== 'image') continue;
        items.push({
          ref: `idb:${u.id}`,
          name: u.name,
          kind,
          isPublic: false
        });
      }

      if (items.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); font-size: 11px; padding: 20px;">Nenhum arquivo encontrado. Coloque na pasta public/assets/ ou faça upload acima.</div>`;
        return;
      }

      for (const item of items) {
        const card = document.createElement('div');
        card.className = 'asset-card-item';
        card.innerHTML = `
          <div class="asset-thumb-box">
            ${item.kind === 'model' ? '<span style="font-size: 24px;">📦</span>' : `<img src="${item.isPublic ? item.ref : ''}" alt="${item.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><text y=%2218%22 font-size=%2218%22>🖼️</text></svg>'">`}
          </div>
          <div style="font-size: 10px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%;">
            ${item.name}
          </div>
          <span style="font-size: 8px; color: ${item.isPublic ? '#38bdf8' : '#facc15'};">
            ${item.isPublic ? 'PASTA PÚBLICA' : 'UPLOAD LOCAL'}
          </span>
        `;
        card.onclick = () => {
          onSelect(item.ref);
          close();
        };
        grid.appendChild(card);
      }
    }

    renderList();
  }
}
