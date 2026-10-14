import { COLLECTIONS, validateRecord, normalizeRecord } from '../../shared/schema.js';
import { Preview3D } from './Preview3D.js';
import { AssetPicker } from './AssetPicker.js';

/* ==========================================================================
   ENTITY FORM COMPONENT (FORMULÁRIO DE CADASTRO COM PREVIEW 3D AO VIVO)
   ========================================================================== */
export class EntityForm {
  constructor(container, collectionKey, record, fullConfig, onSave, onCancel) {
    this.container = container;
    this.collectionKey = collectionKey;
    this.collection = COLLECTIONS[collectionKey];
    this.record = { ...record };
    this.fullConfig = fullConfig;
    this.onSave = onSave;
    this.onCancel = onCancel;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="form-layout-split">
        <!-- Coluna da Esquerda: Campos do Formulário -->
        <div class="form-card">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(0, 240, 255, 0.3); padding-bottom: 10px;">
            <h2 style="font-family: var(--font-display); font-size: 14px; color: var(--neon-cyan);">
              ${this.record.id ? 'EDITAR' : 'NOVO'}: ${this.collection.singular.toUpperCase()}
            </h2>
            <div style="display: flex; gap: 8px;">
              <button id="btn-cancel-form" class="btn-table-action">Cancelar</button>
              <button id="btn-save-form" class="btn-primary">💾 Salvar Alterações</button>
            </div>
          </div>

          <div id="form-fields-container" style="display: flex; flex-direction: column; gap: 14px;"></div>
        </div>

        <!-- Coluna da Direita: Prévia 3D Interativa -->
        <div class="preview-card">
          <div style="font-family: var(--font-display); font-size: 11px; font-weight: bold; color: var(--neon-cyan);">
            PRÉVIA 3D AO VIVO
          </div>
          <div class="preview-canvas-box" id="preview-canvas-box"></div>
          <div style="font-size: 10px; color: var(--text-dim); text-align: center;">
            Gira 360° automaticamente. Atualiza em tempo real com cores, modelos e imagens.
          </div>
        </div>
      </div>
    `;

    this.renderFields();

    // Inicializa a mini-cena de preview 3D
    const previewBox = this.container.querySelector('#preview-canvas-box');
    this.preview3d = new Preview3D(previewBox);
    this.updatePreviewObject();

    // Bindings de botões
    this.container.querySelector('#btn-cancel-form').onclick = () => {
      this.preview3d.destroy();
      this.onCancel();
    };

    this.container.querySelector('#btn-save-form').onclick = () => {
      const errors = validateRecord(this.collection.fields, this.record);
      if (Object.keys(errors).length > 0) {
        alert('Por favor, corrija os erros:\n' + Object.values(errors).join('\n'));
        return;
      }
      this.preview3d.destroy();
      this.onSave(this.record);
    };
  }

  renderFields() {
    const fieldsContainer = this.container.querySelector('#form-fields-container');
    const groups = {};

    for (const f of this.collection.fields) {
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
        grid.appendChild(this.buildFieldElement(field));
      }

      grpEl.appendChild(grid);
      fieldsContainer.appendChild(grpEl);
    }
  }

  buildFieldElement(field) {
    const wrap = document.createElement('div');
    wrap.className = `form-field ${field.type === 'textarea' ? 'col-full' : ''}`;

    const label = document.createElement('label');
    label.className = 'form-label';
    label.innerText = field.label;
    wrap.appendChild(label);

    const val = this.record[field.key] ?? field.default ?? '';

    switch (field.type) {
      case 'textarea': {
        const txt = document.createElement('textarea');
        txt.className = 'form-textarea';
        txt.rows = 2;
        txt.value = val;
        txt.oninput = (e) => { this.record[field.key] = e.target.value; };
        wrap.appendChild(txt);
        break;
      }

      case 'number': {
        const num = document.createElement('input');
        num.type = 'number';
        num.className = 'form-input';
        num.value = val;
        if (field.min !== undefined) num.min = field.min;
        if (field.max !== undefined) num.max = field.max;
        if (field.step !== undefined) num.step = field.step;
        num.oninput = (e) => {
          this.record[field.key] = parseFloat(e.target.value) || 0;
          if (field.key === 'scale' || field.key === 'modelRotation') this.updatePreviewObject();
        };
        wrap.appendChild(num);
        break;
      }

      case 'boolean': {
        const chkWrap = document.createElement('label');
        chkWrap.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 0;';
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = Boolean(val);
        chk.onchange = (e) => { this.record[field.key] = e.target.checked; };
        chkWrap.appendChild(chk);
        chkWrap.appendChild(document.createTextNode('Habilitado / Ativo'));
        wrap.appendChild(chkWrap);
        break;
      }

      case 'color': {
        const colorWrap = document.createElement('div');
        colorWrap.style.cssText = 'display: flex; gap: 6px; align-items: center;';
        const cPicker = document.createElement('input');
        cPicker.type = 'color';
        cPicker.value = val || '#00f0ff';
        cPicker.style.cssText = 'width: 36px; height: 32px; border: 1px solid rgba(0, 240, 255, 0.4); border-radius: 4px; background: transparent; cursor: pointer;';
        const cText = document.createElement('input');
        cText.type = 'text';
        cText.className = 'form-input';
        cText.style.flex = '1';
        cText.value = val || '#00f0ff';

        cPicker.oninput = (e) => {
          cText.value = e.target.value;
          this.record[field.key] = e.target.value;
          this.updatePreviewObject();
        };
        cText.oninput = (e) => {
          this.record[field.key] = e.target.value;
          cPicker.value = e.target.value;
          this.updatePreviewObject();
        };

        colorWrap.appendChild(cPicker);
        colorWrap.appendChild(cText);
        wrap.appendChild(colorWrap);
        break;
      }

      case 'select': {
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
          this.record[field.key] = e.target.value;
          this.updatePreviewObject();
        };
        wrap.appendChild(sel);
        break;
      }

      case 'asset': {
        const assetBox = document.createElement('div');
        assetBox.style.cssText = 'display: flex; gap: 6px; align-items: center;';
        const aInput = document.createElement('input');
        aInput.type = 'text';
        aInput.className = 'form-input';
        aInput.style.flex = '1';
        aInput.readOnly = true;
        aInput.value = val;
        aInput.placeholder = 'Nenhum arquivo selecionado';

        const aBtn = document.createElement('button');
        aBtn.className = 'btn-table-action';
        aBtn.type = 'button';
        aBtn.innerText = '📁 Escolher';
        aBtn.onclick = () => {
          AssetPicker.open({
            accept: field.accept || 'all',
            currentValue: this.record[field.key],
            onSelect: (selectedPath) => {
              this.record[field.key] = selectedPath;
              aInput.value = selectedPath;
              this.updatePreviewObject();
            }
          });
        };

        assetBox.appendChild(aInput);
        assetBox.appendChild(aBtn);
        wrap.appendChild(assetBox);
        break;
      }

      case 'ref': {
        const sel = document.createElement('select');
        sel.className = 'form-select';
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.innerText = '(Nenhum)';
        sel.appendChild(emptyOpt);

        const targetList = this.fullConfig[field.ref] || [];
        for (const item of targetList) {
          const opt = document.createElement('option');
          opt.value = item.id;
          opt.innerText = item.name;
          if (item.id === val) opt.selected = true;
          sel.appendChild(opt);
        }
        sel.onchange = (e) => { this.record[field.key] = e.target.value; };
        wrap.appendChild(sel);
        break;
      }

      case 'multiref': {
        const selWrap = document.createElement('div');
        selWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px; max-height: 120px; overflow-y: auto; background: rgba(15, 23, 42, 0.5); padding: 8px; border-radius: 4px; border: 1px solid rgba(0, 240, 255, 0.2);';
        const currentArr = Array.isArray(val) ? val : [];
        const targetList = this.fullConfig[field.ref] || [];

        for (const item of targetList) {
          const row = document.createElement('label');
          row.style.cssText = 'display: flex; align-items: center; gap: 6px; font-size: 11px; cursor: pointer;';
          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.checked = currentArr.includes(item.id);
          chk.onchange = () => {
            if (chk.checked) {
              if (!currentArr.includes(item.id)) currentArr.push(item.id);
            } else {
              const idx = currentArr.indexOf(item.id);
              if (idx >= 0) currentArr.splice(idx, 1);
            }
            this.record[field.key] = currentArr;
          };
          row.appendChild(chk);
          row.appendChild(document.createTextNode(item.name));
          selWrap.appendChild(row);
        }
        wrap.appendChild(selWrap);
        break;
      }

      case 'text':
      default: {
        const txt = document.createElement('input');
        txt.type = 'text';
        txt.className = 'form-input';
        txt.value = val;
        txt.oninput = (e) => { this.record[field.key] = e.target.value; };
        wrap.appendChild(txt);
        break;
      }
    }

    if (field.help) {
      const help = document.createElement('span');
      help.style.cssText = 'font-size: 9px; color: var(--text-muted); margin-top: 2px;';
      help.innerText = field.help;
      wrap.appendChild(help);
    }

    return wrap;
  }

  updatePreviewObject() {
    if (this.preview3d) {
      this.preview3d.updatePreview(this.record, this.collectionKey);
    }
  }
}
