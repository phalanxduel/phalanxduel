import type { GridPosition } from '@phalanxduel/shared';
import type { AppState, Screen, ServerHealth } from './state';
import type { Connection } from './connection';
import { renderLobby, unmountLobby } from './lobby';
import { renderGame } from './game';
import { renderWaiting } from './waiting';
import { renderGameOver } from './game-over';
import { isFace, suitColor, suitSymbol } from './cards';
import { applySuitAura } from './card-utils';
import { clearError } from './state';

let connection: Connection | null = null;

export function setConnection(conn: Connection): void {
  connection = conn;
}

export function getConnection(): Connection | null {
  return connection;
}

let lastScreen: Screen | null = null;
let lastStateHash: string | null = null;
let lastSelectedAttacker: GridPosition | null = null;
let lastSelectedDeployCard: string | null = null;
let lastShowHelp = false;
let lastError: string | null = null;
let lastUserId: string | null = null;
let lastConnectionState: AppState['connectionState'] | null = null;
let lastOperativeId: string | null = null;
let lastDamageMode: string | null = null;
let lastStartingLifepoints: number | null = null;
let lastValidActionsHash: string | null = null;
let lastThemePhx: boolean | null = null;
let lastIsSpectator: boolean | null = null;
let lastPlayerIndex: number | null = null;
let lastRewatchStep: number | null = null;
let lastRewatchMatchId: string | null = null;

let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  updateFloatingCard();
});

document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches[0]) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
      updateFloatingCard();
    }
  },
  { passive: true },
);

document.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches[0]) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
      updateFloatingCard();
    }
  },
  { passive: true },
);

function updateFloatingCard() {
  const el = document.getElementById('pz-floating-card');
  if (el) {
    el.style.left = `${mouseX}px`;
    el.style.top = `${mouseY}px`;
  }
}

function shouldUsePreactLobby(): boolean {
  const params = new URLSearchParams(window.location.search);
  const legacyForced = params.get('preactLobby') === '0';
  return !legacyForced;
}

function needsFullRender(state: AppState): {
  changed: boolean;
  stateHash: string | null;
  actionsHash: string | null;
} {
  const stateHash = state.gameState ? JSON.stringify(state.gameState) : null;
  const actionsHash = JSON.stringify(state.validActions);

  const changed =
    state.screen !== lastScreen ||
    stateHash !== lastStateHash ||
    state.error !== lastError ||
    JSON.stringify(state.selectedAttacker) !== JSON.stringify(lastSelectedAttacker) ||
    state.selectedDeployCard !== lastSelectedDeployCard ||
    state.showHelp !== lastShowHelp ||
    (state.user?.id ?? null) !== lastUserId ||
    state.connectionState !== lastConnectionState ||
    state.operativeId !== lastOperativeId ||
    state.damageMode !== lastDamageMode ||
    state.startingLifepoints !== lastStartingLifepoints ||
    actionsHash !== lastValidActionsHash ||
    state.themePhx !== lastThemePhx ||
    state.isSpectator !== lastIsSpectator ||
    state.playerIndex !== lastPlayerIndex ||
    state.rewatchStep !== lastRewatchStep ||
    state.rewatchMatchId !== lastRewatchMatchId;

  if (state.screen === 'rewatch' && state.rewatchStep !== lastRewatchStep) {
    console.log(
      `[renderer] Rewatch step changed: ${lastRewatchStep} -> ${state.rewatchStep}. changed=${changed}`,
    );
  }

  return { changed, stateHash, actionsHash };
}

function isPreactLobbyScreen(screen: Screen | null): boolean {
  return (
    screen === 'lobby' ||
    screen === 'settings' ||
    screen === 'auth' ||
    screen === 'ladder' ||
    screen === 'profile' ||
    screen === 'public_lobby' ||
    screen === 'spectator_lobby' ||
    screen === 'rewatch'
  );
}

function handleDomReset(app: HTMLElement, state: AppState): void {
  if (!lastScreen) return;

  const isSameScreen = lastScreen === state.screen;
  const isSharedLobbyRoot = isPreactLobbyScreen(lastScreen) && isPreactLobbyScreen(state.screen);

  if (isSameScreen || isSharedLobbyRoot) {
    return; // Staying on the same Preact root, no DOM reset needed
  }

  // Screen changed to a different top-level root
  if (isPreactLobbyScreen(lastScreen)) {
    unmountLobby(app);
  }
  app.innerHTML = '';
}

