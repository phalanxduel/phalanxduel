import type { BattlefieldCard } from '@phalanxduel/shared';
import type { AchievementDetector, DetectorResult } from './detector.js';

function boardCards(
  finalState: Parameters<AchievementDetector>[0]['finalState'],
  playerIndex: number,
): BattlefieldCard[] {
  return (finalState.players[playerIndex]?.battlefield ?? []).filter(
    (c): c is BattlefieldCard => c !== null,
  );
}

/**
 * FULL_HOUSE — player has 3 cards of one face value and 2 of another on the battlefield at end.
 */
export const fullHouseDetector: AchievementDetector = ({ finalState }) => {
  const results: DetectorResult[] = [];
  for (const playerIndex of [0, 1] as const) {
    const cards = boardCards(finalState, playerIndex);
    const countsByFace = new Map<string, number>();
    for (const c of cards) {
      const face = c.card.face;
      countsByFace.set(face, (countsByFace.get(face) ?? 0) + 1);
    }
    const counts = [...countsByFace.values()].sort((a, b) => b - a);
    if (counts.length >= 2 && counts[0]! >= 3 && counts[1]! >= 2) {
      results.push({ type: 'FULL_HOUSE', playerIndex });
    }
  }
  return results;
};

/**
 * DEUCE_COUP — a player destroys two rank-2 cards in a single attack's combat steps.
 */
export const deuceCoupDetector: AchievementDetector = ({ transactionLog }) => {
  const results: DetectorResult[] = [];
  const awarded = new Set<number>();

  for (const entry of transactionLog) {
    if (entry.details.type !== 'attack') continue;
    const { combat } = entry.details;
    if (awarded.has(combat.attackerPlayerIndex)) continue;

    const destroyedTwos = combat.steps.filter(
      (s) => s.card?.face === '2' && s.hpAfter !== undefined && s.hpAfter <= 0,
    );
    if (destroyedTwos.length >= 2) {
      awarded.add(combat.attackerPlayerIndex);
      results.push({
        type: 'DEUCE_COUP',
        playerIndex: combat.attackerPlayerIndex,
        metadata: { turn: combat.turnNumber, column: combat.targetColumn },
      });
    }
  }
  return results;
};

/**
 * TRIPLE_THREAT — a player deploys three cards of the same face value in consecutive own-turn
 * deploys. Requires resolving card face from the final state card pool (hand + battlefield +
 * discard) since the transaction log deploy detail only records gridIndex.
 */
export const tripleThreatDetector: AchievementDetector = ({ transactionLog, finalState }) => {
  const results: DetectorResult[] = [];

  // Build a cardId → face lookup from all cards visible in the final state.
  const cardFaceById = new Map<string, string>();
  for (const player of finalState.players) {
    if (!player) continue;
    for (const c of player.hand) cardFaceById.set(c.id, c.face);
    for (const c of player.discardPile) cardFaceById.set(c.id, c.face);
    for (const slot of player.battlefield) {
      if (slot) cardFaceById.set(slot.card.id, slot.card.face);
    }
  }

  for (const playerIndex of [0, 1] as const) {
    const deploys = transactionLog.filter(
      (e) =>
        e.details.type === 'deploy' &&
        e.action.type === 'deploy' &&
        e.action.playerIndex === playerIndex,
    );

    for (let i = 0; i <= deploys.length - 3; i++) {
      const a = deploys[i]!.action;
      const b = deploys[i + 1]!.action;
      const c = deploys[i + 2]!.action;
      if (a.type !== 'deploy' || b.type !== 'deploy' || c.type !== 'deploy') continue;

      const faceA = cardFaceById.get(a.cardId);
      const faceB = cardFaceById.get(b.cardId);
      const faceC = cardFaceById.get(c.cardId);
      if (faceA && faceA === faceB && faceB === faceC) {
        results.push({
          type: 'TRIPLE_THREAT',
          playerIndex,
          metadata: { face: faceA, startSequence: deploys[i]!.sequenceNumber },
        });
        break; // award once per player
      }
    }
  }
  return results;
};

