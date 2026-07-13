/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Authoritative v3.0 combat calculation recorder. The recorder observes the
 * exact values produced by combat-math and commits an ordered, independently
 * checkable arithmetic witness to the combat transaction.
 */

import type {
  CalculationInput,
  CalculationOperator,
  CalculationProvenance,
  CalculationQuantity,
  CalculationStep,
  CalculationTarget,
} from '@phalanxduel/shared';
import { evaluateCalculationStep, verifyCalculationProvenance } from '@phalanxduel/shared';
import type {
  CardBoundaryInput,
  CardBoundaryResult,
  CardTransitionContext,
  CardTransitionResult,
  PlayerBoundaryInput,
  PlayerBoundaryResult,
} from './combat-math.js';

interface RecordCalculation {
  ruleId: string;
  operator: CalculationOperator;
  inputs: CalculationInput[];
  resultName: string;
  resultValue: number;
  target: CalculationTarget;
  quantity: CalculationQuantity;
}

function stateInput(name: string, value: number): CalculationInput {
  return { name, value, source: { kind: 'state' } };
}

function constantInput(name: string, value: number): CalculationInput {
  return { name, value, source: { kind: 'constant' } };
}

/** Exact ordered arithmetic witness for one attack. */
export class CombatCalculationTrace {
  private readonly steps: CalculationStep[] = [];
  private currentDamage: CalculationInput;

  constructor(attackerValue: number) {
    this.currentDamage = this.record({
      ruleId: 'PD-RULE-017',
      operator: 'assign',
      inputs: [stateInput('attackerValue', attackerValue)],
      resultName: 'baseDamage',
      resultValue: attackerValue,
      target: 'attack',
      quantity: 'baseDamage',
    });
  }

  recordCardTransition(
    target: 'frontCard' | 'backCard',
    incomingDamage: number,
    transition: CardTransitionResult,
    context: CardTransitionContext,
  ): void {
    this.assertCurrentDamage(incomingDamage, target);
    const step = transition.step;
    const hpBefore = step.hpBefore ?? transition.remainingHp;

    if (step.bonuses?.includes('faceCardIneligible')) {
      const candidateHp = this.record({
        ruleId: 'PD-RULE-032',
        operator: 'subtract',
        inputs: [stateInput('hpBefore', hpBefore), this.asInput('incomingDamage')],
        resultName: `${target}.candidateHp`,
        resultValue: hpBefore - incomingDamage,
        target,
        quantity: 'candidateHp',
      });
      const remainingHp = this.record({
        ruleId: 'PD-RULE-032',
        operator: 'clamp',
        inputs:
          context.modeDamagePersistence === 'cumulative'
            ? [candidateHp, constantInput('minimumHp', 1)]
            : [
                candidateHp,
                stateInput('hpBeforeLowerBound', hpBefore),
                stateInput('hpBeforeUpperBound', hpBefore),
              ],
        resultName: `${target}.remainingHp`,
        resultValue: transition.remainingHp,
        target,
        quantity: 'remainingHp',
      });
      this.record({
        ruleId: 'PD-RULE-032',
        operator: 'subtract',
        inputs: [stateInput('hpBefore', hpBefore), remainingHp],
        resultName: `${target}.absorbedDamage`,
        resultValue: step.absorbed ?? 0,
        target,
        quantity: 'absorbedDamage',
      });
      this.currentDamage = this.record({
        ruleId: 'PD-RULE-021',
        operator: 'clamp',
        inputs: [
          this.asInput('incomingDamage'),
          constantInput('minimumCarryover', 0),
          constantInput('maximumCarryover', 0),
        ],
        resultName: `${target}.carryover`,
        resultValue: transition.carryover,
        target,
        quantity: 'carryover',
      });
      return;
    }

    const aceRule = step.bonuses?.includes('aceInvulnerable') || step.bonuses?.includes('aceVsAce');
    const ruleId = aceRule ? 'PD-RULE-029' : transition.destroyed ? 'PD-RULE-020' : 'PD-RULE-019';
    const absorbed = this.record({
      ruleId,
      operator: 'min',
      inputs: [this.asInput('incomingDamage'), stateInput('effectiveHp', hpBefore)],
      resultName: `${target}.absorbedDamage`,
      resultValue: step.absorbed ?? 0,
      target,
      quantity: 'absorbedDamage',
    });
    const candidateHp = this.record({
      ruleId,
      operator: 'subtract',
      inputs: [stateInput('hpBefore', hpBefore), absorbed],
      resultName: `${target}.candidateHp`,
      resultValue: hpBefore - (step.absorbed ?? 0),
      target,
      quantity: 'candidateHp',
    });
    this.record({
      ruleId,
      operator: 'clamp',
      inputs: [
        candidateHp,
        constantInput('minimumHp', step.bonuses?.includes('aceInvulnerable') ? 1 : 0),
      ],
      resultName: `${target}.remainingHp`,
      resultValue: transition.remainingHp,
      target,
      quantity: 'remainingHp',
    });
    this.currentDamage = this.record({
      ruleId,
      operator: 'subtract',
      inputs: [this.asInput('incomingDamage'), absorbed],
      resultName: `${target}.carryover`,
      resultValue: transition.carryover,
      target,
      quantity: 'carryover',
    });
  }

