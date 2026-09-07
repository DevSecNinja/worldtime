import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

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
        globPatterns: ['**/*.{html,css,js,svg,json}'],
        globIgnores: [
          '**/GlobeExplorer-*.js',
          '**/globe-*.js',
          'data/generated/countries.geo.json',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(?:GlobeExplorer|globe)-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'worldtime-optional-globe',
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /\/data\/generated\/countries\.geo\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'worldtime-optional-globe',
              expiration: {
                maxEntries: 2,
                maxAgeSeconds: 60 * 60 * 24 * 30,
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
