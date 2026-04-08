import type { GameState, VictoryType } from '@phalanxduel/shared';
import type { AppState } from './state';
import { resetToLobby } from './state';
import { el } from './renderer';

function getLifepoints(gs: GameState, playerIdx: number): number {
  return gs.players[playerIdx]?.lifepoints ?? 20;
}

const VICTORY_DESCRIPTIONS: Record<VictoryType, { win: string; lose: string }> = {
  lpDepletion: {
    win: 'the opponent’s life points reached zero',
    lose: 'your life points reached zero',
  },
  cardDepletion: {
    win: 'the opponent could not deploy another card',
    lose: 'you could not deploy another card',
  },
  forfeit: {
    win: 'the opponent conceded',
    lose: 'you conceded',
  },
  passLimit: {
    win: 'the opponent exceeded the pass limit',
    lose: 'you exceeded the pass limit',
  },
};

function describeOutcomeSummary(
  outcome: GameState['outcome'] | null,
  playerIndex: number | null,
  gs: GameState | null,
): string {
  if (!outcome) {
    return 'Match completed.';
  }
  const turnText = `Turn ${outcome.turnNumber + 1}`;
  if (playerIndex !== null) {
    const isWinner = playerIndex === outcome.winnerIndex;
    const descriptions = VICTORY_DESCRIPTIONS[outcome.victoryType];
    const description = isWinner ? descriptions.win : descriptions.lose;
    const perspective = isWinner ? 'You won by ' : 'Opponent won by ';
    return `${perspective}${description} on ${turnText}.`;
  }

  const winnerIndex = outcome.winnerIndex;
  const winnerName = gs?.players[winnerIndex]?.player.name ?? `Player ${winnerIndex + 1}`;
  const descriptions = VICTORY_DESCRIPTIONS[outcome.victoryType];
  const description = descriptions.win.replace('the opponent', 'their opponent');
  return `${winnerName} won because ${description} on ${turnText}.`;
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
      const iWin = state.playerIndex !== null && outcome.winnerIndex === state.playerIndex;
      const victoryLabels: Record<VictoryType, string> = {
        lpDepletion: 'Life Point Depletion',
        cardDepletion: 'Unit Depletion',
        forfeit: iWin ? 'Opponent Forfeit' : 'You Forfeited',
        passLimit: 'Pass Limit Exceeded',
      };
      const detail = el('p', 'victory-detail');
      detail.textContent = `${victoryLabels[outcome.victoryType]} on Turn ${outcome.turnNumber + 1}`;
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
    const summary = el('p', 'game-over-summary');
    summary.textContent = describeOutcomeSummary(outcome, state.playerIndex, gs);
    wrapper.appendChild(summary);
  }

  const playAgainBtn = el('button', 'btn btn-primary');
  playAgainBtn.textContent = 'Play Again';
  playAgainBtn.setAttribute('data-testid', 'play-again-btn');
  playAgainBtn.addEventListener('click', resetToLobby);
  wrapper.appendChild(playAgainBtn);

  if (state.matchId) {
    const logLink = el('a', 'btn btn-secondary view-log-link') as HTMLAnchorElement;
    logLink.href = `/matches/${state.matchId}/log`;
    logLink.target = '_blank';
    logLink.rel = 'noopener noreferrer';
    logLink.textContent = 'View Match Log';
    logLink.setAttribute('data-testid', 'view-log-link');
    wrapper.appendChild(logLink);
  }

  container.appendChild(wrapper);
}
