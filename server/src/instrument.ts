import * as Sentry from "@sentry/node";
import { hostname } from 'node:os';

const integrations = [
  Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
];

// Try to load profiling integration if available
try {
  const { nodeProfilingIntegration } = await import("@sentry/profiling-node");
  if (nodeProfilingIntegration) {
    integrations.push(nodeProfilingIntegration());
  }
} catch {
  // Silently fail profiling if binary is missing or incompatible
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations,
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
