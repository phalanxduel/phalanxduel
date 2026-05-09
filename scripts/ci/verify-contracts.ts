import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const ASYNCAPI_PATH = path.join(ROOT, 'docs/api/asyncapi.yaml');
const CLIENT_JSON_SCHEMA_PATH = path.join(ROOT, 'shared/schemas/client-messages.schema.json');
const SERVER_JSON_SCHEMA_PATH = path.join(ROOT, 'shared/schemas/server-messages.schema.json');

// Note: JSON schema freshness (generated vs Zod source) is guaranteed by
// `schema:check` which re-runs schema:gen and checks for git diffs.
// This script's job is to validate the JSON schema structure and check
// AsyncAPI documentation coverage.

interface JsonSchemaEntry {
  properties?: {
    type?: { const?: string };
  };
}

interface JsonSchemaFile {
  oneOf?: JsonSchemaEntry[];
  anyOf?: JsonSchemaEntry[];
}

console.log('==> 📜 Verifying WebSocket Contract Consistency...');

const asyncapiContent = fs.readFileSync(ASYNCAPI_PATH, 'utf8');
const clientJsonSchema = JSON.parse(
  fs.readFileSync(CLIENT_JSON_SCHEMA_PATH, 'utf8'),
) as JsonSchemaFile;
const serverJsonSchema = JSON.parse(
  fs.readFileSync(SERVER_JSON_SCHEMA_PATH, 'utf8'),
) as JsonSchemaFile;

// Extract type discriminant values from a generated JSON schema file.
// Each oneOf entry must have properties.type.const = the discriminant string.
// An entry missing this structure signals a malformed schema generation output.
function extractJsonSchemaTypes(schema: JsonSchemaFile, label: string): Set<string> {
  const types = new Set<string>();
  const entries = schema.oneOf ?? schema.anyOf ?? [];
  if (entries.length === 0) {
    console.error(
      `❌ ${label}: JSON schema has no oneOf/anyOf entries — likely a generation failure.`,
    );
    process.exit(1);
  }
  for (const entry of entries) {
    const typeConst = entry?.properties?.type?.const;
    if (typeof typeConst === 'string') {
      types.add(typeConst);
    } else {
      console.warn(`⚠️  ${label}: entry missing properties.type.const — schema may be malformed.`);
    }
  }
  return types;
}

const clientJsonTypes = extractJsonSchemaTypes(clientJsonSchema, 'client-messages');
const serverJsonTypes = extractJsonSchemaTypes(serverJsonSchema, 'server-messages');

console.log(
  `Client message types (${clientJsonTypes.size}): ${[...clientJsonTypes].sort().join(', ')}`,
);
console.log(
  `Server message types (${serverJsonTypes.size}): ${[...serverJsonTypes].sort().join(', ')}`,
);

// --- Advisory: AsyncAPI ↔ generated JSON schema coverage ---
// Warns when a type exists in the JSON schemas but is absent from asyncapi.yaml.
// Advisory-only until asyncapi.yaml is updated to include the queue/forceReload types.
// Promote to hard-fail (failed = true) once the known gaps are resolved.

console.log('Checking JSON schema types against AsyncAPI (advisory)...');
const asyncapiGaps: string[] = [];
for (const name of [...clientJsonTypes, ...serverJsonTypes]) {
  if (!asyncapiContent.includes(name)) {
    asyncapiGaps.push(name);
  }
}
if (asyncapiGaps.length > 0) {
  console.warn(
    `⚠️  ${asyncapiGaps.length} type(s) not referenced in asyncapi.yaml: ${asyncapiGaps.join(', ')}`,
  );
  console.warn('   Update docs/api/asyncapi.yaml to document these types.');
}

console.log(
  `✅ WebSocket contracts valid — ${clientJsonTypes.size} client types, ${serverJsonTypes.size} server types.`,
);
