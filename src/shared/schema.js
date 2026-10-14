/* ==========================================================================
   SCHEMA CENTRAL DE CONTEÚDO
   Define as entidades editáveis no Painel Administrativo e usadas pelo jogo.
   Os formulários do painel são gerados automaticamente a partir daqui.
   ========================================================================== */

export const CONFIG_VERSION = 1;

/* ---------- Opções reutilizáveis ---------- */
export const SHIP_SHAPES = [
  { value: 'fighter', label: 'Caça Clássico' },
  { value: 'interceptor', label: 'Interceptador' },
  { value: 'heavy', label: 'Blindado Pesado' },
  { value: 'stealth', label: 'Furtivo (Asa Delta)' }
];

export const ENEMY_SHAPES = [
  { value: 'scout', label: 'Batedor (Triângulo)' },
  { value: 'gunship', label: 'Cruzador (Canhoneira)' },
  { value: 'meteor', label: 'Meteoro (Rocha)' },
  { value: 'dart', label: 'Dardo (Kamikaze)' },
  { value: 'wasp', label: 'Vespa (Asas Duplas)' },
  { value: 'orb', label: 'Orbe Sentinela' }
];

export const BOSS_SHAPES = [
  { value: 'boss_dreadnought', label: 'Dreadnought (Encouraçado)' },
  { value: 'boss_hive', label: 'Colmeia (Orgânico)' },
  { value: 'boss_leviathan', label: 'Leviatã (Serpente)' }
];

export const ENEMY_BEHAVIORS = [
  { value: 'straight', label: 'Reto (desce em linha)' },
  { value: 'sine', label: 'Senoide (ondulando)' },
  { value: 'zigzag', label: 'Zigue-zague' },
  { value: 'kamikaze', label: 'Kamikaze (persegue o jogador)' },
  { value: 'shooter', label: 'Atirador (para e atira)' },
  { value: 'splitter', label: 'Divisor (racha em 2 ao morrer)' }
];

export const FIRE_PATTERNS = [
  { value: 'none', label: 'Não atira' },
  { value: 'aimed', label: 'Mirado no jogador' },
  { value: 'spread3', label: 'Leque triplo' },
  { value: 'ring', label: 'Anel 360°' },
  { value: 'burst', label: 'Rajada mirada (3 tiros)' }
];

export const BOSS_PATTERNS = [
  { value: 'spread', label: 'Leque das asas' },
  { value: 'aimed', label: 'Rajada mirada' },
  { value: 'ring', label: 'Anel 360°' },
  { value: 'spiral', label: 'Espiral giratória' },
  { value: 'rain', label: 'Chuva de plasma' },
  { value: 'minions', label: 'Invoca lacaios' }
];

export const OBSTACLE_TYPES = [
  { value: 'asteroidField', label: 'Campo de Asteroides' },
  { value: 'mine', label: 'Mina de Proximidade' },
  { value: 'laserGate', label: 'Portão Laser (com abertura)' },
  { value: 'blackHole', label: 'Buraco Negro (gravidade)' },
  { value: 'energyWall', label: 'Muro de Energia' }
];

export const TRACK_STYLES = [
  { value: 'neonGrid', label: 'Grade Néon (Synthwave)' },
  { value: 'rocky', label: 'Superfície Rochosa / Gelo' },
  { value: 'lava', label: 'Mundo de Lava' },
  { value: 'deepSpace', label: 'Espaço Profundo (sem chão)' }
];

export const COST_MODES = [
  { value: 'linear', label: 'Linear (preço base × nível)' },
  { value: 'exponential', label: 'Exponencial (preço base × crescimento^(nível-1))' }
];

/* ---------- Blocos de campos compartilhados ---------- */
const identityFields = [
  { key: 'name', label: 'Nome', type: 'text', default: 'Novo item', group: 'Identidade', required: true },
  { key: 'description', label: 'Descrição', type: 'textarea', default: '', group: 'Identidade' },
  { key: 'enabled', label: 'Ativo no jogo', type: 'boolean', default: true, group: 'Identidade' }
];

