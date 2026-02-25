import { existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import type { Plugin } from 'vitest/config';

function stripQuery(id: string): string {
  const q = id.indexOf('?');
  return q >= 0 ? id.slice(0, q) : id;
}

/**
 * In this repo, some packages have generated JS files alongside TS source files in src/.
 * During tests, extensionless/".js" relative imports can accidentally resolve to those JS
 * artifacts, which makes TS coverage appear as 0% because the .ts files are not executed.
 */
export function preferTsSourceImports(): Plugin {
  return {
    name: 'prefer-ts-source-imports',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer) {
        return null;
      }
      if (!source.startsWith('./') && !source.startsWith('../')) {
        return null;
      }

      const importerPath = stripQuery(importer);
      if (!/\/(src|tests)\//.test(importerPath)) {
        return null;
      }

      const sourceNoQuery = stripQuery(source);
      const importerDir = dirname(importerPath);
      const ext = extname(sourceNoQuery);

      const candidates: string[] = [];
      if (ext === '.js') {
        candidates.push(resolve(importerDir, sourceNoQuery.replace(/\.js$/, '.ts')));
      } else if (!ext) {
        candidates.push(resolve(importerDir, `${sourceNoQuery}.ts`));
      }

      for (const candidate of candidates) {
        if (candidate.includes('/src/') && existsSync(candidate)) {
          return candidate;
        }
      }

      return null;
    },
  };
}
