import { describe, expect, it } from 'vitest';
import type { CalculationProvenance, GameState, PhalanxEvent } from '@phalanxduel/shared';
import {
  applyAction,
  computeBotAction,
  computeOmniscientResearchBotDecision,
  createInitialState,
  projectCalculationProvenance,
  projectEventsForObserver,
  projectGameStateForObserver,
} from '../src/index.js';

const TS = '2026-07-13T00:00:00.000Z';
const CONFIG = {
  matchId: '00000000-0000-0000-0000-000000000343',
  players: [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Alice' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Bob' },
  ] as [{ id: string; name: string }, { id: string; name: string }],
  rngSeed: 34307,
  drawTimestamp: TS,
};

function initializedState(): GameState {
  return applyAction(
    createInitialState(CONFIG),
    { type: 'system:init', timestamp: TS },
    { allowSystemInit: true },
  );
}

function alterOnlyHiddenKnowledge(state: GameState, viewerIndex: 0 | 1 | null): GameState {
  const players = state.players.map((player, index) => ({
    ...player,
    hand: index === viewerIndex ? player.hand : [...player.hand].reverse(),
    drawpile: [...player.drawpile].reverse(),
    deckSeed: player.deckSeed + 999_999,
  }));
  return {
    ...state,
    players,
    transactionLog: state.transactionLog?.map((entry) => ({
      ...entry,
      stateHashBefore: `different-hidden-before-${entry.sequenceNumber}`,
      stateHashAfter: `different-hidden-after-${entry.sequenceNumber}`,
      phaseTraceDigest: 'different-hidden-trace',
      turnHash: 'different-hidden-turn',
    })),
    liveness: {
      positionOccurrences: [{ signature: 'different-hidden-position', count: 99 }],
      noProgressTurns: 99,
      progressMarker: {
        totalLifepoints: 40,
        totalBattlefieldHp: 0,
        totalDrawpileCards: 80,
        totalDiscardedCards: 0,
      },
    },
  };
}

const PROVENANCE: CalculationProvenance = {
  schemaVersion: '1.0',
  steps: [
    {
      sequence: 0,
      ruleId: 'PD-RULE-017',
      operator: 'assign',
      inputs: [{ name: 'base', value: 5, source: { kind: 'state' } }],
      result: { name: 'damage', value: 5 },
      target: 'attack',
      quantity: 'baseDamage',
      visibility: 'public',
    },
    {
      sequence: 1,
      ruleId: 'PD-RULE-019',
      operator: 'subtract',
      inputs: [
        { name: 'damage', value: 5, source: { kind: 'step', step: 0 } },
        { name: 'privateShield', value: 1, source: { kind: 'state' } },
      ],
      result: { name: 'carryover', value: 4 },
      target: 'frontCard',
      quantity: 'carryover',
      visibility: 'attacker',
    },
    {
      sequence: 2,
      ruleId: 'PD-RULE-026',
      operator: 'multiply',
      inputs: [
        { name: 'carryover', value: 4, source: { kind: 'step', step: 1 } },
        { name: 'multiplier', value: 2, source: { kind: 'constant' } },
      ],
      result: { name: 'appliedDamage', value: 8 },
      target: 'playerLp',
      quantity: 'appliedDamage',
      visibility: 'defender',
    },
  ],
};

