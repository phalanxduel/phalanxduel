#!/usr/bin/env tsx
/**
 * Symbolic algebraic proof-trace formatter over CalculationProvenance
 * (recorded by engine/src/calculation-provenance.ts).
 *
 * Converts any authoritative combat arithmetic witness into human-readable
 * Unicode, LaTeX, or Typst proof derivations.
 *
 * Usage:
 *   node --import tsx scripts/docs/format-combat-proof.ts --demo
 *   node --import tsx scripts/docs/format-combat-proof.ts --demo --format latex|typst|unicode
 */
import assert from 'node:assert/strict';
import type { CalculationProvenance, CalculationStep } from '@phalanxduel/shared';
import { CombatCalculationTrace } from '../../engine/src/calculation-provenance.js';
import {
  resolveCardBoundary,
  resolveCardTransition,
  resolvePlayerBoundary,
} from '../../engine/src/combat-math.js';

export type ProofFormat = 'unicode' | 'latex' | 'typst';

function formatOp(step: CalculationStep, format: ProofFormat): string {
  const vals = step.inputs.map((i) => `${i.value}`);
  const mul = format === 'latex' ? ' \\cdot ' : format === 'typst' ? ' dot ' : ' × ';
  const sub = ' - ';

  switch (step.operator) {
    case 'assign':
      return vals[0] ?? '0';
    case 'subtract':
      return `${vals[0] ?? '0'}${sub}${vals[1] ?? '0'}`;
    case 'multiply':
      return `${vals[0] ?? '0'}${mul}${vals[1] ?? '0'}`;
    case 'min':
      return `min(${vals.join(', ')})`;
    case 'max':
      return `max(${vals.join(', ')})`;
    case 'clamp': {
      const [val, lo, hi] = vals;
      if (hi !== undefined) return `clamp(${val}, ${lo}, ${hi})`;
      return `max(${val}, ${lo ?? '0'})`;
    }
    default:
      return `${step.operator}(${vals.join(', ')})`;
  }
}

export function formatCombatProofTrace(
  provenance: CalculationProvenance,
  format: ProofFormat = 'unicode',
): string {
  const lines = provenance.steps.map((step, idx) => {
    const expr = formatOp(step, format);
    if (format === 'latex') {
      const name = step.result.name.replace(/_/g, '\\_');
      return `${idx + 1}. &\\quad \\text{[${step.ruleId}]} & \\texttt{${name}} &= ${expr} = ${step.result.value} \\\\`;
    }
    if (format === 'typst') {
      return `${idx + 1}. \`[${step.ruleId}]\` \`${step.result.name}\` = $ ${expr} = ${step.result.value} $`;
    }
    return `${String(idx + 1).padStart(2, ' ')}. [${step.ruleId}] ${step.result.name} = ${expr} = ${step.result.value}`;
  });

  if (format === 'latex') {
    return ['\\begin{aligned}', ...lines, '\\end{aligned}'].join('\n');
  }
  return lines.join('\n');
}

function runDemo(format: ProofFormat): void {
  // Worked v3.0 example: 9♣ attacks Front 4♦, Back 5♠
  const ctx = {
    attackerType: 'number' as const,
    modeClassicAces: true,
    modeClassicFaceCards: true,
    modeDamagePersistence: 'classic' as const,
  };
  const frontCard = {
    card: { id: '4d', suit: 'diamonds' as const, face: '4', value: 4, type: 'number' as const },
    position: { row: 0, col: 0 },
    currentHp: 4,
    faceDown: false,
  };
  const backCard = {
    card: { id: '5s', suit: 'spades' as const, face: '5', value: 5, type: 'number' as const },
    position: { row: 1, col: 0 },
    currentHp: 5,
    faceDown: false,
  };

  const trace = new CombatCalculationTrace(9);
  const frontRes = resolveCardTransition(frontCard, 9, true, ctx);
  trace.recordCardTransition('frontCard', 9, frontRes, ctx);

  const boundaryIn = {
    carryover: frontRes.carryover,
    diamondShield: 4,
    clubEligible: true,
    specVersion: '3.0' as const,
  };
  const boundaryRes = resolveCardBoundary(boundaryIn);
  trace.recordCardBoundary(boundaryIn, boundaryRes);

  const backRes = resolveCardTransition(backCard, boundaryRes.carryover, false, ctx);
  trace.recordCardTransition('backCard', boundaryRes.carryover, backRes, ctx);

  const playerIn = {
    carryover: backRes.carryover,
    heartShield: 0,
    spadeWeapon: false,
    specVersion: '3.0' as const,
  };
  const playerRes = resolvePlayerBoundary(playerIn);
  trace.recordPlayerBoundary(playerIn, playerRes);

  const provenance = trace.finish();
  assert.equal(boundaryRes.carryover, 2, 'v3.0 Shield-before-Weapon: (5 - 4) * 2 = 2');
  assert.equal(backRes.remainingHp, 3, '5♠ survives at 3 HP');
  assert.equal(playerRes.damage, 0, '0 LP damage');

  console.log(`--- Symbolic Proof Trace (9♣ -> Front 4♦, Back 5♠) [${format}] ---`);
  console.log(formatCombatProofTrace(provenance, format));
}

if (process.argv.includes('--demo')) {
  const fmtIdx = process.argv.indexOf('--format');
  const format = ((fmtIdx !== -1 ? process.argv[fmtIdx + 1] : 'unicode') ??
    'unicode') as ProofFormat;
  runDemo(format);
}
