import type {
  GridPosition,
  GameState,
  Card,
  CombatLogEntry,
  BattlefieldCard,
} from '@phalanxduel/shared';
import type { AppState } from './state';
import { selectAttacker, selectDeployCard, clearSelection, getState, toggleHelp } from './state';
import { el, makeCopyBtn, getConnection, renderHealthBadge } from './renderer';
import { renderHelpMarker } from './help';
import { cardLabel, hpDisplay, suitColor, suitSymbol, isWeapon, isFace } from './cards';
import { applySuitAura } from './card-utils';

export function getPhaseLabel(gs: GameState): string {
  if (gs.phase === 'ReinforcementPhase') {
    return `Reinforce col ${(gs.reinforcement?.column ?? 0) + 1}`;
  } else if (gs.phase === 'DeploymentPhase') {
    return 'Deployment';
  }
  return gs.phase as string;
}

export function getTurnIndicatorText(
  gs: GameState,
  isSpectator: boolean,
  myIdx: number,
): { text: string; isMyTurn: boolean } {
  const isMyTurn = gs.activePlayerIndex === myIdx;
  if (isSpectator) {
    const activeName =
      gs.players[gs.activePlayerIndex]?.player.name ?? `Player ${gs.activePlayerIndex + 1}`;
    return { text: `${activeName}'s turn`, isMyTurn: false };
  } else if (gs.phase === 'ReinforcementPhase') {
    return {
      text: isMyTurn ? 'Reinforce your column' : 'Opponent reinforcing',
      isMyTurn,
    };
  }
  return {
    text: isMyTurn ? 'Your turn' : "Opponent's turn",
    isMyTurn,
  };
}

export interface ActionButtonDescriptor {
  label: string;
  testId?: string;
  className?: string;
}

export interface ActionButtonParams {
  gs: GameState;
  isSpectator: boolean;
  myIdx: number;
  selectedAttacker: GridPosition | null;
  showHelp: boolean;
}

export function getActionButtons(params: ActionButtonParams): ActionButtonDescriptor[] {
  const { gs, isSpectator, myIdx, selectedAttacker, showHelp } = params;
  const buttons: ActionButtonDescriptor[] = [];
  const isMyTurn = gs.activePlayerIndex === myIdx;

  if (!isSpectator && gs.phase === 'AttackPhase' && isMyTurn && selectedAttacker) {
    buttons.push({ label: 'Cancel', testId: 'combat-cancel-btn' });
  }

  if (!isSpectator && gs.phase === 'AttackPhase' && isMyTurn) {
    buttons.push({ label: 'Pass', testId: 'combat-pass-btn' });
  }

  if (!isSpectator && gs.phase === 'ReinforcementPhase' && isMyTurn) {
    buttons.push({
      label: 'Skip',
      testId: 'combat-skip-reinforce-btn',
      className: 'btn-skip',
    });
  }

  if (
    !isSpectator &&
    (gs.phase === 'AttackPhase' || gs.phase === 'ReinforcementPhase') &&
    isMyTurn
  ) {
    buttons.push({ label: 'Forfeit', testId: 'combat-forfeit-btn', className: 'btn-forfeit' });
  }

  buttons.push({ label: showHelp ? 'Exit Help' : 'Help ?', className: 'help-btn' });

  return buttons;
}

export function createBattlefieldCell(
  bCard: BattlefieldCard | null | undefined,
  pos: GridPosition,
  isOpponent: boolean,
  gs: GameState,
): HTMLElement {
  const cell = el('div', 'bf-cell');
  cell.setAttribute(
    'data-testid',
    `${isOpponent ? 'opponent' : 'player'}-cell-r${pos.row}-c${pos.col}`,
  );

  if (bCard) {
    cell.classList.add('occupied');
    if (isFace(bCard.card)) cell.classList.add('is-face');
    cell.style.borderColor = suitColor(bCard.card.suit);

    applySuitAura(cell, bCard.card.suit);

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
  } else {
    cell.classList.add('empty');
  }

  return cell;
}

export interface CellInteractionParams {
  cell: HTMLElement;
  bCard: BattlefieldCard | null | undefined;
  pos: GridPosition;
  gs: GameState;
  state: AppState;
  isOpponent: boolean;
}

export function attachCellInteraction(params: CellInteractionParams): void {
  const { cell, bCard, pos, gs, state, isOpponent } = params;
  if (bCard) {
    // Click handlers for occupied cells
    if (
      isOpponent &&
      state.selectedAttacker &&
      gs.activePlayerIndex === state.playerIndex &&
      pos.col === state.selectedAttacker.col
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
      if (pos.row === 0 && isWeapon(bCard.card.suit)) {
        cell.classList.add('pz-active-pulse');
      }

      // Clicking my card = select attacker
      if (
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        state.selectedAttacker &&
        state.selectedAttacker.row === pos.row &&
        state.selectedAttacker.col === pos.col
      ) {
        cell.classList.add('selected');
      }
      cell.addEventListener('click', () => {
        selectAttacker(pos);
      });
    }
  } else {
    // Click handlers for empty cells

    // GHOST TARGETING: If I have an attacker selected, highlight empty cells in that column
    if (isOpponent && pos.col === state.selectedAttacker?.col) {
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
        getConnection()?.send({
          type: 'action',
          matchId: state.matchId,
          action: {
            type: 'deploy',
            playerIndex: state.playerIndex,
            column: pos.col,
            cardId: state.selectedDeployCard ?? '',
            timestamp: new Date().toISOString(),
          },
        });
      });
    }
  }
}

