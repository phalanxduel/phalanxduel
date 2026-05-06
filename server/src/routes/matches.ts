import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PhalanxEvent, MatchEventLog, Action, TransactionLogEntry } from '@phalanxduel/shared';
import { MatchRepository } from '../db/match-repo.js';
import { ActionError, buildMatchEventLog } from '../match.js';
import type { IMatchManager, MatchInstance } from '../match-types.js';
import type { CompletedMatchHistoryEntry } from '../db/match-repo.js';
import { filterEventLogForPublic } from '../utils/redaction.js';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';
import {
  MatchEventLogSchema,
  ErrorResponseSchema,
  TurnViewModelSchema,
  ActionSchema,
  GameStateSchema,
  SCHEMA_VERSION,
  isGameOver,
} from '@phalanxduel/shared';
import { toJsonSchema } from '../utils/openapi.js';
import { applyAction, deriveEventsFromEntry, replayGame } from '@phalanxduel/engine';
import * as Hash from '@phalanxduel/shared/hash';
const { computeStateHash } = Hash;
import { projectTurnForViewer, projectForViewer } from '../utils/viewer-projection.js';

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

interface ResolvedParticipantIdentity {
  playerIndex: number;
  playerId: string;
  via: 'user' | 'player-id-header';
}

function resolveParticipantIdentity(
  match: MatchInstanceLike,
  request: FastifyRequest,
): ResolvedParticipantIdentity | null {
  const { userId } = getRequesterIdentity(request);
  const headerPlayerId =
    typeof request.headers['x-phalanx-player-id'] === 'string'
      ? request.headers['x-phalanx-player-id']
      : undefined;

  for (const [playerIndex, player] of match.players.entries()) {
    if (!player) continue;

    // Authenticated requests are bound to the authenticated account only.
    if (userId !== undefined) {
      if (player.userId === userId) {
        return {
          playerIndex,
          playerId: player.playerId,
          via: 'user',
        };
      }
      continue;
    }

    if (player.playerId === headerPlayerId) {
      return {
        playerIndex,
        playerId: player.playerId,
        via: 'player-id-header',
      };
    }
  }

  return null;
}