const visualFields = (shapes, defaultShape) => [
  { key: 'model', label: 'Modelo 3D (.glb)', type: 'asset', accept: 'model', default: '', group: 'Visual', help: 'Prioridade 1. Deixe vazio para usar imagem ou modelo procedural.' },
  { key: 'sprite', label: 'Imagem (.png)', type: 'asset', accept: 'image', default: '', group: 'Visual', help: 'Prioridade 2. Exibida como billboard virado para a câmera.' },
  { key: 'shape', label: 'Modelo procedural (fallback)', type: 'select', options: shapes, default: defaultShape, group: 'Visual' },
  { key: 'color', label: 'Cor principal', type: 'color', default: '#38bdf8', group: 'Visual' },
  { key: 'accent', label: 'Cor de destaque / brilho', type: 'color', default: '#00f0ff', group: 'Visual' },
  { key: 'scale', label: 'Escala', type: 'number', min: 0.2, max: 6, step: 0.05, default: 1, group: 'Visual' },
  { key: 'modelRotation', label: 'Rotação do modelo (graus)', type: 'number', min: -180, max: 180, step: 5, default: 0, group: 'Visual', help: 'Ajuste caso o .glb não esteja olhando para frente.' }
];

/* ==========================================================================
   COLEÇÕES
   ========================================================================== */
