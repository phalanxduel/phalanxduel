import type { CalculationProvenance, CalculationStep } from '@phalanxduel/shared';
import { verifyCalculationProvenance } from '@phalanxduel/shared';

export type CombatExplanationMode = 'tactical' | 'cinematic' | 'analyst';

export interface CombatEquationLine {
  sequence: number;
  ruleId: string;
  expression: string;
  spoken: string;
  result: number;
}

export interface CombatExplanation {
  schemaVersion: CalculationProvenance['schemaVersion'];
  sourceStepCount: number;
  lines: CombatEquationLine[];
  tacticalSequences: number[];
  cinematicSequence: number;
  spokenSummary: string;
}

function humanize(name: string): string {
  const leaf = name.split('.').at(-1) ?? name;
  return leaf
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase());
}

function symbolicOperands(step: CalculationStep): string {
  const values = step.inputs.map((input) => String(input.value));
  switch (step.operator) {
    case 'assign':
      return values[0] ?? '0';
    case 'min':
      return `min(${values.join(', ')})`;
    case 'subtract':
      return `${values[0]} − ${values[1]}`;
    case 'multiply':
      return `${values[0]} × ${values[1]}`;
    case 'clamp':
      return `clamp(${values.join(', ')})`;
  }
}

function spokenOperands(step: CalculationStep): string {
  const values = step.inputs.map((input) => input.value);
  switch (step.operator) {
    case 'assign':
      return `${values[0]}`;
    case 'min':
      return `the minimum of ${values.join(' and ')}`;
    case 'subtract':
      return `${values[0]} minus ${values[1]}`;
    case 'multiply':
      return `${values[0]} multiplied by ${values[1]}`;
    case 'clamp':
      return `${values[0]} clamped to ${values.slice(1).join(' through ')}`;
  }
}

function formatStep(step: CalculationStep): CombatEquationLine {
  const resultName = humanize(step.result.name);
  return {
    sequence: step.sequence,
    ruleId: step.ruleId,
    expression: `${resultName} = ${symbolicOperands(step)} = ${step.result.value}`,
    spoken: `${resultName} equals ${spokenOperands(step)}, resulting in ${step.result.value}, under rule ${step.ruleId}.`,
    result: step.result.value,
  };
}

function isTacticalModifier(step: CalculationStep): boolean {
  return (
    step.operator === 'multiply' ||
    step.quantity === 'shieldAbsorbed' ||
    step.inputs.some((input) => /multiplier|shield/i.test(input.name))
  );
}

function uniqueSequences(sequences: number[]): number[] {
  return [...new Set(sequences)];
}

/**
 * Format an already-projected authoritative trace. This function never
 * simulates combat or fills missing steps: absence is an observer boundary.
 */
export function buildCombatExplanation(
  provenance: CalculationProvenance | undefined,
): CombatExplanation | null {
  if (!provenance || provenance.steps.length === 0) return null;
  if (!verifyCalculationProvenance(provenance).valid) return null;
  const firstStep = provenance.steps[0];
  const lastStep = provenance.steps.at(-1);
  if (!firstStep || !lastStep) return null;

  const lines = provenance.steps.map(formatStep);
  const lastSequence = lastStep.sequence;
  const modifierSequences = provenance.steps
    .filter(isTacticalModifier)
    .map((step) => step.sequence);
  const tacticalSequences = uniqueSequences([
    firstStep.sequence,
    ...modifierSequences.slice(-1),
    lastSequence,
  ]);
  const cinematicSequence = modifierSequences.at(-1) ?? lastSequence;

  return {
    schemaVersion: provenance.schemaVersion,
    sourceStepCount: provenance.steps.length,
    lines,
    tacticalSequences,
    cinematicSequence,
    spokenSummary: lines.map((line) => line.spoken).join(' '),
  };
}

export function explanationLinesForMode(
  explanation: CombatExplanation,
  mode: CombatExplanationMode,
): CombatEquationLine[] {
  if (mode === 'analyst') return explanation.lines;
  const sequences =
    mode === 'cinematic' ? [explanation.cinematicSequence] : explanation.tacticalSequences;
  return explanation.lines.filter((line) => sequences.includes(line.sequence));
}
