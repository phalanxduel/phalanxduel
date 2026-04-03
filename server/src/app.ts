import { randomUUID, timingSafeEqual } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
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
import type { RawData } from 'ws';
import {
  SCHEMA_VERSION,
  ClientMessageSchema,
  DEFAULT_MATCH_PARAMS,
  formatGamertag,
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
import { computeStateHash } from '@phalanxduel/shared/hash';
import type { ServerMessage } from '@phalanxduel/shared';
import { replayGame } from '@phalanxduel/engine';
import { SeverityNumber } from '@opentelemetry/api-logs';
import { emitOtlpLog } from './instrument.js';
import { toJsonSchema } from './utils/openapi.js';
import { MatchManager, MatchError, ActionError } from './match.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerStatsRoutes } from './routes/stats.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerLadderRoutes } from './routes/ladder.js';
import { registerMatchLogRoutes } from './routes/matches.js';
import { registerInternalRoutes } from './routes/internal.js';
import { registerDiscoveryRoutes } from './routes/discovery.js';
import { registerMatchmakingRoutes } from './routes/matchmaking.js';
import { renderAdminDashboard } from './adminDashboard.js';
import { getAbTestsSnapshotFromEnv } from './abTests.js';
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

function resolvePinoConsoleTransportTarget(): string {
  const builtTarget = resolve(__dirname, './utils/pino-console-transport.js');
  if (existsSync(builtTarget)) return builtTarget;
  return resolve(__dirname, './utils/pino-console-transport.ts');
}

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
        {
          // This target uses a custom local transport that just logs to console
          // so our OTel console patch can pick it up.
          target: resolvePinoConsoleTransportTarget(),
          level: 'info',
        },
      ],
    },
  };
}

function resolveAdminCredentials(): { user: string; password: string } | null {
  const configuredUser = process.env.PHALANX_ADMIN_USER;
  const configuredPassword = process.env.PHALANX_ADMIN_PASSWORD;
  if (configuredUser && configuredPassword) {
    return { user: configuredUser, password: configuredPassword };
  }

  const env = process.env.NODE_ENV ?? 'development';
  if (env === 'development' || env === 'test') {
    return { user: 'phalanx', password: 'phalanx' };
  }

  return null;
}

/**
 * Verify HTTP Basic Auth credentials using timing-safe comparison.
 * In production-like environments, credentials must be explicitly configured.
 */
function checkBasicAuth(authHeader: string | undefined): boolean {
  if (!authHeader) return false;

  const match = /^Basic\s+(.+)$/i.exec(authHeader);
  if (!match) return false;

  let decoded: string;
  try {
    const credentials = match[1];
    if (!credentials) return false;
    decoded = Buffer.from(credentials, 'base64').toString('utf8');
  } catch {
    return false;
  }

  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) return false;

  const user = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  const creds = resolveAdminCredentials();
  if (!creds) return false;
  const expectedUser = creds.user;
  const expectedPassword = creds.password;

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

function resolveCreateMatchSeed(msg: { rngSeed?: number }): number | undefined {
  return msg.rngSeed;
}

interface ClientMessageReceipt {
  matchId?: string;
  responses: ServerMessage[];
  storedAt: number;
}

const TRANSPORT_RECEIPT_TTL_MS = 10 * 60 * 1000;
const APP_HEARTBEAT_INTERVAL_MS = 30_000;
const APP_HEARTBEAT_TIMEOUT_MS = 65_000;
const LOCAL_DEV_HTTP_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
] as const;
const LOCAL_DEV_CONNECT_SRCS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'ws://localhost:3001',
  'ws://127.0.0.1:3001',
] as const;

function isTransportOnlyServerMessage(message: ServerMessage): boolean {
  return message.type === 'ack' || message.type === 'ping' || message.type === 'pong';
}