export const COLLECTIONS = {
  ships: {
    key: 'ships',
    label: 'Personagens / Naves',
    singular: 'Nave',
    icon: '🚀',
    idPrefix: 'ship',
    columns: ['hp', 'speed', 'damage', 'price'],
    fields: [
      ...identityFields,
      ...visualFields(SHIP_SHAPES, 'fighter'),
      { key: 'hp', label: 'HP base', type: 'number', min: 10, max: 2000, step: 5, default: 100, group: 'Atributos' },
      { key: 'speed', label: 'Velocidade (multiplicador)', type: 'number', min: 0.3, max: 3, step: 0.05, default: 1, group: 'Atributos' },
      { key: 'fireRate', label: 'Intervalo entre tiros (ms)', type: 'number', min: 60, max: 1000, step: 10, default: 220, group: 'Atributos', help: 'Menor = atira mais rápido.' },
      { key: 'damage', label: 'Dano por tiro', type: 'number', min: 0.1, max: 20, step: 0.1, default: 1, group: 'Atributos' },
      { key: 'weaponStart', label: 'Nível inicial da arma (1-5)', type: 'number', min: 1, max: 5, step: 1, default: 1, group: 'Atributos' },
      { key: 'bulletColor', label: 'Cor do laser', type: 'color', default: '#00f0ff', group: 'Atributos' },
      { key: 'price', label: 'Preço para desbloquear (🪙)', type: 'number', min: 0, max: 1000000, step: 50, default: 1000, group: 'Loja' },
      { key: 'unlockedByDefault', label: 'Desbloqueada desde o início', type: 'boolean', default: false, group: 'Loja' }
    ]
  },

  enemies: {
    key: 'enemies',
    label: 'Monstros / Inimigos',
    singular: 'Monstro',
    icon: '👾',
    idPrefix: 'enemy',
    columns: ['behavior', 'hp', 'speed', 'minStage'],
    fields: [
      ...identityFields,
      ...visualFields(ENEMY_SHAPES, 'scout'),
      { key: 'behavior', label: 'Comportamento', type: 'select', options: ENEMY_BEHAVIORS, default: 'straight', group: 'Comportamento' },
      { key: 'hp', label: 'HP', type: 'number', min: 1, max: 5000, step: 1, default: 3, group: 'Comportamento' },
      { key: 'speed', label: 'Velocidade', type: 'number', min: 20, max: 800, step: 5, default: 160, group: 'Comportamento' },
      { key: 'contactDamage', label: 'Dano de colisão', type: 'number', min: 0, max: 500, step: 1, default: 25, group: 'Combate' },
      { key: 'firePattern', label: 'Padrão de tiro', type: 'select', options: FIRE_PATTERNS, default: 'none', group: 'Combate' },
      { key: 'fireRate', label: 'Intervalo de tiro (ms)', type: 'number', min: 200, max: 10000, step: 50, default: 1500, group: 'Combate' },
      { key: 'bulletDamage', label: 'Dano do projétil', type: 'number', min: 0, max: 500, step: 1, default: 15, group: 'Combate' },
      { key: 'bulletSpeed', label: 'Velocidade do projétil', type: 'number', min: 50, max: 900, step: 10, default: 250, group: 'Combate' },
      { key: 'coins', label: 'Moedas dropadas', type: 'number', min: 0, max: 50, step: 1, default: 1, group: 'Recompensa' },
      { key: 'powerupChance', label: 'Chance de power-up (0 a 1)', type: 'number', min: 0, max: 1, step: 0.01, default: 0.12, group: 'Recompensa' },
      { key: 'score', label: 'Pontos', type: 'number', min: 0, max: 100000, step: 10, default: 100, group: 'Recompensa' },
      { key: 'squadSize', label: 'Tamanho do esquadrão', type: 'number', min: 1, max: 10, step: 1, default: 1, group: 'Spawn' },
      { key: 'spawnWeight', label: 'Peso de spawn (frequência)', type: 'number', min: 0, max: 100, step: 1, default: 20, group: 'Spawn' },
      { key: 'minStage', label: 'Aparece a partir da fase', type: 'number', min: 1, max: 99, step: 1, default: 1, group: 'Spawn' }
    ]
  },

  bosses: {
    key: 'bosses',
    label: 'Chefões',
    singular: 'Chefão',
    icon: '👹',
    idPrefix: 'boss',
    columns: ['hp', 'fireRate', 'reward'],
    fields: [
      ...identityFields,
      ...visualFields(BOSS_SHAPES, 'boss_dreadnought'),
      { key: 'warningText', label: 'Texto do alerta', type: 'text', default: 'AMEAÇA COLOSSAL DETECTADA', group: 'Identidade' },
      { key: 'hp', label: 'HP', type: 'number', min: 50, max: 100000, step: 50, default: 1500, group: 'Combate' },
      { key: 'speed', label: 'Velocidade lateral', type: 'number', min: 20, max: 600, step: 10, default: 120, group: 'Combate' },
      { key: 'patterns', label: 'Padrões de ataque', type: 'multiselect', options: BOSS_PATTERNS, default: ['spread', 'aimed'], group: 'Combate' },
      { key: 'fireRate', label: 'Intervalo entre ataques (ms)', type: 'number', min: 300, max: 6000, step: 50, default: 1400, group: 'Combate' },
      { key: 'bulletDamage', label: 'Dano do projétil', type: 'number', min: 1, max: 500, step: 1, default: 15, group: 'Combate' },
      { key: 'bulletSpeed', label: 'Velocidade do projétil', type: 'number', min: 50, max: 900, step: 10, default: 240, group: 'Combate' },
      { key: 'enrageAt', label: 'Fúria abaixo de (% HP)', type: 'number', min: 0, max: 100, step: 5, default: 40, group: 'Combate', help: 'Ataques ficam 40% mais rápidos.' },
      { key: 'reward', label: 'Recompensa (🪙)', type: 'number', min: 0, max: 1000000, step: 50, default: 1000, group: 'Recompensa' },
      { key: 'score', label: 'Pontos', type: 'number', min: 0, max: 1000000, step: 100, default: 5000, group: 'Recompensa' }
    ]
  },

  obstacles: {
    key: 'obstacles',
    label: 'Obstáculos Especiais',
    singular: 'Obstáculo',
    icon: '☄️',
    idPrefix: 'obs',
    columns: ['type', 'damage', 'minStage'],
    fields: [
      ...identityFields,
      { key: 'type', label: 'Tipo / Mecânica', type: 'select', options: OBSTACLE_TYPES, default: 'mine', group: 'Comportamento' },
      { key: 'model', label: 'Modelo 3D (.glb)', type: 'asset', accept: 'model', default: '', group: 'Visual' },
      { key: 'sprite', label: 'Imagem (.png)', type: 'asset', accept: 'image', default: '', group: 'Visual' },
      { key: 'color', label: 'Cor principal', type: 'color', default: '#ef4444', group: 'Visual' },
      { key: 'accent', label: 'Cor de destaque / brilho', type: 'color', default: '#fde047', group: 'Visual' },
      { key: 'scale', label: 'Escala', type: 'number', min: 0.2, max: 6, step: 0.05, default: 1, group: 'Visual' },
      { key: 'modelRotation', label: 'Rotação do modelo (graus)', type: 'number', min: -180, max: 180, step: 5, default: 0, group: 'Visual' },
      { key: 'destructible', label: 'Destrutível', type: 'boolean', default: true, group: 'Comportamento' },
      { key: 'hp', label: 'HP (se destrutível)', type: 'number', min: 1, max: 5000, step: 1, default: 3, group: 'Comportamento' },
      { key: 'damage', label: 'Dano ao jogador', type: 'number', min: 0, max: 500, step: 1, default: 30, group: 'Comportamento' },
      { key: 'speed', label: 'Velocidade de descida', type: 'number', min: 10, max: 600, step: 5, default: 100, group: 'Comportamento' },
      { key: 'size', label: 'Tamanho / abertura / largura', type: 'number', min: 0.5, max: 12, step: 0.1, default: 1, group: 'Comportamento', help: 'Portão: largura da abertura. Muro: largura. Buraco negro: raio do núcleo.' },
      { key: 'pull', label: 'Força de atração (buraco negro)', type: 'number', min: 0, max: 40, step: 0.5, default: 8, group: 'Comportamento' },
      { key: 'coins', label: 'Moedas ao destruir', type: 'number', min: 0, max: 50, step: 1, default: 1, group: 'Recompensa' },
      { key: 'score', label: 'Pontos', type: 'number', min: 0, max: 100000, step: 10, default: 50, group: 'Recompensa' },
      { key: 'spawnWeight', label: 'Peso de spawn', type: 'number', min: 0, max: 100, step: 1, default: 20, group: 'Spawn' },
      { key: 'minStage', label: 'Aparece a partir da fase', type: 'number', min: 1, max: 99, step: 1, default: 1, group: 'Spawn' }
    ]
  },

  tracks: {
    key: 'tracks',
    label: 'Pistas / Fases',
    singular: 'Pista',
    icon: '🌌',
    idPrefix: 'track',
    columns: ['order', 'style', 'duration', 'boss'],
    fields: [
      ...identityFields,
      { key: 'order', label: 'Ordem da fase', type: 'number', min: 1, max: 99, step: 1, default: 1, group: 'Identidade' },
      { key: 'style', label: 'Estilo do cenário', type: 'select', options: TRACK_STYLES, default: 'neonGrid', group: 'Cenário' },
      { key: 'groundTexture', label: 'Textura do chão (tileável)', type: 'asset', accept: 'image', default: '', group: 'Cenário', help: 'Substitui o chão procedural.' },
      { key: 'skyTexture', label: 'Fundo do céu (panorâmica 2:1)', type: 'asset', accept: 'image', default: '', group: 'Cenário' },
      { key: 'groundColor', label: 'Cor do chão', type: 'color', default: '#070b1a', group: 'Cenário' },
      { key: 'gridColor', label: 'Cor das linhas / detalhes', type: 'color', default: '#00f0ff', group: 'Cenário' },
      { key: 'skyTop', label: 'Céu (topo)', type: 'color', default: '#0b1030', group: 'Cenário' },
      { key: 'skyBottom', label: 'Céu (horizonte)', type: 'color', default: '#3b0a5a', group: 'Cenário' },
      { key: 'fogColor', label: 'Cor da névoa', type: 'color', default: '#0a0820', group: 'Cenário' },
      { key: 'lightColor', label: 'Cor da luz principal', type: 'color', default: '#a5f3fc', group: 'Cenário' },
      { key: 'scrollSpeed', label: 'Velocidade de rolagem', type: 'number', min: 20, max: 800, step: 10, default: 140, group: 'Cenário' },
      { key: 'duration', label: 'Duração até o chefão (s)', type: 'number', min: 10, max: 600, step: 5, default: 50, group: 'Jogabilidade' },
      { key: 'spawnInterval', label: 'Intervalo de ondas (ms)', type: 'number', min: 250, max: 5000, step: 50, default: 1100, group: 'Jogabilidade' },
      { key: 'obstacleInterval', label: 'Intervalo de obstáculos (ms)', type: 'number', min: 1000, max: 30000, step: 250, default: 6000, group: 'Jogabilidade' },
      { key: 'enemies', label: 'Monstros desta pista', type: 'multiref', ref: 'enemies', default: [], group: 'Conteúdo' },
      { key: 'obstacles', label: 'Obstáculos desta pista', type: 'multiref', ref: 'obstacles', default: [], group: 'Conteúdo' },
      { key: 'boss', label: 'Chefão final', type: 'ref', ref: 'bosses', default: '', group: 'Conteúdo' }
    ]
  }
};

