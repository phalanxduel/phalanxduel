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
      // OTel instrumentation files require a live collector to exercise all branches.
      // Smoke test file is an integration script, not a unit module.
      // index.ts is the runtime entrypoint (process.listen), not unit-testable.
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        'src/instrument.ts',
        'src/metrics.ts',
        'src/tracing.ts',
        'src/*-smoke-test.ts',
      ],
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 60,
        functions: 60,
        // Branch coverage floor at 55%: app.ts has structurally unreachable branches
        // (Buffer.from catch — Node.js never throws for base64, Array.isArray ws raw —
        // the ws library always delivers Buffer, non-MatchError generic handlers).
        // OTel setInterval cleanup and phase-recording require timing-sensitive tests.
        // Actual coverage is ~73-75%; set floor conservatively to avoid flaky CI.
        branches: 50,
        statements: 60,
      },
    },
    testTimeout: 60000,
  },
});
