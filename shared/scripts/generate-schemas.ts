import { z } from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SHARED_ROOT = path.resolve(SCRIPT_DIR, '..');
const TYPES_PATH = path.join(SHARED_ROOT, 'src', 'types.ts');
const SCHEMAS_DIR = path.join(SHARED_ROOT, 'schemas');

/**
 * Public event envelopes — the schemas external consumers validate against.
 * Maps Zod export name → kebab-case output filename (without .schema.json).
 *
 * Internal types (Card, BattlefieldCard, PlayerState, etc.) are inlined
 * automatically — no separate files needed.
 */
const PUBLIC_SCHEMAS: Record<string, string> = {
  ServerMessageSchema: 'server-messages',
  ClientMessageSchema: 'client-messages',
  PhalanxTurnResultSchema: 'turn-result',
  GameStateSchema: 'game-state',
  PhalanxEventSchema: 'event',
  MatchEventLogSchema: 'match-event-log',
};

async function main(): Promise<void> {
  const schemas = await import('../src/schema');

  // Collect ALL exports ending with "Schema" that are Zod types (for types.ts)
  const allSchemaEntries: [string, z.ZodTypeAny][] = [];
  for (const [key, value] of Object.entries(schemas)) {
    if (key.endsWith('Schema') && value instanceof z.ZodType) {
      allSchemaEntries.push([key, value]);
    }
  }

  if (allSchemaEntries.length === 0) {
    console.error('No Zod schemas found in shared/src/schema.ts');
    process.exit(1);
  }

  // --- Generate types.ts (all schemas) ---
  const lines: string[] = [
    '// AUTO-GENERATED — DO NOT EDIT',
    '// Source: shared/src/schema.ts',
    '// Regenerate: pnpm schema:gen',
    '',
    "import type { z } from 'zod';",
    'import type {',
    ...allSchemaEntries.map(([name]) => `  ${name},`),
    "} from './schema';",
    '',
    ...allSchemaEntries.map(([name]) => {
      const typeName = name.replace(/Schema$/, '');
      return `export type ${typeName} = z.infer<typeof ${name}>;`;
    }),
    '', // trailing newline
  ];

  fs.writeFileSync(TYPES_PATH, lines.join('\n'));
  console.log(`Generated ${path.relative(process.cwd(), TYPES_PATH)}`);

  // --- Generate public JSON Schema files ---
  fs.mkdirSync(SCHEMAS_DIR, { recursive: true });

  // Remove stale schema files that are no longer in PUBLIC_SCHEMAS
  const expectedFiles = new Set(Object.values(PUBLIC_SCHEMAS).map((f) => `${f}.schema.json`));
  for (const existing of fs.readdirSync(SCHEMAS_DIR)) {
    if (existing.endsWith('.schema.json') && !expectedFiles.has(existing)) {
      fs.unlinkSync(path.join(SCHEMAS_DIR, existing));
      console.log(`Removed stale ${existing}`);
    }
  }

  const schemaMap = new Map(allSchemaEntries);
  let generated = 0;

  for (const [zodName, fileName] of Object.entries(PUBLIC_SCHEMAS)) {
    const zodSchema = schemaMap.get(zodName);
    if (!zodSchema) {
      console.error(`Public schema '${zodName}' not found in shared/src/schema.ts`);
      process.exit(1);
    }

    const jsonSchema = z.toJSONSchema(zodSchema, { target: 'draft-2020-12' });

    const filePath = path.join(SCHEMAS_DIR, `${fileName}.schema.json`);
    fs.writeFileSync(filePath, JSON.stringify(jsonSchema, null, 2) + '\n');
    console.log(`Generated ${path.relative(process.cwd(), filePath)}`);
    generated++;
  }

  console.log(
    `\nSchema generation complete: ${generated} public schemas, ${allSchemaEntries.length} types.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