/* ==========================================================================
   ECONOMIA (objeto único)
   ========================================================================== */
export const ECONOMY_SCHEMA = {
  key: 'economy',
  label: 'Economia & Preços',
  icon: '💰',
  fields: [
    { key: 'startingCoins', label: 'Moedas iniciais (save novo)', type: 'number', min: 0, max: 1000000, step: 50, default: 0, group: 'Geral' },
    { key: 'coinValue', label: 'Valor da moeda comum', type: 'number', min: 1, max: 10000, step: 5, default: 50, group: 'Geral' },
    { key: 'bigCoinValue', label: 'Valor da moeda grande (chefão)', type: 'number', min: 1, max: 10000, step: 5, default: 100, group: 'Geral' },
    { key: 'stageClearBonus', label: 'Bônus por fase concluída', type: 'number', min: 0, max: 100000, step: 50, default: 500, group: 'Geral' },

    { key: 'costMode', label: 'Curva de preço dos upgrades', type: 'select', options: COST_MODES, default: 'linear', group: 'Upgrades Permanentes' },
    { key: 'costGrowth', label: 'Fator de crescimento (exponencial)', type: 'number', min: 1, max: 5, step: 0.05, default: 1.6, group: 'Upgrades Permanentes' },
    { key: 'upgradeMaxLevel', label: 'Nível máximo dos upgrades', type: 'number', min: 2, max: 20, step: 1, default: 5, group: 'Upgrades Permanentes' },
    { key: 'hpUpgradePrice', label: '🛡️ Blindagem: preço base', type: 'number', min: 0, max: 1000000, step: 10, default: 300, group: 'Upgrades Permanentes' },
    { key: 'hpPerLevel', label: '🛡️ Blindagem: +HP por nível', type: 'number', min: 1, max: 1000, step: 1, default: 25, group: 'Upgrades Permanentes' },
    { key: 'speedUpgradePrice', label: '⚡ Turbinas: preço base', type: 'number', min: 0, max: 1000000, step: 10, default: 250, group: 'Upgrades Permanentes' },
    { key: 'speedPerLevel', label: '⚡ Turbinas: +% velocidade por nível', type: 'number', min: 0.01, max: 1, step: 0.01, default: 0.15, group: 'Upgrades Permanentes' },
    { key: 'magnetUpgradePrice', label: '🧲 Ímã: preço base', type: 'number', min: 0, max: 1000000, step: 10, default: 200, group: 'Upgrades Permanentes' },
    { key: 'magnetPerLevel', label: '🧲 Ímã: +raio por nível', type: 'number', min: 1, max: 500, step: 5, default: 60, group: 'Upgrades Permanentes' },
    { key: 'damageUpgradePrice', label: '🔥 Canhões: preço base', type: 'number', min: 0, max: 1000000, step: 10, default: 400, group: 'Upgrades Permanentes' },
    { key: 'damagePerLevel', label: '🔥 Canhões: +% dano por nível', type: 'number', min: 0.01, max: 2, step: 0.01, default: 0.2, group: 'Upgrades Permanentes' },

    { key: 'wingmanPrice', label: '🚀 Wingman: preço', type: 'number', min: 0, max: 100000, step: 10, default: 350, group: 'Consumíveis' },
    { key: 'wingmanDuration', label: '🚀 Wingman: duração (s)', type: 'number', min: 1, max: 120, step: 1, default: 12, group: 'Consumíveis' },
    { key: 'bombPrice', label: '💣 Bomba EMP: preço', type: 'number', min: 0, max: 100000, step: 10, default: 250, group: 'Consumíveis' },
    { key: 'bombDamage', label: '💣 Bomba EMP: dano', type: 'number', min: 1, max: 100000, step: 10, default: 400, group: 'Consumíveis' },
    { key: 'startBombs', label: '💣 Bombas no início da partida', type: 'number', min: 0, max: 20, step: 1, default: 2, group: 'Consumíveis' },
    { key: 'maxBombs', label: '💣 Máximo de bombas', type: 'number', min: 1, max: 20, step: 1, default: 5, group: 'Consumíveis' },
    { key: 'shieldPrice', label: '🔷 Escudo (3 cargas): preço', type: 'number', min: 0, max: 100000, step: 10, default: 300, group: 'Consumíveis' },
    { key: 'repairPrice', label: '🔧 Reparo (+50% HP): preço', type: 'number', min: 0, max: 100000, step: 10, default: 200, group: 'Consumíveis' }
  ]
};

