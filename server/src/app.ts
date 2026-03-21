import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { trace, isSpanContextValid } from '@opentelemetry/api';
import Fastify from 'fastify';
import type { FastifyLoggerOptions } from 'fastify';
import websocket from '@fastify/websocket';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { RawData } from 'ws';
import {
  SCHEMA_VERSION,
  ClientMessageSchema,
  DEFAULT_MATCH_PARAMS,
  formatGamertag,
} from '@phalanxduel/shared';
import type { ServerMessage } from '@phalanxduel/shared';
import * as Sentry from '@sentry/node';
import { MatchManager } from './match.js';
import { InMemoryLedgerStore, EventEmitterBus } from './db/in-memory-store.js';
import { PostgresLedgerStore, PostgresEventBus } from './db/postgres-store.js';
import type { ILedgerStore, IEventBus } from './db/state-interfaces.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerStatsRoutes } from './routes/stats.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerLadderRoutes } from './routes/ladder.js';
import { registerMatchLogRoutes } from './routes/matches.js';
import { registerInternalRoutes } from './routes/internal.js';
import { traceWsMessage, traceHttpHandler, httpTraceContext } from './tracing.js';
import {
  matchesActive,
  actionsTotal,
  actionsDurationMs,
  wsConnections,
  testCounter,
  trackProcess,
} from './metrics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
type FastifyLoggerConfig = FastifyLoggerOptions & {
  mixin?: () => Record<string, unknown>;
  transport?: {
    targets: {
      target: string;
      level: string;
      options?: Record<string, unknown>;
    }[];
  };
};

function buildLoggerConfig(): FastifyLoggerConfig {
  const env = process.env.NODE_ENV ?? 'development';
  if (env === 'test') return { level: 'warn' as const };

  const mixin = () => {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const ctx = span.spanContext();
    if (!isSpanContextValid(ctx)) return {};
    return { trace_id: ctx.traceId, span_id: ctx.spanId };
  };

  if (env === 'production') return { level: process.env.LOG_LEVEL ?? 'info', mixin };

  const logFile = process.env.LOG_FILE ?? '../logs/server.log';
  return {
    level: process.env.LOG_LEVEL ?? 'debug',
    mixin,
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
          level: 'debug',
        },
        {
          target: 'pino/file',
          options: { destination: logFile, mkdir: true },
          level: 'info',
        },
      ],
    },
  };
}

function resolveCreateMatchSeed(msg: { rngSeed?: number }): number | undefined {
  return msg.rngSeed;
}

