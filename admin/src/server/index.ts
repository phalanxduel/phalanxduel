/**
 * Required env vars:
 *   DATABASE_URL             — Neon Postgres connection string
 *   JWT_SECRET               — Shared with game server
 *   GAME_SERVER_INTERNAL_URL — e.g. http://phalanxduel.internal:3001
 *   ADMIN_INTERNAL_TOKEN     — Secret for POST /internal/matches
 * Optional:
 *   PORT                     — Default: 3002
 *   NODE_ENV                 — 'production' | 'development' | 'test'
 */
import './loadEnv.js';
import './instrument.js';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import { registerLoginRoute } from './routes/login.js';
import { registerMatchRoutes } from './routes/matches.js';
import { registerUserRoutes } from './routes/users.js';
import { registerReportRoutes } from './routes/reports.js';
import { checkPendingMigrations } from './check-migrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildAdminApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });

  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'phalanx-dev-secret',
    cookie: { cookieName: 'admin_token', signed: false },
  });

  registerLoginRoute(app);
  registerMatchRoutes(app);
  registerUserRoutes(app);
  registerReportRoutes(app);

  const clientDist = resolve(__dirname, '../../dist/client');
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist, prefix: '/' });
    app.setNotFoundHandler((_req, reply) => void reply.sendFile('index.html'));
  }

  return app;
}

async function main() {
  await checkPendingMigrations();
  const app = await buildAdminApp();
  const port = parseInt(process.env.PHALANX_ADMIN_PORT ?? '3002', 10);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Admin service listening on port ${port}`);
}

// Only run when this file is the entry point, not when imported by tests
const isEntryPoint = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntryPoint) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
