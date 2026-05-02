import type { DamageMode, CreateMatchParamsPartial, GameState } from '@phalanxduel/shared';
import { formatGamertag } from '@phalanxduel/shared';
import { render as preactRender } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { renderGame } from './game';
import type { renderGameOver } from './game-over';
import { getConnection, renderError } from './renderer';
import {
  setDamageMode,
  rememberSession,
  forgetSession,
  setPlayerName as setOperativeId,
  setStartingLifepoints,
  setScreen,
  setProfileId,
  setThemePhx,
  startActionTimeout,
  setState,
  openRewatch,
  setRewatchStep,
  setRewatchViewerIndex,
} from './state';
import type { AppState } from './state';

import { HealthBadge } from './components/HealthBadge';
import { Leaderboard } from './components/Leaderboard';
import { AuthPanel } from './components/AuthPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ResetPasswordPanel } from './components/ResetPasswordPanel';
import { getToken, logout, restoreSession } from './auth';
import { MatchHistory } from './components/MatchHistory';
import { WaitingApp } from './waiting';
import { getQuickMatchOperativeId } from './ux-derivations';
import { HelpDialog } from './components/HelpDialog';
import { WelcomeDialog, useWelcomeDialog } from './components/WelcomeDialog';

declare const __APP_VERSION__: string;

function AuthScreen() {
  return (
    <div class="lobby" style="min-height: 80vh; justify-content: center">
      <AuthPanel
        onClose={() => {
          setScreen('lobby');
        }}
      />
    </div>
  );
}

function UserBar({ state, onFocusId }: { state: AppState; onFocusId: () => void }) {
  if (state.user) {
    const displayName = formatGamertag(state.user.gamertag, state.user.suffix);
    return (
      <div class="status-card phx-header-status" style="border-left-color: var(--neon-blue)">
        <div
          class="phx-user-info"
          onClick={() => {
            setScreen('profile');
            setProfileId(state.user!.id);
          }}
          style="cursor: pointer"
        >
          <span class="status-title" style="color: var(--neon-blue)">
            {displayName}
          </span>
          <span class="status-val" style="color: var(--gold); font-weight: bold">
            RATING: {state.user.elo}
          </span>
        </div>
        <div class="phx-user-actions">
          <a
            class="btn btn-secondary btn-tiny"
            href="?screen=settings"
            onClick={(e) => {
              e.preventDefault();
              setScreen('settings');
            }}
          >
            SETTINGS
          </a>
          <a
            class="btn btn-secondary btn-tiny"
            href="?action=logout"
            onClick={(e) => {
              e.preventDefault();
              void logout();
            }}
          >
            DISCONNECT
          </a>
        </div>
      </div>
    );
  }

  const showGuestInfo = () => {
    alert(
      'GUEST_OPERATIVE: Engagement authorized without persistent ID. \n\nNOTE: Matches will not be tracked for ELO or Match History. Enter an OPERATIVE_ID below to initialize a persistent identity.',
    );
    onFocusId();
  };

  return (
    <div class="status-card phx-header-status" style="border-left-color: var(--gold-dim)">
      <button class="btn btn-secondary phx-header-btn" onClick={showGuestInfo}>
        GUEST_OPERATIVE
      </button>
      <a
        class="btn btn-primary phx-header-btn"
        data-testid="userbar-authorize-btn"
        href="?screen=auth"
        onClick={(e) => {
          e.preventDefault();
          setScreen('auth');
        }}
      >
        AUTHORIZE
      </a>
    </div>
  );
}

function seedFromUrl(): number | undefined {
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null) return undefined;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) return undefined;
  return parsed;
}

function toBoundedInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function buildMatchParams(
  rows: number,
  columns: number,
  damageMode: DamageMode,
): CreateMatchParamsPartial {
  return {
    rows,
    columns,
    maxHandSize: columns,
    initialDraw: rows * columns + columns,
    modeDamagePersistence: damageMode,
  };
}

type VizHover = 'atk' | 'frn' | 'bck' | 'core' | null;

interface ActiveMatchSummary {
  matchId: string;
  playerId: string;
  playerIndex: number;
  role: 'P0' | 'P1';
  opponentName: string | null;
  botStrategy: 'random' | 'heuristic' | null;
  status: 'pending' | 'active';
  phase: string | null;
  turnNumber: number | null;
  disconnected: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OpenMatchSummary {
  matchId: string;
  openSeat: 'P0' | 'P1';
  visibility: 'private' | 'public_open';
  publicStatus: 'open' | 'claimed' | 'expired' | 'cancelled' | null;
  creatorUserId: string | null;
  creatorName: string;
  creatorElo: number | null;
  creatorStats: {
    eloRating: number;
    glickoRating: number;
    glickoRD: number;
    wins: number;
    losses: number;
    abandons: number;
    gamesPlayed: number;
    matchesCreated: number;
    successfulStarts: number;
  } | null;
  creatorRecord: {
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
    provisional: boolean;
    confidenceLabel: string;
  } | null;
  requirements: {
    minPublicRating: number | null;
    maxPublicRating: number | null;
    minGamesPlayed: number | null;
    requiresEstablishedRating: boolean;
  } | null;
  joinable: boolean;
  disabledReason: string | null;
  players: { name: string; connected: boolean }[];
  phase: string | null;
  turnNumber: number | null;
  ageSeconds: number;
  lastActivitySeconds: number;
  createdAt: string;
  expiresAt: string | null;
  expiryStatus: 'fresh' | 'expiring' | 'expired' | 'recent_expired';
}

interface SpectatorMatchSummary {
  matchId: string;
  status: 'waiting' | 'active';
  phase: string | null;
  turnNumber: number | null;
  player1Name: string | null;
  player2Name: string | null;
  spectatorCount: number;
  isPvP: boolean;
  humanPlayerCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MatchHistoryEntry {
  matchId: string;
  player1Name: string;
  player2Name: string;
  winnerName: string | null;
  totalTurns: number;
  isPvP: boolean;
  humanPlayerCount: number;
  completedAt: string;
  durationMs: number | null;
}

interface MatchHistoryPage {
  matches: MatchHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface RewatchActionEntry {
  sequenceNumber: number;
  type: string;
  playerIndex: number;
  timestamp: string;
  stateHashBefore: string;
  stateHashAfter: string;
}

interface RewatchActionLog {
  matchId: string;
  engineVersion: string;
  seed: number;
  startingLifepoints: number;
  player1Name: string;
  player2Name: string;
  totalActions: number;
  actions: RewatchActionEntry[];
}

interface PublicProfileSummary {
  userId: string;
  gamertag: string;
  displayName: string;
  elo: number;
  record: {
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
  };
  streak: number;
  confidenceLabel: string;
  followStats?: {
    followers: number;
    following: number;
  };
  isFollowing?: boolean;
  recentMatches: {
    matchId: string;
    result: 'win' | 'loss' | 'draw';
    mode: 'pvp' | 'sp-random' | 'sp-heuristic';
    opponentName: string | null;
    completedAt: string;
    turnNumber: number | null;
  }[];
  openChallenges: {
    matchId: string;
    createdAt: string;
    creatorName: string;
    creatorElo: number;
    creatorRecord: {
      wins: number;
      losses: number;
      draws: number;
      gamesPlayed: number;
      provisional: boolean;
      confidenceLabel: string;
    };
    requirements: {
      minPublicRating: number | null;
      maxPublicRating: number | null;
      minGamesPlayed: number | null;
      requiresEstablishedRating: boolean;
    };
  }[];
}

const PUBLIC_LOBBY_REFRESH_MS = 30_000;
const SPECTATOR_LOBBY_REFRESH_MS = 15_000;
const PUBLIC_LOBBY_EXPIRING_MS = 15 * 60 * 1000;

function getRemainingMs(match: OpenMatchSummary, nowMs: number): number | null {
  if (!match.expiresAt) return null;
  return new Date(match.expiresAt).getTime() - nowMs;
}

function getLiveExpiryStatus(
  match: OpenMatchSummary,
  nowMs: number,
): 'fresh' | 'expiring' | 'expired' {
  const remainingMs = getRemainingMs(match, nowMs);
  if (remainingMs === null) return 'fresh';
  if (
    remainingMs <= 0 ||
    match.expiryStatus === 'expired' ||
    match.expiryStatus === 'recent_expired'
  ) {
    return 'expired';
  }
  return remainingMs > PUBLIC_LOBBY_EXPIRING_MS ? 'fresh' : 'expiring';
}

function formatCountdown(match: OpenMatchSummary, nowMs: number): string {
  const remainingMs = getRemainingMs(match, nowMs);
  if (remainingMs === null) return 'NO_EXPIRY';
  if (remainingMs <= 0) return '00:00';
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatLobbyTimestamp(value: string | null): string {
  if (!value) return 'UNKNOWN';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getCreatorStats(match: OpenMatchSummary) {
  const record = match.creatorRecord;
  return {
    elo: match.creatorStats?.eloRating ?? match.creatorElo ?? 'UNK',
    glicko: match.creatorStats?.glickoRating ?? 'UNK',
    glickoRD: match.creatorStats?.glickoRD ?? null,
    wins: match.creatorStats?.wins ?? record?.wins ?? 0,
    losses: match.creatorStats?.losses ?? record?.losses ?? 0,
    abandons: match.creatorStats?.abandons ?? 0,
    matchesCreated: match.creatorStats?.matchesCreated ?? 0,
    successfulStarts: match.creatorStats?.successfulStarts ?? 0,
  };
}

function CascadeVisualizer({
  damageMode,
  startingLifepoints,
}: {
  damageMode: DamageMode;
  startingLifepoints: number;
}) {
  const [hover, setHover] = useState<VizHover>(null);
  const [booted, setBooted] = useState(false);
  const [configFlash, setConfigFlash] = useState(false);
  const prevConfig = useRef({ damageMode, startingLifepoints });

  useEffect(() => {
    const id = setTimeout(() => {
      setBooted(true);
    }, 2500);
    return () => {
      clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (
      prevConfig.current.damageMode !== damageMode ||
      prevConfig.current.startingLifepoints !== startingLifepoints
    ) {
      prevConfig.current = { damageMode, startingLifepoints };
      setConfigFlash(true);
      const id = setTimeout(() => {
        setConfigFlash(false);
      }, 600);
      return () => {
        clearTimeout(id);
      };
    }
  }, [damageMode, startingLifepoints]);

  const vizClass = [
    'cascade-viz',
    booted ? 'viz-idle' : 'viz-boot',
    configFlash ? 'viz-config-flash' : '',
    hover ? `viz-hover-${hover}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const clear = useCallback(() => {
    setHover(null);
  }, []);

  return (
    <div class={vizClass}>
      <div class="viz-path" />
      <div class="viz-pulse" />
      <div
        class="viz-node active"
        title="OFFENSE: Damage flows forward"
        onMouseEnter={() => {
          setHover('atk');
        }}
        onMouseLeave={clear}
      >
        ATK
      </div>
      <div
        class="viz-node"
        title="DEFENSE: Front row absorbs damage"
        onMouseEnter={() => {
          setHover('frn');
        }}
        onMouseLeave={clear}
      >
        FRN
      </div>
      <div
        class="viz-node"
        title="DEFENSE: Back row absorbs carryover"
        onMouseEnter={() => {
          setHover('bck');
        }}
        onMouseLeave={clear}
      >
        BCK
      </div>
      <div
        class="viz-node target"
        title={`CORE: ${startingLifepoints} LP — final target`}
        onMouseEnter={() => {
          setHover('core');
        }}
        onMouseLeave={clear}
      >
        <span class="viz-node-label">CORE</span>
        <span class="viz-node-lp">{startingLifepoints}</span>
      </div>
      {hover && (
        <div class="viz-tooltip">
          {hover === 'atk' &&
            `OFFENSE — ${damageMode === 'cumulative' ? 'Cumulative' : 'Classic'} cascade`}
          {hover === 'frn' && 'FRONT ROW — First line of absorption'}
          {hover === 'bck' && 'BACK ROW — Carryover damage absorbed here'}
          {hover === 'core' && `CORE — ${startingLifepoints} LP remaining`}
        </div>
      )}
    </div>
  );
}
function describeLobbyStatus(args: {
  connectionState: AppState['connectionState'];
  pendingAction: string | null;
  healthHint: string | null;
}): {
  tone: 'ready' | 'busy' | 'warning' | 'offline';
  title: string;
  detail: string;
} {
  const { connectionState, pendingAction, healthHint } = args;
  if (pendingAction) {
    return {
      tone: 'busy',
      title: 'SYNCHRONIZING...',
      detail: pendingAction,
    };
  }
  if (connectionState === 'CONNECTING') {
    return {
      tone: 'warning',
      title: healthHint ?? 'Attempting to restore the game session',
      detail: 'Reconnecting to the game server',
    };
  }
  if (connectionState === 'DISCONNECTED') {
    return {
      tone: 'offline',
      title: healthHint ?? 'Connection to game server lost',
      detail: 'BRIDGE_OFFLINE',
    };
  }
  return {
    tone: 'ready',
    title: healthHint ?? 'STANDING BY FOR ENGAGEMENT.',
    detail: 'TERMINAL_READY',
  };
}

function resolveLobbyCreateOperativeId(state: AppState, idOverride?: string): string {
  const currentId = getLobbyOperativeId(state);
  const fallbackId = getQuickMatchOperativeId(currentId);
  return state.user
    ? formatGamertag(state.user.gamertag, state.user.suffix)
    : ((idOverride ?? currentId ?? fallbackId) || fallbackId).trim();
}

function getLobbyOperativeId(state: AppState): string | null {
  return state.operativeId ?? state.playerName ?? null;
}

function useLobbyMatchLists(state: AppState) {
  const [activeMatches, setActiveMatches] = useState<ActiveMatchSummary[]>([]);
  const [activeMatchesLoading, setActiveMatchesLoading] = useState(false);
  const [activeMatchesError, setActiveMatchesError] = useState<string | null>(null);
  const [openMatches, setOpenMatches] = useState<OpenMatchSummary[]>([]);
  const [openMatchesLoading, setOpenMatchesLoading] = useState(false);
  const [openMatchesError, setOpenMatchesError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfileSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const refreshActiveMatches = useCallback(async () => {
    if (!state.user) {
      setActiveMatches([]);
      setActiveMatchesError(null);
      setActiveMatchesLoading(false);
      return;
    }

    setActiveMatchesLoading(true);
    setActiveMatchesError(null);

    try {
      const token = getToken();
      const response = await fetch('/api/matches/active', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to load active matches (${response.status})`);
      }

      const payload = (await response.json()) as ActiveMatchSummary[];
      setActiveMatches(payload);
    } catch {
      setActiveMatchesError('Unable to load active match recovery data.');
    } finally {
      setActiveMatchesLoading(false);
    }
  }, [state.user]);

