import { el } from './renderer';

interface MatchSummary {
  matchId: string;
  playerNames: string[];
  winnerIndex: number;
  victoryType: string;
  turnCount: number;
  completedAt: string;
}

const VICTORY_LABELS: Record<string, string> = {
  lpDepletion: 'LP Depletion',
  cardDepletion: 'Card Depletion',
  forfeit: 'Forfeit',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function clearContainer(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function renderRow(match: MatchSummary): HTMLElement {
  const row = el('div', 'match-row');
  row.setAttribute('data-testid', 'match-row');

  const players = match.playerNames.join(' vs ');
  const winner = match.playerNames[match.winnerIndex] ?? `Player ${match.winnerIndex + 1}`;
  const outcome = VICTORY_LABELS[match.victoryType] ?? match.victoryType;

  const info = el('span', 'match-info');
  info.textContent = `${formatDate(match.completedAt)} · ${players} · ${winner} wins (${outcome}) · ${match.turnCount} turns`;
  row.appendChild(info);

  const link = el('a', 'btn btn-secondary match-log-link') as HTMLAnchorElement;
  link.href = `/matches/${match.matchId}/log`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'View Log';
  link.setAttribute('data-testid', 'match-log-link');
  row.appendChild(link);

  return row;
}

export function renderMatchHistory(container: HTMLElement): void {
  clearContainer(container);

  const loading = el('p', 'match-history-loading');
  loading.textContent = 'Loading past games\u2026';
  container.appendChild(loading);

  fetch('/matches/completed')
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<MatchSummary[]>;
    })
    .then((matches) => {
      clearContainer(container);
      if (matches.length === 0) {
        const empty = el('p', 'match-history-empty');
        empty.textContent = 'No completed matches yet.';
        container.appendChild(empty);
        return;
      }
      for (const match of matches) {
        container.appendChild(renderRow(match));
      }
    })
    .catch(() => {
      clearContainer(container);
      const err = el('p', 'match-history-error');
      err.textContent = 'Failed to load match history.';
      container.appendChild(err);
    });
}
