import { defineConfig } from 'vitest/config';
import { preferTsSourceImports } from '../scripts/build/resolve-source';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
  },
  plugins: [preferTsSourceImports()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
