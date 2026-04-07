import type { DamageMode, CreateMatchParamsPartial } from '@phalanxduel/shared';
import { render as preactRender } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { getConnection, renderError } from './renderer';
import { getState, setDamageMode, setPlayerName, setStartingLifepoints } from './state';
import { renderDebugButton } from './debug';
import { validatePlayerName } from './lobby';
import { trackClientEvent } from './analytics';
import { getLobbyFrameworkVariant } from './experiments';
import { HealthBadge } from './components/HealthBadge';
import { Leaderboard } from './components/Leaderboard';

declare const __APP_VERSION__: string;

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

function buildCreateMatchPayload(args: {
  playerName: string;
  damageMode: DamageMode;
  startingLifepoints: number;
  matchParams: CreateMatchParamsPartial;
  rngSeed?: number;
  opponent?: 'bot-random' | 'bot-heuristic';
  classicDeployment?: boolean;
}): {
  type: 'createMatch';
  playerName: string;
  gameOptions: {
    damageMode: DamageMode;
    startingLifepoints: number;
    classicDeployment: boolean;
  };
  matchParams: CreateMatchParamsPartial;
  rngSeed?: number;
  opponent?: 'bot-random' | 'bot-heuristic';
} {
  const {
    playerName,
    damageMode,
    startingLifepoints,
    matchParams,
    rngSeed,
    opponent,
    classicDeployment,
  } = args;
  return {
    type: 'createMatch',
    playerName,
    gameOptions: {
      damageMode,
      startingLifepoints,
      classicDeployment: classicDeployment ?? true,
    },
    matchParams,
    ...(rngSeed !== undefined && { rngSeed }),
    ...(opponent && { opponent }),
  };
}

function describeLobbyStatus(args: {
  connectionState: ReturnType<typeof getState>['connectionState'];
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
      title: pendingAction,
      detail: 'Waiting for the server to confirm your request.',
    };
  }
  if (connectionState === 'CONNECTING') {
    return {
      tone: 'warning',
      title: 'Reconnecting to the game server',
      detail: healthHint ?? 'Existing sessions restore automatically when the socket returns.',
    };
  }
  if (connectionState === 'DISCONNECTED') {
    return {
      tone: 'offline',
      title: 'Connection lost',
      detail: healthHint ?? 'We will keep trying, but match actions stay paused until reconnect.',
    };
  }
  return {
    tone: 'ready',
    title: 'Ready for a new duel',
    detail: 'Create a match, challenge a bot, or join an existing code.',
  };
}