async function authorizeLogAccess(
  matchId: string,
  log: MatchEventLog,
  request: FastifyRequest,
  matchManager: IMatchManager,
): Promise<MatchEventLog> {
  const match = await matchManager.getMatch(matchId);
  const participant = match ? resolveParticipantIdentity(match, request) : null;

  const isCompleted =
    (match?.state != null && isGameOver(match.state)) ||
    log.events.some((e) => e.name === 'game.completed' || e.status === 'unrecoverable_error');

  // ONLY return the raw, unredacted log to participants if the game has concluded!
  // Otherwise, active matches must ALWAYS be redacted to prevent Fog of War cheating via JSON inspection.
  if (participant && isCompleted) {
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

function escapeHtml(str: string | undefined | null): string {
  if (str === undefined || str === null) return '';
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
  try {
    const raw = JSON.stringify(obj, null, 2);
    if (!raw) return '<span class="jp">null</span>';
    return highlightJsonRaw(raw);
  } catch (err) {
    console.error('[highlightJson] Serialization failed:', err);
    return `<span class="jr">Error: ${escapeHtml(err instanceof Error ? err.message : String(err))}</span>`;
  }
}

/** Internal implementation that assumes raw is a valid JSON string. */
function highlightJsonRaw(raw: string): string {
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
  events: PhalanxEvent[] | undefined | null,
  fingerprint: string | undefined | null,
  generatedAt: string | undefined | null,
): string {
  const typeColors: Record<string, string> = {
    span_started: 'green',
    span_ended: 'orange',
    functional_update: 'cyan',
    system_error: 'red',
  };

  const safeEvents = events ?? [];
  const rows = safeEvents
    .map((ev, seq) => {
      const color = typeColors[ev.type] ?? 'muted';
      const payloadHtml = highlightJson(ev.payload);
      const isError = ev.status === 'unrecoverable_error';
      const tsRaw = ev.timestamp;
      const ts = escapeHtml(tsRaw).replace('T', ' ').replace('Z', ' UTC');
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

  const safeMatchId = matchId ?? 'unknown';
  const safeFingerprint = fingerprint ?? 'N/A';
  const safeGeneratedAt = (generatedAt ?? '').replace('T', ' ').replace('Z', ' UTC') || 'N/A';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Match Log &#8212; ${escapeHtml(safeMatchId.slice(0, 8))}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Barlow+Condensed:wght@300;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg:     #05070a;
      --surf:   #0a0e14;
      --surf2:  #0f141c;
      --border: #ffffff;
      --text:   #ffffff;
      --muted:  #6b8da9;
      --amber:  #ff9f1c;
      --cyan:   #2ec4b6;
      --green:  #2ecc71;
      --orange: #e67e22;
      --red:    #e74c3c;
      --shadow: rgba(255, 255, 255, 0.1);
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
      border: 3px solid var(--border);
      padding: 24px 32px;
      position: sticky;
      top: 12px;
      margin: 12px;
      z-index: 20;
      display: flex;
      align-items: baseline;
      gap: 12px;
      flex-wrap: wrap;
      box-shadow: 8px 8px 0px var(--shadow);
    }

    .title {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--amber);
      margin-right: 18px;
      flex-shrink: 0;
    }

    .meta-pills { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

    .pill {
      font-size: 11px;
      letter-spacing: 0.06em;
      color: var(--muted);
      border: 2px solid var(--border);
      padding: 4px 12px;
      white-space: nowrap;
      background: var(--bg);
    }

    .pill b { color: var(--text); font-weight: 700; }

    .col-header {
      display: grid;
      grid-template-columns: 64px 1fr 180px 260px;
      border: 2px solid var(--border);
      background: var(--surf);
      position: sticky;
      top: 110px;
      margin: 0 12px;
      z-index: 19;
    }

    .col-header .hcell {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--muted);
      padding: 8px 12px;
      border-right: 2px solid var(--border);
    }

    .col-header .hcell:last-child { border-right: none; }

    main {
      padding: 12px;
      padding-top: 0;
    }

    .event-row {
      display: grid;
      grid-template-columns: 64px 1fr 180px 260px;
      border: 2px solid var(--border);
      border-top: none;
      position: relative;
      cursor: pointer;
      transition: background 0.05s ease;
      background: var(--bg);
    }

    .event-row:hover { background: var(--surf2); }

    .event-row::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 6px;
    }

    .type-span_started::before      { background: var(--green); }
    .type-span_ended::before        { background: var(--orange); }
    .type-functional_update::before { background: var(--cyan); }
    .type-system_error::before      { background: var(--red); }
    .is-error                       { background: rgba(231, 76, 60, 0.1); }

    .cell {
      padding: 10px 12px;
      border-right: 2px solid var(--border);
      overflow: hidden;
    }

    .cell:last-child { border-right: none; }

    .seq {
      color: var(--muted);
      font-size: 11px;
      text-align: right;
      user-select: none;
      font-weight: 700;
    }

    .name-cell { display: flex; align-items: center; gap: 10px; }

    .expand-chevron {
      font-size: 10px;
      color: var(--muted);
      transition: transform 0.15s ease;
      flex-shrink: 0;
      user-select: none;
    }

    .event-row.open .expand-chevron { transform: rotate(90deg); }

    .event-name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; letter-spacing: 0.05em; }

    .err-dot { color: var(--red); font-size: 12px; flex-shrink: 0; }

    .badge {
      display: inline-block;
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      padding: 3px 10px;
      border: 2px solid var(--border);
      white-space: nowrap;
      background: var(--bg);
    }

    .badge-green  { color: var(--green);  background: rgba(46, 204, 113, 0.1); }
    .badge-orange { color: var(--orange); background: rgba(230, 126, 34, 0.1); }
    .badge-cyan   { color: var(--cyan);   background: rgba(46, 196, 182, 0.1); }
    .badge-red    { color: var(--red);    background: rgba(231, 76, 60, 0.1); }
    .badge-muted  { color: var(--muted);  }

    .ts { font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }

    .payload-row {
      display: none;
      background: var(--surf2);
      border: 2px solid var(--border);
      border-top: none;
      margin-left: 24px;
      margin-right: 0;
      box-shadow: 4px 4px 0px var(--shadow);
    }

    .payload-row.open { display: block; }

    .payload-inner { padding: 16px 24px; overflow-x: auto; }

    .json-pre {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11.5px;
      line-height: 1.7;
      white-space: pre;
    }

    .jk { color: var(--cyan); font-weight: 700; }
    .js { color: #a5d6a7; }
    .jn { color: var(--amber); }
    .jb { color: #ce93d8; }
    .jz { color: var(--muted); }
    .jp { color: #90a4ae; }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--muted); }
    ::-webkit-scrollbar-thumb:hover { background: var(--border); }
  </style>
</head>
<body>
  <header class="header">
    <div class="title">Match Log</div>
    <div class="meta-pills">
      <div class="pill">MATCH <b>${escapeHtml(safeMatchId)}</b></div>
      <div class="pill">EVENTS <b>${safeEvents.length}</b></div>
      <div class="pill">FINGERPRINT <b>${escapeHtml(safeFingerprint.slice(0, 16))}&#8230;</b></div>
      <div class="pill">GENERATED <b>${escapeHtml(safeGeneratedAt)}</b></div>
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

interface PlayerConnectionLike {
  playerId: string;
  userId?: string;
}

interface MatchInstanceLike {
  players: [PlayerConnectionLike | null, PlayerConnectionLike | null];
}

interface CompletedReplaySource {
  match: MatchInstance & {
    config: NonNullable<MatchInstance['config']>;
    state: NonNullable<MatchInstance['state']>;
  };
  entries: TransactionLogEntry[];
}

function isCompletedMatch(match: MatchInstance | null | undefined): match is MatchInstance & {
  config: NonNullable<MatchInstance['config']>;
  state: NonNullable<MatchInstance['state']>;
} {
  return match?.state != null && isGameOver(match.state) && !!match.config;
}

function publicReplayEntries(
  entries: TransactionLogEntry[],
): (TransactionLogEntry & { action: Action & { playerIndex: number } })[] {
  return entries.filter(
    (entry): entry is TransactionLogEntry & { action: Action & { playerIndex: number } } =>
      entry.action.type !== 'system:init' && 'playerIndex' in entry.action,
  );
}

function actionsFromEntries(entries: TransactionLogEntry[]): Action[] {
  return publicReplayEntries(entries).map((entry) => entry.action);
}

function toBoundedPositiveInt(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, parsed));
}

function resolveMatchPlayerName(match: MatchInstance, index: 0 | 1): string {
  return (
    match.players[index]?.playerName ?? match.config?.players[index]?.name ?? `Player ${index + 1}`
  );
}

function toMemoryHistoryEntry(match: MatchInstance): CompletedMatchHistoryEntry | null {
  if (!match.state || !isGameOver(match.state)) return null;

  const player1Name = resolveMatchPlayerName(match, 0);
  const player2Name = resolveMatchPlayerName(match, 1);
  const winnerIndex = match.state.outcome?.winnerIndex ?? null;
  const completedAtMs = match.lastActivityAt;

  const isPvP = match.botPlayerIndex == null;
  const humanPlayerCount = isPvP ? 2 : 1;

  return {
    matchId: match.matchId,
    player1Name,
    player2Name,
    player1Id: match.players[0]?.userId ?? null,
    player2Id: match.players[1]?.userId ?? null,
    winnerName: winnerIndex === 0 ? player1Name : winnerIndex === 1 ? player2Name : null,
    totalTurns: match.state.outcome?.turnNumber ?? match.state.turnNumber,
    isPvP,
    humanPlayerCount,
    completedAt: new Date(completedAtMs).toISOString(),
    durationMs: completedAtMs - match.createdAt,
  };
}

function listMemoryCompletedHistory(
  matchManager: IMatchManager,
  page: number,
  pageSize: number,
  playerId?: string,
) {
  const allMatches = matchManager
    .listInMemoryMatches()
    .filter((match) => {
      if (!playerId) return true;
      return match.players.some(
        (player) => player?.userId === playerId || player?.playerId === playerId,
      );
    })
    .map(toMemoryHistoryEntry)
    .filter((entry): entry is CompletedMatchHistoryEntry => entry !== null)
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt));
  const offset = (page - 1) * pageSize;
  return {
    matches: allMatches.slice(offset, offset + pageSize),
    total: allMatches.length,
  };
}

