import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  root: 'src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: 3103,
    allowedHosts: [
      'admin.phalanxduel.localhost',
      '.lan.phalanxduel.com',
      'admin.lan.phalanxduel.com',
    ],
    proxy: {
      '/admin-api': 'http://127.0.0.1:3102',
    },
  },
});
