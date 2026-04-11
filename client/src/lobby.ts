import type { DamageMode, CreateMatchParamsPartial } from '@phalanxduel/shared';
import { formatGamertag } from '@phalanxduel/shared';
import type { AppState } from './state';
import {
  getState,
  setPlayerName,
  setDamageMode,
  setStartingLifepoints,
  resetToLobby,
  subscribe,
  startActionTimeout,
} from './state';
import { el, renderError, makeCopyBtn, getConnection, renderHealthBadge } from './renderer';
import { renderDebugButton } from './debug';
import { renderMatchHistory } from './match-history';
import { trackClientEvent } from './analytics';
import { getLobbyFrameworkVariant } from './experiments';

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

/**
 * Basic guardrails for player names.
 * Focuses on length, whitespace, and common low-effort offensive patterns.
 */
export function validatePlayerName(name: string): string | null {
  if (!name || name.length < 2) return 'Name must be at least 2 characters.';
  if (name.length > 20) return 'Name is too long (max 20).';

  // Basic profanity / "toxic" pattern check
  const forbidden = [
    /\bn+i+g+g+e+r+/i,
    /\bf+a+g+g+o+t+/i,
    /\bc+u+n+t+/i,
    /\bk+y+s+/i,
    /\bh+i+t+l+e+r+/i,
    /\bn+a+z+i+/i,
    /\br+a+p+e+/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(name)) {
      return 'That name is not allowed in the Phalanx.';
    }
  }

  // Prevent names that are just symbols or numbers to keep the vibe right
  if (/^[^a-zA-Z0-9]+$/.test(name)) return 'Name must contain letters or numbers.';

  return null;
}

