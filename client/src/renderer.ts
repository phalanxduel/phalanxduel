import type { GridPosition, GameState, Card, CombatLogEntry } from '@phalanxduel/shared';
import posthog from 'posthog-js';
import type { AppState, Screen, ServerHealth } from './state';
import type { Connection } from './connection';
import { cardLabel, hpDisplay, suitColor, suitSymbol, isWeapon } from './cards';
import { selectAttacker, clearSelection, resetToLobby, getState, setPlayerName, setDamageMode, toggleHelp } from './state';
import type { DamageMode } from '@phalanxduel/shared';

let connection: Connection | null = null;

export function setConnection(conn: Connection): void {
  connection = conn;
}

function seedFromUrl(): number | undefined {
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null) return undefined;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) return undefined;
  return parsed;
}

let lastScreen: Screen | null = null;
let lastStateHash: string | null = null;

export function render(state: AppState): void {
  const app = document.getElementById('app');
  if (!app) return;

  const currentStateHash = state.gameState?.stateHashAfter ?? null;
  const screenChanged = state.screen !== lastScreen;
  const gameChanged = currentStateHash !== lastStateHash;
  const errorChanged = !!state.error; // Always re-render on error for visibility

  // Only perform a full re-render if the screen or game logic state actually changed.
  // This prevents 'pulsing' (re-triggering animations) on health or spectator count updates.
  if (screenChanged || gameChanged || errorChanged) {
    app.innerHTML = '';
    lastScreen = state.screen;
    lastStateHash = currentStateHash;

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
          pageTitle = isMyTurn ? '\u25B6 YOUR TURN | Phalanx Duel' : 'Opponent\u2019s Turn | Phalanx Duel';
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

function updateHealthBadges(health: ServerHealth | null): void {
  const badges = document.querySelectorAll('.health-badge');
  badges.forEach(oldBadge => {
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

function renderLobby(container: HTMLElement): void {
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
  nameInput.placeholder = 'Your name';
  nameInput.className = 'name-input';
  nameInput.maxLength = 50;
  nameInput.setAttribute('data-testid', 'lobby-name-input');
  nameInput.value = getState().playerName ?? '';
  nameInput.addEventListener('input', () => {
    setPlayerName(nameInput.value.trim());
  });
  wrapper.appendChild(nameInput);

  const optionsRow = el('div', 'game-options');
  const optLabel = el('label', 'options-label');
  optLabel.textContent = 'Damage Mode:';
  optionsRow.appendChild(optLabel);

  const modeSelect = document.createElement('select');
  modeSelect.className = 'mode-select';
  modeSelect.setAttribute('data-testid', 'lobby-damage-mode');
  const cumulOpt = document.createElement('option');
  cumulOpt.value = 'cumulative';
  cumulOpt.textContent = 'Cumulative — damage carries over';
  modeSelect.appendChild(cumulOpt);
  const perTurnOpt = document.createElement('option');
  perTurnOpt.value = 'per-turn';
  perTurnOpt.textContent = 'Per-Turn Reset — fresh each round';
  modeSelect.appendChild(perTurnOpt);
  modeSelect.value = getState().damageMode;
  modeSelect.addEventListener('change', () => {
    setDamageMode(modeSelect.value as DamageMode);
  });
  optionsRow.appendChild(modeSelect);
  wrapper.appendChild(optionsRow);

  const btnRow = el('div', 'btn-row');
  const createBtn = el('button', 'btn btn-primary');
  createBtn.textContent = 'Create Match';
  createBtn.setAttribute('data-testid', 'lobby-create-btn');
  createBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    setPlayerName(name);
    const damageMode = getState().damageMode;
    const rngSeed = seedFromUrl();
    const createMessage: {
      type: 'createMatch';
      playerName: string;
      gameOptions: { damageMode: DamageMode };
      rngSeed?: number;
    } = {
      type: 'createMatch',
      playerName: name,
      gameOptions: { damageMode },
    };
    if (rngSeed !== undefined) {
      createMessage.rngSeed = rngSeed;
    }
    
    // Track match creation intent in PostHog
    posthog.capture('match_create_clicked', { 
      playerName: name,
      damageMode
    });

    connection?.send(createMessage);
  });
  btnRow.appendChild(createBtn);
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
    if (!name || !matchId) return;
    setPlayerName(name);
    
    posthog.capture('lobby_join_clicked', { matchId });
    connection?.send({ type: 'joinMatch', matchId, playerName: name });
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
    
    posthog.capture('lobby_watch_clicked', { matchId });
    connection?.send({ type: 'watchMatch', matchId });
  });
  watchRow.appendChild(watchBtn);
  wrapper.appendChild(watchRow);

  // How to play — collapsible disclosure
  const helpToggle = el('button', 'help-toggle');
  helpToggle.textContent = 'How to play ▼';
  wrapper.appendChild(helpToggle);

  const helpPanel = el('div', 'help-panel');
  helpPanel.innerHTML = `
  <h3>Quick Start</h3>
  <ol>
    <li>Enter your name and click <strong>Create Match</strong></li>
    <li>Send the match code or link to your opponent — they join in any browser</li>
    <li>Both players secretly deploy 8 cards across 4 columns (front row + back row)</li>
    <li>Take turns attacking — damage cascades down each column, then hits LP</li>
  </ol>
  <h3>Victory</h3>
  <p>Drop your opponent to <strong>0 LP</strong>, or destroy every card they have. Each player starts at 20 LP. You can also forfeit at any time.</p>
  <h3>Card Values</h3>
  <p>A&thinsp;=&thinsp;1 &middot; 2–9&thinsp;=&thinsp;face &middot; T&thinsp;=&thinsp;10 &middot; J/Q/K&thinsp;=&thinsp;11</p>
  <h3>Suit Powers <span class="help-muted">(trigger automatically)</span></h3>
  <ul>
    <li><strong>♦ Diamonds</strong> — on death, raise a shield equal to card value; absorbs overflow before it reaches the next card</li>
    <li><strong>♥ Hearts</strong> — same death shield, but only activates when it's the last card standing in its column</li>
    <li><strong>♣ Clubs</strong> — overflow damage into the back card hits at <strong>×2</strong></li>
    <li><strong>♠ Spades</strong> — overflow damage into the opponent's LP hits at <strong>×2</strong></li>
  </ul>
  <h3>The Ace Rule</h3>
  <p><strong>Aces are unkillable</strong> — their HP never drops below 1. They deal only 1 damage. The one exception: an Ace attacking another Ace destroys it instantly.</p>
`;
  wrapper.appendChild(helpPanel);

  helpToggle.addEventListener('click', () => {
    const open = helpPanel.classList.toggle('is-open');
    helpToggle.textContent = open ? 'How to play ▲' : 'How to play ▼';
  });

  const siteLink = el('a', 'site-link') as HTMLAnchorElement;
  siteLink.href = 'https://phalanxduel.com';
  siteLink.target = '_blank';
  siteLink.rel = 'noopener noreferrer';
  siteLink.textContent = 'About the game & printable rules \u2192';
  wrapper.appendChild(siteLink);

  const testErrorBtn = el('button', 'btn btn-tiny');
  testErrorBtn.textContent = 'Trigger Test Error';
  testErrorBtn.style.marginTop = '1rem';
  testErrorBtn.style.opacity = '0.5';
  testErrorBtn.addEventListener('click', () => {
    throw new Error('Sentry Verification Error');
  });
  wrapper.appendChild(testErrorBtn);

  wrapper.appendChild(renderHealthBadge(getState().serverHealth));

  container.appendChild(wrapper);
}

function renderHealthBadge(health: ServerHealth | null): HTMLElement {
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

function renderJoinViaLink(container: HTMLElement, matchId: string, mode: string | null): void {
  const wrapper = el('div', 'lobby join-link-view');

  const title = el('h1', 'title');
  title.textContent = 'You\'ve Been Challenged';
  wrapper.appendChild(title);

  const modeLabels: Record<string, string> = {
    'cumulative': 'Cumulative (digital)',
    'per-turn': 'Per-turn reset (tabletop)',
  };
  const badge = el('div', 'mode-badge');
  badge.textContent = mode ? (modeLabels[mode] ?? 'Standard') : 'Standard';
  wrapper.appendChild(badge);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Your name';
  nameInput.className = 'name-input';
  nameInput.maxLength = 50;
  nameInput.value = getState().playerName ?? '';
  nameInput.addEventListener('input', () => {
    setPlayerName(nameInput.value.trim());
  });
  wrapper.appendChild(nameInput);

  const btnRow = el('div', 'btn-row');
  const joinBtn = el('button', 'btn btn-primary');
  joinBtn.textContent = 'Accept & Enter Match';
  joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    setPlayerName(name);
    connection?.send({ type: 'joinMatch', matchId, playerName: name });
  });
  btnRow.appendChild(joinBtn);
  wrapper.appendChild(btnRow);

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

function renderWatchConnecting(container: HTMLElement, matchId: string): void {
  const wrapper = el('div', 'lobby');

  const title = el('h1', 'title');
  title.textContent = 'Phalanx Duel';
  wrapper.appendChild(title);

  const subtitle = el('p', 'subtitle');
  subtitle.textContent = `Connecting to match\u2026`;
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

function makeCopyBtn(label: string, getValue: () => string): HTMLButtonElement {
  const btn = el('button', 'btn btn-small') as HTMLButtonElement;
  btn.textContent = label;
  btn.addEventListener('click', () => {
    void navigator.clipboard.writeText(getValue());
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = label; }, 2000);
  });
  return btn;
}

