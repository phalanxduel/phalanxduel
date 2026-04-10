/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import type { GameState, Action, Card, PlayerState } from '@phalanxduel/shared';
import { getDeployTarget } from './state.js';

export interface BotConfig {
  strategy: 'random' | 'heuristic';
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
  const item = arr[Math.floor(rng() * arr.length)];
  if (item === undefined) throw new Error('pickRandom called on empty array');
  return item;
}

export function computeBotAction(
  gs: GameState,
  playerIndex: 0 | 1,
  config: BotConfig,
  timestamp = '1970-01-01T00:00:00.000Z',
): Action {
  const rng = mulberry32(config.seed);

  if (config.strategy === 'heuristic') {
    return computeHeuristicAction(gs, playerIndex, rng, timestamp);
  }

  return computeRandomAction(gs, playerIndex, rng, timestamp);
}

function computeRandomAction(
  gs: GameState,
  playerIndex: 0 | 1,
  rng: () => number,
  timestamp: string,
): Action {
  const player = gs.players[playerIndex];
  if (!player) throw new Error(`No player at index ${playerIndex}`);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const rows = gs.params?.rows ?? 2;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

function computeHeuristicAction(
  gs: GameState,
  playerIndex: 0 | 1,
  rng: () => number,
  timestamp: string,
): Action {
  switch (gs.phase) {
    case 'DeploymentPhase':
      return scoreDeployment(gs, playerIndex, rng, timestamp);
    case 'AttackPhase':
      return scoreAttack(gs, playerIndex, rng, timestamp);
    case 'ReinforcementPhase':
      if ((gs.players[playerIndex]?.hand.length ?? 0) === 0 || !gs.reinforcement) {
        return { type: 'pass', playerIndex, timestamp };
      }
      return {
        type: 'reinforce',
        playerIndex,
        cardId: pickRandom(gs.players[playerIndex]?.hand ?? [], rng).id,
        timestamp,
      };
    default:
      return { type: 'pass', playerIndex, timestamp };
  }
}

function scoreDeployment(gs: GameState, playerIdx: 0 | 1, rng: () => number, ts: string): Action {
  const player = gs.players[playerIdx];
  if (!player) return { type: 'pass', playerIndex: playerIdx, timestamp: ts };
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const rows = gs.params?.rows ?? 2;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const columns = gs.params?.columns ?? 4;

  if (player.hand.length === 0) return { type: 'pass', playerIndex: playerIdx, timestamp: ts };

  const validDeploys: { card: Card; col: number; score: number }[] = [];
  for (const card of player.hand) {
    for (let col = 0; col < columns; col++) {
      const targetIdx = getDeployTarget(player.battlefield, col, rows, columns);
      if (targetIdx === null) continue;

      let score = 10;
      if (player.battlefield[col] === null) score += 5;
      if (targetIdx < columns) score += card.value;

      validDeploys.push({ card, col, score });
    }
  }

  if (validDeploys.length === 0) return { type: 'pass', playerIndex: playerIdx, timestamp: ts };

  validDeploys.sort((a, b) => b.score - a.score);
  const topScore = validDeploys[0]?.score;
  const best = validDeploys.filter((d) => d.score === topScore);
  const choice = pickRandom(best, rng);
  return {
    type: 'deploy',
    playerIndex: playerIdx,
    column: choice.col,
    cardId: choice.card.id,
    timestamp: ts,
  };
}

function scoreAttack(gs: GameState, playerIdx: 0 | 1, rng: () => number, ts: string): Action {
  const player = gs.players[playerIdx];
  const opponent = gs.players[1 - playerIdx];
  if (!player || !opponent) return { type: 'pass', playerIndex: playerIdx, timestamp: ts };
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const columns = gs.params?.columns ?? 4;

  const attackers: { col: number; score: number }[] = [];
  for (let col = 0; col < columns; col++) {
    const attacker = player.battlefield[col];
    if (!attacker) continue;

    attackers.push({ col, score: evaluateAttackColumn(col, attacker, opponent, columns) });
  }

  if (attackers.length === 0) return { type: 'pass', playerIndex: playerIdx, timestamp: ts };

  attackers.sort((a, b) => b.score - a.score);
  const topAttackScore = attackers[0]?.score ?? 0;
  if (topAttackScore < 20 && rng() < 0.1) {
    return { type: 'pass', playerIndex: playerIdx, timestamp: ts };
  }

  const best = attackers.filter((a) => a.score === topAttackScore);
  const choice = pickRandom(best, rng);
  return {
    type: 'attack',
    playerIndex: playerIdx,
    attackingColumn: choice.col,
    defendingColumn: choice.col,
    timestamp: ts,
  };
}

function evaluateAttackColumn(
  col: number,
  attacker: NonNullable<PlayerState['battlefield'][number]>,
  opponent: PlayerState,
  columns: number,
): number {
  const defFront = opponent.battlefield[col];
  const defBack = opponent.battlefield[col + columns];

  if (!defFront && !defBack) {
    let score = 100 + attacker.card.value;
    if (attacker.card.suit === 'spades') score += 50;
    return score;
  }

  if (!defFront) return 10; // Should not happen in v1.0 but for completeness

  if (attacker.card.value >= defFront.currentHp) {
    let score = 50 + defFront.card.value;
    const overflow = attacker.card.value - defFront.currentHp;
    if (overflow > 0) {
      if (defBack) {
        score += overflow >= defBack.currentHp ? 30 + defBack.card.value : 10;
      } else {
        score += 40 + overflow;
      }
    }
    if (attacker.card.suit === 'clubs') score += 20;
    return score;
  }

  return 10 + attacker.card.value;
}
