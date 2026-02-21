import { randomUUID, timingSafeEqual } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { RawData } from 'ws';
import { SCHEMA_VERSION, ClientMessageSchema } from '@phalanxduel/shared';
import { computeStateHash } from '@phalanxduel/shared/hash';
import type { ServerMessage } from '@phalanxduel/shared';
import { replayGame } from '@phalanxduel/engine';
import { MatchManager, MatchError, ActionError } from './match.js';
import { renderAdminDashboard } from './adminDashboard.js';
import { traceWsMessage, traceHttpHandler } from './tracing.js';
import { 
  matchesActive, 
  actionsTotal, 
  actionsDurationMs, 
  wsConnections,
  trackProcess,
  recordPhaseTransition
} from './metrics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Verify HTTP Basic Auth credentials using timing-safe comparison.
 * Reads PHALANX_ADMIN_USER / PHALANX_ADMIN_PASSWORD from env; defaults to phalanx/phalanx.
 */
function checkBasicAuth(authHeader: string | undefined): boolean {
  if (!authHeader) return false;

  const match = /^Basic\s+(.+)$/i.exec(authHeader);
  if (!match) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(match[1]!, 'base64').toString('utf8');
  } catch {
    return false;
  }

  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) return false;

  const user = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  const expectedUser = process.env['PHALANX_ADMIN_USER'] ?? 'phalanx';
  const expectedPassword = process.env['PHALANX_ADMIN_PASSWORD'] ?? 'phalanx';

  // Pad to fixed length so timingSafeEqual doesn't throw on length mismatch.
  const MAX_LEN = 256;
  const userActual = Buffer.alloc(MAX_LEN);
  const userExpected = Buffer.alloc(MAX_LEN);
  userActual.write(user.slice(0, MAX_LEN), 'utf8');
  userExpected.write(expectedUser.slice(0, MAX_LEN), 'utf8');

  const passActual = Buffer.alloc(MAX_LEN);
  const passExpected = Buffer.alloc(MAX_LEN);
  passActual.write(password.slice(0, MAX_LEN), 'utf8');
  passExpected.write(expectedPassword.slice(0, MAX_LEN), 'utf8');

  return timingSafeEqual(userActual, userExpected) && timingSafeEqual(passActual, passExpected);
}

function resolveCreateMatchSeed(msg: {
  rngSeed?: number;
  gameOptions?: { rngSeed?: number };
}): number | undefined {
  return msg.gameOptions?.rngSeed ?? msg.rngSeed;
}

