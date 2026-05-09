import { createInitialState, applyAction } from '../engine/src/index.js';
import { isGameOver } from '../shared/src/phase.js';

const config = {
  matchId: 'debug-match',
  players: [
    { id: 'p1', name: 'Human' },
    { id: 'p2', name: 'Bot' },
  ],
  rngSeed: 42,
};
let state = createInitialState(config);
state = applyAction(
  state,
  { type: 'system:init', timestamp: '2026-01-01T00:00:00.000Z' },
  { allowSystemInit: true },
);

state.phase = 'AttackPhase';
state.activePlayerIndex = 1;
state.players[0].lifepoints = 1;
state.players[1].battlefield[0] = {
  card: { id: 'c1', suit: 'clubs', value: 10, name: 'C10' },
  currentHp: 10,
  maxHp: 10,
};

const attackAction = {
  type: 'attack',
  playerIndex: 1,
  attackingColumn: 0,
  defendingColumn: 0,
  timestamp: '1970-01-01T00:00:00.000Z',
};

console.log('State before attack:', state.players[0].lifepoints);
const nextState = applyAction(state, attackAction);
console.log('State after attack:', nextState.players[0].lifepoints);
console.log('Is game over?', isGameOver(nextState));
console.log('Outcome:', nextState.outcome);