export function renderLobby(container: HTMLElement): void {
  const urlParams = new URLSearchParams(window.location.search);
  const urlMatch = urlParams.get('match');
  const urlWatch = urlParams.get('watch');

  if (urlMatch) {
    renderJoinViaLink(container, urlMatch, urlParams.get('mode'));
    return;
  }

  if (urlWatch) {
    renderWatchConnecting(container, urlWatch);
    return;
  }

  const wrapper = el('div', 'lobby');

  const title = el('h1', 'title');
  title.textContent = 'Phalanx Duel';
  wrapper.appendChild(title);

  const subtitle = el('p', 'subtitle');
  subtitle.textContent = '1v1 card combat. Strategy over luck.';
  wrapper.appendChild(subtitle);

  const versionEl = el('div', 'version-tag');
  versionEl.textContent = `v${__APP_VERSION__} (${__BUILD_ID__})`;
  wrapper.appendChild(versionEl);

  console.log(`[Lobby] Starting client v${__APP_VERSION__} build ${__BUILD_ID__}`);

  const serverVersionHint = el('p', 'subtitle');
  wrapper.appendChild(serverVersionHint);
  const lobbyStatus = el('p', 'lobby-status');
  lobbyStatus.setAttribute('role', 'status');
  lobbyStatus.setAttribute('aria-live', 'polite');
  lobbyStatus.setAttribute('aria-atomic', 'true');
  lobbyStatus.textContent = 'Ready for a new duel';
  wrapper.appendChild(lobbyStatus);

  // Auth area
  const authArea = el('div', 'auth-area');
  const currentState = getState();

  if (currentState.user) {
    const userInfo = el('span', 'user-info');
    const displayName = formatGamertag(currentState.user.gamertag, currentState.user.suffix);
    userInfo.textContent = displayName;
    authArea.appendChild(userInfo);

    // Player stats - rolling Elo per category
    const statsRow = el('div', 'player-stats');
    statsRow.setAttribute('data-testid', 'player-stats');
    statsRow.textContent = 'Loading stats...';
    authArea.appendChild(statsRow);

    // Fetch rolling Elo stats
    void (async () => {
      try {
        const res = await fetch(`/api/stats/${currentState.user?.id}/history`);
        if (!res.ok) {
          statsRow.textContent = '';
          return;
        }
        const data = (await res.json()) as {
          categories: Record<string, { currentElo: number; matches: number; wins: number }>;
        };

        statsRow.textContent = '';
        const labels: Record<string, string> = {
          pvp: 'PvP',
          'sp-random': 'Easy',
          'sp-heuristic': 'Medium',
        };

        for (const [cat, stats] of Object.entries(data.categories)) {
          if (stats.matches === 0) continue;
          const badge = el('span', 'stat-badge');
          badge.textContent = `${labels[cat] ?? cat}: ${stats.currentElo} (${stats.wins}W/${stats.matches - stats.wins}L)`;
          statsRow.appendChild(badge);
        }

        // If no matches in any category
        if (statsRow.children.length === 0) {
          statsRow.textContent = 'No ranked matches yet';
        }
      } catch {
        statsRow.textContent = '';
      }
    })();

    const signOutBtn = el('button', 'btn btn-text');
    signOutBtn.textContent = 'Sign out';
    signOutBtn.setAttribute('data-testid', 'auth-signout-btn');
    signOutBtn.addEventListener('click', () => {
      void (async () => {
        const { logout } = await import('./auth');
        await logout();
      })();
    });
    authArea.appendChild(signOutBtn);
  } else {
    const signInBtn = el('button', 'btn btn-secondary btn-sm');
    signInBtn.textContent = 'Sign in';
    signInBtn.setAttribute('data-testid', 'auth-signin-btn');
    signInBtn.addEventListener('click', () => {
      const modalRoot = document.createElement('div');
      modalRoot.id = 'auth-modal-root';
      document.body.appendChild(modalRoot);

      // eslint-disable-next-line @typescript-eslint/no-deprecated
      void import('preact').then(({ render: preactRender, h }) => {
        void import('./components/AuthPanel').then(({ AuthPanel }) => {
          preactRender(
            h(AuthPanel, {
              onClose: () => {
                preactRender(null, modalRoot);
                modalRoot.remove();
                signInBtn.focus();
              },
            }),
            modalRoot,
          );
        });
      });
    });
    authArea.appendChild(signInBtn);

    const signInHint = el('p', 'auth-hint');
    signInHint.textContent = 'Sign in to track your stats and ELO';
    authArea.appendChild(signInHint);
  }

  wrapper.appendChild(authArea);

  // One-time session restore
  if (!currentState.user) {
    void import('./auth').then(({ restoreSession }) => restoreSession());
  }

  // Warrior name input — only shown for guest players.
  // Authenticated users use their gamertag from the DB.
  let nameInput: HTMLInputElement | null = null;
  if (!currentState.user) {
    nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Your warrior name';
    nameInput.className = 'name-input';
    nameInput.maxLength = 20;
    nameInput.setAttribute('data-testid', 'lobby-name-input');
    nameInput.value = getState().playerName ?? '';
    const input = nameInput;
    nameInput.addEventListener('input', () => {
      setPlayerName(input.value.trim());
    });
    wrapper.appendChild(nameInput);

    // Auto-focus the input
    setTimeout(() => nameInput?.focus(), 100);
  }

  const optionsRow = el('div', 'game-options');
  const optLabel = el('label', 'options-label');
  optLabel.textContent = 'Damage Mode:';
  optionsRow.appendChild(optLabel);

  const modeSelect = document.createElement('select');
  modeSelect.className = 'mode-select';
  modeSelect.setAttribute('data-testid', 'lobby-damage-mode');
  const cumulOpt = document.createElement('option');
  cumulOpt.value = 'cumulative';
  cumulOpt.textContent = 'Cumulative \u2014 damage carries over';
  modeSelect.appendChild(cumulOpt);
  const perTurnOpt = document.createElement('option');
  perTurnOpt.value = 'classic';
  perTurnOpt.textContent = 'Per-Turn Reset \u2014 fresh each round';
  modeSelect.appendChild(perTurnOpt);
  modeSelect.value = getState().damageMode;
  modeSelect.addEventListener('change', () => {
    setDamageMode(modeSelect.value as DamageMode);
  });
  optionsRow.appendChild(modeSelect);
  wrapper.appendChild(optionsRow);

  const lpRow = el('div', 'game-options');
  const lpLabel = el('label', 'options-label');
  lpLabel.textContent = 'Starting LP:';
  lpRow.appendChild(lpLabel);

  const lpInput = document.createElement('input');
  lpInput.type = 'number';
  lpInput.className = 'mode-select';
  lpInput.min = '1';
  lpInput.max = '500';
  lpInput.step = '1';
  lpInput.inputMode = 'numeric';
  lpInput.setAttribute('data-testid', 'lobby-starting-lp');
  lpInput.value = String(getState().startingLifepoints);
  lpInput.addEventListener('change', () => {
    const parsed = Number(lpInput.value);
    const next = Number.isFinite(parsed) ? parsed : 20;
    setStartingLifepoints(next);
    lpInput.value = String(getState().startingLifepoints);
  });
  lpInput.addEventListener('blur', () => {
    lpInput.value = String(getState().startingLifepoints);
  });
  lpRow.appendChild(lpInput);
  wrapper.appendChild(lpRow);

  const limits = {
    rows: { min: 1, max: 12 },
    columns: { min: 1, max: 12 },
  };

  let defaultsRows = 2;
  let defaultsColumns = 4;
  let serverSchemaVersion = '';
  let serverSpecVersion = '';
  let selectedRows = defaultsRows;
  let selectedColumns = defaultsColumns;
  let advancedEdited = false;
  let pendingAction: string | null = null;
  let actionControls: (HTMLInputElement | HTMLSelectElement | HTMLButtonElement)[] = [];

  const syncVersionHint = (): void => {
    serverVersionHint.textContent =
      serverSchemaVersion && serverSpecVersion
        ? `Server wire ${serverSchemaVersion} • Rules ${serverSpecVersion}`
        : '';
  };

  const syncLobbyStatus = (): void => {
    lobbyStatus.textContent = pendingAction ?? 'Ready for a new duel';
  };

  const syncActionControls = (): void => {
    const disabled = pendingAction !== null || getState().connectionState !== 'OPEN';
    for (const control of actionControls) {
      control.disabled = disabled;
    }
  };

  const queueLobbyAction = (actionLabel: string, fn: () => boolean): void => {
    pendingAction = actionLabel;
    syncLobbyStatus();
    syncActionControls();
    const sent = fn();
    if (!sent) {
      pendingAction = null;
      syncLobbyStatus();
      syncActionControls();
      return;
    }
    window.setTimeout(() => {
      if (pendingAction === actionLabel) {
        pendingAction = null;
        syncLobbyStatus();
        syncActionControls();
      }
    }, 1500);
  };

  const advancedToggle = el('button', 'advanced-toggle') as HTMLButtonElement;
  advancedToggle.type = 'button';
  advancedToggle.textContent = 'Advanced Options ▼';
  advancedToggle.setAttribute('data-testid', 'advanced-options-toggle');
  wrapper.appendChild(advancedToggle);

  const advancedPanel = el('div', 'advanced-panel');
  advancedPanel.setAttribute('data-testid', 'advanced-options-panel');

  const rowsRow = el('div', 'game-options');
  const rowsLabel = el('label', 'options-label');
  rowsLabel.textContent = 'Rows:';
  rowsRow.appendChild(rowsLabel);

  const rowsInput = document.createElement('input');
  rowsInput.type = 'number';
  rowsInput.className = 'mode-select';
  rowsInput.min = String(limits.rows.min);
  rowsInput.max = String(limits.rows.max);
  rowsInput.step = '1';
  rowsInput.inputMode = 'numeric';
  rowsInput.value = String(selectedRows);
  rowsInput.placeholder = String(defaultsRows);
  rowsInput.setAttribute('data-testid', 'advanced-rows-input');
  rowsRow.appendChild(rowsInput);
  advancedPanel.appendChild(rowsRow);

  const columnsRow = el('div', 'game-options');
  const columnsLabel = el('label', 'options-label');
  columnsLabel.textContent = 'Columns:';
  columnsRow.appendChild(columnsLabel);

  const columnsInput = document.createElement('input');
  columnsInput.type = 'number';
  columnsInput.className = 'mode-select';
  columnsInput.min = String(limits.columns.min);
  columnsInput.max = String(limits.columns.max);
  columnsInput.step = '1';
  columnsInput.inputMode = 'numeric';
  columnsInput.value = String(selectedColumns);
  columnsInput.placeholder = String(defaultsColumns);
  columnsInput.setAttribute('data-testid', 'advanced-columns-input');
  columnsRow.appendChild(columnsInput);
  advancedPanel.appendChild(columnsRow);

  const derivedHint = el('p', 'advanced-hint');
  derivedHint.setAttribute('data-testid', 'advanced-derived-hint');
  advancedPanel.appendChild(derivedHint);

  const syncAdvancedHint = (): void => {
    const params = buildMatchParams(selectedRows, selectedColumns);
    derivedHint.textContent = `Hand ${params.maxHandSize} • Initial draw ${params.initialDraw}`;
  };

  const syncAdvancedInputs = (): void => {
    rowsInput.value = String(selectedRows);
    rowsInput.placeholder = String(defaultsRows);
    columnsInput.value = String(selectedColumns);
    columnsInput.placeholder = String(defaultsColumns);
    syncAdvancedHint();
  };

  rowsInput.addEventListener('change', () => {
    advancedEdited = true;
    selectedRows = toBoundedInt(rowsInput.value, selectedRows, limits.rows.min, limits.rows.max);
    syncAdvancedInputs();
  });
  rowsInput.addEventListener('blur', syncAdvancedInputs);

  columnsInput.addEventListener('change', () => {
    advancedEdited = true;
    selectedColumns = toBoundedInt(
      columnsInput.value,
      selectedColumns,
      limits.columns.min,
      limits.columns.max,
    );
    syncAdvancedInputs();
  });
  columnsInput.addEventListener('blur', syncAdvancedInputs);

  advancedToggle.addEventListener('click', () => {
    const open = advancedPanel.classList.toggle('is-open');
    advancedToggle.textContent = open ? 'Advanced Options ▲' : 'Advanced Options ▼';
  });

  syncAdvancedInputs();
  wrapper.appendChild(advancedPanel);

  async function loadDefaults(): Promise<void> {
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
      defaultsRows = toBoundedInt(payload.rows, defaultsRows, limits.rows.min, limits.rows.max);
      defaultsColumns = toBoundedInt(
        payload.columns,
        defaultsColumns,
        limits.columns.min,
        limits.columns.max,
      );
      serverSchemaVersion = payload._meta?.versions?.schemaVersion ?? '';
      serverSpecVersion = payload._meta?.versions?.specVersion ?? '';
      syncVersionHint();
      if (!advancedEdited) {
        selectedRows = defaultsRows;
        selectedColumns = defaultsColumns;
      }
      syncAdvancedInputs();
    } catch {
      // Endpoint is best-effort; fallback defaults keep lobby functional.
    }
  }

  void loadDefaults();

  function sendCreateMatch(opponent?: 'bot-random' | 'bot-heuristic'): boolean {
    const name = currentState.user
      ? formatGamertag(currentState.user.gamertag, currentState.user.suffix)
      : (nameInput?.value.trim() ?? '');
    if (!currentState.user) {
      const validationError = validatePlayerName(name);
      if (validationError) {
        renderError(container, validationError);
        nameInput?.classList.add('shake');
        setTimeout(() => nameInput?.classList.remove('shake'), 400);
        return false;
      }
    }

    setPlayerName(name);
    const damageMode = getState().damageMode;
    const startingLifepoints = getState().startingLifepoints;
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

    startActionTimeout();
    getConnection()?.send(
      buildCreateMatchPayload({
        playerName: name,
        damageMode,
        startingLifepoints,
        rngSeed,
        opponent,
        matchParams,
      }),
    );
    return true;
  }

  const btnRow = el('div', 'btn-row');
  const createBtn = el('button', 'btn btn-primary');
  createBtn.textContent = 'Create Match';
  createBtn.setAttribute('data-testid', 'lobby-create-btn');
  createBtn.addEventListener('click', () => {
    queueLobbyAction('Creating match…', () => sendCreateMatch());
  });
  btnRow.appendChild(createBtn);

  const botBtn = el('button', 'btn btn-secondary');
  botBtn.textContent = 'Play vs Bot (Easy)';
  botBtn.setAttribute('data-testid', 'create-bot-match');
  botBtn.addEventListener('click', () => {
    queueLobbyAction('Creating easy bot match…', () => sendCreateMatch('bot-random'));
  });
  btnRow.appendChild(botBtn);

  const botHeuristicBtn = el('button', 'btn btn-secondary');
  botHeuristicBtn.textContent = 'Play vs Bot (Medium)';
  botHeuristicBtn.setAttribute('data-testid', 'create-bot-heuristic-match');
  botHeuristicBtn.addEventListener('click', () => {
    queueLobbyAction('Creating medium bot match…', () => sendCreateMatch('bot-heuristic'));
  });
  btnRow.appendChild(botHeuristicBtn);

  wrapper.appendChild(btnRow);

  const divider = el('div', 'lobby-divider');
  divider.textContent = 'joining a friend\u2019s match?';
  wrapper.appendChild(divider);

  const joinRow = el('div', 'join-row');
  const matchInput = document.createElement('input');
  matchInput.type = 'text';
  matchInput.placeholder = 'Paste match code';
  matchInput.className = 'match-input';
  matchInput.setAttribute('data-testid', 'lobby-join-match-input');
  joinRow.appendChild(matchInput);

  const joinBtn = el('button', 'btn btn-secondary');
  joinBtn.setAttribute('data-testid', 'lobby-join-btn');
  joinBtn.textContent = 'Join Match';
  joinBtn.addEventListener('click', () => {
    queueLobbyAction('Joining match…', () => {
      const name = currentState.user
        ? formatGamertag(currentState.user.gamertag, currentState.user.suffix)
        : (nameInput?.value.trim() ?? '');
      const matchId = matchInput.value.trim();
      if (!matchId) return false;

      if (!currentState.user) {
        const validationError = validatePlayerName(name);
        if (validationError) {
          renderError(container, validationError);
          nameInput?.classList.add('shake');
          setTimeout(() => nameInput?.classList.remove('shake'), 400);
          return false;
        }
      }

      setPlayerName(name);

      trackClientEvent('lobby_join_match_click', {
        variant: getLobbyFrameworkVariant(),
        match_id_present: true,
      });

      startActionTimeout();
      getConnection()?.send({ type: 'joinMatch', matchId, playerName: name });
      return true;
    });
  });
  joinRow.appendChild(joinBtn);
  wrapper.appendChild(joinRow);

  const watchDivider = el('div', 'lobby-divider');
  watchDivider.textContent = 'want to observe a match?';
  wrapper.appendChild(watchDivider);

  const watchRow = el('div', 'join-row');
  const watchInput = document.createElement('input');
  watchInput.type = 'text';
  watchInput.placeholder = 'Paste match code to watch';
  watchInput.className = 'match-input';
  watchInput.setAttribute('data-testid', 'lobby-watch-match-input');
  watchRow.appendChild(watchInput);

  const watchBtn = el('button', 'btn btn-secondary');
  watchBtn.setAttribute('data-testid', 'lobby-watch-btn');
  watchBtn.textContent = 'Watch Match';
  watchBtn.addEventListener('click', () => {
    queueLobbyAction('Opening watch view…', () => {
      const matchId = watchInput.value.trim();
      if (!matchId) return false;

      trackClientEvent('lobby_watch_match_click', {
        variant: getLobbyFrameworkVariant(),
        match_id_present: true,
      });

      startActionTimeout();
      getConnection()?.send({ type: 'watchMatch', matchId });
      return true;
    });
  });
  watchRow.appendChild(watchBtn);
  wrapper.appendChild(watchRow);

  const historyDivider = el('div', 'lobby-divider');
  historyDivider.textContent = 'browse past games?';
  wrapper.appendChild(historyDivider);

  const historyToggle = el('button', 'btn btn-secondary');
  historyToggle.textContent = 'Past Games \u25bc';
  historyToggle.setAttribute('data-testid', 'past-games-btn');
  historyToggle.setAttribute('type', 'button');
  wrapper.appendChild(historyToggle);

  const historyPanel = el('div', 'match-history-panel');
  wrapper.appendChild(historyPanel);

  let historyLoaded = false;
  historyToggle.addEventListener('click', () => {
    const opening = historyPanel.classList.toggle('is-open');
    historyToggle.textContent = opening ? 'Past Games \u25b2' : 'Past Games \u25bc';
    if (opening && !historyLoaded) {
      historyLoaded = true;
      renderMatchHistory(historyPanel);
    }
  });

  // How to play -- collapsible disclosure
  const helpToggle = el('button', 'help-toggle');
  helpToggle.textContent = 'Quick Start Guide \u25BC';
  wrapper.appendChild(helpToggle);

  const helpPanel = el('div', 'help-panel');
  // Static HTML — no untrusted content
  const h3Basics = document.createElement('h3');
  h3Basics.textContent = 'The Basics';
  helpPanel.appendChild(h3Basics);

  const ol = document.createElement('ol');
  const steps: [string, string][] = [
    ['Enter your name and click ', 'Create Match'],
    ['Send the match code or link to your opponent', ''],
    ['Both players secretly deploy cards to fill their 4 columns (Front & Back)', ''],
    ['Take turns attacking \u2014 damage flows Front \u2192 Back \u2192 LP', ''],
  ];
  for (const [text, bold] of steps) {
    const li = document.createElement('li');
    li.appendChild(document.createTextNode(text));
    if (bold) {
      const strong = document.createElement('strong');
      strong.textContent = bold;
      li.appendChild(strong);
    }
    ol.appendChild(li);
  }
  helpPanel.appendChild(ol);

  const h3Win = document.createElement('h3');
  h3Win.textContent = 'Win Condition';
  helpPanel.appendChild(h3Win);

  const winP = document.createElement('p');
  winP.appendChild(document.createTextNode('Drop your opponent to '));
  const strongLP = document.createElement('strong');
  strongLP.textContent = '0 LP';
  winP.appendChild(strongLP);
  winP.appendChild(document.createTextNode(' or destroy all their cards.'));
  helpPanel.appendChild(winP);

  wrapper.appendChild(helpPanel);

  helpToggle.addEventListener('click', () => {
    const open = helpPanel.classList.toggle('is-open');
    helpToggle.textContent = open ? 'Quick Start Guide \u25B2' : 'Quick Start Guide \u25BC';
  });

  const footerLinks = el('div', 'footer-links');

  const siteLink = el('a', 'site-link') as HTMLAnchorElement;
  siteLink.href = 'https://phalanxduel.com';
  siteLink.target = '_blank';
  siteLink.rel = 'noopener noreferrer';
  siteLink.textContent = 'Official Website';
  footerLinks.appendChild(siteLink);

  const rulesLink = el('a', 'site-link') as HTMLAnchorElement;
  rulesLink.href = 'https://github.com/phalanxduel/game/blob/main/docs/RULES.md';
  rulesLink.target = '_blank';
  rulesLink.rel = 'noopener noreferrer';
  rulesLink.textContent = 'Canonical Rules';
  footerLinks.appendChild(rulesLink);

  const archLink = el('a', 'site-link') as HTMLAnchorElement;
  archLink.href = 'https://github.com/phalanxduel/game/blob/main/docs/system/ARCHITECTURE.md';
  archLink.target = '_blank';
  archLink.rel = 'noopener noreferrer';
  archLink.textContent = 'Technical Spec';
  footerLinks.appendChild(archLink);

  wrapper.appendChild(footerLinks);
  actionControls = [
    ...(nameInput ? [nameInput] : []),
    modeSelect,
    lpInput,
    rowsInput,
    columnsInput,
    createBtn as HTMLButtonElement,
    botBtn as HTMLButtonElement,
    botHeuristicBtn as HTMLButtonElement,
    matchInput,
    joinBtn as HTMLButtonElement,
    watchInput,
    watchBtn as HTMLButtonElement,
  ];
  syncLobbyStatus();
  syncActionControls();

  // Leaderboard
  const leaderboardSection = el('div', 'leaderboard');
  const lbTitle = el('h2', 'leaderboard-title');
  lbTitle.textContent = 'Leaderboard';
  leaderboardSection.appendChild(lbTitle);

  const lbTabs = el('div', 'leaderboard-tabs');
  const categories = [
    { key: 'pvp', label: 'PvP' },
    { key: 'sp-random', label: 'vs Bot (Easy)' },
    { key: 'sp-heuristic', label: 'vs Bot (Medium)' },
  ];

  const lbBody = el('div', 'leaderboard-body');
  lbBody.setAttribute('data-testid', 'leaderboard-body');

  let activeCategory = 'pvp';

  async function loadLeaderboard(category: string): Promise<void> {
    activeCategory = category;
    // Update active tab styling
    for (const tab of lbTabs.querySelectorAll('.leaderboard-tab')) {
      tab.classList.toggle('active', tab.getAttribute('data-category') === category);
    }

    lbBody.textContent = 'Loading...';
    try {
      const res = await fetch(`/api/ladder/${category}`);
      if (!res.ok) {
        lbBody.textContent = 'Leaderboard unavailable';
        return;
      }
      const data = (await res.json()) as {
        rankings: {
          rank: number;
          gamertag: string;
          elo: number;
          matches: number;
          wins: number;
        }[];
      };

      lbBody.textContent = '';

      if (data.rankings.length === 0) {
        const empty = el('p', 'leaderboard-empty');
        empty.textContent = 'No ranked players yet. Play a match to get on the board!';
        lbBody.appendChild(empty);
        return;
      }

      const table = document.createElement('table');
      table.className = 'leaderboard-table';

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const header of ['#', 'Player', 'Elo', 'W', 'L']) {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const entry of data.rankings) {
        const row = document.createElement('tr');
        const cells = [
          String(entry.rank),
          entry.gamertag,
          String(entry.elo),
          String(entry.wins),
          String(entry.matches - entry.wins),
        ];
        for (const text of cells) {
          const td = document.createElement('td');
          td.textContent = text;
          row.appendChild(td);
        }
        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      lbBody.appendChild(table);
    } catch {
      lbBody.textContent = 'Could not load leaderboard';
    }
  }

  for (const cat of categories) {
    const tab = el('button', 'leaderboard-tab');
    tab.textContent = cat.label;
    tab.setAttribute('data-category', cat.key);
    tab.setAttribute('data-testid', `leaderboard-tab-${cat.key}`);
    if (cat.key === activeCategory) tab.classList.add('active');
    tab.addEventListener('click', () => void loadLeaderboard(cat.key));
    lbTabs.appendChild(tab);
  }

  leaderboardSection.appendChild(lbTabs);
  leaderboardSection.appendChild(lbBody);
  wrapper.appendChild(leaderboardSection);

  // Load default leaderboard
  void loadLeaderboard(activeCategory);

  renderDebugButton(wrapper);

  wrapper.appendChild(renderHealthBadge(getState().serverHealth));

  container.appendChild(wrapper);
}

