import type { GameState } from '@phalanxduel/shared';
import type { AppState } from './state';
import { resetToLobby } from './state';
import { el } from './renderer';

function getLifepoints(gs: GameState, playerIdx: number): number {
  return gs.players[playerIdx]?.lifepoints ?? 20;
}

export function renderGameOver(container: HTMLElement, state: AppState): void {
  const wrapper = el('div', 'game-over');
  wrapper.setAttribute('data-testid', 'game-over');

  const title = el('h1', 'title');
  title.textContent = 'Game Over';
  wrapper.appendChild(title);

  if (state.gameState) {
    const gs = state.gameState;
    const outcome = gs.outcome;

    const result = el('h2', 'result');
    result.setAttribute('data-testid', 'game-over-result');
    if (outcome) {
      if (state.playerIndex !== null) {
        const iWin = outcome.winnerIndex === state.playerIndex;
        result.textContent = iWin ? 'You Win!' : 'You Lose';
        result.classList.add(iWin ? 'win' : 'lose');
      } else {
        const winnerName =
          gs.players[outcome.winnerIndex]?.player.name ?? `Player ${outcome.winnerIndex + 1}`;
        result.textContent = `${winnerName} Wins!`;
      }
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
    const p0Lp = getLifepoints(gs, 0);
    const p1Lp = getLifepoints(gs, 1);
    if (state.playerIndex !== null) {
      const myLp = state.playerIndex === 0 ? p0Lp : p1Lp;
      const oppLp = state.playerIndex === 0 ? p1Lp : p0Lp;
      lpSummary.textContent = `Your LP: ${myLp} | Opponent LP: ${oppLp}`;
    } else {
      const p0Name = gs.players[0]?.player.name ?? 'Player 1';
      const p1Name = gs.players[1]?.player.name ?? 'Player 2';
      lpSummary.textContent = `${p0Name}: ${p0Lp} LP | ${p1Name}: ${p1Lp} LP`;
    }
    wrapper.appendChild(lpSummary);
  }

  const playAgainBtn = el('button', 'btn btn-primary');
  playAgainBtn.textContent = 'Play Again';
  playAgainBtn.setAttribute('data-testid', 'play-again-btn');
  playAgainBtn.addEventListener('click', resetToLobby);
  wrapper.appendChild(playAgainBtn);

  container.appendChild(wrapper);
}
