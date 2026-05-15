/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { GameState, Action } from '@phalanxduel/shared';
import { applyAction, getValidActions } from './turns.js';
import { checkVictory } from './state.js';
import { isGameOver } from '@phalanxduel/shared';
import type { HeuristicWeights } from './bot-tiers.js';

export interface MCTSConfig {
  iterations: number;
  explorationParam: number;
  seed?: number;
  weights?: HeuristicWeights;
}

/** Mulberry32: fast seeded PRNG for deterministic MCTS. */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MCTSNode {
  public visits = 0;
  public wins = 0;
  public totalValue = 0; // Cumulative heuristic score
  public children = new Map<string, { action: Action; node: MCTSNode }>();
  public parent: MCTSNode | null = null;
  public state: GameState;
  public playerIndex: number;

  constructor(state: GameState, playerIndex: number, parent: MCTSNode | null = null) {
    this.state = state;
    this.playerIndex = playerIndex;
    this.parent = parent;
  }

  public isFullyExpanded(): boolean {
    const validActions = getValidActions(this.state, this.state.activePlayerIndex);
    return this.children.size === validActions.length;
  }

  public getUCB1(explorationParam: number): number {
    if (this.visits === 0) return Infinity;
    const parentVisits = this.parent ? this.parent.visits : this.visits;
    const winRate = this.wins / this.visits;
    const avgValue = this.totalValue / this.visits;
    // Combine win rate with heuristic value for better tie-breaking
    const exploitation = winRate * 0.7 + avgValue * 0.3;
    return exploitation + explorationParam * Math.sqrt(Math.log(parentVisits) / this.visits);
  }
}

/** Heuristic evaluation of the game state (0.0 to 1.0).
 *
 * Weight mapping (with default 1.0 values the formula is identical to the original):
 *   defenseBias            → scales lpScore contribution (0.4 base)
 *   columnDestructionBias  → scales bfScore contribution (0.3 base)
 *   attackBias             → scales handScore contribution (0.2 base)
 *   speedBias              → scales economyScore contribution (0.1 base)
 * Contributions are renormalized so the output stays in [0, 1].
 */
export function evaluateState(
  state: GameState,
  playerIndex: number,
  weights?: HeuristicWeights,
): number {
  const player = state.players[playerIndex];
  const opponent = state.players[playerIndex === 0 ? 1 : 0];
  if (!player || !opponent) return 0.5;

  // Win/Loss terminal state detection in heuristic
  if (player.lifepoints <= 0 && opponent.lifepoints <= 0) return 0.5;
  if (player.lifepoints <= 0) return 0;
  if (opponent.lifepoints <= 0) return 1;

  // 1. LP Components
  const pLp = player.lifepoints;
  const oLp = opponent.lifepoints;

  // 2. Battlefield presence
  const bfValue = player.battlefield.reduce((acc, c) => acc + (c ? c.currentHp : 0), 0);
  const oppBfValue = opponent.battlefield.reduce((acc, c) => acc + (c ? c.currentHp : 0), 0);
  const bfScore = bfValue === 0 && oppBfValue === 0 ? 0.5 : bfValue / (bfValue + oppBfValue || 1);

  // 3. Hand advantage
  const handCount = player.hand.length;
  const oppHandCount = opponent.hand.length;
  const handScore =
    handCount === 0 && oppHandCount === 0 ? 0.5 : handCount / (handCount + oppHandCount || 1);

  if (!weights) {
    // Original formula mapping for baseline
    const lpScore = pLp === 0 && oLp === 0 ? 0.5 : pLp / (pLp + oLp || 1);
    const totalCards = player.drawpile.length + handCount;
    const oppTotalCards = opponent.drawpile.length + oppHandCount;
    const economyScore =
      totalCards === 0 && oppTotalCards === 0
        ? 0.5
        : totalCards / (totalCards + oppTotalCards || 1);
    return lpScore * 0.4 + bfScore * 0.3 + handScore * 0.2 + economyScore * 0.1;
  }

  // Refined semantic components
  // These are designed so that at P=20, O=20, they produce the same 0.5 baseline when weights=1.0
  const cDef = Math.min(pLp / 20, 1.5); // 1.0 at start
  const cAtk = Math.max(0, (20 - oLp) / 20); // 0.0 at start
  const cCol = bfScore; // 0.5 at start
  const cSpd = Math.max(0, Math.min(1.0, 0.5 + (20 - (pLp + oLp) / 2) / 40)); // 0.5 at start, 1.0 at end (0 LP)
  const cRes = handScore; // 0.5 at start

  const wDef = 0.2 * weights.defenseBias;
  const wAtk = 0.2 * weights.attackBias;
  const wCol = 0.3 * weights.columnDestructionBias;
  const wSpd = 0.1 * weights.speedBias;
  const wRes = 0.2; // Fixed Resource weight (handScore)

  const total = wDef + wAtk + wCol + wSpd + wRes;
  if (total === 0) return 0.5;

  return (cDef * wDef + cAtk * wAtk + cCol * wCol + cSpd * wSpd + cRes * wRes) / total;
}

