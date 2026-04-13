import { render as preactRender } from 'preact';
import { useState } from 'preact/hooks';
import type { GameState, Card, CombatLogEntry, BattlefieldCard, Action } from '@phalanxduel/shared';
import type { AppState } from './state';
import {
  selectAttacker,
  selectDeployCard,
  clearSelection,
  toggleHelp,
  startActionTimeout,
} from './state';
import { getConnection } from './renderer';
import { HealthBadge } from './components/HealthBadge';
import { CopyButton } from './components/CopyButton';
import { cardLabel, suitColor, suitSymbol, isFace } from './cards';
import { HUD_PHASE_LABELS } from './constants';

function getPhaseLabel(gs: GameState): string {
  if (gs.phase === 'ReinforcementPhase') {
    return `REINFORCE COL ${(gs.reinforcement?.column ?? 0) + 1}`;
  }
  return HUD_PHASE_LABELS[gs.phase] || gs.phase;
}

function V2Card({
  card,
  bCard,
  testId,
  isSelected,
  isValidTarget,
  isPlayable,
  isReinforcePlayable,
  isReinforceCol,
  onClick,
}: {
  card?: Card;
  bCard?: BattlefieldCard;
  testId?: string;
  isSelected?: boolean;
  isValidTarget?: boolean;
  isPlayable?: boolean;
  isReinforcePlayable?: boolean;
  isReinforceCol?: boolean;
  onClick?: () => void;
}) {
  const actualCard = bCard?.card ?? card;
  if (!actualCard) {
    return (
      <div
        class={`v2-card empty ${isReinforceCol ? 'is-reinforce-col' : ''} ${
          isValidTarget ? 'valid-target' : ''
        }`}
        data-testid={testId}
        onClick={onClick}
      />
    );
  }

  const color = suitColor(actualCard.suit);
  const classes = ['v2-card'];
  if (isSelected) classes.push('selected');
  if (isValidTarget) classes.push('valid-target');
  if (isPlayable) classes.push('playable');
  if (isReinforcePlayable) classes.push('reinforce-playable');
  if (isFace(actualCard)) classes.push('is-face');

  // Specific accents
  classes.push(`rank-${actualCard.face.toLowerCase()}`);
  classes.push(`type-${actualCard.type.toLowerCase()}`);

  // Animation and Visual classes
  classes.push(`pz-aura-${actualCard.suit}`);
  if (isPlayable || isValidTarget) classes.push('pz-active-pulse');

  // Legacy compatibility classes for bot scripts
  if (isSelected) classes.push('active-attacker');

  return (
    <div class={classes.join(' ')} data-testid={testId} onClick={onClick}>
      <div class="v2-card-rank" style={{ color }}>
        {actualCard.face}
      </div>
      <div class="v2-card-suit" style={{ color }}>
        {suitSymbol(actualCard.suit)}
      </div>
      <div class="v2-card-type">{actualCard.type}</div>
      {bCard && (
        <div class="v2-card-hp-container">
          <div
            class="v2-card-hp-bar"
            style={{
              width: `${(bCard.currentHp / actualCard.value) * 100}%`,
              backgroundColor: color,
            }}
          />
          <div class="v2-card-hp-text">
            {bCard.currentHp}/{actualCard.value}
          </div>
        </div>
      )}
    </div>
  );
}

