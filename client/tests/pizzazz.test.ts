import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PhalanxTurnResult } from '@phalanxduel/shared';
import { PizzazzEngine } from '../src/pizzazz';
import { NarrationBus } from '../src/narration-bus';
import { PRESENTATION_TIMING } from '../src/presentation-timing';

vi.mock('../src/state', () => ({
  getState: vi.fn(() => ({ screen: 'gameOver', playerIndex: 0, gameState: null })),
}));

function makeMinimalGameState(overrides: Record<string, unknown> = {}) {
  return {
    phase: 'AttackPhase',
    activePlayerIndex: 0,
    transactionLog: [],
    outcome: null,
    ...overrides,
  };
}

function makeCombatEntry(col = 0, lpDamage = 5, bonuses: string[] = []) {
  return {
    attackerPlayerIndex: 0,
    targetColumn: col,
    totalLpDamage: lpDamage,
    steps: [{ target: 'playerLp', damage: lpDamage, bonuses }],
  };
}

function makeDeployEntry(playerIndex = 0, column = 3) {
  return {
    action: {
      type: 'deploy',
      playerIndex,
      column,
      cardId: 'c1',
      timestamp: new Date().toISOString(),
    },
    details: { type: 'deploy', gridIndex: column, phaseAfter: 'DeploymentPhase' },
    stateHashAfter: 'd1',
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
  let bus: NarrationBus;

  beforeEach(() => {
    document.querySelectorAll('.pz-splash-overlay').forEach((element) => element.remove());
    document.body.dataset.pzLastTrigger = '';
    document.body.dataset.pzTriggerSeq = '0';
    bus = new NarrationBus();
    engine = new PizzazzEngine();
    engine.start(bus);
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

  it('waits for the ordered terminal cue before showing game over', () => {
    const pre = makeMinimalGameState({ phase: 'AttackPhase' });
    const post = makeMinimalGameState({
      phase: 'gameOver',
      outcome: { winnerIndex: 0 },
      transactionLog: [],
    });

    engine.onTurnResult(makeTurnResult(pre, post));
    expect(engine.getTriggers().some((t) => t.type === 'gameOver')).toBe(false);

    bus.emit({
      type: 'terminal',
      winnerIndex: 0,
      turnNumber: 3,
      victoryType: 'lpDepletion',
    });

    const triggers = engine.getTriggers();
    expect(triggers.some((t) => t.type === 'gameOver')).toBe(true);
    expect(document.body.dataset.pzLastTrigger).toBe('gameOver');
    expect(document.querySelector('.pz-splash-text')?.textContent).toBe('VICTORY');
  });

  it('exposes itself on window.__pizzazz', () => {
    expect(window.__pizzazz).toBe(engine);
  });

  it('records attackVector and columnActive triggers on attack', () => {
    const pre = makeMinimalGameState({ transactionLog: [] });
    const post = makeMinimalGameState({
      transactionLog: [
        {
          details: { type: 'attack', combat: makeCombatEntry(4, 0) },
          stateHashAfter: 'x',
        },
      ],
    });

    engine.onTurnResult(makeTurnResult(pre, post));

    const triggers = engine.getTriggers();
    expect(triggers.some((t) => t.type === 'attackVector' && t.detail === 'col=4')).toBe(true);
    expect(triggers.some((t) => t.type === 'columnActive' && t.detail === 'col=4')).toBe(true);
  });

  it('lands impact and damage only after the attack vector reaches its target', async () => {
    vi.useFakeTimers();
    const attacker = document.createElement('div');
    attacker.dataset.testid = 'player-cell-r0-c0';
    const defender = document.createElement('div');
    defender.dataset.testid = 'opponent-stats';
    defender.className = 'phx-opponent-zone';
    document.body.append(attacker, defender);

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
    expect(document.querySelector('.pz-attack-beam')).not.toBeNull();
    expect(defender.classList.contains('pz-impact-flash')).toBe(false);
    expect(document.querySelector('.pz-damage-pop')).toBeNull();

    await vi.advanceTimersByTimeAsync(PRESENTATION_TIMING.effects.impactDelay);

    expect(defender.classList.contains('pz-impact-flash')).toBe(true);
    expect(document.querySelector('.pz-damage-pop')?.textContent).toBe('-5');

    vi.clearAllTimers();
    document
      .querySelectorAll('.pz-attack-beam, .pz-damage-pop')
      .forEach((element) => element.remove());
    attacker.remove();
    defender.remove();
    vi.useRealTimers();
  });

  it('records suitPip trigger when a step has bonuses', () => {
    const pre = makeMinimalGameState({ transactionLog: [] });
    const post = makeMinimalGameState({
      transactionLog: [
        {
          details: {
            type: 'attack',
            combat: makeCombatEntry(1, 3, ['heartDeathShield']),
          },
          stateHashAfter: 'x',
        },
      ],
    });

    engine.onTurnResult(makeTurnResult(pre, post));

    const triggers = engine.getTriggers();
    expect(triggers.some((t) => t.type === 'suitPip' && t.detail === 'heartDeathShield')).toBe(
      true,
    );
  });

  it('records deploy trigger on a deploy log entry', () => {
    const pre = makeMinimalGameState({ transactionLog: [] });
    const post = makeMinimalGameState({
      transactionLog: [makeDeployEntry(0, 5)],
    });

    engine.onTurnResult(makeTurnResult(pre, post));

    const triggers = engine.getTriggers();
    expect(triggers.some((t) => t.type === 'deploy' && t.detail === 'player=0,col=5')).toBe(true);
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