  const refreshOpenMatches = useCallback(async () => {
    setOpenMatchesLoading(true);
    setOpenMatchesError(null);

    try {
      const token = getToken();
      const response = await fetch('/api/matches/lobby?includeRecentlyExpired=true', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to load open matches (${response.status})`);
      }

      const payload = (await response.json()) as
        | OpenMatchSummary[]
        | { matches?: OpenMatchSummary[] };
      setOpenMatches(Array.isArray(payload) ? payload : (payload.matches ?? []));
    } catch {
      setOpenMatchesError('Unable to load open matches right now.');
    } finally {
      setOpenMatchesLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) {
      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    try {
      const token = getToken();
      const response = await fetch(`/api/profiles/${state.user.id}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to load profile (${response.status})`);
      }

      const payload = (await response.json()) as unknown;
      if (
        payload &&
        typeof payload === 'object' &&
        'displayName' in payload &&
        'confidenceLabel' in payload
      ) {
        setProfile(payload as PublicProfileSummary);
      } else if (
        payload &&
        typeof payload === 'object' &&
        'profile' in payload &&
        (payload as { profile?: unknown }).profile &&
        typeof (payload as { profile?: unknown }).profile === 'object' &&
        'displayName' in ((payload as { profile: PublicProfileSummary }).profile ?? {})
      ) {
        setProfile((payload as { profile: PublicProfileSummary }).profile);
      } else {
        setProfile(null);
      }
    } catch {
      setProfileError('Unable to load profile summary.');
    } finally {
      setProfileLoading(false);
    }
  }, [state.user]);

  useEffect(() => {
    void refreshActiveMatches();
  }, [refreshActiveMatches]);

  useEffect(() => {
    void refreshOpenMatches();
  }, [refreshOpenMatches]);

  useEffect(() => {
    const refreshOnFocus = () => {
      void refreshOpenMatches();
    };
    window.addEventListener('focus', refreshOnFocus);
    const interval = window.setInterval(refreshOnFocus, PUBLIC_LOBBY_REFRESH_MS);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      window.clearInterval(interval);
    };
  }, [refreshOpenMatches]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  return {
    activeMatches,
    activeMatchesLoading,
    activeMatchesError,
    openMatches,
    openMatchesLoading,
    openMatchesError,
    profile,
    profileLoading,
    profileError,
    refreshActiveMatches,
    refreshOpenMatches,
    refreshProfile,
  };
}

function useSpectatorMatches(active: boolean) {
  const [matches, setMatches] = useState<SpectatorMatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/spectator/matches?status=all', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to load spectator matches (${response.status})`);
      }
      setMatches((await response.json()) as SpectatorMatchSummary[]);
    } catch {
      setError('Unable to load spectator matches right now.');
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    void refresh();

    const refreshOnFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', refreshOnFocus);
    const interval = window.setInterval(refreshOnFocus, SPECTATOR_LOBBY_REFRESH_MS);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      window.clearInterval(interval);
    };
  }, [active, refresh]);

  return { matches, loading, error, refresh };
}

function useMatchHistory(active: boolean, playerId?: string | null) {
  const [page, setPage] = useState<MatchHistoryPage>({
    matches: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '20' });
      if (playerId) params.set('playerId', playerId);
      const response = await fetch(`/api/matches/history?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Failed to load match history (${response.status})`);
      setPage((await response.json()) as MatchHistoryPage);
    } catch {
      setError('Unable to load match history right now.');
    } finally {
      setLoading(false);
    }
  }, [active, playerId]);

  useEffect(() => {
    if (!active) return;
    void refresh();
  }, [active, refresh]);

  return { page, loading, error, refresh };
}

function useLobbyMatchActions(args: {
  container: HTMLElement;
  state: AppState;
  selectedRows: number;
  selectedColumns: number;
  refreshActiveMatches: () => Promise<void>;
}) {
  const { container, state, selectedRows, selectedColumns, refreshActiveMatches } = args;
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isTaskRunning, setIsTaskRunning] = useState(false);

  const queueLobbyAction = useCallback((label: string, task: () => void) => {
    console.log(`[lobby] Queuing action: ${label}`);
    setPendingAction(label);
    setIsTaskRunning(true);
    try {
      task();
    } catch (err) {
      console.error('[lobby] Action task failed!', err);
      setIsTaskRunning(false);
      setPendingAction(null);
    }
  }, []);

  const resumeActiveMatch = useCallback(
    (match: ActiveMatchSummary) => {
      rememberSession({
        matchId: match.matchId,
        playerId: match.playerId,
        playerIndex: match.playerIndex,
        operativeId: state.user
          ? formatGamertag(state.user.gamertag, state.user.suffix)
          : (getLobbyOperativeId(state) ?? ''),
      });
      queueLobbyAction('RESTORING_MATCH…', () => {
        startActionTimeout();
        getConnection()?.send({
          type: 'rejoinMatch',
          matchId: match.matchId,
          playerId: match.playerId,
        });
      });
    },
    [queueLobbyAction, state.operativeId, state.playerName, state.user],
  );

  const abandonActiveMatch = useCallback(
    async (match: ActiveMatchSummary) => {
      const confirmed = window.confirm(
        `Abandon ${match.matchId.slice(0, 8)}? This is a forfeit and cannot be undone.`,
      );
      if (!confirmed) return;

      setPendingAction('ABANDONING_MATCH…');
      setIsTaskRunning(true);

      try {
        const token = getToken();
        const response = await fetch(`/api/matches/${match.matchId}/abandon`, {
          method: 'POST',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
          throw new Error(`Abandon failed (${response.status})`);
        }

        forgetSession(match.matchId);
        await refreshActiveMatches();
      } catch {
        renderError(container, 'Unable to abandon the match right now.');
      } finally {
        setPendingAction(null);
        setIsTaskRunning(false);
      }
    },
    [container, refreshActiveMatches],
  );

  const sendCreateMatch = useCallback(
    (
      opponent?: 'bot-random' | 'bot-heuristic',
      idOverride?: string,
      visibility: 'private' | 'public_open' = 'private',
    ): boolean => {
      const id = resolveLobbyCreateOperativeId(state, idOverride);

      if (!state.user) {
        const validationError = validateOperativeId(id);
        if (validationError) {
          renderError(container, validationError);
          return false;
        }
      }

      setOperativeId(id);
      startActionTimeout();
      getConnection()?.send({
        type: 'createMatch',
        playerName: id,
        visibility,
        gameOptions: {
          damageMode: state.damageMode,
          startingLifepoints: state.startingLifepoints,
          classicDeployment: true,
        },
        matchParams: buildMatchParams(selectedRows, selectedColumns, state.damageMode),
        rngSeed: seedFromUrl(),
        opponent,
      });
      return true;
    },
    [
      container,
      selectedColumns,
      selectedRows,
      state.damageMode,
      state.operativeId,
      state.playerName,
      state.startingLifepoints,
      state.user,
    ],
  );

  const sendQuickMatch = useCallback((): boolean => {
    const currentId = getLobbyOperativeId(state);
    const quickMatchId = getQuickMatchOperativeId(currentId);
    if (!state.user && !(currentId ?? '').trim()) {
      setOperativeId(quickMatchId);
    }
    return sendCreateMatch('bot-random', quickMatchId);
  }, [sendCreateMatch, state.operativeId, state.playerName, state.user]);

  const sendOpenMatch = useCallback((): boolean => {
    const currentId = getLobbyOperativeId(state);
    const openMatchId = state.user
      ? formatGamertag(state.user.gamertag, state.user.suffix)
      : getQuickMatchOperativeId(currentId);
    if (!state.user && !(currentId ?? '').trim()) {
      setOperativeId(openMatchId);
    }
    return sendCreateMatch(undefined, openMatchId, 'public_open');
  }, [sendCreateMatch, state.operativeId, state.playerName, state.user]);

  return {
    pendingAction,
    isTaskRunning,
    queueLobbyAction,
    resumeActiveMatch,
    abandonActiveMatch,
    sendCreateMatch,
    sendQuickMatch,
    sendOpenMatch,
  };
}

