/**
 * scripts/docs/generate-db-erd.ts
 *
 * Generates Entity-Relationship Diagrams (ERD) and database schema documentation
 * directly from Drizzle ORM schema definitions, inspired by Rails ERD.
 *
 * Outputs:
 *  - docs/database/schema-erd.mmd  (Mermaid ER diagram)
 *  - docs/database/schema-erd.svg  (Rendered SVG via Graphviz / @viz-js/viz)
 *  - docs/database/SCHEMA.md       (Comprehensive schema data dictionary)
 *
 * Usage:
 *  pnpm tsx scripts/docs/generate-db-erd.ts [--check] [--write]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { instance } from '@viz-js/viz';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '../..');
const OUT_DIR = path.join(ROOT_DIR, 'docs/database');

const serverRequire = createRequire(path.join(ROOT_DIR, 'server/package.json'));
const { getTableConfig } = serverRequire('drizzle-orm/pg-core');
const schema = await import(path.join(ROOT_DIR, 'server/src/db/schema.ts'));

interface ParsedColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNotNull: boolean;
  hasDefault: boolean;
  defaultValue?: string;
  isUnique: boolean;
  enumValues?: string[];
  isForeignKey: boolean;
  fkTarget?: string;
}

interface ParsedForeignKey {
  columnNames: string[];
  foreignTableName: string;
  foreignColumnNames: string[];
  onDelete?: string;
  onUpdate?: string;
}

interface ParsedIndex {
  name: string;
  columnNames: string[];
  isUnique: boolean;
}

interface ParsedTable {
  name: string;
  varName: string;
  columns: ParsedColumn[];
  foreignKeys: ParsedForeignKey[];
  indexes: ParsedIndex[];
  primaryKeyColumns: string[];
}

// ponytail: extract clean sql/storage type from Drizzle PgColumn without loading pg driver
function formatColumnType(col: PgColumn): string {
  const cType = col.columnType;
  if (cType === 'PgUUID') return 'uuid';
  if (cType === 'PgText') return 'text';
  if (cType === 'PgInteger') return 'integer';
  if (cType === 'PgTimestamp') return 'timestamp';
  if (cType === 'PgBoolean') return 'boolean';
  if (cType === 'PgJsonb') return 'jsonb';
  if (cType === 'PgReal') return 'real';
  if (cType === 'PgVector') return 'vector';
  return col.dataType || 'unknown';
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

function parseSchema(): ParsedTable[] {
  const tables: ParsedTable[] = [];

  for (const [varName, exportVal] of Object.entries(schema)) {
    try {
      const cfg = getTableConfig(exportVal as PgTable);
      if (!cfg || !cfg.name) continue;

      const fks: ParsedForeignKey[] = [];
      const fkColSet = new Map<string, string>(); // colName -> "targetTable(col)"

      for (const fk of cfg.foreignKeys) {
        const ref = fk.reference();
        const foreignTableName =
          (ref.foreignTable as unknown as { [key: symbol]: string })[Symbol.for('drizzle:Name')] ||
          getTableConfig(ref.foreignTable).name;
        const colNames = ref.columns.map((c) => c.name);
        const fColNames = ref.foreignColumns.map((c) => c.name);

        fks.push({
          columnNames: colNames,
          foreignTableName,
          foreignColumnNames: fColNames,
          onDelete: fk.onDelete,
          onUpdate: fk.onUpdate,
        });

        for (let i = 0; i < colNames.length; i++) {
          fkColSet.set(colNames[i], `${foreignTableName}.${fColNames[i] || 'id'}`);
        }
      }

      // Collect composite primary keys if present
      const compositePks: string[] = [];
      if (cfg.primaryKeys && cfg.primaryKeys.length > 0) {
        for (const pk of cfg.primaryKeys) {
          compositePks.push(...pk.columns.map((c) => c.name));
        }
      }

      const columns: ParsedColumn[] = cfg.columns.map((col: PgColumn) => {
        const isPk = Boolean(col.primary || compositePks.includes(col.name));
        return {
          name: col.name,
          type: formatColumnType(col),
          isPrimaryKey: isPk,
          isNotNull: Boolean(col.notNull),
          hasDefault: Boolean(col.hasDefault),
          defaultValue: col.hasDefault ? formatDefaultValue(col.default) || 'auto' : undefined,
          isUnique: Boolean(col.isUnique),
          enumValues: col.enumValues as string[] | undefined,
          isForeignKey: fkColSet.has(col.name),
          fkTarget: fkColSet.get(col.name),
        };
      });

      const indexes: ParsedIndex[] = cfg.indexes.map((idx) => ({
        name: idx.config.name,
        columnNames: idx.config.columns.map((c: PgColumn) => c.name),
        isUnique: Boolean(idx.config.unique),
      }));

      tables.push({
        name: cfg.name,
        varName,
        columns,
        foreignKeys: fks,
        indexes,
        primaryKeyColumns: compositePks.length
          ? compositePks
          : columns.filter((c) => c.isPrimaryKey).map((c) => c.name),
      });
    } catch {
      // not a table export (e.g. relations helper or type)
    }
  }

  // Sort tables alphabetically for deterministic output
  tables.sort((a, b) => a.name.localeCompare(b.name));
  return tables;
}

function generateMermaid(tables: ParsedTable[]): string {
  const lines: string[] = ['erDiagram'];

  // 1. Relationships
  const relSet = new Set<string>();
  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      const relKey = `${fk.foreignTableName} ||--o{ ${t.name} : "${fk.columnNames.join(', ')}"`;
      if (!relSet.has(relKey)) {
        relSet.add(relKey);
        lines.push(`    ${relKey}`);
      }
    }
  }

  lines.push('');

  // 2. Entities and attributes
  for (const t of tables) {
    lines.push(`    ${t.name} {`);
    for (const c of t.columns) {
      let suffix = '';
      if (c.isPrimaryKey) suffix += ' PK';
      if (c.isForeignKey) suffix += ' FK';
      if (c.isUnique && !c.isPrimaryKey) suffix += ' UK';
      // Mermaid ER attribute: type name extra
      const cleanType = c.type.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`        ${cleanType} ${c.name}${suffix}`);
    }
    lines.push('    }');
    lines.push('');
  }

  return lines.join('\n');
}

function generateGraphvizDot(tables: ParsedTable[]): string {
  const lines: string[] = [
    'digraph ERD {',
    '  graph [rankdir=LR, splines=spline, bgcolor="#0d1117", pad="0.5", nodesep="0.6", ranksep="1.2"];',
    '  node [fontname="Helvetica,Arial,sans-serif", fontsize=10, shape=plaintext];',
    '  edge [fontname="Helvetica,Arial,sans-serif", fontsize=9, color="#58a6ff", fontcolor="#8b949e", penwidth=1.2];',
    '',
  ];

  for (const t of tables) {
    const rows: string[] = [];
    rows.push(
      `    <tr><td bgcolor="#1f6feb" colspan="3"><font color="#ffffff"><b>${t.name}</b></font></td></tr>`,
    );

    for (const c of t.columns) {
      let badge = '';
      if (c.isPrimaryKey) badge = '<font color="#f0883e"><b>PK</b></font>';
      else if (c.isForeignKey) badge = '<font color="#58a6ff">FK</font>';
      else if (c.isUnique) badge = '<font color="#3fb950">UQ</font>';

      const notNull = c.isNotNull ? '<font color="#f85149">*</font>' : '';
      const colName = `<font color="#c9d1d9">${c.name}${notNull}</font>`;
      const colType = `<font color="#8b949e"><i>${c.type}</i></font>`;

      rows.push(
        `    <tr><td align="left">${colName}</td><td align="left">${colType}</td><td align="center">${badge}</td></tr>`,
      );
    }

    lines.push(
      `  "${t.name}" [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="4" bgcolor="#161b22" color="#30363d">`,
    );
    lines.push(rows.join('\n'));
    lines.push('  </table>>];');
    lines.push('');
  }

  // Edges
  for (const t of tables) {
    for (const fk of t.foreignKeys) {
      lines.push(
        `  "${t.name}" -> "${fk.foreignTableName}" [label="${fk.columnNames.join(', ')}", dir=back, arrowtail=crow];`,
      );
    }
  }

  lines.push('}');
  return lines.join('\n');
}

function generateMarkdownDoc(tables: ParsedTable[], mermaidContent: string): string {
  const lines: string[] = [
    '# Database Schema Catalog & ERD',
    '',
    '> **Note**: Automatically generated by `pnpm db:erd` from `server/src/db/schema.ts` (inspired by Rails ERD).',
    '> Do not edit manually. Re-run `pnpm db:erd` when models change.',
    '',
    '## System Summary',
    '',
    `- **Total Tables**: ${tables.length}`,
    `- **Database Engine**: PostgreSQL with Drizzle ORM`,
    `- **Direct Relationships**: ${tables.reduce((acc, t) => acc + t.foreignKeys.length, 0)} foreign key constraints`,
    `- **Standalone ERD**: [schema-erd.svg](./schema-erd.svg) | [schema-erd.mmd](./schema-erd.mmd)`,
    '',
    '## Entity-Relationship Diagram',
    '',
    '```mermaid',
    mermaidContent.trim(),
    '```',
    '',
    '## Table Data Dictionary',
    '',
  ];

  for (const t of tables) {
    lines.push(`### \`${t.name}\` (exported as \`${t.varName}\`)`);
    lines.push('');
    lines.push('| Column | Type | Nullable | Primary Key | Default / Enums | References |');
    lines.push('|---|---|:---:|:---:|---|---|');

    for (const c of t.columns) {
      const nullable = c.isNotNull ? 'No' : 'Yes';
      const pk = c.isPrimaryKey ? '✅' : '-';
      const extra: string[] = [];
      if (c.enumValues && c.enumValues.length > 0) {
        extra.push(`enum(\`${c.enumValues.join('`, `')}\`)`);
      }
      if (c.hasDefault) {
        extra.push(`default: \`${c.defaultValue}\``);
      }
      if (c.isUnique) {
        extra.push('**unique**');
      }
      const extraStr = extra.join(', ') || '-';
      const refStr = c.fkTarget ? `\`${c.fkTarget}\`` : '-';

      lines.push(
        `| \`${c.name}\` | \`${c.type}\` | ${nullable} | ${pk} | ${extraStr} | ${refStr} |`,
      );
    }

    if (t.indexes.length > 0) {
      lines.push('');
      lines.push('**Indexes:**');
      lines.push('');
      for (const idx of t.indexes) {
        const u = idx.isUnique ? ' *(UNIQUE)*' : '';
        lines.push(`- \`${idx.name}\` on (\`${idx.columnNames.join('`, `')}\`)${u}`);
      }
    }

    if (t.foreignKeys.length > 0) {
      lines.push('');
      lines.push('**Foreign Keys:**');
      lines.push('');
      for (const fk of t.foreignKeys) {
        lines.push(
          `- \`${fk.columnNames.join(', ')}\` &rarr; \`${fk.foreignTableName}(${fk.foreignColumnNames.join(', ')})\` (on delete: \`${fk.onDelete || 'no action'}\`)`,
        );
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const isCheck = process.argv.includes('--check');

  const tables = parseSchema();
  const mermaidContent = generateMermaid(tables);
  const dotContent = generateGraphvizDot(tables);
  const markdownContent = generateMarkdownDoc(tables, mermaidContent);

  // ponytail: render dot to svg using existing @viz-js/viz dependency without external graphviz installation
  const viz = await instance();
  const svgContent = viz.renderString(dotContent, { format: 'svg', engine: 'dot' });

  const mmdPath = path.join(OUT_DIR, 'schema-erd.mmd');
  const svgPath = path.join(OUT_DIR, 'schema-erd.svg');
  const mdPath = path.join(OUT_DIR, 'SCHEMA.md');

  if (isCheck) {
    let hasDiff = false;
    const checkFile = (filePath: string, expected: string): void => {
      if (!existsSync(filePath)) {
        console.error(`Missing ERD artifact: ${filePath}`);
        hasDiff = true;
      } else {
        const current = readFileSync(filePath, 'utf8');
        if (current !== expected) {
          console.error(`Out of date ERD artifact: ${filePath}`);
          hasDiff = true;
        }
      }
    };

    checkFile(mmdPath, mermaidContent);
    checkFile(svgPath, svgContent);
    checkFile(mdPath, markdownContent);

    if (hasDiff) {
      console.error(
        '\nDatabase ERD documentation is out of date. Run "pnpm db:erd" to regenerate.',
      );
      process.exit(1);
    }
    console.log('✅ Database ERD documentation artifacts are up to date.');
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(mmdPath, mermaidContent, 'utf8');
  writeFileSync(svgPath, svgContent, 'utf8');
  writeFileSync(mdPath, markdownContent, 'utf8');

  console.log(`✅ Generated ERD artifacts in ${OUT_DIR}:`);
  console.log(`   - ${path.relative(ROOT_DIR, mmdPath)}`);
  console.log(`   - ${path.relative(ROOT_DIR, svgPath)}`);
  console.log(`   - ${path.relative(ROOT_DIR, mdPath)}`);
}

main().catch((err) => {
  console.error('Fatal error generating ERD:', err);
  process.exit(1);
});
