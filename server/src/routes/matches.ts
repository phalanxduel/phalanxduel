import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PhalanxEvent, MatchEventLog } from '@phalanxduel/shared';
import { MatchRepository } from '../db/match-repo.js';
import { MatchManager, buildMatchEventLog, filterEventLogForPublic } from '../match.js';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';

type CompactEvent = Record<string, unknown>;

function getRequesterIdentity(request: FastifyRequest): { userId?: string; isAdmin: boolean } {
  // checkBasicAuth logic is in app.ts, but we can't easily call it here
  // for now, we'll assume not admin unless we add a proper decorator.
  // TODO: Add admin decorator to Fastify

  let userId: string | undefined;
  try {
    const token =
      request.headers.authorization?.replace('Bearer ', '') ?? request.cookies.phalanx_refresh;
    if (token) {
      const payload = (
        request.server as unknown as { jwt: { verify: (t: string) => { id: string } } }
      ).jwt.verify(token);
      userId = payload.id;
    }
  } catch {
    // Ignore invalid tokens
  }

  return { userId, isAdmin: false };
}

async function authorizeLogAccess(
  matchId: string,
  log: MatchEventLog,
  request: FastifyRequest,
  matchManager: MatchManager,
): Promise<MatchEventLog> {
  const { userId } = getRequesterIdentity(request);

  // 1. Check if requester is a participant (via userId)
  const match = await matchManager.getMatch(matchId);
  const isParticipant =
    (match?.players.some((p) => p?.userId === userId) ?? false) ||
    // Also check if the playerId is provided in a header (for anonymous participants)
    // Note: This is weak auth, but better than nothing for non-registered users.
    (match?.players.some((p) => p?.playerId === request.headers['x-phalanx-player-id']) ?? false);

  const isCompleted =
    match?.state?.phase === 'gameOver' || log.events.some((e) => e.name === 'game.completed');

  // ONLY return the raw, unredacted log to participants if the game has concluded!
  // Otherwise, active matches must ALWAYS be redacted to prevent Fog of War cheating via JSON inspection.
  if (isParticipant && isCompleted) {
    return log;
  }

  // 2. Otherwise, return redacted log
  return filterEventLogForPublic(log);
}

