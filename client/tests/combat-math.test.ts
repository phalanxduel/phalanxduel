import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CalculationProvenance } from '@phalanxduel/shared';
import { CombatMath } from '../src/components/CombatMath';

const provenance: CalculationProvenance = {
  schemaVersion: '1.0',
  steps: [
    {
      sequence: 0,
      ruleId: 'PD-RULE-017',
      operator: 'assign',
      inputs: [{ name: 'attackerValue', value: 6, source: { kind: 'state' } }],
      result: { name: 'baseDamage', value: 6 },
      target: 'attack',
      quantity: 'baseDamage',
      visibility: 'public',
    },
    {
      sequence: 1,
      ruleId: 'PD-RULE-028',
      operator: 'multiply',
      inputs: [
        { name: 'damage', value: 6, source: { kind: 'step', step: 0 } },
        { name: 'spadeMultiplier', value: 2, source: { kind: 'constant' } },
      ],
      result: { name: 'damageAfterWeapon', value: 12 },
      target: 'cardToPlayerBoundary',
      quantity: 'appliedDamage',
      visibility: 'public',
    },
  ],
};

describe('CombatMath', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('exposes tactical, cinematic, and analyst modes backed by one source trace', () => {
    render(h(CombatMath, { provenance, context: 'live' }), container);
    const view = container.querySelector('[data-component="CombatExplanationView"]');
    expect(view?.getAttribute('data-source-step-count')).toBe('2');
    expect(view?.getAttribute('data-mode')).toBe('tactical');

    const analyst = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'ANALYST',
    );
    act(() => {
      analyst?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(view?.getAttribute('data-mode')).toBe('analyst');
    expect(container.querySelectorAll('.combat-math-equation')).toHaveLength(2);
  });

  it('provides screen-reader wording equivalent to the visible equation', () => {
    render(h(CombatMath, { provenance, context: 'live' }), container);
    expect(container.querySelector('.combat-math-equations')?.textContent).toContain('6 × 2 = 12');
    const spoken = container.querySelector('.sr-only')?.textContent ?? '';
    expect(spoken).toContain('6 multiplied by 2');
    expect(spoken).toContain('resulting in 12');
    expect(spoken).toContain('PD-RULE-028');
  });

  it('fails closed when no observer-authorized trace is present', () => {
    render(h(CombatMath, { provenance: undefined, context: 'live' }), container);
    expect(container.querySelector('[data-component="CombatExplanationView"]')).toBeNull();
  });
});
