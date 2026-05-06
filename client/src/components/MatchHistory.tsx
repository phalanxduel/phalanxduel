import { useEffect, useRef, useState } from 'preact/hooks';

interface MatchEntry {
  matchId: string;
  player1Name: string | null;
  player2Name: string | null;
  player1Id: string | null;
  player2Id: string | null;
  winnerName: string | null;
  totalTurns: number | null;
  isPvP: boolean;
  humanPlayerCount: number;
  completedAt: string;
  durationMs: number | null;
}

interface MatchHistoryPage {
  matches: MatchEntry[];
  total: number;
  page: number;
  pageSize: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number | null): string {
  if (!ms) return '';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

interface Props {
  userId?: string | null;
  token?: string | null;
  onRewatch?: (matchId: string) => void;
  onOpenProfile?: (userId: string) => void;
}

export function MatchHistory({ userId, token, onRewatch, onOpenProfile }: Props) {
  const [data, setData] = useState<MatchHistoryPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || loadedRef.current) return;
    if (!userId) return;

    loadedRef.current = true;
    setLoading(true);

    const params = new URLSearchParams({ playerId: userId, pageSize: '10' });
    fetch(`/api/matches/history?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MatchHistoryPage>;
      })
      .then((page) => {
        setData(page);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [isOpen, userId, token]);

  const handleToggle = () => {
    setIsOpen((v) => !v);
  };

  return (
    <div style="margin-top: 1rem">
      <button class="btn btn-secondary phx-match-history-btn" onClick={handleToggle}>
        MATCH_HISTORY {isOpen ? '▴' : '▾'}
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

        {!userId && (
          <div style="opacity: 0.4; font-family: var(--font-mono); font-size: 0.8rem">
            REGISTER_OR_LOGIN to view your match history.
          </div>
        )}

        {userId && loading && (
          <div style="opacity: 0.5; font-family: var(--font-mono); font-size: 0.8rem">
            CHRONICLING_DATA...
          </div>
        )}
        {userId && error && (
          <div style="color: var(--neon-red); font-family: var(--font-mono)">ERROR: {error}</div>
        )}

        {userId && !loading && !error && data?.matches.length === 0 && (
          <div style="opacity: 0.3; font-style: italic; font-size: 0.8rem">
            No completed engagements found.
          </div>
        )}

        {userId && data && data.matches.length > 0 && (
          <>
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
              {data.matches.map((match) => {
                const winner = match.winnerName ?? '—';
                const duration = formatDuration(match.durationMs);

                const renderName = (name: string | null, id: string | null) => {
                  if (!name) return 'Unknown';
                  if (!id || !onOpenProfile) return name;
                  return (
                    <button
                      class="btn-text"
                      style="color: var(--neon-blue); text-decoration: underline; cursor: pointer; padding: 0; background: none; border: none; font-family: inherit; font-size: inherit;"
                      onClick={() => {
                        onOpenProfile(id);
                      }}
                    >
                      {name}
                    </button>
                  );
                };

                return (
                  <div
                    key={match.matchId}
                    class="phx-log-entry"
                    data-testid="match-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '8px',
                      borderLeft: match.isPvP
                        ? '2px solid var(--neon-blue)'
                        : '2px solid var(--gold-dim)',
                    }}
                  >
                    <div style="display: flex; flex-direction: column; gap: 2px">
                      <div style="font-size: 0.85rem; color: #fff">
                        {match.isPvP ? '⚔️ ' : '🤖 '}
                        {renderName(match.player1Name, match.player1Id)} vs{' '}
                        {renderName(match.player2Name, match.player2Id)}
                      </div>
                      <div style="font-size: 0.65rem; color: var(--text-dim)">
                        {formatDate(match.completedAt)}
                        {duration ? ` · ${duration}` : ''}
                        {match.totalTurns ? ` · ${match.totalTurns} turns` : ''}
                        {` · Winner: ${winner}`}
                      </div>
                    </div>
                    {onRewatch && (
                      <button
                        class="btn btn-tiny"
                        style="padding: 4px 8px; font-size: 0.6rem"
                        data-testid="match-rewatch-btn"
                        onClick={() => {
                          onRewatch(match.matchId);
                        }}
                      >
                        REWATCH
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {data.total > data.pageSize && (
              <div style="margin-top: 8px; font-size: 0.65rem; opacity: 0.4; text-align: right">
                Showing {data.matches.length} of {data.total} matches
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