export async function buildApp() {
  const app = Fastify({
    pluginTimeout: 30000,
    logger: true,
  });
  const matchManager = new MatchManager();

  await app.register(swagger, {
    openapi: {
      info: { title: 'Phalanx Duel Game Server', version: SCHEMA_VERSION },
      servers: [{ url: 'http://localhost:3001' }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Sentry loader and some Vite logic
          "https://js.sentry-cdn.com",
          "https://browser.sentry-cdn.com",
          "https://us.i.posthog.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: [
          "'self'",
          "wss://phalanxduel.fly.dev", // Production WS
          "ws://localhost:3001",        // Local WS
          "https://o450885210358f11c.ingest.us.sentry.io",
          "https://us.i.posthog.com",
        ],
        imgSrc: ["'self'", "data:", "https://js.sentry-cdn.com"],
        workerSrc: ["'self'", "blob:"],
        upgradeInsecureRequests: [],
      },
    },
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });
  await app.register(websocket);

  // ── Static file serving (production: serve client/dist/) ─────────
  const clientDist = resolve(__dirname, '../../client/dist');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist });
  }

  // ── Health endpoint ──────────────────────────────────────────────
  app.get('/health', {
    schema: {
      tags: ['system'],
      summary: 'Server health check',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
            uptime_seconds: { type: 'integer' },
            memory_heap_used_mb: { type: 'integer' },
            observability: {
              type: 'object',
              properties: {
                sentry_initialized: { type: 'boolean' },
                posthog_initialized: { type: 'boolean' },
                region: { type: 'string' },
              }
            }
          },
        },
      },
    },
  }, async () => {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: SCHEMA_VERSION,
      uptime_seconds: Math.floor(process.uptime()),
      memory_heap_used_mb: Math.floor(memory.heapUsed / 1024 / 1024),
      observability: {
        sentry_initialized: !!process.env.SENTRY_DSN,
        posthog_initialized: !!process.env.POSTHOG_PROJECT_TOKEN,
        region: process.env.FLY_REGION || 'local',
      }
    };
  });

  // ── POST /matches — create match via REST ────────────────────────
  app.post('/matches', {
    schema: {
      tags: ['matches'],
      summary: 'Create a new match',
      response: {
        201: {
          type: 'object',
          properties: {
            matchId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    return traceHttpHandler('createMatch', (span) => {
      const matchId = randomUUID();
      span.setAttribute('match.id', matchId);

      // Pre-register match slot so joinMatch works via WS
      const now = Date.now();
      const match = {
        matchId,
        players: [null, null] as [null, null],
        spectators: [],
        state: null,
        config: null,
        actionHistory: [],
        createdAt: now,
        lastActivityAt: now,
      };
      matchManager.matches.set(matchId, match as never);
      matchesActive.add(1);

      void reply.status(201);
      return { matchId };
    });
  });

  // ── GET /matches — public feed of active matches ─────────────────
  app.get('/matches', {
    schema: {
      tags: ['matches'],
      summary: 'List all active matches',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              matchId: { type: 'string', format: 'uuid' },
              players: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    connected: { type: 'boolean' },
                  },
                },
              },
              spectatorCount: { type: 'integer' },
              phase: { type: 'string', nullable: true },
              turnNumber: { type: 'integer', nullable: true },
              ageSeconds: { type: 'integer' },
              lastActivitySeconds: { type: 'integer' },
            },
          },
        },
      },
    },
  }, async () => {
    const now = Date.now();
    const feed = [...matchManager.matches.values()].map((m) => ({
      matchId: m.matchId,
      players: m.players
        .map((p) =>
          p ? { name: p.playerName, connected: p.socket?.readyState === 1 } : null,
        )
        .filter(Boolean),
      spectatorCount: m.spectators.length,
      phase: m.state?.phase ?? null,
      turnNumber: m.state?.turnNumber ?? null,
      ageSeconds: Math.floor((now - m.createdAt) / 1000),
      lastActivitySeconds: Math.floor((now - m.lastActivityAt) / 1000),
    }));
    return feed;
  });

  // ── GET /matches/:matchId/replay — replay and validate a match ──
  app.get<{ Params: { matchId: string } }>('/matches/:matchId/replay', {
    schema: {
      tags: ['matches'],
      summary: 'Replay and validate a match from its action history',
      params: {
        type: 'object',
        properties: {
          matchId: { type: 'string', format: 'uuid' },
        },
        required: ['matchId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            actionCount: { type: 'integer' },
            finalStateHash: { type: 'string' },
            error: { type: 'string' },
            failedAtIndex: { type: 'integer' },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    if (!checkBasicAuth(request.headers['authorization'])) {
      void reply.status(401).header('WWW-Authenticate', 'Basic realm="Phalanx Duel Admin"');
      return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
    }

    const { matchId } = request.params;
    const match = matchManager.matches.get(matchId);
    if (!match?.config) {
      void reply.status(404);
      return { error: 'Match not found', code: 'MATCH_NOT_FOUND' };
    }

    const result = replayGame(match.config, match.actionHistory, {
      hashFn: computeStateHash,
    });

    return {
      valid: result.valid,
      actionCount: match.actionHistory.length,
      finalStateHash: computeStateHash(result.finalState),
      ...(result.error ? { error: result.error, failedAtIndex: result.failedAtIndex } : {}),
    };
  });

  // ── GET /admin — Basic Auth HTML admin dashboard ─────────────────
  app.get('/admin', {
    schema: {
      hide: true,
    },
  }, async (request, reply) => {
    if (!checkBasicAuth(request.headers['authorization'])) {
      void reply.status(401)
        .header('WWW-Authenticate', 'Basic realm="Phalanx Duel Admin"')
        .header('Content-Type', 'text/html');
      return '<p>Unauthorized</p>';
    }
    void reply.header('Content-Type', 'text/html');
    return renderAdminDashboard();
  });

  // ── WebSocket routing ────────────────────────────────────────────
  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
      // 1. Origin Validation
      const origin = req.headers.origin;
      const allowedOrigins = [
        'https://phalanxduel.fly.dev',
        'https://phalanxduel.github.io',
        'http://localhost:3001',
        'http://localhost:5173', // Vite dev server
      ];
      
      if (origin && !allowedOrigins.includes(origin)) {
        app.log.warn({ origin }, 'WebSocket connection rejected: Invalid Origin');
        socket.close(1008, 'Invalid Origin');
        return;
      }

      void trackProcess('ws.connection', {}, () => {
        wsConnections.add(1);

        // Rate limiting: 10 messages per second sliding window
      const MSG_LIMIT = 10;
      const WINDOW_MS = 1000;
      const timestamps: number[] = [];

      function sendMessage(msg: ServerMessage): void {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify(msg));
        }
      }

      socket.on('message', (raw: RawData) => {
        // 2. Payload size limit (10KB)
        const size = Array.isArray(raw) 
          ? raw.reduce((acc, b) => acc + b.length, 0) 
          : raw instanceof ArrayBuffer 
            ? raw.byteLength 
            : raw.length;

        if (size > 10240) {
          app.log.warn({ size }, 'WebSocket message rejected: Payload too large');
          socket.close(1009, 'Message too large');
          return;
        }

        // Rate limit check
        const now = Date.now();
        while (timestamps.length > 0 && timestamps[0]! <= now - WINDOW_MS) {
          timestamps.shift();
        }
        if (timestamps.length >= MSG_LIMIT) {
          sendMessage({ type: 'matchError', error: 'Too many messages', code: 'RATE_LIMITED' });
          return;
        }
        timestamps.push(now);
        const messageStr = typeof raw === 'string' ? raw : raw.toString();

        let parsed: unknown;
        try {
          parsed = JSON.parse(messageStr);
        } catch {
          sendMessage({ type: 'matchError', error: 'Invalid JSON', code: 'PARSE_ERROR' });
          return;
        }

        const result = ClientMessageSchema.safeParse(parsed);
        if (!result.success) {
          sendMessage({
            type: 'matchError',
            error: 'Invalid message format',
            code: 'VALIDATION_ERROR',
          });
          return;
        }

        const msg = result.data;

        switch (msg.type) {
          case 'createMatch': {
            traceWsMessage('createMatch', {}, (span) => {
              try {
                const resolvedSeed = resolveCreateMatchSeed(msg);
                if (process.env['NODE_ENV'] === 'production' && resolvedSeed !== undefined) {
                  throw new MatchError('rngSeed is not allowed in production', 'SEED_NOT_ALLOWED');
                }

                const gameOptions = msg.gameOptions
                  ? { damageMode: msg.gameOptions.damageMode }
                  : undefined;
                const { matchId, playerId, playerIndex } = matchManager.createMatch(
                  msg.playerName,
                  socket,
                  gameOptions,
                  resolvedSeed,
                );
                span.setAttribute('match.id', matchId);
                matchesActive.add(1);
                sendMessage({ type: 'matchCreated', matchId, playerId, playerIndex });
              } catch (err) {
                if (err instanceof MatchError) {
                  sendMessage({ type: 'matchError', error: err.message, code: err.code });
                } else {
                  const error = err instanceof Error ? err.message : 'Unknown error';
                  sendMessage({ type: 'matchError', error, code: 'CREATE_FAILED' });
                }
              }
            });
            break;
          }

          case 'joinMatch': {
            traceWsMessage('joinMatch', { 'match.id': msg.matchId }, (span) => {
              try {
                const { playerId, playerIndex } = matchManager.joinMatch(
                  msg.matchId,
                  msg.playerName,
                  socket,
                );
                span.setAttribute('player.id', playerId);
                // Send matchJoined to joining player BEFORE broadcasting state
                sendMessage({
                  type: 'matchJoined',
                  matchId: msg.matchId,
                  playerId,
                  playerIndex,
                });
                matchManager.broadcastMatchState(msg.matchId);
              } catch (err) {
                if (err instanceof MatchError) {
                  sendMessage({ type: 'matchError', error: err.message, code: err.code });
                } else {
                  const error = err instanceof Error ? err.message : 'Unknown error';
                  sendMessage({ type: 'matchError', error, code: 'JOIN_FAILED' });
                }
              }
            });
            break;
          }

          case 'watchMatch': {
            traceWsMessage('watchMatch', { 'match.id': msg.matchId }, (span) => {
              try {
                const { spectatorId } = matchManager.watchMatch(msg.matchId, socket);
                span.setAttribute('spectator.id', spectatorId);
                sendMessage({ type: 'spectatorJoined', matchId: msg.matchId, spectatorId });
                // Broadcast state after sending spectatorJoined so client sets isSpectator first
                matchManager.broadcastMatchState(msg.matchId);
              } catch (err) {
                if (err instanceof MatchError) {
                  sendMessage({ type: 'matchError', error: err.message, code: err.code });
                } else {
                  const error = err instanceof Error ? err.message : 'Unknown error';
                  sendMessage({ type: 'matchError', error, code: 'WATCH_FAILED' });
                }
              }
            });
            break;
          }

          case 'action': {
            const socketInfo = matchManager.socketMap.get(socket);
            if (!socketInfo || socketInfo.isSpectator) {
              sendMessage({
                type: 'matchError',
                error: 'Not connected to a match',
                code: 'NOT_IN_MATCH',
              });
              return;
            }

            traceWsMessage(
              'action',
              {
                'match.id': msg.matchId,
                'player.id': socketInfo.playerId,
                'action.type': msg.action.type,
              },
              async (_span) => {
                await trackProcess('game.action', { 
                  'action.type': msg.action.type,
                  'match.id': msg.matchId 
                }, async () => {
                  const start = performance.now();
                  const match = matchManager.matches.get(msg.matchId);
                  const phaseBefore = match?.state?.phase ?? null;

                  try {
                    matchManager.handleAction(msg.matchId, socketInfo.playerId, msg.action);
                    actionsTotal.add(1, { 'action.type': msg.action.type });
                    actionsDurationMs.record(performance.now() - start);

                    const phaseAfter = matchManager.matches.get(msg.matchId)?.state?.phase;
                    if (phaseAfter && phaseAfter !== phaseBefore) {
                      recordPhaseTransition(msg.matchId, phaseBefore, phaseAfter);
                    }
                  } catch (err) {
                    actionsDurationMs.record(performance.now() - start);
                    if (err instanceof ActionError) {
                      sendMessage({
                        type: 'actionError',
                        matchId: err.matchId,
                        error: err.message,
                        code: err.code,
                      });
                    } else if (err instanceof MatchError) {
                      sendMessage({ type: 'matchError', error: err.message, code: err.code });
                    } else {
                      const error = err instanceof Error ? err.message : 'Unknown error';
                      sendMessage({
                        type: 'actionError',
                        matchId: msg.matchId,
                        error,
                        code: 'ACTION_FAILED',
                      });
                    }
                    throw err; // Re-throw so trackProcess records the error
                  }
                });
              },
            );
            break;
          }
        }
      });

      socket.on('close', () => {
        wsConnections.add(-1);
        matchManager.handleDisconnect(socket);
        app.log.info('WebSocket client disconnected');
      });
    });
  });
});

  // Match cleanup: remove stale matches every 60 seconds
  matchManager.onMatchRemoved = () => matchesActive.add(-1);
  const cleanupInterval = setInterval(() => {
    void trackProcess('match.cleanup', {}, () => {
      const removed = matchManager.cleanupMatches();
      if (removed > 0) {
        app.log.info({ removed }, 'Cleaned up stale matches');
      }
    });
  }, 60_000);
  app.addHook('onClose', () => clearInterval(cleanupInterval));

  // Expose matchManager for testing
  app.decorate('matchManager', matchManager);

  return app;
}
