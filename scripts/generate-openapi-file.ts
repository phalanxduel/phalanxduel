/**
 * Extraction script for Phalanx Duel OpenAPI specification.
 * Boots the Fastify application, stabilizes dynamic fields, and writes to disk.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '../docs/api/openapi.json');

async function main() {
  console.log('🚀 Extracting OpenAPI spec from server...');

  // Set minimal env vars before importing the server. In CI, DATABASE_URL is
  // normally set for test suites; importing the server with it present creates
  // a module-level Postgres client that keeps this one-shot generator alive.
  process.env.NODE_ENV = 'test';
  process.env.PHALANX_SKIP_ENV_FILES = '1';
  process.env.OTEL_SDK_DISABLED = 'true';
  delete process.env.DATABASE_URL;

  const [{ buildApp }, { SCHEMA_VERSION }] = await Promise.all([
    import('../server/src/app.js'),
    import('../shared/src/schema.js'),
  ]);

  const app = await buildApp();

  try {
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to fetch OpenAPI JSON: ${response.statusCode}\n${response.body}`);
    }

    const spec = JSON.parse(response.body);

    // Stabilize dynamic fields for the published spec
    spec.servers = [
      { url: 'http://127.0.0.1:3001', description: 'Local Development Server' },
      { url: 'https://play.phalanxduel.com', description: 'Production API' },
    ];

    // Ensure the version in the spec matches the source of truth
    if (spec.info) {
      spec.info.version = SCHEMA_VERSION;
    }

    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, JSON.stringify(spec, null, 2), 'utf8');

    console.log(`✅ OpenAPI spec saved to: ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('❌ Failed to generate OpenAPI file:', err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main().then(() => {
  process.exit(0);
});
