import { exportConfig, importConfig, resetConfig, downloadJson } from '../../shared/configStore.js';

/* ==========================================================================
   BACKUP & SYNC VIEW (EXPORTAR, IMPORTAR E RESTAURAR PADRÃO)
   ========================================================================== */
export class BackupView {
  constructor(container, currentConfig, onReload) {
    this.container = container;
    this.config = currentConfig;
    this.onReload = onReload;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="max-width: 800px; display: flex; flex-direction: column; gap: 20px;">
        <div>
          <h2 style="font-family: var(--font-display); font-size: 15px; color: var(--neon-cyan);">
            💾 BACKUP, EXPORTAÇÃO & RESTAURAÇÃO
          </h2>
          <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
            Transfira seus dados entre navegadores ou restaure a configuração padrão do jogo.
          </div>
        </div>

        <!-- Exportar -->
        <div class="form-card">
          <div class="form-group-title">📤 Exportar Configuração Atual</div>
          <p style="font-size: 11px; color: var(--text-dim); line-height: 1.6;">
            Gera um arquivo <code>.json</code> completo contendo todos os personagens, monstros, chefões, obstáculos, pistas, preços e imagens enviadas por upload.
          </p>
          <div>
            <button id="btn-export-json" class="btn-primary">
              📥 Baixar Arquivo de Backup (.JSON)
            </button>
          </div>
        </div>

        <!-- Importar -->
        <div class="form-card">
          <div class="form-group-title">📥 Importar Arquivo de Backup</div>
          <p style="font-size: 11px; color: var(--text-dim); line-height: 1.6;">
            Restaura os cadastros a partir de um arquivo JSON previamente exportado.
          </p>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="file" id="input-import-file" accept=".json" style="font-size: 11px;">
            <button id="btn-run-import" class="btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); border-color: #34d399;">
              Importar Dados
            </button>
          </div>
        </div>

        <!-- Restaurar Padrão -->
        <div class="form-card" style="border-color: rgba(239, 68, 68, 0.4);">
          <div class="form-group-title" style="color: #ef4444;">⚠️ Restaurar Padrão de Fábrica</div>
          <p style="font-size: 11px; color: var(--text-dim); line-height: 1.6;">
            Apaga todas as edições feitas no painel e restaura os monstros, naves e preços originais de <code>public/data/game-config.json</code>.
          </p>
          <div>
            <button id="btn-reset-factory" class="btn-table-action btn-del" style="padding: 10px 16px; font-weight: bold;">
              🔄 Restaurar Configuração Padrão
            </button>
          </div>
        </div>
      </div>
    `;

    // Exportar
    this.container.querySelector('#btn-export-json').onclick = async () => {
      const payload = await exportConfig(this.config, { includeUploads: true });
      const filename = `cosmic-strike-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadJson(payload, filename);
    };

    // Importar
    const fileInput = this.container.querySelector('#input-import-file');
    this.container.querySelector('#btn-run-import').onclick = async () => {
      if (!fileInput.files || !fileInput.files[0]) {
        alert('Selecione um arquivo .json primeiro.');
        return;
      }
      try {
        const text = await fileInput.files[0].text();
        const json = JSON.parse(text);
        await importConfig(json);
        alert('Backup importado com sucesso!');
        this.onReload();
      } catch (e) {
        alert('Erro ao importar arquivo: ' + e.message);
      }
    };

    // Resetar
    this.container.querySelector('#btn-reset-factory').onclick = async () => {
      if (confirm('Tem certeza de que deseja descartar todas as modificações e voltar ao padrão?')) {
        await resetConfig({ removeUploads: false });
        alert('Configuração padrão restaurada!');
        this.onReload();
      }
    };
  }
}
