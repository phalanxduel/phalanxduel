#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const rawArgv = process.argv.slice(2);
const argv = rawArgv[0] === '--' ? rawArgv.slice(1) : rawArgv;

const { values } = parseArgs({
  args: argv,
  options: {
    'watch-url': { type: 'string' },
    'match-id': { type: 'string' },
    'replay-speed': { type: 'string', default: '1.5' },
    'godot-bin': { type: 'string' },
    headless: { type: 'boolean', default: false },
    'keep-temp': { type: 'boolean', default: false },
  },
});

function spawnGodot(command: string, args: string[], homeDir: string): Promise<number | null> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, HOME: homeDir },
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolveRun(code);
    });
  });
}

async function main(): Promise<number> {
  const godotBin = values['godot-bin'] ?? process.env.GODOT_BIN ?? 'godot';
  const projectDir = resolve('godot/client');
  const tempHome = await mkdtemp(`${tmpdir()}/phx-godot-home-`);

  const args: string[] = [];
  if (values.headless) {
    args.push('--headless');
  }
  args.push('--path', projectDir);
  if (values['watch-url'] && values['match-id']) {
    args.push(
      '--',
      '--live',
      '--watch-url',
      values['watch-url'],
      '--match-id',
      values['match-id'],
      '--replay-speed',
      values['replay-speed'] ?? '1.5',
    );
  } else {
    if (values['watch-url'] || values['match-id']) {
      throw new Error('--watch-url and --match-id must be passed together');
    }
    args.push('--', '--demo', '--replay-speed', values['replay-speed'] ?? '1.5');
  }

  try {
    return (await spawnGodot(godotBin, args, tempHome)) ?? 1;
  } finally {
    if (!values['keep-temp']) {
      await rm(tempHome, { recursive: true, force: true });
    } else {
      console.log(`Temporary Godot HOME retained: ${tempHome}`);
    }
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