interface BuildAppOptions {
  matchManager?: MatchManager;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    pluginTimeout: 30000,
    logger: buildLoggerConfig(),
  });
  app.setErrorHandler((error, _request, reply) => {
    // Fastify errors can have validation properties
    const fastifyError = error as {
      validation?: Record<string, unknown>[];
      statusCode?: number;
      message: string;
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
      app.log.error(error, 'Internal Server Error detected in global handler');
    }
    const code = fastifyError.statusCode ? 'API_ERROR' : 'INTERNAL_SERVER_ERROR';
    void reply.status(statusCode).send({
      error: fastifyError.statusCode ? fastifyError.message : 'Internal Server Error',
      code,
    });
  });
  const matchManager = options.matchManager ?? new MatchManager();

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(swagger as any, {
    openapi: {
      info: {
        title: 'Phalanx Duel Game Server',
        version: SCHEMA_VERSION,
        description:
          'Authoritative game server for Phalanx Duel.\n\n' +
          '## Authoritative References\n\n' +
          '- **[RULES.md](https://github.com/phalanxduel/game/blob/main/docs/RULES.md)** — Canonical deterministic rules specification (v1.0). All game logic, state machine transitions, suit boundary effects, and victory conditions are defined here.\n' +
          '- **[EVENT_SCHEMAS.md](https://github.com/phalanxduel/game/blob/main/docs/api/EVENT_SCHEMAS.md)** — External event validation schemas.\n' +
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
          basicAuth: {
            type: 'http',
            scheme: 'basic',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, { routePrefix: '/docs' });

  // ── AsyncAPI specification ──────────────────────────────────────
  const asyncapiPath = resolve(__dirname, '../../docs/api/asyncapi.yaml');
  app.get('/docs/asyncapi.yaml', { schema: { hide: true } }, async (_request, reply) => {
    try {
      if (!existsSync(asyncapiPath)) {
        void reply.status(404);
        return { error: 'AsyncAPI spec not found', code: 'NOT_FOUND' };
      }
      const content = readFileSync(asyncapiPath, 'utf8');
      void reply.type('text/yaml');
      return content;
    } catch (err) {
      app.log.error(err, 'Failed to serve AsyncAPI spec');
      void reply.status(500);
      return { error: 'Internal Server Error', code: 'INTERNAL_SERVER_ERROR' };
    }
  });

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
  registerStatsRoutes(app, matchManager);
  registerAuthRoutes(app);
  registerLadderRoutes(app);
  registerMatchLogRoutes(app, matchManager);
  registerInternalRoutes(app, matchManager);
  registerDiscoveryRoutes(app);
  registerMatchmakingRoutes(app, matchManager);

  // ── Static file serving (production: serve client/dist/) ─────────
  const clientDist = resolve(__dirname, '../../client/dist');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist });
  }

  // ── Defaults endpoint ──────────────────────────────────────────────
  app.get(
    '/api/defaults',
    {
      schema: {
        tags: ['config'],
        summary: 'Default match parameters and constraints',
        description:
          'Returns the authoritative default configuration for new matches, including grid dimensions, hand sizes, and system constraints.',
        response: {
          200: {
            description: 'Default match parameters and metadata',
            type: 'object',
            properties: {
              specVersion: { type: 'string' },
              rows: { type: 'integer' },
              columns: { type: 'integer' },
              maxHandSize: { type: 'integer' },
              initialDraw: { type: 'integer' },
              modeClassicAces: { type: 'boolean' },
              modeClassicFaceCards: { type: 'boolean' },
              modeDamagePersistence: { type: 'string' },
              modeClassicDeployment: { type: 'boolean' },
              modeQuickStart: { type: 'boolean' },
              startingLifepoints: { type: 'integer' },
              initiative: {
                type: 'object',
                properties: {
                  deployFirst: { type: 'string' },
                  attackFirst: { type: 'string' },
                },
              },
              _meta: {
                type: 'object',
                properties: {
                  configSource: { type: 'string' },
                  versions: {
                    type: 'object',
                    properties: {
                      schemaVersion: { type: 'string' },
                      specVersion: { type: 'string' },
                      compatibility: {
                        type: 'object',
                        properties: {
                          wireFormat: { type: 'string' },
                          gameplay: { type: 'string' },
                        },
                      },
                    },
                  },
                  constraints: {
                    type: 'object',
                    properties: {
                      rows: {
                        type: 'object',
                        properties: { min: { type: 'integer' }, max: { type: 'integer' } },
                      },
                      columns: {
                        type: 'object',
                        properties: { min: { type: 'integer' }, max: { type: 'integer' } },
                      },
                      maxHandSize: {
                        type: 'object',
                        properties: {
                          min: { type: 'integer' },
                          note: { type: 'string' },
                        },
                      },
                      initialDraw: {
                        type: 'object',
                        properties: { note: { type: 'string' } },
                      },
                      startingLifepoints: {
                        type: 'object',
                        properties: { min: { type: 'integer' }, max: { type: 'integer' } },
                      },
                      totalSlots: {
                        type: 'object',
                        properties: { note: { type: 'string' } },
                      },
                    },
                  },
                  botStrategies: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) =>
      traceHttpHandler('defaults', httpTraceContext(request, reply), () => ({
        ...DEFAULT_MATCH_PARAMS,
        startingLifepoints: 20,
        _meta: {
          configSource: 'shared/src/schema.ts → DEFAULT_MATCH_PARAMS',
          versions: {
            schemaVersion: SCHEMA_VERSION,
            specVersion: DEFAULT_MATCH_PARAMS.specVersion,
            compatibility: {
              wireFormat: 'Use schemaVersion for API and wire-format compatibility checks.',
              gameplay: 'Use specVersion for deterministic rules and replay compatibility checks.',
            },
          },
          constraints: {
            rows: { min: 1, max: 12 },
            columns: { min: 1, max: 12 },
            maxHandSize: { min: 0, note: 'must be <= columns' },
            initialDraw: { note: 'rows * columns + columns' },
            startingLifepoints: { min: 1, max: 500 },
            totalSlots: { note: 'rows * columns <= 48' },
          },
          botStrategies: ['random', 'heuristic'],
        },
      })),
  );

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
      return traceHttpHandler('createMatch', httpTraceContext(request, reply), (span) => {
        const { matchId } = matchManager.createPendingMatch();
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
      return traceHttpHandler('listMatches', httpTraceContext(request, reply), () => {
        const now = Date.now();
        const feed = [...matchManager.matches.values()].map((m) => ({
          matchId: m.matchId,
          players: m.players
            .map((p) => (p ? { name: p.playerName, connected: p.socket?.readyState === 1 } : null))
            .filter(Boolean),
          spectatorCount: m.spectators.length,
          phase: m.state?.phase ?? null,
          turnNumber: m.state?.turnNumber ?? null,
          ageSeconds: Math.floor((now - m.createdAt) / 1000),
          lastActivitySeconds: Math.floor((now - m.lastActivityAt) / 1000),
        }));
        return feed;
      });
    },
  );

  // ── GET /matches/:matchId/replay — replay and validate a match ──
  app.get<{ Params: { matchId: string } }>(
    '/matches/:matchId/replay',
    {
      schema: {
        tags: ['matches'],
        summary: 'Replay and validate a match from its action history',
        security: [{ basicAuth: [] }],
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
    },
    async (request, reply) => {
      return traceHttpHandler('replayMatch', httpTraceContext(request, reply), async () => {
        if (!checkBasicAuth(request.headers.authorization)) {
          void reply.status(401).header('WWW-Authenticate', 'Basic realm="Phalanx Duel Admin"');
          return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
        }

        const { matchId } = request.params;
        const match = await matchManager.getMatch(matchId);
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
    },
  );

  // ── GET /admin/ab-tests — Basic Auth JSON A/B config snapshot ────
  app.get(
    '/admin/ab-tests',
    {
      schema: {
        hide: true,
        security: [{ basicAuth: [] }],
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
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('admin.abTests', httpTraceContext(request, reply), () => {
        if (!checkBasicAuth(request.headers.authorization)) {
          void reply.status(401).header('WWW-Authenticate', 'Basic realm="Phalanx Duel Admin"');
          return { error: 'Unauthorized', code: 'UNAUTHORIZED' };
        }

        return getAbTestsSnapshotFromEnv();
      });
    },
  );

  // ── GET /admin — Basic Auth HTML admin dashboard ─────────────────
  app.get(
    '/admin',
    {
      schema: {
        hide: true,
        security: [{ basicAuth: [] }],
      },
    },
    async (request, reply) => {
      return traceHttpHandler('admin.dashboard', httpTraceContext(request, reply), () => {
        if (!checkBasicAuth(request.headers.authorization)) {
          void reply
            .status(401)
            .header('WWW-Authenticate', 'Basic realm="Phalanx Duel Admin"')
            .header('Content-Type', 'text/html');
          return '<p>Unauthorized</p>';
        }
        void reply.header('Content-Type', 'text/html');
        return renderAdminDashboard();
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

  // ── WebSocket routing ────────────────────────────────────────────
  const wsConnectionsByIp = new Map<string, number>();
  const recentClientReceipts = new Map<string, ClientMessageReceipt>();
  const MAX_WS_PER_IP = 10;

  app.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, async (socket, req) => {
      const clientIp = req.ip;

      // 0. Connection Limiting by IP (OWASP: DoS Prevention)
      const currentCount = wsConnectionsByIp.get(clientIp) ?? 0;
      if (currentCount >= MAX_WS_PER_IP) {
        app.log.warn({ clientIp }, 'WebSocket connection rejected: Too many connections from IP');
        socket.close(1008, 'Too many connections from this IP');
        return;
      }
      wsConnectionsByIp.set(clientIp, currentCount + 1);

      // 1. Optional Authentication
      let authUser: { id: string; name: string } | null = null;
      try {
        const token =
          req.cookies.phalanx_refresh ??
          req.cookies.token ??
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
            name: p.name ?? `${p.gamertag}#${String(p.suffix).padStart(4, '0')}`,
          };
        }
      } catch {
        // Auth is optional for now, so we just continue as guest
      }

      // 2. Origin Validation (OWASP: CSWSH Protection)
      const origin = req.headers.origin;
      const allowedOrigins = [
        'https://phalanxduel.fly.dev',
        'https://phalanxduel-staging.fly.dev',
        'https://play.phalanxduel.com',
        'https://phalanxduel.com',
        ...LOCAL_DEV_HTTP_ORIGINS,
      ];

      const isTest = (process.env.NODE_ENV ?? 'development') === 'test';
      if (!origin && !isTest) {
        app.log.warn({ clientIp }, 'WebSocket connection rejected: Missing Origin');
        socket.close(1008, 'Origin required');
        return;
      }

      if (origin && !allowedOrigins.includes(origin)) {
        app.log.warn({ origin, clientIp }, 'WebSocket connection rejected: Invalid Origin');
        socket.close(1008, 'Invalid Origin');
        return;
      }

      void trackProcess('ws.connection', {}, () => {
        wsConnections.add(1);

        // 3. Transport liveness: native control-frame ping/pong plus app-level ping/pong.
        let isAlive = true;
        let lastClientHeartbeatAt = Date.now();
        socket.on('pong', () => {
          isAlive = true;
        });

        const controlPingInterval = setInterval(() => {
          if (!isAlive) {
            app.log.info({ clientIp }, 'Closing dead WebSocket connection (no pong)');
            socket.terminate();
            return;
          }
          isAlive = false;
          socket.ping();
        }, APP_HEARTBEAT_INTERVAL_MS);

        // Rate limiting: 50 messages per second sliding window
        const MSG_LIMIT = 50;
        const WINDOW_MS = 1000;
        const timestamps: number[] = [];

        function cleanupReceipts(): void {
          const cutoff = Date.now() - TRANSPORT_RECEIPT_TTL_MS;
          for (const [msgId, receipt] of recentClientReceipts) {
            if (receipt.storedAt < cutoff) {
              recentClientReceipts.delete(msgId);
            }
          }
        }

        function sendMessage(msg: ServerMessage, responseCapture?: ServerMessage[]): void {
          if (socket.readyState === 1) {
            socket.send(JSON.stringify(msg));
          }
          if (responseCapture && !isTransportOnlyServerMessage(msg)) {
            responseCapture.push(msg);
          }
        }

        function sendAck(ackedMsgId: string): void {
          sendMessage({ type: 'ack', ackedMsgId });
        }

        function recordReceipt(
          msgId: string | undefined,
          responseCapture: ServerMessage[],
          matchId?: string,
        ): void {
          if (!msgId) return;
          recentClientReceipts.set(msgId, {
            matchId,
            responses: responseCapture,
            storedAt: Date.now(),
          });
        }

        function replayReceipt(msgId: string): boolean {
          cleanupReceipts();
          const receipt = recentClientReceipts.get(msgId);
          if (!receipt) return false;
          for (const response of receipt.responses) {
            sendMessage(response);
          }
          if (receipt.matchId) {
            matchManager.broadcastMatchState(receipt.matchId);
          }
          sendAck(msgId);
          return true;
        }

        function preprocessMessage(raw: RawData): string | null {
          // Payload size limit (10KB) (OWASP: DoS Prevention)
          const size = Array.isArray(raw)
            ? raw.reduce((acc, b) => acc + b.length, 0)
            : raw instanceof ArrayBuffer
              ? raw.byteLength
              : raw.length;

          if (size > 10240) {
            app.log.warn({ size, clientIp }, 'WebSocket message rejected: Payload too large');
            socket.close(1009, 'Message too large');
            return null;
          }

          // Rate limit check
          const now = Date.now();
          while (timestamps.length > 0 && (timestamps[0] ?? 0) <= now - WINDOW_MS) {
            timestamps.shift();
          }
          if (timestamps.length >= MSG_LIMIT) {
            sendMessage({ type: 'matchError', error: 'Too many messages', code: 'RATE_LIMITED' });
            return null;
          }
          timestamps.push(now);

          return typeof raw === 'string'
            ? raw
            : Buffer.isBuffer(raw)
              ? raw.toString()
              : raw instanceof ArrayBuffer
                ? Buffer.from(raw).toString()
                : String(raw);
        }

        const appHeartbeatInterval = setInterval(() => {
          if (Date.now() - lastClientHeartbeatAt > APP_HEARTBEAT_TIMEOUT_MS) {
            app.log.info(
              { clientIp },
              'Closing stale WebSocket connection (app heartbeat timeout)',
            );
            socket.close(4001, 'Heartbeat timeout');
            return;
          }

          sendMessage({
            type: 'ping',
            msgId: randomUUID(),
            timestamp: new Date().toISOString(),
          });
        }, APP_HEARTBEAT_INTERVAL_MS);

        // eslint-disable-next-line complexity -- WebSocket protocol dispatch is intentionally centralized here.
        socket.on('message', (raw: RawData) => {
          const messageStr = preprocessMessage(raw);
          if (messageStr === null) return;

          let parsed: unknown;
          try {
            parsed = JSON.parse(messageStr);
          } catch {
            sendMessage({ type: 'matchError', error: 'Invalid JSON', code: 'PARSE_ERROR' });
            return;
          }

          const result = ClientMessageSchema.safeParse(parsed);
          if (!result.success) {
            app.log.error(
              { errors: result.error.issues, parsed, clientIp },
              'Invalid Client Message',
            );
            sendMessage({
              type: 'matchError',
              error: 'Invalid message format',
              code: 'VALIDATION_ERROR',
            });
            return;
          }

          const msg = result.data;
          lastClientHeartbeatAt = Date.now();

          if ('msgId' in msg && typeof msg.msgId === 'string' && replayReceipt(msg.msgId)) {
            return;
          }

          switch (msg.type) {
            case 'ack':
              break;

            case 'ping':
              sendMessage({
                type: 'pong',
                timestamp: new Date().toISOString(),
                replyTo: msg.msgId,
              });
              break;

            case 'pong':
              break;

            case 'createMatch': {
              const responseCapture: ServerMessage[] = [];
              void traceWsMessage('createMatch', {}, msg.telemetry, (span) => {
                try {
                  const resolvedSeed = resolveCreateMatchSeed(msg);
                  if (process.env.NODE_ENV === 'production' && resolvedSeed !== undefined) {
                    throw new MatchError(
                      'rngSeed is not allowed in production',
                      'SEED_NOT_ALLOWED',
                    );
                  }

                  const gameOptions = msg.gameOptions
                    ? {
                        damageMode: msg.gameOptions.damageMode,
                        startingLifepoints: msg.gameOptions.startingLifepoints,
                        classicDeployment: msg.gameOptions.classicDeployment,
                        // quickStart is stripped in production to prevent abuse
                        quickStart:
                          process.env.NODE_ENV === 'production'
                            ? undefined
                            : msg.gameOptions.quickStart,
                      }
                    : undefined;
                  const botOptions =
                    msg.opponent === 'bot-random' || msg.opponent === 'bot-heuristic'
                      ? {
                          opponent: msg.opponent,
                          botConfig: {
                            strategy:
                              msg.opponent === 'bot-heuristic'
                                ? ('heuristic' as const)
                                : ('random' as const),
                            seed: Date.now(),
                          },
                        }
                      : undefined;
                  const { matchId, playerId, playerIndex } = matchManager.createMatch(
                    authUser?.name ?? msg.playerName,
                    socket,
                    {
                      gameOptions,
                      rngSeed: resolvedSeed,
                      botOptions,
                      matchParams: msg.matchParams,
                      userId: authUser?.id,
                      creatorIp: clientIp,
                    },
                  );
                  span.setAttribute('match.id', matchId);
                  matchesActive.add(1);
                  app.log.info(
                    {
                      event: 'match_session',
                      sessionEvent: 'created',
                      matchId,
                      playerId,
                      playerIndex,
                      playerName: authUser?.name ?? msg.playerName,
                    },
                    `match:create ${matchId}`,
                  );
                  sendMessage(
                    { type: 'matchCreated', matchId, playerId, playerIndex },
                    responseCapture,
                  );
                  // For bot matches the game is already initialized;
                  // broadcast state after matchCreated so the client sets playerIndex first.
                  if (botOptions) {
                    matchManager.broadcastMatchState(matchId);
                  }
                  recordReceipt(msg.msgId, responseCapture, matchId);
                  if (msg.msgId) sendAck(msg.msgId);
                } catch (err) {
                  if (err instanceof MatchError) {
                    sendMessage(
                      { type: 'matchError', error: err.message, code: err.code },
                      responseCapture,
                    );
                  } else {
                    const error = err instanceof Error ? err.message : 'Unknown error';
                    sendMessage(
                      { type: 'matchError', error, code: 'CREATE_FAILED' },
                      responseCapture,
                    );
                  }
                  recordReceipt(msg.msgId, responseCapture);
                  if (msg.msgId) sendAck(msg.msgId);
                }
              });
              break;
            }

            case 'joinMatch': {
              const responseCapture: ServerMessage[] = [];
              void traceWsMessage(
                'joinMatch',
                { 'match.id': msg.matchId },
                msg.telemetry,
                async (span) => {
                  try {
                    const { playerId, playerIndex } = await matchManager.joinMatch(
                      msg.matchId,
                      authUser?.name ?? msg.playerName,
                      socket,
                      authUser?.id,
                    );
                    span.setAttribute('player.id', playerId);
                    app.log.info(
                      {
                        event: 'match_session',
                        sessionEvent: 'joined',
                        matchId: msg.matchId,
                        playerId,
                        playerIndex,
                        playerName: authUser?.name ?? msg.playerName,
                      },
                      `match:join ${msg.matchId}`,
                    );
                    // Send matchJoined to joining player BEFORE broadcasting state
                    sendMessage(
                      {
                        type: 'matchJoined',
                        matchId: msg.matchId,
                        playerId,
                        playerIndex,
                      },
                      responseCapture,
                    );
                    matchManager.broadcastMatchState(msg.matchId);
                    recordReceipt(msg.msgId, responseCapture, msg.matchId);
                    if (msg.msgId) sendAck(msg.msgId);
                  } catch (err) {
                    if (err instanceof MatchError) {
                      sendMessage(
                        { type: 'matchError', error: err.message, code: err.code },
                        responseCapture,
                      );
                    } else {
                      const error = err instanceof Error ? err.message : 'Unknown error';
                      sendMessage(
                        { type: 'matchError', error, code: 'JOIN_FAILED' },
                        responseCapture,
                      );
                    }
                    recordReceipt(msg.msgId, responseCapture, msg.matchId);
                    if (msg.msgId) sendAck(msg.msgId);
                  }
                },
              );
              break;
            }

            case 'rejoinMatch': {
              const responseCapture: ServerMessage[] = [];
              void traceWsMessage(
                'rejoinMatch',
                { 'match.id': msg.matchId },
                msg.telemetry,
                async (span) => {
                  try {
                    const { playerIndex } = await matchManager.rejoinMatch(
                      msg.matchId,
                      msg.playerId,
                      socket,
                    );
                    span.setAttribute('player.id', msg.playerId);
                    app.log.info(
                      {
                        event: 'match_session',
                        sessionEvent: 'rejoined',
                        matchId: msg.matchId,
                        playerId: msg.playerId,
                        playerIndex,
                      },
                      `match:rejoin ${msg.matchId}`,
                    );
                    sendMessage(
                      {
                        type: 'matchJoined',
                        matchId: msg.matchId,
                        playerId: msg.playerId,
                        playerIndex,
                      },
                      responseCapture,
                    );
                    matchManager.broadcastMatchState(msg.matchId);
                    recordReceipt(msg.msgId, responseCapture, msg.matchId);
                    if (msg.msgId) sendAck(msg.msgId);
                  } catch (err) {
                    if (err instanceof MatchError) {
                      sendMessage(
                        { type: 'matchError', error: err.message, code: err.code },
                        responseCapture,
                      );
                    } else {
                      const error = err instanceof Error ? err.message : 'Unknown error';
                      sendMessage(
                        { type: 'matchError', error, code: 'REJOIN_FAILED' },
                        responseCapture,
                      );
                    }
                    recordReceipt(msg.msgId, responseCapture, msg.matchId);
                    if (msg.msgId) sendAck(msg.msgId);
                  }
                },
              );
              break;
            }

            case 'watchMatch': {
              const responseCapture: ServerMessage[] = [];
              void traceWsMessage(
                'watchMatch',
                { 'match.id': msg.matchId },
                msg.telemetry,
                async (span) => {
                  try {
                    const { spectatorId } = await matchManager.watchMatch(msg.matchId, socket);
                    span.setAttribute('spectator.id', spectatorId);
                    sendMessage(
                      { type: 'spectatorJoined', matchId: msg.matchId, spectatorId },
                      responseCapture,
                    );
                    // Broadcast state after sending spectatorJoined so client sets isSpectator first
                    matchManager.broadcastMatchState(msg.matchId);
                    recordReceipt(msg.msgId, responseCapture, msg.matchId);
                    if (msg.msgId) sendAck(msg.msgId);
                  } catch (err) {
                    if (err instanceof MatchError) {
                      sendMessage(
                        { type: 'matchError', error: err.message, code: err.code },
                        responseCapture,
                      );
                    } else {
                      const error = err instanceof Error ? err.message : 'Unknown error';
                      sendMessage(
                        { type: 'matchError', error, code: 'WATCH_FAILED' },
                        responseCapture,
                      );
                    }
                    recordReceipt(msg.msgId, responseCapture, msg.matchId);
                    if (msg.msgId) sendAck(msg.msgId);
                  }
                },
              );
              break;
            }

            case 'authenticate': {
              const responseCapture: ServerMessage[] = [];
              try {
                const authPayload = fastify.jwt.verify<{
                  id: string;
                  gamertag: string;
                  suffix: number;
                }>(msg.token);
                const displayName = formatGamertag(authPayload.gamertag, authPayload.suffix);
                authUser = { id: authPayload.id, name: displayName };
                matchManager.updatePlayerIdentity(socket, authPayload.id, displayName);
                sendMessage(
                  {
                    type: 'authenticated',
                    user: { id: authPayload.id, name: displayName, elo: 0 },
                  },
                  responseCapture,
                );
              } catch {
                sendMessage({ type: 'auth_error', error: 'Invalid token' }, responseCapture);
              }
              recordReceipt(msg.msgId, responseCapture);
              if (msg.msgId) sendAck(msg.msgId);
              break;
            }

            case 'action': {
              const responseCapture: ServerMessage[] = [];
              const socketInfo = matchManager.socketMap.get(socket);
              if (!socketInfo || socketInfo.isSpectator) {
                sendMessage(
                  {
                    type: 'matchError',
                    error: 'Not connected to a match',
                    code: 'NOT_IN_MATCH',
                  },
                  responseCapture,
                );
                recordReceipt(msg.msgId, responseCapture, msg.matchId);
                if (msg.msgId) sendAck(msg.msgId);
                return;
              }

              traceWsMessage(
                'action',
                {
                  'match.id': msg.matchId,
                  'player.id': socketInfo.playerId,
                  'action.type': msg.action.type,
                },
                msg.telemetry,
                async (_span) => {
                  await trackProcess(
                    'game.action',
                    {
                      'action.type': msg.action.type,
                      'match.id': msg.matchId,
                    },
                    async () => {
                      const start = performance.now();

                      try {
                        await matchManager.handleAction(
                          msg.matchId,
                          socketInfo.playerId,
                          msg.action,
                        );
                        actionsTotal.add(1, { 'action.type': msg.action.type });
                        actionsDurationMs.record(performance.now() - start);

                        // Emit the transaction log entry to the Pino log stream so the
                        // game can be tailed in real-time: tail -f logs/server.log | jq .
                        const txEntry = matchManager.matches
                          .get(msg.matchId)
                          ?.state?.transactionLog?.at(-1);
                        if (txEntry) {
                          const loggedDetails =
                            txEntry.action.type === 'deploy' && txEntry.details.type === 'pass'
                              ? { ...txEntry.details, type: 'deploy' as const }
                              : txEntry.details;
                          app.log.info(
                            {
                              event: 'game_action',
                              matchId: msg.matchId,
                              playerId: socketInfo.playerId,
                              turn: txEntry.sequenceNumber,
                              action: txEntry.action.type,
                              details: loggedDetails,
                              stateHash: txEntry.stateHashAfter,
                            },
                            `game:${txEntry.action.type} t${txEntry.sequenceNumber}`,
                          );
                        }
                        recordReceipt(msg.msgId, responseCapture, msg.matchId);
                        if (msg.msgId) sendAck(msg.msgId);
                      } catch (err) {
                        console.error('[WS_ACTION_ERROR]', err);
                        actionsDurationMs.record(performance.now() - start);
                        if (err instanceof ActionError) {
                          sendMessage(
                            {
                              type: 'actionError',
                              error: err.message,
                              code: err.code,
                            },
                            responseCapture,
                          );
                        } else if (err instanceof MatchError) {
                          sendMessage(
                            { type: 'matchError', error: err.message, code: err.code },
                            responseCapture,
                          );
                        } else {
                          const error = err instanceof Error ? err.message : 'Unknown error';
                          sendMessage(
                            {
                              type: 'actionError',
                              error,
                              code: 'ACTION_FAILED',
                            },
                            responseCapture,
                          );
                        }
                        recordReceipt(msg.msgId, responseCapture, msg.matchId);
                        if (msg.msgId) sendAck(msg.msgId);
                        throw err; // Re-throw so trackProcess records the error
                      }
                    },
                  );
                },
              ).catch(() => {
                // Errors are already sent as WebSocket messages (line 943-956)
                // and recorded on OTel spans via re-throw through withActiveSpan.
                // Swallow the final rejection to prevent unhandled promise rejection.
              });
              break;
            }
          }
        });

        socket.on('close', () => {
          clearInterval(controlPingInterval);
          clearInterval(appHeartbeatInterval);
          wsConnections.add(-1);
          matchManager.handleDisconnect(socket);

          // Decrement IP-based connection counter
          const count = wsConnectionsByIp.get(clientIp) ?? 1;
          if (count <= 1) {
            wsConnectionsByIp.delete(clientIp);
          } else {
            wsConnectionsByIp.set(clientIp, count - 1);
          }

          app.log.info({ clientIp }, 'WebSocket client disconnected');
        });
      });
    });
  });

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
  app.addHook('onClose', () => {
    clearInterval(cleanupInterval);
  });

  // Expose matchManager for testing
  app.decorate('matchManager', matchManager);

  return app;
}
