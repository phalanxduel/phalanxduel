import { render as preactRender } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type {
  GameState,
  Card,
  CombatLogEntry,
  TransactionLogEntry,
  BattlefieldCard,
  Action,
  GamePhase,
} from '@phalanxduel/shared';
import type { AppState } from './state';
import {
  selectAttacker,
  selectDeployCard,
  clearSelection,
  toggleHelp,
  startActionTimeout,
} from './state';
import { getConnection } from './renderer';
import { HelpDialog } from './components/HelpDialog';
import { OnboardingBriefing } from './components/OnboardingBriefing';
import { HealthBadge } from './components/HealthBadge';
import { CopyButton } from './components/CopyButton';
import { cardLabel, suitColor, suitSymbol, isFace } from './cards';
import { HUD_PHASE_LABELS } from './constants';
import { deriveCombatResolution } from '@phalanxduel/shared';
import { simulateAttack } from '@phalanxduel/engine';
import type { AttackPreviewVerdict } from '@phalanxduel/engine';

function getPhaseLabel(gs: GameState): string {
  if (gs.phase === 'ReinforcementPhase') {
    return `REINFORCE COL ${(gs.reinforcement?.column ?? 0) + 1}`;
  }
  return HUD_PHASE_LABELS[gs.phase] || gs.phase;
}

function getPhaseTone(phase: GamePhase): 'deploy' | 'attack' | 'recover' | 'terminal' {
  switch (phase) {
    case 'DeploymentPhase':
    case 'StartTurn':
    case 'DrawPhase':
      return 'deploy';
    case 'AttackPhase':
    case 'AttackResolution':
      return 'attack';
    case 'CleanupPhase':
    case 'ReinforcementPhase':
    case 'EndTurn':
      return 'recover';
    case 'gameOver':
      return 'terminal';
  }
}

function getCardIntensity(card: Card): 'high' | 'low' {
  return isFace(card) || card.value >= 10 ? 'high' : 'low';
}

function playerName(gs: GameState, playerIndex: number): string {
  return gs.players[playerIndex]?.player.name ?? `P${playerIndex + 1}`;
}

function describePlayByPlay(entry: TransactionLogEntry, gs: GameState): string {
  const actorIndex = 'playerIndex' in entry.action ? entry.action.playerIndex : null;
  const actor = actorIndex === null ? 'System' : playerName(gs, actorIndex);

  switch (entry.details.type) {
    case 'system:init':
      return 'Match initialized';
    case 'deploy': {
      const column = (entry.details.gridIndex % gs.params.columns) + 1;
      return `${actor} deployed to column ${column}`;
    }
    case 'attack': {
      const combat = entry.details.combat;
      const lpDamage =
        combat.totalLpDamage > 0 ? `, ${combat.totalLpDamage} LP damage` : ', line held';
      return `${actor} attacked column ${combat.targetColumn + 1} with ${cardLabel(
        combat.attackerCard,
      )}${lpDamage}`;
    }
    case 'pass':
      return `${actor} passed`;
    case 'reinforce':
      return `${actor} reinforced column ${entry.details.column + 1} and drew ${
        entry.details.cardsDrawn
      }`;
    case 'forfeit':
      return `${actor} forfeited; ${playerName(gs, entry.details.winnerIndex)} wins`;
  }
}

function getCardClasses({
  isSelected,
  isValidTarget,
  isPlayable,
  isReinforcePlayable,
  isReinforceCol,
  isAttackPlayable,
  attackPreview,
  columnHighlight,
  variant,
  actualCard,
  bCard,
}: {
  isSelected?: boolean;
  isValidTarget?: boolean;
  isPlayable?: boolean;
  isReinforcePlayable?: boolean;
  isReinforceCol?: boolean;
  isAttackPlayable?: boolean;
  attackPreview?: string;
  columnHighlight?: string;
  variant: 'battlefield' | 'hand';
  actualCard: Card;
  bCard?: BattlefieldCard;
}) {
  const classes = ['phx-card'];
  classes.push(variant === 'battlefield' ? 'bf-cell' : 'hand-card');
  if (variant === 'battlefield' && bCard) classes.push('occupied');
  if (isSelected) classes.push('selected');
  if (isValidTarget) classes.push('valid-target');
  if (isPlayable) classes.push('playable');
  if (isReinforcePlayable) classes.push('reinforce-playable');
  if (isReinforceCol) classes.push('is-reinforce-col', 'reinforce-col');
  if (isAttackPlayable) classes.push('attack-playable');
  if (columnHighlight) classes.push(`col-highlight-${columnHighlight}`);
  if (attackPreview) classes.push(`attack-preview-${attackPreview.toLowerCase()}`);
  if (isFace(actualCard)) classes.push('is-face');

  classes.push(`rank-${actualCard.face.toLowerCase()}`);
  classes.push(`type-${actualCard.type.toLowerCase()}`);

  if (isSelected) classes.push('active-attacker');

  return classes.join(' ');
}

