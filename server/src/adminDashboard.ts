export function renderAdminDashboard(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phalanx Duel Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0d0d0d;
      --bg-card: #1a1410;
      --bg-table: #140e08;
      --gold: #c9a84c;
      --gold-dim: #7a6530;
      --gold-bright: #e8c870;
      --text: #e8dcc8;
      --text-muted: #8a7a60;
      --border: #2a2010;
      --green: #4caf76;
      --red: #c94c4c;
      --yellow: #c9a84c;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Crimson Pro', Georgia, serif;
      font-size: 1rem;
      min-height: 100vh;
      padding: 0 0 2rem;
    }

    header {
      background: linear-gradient(180deg, #1a1008 0%, #0d0d0d 100%);
      border-bottom: 1px solid var(--border);
      padding: 1.5rem 2rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    h1 {
      font-family: 'Cinzel', serif;
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .admin-badge {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.65rem;
      font-weight: 600;
      background: var(--gold-dim);
      color: var(--bg);
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      align-self: center;
    }

    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }

    .section-header {
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--border);
      font-family: 'Cinzel', serif;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--gold-dim);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .section-body {
      padding: 1rem 1.25rem;
    }

    /* Health section */
    .health-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--text-muted);
      flex-shrink: 0;
    }
    .status-dot.ok { background: var(--green); }
    .status-dot.error { background: var(--red); }

    .health-status {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.85rem;
      color: var(--text);
    }

    .health-meta {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-left: auto;
    }

    /* Matches table */
    .matches-table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }

    thead th {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0.5rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
      background: var(--bg-table);
      white-space: nowrap;
    }

    tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background 0.15s;
    }

    tbody tr:last-child { border-bottom: none; }

    tbody tr:hover { background: rgba(201, 168, 76, 0.04); }

    td {
      padding: 0.6rem 0.75rem;
      color: var(--text);
      vertical-align: middle;
    }

    td.mono {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.8rem;
      color: var(--gold-dim);
    }

    td.muted { color: var(--text-muted); font-size: 0.85rem; }

    .phase-badge {
      display: inline-block;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.7rem;
      padding: 0.15rem 0.45rem;
      border-radius: 3px;
      background: rgba(201, 168, 76, 0.12);
      color: var(--gold);
      border: 1px solid rgba(201, 168, 76, 0.2);
      text-transform: lowercase;
    }

    .phase-badge.waiting {
      background: rgba(138, 122, 96, 0.12);
      color: var(--text-muted);
      border-color: rgba(138, 122, 96, 0.2);
    }

    .conn-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--green);
      margin-right: 4px;
      vertical-align: middle;
    }
    .conn-dot.off { background: var(--text-muted); }

    .action-links a {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.75rem;
      color: var(--gold);
      text-decoration: none;
      padding: 0.2rem 0.5rem;
      border: 1px solid var(--gold-dim);
      border-radius: 3px;
      margin-right: 0.4rem;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
    }

    .action-links a:hover {
      background: var(--gold);
      color: var(--bg);
    }

    .empty-state {
      padding: 1.5rem;
      text-align: center;
      color: var(--text-muted);
      font-style: italic;
      font-size: 0.9rem;
    }

    /* Dev tools */
    .dev-links {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .dev-links a {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.82rem;
      color: var(--gold);
      text-decoration: none;
      border: 1px solid var(--gold-dim);
      border-radius: 4px;
      padding: 0.4rem 0.85rem;
      transition: background 0.15s, color 0.15s;
    }

    .dev-links a:hover {
      background: var(--gold);
      color: var(--bg);
    }

    .refresh-note {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-style: italic;
    }

    #last-refresh {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.78rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <header>
    <h1>Phalanx Duel Admin</h1>
    <span class="admin-badge">Dashboard</span>
  </header>

  <main>
    <!-- Server Health -->
    <div class="section">
      <div class="section-header">
        Server Health
        <span class="refresh-note">&nbsp;(auto-refreshes every 30s)</span>
      </div>
      <div class="section-body">
        <div class="health-row" id="health-row">
          <div class="status-dot" id="health-dot"></div>
          <span class="health-status" id="health-status">Loading…</span>
          <span class="health-meta" id="health-meta"></span>
        </div>
      </div>
    </div>

    <!-- Active Matches -->
    <div class="section">
      <div class="section-header">
        Active Matches
        <span class="refresh-note">&nbsp;(auto-refreshes every 5s)</span>
        <span style="margin-left:auto" id="last-refresh"></span>
      </div>
      <div class="section-body" style="padding:0">
        <div class="matches-table-wrap" id="matches-container">
          <div class="empty-state">Loading…</div>
        </div>
      </div>
    </div>

    <!-- Developer Tools -->
    <div class="section">
      <div class="section-header">Developer Tools</div>
      <div class="section-body">
        <div class="dev-links">
          <a href="/docs" target="_blank">Swagger UI</a>
          <a href="/docs/json" target="_blank">OpenAPI JSON</a>
        </div>
      </div>
    </div>
  </main>

  <script>
    function fmt(seconds) {
      if (seconds < 60) return seconds + 's';
      if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
      return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
    }

    function escHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    async function fetchHealth() {
      try {
        const res = await fetch('/health');
        const data = await res.json();
        const dot = document.getElementById('health-dot');
        const status = document.getElementById('health-status');
        const meta = document.getElementById('health-meta');
        dot.className = 'status-dot ok';
        status.textContent = 'ok';
        meta.textContent = 'v' + data.version + ' · checked ' + new Date().toLocaleTimeString();
      } catch {
        const dot = document.getElementById('health-dot');
        const status = document.getElementById('health-status');
        const meta = document.getElementById('health-meta');
        dot.className = 'status-dot error';
        status.textContent = 'unreachable';
        meta.textContent = 'checked ' + new Date().toLocaleTimeString();
      }
    }

    function renderPlayer(p) {
      if (!p) return '<span class="muted">—</span>';
      const dot = '<span class="conn-dot' + (p.connected ? '' : ' off') + '"></span>';
      return dot + escHtml(p.name);
    }

    function renderPhase(phase) {
      if (!phase) return '<span class="phase-badge waiting">waiting</span>';
      return '<span class="phase-badge">' + escHtml(phase) + '</span>';
    }

    async function fetchMatches() {
      try {
        const res = await fetch('/matches');
        const matches = await res.json();
        const container = document.getElementById('matches-container');
        const refresh = document.getElementById('last-refresh');
        refresh.textContent = new Date().toLocaleTimeString();

        if (matches.length === 0) {
          container.innerHTML = '<div class="empty-state">No active matches</div>';
          return;
        }

        const rows = matches.map(function(m) {
          const shortId = escHtml(m.matchId.slice(0, 8));
          const p1 = m.players[0] || null;
          const p2 = m.players[1] || null;
          const spectators = m.spectatorCount || 0;
          const turn = m.turnNumber != null ? m.turnNumber : '—';
          const age = fmt(m.ageSeconds);
          const activity = fmt(m.lastActivitySeconds);
          return '<tr>' +
            '<td class="mono">' + shortId + '&hellip;</td>' +
            '<td>' + renderPlayer(p1) + '</td>' +
            '<td>' + renderPlayer(p2) + '</td>' +
            '<td>' + renderPhase(m.phase) + '</td>' +
            '<td class="muted">' + turn + '</td>' +
            '<td class="muted">' + spectators + '</td>' +
            '<td class="muted">' + age + '</td>' +
            '<td class="muted">' + activity + '</td>' +
            '<td class="action-links">' +
              '<a href="/?watch=' + escHtml(m.matchId) + '" target="_blank">Watch</a>' +
              '<a href="/matches/' + escHtml(m.matchId) + '/replay">Replay</a>' +
            '</td>' +
          '</tr>';
        }).join('');

        container.innerHTML =
          '<table>' +
            '<thead><tr>' +
              '<th>Match ID</th>' +
              '<th>Player 1</th>' +
              '<th>Player 2</th>' +
              '<th>Phase</th>' +
              '<th>Turn</th>' +
              '<th>Spectators</th>' +
              '<th>Age</th>' +
              '<th>Idle</th>' +
              '<th>Actions</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>';
      } catch {
        const container = document.getElementById('matches-container');
        container.innerHTML = '<div class="empty-state">Failed to load matches</div>';
      }
    }

    // Initial load
    fetchHealth();
    fetchMatches();

    // Auto-refresh
    setInterval(fetchHealth, 30000);
    setInterval(fetchMatches, 5000);
  </script>
</body>
</html>`;
}
