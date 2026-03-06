import type {
  GameState,
  GridPosition,
  ServerMessage,
  DamageMode,
  PhalanxTurnResult,
} from '@phalanxduel/shared';

export type Screen = 'lobby' | 'waiting' | 'game' | 'gameOver';

export type HealthColor = 'green' | 'yellow' | 'red';

export interface ServerHealth {
  color: HealthColor;
  label: string;
  hint: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  elo: number;
}

export interface AppState {
  screen: Screen;
  user: AuthUser | null;
  matchId: string | null;
  playerId: string | null;
  playerIndex: number | null;
  playerName: string | null;
  gameState: GameState | null;
  selectedAttacker: GridPosition | null;
  selectedDeployCard: string | null; // cardId
  error: string | null;
  damageMode: DamageMode;
  startingLifepoints: number;
  serverHealth: ServerHealth | null;
  isSpectator: boolean;
  spectatorCount: number;
  showHelp: boolean;
}

type Listener = (state: AppState) => void;

// --- Session storage helpers ---
const SESSION_KEY = 'phalanx_session';

interface StoredSession {
  matchId: string;
  playerId: string;
  playerIndex: number;
  playerName: string;
}

function saveSession(session: StoredSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getSavedSession(): StoredSession | null {
  return loadSession();
}

let state: AppState = {
  screen: 'lobby',
  user: null,
  matchId: null,
  playerId: null,
  playerIndex: null,
  playerName: null,
  gameState: null,
  selectedAttacker: null,
  selectedDeployCard: null,
  error: null,
  damageMode: 'classic',
  startingLifepoints: 20,
  serverHealth: null,
  isSpectator: false,
  spectatorCount: 0,
  showHelp: false,
};

const listeners: Listener[] = [];

export function getState(): AppState {
  return state;
}

function setState(partial: Partial<AppState>): void {
  state = { ...state, ...partial };
  for (const listener of listeners) {
    listener(state);
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

// Side-channel for PizzazzEngine: receives full turn result before state update
type TurnResultCallback = (result: PhalanxTurnResult) => void;
let turnResultCallback: TurnResultCallback | null = null;

export function onTurnResult(cb: TurnResultCallback): void {
  turnResultCallback = cb;
}

export function dispatch(message: ServerMessage): void {
  switch (message.type) {
    case 'matchCreated':
      saveSession({
        matchId: message.matchId,
        playerId: message.playerId,
        playerIndex: message.playerIndex,
        playerName: state.playerName ?? '',
      });
      setState({
        screen: 'waiting',
        matchId: message.matchId,
        playerId: message.playerId,
        playerIndex: message.playerIndex,
        error: null,
      });
      break;

    case 'matchJoined':
      clearMatchParam();
      saveSession({
        matchId: message.matchId,
        playerId: message.playerId,
        playerIndex: message.playerIndex,
        playerName: state.playerName ?? '',
      });
      setState({
        matchId: message.matchId,
        playerId: message.playerId,
        playerIndex: message.playerIndex,
        error: null,
      });
      break;

    case 'spectatorJoined':
      setState({
        screen: 'game',
        matchId: message.matchId,
        isSpectator: true,
        playerIndex: null,
        error: null,
      });
      break;

    case 'gameState': {
      const gs = message.result.postState;
      turnResultCallback?.(message.result);
      setState({
        screen: gs.phase === 'gameOver' ? 'gameOver' : 'game',
        gameState: gs,
        selectedAttacker: null,
        selectedDeployCard: null,
        error: null,
        spectatorCount: message.spectatorCount ?? 0,
      });
      break;
    }

    case 'actionError':
      setState({ error: message.error });
      break;

    case 'matchError':
      setState({ error: message.error });
      break;

    case 'opponentDisconnected':
      setState({ error: 'Opponent disconnected — waiting for reconnect...' });
      break;

    case 'opponentReconnected':
      setState({ error: null });
      break;

    case 'authenticated':
      // Handled by connection layer, not state dispatch
      break;

    case 'auth_error':
      // Handled by connection layer, not state dispatch
      break;
  }
}

export function selectAttacker(pos: GridPosition): void {
  setState({ selectedAttacker: pos, error: null });
}

export function selectDeployCard(cardId: string): void {
  setState({ selectedDeployCard: cardId, error: null });
}

export function clearSelection(): void {
  setState({ selectedAttacker: null, selectedDeployCard: null });
}

export function setUser(user: AuthUser | null): void {
  setState({ user });
}

export function setPlayerName(name: string): void {
  setState({ playerName: name });
}

export function setDamageMode(mode: DamageMode): void {
  setState({ damageMode: mode });
}

export function setStartingLifepoints(value: number): void {
  // Client-side guard; server schema is authoritative.
  const clamped = Math.max(1, Math.min(500, Math.trunc(value)));
  setState({ startingLifepoints: clamped });
}

export function setServerHealth(health: ServerHealth): void {
  setState({ serverHealth: health });
}

export function toggleHelp(): void {
  setState({ showHelp: !state.showHelp });
}

export function clearError(): void {
  setState({ error: null });
}

export function resetToLobby(): void {
  clearSession();
  clearMatchParam();
  setState({
    screen: 'lobby',
    matchId: null,
    playerId: null,
    playerIndex: null,
    playerName: null,
    gameState: null,
    selectedAttacker: null,
    error: null,
    damageMode: 'classic',
    startingLifepoints: 20,
    isSpectator: false,
    spectatorCount: 0,
    showHelp: false,
  });
}

function clearMatchParam(): void {
  const url = new URL(window.location.href);
  if (
    url.searchParams.has('match') ||
    url.searchParams.has('mode') ||
    url.searchParams.has('watch')
  ) {
    url.searchParams.delete('match');
    url.searchParams.delete('mode');
    url.searchParams.delete('watch');
    window.history.replaceState({}, '', url.toString());
  }
}
