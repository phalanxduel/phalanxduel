import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type {
  Battlefield,
  BattlefieldCard,
  Card,
  GameState,
  PartialCard,
} from '@phalanxduel/shared';
import {
  DEFAULT_MATCH_PARAMS,
  GameStateSchema,
  TelemetryName,
  readCombatResolution,
  verifyCalculationProvenance,
} from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { resolveAttack } from '../src/combat.js';
import { simulateAttack } from '../src/combat-preview.js';
import { deriveEventsFromEntry } from '../src/events.js';
import { createInitialState } from '../src/state.js';
import { applyAction } from '../src/turns.js';

const TIMESTAMP = '2026-07-13T00:00:00.000Z';

function card(suit: Card['suit'], face: Card['face'], value: number, type: Card['type']): Card {
  return { id: `${suit}-${face}-${value}-${type}`, suit, face, value, type };
}

function battlefieldCard(value: Card, row: number): BattlefieldCard {
  return {
    card: value,
    position: { row, col: 0 },
    currentHp: value.value,
    faceDown: false,
  };
}

function stateWithColumn(
  attacker: Card,
  front: Card | null,
  back: Card | null,
  options: { specVersion?: GameState['specVersion']; defenderLp?: number } = {},
): GameState {
  const attackerBattlefield = Array<BattlefieldCard | null>(8).fill(null) as Battlefield;
  const defenderBattlefield = Array<BattlefieldCard | null>(8).fill(null) as Battlefield;
  attackerBattlefield[0] = battlefieldCard(attacker, 0);
  if (front) defenderBattlefield[0] = battlefieldCard(front, 0);
  if (back) defenderBattlefield[4] = battlefieldCard(back, 1);

  const specVersion = options.specVersion ?? '3.0';
  return {
    matchId: '11111111-1111-4111-8111-111111111111',
    specVersion,
    params: {
      ...DEFAULT_MATCH_PARAMS,
      specVersion,
      rows: 2,
      columns: 4,
      modeDamagePersistence: 'cumulative',
      modeClassicAces: true,
      modeClassicFaceCards: true,
    },
    phase: 'AttackPhase',
    activePlayerIndex: 0,
    turnNumber: 1,
    players: [
      {
        player: { id: '00000000-0000-4000-8000-000000000001', name: 'Attacker' },
        hand: [],
        battlefield: attackerBattlefield,
        drawpile: [],
        discardPile: [],
        lifepoints: 20,
        deckSeed: 1,
      },
      {
        player: { id: '00000000-0000-4000-8000-000000000002', name: 'Defender' },
        hand: [],
        battlefield: defenderBattlefield,
        drawpile: [{ suit: 'clubs', face: '2', value: 2, type: 'number' } satisfies PartialCard],
        discardPile: [],
        lifepoints: options.defenderLp ?? 20,
        deckSeed: 2,
      },
    ],
    transactionLog: [],
  } as GameState;
}

function provenanceFor(state: GameState) {
  const result = resolveAttack(state, 0, 0, 0);
  const provenance = result.combatEntry.calculationProvenance;
  if (!provenance) throw new Error('Expected v3 calculation provenance');
  return provenance;
}