export function renderJoinViaLink(
  container: HTMLElement,
  matchId: string,
  mode: string | null,
): void {
  const currentState = getState();
  const outer = el('div', 'lobby');

  const header = el('header', 'lobby-header');
  const titleGroup = el('div', '');
  const title = el('h1', 'title');
  title.textContent = "You've Been Challenged";
  titleGroup.appendChild(title);
  header.appendChild(titleGroup);

  const authGroup = el('div', '');
  authGroup.style.display = 'flex';
  authGroup.style.flexDirection = 'column';
  authGroup.style.alignItems = 'flex-end';
  authGroup.style.gap = '8px';

  // We can't use the UserBar Preact component directly here in this legacy-style renderer,
  // so we'll replicate the logic or just let the user use the Guest name input below.
  // Actually, let's keep it simple and brutalist.
  if (currentState.user) {
    const userInfo = el('div', 'status-card');
    userInfo.style.borderLeftColor = 'var(--cyan)';
    const name = el('span', 'status-title');
    name.style.fontWeight = '900';
    name.style.color = 'var(--cyan)';
    name.textContent = formatGamertag(currentState.user.gamertag, currentState.user.suffix);
    userInfo.appendChild(name);
    authGroup.appendChild(userInfo);
  }
  header.appendChild(authGroup);
  outer.appendChild(header);

  const grid = el('div', 'lobby-grid');
  const col = el('section', 'lobby-col');
  const panel = el('div', 'hud-panel');
  const label = el('h2', 'section-label');
  label.textContent = 'CHALLENGE_DETAILS';
  panel.appendChild(label);

  const modeLabels: Record<string, string> = {
    cumulative: 'CUMULATIVE_CASCADE',
    classic: 'CLASSIC_RESET',
  };
  const modeStatus = el('div', 'status-card');
  const modeTitle = el('span', 'status-title');
  modeTitle.textContent = mode
    ? (modeLabels[mode] ?? 'STANDARD_ENGAGEMENT')
    : 'STANDARD_ENGAGEMENT';
  modeStatus.appendChild(modeTitle);
  panel.appendChild(modeStatus);

  if (!currentState.user) {
    const inputGroup = el('div', 'input-group');
    const inputHeader = el('label', 'input-header');
    inputHeader.textContent = 'OPERATIVE_ID';
    inputGroup.appendChild(inputHeader);

    const nameInput = el('input', 'name-input') as HTMLInputElement;
    nameInput.type = 'text';
    nameInput.placeholder = 'REGISTER_NAME';
    nameInput.maxLength = 20;
    nameInput.setAttribute('data-testid', 'lobby-name-input');
    nameInput.value = getState().playerName ?? '';
    nameInput.addEventListener('input', () => {
      setPlayerName(nameInput.value.trim());
    });
    inputGroup.appendChild(nameInput);
    panel.appendChild(inputGroup);

    setTimeout(() => {
      nameInput.focus();
    }, 100);
  }

  const joinBtn = el('button', 'btn btn-primary');
  joinBtn.style.width = '100%';
  joinBtn.textContent = 'ACCEPT_ENGAGEMENT';
  joinBtn.setAttribute('data-testid', 'lobby-join-accept-btn');
  joinBtn.addEventListener('click', () => {
    const name = currentState.user
      ? formatGamertag(currentState.user.gamertag, currentState.user.suffix)
      : (getState().playerName ?? '');

    if (!currentState.user) {
      const validationError = validatePlayerName(name);
      if (validationError) {
        renderError(container, validationError);
        return;
      }
    }

    setPlayerName(name);
    getConnection()?.send({ type: 'joinMatch', matchId, playerName: name });
  });
  panel.appendChild(joinBtn);

  col.appendChild(panel);
  grid.appendChild(col);
  outer.appendChild(grid);

  const footer = el('footer', 'lobby-footer');
  const cancelLink = el('a', 'footer-link');
  cancelLink.textContent = 'ABORT_AND_CREATE_NEW';
  cancelLink.setAttribute('href', '#');
  cancelLink.addEventListener('click', (e) => {
    e.preventDefault();
    resetToLobby();
  });
  footer.appendChild(cancelLink);
  outer.appendChild(footer);

  container.appendChild(outer);
}

