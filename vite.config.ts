import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import referenceData from './reference-data.json' with { type: 'json' };

const referenceDataVersion = referenceData.sha256.slice(0, 12);

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: false,
      includeAssets: ['icons/*.{svg,png}'],
      workbox: {
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3_000_000,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{html,css,js,svg,json,webmanifest}'],
        globIgnores: [
          'data/generated/cities/*.json',
          'data/generated/city-prefixes/*.json',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/data\/generated\/(?:cities|city-prefixes)\/[^/]+\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: `worldtime-city-search-${referenceDataVersion}`,
              expiration: {
                maxEntries: 650,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
  },
});
