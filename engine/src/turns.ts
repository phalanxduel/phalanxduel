import type { GameState, Battlefield, Action, PlayerState, VictoryType, TransactionLogEntry, TransactionDetail } from '@phalanxduel/shared';
import { resolveAttack, resetColumnHp } from './combat.js';
import { deployCard, getDeployTarget, advanceBackRow, isColumnFull, getReinforcementTarget } from './state.js';

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
 * - PHX-VICTORY-001: Card depletion victory
 * - PHX-LP-002: LP depletion victory
 * - PHX-REINFORCE-005: Victory check after reinforcement
 * 
 * @param state - The current read-only game state.
 * @returns An object containing the winner index and victory type, or `null` if the game continues.
 */
export function checkVictory(state: GameState): { winnerIndex: number; victoryType: VictoryType } | null {
  for (let i = 0; i < 2; i++) {
    const opponent = state.players[i === 0 ? 1 : 0];
    if (!opponent) continue;

    // PHX-LP-002: LP depletion victory
    if (opponent.lifepoints <= 0 && state.phase === 'combat') {
      return { winnerIndex: i, victoryType: 'lpDepletion' };
    }

    // PHX-VICTORY-001 + PHX-REINFORCE-005: Card depletion victory
    const hasBattlefield = opponent.battlefield.some(s => s !== null);
    const hasHand = opponent.hand.length > 0;
    const hasDrawpile = opponent.drawpile.length > 0;
    if (!hasBattlefield && !hasHand && !hasDrawpile && state.phase === 'combat') {
      return { winnerIndex: i, victoryType: 'cardDepletion' };
    }
  }
  return null;
}

/**
 * Count non-null cards on a battlefield.
 */
function battlefieldCardCount(battlefield: Battlefield): number {
  return battlefield.filter(s => s !== null).length;
}

/**
 * PHX-TURNS-001: Validate that an action is legal in the current state.
 */
export function validateAction(state: GameState, action: Action): { valid: boolean; error?: string } {
  switch (action.type) {
    case 'deploy': {
      if (state.phase !== 'deployment') {
        return { valid: false, error: 'Can only deploy during deployment phase' };
      }
      if (action.playerIndex !== state.activePlayerIndex) {
        return { valid: false, error: 'Not this player\'s turn to deploy' };
      }
      const player = state.players[action.playerIndex];
      if (!player) return { valid: false, error: 'Invalid player index' };
      const deployTarget = getDeployTarget(player.battlefield, action.column);
      if (deployTarget === null) {
        return { valid: false, error: 'Column is full' };
      }
      return { valid: true };
    }

    case 'attack': {
      if (state.phase !== 'combat') {
        return { valid: false, error: 'Can only attack during combat phase' };
      }
      if (action.playerIndex !== state.activePlayerIndex) {
        return { valid: false, error: 'Not this player\'s turn' };
      }
      // PHX-COMBAT-001: Only front-row cards can attack
      if (action.attackerPosition.row !== 0) {
        return { valid: false, error: 'Only front-row cards can attack' };
      }
      // PHX-COMBAT-001: Column-locked targeting — must attack same column
      if (action.targetPosition.col !== action.attackerPosition.col) {
        return { valid: false, error: 'Can only attack the column directly across' };
      }
      const attacker = state.players[action.playerIndex]?.battlefield[
        action.attackerPosition.row * 4 + action.attackerPosition.col
      ];
      if (!attacker) {
        return { valid: false, error: 'No card at attacker position' };
      }
      return { valid: true };
    }

    case 'pass': {
      return { valid: true };
    }

    case 'reinforce': {
      if (state.phase !== 'reinforcement') {
        return { valid: false, error: 'Can only reinforce during reinforcement phase' };
      }
      if (action.playerIndex !== state.activePlayerIndex) {
        return { valid: false, error: 'Not this player\'s turn to reinforce' };
      }
      const reinforcePlayer = state.players[action.playerIndex];
      if (!reinforcePlayer) return { valid: false, error: 'Invalid player index' };
      const hasCard = reinforcePlayer.hand.some(
        c => c.suit === action.card.suit && c.rank === action.card.rank,
      );
      if (!hasCard) {
        return { valid: false, error: 'Card not found in hand' };
      }
      if (!state.reinforcement) {
        return { valid: false, error: 'No reinforcement context' };
      }
      return { valid: true };
    }

    case 'forfeit': {
      // PHX-VICTORY-002: Forfeit is valid during combat or reinforcement on the player's turn
      if (state.phase !== 'combat' && state.phase !== 'reinforcement') {
        return { valid: false, error: 'Can only forfeit during combat or reinforcement phase' };
      }
      if (action.playerIndex !== state.activePlayerIndex) {
        return { valid: false, error: 'Not this player\'s turn' };
      }
      return { valid: true };
    }
  }
}