describe('authoritative combat calculation provenance', () => {
  it('defaults omitted compatibility LP instead of allowing NaN combat state', () => {
    const state = createInitialState({
      matchId: '11111111-1111-4111-8111-111111111111',
      players: [
        { id: '00000000-0000-4000-8000-000000000001', name: 'Attacker' },
        { id: '00000000-0000-4000-8000-000000000002', name: 'Defender' },
      ],
      rngSeed: 1,
      gameOptions: { classicDeployment: false },
    });

    expect(state.players.map((player) => player.lifepoints)).toEqual([20, 20]);
  });

  it('records absorption, Heart shield, Spade weapon, LP subtraction, and clamps as one closed chain', () => {
    const provenance = provenanceFor(
      stateWithColumn(card('spades', 'T', 10, 'number'), card('hearts', '3', 3, 'number'), null),
    );

    expect(verifyCalculationProvenance(provenance)).toEqual({ valid: true, errors: [] });
    expect(provenance.steps.map((step) => step.operator)).toEqual([
      'assign',
      'min',
      'subtract',
      'clamp',
      'subtract',
      'min',
      'subtract',
      'multiply',
      'assign',
      'subtract',
      'clamp',
    ]);
    expect(provenance.steps.at(-1)?.result).toEqual({
      name: 'playerLp.remainingLp',
      value: 12,
    });
    expect(new Set(provenance.steps.map((step) => step.ruleId))).toEqual(
      new Set(['PD-RULE-017', 'PD-RULE-020', 'PD-RULE-026', 'PD-RULE-028', 'PD-RULE-064']),
    );
    expect(provenance.steps.every((step) => step.visibility === 'public')).toBe(true);
  });

  it('records Shield before Weapon at the front-to-back boundary', () => {
    const provenance = provenanceFor(
      stateWithColumn(
        card('clubs', 'T', 10, 'number'),
        card('diamonds', '3', 3, 'number'),
        card('spades', '5', 5, 'number'),
      ),
    );
    const boundary = provenance.steps.filter((step) => step.target === 'frontToBackBoundary');

    expect(boundary.map((step) => [step.ruleId, step.operator, step.result.value])).toEqual([
      ['PD-RULE-023', 'min', 3],
      ['PD-RULE-023', 'subtract', 4],
      ['PD-RULE-024', 'multiply', 8],
    ]);
    expect(verifyCalculationProvenance(provenance).valid).toBe(true);
  });

  it('records the cumulative ineligible-face clamp and halted carryover', () => {
    const provenance = provenanceFor(
      stateWithColumn(card('clubs', 'J', 11, 'jack'), card('diamonds', 'Q', 11, 'queen'), null),
    );
    const faceSteps = provenance.steps.filter(
      (step) => step.ruleId === 'PD-RULE-032' || step.ruleId === 'PD-RULE-021',
    );

    expect(faceSteps.map((step) => [step.quantity, step.result.value])).toEqual([
      ['candidateHp', 0],
      ['remainingHp', 1],
      ['absorbedDamage', 10],
      ['carryover', 0],
    ]);
    expect(verifyCalculationProvenance(provenance).valid).toBe(true);
  });

  it('stores one authoritative resolution consumed unchanged by events and readers', () => {
    const state = stateWithColumn(
      card('spades', 'T', 10, 'number'),
      card('hearts', '3', 3, 'number'),
      null,
    );
    const action = {
      type: 'attack' as const,
      playerIndex: 0 as const,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TIMESTAMP,
    };

    const after = applyAction(state, action);
    const entry = after.transactionLog?.at(-1);
    if (!entry || entry.details.type !== 'attack') throw new Error('Expected attack transaction');
    const event = deriveEventsFromEntry(entry, state.matchId).find(
      (candidate) => candidate.name === TelemetryName.EVENT_ATTACK_RESOLVED,
    );

    expect(entry.details.resolution).toBeDefined();
    expect(readCombatResolution(entry.details)).toBe(entry.details.resolution);
    expect(event?.payload).toEqual(entry.details.resolution);
    expect(event?.payload.calculationProvenance).toEqual(
      entry.details.combat.calculationProvenance,
    );
    expect(simulateAttack(state, action).resolution).toEqual(entry.details.resolution);
    const parsedState = GameStateSchema.safeParse(after);
    expect(parsedState.success).toBe(true);
  });

  it('commits calculation provenance to the event-log fingerprint', () => {
    const state = stateWithColumn(
      card('spades', 'T', 10, 'number'),
      card('hearts', '3', 3, 'number'),
      null,
    );
    const after = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TIMESTAMP,
    });
    const entry = after.transactionLog?.at(-1);
    if (!entry) throw new Error('Expected attack transaction');
    const events = deriveEventsFromEntry(entry, state.matchId);
    const changed = structuredClone(events);
    const resolved = changed.find(
      (candidate) => candidate.name === TelemetryName.EVENT_ATTACK_RESOLVED,
    );
    const payload = resolved?.payload as {
      calculationProvenance?: { steps: Array<{ result: { value: number } }> };
    };
    payload.calculationProvenance!.steps[0]!.result.value += 1;

    expect(computeStateHash(changed)).not.toBe(computeStateHash(events));
  });

  it('keeps historical v2 combat and resolution payload shapes unchanged', () => {
    const state = stateWithColumn(
      card('spades', 'T', 10, 'number'),
      card('hearts', '3', 3, 'number'),
      null,
      { specVersion: '2.0' },
    );
    const after = applyAction(state, {
      type: 'attack',
      playerIndex: 0,
      attackingColumn: 0,
      defendingColumn: 0,
      timestamp: TIMESTAMP,
    });
    const entry = after.transactionLog?.at(-1);
    if (!entry || entry.details.type !== 'attack') throw new Error('Expected attack transaction');

    expect(entry.details.combat.calculationProvenance).toBeUndefined();
    expect(entry.details.resolution).toBeUndefined();
    expect(readCombatResolution(entry.details).calculationProvenance).toBeUndefined();
  });

  it('uses only stable rule identifiers registered by the normative evidence registry', () => {
    const provenances = [
      provenanceFor(
        stateWithColumn(
          card('clubs', 'T', 10, 'number'),
          card('diamonds', '3', 3, 'number'),
          card('spades', '5', 5, 'number'),
        ),
      ),
      provenanceFor(
        stateWithColumn(card('spades', 'T', 10, 'number'), card('hearts', '3', 3, 'number'), null),
      ),
      provenanceFor(
        stateWithColumn(card('clubs', 'J', 11, 'jack'), card('diamonds', 'Q', 11, 'queen'), null),
      ),
    ];
    // Fixed repository-relative URL; no user-controlled filesystem input.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const registryUrl = import.meta.url.includes('/.stryker-tmp/')
      ? new URL('../../../../docs/gameplay/rule-evidence.json', import.meta.url)
      : new URL('../../docs/gameplay/rule-evidence.json', import.meta.url);
    const registry = JSON.parse(readFileSync(registryUrl, 'utf8')) as {
      rules: Array<{ id: string }>;
    };
    const registered = new Set(registry.rules.map((rule) => rule.id));

    expect(
      provenances
        .flatMap((provenance) => provenance.steps)
        .every((step) => registered.has(step.ruleId)),
    ).toBe(true);
  });
});
