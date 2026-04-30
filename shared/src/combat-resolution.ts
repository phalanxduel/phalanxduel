/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Pure derivation functions for combat explanation.
 * All inputs come from already-validated CombatLogEntry + TransactionDetail.attack fields.
 * Same inputs → identical output (deterministic, replay-safe).
 */

import type { CombatBonusType, CombatLogEntry, CombatLogStep, GameState } from './types.js';

// --- Types ---

export type ResolutionModifierKind = CombatBonusType;

export interface ResolutionModifier {
  kind: ResolutionModifierKind;
  appliedTo: 'frontCard' | 'backCard' | 'playerLp';
  /** Damage delta if computable from the step (e.g. overflow × 2 for clubs). */
  amount?: number;
}

export interface ResolutionOutcome {
  defenderFrontDestroyed: boolean;
  defenderBackDestroyed: boolean;
  /** Equals combat.totalLpDamage. */
  breakthroughDamage: number;
  playerDamaged: boolean;
  /** Front was destroyed and a back card existed to advance. */
  cardAdvanced: boolean;
  reinforcementRequired: boolean;
  victoryTriggered: boolean;
}

export type ResolutionCue =
  | { kind: 'flashAttacker' }
  | { kind: 'flashColumn'; column: number }
  | { kind: 'breakthroughBanner' }
  | { kind: 'shieldAbsorbed'; suit: 'diamonds' | 'hearts' }
  | { kind: 'columnCollapsed'; column: number }
  | { kind: 'reinforcePrompt'; column: number };

export interface CombatResolutionContext {
  type: 'attack_resolved';
  turnNumber: number;
  attackerPlayerIndex: number;
  defenderColumn: number;
  /** Undefined when mode was not available at derivation time (e.g. events path). */
  mode: 'classic' | 'cumulative' | undefined;
  baseAttack: number;
  modifiers: ResolutionModifier[];
  outcome: ResolutionOutcome;
  explanation: { headline: string; details: string[]; causeTags: string[] };
  resolutionCues: ResolutionCue[];
}

export type ColumnPressureState =
  | 'stable'
  | 'pressured'
  | 'exposed'
  | 'breakthroughRisk'
  | 'needsReinforcement';

export interface TurningPointSummary {
  turnNumber: number;
  label: string;
  why: string;
  result: string;
}

// --- Internal helpers ---

function buildModifiers(steps: readonly CombatLogStep[]): ResolutionModifier[] {
  const modifiers: ResolutionModifier[] = [];
  for (const step of steps) {
    const bonuses = step.bonuses;
    if (!bonuses) continue;
    for (const bonus of bonuses) {
      modifiers.push({ kind: bonus, appliedTo: step.target });
    }
  }
  return modifiers;
}

function buildOutcome(
  steps: readonly CombatLogStep[],
  totalLpDamage: number,
  reinforcementTriggered: boolean,
  victoryTriggered: boolean,
): ResolutionOutcome {
  const frontStep = steps.find((s) => s.target === 'frontCard');
  const backStep = steps.find((s) => s.target === 'backCard');

  const defenderFrontDestroyed = frontStep?.destroyed ?? false;
  const defenderBackDestroyed = backStep?.destroyed ?? false;

  return {
    defenderFrontDestroyed,
    defenderBackDestroyed,
    breakthroughDamage: totalLpDamage,
    playerDamaged: totalLpDamage > 0,
    // Card advanced if front was destroyed and a back row card was present (had a step)
    cardAdvanced: defenderFrontDestroyed && backStep !== undefined,
    reinforcementRequired: reinforcementTriggered,
    victoryTriggered,
  };
}

function buildHeadline(
  outcome: ResolutionOutcome,
  modifiers: readonly ResolutionModifier[],
): string {
  if (outcome.victoryTriggered) return 'Victory';
  if (outcome.playerDamaged) return 'LP damage landed';

  const hasShield = modifiers.some(
    (m) => m.kind === 'diamondDeathShield' || m.kind === 'heartDeathShield',
  );
  if (hasShield) return 'Shield lost';

  if (outcome.defenderFrontDestroyed && outcome.defenderBackDestroyed) return 'Column collapsed';
  if (outcome.defenderFrontDestroyed) return 'Direct path opened';

  return 'Attack resolved';
}