describe('observer-relative knowledge projection', () => {
  it.each([
    ['player 0', { role: 'player', playerIndex: 0 } as const, 0 as const],
    ['player 1', { role: 'player', playerIndex: 1 } as const, 1 as const],
    ['competitive bot 0', { role: 'competitive-bot', playerIndex: 0 } as const, 0 as const],
    ['competitive bot 1', { role: 'competitive-bot', playerIndex: 1 } as const, 1 as const],
    ['live spectator', { role: 'spectator' } as const, null],
  ])(
    '%s is noninterfering under changes to hidden zones and internal witnesses',
    (_, observer, index) => {
      const state = initializedState();
      const variant = alterOnlyHiddenKnowledge(state, index);

      expect(projectGameStateForObserver(variant, observer)).toEqual(
        projectGameStateForObserver(state, observer),
      );
    },
  );

  it('hides both draw piles during live play, including from their owners', () => {
    const state = initializedState();
    const projected = projectGameStateForObserver(state, { role: 'player', playerIndex: 0 });

    expect(projected.players[0]!.hand).toEqual(state.players[0]!.hand);
    expect(projected.players[1]!.hand).toEqual([]);
    expect(projected.players[0]!.drawpile).toEqual([]);
    expect(projected.players[1]!.drawpile).toEqual([]);
    expect(projected.players[0]!.deckSeed).toBe(0);
    expect(projected.players[1]!.deckSeed).toBe(0);
    expect(projected.players[0]!.drawpileCount).toBe(state.players[0]!.drawpile.length);
    expect(projected.liveness).toBeUndefined();
  });

  it('redacts live integrity witnesses that would distinguish hidden states', () => {
    const projected = projectGameStateForObserver(initializedState(), { role: 'spectator' });
    const entry = projected.transactionLog?.[0];

    expect(entry?.stateHashBefore).toBe('redacted');
    expect(entry?.stateHashAfter).toBe('redacted');
  });

  it('reveals terminal card zones to completed-match and public-replay observers', () => {
    const live = initializedState();
    const completed = {
      ...live,
      phase: 'gameOver' as const,
      outcome: { winnerIndex: 0, victoryType: 'lifepoints' as const, turnNumber: 0 },
    };

    const spectator = projectGameStateForObserver(completed, { role: 'spectator' });
    const replay = projectGameStateForObserver(live, { role: 'public-replay' });
    expect(spectator.players[0]!.drawpile).toEqual(completed.players[0]!.drawpile);
    expect(replay.players[1]!.hand).toEqual(live.players[1]!.hand);
  });

  it('prefix-projects calculation evidence so closure cannot cross a hidden step', () => {
    const spectator = projectCalculationProvenance(PROVENANCE, { role: 'spectator' }, 0);
    const attacker = projectCalculationProvenance(
      PROVENANCE,
      { role: 'player', playerIndex: 0 },
      0,
    );
    const defender = projectCalculationProvenance(
      PROVENANCE,
      { role: 'player', playerIndex: 1 },
      0,
    );
    const research = projectCalculationProvenance(
      PROVENANCE,
      { role: 'omniscient-research', purpose: 'proof audit' },
      0,
    );

    expect(spectator?.steps).toHaveLength(1);
    expect(attacker?.steps).toHaveLength(2);
    expect(defender?.steps).toHaveLength(1);
    expect(research).toBe(PROVENANCE);
  });

  it('removes hidden calculation suffixes from narration events', () => {
    const event: PhalanxEvent = {
      id: 'observer-proof:seq1:ev0',
      parentId: 'observer-proof:seq1:turn',
      type: 'functional_update',
      name: 'attack.resolved',
      timestamp: TS,
      payload: {
        type: 'attack_resolved',
        attackerPlayerIndex: 0,
        calculationProvenance: PROVENANCE,
      },
      status: 'ok',
    };

    const [projected] = projectEventsForObserver([event], { role: 'spectator' });
    const serialized = JSON.stringify(projected?.payload);
    expect(serialized).not.toContain('privateShield');
    expect(serialized).not.toContain('multiplier');
    expect(
      (projected?.payload.calculationProvenance as CalculationProvenance | undefined)?.steps,
    ).toHaveLength(1);
  });

  it('redacts opponent deployment identity in both action history and integrity witnesses', () => {
    const state = initializedState();
    const playerIndex = state.activePlayerIndex as 0 | 1;
    const card = state.players[playerIndex]!.hand[0]!;
    const deployed = applyAction(state, {
      type: 'deploy',
      playerIndex,
      column: 0,
      cardId: card.id,
      timestamp: TS,
    });
    const observer = projectGameStateForObserver(deployed, {
      role: 'player',
      playerIndex: (1 - playerIndex) as 0 | 1,
    });
    const owner = projectGameStateForObserver(deployed, { role: 'player', playerIndex });

    expect(observer.transactionLog?.at(-1)?.action).toMatchObject({ cardId: 'redacted' });
    expect(JSON.stringify(observer.transactionLog)).not.toContain(card.id);
    expect(owner.transactionLog?.at(-1)?.action).toMatchObject({ cardId: card.id });
  });
});

describe('bot knowledge policies', () => {
  it.each(['random', 'heuristic', 'mcts'] as const)(
    'competitive %s decisions are invariant under opponent-hand and draw-pile changes',
    (strategy) => {
      const state = initializedState();
      const playerIndex = state.activePlayerIndex as 0 | 1;
      const variant = alterOnlyHiddenKnowledge(state, playerIndex);
      const config = { strategy, seed: 71, mctsIterations: 20 };

      expect(computeBotAction(variant, playerIndex, config, TS)).toEqual(
        computeBotAction(state, playerIndex, config, TS),
      );
    },
  );

  it('isolates omniscient research decisions behind explicit unranked metadata', () => {
    const state = initializedState();
    const decision = computeOmniscientResearchBotDecision({
      state,
      playerIndex: state.activePlayerIndex as 0 | 1,
      config: { strategy: 'heuristic', seed: 9 },
      timestamp: TS,
      purpose: 'offline counterfactual study',
    });

    expect(decision.knowledgePolicy).toBe('omniscient-research');
    expect(decision.ratingEligible).toBe(false);
    expect(decision.purpose).toBe('offline counterfactual study');
  });
});
