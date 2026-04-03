/**
 * SDK Generation Orchestrator
 *
 * Generates strongly typed SDKs for TypeScript and Go from the authoritative OpenAPI specification.
 * The OpenAPI spec is automatically enriched with WebSocket message models.
 */
/* eslint-disable security/detect-non-literal-fs-filename -- repo-controlled generator paths */

import { execa } from 'execa';
import {
  GoFileGenerator,
  JsonSchemaInputProcessor,
  TypeScriptFileGenerator,
} from '@asyncapi/modelina';
import { Parser } from '@asyncapi/parser';
import { readFile, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const OPENAPI_SPEC = join(ROOT_DIR, 'docs/api/openapi.json');
const ASYNCAPI_SPEC = join(ROOT_DIR, 'docs/api/asyncapi.yaml');

const SDK_GO_DIR = join(ROOT_DIR, 'sdk/go');
const SDK_TS_DIR = join(ROOT_DIR, 'sdk/ts');
const SDK_GO_WS_DIR = join(SDK_GO_DIR, 'ws');
const SDK_TS_WS_DIR = join(SDK_TS_DIR, 'ws');
const GO_MODULE_PATH = 'github.com/phalanxduel/game/sdk/go';
const ASYNCAPI_CLIENT_MESSAGE_NAMES = [
  'CreateMatchMessage',
  'JoinMatchMessage',
  'RejoinMatchMessage',
  'WatchMatchMessage',
  'ActionMessage',
  'AuthenticateMessage',
  'AckClientMessage',
  'PingClientMessage',
  'PongClientMessage',
] as const;
const ASYNCAPI_SERVER_MESSAGE_NAMES = [
  'AckServerMessage',
  'PingServerMessage',
  'PongServerMessage',
  'MatchCreatedMessage',
  'GameStateMessage',
  'GameViewModelMessage',
  'ActionErrorMessage',
  'MatchErrorMessage',
  'MatchJoinedMessage',
  'SpectatorJoinedMessage',
  'OpponentDisconnectedMessage',
  'OpponentReconnectedMessage',
  'AuthenticatedMessage',
  'AuthErrorMessage',
] as const;

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

interface AsyncApiMessageModel {
  schema: Record<string, unknown>;
  title: string;
}

function normalizeSchemaForModelina(
  schema: Record<string, unknown>,
  title: string,
): AsyncApiMessageModel {
  return {
    title,
    schema: {
      ...schema,
      $schema: 'http://json-schema.org/draft-07/schema#',
      title,
    },
  };
}

async function extractAsyncApiMessageSchemas(
  messageNames: readonly string[],
): Promise<AsyncApiMessageModel[]> {
  const parser = new Parser();
  const asyncApiText = await readFile(ASYNCAPI_SPEC, 'utf8');
  const { document, diagnostics } = await parser.parse(asyncApiText, { source: ASYNCAPI_SPEC });

  if (!document) {
    throw new Error(
      `Failed to parse AsyncAPI document: ${diagnostics.map((d) => d.message).join('; ')}`,
    );
  }

  const messageMap = new Map(
    document
      .components()
      .messages()
      .all()
      .map((message) => [message.name(), message]),
  );

  return messageNames.map((messageName) => {
    const message = messageMap.get(messageName);
    if (!message) {
      throw new Error(`AsyncAPI message ${messageName} not found in ${ASYNCAPI_SPEC}`);
    }

    const payload = message.payload()?.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error(`AsyncAPI message ${messageName} is missing an object payload schema`);
    }

    return normalizeSchemaForModelina(payload as Record<string, unknown>, messageName);
  });
}

async function generateWsModelSet(
  messageNames: readonly string[],
  tsOutputDir: string,
  goOutputDir: string,
  goPackageName: string,
) {
  const models = await extractAsyncApiMessageSchemas(messageNames);

  const processor = new JsonSchemaInputProcessor();
  const tsGenerator = new TypeScriptFileGenerator({ processors: [processor] });
  const goGenerator = new GoFileGenerator({ processors: [processor] });

  await rm(tsOutputDir, { recursive: true, force: true });
  await rm(goOutputDir, { recursive: true, force: true });
  await mkdir(tsOutputDir, { recursive: true });
  await mkdir(goOutputDir, { recursive: true });

  for (const model of models) {
    console.log(`🧩 Generating WebSocket model: ${model.title}`);
    await tsGenerator.generateToFiles(model.schema, tsOutputDir, {}, true);
    await goGenerator.generateToFiles(
      model.schema,
      goOutputDir,
      { packageName: goPackageName },
      true,
    );
  }
}

