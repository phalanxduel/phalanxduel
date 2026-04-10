import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PhalanxEvent, MatchEventLog, Action } from '@phalanxduel/shared';
import { MatchRepository } from '../db/match-repo.js';
import { ActionError, buildMatchEventLog, type IMatchManager } from '../match.js';
import { filterEventLogForPublic } from '../utils/redaction.js';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';
import {
  MatchEventLogSchema,
  ErrorResponseSchema,
  TurnViewModelSchema,
  ActionSchema,
} from '@phalanxduel/shared';
import { toJsonSchema } from '../utils/openapi.js';
import { applyAction, deriveEventsFromEntry } from '@phalanxduel/engine';
import { computeStateHash } from '@phalanxduel/shared/hash';
import { projectTurnResult } from '../utils/projection.js';

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
  const participant = match
    ? resolveParticipantIdentity(match as MatchInstanceLike, request)
    : null;

  const isCompleted =
    match?.state?.phase === 'gameOver' ||
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

interface PlayerConnectionLike {
  playerId: string;
  userId?: string;
}

interface MatchInstanceLike {
  players: [PlayerConnectionLike | null, PlayerConnectionLike | null];
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

        const participant = resolveParticipantIdentity(match as MatchInstanceLike, request);
        if (!participant) {
          void reply.status(403);
          return {
            error: 'Only participants can submit actions',
            code: 'UNAUTHORIZED_ACTION',
          };
        }

        const viewerIndex = participant.playerIndex;
        const player = match.players[viewerIndex];
        if (!player) {
          void reply.status(403);
          return {
            error: 'Player not found in this match',
            code: 'PLAYER_NOT_FOUND',
          };
        }

        const action =
          parsed.data.type === 'system:init' || parsed.data.playerIndex !== undefined
            ? parsed.data
            : ({ ...parsed.data, playerIndex: viewerIndex } as Action);

        try {
          const turnResult = await matchManager.handleAction(id, player.playerId, action);
          return projectTurnResult({
            matchId: id,
            preState: turnResult.preState,
            postState: turnResult.postState,
            action: turnResult.action,
            events: turnResult.events ?? [],
            viewerIndex,
          });
        } catch (error) {
          if (error instanceof ActionError) {
            const statusCode =
              error.code === 'MATCH_NOT_FOUND'
                ? 404
                : error.code === 'UNAUTHORIZED_ACTION' || error.code === 'PLAYER_NOT_FOUND'
                  ? 403
                  : error.code === 'MATCH_UNRECOVERABLE_ERROR'
                    ? 500
                    : 400;
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

        const participant = resolveParticipantIdentity(match as MatchInstanceLike, request);
        if (!participant) {
          void reply.status(403);
          return {
            error: 'Only participants can simulate actions',
            code: 'UNAUTHORIZED_SIMULATION',
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

          return projectTurnResult({
            matchId: id,
            preState: match.state,
            postState,
            action: simAction,
            events,
            viewerIndex,
          });
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
