import { defineConfig } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { SCHEMA_VERSION } from '../shared/src/index';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(SCHEMA_VERSION),
  },
  server: {
    host: '127.0.0.1',
    allowedHosts: ['zalewhol.local', 'zalewhol.com', '10.36.1.137', '100.95.136.70'],
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:3001',
        ws: true,
      },
      '/api': { target: 'http://127.0.0.1:3001' },
      '/health': { target: 'http://127.0.0.1:3001' },
      '/matches': { target: 'http://127.0.0.1:3001' },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  plugins: [
    sentryVitePlugin({
      org: 'mike-hall',
      project: 'phalanxduel',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
