import type { FastifyInstance } from 'fastify';
import type { PhalanxEvent } from '@phalanxduel/shared';
import { MatchRepository } from '../db/match-repo.js';
import { MatchManager, buildMatchEventLog } from '../match.js';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';

type CompactEvent = Record<string, unknown>;

function toCompactEvent(event: PhalanxEvent, seq: number): CompactEvent {
  const base: CompactEvent = { seq, type: event.name };
  const p = event.payload;
  switch (event.name) {
    case 'match.created':
      return { ...base, params: p['params'] ?? null };
    case 'player.joined':
      return { ...base, p: p['playerIndex'], bot: p['isBot'] ?? false };
    case 'game.initialized':
      return { ...base, stateHash: p['initialStateHash'] ?? null };
    case 'game.completed':
      return { ...base, winner: p['winnerIndex'], reason: p['victoryType'] };
    default: {
      // Turn events: include payload but skip verbose stateHashAfter
      const rest = Object.fromEntries(
        Object.entries(p as Record<string, unknown>).filter(([k]) => k !== 'stateHashAfter'),
      );
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

function renderEventLogHtml(
  matchId: string,
  events: PhalanxEvent[],
  fingerprint: string,
  generatedAt: string,
): string {
  const rows = events
    .map((ev, seq) => {
      const payloadStr = JSON.stringify(ev.payload).slice(0, 300);
      return `      <tr>
        <td>${seq}</td>
        <td>${escapeHtml(ev.name)}</td>
        <td>${escapeHtml(ev.type)}</td>
        <td>${escapeHtml(ev.timestamp)}</td>
        <td><code>${escapeHtml(payloadStr)}</code></td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Match Log — ${escapeHtml(matchId)}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 1rem; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.4rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
    th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; }
    code { word-break: break-all; font-size: 0.82em; }
    .meta { color: #555; font-size: 0.9em; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>Match Log</h1>
  <p class="meta">Match ID: <code>${escapeHtml(matchId)}</code></p>
  <p class="meta">Events: ${events.length} &nbsp;|&nbsp; Fingerprint: <code>${escapeHtml(fingerprint)}</code></p>
  <p class="meta">Generated: ${escapeHtml(generatedAt)}</p>
  <table>
    <thead>
      <tr>
        <th scope="col">#</th>
        <th scope="col">Event</th>
        <th scope="col">Type</th>
        <th scope="col">Timestamp</th>
        <th scope="col">Payload</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
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
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                matchId: { type: 'string', format: 'uuid' },
                playerIds: { type: 'array', items: { type: 'string', nullable: true } },
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
        summary: 'Event log for a match (full JSON, compact JSON, or HTML)',
        params: {
          type: 'object',
          properties: { id: { type: 'string', format: 'uuid' } },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: { format: { type: 'string' } },
        },
        response: {
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
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

        const accept = request.headers['accept'] ?? '';

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
