/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createReadStream, existsSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// BASE_PATH erlaubt Deployment in Unterordner (z. B. GitHub Pages: /kleiderschrank/)
const base = process.env.BASE_PATH ?? '/';
const root = realpathSync.native(process.cwd());

/**
 * Liefert die ONNX-WASM-Laufzeit von Transformers.js unter <base>ki/ aus der eigenen App aus
 * (statt zur Laufzeit von einem CDN). Die Dateien werden erst geladen, wenn die KI-Erkennung
 * genutzt wird, und dann vom Service Worker gecacht.
 */
function kiLaufzeit(): Plugin {
  const quelle = join(root, 'node_modules/@huggingface/transformers/dist');
  const dateien = ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'];
  return {
    name: 'ki-laufzeit',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const datei = req.url?.split('?')[0].split('/ki/')[1];
        if (!datei || !dateien.includes(datei)) return next();
        res.setHeader('Content-Type', datei.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
        createReadStream(join(quelle, datei)).pipe(res);
      });
    },
    generateBundle() {
      for (const datei of dateien) {
        this.emitFile({ type: 'asset', fileName: `ki/${datei}`, source: readFileSync(join(quelle, datei)) });
      }
    },
    closeBundle() {
      // onnxruntime-web verweist intern per new URL(…) auf die WASM-Datei, daher legt Vite eine
      // gehashte Kopie unter assets/ ab. Genutzt wird aber die Datei unter ki/ (wasmPaths im
      // Worker) – die 21-MB-Kopie wäre nur toter Ballast.
      const assets = join(root, 'dist/assets');
      if (!existsSync(assets)) return;
      for (const datei of readdirSync(assets)) {
        if (/^ort-wasm.*\.wasm$/.test(datei)) rmSync(join(assets, datei));
      }
    },
  };
}

export default defineConfig({
  // Echter Pfad statt evtl. virtualisiertem/verlinktem Ordner, sonst scheitert der HTML-Build
  root,
  base,
  worker: { format: 'es' },
  plugins: [
    react(),
    kiLaufzeit(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Kleiderschrank',
        short_name: 'Kleiderschrank',
        description: 'Kleidung an zwei Standorten verwalten – offline, lokal, mit Fotos.',
        lang: 'de',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // KI-Worker (inkl. Transformers.js) und WASM-Laufzeit nicht vorab laden – nur wer die
        // KI-Erkennung einschaltet, lädt sie; danach liegen sie im Runtime-Cache "ki-laufzeit".
        globIgnores: ['**/ki.worker-*.js', 'ki/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && (/\/ki\/ort-wasm/.test(url.pathname) || /\/assets\/ki\.worker-.*\.js$/.test(url.pathname)),
            handler: 'CacheFirst',
            options: { cacheName: 'ki-laufzeit', expiration: { maxEntries: 10 } },
          },
        ],
        // Modelldateien von huggingface.co verwaltet Transformers.js selbst (Cache "transformers-cache");
        // der Service Worker fasst fremde Hosts nicht an.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/ki\//],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
