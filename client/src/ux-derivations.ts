import type {
  Action,
  BattlefieldCard,
  CombatLogEntry,
  GameState,
  TransactionLogEntry,
} from '@phalanxduel/shared';

export type CombatFeedback = 'COLUMN_BROKEN' | 'DIRECT_PATH_OPEN' | 'SHIELD_LOST' | 'LP_DAMAGE';

export type ActionPreview =
  | 'WINNING_EXCHANGE'
  | 'EVEN_EXCHANGE'
  | 'LOSING_EXCHANGE'
  | 'DIRECT_DAMAGE_RISK';

export interface TurningPointSummary {
  turnNumber: number;
  label: string;
  why: string;
  result: string;
}

type AttackTransactionLogEntry = TransactionLogEntry & {
  details: { type: 'attack'; combat: CombatLogEntry };
};

const DEFAULT_QUICK_MATCH_NAME = 'OPERATIVE';

function getColumnCards(
  gs: GameState,
  playerIndex: number,
  column: number,
): {
  front: BattlefieldCard | null;
  back: BattlefieldCard | null;
} {
  const battlefield = gs.players[playerIndex]?.battlefield ?? [];
  const columns = gs.params.columns;
  return {
    front: battlefield[column] ?? null,
    back: battlefield[column + columns] ?? null,
  };
}

function countDestroyedCards(combat: CombatLogEntry): number {
  return combat.steps.filter((step) => step.destroyed).length;
}

export function getQuickMatchPlayerName(playerName: string | null | undefined): string {
  const trimmed = playerName?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : DEFAULT_QUICK_MATCH_NAME;
}

export function deriveCombatFeedback(combat: CombatLogEntry): CombatFeedback | null {
  if (combat.totalLpDamage > 0) return 'LP_DAMAGE';

  const destroyedSteps = combat.steps.filter((step) => step.destroyed);
  const hasShieldBonus = combat.steps.some((step) =>
    (step.bonuses ?? []).some(
      (bonus) => bonus === 'diamondDeathShield' || bonus === 'heartDeathShield',
    ),
  );

  if (hasShieldBonus) return 'SHIELD_LOST';
  if (destroyedSteps.length >= 2) return 'COLUMN_BROKEN';
  if (destroyedSteps.length === 1) return 'DIRECT_PATH_OPEN';

  return null;
}

export function deriveActionPreview(gs: GameState, action: Action): ActionPreview | null {
  if (action.type !== 'attack') return null;

  const attacker = gs.players[action.playerIndex]?.battlefield[action.attackingColumn] ?? null;
  if (!attacker) return null;

  const defenderIndex = action.playerIndex === 0 ? 1 : 0;
  const { front, back } = getColumnCards(gs, defenderIndex, action.defendingColumn);

  if (!front && !back) return 'DIRECT_DAMAGE_RISK';

  const attackerDamage = attacker.card.value;
  const frontHp = front?.currentHp ?? 0;
  const backHp = back?.currentHp ?? 0;
  const frontDestroyed = !front || attackerDamage >= frontHp;
  const overflowAfterFront = Math.max(0, attackerDamage - frontHp);
  const backDestroyed = overflowAfterFront > 0 && (!back || overflowAfterFront >= backHp);
  const lpRisk = overflowAfterFront > 0 && (!back || overflowAfterFront > backHp);

  if (lpRisk) return 'DIRECT_DAMAGE_RISK';
  if (frontDestroyed && backDestroyed) return 'WINNING_EXCHANGE';
  if (frontDestroyed || overflowAfterFront > 0) return 'EVEN_EXCHANGE';
  return 'LOSING_EXCHANGE';
}

function describeCombatTurn(combat: CombatLogEntry, feedback: CombatFeedback | null): string {
  switch (feedback) {
    case 'LP_DAMAGE':
      return 'LP damage landed';
    case 'SHIELD_LOST':
      return 'shield broke open';
    case 'COLUMN_BROKEN':
      return 'column collapsed';
    case 'DIRECT_PATH_OPEN':
      return 'direct path opened';
    default:
      return combat.totalLpDamage > 0 ? 'LP damage landed' : 'attack resolved';
  }
}

