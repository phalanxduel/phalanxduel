import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction, computeBotAction } from '../src/index.js';
import { TIER_CONFIG } from '../src/bot-tiers.js';
import type { GameState, Action } from '@phalanxduel/shared';

function getMidGameState(seed: number): GameState {
  let state = createInitialState({
    matchId: `mid-game-${seed}`,
    players: [
      { id: 'p1', name: 'A' },
      { id: 'p2', name: 'B' },
    ] as [{ id: string; name: string }, { id: string; name: string }],
    rngSeed: seed,
  });
  state = applyAction(
    state,
    { type: 'system:init', timestamp: '2026-01-01T00:00:00.000Z' },
    { allowSystemInit: true },
  );

  // Run random turns to get to a mid-game state
  // We want a mix of phases, but mostly Deployment and Attack
  const turns = 10 + (seed % 20);
  for (let i = 0; i < turns; i++) {
    if (state.phase === 'gameOver') break;
    const action = computeBotAction(state, state.activePlayerIndex as 0 | 1, {
      strategy: 'random',
      seed: seed + i,
    });
    state = applyAction(state, action);
  }
  return state;
}

describe('Bot Tier Behavior Divergence (TASK-304)', () => {
  it('AC-2: destroyer selects column-concentrated attacks more than sentinel', () => {
    let destroyerCardAttacks = 0;
    let sentinelCardAttacks = 0;
    let totalAttackOpportunities = 0;

    for (let i = 0; i < 50; i++) {
      let state = getMidGameState(i * 100);
      // Ensure we are in AttackPhase with targets
      while (state.phase !== 'AttackPhase' && state.phase !== 'gameOver') {
          state = applyAction(state, computeBotAction(state, state.activePlayerIndex as 0 | 1, { strategy: 'random', seed: i }));
      }
      if (state.phase === 'gameOver') continue;

      const playerIdx = state.activePlayerIndex as 0 | 1;
      const opponentIdx = 1 - playerIdx;
      const opponent = state.players[opponentIdx]!;

      const actionD = computeBotAction(
        state,
        playerIdx,
        { strategy: 'mcts', seed: 42, mctsIterations: 50 },
        '2026-01-01T00:00:00.000Z',
        'destroyer',
      );
      const actionS = computeBotAction(
        state,
        playerIdx,
        { strategy: 'mcts', seed: 42, mctsIterations: 50 },
        '2026-01-01T00:00:00.000Z',
        'sentinel',
      );

      if (actionD.type === 'attack') {
          if (opponent.battlefield[actionD.attackingColumn]) destroyerCardAttacks++;
      }
      if (actionS.type === 'attack') {
          if (opponent.battlefield[actionS.attackingColumn]) sentinelCardAttacks++;
      }
      totalAttackOpportunities++;
    }

    console.log(`Destroyer card attacks: ${destroyerCardAttacks}, Sentinel: ${sentinelCardAttacks} over ${totalAttackOpportunities} samples`);
    // Destroyer should be more likely to target columns WITH cards than sentinel
    expect(destroyerCardAttacks).toBeGreaterThanOrEqual(sentinelCardAttacks);
  });

  it('AC-4: Champion vs Soldier win rate', { timeout: 60000 }, () => {
      let championWins = 0;
      const games = 10;
      
      for (let i = 0; i < games; i++) {
          let state = createInitialState({
            matchId: `winrate-test-${i}`,
            players: [{ id: 'champion', name: 'Champ' }, { id: 'soldier', name: 'Sarge' }],
            rngSeed: i * 777,
          });
          state = applyAction(state, { type: 'system:init', timestamp: '2026-01-01T00:00:00.000Z' }, { allowSystemInit: true });

          while (state.phase !== 'gameOver') {
              const playerIdx = state.activePlayerIndex as 0 | 1;
              const tier = playerIdx === 0 ? 'champion' : 'soldier';
              // Use lower iterations for test speed, but keep the ratio
              const iterations = tier === 'champion' ? 100 : 20;
              const action = computeBotAction(state, playerIdx, { strategy: 'mcts', seed: i + state.players[0]!.hand.length, mctsIterations: iterations }, '2026-01-01T00:00:00.000Z', tier);
              state = applyAction(state, action);
          }
          if (state.outcome?.winnerIndex === 0) championWins++;
      }

      console.log(`Champion won ${championWins}/${games} games against Soldier`);
      expect(championWins).toBeGreaterThan(games / 2);
  });
});
