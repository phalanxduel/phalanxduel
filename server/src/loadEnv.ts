import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const RUNTIME_UNSAFE_ENV_KEYS = new Set(['NODE_OPTIONS']);
const EXTERNALLY_DEFINED_ENV_KEYS = new Set(Object.keys(process.env));

function loadEnvFile(path: string, overrideExisting: boolean): void {
  if (!existsSync(path)) return;

  const raw = readFileSync(path, 'utf8');
  const parsed = parseEnv(raw);

  for (const [key, value] of Object.entries(parsed)) {
    // NODE_OPTIONS can crash worker-based subsystems (e.g. pino transports)
    // when injected after process boot. Respect only externally provided values.
    if (RUNTIME_UNSAFE_ENV_KEYS.has(key)) continue;

    // Let shell/runner-provided env win over file values.
    // This preserves local .env.local defaults while allowing one-off overrides like:
    // OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev:server
    if (overrideExisting && EXTERNALLY_DEFINED_ENV_KEYS.has(key)) continue;

    if (overrideExisting || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

// Load base env first, then let .env.local override for local development.
loadEnvFile(resolve(repoRoot, '.env'), false);
loadEnvFile(resolve(repoRoot, '.env.local'), true);
