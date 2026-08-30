#!/usr/bin/env tsx

import { readFile } from 'node:fs/promises';
import {
  applyAction,
  createInitialState,
  deriveEventsFromEntry,
  observerForViewer,
  projectGameStateForObserver,
} from '../../engine/src/index.ts';
import { GameplayTrajectorySchema, type GameplayTrajectory } from '../../shared/src/index.ts';
import { computeStateHash } from '../../shared/src/hash.ts';

const arg = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

function fail(message: string): never {
  throw new Error(`Trajectory verification failed: ${message}`);
}

async function main(): Promise<void> {
  const path = arg('--trajectory');
  if (!path || process.argv.includes('--help') || process.argv.includes('-h')) {
    console.error('Usage: pnpm qa:trajectory:verify -- --trajectory <trajectory.json>');
    process.exit(64);
  }

  const trajectory: GameplayTrajectory = GameplayTrajectorySchema.parse(
    JSON.parse(await readFile(path, 'utf8')),
  );
  let state = createInitialState({
    matchId: trajectory.match.matchId,
    players: trajectory.match.players as [
      { id: string; name: string },
      { id: string; name: string },
    ],
    rngSeed: trajectory.match.seed,
    drawTimestamp: trajectory.match.drawTimestamp,
    gameOptions: {
      damageMode: trajectory.match.damageMode,
      startingLifepoints: trajectory.match.startingLifepoints,
      classicDeployment: true,
      quickStart: true,
    },
  });
  const observer = observerForViewer(0);

  const check = (index: number): void => {
    const expected = trajectory.checkpoints[index];
    if (!expected) fail(`missing checkpoint ${index}`);
    const transaction = state.transactionLog?.at(-1);
    const actualEvents = transaction
      ? deriveEventsFromEntry(transaction, state.matchId).map((event) => event.name)
      : [];
    const actualHash = transaction?.stateHashAfter ?? computeStateHash(state);
    const actualObserverHash = computeStateHash(projectGameStateForObserver(state, observer));
    if (actualHash !== expected.stateHash) fail(`state hash drift at checkpoint ${index}`);
    if (actualObserverHash !== expected.observerStateHash)
      fail(`observer projection drift at checkpoint ${index}`);
    if (state.phase !== expected.phase || state.turnNumber !== expected.turnNumber)
      fail(`phase/turn drift at checkpoint ${index}`);
    if (JSON.stringify(actualEvents) !== JSON.stringify(expected.eventTypes))
      fail(`event checkpoint drift at checkpoint ${index}`);
  };

  state = applyAction(
    state,
    { type: 'system:init', timestamp: trajectory.match.drawTimestamp },
    { allowSystemInit: true, hashFn: computeStateHash },
  );
  check(0);

  for (const [index, action] of trajectory.actions.entries()) {
    state = applyAction(state, action, { hashFn: computeStateHash });
    check(index + 1);
  }

  if (state.phase !== 'gameOver') fail(`trajectory did not reach gameOver (phase=${state.phase})`);
  console.log(`Trajectory verified: ${path}`);
  console.log(
    `Actions: ${trajectory.actions.length}; terminal hash: ${trajectory.terminalStateHash}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
