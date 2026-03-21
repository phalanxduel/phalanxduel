import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PhalanxEvent, MatchEventLog, PlayerState } from '@phalanxduel/shared';
import { MatchRepository } from '../db/match-repo.js';
import { MatchManager, buildMatchEventLog, filterEventLogForPublic, MatchActor } from '../match.js';
import { httpTraceContext, traceHttpHandler } from '../tracing.js';

type CompactEvent = Record<string, unknown>;

function getRequesterIdentity(request: FastifyRequest): { userId?: string; isAdmin: boolean } {
  let userId: string | undefined;
  try {
    const token =
      request.headers.authorization?.replace('Bearer ', '') || request.cookies.phalanx_refresh;
    if (token) {
      const payload = (
        request.server as unknown as { jwt: { verify: (t: string) => { id: string } } }
      ).jwt.verify(token);
      userId = payload.id;
    }
  } catch {
    // Ignore
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
  const actor: MatchActor = await matchManager.getOrCreateActor(matchId);
  const state = actor.getState();

  const isParticipant =
    state?.players.some((ps: PlayerState) => ps.player.id === userId) ||
    state?.players.some(
      (ps: PlayerState) => ps.player.id === request.headers['x-phalanx-player-id'],
    );

  const isCompleted =
    state?.phase === 'gameOver' || log.events.some((e) => e.name === 'game.completed');

  if (isParticipant && isCompleted) {
    return log;
  }

  return filterEventLogForPublic(log);
}

function toCompactEvent(event: PhalanxEvent, seq: number): CompactEvent {
  const base: CompactEvent = { seq, type: event.name };
  const p = event.payload;
  switch (event.name) {
    case 'match.created':
      return { ...base, params: (p.params as Record<string, unknown>) ?? null };
    case 'player.joined':
      return { ...base, p: p.playerIndex as number, bot: (p.isBot as boolean) ?? false };
    case 'game.initialized':
      return { ...base, stateHash: (p.initialStateHash as string) ?? null };
    case 'game.completed':
      return { ...base, winner: p.winnerIndex as number, reason: p.victoryType as string };
    default: {
      const rest = Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'stateHashAfter'));
      return { ...base, ...rest };
    }
  }
}

function renderEventLogHtml(matchId: string, events: PhalanxEvent[]): string {
  return `<html><body><h1>Log ${matchId}</h1><pre>${JSON.stringify(events, null, 2)}</pre></body></html>`;
}

export function registerMatchLogRoutes(fastify: FastifyInstance, matchManager: MatchManager): void {
  const matchRepo = new MatchRepository();

  fastify.get<{ Querystring: { page?: string; limit?: string } }>(
    '/matches/completed',
    async (request, reply) =>
      traceHttpHandler('matchLog.listCompleted', httpTraceContext(request, reply), async () => {
        const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '20', 10) || 20));
        return matchRepo.getCompletedMatches(page, limit);
      }),
  );

  fastify.get<{ Params: { id: string }; Querystring: { format?: string } }>(
    '/matches/:id/log',
    async (request, reply) =>
      traceHttpHandler('matchLog.getLog', httpTraceContext(request, reply), async () => {
        const { id } = request.params;
        const actor = await matchManager.getOrCreateActor(id);
        const state = actor.getState();

        if (!state) {
          void reply.status(404);
          return { error: 'Match log not found', code: 'LOG_NOT_FOUND' };
        }

        let log = buildMatchEventLog(id, state);
        log = await authorizeLogAccess(id, log, request, matchManager);

        const accept = request.headers.accept ?? '';
        if (accept.includes('text/html')) {
          void reply.header('Content-Type', 'text/html; charset=utf-8');
          return renderEventLogHtml(log.matchId, log.events);
        }

        if (request.query.format === 'compact') {
          return log.events.map((ev, seq) => toCompactEvent(ev, seq));
        }

        return log;
      }),
  );
}
