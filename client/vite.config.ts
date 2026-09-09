import { defineConfig } from 'vite';
import { SCHEMA_VERSION } from '../shared/src/index';

import { execSync } from 'child_process';

const IGNORE_PROTOBUFJS_EVAL_WARNING_UNTIL = '2026-04-09';
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:3001';
const otelProxyTarget = process.env.VITE_OTEL_PROXY_TARGET || 'http://localhost:4318';

let buildId = 'unknown';
try {
  buildId = execSync('git rev-parse --short HEAD', { stdio: 'pipe' }).toString().trim();
} catch {
  buildId = 'b-' + Math.floor(Date.now() / 1000).toString(16);
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(SCHEMA_VERSION),
    __BUILD_ID__: JSON.stringify(buildId),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    host: process.env.VITE_HOST || '127.0.0.1',
    watch: {
      // Docker Desktop on Mac doesn't reliably propagate inotify events into
      // containers — polling ensures Vite detects file changes on bind mounts.
      usePolling: !!process.env.VITE_HOST,
    },
    allowedHosts: [
      '.localhost',
      '.local',
      'play.phalanxduel.localhost',
      '.lan.phalanxduel.com',
      'lan.phalanxduel.com',
      'play.lan.phalanxduel.com',
    ],
    proxy: {
      '/rum': {
        target: 'http://127.0.0.1:5080',
        changeOrigin: true,
      },
      '/ws': {
        target: proxyTarget.replace(/^http/, 'ws'),
        ws: true,
        changeOrigin: true,
      },
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/health': {
        target: proxyTarget,
        changeOrigin: true,
      },
      '/matches': {
        target: proxyTarget,
        changeOrigin: true,
      },
      // Keep browser OTLP same-origin during local HTTPS development. The
      // project vhost applies the same route for play.phalanxduel.localhost.
      '/otel': {
        target: otelProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/otel/u, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      onLog(level, log, defaultHandler) {
        // Temporary ignore for upstream protobufjs eval warning.
        // Remove after 2026-04-09 and re-check whether the dependency path still emits it.
        if (
          IGNORE_PROTOBUFJS_EVAL_WARNING_UNTIL === '2026-04-09' &&
          level === 'warn' &&
          log.code === 'EVAL' &&
          log.id?.includes('@protobufjs/inquire/index.js')
        ) {
          return;
        }

        defaultHandler(level, log);
      },
    },
  },
  plugins: [],
});