export function runMCTS(
  initialState: GameState,
  playerIndex: number,
  config: MCTSConfig = { iterations: 100, explorationParam: 2.0 },
): Action {
  const rng = mulberry32(config.seed ?? 42);
  const root = new MCTSNode(initialState, playerIndex);

  for (let i = 0; i < config.iterations; i++) {
    let node = root;

    // 1. Selection
    while (node.isFullyExpanded() && node.children.size > 0) {
      let bestChild: MCTSNode | null = null;
      let maxUCB = -Infinity;

      for (const { node: child } of node.children.values()) {
        const ucb = child.getUCB1(config.explorationParam);
        if (ucb > maxUCB) {
          maxUCB = ucb;
          bestChild = child;
        }
      }
      if (!bestChild) break;
      node = bestChild;
    }

    // 2. Expansion
    if (!isGameOver(node.state)) {
      const validActions = getValidActions(node.state, node.state.activePlayerIndex);
      const untriedActions = validActions.filter((a) => !node.children.has(JSON.stringify(a)));

      if (untriedActions.length > 0) {
        const action = untriedActions[Math.floor(rng() * untriedActions.length)]!;
        const nextState = applyAction(node.state, action);
        const childNode = new MCTSNode(nextState, playerIndex, node);
        node.children.set(JSON.stringify(action), { action, node: childNode });
        node = childNode;
      }
    }

    // 3. Simulation
    let simulationState = node.state;
    let depth = 0;
    const maxDepth = 100; // Prevent infinite loops
    while (!isGameOver(simulationState) && depth < maxDepth) {
      const actions = getValidActions(simulationState, simulationState.activePlayerIndex);
      if (actions.length === 0) break;
      const randomAction = actions[Math.floor(rng() * actions.length)]!;
      simulationState = applyAction(simulationState, randomAction);
      depth++;
    }

    // 4. Backpropagation
    const victory = checkVictory(simulationState);
    const won = victory ? victory.winnerIndex === playerIndex : false;
    const hValue = evaluateState(simulationState, playerIndex, config.weights);

    let backpropNode: MCTSNode | null = node;
    while (backpropNode) {
      backpropNode.visits++;
      if (won) backpropNode.wins++;
      backpropNode.totalValue += hValue;
      backpropNode = backpropNode.parent;
    }
  }

  // Choose the best action (most visited child)
  let bestAction: Action | null = null;
  let maxVisits = -1;

  for (const { action, node: child } of root.children.values()) {
    if (child.visits > maxVisits) {
      maxVisits = child.visits;
      bestAction = action;
    }
  }

  if (!bestAction) {
    const fallbackActions = getValidActions(initialState, initialState.activePlayerIndex);
    return (
      fallbackActions[0] || { type: 'pass', playerIndex, timestamp: '1970-01-01T00:00:00.000Z' }
    );
  }

  return bestAction;
}