async function loadCompletedReplaySource(
  id: string,
  matchRepo: MatchRepository,
  matchManager: IMatchManager,
): Promise<CompletedReplaySource | null> {
  const persisted = await matchRepo.getMatch(id);
  const match = isCompletedMatch(persisted) ? persisted : matchManager.getMatchSync(id);
  if (!isCompletedMatch(match)) return null;

  const persistedEntries = await matchRepo.getTransactionLog(id);
  const stateEntries = match.state.transactionLog ?? [];
  const entries = persistedEntries.length > 0 ? persistedEntries : stateEntries;

  return {
    match,
    entries,
  };
}

/**
 * Registers match log and simulation routes.
 */
export function registerMatchLogRoutes(
  fastify: FastifyInstance,
  matchManager: IMatchManager,
): void {
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
        const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '20', 10) || 20));
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
              toJsonSchema(MatchEventLogSchema),
              {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
            ],
          },
          404: toJsonSchema(ErrorResponseSchema),
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

  // GET /api/matches/history — paginated public completed-match history for rewatch
  fastify.get<{ Querystring: { page?: string; pageSize?: string; playerId?: string } }>(
    '/api/matches/history',
    {
      schema: {
        tags: ['matches'],
        summary: 'Completed match history for rewatch',
        description: 'Returns a paginated list of completed matches available for public rewatch.',
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string', pattern: '^\\d+$', default: '1' },
            pageSize: { type: 'string', pattern: '^\\d+$', default: '20' },
            playerId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            description: 'Completed match history page',
            type: 'object',
            properties: {
              matches: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    matchId: { type: 'string', format: 'uuid' },
                    player1Name: { type: 'string' },
                    player2Name: { type: 'string' },
                    winnerName: { type: 'string', nullable: true },
                    totalTurns: { type: 'integer' },
                    isPvP: { type: 'boolean' },
                    humanPlayerCount: { type: 'integer' },
                    completedAt: { type: 'string', format: 'date-time' },
                    durationMs: { type: 'integer', nullable: true },
                  },
                  required: [
                    'matchId',
                    'player1Name',
                    'player2Name',
                    'winnerName',
                    'totalTurns',
                    'isPvP',
                    'humanPlayerCount',
                    'completedAt',
                    'durationMs',
                  ],
                },
              },
              total: { type: 'integer' },
              page: { type: 'integer' },
              pageSize: { type: 'integer' },
            },
            required: ['matches', 'total', 'page', 'pageSize'],
          },
        },
      },
    },
    async (request, reply) =>
      traceHttpHandler('matchHistory.list', httpTraceContext(request, reply), async () => {
        const page = toBoundedPositiveInt(request.query.page, 1, 10_000);
        const pageSize = toBoundedPositiveInt(request.query.pageSize, 20, 100);
        const persisted = await matchRepo.listCompletedMatchHistory(
          page,
          pageSize,
          request.query.playerId,
        );
        const result =
          persisted.total > 0
            ? persisted
            : listMemoryCompletedHistory(matchManager, page, pageSize, request.query.playerId);

        return {
          matches: result.matches,
          total: result.total,
          page,
          pageSize,
        };
      }),
  );

  // GET /api/matches/:id/actions — public completed-match action log for replay clients
  fastify.get<{ Params: { id: string } }>(
    '/api/matches/:id/actions',
    {
      schema: {
        tags: ['matches'],
        summary: 'Completed match action log',
        description:
          'Returns the ordered public action log for a completed match. No authentication is required for completed matches.',
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        response: {
          200: {
            description: 'Replayable completed-match action log',
            type: 'object',
            properties: {
              matchId: { type: 'string', format: 'uuid' },
              engineVersion: { type: 'string' },
              seed: { type: 'integer' },
              startingLifepoints: { type: 'integer' },
              player1Name: { type: 'string' },
              player2Name: { type: 'string' },
              totalActions: { type: 'integer' },
              actions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    sequenceNumber: { type: 'integer' },
                    type: { type: 'string' },
                    playerIndex: { type: 'integer' },
                    timestamp: { type: 'string', format: 'date-time' },
                    stateHashBefore: { type: 'string' },
                    stateHashAfter: { type: 'string' },
                  },
                  required: [
                    'sequenceNumber',
                    'type',
                    'playerIndex',
                    'timestamp',
                    'stateHashBefore',
                    'stateHashAfter',
                  ],
                },
              },
            },
            required: [
              'matchId',
              'engineVersion',
              'seed',
              'startingLifepoints',
              'player1Name',
              'player2Name',
              'totalActions',
              'actions',
            ],
          },
          404: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) =>
      traceHttpHandler('matchReplay.actions', httpTraceContext(request, reply), async () => {
        const source = await loadCompletedReplaySource(request.params.id, matchRepo, matchManager);
        if (!source) {
          void reply.status(404);
          return { error: 'Completed match not found', code: 'MATCH_NOT_FOUND' };
        }

        const actions = publicReplayEntries(source.entries).map((entry) => ({
          sequenceNumber: entry.sequenceNumber,
          ...entry.action, // Include full unredacted action (column, cardId, etc)
          timestamp: entry.timestamp,
          stateHashBefore: entry.stateHashBefore,
          stateHashAfter: entry.stateHashAfter,
        }));

        return {
          matchId: source.match.matchId,
          engineVersion: SCHEMA_VERSION,
          seed: source.match.config.rngSeed,
          startingLifepoints: source.match.state.players[0]?.lifepoints ?? 0,
          player1Name: source.match.players[0]?.playerName ?? source.match.config.players[0].name,
          player2Name: source.match.players[1]?.playerName ?? source.match.config.players[1].name,
          totalActions: actions.length,
          actions,
        };
      }),
  );

  // GET /api/matches/:id/replay?step=N — public completed-match state reconstruction
  fastify.get<{ Params: { id: string }; Querystring: { step?: string } }>(
    '/api/matches/:id/replay',
    {
      schema: {
        tags: ['matches'],
        summary: 'Replay completed match to a step',
        description:
          'Replays a completed match from the deterministic initial state through the first N public actions and returns the resulting GameState.',
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            step: { type: 'string', pattern: '^\\d+$', default: '0' },
          },
        },
        response: {
          200: {
            description: 'Game state at the requested replay step',
            ...toJsonSchema(GameStateSchema),
          },
          404: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) =>
      traceHttpHandler('matchReplay.step', httpTraceContext(request, reply), async () => {
        const source = await loadCompletedReplaySource(request.params.id, matchRepo, matchManager);
        if (!source) {
          void reply.status(404);
          return { error: 'Completed match not found', code: 'MATCH_NOT_FOUND' };
        }

        const requestedStep = Math.max(0, parseInt(request.query.step ?? '0', 10) || 0);
        const actions = actionsFromEntries(source.entries);
        const replayActions = actions.slice(0, Math.min(requestedStep, actions.length));

        // TASK-257: Use the match creation timestamp as the draw timestamp if not explicitly set.
        // This ensures card IDs generated during replay match those stored in the action log.
        const replayConfig = {
          ...source.match.config,
          drawTimestamp:
            source.match.config.drawTimestamp ?? new Date(source.match.createdAt).toISOString(),
        };

        return replayGame(replayConfig, replayActions, {
          hashFn: computeStateHash,
        }).finalState;
      }),
  );

  // POST /matches/:id/simulate — dry-run an action and return the resulting ViewModel
  fastify.post<{ Params: { id: string }; Body: unknown }>(
    '/api/matches/:id/action',
    {
      schema: {
        tags: ['matches'],
        summary: 'Submit a game action over REST',
        description:
          'Applies a gameplay action for an authenticated participant and returns the redacted TurnViewModel for that player.',
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        body: {
          type: 'object',
          anyOf: (toJsonSchema(ActionSchema) as { anyOf?: unknown[] }).anyOf,
          description: 'A gameplay action using the canonical shared action schema.',
          additionalProperties: true,
          required: ['type'],
          properties: {
            type: { type: 'string' },
            playerIndex: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            description: 'The redacted turn result for the acting player',
            ...toJsonSchema(TurnViewModelSchema),
          },
          400: toJsonSchema(ErrorResponseSchema),
          403: toJsonSchema(ErrorResponseSchema),
          404: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) =>
      traceHttpHandler('match.action', httpTraceContext(request, reply), async () => {
        const { id } = request.params;
        const match = matchManager.getMatchSync(id);
        if (!match) {
          void reply.status(404);
          return { error: 'Active match not found', code: 'MATCH_NOT_FOUND' };
        }

        if (!match.state) {
          void reply.status(400);
          return { error: 'Game not initialized', code: 'GAME_NOT_INIT' };
        }

        const parsed = ActionSchema.safeParse(request.body);
        if (!parsed.success) {
          void reply.status(400);
          return {
            error: 'Validation Error',
            code: 'VALIDATION_ERROR',
            details: parsed.error.issues,
          };
        }

        const participant = resolveParticipantIdentity(match, request);
        if (!participant) {
          void reply.status(403);
          return {
            error: 'Only participants can submit actions',
            code: 'UNAUTHORIZED_ACTION',
          };
        }

        const { playerIndex } = participant;
        const player = match.players[playerIndex];
        if (!player) {
          void reply.status(403);
          return {
            error: 'Player not found in this match',
            code: 'PLAYER_NOT_FOUND',
          };
        }

        const action =
          'playerIndex' in parsed.data && parsed.data.playerIndex !== undefined
            ? (parsed.data as Action)
            : ({ ...parsed.data, playerIndex } as Action);

        try {
          await matchManager.handleAction(id, player.playerId, action);
          return projectForViewer(match, playerIndex);
        } catch (error) {
          if (error instanceof ActionError) {
            const statusCode =
              error.code === 'MATCH_NOT_FOUND'
                ? 404
                : error.code === 'UNAUTHORIZED_ACTION' || error.code === 'PLAYER_NOT_FOUND'
                  ? 403
                  : 500;
            void reply.status(statusCode);
            return { error: error.message, code: error.code };
          }
          throw error;
        }
      }),
  );

  fastify.post<{ Params: { id: string }; Body: Action }>(
    '/matches/:id/simulate',
    {
      schema: {
        tags: ['matches'],
        summary: 'Simulate a game action',
        description:
          'Executes a proposed action against the current match state and returns the resulting ViewModel. Does NOT persist any changes.',
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        // Use a generic object body to prevent properties from being stripped by AJV/Fastify validation.
        // We still map the ActionSchema here for OpenAPI documentation generation,
        // but set additionalProperties and disable strict-mode stripping implications.
        body: {
          type: 'object',
          description: 'The game action to simulate',
          additionalProperties: true,
          required: ['type'],
          properties: {
            type: { type: 'string' },
            playerIndex: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          200: {
            description: 'The projected ViewModel of the state after the simulated action',
            // We use the full schema but keep additionalProperties: true for flexibility if needed,
            // though toJsonSchema already handles the Zod-to-JSON conversion.
            ...toJsonSchema(TurnViewModelSchema),
          },
          400: toJsonSchema(ErrorResponseSchema),
          403: toJsonSchema(ErrorResponseSchema),
          404: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) =>
      traceHttpHandler('match.simulate', httpTraceContext(request, reply), async () => {
        const { id } = request.params;
        const action = request.body;

        const match = matchManager.getMatchSync(id);
        if (!match) {
          void reply.status(404);
          return { error: 'Active match not found', code: 'MATCH_NOT_FOUND' };
        }

        if (!match.state) {
          void reply.status(400);
          return { error: 'Game not initialized', code: 'GAME_NOT_INIT' };
        }

        const participant = resolveParticipantIdentity(match, request);
        if (!participant) {
          void reply.status(403);
          return {
            error: 'Only participants can simulate actions',
            code: 'UNAUTHORIZED_SIMULATION_INDEX',
          };
        }

        const viewerIndex = participant.playerIndex;

        const rawAction = action as Record<string, unknown>;
        const actionPlayerIndex =
          typeof rawAction.playerIndex === 'number'
            ? rawAction.playerIndex
            : typeof rawAction.playerIndex === 'string'
              ? parseInt(rawAction.playerIndex, 10)
              : viewerIndex;

        if (action.type !== 'system:init') {
          if (actionPlayerIndex !== viewerIndex) {
            void reply.status(403);
            return {
              error: 'Cannot simulate actions for the opponent',
              code: 'UNAUTHORIZED_SIMULATION_INDEX',
            };
          }
        }

        try {
          const simAction = {
            ...action,
            playerIndex: actionPlayerIndex,
            timestamp: new Date().toISOString(),
          } as Action;

          const postState = applyAction(match.state, simAction, {
            hashFn: (s) => computeStateHash(s),
          });

          const lastLogEntry = postState.transactionLog?.[postState.transactionLog.length - 1];
          const events = lastLogEntry ? deriveEventsFromEntry(lastLogEntry, id) : [];

          return projectTurnForViewer(
            {
              matchId: id,
              preState: match.state,
              postState,
              action: simAction,
              events,
            },
            viewerIndex,
          );
        } catch (err) {
          console.error('[SIMULATE_ERROR]', err);
          if (err instanceof Error && err.name === 'ValidationError') {
            void reply.status(400);
            return { error: err.message, code: 'ILLEGAL_ACTION' };
          }
          void reply.status(400);
          return {
            error: err instanceof Error ? err.message : 'Invalid action',
            code: 'ILLEGAL_ACTION',
          };
        }
      }),
  );
}
