import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function compareLogs(v1LogPath: string, v2LogPath: string) {
  const v1Data = await readFile(v1LogPath, 'utf-8');
  const v2Data = await readFile(v2LogPath, 'utf-8');

  const v1Lines = v1Data.trim().split('\n');
  const v2Lines = v2Data.trim().split('\n');

  let differences = 0;
  const minLength = Math.min(v1Lines.length, v2Lines.length);

  for (let i = 0; i < minLength; i++) {
    if (v1Lines[i] !== v2Lines[i]) {
      console.error(`Difference found at line ${i + 1}:`);
      console.error(`  v1: ${v1Lines[i]}`);
      console.error(`  v2: ${v2Lines[i]}`);
      differences++;
    }
  }

  if (v1Lines.length !== v2Lines.length) {
    console.error(
      `Length mismatch: v1 has ${v1Lines.length} lines, v2 has ${v2Lines.length} lines`,
    );
    differences++;
  }

  if (differences === 0) {
    console.log('Logs are identical.');
  } else {
    console.error(`Found ${differences} differences.`);
  }
}

async function runParityTest(seed: string) {
  console.log(`Running parity test with seed: ${seed}`);

  // 1. Run v1-equivalent (using api-playthrough as the oracle)
  const v1OutputDir = `artifacts/parity-test-v1-${seed}`;
  await spawnAsync('pnpm', ['qa:api:run', '--seed', seed, '--out-dir', v1OutputDir]);

  // 2. Run v2 (Godot)
  const v2OutputDir = `artifacts/parity-test-v2-${seed}`;
  // godot-playthrough.ts doesn't support --seed; we rely on the Godot project's default or hardcoded demo-match logic
  await spawnAsync('rtk', ['pnpm', 'qa:godot:playthrough', '--', '--artifact-dir', v2OutputDir]);

  // 3. Compare logs (assuming artifacts output event logs)
  await compareLogs(join(v1OutputDir, 'event-log.txt'), join(v2OutputDir, 'event-log.txt'));
}

function spawnAsync(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Process ${command} failed with code ${code}`));
    });
  });
}

runParityTest(process.argv[2] || '20260617').catch(console.error);
