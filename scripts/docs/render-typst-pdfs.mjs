#!/usr/bin/env node
// Compile all Typst print documents in docs/print/*.typ to output/pdf/phalanx-duel-*.pdf.
// Usage: node scripts/docs/render-typst-pdfs.mjs
import { execFile } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC_DIR = path.join(ROOT_DIR, 'docs/print');
const OUT_DIR = path.join(ROOT_DIR, 'output/pdf');

async function main() {
  const entries = (await readdir(SRC_DIR)).filter((f) => f.endsWith('.typ')).sort();
  if (entries.length === 0) {
    console.log('No .typ files found in docs/print.');
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });

  for (const file of entries) {
    const src = path.join(SRC_DIR, file);
    const stem = file.replace(/\.typ$/, '');
    const outName = stem.startsWith('phalanx-duel-') ? `${stem}.pdf` : `phalanx-duel-${stem}.pdf`;
    const out = path.join(OUT_DIR, outName);
    await execFileAsync('typst', ['compile', '--root', ROOT_DIR, src, out], { cwd: ROOT_DIR });
    console.log(`Generated: ${path.relative(ROOT_DIR, out)}`);
  }
}

main().catch((err) => {
  if (err && err.code === 'ENOENT') {
    console.error(
      'Error: `typst` CLI not found on PATH. Install via `brew install typst` (see Brewfile).',
    );
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
