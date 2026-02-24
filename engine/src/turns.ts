/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import type {
  GameState,
  Action,
  VictoryType,
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
      if (isColumnFull(player.battlefield, action.column)) {
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

  let resultState: GameState;
  let details: TransactionDetail;

  switch (action.type) {
    case 'deploy': {
      const playerIndex = action.playerIndex;
      const player = state.players[playerIndex]!;
      const handIndex = player.hand.findIndex((c) => c.id === action.cardId);
      const targetColumn = action.column;

      const gridIndex = getDeployTarget(player.battlefield, targetColumn);
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
        newState = {
          ...newState,
          phase: 'AttackPhase',
          activePlayerIndex: attackFirst as 0 | 1,
          turnNumber: 1,
        };
      } else {
        // Alternate player for next deployment
        newState = {
          ...newState,
          activePlayerIndex: playerIndex === 0 ? 1 : 0,
        };
      }

      resultState = newState;
      details = { type: 'pass' }; // Placeholder for deployment details
      break;
    }

    case 'attack': {
      const attackerGridIndex = action.attackingColumn;
      const targetGridIndex = action.defendingColumn;
      const defenderIndex = action.playerIndex === 0 ? 1 : 0;
      const targetCol = targetGridIndex % 4;

      // 1. AttackPhase -> AttackResolution
      let newState: GameState = { ...state, phase: 'AttackResolution' as const };

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
        newState = {
          ...newState,
          phase: 'gameOver',
          outcome: { ...immediateVictory, turnNumber: state.turnNumber },
        };
        details = {
          type: 'attack',
          combat: combatEntry,
          reinforcementTriggered: false,
          victoryTriggered: true,
        };
      } else {
        // 2. AttackResolution -> CleanupPhase
        newState = { ...newState, phase: 'CleanupPhase' as const };
        const frontAfter = newState.players[defenderIndex]!.battlefield[targetCol];
        if (frontAfter === null) {
          const advancedBf = advanceBackRow(
            newState.players[defenderIndex]!.battlefield,
            targetCol,
          );
          newState.players[defenderIndex]!.battlefield = advancedBf;
        }

        // 3. CleanupPhase -> ReinforcementPhase
        newState = { ...newState, phase: 'ReinforcementPhase' as const };
        let reinforcementTriggered = false;
        const defender = newState.players[defenderIndex]!;
        if (defender.hand.length > 0 && !isColumnFull(defender.battlefield, targetCol)) {
          reinforcementTriggered = true;
          newState.reinforcement = { column: targetCol, attackerIndex: action.playerIndex };
          // Switch active player to defender for reinforcement
          newState.activePlayerIndex = defenderIndex as 0 | 1;
        } else {
          // Skip reinforcement if not eligible
          newState = { ...newState, phase: 'DrawPhase' as const };
        }

        // 4. If reinforcement NOT triggered, proceed to Draw and End
        if (!reinforcementTriggered) {
          // DrawPhase (for Attacker)
          newState = { ...newState, phase: 'DrawPhase' as const };
          newState = performDrawPhase(newState, action.playerIndex, timestamp);

          // EndTurn
          newState = {
            ...newState,
            phase: 'EndTurn' as const,
            activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
            turnNumber: state.turnNumber + 1,
          };
          // StartTurn (prep for next turn)
          newState = { ...newState, phase: 'StartTurn' as const };

          // CHECK VICTORY AGAIN (Card depletion after draw/end)
          const finalVictory = checkVictory(newState);
          if (finalVictory) {
            newState = {
              ...newState,
              phase: 'gameOver',
              outcome: { ...finalVictory, turnNumber: newState.turnNumber },
            };
          } else {
            newState = { ...newState, phase: 'AttackPhase' as const };
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
      let newState: GameState = { ...state, phase: 'AttackResolution' as const };
      // 2. AttackResolution -> CleanupPhase
      newState = { ...newState, phase: 'CleanupPhase' as const };
      // 3. CleanupPhase -> ReinforcementPhase (no-op)
      newState = { ...newState, phase: 'ReinforcementPhase' as const };
      // 4. ReinforcementPhase -> DrawPhase
      newState = { ...newState, phase: 'DrawPhase' as const };
      newState = performDrawPhase(newState, action.playerIndex, timestamp);
      // 5. DrawPhase -> EndTurn
      newState = {
        ...newState,
        phase: 'EndTurn' as const,
        activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
        turnNumber: state.turnNumber + 1,
      };
      // 6. EndTurn -> StartTurn -> AttackPhase
      newState = { ...newState, phase: 'StartTurn' as const };
      const finalVictory = checkVictory(newState);
      if (finalVictory) {
        newState = {
          ...newState,
          phase: 'gameOver',
          outcome: { ...finalVictory, turnNumber: newState.turnNumber },
        };
      } else {
        newState = { ...newState, phase: 'AttackPhase' as const };
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
      const gridIndex = getReinforcementTarget(player.battlefield, ctx.column);
      if (gridIndex === null) {
        throw new Error('Column is already full');
      }

      let newState: GameState = deployCard(state, action.playerIndex, handIndex, gridIndex);
      const updatedDefender = newState.players[action.playerIndex]!;
      const advancedBf = advanceBackRow(updatedDefender.battlefield, ctx.column);
      updatedDefender.battlefield = advancedBf;

      const columnFull = isColumnFull(updatedDefender.battlefield, ctx.column);
      const handEmpty = updatedDefender.hand.length === 0;

      let reinforcementComplete = false;
      let cardsDrawn = 0;

      if (columnFull || handEmpty) {
        reinforcementComplete = true;
        // ReinforcementPhase -> DrawPhase
        newState = { ...newState, phase: 'DrawPhase' as const };
        const handBefore = newState.players[action.playerIndex]!.hand.length;
        newState = performDrawPhase(newState, action.playerIndex, timestamp);
        const handAfter = newState.players[action.playerIndex]!.hand.length;
        cardsDrawn = handAfter - handBefore;

        // DrawPhase -> EndTurn
        newState = {
          ...newState,
          phase: 'EndTurn' as const,
          activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
          turnNumber: state.turnNumber + 1,
          reinforcement: undefined,
        };
        // EndTurn -> StartTurn -> AttackPhase
        newState = { ...newState, phase: 'StartTurn' as const };
        const finalVictory = checkVictory(newState);
        if (finalVictory) {
          newState = {
            ...newState,
            phase: 'gameOver',
            outcome: { ...finalVictory, turnNumber: newState.turnNumber },
          };
        } else {
          newState = { ...newState, phase: 'AttackPhase' as const };
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
      resultState = {
        ...state,
        phase: 'gameOver',
        outcome: {
          winnerIndex,
          victoryType: 'forfeit',
          turnNumber: state.turnNumber,
        },
      };
      details = { type: 'forfeit', winnerIndex };
      break;
    }

    case 'system:init': {
      const deployFirst = state.params.initiative.deployFirst === 'P1' ? 0 : 1;
      resultState = {
        ...state,
        phase: 'DeploymentPhase',
        activePlayerIndex: deployFirst as 0 | 1,
      };
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
  };

  return {
    ...resultState,
    transactionLog: [...(state.transactionLog ?? []), entry],
  };
}
