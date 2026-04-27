import { useEffect, useState } from 'preact/hooks';

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

export function MatchHistory() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && matches.length === 0) {
      setLoading(true);
      fetch('/matches/completed')
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<MatchSummary[]>;
        })
        .then((data) => {
          setMatches(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        });
    }
  }, [isOpen, matches.length]);

  return (
    <div style="margin-top: 1rem">
      <button
        class="btn btn-secondary phx-match-history-btn"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        MATCH_HISTORY {isOpen ? '\u25B4' : '\u25BE'}
      </button>

      <div
        class={`hud-panel phx-history-list ${isOpen ? 'is-open' : ''}`}
        style={{ marginTop: '1rem', display: isOpen ? 'block' : 'none' }}
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem">
          <h3
            class="section-label"
            style="margin-bottom: 0; display: flex; align-items: center; gap: 8px;"
          >
            CHRONICLE_VIEW <span class="phx-beta-tag">BETA</span>
          </h3>
          <button
            class="btn btn-tiny"
            onClick={() => {
              setIsOpen(false);
            }}
          >
            CLOSE
          </button>
        </div>

        {loading && (
          <div style="opacity: 0.5; font-family: var(--font-mono); font-size: 0.8rem">
            CHRONICLING_DATA...
          </div>
        )}
        {error && (
          <div style="color: var(--neon-red); font-family: var(--font-mono)">ERROR: {error}</div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div style="opacity: 0.3; font-style: italic; font-size: 0.8rem">
            No completed engagements found.
          </div>
        )}

        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
          {matches.map((match) => {
            const players = match.playerNames.join(' vs ');
            const winner =
              match.playerNames[match.winnerIndex] ?? `Player ${match.winnerIndex + 1}`;
            const outcome = VICTORY_LABELS[match.victoryType] ?? match.victoryType;

            return (
              <div
                key={match.matchId}
                class="phx-log-entry"
                data-testid="match-row"
                style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 8px; border-left: 1px solid var(--gold-dim)"
              >
                <div style="display: flex; flex-direction: column; gap: 2px">
                  <div style="font-size: 0.85rem; color: #fff">{players}</div>
                  <div style="font-size: 0.65rem; color: var(--text-dim)">
                    {formatDate(match.completedAt)} \u00B7 {winner} WIN ({outcome.toUpperCase()})
                  </div>
                </div>
                <a
                  href={`/matches/${match.matchId}/log`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="match-log-link"
                  class="btn btn-tiny"
                  style="padding: 4px 8px; font-size: 0.6rem"
                >
                  LOG
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
