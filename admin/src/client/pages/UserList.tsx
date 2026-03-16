import { useApi } from '../hooks/useApi.js';
import { DataTable } from '../components/DataTable.js';

interface UserRow {
  id: string;
  gamertag: string;
  suffix: number | null;
  email: string;
  elo: number;
  is_admin: boolean;
  match_count: number;
  last_match_at: string | null;
}

export function UserList() {
  const { data: users, loading, error } = useApi<UserRow[]>('/admin-api/users');

  if (loading)
    return (
      <div class="page">
        <p style={{ color: 'var(--text-dim)' }}>Loading...</p>
      </div>
    );
  if (error)
    return (
      <div class="page">
        <p class="error-msg">{error}</p>
      </div>
    );

  return (
    <div class="page">
      <h1 class="page-title">Users</h1>
      <p class="page-subtitle">{(users ?? []).length} users</p>

      <div class="card">
        <DataTable<UserRow>
          columns={[
            {
              key: 'gamertag',
              label: 'Gamertag',
              render: (r) => (
                <a href={`#/users/${r.id}`}>
                  {r.gamertag}
                  {r.suffix != null ? `#${r.suffix}` : ''}
                </a>
              ),
            },
            { key: 'email', label: 'Email' },
            { key: 'elo', label: 'Elo' },
            { key: 'match_count', label: 'Matches' },
            {
              key: 'last_match_at',
              label: 'Last Match',
              render: (r) =>
                r.last_match_at ? new Date(r.last_match_at).toLocaleDateString() : '—',
            },
            {
              key: 'is_admin',
              label: 'Admin',
              render: (r) =>
                r.is_admin ? (
                  <span class="badge-ok">✓</span>
                ) : (
                  <span style={{ color: 'var(--text-dim)' }}>—</span>
                ),
            },
          ]}
          rows={users ?? []}
          keyFn={(r) => r.id}
        />
      </div>
    </div>
  );
}
