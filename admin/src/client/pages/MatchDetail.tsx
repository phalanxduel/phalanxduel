import { useState } from 'preact/hooks';
import { useApi } from '../hooks/useApi.js';
import { IntegrityBadge } from '../components/IntegrityBadge.js';

interface TransactionEntry {
  action: { type: string; column?: number; cardId?: unknown };
  phaseTrace: string[];
  stateHashAfter: string;
  turnHash?: string;
}

interface EventEntry {
  id: string;
  type: string;
  name: string;
  timestamp: string;
  status: string;
}

interface Match {
  id: string;
  player_1_name: string;
  player_2_name: string;
  bot_strategy: string | null;
  status: string;
  outcome: { victoryType?: string; winnerName?: string; winnerId?: string } | null;
  transaction_log: TransactionEntry[];
  event_log: { events: EventEntry[] } | null;
  event_log_fingerprint: string | null;
  config: unknown;
  created_at: string;
}

function actionDsl(action: TransactionEntry['action']): string {
  if (action.type === 'deploy') return `A:${action.column}:${String(action.cardId).slice(0, 6)}`;
  if (action.type === 'discard') return `D:${action.column}:${String(action.cardId).slice(0, 6)}`;
  if (action.type === 'reinforcement') return `R:${String(action.cardId).slice(0, 6)}`;
  if (action.type === 'pass') return 'P';
  if (action.type === 'forfeit') return 'F';
  return action.type;
}

export function MatchDetail({ matchId }: { matchId: string }) {
  const { data: match, loading, error } = useApi<Match>(`/admin-api/matches/${matchId}`);
  const [tab, setTab] = useState<'overview' | 'txlog' | 'eventlog' | 'config'>('overview');

  if (loading)
    return (
      <div class="page">
        <p style={{ color: 'var(--text-dim)' }}>Loading...</p>
      </div>
    );
  if (error || !match)
    return (
      <div class="page">
        <p class="error-msg">{error ?? 'Match not found'}</p>
      </div>
    );

  const txLog = match.transaction_log ?? [];
  const verifiedTurns = txLog.filter((e) => e.turnHash).length;

  return (
    <div class="page">
      <h1 class="page-title">
        Match{' '}
        <span class="mono" style={{ fontSize: '16px' }}>
          {match.id.slice(0, 8)}...
        </span>
      </h1>
      <p class="page-subtitle">
        {match.player_1_name} vs {match.player_2_name} — <strong>{match.status}</strong>
      </p>

      <div class="tabs">
        {(['overview', 'txlog', 'eventlog', 'config'] as const).map((t) => (
          <div
            key={t}
            class={`tab${tab === t ? ' active' : ''}`}
            onClick={() => {
              setTab(t);
            }}
          >
            {t === 'txlog'
              ? 'Transaction Log'
              : t === 'eventlog'
                ? 'Event Log'
                : t === 'config'
                  ? 'Config'
                  : 'Overview'}
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <div class="two-col">
          <div class="card">
            <div class="card-title">Integrity</div>
            <div class="kv-list">
              <span class="k">turnHash coverage</span>
              <span>
                {verifiedTurns} / {txLog.length}{' '}
                <IntegrityBadge ok={verifiedTurns === txLog.length} />
              </span>
              <span class="k">event log fingerprint</span>
              <span>
                <IntegrityBadge ok={!!match.event_log_fingerprint} />
              </span>
            </div>
          </div>
          <div class="card">
            <div class="card-title">Outcome</div>
            {match.outcome ? (
              <div class="kv-list">
                {Object.entries(match.outcome).map(([k, v]) => (
                  <>
                    <span class="k">{k}</span>
                    <span>{v ?? ''}</span>
                  </>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)' }}>No outcome yet</p>
            )}
          </div>
        </div>
      )}

      {tab === 'txlog' && (
        <div class="card">
          <div class="card-title">Transaction Log ({txLog.length} entries)</div>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
            turnHash presence check only. For full re-derivation, use the "turnHash sweep" report.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Action (DSL)</th>
                  <th>Phase After</th>
                  <th>stateHash</th>
                  <th>turnHash</th>
                  <th>Check</th>
                </tr>
              </thead>
              <tbody>
                {txLog.map((entry, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td class="mono">{actionDsl(entry.action)}</td>
                    <td class="mono">{entry.phaseTrace?.[entry.phaseTrace.length - 1] ?? '—'}</td>
                    <td class="mono" style={{ fontSize: '11px' }}>
                      {entry.stateHashAfter?.slice(0, 12)}...
                    </td>
                    <td class="mono" style={{ fontSize: '11px' }}>
                      {entry.turnHash ? `${entry.turnHash.slice(0, 12)}...` : '—'}
                    </td>
                    <td>
                      <IntegrityBadge ok={!!entry.turnHash} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'eventlog' && (
        <div class="card">
          <div class="card-title">Event Log ({(match.event_log?.events ?? []).length} events)</div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {(match.event_log?.events ?? []).map((evt) => (
                  <tr key={evt.id}>
                    <td class="mono" style={{ fontSize: '11px' }}>
                      {evt.id?.slice(0, 12)}...
                    </td>
                    <td>{evt.type}</td>
                    <td>{evt.name}</td>
                    <td>{evt.status}</td>
                    <td class="mono" style={{ fontSize: '11px' }}>
                      {evt.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div class="card">
          <div class="card-title">Match Config</div>
          <pre>{JSON.stringify(match.config, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
