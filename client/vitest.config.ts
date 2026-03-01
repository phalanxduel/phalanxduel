import { defineConfig } from 'vitest/config';
import { preferTsSourceImports } from '../scripts/build/resolve-source';

export default defineConfig({
  plugins: [preferTsSourceImports()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
