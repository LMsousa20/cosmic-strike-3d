# 📁 Pasta de Assets — Cosmic Strike 3D

Coloque aqui as imagens e modelos 3D do jogo. **Tudo que estiver nesta pasta aparece automaticamente
na Biblioteca de Assets do Painel Administrativo** (`admin.html`) — basta recarregar a página.

| Pasta         | O que colocar                                                   |
|---------------|-----------------------------------------------------------------|
| `players/`    | Naves / personagens jogáveis                                    |
| `enemies/`    | Monstros e naves inimigas comuns                                |
| `bosses/`     | Chefões                                                         |
| `obstacles/`  | Obstáculos especiais (minas, portões, buracos negros...)        |
| `tracks/`     | Pistas / cenários: texturas de chão (tileáveis) e fundos (céu)  |
| `items/`      | Moedas, power-ups, cápsulas                                     |
| `fx/`         | Texturas de partículas, explosões, brilhos                      |
| `audio/`      | Músicas e efeitos sonoros (`.mp3`, `.ogg`, `.wav`)              |

## Formatos aceitos

- **Modelos 3D:** `.glb` (recomendado) ou `.gltf` com texturas embutidas.
  - Mantenha o modelo leve (< 5 MB, < 20 mil triângulos).
  - A frente da nave deve apontar para **-Z** (se não apontar, ajuste o campo *Rotação do modelo* no painel).
  - O jogo redimensiona o modelo automaticamente pelo campo *Escala*.
- **Imagens (sprites):** `.png` com **fundo transparente** (ou `.webp`). Usadas quando não há modelo 3D.
  - Tamanho sugerido: 256×256 ou 512×512, nave **olhando para cima**.
- **Texturas de pista:** `.jpg`/`.png` **tileáveis** (sem emenda), 512×512 ou 1024×1024.
- **Fundo de céu:** imagem panorâmica equiretangular 2:1 (ex.: 2048×1024).

## Convenção de nomes

Use letras minúsculas, sem espaços e sem acentos: `batedor-vermelho.png`, `boss-titan.glb`.

## Prioridade de carregamento

1. Modelo 3D (`.glb`) → 2. Imagem (`.png`) → 3. Modelo procedural gerado por código (padrão).
