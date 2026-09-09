import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: { ...devices['iPhone 13'], baseURL: 'http://127.0.0.1:5173' },
  webServer: [
    {
      cwd: '../..',
      command:
        'bash bin/maint/with-tooling-postgres.sh pnpm --filter @phalanxduel/server exec tsx watch src/index.ts',
      url: 'http://127.0.0.1:3001/health',
      reuseExistingServer: true,
    },
    {
      cwd: '../..',
      command: 'pnpm --filter @phalanxduel/client dev --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
    },
  ],
});
