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
import { resolveAttack, resetColumnHp } from './combat.js';
import {
  deployCard,
  advanceBackRow,
  isColumnFull,
  getReinforcementTarget,
  getDeployTarget,
  drawCards,
} from './state.js';
import { assertTransition, canHandleAction } from './state-machine.js';
import type { TransitionTrigger } from './state-machine.js';
import type { PlayerState, Battlefield } from '@phalanxduel/shared';

/** Safely retrieve a player from state, throwing if missing. */
function getPlayer(state: GameState, index: number): PlayerState {
  const player = state.players[index];
  if (!player) throw new Error(`No player at index ${index}`);
  return player;
}

/**
 * Reset HP for all cards on a battlefield to their face value.
 * Used in Classic mode (RULES.md section 12: "No defense persists between turns").
 */
function resetAllColumnsHp(battlefield: Battlefield, columns: number): Battlefield {
  let bf = battlefield;
  for (let col = 0; col < columns; col++) {
    bf = resetColumnHp(bf, col, columns);
  }
  return bf;
}

/**
 * Apply Classic-mode HP reset to both players' battlefields.
 * In Classic mode, no card damage persists between turns.
 */
function applyClassicHpReset(state: GameState): GameState {
  if (state.params.modeDamagePersistence === 'cumulative') return state;
  const columns = state.params.columns;
  const players = [...state.players] as [PlayerState, PlayerState];
  for (let i = 0; i < 2; i++) {
    const p = players[i]!;
    players[i] = { ...p, battlefield: resetAllColumnsHp(p.battlefield, columns) };
  }
  return { ...state, players };
}

/**
 * Draw cards for a specific player up to maxHandSize.
 */
function performDrawPhase(state: GameState, playerIndex: number, timestamp: string): GameState {
  const player = getPlayer(state, playerIndex);
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
  const { transactionLog, ...rest } = state;
  void transactionLog;
  return rest;
}

