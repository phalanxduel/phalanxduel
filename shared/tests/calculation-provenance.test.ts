import { describe, expect, it } from 'vitest';
import type { CalculationProvenance } from '../src/types.js';
import { CalculationProvenanceSchema } from '../src/schema.js';
import {
  evaluateCalculationStep,
  verifyCalculationProvenance,
} from '../src/calculation-provenance.js';

function validProvenance(): CalculationProvenance {
  return {
    schemaVersion: '1.0',
    steps: [
      {
        sequence: 0,
        ruleId: 'PD-RULE-017',
        operator: 'assign',
        inputs: [{ name: 'attackerValue', value: 9, source: { kind: 'state' } }],
        result: { name: 'baseDamage', value: 9 },
        target: 'attack',
        quantity: 'baseDamage',
        visibility: 'public',
      },
      {
        sequence: 1,
        ruleId: 'PD-RULE-020',
        operator: 'subtract',
        inputs: [
          { name: 'hpBefore', value: 7, source: { kind: 'state' } },
          { name: 'incomingDamage', value: 9, source: { kind: 'step', step: 0 } },
        ],
        result: { name: 'candidateHp', value: -2 },
        target: 'frontCard',
        quantity: 'candidateHp',
        visibility: 'public',
      },
      {
        sequence: 2,
        ruleId: 'PD-RULE-020',
        operator: 'clamp',
        inputs: [
          { name: 'candidateHp', value: -2, source: { kind: 'step', step: 1 } },
          { name: 'minimumHp', value: 0, source: { kind: 'constant' } },
        ],
        result: { name: 'remainingHp', value: 0 },
        target: 'frontCard',
        quantity: 'remainingHp',
        visibility: 'public',
      },
    ],
  };
}

describe('calculation provenance verifier', () => {
  it('accepts a schema-valid, arithmetically closed, continuous chain', () => {
    const provenance = validProvenance();

    expect(CalculationProvenanceSchema.parse(provenance)).toEqual(provenance);
    expect(verifyCalculationProvenance(provenance)).toEqual({ valid: true, errors: [] });
    expect(provenance.steps.map(evaluateCalculationStep)).toEqual([9, -2, 0]);
  });

  it('detects a recorded result that disagrees with its operator', () => {
    const provenance = validProvenance();
    provenance.steps[1]!.result.value = -1;

    const verification = verifyCalculationProvenance(provenance);

    expect(verification.valid).toBe(false);
    expect(verification.errors.join('\n')).toContain('subtract evaluates to -2, recorded -1');
  });

  it('detects a source value that disagrees with the referenced result', () => {
    const provenance = validProvenance();
    provenance.steps[2]!.inputs[0]!.value = -1;

    const verification = verifyCalculationProvenance(provenance);

    expect(verification.valid).toBe(false);
    expect(verification.errors.join('\n')).toContain('disagrees with step 1 result -2');
  });

  it('rejects disconnected non-initial arithmetic', () => {
    const provenance = validProvenance();
    provenance.steps[1]!.inputs[1]!.source = { kind: 'state' };

    const verification = verifyCalculationProvenance(provenance);

    expect(verification.valid).toBe(false);
    expect(verification.errors.join('\n')).toContain('disconnected from all prior results');
  });

  it('rejects non-canonical ordering and forward references at the schema boundary', () => {
    const provenance = validProvenance();
    provenance.steps[1]!.sequence = 2;
    provenance.steps[1]!.inputs[1]!.source = { kind: 'step', step: 1 };

    const parsed = CalculationProvenanceSchema.safeParse(provenance);

    expect(parsed.success).toBe(false);
  });
});