function V2Battlefield({
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
      class="v2-battlefield"
      data-testid={`${isOpponent ? 'opponent' : 'player'}-battlefield`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {rowOrder.map((row) =>
        Array.from({ length: columns }, (_, col) => {
          const pos = { row, col };
          const bCard = battlefield[row * columns + col];

          const isSelected =
            !isOpponent &&
            state.selectedAttacker?.row === row &&
            state.selectedAttacker?.col === col;

          const isTargetable =
            isOpponent &&
            !!state.selectedAttacker &&
            state.validActions.some(
              (a) =>
                a.type === 'attack' &&
                a.attackingColumn === state.selectedAttacker?.col &&
                a.defendingColumn === col,
            );

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

          const onClick = () => {
            if (isTargetable)
              sendAction(state, {
                type: 'attack',
                playerIndex: state.playerIndex!,
                attackingColumn: state.selectedAttacker!.col,
                defendingColumn: col,
                timestamp: new Date().toISOString(),
              });
            else if (
              !isOpponent &&
              bCard &&
              row === 0 &&
              state.validActions.some((a) => a.type === 'attack' && a.attackingColumn === col)
            ) {
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
            <V2Card
              key={`${row}-${col}`}
              bCard={bCard || undefined}
              testId={`${isOpponent ? 'opponent' : 'player'}-cell-r${row}-c${col}`}
              isSelected={isSelected}
              isValidTarget={!!(isTargetable || isDeployable || isReinforceable)}
              isReinforceCol={isReinforcementCol}
              onClick={onClick}
            />
          );
        }),
      )}
    </div>
  );
}

function V2InfoBar({ gs, state, myIdx }: { gs: GameState; state: AppState; myIdx: number }) {
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
    <div class="v2-hud-bottom">
      <div class="v2-hud-bottom-content">
        <div class="section-label v2-label-rotated">COMMAND_CONSOLE</div>

        <div class="v2-hud-bottom-main">
          {!state.isSpectator && (
            <div class="v2-hand-container" data-testid="hand-container">
              <div class="v2-hand" data-testid="hand">
                {gs.players[myIdx]?.hand.map((card, i) => (
                  <V2Card
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
                <div class={`v2-command-drawer ${isDrawerOpen ? 'is-open' : ''}`}>
                  <button
                    class="v2-drawer-handle"
                    onClick={() => {
                      setIsDrawerOpen(!isDrawerOpen);
                    }}
                    title="Toggle Commands"
                  >
                    {isDrawerOpen ? ' \u276F ' : ' \u276E '}
                  </button>

                  <div class="v2-drawer-content">
                    {canCancel && (
                      <button
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
                        class="btn btn-primary"
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
                        class="btn btn-danger"
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

function V2Sidebar({ gs, state }: { gs: GameState; state: AppState }) {
  const myIdx = state.playerIndex ?? 0;
  const oppIdx = myIdx === 0 ? 1 : 0;

  const entries: CombatLogEntry[] = (gs.transactionLog ?? [])
    .filter((e) => e.details.type === 'attack')
    .map((e) => (e.details as { type: 'attack'; combat: CombatLogEntry }).combat);

  return (
    <aside class="v2-sidebar">
      <div class="v2-stats-block">
        <HealthBadge gs={gs} playerIndex={oppIdx} label="HOSTILE" />
        <div style="height: 12px" />
        <HealthBadge gs={gs} playerIndex={myIdx} label="OPERATIVE" />
      </div>

      <div class="v2-log">
        <div class="section-label">ENGAGEMENT_LOG</div>
        {entries.length === 0 && (
          <div style="opacity: 0.3; font-style: italic; margin-top: 1rem;">
            No combat data recorded...
          </div>
        )}
        {entries
          .slice(-20)
          .reverse()
          .map((entry, i) => (
            <div key={i} class="v2-log-entry">
              <span style="color: var(--gold)">T{entry.turnNumber}</span>:{' '}
              {cardLabel(entry.attackerCard)} ATK COL {entry.targetColumn + 1}
            </div>
          ))}
      </div>

      <div class="v2-stats-block" style="border-top: 1px solid var(--border); margin-top: auto;">
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

function V2StatsHorizontal({
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
      class={`v2-stats-horizontal ${isOpponent ? 'is-opponent' : 'is-player'}`}
      data-testid={`${isOpponent ? 'opponent' : 'player'}-stats`}
    >
      <span class="v2-stats-label">{label}</span>
      {stats.map((s) => (
        <span key={s.label} class="v2-stat-item">
          <span class="v2-stat-key">{s.label}</span>
          <span class="v2-stat-val">{s.value}</span>
        </span>
      ))}
    </div>
  );
}

function GameApp({ state }: { state: AppState }) {
  const gs = state.gameState;
  if (!gs) return null;

  const myIdx = state.isSpectator ? 0 : (state.playerIndex ?? 0);
  const oppIdx = myIdx === 0 ? 1 : 0;
  const isMyTurn = gs.activePlayerIndex === myIdx;

  return (
    <div class="v2-game-layout" data-testid="game-layout">
      <header class="v2-hud-top">
        <div class="v2-match-meta">
          <span style="font-weight: 900; color: var(--gold)">T{gs.turnNumber}</span>
        </div>
        <div
          class={`v2-turn-status ${isMyTurn ? 'color-gold status-my-turn' : 'status-opp-turn'}`}
          style="font-weight: 900; letter-spacing: 0.1em"
          data-testid="turn-indicator"
        >
          {isMyTurn ? 'YOUR_TURN' : 'OPPONENT_THINKING...'}
        </div>
      </header>

      <div class="v2-main-content">
        <section class="v2-opponent-zone">
          <div class="v2-zone-label">{gs.players[oppIdx]?.player.name}</div>
          <V2Battlefield gs={gs} playerIdx={oppIdx} state={state} isOpponent={true} />
        </section>

        <div class="v2-divider">
          <V2StatsHorizontal gs={gs} playerIdx={oppIdx} label="HOSTILE" isOpponent={true} />
          <div class="v2-phase-announcement" data-testid="phase-indicator">
            {getPhaseLabel(gs)}
          </div>
          <V2StatsHorizontal gs={gs} playerIdx={myIdx} label="OPERATIVE" isOpponent={false} />
        </div>

        <section class="v2-player-zone">
          <V2Battlefield gs={gs} playerIdx={myIdx} state={state} isOpponent={false} />
          <div class="v2-zone-label">{gs.players[myIdx]?.player.name}</div>
        </section>
      </div>

      <V2InfoBar gs={gs} state={state} myIdx={myIdx} />
      <V2Sidebar gs={gs} state={state} />
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

export function renderGamePreact(container: HTMLElement, state: AppState): void {
  preactRender(<GameApp state={state} />, container);
}