function renderWaiting(container: HTMLElement, state: AppState): void {
  const wrapper = el('div', 'waiting');

  const title = el('h2', 'title');
  title.textContent = 'Waiting for Challenger';
  wrapper.appendChild(title);

  const hint = el('p', 'waiting-hint');
  hint.textContent = 'Share one of the options below — opponents join to play, spectators watch live.';
  wrapper.appendChild(hint);

  // ── Opponent invite ────────────────────────────
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
  playBtns.appendChild(makeCopyBtn('Copy Link', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('match', state.matchId ?? '');
    url.searchParams.set('mode', getState().damageMode);
    return url.toString();
  }));
  playSection.appendChild(playBtns);
  wrapper.appendChild(playSection);

  // ── Spectator invite ───────────────────────────
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
  watchBtns.appendChild(makeCopyBtn('Copy Watch Link', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('watch', state.matchId ?? '');
    return url.toString();
  }));
  watchSection.appendChild(watchBtns);
  wrapper.appendChild(watchSection);

  container.appendChild(wrapper);
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
  const phaseLabel = gs.phase === 'reinforcement'
    ? `Reinforce col ${(gs.reinforcement?.column ?? 0) + 1}`
    : gs.phase;
  phaseText.textContent = `Phase: ${phaseLabel} | Turn: ${gs.turnNumber}`;
  phaseText.setAttribute('data-testid', 'phase-indicator');
  infoBar.appendChild(phaseText);

  if (isSpectator) {
    const spectatorBadge = el('span', 'spectator-badge');
    spectatorBadge.textContent = 'SPECTATING';
    infoBar.appendChild(spectatorBadge);
  }

  if (gs.gameOptions?.damageMode === 'per-turn') {
    const modeTag = el('span', 'mode-tag');
    modeTag.textContent = 'Per-Turn Reset';
    infoBar.appendChild(modeTag);
  }

  const turnText = el('span', 'turn-indicator');
  turnText.setAttribute('data-testid', 'turn-indicator');
  const isMyTurn = gs.activePlayerIndex === myIdx;
  if (isSpectator) {
    const activeName = gs.players[gs.activePlayerIndex]?.player.name ?? `Player ${gs.activePlayerIndex + 1}`;
    turnText.textContent = `${activeName}'s turn`;
    turnText.classList.add('opp-turn');
  } else if (gs.phase === 'reinforcement') {
    turnText.textContent = isMyTurn ? 'Reinforce your column' : 'Opponent reinforcing';
    turnText.classList.add(isMyTurn ? 'my-turn' : 'opp-turn');
  } else {
    turnText.textContent = isMyTurn ? 'Your turn' : "Opponent's turn";
    turnText.classList.add(isMyTurn ? 'my-turn' : 'opp-turn');
  }
  infoBar.appendChild(turnText);

  if (!isSpectator && gs.phase === 'combat' && isMyTurn && state.selectedAttacker) {
    const cancelBtn = el('button', 'btn btn-small');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.setAttribute('data-testid', 'combat-cancel-btn');
    cancelBtn.addEventListener('click', clearSelection);
    infoBar.appendChild(cancelBtn);
  }

  if (!isSpectator && gs.phase === 'combat' && isMyTurn) {
    const passBtn = el('button', 'btn btn-small');
    passBtn.textContent = 'Pass';
    passBtn.setAttribute('data-testid', 'combat-pass-btn');
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

  if (!isSpectator && (gs.phase === 'combat' || gs.phase === 'reinforcement') && isMyTurn) {
    const forfeitBtn = el('button', 'btn btn-small btn-forfeit');
    forfeitBtn.textContent = 'Forfeit';
    forfeitBtn.setAttribute('data-testid', 'combat-forfeit-btn');
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

  // Column selector and hand — not shown for spectators
  if (!isSpectator && gs.players[myIdx]) {
    const colSelector = renderColumnSelector(gs, state);
    if (colSelector) {
      wrapper.appendChild(colSelector);
    }
  }

  if (!isSpectator && gs.players[myIdx]) {
    wrapper.appendChild(renderHand(gs, state));
  }

  // Battle log
  const hasAttacks = (gs.transactionLog ?? []).some(e => e.details.type === 'attack');
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
      cell.setAttribute('data-testid', `${isOpponent ? 'opponent' : 'player'}-cell-r${row}-c${col}`);

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
    colBtn.setAttribute('data-testid', `deploy-column-${col}`);

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
  wrapper.setAttribute('data-testid', 'game-over');

  const title = el('h1', 'title');
  title.textContent = 'Game Over';
  wrapper.appendChild(title);

  if (state.gameState && state.playerIndex !== null) {
    const gs = state.gameState;
    const outcome = gs.outcome;

    const result = el('h2', 'result');
    result.setAttribute('data-testid', 'game-over-result');
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
  playAgainBtn.setAttribute('data-testid', 'play-again-btn');
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

function renderStatsSidebar(gs: GameState, myIdx: number, oppIdx: number, spectatorCount: number): HTMLElement {
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

const HELP_CONTENT: Record<string, { title: string; body: string }> = {
  lp: {
    title: 'Life Points (LP)',
    body: 'Your total health. Reach 0 and you lose. Damage from columns overflows to LP if no cards are left in that column. Each player starts with 20 LP.',
  },
  battlefield: {
    title: 'The Battlefield',
    body: '4 columns, each with a Front and Back row. Front row cards protect the back row. Cards in a column protect your LP from overflow damage.',
  },
  hand: {
    title: 'Your Hand',
    body: 'Cards available to play. During deployment, you place cards to fill your columns. During reinforcement, you add one card to a specific column to increase its health.',
  },
  stats: {
    title: 'Tactical Stats',
    body: 'Monitor Deck size, Discard Pile (GY), and Hand counts. Knowing how many cards are left helps predict your opponent\u2019s options.',
  },
  log: {
    title: 'Battle Log',
    body: 'A tactical history of all attacks. Use this to track suit power triggers (like Diamond Shields or Spade double-damage) that happened during the turn.',
  },
};

function renderHelpMarker(key: string, container: HTMLElement): void {
  const content = HELP_CONTENT[key];
  if (!getState().showHelp || !content) return;

  const marker = el('button', 'help-marker');
  marker.textContent = '?';
  marker.setAttribute('aria-label', `Help for ${content.title}`);
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    renderHelpOverlay(key);
  });
  container.appendChild(marker);
}

function renderHelpOverlay(key: string): void {
  const content = HELP_CONTENT[key];
  if (!content) return;

  const overlay = el('div', 'help-overlay');
  const modal = el('div', 'help-modal');
  
  const title = el('h3', 'help-title');
  title.textContent = content.title;
  
  const body = el('p', 'help-body');
  body.textContent = content.body;
  
  const closeBtn = el('button', 'btn btn-primary close-help');
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => overlay.remove());

  modal.appendChild(title);
  modal.appendChild(body);
  modal.appendChild(closeBtn);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
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
