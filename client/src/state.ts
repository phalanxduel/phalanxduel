import type {
  Action,
  GameState,
  GridPosition,
  ServerMessage,
  DamageMode,
  PhalanxTurnResult,
} from '@phalanxduel/shared';
import { generateTacticalCallsign } from './name-generator';

export type Screen =
  | 'lobby'
  | 'waiting'
  | 'game'
  | 'gameOver'
  | 'auth'
  | 'settings'
  | 'ladder'
  | 'profile'
  | 'public_lobby'
  | 'spectator_lobby'
  | 'rewatch';

export type HealthColor = 'green' | 'yellow' | 'red';

export interface ServerHealth {
  color: HealthColor;
  label: string;
  hint: string | null;
}

export interface AuthUser {
  id: string;
  /** Raw base handle, no suffix. Display via formatGamertag(gamertag, suffix). */
  gamertag: string;
  /** Numeric discriminator appended as #suffix. Null when unique. */
  suffix: number | null;
  email: string;
  elo: number;
  emailVerifiedAt?: string | null;
  emailNotifications: boolean;
  reminderNotifications: boolean;
  marketingConsentAt?: string | null;
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
  /**
   * Persisted display callsign. For registered users this is formatGamertag(gamertag, suffix).
   * For guests it is whatever the user typed. Stored in localStorage across sessions.
   */
  operativeId: string | null;
  /**
   * Transient session display name sent with match actions. Kept in sync with operativeId by
   * setState(). Prefer operativeId for display; use playerName only when sending server messages.
   */
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
  themePhx: boolean;
  profileId: string | null;
  rewatchMatchId: string | null;
  rewatchStep: number;
  rewatchViewerIndex: number | null;
  queueStatus: 'idle' | 'searching';
}

export type Listener = (state: AppState) => void;

// --- Session storage helpers ---
const SESSION_KEY = 'phalanx_session';
const OPERATIVE_ID_KEY = 'phalanx_operative_id';
const THEME_PHX_KEY = 'phalanx_theme_phx';

export interface StoredSession {
  matchId: string;
  playerId: string;
  playerIndex: number;
  operativeId: string;
  playerName?: string;
}

function saveOperativeId(id: string): void {
  try {
    localStorage.setItem(OPERATIVE_ID_KEY, id);
  } catch {
    // Ignore (incognito or quota)
  }
}

function loadOperativeId(): string | null {
  try {
    const id = localStorage.getItem(OPERATIVE_ID_KEY);
    if (id) return id;

    // Migration logic
    const oldName = localStorage.getItem('phalanx_player_name');
    if (oldName) {
      saveOperativeId(oldName);
      localStorage.removeItem('phalanx_player_name');
      return oldName;
    }

    return null;
  } catch {
    return null;
  }
}

function loadFeatureFlag(): boolean {
  try {
    const raw = localStorage.getItem(THEME_PHX_KEY);
    return raw !== '0';
  } catch {
    return true;
  }
}

