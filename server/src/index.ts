import * as Sentry from "@sentry/node";
import { hostname } from 'node:os';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Setting this option to true will send default PII data to Sentry.
    sendDefaultPii: true,
    environment: process.env.NODE_ENV || "development",
    debug: process.env.NODE_ENV !== "production",
    
    // Sentry v10 automatically instruments many things including Fastify and Pino.
    // We can enrich the resource attributes here if needed.
    initialScope: {
      tags: {
        "host.name": process.env['FLY_MACHINE_ID'] || hostname(),
        "cloud.provider": process.env['FLY_APP_NAME'] ? "fly_io" : "local",
        "cloud.region": process.env['FLY_REGION'] || "unknown",
      },
    },
  });
}

import { buildApp } from './app.js';

async function main(): Promise<void> {
  const app = await buildApp();
  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';

  await app.listen({ port, host });
  console.log(`Phalanx server listening on :`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
