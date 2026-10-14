import { COLLECTIONS, createRecord } from '../shared/schema.js';
import { loadConfig, saveConfig } from '../shared/configStore.js';
import { DataTable } from './components/DataTable.js';
import { EntityForm } from './components/EntityForm.js';
import { EconomyView } from './views/EconomyView.js';
import { BackupView } from './views/BackupView.js';

/* ==========================================================================
   ADMIN SPA ROUTER & CONTROLLER
   ========================================================================== */
class AdminApp {
  constructor() {
    this.contentEl = document.getElementById('admin-content-scroll');
    this.viewTitleEl = document.getElementById('admin-view-title');
    this.navItems = document.querySelectorAll('.admin-nav-item');

    this.config = null;
    this.activeRoute = 'ships';

    this.init();
  }

  async init() {
    const { config } = await loadConfig();
    this.config = config;

    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  showToast(message) {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `<span>✨</span><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }

  handleRoute() {
    const hash = window.location.hash.replace('#/', '') || 'ships';
    this.activeRoute = hash;

    // Atualiza classe ativa na sidebar
    this.navItems.forEach((btn) => {
      const route = btn.getAttribute('data-route');
      if (route === hash) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    if (COLLECTIONS[hash]) {
      this.renderCollectionList(hash);
    } else if (hash === 'economy') {
      this.renderEconomy();
    } else if (hash === 'backup') {
      this.renderBackup();
    } else {
      this.renderCollectionList('ships');
    }
  }

  renderCollectionList(colKey) {
    const col = COLLECTIONS[colKey];
    this.viewTitleEl.innerHTML = `<span class="nav-icon">${col.icon}</span> ${col.label.toUpperCase()}`;
    const items = this.config[colKey] || [];

    new DataTable(this.contentEl, colKey, items, {
      onEdit: (item) => this.renderEntityForm(colKey, item),
      onCreate: () => {
        const newRecord = createRecord(colKey);
        this.renderEntityForm(colKey, newRecord, true);
      },
      onDuplicate: async (item) => {
        const copy = JSON.parse(JSON.stringify(item));
        copy.id = `${copy.id}_copia_${Date.now().toString(36).slice(-3)}`;
        copy.name = `${copy.name} (Cópia)`;
        this.config[colKey].push(copy);
        await saveConfig(this.config);
        this.showToast(`Item duplicado com sucesso!`);
        this.renderCollectionList(colKey);
      },
      onDelete: async (item) => {
        this.config[colKey] = this.config[colKey].filter((r) => r.id !== item.id);
        await saveConfig(this.config);
        this.showToast(`"${item.name}" excluído.`);
        this.renderCollectionList(colKey);
      }
    });
  }

  renderEntityForm(colKey, record, isNew = false) {
    const col = COLLECTIONS[colKey];
    this.viewTitleEl.innerHTML = `<span class="nav-icon">${col.icon}</span> ${isNew ? 'NOVO' : 'EDITAR'}: ${col.singular.toUpperCase()}`;

    new EntityForm(
      this.contentEl,
      colKey,
      record,
      this.config,
      // onSave
      async (updated) => {
        const list = this.config[colKey];
        const idx = list.findIndex((r) => r.id === updated.id);
        if (idx >= 0) {
          list[idx] = updated;
        } else {
          list.push(updated);
        }
        await saveConfig(this.config);
        this.showToast(`Salvo com sucesso!`);
        this.renderCollectionList(colKey);
      },
      // onCancel
      () => {
        this.renderCollectionList(colKey);
      }
    );
  }

  renderEconomy() {
    this.viewTitleEl.innerHTML = `<span class="nav-icon">💰</span> ECONOMIA & CONTROLE DE PREÇOS`;
    new EconomyView(this.contentEl, this.config.economy, async (updatedEconomy) => {
      this.config.economy = updatedEconomy;
      await saveConfig(this.config);
      this.showToast(`Preços atualizados com sucesso!`);
    });
  }

  renderBackup() {
    this.viewTitleEl.innerHTML = `<span class="nav-icon">💾</span> BACKUP & RESTAURAÇÃO`;
    new BackupView(this.contentEl, this.config, async () => {
      const { config } = await loadConfig();
      this.config = config;
      this.showToast(`Configuração recarregada!`);
      this.handleRoute();
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AdminApp();
});
