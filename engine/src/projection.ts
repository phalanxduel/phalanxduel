import type { GameState, PlayerState } from '@phalanxduel/shared';

/**
 * GameProjection is a narrow, deep interface around the raw GameState.
 * It provides semantic accessors to the state to prevent callers (like the server)
 * from having to traverse deeply nested structures (e.g. `state.players[1].player.id`).
 */
export class GameProjection {
  constructor(private readonly state: GameState) {}

  public get matchId(): string {
    return this.state.matchId;
  }

  public get isGameOver(): boolean {
    return this.state.phase === 'gameOver';
  }

  public get outcome(): GameState['outcome'] {
    return this.state.outcome ?? null;
  }

  public get winnerIndex(): number | null {
    return this.state.outcome?.winnerIndex ?? null;
  }

  public get activePlayerIndex(): number {
    return this.state.activePlayerIndex;
  }

  public get phase(): string {
    return this.state.phase;
  }

  public get turnNumber(): number {
    return this.state.turnNumber;
  }

  public getPlayerId(playerIndex: number): string | null {
    return this.state.players[playerIndex]?.player.id ?? null;
  }

  public getPlayerName(playerIndex: number): string | null {
    return this.state.players[playerIndex]?.player.name ?? null;
  }

  public getPlayerState(playerIndex: number): PlayerState | null {
    return this.state.players[playerIndex] ?? null;
  }

  public isPlayerTurn(playerId: string): boolean {
    if (this.isGameOver) return false;
    return this.getPlayerId(this.activePlayerIndex) === playerId;
  }

  public getPlayerIndex(playerId: string): number | null {
    if (this.getPlayerId(0) === playerId) return 0;
    if (this.getPlayerId(1) === playerId) return 1;
    return null;
  }

  public getRawState(): GameState {
    return this.state;
  }
}

/**
 * Helper to easily wrap a game state in the projection adapter.
 */
export function createProjection(state: GameState): GameProjection {
  return new GameProjection(state);
}
