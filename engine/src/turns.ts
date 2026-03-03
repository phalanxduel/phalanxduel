/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import type {
  GameState,
  Action,
  GamePhase,
  VictoryType,
  PhaseHopTrace,
  TransactionLogEntry,
  TransactionDetail,
} from '@phalanxduel/shared';
import { resolveAttack } from './combat.js';
import {
  deployCard,
  advanceBackRow,
  isColumnFull,
  getReinforcementTarget,
  getDeployTarget,
  drawCards,
} from './state.js';
import { assertTransition } from './state-machine.js';
import type { TransitionTrigger } from './state-machine.js';

/**
 * Draw cards for a specific player up to maxHandSize.
 */
function performDrawPhase(state: GameState, playerIndex: number, timestamp: string): GameState {
  const player = state.players[playerIndex]!;
  const maxHand = state.params.maxHandSize;
  const currentHand = player.hand.length;
  const toDraw = Math.max(0, maxHand - currentHand);

  if (toDraw > 0 && player.drawpile.length > 0) {
    // Limit by drawpile size
    const count = Math.min(toDraw, player.drawpile.length);
    return drawCards(state, playerIndex, count, timestamp);
  }
  return state;
}

/**
 * Strip transactionLog from state before hashing to avoid circular dependency.
 */
function gameStateForHash(state: GameState): Omit<GameState, 'transactionLog'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { transactionLog: _txLog, ...rest } = state;
  return rest;
}

export interface ApplyActionOptions {
  hashFn?: (state: unknown) => string;
  timestamp?: string;
}

function stepPhase(
  state: GameState,
  trigger: TransitionTrigger,
  to: GamePhase,
  patch: Omit<Partial<GameState>, 'phase'> = {},
  onPhaseHop?: (from: GamePhase, trigger: TransitionTrigger, to: GamePhase) => void,
): GameState {
  assertTransition(state.phase, trigger, to);
  onPhaseHop?.(state.phase, trigger, to);
  return { ...state, ...patch, phase: to };
}

/**
 * Evaluates the current game state to determine if a victory condition has been met.
 *
 * @remarks
 * Implements:
 *
 * @param state - The current read-only game state.
 * @returns An object containing the winner index and victory type, or `null` if the game continues.
 */
export function checkVictory(
  state: GameState,
): { winnerIndex: number; victoryType: VictoryType } | null {
  // Victory by Pass Limit — checked first so a limit-triggered game-over is
  // not shadowed by a card/LP condition that fires in the same state.
  if (state.passState) {
    const rules = state.params.modePassRules;
    for (let i = 0; i < 2; i++) {
      const consecutive = state.passState.consecutivePasses[i] ?? 0;
      const total = state.passState.totalPasses[i] ?? 0;
      if (consecutive >= rules.maxConsecutivePasses || total >= rules.maxTotalPassesPerPlayer) {
        // Player i exceeded their pass limit — opponent wins.
        return { winnerIndex: i === 0 ? 1 : 0, victoryType: 'passLimit' };
      }
    }
  }

  for (let i = 0; i < 2; i++) {
    const opponent = state.players[i === 0 ? 1 : 0];
    if (!opponent) continue;

    // Victory by LP Depletion
    if (opponent.lifepoints <= 0) {
      return { winnerIndex: i, victoryType: 'lpDepletion' };
    }

    // Victory by Card Depletion
    // If opponent has no cards anywhere, they lose.
    const hasBattlefield = opponent.battlefield.some((s) => s !== null);
    const hasHand = opponent.hand.length > 0;
    const hasDrawpile = opponent.drawpile.length > 0;
    if (!hasBattlefield && !hasHand && !hasDrawpile) {
      return { winnerIndex: i, victoryType: 'cardDepletion' };
    }
  }
  return null;
}

/**
 */
