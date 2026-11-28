#!/usr/bin/env node
// Runs Z3 SMT theorem prover on docs/formal/phalanx_duel_proofs.smt2 and asserts
// that every single theorem returns `unsat` (complete unbounded proof over Z).
// Usage: node scripts/ci/verify-smt-proofs.mjs
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SMT_FILE = path.join(ROOT_DIR, 'docs/formal/phalanx_duel_proofs.smt2');

async function main() {
  const { stdout } = await execFileAsync('z3', [SMT_FILE], { cwd: ROOT_DIR });
  const lines = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let proved = 0;
  let failed = 0;
  for (let i = 0; i < lines.length; i += 2) {
    const label = lines[i] ?? 'Unknown proof';
    const result = lines[i + 1] ?? 'missing';
    if (result === 'unsat') {
      proved += 1;
      console.log(`  ✓ ${label.replace(': expecting unsat', '')} — Q.E.D. (unsat)`);
    } else {
      failed += 1;
      console.error(`  ✗ ${label} — FAILED (got: ${result})`);
    }
  }

  if (proved === 0 || failed > 0) {
    process.exit(1);
  }
  console.log(
    `\nZ3 SMT verification passed: ${proved}/${proved} unbounded mathematical theorems proved over Z.`,
  );
}

main().catch((err) => {
  if (err && err.code === 'ENOENT') {
    console.error(
      'Error: `z3` theorem prover not found on PATH. Install via `brew install z3` (see Brewfile).',
    );
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
