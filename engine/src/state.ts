/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import type {
  GameState,
  PlayerState,
  Battlefield,
  BattlefieldCard,
  GameOptions,
  MatchParameters,
} from '@phalanxduel/shared';
import { DEFAULT_MATCH_PARAMS } from '@phalanxduel/shared';
import { createDeck, shuffleDeck } from './deck.js';

function emptyBattlefield(rows: number, columns: number): Battlefield {
  return Array(rows * columns).fill(null) as Battlefield;
}

function createPlayerState(
  id: string,
  name: string,
  seed: number,
  startingLifepoints: number,
  rows: number,
  columns: number,
): PlayerState {
  const deck = createDeck();
  const drawpile = shuffleDeck(deck, seed);
  return {
    player: { id, name },
    hand: [],
    battlefield: emptyBattlefield(rows, columns),
    drawpile,
    discardPile: [],
    lifepoints: startingLifepoints,
    deckSeed: seed,
  };
}

export interface GameConfig {
  matchId: string;
  players: [{ id: string; name: string }, { id: string; name: string }];
  rngSeed: number;
  gameOptions?: GameOptions;
  /** Fixed timestamp for deterministic card ID generation (used in tests/replay). */
  drawTimestamp?: string;
  matchParams?: MatchParameters;
}

/**
 * Pre-deploy cards from a player's hand onto their battlefield.
 * Fills columns left-to-right, front row first (same order as getDeployTarget).
 * Cards are placed face-up (revealed) since there is no deployment phase to reveal them.
 */
function quickDeployPlayer(player: PlayerState, rows: number, columns: number): PlayerState {
  const totalSlots = rows * columns;
  const toDeploy = Math.min(player.hand.length, totalSlots);
  const newBattlefield = [...player.battlefield] as Battlefield;
  const newHand = [...player.hand];

  let deployed = 0;
  for (let col = 0; col < columns && deployed < toDeploy; col++) {
    for (let row = 0; row < rows && deployed < toDeploy; row++) {
      const gridIndex = row * columns + col;
      if (newBattlefield[gridIndex] !== null) continue;

      const card = newHand.splice(0, 1)[0];
      if (!card) throw new Error('Expected card in hand during quick deploy');
      const bfCard: BattlefieldCard = {
        card,
        position: { row, col },
        currentHp: card.value,
        faceDown: false,
      };
      newBattlefield[gridIndex] = bfCard;
      deployed++;
    }
  }

  return { ...player, hand: newHand, battlefield: newBattlefield };
}

/**
 * Create the initial game state for two players.
 * Each player gets a shuffled deck as their drawpile.
 * Uses different derived seeds for each player to avoid identical decks.
 */
export function createInitialState(config: GameConfig): GameState {
  const { matchId, players, rngSeed } = config;
  const gameOptions = config.gameOptions;
  const resolvedMatchParams =
    config.matchParams ??
    ({
      ...DEFAULT_MATCH_PARAMS,
      modeClassicDeployment:
        gameOptions?.classicDeployment ?? DEFAULT_MATCH_PARAMS.modeClassicDeployment,
      modeQuickStart: gameOptions?.quickStart ?? DEFAULT_MATCH_PARAMS.modeQuickStart,
      modeDamagePersistence: gameOptions?.damageMode ?? DEFAULT_MATCH_PARAMS.modeDamagePersistence,
    } satisfies MatchParameters);
  const resolvedGameOptions = gameOptions ?? {
    damageMode: resolvedMatchParams.modeDamagePersistence,
    startingLifepoints: 20,
  };
  const startingLifepoints = resolvedGameOptions.startingLifepoints;
  const modeClassicDeployment = resolvedMatchParams.modeClassicDeployment;
  const modeQuickStart = resolvedMatchParams.modeQuickStart;

  // Read grid dimensions from matchParams, falling back to DEFAULT_MATCH_PARAMS
  const rows = resolvedMatchParams.rows;
  const columns = resolvedMatchParams.columns;
  const initialDraw = resolvedMatchParams.initialDraw;

  const baseState: GameState = {
    matchId,
    specVersion: '1.0',
    params: resolvedMatchParams,
    players: [
      createPlayerState(players[0].id, players[0].name, rngSeed, startingLifepoints, rows, columns),
      createPlayerState(
        players[1].id,
        players[1].name,
        rngSeed ^ 0x12345678,
        startingLifepoints,
        rows,
        columns,
      ),
    ],
    activePlayerIndex: 0,
    phase: 'StartTurn',
    turnNumber: 0,
    passState: {
      consecutivePasses: [0, 0] as [number, number],
      totalPasses: [0, 0] as [number, number],
    },
  };

  if (process.env.NODE_ENV !== 'test') {
    console.log(
      `[ENGINE] damageMode=${resolvedMatchParams.modeDamagePersistence} modeClassicDeployment=${baseState.params.modeClassicDeployment} modeQuickStart=${modeQuickStart} phase=${baseState.phase}`,
    );
  }

  const drawTimestamp = config.drawTimestamp ?? new Date().toISOString();
  let state: GameState = baseState;
  state = drawCards(state, 0, initialDraw, drawTimestamp);
  state = drawCards(state, 1, initialDraw, drawTimestamp);

  // Quick start: pre-deploy cards from hand to battlefield, skipping DeploymentPhase
  if (modeQuickStart && modeClassicDeployment) {
    const player0 = state.players[0];
    const player1 = state.players[1];
    if (!player0 || !player1) throw new Error('Missing player state during quick start');
    const p0 = quickDeployPlayer(player0, rows, columns);
    const p1 = quickDeployPlayer(player1, rows, columns);
    state = { ...state, players: [p0, p1] };
  }

  return state;
}

