import type { GridPosition, GameState, Card, CombatLogEntry } from '@phalanxduel/shared';
import type { AppState, Screen, ServerHealth } from './state';
import type { Connection } from './connection';
import { renderGameOver } from './game-over';
import { renderLobby, renderWaiting } from './lobby';
import { renderHelpMarker } from './help';
import { cardLabel, hpDisplay, suitColor, suitSymbol, isWeapon, isFace } from './cards';
import {
  selectAttacker,
  selectDeployCard,
  clearSelection,
  clearError,
  getState,
  toggleHelp,
} from './state';

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

export function render(state: AppState): void {
  const app = document.getElementById('app');
  if (!app) return;

  // Render floating card if selecting for deployment
  renderFloatingCard(state);

  // GameState does not expose a top-level stateHashAfter; derive a stable key
  // from the full game snapshot so turn/phase changes always trigger rerender.
  const currentStateHash = state.gameState ? JSON.stringify(state.gameState) : null;
  const screenChanged = state.screen !== lastScreen;
  const gameChanged = currentStateHash !== lastStateHash;
  const errorChanged = state.error !== lastError; // Detect change, not just presence
  const selectionChanged =
    JSON.stringify(state.selectedAttacker) !== JSON.stringify(lastSelectedAttacker) ||
    state.selectedDeployCard !== lastSelectedDeployCard;
  const helpChanged = state.showHelp !== lastShowHelp;

  // Only perform a full re-render if the screen, game logic state, or selection actually changed.
  // This prevents 'pulsing' (re-triggering animations) on health or spectator count updates.
  if (screenChanged || gameChanged || errorChanged || selectionChanged || helpChanged) {
    app.innerHTML = '';
    lastScreen = state.screen;
    lastStateHash = currentStateHash;
    lastSelectedAttacker = state.selectedAttacker ? { ...state.selectedAttacker } : null;
    lastSelectedDeployCard = state.selectedDeployCard;
    lastShowHelp = state.showHelp;
    lastError = state.error;

    let pageTitle = 'Phalanx Duel';

    switch (state.screen) {
      case 'lobby':
        pageTitle = 'Phalanx Duel | Tactical 1v1 Card Combat';
        renderLobby(app);
        break;
      case 'waiting':
        pageTitle = 'Phalanx Duel | Waiting for Challenger...';
        renderWaiting(app, state);
        break;
      case 'game':
        if (state.gameState) {
          const isMyTurn = state.gameState.activePlayerIndex === state.playerIndex;
          pageTitle = isMyTurn
            ? '\u25B6 YOUR TURN | Phalanx Duel'
            : 'Opponent\u2019s Turn | Phalanx Duel';
          if (state.isSpectator) pageTitle = 'Spectating | Phalanx Duel';
        }
        renderGame(app, state);
        break;
      case 'gameOver':
        pageTitle = 'Game Over | Phalanx Duel';
        renderGameOver(app, state);
        break;
    }

    document.title = pageTitle;

    if (state.error) {
      renderError(app, state.error);
    }
  } else {
    // Targeted updates for high-frequency but low-impact changes (health, spectator count)
    updateHealthBadges(state.serverHealth);
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

  floatingEl.classList.remove(
    'pz-aura-diamonds',
    'pz-aura-hearts',
    'pz-aura-clubs',
    'pz-aura-spades',
  );
  if (card.suit === 'diamonds') floatingEl.classList.add('pz-aura-diamonds');
  if (card.suit === 'hearts') floatingEl.classList.add('pz-aura-hearts');
  if (card.suit === 'clubs') floatingEl.classList.add('pz-aura-clubs');
  if (card.suit === 'spades') floatingEl.classList.add('pz-aura-spades');

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

function renderGame(container: HTMLElement, state: AppState): void {
  if (!state.gameState) return;
  if (!state.isSpectator && state.playerIndex === null) return;

  const gs = state.gameState;
  const isSpectator = state.isSpectator;
  const myIdx = isSpectator ? 0 : state.playerIndex!;
  const oppIdx = myIdx === 0 ? 1 : 0;

  const layout = el('div', 'game-layout');
  layout.setAttribute('data-testid', 'game-layout');

  const main = el('div', 'game-main');
  const wrapper = el('div', 'game');

  // Opponent battlefield (top, mirrored)
  const oppSection = el('div', 'battlefield-section opponent');
  const oppLabel = el('div', 'section-label');
  oppLabel.textContent = `${gs.players[oppIdx]?.player.name ?? 'Opponent'}`;
  oppSection.appendChild(oppLabel);
  oppSection.appendChild(renderBattlefield(gs, oppIdx, state, true));
  if (!isSpectator) renderHelpMarker('battlefield', oppSection);
  wrapper.appendChild(oppSection);

  // Info bar
  const infoBar = el('div', 'info-bar');
  const phaseText = el('span', 'phase');
  let phaseLabel = gs.phase as string;
  if (gs.phase === 'ReinforcementPhase') {
    phaseLabel = `Reinforce col ${(gs.reinforcement?.column ?? 0) + 1}`;
  } else if (gs.phase === 'DeploymentPhase') {
    phaseLabel = 'Deployment';
  }
  phaseText.textContent = `Phase: ${phaseLabel} | Turn: ${gs.turnNumber}`;
  phaseText.setAttribute('data-testid', 'phase-indicator');
  infoBar.appendChild(phaseText);

  if (isSpectator) {
    const spectatorBadge = el('span', 'spectator-badge');
    spectatorBadge.textContent = 'SPECTATING';
    infoBar.appendChild(spectatorBadge);
  }

  if (gs.gameOptions?.damageMode === 'classic') {
    const modeTag = el('span', 'mode-tag');
    modeTag.textContent = 'Per-Turn Reset';
    infoBar.appendChild(modeTag);
  }

  const turnText = el('span', 'turn-indicator');
  turnText.setAttribute('data-testid', 'turn-indicator');
  const isMyTurn = gs.activePlayerIndex === myIdx;
  if (isSpectator) {
    const activeName =
      gs.players[gs.activePlayerIndex]?.player.name ?? `Player ${gs.activePlayerIndex + 1}`;
    turnText.textContent = `${activeName}'s turn`;
    turnText.classList.add('opp-turn');
  } else if (gs.phase === 'ReinforcementPhase') {
    turnText.textContent = isMyTurn ? 'Reinforce your column' : 'Opponent reinforcing';
    turnText.classList.add(isMyTurn ? 'my-turn' : 'opp-turn');
  } else {
    turnText.textContent = isMyTurn ? 'Your turn' : "Opponent's turn";
    turnText.classList.add(isMyTurn ? 'my-turn' : 'opp-turn');
  }
  infoBar.appendChild(turnText);

  if (!isSpectator && gs.phase === 'AttackPhase' && isMyTurn && state.selectedAttacker) {
    const cancelBtn = el('button', 'btn btn-small');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.setAttribute('data-testid', 'combat-cancel-btn');
    cancelBtn.addEventListener('click', clearSelection);
    infoBar.appendChild(cancelBtn);
  }

  if (!isSpectator && gs.phase === 'AttackPhase' && isMyTurn) {
    const passBtn = el('button', 'btn btn-small');
    passBtn.textContent = 'Pass';
    passBtn.setAttribute('data-testid', 'combat-pass-btn');
    passBtn.addEventListener('click', () => {
      if (!state.matchId) return;
      connection?.send({
        type: 'action',
        matchId: state.matchId,
        action: {
          type: 'pass',
          playerIndex: myIdx,
          timestamp: new Date().toISOString(),
        },
      });
    });
    infoBar.appendChild(passBtn);
  }

  if (
    !isSpectator &&
    (gs.phase === 'AttackPhase' || gs.phase === 'ReinforcementPhase') &&
    isMyTurn
  ) {
    const forfeitBtn = el('button', 'btn btn-small btn-forfeit');
    forfeitBtn.textContent = 'Forfeit';
    forfeitBtn.setAttribute('data-testid', 'combat-forfeit-btn');
    forfeitBtn.addEventListener('click', () => {
      if (!state.matchId) return;
      if (!confirm('Are you sure you want to forfeit?')) return;
      connection?.send({
        type: 'action',
        matchId: state.matchId,
        action: {
          type: 'forfeit',
          playerIndex: myIdx,
          timestamp: new Date().toISOString(),
        },
      });
    });
    infoBar.appendChild(forfeitBtn);
  }

  const helpBtn = el('button', 'btn btn-small help-btn');
  helpBtn.textContent = state.showHelp ? 'Exit Help' : 'Help ?';
  helpBtn.addEventListener('click', toggleHelp);
  infoBar.appendChild(helpBtn);

  wrapper.appendChild(infoBar);

  // My battlefield (bottom)
  const mySection = el('div', 'battlefield-section mine');
  const myLabel = el('div', 'section-label');
  myLabel.textContent = `${gs.players[myIdx]?.player.name ?? 'You'}`;
  mySection.appendChild(myLabel);
  mySection.appendChild(renderBattlefield(gs, myIdx, state, false));
  wrapper.appendChild(mySection);

  if (!isSpectator && gs.players[myIdx]) {
    wrapper.appendChild(renderHand(gs, state));
  }

  // Battle log
  const hasAttacks = (gs.transactionLog ?? []).some((e) => e.details.type === 'attack');
  if (hasAttacks) {
    wrapper.appendChild(renderBattleLog(gs));
  }

  // Invite section (discrete)
  if (!isSpectator) {
    wrapper.appendChild(renderInGameInvite(state));
  }

  main.appendChild(wrapper);
  layout.appendChild(main);
  layout.appendChild(renderStatsSidebar(gs, myIdx, oppIdx, state.spectatorCount));
  container.appendChild(layout);
}

function renderInGameInvite(state: AppState): HTMLElement {
  const section = el('div', 'in-game-invite');
  const label = el('span', 'invite-label');
  label.textContent = 'Invite Spectators:';
  section.appendChild(label);

  const btnRow = el('div', 'share-btn-row');

  const copyCode = makeCopyBtn('Code', () => state.matchId ?? '');
  copyCode.classList.add('btn-tiny');
  btnRow.appendChild(copyCode);

  const copyLink = makeCopyBtn('Link', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('watch', state.matchId ?? '');
    return url.toString();
  });
  copyLink.classList.add('btn-tiny');
  btnRow.appendChild(copyLink);

  section.appendChild(btnRow);
  return section;
}

function renderBattlefield(
  gs: GameState,
  playerIdx: number,
  state: AppState,
  isOpponent: boolean,
): HTMLElement {
  const grid = el('div', 'battlefield');
  const battlefield = gs.players[playerIdx]?.battlefield;
  if (!battlefield) return grid;

  // Render rows: for opponent, show back row (1) then front row (0) so front faces center
  // For self, show front row (0) then back row (1)
  const rowOrder = isOpponent ? [1, 0] : [0, 1];

  for (const row of rowOrder) {
    for (let col = 0; col < 4; col++) {
      const gridIdx = row * 4 + col;
      const bCard = battlefield[gridIdx];
      const pos: GridPosition = { row, col };

      const cell = el('div', 'bf-cell');
      cell.setAttribute(
        'data-testid',
        `${isOpponent ? 'opponent' : 'player'}-cell-r${row}-c${col}`,
      );

      // Highlight reinforcement column on my battlefield
      const isReinforcementCol =
        !isOpponent &&
        gs.phase === 'ReinforcementPhase' &&
        gs.reinforcement &&
        col === gs.reinforcement.column;
      if (isReinforcementCol) {
        cell.classList.add('reinforce-col');
        if (state.selectedDeployCard) {
          cell.classList.add('valid-target');
          cell.addEventListener('click', () => {
            if (!state.matchId || state.playerIndex === null) return;
            connection?.send({
              type: 'action',
              matchId: state.matchId,
              action: {
                type: 'reinforce',
                playerIndex: state.playerIndex,
                cardId: state.selectedDeployCard!,
                timestamp: new Date().toISOString(),
              },
            });
          });
        }
      }

      if (bCard) {
        cell.classList.add('occupied');
        if (isFace(bCard.card)) cell.classList.add('is-face');
        cell.style.borderColor = suitColor(bCard.card.suit);

        // SUIT AURAS (Roblox Pop)
        if (bCard.card.suit === 'diamonds') cell.classList.add('pz-aura-diamonds');
        if (bCard.card.suit === 'hearts') cell.classList.add('pz-aura-hearts');
        if (bCard.card.suit === 'clubs') cell.classList.add('pz-aura-clubs');
        if (bCard.card.suit === 'spades') cell.classList.add('pz-aura-spades');

        const rankEl = el('div', 'card-rank');
        rankEl.textContent = bCard.card.face;
        rankEl.style.color = suitColor(bCard.card.suit);
        cell.appendChild(rankEl);

        const suitEl = el('div', 'card-pip');
        suitEl.textContent = suitSymbol(bCard.card.suit);
        suitEl.style.color = suitColor(bCard.card.suit);
        cell.appendChild(suitEl);

        const hpEl = el('div', 'card-hp');
        hpEl.textContent = hpDisplay(bCard);
        cell.appendChild(hpEl);

        const typeEl = el('div', 'card-type');
        typeEl.textContent = isWeapon(bCard.card.suit) ? 'ATK' : 'DEF';
        cell.appendChild(typeEl);

        // Multiplier tag if active attacker
        if (!isOpponent && gs.phase === 'AttackPhase' && isWeapon(bCard.card.suit)) {
          if (bCard.card.suit === 'spades' || bCard.card.suit === 'clubs') {
            const tag = el('div', 'pz-multiplier');
            tag.textContent = 'x2';
            cell.appendChild(tag);
          }
        }

        // Click handlers
        if (
          isOpponent &&
          state.selectedAttacker &&
          gs.activePlayerIndex === state.playerIndex &&
          col === state.selectedAttacker.col
        ) {
          // Clicking opponent card in same column = target
          cell.classList.add('valid-target');
          cell.addEventListener('click', () => {
            sendAttack(state, pos);
          });
        } else if (
          !isOpponent &&
          gs.phase === 'AttackPhase' &&
          gs.activePlayerIndex === state.playerIndex
        ) {
          // ACTIVE COLUMN PULSE: if front row and can attack
          if (row === 0 && isWeapon(bCard.card.suit)) {
            cell.classList.add('pz-active-pulse');
          }

          // Clicking my card = select attacker
          if (state.selectedAttacker?.row === row && state.selectedAttacker?.col === col) {
            cell.classList.add('selected');
          }
          cell.addEventListener('click', () => {
            selectAttacker(pos);
          });
        }
      } else {
        cell.classList.add('empty');

        // GHOST TARGETING: If I have an attacker selected, highlight empty cells in that column
        if (isOpponent && state.selectedAttacker && col === state.selectedAttacker.col) {
          cell.classList.add('valid-target');
          cell.style.opacity = '0.3';
          cell.addEventListener('click', () => {
            sendAttack(state, pos);
          });
        }

        // Deployment handling
        if (
          !isOpponent &&
          gs.phase === 'DeploymentPhase' &&
          gs.activePlayerIndex === state.playerIndex &&
          state.selectedDeployCard
        ) {
          cell.classList.add('valid-target');
          cell.addEventListener('click', () => {
            if (!state.matchId || state.playerIndex === null) return;
            connection?.send({
              type: 'action',
              matchId: state.matchId,
              action: {
                type: 'deploy',
                playerIndex: state.playerIndex,
                column: col,
                cardId: state.selectedDeployCard!,
                timestamp: new Date().toISOString(),
              },
            });
          });
        }
      }

      grid.appendChild(cell);
    }
  }

  return grid;
}

function renderHand(gs: GameState, state: AppState): HTMLElement {
  const handSection = el('div', 'hand-section');
  const label = el('div', 'section-label');
  label.textContent = 'Your Hand';
  handSection.appendChild(label);
  renderHelpMarker('hand', handSection);

  const handDiv = el('div', 'hand');
  const myIdx = state.playerIndex ?? 0;
  const hand = gs.players[myIdx]?.hand ?? [];
  const isMyTurn = gs.activePlayerIndex === myIdx;

  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    if (!card) continue;

    const cardEl = el('div', 'hand-card');
    cardEl.setAttribute('data-testid', `hand-card-${i}`);
    if (isFace(card)) cardEl.classList.add('is-face');
    cardEl.style.borderColor = suitColor(card.suit);

    // SUIT AURAS (Ensure no green fallback)
    if (card.suit === 'diamonds') cardEl.classList.add('pz-aura-diamonds');
    if (card.suit === 'hearts') cardEl.classList.add('pz-aura-hearts');
    if (card.suit === 'clubs') cardEl.classList.add('pz-aura-clubs');
    if (card.suit === 'spades') cardEl.classList.add('pz-aura-spades');

    const rankEl = el('div', 'card-rank');
    rankEl.textContent = card.face;
    rankEl.style.color = suitColor(card.suit);
    cardEl.appendChild(rankEl);

    const suitEl = el('div', 'card-pip');
    suitEl.textContent = suitSymbol(card.suit);
    suitEl.style.color = suitColor(card.suit);
    cardEl.appendChild(suitEl);

    if (gs.phase === 'DeploymentPhase' && isMyTurn) {
      cardEl.classList.add('playable');
      if (state.selectedDeployCard === card.id) {
        cardEl.classList.add('selected');
      }
      cardEl.addEventListener('click', () => {
        selectDeployCard(card.id);
      });
    }

    if (gs.phase === 'ReinforcementPhase' && isMyTurn) {
      cardEl.classList.add('playable', 'reinforce-playable');
      if (state.selectedDeployCard === card.id) {
        cardEl.classList.add('selected');
      }
      cardEl.addEventListener('click', () => {
        selectDeployCard(card.id); // Re-use selectDeployCard for reinforcement selection
      });
    }

    handDiv.appendChild(cardEl);
  }

  handSection.appendChild(handDiv);

  return handSection;
}

