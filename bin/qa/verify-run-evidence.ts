#!/usr/bin/env tsx
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { canonicalizeLegacyRun } from './run-evidence.ts';

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: { run: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
});
if (values.help || !values.run) {
  console.log('Usage: pnpm qa:evidence:verify -- --run <capture-dir>');
  process.exit(values.help ? 0 : 64);
}

const runDir = resolve(values.run as string);
const manifest = JSON.parse(await readFile(join(runDir, 'manifest.json'), 'utf8'));
let events: unknown[] = [];
try {
  events = (await readFile(join(runDir, 'events.ndjson'), 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
} catch {
  // Engine/API historical captures may not have an event stream.
}
const evidence = canonicalizeLegacyRun(
  manifest,
  events as Array<{ type?: string; at?: string; detail?: string }>,
);
await writeFile(join(runDir, 'run-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Run evidence valid: ${join(runDir, 'run-evidence.json')}`);