function PhxCard(props: {
  card?: Card;
  bCard?: BattlefieldCard;
  testId?: string;
  isSelected?: boolean;
  isValidTarget?: boolean;
  isPlayable?: boolean;
  isReinforcePlayable?: boolean;
  isReinforceCol?: boolean;
  isAttackPlayable?: boolean;
  attackPreview?: AttackPreviewVerdict | null;
  columnHighlight?: 'attacker' | 'target' | 'reinforce' | 'resolution';
  variant: 'battlefield' | 'hand';
  onClick?: () => void;
}) {
  const { bCard, card, variant, isReinforceCol, isValidTarget, columnHighlight, onClick } = props;
  const actualCard = bCard?.card ?? card;

  if (!actualCard) {
    return (
      <div
        class={`phx-card ${variant === 'battlefield' ? 'bf-cell' : 'hand-card'} empty ${
          isReinforceCol ? 'is-reinforce-col reinforce-col' : ''
        } ${isValidTarget ? 'valid-target' : ''} ${
          columnHighlight ? `col-highlight-${columnHighlight}` : ''
        }`}
        data-testid={props.testId}
        data-card-variant={variant}
        data-action-preview={props.attackPreview ?? undefined}
        onClick={onClick}
      />
    );
  }

  const color = suitColor(actualCard.suit);
  const classString = getCardClasses({
    ...props,
    actualCard,
    attackPreview: props.attackPreview ?? undefined,
  });

  const elementId =
    variant === 'battlefield' && bCard
      ? `phx-cell-${bCard.position.row}-${bCard.position.col}`
      : variant === 'hand' && card
        ? `phx-card-hand-${card.id}`
        : undefined;

  return (
    <div
      id={elementId}
      class={classString}
      data-testid={props.testId}
      data-card-variant={variant}
      data-card-intensity={getCardIntensity(actualCard)}
      data-card-suit={actualCard.suit}
      data-qa-attackable={props.isAttackPlayable ? 'true' : undefined}
      data-action-preview={props.attackPreview ?? undefined}
      onClick={onClick}
    >
      <div class="phx-card-layer phx-card-layer-base" />
      <div class="phx-card-layer phx-card-layer-surface" />
      <div class="phx-card-layer phx-card-layer-accents" />
      <div class="phx-card-content">
        <div class="phx-card-rank" style={{ color }}>
          {actualCard.face}
        </div>
        <div class="phx-card-suit" style={{ color }}>
          {suitSymbol(actualCard.suit)}
        </div>
        <div class="phx-card-type">{actualCard.type}</div>
        {bCard && (
          <div class="phx-card-hp-container">
            <div
              class="phx-card-hp-bar"
              style={{
                width: `${(bCard.currentHp / actualCard.value) * 100}%`,
                backgroundColor: color,
              }}
            />
            <div class="phx-card-hp-text">
              {bCard.currentHp}/{actualCard.value}
            </div>
          </div>
        )}
        {props.attackPreview && variant === 'battlefield' && isValidTarget && (
          <div class={`phx-action-preview-chip preview-${props.attackPreview.toLowerCase()}`}>
            {props.attackPreview}
          </div>
        )}
      </div>
      <div class="phx-card-layer phx-card-layer-interaction" />
    </div>
  );
}

