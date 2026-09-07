/**
 * scripts/docs/annotate-models.ts
 *
 * Annotates Drizzle ORM schema models with table schema, column types, constraints,
 * indexes, and foreign keys directly in code — inspired by Rails AnnotateRB / annotate_models.
 *
 * Usage:
 *  pnpm tsx scripts/docs/annotate-models.ts [--write] [--check] [--print]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ponytail: local structural types to avoid unlisted dependency warnings in root workspace
interface PgColumn {
  name: string;
  columnType: string;
  dataType?: string;
  primary?: boolean;
  notNull?: boolean;
  hasDefault?: boolean;
  default?: unknown;
  isUnique?: boolean;
  enumValues?: string[];
}

type PgTable = any;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '../..');
const SCHEMA_FILE = path.join(ROOT_DIR, 'server/src/db/schema.ts');

const serverRequire = createRequire(path.join(ROOT_DIR, 'server/package.json'));
const { getTableConfig } = serverRequire('drizzle-orm/pg-core');
const schema = await import(SCHEMA_FILE);

// ponytail: column type formatting matching PostgreSQL standard types
function formatColumnType(col: PgColumn): string {
  const cType = col.columnType;
  if (cType === 'PgUUID') return ':uuid';
  if (cType === 'PgText') return ':text';
  if (cType === 'PgInteger') return ':integer';
  if (cType === 'PgTimestamp') return ':timestamp';
  if (cType === 'PgBoolean') return ':boolean';
  if (cType === 'PgJsonb') return ':jsonb';
  if (cType === 'PgReal') return ':real';
  if (cType === 'PgVector') return ':vector';
  return `:${col.dataType || 'unknown'}`;
}

function formatDefaultValue(val: unknown): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  if (typeof val === 'object' && val !== null) {
    if ('queryChunks' in val) {
      const chunks = (val as { queryChunks: Array<{ value?: unknown }> }).queryChunks;
      return chunks
        .map((c) => (Array.isArray(c.value) ? c.value.join('') : String(c.value ?? '')))
        .join('');
    }
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

interface TableMetadata {
  name: string;
  varName: string;
  annotation: string;
}

function buildTableAnnotation(varName: string, tableObj: PgTable): TableMetadata | null {
  try {
    const cfg = getTableConfig(tableObj);
    if (!cfg || !cfg.name) return null;

    const maxColLen = Math.max(...cfg.columns.map((c: PgColumn) => c.name.length), 10);
    const maxTypeLen = Math.max(...cfg.columns.map((c: PgColumn) => formatColumnType(c).length), 8);

    const lines: string[] = [];
    lines.push('// == Schema Information ==');
    lines.push(`// Table name: ${cfg.name}`);
    lines.push('//');

    // Composite primary keys
    const compositePks: string[] = [];
    if (cfg.primaryKeys && cfg.primaryKeys.length > 0) {
      for (const pk of cfg.primaryKeys) {
        compositePks.push(...pk.columns.map((c: PgColumn) => c.name));
      }
    }

    // Foreign keys map
    const fkColMap = new Map<string, string>();
    for (const fk of cfg.foreignKeys) {
      const ref = fk.reference();
      const fTable =
        (ref.foreignTable as unknown as { [key: symbol]: string })[Symbol.for('drizzle:Name')] ||
        getTableConfig(ref.foreignTable).name;
      const cols = ref.columns.map((c: PgColumn) => c.name);
      const fCols = ref.foreignColumns.map((c: PgColumn) => c.name);
      for (let i = 0; i < cols.length; i++) {
        fkColMap.set(cols[i], `${fTable}(${fCols[i] || 'id'})`);
      }
    }

    for (const col of cfg.columns as PgColumn[]) {
      const padName = col.name.padEnd(maxColLen, ' ');

      const flags: string[] = [];
      const isPk = Boolean(col.primary || compositePks.includes(col.name));
      if (isPk) flags.push('primary key');
      if (col.notNull) flags.push('not null');
      if (col.hasDefault) flags.push(`default: ${formatDefaultValue(col.default) || 'auto'}`);
      if (col.isUnique && !isPk) flags.push('unique');
      if (col.enumValues && col.enumValues.length > 0) {
        flags.push(`enum: [${(col.enumValues as string[]).map((e) => `'${e}'`).join(', ')}]`);
      }
      if (fkColMap.has(col.name)) {
        flags.push(`references: ${fkColMap.get(col.name)}`);
      }

      const padType =
        flags.length > 0 ? formatColumnType(col).padEnd(maxTypeLen, ' ') : formatColumnType(col);
      const flagStr = flags.length > 0 ? `  ${flags.join(', ')}` : '';
      lines.push(`//  ${padName}  ${padType}${flagStr}`);
    }

    if (cfg.indexes.length > 0) {
      lines.push('//');
      lines.push('// Indexes:');
      for (const idx of cfg.indexes) {
        const u = idx.config.unique ? ' UNIQUE' : '';
        const cols = idx.config.columns.map((c: PgColumn) => c.name).join(', ');
        lines.push(`//  ${idx.config.name} (${cols})${u}`);
      }
    }

    if (cfg.foreignKeys.length > 0) {
      lines.push('//');
      lines.push('// Foreign Keys:');
      for (const fk of cfg.foreignKeys) {
        const ref = fk.reference();
        const fTable =
          (ref.foreignTable as unknown as { [key: symbol]: string })[Symbol.for('drizzle:Name')] ||
          getTableConfig(ref.foreignTable).name;
        const cols = ref.columns.map((c: PgColumn) => c.name).join(', ');
        const fCols = ref.foreignColumns.map((c: PgColumn) => c.name).join(', ');
        lines.push(`//  ${cols} -> ${fTable}(${fCols})`);
      }
    }

    return {
      name: cfg.name,
      varName,
      annotation: lines.join('\n'),
    };
  } catch {
    return null;
  }
}

function processSchemaFile(): {
  content: string;
  updatedContent: string;
  hasChanges: boolean;
  annotations: TableMetadata[];
} {
  const content = readFileSync(SCHEMA_FILE, 'utf8');
  const annotations: TableMetadata[] = [];
  const annotationMap = new Map<string, string>();

  for (const [varName, exportVal] of Object.entries(schema)) {
    const meta = buildTableAnnotation(varName, exportVal as PgTable);
    if (meta) {
      annotations.push(meta);
      annotationMap.set(meta.varName, meta.annotation);
    }
  }

  // ponytail: robust line-by-line scanner to replace or insert schema blocks without regex corruption
  const lines = content.split('\n');
  const outputLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    // Detect and strip existing Schema Information comment block (either /** ... */ or // ...)
    if (lines[i]?.trim() === '/**' && lines[i + 1]?.trim() === '* == Schema Information ==') {
      while (i < lines.length && lines[i]?.trim() !== '*/') {
        i++;
      }
      i++; // skip '*/'
      if (i < lines.length && lines[i]?.trim() === '') {
        i++; // skip empty line if present
      }
    } else if (lines[i]?.trim() === '// == Schema Information ==') {
      while (i < lines.length && lines[i]?.startsWith('//')) {
        i++;
      }
      if (i < lines.length && lines[i]?.trim() === '') {
        i++;
      }
    }

    if (i >= lines.length) break;

    const line = lines[i];
    const match = line.match(/^export const ([a-zA-Z0-9_]+) = pgTable\(/);
    if (match) {
      const varName = match[1];
      const annotation = annotationMap.get(varName);
      if (annotation) {
        outputLines.push(annotation);
      }
    }

    outputLines.push(line);
    i++;
  }

  const updatedContent = outputLines.join('\n');
  const hasChanges = content !== updatedContent;
  return { content, updatedContent, hasChanges, annotations };
}

function main(): void {
  const isPrint = process.argv.includes('--print');
  const isCheck = process.argv.includes('--check');
  const isWrite = process.argv.includes('--write') || (!isPrint && !isCheck);

  const { content, updatedContent, hasChanges, annotations } = processSchemaFile();

  if (isPrint) {
    for (const a of annotations) {
      console.log(`\n// Table: ${a.name} (${a.varName})`);
      console.log(a.annotation);
    }
    return;
  }

  if (isCheck) {
    if (hasChanges) {
      console.error(
        '❌ Schema annotations in server/src/db/schema.ts are missing or out of date.\n' +
          'Run "pnpm db:annotate" to update model annotations.',
      );
      process.exit(1);
    }
    console.log('✅ Schema annotations in server/src/db/schema.ts are up to date.');
    return;
  }

  if (isWrite) {
    if (!hasChanges) {
      console.log('✅ Schema annotations in server/src/db/schema.ts are already up to date.');
      return;
    }
    writeFileSync(SCHEMA_FILE, updatedContent, 'utf8');
    console.log(
      `✅ Annotated ${annotations.length} models in server/src/db/schema.ts (AnnotateRB pattern).`,
    );
  }
}

main();
