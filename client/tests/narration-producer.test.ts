import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NarrationBus, type NarrationEntry } from '../src/narration-bus';
import { NarrationProducer } from '../src/narration-producer';
import type {
  PhalanxTurnResult,
  GameState,
  TransactionLogEntry,
  Card,
  CombatLogEntry,
  CombatLogStep,
  Action,
} from '@phalanxduel/shared';

// ── Helpers ──────────────────────────────────────

const FACE_TO_SHORT: Record<string, string> = {
  ace: 'A',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: 'T',
  jack: 'J',
  queen: 'Q',
  king: 'K',
};
const SUIT_TO_SHORT: Record<string, string> = {
  spades: 'S',
  hearts: 'H',
  diamonds: 'D',
  clubs: 'C',
};

function makeCard(face: string, suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'): Card {
  const lowerFace = face.toLowerCase();
  const type =
    lowerFace === 'ace'
      ? 'ace'
      : ['jack', 'queen', 'king'].includes(lowerFace)
        ? (lowerFace as 'jack' | 'queen' | 'king')
        : 'number';
  const shortCode = `${SUIT_TO_SHORT[suit]}${FACE_TO_SHORT[lowerFace] ?? face}`;
  const id = `2026-01-01T00:00:00.000Z::test-match::test-player::1::${shortCode}::0`;
  return { id, suit, face, value: 10, type };
}

function makePlayer(name: string) {
  return {
    player: { id: crypto.randomUUID(), name },
    hand: [],
    drawpile: [],
    battlefield: Array.from({ length: 12 }, () => null),
    discardPile: [],
    lifepoints: 30,
    deckSeed: 1,
  };
}

function makeGameState(
  overrides: Partial<GameState> = {},
  transactionLog: TransactionLogEntry[] = [],
): GameState {
  return {
    matchId: crypto.randomUUID(),
    specVersion: '1.0',
    params: { gridRows: 2, gridCols: 6, startingLifepoints: 30, startingHandSize: 5 },
    players: [makePlayer('Mike'), makePlayer('Bot')],
    activePlayerIndex: 0,
    phase: 'DeploymentPhase',
    turnNumber: 1,
    transactionLog,
    ...overrides,
  } as GameState;
}

function makeAction(
  type: string,
  playerIndex: number,
  extra: Record<string, unknown> = {},
): Action {
  return {
    type,
    playerIndex,
    timestamp: new Date().toISOString(),
    ...extra,
  } as Action;
}

function makeTxEntry(
  sequenceNumber: number,
  action: Action,
  details: TransactionLogEntry['details'],
): TransactionLogEntry {
  return {
    sequenceNumber,
    action,
    stateHashBefore: 'hash-before',
    stateHashAfter: 'hash-after',
    timestamp: new Date().toISOString(),
    details,
  };
}

function makeTurnResult(
  preState: GameState,
  postState: GameState,
  action: Action,
): PhalanxTurnResult {
  return {
    matchId: postState.matchId,
    playerId: crypto.randomUUID(),
    preState,
    postState,
    action,
  };
}

// ── Tests ────────────────────────────────────────

