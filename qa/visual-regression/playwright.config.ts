import { defineConfig, devices } from '@playwright/test';

// Selects the project development database locally and the test database in CI.
// This keeps Playwright from inheriting the ambient `postgresql:///my` shell DB.
const serverCommand =
  'bash bin/maint/with-tooling-postgres.sh pnpm --filter @phalanxduel/server exec tsx watch src/index.ts';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      cwd: '../..',
      command: serverCommand,
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      cwd: '../..',
      command: 'pnpm --filter @phalanxduel/client dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.015, // 1.5% threshold to accommodate unavoidable anti-aliasing text drift (~0.007 observed)
    },
  },
});
