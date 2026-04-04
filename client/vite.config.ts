import { defineConfig } from 'vite';
import { SCHEMA_VERSION } from '../shared/src/index';

const IGNORE_PROTOBUFJS_EVAL_WARNING_UNTIL = '2026-04-09';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(SCHEMA_VERSION),
  },
  server: {
    host: process.env.VITE_HOST || '127.0.0.1',
    allowedHosts: ['zalewhol.local', 'zalewhol.com', '10.36.1.137', '100.95.136.70'],
    proxy: {
      '/ws': {
        target: (process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:3001').replace(/^http/, 'ws'),
        ws: true,
      },
      '/api': { target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:3001' },
      '/health': { target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:3001' },
      '/matches': { target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:3001' },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
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
