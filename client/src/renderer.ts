import type { GridPosition, GameState, Card, CombatLogEntry } from '@phalanx/shared';
import type { AppState } from './state';
import type { Connection } from './connection';
import { cardLabel, hpDisplay, suitColor, suitSymbol, isWeapon } from './cards';
import { selectAttacker, clearSelection, resetToLobby, getState } from './state';

let connection: Connection | null = null;

export function setConnection(conn: Connection): void {
  connection = conn;
}

export function render(state: AppState): void {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';

  switch (state.screen) {
    case 'lobby':
      renderLobby(app);
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

  if (state.error) {
    renderError(app, state.error);
  }
}

function renderLobby(container: HTMLElement): void {
  const wrapper = el('div', 'lobby');

  const title = el('h1', 'title');
  title.textContent = 'Phalanx';
  wrapper.appendChild(title);

  const subtitle = el('p', 'subtitle');
  subtitle.textContent = 'Head-to-head combat card game';
  wrapper.appendChild(subtitle);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Your name';
  nameInput.className = 'name-input';
  nameInput.maxLength = 50;
  wrapper.appendChild(nameInput);

  const btnRow = el('div', 'btn-row');

  const createBtn = el('button', 'btn btn-primary');
  createBtn.textContent = 'Create Match';
  createBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    connection?.send({ type: 'createMatch', playerName: name });
  });
  btnRow.appendChild(createBtn);
  wrapper.appendChild(btnRow);

  const joinRow = el('div', 'join-row');
  const matchInput = document.createElement('input');
  matchInput.type = 'text';
  matchInput.placeholder = 'Match ID';
  matchInput.className = 'match-input';

  // Pre-fill match ID from URL ?match= parameter
  const urlMatch = new URLSearchParams(window.location.search).get('match');
  if (urlMatch) {
    matchInput.value = urlMatch;
  }

  joinRow.appendChild(matchInput);

  const joinBtn = el('button', 'btn btn-secondary');
  joinBtn.textContent = 'Join Match';
  joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const matchId = matchInput.value.trim();
    if (!name || !matchId) return;
    connection?.send({ type: 'joinMatch', matchId, playerName: name });
  });
  joinRow.appendChild(joinBtn);
  wrapper.appendChild(joinRow);

  container.appendChild(wrapper);
}

function renderWaiting(container: HTMLElement, state: AppState): void {
  const wrapper = el('div', 'waiting');

  const title = el('h2', 'title');
  title.textContent = 'Waiting for Opponent';
  wrapper.appendChild(title);

  const info = el('p', 'match-info');
  info.textContent = 'Share this Match ID:';
  wrapper.appendChild(info);

  const idDisplay = el('div', 'match-id-display');
  const idText = el('code', 'match-id');
  idText.textContent = state.matchId ?? '';
  idDisplay.appendChild(idText);

  const copyBtn = el('button', 'btn btn-small');
  copyBtn.textContent = 'Copy Code';
  copyBtn.addEventListener('click', () => {
    if (state.matchId) {
      void navigator.clipboard.writeText(state.matchId);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy Code'; }, 2000);
    }
  });
  idDisplay.appendChild(copyBtn);

  const copyLinkBtn = el('button', 'btn btn-small');
  copyLinkBtn.textContent = 'Copy Link';
  copyLinkBtn.addEventListener('click', () => {
    if (state.matchId) {
      const url = new URL(window.location.href);
      url.searchParams.set('match', state.matchId);
      void navigator.clipboard.writeText(url.toString());
      copyLinkBtn.textContent = 'Copied!';
      setTimeout(() => { copyLinkBtn.textContent = 'Copy Link'; }, 2000);
    }
  });
  idDisplay.appendChild(copyLinkBtn);
  wrapper.appendChild(idDisplay);

  container.appendChild(wrapper);
}

