import { useState } from 'preact/hooks';
import { apiPost } from '../hooks/useApi.js';

export function MatchCreator() {
  const [playerName, setPlayerName] = useState('Admin');
  const [opponent, setOpponent] = useState<'bot-random' | 'human'>('bot-random');
  const [rows, setRows] = useState(4);
  const [columns, setColumns] = useState(6);
  const [maxHandSize, setMaxHandSize] = useState(3);
  const [damageMode, setDamageMode] = useState<'classic' | 'cumulative'>('classic');
  const [startingLifepoints, setStartingLifepoints] = useState(20);
  const [rngSeed, setRngSeed] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const totalSlots = rows * columns;
  const initialDraw = rows * columns + columns;
  const slotsOverLimit = totalSlots > 48;

  const payload = {
    playerName,
    opponent,
    matchParams: { rows, columns, maxHandSize },
    gameOptions: { damageMode, startingLifepoints },
    ...(rngSeed ? { rngSeed: parseInt(rngSeed, 10) } : {}),
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (slotsOverLimit) {
      setError('Total slots exceed 48. Reduce grid size.');
      return;
    }
    if (maxHandSize > columns) {
      setError('maxHandSize cannot exceed columns.');
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await apiPost<{ matchId: string }>('/admin-api/matches', payload);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    window.location.hash = `#/matches/${data!.matchId}`;
  };

  return (
    <div class="page">
      <h1 class="page-title">New Match</h1>
      <p class="page-subtitle">Create a match on the game server</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        <form onSubmit={handleSubmit}>
          <div class="card">
            <div class="card-title">Players</div>
            <div class="form-group">
              <label>Player Name</label>
              <input
                value={playerName}
                onInput={(e) => {
                  setPlayerName((e.target as HTMLInputElement).value);
                }}
                required
              />
            </div>
            <div class="form-group">
              <label>Opponent</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  class={opponent === 'bot-random' ? 'primary' : ''}
                  onClick={() => {
                    setOpponent('bot-random');
                  }}
                >
                  Bot Random
                </button>
                <button type="button" disabled title="Not yet implemented" style={{ opacity: 0.4 }}>
                  Bot Heuristic
                </button>
                <button
                  type="button"
                  class={opponent === 'human' ? 'primary' : ''}
                  onClick={() => {
                    setOpponent('human');
                  }}
                >
                  Human
                </button>
              </div>
            </div>
          </div>

          <div class="card" style={{ marginTop: '12px' }}>
            <div class="card-title">Grid</div>
            <div class="form-row">
              <div class="form-group">
                <label>Rows</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={rows}
                  onInput={(e) => {
                    setRows(parseInt((e.target as HTMLInputElement).value, 10));
                  }}
                />
              </div>
              <div class="form-group">
                <label>Columns</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={columns}
                  onInput={(e) => {
                    setColumns(parseInt((e.target as HTMLInputElement).value, 10));
                  }}
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Max Hand Size</label>
                <input
                  type="number"
                  min="0"
                  value={maxHandSize}
                  onInput={(e) => {
                    setMaxHandSize(parseInt((e.target as HTMLInputElement).value, 10));
                  }}
                />
              </div>
              <div class="form-group">
                <label>Initial Draw (computed)</label>
                <input value={initialDraw} disabled />
              </div>
            </div>
            {slotsOverLimit && <p class="warn-msg">Total slots ({totalSlots}) exceed 48</p>}
          </div>

          <div class="card" style={{ marginTop: '12px' }}>
            <div class="card-title">Game Options</div>
            <div class="form-row">
              <div class="form-group">
                <label>Damage Mode</label>
                <select
                  value={damageMode}
                  onChange={(e) => {
                    setDamageMode(
                      (e.target as HTMLSelectElement).value as 'classic' | 'cumulative',
                    );
                  }}
                >
                  <option value="classic">Classic</option>
                  <option value="cumulative">Cumulative</option>
                </select>
              </div>
              <div class="form-group">
                <label>Starting Lifepoints</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={startingLifepoints}
                  onInput={(e) => {
                    setStartingLifepoints(parseInt((e.target as HTMLInputElement).value, 10));
                  }}
                />
              </div>
            </div>
            <div class="form-group">
              <label>RNG Seed (optional)</label>
              <input
                type="number"
                placeholder="Leave blank for random"
                value={rngSeed}
                onInput={(e) => {
                  setRngSeed((e.target as HTMLInputElement).value);
                }}
              />
            </div>
          </div>

          {error && (
            <p class="error-msg" style={{ marginTop: '12px' }}>
              {error}
            </p>
          )}
          <button type="submit" class="primary" disabled={loading} style={{ marginTop: '16px' }}>
            {loading ? 'Creating...' : 'Create Match'}
          </button>
        </form>

        <div>
          <div class="card" style={{ position: 'sticky', top: '24px' }}>
            <div class="card-title">Payload Preview</div>
            <pre style={{ fontSize: '11px' }}>{JSON.stringify(payload, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
