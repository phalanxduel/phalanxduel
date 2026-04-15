import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stdout } from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { instance } from '@viz-js/viz';

const execFileAsync = promisify(execFile);

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '../..');
const OUT_FILE = path.join(ROOT_DIR, 'docs/system/dependency-graph.svg');

const { stdout: dotSource } = await execFileAsync(
  path.join(ROOT_DIR, 'node_modules/.bin/depcruise'),
  [
    '--config',
    '.dependency-cruiser.json',
    '--include-only',
    '^(client|server|engine|shared)/src',
    '--output-type',
    'dot',
    '.',
  ],
  {
    cwd: ROOT_DIR,
    maxBuffer: 16 * 1024 * 1024,
  },
);

const viz = await instance();
const svg = viz.renderString(dotSource, { format: 'svg', engine: 'dot' });

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, svg, 'utf8');

stdout.write(`Generated: ${OUT_FILE}\n`);
