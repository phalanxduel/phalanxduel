import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { hostname } from 'node:os';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
      // send console.log, console.warn, and console.error calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    // Profiling
    profileSessionSampleRate: 1.0,
    // Enable logs to be sent to Sentry
    enableLogs: true,
    
    // Setting this option to true will send default PII data to Sentry.
    sendDefaultPii: true,
    environment: process.env.NODE_ENV || "development",
    debug: process.env.NODE_ENV !== "production",
    
    initialScope: {
      tags: {
        "host.name": process.env['FLY_MACHINE_ID'] || hostname(),
        "cloud.provider": process.env['FLY_APP_NAME'] ? "fly_io" : "local",
        "cloud.region": process.env['FLY_REGION'] || "unknown",
      },
    },
  });
}
