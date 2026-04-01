import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const RUNTIME_UNSAFE_ENV_KEYS = new Set(['NODE_OPTIONS']);
const EXTERNALLY_DEFINED_ENV_KEYS = new Set(Object.keys(process.env));

function loadEnvFile(path: string, overrideExisting: boolean): void {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (!existsSync(path)) return;

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const raw = readFileSync(path, 'utf8');
  const parsed = parseEnv(raw);

  for (const [key, value] of Object.entries(parsed)) {
    if (RUNTIME_UNSAFE_ENV_KEYS.has(key)) continue;
    if (overrideExisting && EXTERNALLY_DEFINED_ENV_KEYS.has(key)) continue;

    if (overrideExisting || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

const appEnv =
  process.env.APP_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'local');

loadEnvFile(resolve(repoRoot, '.env'), false);
loadEnvFile(resolve(repoRoot, '.env.secrets'), true);

if (appEnv !== 'local') {
  loadEnvFile(resolve(repoRoot, `.env.${appEnv}`), true);
}

loadEnvFile(resolve(repoRoot, '.env.local'), true);
loadEnvFile(resolve(repoRoot, '.env.secrets.local'), true);
loadEnvFile(resolve(repoRoot, `.env.${appEnv}.local`), true);
