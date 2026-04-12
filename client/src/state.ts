import type {
  Action,
  GameState,
  GridPosition,
  ServerMessage,
  DamageMode,
  PhalanxTurnResult,
} from '@phalanxduel/shared';

export type Screen = 'lobby' | 'waiting' | 'game' | 'gameOver' | 'auth';

export type HealthColor = 'green' | 'yellow' | 'red';

export interface ServerHealth {
  color: HealthColor;
  label: string;
  hint: string | null;
}

export interface AuthUser {
  id: string;
  gamertag: string;
  suffix: number | null;
  email: string;
  elo: number;
  favoriteSuit?: 'spades' | 'hearts' | 'diamonds' | 'clubs' | null;
  tagline?: string | null;
  avatarIcon?: string | null;
}

export interface AppState {
  connectionState: 'CONNECTING' | 'OPEN' | 'DISCONNECTED';
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
  validActions: Action[];
  isMobile: boolean;
  featureVectorBrutalism: boolean;
}

export type Listener = (state: AppState) => void;

// --- Session storage helpers ---
const SESSION_KEY = 'phalanx_session';
const PLAYER_NAME_KEY = 'phalanx_player_name';
const FEATURE_VECTOR_BRUTALISM_KEY = 'phalanx_feature_vector_brutalism';

export interface StoredSession {
  matchId: string;
  playerId: string;
  playerIndex: number;
  playerName: string;
}

function savePlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name);
  } catch {
    // Ignore (incognito or quota)
  }
}

function loadPlayerName(): string | null {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY);
  } catch {
    return null;
  }
}

function loadFeatureFlag(): boolean {
  try {
    const raw = localStorage.getItem(FEATURE_VECTOR_BRUTALISM_KEY);
    return raw !== '0';
  } catch {
    return true;
  }
}

function saveFeatureFlag(value: boolean): void {
  try {
    localStorage.setItem(FEATURE_VECTOR_BRUTALISM_KEY, value ? '1' : '0');
  } catch {
    // Ignore
  }
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
  connectionState: 'CONNECTING',
  screen: 'lobby',
  user: null,
  matchId: null,
  playerId: null,
  playerIndex: null,
  playerName: loadPlayerName(),
  gameState: null,
  selectedAttacker: null,
  selectedDeployCard: null,
  error: null,
  damageMode: 'cumulative',
  startingLifepoints: 20,
  serverHealth: null,
  isSpectator: false,
  spectatorCount: 0,
  showHelp: false,
  validActions: [],
  isMobile: false,
  featureVectorBrutalism: loadFeatureFlag(),
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

let actionTimer: ReturnType<typeof setTimeout> | null = null;

export function startActionTimeout(): void {
  if (actionTimer) clearTimeout(actionTimer);
  actionTimer = setTimeout(() => {
    dispatch({
      type: 'actionError',
      error: 'COMMAND_TIMEOUT: ENGINE_RESP_OVER_30S. CHECK_LINK.',
      code: 'TIMEOUT',
    });
    actionTimer = null;
  }, 30_000);
}

export function clearActionTimeout(): void {
  if (actionTimer) {
    clearTimeout(actionTimer);
    actionTimer = null;
  }
}

// Side-channel for PizzazzEngine + NarrationProducer
export type TurnResultCallback = (result: PhalanxTurnResult) => void;
const turnResultCallbacks: TurnResultCallback[] = [];

export function onTurnResult(cb: TurnResultCallback): () => void {
  turnResultCallbacks.push(cb);
  return () => {
    const idx = turnResultCallbacks.indexOf(cb);
    if (idx !== -1) turnResultCallbacks.splice(idx, 1);
  };
}

export type AppMessage =
  | ServerMessage
  | { type: 'AUTH_SUCCESS'; user: AuthUser; token: string }
  | { type: 'CONNECTION_STATE'; state: AppState['connectionState']; error?: string };

export function dispatch(message: AppMessage): void {
  switch (message.type) {
    case 'AUTH_SUCCESS':
      setState({ user: message.user });
      break;

    case 'CONNECTION_STATE':
      setState({
        connectionState: message.state,
        ...(message.error ? { error: message.error } : {}),
      });
      if (message.state === 'OPEN') {
        setServerHealth({ color: 'green', label: 'Online', hint: 'Connected to game server' });
        clearError();
      } else if (message.state === 'CONNECTING') {
        setServerHealth({
          color: 'yellow',
          label: 'Reconnecting',
          hint: 'Attempting to restore the game session',
        });
      } else {
        setServerHealth({
          color: 'red',
          label: 'Offline',
          hint: message.error ?? 'Connection to game server lost',
        });
      }
      break;

    case 'matchCreated':
      vibrate(50);
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
      vibrate([30, 50, 30]);
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
      vibrate(30);
      setState({
        screen: 'game',
        matchId: message.matchId,
        isSpectator: true,
        playerIndex: null,
        error: null,
      });
      break;

    case 'gameState': {
      clearActionTimeout();
      const gs = message.result.postState;
      const myIdx = state.playerIndex;
      const isMyTurn = myIdx !== null && gs.activePlayerIndex === myIdx;

      // Haptic for turn start
      if (isMyTurn && state.gameState?.activePlayerIndex !== myIdx) {
        vibrate([100, 50, 100]);
      }

      for (const cb of turnResultCallbacks) cb(message.result);
      setState({
        screen: gs.phase === 'gameOver' ? 'gameOver' : 'game',
        gameState: gs,
        validActions: message.viewModel?.validActions ?? [],
        selectedAttacker: null,
        selectedDeployCard: null,
        error: null,
        spectatorCount: message.spectatorCount ?? 0,
      });
      break;
    }

    case 'actionError':
      clearActionTimeout();
      vibrate([50, 50, 50]);
      setState({ error: message.error });
      break;

    case 'matchError':
      clearActionTimeout();
      vibrate([50, 50, 50]);
      setState({ error: message.error });
      break;

    case 'opponentDisconnected':
      setState({ error: 'Opponent disconnected — waiting for reconnect...' });
      break;

    case 'opponentReconnected':
      vibrate(30);
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
  vibrate(10);
  setState({ selectedAttacker: pos, selectedDeployCard: null, error: null });
}

export function selectDeployCard(cardId: string): void {
  vibrate(10);
  setState({ selectedDeployCard: cardId, selectedAttacker: null, error: null });
}

export function clearSelection(): void {
  vibrate(5);
  setState({ selectedAttacker: null, selectedDeployCard: null });
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors (e.g. security policy)
    }
  }
}

export function setUser(user: AuthUser | null): void {
  setState({ user });
}

export function setPlayerName(name: string): void {
  savePlayerName(name);
  setState({ playerName: name });
}

export function setScreen(screen: Screen): void {
  setState({ screen });
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

export function setIsMobile(isMobile: boolean): void {
  if (state.isMobile !== isMobile) {
    setState({ isMobile });
  }
}

export function setFeatureVectorBrutalism(value: boolean): void {
  saveFeatureFlag(value);
  setState({ featureVectorBrutalism: value });
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
    gameState: null,
    selectedAttacker: null,
    error: null,
    damageMode: 'cumulative',
    startingLifepoints: 20,
    isSpectator: false,
    spectatorCount: 0,
    showHelp: false,
    validActions: [],
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
