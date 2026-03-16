import { useEffect, useState } from 'preact/hooks';
import { useApi } from '../hooks/useApi.js';
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
  total_turns: number;
  verified_turns: number;
}

interface UserRow {
  id: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function Dashboard() {
  const { data: activeMatches } = useApi<MatchRow[]>('/admin-api/matches?status=active');
  const { data: recentMatches } = useApi<MatchRow[]>(
    '/admin-api/matches?status=completed&limit=20',
  );
  const { data: users } = useApi<UserRow[]>('/admin-api/users?limit=1');
  const [, setTick] = useState(0);

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
          ((recentMatches ?? []).filter((m) => m.bot_strategy).length / recentMatches.length) * 100,
        )
      : 0;

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
            { key: 'created_at', label: 'Ended', render: (r) => timeAgo(r.created_at) },
          ]}
          rows={recentMatches ?? []}
          keyFn={(r) => r.id}
        />
      </div>
    </div>
  );
}
