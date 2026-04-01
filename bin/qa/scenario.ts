import { readFile } from 'node:fs/promises';
import { createInitialState, applyAction, computeBotAction } from '../../engine/src/index.ts';
import { ActionSchema, DamageModeSchema } from '../../shared/src/index.ts';
import type { Action, DamageMode } from '../../shared/src/index.ts';
import { z } from 'zod';

export const ScenarioPlayerTypeSchema = z.enum(['bot-random', 'bot-heuristic']);

export const GameScenarioSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  seed: z.number().int().nonnegative(),
  damageMode: DamageModeSchema,
  startingLifepoints: z.number().int().min(1),
  p1: ScenarioPlayerTypeSchema,
  p2: ScenarioPlayerTypeSchema,
  actions: z.array(ActionSchema),
  finalStateHash: z.string(),
  turnCount: z.number().int().min(0),
});

export type GameScenario = z.infer<typeof GameScenarioSchema>;

export async function loadScenario(path: string): Promise<GameScenario> {
  const raw = await readFile(path, 'utf8');
  return GameScenarioSchema.parse(JSON.parse(raw));
}

export function generateScenario(
  seed: number,
  damageMode: DamageMode,
  startingLifepoints: number,
  p1: 'bot-random' | 'bot-heuristic',
  p2: 'bot-random' | 'bot-heuristic',
  maxTurns = 300,
): GameScenario {
  const p1Strategy = p1 === 'bot-heuristic' ? 'heuristic' : 'random';
  const p2Strategy = p2 === 'bot-heuristic' ? 'heuristic' : 'random';

  const initialState = createInitialState({
    matchId: `scenario-${seed}`,
    players: [
      { id: 'bot-p1', name: `Bot-${p1Strategy}` },
      { id: 'bot-p2', name: `Bot-${p2Strategy}` },
    ],
    rngSeed: seed,
    gameOptions: {
      damageMode,
      startingLifepoints,
      classicDeployment: true,
      quickStart: true,
    },
  });

  let state = applyAction(initialState, {
    type: 'system:init',
    timestamp: new Date().toISOString(),
  });

  const actions: Action[] = [];
  let finalStateHash = '';

  while (state.phase !== 'gameOver' && state.turnNumber <= maxTurns) {
    const activeIdx = state.activePlayerIndex as 0 | 1;
    const strategy = activeIdx === 0 ? p1Strategy : p2Strategy;
    const turnSeed = seed + state.turnNumber + activeIdx;

    // Explicitly grab the bot action based on engine
    const action = computeBotAction(state, activeIdx, {
      strategy,
      seed: turnSeed,
    });

    // Ensure reproducible timestamp for API checks if needed, but not strictly required
    // for just generating the action type/payloads since the WS accepts current timestamps
    action.timestamp = new Date(1700000000000 + actions.length * 1000).toISOString();

    actions.push(action);
    state = applyAction(state, action);
  }

  const lastTx = state.transactionLog?.at(-1);
  if (lastTx?.stateHashAfter) {
    finalStateHash = lastTx.stateHashAfter;
  }

  return {
    version: 1,
    id: `scenario-${seed}-${p1Strategy}-v-${p2Strategy}`,
    seed,
    damageMode,
    startingLifepoints,
    p1,
    p2,
    actions,
    finalStateHash,
    turnCount: state.turnNumber,
  };
}