function buildDetails(outcome: ResolutionOutcome): string[] {
  const details: string[] = [];

  if (outcome.playerDamaged) {
    details.push(`${outcome.breakthroughDamage} LP damage dealt.`);
  }
  if (outcome.defenderFrontDestroyed && outcome.defenderBackDestroyed) {
    details.push('Both rows in the target column cleared.');
  } else if (outcome.defenderFrontDestroyed) {
    details.push('Front line fell, lane exposed.');
  }
  if (outcome.cardAdvanced) {
    details.push('Defender advanced back card to front.');
  }
  if (outcome.reinforcementRequired) {
    details.push('Defender must reinforce the column.');
  }
  if (outcome.victoryTriggered) {
    details.push('Match concluded.');
  }

  return details;
}

function buildCauseTags(
  modifiers: readonly ResolutionModifier[],
  outcome: ResolutionOutcome,
): string[] {
  const tags = new Set<string>();
  for (const m of modifiers) {
    tags.add(m.kind);
  }
  if (outcome.playerDamaged) tags.add('breakthrough');
  if (outcome.victoryTriggered) tags.add('victory');
  return Array.from(tags);
}

function buildResolutionCues(
  targetColumn: number,
  outcome: ResolutionOutcome,
  modifiers: readonly ResolutionModifier[],
): ResolutionCue[] {
  const cues: ResolutionCue[] = [];

  cues.push({ kind: 'flashAttacker' });
  cues.push({ kind: 'flashColumn', column: targetColumn });

  if (outcome.playerDamaged) {
    cues.push({ kind: 'breakthroughBanner' });
  }

  if (modifiers.some((m) => m.kind === 'diamondDeathShield')) {
    cues.push({ kind: 'shieldAbsorbed', suit: 'diamonds' });
  }
  if (modifiers.some((m) => m.kind === 'heartDeathShield')) {
    cues.push({ kind: 'shieldAbsorbed', suit: 'hearts' });
  }

  if (outcome.defenderFrontDestroyed && outcome.defenderBackDestroyed) {
    cues.push({ kind: 'columnCollapsed', column: targetColumn });
  }

  if (outcome.reinforcementRequired) {
    cues.push({ kind: 'reinforcePrompt', column: targetColumn });
  }

  return cues;
}

// --- Exported derivation functions ---

/**
 * Derives a self-contained, deterministic combat explanation from a CombatLogEntry
 * plus the three outcome booleans present on TransactionDetail.attack.
 *
 * Pure function: same inputs → identical output. Replay-safe.
 */
export function deriveCombatResolution(
  combat: CombatLogEntry,
  opts: {
    reinforcementTriggered: boolean;
    victoryTriggered: boolean;
    mode?: 'classic' | 'cumulative';
  },
): CombatResolutionContext {
  const modifiers = buildModifiers(combat.steps);
  const outcome = buildOutcome(
    combat.steps,
    combat.totalLpDamage,
    opts.reinforcementTriggered,
    opts.victoryTriggered,
  );
  const headline = buildHeadline(outcome, modifiers);
  const details = buildDetails(outcome);
  const causeTags = buildCauseTags(modifiers, outcome);
  const resolutionCues = buildResolutionCues(combat.targetColumn, outcome, modifiers);

  return {
    type: 'attack_resolved',
    turnNumber: combat.turnNumber,
    attackerPlayerIndex: combat.attackerPlayerIndex,
    defenderColumn: combat.targetColumn,
    mode: opts.mode,
    baseAttack: combat.baseDamage,
    modifiers,
    outcome,
    explanation: { headline, details, causeTags },
    resolutionCues,
  };
}

/**
 * Derives the pressure state of a single column for a given player.
 * Pure function of current GameState — no hidden state or side effects.
 */
export function deriveColumnPressure(
  state: GameState,
  playerIndex: 0 | 1,
  column: number,
): ColumnPressureState {
  // Active reinforcement phase for this column/player
  const reinforcement = state.reinforcement;
  if (reinforcement?.column === column) {
    const defenderIndex = reinforcement.attackerIndex === 0 ? 1 : 0;
    if (defenderIndex === playerIndex) {
      return 'needsReinforcement';
    }
  }

  const player = state.players[playerIndex];
  if (!player) return 'stable';

  const columns = state.params.columns;
  const front = player.battlefield[column] ?? null;
  const back = player.battlefield[column + columns] ?? null;

  if (front === null && back === null) return 'breakthroughRisk';
  if (front === null) return 'exposed';

  // Low HP threshold: card can be destroyed by most non-ace attackers
  const LOW_HP_THRESHOLD = 3;
  if (front.currentHp <= LOW_HP_THRESHOLD) return 'pressured';

  return 'stable';
}

// --- Turning point selection (moved from client/src/ux-derivations.ts) ---

