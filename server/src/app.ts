import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { trace, isSpanContextValid } from '@opentelemetry/api';
import Fastify from 'fastify';
import type { FastifyLoggerOptions } from 'fastify';
import websocket from '@fastify/websocket';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { fastifySwagger as swagger } from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import {
  SCHEMA_VERSION,
  DEV_PORTS,
  MatchParametersSchema,
  GameStateSchema,
  PhalanxTurnResultSchema,
  MatchEventLogSchema,
  ErrorResponseSchema,
  SuitSchema,
  CardTypeSchema,
  CardSchema,
  PartialCardSchema,
  GridPositionSchema,
  BattlefieldCardSchema,
  TurnPhaseSchema,
  GamePhaseSchema,
  VictoryTypeSchema,
  GameViewModelSchema,
  TurnViewModelSchema,
  CardManifestSchema,
  PhaseRulesSchema,
  StateTransitionSchema,
  TransitionTriggerSchema,
} from '@phalanxduel/shared';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { emitOtlpLog } from './instrument.js';
import { toJsonSchema } from './utils/openapi.js';
import { LocalMatchManager, type IMatchManager } from './match.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerDocsRoutes } from './routes/docs.js';
import { registerStatsRoutes } from './routes/stats.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerLadderRoutes } from './routes/ladder.js';
import { registerProfileRoutes } from './routes/profiles.js';
import { registerMatchLogRoutes } from './routes/matches.js';
import { registerInternalRoutes } from './routes/internal.js';
import { registerDiscoveryRoutes } from './routes/discovery.js';
import { registerMatchmakingRoutes } from './routes/matchmaking.js';
import { registerSpectatorRoutes } from './routes/spectator.js';
import { registerSocialRoutes } from './routes/social.js';
import { storeRoutes } from './routes/store.js';
import { registerWebSocketRoute } from './ws-handler.js';
import { traceHttpHandler, httpTraceContext } from './tracing.js';
import { matchesActive, testCounter, trackProcess } from './metrics.js';
import { client } from './db/index.js';
import { PostgresEventBus, InMemoryEventBus } from './event-bus.js';
import { MatchRepository } from './db/match-repo.js';
import { PostgresLedgerStore } from './db/ledger-store.js';

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

/**
 * Build Pino logger configuration for Fastify.
 * - test:        minimal (warn level only, no noise)
 * - production:  NDJSON to stdout with trace_id/span_id mixin (Fly.io captures it)
 * - development: pino-pretty to stdout + NDJSON to logs/server.log, debug level
 */
