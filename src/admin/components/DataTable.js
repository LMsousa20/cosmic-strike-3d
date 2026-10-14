import { COLLECTIONS } from '../../shared/schema.js';

/* ==========================================================================
   DATA TABLE COMPONENT (TABELA DE LISTAGEM COM BUSCA E AÇÕES)
   ========================================================================== */
export class DataTable {
  constructor(container, collectionKey, items, { onEdit, onCreate, onDuplicate, onDelete }) {
    this.container = container;
    this.collectionKey = collectionKey;
    this.collection = COLLECTIONS[collectionKey];
    this.items = [...items];
    this.onEdit = onEdit;
    this.onCreate = onCreate;
    this.onDuplicate = onDuplicate;
    this.onDelete = onDelete;

    this.searchQuery = '';
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="table-container">
        <div class="table-toolbar">
          <div style="display: flex; align-items: center; gap: 12px;">
            <input type="text" id="table-search" class="table-search-input" placeholder="Buscar por nome ou ID..." value="${this.searchQuery}">
            <span style="font-size: 11px; color: var(--text-dim);" id="table-count-label">
              Total: ${this.items.length} ${this.collection.label.toLowerCase()}
            </span>
          </div>
          <button id="btn-create-new" class="btn-primary">
            ➕ Novo ${this.collection.singular}
          </button>
        </div>

        <div style="overflow-x: auto;">
          <table class="admin-data-table">
            <thead>
              <tr>
                <th style="width: 50px;">Visual</th>
                <th>Nome / ID</th>
                ${this.renderHeaderColumns()}
                <th style="width: 90px;">Status</th>
                <th style="width: 160px; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="table-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    this.renderRows();

    // Bindings
    const searchInput = this.container.querySelector('#table-search');
    searchInput.oninput = (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderRows();
    };

    this.container.querySelector('#btn-create-new').onclick = () => this.onCreate();
  }

  renderHeaderColumns() {
    const cols = this.collection.columns || [];
    return cols.map((colKey) => {
      const field = this.collection.fields.find((f) => f.key === colKey);
      return `<th>${field ? field.label : colKey.toUpperCase()}</th>`;
    }).join('');
  }

  renderRows() {
    const tbody = this.container.querySelector('#table-tbody');
    tbody.innerHTML = '';

    const filtered = this.items.filter((item) => {
      const q = this.searchQuery;
      return (item.name || '').toLowerCase().includes(q) || (item.id || '').toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: var(--text-dim); padding: 32px;">
            Nenhum registro encontrado.
          </td>
        </tr>
      `;
      return;
    }

    for (const item of filtered) {
      const tr = document.createElement('tr');

      // Colunas específicas
      const customCells = (this.collection.columns || []).map((colKey) => {
        let val = item[colKey];
        if (val === undefined || val === null) val = '-';
        if (typeof val === 'boolean') val = val ? 'Sim' : 'Não';
        return `<td><b>${val}</b></td>`;
      }).join('');

      tr.innerHTML = `
        <td>
          <div class="entity-preview-thumb" style="border-color: ${item.color || '#00f0ff'};">
            ${item.sprite ? `<img src="${item.sprite}" alt="">` : `<span style="font-size: 16px;">${this.collection.icon}</span>`}
          </div>
        </td>
        <td>
          <div style="font-weight: bold; color: #fff;">${item.name || 'Sem nome'}</div>
          <div style="font-size: 10px; color: var(--text-dim);">${item.id}</div>
        </td>
        ${customCells}
        <td>
          <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${item.enabled !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${item.enabled !== false ? '#10b981' : '#ef4444'};">
            ${item.enabled !== false ? '● Ativo' : '○ Inativo'}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="btn-table-action btn-edit" title="Editar">✏️</button>
          <button class="btn-table-action btn-dup" title="Duplicar">📋</button>
          <button class="btn-table-action btn-del" title="Excluir">🗑️</button>
        </td>
      `;

      tr.querySelector('.btn-edit').onclick = () => this.onEdit(item);
      tr.querySelector('.btn-dup').onclick = () => this.onDuplicate(item);
      tr.querySelector('.btn-del').onclick = () => {
        if (confirm(`Tem certeza que deseja excluir "${item.name}"?`)) {
          this.onDelete(item);
        }
      };

      tbody.appendChild(tr);
    }
  }
}
