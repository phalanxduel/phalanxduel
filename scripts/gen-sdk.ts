/**
 * SDK Generation Orchestrator
 *
 * Generates strongly typed SDKs for TypeScript and Go from the authoritative OpenAPI specification.
 * The OpenAPI spec is automatically enriched with WebSocket message models.
 */

import execa from 'execa';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const OPENAPI_SPEC = join(ROOT_DIR, 'docs/api/openapi.json');

const SDK_GO_DIR = join(ROOT_DIR, 'sdk/go');
const SDK_TS_DIR = join(ROOT_DIR, 'sdk/ts');

async function runCommand(command: string, args: string[], cwd: string = ROOT_DIR) {
  console.log(`🏃 Running: ${command} ${args.join(' ')} (in ${cwd})`);
  await execa(command, args, { stdio: 'inherit', cwd });
}

async function generateSdks() {
  console.log('📖 Generating SDKs from OpenAPI spec...');

  // 1. Go Client
  await runCommand('pnpm', [
    'openapi-generator-cli',
    'generate',
    '--skip-validate-spec',
    '-i',
    OPENAPI_SPEC,
    '-g',
    'go',
    '-o',
    SDK_GO_DIR,
    '--additional-properties',
    ['packageName=phalanx', 'enumClassPrefix=true', 'structPrefix=true', 'isGoSubmodule=true'].join(
      ',',
    ),
  ]);

  // 2. TypeScript Client (Fetch)
  await runCommand('pnpm', [
    'openapi-generator-cli',
    'generate',
    '--skip-validate-spec',
    '-i',
    OPENAPI_SPEC,
    '-g',
    'typescript-fetch',
    '-o',
    join(SDK_TS_DIR, 'client'),
    '--additional-properties',
    'typescriptThreePlus=true,supportsES6=true',
  ]);
}

async function main() {
  try {
    await mkdir(SDK_GO_DIR, { recursive: true });
    await mkdir(SDK_TS_DIR, { recursive: true });

    console.log('🔨 Generating prerequisite schemas...');
    await runCommand('pnpm', ['--filter', '@phalanxduel/shared', 'schema:gen']);

    console.log('🚀 Updating OpenAPI specification file...');
    await runCommand('pnpm', ['openapi:gen']);

    await generateSdks();

    console.log('📦 Initializing Go module...');
    try {
      const goModPath = join(SDK_GO_DIR, 'go.mod');
      const { existsSync } = await import('node:fs');
      if (!existsSync(goModPath)) {
        await execa('go', ['mod', 'init', 'github.com/phalanxduel/game/sdk/go'], {
          cwd: SDK_GO_DIR,
        });
      }
      await execa('go', ['mod', 'tidy'], { cwd: SDK_GO_DIR });
    } catch (e) {
      console.warn(
        '⚠️ Go mod tidy warning (non-fatal):',
        e instanceof Error ? e.message : String(e),
      );
    }

    console.log('✅ SDK generation complete!');
  } catch (err) {
    console.error('❌ SDK generation failed:', err);
    process.exit(1);
  }
}

main();