async function writeTypeScriptBarrel(outputDir: string) {
  const entries = await readdir(outputDir);
  const exports = entries
    .filter((entry) => entry.endsWith('.ts') && entry !== 'index.ts')
    .sort()
    .map((entry) => `export * from './${entry.replace(/\.ts$/, '')}';`);

  await writeFile(join(outputDir, 'index.ts'), `${exports.join('\n')}\n`, 'utf8');
}

async function writeSdkReadmes() {
  await writeFile(
    join(SDK_TS_DIR, 'README.md'),
    [
      '# TypeScript SDK Artifacts',
      '',
      '- `client/` contains the generated REST client from `docs/api/openapi.json`.',
      '- `ws/client/` contains generated WebSocket request message models from `docs/api/asyncapi.yaml`.',
      '- `ws/server/` contains generated WebSocket response message models from `docs/api/asyncapi.yaml`.',
      '',
      'Regenerate everything with `pnpm sdk:gen`.',
      '',
    ].join('\n'),
    'utf8',
  );

  await writeFile(
    join(SDK_TS_WS_DIR, 'README.md'),
    [
      '# TypeScript WebSocket Models',
      '',
      '- `client/` contains outbound message models.',
      '- `server/` contains inbound message models.',
      '',
      'These files are generated from `docs/api/asyncapi.yaml`.',
      '',
    ].join('\n'),
    'utf8',
  );

  await writeFile(
    join(SDK_GO_WS_DIR, 'README.md'),
    [
      '# Go WebSocket Models',
      '',
      '- `client/` contains outbound message models.',
      '- `server/` contains inbound message models.',
      '',
      'These files are generated from `docs/api/asyncapi.yaml`.',
      '',
    ].join('\n'),
    'utf8',
  );
}

async function walkFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(fullPath);
      }
      return [fullPath];
    }),
  );

  return files.flat();
}

async function replaceInFiles(rootDir: string, searchValue: string, replacementValue: string) {
  const files = await walkFiles(rootDir);
  await Promise.all(
    files.map(async (filePath) => {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) return;

      const contents = await readFile(filePath, 'utf8');
      if (!contents.includes(searchValue)) return;
      await writeFile(filePath, contents.replaceAll(searchValue, replacementValue), 'utf8');
    }),
  );
}

async function postProcessGoSdk() {
  const goModPath = join(SDK_GO_DIR, 'go.mod');
  const readmePath = join(SDK_GO_DIR, 'README.md');
  const placeholderModulePath = 'github.com/GIT_USER_ID/GIT_REPO_ID/phalanx';

  const goModContents = await readFile(goModPath, 'utf8');
  await writeFile(
    goModPath,
    goModContents.replace(`module ${placeholderModulePath}`, `module ${GO_MODULE_PATH}`),
    'utf8',
  );

  await replaceInFiles(SDK_GO_DIR, placeholderModulePath, GO_MODULE_PATH);

  const readmeContents = await readFile(readmePath, 'utf8');
  await writeFile(
    readmePath,
    readmeContents
      .replaceAll('github.com/GIT_USER_ID/GIT_REPO_ID/phalanx', GO_MODULE_PATH)
      .replace(
        '**[AsyncAPI Spec](/docs/asyncapi.yaml)** — WebSocket protocol specification for real-time gameplay.',
        '**[AsyncAPI Spec](https://github.com/phalanxduel/game/blob/main/docs/api/asyncapi.yaml)** — Canonical WebSocket protocol specification for real-time gameplay.',
      ),
    'utf8',
  );
}

async function main() {
  try {
    await mkdir(SDK_GO_DIR, { recursive: true });
    await mkdir(SDK_TS_DIR, { recursive: true });
    await mkdir(SDK_GO_WS_DIR, { recursive: true });
    await mkdir(SDK_TS_WS_DIR, { recursive: true });

    console.log('🔨 Generating prerequisite schemas...');
    await runCommand('pnpm', ['--filter', '@phalanxduel/shared', 'schema:gen']);

    console.log('🚀 Updating OpenAPI specification file...');
    await runCommand('pnpm', ['openapi:gen']);

    await generateSdks();
    await generateWsModelSet(
      ASYNCAPI_CLIENT_MESSAGE_NAMES,
      join(SDK_TS_WS_DIR, 'client'),
      join(SDK_GO_WS_DIR, 'client'),
      'clientws',
    );
    await generateWsModelSet(
      ASYNCAPI_SERVER_MESSAGE_NAMES,
      join(SDK_TS_WS_DIR, 'server'),
      join(SDK_GO_WS_DIR, 'server'),
      'serverws',
    );
    await writeTypeScriptBarrel(join(SDK_TS_WS_DIR, 'client'));
    await writeTypeScriptBarrel(join(SDK_TS_WS_DIR, 'server'));
    await writeSdkReadmes();
    await postProcessGoSdk();

    console.log('📦 Initializing Go module...');
    try {
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