  recordCardBoundary(input: CardBoundaryInput, result: CardBoundaryResult): void {
    this.assertCurrentDamage(input.carryover, 'frontToBackBoundary');

    const applyDiamond = (): void => {
      if (!result.diamondApplied) return;
      const absorbed = this.record({
        ruleId: 'PD-RULE-023',
        operator: 'min',
        inputs: [this.asInput('carryover'), stateInput('diamondShield', input.diamondShield)],
        resultName: 'frontToBackBoundary.shieldAbsorbed',
        resultValue: result.diamondAbsorbed,
        target: 'frontToBackBoundary',
        quantity: 'shieldAbsorbed',
      });
      this.currentDamage = this.record({
        ruleId: 'PD-RULE-023',
        operator: 'subtract',
        inputs: [this.asInput('carryover'), absorbed],
        resultName: 'frontToBackBoundary.carryoverAfterShield',
        resultValue: this.currentDamage.value - result.diamondAbsorbed,
        target: 'frontToBackBoundary',
        quantity: 'carryover',
      });
    };

    const applyClub = (): void => {
      if (!result.clubApplied) return;
      this.currentDamage = this.record({
        ruleId: 'PD-RULE-024',
        operator: 'multiply',
        inputs: [this.asInput('carryover'), constantInput('clubMultiplier', 2)],
        resultName: 'frontToBackBoundary.carryoverAfterWeapon',
        resultValue: this.currentDamage.value * 2,
        target: 'frontToBackBoundary',
        quantity: 'carryover',
      });
    };

    if (input.specVersion !== '1.0') applyDiamond();
    applyClub();
    if (input.specVersion === '1.0') applyDiamond();
    this.assertCurrentDamage(result.carryover, 'frontToBackBoundary result');
  }

  recordPlayerBoundary(input: PlayerBoundaryInput, result: PlayerBoundaryResult): void {
    this.assertCurrentDamage(input.carryover, 'cardToPlayerBoundary');

    const applyHeart = (): void => {
      if (result.heartAbsorbed <= 0) return;
      const absorbed = this.record({
        ruleId: 'PD-RULE-026',
        operator: 'min',
        inputs: [this.asInput('carryover'), stateInput('heartShield', input.heartShield)],
        resultName: 'cardToPlayerBoundary.shieldAbsorbed',
        resultValue: result.heartAbsorbed,
        target: 'cardToPlayerBoundary',
        quantity: 'shieldAbsorbed',
      });
      this.currentDamage = this.record({
        ruleId: 'PD-RULE-026',
        operator: 'subtract',
        inputs: [this.asInput('carryover'), absorbed],
        resultName: 'cardToPlayerBoundary.damageAfterShield',
        resultValue: this.currentDamage.value - result.heartAbsorbed,
        target: 'cardToPlayerBoundary',
        quantity: 'appliedDamage',
      });
    };

    const applySpade = (): void => {
      if (!result.bonuses.includes('spadeDoubleLp')) return;
      this.currentDamage = this.record({
        ruleId: 'PD-RULE-028',
        operator: 'multiply',
        inputs: [this.asInput('damage'), constantInput('spadeMultiplier', 2)],
        resultName: 'cardToPlayerBoundary.damageAfterWeapon',
        resultValue: this.currentDamage.value * 2,
        target: 'cardToPlayerBoundary',
        quantity: 'appliedDamage',
      });
    };

    if (input.specVersion !== '1.0') applyHeart();
    applySpade();
    if (input.specVersion === '1.0') applyHeart();
    this.assertCurrentDamage(result.damage, 'cardToPlayerBoundary result');
  }

  recordLpChange(lpBefore: number, damage: number, lpAfter: number): void {
    this.assertCurrentDamage(damage, 'playerLp');
    const appliedDamage = this.record({
      ruleId: 'PD-RULE-064',
      operator: 'assign',
      inputs: [this.asInput('boundaryDamage')],
      resultName: 'playerLp.appliedDamage',
      resultValue: damage,
      target: 'playerLp',
      quantity: 'appliedDamage',
    });
    const candidateLp = this.record({
      ruleId: 'PD-RULE-064',
      operator: 'subtract',
      inputs: [stateInput('lpBefore', lpBefore), appliedDamage],
      resultName: 'playerLp.candidateLp',
      resultValue: lpBefore - damage,
      target: 'playerLp',
      quantity: 'candidateLp',
    });
    this.record({
      ruleId: 'PD-RULE-064',
      operator: 'clamp',
      inputs: [candidateLp, constantInput('minimumLp', 0)],
      resultName: 'playerLp.remainingLp',
      resultValue: lpAfter,
      target: 'playerLp',
      quantity: 'remainingLp',
    });
  }

  finish(): CalculationProvenance {
    const provenance: CalculationProvenance = {
      schemaVersion: '1.0',
      steps: [...this.steps],
    };
    const verification = verifyCalculationProvenance(provenance);
    if (!verification.valid) {
      throw new Error(
        `Invalid authoritative calculation provenance: ${verification.errors.join('; ')}`,
      );
    }
    return provenance;
  }

  private record(calculation: RecordCalculation): CalculationInput {
    const sequence = this.steps.length;
    const step: CalculationStep = {
      sequence,
      ruleId: calculation.ruleId,
      operator: calculation.operator,
      inputs: calculation.inputs,
      result: { name: calculation.resultName, value: calculation.resultValue },
      target: calculation.target,
      quantity: calculation.quantity,
      visibility: 'public',
    };
    const evaluated = evaluateCalculationStep(step);
    if (evaluated !== calculation.resultValue) {
      throw new Error(
        `Calculation ${sequence} (${calculation.resultName}) recorded ${calculation.resultValue}; operands evaluate to ${evaluated}`,
      );
    }
    this.steps.push(step);
    return {
      name: calculation.resultName,
      value: calculation.resultValue,
      source: { kind: 'step', step: sequence },
    };
  }

  private asInput(name: string): CalculationInput {
    return { ...this.currentDamage, name };
  }

  private assertCurrentDamage(expected: number, context: string): void {
    if (this.currentDamage.value !== expected) {
      throw new Error(
        `Calculation continuity failure at ${context}: trace=${this.currentDamage.value}, engine=${expected}`,
      );
    }
  }
}
