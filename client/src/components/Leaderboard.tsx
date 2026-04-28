import { useState, useEffect } from 'preact/hooks';
import { setScreen, setProfileId } from '../state';

interface LeaderboardEntry {
  rank: number;
  userId?: string;
  gamertag: string;
  elo: number;
  matches: number;
  wins: number;
}

interface LeaderboardData {
  rankings: LeaderboardEntry[];
}

const categories = [
  { key: 'pvp', label: 'PvP' },
  { key: 'sp-random', label: 'vs AI (Easy)' },
  { key: 'sp-heuristic', label: 'vs AI (Med)' },
];

export function Leaderboard() {
  const [activeCategory, setActiveCategory] = useState('pvp');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/ladder/${activeCategory}`)
      .then((res) => {
        if (!res.ok) throw new Error('Leaderboard unavailable');
        return res.json();
      })
      .then((json) => {
        setData(json as LeaderboardData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load leaderboard');
        setLoading(false);
      });
  }, [activeCategory]);

  return (
    <div class="leaderboard">
      <h2 class="section-label" style="display: flex; align-items: center; gap: 8px;">
        ELO_LEADERBOARD <span class="phx-beta-tag">BETA</span>
      </h2>
      <div class="leaderboard-tabs">
        {categories.map((cat) => (
          <button
            key={cat.key}
            class={`leaderboard-tab ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory(cat.key);
            }}
            data-testid={`leaderboard-tab-${cat.key}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div class="leaderboard-body" data-testid="leaderboard-body">
        {loading ? (
          <p class="leaderboard-empty">SYNCHRONIZING...</p>
        ) : error ? (
          <p class="leaderboard-empty" style="color: var(--neon-red)">
            {error}
          </p>
        ) : !data?.rankings || data.rankings.length === 0 ? (
          <p class="leaderboard-empty">NO_RANKED_DATA_FOUND</p>
        ) : (
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>OPERATIVE</th>
                <th>ELO</th>
                <th>W</th>
                <th>L</th>
              </tr>
            </thead>
            <tbody>
              {data?.rankings.map((entry) => (
                <tr key={entry.gamertag}>
                  <td>{entry.rank}</td>
                  <td style="color: var(--gold-bright)">
                    <button
                      class="btn-text"
                      style="color: var(--gold-bright); text-decoration: underline; cursor: pointer; background: none; border: none; padding: 0; font-family: inherit; font-size: inherit;"
                      onClick={() => {
                        if (entry.userId) {
                          setScreen('profile');
                          setProfileId(entry.userId);
                        }
                      }}
                    >
                      {entry.gamertag}
                    </button>
                  </td>
                  <td>{entry.elo}</td>
                  <td style="color: var(--gold)">{entry.wins}</td>
                  <td style="color: var(--text-dim)">{entry.matches - entry.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
