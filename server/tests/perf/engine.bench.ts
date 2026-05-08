import { bench, describe } from 'vitest';
import { createInitialState, applyAction, getValidActions } from '@phalanxduel/engine';

describe('Engine Performance', () => {
  const config = {
    matchId: 'perf-match',
    players: [
      { id: 'p0', name: 'Player 0' },
      { id: 'p1', name: 'Player 1' },
    ],
    rngSeed: 12345,
  };

  let state = createInitialState(config);
  state = applyAction(state, { type: 'system:init', timestamp: new Date().toISOString() }, { allowSystemInit: true });

  bench('applyAction: deploy', () => {
    // Note: This is slightly cheating because it's the same state, 
    // but we want to measure the pure function performance.
    const actions = getValidActions(state, state.activePlayerIndex);
    const deployAction = actions.find(a => a.type === 'deploy');
    if (deployAction) {
      applyAction(state, deployAction);
    }
  });

  bench('getValidActions', () => {
    getValidActions(state, state.activePlayerIndex);
  });
});