function toCompactEvent(event: PhalanxEvent, seq: number): CompactEvent {
  const base: CompactEvent = { seq, type: event.name };
  const p = event.payload;
  switch (event.name) {
    case 'match.created':
      return { ...base, params: p.params ?? null };
    case 'player.joined':
      return { ...base, p: p.playerIndex, bot: p.isBot ?? false };
    case 'game.initialized':
      return { ...base, stateHash: p.initialStateHash ?? null };
    case 'game.completed':
      return { ...base, winner: p.winnerIndex, reason: p.victoryType };
    default: {
      // Turn events: include payload but skip verbose stateHashAfter
      const rest = Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'stateHashAfter'));
      return { ...base, ...rest };
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Scan past a JSON string literal (opening quote already at `start`). */
function scanJsonString(raw: string, start: number): number {
  let j = start + 1;
  while (j < raw.length) {
    if (raw[j] === '\\') {
      j += 2;
      continue;
    }
    if (raw[j] === '"') return j + 1;
    j++;
  }
  return j;
}

/** Scan past a JSON number starting at `start`. */
function scanJsonNumber(raw: string, start: number): number {
  let j = start;
  if (raw[j] === '-') j++;
  while (j < raw.length && /[\d.eE+-]/u.test(raw.charAt(j))) j++;
  return j;
}

const JSON_PUNCTUATION = new Set(['{', '}', '[', ']', ',', ':']);
const JSON_KEYWORDS: Record<string, { cls: string; len: number }> = {
  true: { cls: 'jb', len: 4 },
  false: { cls: 'jb', len: 5 },
  null: { cls: 'jz', len: 4 },
};

/**
 * Server-side JSON syntax highlighter — returns safe HTML with span tags.
 * Tokenizes the raw JSON string character-by-character so each value is
 * individually escaped before wrapping, preventing any XSS from payload content.
 */
function highlightJson(obj: unknown): string {
  const raw = JSON.stringify(obj, null, 2);
  let out = '';
  let i = 0;

  while (i < raw.length) {
    const ch = raw.charAt(i);

    if (ch === '"') {
      const end = scanJsonString(raw, i);
      const token = raw.slice(i, end);
      let k = end;
      while (k < raw.length && raw[k] === ' ') k++;
      out += `<span class="${raw[k] === ':' ? 'jk' : 'js'}">${escapeHtml(token)}</span>`;
      i = end;
    } else if (ch === '-' || (ch >= '0' && ch <= '9')) {
      const end = scanJsonNumber(raw, i);
      out += `<span class="jn">${escapeHtml(raw.slice(i, end))}</span>`;
      i = end;
    } else if (JSON_KEYWORDS[raw.slice(i, i + 5)] ?? JSON_KEYWORDS[raw.slice(i, i + 4)]) {
      const kw = JSON_KEYWORDS[raw.slice(i, i + 4)] ?? JSON_KEYWORDS[raw.slice(i, i + 5)];
      if (!kw) {
        i++;
        continue;
      }
      out += `<span class="${kw.cls}">${raw.slice(i, i + kw.len)}</span>`;
      i += kw.len;
    } else if (JSON_PUNCTUATION.has(ch)) {
      out += `<span class="jp">${escapeHtml(ch)}</span>`;
      i++;
    } else {
      out += escapeHtml(ch);
      i++;
    }
  }

  return out;
}

function renderEventLogHtml(
  matchId: string,
  events: PhalanxEvent[],
  fingerprint: string,
  generatedAt: string,
): string {
  const typeColors: Record<string, string> = {
    span_started: 'green',
    span_ended: 'orange',
    functional_update: 'cyan',
    system_error: 'red',
  };

  const rows = events
    .map((ev, seq) => {
      const color = typeColors[ev.type] ?? 'muted';
      const payloadHtml = highlightJson(ev.payload);
      const isError = ev.status === 'unrecoverable_error';
      const ts = escapeHtml(ev.timestamp).replace('T', ' ').replace('Z', ' UTC');
      return `<div class="event-row type-${escapeHtml(ev.type)}${isError ? ' is-error' : ''}" data-seq="${seq}">
  <div class="cell seq">${seq}</div>
  <div class="cell name-cell">
    <span class="expand-chevron">&#9654;</span><span class="event-name">${escapeHtml(ev.name)}</span>${isError ? '<span class="err-dot" title="unrecoverable_error">&#9679;</span>' : ''}
  </div>
  <div class="cell"><span class="badge badge-${color}">${escapeHtml(ev.type.replace(/_/g, ' '))}</span></div>
  <div class="cell ts">${ts}</div>
</div>
<div class="payload-row" id="p${seq}">
  <div class="payload-inner"><pre class="json-pre">${payloadHtml}</pre></div>
</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Match Log &#8212; ${escapeHtml(matchId.slice(0, 8))}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Barlow+Condensed:wght@300;600;700&display=swap');

    :root {
      --bg:     #090c0f;
      --surf:   #0d1218;
      --surf2:  #111820;
      --border: #192433;
      --text:   #b0c4d4;
      --muted:  #354f63;
      --amber:  #e8921a;
      --cyan:   #3dc9b0;
      --green:  #38c172;
      --orange: #e87c2a;
      --red:    #e85252;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'IBM Plex Mono', monospace;
      font-size: 12.5px;
      line-height: 1.55;
      min-height: 100vh;
    }

    .header {
      background: var(--surf);
      border-bottom: 1px solid var(--border);
      padding: 18px 28px 14px;
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: baseline;
      gap: 0;
      flex-wrap: wrap;
    }

    .title {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--amber);
      margin-right: 18px;
      flex-shrink: 0;
    }

    .meta-pills { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

    .pill {
      font-size: 10px;
      letter-spacing: 0.06em;
      color: var(--muted);
      border: 1px solid var(--border);
      border-radius: 2px;
      padding: 2px 8px;
      white-space: nowrap;
    }

    .pill b { color: var(--text); font-weight: 400; }

    .col-header {
      display: grid;
      grid-template-columns: 48px 1fr 168px 248px;
      border-bottom: 1px solid var(--border);
      background: var(--surf);
      position: sticky;
      top: 53px;
      z-index: 19;
    }

    .col-header .hcell {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      padding: 5px 10px;
      border-right: 1px solid var(--border);
    }

    .col-header .hcell:last-child { border-right: none; }

    .event-row {
      display: grid;
      grid-template-columns: 48px 1fr 168px 248px;
      border-bottom: 1px solid var(--border);
      position: relative;
      cursor: pointer;
      transition: background 0.1s ease;
    }

    .event-row:hover { background: var(--surf); }

    .event-row::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 3px;
    }

    .type-span_started::before      { background: var(--green); }
    .type-span_ended::before        { background: var(--orange); }
    .type-functional_update::before { background: var(--cyan); }
    .type-system_error::before      { background: var(--red); }
    .is-error                       { background: rgba(232,82,82,0.04); }

    .cell {
      padding: 8px 10px;
      border-right: 1px solid var(--border);
      overflow: hidden;
    }

    .cell:last-child { border-right: none; }

    .seq {
      color: var(--muted);
      font-size: 11px;
      text-align: right;
      user-select: none;
    }

    .name-cell { display: flex; align-items: center; gap: 7px; }

    .expand-chevron {
      font-size: 8px;
      color: var(--muted);
      transition: transform 0.15s ease;
      flex-shrink: 0;
      user-select: none;
    }

    .event-row.open .expand-chevron { transform: rotate(90deg); }

    .event-name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .err-dot { color: var(--red); font-size: 9px; flex-shrink: 0; }

    .badge {
      display: inline-block;
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 2px;
      white-space: nowrap;
    }

    .badge-green  { background: rgba(56,193,114,0.13); color: var(--green);  border: 1px solid rgba(56,193,114,0.24); }
    .badge-orange { background: rgba(232,124,42,0.13); color: var(--orange); border: 1px solid rgba(232,124,42,0.24); }
    .badge-cyan   { background: rgba(61,201,176,0.13); color: var(--cyan);   border: 1px solid rgba(61,201,176,0.24); }
    .badge-red    { background: rgba(232,82,82,0.13);  color: var(--red);    border: 1px solid rgba(232,82,82,0.24); }
    .badge-muted  { background: rgba(53,79,99,0.2);    color: var(--muted);  border: 1px solid var(--border); }

    .ts { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }

    .payload-row {
      display: none;
      background: var(--surf2);
      border-bottom: 1px solid var(--border);
      border-left: 3px solid var(--border);
    }

    .payload-row.open { display: block; }

    .payload-inner { padding: 12px 14px 14px 58px; overflow-x: auto; }

    .json-pre {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11.5px;
      line-height: 1.7;
      white-space: pre;
    }

    .jk { color: var(--cyan); }
    .js { color: #7ec87e; }
    .jn { color: var(--amber); }
    .jb { color: #c792ea; }
    .jz { color: var(--muted); }
    .jp { color: #546e7a; }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--muted); }
  </style>
</head>
<body>
  <header class="header">
    <div class="title">Match Log</div>
    <div class="meta-pills">
      <div class="pill">ID <b>${escapeHtml(matchId)}</b></div>
      <div class="pill">Events <b>${events.length}</b></div>
      <div class="pill">Fingerprint <b>${escapeHtml(fingerprint.slice(0, 16))}&#8230;</b></div>
      <div class="pill">Generated <b>${escapeHtml(generatedAt.replace('T', ' ').replace('Z', ' UTC'))}</b></div>
    </div>
  </header>
  <div class="col-header">
    <div class="hcell">#</div>
    <div class="hcell">Event</div>
    <div class="hcell">Type</div>
    <div class="hcell">Timestamp</div>
  </div>
  <main>
${rows}
  </main>
  <script>
    document.querySelectorAll('.event-row').forEach(function(row) {
      row.addEventListener('click', function() {
        var seq = row.getAttribute('data-seq');
        var payload = document.getElementById('p' + seq);
        if (payload) {
          payload.classList.toggle('open');
          row.classList.toggle('open');
        }
      });
    });
  </script>
</body>
</html>`;
}

export function registerMatchLogRoutes(fastify: FastifyInstance, matchManager: MatchManager): void {
  const matchRepo = new MatchRepository();

  // GET /matches/completed — paginated list of completed match summaries from DB
  fastify.get<{ Querystring: { page?: string; limit?: string } }>(
    '/matches/completed',
    {
      schema: {
        tags: ['matches'],
        summary: 'Paginated list of completed match summaries',
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string', pattern: '^\\d+$', default: '1' },
            limit: { type: 'string', pattern: '^\\d+$', default: '20' },
          },
        },
        response: {
          200: {
            description: 'List of completed match metadata',
            type: 'array',
            items: {
              type: 'object',
              properties: {
                matchId: { type: 'string', format: 'uuid' },
                playerIds: {
                  type: 'array',
                  items: { type: 'string', format: 'uuid', nullable: true },
                },
                playerNames: { type: 'array', items: { type: 'string' } },
                winnerIndex: { type: 'integer', nullable: true },
                victoryType: { type: 'string', nullable: true },
                turnCount: { type: 'integer', nullable: true },
                fingerprint: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                completedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    async (request, reply) =>
      traceHttpHandler('matchLog.listCompleted', httpTraceContext(request, reply), async () => {
        const page = Math.max(1, parseInt(request.query.page ?? '1', 10) ?? 1);
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '20', 10) ?? 20));
        return matchRepo.getCompletedMatches(page, limit);
      }),
  );

  // GET /matches/:id/log — event log with content negotiation (JSON / compact / HTML)
  fastify.get<{ Params: { id: string }; Querystring: { format?: string } }>(
    '/matches/:id/log',
    {
      schema: {
        tags: ['matches'],
        summary: 'Event log for a match',
        description:
          'Returns the full sequence of events for a match. Supports content negotiation via the format query parameter or Accept header.',
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['compact', 'json'], default: 'json' },
          },
        },
        response: {
          200: {
            description: 'Full or compact event log',
            oneOf: [
              { $ref: 'MatchLog#' },
              {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
            ],
          },
          404: { $ref: 'ErrorResponse#' },
        },
      },
    },
    async (request, reply) =>
      traceHttpHandler('matchLog.getLog', httpTraceContext(request, reply), async () => {
        const { id } = request.params;

        // 1. Try DB-persisted log first
        let log = await matchRepo.getEventLog(id);

        // 2. Fallback: build from in-memory match (covers in-progress and no-DB test environments)
        if (!log) {
          const inMemoryMatch = matchManager.getMatchSync(id);
          if (inMemoryMatch) {
            log = buildMatchEventLog(inMemoryMatch);
          }
        }

        if (!log) {
          void reply.status(404);
          return { error: 'Match log not found', code: 'LOG_NOT_FOUND' };
        }

        // Apply redaction if requester is not a participant
        log = await authorizeLogAccess(id, log, request, matchManager);

        const accept = request.headers.accept ?? '';

        // HTML response
        if (accept.includes('text/html')) {
          void reply.header('Content-Type', 'text/html; charset=utf-8');
          return renderEventLogHtml(log.matchId, log.events, log.fingerprint, log.generatedAt);
        }

        // Compact JSON
        if (request.query.format === 'compact') {
          return log.events.map((ev, seq) => toCompactEvent(ev, seq));
        }

        // Full JSON
        return log;
      }),
  );
}