interface EarnedAchievement {
  type: string;
  awardedAt: string;
  matchId: string | null;
}

const ACHIEVEMENT_META: Record<string, { emoji: string; title: string; desc: string }> = {
  FIRST_WIN: { emoji: '🏆', title: 'First Blood', desc: 'Win your first match.' },
  FIRST_MATCH: { emoji: '🎯', title: 'First Deployment', desc: 'Complete your first match.' },
  ACE_SLAYER: { emoji: '♠️', title: 'Ace Slayer', desc: 'Destroy an Ace in combat.' },
  CLEAN_SWEEP: { emoji: '🧹', title: 'Clean Sweep', desc: 'Win without losing a card.' },
  FULL_HOUSE: { emoji: '🃏', title: 'Full House', desc: '3+2 of same face on board at end.' },
  ROYAL_GUARD: { emoji: '👑', title: 'Royal Guard', desc: 'Fill your back rank with face cards.' },
  DOUBLE_DOWN: { emoji: '2️⃣', title: 'Double Down', desc: 'Win from 1 life point.' },
  LAST_STAND: { emoji: '🛡️', title: 'Last Stand', desc: 'Survive with 1 life point remaining.' },
  IRON_WALL: { emoji: '🧱', title: 'Iron Wall', desc: 'No cards destroyed in a full match.' },
  HIGH_CARD: { emoji: '🎴', title: 'High Card', desc: 'Win with only one card on board.' },
  COMEBACK_KID: { emoji: '🔄', title: 'Comeback Kid', desc: 'Win after trailing by 10+ LP.' },
  OPENING_GAMBIT: { emoji: '⚔️', title: 'Opening Gambit', desc: 'Win in 3 turns or fewer.' },
  TEN_WINS: { emoji: '🥉', title: 'Ten Wins', desc: 'Win 10 matches.' },
  FIFTY_WINS: { emoji: '🥈', title: 'Fifty Wins', desc: 'Win 50 matches.' },
  HUNDRED_WINS: { emoji: '🥇', title: 'Hundred Wins', desc: 'Win 100 matches.' },
  DEUCE_COUP: { emoji: '✌️', title: 'Deuce Coup', desc: 'Destroy two 2s in a single attack.' },
  TRIPLE_THREAT: {
    emoji: '3️⃣',
    title: 'Triple Threat',
    desc: 'Deploy three of the same rank in a row.',
  },
  DEAD_MANS_HAND: {
    emoji: '💀',
    title: "Dead Man's Hand",
    desc: 'Hold Aces & Eights in your back rank.',
  },
};

const ALL_ACHIEVEMENT_TYPES = Object.keys(ACHIEVEMENT_META);

