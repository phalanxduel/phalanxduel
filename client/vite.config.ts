import { defineConfig } from 'vite';
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { SCHEMA_VERSION } from "../shared/src/index";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(SCHEMA_VERSION),
  },
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
    sourcemap: true,
  },
  plugins: [
    sentryVitePlugin({
      org: "just3ws",
      project: "phalanx-client",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
