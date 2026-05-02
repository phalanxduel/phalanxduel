import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PhalanxTurnResult } from '@phalanxduel/shared';
import { PizzazzEngine } from '../src/pizzazz';

vi.mock('../src/state', () => ({
  getState: vi.fn(() => ({ playerIndex: 0, gameState: null })),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockReturnValue({ matches: false }),
});

function makeMinimalGameState(overrides: Record<string, unknown> = {}) {
  return {
    phase: 'AttackPhase',
    activePlayerIndex: 0,
    transactionLog: [],
    outcome: null,
    ...overrides,
  };
}

function makeCombatEntry(col = 0, lpDamage = 5) {
  return {
    attackerPlayerIndex: 0,
    targetColumn: col,
    totalLpDamage: lpDamage,
    steps: [{ target: 'playerLp', damage: lpDamage, bonuses: [] }],
  };
}

function makeTurnResult(
  pre: Record<string, unknown>,
  post: Record<string, unknown>,
): PhalanxTurnResult {
  return { preState: pre, postState: post } as unknown as PhalanxTurnResult;
}

describe('PizzazzEngine animation hook', () => {
  let engine: PizzazzEngine;

  beforeEach(() => {
    document.body.dataset.pzLastTrigger = '';
    document.body.dataset.pzTriggerSeq = '0';
    engine = new PizzazzEngine();
    // Seed the engine so it doesn't skip on first call
    const init = makeMinimalGameState({ transactionLog: [] });
    engine.onTurnResult(makeTurnResult(init, init));
  });

  it('records a combat trigger when an attack entry arrives', () => {
    const pre = makeMinimalGameState({ transactionLog: [] });
    const post = makeMinimalGameState({
      transactionLog: [
        {
          details: { type: 'attack', combat: makeCombatEntry(2, 3) },
          stateHashAfter: 'x',
        },
      ],
    });

    engine.onTurnResult(makeTurnResult(pre, post));

    const triggers = engine.getTriggers();
    expect(triggers.some((t) => t.type === 'combat')).toBe(true);
    expect(Number(document.body.dataset.pzTriggerSeq)).toBeGreaterThan(0);
  });

  it('records screenShake when LP damage > 0', () => {
    const pre = makeMinimalGameState({ transactionLog: [] });
    const post = makeMinimalGameState({
      transactionLog: [
        {
          details: { type: 'attack', combat: makeCombatEntry(0, 5) },
          stateHashAfter: 'x',
        },
      ],
    });

    engine.onTurnResult(makeTurnResult(pre, post));

    const triggers = engine.getTriggers();
    expect(triggers.some((t) => t.type === 'screenShake')).toBe(true);
  });

  it('records gameOver trigger on phase transition to gameOver', () => {
    const pre = makeMinimalGameState({ phase: 'AttackPhase' });
    const post = makeMinimalGameState({
      phase: 'gameOver',
      outcome: { winnerIndex: 0 },
      transactionLog: [],
    });

    engine.onTurnResult(makeTurnResult(pre, post));

    const triggers = engine.getTriggers();
    expect(triggers.some((t) => t.type === 'gameOver')).toBe(true);
    expect(document.body.dataset.pzLastTrigger).toBe('gameOver');
  });

  it('exposes itself on window.__pizzazz', () => {
    expect(window.__pizzazz).toBe(engine);
  });

  it('caps the trigger log at 100 entries', () => {
    for (let i = 0; i < 110; i++) {
      const pre = makeMinimalGameState({ transactionLog: [] });
      const post = makeMinimalGameState({
        transactionLog: [
          {
            details: { type: 'attack', combat: makeCombatEntry(i % 4, 1) },
            stateHashAfter: `h${i}`,
          },
        ],
      });
      engine.onTurnResult(makeTurnResult(pre, post));
      // Reset lastLogCount tracking by re-seeding
      (engine as unknown as { lastLogCount: number }).lastLogCount = 0;
    }

    expect(engine.getTriggers().length).toBeLessThanOrEqual(100);
  });
});
