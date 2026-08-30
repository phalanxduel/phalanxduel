#!/usr/bin/env tsx

import {
  applyAction,
  computeBotAction,
  createInitialState,
  deriveEventsFromEntry,
  getValidActions,
  observerForViewer,
  projectGameStateForObserver,
} from '../../engine/src/index.ts';
import {
  ActionSchema,
  GameplayTrajectorySchema,
  type Action,
  type GameState,
  type GameplayTrajectory,
} from '../../shared/src/index.ts';
import { computeStateHash } from '../../shared/src/hash.ts';

const TIMESTAMP = '1970-01-01T00:00:00.000Z';
type DeploymentPolicy = 'manual' | 'defensive' | 'aggressive' | 'random';

interface MatrixCase {
  name: string;
  damageMode: 'classic' | 'cumulative';
  policies: [DeploymentPolicy, DeploymentPolicy];
  terminalAction?: 'pass' | 'forfeit';
}

const CASES: MatrixCase[] = [
  { name: 'manual-v-manual-classic', damageMode: 'classic', policies: ['manual', 'manual'] },
  {
    name: 'defensive-v-aggressive-classic',
    damageMode: 'classic',
    policies: ['defensive', 'aggressive'],
  },
  { name: 'random-v-manual-classic', damageMode: 'classic', policies: ['random', 'manual'] },
  {
    name: 'aggressive-v-defensive-cumulative',
    damageMode: 'cumulative',
    policies: ['aggressive', 'defensive'],
  },
  { name: 'manual-v-random-cumulative', damageMode: 'cumulative', policies: ['manual', 'random'] },
  {
    name: 'quick-deploy-forfeit-cumulative',
    damageMode: 'cumulative',
    policies: ['random', 'random'],
    terminalAction: 'forfeit',
  },
  {
    name: 'quick-deploy-pass-classic',
    damageMode: 'classic',
    policies: ['defensive', 'aggressive'],
    terminalAction: 'pass',
  },
];

function checkpoint(state: GameState, actionIndex: number) {
  const transaction = state.transactionLog?.at(-1);
  return {
    actionIndex,
    stateHash: transaction?.stateHashAfter ?? computeStateHash(state),
    observerStateHash: computeStateHash(projectGameStateForObserver(state, observerForViewer(0))),
    phase: state.phase,
    turnNumber: state.turnNumber,
    eventTypes: transaction
      ? deriveEventsFromEntry(transaction, state.matchId).map((event) => event.name)
      : [],
  };
}

function apply(state: GameState, action: Action): GameState {
  return applyAction(state, action, { hashFn: computeStateHash });
}

function deploymentAction(
  state: GameState,
  playerIndex: 0 | 1,
  policy: DeploymentPolicy,
): Action | null {
  if (policy === 'manual') {
    return getValidActions(state, playerIndex).find((action) => action.type === 'deploy') ?? null;
  }
  const valid = getValidActions(state, playerIndex).find(
    (action) => action.type === 'quickDeploy' && action.strategy === policy,
  );
  return valid ?? null;
}

function buildTrajectory(testCase: MatrixCase, index: number): GameplayTrajectory {
  const matchId = `trajectory-matrix-${index}`;
  const players = [
    { id: `${matchId}-p1`, name: 'Matrix P1' },
    { id: `${matchId}-p2`, name: 'Matrix P2' },
  ] as [{ id: string; name: string }, { id: string; name: string }];
  let state = createInitialState({
    matchId,
    players,
    rngSeed: 7000 + index,
    gameOptions: {
      damageMode: testCase.damageMode,
      startingLifepoints: testCase.terminalAction ? 20 : 5,
      classicDeployment: true,
      quickStart: false,
    },
  });
  state = applyAction(
    state,
    { type: 'system:init', timestamp: TIMESTAMP },
    { allowSystemInit: true, hashFn: computeStateHash },
  );

  const actions: Action[] = [];
  const checkpoints = [checkpoint(state, 0)];
  let manualDeployments = 0;
  let quickDeployments = 0;
  for (let guard = 0; state.phase === 'DeploymentPhase' && guard < 40; guard++) {
    const playerIndex = state.activePlayerIndex as 0 | 1;
    const selected = deploymentAction(state, playerIndex, testCase.policies[playerIndex]);
    if (!selected) {
      const fallback = computeBotAction(state, playerIndex, {
        strategy: 'heuristic',
        seed: state.turnNumber + guard + index,
      });
      if (fallback.type !== 'deploy' && fallback.type !== 'quickDeploy') break;
      actions.push(fallback);
      state = apply(state, fallback);
      if (fallback.type === 'deploy') manualDeployments++;
      else quickDeployments++;
    } else {
      actions.push(selected);
      state = apply(state, selected);
      if (selected.type === 'deploy') manualDeployments++;
      else quickDeployments++;
    }
    checkpoints.push(checkpoint(state, actions.length));
  }

  if (testCase.terminalAction && state.phase !== 'gameOver') {
    const playerIndex = state.activePlayerIndex as 0 | 1;
    const terminal: Action =
      testCase.terminalAction === 'forfeit'
        ? { type: 'forfeit', playerIndex, timestamp: TIMESTAMP }
        : { type: 'pass', playerIndex, timestamp: TIMESTAMP };
    state = apply(state, terminal);
    actions.push(terminal);
    checkpoints.push(checkpoint(state, actions.length));
  }

  if (manualDeployments === 0 && testCase.policies.includes('manual')) {
    throw new Error(`${testCase.name}: expected a manual deployment`);
  }
  if (quickDeployments === 0 && testCase.policies.some((policy) => policy !== 'manual')) {
    throw new Error(`${testCase.name}: expected a quick deployment`);
  }
  if (
    testCase.terminalAction &&
    !actions.some((action) => action.type === testCase.terminalAction)
  ) {
    throw new Error(`${testCase.name}: missing ${testCase.terminalAction} terminal action`);
  }

  return GameplayTrajectorySchema.parse({
    kind: 'phalanx-duel.trajectory',
    version: 1,
    match: {
      matchId,
      drawTimestamp: TIMESTAMP,
      seed: 7000 + index,
      damageMode: testCase.damageMode,
      startingLifepoints: testCase.terminalAction ? 20 : 5,
      players,
    },
    strategies: testCase.policies,
    actions: actions.map((action) => ActionSchema.parse(action)),
    checkpoints,
    terminalStateHash: checkpoints.at(-1)!.stateHash,
  });
}

for (const [index, testCase] of CASES.entries()) {
  const trajectory = buildTrajectory(testCase, index);
  console.log(
    `${testCase.name}: ${trajectory.actions.length} actions, ` +
      `${trajectory.actions.filter((action) => action.type === 'deploy').length} deploy, ` +
      `${trajectory.actions.filter((action) => action.type === 'quickDeploy').length} quickDeploy, ` +
      `terminal=${trajectory.checkpoints.at(-1)?.phase}`,
  );
}

console.log(`Trajectory matrix verified: ${CASES.length} deterministic fixtures`);