describe('NarrationProducer', () => {
  let bus: NarrationBus;
  let producer: NarrationProducer;
  let enqueueSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    bus = new NarrationBus();
    producer = new NarrationProducer(bus);
    enqueueSpy = vi.spyOn(bus, 'enqueue');
  });

  it('skips first call (seeds log count, no replay)', () => {
    const txEntry = makeTxEntry(
      0,
      makeAction('deploy', 0, { cardId: '2026-01-01T00:00:00.000Z::m::p::1::HK::0', column: 0 }),
      {
        type: 'deploy',
        gridIndex: 0,
        phaseAfter: 'DeploymentPhase',
      },
    );
    const state = makeGameState({}, [txEntry]);
    const result = makeTurnResult(makeGameState(), state, txEntry.action);

    producer.onTurnResult(result);

    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('generates deploy event from transaction log entry', () => {
    // First call: seed
    const preState = makeGameState({}, []);
    producer.onTurnResult(makeTurnResult(preState, preState, makeAction('pass', 0)));

    // Second call: deploy
    const cardId = '2026-01-01T00:00:00.000Z::m::p::1::SA::0';
    const deployAction = makeAction('deploy', 0, { cardId, column: 0 });
    const txEntry = makeTxEntry(0, deployAction, {
      type: 'deploy',
      gridIndex: 0,
      phaseAfter: 'DeploymentPhase',
    });
    const postState = makeGameState({}, [txEntry]);

    producer.onTurnResult(makeTurnResult(preState, postState, deployAction));

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    const entries: NarrationEntry[] = enqueueSpy.mock.calls[0][0];
    expect(entries).toContainEqual(
      expect.objectContaining({
        event: expect.objectContaining({
          type: 'deploy',
          player: 'Mike',
          card: 'A\u2660',
          suit: 'spades',
          cardType: 'ace',
          column: 0,
          row: 0,
        }),
        delayMs: 600,
      }),
    );
  });

  it('suppresses pass events in all phases', () => {
    // Seed
    const preState = makeGameState({ phase: 'AttackPhase' }, []);
    producer.onTurnResult(makeTurnResult(preState, preState, makeAction('pass', 0)));

    // Pass action
    const passAction = makeAction('pass', 0);
    const txEntry = makeTxEntry(0, passAction, { type: 'pass' });
    const postState = makeGameState({ phase: 'AttackPhase' }, [txEntry]);

    producer.onTurnResult(makeTurnResult(preState, postState, passAction));

    // Pass events are suppressed — internal mechanic, not a player action
    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('generates attack sequence with destroy and LP damage', () => {
    // Seed
    const preState = makeGameState({}, []);
    producer.onTurnResult(makeTurnResult(preState, preState, makeAction('pass', 0)));

    const targetCard = makeCard('Two', 'spades');
    const steps: CombatLogStep[] = [
      { target: 'frontCard', card: targetCard, damage: 11, destroyed: true },
      { target: 'playerLp', damage: 3 },
    ];
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard: makeCard('King', 'hearts'),
      targetColumn: 2,
      baseDamage: 11,
      totalLpDamage: 3,
      steps,
    };
    const attackAction = makeAction('attack', 0, { attackingColumn: 0, defendingColumn: 2 });
    const txEntry = makeTxEntry(0, attackAction, {
      type: 'attack',
      combat,
      reinforcementTriggered: false,
      victoryTriggered: false,
    });
    const postState = makeGameState({}, [txEntry]);

    producer.onTurnResult(makeTurnResult(preState, postState, attackAction));

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    const entries: NarrationEntry[] = enqueueSpy.mock.calls[0][0];

    // Attack hit
    expect(entries[0]).toEqual({
      event: {
        type: 'attack',
        attacker: 'King\u2665',
        target: 'Two\u2660',
        damage: 11,
        suit: 'hearts',
        cardType: 'face',
      },
      delayMs: 800,
    });
    // Destroyed
    expect(entries[1]).toEqual({
      event: { type: 'destroyed', card: 'Two\u2660', suit: 'spades', cardType: 'number' },
      delayMs: 400,
    });
    // LP damage
    expect(entries[2]).toEqual({
      event: { type: 'lp-damage', player: 'Bot', damage: 3, suit: 'hearts' },
      delayMs: 800,
    });
  });

  it('suppresses zero-damage steps with no bonus', () => {
    // Seed
    const preState = makeGameState({}, []);
    producer.onTurnResult(makeTurnResult(preState, preState, makeAction('pass', 0)));

    const steps: CombatLogStep[] = [
      { target: 'frontCard', card: makeCard('Ace', 'diamonds'), damage: 0 },
    ];
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard: makeCard('Two', 'clubs'),
      targetColumn: 0,
      baseDamage: 2,
      totalLpDamage: 0,
      steps,
    };
    const attackAction = makeAction('attack', 0, { attackingColumn: 1, defendingColumn: 0 });
    const txEntry = makeTxEntry(0, attackAction, {
      type: 'attack',
      combat,
      reinforcementTriggered: false,
      victoryTriggered: false,
    });
    const postState = makeGameState({}, [txEntry]);

    producer.onTurnResult(makeTurnResult(preState, postState, attackAction));

    // Should either not enqueue or enqueue empty array
    if (enqueueSpy.mock.calls.length > 0) {
      const entries: NarrationEntry[] = enqueueSpy.mock.calls[0][0];
      // No attack or destroyed events for zero damage no bonus
      const attackEvents = entries.filter(
        (e) => e.event.type === 'attack' || e.event.type === 'destroyed',
      );
      expect(attackEvents).toHaveLength(0);
    }
  });

  it('generates bonus callout for diamond defense', () => {
    // Seed
    const preState = makeGameState({}, []);
    producer.onTurnResult(makeTurnResult(preState, preState, makeAction('pass', 0)));

    const targetCard = makeCard('Five', 'diamonds');
    const steps: CombatLogStep[] = [
      {
        target: 'frontCard',
        card: targetCard,
        damage: 0,
        bonuses: ['diamondDoubleDefense'],
      },
    ];
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard: makeCard('Three', 'spades'),
      targetColumn: 3,
      baseDamage: 3,
      totalLpDamage: 0,
      steps,
    };
    const attackAction = makeAction('attack', 0, { attackingColumn: 0, defendingColumn: 3 });
    const txEntry = makeTxEntry(0, attackAction, {
      type: 'attack',
      combat,
      reinforcementTriggered: false,
      victoryTriggered: false,
    });
    const postState = makeGameState({}, [txEntry]);

    producer.onTurnResult(makeTurnResult(preState, postState, attackAction));

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    const entries: NarrationEntry[] = enqueueSpy.mock.calls[0][0];
    const bonusEntry = entries.find((e) => e.event.type === 'bonus');
    expect(bonusEntry).toBeDefined();
    expect(bonusEntry!.event).toEqual({
      type: 'bonus',
      bonus: 'diamondDoubleDefense',
      card: 'Five\u2666',
      message: '...halved by Diamond Defense',
      suit: 'diamonds',
      cardType: 'number',
    });
  });

  it('generates ace invulnerable callout', () => {
    // Seed
    const preState = makeGameState({}, []);
    producer.onTurnResult(makeTurnResult(preState, preState, makeAction('pass', 0)));

    const aceCard = makeCard('Ace', 'diamonds');
    const steps: CombatLogStep[] = [
      {
        target: 'frontCard',
        card: aceCard,
        damage: 0,
        bonuses: ['aceInvulnerable'],
      },
    ];
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard: makeCard('King', 'clubs'),
      targetColumn: 1,
      baseDamage: 11,
      totalLpDamage: 0,
      steps,
    };
    const attackAction = makeAction('attack', 0, { attackingColumn: 0, defendingColumn: 1 });
    const txEntry = makeTxEntry(0, attackAction, {
      type: 'attack',
      combat,
      reinforcementTriggered: false,
      victoryTriggered: false,
    });
    const postState = makeGameState({}, [txEntry]);

    producer.onTurnResult(makeTurnResult(preState, postState, attackAction));

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    const entries: NarrationEntry[] = enqueueSpy.mock.calls[0][0];
    const bonusEntry = entries.find((e) => e.event.type === 'bonus');
    expect(bonusEntry).toBeDefined();
    expect(bonusEntry!.event).toEqual({
      type: 'bonus',
      bonus: 'aceInvulnerable',
      card: 'Ace\u2666',
      message: 'Ace\u2666 is invulnerable',
      suit: 'diamonds',
      cardType: 'ace',
    });
  });

  it('generates phase-change event when phase changes between pre/post state', () => {
    // Seed with DeploymentPhase
    const seedState = makeGameState({ phase: 'DeploymentPhase' }, []);
    producer.onTurnResult(makeTurnResult(seedState, seedState, makeAction('pass', 0)));

    // Phase changes to AttackPhase
    const preState = makeGameState({ phase: 'DeploymentPhase' }, []);
    const postState = makeGameState({ phase: 'AttackPhase' }, []);

    producer.onTurnResult(makeTurnResult(preState, postState, makeAction('pass', 0)));

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    const entries: NarrationEntry[] = enqueueSpy.mock.calls[0][0];
    const phaseEntry = entries.find((e) => e.event.type === 'phase-change');
    expect(phaseEntry).toBeDefined();
    expect(phaseEntry!.event).toEqual({ type: 'phase-change', phase: 'AttackPhase' });
    expect(phaseEntry!.delayMs).toBe(400);
  });
});
