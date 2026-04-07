import { render as preactRender } from 'preact';
import type { GameState } from '@phalanxduel/shared';
import type { AppState } from './state';
import { resetToLobby } from './state';

function getLifepoints(gs: GameState, playerIdx: number): number {
  return gs.players[playerIdx]?.lifepoints ?? 20;
}

function OutcomeDetails({ outcome }: { outcome: NonNullable<GameState['outcome']> }) {
  const victoryLabels: Record<string, string> = {
    lpDepletion: 'LP Depletion',
    cardDepletion: 'Card Depletion',
    forfeit: 'Forfeit',
  };
  return (
    <p class="lp-summary">
      {victoryLabels[outcome.victoryType] ?? outcome.victoryType} on turn {outcome.turnNumber}
    </p>
  );
}

function LpSummary({ state, gs }: { state: AppState; gs: GameState }) {
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

function GameOverApp({ state }: { state: AppState }) {
  const gs = state.gameState;
  const outcome = gs?.outcome;

  let resultText = 'Game Over';
  let resultClass = '';

  if (gs && outcome) {
    if (state.playerIndex !== null) {
      const iWin = outcome.winnerIndex === state.playerIndex;
      resultText = iWin ? 'You Win!' : 'You Lose';
      resultClass = iWin ? 'win' : 'lose';
    } else {
      const winnerName =
        gs.players[outcome.winnerIndex]?.player.name ?? `Player ${outcome.winnerIndex + 1}`;
      resultText = `${winnerName} Wins!`;
    }
  }

  return (
    <div class="game-over" data-testid="game-over">
      <h1 class="title">Engagement Terminated</h1>
      <h2 class={`result ${resultClass}`} data-testid="game-over-result">
        {resultText}
      </h2>
      {outcome && <OutcomeDetails outcome={outcome} />}
      {gs && <LpSummary state={state} gs={gs} />}
      <button
        type="button"
        class="btn btn-primary"
        data-testid="play-again-btn"
        onClick={resetToLobby}
      >
        Play Again
      </button>
    </div>
  );
}

export function renderGameOverPreact(container: HTMLElement, state: AppState): void {
  preactRender(<GameOverApp state={state} />, container);
}