function dispatchScreenRender(app: HTMLElement, state: AppState): void {
  switch (state.screen) {
    case 'lobby':
    case 'auth':
    case 'settings':
    case 'ladder':
    case 'profile':
    case 'public_lobby':
    case 'spectator_lobby':
    case 'rewatch':
      renderLobby(app, state);
      break;
    case 'waiting':
      renderWaiting(app, state);
      break;
    case 'game':
      renderGame(app, state);
      break;
    case 'gameOver':
      renderGameOver(app, state);
      break;
  }
}

function updateDocumentTitle(state: AppState): void {
  let pageTitle = 'Phalanx Duel';
  switch (state.screen) {
    case 'lobby':
      pageTitle = 'Phalanx Duel | Tactical 1v1 Card Combat';
      break;
    case 'auth':
      pageTitle = 'Authentication | Phalanx Duel';
      break;
    case 'settings':
      pageTitle = 'Settings | Phalanx Duel';
      break;
    case 'ladder':
      pageTitle = 'Leaderboard | Phalanx Duel';
      break;
    case 'profile':
      pageTitle = 'Operative Profile | Phalanx Duel';
      break;
    case 'public_lobby':
      pageTitle = 'Public Lobby | Phalanx Duel';
      break;
    case 'spectator_lobby':
      pageTitle = 'Spectator Lobby | Phalanx Duel';
      break;
    case 'rewatch':
      pageTitle = 'Rewatch | Phalanx Duel';
      break;
    case 'waiting':
      pageTitle = 'Phalanx Duel | Waiting for Challenger...';
      break;
    case 'game':
      if (state.gameState) {
        const isMyTurn = state.gameState.activePlayerIndex === state.playerIndex;
        pageTitle = isMyTurn
          ? '\u25B6 YOUR TURN | Phalanx Duel'
          : 'Opponent\u2019s Turn | Phalanx Duel';
        if (state.isSpectator) pageTitle = 'Spectating | Phalanx Duel';
      }
      break;
    case 'gameOver':
      pageTitle = 'Game Over | Phalanx Duel';
      break;
  }
  document.title = pageTitle;
}

export function render(state: AppState): void {
  const app = document.getElementById('app');
  if (!app) return;

  if (state.screen === 'rewatch') {
    console.log(`[renderer] render() called for rewatch step ${state.rewatchStep}`);
  }

  renderFloatingCard(state);

  const { changed, stateHash, actionsHash } = needsFullRender(state);
  const preactLobbyEnabled = shouldUsePreactLobby();

  if (!changed) {
    if (!(state.screen === 'lobby' && preactLobbyEnabled)) {
      updateHealthBadges(state.serverHealth);
    }
    updateSpectatorCount(state.spectatorCount);
    return;
  }

  handleDomReset(app, state);

  lastScreen = state.screen;
  lastStateHash = stateHash;
  lastSelectedAttacker = state.selectedAttacker ? { ...state.selectedAttacker } : null;
  lastSelectedDeployCard = state.selectedDeployCard;
  lastShowHelp = state.showHelp;
  lastError = state.error;
  lastUserId = state.user?.id ?? null;
  lastConnectionState = state.connectionState;
  lastOperativeId = state.operativeId;
  lastDamageMode = state.damageMode;
  lastStartingLifepoints = state.startingLifepoints;
  lastValidActionsHash = actionsHash;
  lastThemePhx = state.themePhx;
  lastIsSpectator = state.isSpectator;
  lastPlayerIndex = state.playerIndex;
  lastRewatchStep = state.rewatchStep;
  lastRewatchMatchId = state.rewatchMatchId;

  updateDocumentTitle(state);
  dispatchScreenRender(app, state);

  if (state.error) {
    renderError(app, state.error);
  }
}

