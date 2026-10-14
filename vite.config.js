import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/* ==========================================================================
   Plugin: manifesto automático da pasta public/assets
   - Em desenvolvimento: responde /assets-manifest.json escaneando a pasta a cada requisição
     (basta colar um arquivo novo na pasta e recarregar o painel).
   - No build: gera dist/assets-manifest.json.
   ========================================================================== */
const ASSET_EXT = /\.(png|jpe?g|webp|gif|svg|glb|gltf|mp3|ogg|wav)$/i;

function scanAssets(root) {
  const publicDir = path.resolve(root, 'public');
  const base = path.join(publicDir, 'assets');
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (ASSET_EXT.test(entry.name)) {
        const rel = path.relative(publicDir, full).split(path.sep).join('/');
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        const kind = ['glb', 'gltf'].includes(ext) ? 'model' : ['mp3', 'ogg', 'wav'].includes(ext) ? 'audio' : 'image';
        files.push({
          path: rel,
          name: entry.name,
          category: rel.split('/')[1] || 'outros',
          kind,
          size: fs.statSync(full).size
        });
      }
    }
  };
  walk(base);
  return files;
}

function assetManifestPlugin() {
  let root = process.cwd();
  return {
    name: 'cosmic-asset-manifest',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.split('?')[0].endsWith('/assets-manifest.json')) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ generatedAt: Date.now(), files: scanAssets(root) }));
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'assets-manifest.json',
        source: JSON.stringify({ generatedAt: Date.now(), files: scanAssets(root) })
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [assetManifestPlugin()],
  build: {
    // "assets" fica reservado para a pasta de imagens/modelos do jogo
    assetsDir: 'bundle',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'index.html'),
        admin: path.resolve(process.cwd(), 'admin.html')
      }
    }
  },
  server: {
    port: 5173,
    open: false
  }
});
