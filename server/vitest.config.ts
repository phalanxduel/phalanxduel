import { defineConfig } from 'vitest/config';
import { preferTsSourceImports } from '../scripts/vitest-prefer-ts-source-imports';

export default defineConfig({
  plugins: [preferTsSourceImports()],
  test: {
    include: ['tests/**/*.test.ts'],
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
        branches: 80,
        statements: 80,
      },
    },
  },
});
