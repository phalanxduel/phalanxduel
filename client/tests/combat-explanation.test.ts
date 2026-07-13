import { describe, expect, it } from 'vitest';
import type { CalculationProvenance } from '@phalanxduel/shared';
import { buildCombatExplanation, explanationLinesForMode } from '../src/combat-explanation';

function provenance(): CalculationProvenance {
  return {
    schemaVersion: '1.0',
    steps: [
      {
        sequence: 0,
        ruleId: 'PD-RULE-017',
        operator: 'assign',
        inputs: [{ name: 'attackerValue', value: 7, source: { kind: 'state' } }],
        result: { name: 'baseDamage', value: 7 },
        target: 'attack',
        quantity: 'baseDamage',
        visibility: 'public',
      },
      {
        sequence: 1,
        ruleId: 'PD-RULE-024',
        operator: 'multiply',
        inputs: [
          { name: 'carryover', value: 7, source: { kind: 'step', step: 0 } },
          { name: 'clubMultiplier', value: 2, source: { kind: 'constant' } },
        ],
        result: { name: 'frontToBackBoundary.carryoverAfterWeapon', value: 14 },
        target: 'frontToBackBoundary',
        quantity: 'carryover',
        visibility: 'public',
      },
      {
        sequence: 2,
        ruleId: 'PD-RULE-064',
        operator: 'subtract',
        inputs: [
          { name: 'lpBefore', value: 20, source: { kind: 'state' } },
          { name: 'appliedDamage', value: 14, source: { kind: 'step', step: 1 } },
        ],
        result: { name: 'playerLp.candidateLp', value: 6 },
        target: 'playerLp',
        quantity: 'candidateLp',
        visibility: 'public',
      },
    ],
  };
}

describe('authoritative combat explanation', () => {
  it('formats declared operands without recomputing or inventing steps', () => {
    const explanation = buildCombatExplanation(provenance());
    expect(explanation).not.toBeNull();
    expect(explanation!.lines.map((line) => line.sequence)).toEqual([0, 1, 2]);
    expect(explanation!.lines[1]!.expression).toBe('Carryover After Weapon = 7 × 2 = 14');
    expect(explanation!.lines[1]!.spoken).toContain('7 multiplied by 2');
    expect(explanation!.lines[1]!.spoken).toContain('PD-RULE-024');
  });

  it('renders all presentation modes from the same authoritative trace', () => {
    const explanation = buildCombatExplanation(provenance())!;
    expect(explanationLinesForMode(explanation, 'cinematic').map((line) => line.sequence)).toEqual([
      1,
    ]);
    expect(explanationLinesForMode(explanation, 'tactical').map((line) => line.sequence)).toEqual([
      0, 1, 2,
    ]);
    expect(explanationLinesForMode(explanation, 'analyst').map((line) => line.sequence)).toEqual([
      0, 1, 2,
    ]);
  });

  it('preserves an observer-authorized prefix without filling its hidden suffix', () => {
    const projected = provenance();
    projected.steps = projected.steps.slice(0, 2);
    const explanation = buildCombatExplanation(projected)!;
    expect(explanation.sourceStepCount).toBe(2);
    expect(explanation.lines.map((line) => line.sequence)).toEqual([0, 1]);
    expect(explanation.spokenSummary).not.toContain('Candidate Lp');
  });

  it('fails closed for an arithmetically invalid witness', () => {
    const invalid = provenance();
    invalid.steps[1]!.result.value = 99;
    expect(buildCombatExplanation(invalid)).toBeNull();
  });
});