function summarizeFromContext(ctx: CombatResolutionContext): string {
  if (ctx.outcome.playerDamaged) {
    return `${ctx.outcome.breakthroughDamage} LP damage to the defender.`;
  }
  if (ctx.modifiers.some((m) => m.kind === 'diamondDeathShield' || m.kind === 'heartDeathShield')) {
    return 'A defensive shield absorbed the hit, then broke.';
  }
  if (ctx.outcome.defenderFrontDestroyed && ctx.outcome.defenderBackDestroyed) {
    return 'Both rows in the target column were cleared.';
  }
  if (ctx.outcome.defenderFrontDestroyed) {
    return 'The front line fell and exposed the lane.';
  }
  return 'The attack did not push through to the core.';
}

/**
 * Identifies the most significant turning point in a completed match.
 * Replaces deriveTurningPoint in client/src/ux-derivations.ts.
 * Returns null if no attack entries exist.
 */
export function selectTurningPoint(state: GameState): TurningPointSummary | null {
  const attackEntries = (state.transactionLog ?? []).filter(
    (entry) => entry.details.type === 'attack',
  );

  if (attackEntries.length === 0) return null;

  interface ResolvedEntry {
    ctx: CombatResolutionContext;
  }

  const resolutions: ResolvedEntry[] = attackEntries.reduce<ResolvedEntry[]>((acc, entry) => {
    if (entry.details.type !== 'attack') return acc;
    acc.push({
      ctx: deriveCombatResolution(entry.details.combat, {
        reinforcementTriggered: entry.details.reinforcementTriggered,
        victoryTriggered: entry.details.victoryTriggered,
      }),
    });
    return acc;
  }, []);

  // Priority 1: column collapse that directly preceded LP damage — the cause beats the effect
  const collapseIndex = resolutions.findIndex(
    (r) => r.ctx.outcome.defenderFrontDestroyed && r.ctx.outcome.defenderBackDestroyed,
  );
  if (collapseIndex !== -1) {
    const laterDamage = resolutions
      .slice(collapseIndex + 1)
      .some((r) => r.ctx.outcome.playerDamaged);
    if (laterDamage) {
      const entry = resolutions[collapseIndex];
      if (entry) {
        return {
          turnNumber: entry.ctx.turnNumber,
          label: 'Column collapsed',
          why: 'The lane was cleared before the core started taking damage.',
          result: 'Later attacks could reach LP through the open column.',
        };
      }
    }
  }

  // Priority 2: first LP damage
  const firstLpDamage = resolutions.find((r) => r.ctx.outcome.playerDamaged);
  if (firstLpDamage) {
    const { ctx } = firstLpDamage;
    return {
      turnNumber: ctx.turnNumber,
      label: ctx.explanation.headline,
      why: 'First core damage of the match.',
      result: `${ctx.outcome.breakthroughDamage} LP damage to the defender.`,
    };
  }

  // Priority 3: largest material swing
  let bestScore = -1;
  let bestEntry: ResolvedEntry | null = null;
  for (const r of resolutions) {
    const destroyed =
      (r.ctx.outcome.defenderFrontDestroyed ? 1 : 0) +
      (r.ctx.outcome.defenderBackDestroyed ? 1 : 0);
    const score = r.ctx.outcome.breakthroughDamage * 4 + destroyed * 2;
    if (score > bestScore) {
      bestScore = score;
      bestEntry = r;
    }
  }
  if (bestEntry !== null && bestScore > 0) {
    const { ctx } = bestEntry;
    return {
      turnNumber: ctx.turnNumber,
      label: ctx.explanation.headline,
      why: 'Largest material swing in the battle log.',
      result: summarizeFromContext(ctx),
    };
  }

  // Priority 4: last significant action (any destruction or damage)
  const lastSignificant = [...resolutions]
    .reverse()
    .find(
      (r) =>
        r.ctx.outcome.playerDamaged ||
        r.ctx.outcome.defenderFrontDestroyed ||
        r.ctx.outcome.defenderBackDestroyed,
    );
  if (lastSignificant) {
    return {
      turnNumber: lastSignificant.ctx.turnNumber,
      label: lastSignificant.ctx.explanation.headline,
      why: 'The losing side was forced onto the back foot.',
      result: summarizeFromContext(lastSignificant.ctx),
    };
  }

  // Fallback: last attack
  const last = resolutions.at(-1);
  if (!last) return null;
  return {
    turnNumber: last.ctx.turnNumber,
    label: 'Final turn',
    why: 'Fallback summary from the last combat event.',
    result: 'The match reached its terminal state after this attack.',
  };
}