/* ==========================================================================
   NORMALIZAÇÃO / VALIDAÇÃO
   ========================================================================== */
export function defaultFor(field) {
  return Array.isArray(field.default) ? [...field.default] : field.default;
}

export function normalizeRecord(fields, record = {}) {
  const out = { ...record };
  for (const f of fields) {
    let v = record[f.key];
    if (v === undefined || v === null) {
      out[f.key] = defaultFor(f);
      continue;
    }
    switch (f.type) {
      case 'number': {
        v = Number(v);
        if (Number.isNaN(v)) v = f.default;
        if (f.min !== undefined) v = Math.max(f.min, v);
        if (f.max !== undefined) v = Math.min(f.max, v);
        out[f.key] = v;
        break;
      }
      case 'boolean':
        out[f.key] = Boolean(v);
        break;
      case 'multiselect':
      case 'multiref':
        out[f.key] = Array.isArray(v) ? v.filter(Boolean) : [];
        break;
      case 'color':
        out[f.key] = /^#[0-9a-f]{6}$/i.test(v) ? v : f.default;
        break;
      default:
        out[f.key] = String(v);
    }
  }
  return out;
}

export function validateRecord(fields, record) {
  const errors = {};
  for (const f of fields) {
    if (f.required && !String(record[f.key] ?? '').trim()) errors[f.key] = 'Campo obrigatório';
    if (f.type === 'number') {
      const n = Number(record[f.key]);
      if (Number.isNaN(n)) errors[f.key] = 'Número inválido';
      else if (f.min !== undefined && n < f.min) errors[f.key] = `Mínimo ${f.min}`;
      else if (f.max !== undefined && n > f.max) errors[f.key] = `Máximo ${f.max}`;
    }
  }
  return errors;
}

