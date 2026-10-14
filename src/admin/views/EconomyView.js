import { ECONOMY_SCHEMA, upgradeCost } from '../../shared/schema.js';

/* ==========================================================================
   ECONOMY VIEW (PAINEL DEDICADO DE CONTROLE DE PREÇOS E BALANCEAMENTO)
   Permite ajustar todos os custos de upgrades, consumíveis, moedas e testar a curva.
   ========================================================================== */
export class EconomyView {
  constructor(container, economyData, onSave) {
    this.container = container;
    this.economy = { ...economyData };
    this.onSave = onSave;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="font-family: var(--font-display); font-size: 15px; color: var(--neon-gold);">
              💰 CONTROLE DE ECONOMIA & PREÇOS
            </h2>
            <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">
              Ajuste os valores de compra de cada upgrade, consumíveis, bônus e valores das moedas.
            </div>
          </div>
          <button id="btn-save-economy" class="btn-primary" style="background: linear-gradient(135deg, #f59e0b, #d97706); border-color: #ffd700;">
            💾 Salvar Preços & Economia
          </button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 380px; gap: 24px;">
          <!-- Formulário de Preços -->
          <div class="form-card" id="economy-fields-container"></div>

          <!-- Tabela de Simulação da Curva de Custos -->
          <div class="preview-card" style="align-items: stretch;">
            <div style="font-family: var(--font-display); font-size: 12px; font-weight: bold; color: var(--neon-cyan); border-bottom: 1px solid rgba(0, 240, 255, 0.2); padding-bottom: 6px;">
              📊 SIMULAÇÃO DA CURVA DE CUSTOS
            </div>
            <div style="font-size: 10px; color: var(--text-dim);">
              Projeção do custo de cada nível de melhoria com a configuração atual:
            </div>
            <div id="cost-simulation-table" style="overflow-x: auto; margin-top: 10px;"></div>
          </div>
        </div>
      </div>
    `;

    this.renderFields();
    this.renderSimulation();

    this.container.querySelector('#btn-save-economy').onclick = () => {
      this.onSave(this.economy);
    };
  }

  renderFields() {
    const fieldsContainer = this.container.querySelector('#economy-fields-container');
    const groups = {};

    for (const f of ECONOMY_SCHEMA.fields) {
      const g = f.group || 'Geral';
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    }

    for (const [groupName, fields] of Object.entries(groups)) {
      const grpEl = document.createElement('div');
      grpEl.innerHTML = `<div class="form-group-title">${groupName}</div>`;
      const grid = document.createElement('div');
      grid.className = 'form-grid-fields';

      for (const field of fields) {
        const wrap = document.createElement('div');
        wrap.className = 'form-field';

        const label = document.createElement('label');
        label.className = 'form-label';
        label.innerText = field.label;
        wrap.appendChild(label);

        const val = this.economy[field.key] ?? field.default;

        if (field.type === 'select') {
          const sel = document.createElement('select');
          sel.className = 'form-select';
          for (const opt of field.options || []) {
            const optEl = document.createElement('option');
            optEl.value = opt.value;
            optEl.innerText = opt.label;
            if (opt.value === val) optEl.selected = true;
            sel.appendChild(optEl);
          }
          sel.onchange = (e) => {
            this.economy[field.key] = e.target.value;
            this.renderSimulation();
          };
          wrap.appendChild(sel);
        } else {
          const inp = document.createElement('input');
          inp.type = 'number';
          inp.className = 'form-input';
          inp.value = val;
          if (field.min !== undefined) inp.min = field.min;
          if (field.max !== undefined) inp.max = field.max;
          if (field.step !== undefined) inp.step = field.step;
          inp.oninput = (e) => {
            this.economy[field.key] = parseFloat(e.target.value) || 0;
            this.renderSimulation();
          };
          wrap.appendChild(inp);
        }

        grid.appendChild(wrap);
      }

      grpEl.appendChild(grid);
      fieldsContainer.appendChild(grpEl);
    }
  }

  renderSimulation() {
    const tableBox = this.container.querySelector('#cost-simulation-table');
    const maxLvl = this.economy.upgradeMaxLevel || 5;

    let rowsHtml = '';
    for (let lvl = 1; lvl <= maxLvl; lvl++) {
      const hpC = upgradeCost(this.economy, this.economy.hpUpgradePrice || 300, lvl);
      const spdC = upgradeCost(this.economy, this.economy.speedUpgradePrice || 250, lvl);
      const magC = upgradeCost(this.economy, this.economy.magnetUpgradePrice || 200, lvl);
      const dmgC = upgradeCost(this.economy, this.economy.damageUpgradePrice || 400, lvl);

      rowsHtml += `
        <tr>
          <td><b>Nv. ${lvl}</b></td>
          <td style="color: #10b981;">${hpC} 🪙</td>
          <td style="color: #38bdf8;">${spdC} 🪙</td>
          <td style="color: #c084fc;">${magC} 🪙</td>
          <td style="color: #f59e0b;">${dmgC} 🪙</td>
        </tr>
      `;
    }

    tableBox.innerHTML = `
      <table class="admin-data-table" style="font-size: 11px;">
        <thead>
          <tr>
            <th>Nível</th>
            <th>Blindagem</th>
            <th>Turbina</th>
            <th>Ímã</th>
            <th>Canhões</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }
}