function summarizeResult(combat: CombatLogEntry, feedback: CombatFeedback | null): string {
  if (combat.totalLpDamage > 0) {
    return `${combat.totalLpDamage} LP damage to the defender.`;
  }
  if (feedback === 'SHIELD_LOST') {
    return 'A defensive shield absorbed the hit, then broke.';
  }
  if (feedback === 'COLUMN_BROKEN') {
    return 'Both rows in the target column were cleared.';
  }
  if (feedback === 'DIRECT_PATH_OPEN') {
    return 'The front line fell and exposed the lane.';
  }
  return 'The attack did not push through to the core.';
}

export function deriveTurningPoint(gs: GameState): TurningPointSummary | null {
  const entries = (gs.transactionLog ?? []).filter(
    (entry) => entry.details.type === 'attack',
  ) as AttackTransactionLogEntry[];

  if (entries.length === 0) return null;

  const outcome = gs.outcome ?? null;
  const loserIndex =
    outcome && outcome.winnerIndex >= 0 && outcome.winnerIndex <= 1
      ? 1 - outcome.winnerIndex
      : null;

  const firstLpDamage = entries.find((entry) => entry.details.combat.totalLpDamage > 0);
  if (firstLpDamage) {
    const combat = firstLpDamage.details.combat;
    const feedback = deriveCombatFeedback(combat);
    return {
      turnNumber: combat.turnNumber,
      label: describeCombatTurn(combat, feedback),
      why: 'First core damage of the match.',
      result: summarizeResult(combat, feedback),
    };
  }

  const collapseLeadingToDamage = entries.find((entry, index) => {
    const combat = entry.details.combat;
    const collapsed = countDestroyedCards(combat) >= 2;
    if (!collapsed) return false;
    return entries.slice(index + 1).some((later) => later.details.combat.totalLpDamage > 0);
  });
  if (collapseLeadingToDamage) {
    const combat = collapseLeadingToDamage.details.combat;
    return {
      turnNumber: combat.turnNumber,
      label: 'column collapsed',
      why: 'The lane was cleared before the core started taking damage.',
      result: 'Later attacks could reach LP through the open column.',
    };
  }

  const largestSwing = entries.reduce<AttackTransactionLogEntry | null>((best, entry) => {
    if (!best) return entry;
    const bestCombat = best.details.combat;
    const combat = entry.details.combat;
    const bestScore = bestCombat.totalLpDamage * 4 + countDestroyedCards(bestCombat) * 2;
    const score = combat.totalLpDamage * 4 + countDestroyedCards(combat) * 2;
    return score > bestScore ? entry : best;
  }, null);
  if (largestSwing) {
    const combat = largestSwing.details.combat;
    const feedback = deriveCombatFeedback(combat);
    return {
      turnNumber: combat.turnNumber,
      label: describeCombatTurn(combat, feedback),
      why: 'Largest material swing in the battle log.',
      result: summarizeResult(combat, feedback),
    };
  }

  const lastNegative = [...entries].reverse().find((entry) => {
    const combat = entry.details.combat;
    return combat.totalLpDamage > 0 || countDestroyedCards(combat) > 0;
  });
  if (lastNegative) {
    const combat = lastNegative.details.combat;
    const feedback = deriveCombatFeedback(combat);
    return {
      turnNumber: combat.turnNumber,
      label: describeCombatTurn(combat, feedback),
      why:
        loserIndex === null
          ? 'The final pressure point before game end.'
          : 'The losing side was forced onto the back foot.',
      result: summarizeResult(combat, feedback),
    };
  }

  const finalCombat = entries.at(-1)!.details.combat;
  return {
    turnNumber: finalCombat.turnNumber,
    label: 'final turn',
    why: 'Fallback summary from the last combat event.',
    result: 'The match reached its terminal state after this attack.',
  };
}

export function formatShareText(
  gs: GameState,
  turningPoint: TurningPointSummary | null,
  currentUrl: string,
  playerIndex: number | null,
): string {
  const outcome = gs.outcome ?? null;
  const resultLabel =
    outcome && playerIndex !== null
      ? outcome.winnerIndex === playerIndex
        ? 'Win'
        : 'Loss'
      : outcome
        ? 'Win/Loss'
        : 'Pending';

  const resultTurn = outcome ? outcome.turnNumber : (turningPoint?.turnNumber ?? gs.turnNumber);
  const turningPointLine = turningPoint
    ? `Turning Point: Turn ${turningPoint.turnNumber} — ${turningPoint.label}`
    : 'Turning Point: unavailable';

  return [
    'Phalanx Duel',
    `Result: ${resultLabel} on Turn ${resultTurn}`,
    turningPointLine,
    currentUrl,
  ].join('\n');
}
