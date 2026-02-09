import type { GameState, Battlefield, Action } from '@phalanx/shared';
import { resolveAttack, heroicalSwap, isValidTarget } from './combat.js';
import { deployCard } from './state.js';

/**
 * PHX-VICTORY-001: Check if a player has won.
 * Returns the winning player index, or null if no winner yet.
 */
export function checkVictory(state: GameState): number | null {
  for (let i = 0; i < 2; i++) {
    const opponent = state.players[i === 0 ? 1 : 0];
    if (!opponent) continue;
    const hasCards = opponent.battlefield.some(s => s !== null);
    if (!hasCards && state.phase === 'combat') {
      return i; // player i wins because opponent has no cards
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
      const gridIndex = action.position.row * 4 + action.position.col;
      if (player.battlefield[gridIndex] !== null) {
        return { valid: false, error: 'Position already occupied' };
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
      const attacker = state.players[action.playerIndex]?.battlefield[
        action.attackerPosition.row * 4 + action.attackerPosition.col
      ];
      if (!attacker) {
        return { valid: false, error: 'No card at attacker position' };
      }
      const defenderIndex = action.playerIndex === 0 ? 1 : 0;
      const targetGridIndex = action.targetPosition.row * 4 + action.targetPosition.col;
      if (!isValidTarget(state.players[defenderIndex]!.battlefield, targetGridIndex)) {
        return { valid: false, error: 'Invalid target' };
      }
      return { valid: true };
    }

    case 'heroicalSwap': {
      if (state.phase !== 'combat' && state.phase !== 'heroicalWindow') {
        return { valid: false, error: 'Can only swap during combat or heroical window' };
      }
      // Heroical swap is for the NON-active player (defender) during heroical window
      const player = state.players[action.playerIndex];
      if (!player) return { valid: false, error: 'Invalid player index' };
      const handCard = player.hand[action.handCardIndex];
      if (!handCard) return { valid: false, error: 'Invalid hand card index' };
      if (handCard.rank !== 'J' && handCard.rank !== 'Q' && handCard.rank !== 'K') {
        return { valid: false, error: 'Only Heroical cards can swap' };
      }
      const gridIndex = action.battlefieldPosition.row * 4 + action.battlefieldPosition.col;
      if (!player.battlefield[gridIndex]) {
        return { valid: false, error: 'No card at battlefield position to swap' };
      }
      return { valid: true };
    }

    case 'pass': {
      return { valid: true };
    }
  }
}

/**
 * Apply an action to the game state. Returns the new state.
 * This is the main dispatcher for all game actions.
 */
export function applyAction(state: GameState, action: Action): GameState {
  const validation = validateAction(state, action);
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid action');
  }

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
      const gridIndex = action.position.row * 4 + action.position.col;
      let newState = deployCard(state, action.playerIndex, handIndex, gridIndex);

      // Check if deployment is complete (both players have 8 cards on battlefield)
      const p0Cards = battlefieldCardCount(newState.players[0]!.battlefield);
      const p1Cards = battlefieldCardCount(newState.players[1]!.battlefield);
      if (p0Cards === 8 && p1Cards === 8) {
        // PHX-TURNS-001: player who deployed last takes first combat turn
        // That's the opposite of the active player (since active player just deployed last)
        const firstCombatPlayer = action.playerIndex === 0 ? 1 : 0;
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
      return newState;
    }

    case 'attack': {
      const attackerGridIndex = action.attackerPosition.row * 4 + action.attackerPosition.col;
      const targetGridIndex = action.targetPosition.row * 4 + action.targetPosition.col;
      let newState = resolveAttack(state, action.playerIndex, attackerGridIndex, targetGridIndex);

      // Check victory
      const winner = checkVictory(newState);
      if (winner !== null) {
        newState = { ...newState, phase: 'gameOver' };
      } else {
        // Alternate turns
        newState = {
          ...newState,
          activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
          turnNumber: state.turnNumber + 1,
        };
      }
      return newState;
    }

    case 'heroicalSwap': {
      const gridIndex = action.battlefieldPosition.row * 4 + action.battlefieldPosition.col;
      return heroicalSwap(state, action.playerIndex, action.handCardIndex, gridIndex);
    }

    case 'pass': {
      return {
        ...state,
        activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
      };
    }
  }
}