function LobbyApp({ container }: { container: HTMLElement }) {
  const state = getState();
  const nameRef = useRef<HTMLInputElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);

  const [playerName, setPlayerNameLocal] = useState(state.playerName ?? '');
  const [damageMode, setDamageModeLocal] = useState<DamageMode>(state.damageMode);
  const [startingLifepoints, setStartingLifepointsLocal] = useState(state.startingLifepoints);

  const [matchCode, setMatchCode] = useState('');
  const [watchCode, setWatchCode] = useState('');

  const limits = {
    rows: { min: 1, max: 12 },
    columns: { min: 1, max: 12 },
  };

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [defaultsRows, setDefaultsRows] = useState(2);
  const [defaultsColumns, setDefaultsColumns] = useState(4);
  const [serverSchemaVersion, setServerSchemaVersion] = useState<string | null>(null);
  const [serverSpecVersion, setServerSpecVersion] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState(2);
  const [selectedColumns, setSelectedColumns] = useState(4);
  const [advancedEdited, setAdvancedEdited] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      if (window.self === window.top) nameRef.current?.focus();
    }, 100);
    return () => {
      clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    const host = debugRef.current;
    if (!host) return;
    host.textContent = '';
    renderDebugButton(host);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const defaultsUrl = new URL('/api/defaults', window.location.origin).toString();
        const res = await fetch(defaultsUrl);
        if (!res.ok) return;
        const payload = (await res.json()) as {
          rows?: number;
          columns?: number;
          _meta?: {
            versions?: {
              schemaVersion?: string;
              specVersion?: string;
            };
          };
        };
        const nextRows = toBoundedInt(payload.rows, defaultsRows, limits.rows.min, limits.rows.max);
        const nextColumns = toBoundedInt(
          payload.columns,
          defaultsColumns,
          limits.columns.min,
          limits.columns.max,
        );
        setDefaultsRows(nextRows);
        setDefaultsColumns(nextColumns);
        setServerSchemaVersion(payload._meta?.versions?.schemaVersion ?? null);
        setServerSpecVersion(payload._meta?.versions?.specVersion ?? null);
        if (!advancedEdited) {
          setSelectedRows(nextRows);
          setSelectedColumns(nextColumns);
        }
      } catch {
        // Endpoint is best-effort; fallback defaults keep lobby functional.
      }
    })();
    // Intentionally one-shot on first mount, matching legacy behavior.
  }, []);

  const onNameInput = (value: string): void => {
    setPlayerNameLocal(value);
    setPlayerName(value.trim());
  };

  const showNameValidationError = (message: string): void => {
    renderError(container, message);
    const input = nameRef.current;
    if (!input) return;
    input.classList.add('shake');
    setTimeout(() => {
      input.classList.remove('shake');
    }, 400);
  };

  const queueLobbyAction = (actionLabel: string, fn: () => boolean): void => {
    setPendingAction(actionLabel);
    const sent = fn();
    if (!sent) {
      setPendingAction(null);
      return;
    }
    window.setTimeout(() => {
      setPendingAction((current) => (current === actionLabel ? null : current));
    }, 1500);
  };

  const sendCreateMatch = (opponent?: 'bot-random' | 'bot-heuristic'): boolean => {
    const name = playerName.trim();
    const validationError = validatePlayerName(name);
    if (validationError) {
      showNameValidationError(validationError);
      return false;
    }

    setPlayerName(name);
    const rngSeed = seedFromUrl();
    const matchParams = buildMatchParams(selectedRows, selectedColumns);

    trackClientEvent('lobby_create_match_click', {
      variant: getLobbyFrameworkVariant(),
      opponent: opponent ?? 'human',
      damage_mode: damageMode,
      starting_lp: startingLifepoints,
      rows: selectedRows,
      columns: selectedColumns,
    });

    getConnection()?.send(
      buildCreateMatchPayload({
        playerName: name,
        damageMode,
        startingLifepoints,
        rngSeed,
        opponent,
        matchParams,
        classicDeployment: true, // Default
      }),
    );
    return true;
  };

  const onJoinMatch = (): boolean => {
    const name = playerName.trim();
    const matchId = matchCode.trim();
    if (!matchId) return false;

    const validationError = validatePlayerName(name);
    if (validationError) {
      showNameValidationError(validationError);
      return false;
    }

    setPlayerName(name);
    trackClientEvent('lobby_join_match_click', {
      variant: getLobbyFrameworkVariant(),
      match_id_present: true,
    });
    getConnection()?.send({ type: 'joinMatch', matchId, playerName: name });
    return true;
  };

  const onWatchMatch = (): boolean => {
    const matchId = watchCode.trim();
    if (!matchId) return false;
    trackClientEvent('lobby_watch_match_click', {
      variant: getLobbyFrameworkVariant(),
      match_id_present: true,
    });
    getConnection()?.send({ type: 'watchMatch', matchId });
    return true;
  };

  const derived = buildMatchParams(selectedRows, selectedColumns);
  const actionControlsDisabled = pendingAction !== null || state.connectionState !== 'OPEN';
  const lobbyStatus = describeLobbyStatus({
    connectionState: state.connectionState,
    pendingAction,
    healthHint: state.serverHealth?.hint ?? null,
  });

  return (
    <div class="lobby">
      <header class="lobby-header">
        <h1 class="title">Phalanx Duel</h1>
        <p class="subtitle">1v1 deterministic combat. Strategy over luck.</p>
        <div class="version-tag">
          BUILD_ID: v{__APP_VERSION__}{' '}
          {serverSchemaVersion && serverSpecVersion ? (
            <span>
              | WIRE_{serverSchemaVersion} | SPEC_{serverSpecVersion}
            </span>
          ) : null}
        </div>
      </header>

      <div
        class={`lobby-status-card lobby-status-card--${lobbyStatus.tone}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div>
          <p class="lobby-status-kicker">Session Status</p>
          <p class="lobby-status">{lobbyStatus.title}</p>
        </div>
        <p class="lobby-status-detail">{lobbyStatus.detail}</p>
      </div>

      <div class="lobby-grid">
        <section class="lobby-col lobby-col--creation">
          <h2 class="section-label">PRIMARY_OPERATIONS</h2>

          <input
            ref={nameRef}
            type="text"
            placeholder="REGISTER_IDENTIFIER"
            class="name-input"
            maxLength={20}
            data-testid="lobby-name-input"
            value={playerName}
            disabled={actionControlsDisabled}
            onInput={(e) => {
              onNameInput(e.currentTarget.value);
            }}
          />

          <div class="game-options">
            <label class="options-label">DAMAGE_MODE:</label>
            <select
              class="mode-select"
              data-testid="lobby-damage-mode"
              value={damageMode}
              disabled={actionControlsDisabled}
              onChange={(e) => {
                const next = e.currentTarget.value as DamageMode;
                setDamageModeLocal(next);
                setDamageMode(next);
              }}
            >
              <option value="cumulative">CUMULATIVE — Damage persists</option>
              <option value="classic">CLASSIC — Per-turn reset</option>
            </select>
          </div>

          <div class="game-options">
            <label class="options-label">CORE_LP:</label>
            <input
              type="number"
              class="mode-select"
              min="1"
              max="500"
              step="1"
              inputMode="numeric"
              data-testid="lobby-starting-lp"
              value={String(startingLifepoints)}
              disabled={actionControlsDisabled}
              onChange={(e) => {
                const parsed = Number(e.currentTarget.value);
                const next = Number.isFinite(parsed) ? parsed : 20;
                const bounded = Math.max(1, Math.min(500, Math.trunc(next)));
                setStartingLifepointsLocal(bounded);
                setStartingLifepoints(bounded);
              }}
              onBlur={() => {
                setStartingLifepointsLocal(getState().startingLifepoints);
              }}
            />
          </div>

          <div class="btn-row">
            <button
              class="btn btn-primary"
              data-testid="lobby-create-btn"
              disabled={actionControlsDisabled}
              onClick={() => {
                queueLobbyAction('INITIALIZING…', () => sendCreateMatch());
              }}
            >
              {pendingAction === 'INITIALIZING…' ? 'INITIALIZING…' : 'INITIALIZE_MATCH'}
            </button>
            <button
              class="btn btn-secondary"
              data-testid="create-bot-match"
              disabled={actionControlsDisabled}
              onClick={() => {
                queueLobbyAction('BOOTING_AI_EASY…', () => sendCreateMatch('bot-random'));
              }}
            >
              {pendingAction === 'BOOTING_AI_EASY…' ? 'BOOTING…' : 'ENGAGE_AI_EASY'}
            </button>
            <button
              class="btn btn-secondary"
              data-testid="create-bot-heuristic-match"
              disabled={actionControlsDisabled}
              onClick={() => {
                queueLobbyAction('BOOTING_AI_MED…', () => sendCreateMatch('bot-heuristic'));
              }}
            >
              {pendingAction === 'BOOTING_AI_MED…' ? 'BOOTING…' : 'ENGAGE_AI_MED'}
            </button>
          </div>

          <div class="join-row">
            <input
              type="text"
              placeholder="PASTE_MATCH_ID"
              class="match-input"
              data-testid="lobby-join-match-input"
              value={matchCode}
              disabled={actionControlsDisabled}
              onInput={(e) => {
                setMatchCode(e.currentTarget.value);
              }}
            />
            <button
              class="btn btn-secondary"
              data-testid="lobby-join-btn"
              disabled={actionControlsDisabled}
              onClick={() => {
                queueLobbyAction('JOINING_MATCH…', onJoinMatch);
              }}
            >
              {pendingAction === 'JOINING_MATCH…' ? 'JOINING…' : 'JOIN_LINK'}
            </button>
          </div>

          <div class="join-row">
            <input
              type="text"
              placeholder="PASTE_WATCH_ID"
              class="match-input"
              data-testid="lobby-watch-match-input"
              value={watchCode}
              disabled={actionControlsDisabled}
              onInput={(e) => {
                setWatchCode(e.currentTarget.value);
              }}
            />
            <button
              class="btn btn-secondary"
              data-testid="lobby-watch-btn"
              disabled={actionControlsDisabled}
              onClick={() => {
                queueLobbyAction('OPENING_OBS_BRIDGE…', onWatchMatch);
              }}
            >
              {pendingAction === 'OPENING_OBS_BRIDGE…' ? 'OPENING…' : 'WATCH_BRIDGE'}
            </button>
          </div>

          <button
            type="button"
            class="advanced-toggle"
            data-testid="advanced-options-toggle"
            onClick={() => {
              setAdvancedOpen((open) => !open);
            }}
          >
            {advancedOpen ? 'HIDE_SYSTEM_PARAMS ▲' : 'SHOW_SYSTEM_PARAMS ▼'}
          </button>

          <div
            class={`advanced-panel ${advancedOpen ? 'is-open' : ''}`}
            data-testid="advanced-options-panel"
          >
            <div class="game-options">
              <label class="options-label">GRID_ROWS:</label>
              <input
                type="number"
                class="mode-select"
                min={String(limits.rows.min)}
                max={String(limits.rows.max)}
                step="1"
                inputMode="numeric"
                data-testid="advanced-rows-input"
                value={String(selectedRows)}
                placeholder={String(defaultsRows)}
                disabled={actionControlsDisabled}
                onChange={(e) => {
                  setAdvancedEdited(true);
                  setSelectedRows(
                    toBoundedInt(
                      e.currentTarget.value,
                      selectedRows,
                      limits.rows.min,
                      limits.rows.max,
                    ),
                  );
                }}
              />
            </div>

            <div class="game-options">
              <label class="options-label">GRID_COLS:</label>
              <input
                type="number"
                class="mode-select"
                min={String(limits.columns.min)}
                max={String(limits.columns.max)}
                step="1"
                inputMode="numeric"
                data-testid="advanced-columns-input"
                value={String(selectedColumns)}
                placeholder={String(defaultsColumns)}
                disabled={actionControlsDisabled}
                onChange={(e) => {
                  setAdvancedEdited(true);
                  setSelectedColumns(
                    toBoundedInt(
                      e.currentTarget.value,
                      selectedColumns,
                      limits.columns.min,
                      limits.columns.max,
                    ),
                  );
                }}
              />
            </div>

            <p class="advanced-hint" data-testid="advanced-derived-hint">
              HAND_LIMIT {derived.maxHandSize} • INITIAL_DRAW {derived.initialDraw}
            </p>
          </div>
        </section>

        <section class="lobby-col">
          <Leaderboard />

          <button
            class="help-toggle"
            onClick={() => {
              setHelpOpen((open) => !open);
            }}
          >
            {helpOpen ? 'CLOSE_BRIEFING ▲' : 'ACCESS_TACTICAL_BRIEFING ▼'}
          </button>

          <div class={`help-panel ${helpOpen ? 'is-open' : ''}`} style="margin-top: 0">
            <h3>MISSION_OBJECTIVE</h3>
            <ol>
              <li>
                Register identifier and <strong>INITIALIZE_MATCH</strong>
              </li>
              <li>Transmit match link to adversary</li>
              <li>Execute formation deployment (Front &amp; Rear ranks)</li>
              <li>Combat cycle — energy cascades Front → Rear → Core</li>
            </ol>
            <h3>TERMINATION_CRITERIA</h3>
            <p>
              Deplete adversary core to <strong>0 LP</strong> or neutralize all units.
            </p>
          </div>

          <h2 class="section-label" style="margin-top: auto">
            OFFICIAL_LINKS
          </h2>
          <div class="footer-links" style="margin-top: 0; justify-content: flex-start; gap: 2rem">
            <a
              class="site-link"
              href="https://phalanxduel.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              WEBSITE
            </a>
            <a
              class="site-link"
              href="https://github.com/phalanxduel/game/blob/main/docs/RULES.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              RULES
            </a>
            <a
              class="site-link"
              href="https://github.com/phalanxduel/game/blob/main/docs/system/ARCHITECTURE.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              SPEC
            </a>
          </div>
        </section>
      </div>

      <div ref={debugRef} />
      <HealthBadge health={getState().serverHealth} />
    </div>
  );
}

export function renderLobbyPreact(container: HTMLElement): void {
  preactRender(<LobbyApp container={container} />, container);
}
