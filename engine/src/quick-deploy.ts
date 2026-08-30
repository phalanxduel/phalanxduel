/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { Action, Card, GameState, QuickDeployStrategy } from '@phalanxduel/shared';
import { getDeployTarget } from './state.js';

interface DeployTarget {
  column: number;
  gridIndex: number;
  row: number;
}

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function compareCards(left: Card, right: Card, strongestFirst: boolean): number {
  const valueOrder = strongestFirst ? right.value - left.value : left.value - right.value;
  return valueOrder || left.id.localeCompare(right.id);
}

function chooseRandom<T>(items: T[], key: (item: T) => string): T | undefined {
  return [...items].sort((left, right) => {
    const leftKey = key(left);
    const rightKey = key(right);
    return stableHash(leftKey) - stableHash(rightKey) || leftKey.localeCompare(rightKey);
  })[0];
}

/**
 * Pick the next otherwise-legal deployment action for a stored quick-deploy strategy.
 * Random choices are derived entirely from authoritative state so replay does not need
 * mutable RNG state or client-provided ordering.
 */
export function chooseQuickDeployAction(
  state: GameState,
  playerIndex: 0 | 1,
  strategy: QuickDeployStrategy,
  timestamp: string,
): Extract<Action, { type: 'deploy' }> | null {
  const player = state.players[playerIndex];
  if (!player || player.hand.length === 0) return null;

  const targets: DeployTarget[] = [];
  for (let column = 0; column < state.params.columns; column++) {
    const gridIndex = getDeployTarget(
      player.battlefield,
      column,
      state.params.rows,
      state.params.columns,
    );
    if (gridIndex !== null) {
      targets.push({
        column,
        gridIndex,
        row: Math.floor(gridIndex / state.params.columns),
      });
    }
  }
  if (targets.length === 0) return null;

  const deployedCount = player.battlefield.filter((card) => card !== null).length;
  const randomPrefix = `${state.matchId}:${player.player.id}:${deployedCount}`;

  let target: DeployTarget | undefined;
  let card: Card | undefined;

  if (strategy === 'random') {
    target = chooseRandom(targets, (candidate) => `${randomPrefix}:target:${candidate.gridIndex}`);
    card = chooseRandom(player.hand, (candidate) => `${randomPrefix}:card:${candidate.id}`);
  } else {
    const preferredRow =
      strategy === 'aggressive'
        ? Math.min(...targets.map((candidate) => candidate.row))
        : Math.max(...targets.map((candidate) => candidate.row));
    target = targets
      .filter((candidate) => candidate.row === preferredRow)
      .sort((left, right) => left.column - right.column)[0];

    const strongestFirst =
      (strategy === 'aggressive' && preferredRow === 0) ||
      (strategy === 'defensive' && preferredRow > 0);
    card = [...player.hand].sort((left, right) => compareCards(left, right, strongestFirst))[0];
  }

  if (!target || !card) return null;
  return {
    type: 'deploy',
    playerIndex,
    column: target.column,
    cardId: card.id,
    timestamp,
  };
}
