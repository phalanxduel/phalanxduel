import { render as preactRender } from 'preact';
import type { GameState } from '@phalanxduel/shared';
import type { AppState, BaseState, ScreenState } from './state';
import { resetToLobby } from './state';
import { CopyButton } from './components/CopyButton';
import { selectTurningPoint } from '@phalanxduel/shared';
import { formatShareText } from './ux-derivations';
import { CombatMath } from './components/CombatMath';

type GameOverScreenState = BaseState & Extract<ScreenState, { screen: 'gameOver' }>;

function getLifepoints(gs: GameState, playerIdx: number): number {
  return gs.players[playerIdx]?.lifepoints ?? 20;
}

function OutcomeDetails({ outcome }: { outcome: NonNullable<GameState['outcome']> }) {
  const victoryLabels: Record<string, string> = {
    lpDepletion: 'LP Depletion',
    cardDepletion: 'Card Depletion',
    passLimit: 'Pass Limit Exceeded',
    forfeit: 'Forfeit',
    repetitionDraw: 'Threefold Repetition',
    noProgressDraw: 'No-Progress Limit',
    turnLimitDraw: 'Hard Turn Limit',
  };
  return (
    <p class="lp-summary">
      {victoryLabels[outcome.victoryType] ?? outcome.victoryType} on turn {outcome.turnNumber}
    </p>
  );
}

function LpSummary({ state, gs }: { state: GameOverScreenState; gs: GameState }) {
  const p0Lp = getLifepoints(gs, 0);
  const p1Lp = getLifepoints(gs, 1);
  const p0Name = gs.players[0]?.player.name ?? 'Player 1';
  const p1Name = gs.players[1]?.player.name ?? 'Player 2';
  const text =
    state.playerIndex !== null
      ? `Your LP: ${state.playerIndex === 0 ? p0Lp : p1Lp} | Opponent LP: ${
          state.playerIndex === 0 ? p1Lp : p0Lp
        }`
      : `${p0Name}: ${p0Lp} LP | ${p1Name}: ${p1Lp} LP`;
  return <p class="lp-summary">{text}</p>;
}

function TurningPointCard({ gs }: { gs: GameState }) {
  const turningPoint = selectTurningPoint(gs);
  const turningPointAttack = turningPoint
    ? gs.transactionLog?.find(
        (entry) =>
          entry.details.type === 'attack' &&
          entry.details.combat.turnNumber === turningPoint.turnNumber,
      )
    : undefined;
  const provenance =
    turningPointAttack?.details.type === 'attack'
      ? turningPointAttack.details.combat.calculationProvenance
      : undefined;

  if (!turningPoint) {
    return (
      <div class="game-over-summary" data-testid="turning-point-summary">
        TURNING_POINT
        <div class="turning-point-line">No combat turn data was recorded.</div>
      </div>
    );
  }

  return (
    <div class="game-over-summary" data-testid="turning-point-summary">
      <div class="turning-point-kicker">TURNING_POINT</div>
      <div class="turning-point-line">
        Turn {turningPoint.turnNumber} — {turningPoint.label}
      </div>
      <div class="turning-point-block">
        <div class="turning-point-label">WHY</div>
        <div>{turningPoint.why}</div>
      </div>
      <CombatMath provenance={provenance} context="postmatch" label="PROOF OF DAMAGE" />
      <div class="turning-point-block">
        <div class="turning-point-label">RESULT</div>
        <div>{turningPoint.result}</div>
      </div>
    </div>
  );
}

function MatchStats({ gs, winnerIndex }: { gs: GameState; winnerIndex: number | null }) {
  if (!gs.transactionLog || gs.transactionLog.length === 0) return null;

  let longestCombo = 0;
  let totalDamage = 0;
  const cardDamageMap = new Map<string, number>();

  for (const entry of gs.transactionLog) {
    if (entry.details.type === 'attack') {
      const combat = entry.details.combat;
      // Track max combo
      if (combat.comboCount && combat.comboCount > longestCombo) {
        longestCombo = combat.comboCount;
      }

      // If we have a winner, only track their stats for MVP and total damage
      if (winnerIndex === null || combat.attackerPlayerIndex === winnerIndex) {
        totalDamage += combat.totalLpDamage;
        const cardName = `${combat.attackerCard.face} of ${combat.attackerCard.suit}`;
        cardDamageMap.set(cardName, (cardDamageMap.get(cardName) ?? 0) + combat.totalLpDamage);
      }
    }
  }

  let mvpCard = 'None';
  let maxCardDamage = -1;
  for (const [cardName, dmg] of cardDamageMap.entries()) {
    if (dmg > maxCardDamage) {
      maxCardDamage = dmg;
      mvpCard = cardName;
    }
  }

  return (
    <div class="game-over-summary match-stats-grid" data-testid="match-stats">
      <div class="turning-point-kicker">MATCH STATISTICS</div>
      <div class="match-stats-row">
        <div class="turning-point-label">TOTAL DAMAGE</div>
        <div class="turning-point-line">{totalDamage} LP</div>
      </div>
      <div class="match-stats-row">
        <div class="turning-point-label">LONGEST COMBO</div>
        <div class="turning-point-line">{longestCombo}x</div>
      </div>
      <div class="match-stats-row">
        <div class="turning-point-label">MVP CARD</div>
        <div class="turning-point-line">{mvpCard}</div>
      </div>
    </div>
  );
}

function GameOverApp({ state }: { state: AppState }) {
  if (state.screen !== 'gameOver') return null;
  const gs = state.gameState;
  const outcome = gs?.outcome;

  let resultText = 'Game Over';
  let resultClass = '';
  let winnerIndex: number | null = null;

  if (gs && outcome) {
    winnerIndex = outcome.winnerIndex;
    if (winnerIndex === null) {
      resultText = 'Draw';
      resultClass = 'draw';
    } else if (state.playerIndex !== null) {
      const iWin = winnerIndex === state.playerIndex;
      resultText = iWin ? 'You Win!' : 'You Lose';
      resultClass = iWin ? 'win' : 'lose';
    } else {
      const winnerName = gs.players[winnerIndex]?.player.name ?? `Player ${winnerIndex + 1}`;
      resultText = `${winnerName} Wins!`;
    }
  }

  return (
    <div class="game-over" data-testid="game-over" data-component="GameOverView">
      <div class="game-over-panel">
        <h1 class="title">Engagement Terminated</h1>
        <h2 class={`result ${resultClass}`} data-testid="game-over-result">
          {resultText}
        </h2>
        {outcome && <OutcomeDetails outcome={outcome} />}
        {gs && <LpSummary state={state} gs={gs} />}
        {gs && <MatchStats gs={gs} winnerIndex={winnerIndex} />}
        {gs && <TurningPointCard gs={gs} />}
        {gs && (
          <CopyButton
            label="COPY_RESULT"
            className="btn btn-primary"
            getValue={() =>
              formatShareText(gs, selectTurningPoint(gs), window.location.href, state.playerIndex)
            }
          />
        )}
        <button
          type="button"
          class="btn btn-primary"
          data-testid="play-again-btn"
          onClick={resetToLobby}
        >
          Play Again
        </button>
      </div>
    </div>
  );
}

export function renderGameOver(container: HTMLElement, state: AppState): void {
  preactRender(<GameOverApp state={state} />, container);
}
