import { defineConfig } from 'vitest/config';
import { preferTsSourceImports } from '../scripts/build/resolve-source';

export default defineConfig({
  plugins: [preferTsSourceImports()],
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      all: true,
      provider: 'v8',
      include: ['src/**/*.ts'],
      // hash.ts uses node:crypto (not browser-safe, tested indirectly via server)
      // types.ts is auto-generated from schema.ts — no testable logic
      // index.ts re-exports only
      exclude: ['src/**/*.d.ts', 'src/hash.ts', 'src/types.ts', 'src/index.ts'],
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