function isSpecialStartWindowOpen(state: GameState): boolean {
  if (!state.params.modeSpecialStart.enabled) return false;
  return state.players.some((player) => player.battlefield.every((card) => card === null));
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
 */
export function checkVictory(
  state: GameState,
): { winnerIndex: number; victoryType: VictoryType } | null {
  // Victory by Pass Limit
  if (state.passState) {
    const rules = state.params.modePassRules;
    for (let i = 0; i < 2; i++) {
      const consecutive = state.passState.consecutivePasses[i] ?? 0;
      const total = state.passState.totalPasses[i] ?? 0;
      if (consecutive >= rules.maxConsecutivePasses || total >= rules.maxTotalPassesPerPlayer) {
        return { winnerIndex: i === 0 ? 1 : 0, victoryType: 'passLimit' };
      }
    }
  }

  for (let i = 0; i < 2; i++) {
    const opponent = state.players[i === 0 ? 1 : 0];
    if (!opponent) continue;

    if (opponent.lifepoints <= 0) {
      return { winnerIndex: i, victoryType: 'lpDepletion' };
    }

    const hasBattlefield = opponent.battlefield.some((s) => s !== null);
    const hasHand = opponent.hand.length > 0;
    const hasDrawpile = opponent.drawpile.length > 0;
    if (!hasBattlefield && !hasHand && !hasDrawpile) {
      return { winnerIndex: i, victoryType: 'cardDepletion' };
    }
  }

  // TASK-201: Check for deck exhaustion during initialization
  // If either player has zero cards in their drawpile at match start (and not yet in DeploymentPhase),
  // they cannot proceed.
  if (state.phase === 'StartTurn') {
    for (let i = 0; i < 2; i++) {
      const p = state.players[i];
      if (p?.drawpile.length === 0 && p.hand.length < state.params.initialDraw) {
        return { winnerIndex: i === 0 ? 1 : 0, victoryType: 'cardDepletion' };
      }
    }
  }

  return null;
}

/**
 * Options for applying an action to the game state.
 */
export interface ApplyActionOptions {
  /** Optional function to compute deterministic state hashes. */
  hashFn?: (state: unknown) => string;
  /** Optional timestamp to use for the transaction log entry. */
  timestamp?: string;
  /** Allow system:init action. Only internal callers (server init, replay, tests) should set this. */
  allowSystemInit?: boolean;
}

/**
 * Validates whether a given action is legal in the current game state.
 */
export function validateAction(
  state: GameState,
  action: Action,
  options?: ApplyActionOptions,
): { valid: boolean; error?: string; implicitPass?: boolean } {
  if (action.type === 'system:init') {
    if (!options?.allowSystemInit) {
      return { valid: false, error: 'system:init is an internal action' };
    }
  }

  if (!canHandleAction(state.phase, action.type)) {
    return {
      valid: false,
      error: `Action "${action.type}" is not allowed in phase "${state.phase}"`,
    };
  }

  if (
    action.type !== 'system:init' &&
    action.type !== 'forfeit' &&
    action.playerIndex !== state.activePlayerIndex
  ) {
    return { valid: false, error: "Not this player's turn" };
  }

  switch (action.type) {
    case 'deploy': {
      const player = state.players[action.playerIndex];
      if (!player) return { valid: false, error: 'Invalid player index' };
      if (action.column < 0 || action.column >= state.params.columns) {
        return { valid: false, error: 'Column out of range' };
      }
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
      const columns = state.params.columns;
      if (action.attackingColumn < 0 || action.attackingColumn >= columns) {
        return { valid: false, error: 'Only front-row cards can attack' };
      }
      if (action.defendingColumn !== action.attackingColumn) {
        return { valid: false, error: 'Can only attack the column directly across' };
      }
      const attacker = state.players[action.playerIndex]?.battlefield[action.attackingColumn];
      if (!attacker) {
        return { valid: false, error: 'No attacker at selected column' };
      }
      return { valid: true };
    }

    case 'reinforce': {
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

    case 'pass':
    case 'forfeit':
    case 'system:init':
      return { valid: true };

    default:
      return { valid: false, error: 'Unknown action type' };
  }
}

type TransitionFn = (
  currentState: GameState,
  trigger: TransitionTrigger,
  to: GamePhase,
  patch?: Omit<Partial<GameState>, 'phase'>,
) => GameState;

/** Handle the 'reinforce' action: place a card in the attacked column. */
function applyReinforce(
  state: GameState,
  action: Extract<Action, { type: 'reinforce' }>,
  timestamp: string,
  transition: TransitionFn,
): { resultState: GameState; details: TransactionDetail } {
  if (!state.reinforcement) throw new Error('No reinforcement context');
  const ctx = state.reinforcement;
  const player = getPlayer(state, action.playerIndex);
  const handIndex = player.hand.findIndex((c) => c.id === action.cardId);

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
  const updatedDefender = getPlayer(newState, action.playerIndex);
  updatedDefender.battlefield = advanceBackRow(
    updatedDefender.battlefield,
    ctx.column,
    state.params.rows,
    state.params.columns,
  );
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
    newState = transition(newState, 'reinforce:complete', 'DrawPhase');
    const handBefore = newState.players[action.playerIndex]?.hand.length ?? 0;
    newState = performDrawPhase(newState, action.playerIndex, timestamp);
    const handAfter = newState.players[action.playerIndex]?.hand.length ?? 0;
    cardsDrawn = handAfter - handBefore;

    newState = transition(newState, 'system:advance', 'EndTurn', {
      activePlayerIndex: action.playerIndex as 0 | 1,
      turnNumber: state.turnNumber + 1,
      reinforcement: undefined,
    });
    newState = applyClassicHpReset(newState);
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

  return {
    resultState: newState,
    details: {
      type: 'reinforce',
      column: ctx.column,
      gridIndex,
      cardsDrawn,
      reinforcementComplete,
    },
  };
}

/** Handle the 'deploy' action. */
function applyDeploy(
  state: GameState,
  action: Extract<Action, { type: 'deploy' }>,
  transition: TransitionFn,
): { resultState: GameState; details: TransactionDetail } {
  const playerIndex = action.playerIndex;
  const player = getPlayer(state, playerIndex);
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

  const p0Full = newState.players[0]?.battlefield.every((s) => s !== null) ?? false;
  const p1Full = newState.players[1]?.battlefield.every((s) => s !== null) ?? false;

  if (p0Full && p1Full) {
    const attackFirst = newState.params.initiative.attackFirst === 'P1' ? 0 : 1;
    newState = transition(newState, 'deploy:complete', 'AttackPhase', {
      activePlayerIndex: attackFirst,
      turnNumber: 1,
    });
  } else {
    newState = transition(newState, 'deploy', 'DeploymentPhase', {
      activePlayerIndex: playerIndex === 0 ? 1 : 0,
    });
  }

  return {
    resultState: newState,
    details: { type: 'deploy', gridIndex, phaseAfter: newState.phase },
  };
}

/** Handle the 'attack' action. */
function applyAttack(
  state: GameState,
  action: Extract<Action, { type: 'attack' }>,
  timestamp: string,
  transition: TransitionFn,
): { resultState: GameState; details: TransactionDetail } {
  const attackerGridIndex = action.attackingColumn;
  const targetGridIndex = action.defendingColumn;
  const defenderIndex = action.playerIndex === 0 ? 1 : 0;
  const targetCol = targetGridIndex % state.params.columns;

  const attackPassState = state.passState
    ? {
        ...state.passState,
        consecutivePasses: [
          action.playerIndex === 0 ? 0 : state.passState.consecutivePasses[0],
          action.playerIndex === 1 ? 0 : state.passState.consecutivePasses[1],
        ] as [number, number],
      }
    : undefined;

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

  const immediateVictory = checkVictory(newState);
  let reinforcementTriggered = false;
  let victoryTriggered = false;

  if (immediateVictory) {
    victoryTriggered = true;
    newState = transition(newState, 'attack:victory', 'gameOver', {
      outcome: { ...immediateVictory, turnNumber: state.turnNumber },
    });
  } else {
    newState = transition(newState, 'system:advance', 'CleanupPhase');
    const defenderPlayer = getPlayer(newState, defenderIndex);
    const frontAfter = defenderPlayer.battlefield[targetCol];
    if (frontAfter === null) {
      defenderPlayer.battlefield = advanceBackRow(
        defenderPlayer.battlefield,
        targetCol,
        newState.params.rows,
        newState.params.columns,
      );
    }

    newState = transition(newState, 'system:advance', 'ReinforcementPhase');
    const defender = getPlayer(newState, defenderIndex);
    if (
      defender.hand.length > 0 &&
      !isColumnFull(defender.battlefield, targetCol, newState.params.rows, newState.params.columns)
    ) {
      reinforcementTriggered = true;
      newState.reinforcement = { column: targetCol, attackerIndex: action.playerIndex };
      newState.activePlayerIndex = defenderIndex;
    } else {
      newState = transition(newState, 'system:advance', 'DrawPhase');
    }

    if (!reinforcementTriggered) {
      newState = performDrawPhase(newState, action.playerIndex, timestamp);
      newState = transition(newState, 'system:advance', 'EndTurn', {
        activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
        turnNumber: state.turnNumber + 1,
      });
      newState = applyClassicHpReset(newState);
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
  }

  return {
    resultState: newState,
    details: {
      type: 'attack',
      combat: combatEntry,
      reinforcementTriggered,
      victoryTriggered,
    },
  };
}

/** Handle the 'pass' action. */
function applyPass(
  state: GameState,
  action: Extract<Action, { type: 'pass' }>,
  timestamp: string,
  transition: TransitionFn,
  options: { countPass?: boolean } = {},
): { resultState: GameState; details: TransactionDetail } {
  const countPass = options.countPass ?? true;
  let newState: GameState;
  if (state.phase === 'ReinforcementPhase') {
    newState = transition(state, 'pass', 'DrawPhase');
    newState = performDrawPhase(newState, action.playerIndex, timestamp);
    newState = transition(newState, 'system:advance', 'EndTurn', {
      activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
      turnNumber: state.turnNumber + 1,
      reinforcement: undefined,
    });
    newState = applyClassicHpReset(newState);
    newState = transition(newState, 'system:advance', 'StartTurn');
  } else {
    newState = transition(state, 'pass', 'AttackResolution');
    newState = transition(newState, 'system:advance', 'CleanupPhase');
    newState = transition(newState, 'system:advance', 'ReinforcementPhase');
    newState = transition(newState, 'system:advance', 'DrawPhase');
    newState = performDrawPhase(newState, action.playerIndex, timestamp);
    const prevPassState = state.passState ?? {
      consecutivePasses: [0, 0] as [number, number],
      totalPasses: [0, 0] as [number, number],
    };
    const newConsecutive: [number, number] = [
      prevPassState.consecutivePasses[0],
      prevPassState.consecutivePasses[1],
    ];
    const newTotal: [number, number] = [prevPassState.totalPasses[0], prevPassState.totalPasses[1]];
    if (countPass) {
      const pi = action.playerIndex as 0 | 1;
      newConsecutive[pi] += 1;
      newTotal[pi] += 1;
    }
    newState = transition(newState, 'system:advance', 'EndTurn', {
      activePlayerIndex: action.playerIndex === 0 ? 1 : 0,
      turnNumber: state.turnNumber + 1,
      passState: { consecutivePasses: newConsecutive, totalPasses: newTotal },
    });
    newState = applyClassicHpReset(newState);
    newState = transition(newState, 'system:advance', 'StartTurn');
  }

  const finalVictory = checkVictory(newState);
  if (finalVictory) {
    newState = transition(newState, 'system:victory', 'gameOver', {
      outcome: { ...finalVictory, turnNumber: newState.turnNumber },
    });
  } else {
    newState = transition(newState, 'system:advance', 'AttackPhase');
  }

  return {
    resultState: newState,
    details: { type: 'pass' },
  };
}

/**
 * Transitions the game from one state to the next by applying a player action.
 */
export function applyAction(
  state: GameState,
  action: Action,
  options?: ApplyActionOptions,
): GameState {
  const validation = validateAction(state, action, options);
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
      const result = applyDeploy(state, action, transition);
      resultState = result.resultState;
      details = result.details;
      break;
    }

    case 'attack': {
      const result = applyAttack(state, action, timestamp, transition);
      resultState = result.resultState;
      details = result.details;
      break;
    }

    case 'pass': {
      const specialStartWindowOpen = isSpecialStartWindowOpen(state);
      const result = applyPass(state, action, timestamp, transition, {
        countPass: !specialStartWindowOpen,
      });
      resultState = result.resultState;
      details = result.details;
      break;
    }

    case 'reinforce': {
      const result = applyReinforce(state, action, timestamp, transition);
      resultState = result.resultState;
      details = result.details;
      break;
    }

    case 'forfeit': {
      const winnerIndex = action.playerIndex === 0 ? 1 : 0;
      resultState = transition(state, 'forfeit', 'gameOver', {
        outcome: {
          winnerIndex,
          victoryType: 'forfeit',
          turnNumber: state.turnNumber,
        },
      });
      details = { type: 'forfeit', winnerIndex };
      // Ensure the action recorded in the log is fully schema-compliant
      action = {
        ...action,
        playerIndex: action.playerIndex,
      };
      break;
    }

    case 'system:init': {
      // TASK-201: If already in an active phase, system:init is a no-op (redundant call).
      if (
        state.phase === 'DeploymentPhase' ||
        state.phase === 'AttackPhase' ||
        state.phase === 'ReinforcementPhase'
      ) {
        resultState = transition(state, 'system:init', state.phase);
        details = { type: 'pass' };
        break;
      }

      const skipDeployment = state.params.modeQuickStart;
      const toPhase =
        state.params.modeClassicDeployment && !skipDeployment ? 'DeploymentPhase' : 'AttackPhase';
      const patch: Omit<Partial<GameState>, 'phase'> = {};

      if (skipDeployment) {
        patch.activePlayerIndex = state.params.initiative.attackFirst === 'P1' ? 0 : 1;
        patch.turnNumber = 1;
      } else if (toPhase === 'DeploymentPhase') {
        patch.activePlayerIndex = state.params.initiative.deployFirst === 'P1' ? 0 : 1;
      }

      resultState = transition(state, 'system:init', toPhase, patch);
      details = { type: 'system:init' };
      break;
    }
  }

  const hashAfter = hashFn ? hashFn(gameStateForHash(resultState)) : '';
  const entry: TransactionLogEntry = {
    sequenceNumber: seqNum,
    action,
    stateHashBefore: hashBefore,
    stateHashAfter: hashAfter,
    timestamp,
    details,
    phaseTrace,
    msgId: action.msgId ?? null,
  };

  return {
    ...resultState,
    transactionLog: [...(state.transactionLog ?? []), entry],
  };
}

/**
 * Returns a list of all legal actions for a specific player in the current state.
 */
/**
 * Returns a list of all legal actions for a given player in the current state.
 *
 * @param state - The current game state.
 * @param playerIndex - The index of the player (0 or 1).
 * @param timestamp - Optional timestamp to use for the candidate actions.
 *                    Callers should typically provide a deterministic timestamp if
 *                    intending to use these actions for immediate submission.
 *                    Defaults to '1970-01-01T00:00:00.000Z'.
 */
export function getValidActions(
  state: GameState,
  playerIndex: number,
  timestamp = '1970-01-01T00:00:00.000Z',
): Action[] {
  const actions: Action[] = [];
  const player = state.players[playerIndex];
  if (!player) return [];

  if (state.phase !== 'gameOver') {
    actions.push({ type: 'forfeit', playerIndex, timestamp });
  }

  if (playerIndex !== state.activePlayerIndex) {
    return actions;
  }

  const columns = state.params.columns;
  const rows = state.params.rows;

  switch (state.phase) {
    case 'StartTurn':
      // system:init is an internal action triggered by the server, not a valid player action.
      break;

    case 'DeploymentPhase':
      for (const card of player.hand) {
        for (let col = 0; col < columns; col++) {
          if (!isColumnFull(player.battlefield, col, rows, columns)) {
            actions.push({ type: 'deploy', playerIndex, column: col, cardId: card.id, timestamp });
          }
        }
      }
      break;

    case 'AttackPhase':
      actions.push({ type: 'pass', playerIndex, timestamp });
      for (let col = 0; col < columns; col++) {
        if (player.battlefield[col]) {
          actions.push({
            type: 'attack',
            playerIndex,
            attackingColumn: col,
            defendingColumn: col,
            timestamp,
          });
        }
      }
      break;

    case 'ReinforcementPhase':
      if (state.reinforcement && state.reinforcement.attackerIndex !== playerIndex) {
        for (const card of player.hand) {
          actions.push({ type: 'reinforce', playerIndex, cardId: card.id, timestamp });
        }
        actions.push({ type: 'pass', playerIndex, timestamp });
      }
      break;

    default:
      break;
  }

  return actions;
}
