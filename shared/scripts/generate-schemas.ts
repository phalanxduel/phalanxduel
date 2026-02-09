import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SHARED_ROOT = path.resolve(SCRIPT_DIR, '..');
const TYPES_PATH = path.join(SHARED_ROOT, 'src', 'types.ts');
const JSON_SCHEMA_DIR = path.join(SHARED_ROOT, 'json-schema');

async function main(): Promise<void> {
  const schemas = await import('../src/schema');

  // Collect exports ending with "Schema" that are Zod types
  const schemaEntries: Array<[string, z.ZodTypeAny]> = [];
  for (const [key, value] of Object.entries(schemas)) {
    if (key.endsWith('Schema') && value instanceof z.ZodType) {
      schemaEntries.push([key, value]);
    }
  }

  if (schemaEntries.length === 0) {
    console.error('No Zod schemas found in shared/src/schema.ts');
    process.exit(1);
  }

  // --- Generate types.ts ---
  const lines: string[] = [
    '// AUTO-GENERATED — DO NOT EDIT',
    '// Source: shared/src/schema.ts',
    '// Regenerate: pnpm schema:gen',
    '',
    "import type { z } from 'zod';",
    'import type {',
    ...schemaEntries.map(([name]) => `  ${name},`),
    "} from './schema';",
    '',
    ...schemaEntries.map(([name]) => {
      const typeName = name.replace(/Schema$/, '');
      return `export type ${typeName} = z.infer<typeof ${name}>;`;
    }),
    '', // trailing newline
  ];

  fs.writeFileSync(TYPES_PATH, lines.join('\n'));
  console.log(`Generated ${path.relative(process.cwd(), TYPES_PATH)}`);

  // --- Generate JSON Schema files ---
  fs.mkdirSync(JSON_SCHEMA_DIR, { recursive: true });

  for (const [name, schema] of schemaEntries) {
    const typeName = name.replace(/Schema$/, '');
    const jsonSchema = zodToJsonSchema(schema, {
      name: typeName,
      $refStrategy: 'none',
    });
    const filePath = path.join(JSON_SCHEMA_DIR, `${typeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(jsonSchema, null, 2) + '\n');
    console.log(`Generated ${path.relative(process.cwd(), filePath)}`);
  }

  console.log(`\nSchema generation complete: ${schemaEntries.length} schemas processed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
