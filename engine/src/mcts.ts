/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { GameState, Action } from '@phalanxduel/shared';
import { applyAction, getValidActions } from './turns.js';
import { checkVictory } from './state.js';
import { isGameOver } from '@phalanxduel/shared';

export interface MCTSConfig {
  iterations: number;
  explorationParam: number;
  seed?: number;
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

class MCTSNode {
  public visits = 0;
  public wins = 0;
  public totalValue = 0; // Cumulative heuristic score
  public children: Map<string, { action: Action; node: MCTSNode }> = new Map();
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

/** Heuristic evaluation of the game state (0.0 to 1.0) */
function evaluateState(state: GameState, playerIndex: number): number {
  const player = state.players[playerIndex];
  const opponent = state.players[playerIndex === 0 ? 1 : 0];
  if (!player || !opponent) return 0.5;

  // Win/Loss terminal state detection in heuristic
  if (player.lifepoints <= 0) return 0;
  if (opponent.lifepoints <= 0) return 1;

  // Normalize LP score (higher weighting as it's the primary win condition)
  const lpScore = player.lifepoints / (player.lifepoints + opponent.lifepoints || 1);

  // Battlefield presence (number of cards and their total value/health)
  const bfValue = player.battlefield.reduce((acc, c) => acc + (c ? c.currentHp : 0), 0);
  const oppBfValue = opponent.battlefield.reduce((acc, c) => acc + (c ? c.currentHp : 0), 0);
  const bfScore = bfValue / (bfValue + oppBfValue || 1);

  // Hand advantage
  const handCount = player.hand.length;
  const oppHandCount = opponent.hand.length;
  const handScore = handCount / (handCount + oppHandCount || 1);

  // Card economy (total remaining resources)
  const totalCards = player.drawpile.length + player.hand.length;
  const oppTotalCards = opponent.drawpile.length + opponent.hand.length;
  const economyScore = totalCards / (totalCards + oppTotalCards || 1);

  return lpScore * 0.4 + bfScore * 0.3 + handScore * 0.2 + economyScore * 0.1;
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
    const hValue = evaluateState(simulationState, playerIndex);

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
    return fallbackActions[0] || { type: 'pass', playerIndex, timestamp: new Date().toISOString() };
  }

  return bestAction;
}
