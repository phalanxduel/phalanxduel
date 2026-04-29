import { defineConfig } from 'vitest/config';
import { preferTsSourceImports } from '../scripts/build/resolve-source';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
    __BUILD_ID__: JSON.stringify('test'),
  },
  plugins: [preferTsSourceImports()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/vite-env.d.ts', 'src/main.ts', 'src/pizzazz.ts'],
      thresholds: {
        statements: 58,
        lines: 58,
      },
    },
  },
});
