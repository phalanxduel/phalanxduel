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

let cardCounter = 0;

/** Build a card using the same short face codes as the engine deck (A, 2-9, T, J, Q, K). */
function makeCard(face: string, suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'): Card {
  const type: Card['type'] =
    face === 'A'
      ? 'ace'
      : face === 'J'
        ? 'jack'
        : face === 'Q'
          ? 'queen'
          : face === 'K'
            ? 'king'
            : 'number';
  const value =
    face === 'A' ? 1 : face === 'T' ? 10 : ['J', 'Q', 'K'].includes(face) ? 11 : Number(face);
  // Opaque ID — no card info encoded (matches engine format)
  const id = `2026-01-01T00:00:00.000Z::test-match::test-player::1::${cardCounter++}`;
  return { id, suit, face, value, type };
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
    const card = makeCard('K', 'hearts');
    const txEntry = makeTxEntry(0, makeAction('deploy', 0, { cardId: card.id, column: 0 }), {
      type: 'deploy',
      gridIndex: 0,
      phaseAfter: 'DeploymentPhase',
    });
    const state = makeGameState({}, [txEntry]);
    const result = makeTurnResult(makeGameState(), state, txEntry.action);

    producer.onTurnResult(result);

    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('generates deploy event from transaction log entry', () => {
    // First call: seed
    const preState = makeGameState({}, []);
    producer.onTurnResult(makeTurnResult(preState, preState, makeAction('pass', 0)));

    // Second call: deploy — card must be on the battlefield in post-state
    const aceOfSpades = makeCard('A', 'spades');
    const deployAction = makeAction('deploy', 0, { cardId: aceOfSpades.id, column: 0 });
    const txEntry = makeTxEntry(0, deployAction, {
      type: 'deploy',
      gridIndex: 0,
      phaseAfter: 'DeploymentPhase',
    });
    const postState = makeGameState({}, [txEntry]);
    // Place the card on player 0's battlefield at gridIndex 0
    postState.players[0]!.battlefield[0] = {
      card: aceOfSpades,
      position: { row: 0, col: 0 },
      currentHp: aceOfSpades.value,
      faceDown: false,
    };

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

    const targetCard = makeCard('2', 'spades');
    const steps: CombatLogStep[] = [
      { target: 'frontCard', card: targetCard, damage: 11, destroyed: true },
      { target: 'playerLp', damage: 3 },
    ];
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard: makeCard('K', 'hearts'),
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
        attacker: 'K\u2665',
        target: '2\u2660',
        damage: 11,
        suit: 'hearts',
        cardType: 'face',
      },
      delayMs: 800,
    });
    // Destroyed
    expect(entries[1]).toEqual({
      event: { type: 'destroyed', card: '2\u2660', suit: 'spades', cardType: 'number' },
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
      { target: 'frontCard', card: makeCard('A', 'diamonds'), damage: 0 },
    ];
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard: makeCard('2', 'clubs'),
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

    const targetCard = makeCard('5', 'diamonds');
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
      attackerCard: makeCard('3', 'spades'),
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
      card: '5\u2666',
      message: '...absorbed by Diamond Defense',
      suit: 'diamonds',
      cardType: 'number',
    });
  });

  it('generates ace invulnerable callout', () => {
    // Seed
    const preState = makeGameState({}, []);
    producer.onTurnResult(makeTurnResult(preState, preState, makeAction('pass', 0)));

    const aceCard = makeCard('A', 'diamonds');
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
      attackerCard: makeCard('K', 'clubs'),
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
      card: 'A\u2666',
      message: 'A\u2666 is invulnerable',
      suit: 'diamonds',
      cardType: 'ace',
    });
  });

  it('generates narration for heartDeathShield bonus', () => {
    // Seed
    const preState = makeGameState({}, []);
    producer.onTurnResult(makeTurnResult(preState, preState, makeAction('pass', 0)));

    const targetCard = makeCard('3', 'hearts');
    const steps: CombatLogStep[] = [
      {
        target: 'frontCard',
        card: targetCard,
        damage: 0,
        bonuses: ['heartDeathShield'],
      },
    ];
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard: makeCard('5', 'spades'),
      targetColumn: 2,
      baseDamage: 5,
      totalLpDamage: 0,
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
    const bonusEntry = entries.find((e) => e.event.type === 'bonus');
    expect(bonusEntry).toBeDefined();
    expect(bonusEntry!.event).toEqual({
      type: 'bonus',
      bonus: 'heartDeathShield',
      card: '3\u2665',
      message: '3\u2665 survives \u2014 Heart Shield',
      suit: 'hearts',
      cardType: 'number',
    });
  });

  it('generates narration for diamondDeathShield bonus', () => {
    // Seed
    const preState = makeGameState({}, []);
    producer.onTurnResult(makeTurnResult(preState, preState, makeAction('pass', 0)));

    const targetCard = makeCard('4', 'diamonds');
    const steps: CombatLogStep[] = [
      {
        target: 'frontCard',
        card: targetCard,
        damage: 0,
        bonuses: ['diamondDeathShield'],
      },
    ];
    const combat: CombatLogEntry = {
      turnNumber: 1,
      attackerPlayerIndex: 0,
      attackerCard: makeCard('6', 'clubs'),
      targetColumn: 1,
      baseDamage: 6,
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
      bonus: 'diamondDeathShield',
      card: '4\u2666',
      message: '4\u2666 survives \u2014 Diamond Shield',
      suit: 'diamonds',
      cardType: 'number',
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
