import * as Sentry from "@sentry/node";
import { hostname } from 'node:os';

const integrations: any[] = [
  Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
];

// Try to load profiling integration if available
try {
  // @ts-ignore - may not be available in all environments
  const { nodeProfilingIntegration } = await import("@sentry/profiling-node");
  integrations.push(nodeProfilingIntegration());
} catch (e) {
  // Silently fail profiling if binary is missing
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
