import { render as preactRender } from 'preact';
import type {
  GridPosition,
  GameState,
  Card,
  CombatLogEntry,
  BattlefieldCard,
  Action,
  PlayerState,
} from '@phalanxduel/shared';
import type { AppState } from './state';
import { selectAttacker, selectDeployCard, clearSelection, toggleHelp } from './state';
import { getConnection } from './renderer';
import { HelpMarker } from './components/HelpMarker';
import { HealthBadge } from './components/HealthBadge';
import { CopyButton } from './components/CopyButton';
import { cardLabel, hpDisplay, suitColor, suitSymbol, isWeapon, isFace } from './cards';

const BONUS_LABELS: Record<string, string> = {
  aceInvulnerable: 'Ace invulnerable',
  aceVsAce: 'Ace vs Ace',
  diamondDoubleDefense: 'Diamond ×2 def',
  clubDoubleOverflow: 'Club ×2 overflow',
  spadeDoubleLp: 'Spade ×2 LP',
  heartDeathShield: 'Heart Shield',
};

function getPhaseLabel(gs: GameState): string {
  if (gs.phase === 'ReinforcementPhase') {
    return `Reinforce col ${(gs.reinforcement?.column ?? 0) + 1}`;
  } else if (gs.phase === 'DeploymentPhase') {
    return 'Deployment';
  }
  return gs.phase as string;
}