/**
 * DEAD_MANS_HAND — a player has Aces (face 'A') AND Eights (face '8') in the back rank at end.
 * Back rank = the row farthest from the opponent (row index rows-1 in column-major layout).
 */
export const deadMansHandDetector: AchievementDetector = ({ finalState }) => {
  const results: DetectorResult[] = [];
  const { rows, columns } = finalState.params;

  for (const playerIndex of [0, 1] as const) {
    const battlefield = finalState.players[playerIndex]?.battlefield ?? [];
    // Battlefield: flat array, column-major. Slot = col * rows + row. Back rank = row (rows-1).
    const backRankCards = Array.from({ length: columns }, (_, col) => {
      const slot = battlefield[col * rows + (rows - 1)];
      return slot ?? null;
    }).filter((c): c is BattlefieldCard => c !== null);

    const hasAce = backRankCards.some((c) => c.card.face === 'A');
    const hasEight = backRankCards.some((c) => c.card.face === '8');
    if (hasAce && hasEight) {
      results.push({ type: 'DEAD_MANS_HAND', playerIndex });
    }
  }
  return results;
};

/**
 * FLAWLESS_VICTORY — Win the match without losing a single Lifepoint.
 */
export const flawlessVictoryDetector: AchievementDetector = ({ finalState, winnerIndex }) => {
  const winner = finalState.players[winnerIndex];
  if (!winner) return [];
  const startingLp = finalState.gameOptions?.startingLifepoints ?? 20;
  if (winner.lifepoints === startingLp) {
    return [{ type: 'FLAWLESS_VICTORY', playerIndex: winnerIndex }];
  }
  return [];
};

/**
 * BLITZKRIEG — Win the match in 8 turns or less.
 */
export const blitzkriegDetector: AchievementDetector = ({ finalState, winnerIndex }) => {
  if (finalState.turnNumber <= 8) {
    return [{ type: 'BLITZKRIEG', playerIndex: winnerIndex }];
  }
  return [];
};

/**
 * IRON_WALL — Successfully defend against 3 consecutive attacks without taking damage.
 */
export const ironWallDetector: AchievementDetector = ({ transactionLog }) => {
  const results: DetectorResult[] = [];
  for (const playerIndex of [0, 1] as const) {
    let consecutiveBlocks = 0;
    for (const entry of transactionLog) {
      if (entry.details.type !== 'attack') continue;

      const { combat } = entry.details;
      // If this player was the defender (target)
      if (combat.attackerPlayerIndex === playerIndex) continue;

      const tookDamage = combat.totalLpDamage > 0;
      if (tookDamage) {
        consecutiveBlocks = 0;
        continue;
      }

      consecutiveBlocks++;
      if (consecutiveBlocks >= 3) {
        results.push({ type: 'IRON_WALL', playerIndex });
        break; // award once per match
      }
    }
  }
  return results;
};

/**
 * OVERKILL — Deliver a final blow that exceeds the opponent's remaining lifepoints by 5 or more.
 */
export const overkillDetector: AchievementDetector = ({ transactionLog }) => {
  const results: DetectorResult[] = [];
  for (const entry of transactionLog) {
    if (entry.details.type === 'attack' && entry.details.victoryTriggered) {
      const { combat } = entry.details;
      // The last step of the final attack usually targets the playerLp
      const lastStep = combat.steps[combat.steps.length - 1];
      if (
        lastStep?.target === 'playerLp' &&
        lastStep.overflow !== undefined &&
        lastStep.overflow >= 5
      ) {
        results.push({
          type: 'OVERKILL',
          playerIndex: combat.attackerPlayerIndex,
          metadata: { overflow: lastStep.overflow },
        });
      }
    }
  }
  return results;
};

export const ALL_DETECTORS: AchievementDetector[] = [
  fullHouseDetector,
  deuceCoupDetector,
  tripleThreatDetector,
  deadMansHandDetector,
  flawlessVictoryDetector,
  blitzkriegDetector,
  ironWallDetector,
  overkillDetector,
];
