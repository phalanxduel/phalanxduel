#!/usr/bin/env node
// Export Marp Markdown decks (docs/talks/phalanx-duel-30-minute-slides.md) to HTML, PDF, and/or PPTX.
// Usage: node scripts/docs/render-marp-slides.mjs [--format html|pdf|pptx|all]
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT_DIR, 'docs/talks/phalanx-duel-30-minute-slides.md');
const OUT_DIR = path.join(ROOT_DIR, 'output/slides');

const args = process.argv.slice(2);
const fmtIdx = args.indexOf('--format');
const format = fmtIdx !== -1 && args[fmtIdx + 1] ? args[fmtIdx + 1] : 'html';
const formats = format === 'all' ? ['html', 'pdf', 'pptx'] : [format];

function runMarp(marpArgs) {
  const res = spawnSync('marp', marpArgs, {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (res.error) {
    if (res.error.code === 'ENOENT') {
      console.error(
        'Error: `marp` CLI not found on PATH. Install via `brew install marp-cli` (see Brewfile).',
      );
      process.exit(1);
    }
    throw res.error;
  }
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const ext of formats) {
    const out = path.join(OUT_DIR, `phalanx-duel-30-minute-slides.${ext}`);
    const marpArgs = ['--allow-local-files', SRC, '-o', out];
    if (ext === 'pdf') marpArgs.unshift('--pdf');
    if (ext === 'pptx') marpArgs.unshift('--pptx');
    runMarp(marpArgs);
    console.log(`Generated: ${path.relative(ROOT_DIR, out)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