function renderGame(container: HTMLElement, state: AppState): void {
  if (!state.gameState || state.playerIndex === null) return;

  const gs = state.gameState;
  const myIdx = state.playerIndex;
  const oppIdx = myIdx === 0 ? 1 : 0;

  const layout = el('div', 'game-layout');
  const main = el('div', 'game-main');
  const wrapper = el('div', 'game');

  // Opponent battlefield (top, mirrored)
  const oppSection = el('div', 'battlefield-section opponent');
  const oppLabel = el('div', 'section-label');
  oppLabel.textContent = `${gs.players[oppIdx]?.player.name ?? 'Opponent'}`;
  oppSection.appendChild(oppLabel);
  oppSection.appendChild(renderBattlefield(gs, oppIdx, state, true));
  wrapper.appendChild(oppSection);

  // Info bar
  const infoBar = el('div', 'info-bar');
  const phaseText = el('span', 'phase');
  const phaseLabel = gs.phase === 'reinforcement'
    ? `Reinforce col ${(gs.reinforcement?.column ?? 0) + 1}`
    : gs.phase;
  phaseText.textContent = `Phase: ${phaseLabel} | Turn: ${gs.turnNumber}`;
  infoBar.appendChild(phaseText);

  const turnText = el('span', 'turn-indicator');
  const isMyTurn = gs.activePlayerIndex === myIdx;
  if (gs.phase === 'reinforcement') {
    turnText.textContent = isMyTurn ? 'Reinforce your column' : 'Opponent reinforcing';
  } else {
    turnText.textContent = isMyTurn ? 'Your turn' : "Opponent's turn";
  }
  turnText.classList.add(isMyTurn ? 'my-turn' : 'opp-turn');
  infoBar.appendChild(turnText);

  if (gs.phase === 'combat' && isMyTurn && state.selectedAttacker) {
    const cancelBtn = el('button', 'btn btn-small');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', clearSelection);
    infoBar.appendChild(cancelBtn);
  }

  if (gs.phase === 'combat' && isMyTurn) {
    const passBtn = el('button', 'btn btn-small');
    passBtn.textContent = 'Pass';
    passBtn.addEventListener('click', () => {
      if (!state.matchId) return;
      connection?.send({
        type: 'action',
        matchId: state.matchId,
        action: { type: 'pass', playerIndex: myIdx },
      });
    });
    infoBar.appendChild(passBtn);
  }

  if ((gs.phase === 'combat' || gs.phase === 'reinforcement') && isMyTurn) {
    const forfeitBtn = el('button', 'btn btn-small btn-forfeit');
    forfeitBtn.textContent = 'Forfeit';
    forfeitBtn.addEventListener('click', () => {
      if (!state.matchId) return;
      if (!confirm('Are you sure you want to forfeit?')) return;
      connection?.send({
        type: 'action',
        matchId: state.matchId,
        action: { type: 'forfeit', playerIndex: myIdx },
      });
    });
    infoBar.appendChild(forfeitBtn);
  }

  wrapper.appendChild(infoBar);

  // My battlefield (bottom)
  const mySection = el('div', 'battlefield-section mine');
  const myLabel = el('div', 'section-label');
  myLabel.textContent = `${gs.players[myIdx]?.player.name ?? 'You'}`;
  mySection.appendChild(myLabel);
  mySection.appendChild(renderBattlefield(gs, myIdx, state, false));
  wrapper.appendChild(mySection);

  // Column selector (between battlefield and hand)
  if (gs.players[myIdx]) {
    const colSelector = renderColumnSelector(gs, state);
    if (colSelector) {
      wrapper.appendChild(colSelector);
    }
  }

  // Hand
  if (gs.players[myIdx]) {
    wrapper.appendChild(renderHand(gs, state));
  }

  // Battle log
  const hasAttacks = (gs.transactionLog ?? []).some(e => e.details.type === 'attack');
  if (hasAttacks) {
    wrapper.appendChild(renderBattleLog(gs));
  }

  main.appendChild(wrapper);
  layout.appendChild(main);
  layout.appendChild(renderStatsSidebar(gs, myIdx, oppIdx));
  container.appendChild(layout);
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

      // Highlight reinforcement column on my battlefield
      const isReinforcementCol = !isOpponent && gs.phase === 'reinforcement'
        && gs.reinforcement && col === gs.reinforcement.column;
      if (isReinforcementCol) {
        cell.classList.add('reinforce-col');
      }

      if (bCard) {
        cell.classList.add('occupied');
        cell.style.borderColor = suitColor(bCard.card.suit);

        const rankEl = el('div', 'card-rank');
        rankEl.textContent = bCard.card.rank;
        rankEl.style.color = suitColor(bCard.card.suit);
        cell.appendChild(rankEl);

        const suitEl = el('div', 'card-suit');
        suitEl.textContent = suitSymbol(bCard.card.suit);
        suitEl.style.color = suitColor(bCard.card.suit);
        cell.appendChild(suitEl);

        const hpEl = el('div', 'card-hp');
        hpEl.textContent = hpDisplay(bCard);
        cell.appendChild(hpEl);

        const typeEl = el('div', 'card-type');
        typeEl.textContent = isWeapon(bCard.card.suit) ? 'ATK' : 'DEF';
        cell.appendChild(typeEl);

        // Click handlers
        if (isOpponent && state.selectedAttacker && gs.activePlayerIndex === state.playerIndex) {
          // Clicking opponent card = target
          cell.classList.add('valid-target');
          cell.addEventListener('click', () => {
            sendAttack(state, pos);
          });
        } else if (!isOpponent && gs.phase === 'combat' && gs.activePlayerIndex === state.playerIndex) {
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

        // During deployment, clicking empty slot deploys selected hand card
        if (!isOpponent && gs.phase === 'deployment' && gs.activePlayerIndex === state.playerIndex) {
          const selectedHandIdx = getState().selectedAttacker;
          if (selectedHandIdx) {
            cell.classList.add('deploy-target');
          }
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

  const handDiv = el('div', 'hand');
  const myIdx = state.playerIndex ?? 0;
  const hand = gs.players[myIdx]?.hand ?? [];
  const isMyTurn = gs.activePlayerIndex === myIdx;

  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    if (!card) continue;

    const cardEl = el('div', 'hand-card');
    cardEl.style.borderColor = suitColor(card.suit);

    const labelEl = el('div', 'hand-card-label');
    labelEl.textContent = cardLabel(card);
    labelEl.style.color = suitColor(card.suit);
    cardEl.appendChild(labelEl);

    if (gs.phase === 'deployment' && isMyTurn) {
      cardEl.classList.add('playable');
      cardEl.addEventListener('click', () => {
        // Select this card, then clicking an empty battlefield slot deploys it
        selectAttacker({ row: -1, col: i }); // Use row=-1 to indicate hand selection
      });

      // If this card is selected (row=-1 means hand card), listen for deploy target clicks
      if (state.selectedAttacker?.row === -1 && state.selectedAttacker?.col === i) {
        cardEl.classList.add('selected');
      }
    }

    if (gs.phase === 'reinforcement' && isMyTurn) {
      cardEl.classList.add('playable', 'reinforce-playable');
      cardEl.addEventListener('click', () => {
        if (!state.matchId) return;
        connection?.send({
          type: 'action',
          matchId: state.matchId,
          action: {
            type: 'reinforce',
            playerIndex: myIdx,
            card: { suit: card.suit, rank: card.rank },
          },
        });
      });
    }

    handDiv.appendChild(cardEl);
  }

  handSection.appendChild(handDiv);

  return handSection;
}

function renderColumnSelector(gs: GameState, state: AppState): HTMLElement | null {
  const myIdx = state.playerIndex ?? 0;
  const isMyTurn = gs.activePlayerIndex === myIdx;
  const hand = gs.players[myIdx]?.hand ?? [];

  if (!(gs.phase === 'deployment' && isMyTurn && state.selectedAttacker?.row === -1)) {
    return null;
  }

  const colSelector = el('div', 'column-selector');
  const colLabel = el('div', 'section-label');
  colLabel.textContent = 'Select a column to deploy:';
  colSelector.appendChild(colLabel);

  const colRow = el('div', 'column-buttons');
  const myBf = gs.players[myIdx]?.battlefield ?? [];

  for (let col = 0; col < 4; col++) {
    const frontOccupied = myBf[col] !== null;
    const backOccupied = myBf[col + 4] !== null;
    const isFull = frontOccupied && backOccupied;

    const colBtn = el('button', 'col-btn');
    const filledCount = (frontOccupied ? 1 : 0) + (backOccupied ? 1 : 0);
    colBtn.textContent = `Col ${col + 1}`;

    if (isFull) {
      colBtn.classList.add('col-full');
      colBtn.setAttribute('disabled', 'true');
    } else {
      colBtn.classList.add('col-available');
      const countEl = el('span', 'col-count');
      countEl.textContent = ` (${filledCount}/2)`;
      colBtn.appendChild(countEl);
      colBtn.addEventListener('click', () => {
        const handIdx = state.selectedAttacker?.col ?? 0;
        const selectedCard = hand[handIdx];
        if (!selectedCard || !state.matchId) return;
        connection?.send({
          type: 'action',
          matchId: state.matchId,
          action: {
            type: 'deploy',
            playerIndex: myIdx,
            card: { suit: selectedCard.suit, rank: selectedCard.rank },
            column: col,
          },
        });
      });
    }

    colRow.appendChild(colBtn);
  }
  colSelector.appendChild(colRow);

  return colSelector;
}

function sendAttack(state: AppState, targetPos: GridPosition): void {
  if (!state.selectedAttacker || !state.matchId || state.playerIndex === null) return;
  connection?.send({
    type: 'action',
    matchId: state.matchId,
    action: {
      type: 'attack',
      playerIndex: state.playerIndex,
      attackerPosition: state.selectedAttacker,
      targetPosition: targetPos,
    },
  });
}

function renderGameOver(container: HTMLElement, state: AppState): void {
  const wrapper = el('div', 'game-over');

  const title = el('h1', 'title');
  title.textContent = 'Game Over';
  wrapper.appendChild(title);

  if (state.gameState && state.playerIndex !== null) {
    const gs = state.gameState;
    const outcome = gs.outcome;

    const result = el('h2', 'result');
    if (outcome) {
      const iWin = outcome.winnerIndex === state.playerIndex;
      result.textContent = iWin ? 'You Win!' : 'You Lose';
      result.classList.add(iWin ? 'win' : 'lose');
    } else {
      result.textContent = 'Game Over';
    }
    wrapper.appendChild(result);

    if (outcome) {
      const victoryLabels: Record<string, string> = {
        lpDepletion: 'LP Depletion',
        cardDepletion: 'Card Depletion',
        forfeit: 'Forfeit',
      };
      const detail = el('p', 'lp-summary');
      detail.textContent = `${victoryLabels[outcome.victoryType] ?? outcome.victoryType} on turn ${outcome.turnNumber}`;
      wrapper.appendChild(detail);
    }

    const lpSummary = el('p', 'lp-summary');
    const myLp = getLifepoints(gs, state.playerIndex);
    const oppIdx = state.playerIndex === 0 ? 1 : 0;
    const oppLp = getLifepoints(gs, oppIdx);
    lpSummary.textContent = `Your LP: ${myLp} | Opponent LP: ${oppLp}`;
    wrapper.appendChild(lpSummary);
  }

  const playAgainBtn = el('button', 'btn btn-primary');
  playAgainBtn.textContent = 'Play Again';
  playAgainBtn.addEventListener('click', resetToLobby);
  wrapper.appendChild(playAgainBtn);

  container.appendChild(wrapper);
}

function renderError(container: HTMLElement, message: string): void {
  const errorDiv = el('div', 'error-banner');
  errorDiv.textContent = message;
  container.appendChild(errorDiv);
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

function renderStatsSidebar(gs: GameState, myIdx: number, oppIdx: number): HTMLElement {
  const sidebar = el('div', 'stats-sidebar');
  const isMyTurn = gs.activePlayerIndex === myIdx;

  // Opponent stats (top) — LP → GY → last card
  const oppBlock = el('div', 'stats-block opponent');
  const oppLp = getLifepoints(gs, oppIdx);
  oppBlock.appendChild(makeStatsRow(String(oppLp), 'LP'));
  const oppGy = gs.players[oppIdx]?.discardPile.length ?? 0;
  oppBlock.appendChild(makeStatsRow(String(oppGy).padStart(2, '0'), 'GY'));
  const oppLastCard = gs.players[oppIdx]?.discardPile.at(-1);
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

  // Divider
  sidebar.appendChild(document.createElement('hr')).className = 'stats-divider';

  // My stats (bottom, mirrored) — last card → GY → LP
  const myBlock = el('div', 'stats-block mine');
  const myLastCard = gs.players[myIdx]?.discardPile.at(-1);
  if (myLastCard) {
    myBlock.appendChild(makeCardStatsRow(myLastCard, 'last'));
  }
  const myGy = gs.players[myIdx]?.discardPile.length ?? 0;
  myBlock.appendChild(makeStatsRow(String(myGy).padStart(2, '0'), 'GY'));
  const myLp = getLifepoints(gs, myIdx);
  myBlock.appendChild(makeStatsRow(String(myLp), 'LP'));
  sidebar.appendChild(myBlock);

  return sidebar;
}

const BONUS_LABELS: Record<string, string> = {
  aceInvulnerable: 'Ace invulnerable',
  aceVsAce: 'Ace vs Ace',
  diamondDoubleDefense: 'Diamond ×2 def',
  clubDoubleOverflow: 'Club ×2 overflow',
  spadeDoubleLp: 'Spade ×2 LP',
  heartHalveLp: 'Heart ÷2 LP',
};

function renderBattleLog(gs: GameState): HTMLElement {
  const section = el('div', 'battle-log-section');
  const label = el('div', 'section-label');
  label.textContent = 'Battle Log';
  section.appendChild(label);

  const logDiv = el('div', 'battle-log');
  const entries: CombatLogEntry[] = (gs.transactionLog ?? [])
    .filter(e => e.details.type === 'attack')
    .map(e => (e.details as { type: 'attack'; combat: CombatLogEntry }).combat);
  const recent = entries.slice(-8);

  for (const entry of recent) {
    const entryEl = el('div', 'log-entry');
    const atkLabel = cardLabel(entry.attackerCard);
    const parts: string[] = [`T${entry.turnNumber}: ${atkLabel} -> Col ${entry.targetColumn + 1}:`];

    for (const step of entry.steps) {
      if (step.target === 'playerLp') {
        let text = `LP ${step.lpBefore ?? '?'}\u2192${step.lpAfter ?? '?'} (-${step.damage})`;
        const bonusText = (step.bonuses ?? []).map(b => BONUS_LABELS[b] ?? b).join(', ');
        if (bonusText) text += ` (${bonusText})`;
        parts.push(text);
      } else {
        const pos = step.target === 'frontCard' ? 'F' : 'B';
        const stepCard = step.card ? cardLabel(step.card) : '?';
        let text = `${stepCard} [${pos} ${step.hpBefore ?? '?'}\u2192${step.hpAfter ?? '?'}`;
        if (step.destroyed) text += ' KO';
        text += ']';
        const bonusText = (step.bonuses ?? []).map(b => BONUS_LABELS[b] ?? b).join(', ');
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

function el(tag: string, className: string): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}