function sendAttack(state: AppState, targetPos: GridPosition): void {
  if (!state.selectedAttacker || !state.matchId || state.playerIndex === null) return;
  connection?.send({
    type: 'action',
    matchId: state.matchId,
    action: {
      type: 'attack',
      playerIndex: state.playerIndex,
      attackingColumn: state.selectedAttacker.col,
      defendingColumn: targetPos.col,
      timestamp: new Date().toISOString(),
    },
  });
}

export function renderError(container: HTMLElement, message: string): void {
  const errorDiv = el('div', 'error-banner');
  errorDiv.textContent = message;

  const closeBtn = el('button', 'error-close');
  closeBtn.innerHTML = '&times;';
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

function getLifepoints(gs: GameState, playerIdx: number): number {
  return gs.players[playerIdx]?.lifepoints ?? 20;
}

function makeStatsRow(value: string, label: string): HTMLElement {
  const row = el('div', 'stats-row');
  const valEl = el('span', 'stats-value');
  valEl.textContent = value;
  row.appendChild(valEl);
  const labEl = el('span', 'stats-label');
  labEl.textContent = label;
  row.appendChild(labEl);
  return row;
}

function makeCardStatsRow(card: Card, label: string): HTMLElement {
  const row = el('div', 'stats-row');
  const valEl = el('span', 'stats-card-label');
  valEl.textContent = cardLabel(card);
  valEl.style.color = suitColor(card.suit);
  row.appendChild(valEl);
  const labEl = el('span', 'stats-label');
  labEl.textContent = label;
  row.appendChild(labEl);
  return row;
}

function renderStatsSidebar(
  gs: GameState,
  myIdx: number,
  oppIdx: number,
  spectatorCount: number,
): HTMLElement {
  const sidebar = el('div', 'stats-sidebar');
  const isMyTurn = gs.activePlayerIndex === myIdx;
  renderHelpMarker('stats', sidebar);

  // Opponent stats (top) — LP → Hand → Deck → GY → last card
  const oppBlock = el('div', 'stats-block opponent');
  renderHelpMarker('lp', oppBlock);
  const oppLp = getLifepoints(gs, oppIdx);
  oppBlock.appendChild(makeStatsRow(String(oppLp), 'LP'));
  const oppPs = gs.players[oppIdx];
  const oppHandCount = oppPs?.handCount ?? oppPs?.hand.length ?? 0;
  oppBlock.appendChild(makeStatsRow(String(oppHandCount).padStart(2, '0'), 'Hand'));
  const oppDeckCount = oppPs?.drawpileCount ?? oppPs?.drawpile.length ?? 0;
  oppBlock.appendChild(makeStatsRow(String(oppDeckCount).padStart(2, '0'), 'Deck'));
  const oppGy = oppPs?.discardPile.length ?? 0;
  oppBlock.appendChild(makeStatsRow(String(oppGy).padStart(2, '0'), 'GY'));
  const oppLastCard = oppPs?.discardPile.at(-1);
  if (oppLastCard) {
    oppBlock.appendChild(makeCardStatsRow(oppLastCard, 'last'));
  }
  sidebar.appendChild(oppBlock);

  // Divider
  sidebar.appendChild(document.createElement('hr')).className = 'stats-divider';

  // Turn indicator (center)
  const turnEl = el('div', 'stats-turn-number');
  turnEl.textContent = `T${gs.turnNumber}`;
  sidebar.appendChild(turnEl);

  const turnLabel = el('div', 'stats-turn');
  turnLabel.textContent = isMyTurn ? 'YOUR TURN' : 'OPP';
  turnLabel.classList.add(isMyTurn ? 'my-turn' : 'opp-turn');
  sidebar.appendChild(turnLabel);

  if (spectatorCount > 0) {
    const spectatorEl = el('div', 'spectator-count');
    spectatorEl.textContent = `${spectatorCount} watching`;
    sidebar.appendChild(spectatorEl);
  }

  // Divider
  sidebar.appendChild(document.createElement('hr')).className = 'stats-divider';

  // My stats (bottom, mirrored) — last card → GY → Deck → Hand → LP
  const myBlock = el('div', 'stats-block mine');
  renderHelpMarker('lp', myBlock);
  const myPs = gs.players[myIdx];
  const myLastCard = myPs?.discardPile.at(-1);
  if (myLastCard) {
    myBlock.appendChild(makeCardStatsRow(myLastCard, 'last'));
  }
  const myGy = myPs?.discardPile.length ?? 0;
  myBlock.appendChild(makeStatsRow(String(myGy).padStart(2, '0'), 'GY'));
  const myDeckCount = myPs?.drawpile.length ?? 0;
  myBlock.appendChild(makeStatsRow(String(myDeckCount).padStart(2, '0'), 'Deck'));
  const myHandCount = myPs?.hand.length ?? 0;
  myBlock.appendChild(makeStatsRow(String(myHandCount).padStart(2, '0'), 'Hand'));
  const myLp = getLifepoints(gs, myIdx);
  myBlock.appendChild(makeStatsRow(String(myLp), 'LP'));
  sidebar.appendChild(myBlock);

  // Health badge at bottom of sidebar
  sidebar.appendChild(document.createElement('hr')).className = 'stats-divider';
  sidebar.appendChild(renderHealthBadge(getState().serverHealth));

  return sidebar;
}

const BONUS_LABELS: Record<string, string> = {
  aceInvulnerable: 'Ace invulnerable',
  aceVsAce: 'Ace vs Ace',
  diamondDoubleDefense: 'Diamond ×2 def',
  clubDoubleOverflow: 'Club ×2 overflow',
  spadeDoubleLp: 'Spade ×2 LP',
  heartDeathShield: 'Heart Shield',
};

function renderBattleLog(gs: GameState): HTMLElement {
  const section = el('div', 'battle-log-section');
  const label = el('div', 'section-label');
  label.textContent = 'Battle Log';
  section.appendChild(label);
  renderHelpMarker('log', section);

  const logDiv = el('div', 'battle-log');
  const entries: CombatLogEntry[] = (gs.transactionLog ?? [])
    .filter((e) => e.details.type === 'attack')
    .map((e) => (e.details as { type: 'attack'; combat: CombatLogEntry }).combat);
  const recent = entries.slice(-8);

  for (const entry of recent) {
    const entryEl = el('div', 'log-entry');
    const atkLabel = cardLabel(entry.attackerCard);
    const parts: string[] = [`T${entry.turnNumber}: ${atkLabel} -> Col ${entry.targetColumn + 1}:`];

    for (const step of entry.steps) {
      if (step.target === 'playerLp') {
        let text = `LP ${step.lpBefore ?? '?'}\u2192${step.lpAfter ?? '?'} (-${step.damage})`;
        const bonusText = (step.bonuses ?? []).map((b) => BONUS_LABELS[b] ?? b).join(', ');
        if (bonusText) text += ` (${bonusText})`;
        parts.push(text);
      } else {
        const pos = step.target === 'frontCard' ? 'F' : 'B';
        const stepCard = step.card ? cardLabel(step.card) : '?';
        let text = `${stepCard} [${pos} ${step.hpBefore ?? '?'}\u2192${step.hpAfter ?? '?'}`;
        if (step.destroyed) text += ' KO';
        text += ']';
        const bonusText = (step.bonuses ?? []).map((b) => BONUS_LABELS[b] ?? b).join(', ');
        if (bonusText) text += ` (${bonusText})`;
        parts.push(text);
      }
    }

    entryEl.textContent = parts.join(' ');
    logDiv.appendChild(entryEl);
  }

  section.appendChild(logDiv);
  return section;
}

export function el(tag: string, className: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}