function getPlayer(state: GameState, playerIndex: number): PlayerState {
  const player = state.players[playerIndex];
  if (!player) {
    throw new Error(`Invalid player index: ${playerIndex}`);
  }
  return player;
}

function setPlayer(state: GameState, playerIndex: number, player: PlayerState): GameState {
  const p0 = state.players[0];
  const p1 = state.players[1];
  if (!p0 || !p1) throw new Error('Missing player state in setPlayer');
  const players: [PlayerState, PlayerState] = [p0, p1];
  players[playerIndex] = player;
  return { ...state, players };
}

/**
 * Draw `count` cards from a player's drawpile into their hand.
 * Returns a new GameState with updated hand and drawpile.
 * Card IDs are generated upon drawing to ensure determinism.
 */
export function drawCards(
  state: GameState,
  playerIndex: number,
  count: number,
  timestamp: string,
): GameState {
  const player = getPlayer(state, playerIndex);
  const actualCount = Math.min(count, player.drawpile.length);
  if (actualCount === 0) return state;

  const drawnPartial = player.drawpile.slice(0, actualCount);
  const remainingPile = player.drawpile.slice(actualCount);

  const drawn = drawnPartial.map((p, i) => {
    // Opaque ID: no card info encoded — prevents information leakage on face-down cards.
    // Deterministic for replay: same inputs always produce the same ID.
    const id = `${timestamp}::${state.matchId}::${player.player.id}::${state.turnNumber}::${i}`;
    return { ...p, id };
  });

  return setPlayer(state, playerIndex, {
    ...player,
    hand: [...player.hand, ...drawn],
    drawpile: remainingPile,
  });
}

/**
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
  const totalSlots = state.params.rows * state.params.columns;
  if (gridIndex < 0 || gridIndex >= totalSlots) {
    throw new Error(`Invalid grid index: ${gridIndex} (must be 0-${totalSlots - 1})`);
  }
  if (player.battlefield[gridIndex] !== null) {
    throw new Error(`Grid position ${gridIndex} is already occupied`);
  }

  const card = player.hand[handCardIndex];
  if (!card) {
    throw new Error(`No card at hand index: ${handCardIndex}`);
  }

  const columns = state.params.columns;
  const row = Math.floor(gridIndex / columns);
  const col = gridIndex % columns;
  const hp = card.value;

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
export function getDeployTarget(
  battlefield: Battlefield,
  column: number,
  rows = 2,
  columns = 4,
): number | null {
  for (let row = 0; row < rows; row++) {
    const idx = row * columns + column;
    if (battlefield[idx] === null) return idx;
  }
  return null;
}

/**
 * Returns a new battlefield array (pure function).
 */
export function advanceBackRow(
  battlefield: Battlefield,
  column: number,
  rows = 2,
  columns = 4,
): Battlefield {
  const newBf = [...battlefield] as Battlefield;
  for (let row = 0; row < rows - 1; row++) {
    const idx = row * columns + column;
    if (newBf[idx] === null) {
      for (let behindRow = row + 1; behindRow < rows; behindRow++) {
        const behindIdx = behindRow * columns + column;
        const behindCard = newBf[behindIdx];
        if (behindCard) {
          newBf[idx] = { ...behindCard, position: { row, col: column } };
          newBf[behindIdx] = null;
          break;
        }
      }
    }
  }
  return newBf;
}

/**
 * Check if both front and back row in a column are occupied.
 */
export function isColumnFull(
  battlefield: Battlefield,
  column: number,
  rows = 2,
  columns = 4,
): boolean {
  for (let row = 0; row < rows; row++) {
    if (battlefield[row * columns + column] === null) return false;
  }
  return true;
}

/**
 * Get the grid index where a reinforcement card should be placed.
 * Prioritizes back row, then front row. Returns null if column is full.
 */
export function getReinforcementTarget(
  battlefield: Battlefield,
  column: number,
  rows = 2,
  columns = 4,
): number | null {
  for (let row = rows - 1; row >= 0; row--) {
    const idx = row * columns + column;
    if (battlefield[idx] === null) return idx;
  }
  return null;
}
