/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Independent verifier for ordered arithmetic provenance. This module knows
 * nothing about combat rules: it checks only operator closure, ordering, and
 * declared source continuity.
 */

import type { CalculationProvenance, CalculationStep } from './types.js';

export interface CalculationVerificationResult {
  valid: boolean;
  errors: string[];
}

function requireArity(step: CalculationStep, allowed: readonly number[]): void {
  if (!allowed.includes(step.inputs.length)) {
    throw new Error(
      `${step.operator} expects ${allowed.join(' or ')} inputs; received ${step.inputs.length}`,
    );
  }
}

/** Re-evaluate a trace step from its declared integer operands. */
export function evaluateCalculationStep(step: CalculationStep): number {
  const values = step.inputs.map((input) => input.value);

  switch (step.operator) {
    case 'assign':
      requireArity(step, [1]);
      return values[0]!;
    case 'min':
      if (values.length === 0) throw new Error('min expects at least one input');
      return Math.min(...values);
    case 'subtract':
      requireArity(step, [2]);
      return values[0]! - values[1]!;
    case 'multiply':
      requireArity(step, [2]);
      return values[0]! * values[1]!;
    case 'clamp': {
      requireArity(step, [2, 3]);
      const [value, lowerBound, upperBound] = values;
      if (upperBound !== undefined && lowerBound! > upperBound) {
        throw new Error('clamp lower bound exceeds upper bound');
      }
      return Math.max(lowerBound!, Math.min(value!, upperBound ?? Number.POSITIVE_INFINITY));
    }
  }
}

/**
 * Verify arithmetic closure and continuity without invoking engine code.
 * Every non-initial step must remain connected to the preceding calculation
 * graph through at least one exact prior-step reference.
 */
export function verifyCalculationProvenance(
  provenance: CalculationProvenance,
): CalculationVerificationResult {
  const errors: string[] = [];

  provenance.steps.forEach((step, index) => {
    if (step.sequence !== index) {
      errors.push(`step ${index}: sequence ${step.sequence} does not equal position ${index}`);
    }
    if (!/^PD-RULE-\d{3}$/.test(step.ruleId)) {
      errors.push(`step ${index}: invalid rule identifier ${step.ruleId}`);
    }

    let priorSourceCount = 0;
    for (const input of step.inputs) {
      if (input.source.kind !== 'step') continue;
      priorSourceCount += 1;
      const sourceIndex = input.source.step;
      const source = provenance.steps[sourceIndex];
      if (sourceIndex >= index || !source) {
        errors.push(`step ${index}: input ${input.name} references non-prior step ${sourceIndex}`);
      } else if (source.result.value !== input.value) {
        errors.push(
          `step ${index}: input ${input.name} value ${input.value} disagrees with step ${sourceIndex} result ${source.result.value}`,
        );
      }
    }
    if (index > 0 && priorSourceCount === 0) {
      errors.push(`step ${index}: calculation chain is disconnected from all prior results`);
    }

    try {
      const evaluated = evaluateCalculationStep(step);
      if (evaluated !== step.result.value) {
        errors.push(
          `step ${index}: ${step.operator} evaluates to ${evaluated}, recorded ${step.result.value}`,
        );
      }
    } catch (error) {
      errors.push(`step ${index}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  return { valid: errors.length === 0, errors };
}