function saveFeatureFlag(value: boolean): void {
  try {
    localStorage.setItem(THEME_PHX_KEY, value ? '1' : '0');
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

export function rememberSession(session: StoredSession): void {
  saveSession(session);
}

export function forgetSession(matchId?: string): void {
  const saved = loadSession();
  if (!matchId || saved?.matchId === matchId) {
    clearSession();
  }
}

const initialOperativeId = loadOperativeId();
const defaultOperativeId = initialOperativeId ?? generateTacticalCallsign();
if (!initialOperativeId) {
  saveOperativeId(defaultOperativeId);
}
function getScreenFromUrl(params: URLSearchParams): Screen {
  const screen = params.get('screen');
  if (
    screen === 'auth' ||
    screen === 'settings' ||
    screen === 'lobby' ||
    screen === 'ladder' ||
    screen === 'profile' ||
    screen === 'public_lobby' ||
    screen === 'spectator_lobby' ||
    (screen === 'rewatch' && !!params.get('matchId'))
  ) {
    return screen;
  }
  return 'lobby';
}

function getInitialScreen(): Screen {
  return getScreenFromUrl(new URLSearchParams(window.location.search));
}

export function syncStateFromUrl(): void {
  const params = new URLSearchParams(window.location.search);
  const screen = getScreenFromUrl(params);
  const updates: Partial<AppState> = { screen };
  if (screen === 'profile') {
    updates.profileId = params.get('profile');
  } else if (screen === 'rewatch') {
    updates.rewatchMatchId = params.get('matchId');
    updates.rewatchStep = Math.max(0, Number.parseInt(params.get('step') ?? '0', 10) || 0);
  }
  setState(updates);
}

let state: AppState = {
  connectionState: 'CONNECTING',
  screen: getInitialScreen(),
  user: null,
  matchId: null,
  playerId: null,
  playerIndex: null,
  operativeId: defaultOperativeId,
  playerName: defaultOperativeId,
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
  themePhx: loadFeatureFlag(),
  profileId:
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('profile')
      : null,
  rewatchMatchId:
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('matchId')
      : null,
  rewatchStep:
    typeof window !== 'undefined'
      ? Math.max(
          0,
          Number.parseInt(new URLSearchParams(window.location.search).get('step') ?? '0', 10) || 0,
        )
      : 0,
  rewatchViewerIndex: 0,
  queueStatus: 'idle',
};

const listeners: Listener[] = [];

export function getState(): AppState {
  return state;
}

export function setState(partial: Partial<AppState>): void {
  console.log('[state] setState', partial);
  const nextPartial = { ...partial };
  if ('operativeId' in nextPartial && !('playerName' in nextPartial)) {
    nextPartial.playerName = nextPartial.operativeId ?? null;
  }
  if ('playerName' in nextPartial && !('operativeId' in nextPartial)) {
    nextPartial.operativeId = nextPartial.playerName ?? null;
  }
  state = { ...state, ...nextPartial };
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
      error:
        'Connection timed out — the server did not respond. Check your connection and try again.',
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

function rememberCurrentMatchSession(message: {
  matchId: string;
  playerId: string;
  playerIndex: number;
}): void {
  const operativeId = state.operativeId ?? '';
  saveSession({
    matchId: message.matchId,
    playerId: message.playerId,
    playerIndex: message.playerIndex,
    operativeId,
    playerName: operativeId,
  });
}

export function dispatch(message: AppMessage): void {
  console.log(`[state] Dispatch: ${message.type}`, message);
  switch (message.type) {
    case 'AUTH_SUCCESS':
      setState({ user: message.user });
      break;

    case 'CONNECTION_STATE':
      handleConnectionState(message);
      break;

    case 'matchCreated':
      vibrate(50);
      rememberCurrentMatchSession(message);
      setState({
        screen: state.screen === 'game' ? 'game' : 'waiting',
        matchId: message.matchId,
        playerId: message.playerId,
        playerIndex: message.playerIndex,
        error: null,
      });
      break;

    case 'matchJoined':
      vibrate([30, 50, 30]);
      clearMatchParam();
      rememberCurrentMatchSession(message);
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

    case 'queueJoined':
    case 'queueLeft':
    case 'queueMatchFound':
      handleQueueMessage(message);
      break;

    case 'forceReload':
      window.location.reload();
      break;
  }
}

function handleQueueMessage(
  message:
    | { type: 'queueJoined'; queueSize: number }
    | { type: 'queueLeft'; reason: 'cancelled' | 'timeout' }
    | { type: 'queueMatchFound'; matchId: string; playerId: string; playerIndex: number },
): void {
  if (message.type === 'queueJoined') {
    setState({ queueStatus: 'searching', error: null });
  } else if (message.type === 'queueLeft') {
    setState({ queueStatus: 'idle' });
  } else {
    setState({
      queueStatus: 'idle',
      matchId: message.matchId,
      playerId: message.playerId,
      playerIndex: message.playerIndex,
      screen: 'waiting',
      error: null,
    });
  }
}

function handleConnectionState(message: {
  type: 'CONNECTION_STATE';
  state: 'CONNECTING' | 'OPEN' | 'DISCONNECTED';
  error?: string;
}): void {
  const nextHealth: ServerHealth =
    message.state === 'OPEN'
      ? { color: 'green', label: 'Online', hint: 'Connected to game server' }
      : message.state === 'CONNECTING'
        ? { color: 'yellow', label: 'Reconnecting', hint: 'Attempting to restore the game session' }
        : {
            color: 'red',
            label: 'Offline',
            hint: message.error ?? 'Connection to game server lost',
          };

  setState({
    connectionState: message.state,
    serverHealth: nextHealth,
    ...(message.error ? { error: message.error } : {}),
    ...(message.state === 'OPEN' ? { error: null } : {}),
  });
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
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore vibration errors (e.g. security policy or unsupported browser)
  }
}

export function setUser(user: AuthUser | null): void {
  setState({ user });
}

export function setOperativeId(id: string): void {
  saveOperativeId(id);
  setState({ operativeId: id, playerName: id });
}

export function setPlayerName(name: string): void {
  setOperativeId(name);
}

export function setScreen(screen: Screen): void {
  const url = new URL(window.location.href);
  if (screen === 'lobby') {
    url.searchParams.delete('screen');
    url.searchParams.delete('profile');
  } else if (
    screen === 'ladder' ||
    screen === 'settings' ||
    screen === 'auth' ||
    screen === 'public_lobby' ||
    screen === 'spectator_lobby' ||
    screen === 'rewatch'
  ) {
    url.searchParams.set('screen', screen);
    if (screen !== 'rewatch') {
      url.searchParams.delete('matchId');
      url.searchParams.delete('step');
    }
    url.searchParams.delete('profile');
  }
  // Note: 'profile' screen sync is handled in setProfileId or when switching to it.

  if (url.toString() !== window.location.href) {
    window.history.pushState({ screen }, '', url.toString());
  }

  setState({ screen });
}

export function openRewatch(matchId: string, step = 0): void {
  const boundedStep = Math.max(0, Math.trunc(step));
  const url = new URL(window.location.href);
  url.searchParams.set('screen', 'rewatch');
  url.searchParams.set('matchId', matchId);
  url.searchParams.set('step', String(boundedStep));
  url.searchParams.delete('profile');
  if (url.toString() !== window.location.href) {
    window.history.pushState({ screen: 'rewatch' }, '', url.toString());
  }
  setState({ screen: 'rewatch', rewatchMatchId: matchId, rewatchStep: boundedStep });
}

export function setRewatchStep(step: number): void {
  const boundedStep = Math.max(0, Math.trunc(step));
  const url = new URL(window.location.href);
  if (state.screen === 'rewatch') {
    url.searchParams.set('step', String(boundedStep));
    if (url.toString() !== window.location.href) {
      window.history.replaceState({}, '', url.toString());
    }
  }
  setState({ rewatchStep: boundedStep });
}

export function setRewatchViewerIndex(index: number | null): void {
  setState({ rewatchViewerIndex: index });
}

export function setProfileId(id: string | null): void {
  if (id && state.screen === 'profile') {
    const url = new URL(window.location.href);
    url.searchParams.set('screen', 'profile');
    url.searchParams.set('profile', id);
    if (url.toString() !== window.location.href) {
      window.history.pushState({ screen: 'profile' }, '', url.toString());
    }
  }
  setState({ profileId: id });
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

export function setThemePhx(value: boolean): void {
  saveFeatureFlag(value);
  setState({ themePhx: value });
}

export function clearError(): void {
  setState({ error: null });
}

export function resetToLobby(): void {
  clearSession();
  clearMatchParam();
  const url = new URL(window.location.href);
  url.searchParams.delete('screen');
  url.searchParams.delete('profile');
  url.searchParams.delete('matchId');
  url.searchParams.delete('step');
  if (url.toString() !== window.location.href) {
    window.history.replaceState({ screen: 'lobby' }, '', url.toString());
  }
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
