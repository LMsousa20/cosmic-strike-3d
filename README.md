# ⚡ Cosmic Strike 3D — Arcade Space Shooter

> Um jogo de combate espacial arcade 2.5D de alta fidelidade desenvolvido com **Three.js** e **Vite**, trazendo gráficos 3D dinâmicos, sintetizador sonoro procedural multicanal, esquadrão de reforço acumulativo, atalhos rápidos de teclado e um **Painel Administrativo completo em tempo real**.

---

## 🎮 Demonstração & Recursos

* **Motor Gráfico Three.js:** Visual 2.5D com iluminação dinâmica, sombras, esteiras de plasma e grade neon sci-fi.
* **Modelos Procedurais & Customizáveis:** Se nenhum modelo `.glb` ou imagem for fornecido, o jogo gera malhas 3D *low-poly* proceduralmente em tempo de execução.
* **Esquadrão de Reforço Acumulativo:** Convoque até 8 drones aliados com custo exponencial que assumem posições táticas e disparam a mesma quantidade de tiros que o jogador (limitado a 8).
* **Sintetizador Web Audio API:** Efeitos sonoros arcade gerados proceduralmente via código (lasers, mísseis, explosões, bombas EMP e moedas) sem arquivos pesados de áudio.
* **Painel Administrativo (`/admin.html`):** CRUD completo com *preview* 3D interativo para cadastrar e editar naves, inimigos, chefões, obstáculos especiais, pistas e calibrar toda a economia em tempo real.
* **Persistência Inteligente:** Salvamento automático de moedas, recordes e compras com proteção de thread (*debounce/throttle*).

---

## ⌨️ Controles e Atalhos

### Modo PC (Teclado e Mouse)
| Comando | Teclas de Atalho | Descrição |
| :--- | :--- | :--- |
| **Movimento** | **`W` `A` `S` `D`** / **Setas** ou Arraste do Mouse | Movimenta a nave suavemente na arena 3D |
| **Chamar Reforço** | **`R`** ou **`E`** | Convoca um drone de apoio no esquadrão tático (custo exponencial: 250, 1000, 2000...) |
| **Bomba EMP** | **`ESPAÇO`**, **`B`** ou **`Q`** | Detona uma onda de choque que limpa tiros inimigos e causa 400 de dano |
| **Blindagem (+HP)** | Tecla **`1`** | Compra melhoria permanente de blindagem no casco |
| **Turbinas (+Vel)** | Tecla **`2`** | Compra melhoria de agilidade de manobra |
| **Campo Magnético** | Tecla **`3`** | Aumenta o raio de atração do ímã de moedas |
| **Recarregar Bomba** | Tecla **`4`** | Compra uma recarga instantânea de bomba EMP |
| **Pausar Jogo** | **`ESC`** ou **`P`** | Pausa o combate e exibe o menu |

### Modo Mobile
* **Toque e Arraste:** Movimenta a nave com offset ergonômico (o dedo não cobre a nave).
* **Botões Touch Integrados:** Botão de **Bomba EMP**, **Apoio Rápido** e **Hangar Lateral**.

---

## 🛠️ Painel Administrativo

Acesse `http://localhost:5173/admin.html` para gerenciar todo o universo do jogo:

1. **Naves dos Pilotos:** Ajuste HP, velocidade, cadência, dano e preço de desbloqueio.
2. **Inimigos & Monstros:** Configure padrões de movimento (*sine*, *zigzag*, *kamikaze*, *shooter*, *splitter*), vida, dano e drops.
3. **Chefões Colossais:** Defina fases de fúria, padrões de tiros múltiplos e recompensas épicas.
4. **Obstáculos Especiais:** Campos de asteroides, minas de prótons, portões laser e buracos negros com atração gravitacional.
5. **Diretor de Pistas:** Configure mundos (Órbita de Neon, Cinturão de Magma, Planeta Glacial e Vazio Profundo).
6. **Controle de Economia:** Ajuste preços base, curvas de custo linear/exponencial e valores das moedas.
7. **Backup & Restauração:** Exporte e importe suas configurações personalizadas em formato JSON.

---

## 📁 Estrutura de Pastas de Assets

O projeto conta com pastas organizadas para você adicionar suas próprias imagens PNG ou modelos 3D GLB:

```text
public/assets/
├── players/     # Modelos 3D (.glb) ou sprites (.png) das naves jogáveis
├── enemies/     # Naves inimigas e monstros
├── bosses/      # Modelos dos chefões colossais
├── obstacles/   # Obstáculos, portões laser, minas
├── items/       # Moedas e cápsulas de power-ups
└── tracks/      # Texturas de solo e céu das pistas
```

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
* **Node.js** (versão 18 ou superior)
* **npm** ou **yarn**

### Instalação e Execução
```bash
# 1. Clone o repositório
git clone https://github.com/LMsousa20/cosmic-strike-3d.git

# 2. Acesse a pasta do projeto
cd cosmic-strike-3d

# 3. Instale as dependências
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

* **Jogo Principal:** Abra `http://localhost:5173/`
* **Painel Administrativo:** Abra `http://localhost:5173/admin.html`

### Build para Produção
```bash
npm run build
```
Os arquivos otimizados serão gerados na pasta `dist/`.

---

## 🧬 Tecnologias Utilizadas

* **[Three.js](https://threejs.org/):** Renderização 3D WebGL, câmeras com amortecimento e iluminação.
* **[Vite](https://vitejs.dev/):** Bundler ultrarrápido para desenvolvimento e build de produção.
* **Web Audio API:** Sintetizador sonoro procedural em tempo real.
* **IndexedDB & LocalStorage:** Armazenamento seguro de estados e configurações do painel.
* **Vanilla CSS:** Design sci-fi com vidro fumê (*glassmorphism*), tipografia arcade e paletas neon.

---

## 👤 Autor

Desenvolvido por **Lucas Monteiro**  
GitHub: [@LMsousa20](https://github.com/LMsousa20)  
E-mail: [lmsousa20@gmail.com](mailto:lmsousa20@gmail.com)

Licença: [MIT](LICENSE)