function getTurnIndicatorText(
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

function getBaseCellClasses(
  bCard: BattlefieldCard | null | undefined,
  isReinforcementCol: boolean,
) {
  const classes = ['bf-cell'];
  if (bCard) {
    classes.push('occupied');
    if (isFace(bCard.card)) classes.push('is-face');
    classes.push(`pz-aura-${bCard.card.suit}`);
  } else {
    classes.push('empty');
  }
  if (isReinforcementCol) classes.push('reinforce-col');
  return classes;
}

function getInteractionClasses(params: {
  bCard: BattlefieldCard | null | undefined;
  pos: GridPosition;
  isOpponent: boolean;
  gs: GameState;
  state: AppState;
  isMyTurn: boolean;
  isReinforcementCol: boolean;
}) {
  const { bCard, pos, isOpponent, gs, state, isMyTurn } = params;
  const classes: string[] = [];

  const isValidAttacker =
    !isOpponent &&
    bCard &&
    gs.phase === 'AttackPhase' &&
    isMyTurn &&
    pos.row === 0 &&
    isWeapon(bCard.card.suit);
  if (isValidAttacker) classes.push('pz-active-pulse');

  const isSelected =
    !isOpponent &&
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    state.selectedAttacker &&
    state.selectedAttacker.row === pos.row &&
    state.selectedAttacker.col === pos.col;
  if (isSelected) classes.push('selected');

  const { isTargetable, isDeployable, isReinforceable } = getTargetingStates(params);

  if (isTargetable || isDeployable || isReinforceable) classes.push('valid-target');

  return { classes, isTargetable, isDeployable, isReinforceable };
}

function getTargetingStates(params: {
  bCard: BattlefieldCard | null | undefined;
  pos: GridPosition;
  isOpponent: boolean;
  gs: GameState;
  state: AppState;
  isMyTurn: boolean;
  isReinforcementCol: boolean;
}) {
  const { bCard, pos, isOpponent, gs, state, isMyTurn, isReinforcementCol } = params;
  return {
    isTargetable:
      isOpponent && !!state.selectedAttacker && isMyTurn && pos.col === state.selectedAttacker.col,
    isDeployable:
      !isOpponent &&
      !bCard &&
      gs.phase === 'DeploymentPhase' &&
      isMyTurn &&
      !!state.selectedDeployCard,
    isReinforceable: isReinforcementCol && !bCard && !!state.selectedDeployCard,
  };
}

function getCellClasses(params: {
  bCard: BattlefieldCard | null | undefined;
  pos: GridPosition;
  isOpponent: boolean;
  gs: GameState;
  state: AppState;
  isMyTurn: boolean;
  isReinforcementCol: boolean;
}) {
  const { bCard, pos, isOpponent, state, isReinforcementCol } = params;
  const baseClasses = getBaseCellClasses(bCard, isReinforcementCol);
  const {
    classes: interClasses,
    isTargetable,
    isDeployable,
    isReinforceable,
  } = getInteractionClasses(params);

  return {
    className: [...baseClasses, ...interClasses].join(' '),
    isGhost: isOpponent && !bCard && pos.col === state.selectedAttacker?.col,
    isTargetable,
    isDeployable,
    isReinforceable,
  };
}

function BattlefieldCell({
  bCard,
  pos,
  isOpponent,
  gs,
  state,
}: {
  bCard: BattlefieldCard | null | undefined;
  pos: GridPosition;
  isOpponent: boolean;
  gs: GameState;
  state: AppState;
}) {
  const isMyTurn = gs.activePlayerIndex === (state.isSpectator ? 0 : state.playerIndex);
  const isReinforcementCol =
    !isOpponent && gs.phase === 'ReinforcementPhase' && pos.col === gs.reinforcement?.column;

  const { className, isGhost, isTargetable, isDeployable, isReinforceable } = getCellClasses({
    bCard,
    pos,
    isOpponent,
    gs,
    state,
    isMyTurn,
    isReinforcementCol,
  });

  const onClick = () => {
    if (isTargetable) {
      sendAttack(state, pos);
    } else if (!isOpponent && bCard && gs.phase === 'AttackPhase' && isMyTurn) {
      selectAttacker(pos);
    } else if (isDeployable && state.selectedDeployCard) {
      sendAction(state, {
        type: 'deploy',
        playerIndex: state.playerIndex ?? 0,
        column: pos.col,
        cardId: state.selectedDeployCard,
        timestamp: new Date().toISOString(),
      });
    } else if (isReinforceable && state.selectedDeployCard) {
      sendAction(state, {
        type: 'reinforce',
        playerIndex: state.playerIndex ?? 0,
        cardId: state.selectedDeployCard,
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <div
      class={className}
      style={
        isGhost
          ? { opacity: '0.3', borderColor: 'transparent' }
          : { borderColor: bCard ? suitColor(bCard.card.suit) : undefined }
      }
      data-testid={`${isOpponent ? 'opponent' : 'player'}-cell-r${pos.row}-c${pos.col}`}
      data-suit={bCard?.card.suit}
      onClick={onClick}
    >
      {bCard && <CellContent bCard={bCard} gs={gs} isOpponent={isOpponent} />}
    </div>
  );
}

function CellContent({
  bCard,
  gs,
  isOpponent,
}: {
  bCard: BattlefieldCard;
  gs: GameState;
  isOpponent: boolean;
}) {
  const color = suitColor(bCard.card.suit);
  return (
    <>
      <div class="card-rank" style={{ color }}>
        {bCard.card.face}
      </div>
      <div class="card-pip" style={{ color }}>
        {suitSymbol(bCard.card.suit)}
      </div>
      <div class="card-hp">{hpDisplay(bCard)}</div>
      <div class="card-type">{isWeapon(bCard.card.suit) ? 'ATK' : 'DEF'}</div>
      {!isOpponent &&
        gs.phase === 'AttackPhase' &&
        isWeapon(bCard.card.suit) &&
        (bCard.card.suit === 'spades' || bCard.card.suit === 'clubs') && (
          <div class="pz-multiplier">x2</div>
        )}
    </>
  );
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

function sendAction(state: AppState, action: Action): void {
  if (!state.matchId) return;
  getConnection()?.send({
    type: 'action',
    matchId: state.matchId,
    action,
  });
}

function Battlefield({
  gs,
  playerIdx,
  state,
  isOpponent,
}: {
  gs: GameState;
  playerIdx: number;
  state: AppState;
  isOpponent: boolean;
}) {
  const battlefield = gs.players[playerIdx]?.battlefield;
  if (!battlefield) return <div class="battlefield" />;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const rows = gs.params?.rows ?? 2;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const columns = gs.params?.columns ?? 4;

  const rowOrder = isOpponent
    ? Array.from({ length: rows }, (_, i) => rows - 1 - i)
    : Array.from({ length: rows }, (_, i) => i);

  return (
    <div class="battlefield" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {rowOrder.map((row) =>
        Array.from({ length: columns }, (_, col) => {
          const gridIdx = row * columns + col;
          const bCard = battlefield[gridIdx];
          const pos: GridPosition = { row, col };
          return (
            <BattlefieldCell
              key={`${row}-${col}`}
              bCard={bCard}
              pos={pos}
              isOpponent={isOpponent}
              gs={gs}
              state={state}
            />
          );
        }),
      )}
    </div>
  );
}

function Hand({ gs, state }: { gs: GameState; state: AppState }) {
  const myIdx = state.playerIndex ?? 0;
  const hand = gs.players[myIdx]?.hand ?? [];
  const isMyTurn = gs.activePlayerIndex === myIdx;

  return (
    <div class="hand-section">
      <div class="section-label">Your Hand</div>
      <HelpMarker helpKey="hand" />
      <div class="hand">
        {hand.map((card, i) => {
          let className = 'hand-card';
          if (isFace(card)) className += ' is-face';
          className += ` pz-aura-${card.suit}`;
          if (state.selectedDeployCard === card.id) className += ' selected';

          const isPlayable =
            (gs.phase === 'DeploymentPhase' || gs.phase === 'ReinforcementPhase') && isMyTurn;
          if (isPlayable) className += ' playable';
          if (gs.phase === 'ReinforcementPhase' && isMyTurn) className += ' reinforce-playable';

          return (
            <div
              key={card.id}
              class={className}
              style={{ borderColor: suitColor(card.suit) }}
              data-testid={`hand-card-${i}`}
              data-suit={card.suit}
              data-cardid={card.id}
              onClick={() => {
                if (isPlayable) selectDeployCard(card.id);
              }}
            >
              <div class="card-rank" style={{ color: suitColor(card.suit) }}>
                {card.face}
              </div>
              <div class="card-pip" style={{ color: suitColor(card.suit) }}>
                {suitSymbol(card.suit)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BattleLog({ gs }: { gs: GameState }) {
  const entries: CombatLogEntry[] = (gs.transactionLog ?? [])
    .filter((e) => e.details.type === 'attack')
    .map((e) => (e.details as { type: 'attack'; combat: CombatLogEntry }).combat);
  const recent = entries.slice(-8);

  if (recent.length === 0) return null;

  return (
    <div class="battle-log-section">
      <div class="section-label">Battle Log</div>
      <HelpMarker helpKey="log" />
      <div class="battle-log">
        {recent.map((entry, idx) => {
          const atkLabel = cardLabel(entry.attackerCard);
          return (
            <div key={idx} class="log-entry">
              T{entry.turnNumber}: {atkLabel} {'->'} Col {entry.targetColumn + 1}:
              {entry.steps.map((step, sIdx) => {
                const bonusText = (step.bonuses ?? []).map((b) => BONUS_LABELS[b] ?? b).join(', ');
                if (step.target === 'playerLp') {
                  return (
                    <span key={sIdx}>
                      {' '}
                      LP {step.lpBefore ?? '?'}
                      {'\u2192'}
                      {step.lpAfter ?? '?'} (-{step.damage}){bonusText && ` (${bonusText})`}
                    </span>
                  );
                } else {
                  const pos = step.target === 'frontCard' ? 'F' : 'B';
                  const stepCard = step.card ? cardLabel(step.card) : '?';
                  return (
                    <span key={sIdx}>
                      {' '}
                      {stepCard} [{pos} {step.hpBefore ?? '?'}
                      {'\u2192'}
                      {step.hpAfter ?? '?'}
                      {step.destroyed ? ' KO' : ''}] {bonusText && ` (${bonusText})`}
                    </span>
                  );
                }
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getBaseStats(ps: PlayerState | undefined) {
  const lp = ps?.lifepoints ?? 20;
  const handCount = ps?.handCount ?? ps?.hand.length ?? 0;
  const deckCount = ps?.drawpileCount ?? ps?.drawpile.length ?? 0;
  const gyCount = ps?.discardPileCount ?? ps?.discardPile.length ?? 0;
  return [
    { label: 'LP', value: String(lp) },
    { label: 'Hand', value: String(handCount).padStart(2, '0') },
    { label: 'Deck', value: String(deckCount).padStart(2, '0') },
    { label: 'GY', value: String(gyCount).padStart(2, '0') },
  ];
}

function StatsBlock({
  gs,
  playerIdx,
  isMine,
}: {
  gs: GameState;
  playerIdx: number;
  isMine: boolean;
}) {
  const ps = gs.players[playerIdx];
  const lastCard = ps?.discardPile.at(-1);
  const stats = getBaseStats(ps);

  if (isMine) stats.reverse();

  return (
    <div class={`stats-block ${isMine ? 'mine' : 'opponent'}`}>
      <HelpMarker helpKey="lp" />
      {!isMine && lastCard && <StatsLastCard card={lastCard} />}
      {stats.map((s, i) => (
        <div key={i} class="stats-row">
          <span class="stats-value">{s.value}</span>
          <span class="stats-label">{s.label}</span>
        </div>
      ))}
      {isMine && lastCard && <StatsLastCard card={lastCard} />}
    </div>
  );
}

function StatsLastCard({ card }: { card: Card }) {
  return (
    <div class="stats-row">
      <span class="stats-card-label" style={{ color: suitColor(card.suit) }}>
        {cardLabel(card)}
      </span>
      <span class="stats-label">last</span>
    </div>
  );
}

function StatsSidebar({ gs, state }: { gs: GameState; state: AppState }) {
  const myIdx = state.isSpectator ? 0 : (state.playerIndex ?? 0);
  const oppIdx = myIdx === 0 ? 1 : 0;
  const isMyTurn = gs.activePlayerIndex === myIdx;
  const spectatorTarget = gs.players[gs.activePlayerIndex ?? 0]?.player.name ?? 'the current turn';

  return (
    <div class={`stats-sidebar ${state.isSpectator ? 'spectator-mode' : ''}`}>
      <HelpMarker helpKey="stats" />
      <StatsBlock gs={gs} playerIdx={oppIdx} isMine={false} />
      <hr class="stats-divider" />
      <div class="stats-turn-number">T{gs.turnNumber}</div>
      <div class={`stats-turn ${isMyTurn ? 'my-turn' : 'opp-turn'}`}>
        {isMyTurn ? 'YOUR TURN' : 'OPP'}
      </div>
      {state.isSpectator && (
        <div class="spectator-band" role="status" aria-live="polite">
          <span class="spectator-label">Spectator Mode</span>
          <span class="spectator-detail">Watching {spectatorTarget}</span>
        </div>
      )}
      {state.spectatorCount > 0 && (
        <div class="spectator-count">{state.spectatorCount} watching</div>
      )}
      <hr class="stats-divider" />
      <StatsBlock gs={gs} playerIdx={myIdx} isMine={true} />
      <hr class="stats-divider" />
      <HealthBadge health={state.serverHealth} />
    </div>
  );
}

function InGameInvite({ matchId }: { matchId: string }) {
  return (
    <div class="in-game-invite">
      <span class="invite-label">Invite Spectators:</span>
      <div class="share-btn-row">
        <CopyButton label="Code" getValue={() => matchId} className="btn btn-tiny" />
        <CopyButton
          label="Link"
          getValue={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('watch', matchId);
            return url.toString();
          }}
          className="btn btn-tiny"
        />
      </div>
    </div>
  );
}

function InfoBarActions({
  gs,
  state,
  myIdx,
  isMyTurn,
}: {
  gs: GameState;
  state: AppState;
  myIdx: number;
  isMyTurn: boolean;
}) {
  const isAttack = gs.phase === 'AttackPhase';
  const isReinforce = gs.phase === 'ReinforcementPhase';

  const onPass = () => {
    if (!state.matchId) return;
    getConnection()?.send({
      type: 'action',
      matchId: state.matchId,
      action: { type: 'pass', playerIndex: myIdx, timestamp: new Date().toISOString() },
    });
  };

  const onForfeit = () => {
    if (!state.matchId || !confirm('Are you sure you want to forfeit?')) return;
    getConnection()?.send({
      type: 'action',
      matchId: state.matchId,
      action: { type: 'forfeit', playerIndex: myIdx, timestamp: new Date().toISOString() },
    });
  };

  if (!isMyTurn) return null;

  return (
    <div class="info-action-buttons">
      {isAttack && state.selectedAttacker && (
        <button class="btn btn-small" data-testid="combat-cancel-btn" onClick={clearSelection}>
          Cancel
        </button>
      )}
      {isAttack && (
        <button class="btn btn-small" data-testid="combat-pass-btn" onClick={onPass}>
          Pass
        </button>
      )}
      {(isAttack || isReinforce) && (
        <button
          class="btn btn-small btn-forfeit"
          data-testid="combat-forfeit-btn"
          onClick={onForfeit}
        >
          Forfeit
        </button>
      )}
    </div>
  );
}

function buildActionHint(args: {
  gs: GameState;
  state: AppState;
  myIdx: number;
  isMyTurn: boolean;
  isSpectator: boolean;
}): { text: string; tone: 'neutral' | 'info' | 'alert' } {
  const { gs, state, myIdx, isMyTurn, isSpectator } = args;
  if (!state.matchId) {
    return { text: 'Match setup in progress…', tone: 'neutral' };
  }

  if (isSpectator) {
    const activeName =
      gs.players[gs.activePlayerIndex]?.player.name ?? `Player ${gs.activePlayerIndex + 1}`;
    return { text: `Watching ${activeName} during ${getPhaseLabel(gs)}.`, tone: 'neutral' };
  }

  if (!isMyTurn) {
    const activeName =
      gs.players[gs.activePlayerIndex]?.player.name ?? `Player ${gs.activePlayerIndex + 1}`;
    return {
      text: `${activeName} controls the board. Stay ready for the next exchange.`,
      tone: 'neutral',
    };
  }

  if (state.selectedDeployCard) {
    const card = gs.players[myIdx]?.hand.find((c) => c.id === state.selectedDeployCard);
    const cardName = card ? cardLabel(card) : 'your selected card';
    return {
      text: `Choose a column to deploy ${cardName} or cancel to pick another card.`,
      tone: 'info',
    };
  }

  if (state.selectedAttacker) {
    return {
      text: 'Select an enemy card to attack or cancel to reassess your board.',
      tone: 'alert',
    };
  }

  return {
    text: 'Select an attacker or deploy a card to keep the tempo.',
    tone: 'info',
  };
}

function InfoBar({
  gs,
  state,
  myIdx,
  isSpectator,
  turnInfo,
}: {
  gs: GameState;
  state: AppState;
  myIdx: number;
  isSpectator: boolean;
  turnInfo: { text: string; isMyTurn: boolean };
}) {
  const hint = buildActionHint({ gs, state, myIdx, isMyTurn: turnInfo.isMyTurn, isSpectator });
  return (
    <div class="info-bar">
      <div class="info-bar-main">
        <div class="info-phase-line">
          <span class="phase-pill" data-testid="phase-indicator">
            <span class="phase-label">Phase</span>
            <span class="phase-value">{getPhaseLabel(gs)}</span>
          </span>
          <span class="phase-turn">Turn {gs.turnNumber}</span>
        </div>
        <div class="info-turn-line">
          <span
            class={`turn-indicator ${turnInfo.isMyTurn ? 'my-turn' : 'opp-turn'}`}
            data-testid="turn-indicator"
          >
            {turnInfo.text}
          </span>
          {isSpectator && <span class="spectator-badge info-inline">SPECTATING</span>}
          {gs.gameOptions?.damageMode === 'classic' && (
            <span class="mode-tag info-inline">Per-Turn Reset</span>
          )}
        </div>
      </div>

      <div class={`info-hint info-hint-${hint.tone}`} role="status" aria-live="polite">
        {hint.text}
      </div>

      <div class="info-bar-actions">
        <InfoBarActions gs={gs} state={state} myIdx={myIdx} isMyTurn={turnInfo.isMyTurn} />
        <button class="btn btn-small help-btn" onClick={toggleHelp}>
          {state.showHelp ? 'Exit Help' : 'Help ?'}
        </button>
      </div>
    </div>
  );
}

function GameApp({ state }: { state: AppState }) {
  const gs = state.gameState;
  if (!gs) return null;

  const isSpectator = state.isSpectator;
  const myIdx = isSpectator ? 0 : (state.playerIndex ?? 0);
  const oppIdx = myIdx === 0 ? 1 : 0;

  const turnInfo = getTurnIndicatorText(gs, isSpectator, myIdx);

  return (
    <div class="game-layout" data-testid="game-layout">
      <div class="game-main">
        <div class="game">
          <div class="battlefield-section opponent">
            <div class="section-label">{gs.players[oppIdx]?.player.name ?? 'Opponent'}</div>
            <Battlefield gs={gs} playerIdx={oppIdx} state={state} isOpponent={true} />
            {!isSpectator && <HelpMarker helpKey="battlefield" />}
          </div>

          <InfoBar
            gs={gs}
            state={state}
            myIdx={myIdx}
            isSpectator={isSpectator}
            turnInfo={turnInfo}
          />

          <div class="battlefield-section mine">
            <div class="section-label">{gs.players[myIdx]?.player.name ?? 'You'}</div>
            <Battlefield gs={gs} playerIdx={myIdx} state={state} isOpponent={false} />
          </div>

          {!isSpectator && gs.players[myIdx] && <Hand gs={gs} state={state} />}
          <BattleLog gs={gs} />
          {!isSpectator && <InGameInvite matchId={state.matchId ?? ''} />}
        </div>
      </div>
      <StatsSidebar gs={gs} state={state} />
    </div>
  );
}

export function renderGamePreact(container: HTMLElement, state: AppState): void {
  preactRender(<GameApp state={state} />, container);
}