export function validateAction(
  state: GameState,
  action: Action,
): { valid: boolean; error?: string } {
  switch (action.type) {
    case 'deploy': {
      if (state.phase !== 'DeploymentPhase') {
        return { valid: false, error: 'Can only deploy during DeploymentPhase' };
      }
      if (action.playerIndex !== state.activePlayerIndex) {
        return { valid: false, error: "Not this player's turn to deploy" };
      }
      const player = state.players[action.playerIndex];
      if (!player) return { valid: false, error: 'Invalid player index' };
      const hasCard = player.hand.some((c) => c.id === action.cardId);
      if (!hasCard) {
        return { valid: false, error: 'Card not found in hand' };
      }
      if (
        isColumnFull(player.battlefield, action.column, state.params.rows, state.params.columns)
      ) {
        return { valid: false, error: 'Column is full' };
      }
      return { valid: true };
    }

    case 'attack': {
      if (state.phase !== 'AttackPhase') {
        return { valid: false, error: 'Can only attack during AttackPhase' };
      }
      if (action.playerIndex !== state.activePlayerIndex) {
        return { valid: false, error: "Not this player's turn" };
      }
      // targetColumn must be same as attackingColumn
      if (action.defendingColumn !== action.attackingColumn) {
        return { valid: false, error: 'Can only attack the column directly across' };
      }
      const attacker = state.players[action.playerIndex]?.battlefield[action.attackingColumn];
      if (!attacker) {
        return { valid: false, error: 'No card at attacker position' };
      }
      return { valid: true };
    }

    case 'pass': {
      if (state.phase !== 'AttackPhase') {
        return { valid: false, error: 'Can only pass during AttackPhase' };
      }
      if (action.playerIndex !== state.activePlayerIndex) {
        return { valid: false, error: "Not this player's turn" };
      }
      return { valid: true };
    }

    case 'reinforce': {
      if (state.phase !== 'ReinforcementPhase') {
        return { valid: false, error: 'Can only reinforce during ReinforcementPhase' };
      }
      if (action.playerIndex !== state.activePlayerIndex) {
        return { valid: false, error: "Not this player's turn to reinforce" };
      }
      const reinforcePlayer = state.players[action.playerIndex];
      if (!reinforcePlayer) return { valid: false, error: 'Invalid player index' };
      const hasCard = reinforcePlayer.hand.some((c) => c.id === action.cardId);
      if (!hasCard) {
        return { valid: false, error: 'Card not found in hand' };
      }
      if (!state.reinforcement) {
        return { valid: false, error: 'No reinforcement context' };
      }
      return { valid: true };
    }

    case 'forfeit': {
      if (action.playerIndex !== state.activePlayerIndex) {
        return { valid: false, error: "Not this player's turn" };
      }
      return { valid: true };
    }

    case 'system:init': {
      if (state.phase !== 'StartTurn') {
        return { valid: false, error: 'Can only init from StartTurn phase' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: 'Unknown action type' };
  }
}

/**
 * Transitions the game from one state to the next by applying a player action.
 */
export function applyAction(
  state: GameState,
  action: Action,
  options?: ApplyActionOptions,
): GameState {
  const validation = validateAction(state, action);
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid action');
  }

  const hashFn = options?.hashFn;
  const timestamp = options?.timestamp ?? action.timestamp;
  const seqNum = (state.transactionLog ?? []).length;
  const hashBefore = hashFn ? hashFn(gameStateForHash(state)) : '';
  const phaseTrace: PhaseHopTrace[] = [];
  const transition = (
    currentState: GameState,
    trigger: TransitionTrigger,
    to: GamePhase,
    patch: Omit<Partial<GameState>, 'phase'> = {},
  ): GameState =>
    stepPhase(currentState, trigger, to, patch, (from, phaseTrigger, next) => {
      phaseTrace.push({ from, trigger: phaseTrigger, to: next });
    });

  let resultState: GameState;
  let details: TransactionDetail;

  switch (action.type) {
    case 'deploy': {
      const playerIndex = action.playerIndex;
      const player = state.players[playerIndex]!;
      const handIndex = player.hand.findIndex((c) => c.id === action.cardId);
      const targetColumn = action.column;

      const gridIndex = getDeployTarget(
        player.battlefield,
        targetColumn,
        state.params.rows,
        state.params.columns,
      );
      if (gridIndex === null) {
        throw new Error('Column is full');
      }

      let newState = deployCard(state, playerIndex, handIndex, gridIndex);

      // Check if deployment is complete for BOTH players
      const p0Full = newState.players[0]!.battlefield.every((s) => s !== null);
      const p1Full = newState.players[1]!.battlefield.every((s) => s !== null);

      if (p0Full && p1Full) {
        // Transition to AttackPhase
        const attackFirst = newState.params.initiative.attackFirst === 'P1' ? 0 : 1;
        newState = transition(newState, 'deploy:complete', 'AttackPhase', {
          activePlayerIndex: attackFirst as 0 | 1,
          turnNumber: 1,
        });
      } else {
        // Alternate player for next deployment
        newState = transition(newState, 'deploy', 'DeploymentPhase', {
          activePlayerIndex: playerIndex === 0 ? 1 : 0,
        });
      }

      resultState = newState;
      details = { type: 'pass' }; // Placeholder for deployment details
      break;
    }

    case 'attack': {
      const attackerGridIndex = action.attackingColumn;
      const targetGridIndex = action.defendingColumn;
      const defenderIndex = action.playerIndex === 0 ? 1 : 0;
      const targetCol = targetGridIndex % state.params.columns;

      // Reset the attacker's consecutive pass counter — they chose to attack.
      const attackPassState = state.passState
        ? {
            ...state.passState,
            consecutivePasses: [
              action.playerIndex === 0 ? 0 : state.passState.consecutivePasses[0],
              action.playerIndex === 1 ? 0 : state.passState.consecutivePasses[1],
            ] as [number, number],
          }
        : undefined;

      // 1. AttackPhase -> AttackResolution
      let newState: GameState = transition(state, 'attack', 'AttackResolution', {
        passState: attackPassState,
      });

      const attackResult = resolveAttack(
        newState,
        action.playerIndex,
        attackerGridIndex,
        targetGridIndex,
      );
      newState = attackResult.state;
      const combatEntry = attackResult.combatEntry;

      // Check victory immediately (LP depletion or card depletion from attack)
      const immediateVictory = checkVictory(newState);
      if (immediateVictory) {
        newState = transition(newState, 'attack:victory', 'gameOver', {
          outcome: { ...immediateVictory, turnNumber: state.turnNumber },
        });
        details = {
          type: 'attack',
          combat: combatEntry,
          reinforcementTriggered: false,
          victoryTriggered: true,
        };
      } else {
        // 2. AttackResolution -> CleanupPhase
        newState = transition(newState, 'system:advance', 'CleanupPhase');
        const frontAfter = newState.players[defenderIndex]!.battlefield[targetCol];
        if (frontAfter === null) {
          const advancedBf = advanceBackRow(
            newState.players[defenderIndex]!.battlefield,
            targetCol,
            newState.params.rows,
            newState.params.columns,
          );
          newState.players[defenderIndex]!.battlefield = advancedBf;
        }

        // 3. CleanupPhase -> ReinforcementPhase
        newState = transition(newState, 'system:advance', 'ReinforcementPhase');
        let reinforcementTriggered = false;
        const defender = newState.players[defenderIndex]!;
        if (
          defender.hand.length > 0 &&
          !isColumnFull(
            defender.battlefield,
            targetCol,
            newState.params.rows,
            newState.params.columns,
          )
        ) {
          reinforcementTriggered = true;
          newState.reinforcement = { column: targetCol, attackerIndex: action.playerIndex };
          // Switch active player to defender for reinforcement
          newState.activePlayerIndex = defenderIndex as 0 | 1;
        } else {
          // Skip reinforcement if not eligible
          newState = transition(newState, 'system:advance', 'DrawPhase');
        }

        // 4. If reinforcement NOT triggered, proceed to Draw and End
        if (!reinforcementTriggered) {
          // DrawPhase (for Attacker)
          newState = performDrawPhase(newState, action.playerIndex, timestamp);

          // EndTurn
          newState = transition(newState, 'system:advance', 'EndTurn', {
            activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
            turnNumber: state.turnNumber + 1,
          });
          // StartTurn (prep for next turn)
          newState = transition(newState, 'system:advance', 'StartTurn');

          // CHECK VICTORY AGAIN (Card depletion after draw/end)
          const finalVictory = checkVictory(newState);
          if (finalVictory) {
            newState = transition(newState, 'system:victory', 'gameOver', {
              outcome: { ...finalVictory, turnNumber: newState.turnNumber },
            });
          } else {
            newState = transition(newState, 'system:advance', 'AttackPhase');
          }
        }
        details = {
          type: 'attack',
          combat: combatEntry,
          reinforcementTriggered,
          victoryTriggered: false,
        };
      }
      resultState = newState;
      break;
    }

    case 'pass': {
      // 1. AttackPhase -> AttackResolution (no-op)
      let newState: GameState = transition(state, 'pass', 'AttackResolution');
      // 2. AttackResolution -> CleanupPhase
      newState = transition(newState, 'system:advance', 'CleanupPhase');
      // 3. CleanupPhase -> ReinforcementPhase (no-op)
      newState = transition(newState, 'system:advance', 'ReinforcementPhase');
      // 4. ReinforcementPhase -> DrawPhase
      newState = transition(newState, 'system:advance', 'DrawPhase');
      newState = performDrawPhase(newState, action.playerIndex, timestamp);
      // 5. DrawPhase -> EndTurn (increment pass counters for the passing player)
      const prevPassState = state.passState ?? {
        consecutivePasses: [0, 0] as [number, number],
        totalPasses: [0, 0] as [number, number],
      };
      const newConsecutive: [number, number] = [
        prevPassState.consecutivePasses[0],
        prevPassState.consecutivePasses[1],
      ];
      const newTotal: [number, number] = [
        prevPassState.totalPasses[0],
        prevPassState.totalPasses[1],
      ];
      const pi = action.playerIndex as 0 | 1;
      newConsecutive[pi] += 1;
      newTotal[pi] += 1;
      newState = transition(newState, 'system:advance', 'EndTurn', {
        activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
        turnNumber: state.turnNumber + 1,
        passState: { consecutivePasses: newConsecutive, totalPasses: newTotal },
      });
      // 6. EndTurn -> StartTurn -> AttackPhase
      newState = transition(newState, 'system:advance', 'StartTurn');
      const finalVictory = checkVictory(newState);
      if (finalVictory) {
        newState = transition(newState, 'system:victory', 'gameOver', {
          outcome: { ...finalVictory, turnNumber: newState.turnNumber },
        });
      } else {
        newState = transition(newState, 'system:advance', 'AttackPhase');
      }

      resultState = newState;
      details = { type: 'pass' };
      break;
    }

    case 'reinforce': {
      const ctx = state.reinforcement!;
      const player = state.players[action.playerIndex]!;
      const handIndex = player.hand.findIndex((c) => c.id === action.cardId);

      // Find where to place it
      const gridIndex = getReinforcementTarget(
        player.battlefield,
        ctx.column,
        state.params.rows,
        state.params.columns,
      );
      if (gridIndex === null) {
        throw new Error('Column is already full');
      }

      let newState: GameState = deployCard(state, action.playerIndex, handIndex, gridIndex);
      const updatedDefender = newState.players[action.playerIndex]!;
      const advancedBf = advanceBackRow(
        updatedDefender.battlefield,
        ctx.column,
        state.params.rows,
        state.params.columns,
      );
      updatedDefender.battlefield = advancedBf;
      newState = transition(newState, 'reinforce', 'ReinforcementPhase');

      const columnFull = isColumnFull(
        updatedDefender.battlefield,
        ctx.column,
        state.params.rows,
        state.params.columns,
      );
      const handEmpty = updatedDefender.hand.length === 0;

      let reinforcementComplete = false;
      let cardsDrawn = 0;

      if (columnFull || handEmpty) {
        reinforcementComplete = true;
        // ReinforcementPhase -> DrawPhase
        newState = transition(newState, 'reinforce:complete', 'DrawPhase');
        const handBefore = newState.players[action.playerIndex]!.hand.length;
        newState = performDrawPhase(newState, action.playerIndex, timestamp);
        const handAfter = newState.players[action.playerIndex]!.hand.length;
        cardsDrawn = handAfter - handBefore;

        // DrawPhase -> EndTurn
        // After reinforcement, the defending player (who just reinforced) gets
        // to attack next — not the original attacker again.
        newState = transition(newState, 'system:advance', 'EndTurn', {
          activePlayerIndex: action.playerIndex as 0 | 1,
          turnNumber: state.turnNumber + 1,
          reinforcement: undefined,
        });
        // EndTurn -> StartTurn -> AttackPhase
        newState = transition(newState, 'system:advance', 'StartTurn');
        const finalVictory = checkVictory(newState);
        if (finalVictory) {
          newState = transition(newState, 'system:victory', 'gameOver', {
            outcome: { ...finalVictory, turnNumber: newState.turnNumber },
          });
        } else {
          newState = transition(newState, 'system:advance', 'AttackPhase');
        }
      }

      details = {
        type: 'reinforce',
        column: ctx.column,
        gridIndex,
        cardsDrawn,
        reinforcementComplete,
      };
      resultState = newState;
      break;
    }

    case 'forfeit': {
      const winnerIndex = (action.playerIndex === 0 ? 1 : 0) as 0 | 1;
      resultState = transition(state, 'forfeit', 'gameOver', {
        outcome: {
          winnerIndex,
          victoryType: 'forfeit',
          turnNumber: state.turnNumber,
        },
      });
      details = { type: 'forfeit', winnerIndex };
      break;
    }

    case 'system:init': {
      if (state.params.modeClassicDeployment) {
        const deployFirst = state.params.initiative.deployFirst === 'P1' ? 0 : 1;
        resultState = transition(state, 'system:init', 'DeploymentPhase', {
          activePlayerIndex: deployFirst as 0 | 1,
        });
      } else {
        const attackFirst = state.params.initiative.attackFirst === 'P1' ? 0 : 1;
        resultState = transition(state, 'system:init', 'AttackPhase', {
          activePlayerIndex: attackFirst as 0 | 1,
          turnNumber: 1,
        });
      }
      details = { type: 'pass' }; // Reuse pass detail or similar for internal init
      break;
    }
  }

  // Build transaction log entry and append to result state
  const hashAfter = hashFn ? hashFn(gameStateForHash(resultState)) : '';
  const entry: TransactionLogEntry = {
    sequenceNumber: seqNum,
    action,
    stateHashBefore: hashBefore,
    stateHashAfter: hashAfter,
    timestamp,
    details,
    phaseTrace,
  };

  return {
    ...resultState,
    transactionLog: [...(state.transactionLog ?? []), entry],
  };
}