export function renderWatchConnecting(container: HTMLElement, matchId: string): void {
  const wrapper = el('div', 'lobby');

  const title = el('h1', 'title');
  title.textContent = 'Phalanx Duel';
  wrapper.appendChild(title);

  const subtitle = el('p', 'subtitle');
  subtitle.textContent = 'Connecting to match\u2026';
  wrapper.appendChild(subtitle);

  const matchIdEl = el('code', 'match-id');
  matchIdEl.textContent = matchId;
  wrapper.appendChild(matchIdEl);

  const cancelLink = el('a', 'create-own-link');
  cancelLink.textContent = 'Cancel and return to lobby';
  cancelLink.setAttribute('href', '#');
  cancelLink.addEventListener('click', (e) => {
    e.preventDefault();
    resetToLobby();
  });
  wrapper.appendChild(cancelLink);

  let sentRequest = false;
  const sendWatch = (): void => {
    if (sentRequest) return;
    const conn = getConnection();
    if (!conn) return;
    conn.send({ type: 'watchMatch', matchId });
    sentRequest = true;
  };

  const trySend = (): void => {
    if (getState().connectionState === 'OPEN') {
      sendWatch();
    }
  };

  const unsub = subscribe((state) => {
    if (state.screen !== 'lobby') {
      unsub();
      return;
    }
    trySend();
  });

  trySend();

  container.appendChild(wrapper);
}

