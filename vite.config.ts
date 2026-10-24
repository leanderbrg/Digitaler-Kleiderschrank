/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { realpathSync } from 'node:fs';

// BASE_PATH erlaubt Deployment in Unterordner (z. B. GitHub Pages: /kleiderschrank/)
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  // Echter Pfad statt evtl. virtualisiertem/verlinktem Ordner, sonst scheitert der HTML-Build
  root: realpathSync.native(process.cwd()),
  base,
  plugins: [
    react(),
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
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