/**
 * Transitions the game from one state to the next by applying a player action.
 * 
 * @remarks
 * This is the main dispatcher for all game state transitions. It handles validation,
 * execution of the specific action logic, and updating the transaction log.
 * 
 * When `options.hashFn` is provided, the engine records state hashes before and 
 * after the transition, enabling verification of the deterministic path.
 * 
 * @param state - The previous game state.
 * @param action - The validated player action to apply.
 * @param options - Optional configuration for hashing and timestamps.
 * @returns The resulting game state.
 * @throws Error if the action is invalid according to {@link validateAction}.
 */
export function applyAction(state: GameState, action: Action, options?: ApplyActionOptions): GameState {
  const validation = validateAction(state, action);
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid action');
  }

  const hashFn = options?.hashFn;
  const timestamp = options?.timestamp ?? new Date().toISOString();
  const seqNum = (state.transactionLog ?? []).length;
  const hashBefore = hashFn ? hashFn(gameStateForHash(state)) : '';

  let resultState: GameState;
  let details: TransactionDetail;

  switch (action.type) {
    case 'deploy': {
      // Find the card in hand that matches
      const player = state.players[action.playerIndex]!;
      const handIndex = player.hand.findIndex(
        c => c.suit === action.card.suit && c.rank === action.card.rank,
      );
      if (handIndex === -1) {
        throw new Error('Card not found in hand');
      }
      const gridIndex = getDeployTarget(player.battlefield, action.column);
      if (gridIndex === null) {
        throw new Error('Column is full');
      }
      let newState = deployCard(state, action.playerIndex, handIndex, gridIndex);

      // Check if deployment is complete (both players have 8 cards on battlefield)
      const p0Cards = battlefieldCardCount(newState.players[0]!.battlefield);
      const p1Cards = battlefieldCardCount(newState.players[1]!.battlefield);
      if (p0Cards === 8 && p1Cards === 8) {
        // PHX-TURNS-001: player who deployed last (lost initiative) takes first combat turn
        const firstCombatPlayer = action.playerIndex;
        newState = {
          ...newState,
          phase: 'combat',
          activePlayerIndex: firstCombatPlayer,
          turnNumber: 1,
        };
      } else {
        // Alternate deployment turns
        newState = {
          ...newState,
          activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
        };
      }
      details = { type: 'deploy', gridIndex, phaseAfter: newState.phase };
      resultState = newState;
      break;
    }

    case 'attack': {
      const attackerGridIndex = action.attackerPosition.row * 4 + action.attackerPosition.col;
      const targetGridIndex = action.targetPosition.row * 4 + action.targetPosition.col;
      const defenderIndex = action.playerIndex === 0 ? 1 : 0;
      const targetCol = targetGridIndex % 4;

      // Snapshot before attack to detect destruction
      const frontBefore = state.players[defenderIndex]!.battlefield[targetCol];
      const backBefore = state.players[defenderIndex]!.battlefield[targetCol + 4];
      const attackResult = resolveAttack(state, action.playerIndex, attackerGridIndex, targetGridIndex);
      let newState = attackResult.state;
      const combatEntry = attackResult.combatEntry;
      const frontAfter = newState.players[defenderIndex]!.battlefield[targetCol];
      const backAfter = newState.players[defenderIndex]!.battlefield[targetCol + 4];

      // Check if any card in the column was destroyed (overflow can destroy both)
      const frontDestroyed = frontBefore !== null && frontAfter === null;
      const backDestroyed = backBefore !== null && backAfter === null;
      const anyDestroyed = frontDestroyed || backDestroyed;

      let reinforcementTriggered = false;
      let victoryTriggered = false;

      if (anyDestroyed) {
        // PHX-REINFORCE-001: auto-advance back row card (if front was destroyed and back survived)
        const advancedBf = advanceBackRow(newState.players[defenderIndex]!.battlefield, targetCol);
        const players: [typeof newState.players[0], typeof newState.players[1]] = [newState.players[0]!, newState.players[1]!];
        players[defenderIndex] = { ...players[defenderIndex]!, battlefield: advancedBf };
        newState = { ...newState, players };

        // PHX-REINFORCE-002: check if reinforcement phase should start
        const defender = newState.players[defenderIndex]!;
        const columnFull = isColumnFull(defender.battlefield, targetCol);
        const hasHandCards = defender.hand.length > 0;

        if (hasHandCards && !columnFull) {
          // Check victory first (defender might be out after this)
          const victory = checkVictory(newState);
          if (victory !== null) {
            victoryTriggered = true;
            newState = {
              ...newState,
              phase: 'gameOver',
              outcome: {
                winnerIndex: victory.winnerIndex,
                victoryType: victory.victoryType,
                turnNumber: newState.turnNumber,
              },
            };
          } else {
            reinforcementTriggered = true;
            newState = {
              ...newState,
              phase: 'reinforcement',
              activePlayerIndex: defenderIndex as 0 | 1,
              reinforcement: { column: targetCol, attackerIndex: action.playerIndex },
            };
          }
        }
      }

      // PHX-DAMAGE-001: In per-turn mode, reset surviving cards in attacked column to full HP
      if (newState.gameOptions?.damageMode === 'per-turn') {
        const resetBf = resetColumnHp(newState.players[defenderIndex]!.battlefield, targetCol);
        const resetPlayers: [typeof newState.players[0], typeof newState.players[1]] = [newState.players[0]!, newState.players[1]!];
        resetPlayers[defenderIndex] = { ...resetPlayers[defenderIndex]!, battlefield: resetBf };
        newState = { ...newState, players: resetPlayers };
      }

      if (!reinforcementTriggered && !victoryTriggered) {
        // Check victory
        const victory = checkVictory(newState);
        if (victory !== null) {
          victoryTriggered = true;
          newState = {
            ...newState,
            phase: 'gameOver',
            outcome: {
              winnerIndex: victory.winnerIndex,
              victoryType: victory.victoryType,
              turnNumber: newState.turnNumber,
            },
          };
        } else {
          // Alternate turns
          newState = {
            ...newState,
            activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
            turnNumber: state.turnNumber + 1,
            reinforcement: undefined,
          };
        }
      }

      details = { type: 'attack', combat: combatEntry, reinforcementTriggered, victoryTriggered };
      resultState = newState;
      break;
    }

    case 'pass': {
      resultState = {
        ...state,
        activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
        turnNumber: state.turnNumber + 1,
      };
      details = { type: 'pass' };
      break;
    }

    case 'reinforce': {
      const ctx = state.reinforcement!;
      const player = state.players[action.playerIndex]!;

      // Find card in hand
      const handIndex = player.hand.findIndex(
        c => c.suit === action.card.suit && c.rank === action.card.rank,
      );
      if (handIndex === -1) {
        throw new Error('Card not found in hand');
      }

      // Find where to place it
      const gridIndex = getReinforcementTarget(player.battlefield, ctx.column);
      if (gridIndex === null) {
        throw new Error('Column is already full');
      }

      // Deploy card using existing deployCard function
      let newState = deployCard(state, action.playerIndex, handIndex, gridIndex);

      // Auto-advance if we placed in back row and front is empty
      const defender = newState.players[action.playerIndex]!;
      const advancedBf = advanceBackRow(defender.battlefield, ctx.column);
      const players: [PlayerState, PlayerState] = [newState.players[0]!, newState.players[1]!];
      players[action.playerIndex] = { ...defender, battlefield: advancedBf };
      newState = { ...newState, players };

      // Check if reinforcement should continue
      const updatedDefender = newState.players[action.playerIndex]!;
      const columnFull = isColumnFull(updatedDefender.battlefield, ctx.column);
      const handEmpty = updatedDefender.hand.length === 0;

      let reinforcementComplete = false;
      let cardsDrawn = 0;

      if (columnFull || handEmpty) {
        reinforcementComplete = true;
        // PHX-REINFORCE-004: Draw to 4
        const cardsNeeded = Math.max(0, 4 - updatedDefender.hand.length);
        const cardsToDraw = Math.min(cardsNeeded, updatedDefender.drawpile.length);
        cardsDrawn = cardsToDraw;
        if (cardsToDraw > 0) {
          const drawn = updatedDefender.drawpile.slice(0, cardsToDraw);
          const remainingPile = updatedDefender.drawpile.slice(cardsToDraw);
          const drawnPlayers: [PlayerState, PlayerState] = [newState.players[0]!, newState.players[1]!];
          drawnPlayers[action.playerIndex] = {
            ...newState.players[action.playerIndex]!,
            hand: [...newState.players[action.playerIndex]!.hand, ...drawn],
            drawpile: remainingPile,
          };
          newState = { ...newState, players: drawnPlayers };
        }

        // Exit reinforcement, return to combat
        const nextPlayer = (ctx.attackerIndex === 0 ? 1 : 0) as 0 | 1;
        newState = {
          ...newState,
          phase: 'combat',
          activePlayerIndex: nextPlayer,
          turnNumber: state.turnNumber + 1,
          reinforcement: undefined,
        };
      }

      details = { type: 'reinforce', column: ctx.column, gridIndex, cardsDrawn, reinforcementComplete };
      resultState = newState;
      break;
    }

    case 'forfeit': {
      // PHX-VICTORY-002: Forfeit — opponent wins immediately
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

  resultState = {
    ...resultState,
    transactionLog: [...(state.transactionLog ?? []), entry],
  };

  return resultState;
}
