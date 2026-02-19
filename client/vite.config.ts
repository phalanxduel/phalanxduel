import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: [
      'zalewhol.local',
      'zalewhol.com',
      '10.36.1.137',
      '100.95.136.70'
    ],
    proxy: {
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
      '/health': { target: 'http://localhost:3001' },
      '/matches': { target: 'http://localhost:3001' },
    },
  },
  build: {
    outDir: 'dist',
  },
});