export async function buildApp() {
  const app = Fastify({
    pluginTimeout: 30000,
    logger: buildLoggerConfig(),
  });

  app.setErrorHandler((error, _request, reply) => {
    Sentry.captureException(error, { mechanism: { type: 'fastify', handled: false } });
    void reply.status(500).send({ error: 'Internal Server Error' });
  });

  const isDistributed =
    process.env.DISTRIBUTED_MODE === 'true' || process.env.DISTRIBUTED_MODE === '1';
  const connectionString = process.env.DATABASE_URL;

  let ledgerStore: ILedgerStore;
  let eventBus: IEventBus;

  if (isDistributed && connectionString) {
    app.log.info('Initializing Distributed Mode (Postgres Ledger)');
    ledgerStore = new PostgresLedgerStore();
    eventBus = new PostgresEventBus(connectionString);
    app.addHook('onClose', async () => {
      await (eventBus as PostgresEventBus).close();
    });
  } else {
    app.log.info('Initializing Local Mode (In-Memory Ledger)');
    ledgerStore = new InMemoryLedgerStore();
    eventBus = new EventEmitterBus();
  }

  const matchManager = new MatchManager(ledgerStore, eventBus);

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }

  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: jwtSecret || 'phalanx-dev-secret',
    cookie: { cookieName: 'token', signed: false },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Phalanx Duel Game Server',
        version: SCHEMA_VERSION,
        description: 'Authoritative game server.',
      },
      servers: [{ url: 'http://localhost:3001', description: 'Local development' }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  await app.register(helmet, {
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          process.env.APP_ENV === 'production' ? '' : "'unsafe-inline'",
          'https://js.sentry-cdn.com',
          'https://browser.sentry-cdn.com',
          'https://phalanxduel.com',
        ].filter(Boolean),
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'wss://phalanxduel.fly.dev', 'ws://localhost:3001'],
        imgSrc: ["'self'", 'data:', 'https://js.sentry-cdn.com', 'https://stats.phalanxduel.com'],
        workerSrc: ["'self'", 'blob:'],
        frameAncestors: ["'self'", 'https://phalanxduel.com'],
        upgradeInsecureRequests: [],
      },
    },
  });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute', allowList: ['127.0.0.1'] });

  await app.register(websocket);

  registerHealthRoutes(app);
  registerStatsRoutes(app, matchManager);
  registerAuthRoutes(app);
  registerLadderRoutes(app);
  registerMatchLogRoutes(app, matchManager);
  registerInternalRoutes(app, matchManager);

  const clientDist = resolve(__dirname, '../../client/dist');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist });
  }

  app.get('/api/defaults', async (request, reply) =>
    traceHttpHandler('defaults', httpTraceContext(request, reply), () => ({
      ...DEFAULT_MATCH_PARAMS,
      startingLifepoints: 20,
    })),
  );

  app.post('/matches', async (request, reply) => {
    return traceHttpHandler('createMatch', httpTraceContext(request, reply), (span) => {
      const { matchId } = matchManager.createPendingMatch();
      span.setAttribute('match.id', matchId);
      matchesActive.add(1);
      void reply.status(201);
      return { matchId };
    });
  });

  app.get('/matches', async (request, reply) => {
    return traceHttpHandler('listMatches', httpTraceContext(request, reply), async () => {
      return await matchManager.listActiveMatches();
    });
  });

  if (
    (process.env.NODE_ENV ?? 'development') === 'development' ||
    process.env.NODE_ENV === 'test' ||
    process.env.PHALANX_ENABLE_DEBUG_ERROR_ROUTE === '1'
  ) {
    app.get('/debug/error', async (request, reply) =>
      traceHttpHandler('debug.error', httpTraceContext(request, reply), () => {
        testCounter.add(1);
        throw new Error('Sentry Validation Error: Server-side trigger successful');
      }),
    );
  }

  const wsConnectionsByIp = new Map<string, number>();
  const MAX_WS_PER_IP = (process.env.NODE_ENV ?? 'development') === 'production' ? 10 : 50;

  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, async (socket, req) => {
      const clientIp = req.ip;
      const currentCount = wsConnectionsByIp.get(clientIp) || 0;
      if (currentCount >= MAX_WS_PER_IP) {
        socket.close(1008, 'Too many connections from this IP');
        return;
      }
      wsConnectionsByIp.set(clientIp, currentCount + 1);

      let authUser: { id: string; name: string } | null = null;
      try {
        const token =
          req.cookies.phalanx_refresh ||
          req.cookies.token ||
          req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          const p = fastify.jwt.verify<{
            id: string;
            gamertag: string;
            suffix: number;
            name?: string;
          }>(token);
          authUser = {
            id: p.id,
            name: p.name || `${p.gamertag}#${String(p.suffix).padStart(4, '0')}`,
          };
        }
      } catch {
        /* Guest */
      }

      void trackProcess('ws.connection', {}, () => {
        wsConnections.add(1);
        let isAlive = true;
        socket.on('pong', () => {
          isAlive = true;
        });
        const pingInterval = setInterval(() => {
          if (!isAlive) {
            socket.terminate();
            return;
          }
          isAlive = false;
          socket.ping();
        }, 30_000);

        function sendMessage(msg: ServerMessage): void {
          if (socket.readyState === 1) {
            socket.send(JSON.stringify(msg));
          }
        }

        socket.on('message', (raw: RawData) => {
          const size = Array.isArray(raw)
            ? raw.reduce((acc, b) => acc + b.length, 0)
            : raw instanceof ArrayBuffer
              ? raw.byteLength
              : raw.length;
          if (size > 10240) {
            socket.close(1009, 'Message too large');
            return;
          }

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
              traceWsMessage('createMatch', {}, async (span) => {
                try {
                  const resolvedSeed = resolveCreateMatchSeed(msg);
                  const { matchId, playerId, playerIndex } = await matchManager.createMatch(
                    authUser?.name || msg.playerName,
                    socket,
                    {
                      gameOptions: msg.gameOptions,
                      rngSeed: resolvedSeed,
                      matchParams: msg.matchParams,
                      userId: authUser?.id,
                    },
                  );
                  span.setAttribute('match.id', matchId);
                  matchesActive.add(1);
                  sendMessage({ type: 'matchCreated', matchId, playerId, playerIndex });
                } catch (err) {
                  const error = err instanceof Error ? err.message : 'Unknown error';
                  sendMessage({ type: 'matchError', error, code: 'CREATE_FAILED' });
                }
              });
              break;
            }
            case 'joinMatch': {
              traceWsMessage('joinMatch', { 'match.id': msg.matchId }, async (span) => {
                try {
                  const { playerId, playerIndex } = await matchManager.joinMatch(
                    msg.matchId,
                    authUser?.name || msg.playerName,
                    socket,
                    authUser?.id,
                  );
                  span.setAttribute('player.id', playerId);
                  sendMessage({ type: 'matchJoined', matchId: msg.matchId, playerId, playerIndex });
                } catch (err) {
                  const error = err instanceof Error ? err.message : 'Unknown error';
                  sendMessage({ type: 'matchError', error, code: 'JOIN_FAILED' });
                }
              });
              break;
            }
            case 'watchMatch': {
              traceWsMessage('watchMatch', { 'match.id': msg.matchId }, async (span) => {
                try {
                  const { spectatorId } = await matchManager.watchMatch(msg.matchId, socket);
                  span.setAttribute('spectator.id', spectatorId);
                  sendMessage({ type: 'spectatorJoined', matchId: msg.matchId, spectatorId });
                } catch (err) {
                  const error = err instanceof Error ? err.message : 'Unknown error';
                  sendMessage({ type: 'matchError', error, code: 'WATCH_FAILED' });
                }
              });
              break;
            }
            case 'authenticate': {
              try {
                const authPayload = fastify.jwt.verify<{
                  id: string;
                  gamertag: string;
                  suffix: number;
                }>(msg.token);
                const displayName = formatGamertag(authPayload.gamertag, authPayload.suffix);
                authUser = { id: authPayload.id, name: displayName };
                sendMessage({
                  type: 'authenticated',
                  user: { id: authPayload.id, name: displayName, elo: 0 },
                });
              } catch {
                sendMessage({ type: 'auth_error', error: 'Invalid token' });
              }
              break;
            }
            case 'action': {
              const actor = matchManager.getActorForSocket(socket);
              if (!actor) {
                sendMessage({
                  type: 'matchError',
                  error: 'Not connected to a match',
                  code: 'NOT_IN_MATCH',
                });
                return;
              }
              traceWsMessage(
                'action',
                { 'match.id': msg.matchId, 'action.type': msg.action.type },
                async () => {
                  await trackProcess(
                    'game.action',
                    { 'action.type': msg.action.type, 'match.id': msg.matchId },
                    async () => {
                      const start = performance.now();
                      try {
                        await actor.handleAction(msg.action);
                        actionsTotal.add(1, { 'action.type': msg.action.type });
                        actionsDurationMs.record(performance.now() - start);
                      } catch (err) {
                        actionsDurationMs.record(performance.now() - start);
                        const error = err instanceof Error ? err.message : 'Unknown error';
                        sendMessage({ type: 'actionError', error, code: 'ACTION_FAILED' });
                        throw err;
                      }
                    },
                  );
                },
              );
              break;
            }
          }
        });

        socket.on('close', () => {
          clearInterval(pingInterval);
          wsConnections.add(-1);
          matchManager.handleDisconnect(socket);
          const count = wsConnectionsByIp.get(clientIp) || 1;
          if (count <= 1) wsConnectionsByIp.delete(clientIp);
          else wsConnectionsByIp.set(clientIp, count - 1);
        });
      });
    });
  });

  matchManager.onMatchRemoved = () => {
    matchesActive.add(-1);
  };
  return app;
}
