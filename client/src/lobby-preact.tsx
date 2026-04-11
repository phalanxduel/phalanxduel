import type { DamageMode, CreateMatchParamsPartial } from '@phalanxduel/shared';
import { formatGamertag } from '@phalanxduel/shared';
import { render as preactRender } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { getConnection, renderError } from './renderer';
import {
  setDamageMode,
  setPlayerName,
  setStartingLifepoints,
  setScreen,
  setFeatureVectorBrutalism,
  startActionTimeout,
} from './state';
import type { AppState } from './state';
import { renderDebugButton } from './debug';
import { validatePlayerName } from './lobby';
import { HealthBadge } from './components/HealthBadge';
import { Leaderboard } from './components/Leaderboard';
import { AuthPanel } from './components/AuthPanel';
import { logout, restoreSession } from './auth';

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

function UserBar({ state }: { state: AppState }) {
  if (state.user) {
    const displayName = formatGamertag(state.user.gamertag, state.user.suffix);
    return (
      <div class="status-card" style="margin-bottom: 1rem; border-left-color: var(--cyan)">
        <div style="display: flex; flex-direction: column; gap: 4px">
          <span class="status-title" style="font-weight: 900; color: var(--cyan)">
            {displayName}
          </span>
          <span class="status-val" style="color: var(--muted); font-size: 0.55rem">
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

  return (
    <div class="status-card" style="margin-bottom: 1rem; border-left-color: var(--gold-dim)">
      <span class="status-title" style="color: var(--muted)">
        GUEST_MODE
      </span>
      <button
        class="btn btn-primary"
        style="padding: 0.4rem 1rem; font-size: 0.6rem"
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

function buildMatchParams(rows: number, columns: number): CreateMatchParamsPartial {
  return {
    rows,
    columns,
    maxHandSize: columns,
    initialDraw: rows * columns + columns,
  };
}

type VizHover = 'atk' | 'frn' | 'bck' | 'core' | null;

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

  useEffect(() => {
    // Restore session on boot if no user yet
    if (!state.user) {
      void restoreSession();
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      if (window.self === window.top) nameRef.current?.focus();
    }, 100);
    return () => {
      clearTimeout(id);
    };
  }, [state.screen]); // Re-focus when switching back to lobby

  if (state.screen === 'auth') {
    return <AuthScreen />;
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

  const queueLobbyAction = (actionLabel: string, fn: () => boolean): void => {
    setPendingAction(actionLabel);
    if (!fn()) {
      setPendingAction(null);
      return;
    }
    window.setTimeout(() => {
      setPendingAction(null);
    }, 1500);
  };

  const sendCreateMatch = (opponent?: 'bot-random' | 'bot-heuristic'): boolean => {
    // Authenticated users use their DB name
    const name = state.user
      ? formatGamertag(state.user.gamertag, state.user.suffix)
      : (state.playerName ?? '').trim();

    if (!state.user) {
      const validationError = validatePlayerName(name);
      if (validationError) {
        renderError(container, validationError);
        return false;
      }
    }

    setPlayerName(name);
    startActionTimeout();
    getConnection()?.send({
      type: 'createMatch',
      playerName: name,
      gameOptions: {
        damageMode: state.damageMode,
        startingLifepoints: state.startingLifepoints,
        classicDeployment: true,
      },
      matchParams: buildMatchParams(selectedRows, selectedColumns),
      rngSeed: seedFromUrl(),
      opponent,
    });
    return true;
  };

  const actionControlsDisabled = pendingAction !== null || state.connectionState !== 'OPEN';
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
          <UserBar state={state} />
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
                    style="width: 50%"
                    value={String(selectedRows)}
                    onChange={(e) => {
                      setSelectedRows(toBoundedInt(e.currentTarget.value, selectedRows, 1, 12));
                    }}
                  />
                  <input
                    type="number"
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

            <div class="action-row">
              <button
                class="btn btn-secondary"
                disabled={actionControlsDisabled}
                onClick={() => {
                  queueLobbyAction('BOOTING_AI…', () => sendCreateMatch('bot-random'));
                }}
              >
                AI_EASY
              </button>
              <button
                class="btn btn-secondary"
                disabled={actionControlsDisabled}
                onClick={() => {
                  queueLobbyAction('BOOTING_AI…', () => sendCreateMatch('bot-heuristic'));
                }}
              >
                AI_MED
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
                  class="btn-secondary"
                  style="flex: 1; text-align: left; background: rgba(0,0,0,0.2)"
                  onInput={(e) => {
                    setMatchCode(e.currentTarget.value);
                  }}
                />
                <button
                  class="btn btn-secondary"
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
                  class="btn-secondary"
                  style="flex: 1; text-align: left; background: rgba(0,0,0,0.2)"
                  onInput={(e) => {
                    setWatchCode(e.currentTarget.value);
                  }}
                />
                <button
                  class="btn btn-secondary"
                  onClick={() => {
                    startActionTimeout();
                    getConnection()?.send({ type: 'watchMatch', matchId: watchCode });
                  }}
                >
                  WATCH
                </button>
              </div>
            </div>

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
            setFeatureVectorBrutalism(!state.featureVectorBrutalism);
          }}
        >
          {state.featureVectorBrutalism ? 'UI:BRUTALISM' : 'UI:CLASSIC'}
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

export function renderLobbyPreact(container: HTMLElement, state: AppState): void {
  preactRender(<LobbyApp container={container} state={state} />, container);
}

export function unmountLobbyPreact(container: HTMLElement): void {
  preactRender(null, container);
}