export function createRecord(collectionKey, overrides = {}) {
  const col = COLLECTIONS[collectionKey];
  const id = `${col.idPrefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  return normalizeRecord(col.fields, { id, ...overrides });
}

export function normalizeConfig(raw = {}) {
  const cfg = { version: CONFIG_VERSION, meta: { ...(raw.meta || {}) } };
  for (const key of Object.keys(COLLECTIONS)) {
    const list = Array.isArray(raw[key]) ? raw[key] : [];
    cfg[key] = list
      .filter((r) => r && r.id)
      .map((r) => normalizeRecord(COLLECTIONS[key].fields, r));
  }
  cfg.economy = normalizeRecord(ECONOMY_SCHEMA.fields, raw.economy || {});
  return cfg;
}

/** Remove referências quebradas (ex.: monstro excluído ainda listado numa pista). */
export function cleanReferences(cfg) {
  const ids = (k) => new Set(cfg[k].map((r) => r.id));
  for (const [key, col] of Object.entries(COLLECTIONS)) {
    for (const f of col.fields) {
      if (f.type !== 'ref' && f.type !== 'multiref') continue;
      const valid = ids(f.ref);
      for (const rec of cfg[key]) {
        if (f.type === 'ref' && rec[f.key] && !valid.has(rec[f.key])) rec[f.key] = '';
        if (f.type === 'multiref') rec[f.key] = rec[f.key].filter((id) => valid.has(id));
      }
    }
  }
  return cfg;
}

/** Calcula o custo de um upgrade permanente num determinado nível atual. */
export function upgradeCost(economy, basePrice, currentLevel) {
  if (economy.costMode === 'exponential') {
    return Math.round(basePrice * Math.pow(economy.costGrowth, currentLevel - 1));
  }
  return Math.round(basePrice * currentLevel);
}
