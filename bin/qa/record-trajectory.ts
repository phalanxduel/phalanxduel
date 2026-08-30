#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  applyAction,
  createInitialState,
  deriveEventsFromEntry,
  observerForViewer,
  projectGameStateForObserver,
} from '../../engine/src/index.ts';
import {
  GameplayTrajectorySchema,
  type Action,
  type GameplayTrajectory,
} from '../../shared/src/index.ts';
import { computeStateHash } from '../../shared/src/hash.ts';
import { GameScenarioSchema } from './scenario.ts';

const DEFAULT_TIMESTAMP = '1970-01-01T00:00:00.000Z';

function usage(): never {
  console.error(
    'Usage: pnpm qa:trajectory:record -- --scenario <scenario.json> --out <trajectory.json>',
  );
  process.exit(64);
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const scenarioPath = arg('--scenario');
  const outPath = arg('--out');
  if (!scenarioPath || !outPath || process.argv.includes('--help') || process.argv.includes('-h')) {
    usage();
  }

  const scenario = GameScenarioSchema.parse(
    JSON.parse(await readFile(resolve(scenarioPath), 'utf8')),
  );
  const strategyName = (player: string): string =>
    player === 'bot-heuristic' ? 'heuristic' : player === 'bot-mcts' ? 'mcts' : 'random';
  const config = {
    // generateScenario historically derives card IDs from this match ID while
    // using `id` as the scenario fixture name.
    matchId: `scenario-${scenario.seed}`,
    players: [
      { id: 'bot-p1', name: `Bot-${strategyName(scenario.p1)}` },
      { id: 'bot-p2', name: `Bot-${strategyName(scenario.p2)}` },
    ] as [{ id: string; name: string }, { id: string; name: string }],
    rngSeed: scenario.seed,
    drawTimestamp: DEFAULT_TIMESTAMP,
    gameOptions: {
      damageMode: scenario.damageMode,
      startingLifepoints: scenario.startingLifepoints,
      classicDeployment: true,
      quickStart: true,
    },
  };

  let state = createInitialState(config);
  state = applyAction(
    state,
    { type: 'system:init', timestamp: DEFAULT_TIMESTAMP },
    { allowSystemInit: true, hashFn: computeStateHash },
  );

  const observer = observerForViewer(0);
  const checkpoint = (actionIndex: number) => {
    const transaction = state.transactionLog?.at(-1);
    const events = transaction
      ? deriveEventsFromEntry(transaction, state.matchId).map((event) => event.name)
      : [];
    return {
      actionIndex,
      stateHash: transaction?.stateHashAfter ?? computeStateHash(state),
      observerStateHash: computeStateHash(projectGameStateForObserver(state, observer)),
      phase: state.phase,
      turnNumber: state.turnNumber,
      eventTypes: events,
    };
  };

  const checkpoints = [checkpoint(0)];
  for (const [index, action] of scenario.actions.entries()) {
    state = applyAction(state, action as Action, { hashFn: computeStateHash });
    checkpoints.push(checkpoint(index + 1));
  }

  const trajectory: GameplayTrajectory = GameplayTrajectorySchema.parse({
    kind: 'phalanx-duel.trajectory',
    version: 1,
    match: {
      matchId: config.matchId,
      drawTimestamp: DEFAULT_TIMESTAMP,
      seed: scenario.seed,
      damageMode: scenario.damageMode,
      startingLifepoints: scenario.startingLifepoints,
      players: config.players,
    },
    strategies: [
      scenario.p1 === 'bot-random'
        ? 'random'
        : scenario.p1 === 'bot-heuristic'
          ? 'heuristic'
          : 'mcts',
      scenario.p2 === 'bot-random'
        ? 'random'
        : scenario.p2 === 'bot-heuristic'
          ? 'heuristic'
          : 'mcts',
    ],
    actions: scenario.actions,
    checkpoints,
    terminalStateHash: checkpoints.at(-1)!.stateHash,
  });

  const destination = resolve(outPath);
  await writeFile(destination, `${JSON.stringify(trajectory, null, 2)}\n`);
  console.log(`Trajectory recorded: ${destination}`);
  console.log(
    `Actions: ${trajectory.actions.length}; checkpoints: ${trajectory.checkpoints.length}`,
  );
  console.log(`Terminal hash: ${trajectory.terminalStateHash}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
