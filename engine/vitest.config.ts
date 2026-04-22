import { defineConfig } from 'vitest/config';
import { preferTsSourceImports } from '../scripts/build/resolve-source';

export default defineConfig({
  plugins: [preferTsSourceImports()],
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
    coverage: {
      all: true,
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 79,
        statements: 80,
      },
    },
  },
});
