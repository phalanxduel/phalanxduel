import type { DamageMode } from '@phalanxduel/shared';
import type { AppState } from './state';
import {
  getState,
  setPlayerName,
  setDamageMode,
  setStartingLifepoints,
  resetToLobby,
} from './state';
import { el, renderError, makeCopyBtn, getConnection, renderHealthBadge } from './renderer';
import { renderDebugButton } from './debug';

function seedFromUrl(): number | undefined {
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null) return undefined;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) return undefined;
  return parsed;
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
  // @ts-expect-error - defined via Vite define
  versionEl.textContent = `v${__APP_VERSION__}`;
  wrapper.appendChild(versionEl);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Your warrior name';
  nameInput.className = 'name-input';
  nameInput.maxLength = 20;
  nameInput.setAttribute('data-testid', 'lobby-name-input');
  nameInput.value = getState().playerName ?? '';
  nameInput.addEventListener('input', () => {
    setPlayerName(nameInput.value.trim());
  });
  wrapper.appendChild(nameInput);

  // Auto-focus the input
  setTimeout(() => nameInput.focus(), 100);

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

  const btnRow = el('div', 'btn-row');
  const createBtn = el('button', 'btn btn-primary');
  createBtn.textContent = 'Create Match';
  createBtn.setAttribute('data-testid', 'lobby-create-btn');
  createBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const validationError = validatePlayerName(name);
    if (validationError) {
      renderError(container, validationError);
      nameInput.classList.add('shake');
      setTimeout(() => nameInput.classList.remove('shake'), 400);
      return;
    }

    setPlayerName(name);
    const damageMode = getState().damageMode;
    const startingLifepoints = getState().startingLifepoints;
    const rngSeed = seedFromUrl();
    const createMessage: {
      type: 'createMatch';
      playerName: string;
      gameOptions: { damageMode: DamageMode; startingLifepoints: number };
      rngSeed?: number;
    } = {
      type: 'createMatch',
      playerName: name,
      gameOptions: { damageMode, startingLifepoints },
    };
    if (rngSeed !== undefined) {
      createMessage.rngSeed = rngSeed;
    }

    getConnection()?.send(createMessage);
  });
  btnRow.appendChild(createBtn);

  const botBtn = el('button', 'btn btn-secondary');
  botBtn.textContent = 'Play vs Bot';
  botBtn.setAttribute('data-testid', 'create-bot-match');
  botBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const validationError = validatePlayerName(name);
    if (validationError) {
      renderError(container, validationError);
      nameInput.classList.add('shake');
      setTimeout(() => nameInput.classList.remove('shake'), 400);
      return;
    }

    setPlayerName(name);
    const damageMode = getState().damageMode;
    const startingLifepoints = getState().startingLifepoints;
    const rngSeed = seedFromUrl();
    const createMessage: {
      type: 'createMatch';
      playerName: string;
      gameOptions: { damageMode: DamageMode; startingLifepoints: number };
      rngSeed?: number;
      opponent: 'bot-random';
    } = {
      type: 'createMatch',
      playerName: name,
      gameOptions: { damageMode, startingLifepoints },
      opponent: 'bot-random',
    };
    if (rngSeed !== undefined) {
      createMessage.rngSeed = rngSeed;
    }

    getConnection()?.send(createMessage);
  });
  btnRow.appendChild(botBtn);

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
    const name = nameInput.value.trim();
    const matchId = matchInput.value.trim();
    if (!matchId) return;

    const validationError = validatePlayerName(name);
    if (validationError) {
      renderError(container, validationError);
      nameInput.classList.add('shake');
      setTimeout(() => nameInput.classList.remove('shake'), 400);
      return;
    }

    setPlayerName(name);

    getConnection()?.send({ type: 'joinMatch', matchId, playerName: name });
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
    const matchId = watchInput.value.trim();
    if (!matchId) return;

    getConnection()?.send({ type: 'watchMatch', matchId });
  });
  watchRow.appendChild(watchBtn);
  wrapper.appendChild(watchRow);

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

  renderDebugButton(wrapper);

  wrapper.appendChild(renderHealthBadge(getState().serverHealth));

  container.appendChild(wrapper);
}

