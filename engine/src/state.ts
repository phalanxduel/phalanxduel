import { RANK_VALUES } from '@phalanx/shared';
import type { GameState, PlayerState, Battlefield } from '@phalanx/shared';
import { createDeck, shuffleDeck } from './deck.js';

function emptyBattlefield(): Battlefield {
  return [null, null, null, null, null, null, null, null];
}

function createPlayerState(id: string, name: string, seed: number): PlayerState {
  const deck = createDeck();
  const drawpile = shuffleDeck(deck, seed);
  return {
    player: { id, name },
    hand: [],
    battlefield: emptyBattlefield(),
    drawpile,
    discardPile: [],
    lifepoints: 20,
  };
}

export interface GameConfig {
  players: [{ id: string; name: string }, { id: string; name: string }];
  rngSeed: number;
}

/**
 * Create the initial game state for two players.
 * Each player gets a shuffled deck as their drawpile.
 * Uses different derived seeds for each player to avoid identical decks.
 */
export function createInitialState(config: GameConfig): GameState {
  const { players, rngSeed } = config;

  return {
    players: [
      createPlayerState(players[0].id, players[0].name, rngSeed),
      createPlayerState(players[1].id, players[1].name, rngSeed ^ 0x12345678),
    ],
    activePlayerIndex: 0,
    phase: 'setup',
    turnNumber: 0,
    rngSeed,
    transactionLog: [],
  };
}

function getPlayer(state: GameState, playerIndex: number): PlayerState {
  const player = state.players[playerIndex];
  if (!player) {
    throw new Error(`Invalid player index: ${playerIndex}`);
  }
  return player;
}

function setPlayer(state: GameState, playerIndex: number, player: PlayerState): GameState {
  const players: [PlayerState, PlayerState] = [state.players[0]!, state.players[1]!];
  players[playerIndex] = player;
  return { ...state, players };
}

/**
 * Draw `count` cards from a player's drawpile into their hand.
 * Returns a new GameState with updated hand and drawpile.
 */
export function drawCards(state: GameState, playerIndex: number, count: number): GameState {
  const player = getPlayer(state, playerIndex);
  if (player.drawpile.length < count) {
    throw new Error(`Not enough cards in drawpile: need ${count}, have ${player.drawpile.length}`);
  }

  const drawn = player.drawpile.slice(0, count);
  const remainingPile = player.drawpile.slice(count);

  return setPlayer(state, playerIndex, {
    ...player,
    hand: [...player.hand, ...drawn],
    drawpile: remainingPile,
  });
}

/**
 * PHX-DEPLOY-001: Deploy a card from a player's hand to a battlefield position.
 * The position index maps to the 8-slot grid: 0-3 = front row (L-R), 4-7 = back row (L-R).
 */
export function deployCard(
  state: GameState,
  playerIndex: number,
  handCardIndex: number,
  gridIndex: number,
): GameState {
  const player = getPlayer(state, playerIndex);

  if (handCardIndex < 0 || handCardIndex >= player.hand.length) {
    throw new Error(`Invalid hand card index: ${handCardIndex}`);
  }
  if (gridIndex < 0 || gridIndex >= 8) {
    throw new Error(`Invalid grid index: ${gridIndex} (must be 0-7)`);
  }
  if (player.battlefield[gridIndex] !== null) {
    throw new Error(`Grid position ${gridIndex} is already occupied`);
  }

  const card = player.hand[handCardIndex];
  if (!card) {
    throw new Error(`No card at hand index: ${handCardIndex}`);
  }

  const row = gridIndex < 4 ? 0 : 1;
  const col = gridIndex % 4;
  const hp = RANK_VALUES[card.rank] ?? 0;

  const newHand = [...player.hand];
  newHand.splice(handCardIndex, 1);

  const newBattlefield = [...player.battlefield] as Battlefield;
  newBattlefield[gridIndex] = {
    card,
    position: { row, col },
    currentHp: hp,
    faceDown: false,
  };

  return setPlayer(state, playerIndex, {
    ...player,
    hand: newHand,
    battlefield: newBattlefield,
  });
}

/**
 * Get the grid index where a deploy card should be placed in a column.
 * Front row first (index = column), then back row (index = column + 4).
 * Returns null if column is full.
 */
export function getDeployTarget(battlefield: Battlefield, column: number): number | null {
  const frontIdx = column;
  if (battlefield[frontIdx] === null) return frontIdx;
  const backIdx = column + 4;
  if (battlefield[backIdx] === null) return backIdx;
  return null;
}

/**
 * PHX-REINFORCE-001: Move back row card to front row if front is empty.
 * Returns a new battlefield array (pure function).
 */
export function advanceBackRow(battlefield: Battlefield, column: number): Battlefield {
  const frontIdx = column;
  const backIdx = column + 4;
  if (battlefield[frontIdx] !== null || battlefield[backIdx] === null) {
    return battlefield;
  }
  const card = battlefield[backIdx]!;
  const newBf = [...battlefield] as Battlefield;
  newBf[frontIdx] = {
    ...card,
    position: { row: 0, col: column },
  };
  newBf[backIdx] = null;
  return newBf;
}

/**
 * Check if both front and back row in a column are occupied.
 */
export function isColumnFull(battlefield: Battlefield, column: number): boolean {
  return battlefield[column] !== null && battlefield[column + 4] !== null;
}

/**
 * Get the grid index where a reinforcement card should be placed.
 * Prioritizes back row, then front row. Returns null if column is full.
 */
export function getReinforcementTarget(battlefield: Battlefield, column: number): number | null {
  const backIdx = column + 4;
  if (battlefield[backIdx] === null) return backIdx;
  const frontIdx = column;
  if (battlefield[frontIdx] === null) return frontIdx;
  return null;
}
