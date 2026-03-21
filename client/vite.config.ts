import { defineConfig } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { SCHEMA_VERSION } from '../shared/src/index';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(SCHEMA_VERSION),
  },
  server: {
    allowedHosts: ['zalewhol.local', 'zalewhol.com', '10.36.1.137', '100.95.136.70'],
    proxy: {
      '/ws': {
        target: process.env.VITE_PROXY_TARGET?.replace('http', 'ws') || 'ws://localhost:3001',
        ws: true,
      },
      '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:3001' },
      '/health': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:3001' },
      '/matches': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:3001' },
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