function renderFloatingCard(state: AppState): void {
  let floatingEl = document.getElementById('pz-floating-card');

  const selectedCardId = state.selectedDeployCard;
  if (!selectedCardId || state.screen !== 'game') {
    floatingEl?.remove();
    return;
  }

  const myIdx = state.playerIndex ?? 0;
  const hand = state.gameState?.players[myIdx]?.hand ?? [];
  const card = hand.find((c) => c.id === selectedCardId);

  if (!card) {
    floatingEl?.remove();
    return;
  }

  if (!floatingEl) {
    floatingEl = el('div', 'pz-floating-card');
    floatingEl.id = 'pz-floating-card';
    document.body.appendChild(floatingEl);
  }

  // Clear children safely (no untrusted content)
  while (floatingEl.firstChild) floatingEl.firstChild.remove();

  if (isFace(card)) floatingEl.classList.add('is-face');
  else floatingEl.classList.remove('is-face');

  floatingEl.style.borderColor = suitColor(card.suit);

  applySuitAura(floatingEl, card.suit);

  const rank = el('div', state.themePhx ? 'phx-card-rank' : 'card-rank');
  rank.textContent = card.face;
  rank.style.color = suitColor(card.suit);
  floatingEl.appendChild(rank);

  const suitEl = el('div', state.themePhx ? 'phx-card-suit' : 'card-pip');
  suitEl.textContent = suitSymbol(card.suit);
  suitEl.style.color = suitColor(card.suit);
  floatingEl.appendChild(suitEl);

  if (state.themePhx) {
    const typeEl = el('div', 'phx-card-type');
    typeEl.textContent = card.type;
    floatingEl.appendChild(typeEl);
  }

  updateFloatingCard();
}

function updateHealthBadges(health: ServerHealth | null): void {
  const badges = document.querySelectorAll('.health-badge');
  badges.forEach((oldBadge) => {
    const newBadge = renderHealthBadge(health);
    oldBadge.replaceWith(newBadge);
  });
}

function updateSpectatorCount(count: number): void {
  const el = document.querySelector('.spectator-count');
  if (el) {
    el.textContent = count > 0 ? `${count} watching` : '';
  }
}

export function renderHealthBadge(health: ServerHealth | null): HTMLElement {
  console.log(`[renderer] Legacy rendering badge color=${health?.color || 'null'}`);
  const badge = el('div', 'health-badge');
  const h = health ?? { color: 'red' as const, label: 'Connecting\u2026', hint: null };
  badge.classList.add(`health-badge--${h.color}`);
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-live', 'polite');
  badge.setAttribute('aria-atomic', 'true');
  badge.setAttribute('aria-label', h.hint ? `${h.label}. ${h.hint}` : h.label);
  badge.setAttribute('data-health-color', h.color);

  const dot = el('span', 'health-dot');
  badge.appendChild(dot);

  const copy = el('span', 'health-copy');
  const labelEl = el('span', 'health-label');
  labelEl.textContent = h.label;
  copy.appendChild(labelEl);

  if (h.hint) {
    const hintEl = el('span', 'health-hint');
    hintEl.textContent = h.hint;
    copy.appendChild(hintEl);
  }
  badge.appendChild(copy);

  return badge;
}

export function makeCopyBtn(label: string, getValue: () => string): HTMLButtonElement {
  const btn = el('button', 'btn btn-small') as HTMLButtonElement;
  btn.textContent = label;
  btn.setAttribute('aria-live', 'polite');
  btn.setAttribute('aria-atomic', 'true');
  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.textContent = 'Copying...';

    void navigator.clipboard
      .writeText(getValue().trim())
      .then(() => {
        btn.textContent = 'Copied';
      })
      .catch(() => {
        btn.textContent = 'Copy failed';
      })
      .finally(() => {
        window.setTimeout(() => {
          btn.disabled = false;
          btn.setAttribute('aria-busy', 'false');
          btn.textContent = label;
        }, 2000);
      });
  });
  return btn;
}

export function renderError(container: HTMLElement, message: string): void {
  const errorDiv = el('div', 'error-banner');
  errorDiv.textContent = message;
  errorDiv.setAttribute('role', 'alert');
  errorDiv.setAttribute('aria-live', 'assertive');
  errorDiv.setAttribute('aria-atomic', 'true');

  const closeBtn = el('button', 'error-close');
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', () => {
    errorDiv.remove();
    clearError();
  });
  errorDiv.appendChild(closeBtn);

  container.appendChild(errorDiv);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.classList.add('fade-out');
      setTimeout(() => {
        if (errorDiv.parentElement) {
          errorDiv.remove();
          clearError();
        }
      }, 500);
    }
  }, 5000);
}

export function el(tag: string, className: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}