function PublicProfileView({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<PublicProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([]);
  const [favorites, setFavorites] = useState<SpectatorMatchSummary[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/profiles/${profileId}`).then((res) => {
        if (!res.ok) throw new Error('Profile not found');
        return res.json();
      }),
      fetch(`/api/users/${profileId}/achievements`).then((res) =>
        res.ok ? res.json() : { achievements: [] },
      ),
      fetch(`/api/users/${profileId}/favorites`).then((res) => (res.ok ? res.json() : [])),
      fetch(`/api/users/${profileId}/follow-stats`).then((res) =>
        res.ok ? res.json() : { followers: 0, following: 0 },
      ),
    ])
      .then(([profilePayload, achPayload, favPayload, followPayload]) => {
        const data =
          (profilePayload as { profile?: PublicProfileSummary }).profile ||
          (profilePayload as PublicProfileSummary);
        setProfile(data);
        setAchievements((achPayload as { achievements?: EarnedAchievement[] }).achievements ?? []);
        setFavorites(favPayload as SpectatorMatchSummary[]);
        setFollowStats(followPayload as { followers: number; following: number });
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load profile');
        setLoading(false);
      });
  }, [profileId]);

  const handleFollowToggle = async () => {
    const method = isFollowing ? 'DELETE' : 'POST';
    try {
      const res = await fetch(`/api/users/${profileId}/follow`, {
        method,
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setIsFollowing(!isFollowing);
        setFollowStats((prev) => ({
          ...prev,
          followers: prev.followers + (isFollowing ? -1 : 1),
        }));
      }
    } catch {
      // Best effort
    }
  };

  return (
    <div
      class="lobby"
      style="min-height: 80vh; justify-content: center; align-items: center; padding: 2rem;"
    >
      <div class="hud-panel" style="max-width: 600px; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
          <h2 class="section-label" style="margin: 0">
            OPERATIVE_PROFILE
          </h2>
          <button class="btn btn-tiny" onClick={onClose}>
            CLOSE
          </button>
        </div>

        {loading ? (
          <div class="status-card">SYNCHRONIZING_PROFILE_DATA…</div>
        ) : error ? (
          <div class="status-card" style="color: var(--neon-red)">
            {error}
          </div>
        ) : profile ? (
          <div class="status-card" style="display: flex; flex-direction: column; gap: 1rem">
            <div style="display: flex; justify-content: space-between; align-items: center">
              <div>
                <h3 class="status-title" style="font-size: 1.5rem">
                  {profile.displayName}
                </h3>
                <div style="display: flex; gap: 12px; align-items: center">
                  <p class="status-val" style="margin: 0">
                    {profile.userId}
                  </p>
                  <span class="status-val" style="font-size: 0.6rem; opacity: 0.6;">
                    {followStats.followers} FOLLOWERS · {followStats.following} FOLLOWING
                  </span>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                <span class="meta-tag">{profile.confidenceLabel.toUpperCase()}</span>
                {getState().user?.id !== profileId && (
                  <button
                    class={`btn btn-tiny ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ minWidth: '80px', padding: '4px 12px' }}
                    onClick={handleFollowToggle}
                  >
                    {isFollowing ? 'UNFOLLOW' : 'FOLLOW'}
                  </button>
                )}
              </div>
            </div>

            <div class="engagement-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem">
              <div class="engagement-section">
                <h4 class="engagement-label">ELO_RATING</h4>
                <div class="status-title" style="color: var(--gold); font-size: 2rem">
                  {profile.elo}
                </div>
              </div>
              <div class="engagement-section">
                <h4 class="engagement-label">RECORD</h4>
                <div class="status-val" style="font-size: 1.2rem">
                  {profile.record.wins}W - {profile.record.losses}L - {profile.record.draws}D
                </div>
                <div class="status-val">STREAK: {profile.streak}</div>
              </div>
            </div>

            <div class="engagement-section">
              <h4 class="engagement-label">FAVORITE_ENGAGEMENTS</h4>
              {favorites.length === 0 ? (
                <div style="font-size: 0.7rem; opacity: 0.3; font-style: italic;">
                  No favorite matches bookmarked.
                </div>
              ) : (
                <div style="display: flex; flex-direction: column; gap: 4px; max-height: 120px; overflow-y: auto">
                  {favorites.map((m) => (
                    <div
                      key={m.matchId}
                      style="display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; font-size: 0.7rem; padding: 4px; background: rgba(0,255,136,0.05); border-left: 2px solid var(--neon-green);"
                    >
                      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ⭐ {m.player1Name} vs {m.player2Name}
                      </span>
                      <button
                        class="btn btn-secondary btn-tiny"
                        onClick={() => openRewatch(m.matchId, 0)}
                      >
                        WATCH
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div class="engagement-section">
              <h4 class="engagement-label">RECENT_ENGAGEMENTS</h4>
              <div style="display: flex; flex-direction: column; gap: 4px; max-height: 150px; overflow-y: auto">
                {profile.recentMatches.map((m) => (
                  <div
                    key={m.matchId}
                    style="display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 8px; font-size: 0.7rem; padding: 4px; background: rgba(255,255,255,0.05)"
                  >
                    <span>
                      {m.mode.toUpperCase()} vs {m.opponentName || 'AI'}
                    </span>
                    <span
                      style={{
                        color: m.result === 'win' ? 'var(--neon-green)' : 'var(--neon-red)',
                      }}
                    >
                      {m.result.toUpperCase()}
                    </span>
                    <button
                      class="btn btn-secondary btn-tiny"
                      data-testid="profile-rewatch-btn"
                      onClick={() => {
                        openRewatch(m.matchId, 0);
                      }}
                    >
                      REWATCH
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div class="engagement-section">
              <h4 class="engagement-label">ACHIEVEMENT_GALLERY</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; margin-top: 8px;">
                {ALL_ACHIEVEMENT_TYPES.map((type) => {
                  const meta = ACHIEVEMENT_META[type];
                  const earned = achievements.find((a) => a.type === type);
                  if (!meta) return null;
                  return (
                    <div
                      key={type}
                      title={
                        earned
                          ? `${meta.title}\n${new Date(earned.awardedAt).toLocaleDateString()}`
                          : `[LOCKED] ${meta.desc}`
                      }
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px 4px',
                        background: earned ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)',
                        border: earned
                          ? '1px solid var(--neon-green)'
                          : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        opacity: earned ? 1 : 0.35,
                        cursor: earned?.matchId ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (earned?.matchId) openRewatch(earned.matchId, 0);
                      }}
                    >
                      <span style="font-size: 1.5rem">{meta.emoji}</span>
                      <span style="font-size: 0.55rem; text-align: center; color: var(--neon-green); font-family: var(--font-mono); line-height: 1.2;">
                        {earned ? meta.title : '???'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
        <button class="btn btn-primary mt-4 w-full" onClick={onClose}>
          RETURN_TO_LOBBY
        </button>
      </div>
    </div>
  );
}

function PublicLobbyMatchCard({
  match,
  nowMs,
  disabled,
  onJoin,
  onOpenProfile,
  expired = false,
}: {
  match: OpenMatchSummary;
  nowMs: number;
  disabled: boolean;
  onJoin: (match: OpenMatchSummary) => void;
  onOpenProfile: (userId: string) => void;
  expired?: boolean;
}) {
  const stats = getCreatorStats(match);
  const status = expired ? 'expired' : getLiveExpiryStatus(match, nowMs);
  const rdHigh = typeof stats.glickoRD === 'number' && stats.glickoRD > 100;
  const createdAt = formatLobbyTimestamp(match.createdAt);

  return (
    <div
      class="status-card"
      data-testid={expired ? 'public-lobby-expired-card' : 'public-lobby-match-card'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: expired ? 0.58 : 1,
        borderLeftColor:
          status === 'fresh'
            ? 'var(--neon-green)'
            : status === 'expiring'
              ? 'var(--gold)'
              : 'rgba(255,255,255,0.28)',
      }}
    >
      <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
        <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
          {match.creatorUserId ? (
            <button
              class="status-title"
              data-testid="public-lobby-profile-link"
              style="background: none; border: none; color: var(--neon-blue); padding: 0; text-align: left; cursor: pointer;"
              onClick={() => {
                onOpenProfile(match.creatorUserId!);
              }}
            >
              {match.creatorName}
            </button>
          ) : (
            <span class="status-title">{match.creatorName}</span>
          )}
          <span class="status-val">
            ELO {stats.elo} · GLICKO {stats.glicko}
            {stats.glickoRD === null ? '' : ` · RD ${stats.glickoRD}`}
            {rdHigh ? ' · LOW_CONFIDENCE' : ''}
          </span>
          <span class="status-val">
            W/L/A {stats.wins}-{stats.losses}-{stats.abandons} · {stats.successfulStarts} of{' '}
            {stats.matchesCreated} started
          </span>
          <span class="status-val">CREATED {createdAt}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
          <span class="meta-tag" data-testid="public-lobby-freshness">
            {expired ? 'EXPIRED' : status.toUpperCase()}
          </span>
          <span
            class="status-val"
            data-testid="public-lobby-countdown"
            style={{
              color:
                status === 'fresh'
                  ? 'var(--neon-green)'
                  : status === 'expiring'
                    ? 'var(--gold)'
                    : 'rgba(255,255,255,0.55)',
            }}
          >
            {formatCountdown(match, nowMs)}
          </span>
        </div>
      </div>

      {match.requirements && (
        <div class="status-val">
          {match.requirements.requiresEstablishedRating ? 'ESTABLISHED_ONLY · ' : ''}
          {match.requirements.minPublicRating !== null ||
          match.requirements.maxPublicRating !== null
            ? `RANGE ${match.requirements.minPublicRating ?? 'MIN'}-${
                match.requirements.maxPublicRating ?? 'MAX'
              }`
            : 'NO_RATING_RANGE'}
          {match.requirements.minGamesPlayed !== null
            ? ` · MIN_GAMES ${match.requirements.minGamesPlayed}`
            : ''}
        </div>
      )}

      {!expired && (
        <button
          class="btn btn-secondary"
          data-testid="public-lobby-join-btn"
          disabled={disabled || !match.joinable}
          title={!match.joinable && match.disabledReason ? match.disabledReason : undefined}
          onClick={() => {
            if (disabled || !match.joinable) return;
            onJoin(match);
          }}
        >
          {match.joinable ? 'JOIN' : (match.disabledReason ?? 'UNAVAILABLE')}
        </button>
      )}
    </div>
  );
}

function PublicLobbyScreen({
  matches,
  loading,
  error,
  actionDisabled,
  onRefresh,
  onJoin,
}: {
  matches: OpenMatchSummary[];
  loading: boolean;
  error: string | null;
  actionDisabled: boolean;
  onRefresh: () => void;
  onJoin: (match: OpenMatchSummary) => void;
}) {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const openMatches = matches.filter((match) => getLiveExpiryStatus(match, nowMs) !== 'expired');
  const expiredMatches = matches.filter((match) => getLiveExpiryStatus(match, nowMs) === 'expired');
  const openProfile = (userId: string) => {
    setProfileId(userId);
    setScreen('profile');
  };

  return (
    <div class="lobby" style="min-height: 80vh; padding: 2rem;">
      <div class="hud-panel" style="max-width: 1040px; margin: 0 auto; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div>
            <h1 class="title" style="font-size: 2rem;">
              PUBLIC_LOBBY
            </h1>
            <p class="subtitle">OPEN_MATCH_DISCOVERY</p>
          </div>
          <div class="action-row">
            <button
              class="btn btn-secondary"
              data-testid="public-lobby-refresh"
              onClick={onRefresh}
            >
              REFRESH
            </button>
            <button
              class="btn btn-secondary"
              onClick={() => {
                setScreen('lobby');
              }}
            >
              RETURN
            </button>
          </div>
        </div>

        {loading && <div class="status-card">SYNCHRONIZING_PUBLIC_MATCHES…</div>}
        {!loading && error && <div class="status-card">{error}</div>}

        <section style="display: flex; flex-direction: column; gap: 12px;">
          <h2 class="section-label">OPEN_AND_EXPIRING</h2>
          {!loading && !error && openMatches.length === 0 && (
            <div class="status-card" data-testid="public-lobby-empty">
              NO_JOINABLE_PUBLIC_MATCHES
            </div>
          )}
          {!loading &&
            !error &&
            openMatches.map((match) => (
              <PublicLobbyMatchCard
                key={match.matchId}
                match={match}
                nowMs={nowMs}
                disabled={actionDisabled}
                onJoin={onJoin}
                onOpenProfile={openProfile}
              />
            ))}
        </section>

        <section style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;">
          <h2 class="section-label">Recently expired — unable to join</h2>
          {!loading && !error && expiredMatches.length === 0 && (
            <div class="status-card" data-testid="public-lobby-expired-empty">
              NO_RECENTLY_EXPIRED_MATCHES
            </div>
          )}
          {!loading &&
            !error &&
            expiredMatches.map((match) => (
              <PublicLobbyMatchCard
                key={match.matchId}
                match={match}
                nowMs={nowMs}
                disabled
                expired
                onJoin={onJoin}
                onOpenProfile={openProfile}
              />
            ))}
        </section>
      </div>
    </div>
  );
}

type SpectatorLobbyFilter = 'all' | 'waiting' | 'active' | 'has-moves' | 'completed';

function SpectatorMatchRow({
  match,
  actionDisabled,
  onWatch,
}: {
  match: SpectatorMatchSummary;
  actionDisabled: boolean;
  onWatch: (match: SpectatorMatchSummary) => void;
}) {
  const p1 = match.player1Name ?? 'Open seat';
  const p2 = match.player2Name ?? 'Waiting for opponent';
  const isActive = match.status === 'active';

  return (
    <div
      class="status-card"
      data-testid="spectator-lobby-match-row"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '12px',
        alignItems: 'center',
        borderLeftColor: isActive ? 'var(--neon-blue)' : 'var(--gold)',
      }}
    >
      <div style="display: flex; flex-direction: column; gap: 5px; min-width: 0;">
        <div class="status-title" style="overflow-wrap: anywhere;">
          {p1} vs {p2}
        </div>
        <div class="status-val">
          {isActive
            ? `${match.phase ?? 'UNKNOWN_PHASE'} · TURN ${match.turnNumber ?? 'UNK'}`
            : 'Will open when both players join'}
        </div>
        <div class="status-val">
          <span class="spectator-eye-icon" aria-hidden="true">
            ◉
          </span>{' '}
          {match.spectatorCount} WATCHING · CREATED {formatLobbyTimestamp(match.createdAt)}
        </div>
      </div>
      {isActive ? (
        <button
          class="btn btn-secondary"
          data-testid="spectator-lobby-watch-btn"
          disabled={actionDisabled}
          onClick={() => {
            if (actionDisabled) return;
            onWatch(match);
          }}
        >
          WATCH
        </button>
      ) : (
        <span
          class="meta-tag"
          data-testid="spectator-lobby-waiting-copy"
          style="white-space: normal; text-align: right;"
        >
          WAITING_FOR_SECOND_PLAYER
        </span>
      )}
    </div>
  );
}

function SpectatorLobbyScreen({
  matches,
  history,
  loading,
  historyLoading,
  error,
  historyError,
  actionDisabled,
  onRefresh,
  onRefreshHistory,
  onWatch,
  onRewatch,
}: {
  matches: SpectatorMatchSummary[];
  history: MatchHistoryEntry[];
  loading: boolean;
  historyLoading: boolean;
  error: string | null;
  historyError: string | null;
  actionDisabled: boolean;
  onRefresh: () => void;
  onRefreshHistory: () => void;
  onWatch: (match: SpectatorMatchSummary) => void;
  onRewatch: (matchId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<SpectatorLobbyFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pvp' | 'pvbot'>('all');
  const [winnerFilter, setWinnerFilter] = useState<boolean>(false);

  const visibleMatches = matches.filter((match) => {
    // Status filter
    if (statusFilter !== 'all' && statusFilter !== 'completed') {
      if (statusFilter === 'has-moves') {
        if ((match.turnNumber ?? 0) <= 0) return false;
      } else if (match.status !== statusFilter) {
        return false;
      }
    }

    // Type filter
    if (typeFilter === 'pvp' && !match.isPvP) return false;
    if (typeFilter === 'pvbot' && match.isPvP) return false;

    return true;
  });

  const visibleHistory = history.filter((match) => {
    // Winner filter
    if (winnerFilter && !match.winnerName) return false;

    // Type filter
    if (typeFilter === 'pvp' && !match.isPvP) return false;
    if (typeFilter === 'pvbot' && match.isPvP) return false;

    return true;
  });

  return (
    <div class="lobby" style="min-height: 80vh; padding: 2rem;">
      <div class="hud-panel" style="max-width: 1040px; margin: 0 auto; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div>
            <h1 class="title" style="font-size: 2rem;">
              SPECTATOR_LOBBY
            </h1>
            <p class="subtitle">LIVE_MATCH_OBSERVATION</p>
          </div>
          <div class="action-row">
            <button
              class="btn btn-secondary"
              data-testid="spectator-lobby-refresh"
              onClick={() => {
                onRefresh();
                onRefreshHistory();
              }}
            >
              REFRESH
            </button>
            <button
              class="btn btn-secondary"
              onClick={() => {
                setScreen('lobby');
              }}
            >
              RETURN
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
          <div class="action-row">
            {(['all', 'waiting', 'active', 'has-moves', 'completed'] as const).map((option) => (
              <button
                key={option}
                class={`btn ${statusFilter === option ? 'btn-primary' : 'btn-secondary'}`}
                data-testid={`spectator-lobby-filter-${option}`}
                onClick={() => {
                  setStatusFilter(option);
                }}
              >
                {option.toUpperCase().replace('-', '_')}
              </button>
            ))}
          </div>

          <div style="display: flex; gap: 16px; align-items: center; border-top: 1px solid var(--border); padding-top: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="section-label" style="margin: 0; font-size: 0.6rem; opacity: 0.6;">
                ENGAGEMENT_TYPE:
              </span>
              {(['all', 'pvp', 'pvbot'] as const).map((option) => (
                <button
                  key={option}
                  class="btn"
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.6rem',
                    minWidth: '60px',
                    background: typeFilter === option ? 'var(--neon-blue)' : 'transparent',
                    borderColor: typeFilter === option ? 'var(--neon-blue)' : 'var(--border)',
                    color: typeFilter === option ? '#000' : 'var(--text-dim)',
                  }}
                  onClick={() => setTypeFilter(option)}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>

            {(statusFilter === 'all' || statusFilter === 'completed') && (
              <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                <input
                  type="checkbox"
                  id="winner-only-checkbox"
                  checked={winnerFilter}
                  onChange={(e) => setWinnerFilter(e.currentTarget.checked)}
                  style="cursor: pointer; width: 12px; height: 12px; accent-color: var(--neon-defense);"
                />
                <label
                  for="winner-only-checkbox"
                  class="status-val"
                  style="cursor: pointer; font-size: 0.6rem; letter-spacing: 0.05em; opacity: 0.8;"
                >
                  DECLARED_WINNER_ONLY
                </label>
              </div>
            )}
          </div>
        </div>

        {statusFilter !== 'completed' && (
          <>
            {loading && <div class="status-card">SYNCHRONIZING_SPECTATOR_MATCHES…</div>}
            {!loading && error && <div class="status-card">{error}</div>}
            {!loading && !error && visibleMatches.length === 0 && (
              <div class="status-card" data-testid="spectator-lobby-empty">
                NO_MATCHES_FOUND
              </div>
            )}
            {!loading && !error && visibleMatches.length > 0 && (
              <section style="display: flex; flex-direction: column; gap: 12px;">
                {visibleMatches.map((match) => (
                  <SpectatorMatchRow
                    key={match.matchId}
                    match={match}
                    actionDisabled={actionDisabled}
                    onWatch={onWatch}
                  />
                ))}
              </section>
            )}
          </>
        )}

        {(statusFilter === 'all' || statusFilter === 'completed') && (
          <section style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;">
            <h2 class="section-label">HISTORICAL_REWATCH</h2>
            {historyLoading && <div class="status-card">SYNCHRONIZING_MATCH_HISTORY…</div>}
            {!historyLoading && historyError && <div class="status-card">{historyError}</div>}
            {!historyLoading && !historyError && visibleHistory.length === 0 && (
              <div class="status-card" data-testid="spectator-history-empty">
                NO_MATCHES_FOUND
              </div>
            )}
            {!historyLoading &&
              !historyError &&
              visibleHistory.map((match) => (
                <div
                  class="status-card"
                  data-testid="spectator-history-row"
                  key={match.matchId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: '12px',
                    alignItems: 'center',
                    borderLeftColor: match.isPvP ? 'var(--neon-blue)' : 'var(--text-dim)',
                  }}
                >
                  <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0;">
                    <span class="status-title" style="overflow-wrap: anywhere;">
                      {match.player1Name} vs {match.player2Name}
                    </span>
                    <span class="status-val">
                      {match.isPvP ? 'PVP_MATCH' : 'PLAYER_VS_BOT'} · WINNER{' '}
                      {match.winnerName ?? 'DRAW'} · TURNS {match.totalTurns}
                    </span>
                    <span class="status-val">
                      COMPLETED {formatLobbyTimestamp(match.completedAt)}
                    </span>
                  </div>
                  <button
                    class="btn btn-secondary"
                    data-testid="spectator-history-rewatch-btn"
                    onClick={() => {
                      onRewatch(match.matchId);
                    }}
                  >
                    REWATCH
                  </button>
                </div>
              ))}
          </section>
        )}
      </div>
    </div>
  );
}

function describeRewatchAction(action: RewatchActionEntry | undefined, step: number): string {
  if (step === 0 || !action) return 'Step 0 — Initial state';
  return `Turn ${step} — Player ${action.playerIndex + 1} played ${action.type.toUpperCase()}`;
}

function RewatchGameFrame({ state }: { state: AppState }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [GameModule, setGameModule] = useState<{
    renderGame: typeof renderGame;
    renderGameOver: typeof renderGameOver;
  } | null>(null);

  useEffect(() => {
    Promise.all([import('./game'), import('./game-over')]).then(([gameMod, gameOverMod]) => {
      setGameModule({ ...gameMod, ...gameOverMod });
    });
  }, []);

  useEffect(() => {
    const target = boardRef.current;
    if (!target || !GameModule) return;

    if (state.gameState?.phase === 'gameOver') {
      GameModule.renderGameOver(target, state);
    } else {
      GameModule.renderGame(target, state);
    }
  }, [state, GameModule]);

  return (
    <div
      ref={boardRef}
      style="min-height: 600px"
      data-testid="game-layout"
      data-spectator="true"
      data-rewatch="true"
    />
  );
}

interface MatchComment {
  id: string;
  userId: string;
  gamertag: string;
  avatarIcon: string | null;
  content: string;
  step: number | null;
  createdAt: string;
}

interface MatchSocialStats {
  averageRating: number;
  totalRatings: number;
  favoriteCount: number;
}

function RewatchScreen({
  state,
  matchId,
  step,
}: {
  state: AppState;
  matchId: string;
  step: number;
}) {
  const [log, setLog] = useState<RewatchActionLog | null>(null);
  const [snapshot, setSnapshot] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);

  // Social state
  const [isFavorited, setIsFavorited] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [socialStats, setMatchSocialStats] = useState<MatchSocialStats | null>(null);
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/matches/${matchId}/actions`).then((res) => {
        if (!res.ok) throw new Error(`Action log unavailable (${res.status})`);
        return res.json();
      }),
      fetch(`/api/matches/${matchId}/social-stats`).then((res) => (res.ok ? res.json() : null)),
      fetch(`/api/matches/${matchId}/comments`).then((res) => (res.ok ? res.json() : [])),
      fetch(`/api/users/${state.user?.id}/favorites`).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([logPayload, statsPayload, commentsPayload, favsPayload]) => {
        setLog(logPayload as RewatchActionLog);
        setMatchSocialStats(statsPayload as MatchSocialStats);
        setComments(commentsPayload as MatchComment[]);
        setIsFavorited(
          Array.isArray(favsPayload) &&
            favsPayload.some((m: SpectatorMatchSummary) => m.matchId === matchId),
        );
        setLoading(false);
      })
      .catch(() => {
        setError('Unable to load replay action log.');
        setLoading(false);
      });
  }, [matchId, state.user?.id]);

  useEffect(() => {
    let active = true;
    // We don't set loading here to avoid flickering the board during playback
    fetch(`/api/matches/${matchId}/replay?step=${step}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Replay step unavailable (${res.status})`);
        return res.json();
      })
      .then((payload) => {
        if (!active) return;
        setError(null);
        setSnapshot(payload as GameState);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load replay step.');
      });
    return () => {
      active = false;
    };
  }, [matchId, step]);

  const totalActions = log?.totalActions ?? 0;
  const currentAction = step === 0 ? undefined : log?.actions[Math.min(step, totalActions) - 1];
  const actionLabel = describeRewatchAction(currentAction, step);

  useEffect(() => {
    if (!playing || totalActions <= 0 || step >= totalActions) {
      if (step >= totalActions) setPlaying(false);
      return;
    }
    const interval = window.setInterval(() => {
      const next = Math.min(totalActions, step + 1);
      setRewatchStep(next);
    }, 1500 / speed);
    return () => {
      window.clearInterval(interval);
    };
  }, [playing, speed, step, totalActions]);

  const rewatchState = useMemo((): AppState | null => {
    if (!snapshot) return null;
    return {
      ...state,
      screen: 'game',
      matchId,
      gameState: snapshot,
      isSpectator: state.rewatchViewerIndex === null,
      playerIndex: state.rewatchViewerIndex,
      selectedAttacker: null,
      selectedDeployCard: null,
      validActions: [],
      spectatorCount: 0,
      error: null,
      rewatchStep: step,
      rewatchMatchId: matchId,
    };
  }, [state, snapshot, matchId, step]);

  const copyStepLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('screen', 'rewatch');
    url.searchParams.set('matchId', matchId);
    url.searchParams.set('step', String(step));
    navigator.clipboard.writeText(url.toString()).then(() => {
      alert('REPLAY_LINK_COPIED');
    });
  };

  const handleFavoriteToggle = async () => {
    const method = isFavorited ? 'DELETE' : 'POST';
    try {
      const res = await fetch(`/api/matches/${matchId}/favorite`, {
        method,
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setIsFavorited(!isFavorited);
    } catch {
      /* ignore */
    }
  };

  const handleRate = async (rating: number) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) setUserRating(rating);
    } catch {
      /* ignore */
    }
  };

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ content: commentInput, step }),
      });
      if (res.ok) {
        setCommentInput('');
        // Refresh comments
        const freshComments = await fetch(`/api/matches/${matchId}/comments`).then((r) => r.json());
        setComments(freshComments);
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div class="lobby" style="min-height: 80vh; padding: 2rem;">
      <div class="hud-panel" style="max-width: 1280px; margin: 0 auto; width: 100%;">
        <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; margin-bottom: 16px;">
          <div>
            <h1 class="title" style="font-size: 2rem;">
              REWATCH
            </h1>
            <div style="display: flex; gap: 12px; align-items: center;">
              <p class="subtitle" data-testid="rewatch-match-header" style="margin: 0">
                {log ? `${log.player1Name} vs ${log.player2Name}` : matchId}
              </p>
              {socialStats && (
                <span class="meta-tag" style="font-size: 0.6rem; opacity: 0.7;">
                  {socialStats.averageRating.toFixed(1)} ⭐ · {socialStats.favoriteCount} FAVS
                </span>
              )}
            </div>
          </div>
          <div class="action-row">
            <button
              class={`btn ${isFavorited ? 'btn-primary' : 'btn-secondary'}`}
              onClick={handleFavoriteToggle}
              title={isFavorited ? 'Unfavorite Engagement' : 'Favorite Engagement'}
              disabled={!state.user}
            >
              {isFavorited ? '⭐ FAVORITED' : '☆ FAVORITE'}
            </button>
            <button class="btn btn-secondary" onClick={copyStepLink}>
              SHARE_STEP
            </button>
            <button
              class="btn btn-secondary"
              onClick={() => {
                setScreen('spectator_lobby');
              }}
            >
              RETURN
            </button>
          </div>
        </div>

        {loading && <div class="status-card">SYNCHRONIZING_REPLAY_LOG…</div>}
        {error && (
          <div class="status-card" style="color: var(--neon-red)">
            {error}
          </div>
        )}

        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 1rem;">
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="status-card" style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center;">
                <span class="status-title" data-testid="rewatch-action-label">
                  {actionLabel}
                </span>
                <div style="display: flex; gap: 12px; align-items: center">
                  {state.user && (
                    <div style="display: flex; gap: 4px; align-items: center; margin-right: 12px;">
                      <span class="status-val" style="font-size: 0.6rem; opacity: 0.6;">
                        RATE:
                      </span>
                      {[1, 2, 3, 4, 5].map((r) => (
                        <span
                          key={r}
                          style={{
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: r <= (userRating ?? 0) ? 'var(--gold)' : 'var(--text-dim)',
                          }}
                          onClick={() => handleRate(r)}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                  <span class="meta-tag" data-testid="rewatch-step-label">
                    STEP {Math.min(step, totalActions)} / {totalActions}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={totalActions}
                value={Math.min(step, totalActions)}
                data-testid="rewatch-step-scrubber"
                onInput={(e) => {
                  setPlaying(false);
                  setRewatchStep(Number(e.currentTarget.value));
                }}
              />
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div class="action-row" style="margin: 0;">
                  <button
                    class="btn btn-secondary"
                    data-testid="rewatch-prev-btn"
                    disabled={step <= 0}
                    onClick={() => {
                      setPlaying(false);
                      setRewatchStep(step - 1);
                    }}
                  >
                    PREV
                  </button>
                  <button
                    class="btn btn-secondary"
                    data-testid="rewatch-play-btn"
                    disabled={totalActions === 0}
                    onClick={() => {
                      setPlaying(!playing);
                    }}
                  >
                    {playing ? 'PAUSE' : 'PLAY'}
                  </button>
                  <button
                    class="btn btn-secondary"
                    data-testid="rewatch-next-btn"
                    disabled={step >= totalActions}
                    onClick={() => {
                      setPlaying(false);
                      setRewatchStep(step + 1);
                    }}
                  >
                    NEXT
                  </button>
                  <select
                    data-testid="rewatch-speed"
                    value={String(speed)}
                    style="background: rgba(0,0,0,0.3); color: #fff; border: 1px solid var(--border); font-family: var(--font-mono); font-size: 0.7rem; padding: 4px 8px;"
                    onChange={(e) => {
                      setSpeed(Number(e.currentTarget.value) as 0.5 | 1 | 2);
                    }}
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                  </select>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="section-label" style="margin: 0; font-size: 0.6rem; opacity: 0.6;">
                    VIEWPOINT:
                  </span>
                  {(
                    [
                      { label: 'P1', value: 0 },
                      { label: 'P2', value: 1 },
                      { label: 'SPEC', value: null },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={String(opt.value)}
                      class="btn"
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.6rem',
                        minWidth: '40px',
                        background:
                          state.rewatchViewerIndex === opt.value
                            ? 'var(--neon-blue)'
                            : 'transparent',
                        borderColor:
                          state.rewatchViewerIndex === opt.value
                            ? 'var(--neon-blue)'
                            : 'var(--border)',
                        color: state.rewatchViewerIndex === opt.value ? '#000' : 'var(--text-dim)',
                      }}
                      onClick={() => setRewatchViewerIndex(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div data-testid="rewatch-board" style="position: relative;">
              {!snapshot && !error && <div class="status-card">SYNCHRONIZING_GAME_STATE…</div>}
              {rewatchState && <RewatchGameFrame state={rewatchState} />}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div
              class="hud-panel"
              style="flex: 1; display: flex; flex-direction: column; gap: 12px; padding: 1rem;"
            >
              <h3 class="section-label" style="margin: 0">
                TACTICAL_COMMENTS
              </h3>
              <div
                style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; max-height: 500px;"
              >
                {comments.length === 0 ? (
                  <div style="font-size: 0.7rem; opacity: 0.3; font-style: italic;">
                    No comments yet. Be the first to analyze!
                  </div>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      style="font-size: 0.7rem; background: rgba(255,255,255,0.03); padding: 8px; border-left: 2px solid var(--border);"
                    >
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span
                          style="color: var(--neon-blue); font-weight: bold; cursor: pointer;"
                          onClick={() => {
                            setProfileId(c.userId);
                            setScreen('profile');
                          }}
                        >
                          {c.gamertag}
                        </span>
                        {c.step !== null && (
                          <span
                            class="meta-tag"
                            style="cursor: pointer; font-size: 0.5rem;"
                            onClick={() => setRewatchStep(c.step!)}
                          >
                            STEP {c.step}
                          </span>
                        )}
                      </div>
                      <div style="color: #fff; line-height: 1.4;">{c.content}</div>
                      <div style="font-size: 0.5rem; opacity: 0.4; margin-top: 4px; text-align: right;">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {state.user && (
                <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border); padding-top: 12px;">
                  <textarea
                    class="input-group"
                    style="background: rgba(0,0,0,0.3); color: #fff; border: 1px solid var(--border); font-family: var(--font-mono); font-size: 0.7rem; padding: 8px; min-height: 60px; resize: none;"
                    placeholder="Analyze current step..."
                    value={commentInput}
                    onInput={(e) => setCommentInput(e.currentTarget.value)}
                  />
                  <button
                    class="btn btn-primary btn-tiny w-full"
                    disabled={!commentInput.trim() || isSubmittingComment}
                    onClick={handleSubmitComment}
                  >
                    POST_COMMENT (STEP {step})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line complexity -- LobbyApp intentionally composes multiple screen modes and action surfaces.
function LobbyApp({ container, state }: { container: HTMLElement; state: AppState }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);

  const [selectedRows, setSelectedRows] = useState(2);
  const [selectedColumns, setSelectedColumns] = useState(4);
  const [matchCode, setMatchCode] = useState('');
  const [watchCode, setWatchCode] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [resetToken, setResetToken] = useState(
    new URLSearchParams(window.location.search).get('token'),
  );
  const [helpOpen, setHelpOpen] = useState(() => {
    const stored = localStorage.getItem('phx:helpOpen');
    return stored === null ? true : stored === 'true';
  });
  const setHelpOpenPersist = (open: boolean) => {
    setHelpOpen(open);
    localStorage.setItem('phx:helpOpen', String(open));
  };
  const [listPublicly, setListPublicly] = useState(false);
  const welcome = useWelcomeDialog();
  const {
    activeMatches,
    activeMatchesLoading,
    activeMatchesError,
    openMatches,
    openMatchesLoading,
    openMatchesError,
    profile,
    profileLoading,
    profileError,
    refreshActiveMatches,
    refreshOpenMatches,
  } = useLobbyMatchLists(state);
  const {
    pendingAction,
    isTaskRunning,
    queueLobbyAction,
    resumeActiveMatch,
    abandonActiveMatch,
    sendCreateMatch,
    sendQuickMatch,
    sendOpenMatch,
  } = useLobbyMatchActions({
    container,
    state,
    selectedRows,
    selectedColumns,
    refreshActiveMatches,
  });
  const spectatorLobby = useSpectatorMatches(state.screen === 'spectator_lobby');
  const matchHistory = useMatchHistory(state.screen === 'spectator_lobby');

  useEffect(() => {
    // Restore session on boot if no user yet
    if (!state.user) {
      void restoreSession();
    }
  }, []);

  // eslint-disable-next-line complexity -- Legacy deep-link dispatcher maps all lobby URL entry points.
  useEffect(() => {
    if (state.connectionState === 'OPEN') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const matchId = params.get('matchId') || params.get('match');
      const screenParam = params.get('screen');
      const profileParam = params.get('profile');

      if (action || matchId || screenParam || profileParam) {
        // Clear one-time actions from URL, but preserve view states (screen/profile)
        if (action || matchId || params.get('watch')) {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('action');
          cleanUrl.searchParams.delete('matchId');
          cleanUrl.searchParams.delete('match');
          cleanUrl.searchParams.delete('watch');
          window.history.replaceState({}, '', cleanUrl.toString());
        }

        if (screenParam === 'ladder') {
          setScreen('ladder');
        } else if (screenParam === 'settings') {
          setScreen('settings');
        } else if (screenParam === 'public_lobby') {
          setScreen('public_lobby');
        } else if (screenParam === 'spectator_lobby') {
          setScreen('spectator_lobby');
        } else if (screenParam === 'rewatch' && matchId) {
          const parsedStep = Number.parseInt(params.get('step') ?? '0', 10);
          openRewatch(matchId, Number.isNaN(parsedStep) ? 0 : parsedStep);
        } else if (profileParam) {
          // When entering via deep link, we need to set both
          setState({ screen: 'profile', profileId: profileParam });
        } else if (action === 'quickMatch') {
          queueLobbyAction('QUICK_MATCH…', () => sendQuickMatch());
        } else if (action === 'bot-random') {
          queueLobbyAction('BOOTING_AI…', () => sendCreateMatch('bot-random'));
        } else if (action === 'bot-heuristic') {
          queueLobbyAction('BOOTING_AI…', () => sendCreateMatch('bot-heuristic'));
        } else if (action === 'privateMatch') {
          queueLobbyAction('INITIALIZING…', () => sendCreateMatch());
        } else if (action === 'publicMatch') {
          queueLobbyAction('OPEN_MATCH…', () => sendOpenMatch());
        } else if (action === 'join' && matchId) {
          const currentId = getLobbyOperativeId(state);
          const joinName = state.user
            ? formatGamertag(state.user.gamertag, state.user.suffix)
            : (currentId ?? getQuickMatchOperativeId(currentId));
          queueLobbyAction('JOINING_PUBLIC_MATCH…', () => {
            startActionTimeout();
            getConnection()?.send({
              type: 'joinMatch',
              matchId,
              playerName: joinName,
            });
          });
        } else if (action === 'logout') {
          void logout();
        } else if (action === 'watch' && matchId) {
          queueLobbyAction('INITIALIZING_SPECTATOR_LINK…', () => {
            getConnection()?.send({ type: 'watchMatch', matchId });
          });
        } else if (matchId && !action) {
          // If a matchId/match is provided without a specific action, we attempt to rejoin it
          queueLobbyAction('RESUMING_OPERATION…', () => {
            startActionTimeout();
            getConnection()?.send({
              type: 'rejoinMatch',
              matchId,
              playerId: state.user?.id || 'guest',
            });
          });
        }
      }

      // Handle legacy/spectator 'watch' parameter
      const watchMatchId = params.get('watch');
      if (watchMatchId) {
        window.history.replaceState({}, '', window.location.pathname);
        queueLobbyAction('INITIALIZING_SPECTATOR_LINK…', () => {
          getConnection()?.send({ type: 'watchMatch', matchId: watchMatchId });
        });
      }
    }
  }, [state.connectionState]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (typeof window !== 'undefined' && window.self === window.top) {
        nameRef.current?.focus();
      }
    }, 100);
    return () => {
      clearTimeout(id);
    };
  }, [state.screen]); // Re-focus when switching back to lobby

  if (state.screen === 'auth') {
    return <AuthScreen />;
  }
  if (state.screen === 'waiting') {
    return <WaitingApp state={state} />;
  }
  if (state.screen === 'ladder') {
    return (
      <div class="lobby" style="min-height: 80vh; padding: 2rem;">
        <div class="hud-panel" style="max-width: 800px; margin: 0 auto; width: 100%;">
          <Leaderboard />
          <button
            class="btn btn-secondary mt-4 w-full"
            onClick={() => {
              setScreen('lobby');
            }}
          >
            RETURN_TO_LOBBY
          </button>
        </div>
      </div>
    );
  }
  if (state.screen === 'profile' && state.profileId) {
    return (
      <PublicProfileView
        profileId={state.profileId}
        onClose={() => {
          setScreen('lobby');
        }}
      />
    );
  }
  const currentOperativeId = getLobbyOperativeId(state);
  const onNameInput = (value: string): void => {
    setOperativeId(value.trim());
  };

  const actionControlsDisabled =
    isTaskRunning || pendingAction !== null || state.connectionState !== 'OPEN';
  const lobbyStatus = describeLobbyStatus({
    connectionState: state.connectionState,
    pendingAction,
    healthHint: state.serverHealth?.hint ?? null,
  });
  const joinPublicMatch = (match: OpenMatchSummary) => {
    const joinName = state.user
      ? formatGamertag(state.user.gamertag, state.user.suffix)
      : (currentOperativeId ?? getQuickMatchOperativeId(currentOperativeId));
    if (!state.user) {
      const validationError = validateOperativeId(joinName);
      if (validationError) {
        renderError(container, validationError);
        return;
      }
    }
    setOperativeId(joinName);
    queueLobbyAction('JOINING_PUBLIC_MATCH…', () => {
      startActionTimeout();
      getConnection()?.send({
        type: 'joinMatch',
        matchId: match.matchId,
        playerName: joinName,
      });
    });
  };

  if (state.screen === 'public_lobby') {
    return (
      <PublicLobbyScreen
        matches={openMatches}
        loading={openMatchesLoading}
        error={openMatchesError}
        actionDisabled={actionControlsDisabled}
        onRefresh={() => {
          void refreshOpenMatches();
        }}
        onJoin={joinPublicMatch}
      />
    );
  }

  if (state.screen === 'spectator_lobby') {
    return (
      <SpectatorLobbyScreen
        matches={spectatorLobby.matches}
        history={matchHistory.page.matches}
        loading={spectatorLobby.loading}
        historyLoading={matchHistory.loading}
        error={spectatorLobby.error}
        historyError={matchHistory.error}
        actionDisabled={actionControlsDisabled}
        onRefresh={() => {
          void spectatorLobby.refresh();
        }}
        onRefreshHistory={() => {
          void matchHistory.refresh();
        }}
        onWatch={(match) => {
          queueLobbyAction('INITIALIZING_SPECTATOR_LINK…', () => {
            getConnection()?.send({ type: 'watchMatch', matchId: match.matchId });
          });
        }}
        onRewatch={(matchId) => {
          openRewatch(matchId, 0);
        }}
      />
    );
  }

  if (state.screen === 'rewatch' && state.rewatchMatchId) {
    return <RewatchScreen state={state} matchId={state.rewatchMatchId} step={state.rewatchStep} />;
  }

  return (
    <div class={`lobby ${state.themePhx ? 'theme-vector' : 'theme-classic'}`}>
      {state.screen === 'settings' && (
        <SettingsPanel
          state={state}
          onClose={() => {
            setScreen('lobby');
          }}
        />
      )}
      <div class="cinematic-overlay">
        <div class="cinematic-pulse" />
      </div>

      <header class="lobby-header">
        <div>
          <h1 class="title">PHALANX DUEL</h1>
          <p class="subtitle">TACTICAL_INIT_SYSTEM_v1.1</p>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px">
          <div style="display: flex; gap: 8px; align-items: center">
            <button
              id="phx-lobby-help-btn"
              class="btn btn-secondary btn-tiny"
              style="padding: 2px 8px; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: 900"
              onClick={() => {
                setHelpOpenPersist(true);
              }}
            >
              ?
            </button>
            <div class="meta-tag">WIRE_0.5 | SPEC_1.0</div>
          </div>
          <UserBar
            state={state}
            onFocusId={() => {
              nameRef.current?.focus();
            }}
          />
        </div>
      </header>

      <div class="lobby-grid">
        {/* LEFT: INITIATION ZONE */}
        <section class="lobby-col">
          <div class="hud-panel">
            <h2 class="section-label">ENGAGEMENT_SELECT</h2>

            {!state.user && (
              <div class="input-group">
                <label class="input-header">GUEST_OPERATIVE_ID</label>
                <input
                  id="phx-lobby-name-input"
                  ref={nameRef}
                  type="text"
                  class="name-input"
                  placeholder="REGISTER_NAME"
                  maxLength={20}
                  data-testid="lobby-name-input"
                  value={currentOperativeId ?? ''}
                  disabled={actionControlsDisabled}
                  onInput={(e) => {
                    onNameInput(e.currentTarget.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      queueLobbyAction('INITIALIZING…', () =>
                        sendCreateMatch(
                          undefined,
                          undefined,
                          listPublicly ? 'public_open' : 'private',
                        ),
                      );
                  }}
                />
              </div>
            )}

            <div class="engagement-grid">
              <div class="engagement-section solo-section">
                <h3 class="engagement-label">SOLO_OPERATIONS</h3>
                <a
                  id="phx-lobby-quick-start-btn"
                  class="btn btn-primary btn-large"
                  data-testid="lobby-quick-match-btn"
                  href="?action=quickMatch"
                  aria-disabled={actionControlsDisabled}
                  style="width: 100%; display: block; text-align: center; box-sizing: border-box;"
                  onClick={(e) => {
                    e.preventDefault();
                    if (actionControlsDisabled) return;
                    queueLobbyAction('QUICK_MATCH…', () => sendQuickMatch());
                  }}
                >
                  {pendingAction === 'QUICK_MATCH…' ? 'INITIALIZING…' : 'QUICK_START'}
                </a>
                <div class="action-row mt-3">
                  <a
                    id="phx-lobby-bot-easy"
                    class="btn btn-secondary"
                    data-testid="lobby-bot-btn-easy"
                    href="?action=bot-random"
                    aria-disabled={actionControlsDisabled}
                    onClick={(e) => {
                      e.preventDefault();
                      if (actionControlsDisabled) return;
                      queueLobbyAction('BOOTING_AI…', () => sendCreateMatch('bot-random'));
                    }}
                  >
                    BOT_EASY
                  </a>
                  <a
                    id="phx-lobby-bot-med"
                    class="btn btn-secondary"
                    data-testid="lobby-bot-btn-med"
                    href="?action=bot-heuristic"
                    aria-disabled={actionControlsDisabled}
                    onClick={(e) => {
                      e.preventDefault();
                      if (actionControlsDisabled) return;
                      queueLobbyAction('BOOTING_AI…', () => sendCreateMatch('bot-heuristic'));
                    }}
                  >
                    BOT_MED
                  </a>
                </div>
              </div>

              <div class="engagement-section squad-section">
                <h3 class="engagement-label">SQUAD_OPERATIONS</h3>
                <div class="action-row">
                  <a
                    id="phx-lobby-private-match"
                    class="btn btn-secondary"
                    data-testid="lobby-create-btn"
                    href="?action=privateMatch"
                    aria-disabled={actionControlsDisabled}
                    onClick={(e) => {
                      e.preventDefault();
                      if (actionControlsDisabled) return;
                      queueLobbyAction('INITIALIZING…', () =>
                        sendCreateMatch(
                          undefined,
                          undefined,
                          listPublicly ? 'public_open' : 'private',
                        ),
                      );
                    }}
                  >
                    PRIVATE_MATCH
                  </a>
                  <a
                    id="phx-lobby-public-lobby"
                    class="btn btn-secondary"
                    data-testid="lobby-open-match-btn"
                    href="?screen=public_lobby"
                    onClick={(e) => {
                      e.preventDefault();
                      setScreen('public_lobby');
                    }}
                  >
                    PUBLIC_LOBBY
                  </a>
                  <a
                    id="phx-lobby-spectator-lobby"
                    class="btn btn-secondary"
                    data-testid="lobby-spectator-lobby-btn"
                    href="?screen=spectator_lobby"
                    onClick={(e) => {
                      e.preventDefault();
                      setScreen('spectator_lobby');
                    }}
                  >
                    SPECTATOR_LOBBY
                  </a>
                </div>
                <div
                  class="mt-3"
                  style="display: flex; align-items: center; gap: 8px; opacity: 0.8"
                >
                  <input
                    type="checkbox"
                    id="list-publicly-checkbox"
                    data-testid="list-publicly-toggle"
                    style="cursor: pointer; width: 14px; height: 14px; accent-color: var(--neon-offense);"
                    checked={listPublicly}
                    onChange={(e) => {
                      setListPublicly(e.currentTarget.checked);
                    }}
                  />
                  <label
                    for="list-publicly-checkbox"
                    class="status-val"
                    style="cursor: pointer; color: var(--text-muted); font-size: 0.6rem; letter-spacing: 0.05em;"
                  >
                    List in public lobby (30 min)
                  </label>
                </div>
              </div>

              {state.user && (
                <div class="engagement-section ranked-section">
                  <h3 class="engagement-label">RANKED_OPERATIONS</h3>
                  <button
                    id="phx-lobby-ranked-queue-btn"
                    data-testid="lobby-ranked-queue-btn"
                    class={`btn ${state.queueStatus === 'searching' ? 'btn-secondary' : 'btn-primary'} btn-large`}
                    style="width: 100%"
                    disabled={actionControlsDisabled}
                    onClick={() => {
                      if (state.queueStatus === 'searching') {
                        getConnection()?.send({ type: 'leaveQueue', msgId: crypto.randomUUID() });
                      } else {
                        getConnection()?.send({ type: 'joinQueue', msgId: crypto.randomUUID() });
                      }
                    }}
                  >
                    {state.queueStatus === 'searching'
                      ? 'SEARCHING… (CANCEL)'
                      : 'FIND_RANKED_MATCH'}
                  </button>
                </div>
              )}
            </div>

            <div class="input-group mt-4">
              <button
                class="btn btn-tiny w-full"
                data-testid="advanced-options-toggle"
                onClick={() => {
                  setAdvancedOpen(!advancedOpen);
                }}
              >
                {advancedOpen ? 'HIDE_ADVANCED \u25B4' : 'SHOW_ADVANCED \u25BE'}
              </button>
            </div>

            {advancedOpen && (
              <div class="hud-panel mb-4" data-testid="advanced-options-panel">
                <div class="config-inline">
                  <div class="config-item">
                    <label>MODE</label>
                    <select
                      data-testid="lobby-damage-mode"
                      value={state.damageMode}
                      disabled={actionControlsDisabled}
                      onChange={(e) => {
                        setDamageMode(e.currentTarget.value as DamageMode);
                      }}
                    >
                      <option value="cumulative">CUMULATIVE</option>
                      <option value="classic">CLASSIC</option>
                    </select>
                  </div>
                  <div class="config-item">
                    <label>CORE_LP</label>
                    <input
                      type="number"
                      data-testid="lobby-starting-lp"
                      value={String(state.startingLifepoints)}
                      disabled={actionControlsDisabled}
                      onChange={(e) => {
                        setStartingLifepoints(Number(e.currentTarget.value));
                      }}
                    />
                  </div>
                  <div class="config-item">
                    <label>GRID</label>
                    <div style="display: flex; gap: 4px">
                      <input
                        type="number"
                        data-testid="advanced-rows-input"
                        style="width: 50%"
                        value={String(selectedRows)}
                        onChange={(e) => {
                          setSelectedRows(toBoundedInt(e.currentTarget.value, selectedRows, 1, 12));
                        }}
                      />
                      <input
                        type="number"
                        data-testid="advanced-columns-input"
                        style="width: 50%"
                        value={String(selectedColumns)}
                        onChange={(e) => {
                          setSelectedColumns(
                            toBoundedInt(e.currentTarget.value, selectedColumns, 1, 12),
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: INTELLIGENCE ZONE */}
        <section class="lobby-col">
          <div class="hud-panel">
            <h2 class="section-label">INTELLIGENCE_ZONE</h2>

            <div
              className={`status-card lobby-status-card lobby-status-card--${lobbyStatus.tone}`}
              role="status"
            >
              <div>
                <span class="status-title lobby-status">{lobbyStatus.detail}</span>
              </div>
              <span class="status-val lobby-status-detail">{lobbyStatus.title}</span>
            </div>

            <CascadeVisualizer
              damageMode={state.damageMode}
              startingLifepoints={state.startingLifepoints}
            />

            {state.user && (
              <div class="hud-panel" data-testid="active-match-panel">
                <h3 class="section-label">ACTIVE_MATCH_RECOVERY</h3>
                {activeMatchesLoading && (
                  <div class="status-card" data-testid="active-match-loading">
                    SYNCHRONIZING_RECOVERY_STATE…
                  </div>
                )}
                {!activeMatchesLoading && activeMatchesError && (
                  <div class="status-card" data-testid="active-match-error">
                    {activeMatchesError}
                  </div>
                )}
                {!activeMatchesLoading && !activeMatchesError && activeMatches.length === 0 && (
                  <div class="status-card" data-testid="active-match-empty">
                    NO_PENDING_OPERATIONS
                  </div>
                )}
                {!activeMatchesLoading &&
                  !activeMatchesError &&
                  activeMatches.map((match) => (
                    <div
                      class="status-card"
                      data-testid="active-match-entry"
                      key={match.matchId}
                      style="display: flex; flex-direction: column; align-items: stretch; gap: 10px;"
                    >
                      <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                          <span class="status-title">
                            {match.botStrategy
                              ? `BOT_${match.botStrategy.toUpperCase()}`
                              : (match.opponentName ?? 'OPPONENT_PENDING')}
                          </span>
                          <span class="status-val">
                            {match.status.toUpperCase()} • {match.phase ?? 'WAITING'}
                            {match.turnNumber ? ` • T${match.turnNumber}` : ''}
                          </span>
                          <span class="status-val">
                            MATCH {match.matchId.slice(0, 8)}
                            {match.disconnected ? ' • RECOVERABLE' : ''}
                          </span>
                        </div>
                        <span class="meta-tag">{match.role}</span>
                      </div>
                      <div class="action-row">
                        <a
                          class="btn btn-secondary"
                          data-testid="active-match-resume-btn"
                          href={`?match=${match.matchId}`}
                          aria-disabled={actionControlsDisabled}
                          style="text-align: center"
                          onClick={(e) => {
                            e.preventDefault();
                            if (actionControlsDisabled) return;
                            resumeActiveMatch(match);
                          }}
                        >
                          RESUME
                        </a>
                        <a
                          class="btn btn-secondary"
                          data-testid="active-match-abandon-btn"
                          href={`?action=abandon&matchId=${match.matchId}`}
                          aria-disabled={actionControlsDisabled}
                          style="text-align: center"
                          onClick={(e) => {
                            e.preventDefault();
                            if (actionControlsDisabled) return;
                            void abandonActiveMatch(match);
                          }}
                        >
                          ABANDON
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {state.user && (
              <div class="hud-panel" data-testid="public-profile-panel">
                <h3 class="section-label" style="display: flex; align-items: center; gap: 8px;">
                  OPERATIVE_PROFILE <span class="phx-beta-tag">BETA</span>
                </h3>
                {profileLoading && <div class="status-card">SYNCING_PROFILE…</div>}
                {!profileLoading && profileError && <div class="status-card">{profileError}</div>}
                {!profileLoading && !profileError && profile && (
                  <div class="status-card" style="display: flex; flex-direction: column; gap: 8px">
                    <div style="display: flex; justify-content: space-between; gap: 12px">
                      <span class="status-title">{profile.displayName}</span>
                      <span class="meta-tag">
                        {(profile.confidenceLabel ?? 'Provisional').toUpperCase()}
                      </span>
                    </div>
                    <div class="status-val">
                      ELO {profile.elo} · RECORD {profile.record.wins}-{profile.record.losses}-
                      {profile.record.draws}
                    </div>
                    <div class="status-val">
                      GAMES {profile.record.gamesPlayed} · STREAK {profile.streak}
                    </div>
                  </div>
                )}
                {!profileLoading && !profileError && !profile && (
                  <div class="status-card">NO_PROFILE_DATA</div>
                )}
              </div>
            )}

            <div class="hud-panel" data-testid="public-open-matches-panel">
              <h3 class="section-label" style="display: flex; align-items: center; gap: 8px;">
                OPEN_PUBLIC_MATCHES <span class="phx-beta-tag">BETA</span>
              </h3>
              {openMatchesLoading && (
                <div class="status-card" data-testid="open-matches-loading">
                  SYNCHRONIZING_PUBLIC_MATCHES…
                </div>
              )}
              {!openMatchesLoading && openMatchesError && (
                <div class="status-card" data-testid="open-matches-error">
                  {openMatchesError}
                </div>
              )}
              {!openMatchesLoading && !openMatchesError && openMatches.length === 0 && (
                <div class="status-card" data-testid="open-matches-empty">
                  NO_OPEN_MATCHES
                </div>
              )}
              {!openMatchesLoading &&
                !openMatchesError &&
                openMatches.map((match) => (
                  <div
                    class="status-card"
                    data-testid="open-match-entry"
                    key={match.matchId}
                    style="display: flex; flex-direction: column; gap: 10px"
                  >
                    <div style="display: flex; justify-content: space-between; gap: 12px">
                      <div style="display: flex; flex-direction: column; gap: 4px">
                        <span class="status-title">{match.creatorName}</span>
                        <span class="status-val">
                          ELO {match.creatorElo ?? 'UNK'} ·{' '}
                          {match.creatorRecord
                            ? `${match.creatorRecord.wins}-${match.creatorRecord.losses}-${match.creatorRecord.draws}`
                            : 'NO_RECORD'}
                        </span>
                        <span class="status-val">
                          {match.requirements?.requiresEstablishedRating
                            ? 'ESTABLISHED_ONLY · '
                            : ''}
                          {match.requirements?.minPublicRating !== null ||
                          match.requirements?.maxPublicRating !== null
                            ? `RANGE ${match.requirements?.minPublicRating ?? 'MIN'}-${
                                match.requirements?.maxPublicRating ?? 'MAX'
                              }`
                            : 'NO_RATING_RANGE'}
                        </span>
                        <span class="status-val">
                          {match.publicStatus?.toUpperCase() ?? 'OPEN'} ·{' '}
                          {match.players.filter((player) => player !== null).length}/2 ·{' '}
                          {match.ageSeconds}s
                        </span>
                        {!match.joinable && match.disabledReason && (
                          <span class="status-val">{match.disabledReason}</span>
                        )}
                      </div>
                      <span class="meta-tag">{match.openSeat}</span>
                    </div>
                    <a
                      class="btn btn-secondary"
                      data-testid="open-match-join-btn"
                      href={`?action=join&matchId=${match.matchId}`}
                      aria-disabled={actionControlsDisabled || !match.joinable}
                      style="text-align: center; display: block;"
                      onClick={(e) => {
                        e.preventDefault();
                        if (actionControlsDisabled || !match.joinable) return;
                        joinPublicMatch(match);
                      }}
                    >
                      {match.joinable ? 'JOIN_OPEN_MATCH' : 'UNAVAILABLE'}
                    </a>
                  </div>
                ))}
            </div>

            <div class="protocol-strip">
              <div class="protocol-step active">DEPLOY</div>
              <div class="protocol-step">FORMATION</div>
              <div class="protocol-step">ATTACK</div>
              <div class="protocol-step">CASCADE</div>
              <div class="protocol-step">RESOLVE</div>
            </div>

            <div class="input-group">
              <label class="input-header">AUTHORIZATION_BRIDGE</label>
              <div style="display: flex; gap: 8px; margin-bottom: 8px">
                <input
                  id="phx-lobby-join-input"
                  type="text"
                  placeholder="MATCH_ID"
                  data-testid="lobby-join-input"
                  class="btn-secondary"
                  style="flex: 1; text-align: left; background: rgba(0,0,0,0.2)"
                  onInput={(e) => {
                    setMatchCode(e.currentTarget.value);
                  }}
                />
                <button
                  id="phx-lobby-join-btn"
                  class="btn btn-secondary"
                  data-testid="lobby-join-btn"
                  onClick={() => {
                    startActionTimeout();
                    getConnection()?.send({
                      type: 'joinMatch',
                      matchId: matchCode,
                      playerName: currentOperativeId ?? '',
                    });
                  }}
                >
                  JOIN
                </button>
              </div>
              <div style="display: flex; gap: 8px">
                <input
                  id="phx-lobby-watch-input"
                  type="text"
                  placeholder="WATCH_ID"
                  data-testid="lobby-watch-input"
                  class="btn-secondary"
                  style="flex: 1; text-align: left; background: rgba(0,0,0,0.2)"
                  onInput={(e) => {
                    setWatchCode(e.currentTarget.value);
                  }}
                />
                <button
                  id="phx-lobby-watch-btn"
                  class="btn btn-secondary"
                  data-testid="lobby-watch-btn"
                  onClick={() => {
                    startActionTimeout();
                    getConnection()?.send({ type: 'watchMatch', matchId: watchCode });
                  }}
                >
                  WATCH
                </button>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 2rem">
              <MatchHistory
                userId={state.user?.id}
                token={getToken()}
                onRewatch={(matchId) => {
                  openRewatch(matchId, 0);
                }}
              />
              <Leaderboard />
            </div>
          </div>
        </section>
      </div>

      <footer class="lobby-footer phx-footer-nav">
        <a href="https://phalanxduel.com" class="footer-link">
          INTEL
        </a>
        <a
          href="?screen=ladder"
          class="footer-link"
          onClick={(e) => {
            e.preventDefault();
            setScreen('ladder');
          }}
        >
          LADDER
        </a>
        <a
          href="https://github.com/phalanxduel/game/blob/main/docs/gameplay/rules.md"
          class="footer-link"
          target="_blank"
        >
          RULES
        </a>
        {state.user && (
          <button
            class="footer-link btn-text"
            style="background: none; border: none; cursor: pointer;"
            onClick={() => {
              setScreen('settings');
            }}
          >
            PROFILE / SETTINGS
          </button>
        )}
        <button
          class="footer-link btn-text"
          style="background: none; border: none; cursor: pointer;"
          onClick={() => {
            setThemePhx(!state.themePhx);
          }}
        >
          {state.themePhx ? 'UI:VECTOR' : 'UI:CLASSIC'}
        </button>
        <button
          class="footer-link btn-text"
          style="background: none; border: none; cursor: pointer;"
          onClick={welcome.show}
        >
          ABOUT
        </button>

        <div style="flex: 1" />

        <div class="phx-footer-meta">
          <HealthBadge health={state.serverHealth} />
          <p class="meta-tag" style="opacity: 0.3; font-size: 0.5rem">
            BUILD_ID: v{__APP_VERSION__}
          </p>
        </div>
        <div ref={debugRef} />
      </footer>

      {helpOpen && (
        <HelpDialog
          topicId="lobby"
          onClose={() => {
            setHelpOpenPersist(false);
          }}
        />
      )}

      {welcome.open && (
        <WelcomeDialog
          onClose={welcome.dismiss}
          onRegister={() => {
            setScreen('auth');
          }}
        />
      )}

      {resetToken && (
        <ResetPasswordPanel
          token={resetToken}
          onClose={() => {
            setResetToken(null);
            // Clean up URL
            const url = new URL(window.location.href);
            url.searchParams.delete('token');
            window.history.replaceState({}, '', url);
          }}
        />
      )}
    </div>
  );
}

export function renderLobby(container: HTMLElement, state: AppState): void {
  preactRender(<LobbyApp container={container} state={state} />, container);
}

export function unmountLobby(container: HTMLElement): void {
  preactRender(null, container);
}

export function validateOperativeId(name: string): string | null {
  if (!name || name.trim().length === 0) return 'OPERATIVE_ID required';
  if (name.trim().length < 3) return 'OPERATIVE_ID too short (min 3)';
  if (name.trim().length > 20) return 'OPERATIVE_ID too long (max 20)';
  if (!/^[a-zA-Z0-9 _-]+$/.test(name)) return 'INVALID_CHARACTERS detected';
  if (!/[a-zA-Z0-9]/.test(name)) return 'ALPHANUMERIC_REQUIRED';
  return null;
}

export const validatePlayerName = validateOperativeId;
