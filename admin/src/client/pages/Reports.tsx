import { useState } from 'preact/hooks';
import { useApi, apiPost } from '../hooks/useApi.js';
import { SqlBlock } from '../components/SqlBlock.js';
import { DataTable } from '../components/DataTable.js';

interface ReportParam {
  name: string;
  type: 'select' | 'number';
  default: string | number;
  options?: string[];
  label: string;
}

interface Report {
  id: string;
  name: string;
  description: string;
  category: 'matches' | 'players' | 'integrity';
  params: ReportParam[];
}

interface RunResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  sql: string;
}

function exportCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0] ?? {});
  const lines = [
    keys.join(','),
    ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? '')).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'report.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function Reports() {
  const { data: reports } = useApi<Report[]>('/admin-api/reports');
  const [selected, setSelected] = useState<Report | null>(null);
  const [params, setParams] = useState<Record<string, string | number>>({});
  const [sqlPreview, setSqlPreview] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const selectReport = async (report: Report) => {
    const initialParams: Record<string, string | number> = {};
    for (const p of report.params) initialParams[p.name] = p.default;
    setSelected(report);
    setParams(initialParams);
    setResult(null);
    setRunError(null);

    const qs = new URLSearchParams(
      Object.entries(initialParams).map(([k, v]) => [k, String(v)]),
    ).toString();
    const res = await fetch(`/admin-api/reports/${report.id}/sql?${qs}`);
    if (res.ok) {
      const { sql } = (await res.json()) as { sql: string };
      setSqlPreview(sql);
    }
  };

  const updateParam = async (name: string, value: string | number) => {
    const newParams = { ...params, [name]: value };
    setParams(newParams);
    if (!selected) return;
    const qs = new URLSearchParams(
      Object.entries(newParams).map(([k, v]) => [k, String(v)]),
    ).toString();
    const res = await fetch(`/admin-api/reports/${selected.id}/sql?${qs}`);
    if (res.ok) {
      const { sql } = (await res.json()) as { sql: string };
      setSqlPreview(sql);
    }
  };

  const runReport = async () => {
    if (!selected) return;
    setRunning(true);
    setRunError(null);
    const { data, error } = await apiPost<RunResult>(
      `/admin-api/reports/${selected.id}/run`,
      params,
    );
    setRunning(false);
    if (error) {
      setRunError(error);
      return;
    }
    if (data) setResult(data);
  };

  const grouped = (reports ?? []).reduce<Record<string, Report[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div class="page">
      <h1 class="page-title">Reports</h1>
      <p class="page-subtitle">Pre-built SQL reports — params are validated server-side</p>

      <div class="sidebar-layout">
        <div class="sidebar">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div class="sidebar-group-label">{cat}</div>
              {items.map((r) => (
                <div
                  key={r.id}
                  class={`sidebar-item${selected?.id === r.id ? ' active' : ''}`}
                  onClick={() => {
                    void selectReport(r);
                  }}
                >
                  {r.name}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div>
          {!selected && (
            <p style={{ color: 'var(--text-dim)' }}>Select a report from the sidebar</p>
          )}
          {selected && (
            <>
              <div class="card" style={{ marginBottom: '12px' }}>
                <div class="card-title">{selected.name}</div>
                <p style={{ color: 'var(--text-dim)', marginBottom: '12px', fontSize: '13px' }}>
                  {selected.description}
                </p>

                {selected.params.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    {selected.params.map((p) => (
                      <div class="form-group" key={p.name} style={{ marginBottom: 0 }}>
                        <label>{p.label}</label>
                        {p.type === 'select' ? (
                          <select
                            value={String(params[p.name] ?? p.default)}
                            onChange={(e) => {
                              void updateParam(p.name, (e.target as HTMLSelectElement).value);
                            }}
                          >
                            {(p.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            value={Number(params[p.name] ?? p.default)}
                            onInput={(e) => {
                              void updateParam(
                                p.name,
                                parseInt((e.target as HTMLInputElement).value, 10),
                              );
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {sqlPreview && <SqlBlock sql={sqlPreview} />}

                <button
                  class="primary"
                  onClick={() => void runReport()}
                  disabled={running}
                  style={{ marginTop: '12px' }}
                >
                  {running ? 'Running...' : 'Run Report'}
                </button>
              </div>

              {runError && <p class="error-msg">{runError}</p>}

              {result && (
                <div class="card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <div class="card-title" style={{ marginBottom: 0 }}>
                      {result.rowCount} rows — {result.durationMs}ms
                    </div>
                    <button
                      onClick={() => {
                        exportCsv(result.rows);
                      }}
                    >
                      Export CSV
                    </button>
                  </div>
                  {result.rows.length > 0 && (
                    <DataTable
                      columns={Object.keys(result.rows[0] ?? {}).map((k) => ({
                        key: k,
                        label: k,
                        render: (r: Record<string, unknown>) =>
                          k === 'id' ? (
                            <a href={`#/matches/${String(r[k])}`} class="mono">
                              {String(r[k]).slice(0, 8)}...
                            </a>
                          ) : (
                            String(r[k] ?? '')
                          ),
                      }))}
                      rows={result.rows}
                      keyFn={(_, i) => String(i)}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