function getBattlefieldColumnHighlight({
  col,
  playerIdx,
  isOpponent,
  gs,
  state,
}: {
  col: number;
  playerIdx: number;
  isOpponent: boolean;
  gs: GameState;
  state: AppState;
}): 'attacker' | 'target' | 'reinforce' | 'resolution' | undefined {
  const isAttackerCol = !isOpponent && state.selectedAttacker?.col === col;
  const isTargetCol =
    isOpponent &&
    !!state.selectedAttacker &&
    state.validActions.some(
      (a) =>
        a.type === 'attack' &&
        a.attackingColumn === state.selectedAttacker?.col &&
        a.defendingColumn === col,
    );
  const isGlobalReinforceCol =
    gs.phase === 'ReinforcementPhase' &&
    gs.reinforcement?.column === col &&
    gs.activePlayerIndex === playerIdx;

  const lastEntry = gs.transactionLog?.at(-1);
  const lastAction = lastEntry?.action;
  const lastDetail = lastEntry?.details;
  const isResolutionCol =
    gs.phase === 'AttackResolution' &&
    lastAction?.type === 'attack' &&
    lastDetail?.type === 'attack' &&
    ((lastAction.playerIndex === playerIdx && lastAction.attackingColumn === col) ||
      (lastDetail.combat.attackerPlayerIndex !== playerIdx &&
        lastDetail.combat.targetColumn === col));

  if (isResolutionCol) return 'resolution';
  if (isGlobalReinforceCol) return 'reinforce';
  if (isAttackerCol) return 'attacker';
  if (isTargetCol) return 'target';
  return undefined;
}

function BattlefieldCell({
  row,
  col,
  battlefield,
  columns,
  gs,
  state,
  playerIdx,
  isOpponent,
  columnHighlight,
}: {
  row: number;
  col: number;
  battlefield: (BattlefieldCard | null)[];
  columns: number;
  gs: GameState;
  state: AppState;
  playerIdx: number;
  isOpponent: boolean;
  columnHighlight?: 'attacker' | 'target' | 'reinforce' | 'resolution';
}) {
  const pos = { row, col };
  const bCard = battlefield[row * columns + col];

  const isSelected =
    !isOpponent && state.selectedAttacker?.row === row && state.selectedAttacker?.col === col;

  const isTargetable =
    isOpponent &&
    !!state.selectedAttacker &&
    state.validActions.some(
      (a) =>
        a.type === 'attack' &&
        a.attackingColumn === state.selectedAttacker?.col &&
        a.defendingColumn === col,
    );
  const selectedAttacker = state.selectedAttacker;
  const selectedAttackerCol = selectedAttacker?.col;
  const attackAction =
    isTargetable && selectedAttackerCol !== undefined
      ? state.validActions.find(
          (a): a is Extract<Action, { type: 'attack' }> =>
            a.type === 'attack' &&
            a.attackingColumn === selectedAttackerCol &&
            a.defendingColumn === col,
        )
      : null;
  const attackPreview = attackAction ? simulateAttack(gs, attackAction).verdict : null;

  const isReinforcementCol =
    !isOpponent && gs.phase === 'ReinforcementPhase' && col === gs.reinforcement?.column;
  const isReinforceable =
    isReinforcementCol &&
    !bCard &&
    state.selectedDeployCard &&
    state.validActions.some(
      (a) =>
        a.type === 'reinforce' &&
        a.cardId === state.selectedDeployCard &&
        a.playerIndex === playerIdx,
    );

  const isDeployable =
    !isOpponent &&
    !bCard &&
    gs.phase === 'DeploymentPhase' &&
    state.selectedDeployCard &&
    state.validActions.some(
      (a) =>
        a.type === 'deploy' &&
        a.cardId === state.selectedDeployCard &&
        a.column === col &&
        a.playerIndex === playerIdx,
    );

  const isAttackPlayable =
    !isOpponent &&
    !!bCard &&
    row === 0 &&
    state.validActions.some((a) => a.type === 'attack' && a.attackingColumn === col);

  const onClick = () => {
    if (isTargetable)
      sendAction(state, {
        type: 'attack',
        playerIndex: state.playerIndex!,
        attackingColumn: state.selectedAttacker!.col,
        defendingColumn: col,
        timestamp: new Date().toISOString(),
      });
    else if (!isOpponent && bCard && row === 0 && isAttackPlayable) {
      if (isSelected) clearSelection();
      else selectAttacker(pos);
    } else if (isDeployable)
      sendAction(state, {
        type: 'deploy',
        playerIndex: state.playerIndex!,
        column: col,
        cardId: state.selectedDeployCard!,
        timestamp: new Date().toISOString(),
      });
    else if (isReinforceable)
      sendAction(state, {
        type: 'reinforce',
        playerIndex: state.playerIndex!,
        cardId: state.selectedDeployCard!,
        timestamp: new Date().toISOString(),
      });
  };

  return (
    <PhxCard
      key={`${row}-${col}`}
      bCard={bCard || undefined}
      testId={`${isOpponent ? 'opponent' : 'player'}-cell-r${row}-c${col}`}
      isSelected={isSelected}
      isValidTarget={!!(isTargetable || isDeployable || isReinforceable)}
      isReinforceCol={isReinforcementCol}
      isAttackPlayable={isAttackPlayable}
      attackPreview={attackPreview ?? undefined}
      columnHighlight={columnHighlight}
      variant="battlefield"
      onClick={onClick}
    />
  );
}