export function renderWaiting(container: HTMLElement, state: AppState): void {
  const outer = el('div', 'lobby');

  const title = el('h2', 'title');
  title.textContent = 'Waiting for Challenger';
  outer.appendChild(title);

  const hint = el('p', 'subtitle');
  hint.style.textAlign = 'center';
  hint.textContent = 'Share one of the options below to engage opponents or spectators.';
  outer.appendChild(hint);

  const grid = el('div', 'lobby-grid');

  // -- Opponent invite --
  const playCol = el('section', 'lobby-col');
  const playPanel = el('div', 'hud-panel');
  const playLabel = el('h2', 'section-label');
  playLabel.textContent = 'INVITE_PLAYER';
  playPanel.appendChild(playLabel);

  const playIdRow = el('div', 'status-card');
  playIdRow.style.marginBottom = '1.5rem';
  const playIdText = el('span', 'status-title');
  playIdText.style.fontSize = '1.2rem';
  playIdText.textContent = state.matchId ?? '';
  playIdText.setAttribute('data-testid', 'waiting-match-id');
  playIdRow.appendChild(playIdText);
  playPanel.appendChild(playIdRow);

  const playBtns = el('div', 'share-btn-row');
  playBtns.appendChild(makeCopyBtn('COPY_CODE', () => state.matchId ?? ''));
  playBtns.appendChild(
    makeCopyBtn('COPY_LINK', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('match', state.matchId ?? '');
      url.searchParams.set('mode', getState().damageMode);
      return url.toString();
    }),
  );
  playPanel.appendChild(playBtns);
  playCol.appendChild(playPanel);
  grid.appendChild(playCol);

  // -- Spectator invite --
  const watchCol = el('section', 'lobby-col');
  const watchPanel = el('div', 'hud-panel');
  const watchLabel = el('h2', 'section-label');
  watchLabel.textContent = 'INVITE_WATCHER';
  watchPanel.appendChild(watchLabel);

  const watchIdRow = el('div', 'status-card');
  watchIdRow.style.marginBottom = '1.5rem';
  const watchIdText = el('span', 'status-title');
  watchIdText.style.fontSize = '1.2rem';
  watchIdText.textContent = state.matchId ?? '';
  watchIdText.setAttribute('data-testid', 'waiting-watch-match-id');
  watchIdRow.appendChild(watchIdText);
  watchPanel.appendChild(watchIdRow);

  const watchBtns = el('div', 'share-btn-row');
  watchBtns.appendChild(makeCopyBtn('COPY_CODE', () => state.matchId ?? ''));
  watchBtns.appendChild(
    makeCopyBtn('COPY_WATCH_LINK', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('watch', state.matchId ?? '');
      return url.toString();
    }),
  );
  watchPanel.appendChild(watchBtns);
  watchCol.appendChild(watchPanel);
  grid.appendChild(watchCol);

  outer.appendChild(grid);

  const cancelRow = el('div', 'lobby-footer');
  const cancelLink = el('a', 'footer-link');
  cancelLink.textContent = 'ABORT_MATCH_AND_RETURN';
  cancelLink.setAttribute('href', '#');
  cancelLink.addEventListener('click', (e) => {
    e.preventDefault();
    resetToLobby();
  });
  cancelRow.appendChild(cancelLink);
  outer.appendChild(cancelRow);

  container.appendChild(outer);
}
