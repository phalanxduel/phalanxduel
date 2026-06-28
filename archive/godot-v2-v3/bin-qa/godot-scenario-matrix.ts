#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { createInitialState, applyAction } from '../../engine/src/index.ts';
import { computeStateHash } from '../../shared/src/hash.ts';
import { generateScenario } from './scenario.ts';

async function runCommand(
  cmd: string,
  args: string[],
  env: Record<string, string> = {},
): Promise<void> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, ...env },
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`Command ${cmd} ${args.join(' ')} failed with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  const seed = 2000;
  const scenario = generateScenario(seed, 'classic', 20, 'bot-heuristic', 'bot-heuristic');

  // Build replay frames
  const applyOptions = { allowSystemInit: true, hashFn: computeStateHash };
  let state = createInitialState({
    matchId: `scenario-${seed}`,
    players: [
      { id: 'bot-p1', name: 'Bot-heuristic' },
      { id: 'bot-p2', name: 'Bot-heuristic' },
    ],
    rngSeed: seed,
    gameOptions: {
      damageMode: 'classic',
      startingLifepoints: 20,
      classicDeployment: true,
      quickStart: true,
    },
  });

  const frames = [];
  state = applyAction(
    state,
    { type: 'system:init', timestamp: new Date().toISOString() },
    applyOptions,
  );
  frames.push(state);

  for (const action of scenario.actions) {
    state = applyAction(state, action, applyOptions);
    frames.push(state);
  }

  const outDir = join(resolve('artifacts/godot-matrix'), `run-${Date.now()}`);
  await mkdir(outDir, { recursive: true });

  const replayPath = join(outDir, 'replay.json');
  await writeFile(replayPath, JSON.stringify(frames, null, 2));

  console.log('=============================================');
  console.log('1. Testing Replay Ingestion Workflow');
  console.log('=============================================');

  const godotPlaythrough = resolve('bin/qa/godot-playthrough.ts');
  const playthroughArgs = [
    '--import',
    'tsx',
    godotPlaythrough,
    '--',
    '--replay-speed',
    '10',
    '--input-replay',
    replayPath,
    '--headless',
    '--out-dir',
    outDir,
  ];

  await runCommand('node', playthroughArgs);
  console.log('✅ Replay Ingestion Passed\n');

  console.log('=============================================');
  console.log('2. Testing Spectator Connection Workflow');
  console.log('=============================================');

  const server = createServer();
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'watchMatch') {
          // Send all frames as gameViewModel
          for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];
            const message = {
              type: 'gameViewModel',
              matchId: frame.matchId,
              spectatorCount: 1,
              viewModel: {
                state: frame,
                validActions: [],
                viewerIndex: null,
              },
            };
            ws.send(JSON.stringify(message));
          }
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    });
  });

  await new Promise<void>((res) => server.listen(0, '127.0.0.1', () => res()));
  const address = server.address() as { port: number };
  const wsUrl = `ws://127.0.0.1:${address.port}/ws`;

  console.log(`Mock server listening on ${wsUrl}`);

  const spectatorArgs = [
    '--import',
    'tsx',
    godotPlaythrough,
    '--',
    '--watch-url',
    wsUrl,
    '--match-id',
    `scenario-${seed}`,
    '--headless',
    '--out-dir',
    outDir,
  ];

  try {
    await runCommand('node', spectatorArgs);
    console.log('✅ Spectator Connection Passed\n');
  } finally {
    server.close();
    wss.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
