/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import type { GameState, Action } from '@phalanxduel/shared';
import { getDeployTarget } from './state.js';

export interface BotConfig {
  strategy: 'random';
  seed: number;
}

/** Mulberry32: fast seeded PRNG for deterministic bot decisions. */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export function computeBotAction(
  gs: GameState,
  playerIndex: 0 | 1,
  config: BotConfig,
  timestamp = new Date().toISOString(),
): Action {
  const rng = mulberry32(config.seed);
  const player = gs.players[playerIndex]!;
  const rows = gs.params?.rows ?? 2;
  const columns = gs.params?.columns ?? 4;

  switch (gs.phase) {
    case 'DeploymentPhase': {
      if (player.hand.length === 0) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const validCols: number[] = [];
      for (let col = 0; col < columns; col++) {
        if (getDeployTarget(player.battlefield, col, rows, columns) !== null) {
          validCols.push(col);
        }
      }
      if (validCols.length === 0) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const card = pickRandom(player.hand, rng);
      const col = pickRandom(validCols, rng);
      return { type: 'deploy', playerIndex, column: col, cardId: card.id, timestamp };
    }

    case 'AttackPhase': {
      const attackers: number[] = [];
      for (let col = 0; col < columns; col++) {
        if (player.battlefield[col]) {
          attackers.push(col);
        }
      }
      if (attackers.length === 0 || rng() < 0.2) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const atkCol = pickRandom(attackers, rng);
      return {
        type: 'attack',
        playerIndex,
        attackingColumn: atkCol,
        defendingColumn: atkCol,
        timestamp,
      };
    }

    case 'ReinforcementPhase': {
      if (player.hand.length === 0 || !gs.reinforcement) {
        return { type: 'pass', playerIndex, timestamp };
      }
      const card = pickRandom(player.hand, rng);
      return { type: 'reinforce', playerIndex, cardId: card.id, timestamp };
    }

    default:
      return { type: 'pass', playerIndex, timestamp };
  }
}