function buildLoggerConfig(): FastifyLoggerConfig {
  const env = process.env.NODE_ENV ?? 'development';

  if (env === 'test') {
    return { level: 'warn' as const };
  }

  const mixin = () => {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const ctx = span.spanContext();
    if (!isSpanContextValid(ctx)) return {};
    return { trace_id: ctx.traceId, span_id: ctx.spanId };
  };

  if (env === 'production') {
    return { level: process.env.LOG_LEVEL ?? 'info', mixin };
  }

  // Development: colorized stdout via pino-pretty + NDJSON file for tailing
  // We also add a stream that forwards logs to OTel via console capture.
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

const LOCAL_DEV_CONNECT_SRCS = [
  `http://localhost:${DEV_PORTS.server}`,
  `http://127.0.0.1:${DEV_PORTS.server}`,
  `http://localhost:${DEV_PORTS.client}`,
  `http://127.0.0.1:${DEV_PORTS.client}`,
  `ws://localhost:${DEV_PORTS.server}`,
  `ws://127.0.0.1:${DEV_PORTS.server}`,
  `ws://localhost:${DEV_PORTS.client}`,
  `ws://127.0.0.1:${DEV_PORTS.client}`,
  'https://play.phalanxduel.localhost',
  'wss://play.phalanxduel.localhost',
  'https://admin.phalanxduel.localhost',
  'wss://admin.phalanxduel.localhost',
  'https://play.lan.phalanxduel.com',
  'wss://play.lan.phalanxduel.com',
  'https://admin.lan.phalanxduel.com',
  'wss://admin.lan.phalanxduel.com',
  'https://lan.phalanxduel.com',
  'wss://lan.phalanxduel.com',
] as const;

interface BuildAppOptions {
  matchManager?: IMatchManager;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    trustProxy: true,
    pluginTimeout: 30000,
    logger: buildLoggerConfig(),
  });
  app.setErrorHandler((error, _request, reply) => {
    // Fastify errors can have validation properties
    const fastifyError = error as {
      validation?: Record<string, unknown>[];
      statusCode?: number;
    };

    if (fastifyError.validation) {
      void reply.status(400).send({
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: fastifyError.validation,
      });
      return;
    }

    const statusCode = fastifyError.statusCode ?? 500;
    if (statusCode === 500) {
      app.log.error(error);
    }

    void reply.status(statusCode).send({
      success: false,
      status: statusCode,
      error: fastifyError.statusCode ? 'API_ERROR' : 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  const eventBus = client ? new PostgresEventBus(client) : new InMemoryEventBus();
  const matchRepo = new MatchRepository();
  const ledgerStore = new PostgresLedgerStore(eventBus);
  const matchManager =
    options.matchManager ?? new LocalMatchManager(matchRepo, ledgerStore, undefined, eventBus);

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }

  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: jwtSecret ?? 'phalanx-dev-secret',
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // 2. Register Swagger Plugin
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Phalanx Duel Game Server',
        version: SCHEMA_VERSION,
        description:
          'Authoritative game server for Phalanx Duel.\n\n' +
          '## Authoritative References\n\n' +
          '- **[RULES.md](https://github.com/phalanxduel/phalanxduel/blob/main/docs/gameplay/rules.md)** — Canonical deterministic rules specification (v1.0). All game logic, state machine transitions, suit boundary effects, and victory conditions are defined here.\n' +
          '- **[EVENT_SCHEMAS.md](https://github.com/phalanxduel/phalanxduel/blob/main/docs/api/event-schemas.md)** — External event validation schemas.\n' +
          '- **[AsyncAPI Spec](/docs/asyncapi.yaml)** — WebSocket protocol specification for real-time gameplay.\n\n' +
          '## Discovery Endpoints\n\n' +
          '- `GET /api/rules/phases` — State machine transition table. Returns all valid phase transitions and their triggers.\n' +
          '- `GET /api/cards/manifest` — Card manifest. Returns all possible cards in a standard deck with deterministic stats.\n' +
          '- `GET /api/defaults` — Default match parameters and system constraints.\n\n' +
          '## State Machine Constraints\n\n' +
          'A schema-valid action can be semantically invalid if sent in the wrong phase. ' +
          'The `deploy` action is only valid during `DeploymentPhase`. ' +
          'The `attack` and `pass` actions are only valid during `AttackPhase`. ' +
          'The `reinforce` action is only valid during `ReinforcementPhase`. ' +
          'The `forfeit` action is valid in any phase. ' +
          'See the `/api/rules/phases` endpoint for the full transition table.',
      },
      servers: [
        { url: 'http://127.0.0.1:3001', description: 'Local development' },
        { url: 'https://play.phalanxduel.com', description: 'Production (Custom Domain)' },
        { url: 'https://phalanxduel.fly.dev', description: 'Production (Direct)' },
      ],
      components: {
        schemas: {
          Suit: toJsonSchema(SuitSchema),
          CardType: toJsonSchema(CardTypeSchema),
          Card: toJsonSchema(CardSchema),
          PartialCard: toJsonSchema(PartialCardSchema),
          GridPosition: toJsonSchema(GridPositionSchema),
          BattlefieldCard: toJsonSchema(BattlefieldCardSchema),
          TurnPhase: toJsonSchema(TurnPhaseSchema),
          GamePhase: toJsonSchema(GamePhaseSchema),
          VictoryType: toJsonSchema(VictoryTypeSchema),
          MatchParameters: toJsonSchema(MatchParametersSchema),
          GameState: toJsonSchema(GameStateSchema),
          TurnResult: toJsonSchema(PhalanxTurnResultSchema),
          MatchLog: toJsonSchema(MatchEventLogSchema),
          ErrorResponse: toJsonSchema(ErrorResponseSchema),
          GameViewModel: toJsonSchema(GameViewModelSchema),
          TurnViewModel: toJsonSchema(TurnViewModelSchema),
          CardManifest: toJsonSchema(CardManifestSchema),
          PhaseRules: toJsonSchema(PhaseRulesSchema),
          StateTransition: toJsonSchema(StateTransitionSchema),
          TransitionTrigger: toJsonSchema(TransitionTriggerSchema),
        },
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'phalanx_refresh',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(helmet, {
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    frameguard: false, // Relies entirely on CSP frameAncestors to avoid legacy SAMEORIGIN conflicts
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          process.env.APP_ENV === 'production' ? '' : "'unsafe-inline'", // Disallow unsafe-inline in prod
          'https://phalanxduel.com',
          'https://gc.zgo.at',
        ].filter(Boolean),
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: [
          "'self'",
          'wss://phalanxduel.fly.dev', // Production WS (Direct)
          'wss://play.phalanxduel.com', // Production WS (Custom Domain)
          'https://phalanxduel.com',
          'https://stats.phalanxduel.com',
          ...LOCAL_DEV_CONNECT_SRCS,
        ],
        imgSrc: ["'self'", 'data:', 'https://stats.phalanxduel.com'],
        workerSrc: ["'self'", 'blob:'],
        frameSrc: ["'self'"],
        frameAncestors: [
          "'self'",
          'https://phalanxduel.com',
          'https://www.phalanxduel.com',
          'https://phalanxduel.github.io',
        ],
        upgradeInsecureRequests: [],
      },
    },
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
    errorResponseBuilder: (_req, context) => ({
      error: `Too many requests. Please try again in ${context.after}.`,
      code: 'RATE_LIMITED',
    }),
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });

  await app.register(websocket);

  registerHealthRoutes(app);
  registerDocsRoutes(app);
  registerStatsRoutes(app, matchManager);
  registerAuthRoutes(app);
  registerLadderRoutes(app);
  registerProfileRoutes(app);
  registerMatchLogRoutes(app, matchManager);
  registerInternalRoutes(app, matchManager);
  registerDiscoveryRoutes(app);
  registerMatchmakingRoutes(app, matchManager);
  registerSpectatorRoutes(app, matchManager);
  registerSocialRoutes(app);
  await app.register(storeRoutes, { prefix: '/api' });

  // ── Static file serving (production: serve client/dist/) ─────────
  const clientDist = resolve(__dirname, '../../client/dist');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist });

    // SPA Wildcard: Serve index.html for any route not found (History API)
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        void reply.status(404).send({
          error: 'Not Found',
          message: `Route ${request.method}:${request.url} not found`,
          statusCode: 404,
        });
        return;
      }
      void reply.sendFile('index.html');
    });
  }

  // ── POST /matches — create match via REST ────────────────────────
  app.post(
    '/matches',
    {
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
    },
    async (request, reply) => {
      return traceHttpHandler('createMatch', httpTraceContext(request, reply), async (span) => {
        const { matchId } = await matchManager.createPendingMatch();
        span.setAttribute('match.id', matchId);
        matchesActive.add(1);

        void reply.status(201);
        return { matchId };
      });
    },
  );

  // ── GET /matches — public feed of active matches ─────────────────
  app.get(
    '/matches',
    {
      schema: {
        tags: ['matches'],
        summary: 'List all active matches',
        response: {
          200: {
            description: 'List of active matches with status summary',
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
    },
    async (request, reply) => {
      return traceHttpHandler('listMatches', httpTraceContext(request, reply), async () => {
        const now = Date.now();
        const activeMatches = await matchManager.listAllActiveMatches();
        const inMemory = new Map(matchManager.listInMemoryMatches().map((m) => [m.matchId, m]));

        const feed = activeMatches.map((dbMatch) => {
          const local = inMemory.get(dbMatch.matchId);
          const match = local || dbMatch;

          return {
            matchId: match.matchId,
            players: match.players
              .map((p) =>
                p
                  ? {
                      name: p.playerName,
                      connected: matchManager.isPlayerConnected(match.matchId, p.playerId),
                    }
                  : null,
              )
              .filter(Boolean),
            spectatorCount: match.spectators.length,
            phase: match.state?.phase ?? null,
            turnNumber: match.state?.turnNumber ?? null,
            ageSeconds: Math.floor((now - match.createdAt) / 1000),
            lastActivitySeconds: Math.floor((now - match.lastActivityAt) / 1000),
          };
        });
        return feed;
      });
    },
  );

  // Retired operator route. Replay validation is available only through the
  // dedicated admin service and the private /internal boundary.
  app.get<{ Params: { matchId: string } }>(
    '/matches/:matchId/replay',
    {
      schema: {
        hide: true,
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
          410: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.status(410).send({
        error: 'Operator replay validation moved to the dedicated admin service',
        code: 'ADMIN_SURFACE_RETIRED',
      });
    },
  );

  // Retired operator route. A/B snapshots are available through the dedicated admin service.
  app.get(
    '/admin/ab-tests',
    {
      schema: {
        hide: true,
        response: {
          200: {
            type: 'object',
            properties: {
              tests: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    variants: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          ratio: { type: 'number' },
                        },
                        required: ['name', 'ratio'],
                      },
                    },
                    totalRatio: { type: 'number' },
                  },
                  required: ['id', 'description', 'variants', 'totalRatio'],
                },
              },
              warnings: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['tests', 'warnings'],
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
            required: ['error', 'code'],
          },
          410: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
            required: ['error', 'code'],
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.status(410).send({
        error: 'A/B test operations moved to the dedicated admin service',
        code: 'ADMIN_SURFACE_RETIRED',
      });
    },
  );

  // Retired operator route. The game server no longer hosts an admin dashboard.
  app.get(
    '/admin',
    {
      schema: {
        hide: true,
      },
    },
    async (_request, reply) => {
      return reply.status(410).send({
        error: 'Operator dashboard moved to the dedicated admin service',
        code: 'ADMIN_SURFACE_RETIRED',
      });
    },
  );

  const allowDebugErrorRoute =
    (process.env.NODE_ENV ?? 'development') === 'development' ||
    process.env.NODE_ENV === 'test' ||
    process.env.PHALANX_ENABLE_DEBUG_ERROR_ROUTE === '1';
  if (allowDebugErrorRoute) {
    // ── GET /debug/error — trigger a server error for OTel validation ──
    app.get('/debug/error', { schema: { hide: true } }, async (request, reply) =>
      traceHttpHandler('debug.error', httpTraceContext(request, reply), () => {
        emitOtlpLog(SeverityNumber.INFO, 'INFO', 'User triggered test error', {
          action: 'test_error_endpoint',
        });
        testCounter.add(1);
        throw new Error('OTel Validation Error: Server-side trigger successful');
      }),
    );
  }

  registerWebSocketRoute(app, matchManager);

  // Match cleanup: remove stale matches every 60 seconds
  matchManager.onMatchRemoved = () => {
    matchesActive.add(-1);
  };
  const cleanupInterval = setInterval(() => {
    void trackProcess('match.cleanup', {}, () => {
      const removed = matchManager.cleanupMatches();
      if (removed > 0) {
        app.log.info({ removed }, 'Cleaned up stale matches');
      }
    });
  }, 60_000);

  // Expire public-open matches whose TTL has passed. Runs at startup and every 5 minutes.
  const runExpiry = () => {
    void matchRepo.expirePublicOpenMatches().then((expired) => {
      if (expired > 0) {
        app.log.info({ expired }, 'Expired public-open matches');
      }
    });
  };
  runExpiry();
  const expiryInterval = setInterval(runExpiry, 5 * 60_000);

  app.addHook('onClose', async () => {
    clearInterval(cleanupInterval);
    clearInterval(expiryInterval);
    await eventBus.close();
  });

  // Expose matchManager for testing
  app.decorate('matchManager', matchManager);

  return app;
}
