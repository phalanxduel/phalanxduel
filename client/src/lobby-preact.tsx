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
    const id = setTimeout(() => nameRef.current?.focus(), 100);
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
      <h1 class="title">Phalanx Duel</h1>
      <p class="subtitle">1v1 card combat. Strategy over luck.</p>

      <div class="version-tag">v{__APP_VERSION__}</div>
      {serverSchemaVersion && serverSpecVersion ? (
        <p class="subtitle">
          Server wire {serverSchemaVersion} • Rules {serverSpecVersion}
        </p>
      ) : null}
      <div
        class={`lobby-status-card lobby-status-card--${lobbyStatus.tone}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p class="lobby-status-kicker">Session Status</p>
        <p class="lobby-status">{lobbyStatus.title}</p>
        <p class="lobby-status-detail">{lobbyStatus.detail}</p>
      </div>

      <input
        ref={nameRef}
        type="text"
        placeholder="Your warrior name"
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
        <label class="options-label">Damage Mode:</label>
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
          <option value="cumulative">Cumulative — damage carries over</option>
          <option value="classic">Per-Turn Reset — fresh each round</option>
        </select>
      </div>

      <div class="game-options">
        <label class="options-label">Starting LP:</label>
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

      <button
        type="button"
        class="advanced-toggle"
        data-testid="advanced-options-toggle"
        onClick={() => {
          setAdvancedOpen((open) => !open);
        }}
      >
        Advanced Options {advancedOpen ? '▲' : '▼'}
      </button>

      <div
        class={`advanced-panel ${advancedOpen ? 'is-open' : ''}`}
        data-testid="advanced-options-panel"
      >
        <div class="game-options">
          <label class="options-label">Rows:</label>
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
                toBoundedInt(e.currentTarget.value, selectedRows, limits.rows.min, limits.rows.max),
              );
            }}
          />
        </div>

        <div class="game-options">
          <label class="options-label">Columns:</label>
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
          Hand {derived.maxHandSize} • Initial draw {derived.initialDraw}
        </p>
      </div>

      <div class="btn-row">
        <button
          class="btn btn-primary"
          data-testid="lobby-create-btn"
          disabled={actionControlsDisabled}
          onClick={() => {
            queueLobbyAction('Creating match…', () => sendCreateMatch());
          }}
        >
          {pendingAction === 'Creating match…' ? 'Creating…' : 'Create Match'}
        </button>
        <button
          class="btn btn-secondary"
          data-testid="create-bot-match"
          disabled={actionControlsDisabled}
          onClick={() => {
            queueLobbyAction('Creating easy bot match…', () => sendCreateMatch('bot-random'));
          }}
        >
          {pendingAction === 'Creating easy bot match…' ? 'Creating…' : 'Play vs Bot (Easy)'}
        </button>
        <button
          class="btn btn-secondary"
          data-testid="create-bot-heuristic-match"
          disabled={actionControlsDisabled}
          onClick={() => {
            queueLobbyAction('Creating medium bot match…', () => sendCreateMatch('bot-heuristic'));
          }}
        >
          {pendingAction === 'Creating medium bot match…' ? 'Creating…' : 'Play vs Bot (Medium)'}
        </button>
      </div>

      <div class="lobby-divider">joining a friend’s match?</div>
      <div class="join-row">
        <input
          type="text"
          placeholder="Paste match code"
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
            queueLobbyAction('Joining match…', onJoinMatch);
          }}
        >
          {pendingAction === 'Joining match…' ? 'Joining…' : 'Join Match'}
        </button>
      </div>

      <div class="lobby-divider">want to observe a match?</div>
      <div class="join-row">
        <input
          type="text"
          placeholder="Paste match code to watch"
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
            queueLobbyAction('Opening watch view…', onWatchMatch);
          }}
        >
          {pendingAction === 'Opening watch view…' ? 'Opening…' : 'Watch Match'}
        </button>
      </div>

      <button
        class="help-toggle"
        onClick={() => {
          setHelpOpen((open) => !open);
        }}
      >
        Quick Start Guide {helpOpen ? '▲' : '▼'}
      </button>

      <div class={`help-panel ${helpOpen ? 'is-open' : ''}`}>
        <h3>The Basics</h3>
        <ol>
          <li>
            Enter your name and click <strong>Create Match</strong>
          </li>
          <li>Send the match code or link to your opponent</li>
          <li>Both players secretly deploy cards to fill their 4 columns (Front &amp; Back)</li>
          <li>Take turns attacking — damage flows Front → Back → LP</li>
        </ol>
        <h3>Win Condition</h3>
        <p>
          Drop your opponent to <strong>0 LP</strong> or destroy all their cards.
        </p>
      </div>

      <div class="footer-links">
        <a
          class="site-link"
          href="https://phalanxduel.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Official Website
        </a>
        <a
          class="site-link"
          href="https://github.com/phalanxduel/game/blob/main/docs/RULES.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          Canonical Rules
        </a>
        <a
          class="site-link"
          href="https://github.com/phalanxduel/game/blob/main/docs/system/ARCHITECTURE.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          Technical Spec
        </a>
      </div>

      <div ref={debugRef} />
      <HealthBadge health={getState().serverHealth} />
    </div>
  );
}

export function renderLobbyPreact(container: HTMLElement): void {
  preactRender(<LobbyApp container={container} />, container);
}
