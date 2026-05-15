import { defineConfig } from 'vitest/config';
import { existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

/**
 * Self-contained version of preferTsSourceImports for Stryker sandbox.
 * Prevents accidental resolution to .js artifacts in src/.
 */
function preferTsSourceImports() {
  return {
    name: 'prefer-ts-source-imports',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || (!source.startsWith('./') && !source.startsWith('../'))) return null;
      const importerPath = importer.split('?')[0];
      if (!importerPath || !/\/(src|tests)\//.test(importerPath)) return null;
      const sourceNoQuery = source.split('?')[0]!;
      const importerDir = dirname(importerPath);
      const ext = extname(sourceNoQuery);
      const candidates = [];
      if (ext === '.js')
        candidates.push(resolve(importerDir, sourceNoQuery.replace(/\.js$/, '.ts')));
      else if (!ext) candidates.push(resolve(importerDir, `${sourceNoQuery}.ts`));
      for (const candidate of candidates) {
        if (candidate.includes('/src/') && existsSync(candidate)) return candidate;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [preferTsSourceImports() as any],
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
  },
});
