#!/usr/bin/env tsx

/** Attach an exported O2 correlation snapshot to an existing gameplay capture. */
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const argv = process.argv.slice(2).filter((arg) => arg !== '--');
const { values } = parseArgs({
  args: argv,
  options: {
    run: { type: 'string' },
    input: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help || !values.run || !values.input) {
  console.log('Usage: pnpm qa:o2:attach -- --run <capture-dir> --input <o2-export.json>');
  if (!values.run || !values.input) process.exit(values.help ? 0 : 64);
}

const runDir = resolve(values.run as string);
const inputPath = resolve(values.input as string);
const payload = JSON.parse(await readFile(inputPath, 'utf8')) as unknown;
const attachment = {
  attachedAt: new Date().toISOString(),
  source: inputPath,
  payload,
};

await writeFile(join(runDir, 'o2-correlation.json'), `${JSON.stringify(attachment, null, 2)}\n`);

const manifestPath = join(runDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
manifest.o2Correlation = {
  file: 'o2-correlation.json',
  attachedAt: attachment.attachedAt,
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Attached O2 correlation: ${join(runDir, 'o2-correlation.json')}`);
