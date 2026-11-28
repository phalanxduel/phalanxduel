#!/usr/bin/env node
// Compile all single-source D2 diagrams in docs/diagrams/*.d2 to docs/diagrams/svg/*.svg.
// Usage: node scripts/docs/render-d2-diagrams.mjs
import { execFile } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC_DIR = path.join(ROOT_DIR, 'docs/diagrams');
const OUT_DIR = path.join(SRC_DIR, 'svg');

async function main() {
  const entries = (await readdir(SRC_DIR)).filter((f) => f.endsWith('.d2')).sort();
  if (entries.length === 0) {
    console.log('No .d2 files found in docs/diagrams.');
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  for (const file of entries) {
    const src = path.join(SRC_DIR, file);
    const out = path.join(OUT_DIR, file.replace(/\.d2$/, '.svg'));
    await execFileAsync('d2', ['--pad', '24', src, out], { cwd: ROOT_DIR });
    console.log(`Generated: ${path.relative(ROOT_DIR, out)}`);
  }
}

main().catch((err) => {
  if (err && err.code === 'ENOENT') {
    console.error(
      'Error: `d2` CLI not found on PATH. Install via `brew install d2` (see Brewfile).',
    );
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
