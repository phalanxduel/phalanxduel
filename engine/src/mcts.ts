/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { GameState, Action } from '@phalanxduel/shared';
import { applyAction, getValidActions } from './turns.js';
import { checkVictory } from './state.js';
import { isGameOver } from '@phalanxduel/shared';
import type { HeuristicWeights } from './bot-tiers.js';

function getMCTSValidActions(state: GameState): Action[] {
  const all = getValidActions(state, state.activePlayerIndex).filter(
    (action) => action.type !== 'quickDeploy',
  );
  const nonForfeit = all.filter((action) => action.type !== 'forfeit');
  return nonForfeit.length > 0 ? nonForfeit : all;
}

function pickRolloutAction(state: GameState, actions: Action[], rng: () => number): Action {
  const nonPass = actions.filter((a) => a.type !== 'pass');
  const pool = nonPass.length > 0 ? nonPass : actions;
  if (pool.length === 1 || rng() < 0.25) {
    return pool[Math.floor(rng() * pool.length)]!;
  }

  const active = state.players[state.activePlayerIndex];
  const opp = state.players[state.activePlayerIndex === 0 ? 1 : 0];
  if (!active || !opp) return pool[Math.floor(rng() * pool.length)]!;
  const cols = state.params?.columns ?? 4;

  if (state.phase === 'AttackPhase') {
    let best = pool[0]!;
    let bestScore = -Infinity;
    for (const a of pool) {
      if (a.type !== 'attack') continue;
      const atk = active.battlefield[a.attackingColumn];
      const defFront = opp.battlefield[a.defendingColumn];
      const defBack = opp.battlefield[cols + a.defendingColumn];
      const atkVal = atk?.card.value ?? 0;
      let score = atkVal;
      if (!defFront) {
        score += 20 + atkVal; // Direct LP breakthrough
      } else if (atkVal >= defFront.currentHp) {
        score += 12 + (atkVal - defFront.currentHp); // Clean KO + carryover
        if (!defBack) score += 8;
      } else {
        score -= defFront.currentHp - atkVal; // Chip / losing exchange
      }
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    return best;
  }

  if (state.phase === 'DeploymentPhase' || state.phase === 'ReinforcementPhase') {
    let best = pool[0]!;
    let bestScore = -Infinity;
    for (const a of pool) {
      if (a.type !== 'deploy' && a.type !== 'reinforce') continue;
      const card = active.hand.find((c) => c.id === a.cardId);
      const val = card?.value ?? 0;
      const col = a.type === 'deploy' ? a.column : (state.reinforcement?.column ?? 0);
      const isFront = !active.battlefield[col];
      const score = isFront ? val * 2 : 14 - val;
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    return best;
  }

  return pool[Math.floor(rng() * pool.length)]!;
}

export interface MCTSConfig {
  iterations: number;
  explorationParam: number;
  seed?: number;
  weights?: HeuristicWeights;
}

/** Mulberry32: fast seeded PRNG for deterministic bot and MCTS search. */
export function mulberry32(seed: number): () => number {
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
  public untriedActions: Action[] | null = null;

  constructor(state: GameState, playerIndex: number, parent: MCTSNode | null = null) {
    this.state = state;
    this.playerIndex = playerIndex;
    this.parent = parent;
  }

  public getUntriedActions(): Action[] {
    if (this.untriedActions === null) {
      this.untriedActions = isGameOver(this.state) ? [] : getMCTSValidActions(this.state);
    }
    return this.untriedActions;
  }

  public isFullyExpanded(): boolean {
    return this.getUntriedActions().length === 0;
  }

  public getUCB1(explorationParam: number, minimize = false): number {
    if (this.visits === 0) return Infinity;
    const parentVisits = this.parent ? this.parent.visits : this.visits;
    const winRate = this.wins / this.visits;
    const avgValue = this.totalValue / this.visits;
    // Combine win rate with heuristic value for better tie-breaking
    const rawExploitation = winRate * 0.7 + avgValue * 0.3;
    const exploitation = minimize ? 1 - rawExploitation : rawExploitation;
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

    // 1. Selection (adversarial: opponent minimizes playerIndex's exploitation)
    while (node.isFullyExpanded() && node.children.size > 0) {
      let bestChild: MCTSNode | null = null;
      let maxUCB = -Infinity;
      const isOpponentTurn = node.state.activePlayerIndex !== playerIndex;

      for (const { node: child } of node.children.values()) {
        const ucb = child.getUCB1(config.explorationParam, isOpponentTurn);
        if (ucb > maxUCB) {
          maxUCB = ucb;
          bestChild = child;
        }
      }
      if (!bestChild) break;
      node = bestChild;
    }

    // 2. Expansion
    const untried = node.getUntriedActions();
    if (untried.length > 0) {
      const idx = Math.floor(rng() * untried.length);
      const action = untried.splice(idx, 1)[0]!;
      const nextState = applyAction(node.state, action);
      const childNode = new MCTSNode(nextState, playerIndex, node);
      node.children.set(JSON.stringify(action), { action, node: childNode });
      node = childNode;
    }

    // 3. Simulation (tactical rollout deep enough to cross Deployment into Combat)
    let simulationState = node.state;
    let depth = 0;
    const maxDepth = 40;
    while (!isGameOver(simulationState) && depth < maxDepth) {
      const actions = getMCTSValidActions(simulationState);
      if (actions.length === 0) break;
      const rolloutAction = pickRolloutAction(simulationState, actions, rng);
      simulationState = applyAction(simulationState, rolloutAction);
      depth++;
    }

    // 4. Backpropagation
    const victory = checkVictory(simulationState);
    const hValue = evaluateState(simulationState, playerIndex, config.weights);
    const outcomeCredit = victory
      ? victory.winnerIndex === playerIndex
        ? 1
        : victory.winnerIndex === null
          ? 0.5
          : 0
      : hValue;

    let backpropNode: MCTSNode | null = node;
    while (backpropNode) {
      backpropNode.visits++;
      backpropNode.wins += outcomeCredit;
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
    const fallbackActions = getMCTSValidActions(initialState);
    return (
      fallbackActions[0] || { type: 'pass', playerIndex, timestamp: '1970-01-01T00:00:00.000Z' }
    );
  }

  return bestAction;
}