export function renderJoinViaLink(
  container: HTMLElement,
  matchId: string,
  mode: string | null,
): void {
  const wrapper = el('div', 'lobby join-link-view');

  const title = el('h1', 'title');
  title.textContent = "You've Been Challenged";
  wrapper.appendChild(title);

  const modeLabels: Record<string, string> = {
    cumulative: 'Cumulative (digital)',
    'per-turn': 'Per-turn reset (tabletop)',
  };
  const badge = el('div', 'mode-badge');
  badge.textContent = mode ? (modeLabels[mode] ?? 'Standard') : 'Standard';
  wrapper.appendChild(badge);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Enter your warrior name';
  nameInput.className = 'name-input';
  nameInput.maxLength = 20; // Shorter, punchier names
  nameInput.value = getState().playerName ?? '';
  nameInput.addEventListener('input', () => {
    setPlayerName(nameInput.value.trim());
  });
  wrapper.appendChild(nameInput);

  // Auto-focus the input
  setTimeout(() => nameInput.focus(), 100);

  const btnRow = el('div', 'btn-row');
  const joinBtn = el('button', 'btn btn-primary');
  joinBtn.setAttribute('data-testid', 'lobby-join-accept-btn');
  joinBtn.textContent = 'Accept & Enter Match';
  joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const validationError = validatePlayerName(name);
    if (validationError) {
      renderError(container, validationError);
      nameInput.classList.add('shake');
      setTimeout(() => nameInput.classList.remove('shake'), 400);
      return;
    }

    setPlayerName(name);
    getConnection()?.send({ type: 'joinMatch', matchId, playerName: name });
  });
  btnRow.appendChild(joinBtn);
  wrapper.appendChild(btnRow);

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

  const createOwn = el('a', 'create-own-link');
  createOwn.textContent = 'Start your own match instead';
  createOwn.setAttribute('href', '#');
  createOwn.addEventListener('click', (e) => {
    e.preventDefault();
    resetToLobby();
  });
  wrapper.appendChild(createOwn);

  container.appendChild(wrapper);
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

  container.appendChild(wrapper);
}

export function renderWaiting(container: HTMLElement, state: AppState): void {
  const wrapper = el('div', 'waiting');

  const title = el('h2', 'title');
  title.textContent = 'Waiting for Challenger';
  wrapper.appendChild(title);

  const hint = el('p', 'waiting-hint');
  hint.textContent =
    'Share one of the options below \u2014 opponents join to play, spectators watch live.';
  wrapper.appendChild(hint);

  // -- Opponent invite --
  const playSection = el('div', 'share-section');
  const playLabel = el('p', 'share-label');
  playLabel.textContent = 'Invite to play';
  playSection.appendChild(playLabel);

  const playIdRow = el('div', 'match-id-display');
  const playIdText = el('code', 'match-id');
  playIdText.textContent = state.matchId ?? '';
  playIdText.setAttribute('data-testid', 'waiting-match-id');
  playIdRow.appendChild(playIdText);
  playSection.appendChild(playIdRow);

  const playBtns = el('div', 'share-btn-row');
  playBtns.appendChild(makeCopyBtn('Copy Code', () => state.matchId ?? ''));
  playBtns.appendChild(
    makeCopyBtn('Copy Link', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('match', state.matchId ?? '');
      url.searchParams.set('mode', getState().damageMode);
      return url.toString();
    }),
  );
  playSection.appendChild(playBtns);
  wrapper.appendChild(playSection);

  // -- Spectator invite --
  const watchSection = el('div', 'share-section');
  const watchLabel = el('p', 'share-label');
  watchLabel.textContent = 'Invite to watch';
  watchSection.appendChild(watchLabel);

  const watchIdRow = el('div', 'match-id-display');
  const watchIdText = el('code', 'match-id');
  watchIdText.textContent = state.matchId ?? '';
  watchIdText.setAttribute('data-testid', 'waiting-watch-match-id');
  watchIdRow.appendChild(watchIdText);
  watchSection.appendChild(watchIdRow);

  const watchBtns = el('div', 'share-btn-row');
  watchBtns.appendChild(makeCopyBtn('Copy Code', () => state.matchId ?? ''));
  watchBtns.appendChild(
    makeCopyBtn('Copy Watch Link', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('watch', state.matchId ?? '');
      return url.toString();
    }),
  );
  watchSection.appendChild(watchBtns);
  wrapper.appendChild(watchSection);

  container.appendChild(wrapper);
}
