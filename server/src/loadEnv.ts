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
    // NODE_OPTIONS can crash worker-based subsystems (e.g. pino transports)
    // when injected after process boot. Respect only externally provided values.
    if (RUNTIME_UNSAFE_ENV_KEYS.has(key)) continue;

    // Let shell/runner-provided env win over file values.
    if (overrideExisting && EXTERNALLY_DEFINED_ENV_KEYS.has(key)) continue;

    if (overrideExisting || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

// 1. Determine environment (APP_ENV > NODE_ENV > local)
const appEnv =
  process.env.APP_ENV ?? (process.env.NODE_ENV === 'production' ? 'production' : 'local');

// 2. Load hierarchy
// Base .env (Always loaded first as defaults)
loadEnvFile(resolve(repoRoot, '.env'), false);

// Environment-specific .env (e.g. .env.staging, .env.production, .env.test)
// These OVERRIDE base .env defaults
if (appEnv !== 'local') {
  loadEnvFile(resolve(repoRoot, `.env.${appEnv}`), true);
}

// Local developer overrides (Global for all local envs)
loadEnvFile(resolve(repoRoot, '.env.local'), true);

// Environment-specific local overrides (e.g. .env.staging.local)
loadEnvFile(resolve(repoRoot, `.env.${appEnv}.local`), true);
