import { useState } from 'preact/hooks';
import { useApi, apiPost, apiPatch } from '../hooks/useApi.js';
import { DataTable } from '../components/DataTable.js';

interface UserDetailData {
  user: {
    id: string;
    gamertag: string;
    suffix: number | null;
    email: string;
    elo: number;
    is_admin: boolean;
    created_at: string;
  };
  matches: {
    id: string;
    player_1_name: string;
    player_2_name: string;
    status: string;
    outcome: { winnerName?: string } | null;
    created_at: string;
  }[];
  snapshots: {
    id: string;
    category: string;
    elo: number;
    k_factor: number;
    window_days: number;
    matches_in_window: number;
    wins_in_window: number;
    computed_at: string;
  }[];
}

export function UserDetail({ userId }: { userId: string }) {
  const { data, loading, error } = useApi<UserDetailData>(`/admin-api/users/${userId}`);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (loading)
    return (
      <div class="page">
        <p style={{ color: 'var(--text-dim)' }}>Loading...</p>
      </div>
    );
  if (error || !data)
    return (
      <div class="page">
        <p class="error-msg">{error ?? 'User not found'}</p>
      </div>
    );

  const { user, matches, snapshots } = data;

  const handleResetPassword = async () => {
    setActionLoading(true);
    setActionError(null);
    const { data: d, error: err } = await apiPost<{ tempPassword: string }>(
      `/admin-api/users/${userId}/reset-password`,
      {},
    );
    setActionLoading(false);
    if (err) {
      setActionError(err);
      return;
    }
    setTempPassword(d!.tempPassword);
  };

  const handleToggleAdmin = async () => {
    setActionLoading(true);
    setActionError(null);
    const { error: err } = await apiPatch(`/admin-api/users/${userId}/admin`, {
      isAdmin: !user.is_admin,
    });
    setActionLoading(false);
    if (err) {
      setActionError(err);
      return;
    }
    window.location.reload();
  };

  return (
    <div class="page">
      <h1 class="page-title">
        {user.gamertag}
        {user.suffix != null ? `#${user.suffix}` : ''}
      </h1>
      <p class="page-subtitle">
        {user.email} — Elo {user.elo} — Joined {new Date(user.created_at).toLocaleDateString()}
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => void handleResetPassword()} disabled={actionLoading}>
          Reset Password
        </button>
        <button onClick={() => void handleToggleAdmin()} disabled={actionLoading}>
          {user.is_admin ? 'Revoke Admin' : 'Grant Admin'}
        </button>
      </div>

      {tempPassword && (
        <div class="card" style={{ marginBottom: '16px', borderColor: 'var(--accent)' }}>
          <div class="card-title">Temporary Password (shown once)</div>
          <code class="mono" style={{ fontSize: '16px', color: 'var(--accent)' }}>
            {tempPassword}
          </code>
        </div>
      )}
      {actionError && (
        <p class="error-msg" style={{ marginBottom: '12px' }}>
          {actionError}
        </p>
      )}

      <div class="card" style={{ marginBottom: '16px' }}>
        <div class="card-title">Elo Snapshots</div>
        <DataTable
          columns={[
            { key: 'category', label: 'Category' },
            { key: 'elo', label: 'Elo' },
            { key: 'k_factor', label: 'K-Factor' },
            { key: 'window_days', label: 'Window (days)' },
            { key: 'matches_in_window', label: 'Matches' },
            { key: 'wins_in_window', label: 'Wins' },
            {
              key: 'computed_at',
              label: 'Computed',
              render: (r) => new Date(r.computed_at).toLocaleString(),
            },
          ]}
          rows={snapshots}
          keyFn={(r) => r.id}
        />
      </div>

      <div class="card">
        <div class="card-title">Match History ({matches.length})</div>
        <DataTable
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
            {
              key: 'outcome',
              label: 'Winner',
              render: (r) => (r.outcome as { winnerName?: string } | null)?.winnerName ?? '—',
            },
            { key: 'status', label: 'Status' },
            {
              key: 'created_at',
              label: 'Date',
              render: (r) => new Date(r.created_at).toLocaleDateString(),
            },
          ]}
          rows={matches}
          keyFn={(r) => r.id}
        />
      </div>
    </div>
  );
}
