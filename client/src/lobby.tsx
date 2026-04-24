import type { DamageMode, CreateMatchParamsPartial } from '@phalanxduel/shared';
import { formatGamertag } from '@phalanxduel/shared';
import { render as preactRender } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { getConnection, renderError } from './renderer';
import {
  setDamageMode,
  rememberSession,
  forgetSession,
  setPlayerName,
  setStartingLifepoints,
  setScreen,
  setThemePhx,
  startActionTimeout,
} from './state';
import type { AppState } from './state';
import { renderDebugButton } from './debug';

import { HealthBadge } from './components/HealthBadge';
import { Leaderboard } from './components/Leaderboard';
import { AuthPanel } from './components/AuthPanel';
import { getToken, logout, restoreSession } from './auth';
import { MatchHistory } from './components/MatchHistory';
import { WaitingApp } from './waiting';
import { getQuickMatchPlayerName } from './ux-derivations';

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

function UserBar({ state, onFocusName }: { state: AppState; onFocusName: () => void }) {
  if (state.user) {
    const displayName = formatGamertag(state.user.gamertag, state.user.suffix);
    return (
      <div class="status-card phx-header-status" style="border-left-color: var(--neon-blue)">
        <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end">
          <span
            class="status-title"
            style="font-weight: 900; color: var(--neon-blue); text-align: right"
          >
            {displayName}
          </span>
          <span
            class="status-val"
            style="color: var(--text-muted); font-size: 0.55rem; text-align: right"
          >
            OPERATIVE_ACTIVE
          </span>
        </div>
        <button
          class="btn btn-secondary"
          style="padding: 0.4rem 1rem; font-size: 0.6rem"
          onClick={() => void logout()}
        >
          DISCONNECT
        </button>
      </div>
    );
  }

  const showGuestInfo = () => {
    alert(
      'GUEST_MODE: Engagement authorized without persistent ID. \n\nNOTE: Matches will not be tracked for ELO or Match History. Enter an OPERATIVE_ID below to initialize.',
    );
    onFocusName();
  };

  return (
    <div class="status-card phx-header-status" style="border-left-color: var(--gold-dim)">
      <button class="btn btn-secondary phx-header-btn" onClick={showGuestInfo}>
        GUEST_MODE
      </button>
      <button
        class="btn btn-primary phx-header-btn"
        data-testid="userbar-authorize-btn"
        onClick={() => {
          setScreen('auth');
        }}
      >
        AUTHORIZE
      </button>
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

function LobbyApp({ container, state }: { container: HTMLElement; state: AppState }) {
  const nameRef = useRef<HTMLInputElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);

  const [selectedRows, setSelectedRows] = useState(2);
  const [selectedColumns, setSelectedColumns] = useState(4);
  const [matchCode, setMatchCode] = useState('');
  const [watchCode, setWatchCode] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeMatches, setActiveMatches] = useState<ActiveMatchSummary[]>([]);
  const [activeMatchesLoading, setActiveMatchesLoading] = useState(false);
  const [activeMatchesError, setActiveMatchesError] = useState<string | null>(null);

  useEffect(() => {
    // Restore session on boot if no user yet
    if (!state.user) {
      void restoreSession();
    }
  }, []);

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

  useEffect(() => {
    const host = debugRef.current;
    if (host) {
      host.textContent = '';
      renderDebugButton(host);
    }
  }, []);

  const onNameInput = (value: string): void => {
    setPlayerName(value.trim());
  };

  const [isTaskRunning, setIsTaskRunning] = useState(false);

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

  useEffect(() => {
    void refreshActiveMatches();
  }, [refreshActiveMatches]);

  function queueLobbyAction(label: string, task: () => void) {
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
  }

  const resumeActiveMatch = (match: ActiveMatchSummary) => {
    rememberSession({
      matchId: match.matchId,
      playerId: match.playerId,
      playerIndex: match.playerIndex,
      playerName: state.user
        ? formatGamertag(state.user.gamertag, state.user.suffix)
        : (state.playerName ?? ''),
    });
    queueLobbyAction('RESTORING_MATCH…', () => {
      startActionTimeout();
      getConnection()?.send({
        type: 'rejoinMatch',
        matchId: match.matchId,
        playerId: match.playerId,
      });
    });
  };

  const abandonActiveMatch = async (match: ActiveMatchSummary) => {
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
  };

  const sendCreateMatch = (
    opponent?: 'bot-random' | 'bot-heuristic',
    nameOverride?: string,
  ): boolean => {
    // Authenticated users use their DB name
    const name = state.user
      ? formatGamertag(state.user.gamertag, state.user.suffix)
      : (nameOverride ?? state.playerName ?? '').trim();

    if (!state.user) {
      const validationError = validatePlayerName(name);
      if (validationError) {
        renderError(container, validationError);
        return false;
      }
    }

    setPlayerName(name);
    console.log(`[lobby] sendCreateMatch playerName=${name} mode=${state.damageMode}`);
    startActionTimeout();
    getConnection()?.send({
      type: 'createMatch',
      playerName: name,
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
  };

  const sendQuickMatch = (): boolean => {
    const quickMatchName = getQuickMatchPlayerName(state.playerName);
    if (!state.user && !(state.playerName ?? '').trim()) {
      setPlayerName(quickMatchName);
    }
    return sendCreateMatch('bot-random', quickMatchName);
  };

  const actionControlsDisabled =
    isTaskRunning || pendingAction !== null || state.connectionState !== 'OPEN';
  const lobbyStatus = describeLobbyStatus({
    connectionState: state.connectionState,
    pendingAction,
    healthHint: state.serverHealth?.hint ?? null,
  });

  return (
    <div class="lobby">
      <div class="cinematic-overlay">
        <div class="cinematic-pulse" />
      </div>

      <header class="lobby-header">
        <div>
          <h1 class="title">PHALANX DUEL</h1>
          <p class="subtitle">TACTICAL_INIT_SYSTEM_v1.1</p>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px">
          <div class="meta-tag">WIRE_0.5 | SPEC_1.0</div>
          <UserBar
            state={state}
            onFocusName={() => {
              nameRef.current?.focus();
            }}
          />
        </div>
      </header>

      <div class="lobby-grid">
        {/* LEFT: INITIATION ZONE */}
        <section class="lobby-col">
          <div class="hud-panel">
            <h2 class="section-label">INITIATION_ZONE</h2>

            {!state.user && (
              <div class="input-group">
                <label class="input-header">OPERATIVE_ID</label>
                <input
                  ref={nameRef}
                  type="text"
                  class="name-input"
                  placeholder="REGISTER_NAME"
                  maxLength={20}
                  data-testid="lobby-name-input"
                  value={state.playerName ?? ''}
                  disabled={actionControlsDisabled}
                  onInput={(e) => {
                    onNameInput(e.currentTarget.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      queueLobbyAction('INITIALIZING…', () => sendCreateMatch());
                  }}
                />
              </div>
            )}

            <div class="input-group">
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

            <button
              class="btn btn-primary"
              data-testid="lobby-create-btn"
              style="width: 100%"
              disabled={actionControlsDisabled}
              onClick={() => {
                queueLobbyAction('INITIALIZING…', () => sendCreateMatch());
              }}
            >
              {pendingAction ?? 'INITIATE_MATCH'}
            </button>

            <button
              class="btn btn-secondary"
              data-testid="lobby-quick-match-btn"
              style="width: 100%; margin-top: 0.75rem"
              disabled={actionControlsDisabled}
              onClick={() => {
                queueLobbyAction('QUICK_MATCH…', () => sendQuickMatch());
              }}
            >
              QUICK_MATCH
            </button>

            <div class="action-row">
              <button
                class="btn btn-secondary"
                data-testid="lobby-bot-btn-easy"
                disabled={actionControlsDisabled}
                onClick={() => {
                  queueLobbyAction('BOOTING_AI…', () => sendCreateMatch('bot-random'));
                }}
              >
                BOT_EASY
              </button>
              <button
                class="btn btn-secondary"
                data-testid="lobby-bot-btn-med"
                disabled={actionControlsDisabled}
                onClick={() => {
                  queueLobbyAction('BOOTING_AI…', () => sendCreateMatch('bot-heuristic'));
                }}
              >
                BOT_MED
              </button>
            </div>
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
                        <button
                          class="btn btn-secondary"
                          data-testid="active-match-resume-btn"
                          disabled={actionControlsDisabled}
                          onClick={() => {
                            resumeActiveMatch(match);
                          }}
                        >
                          RESUME
                        </button>
                        <button
                          class="btn btn-secondary"
                          data-testid="active-match-abandon-btn"
                          disabled={actionControlsDisabled}
                          onClick={() => {
                            void abandonActiveMatch(match);
                          }}
                        >
                          ABANDON
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

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
                  class="btn btn-secondary"
                  data-testid="lobby-join-btn"
                  onClick={() => {
                    startActionTimeout();
                    getConnection()?.send({
                      type: 'joinMatch',
                      matchId: matchCode,
                      playerName: state.playerName ?? '',
                    });
                  }}
                >
                  JOIN
                </button>
              </div>
              <div style="display: flex; gap: 8px">
                <input
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

            <MatchHistory />
            <Leaderboard />
          </div>
        </section>
      </div>

      <footer class="lobby-footer">
        <a href="https://phalanxduel.com" class="footer-link">
          INTEL
        </a>
        <a href="#" class="footer-link">
          RULES
        </a>
        <button
          class="footer-link btn-text"
          style="background: none; border: none; cursor: pointer;"
          onClick={() => {
            setThemePhx(!state.themePhx);
          }}
        >
          {state.themePhx ? 'UI:VECTOR' : 'UI:CLASSIC'}
        </button>
        <div ref={debugRef} />
      </footer>

      <div style="margin-top: 2rem; opacity: 0.3; text-align: center">
        <HealthBadge health={state.serverHealth} />
        <p class="meta-tag" style="margin-top: 0.5rem">
          BUILD_ID: v{__APP_VERSION__}
        </p>
      </div>
    </div>
  );
}

export function renderLobby(container: HTMLElement, state: AppState): void {
  preactRender(<LobbyApp container={container} state={state} />, container);
}

export function unmountLobby(container: HTMLElement): void {
  preactRender(null, container);
}

export function validatePlayerName(name: string): string | null {
  if (!name || name.trim().length === 0) return 'OPERATIVE_ID required';
  if (name.trim().length < 3) return 'OPERATIVE_ID too short (min 3)';
  if (name.trim().length > 20) return 'OPERATIVE_ID too long (max 20)';
  if (!/^[a-zA-Z0-9 _-]+$/.test(name)) return 'INVALID_CHARACTERS detected';
  if (!/[a-zA-Z0-9]/.test(name)) return 'ALPHANUMERIC_REQUIRED';
  return null;
}
