import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV || "development",
  });
}

import { initTelemetry } from './telemetry';

// Initialize OpenTelemetry before any other imports that use HTTP/net modules.
// See docs/OBSERVABILITY.md for production setup guidance.
initTelemetry();

import { buildApp } from './app';

async function main(): Promise<void> {
  const app = await buildApp();
  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';

  await app.listen({ port, host });
  console.log(`Phalanx server listening on ${host}:${port}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
