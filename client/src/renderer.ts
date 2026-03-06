import type { GridPosition } from '@phalanxduel/shared';
import type { AppState, Screen, ServerHealth } from './state';
import type { Connection } from './connection';
import { renderGameOver } from './game-over';
import { renderGameOverPreact } from './game-over-preact';
import { renderLobby, renderWaiting } from './lobby';
import { renderLobbyPreact } from './lobby-preact';
import { renderWaitingPreact } from './waiting-preact';
import { renderGame } from './game';
import { renderGamePreact } from './game-preact';
import { isPreactLobbyExperimentEnabled } from './experiments';
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
let lastServerHealth: string | null = null;

let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  updateFloatingCard();
});

function updateFloatingCard() {
  const el = document.getElementById('pz-floating-card');
  if (el) {
    el.style.left = `${mouseX}px`;
    el.style.top = `${mouseY}px`;
  }
}

function shouldUsePreactLobby(): boolean {
  const params = new URLSearchParams(window.location.search);
  const envEnabled = import.meta.env['VITE_PREACT_LOBBY'] === '1';
  const paramEnabled = params.get('preactLobby') === '1';
  const experimentEnabled = isPreactLobbyExperimentEnabled();
  const specialLobbyMode = params.has('match') || params.has('watch');
  return (envEnabled || paramEnabled || experimentEnabled) && !specialLobbyMode;
}

export function render(state: AppState): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Render floating card if selecting for deployment
  renderFloatingCard(state);

  // GameState does not expose a top-level stateHashAfter; derive a stable key
  // from the full game snapshot so turn/phase changes always trigger rerender.
  const currentStateHash = state.gameState ? JSON.stringify(state.gameState) : null;
  const currentHealthHash = state.serverHealth ? JSON.stringify(state.serverHealth) : null;
  const screenChanged = state.screen !== lastScreen;
  const gameChanged = currentStateHash !== lastStateHash;
  const errorChanged = state.error !== lastError; // Detect change, not just presence
  const selectionChanged =
    JSON.stringify(state.selectedAttacker) !== JSON.stringify(lastSelectedAttacker) ||
    state.selectedDeployCard !== lastSelectedDeployCard;
  const helpChanged = state.showHelp !== lastShowHelp;
  const healthChanged = currentHealthHash !== lastServerHealth;

  const preactLobbyEnabled = shouldUsePreactLobby();
  const shouldForceFullRender = state.screen === 'lobby' && preactLobbyEnabled && healthChanged;

  // Only perform a full re-render if the screen, game logic state, or selection actually changed.
  // This prevents 'pulsing' (re-triggering animations) on health or spectator count updates.
  if (
    screenChanged ||
    gameChanged ||
    errorChanged ||
    selectionChanged ||
    helpChanged ||
    shouldForceFullRender
  ) {
    app.innerHTML = '';
    lastScreen = state.screen;
    lastStateHash = currentStateHash;
    lastSelectedAttacker = state.selectedAttacker ? { ...state.selectedAttacker } : null;
    lastSelectedDeployCard = state.selectedDeployCard;
    lastShowHelp = state.showHelp;
    lastError = state.error;
    lastServerHealth = currentHealthHash;

    let pageTitle = 'Phalanx Duel';

    switch (state.screen) {
      case 'lobby':
        pageTitle = 'Phalanx Duel | Tactical 1v1 Card Combat';
        if (preactLobbyEnabled) renderLobbyPreact(app);
        else renderLobby(app);
        break;
      case 'waiting':
        pageTitle = 'Phalanx Duel | Waiting for Challenger...';
        if (preactLobbyEnabled) renderWaitingPreact(app, state);
        else renderWaiting(app, state);
        break;
      case 'game':
        if (state.gameState) {
          const isMyTurn = state.gameState.activePlayerIndex === state.playerIndex;
          pageTitle = isMyTurn
            ? '\u25B6 YOUR TURN | Phalanx Duel'
            : 'Opponent\u2019s Turn | Phalanx Duel';
          if (state.isSpectator) pageTitle = 'Spectating | Phalanx Duel';
        }
        if (preactLobbyEnabled) renderGamePreact(app, state);
        else renderGame(app, state);
        break;
      case 'gameOver':
        pageTitle = 'Game Over | Phalanx Duel';
        if (preactLobbyEnabled) renderGameOverPreact(app, state);
        else renderGameOver(app, state);
        break;
    }

    document.title = pageTitle;

    if (state.error) {
      renderError(app, state.error);
    }
  } else {
    // Targeted updates for high-frequency but low-impact changes (health, spectator count)
    // Skip direct health DOM patching for the Preact lobby to avoid DOM ownership conflicts.
    if (!(state.screen === 'lobby' && preactLobbyEnabled)) {
      updateHealthBadges(state.serverHealth);
    }
    updateSpectatorCount(state.spectatorCount);
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

  const rank = el('div', 'card-rank');
  rank.textContent = card.face;
  rank.style.color = suitColor(card.suit);
  floatingEl.appendChild(rank);

  const suitEl = el('div', 'card-pip');
  suitEl.textContent = suitSymbol(card.suit);
  suitEl.style.color = suitColor(card.suit);
  floatingEl.appendChild(suitEl);

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
  const badge = el('div', 'health-badge');
  const h = health ?? { color: 'red' as const, label: 'Connecting\u2026', hint: null };
  badge.classList.add(`health-badge--${h.color}`);

  const dot = el('span', 'health-dot');
  badge.appendChild(dot);

  const labelEl = el('span', 'health-label');
  labelEl.textContent = h.label;
  badge.appendChild(labelEl);

  if (h.hint) {
    const hintEl = el('span', 'health-hint');
    hintEl.textContent = h.hint;
    badge.appendChild(hintEl);
  }

  return badge;
}

export function makeCopyBtn(label: string, getValue: () => string): HTMLButtonElement {
  const btn = el('button', 'btn btn-small') as HTMLButtonElement;
  btn.textContent = label;
  btn.addEventListener('click', () => {
    void navigator.clipboard.writeText(getValue());
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = label;
    }, 2000);
  });
  return btn;
}

export function renderError(container: HTMLElement, message: string): void {
  const errorDiv = el('div', 'error-banner');
  errorDiv.textContent = message;

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
