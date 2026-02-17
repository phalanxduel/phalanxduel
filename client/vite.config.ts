import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: [
      'zalewhol.local',
      'zalewhol.com',
      '10.36.1.137',
      '100.95.136.70'
    ],
  },
  build: {
    outDir: 'dist',
  },
});