function PhxBattlefield({
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
  if (!battlefield) return null;

  const { rows, columns } = gs.params;
  const rowOrder = isOpponent
    ? Array.from({ length: rows }, (_, i) => rows - 1 - i)
    : Array.from({ length: rows }, (_, i) => i);

  return (
    <div
      class="phx-battlefield"
      data-testid={`${isOpponent ? 'opponent' : 'player'}-battlefield`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {rowOrder.map((row) =>
        Array.from({ length: columns }, (_, col) => (
          <BattlefieldCell
            key={`${row}-${col}`}
            row={row}
            col={col}
            battlefield={battlefield}
            columns={columns}
            gs={gs}
            state={state}
            playerIdx={playerIdx}
            isOpponent={isOpponent}
            columnHighlight={getBattlefieldColumnHighlight({
              col,
              playerIdx,
              isOpponent,
              gs,
              state,
            })}
          />
        )),
      )}
    </div>
  );
}

function PhxInfoBar({ gs, state, myIdx }: { gs: GameState; state: AppState; myIdx: number }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isReinforce = gs.phase === 'ReinforcementPhase';
  const hasReinforceActions = state.validActions.some((a) => a.type === 'reinforce');
  const canPass =
    state.validActions.some((a) => a.type === 'pass') && (!isReinforce || !hasReinforceActions);
  const canCancel = !!(state.selectedAttacker || state.selectedDeployCard);
  const canForfeit = !state.isSpectator && state.validActions.some((a) => a.type === 'forfeit');

  const hasActions = canPass || canCancel || canForfeit;

  const closeAndSend = (action: Action) => {
    setIsDrawerOpen(false);
    sendAction(state, action);
  };

  return (
    <div class="phx-hud-bottom">
      <div class="phx-hud-bottom-content">
        <div class="section-label phx-label-rotated">COMMAND_CONSOLE</div>

        <div class="phx-hud-bottom-main">
          {!state.isSpectator && (
            <div class="phx-hand-container" data-testid="hand-container">
              <div class="phx-hand" data-testid="hand">
                {gs.players[myIdx]?.hand.map((card, i) => (
                  <PhxCard
                    key={card.id}
                    card={card}
                    testId={`hand-card-${i}`}
                    isSelected={state.selectedDeployCard === card.id}
                    isPlayable={state.validActions.some(
                      (a) => a.type === 'deploy' && a.cardId === card.id,
                    )}
                    isReinforcePlayable={state.validActions.some(
                      (a) => a.type === 'reinforce' && a.cardId === card.id,
                    )}
                    variant="hand"
                    onClick={() => {
                      if (state.selectedDeployCard === card.id) {
                        clearSelection();
                      } else {
                        selectDeployCard(card.id);
                      }
                    }}
                  />
                ))}
              </div>

              {hasActions && (
                <div class={`phx-command-drawer ${isDrawerOpen ? 'is-open' : ''}`}>
                  <button
                    id="phx-command-drawer-handle"
                    class="phx-drawer-handle"
                    onClick={() => {
                      setIsDrawerOpen(!isDrawerOpen);
                    }}
                    title="Toggle Commands"
                  >
                    {isDrawerOpen ? ' \u276F ' : ' \u276E '}
                  </button>

                  <div class="phx-drawer-content">
                    {canCancel && (
                      <button
                        id="phx-command-cancel"
                        class="btn btn-secondary"
                        onClick={() => {
                          clearSelection();
                          setIsDrawerOpen(false);
                        }}
                      >
                        CANCEL
                      </button>
                    )}
                    {canPass && (
                      <button
                        id="phx-command-pass"
                        class="btn btn-primary"
                        data-testid={isReinforce ? 'combat-skip-reinforce-btn' : 'combat-pass-btn'}
                        onClick={() => {
                          const label = isReinforce ? 'SKIP' : 'PASS';
                          if (confirm(`Confirm ${label}?`)) {
                            closeAndSend({
                              type: 'pass',
                              playerIndex: myIdx,
                              timestamp: new Date().toISOString(),
                            });
                          }
                        }}
                      >
                        {isReinforce ? 'SKIP' : 'PASS'}
                      </button>
                    )}
                    {canForfeit && (
                      <button
                        id="phx-command-forfeit"
                        class="btn btn-danger"
                        data-testid="combat-forfeit-btn"
                        onClick={() => {
                          if (confirm('ABORT engagement? Finality: TOTAL.')) {
                            closeAndSend({
                              type: 'forfeit',
                              playerIndex: myIdx,
                              timestamp: new Date().toISOString(),
                            });
                          }
                        }}
                      >
                        FORFEIT
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhxSidebar({ gs, state }: { gs: GameState; state: AppState }) {
  const myIdx = state.playerIndex ?? 0;
  const oppIdx = myIdx === 0 ? 1 : 0;
  const activeName = playerName(gs, gs.activePlayerIndex);

  const entries: CombatLogEntry[] = (gs.transactionLog ?? [])
    .filter((e) => e.details.type === 'attack')
    .map((e) => (e.details as { type: 'attack'; combat: CombatLogEntry }).combat);
  const playByPlayEntries = (gs.transactionLog ?? [])
    .slice(-20)
    .reverse()
    .map((entry) => ({
      key: entry.sequenceNumber,
      label: describePlayByPlay(entry, gs),
    }));

  return (
    <aside class="phx-sidebar">
      <div class="phx-stats-block">
        <div class="phx-stats-row">
          <span class="phx-label">HOSTILE</span>
          <span class="phx-val">{gs.players[oppIdx]?.lifepoints ?? 0} LP</span>
        </div>
        <div class="phx-stats-row">
          <span class="phx-label">OPERATIVE</span>
          <span class="phx-val">{gs.players[myIdx]?.lifepoints ?? 0} LP</span>
        </div>
      </div>

      {state.isSpectator && (
        <div class="phx-stats-block phx-spectator-live" data-testid="spectator-live-panel">
          <div class="section-label">LIVE_DIRECTOR</div>
          <div class="phx-spectator-row">
            <span>ACTIVE</span>
            <strong>{activeName}</strong>
          </div>
          <div class="phx-spectator-row">
            <span>PHASE</span>
            <strong>{getPhaseLabel(gs)}</strong>
          </div>
          <div class="phx-spectator-row">
            <span>MATCH</span>
            <strong>{state.matchId?.slice(0, 8) ?? 'pending'}</strong>
          </div>
          <div class="phx-spectator-row">
            <span>WATCHING</span>
            <strong>{state.spectatorCount}</strong>
          </div>
        </div>
      )}

      <div class="phx-log">
        <div class="section-label">{state.isSpectator ? 'PLAY_BY_PLAY' : 'ENGAGEMENT_LOG'}</div>
        {state.isSpectator && playByPlayEntries.length === 0 && (
          <div style="opacity: 0.3; font-style: italic; margin-top: 1rem;">
            Waiting for first turn event...
          </div>
        )}
        {!state.isSpectator && entries.length === 0 && (
          <div style="opacity: 0.3; font-style: italic; margin-top: 1rem;">
            No combat data recorded...
          </div>
        )}
        {state.isSpectator &&
          playByPlayEntries.map((entry) => (
            <div key={entry.key} class="phx-log-entry phx-play-by-play-entry">
              {entry.label}
            </div>
          ))}
        {!state.isSpectator &&
          entries
            .slice(-20)
            .reverse()
            .map((entry, i) => (
              <div key={i} class="phx-log-entry">
                <span style="color: var(--gold)">T{entry.turnNumber}</span>:{' '}
                {cardLabel(entry.attackerCard)} ATK COL {entry.targetColumn + 1}
              </div>
            ))}
      </div>

      <div class="phx-stats-block" style="border-top: 1px solid var(--border); margin-top: auto;">
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <CopyButton label="CODE" getValue={() => state.matchId ?? ''} className="btn btn-tiny" />
          <button class="btn btn-tiny" onClick={toggleHelp}>
            HELP
          </button>
        </div>
        <div style="margin-top: 1rem">
          <HealthBadge health={state.serverHealth} label="SYSTEM" />
        </div>
      </div>
    </aside>
  );
}

function sendAction(state: AppState, action: Action): void {
  if (!state.matchId) return;
  startActionTimeout();
  getConnection()?.send({ type: 'action', matchId: state.matchId, action });
}

function CombatFeedbackBanner({ gs }: { gs: GameState }) {
  const [combatFeedback, setCombatFeedback] = useState<string | null>(null);
  const lastHandledSequenceRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const log = gs.transactionLog ?? [];

    const latestAttack = [...log]
      .reverse()
      .find(
        (
          entry,
        ): entry is TransactionLogEntry & { details: { type: 'attack'; combat: CombatLogEntry } } =>
          entry.details.type === 'attack',
      );
    if (!latestAttack) return;
    if (lastHandledSequenceRef.current === latestAttack.sequenceNumber) return;

    lastHandledSequenceRef.current = latestAttack.sequenceNumber;

    const resolution = deriveCombatResolution(latestAttack.details.combat, {
      reinforcementTriggered: latestAttack.details.reinforcementTriggered,
      victoryTriggered: latestAttack.details.victoryTriggered,
    });
    const headline = resolution.explanation.headline;
    if (headline === 'Attack resolved') return;

    setCombatFeedback(headline);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setCombatFeedback(null);
      feedbackTimerRef.current = null;
    }, 2600);

    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
      }
    };
  }, [gs.transactionLog?.length, gs.turnNumber]);

  if (!combatFeedback) return null;

  return (
    <div
      class={`phx-combat-feedback feedback-${combatFeedback.toLowerCase().replace(/\s+/g, '-')}`}
      data-testid="combat-feedback-banner"
    >
      {combatFeedback}
    </div>
  );
}

function PhxStatsHorizontal({
  gs,
  playerIdx,
  label,
  isOpponent,
}: {
  gs: GameState;
  playerIdx: number;
  label: string;
  isOpponent: boolean;
}) {
  const stats = getBaseStats(gs, playerIdx);
  return (
    <div
      class={`phx-stats-horizontal ${isOpponent ? 'is-opponent' : 'is-player'}`}
      data-testid={`${isOpponent ? 'opponent' : 'player'}-stats`}
    >
      <span class="phx-stats-label">{label}</span>
      {stats.map((s) => (
        <span key={s.label} class="phx-stat-item">
          <span class="phx-stat-key">{s.label}</span>
          <span class="phx-stat-val">{s.value}</span>
        </span>
      ))}
    </div>
  );
}

function GameApp({ state }: { state: AppState }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const gs = state.gameState;
  if (!gs) return null;

  const myIdx = state.isSpectator ? 0 : (state.playerIndex ?? 0);
  const oppIdx = myIdx === 0 ? 1 : 0;
  const isMyTurn = gs.activePlayerIndex === myIdx;
  const phaseTone = getPhaseTone(gs.phase);
  const activePlayerName =
    gs.players[gs.activePlayerIndex]?.player.name ?? `P${gs.activePlayerIndex + 1}`;
  const turnStatus = state.isSpectator
    ? `LIVE: ${activePlayerName}`
    : isMyTurn
      ? 'YOUR_TURN'
      : 'OPPONENT_THINKING...';

  return (
    <div
      class="phx-game-layout"
      data-testid="game-layout"
      data-phase={gs.phase}
      data-phase-tone={phaseTone}
      data-match-id={state.matchId ?? undefined}
      data-spectator={state.isSpectator ? 'true' : undefined}
    >
      <header class="phx-hud-top">
        <div class="phx-match-meta">
          <div style="display: flex; gap: 8px; align-items: center">
            <button
              id="phx-game-help-btn"
              class="btn btn-secondary btn-tiny"
              style="padding: 2px 8px; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: 900; background: rgba(0,0,0,0.3)"
              onClick={() => {
                setHelpOpen(true);
              }}
            >
              ?
            </button>
            <span style="font-weight: 900; color: var(--gold)">T{gs.turnNumber}</span>
          </div>
          {state.isSpectator && (
            <span class="phx-spectator-pill" data-testid="spectator-banner">
              SPECTATOR_STREAM
            </span>
          )}
          <span class="spectator-count" data-testid="spectator-count">
            {state.spectatorCount > 0 ? `${state.spectatorCount} watching` : ''}
          </span>
        </div>
        <div
          class={`phx-turn-status ${isMyTurn && !state.isSpectator ? 'color-gold status-my-turn' : 'status-opp-turn'} ${state.isSpectator ? 'status-spectator' : ''}`}
          style="font-weight: 900; letter-spacing: 0.1em"
          data-testid="turn-indicator"
        >
          {turnStatus}
        </div>
      </header>

      <CombatFeedbackBanner gs={gs} />

      <div class="phx-main-content">
        <section class="phx-opponent-zone">
          <div class="phx-zone-label">{gs.players[oppIdx]?.player.name}</div>
          <PhxBattlefield gs={gs} playerIdx={oppIdx} state={state} isOpponent={true} />
        </section>

        <div class="phx-divider">
          <PhxStatsHorizontal gs={gs} playerIdx={oppIdx} label="HOSTILE" isOpponent={true} />
          <div
            id="phx-phase-indicator"
            key={gs.phase}
            class="phx-phase-announcement"
            data-testid="phase-indicator"
            data-phase={gs.phase}
            data-phase-tone={phaseTone}
          >
            {getPhaseLabel(gs)}
          </div>
          <PhxStatsHorizontal gs={gs} playerIdx={myIdx} label="OPERATIVE" isOpponent={false} />
        </div>

        <section class="phx-player-zone">
          <PhxBattlefield gs={gs} playerIdx={myIdx} state={state} isOpponent={false} />
          <div class="phx-zone-label">{gs.players[myIdx]?.player.name}</div>
        </section>
      </div>

      <PhxInfoBar gs={gs} state={state} myIdx={myIdx} />
      <PhxSidebar gs={gs} state={state} />

      <OnboardingBriefing
        phase={gs.phase}
        gameState={gs}
        isSpectator={state.isSpectator}
        onClose={() => {}}
      />

      {helpOpen && (
        <HelpDialog
          topicId={gs.phase === 'DeploymentPhase' ? 'deployment' : 'combat'}
          onClose={() => {
            setHelpOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function getBaseStats(
  gs: GameState,
  playerIndex: number,
): { label: string; value: string | number }[] {
  const ps = gs.players[playerIndex];
  if (!ps) return [];

  const stats: { label: string; value: string | number }[] = [
    { label: 'LP', value: ps.lifepoints },
    { label: 'Hand', value: ps.hand.length || (ps.handCount ?? 0) },
    { label: 'Deck', value: ps.drawpile.length || (ps.drawpileCount ?? 0) },
    { label: 'GY', value: ps.discardPile.length || (ps.discardPileCount ?? 0) },
  ];

  if (gs.passState) {
    const consecutive = gs.passState.consecutivePasses[playerIndex] ?? 0;
    const total = gs.passState.totalPasses[playerIndex] ?? 0;
    if (consecutive > 0 || total > 0) {
      stats.push({
        label: 'Pass',
        value: `${consecutive}/${total}` as string | number,
      });
    }
  }

  return stats;
}

export function renderGame(container: HTMLElement, state: AppState): void {
  preactRender(<GameApp state={state} />, container);
}
