import { useEffect, useState } from 'preact/hooks';
import { apiPost, useApi } from '../hooks/useApi.js';
import { StatBadge } from '../components/StatBadge.js';
import { DataTable } from '../components/DataTable.js';
import { IntegrityBadge } from '../components/IntegrityBadge.js';

interface MatchRow {
  id: string;
  player_1_name: string;
  player_2_name: string;
  bot_strategy: string | null;
  status: string;
  outcome: { victoryType?: string; winnerName?: string } | null;
  created_at: string;
  updated_at?: string | null;
  total_turns: number;
  verified_turns: number;
}

interface UserRow {
  id: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return `clock skew (+${Math.ceil(Math.abs(diff) / 60000)}m)`;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// Dashboard intentionally composes several independent live panels.
// eslint-disable-next-line complexity
export function Dashboard() {
  const { data: activeMatches } = useApi<MatchRow[]>('/admin-api/matches?status=active');
  const { data: recentMatches } = useApi<MatchRow[]>(
    '/admin-api/matches?status=completed&limit=20',
  );
  const { data: matchInventory } = useApi<MatchRow[]>('/admin-api/matches?status=all&limit=200');
  const { data: users } = useApi<UserRow[]>('/admin-api/users?limit=1');
  const [, setTick] = useState(0);
  const [retentionDays, setRetentionDays] = useState(7);
  const [purging, setPurging] = useState(false);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);
  const olderThan = new Date(Date.now() - retentionDays * 86400000).toISOString();
  const { data: retention } = useApi<{ eligible: { count: number; oldest: string | null } }>(
    `/admin-api/matches/retention?olderThan=${encodeURIComponent(olderThan)}`,
    [retentionDays],
  );

  const purgeStale = async () => {
    if (
      !confirm(
        `Delete ${retention?.eligible.count ?? 0} incomplete or cancelled matches older than ${retentionDays} days?`,
      )
    )
      return;
    setPurging(true);
    setRetentionMessage(null);
    const { data, error } = await apiPost<{ purged: number }>(
      '/admin-api/matches/retention/purge',
      {
        olderThan,
      },
    );
    setPurging(false);
    setRetentionMessage(error ?? `Purged ${data?.purged ?? 0} matches.`);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const today = new Date().toDateString();
  const todayCount = (recentMatches ?? []).filter(
    (m) => new Date(m.created_at).toDateString() === today,
  ).length;
  const botPct =
    recentMatches && recentMatches.length > 0
      ? Math.round(
          (recentMatches.filter((m) => m.bot_strategy).length / recentMatches.length) * 100,
        )
      : 0;
  const matchCounts = (matchInventory ?? []).reduce<Record<string, number>>((counts, match) => {
    counts[match.status] = (counts[match.status] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div class="page">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Live operations overview — refreshes every 30s</p>

      <div class="stat-grid">
        <StatBadge
          label="Active Matches"
          value={(activeMatches ?? []).length}
          color="var(--green)"
        />
        <StatBadge label="Today's Matches" value={todayCount} />
        <StatBadge label="Total Users" value={users?.length ?? '...'} />
        <StatBadge label="Bot Match %" value={`${botPct}%`} color="var(--blue)" />
      </div>

      <div class="stat-grid" aria-label="Match status counts">
        <StatBadge label="Pending" value={matchCounts.pending ?? 0} />
        <StatBadge label="Active" value={matchCounts.active ?? 0} color="var(--green)" />
        <StatBadge label="Completed" value={matchCounts.completed ?? 0} />
        <StatBadge label="Cancelled" value={matchCounts.cancelled ?? 0} />
        <StatBadge label="Terminated" value={matchCounts.terminated ?? 0} />
      </div>

      <div class="card" style={{ marginBottom: '16px' }}>
        <div class="card-title">Match Retention</div>
        <p class="muted">
          Preview and remove stale incomplete, active, or cancelled matches. Completed history is
          always protected.
        </p>
        <div style={{ display: 'flex', alignItems: 'end', gap: '12px', flexWrap: 'wrap' }}>
          <div class="form-group" style={{ marginBottom: 0 }}>
            <label for="retention-days">Older than (days)</label>
            <input
              id="retention-days"
              type="number"
              min="1"
              max="3650"
              value={retentionDays}
              onInput={(e) => setRetentionDays(Number((e.target as HTMLInputElement).value) || 1)}
            />
          </div>
          <button
            class="danger"
            disabled={purging || !retention?.eligible.count}
            onClick={() => void purgeStale()}
          >
            {purging ? 'Purging…' : `Purge ${retention?.eligible.count ?? '…'} matches`}
          </button>
          {retentionMessage && <span class="muted">{retentionMessage}</span>}
        </div>
      </div>

      <div class="card" style={{ marginBottom: '16px' }}>
        <div class="card-title">Live Matches ({(activeMatches ?? []).length})</div>
        <DataTable<MatchRow>
          columns={[
            {
              key: 'id',
              label: 'Match ID',
              render: (r) => (
                <a href={`#/matches/${r.id}`} class="mono">
                  {r.id.slice(0, 8)}...
                </a>
              ),
            },
            {
              key: 'players',
              label: 'Players',
              render: (r) => `${r.player_1_name} vs ${r.player_2_name}`,
            },
            { key: 'bot', label: 'Bot', render: (r) => r.bot_strategy ?? '—' },
            { key: 'created_at', label: 'Started', render: (r) => timeAgo(r.created_at) },
          ]}
          rows={activeMatches ?? []}
          keyFn={(r) => r.id}
        />
      </div>

      <div class="card">
        <div class="card-title">Recent Matches</div>
        <DataTable<MatchRow>
          columns={[
            {
              key: 'id',
              label: 'Match ID',
              render: (r) => (
                <a href={`#/matches/${r.id}`} class="mono">
                  {r.id.slice(0, 8)}...
                </a>
              ),
            },
            { key: 'winner', label: 'Winner', render: (r) => r.outcome?.winnerName ?? '—' },
            { key: 'victory', label: 'Victory', render: (r) => r.outcome?.victoryType ?? '—' },
            { key: 'turns', label: 'Turns', render: (r) => String(r.total_turns) },
            {
              key: 'integrity',
              label: 'Check',
              render: (r) => <IntegrityBadge ok={r.verified_turns === r.total_turns} />,
            },
            {
              key: 'created_at',
              label: 'Ended',
              render: (r) => timeAgo(r.updated_at ?? r.created_at),
            },
          ]}
          rows={recentMatches ?? []}
          keyFn={(r) => r.id}
        />
      </div>
    </div>
  );
}