function sendAttack(state: AppState, targetPos: GridPosition): void {
  if (!state.selectedAttacker || !state.matchId || state.playerIndex === null) return;
  getConnection()?.send({
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

const BONUS_LABELS: Record<string, string> = {
  aceInvulnerable: 'Ace invulnerable',
  aceVsAce: 'Ace vs Ace',
  diamondDoubleDefense: 'Diamond \u00d72 def',
  clubDoubleOverflow: 'Club \u00d72 overflow',
  spadeDoubleLp: 'Spade \u00d72 LP',
  heartDeathShield: 'Heart Shield',
};

export function renderBattlefield(
  gs: GameState,
  playerIdx: number,
  state: AppState,
  isOpponent: boolean,
): HTMLElement {
  const grid = el('div', 'battlefield');
  const battlefield = gs.players[playerIdx]?.battlefield;
  if (!battlefield) return grid;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const rows = gs.params?.rows ?? 2;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const columns = gs.params?.columns ?? 4;
  grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

  // Render rows: for opponent, show back row first then front row so front faces center
  // For self, show front row first then back row
  const rowOrder = isOpponent
    ? Array.from({ length: rows }, (_, i) => rows - 1 - i)
    : Array.from({ length: rows }, (_, i) => i);

  for (const row of rowOrder) {
    for (let col = 0; col < columns; col++) {
      const gridIdx = row * columns + col;
      const bCard = battlefield[gridIdx];
      const pos: GridPosition = { row, col };

      const cell = createBattlefieldCell(bCard, pos, isOpponent, gs);

      // Highlight reinforcement column on my battlefield
      const isReinforcementCol =
        !isOpponent && gs.phase === 'ReinforcementPhase' && col === gs.reinforcement?.column;
      if (isReinforcementCol) {
        cell.classList.add('reinforce-col');
        if (state.selectedDeployCard) {
          cell.classList.add('valid-target');
          cell.addEventListener('click', () => {
            if (!state.matchId || state.playerIndex === null) return;
            getConnection()?.send({
              type: 'action',
              matchId: state.matchId,
              action: {
                type: 'reinforce',
                playerIndex: state.playerIndex,
                cardId: state.selectedDeployCard ?? '',
                timestamp: new Date().toISOString(),
              },
            });
          });
        }
      }

      attachCellInteraction({ cell, bCard, pos, gs, state, isOpponent });
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

    applySuitAura(cardEl, card.suit);

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

export function renderStatsBlock(gs: GameState, playerIdx: number, isMine: boolean): HTMLElement {
  const ps = gs.players[playerIdx];
  const block = el('div', `stats-block ${isMine ? 'mine' : 'opponent'}`);
  renderHelpMarker('lp', block);

  const lp = getLifepoints(gs, playerIdx);
  const handCount = ps?.handCount ?? ps?.hand.length ?? 0;
  const deckCount = ps?.drawpileCount ?? ps?.drawpile.length ?? 0;
  const gyCount = ps?.discardPileCount ?? ps?.discardPile.length ?? 0;
  const lastCard = ps?.discardPile.at(-1);

  const stats = [
    { label: 'LP', value: String(lp) },
    { label: 'Hand', value: String(handCount).padStart(2, '0') },
    { label: 'Deck', value: String(deckCount).padStart(2, '0') },
    { label: 'GY', value: String(gyCount).padStart(2, '0') },
  ];

  const passState = gs.passState;
  const consecutive = passState?.consecutivePasses[playerIdx] ?? 0;
  const total = passState?.totalPasses[playerIdx] ?? 0;

  if (consecutive > 0 || total > 0) {
    stats.push({ label: 'Pass', value: `${consecutive}/${total}` });
  }

  if (isMine) {
    if (consecutive >= 2 || total >= 4) {
      const warning = el('div', 'pass-warning-badge');
      warning.textContent = 'FORFEIT RISK';
      warning.title = 'You are 1 pass away from automatic forfeit (3 consecutive or 5 total)';
      block.appendChild(warning);
    }
    if (lastCard) block.appendChild(makeCardStatsRow(lastCard, 'last'));
    stats.reverse().forEach((s) => block.appendChild(makeStatsRow(s.value, s.label)));
  } else {
    stats.forEach((s) => block.appendChild(makeStatsRow(s.value, s.label)));
    if (lastCard) block.appendChild(makeCardStatsRow(lastCard, 'last'));
  }

  return block;
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

  sidebar.appendChild(renderStatsBlock(gs, oppIdx, false));
  sidebar.appendChild(document.createElement('hr')).className = 'stats-divider';

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

  sidebar.appendChild(document.createElement('hr')).className = 'stats-divider';
  sidebar.appendChild(renderStatsBlock(gs, myIdx, true));
  sidebar.appendChild(document.createElement('hr')).className = 'stats-divider';
  sidebar.appendChild(renderHealthBadge(getState().serverHealth));

  return sidebar;
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

export function renderGame(container: HTMLElement, state: AppState): void {
  if (!state.gameState) return;
  if (!state.isSpectator && state.playerIndex === null) return;

  const gs = state.gameState;
  const isSpectator = state.isSpectator;
  const myIdx = isSpectator ? 0 : (state.playerIndex ?? 0);
  const oppIdx = myIdx === 0 ? 1 : 0;

  const layout = el('div', 'game-layout');
  layout.setAttribute('data-testid', 'game-layout');

  const main = el('div', 'game-main');
  const wrapper = el('div', 'game');

  // Opponent battlefield (top, mirrored)
  const oppSection = el('div', 'battlefield-section opponent');
  const oppLabel = el('div', 'section-label');
  oppLabel.textContent = gs.players[oppIdx]?.player.name ?? 'Opponent';
  oppSection.appendChild(oppLabel);
  oppSection.appendChild(renderBattlefield(gs, oppIdx, state, true));
  if (!isSpectator) renderHelpMarker('battlefield', oppSection);
  wrapper.appendChild(oppSection);

  // Info bar
  const infoBar = el('div', 'info-bar');
  const phaseText = el('span', 'phase');
  const phaseLabel = getPhaseLabel(gs);
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
  const turnInfo = getTurnIndicatorText(gs, isSpectator, myIdx);
  turnText.textContent = turnInfo.text;
  turnText.classList.add(turnInfo.isMyTurn ? 'my-turn' : 'opp-turn');
  infoBar.appendChild(turnText);

  const actionButtons = getActionButtons({
    gs,
    isSpectator,
    myIdx,
    selectedAttacker: state.selectedAttacker,
    showHelp: state.showHelp,
  });
  for (const btn of actionButtons) {
    const btnEl = el('button', `btn btn-small${btn.className ? ` ${btn.className}` : ''}`);
    btnEl.textContent = btn.label;
    if (btn.testId) btnEl.setAttribute('data-testid', btn.testId);
    if (btn.label === 'Cancel') {
      btnEl.addEventListener('click', clearSelection);
    } else if (btn.label === 'Pass') {
      btnEl.addEventListener('click', () => {
        if (!state.matchId) return;

        const passState = gs.passState;
        const maxConsecutive = gs.params.modePassRules.maxConsecutivePasses;
        const maxTotal = gs.params.modePassRules.maxTotalPassesPerPlayer;
        const consecutive = passState?.consecutivePasses[myIdx] ?? 0;
        const total = passState?.totalPasses[myIdx] ?? 0;
        if (consecutive >= maxConsecutive - 1 || total >= maxTotal - 1) {
          const msg =
            consecutive >= maxConsecutive - 1
              ? `This will be your ${maxConsecutive}th consecutive pass. You will FORFEIT the match. Continue?`
              : `This will be your ${maxTotal}th total pass. You will FORFEIT the match. Continue?`;
          if (!confirm(msg)) return;
        }

        getConnection()?.send({
          type: 'action',
          matchId: state.matchId,
          action: {
            type: 'pass',
            playerIndex: myIdx,
            timestamp: new Date().toISOString(),
          },
        });
      });
    } else if (btn.label === 'Skip') {
      btnEl.addEventListener('click', () => {
        if (!state.matchId) return;
        getConnection()?.send({
          type: 'action',
          matchId: state.matchId,
          action: {
            type: 'pass',
            playerIndex: myIdx,
            timestamp: new Date().toISOString(),
          },
        });
      });
      btnEl.title = 'Skipping reinforcement is free (does not count toward pass limits)';
    } else if (btn.label === 'Forfeit') {
      btnEl.addEventListener('click', () => {
        if (!state.matchId) return;
        if (!confirm('Are you sure you want to forfeit?')) return;
        getConnection()?.send({
          type: 'action',
          matchId: state.matchId,
          action: {
            type: 'forfeit',
            playerIndex: myIdx,
            timestamp: new Date().toISOString(),
          },
        });
      });
    } else if (btn.label === 'Help ?' || btn.label === 'Exit Help') {
      btnEl.addEventListener('click', toggleHelp);
    }
    infoBar.appendChild(btnEl);
  }

  wrapper.appendChild(infoBar);

  // My battlefield (bottom)
  const mySection = el('div', 'battlefield-section mine');
  const myLabel = el('div', 'section-label');
  myLabel.textContent = gs.players[myIdx]?.player.name ?? 'You';
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
