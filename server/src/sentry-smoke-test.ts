import * as Sentry from "@sentry/node";
import { hostname } from 'node:os';

// Initialize exactly like the main app
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
    environment: process.env.NODE_ENV || "production",
    initialScope: {
      tags: {
        "host.name": process.env['FLY_MACHINE_ID'] || hostname(),
        "cloud.provider": process.env['FLY_APP_NAME'] ? "fly_io" : "local",
        "cloud.region": process.env['FLY_REGION'] || "unknown",
        "task": "sentry-smoke-test"
      },
    },
  });
} else {
  console.error("Error: SENTRY_DSN not found in environment.");
  process.exit(1);
}

console.log("🚀 Phalanx Sentry Smoke Test Initiated.");

// 1. Test Manual Capture
try {
  throw new Error("Phalanx Diagnostic: Manual Exception Test");
} catch (e) {
  const eventId = Sentry.captureException(e);
  console.log(`✅ Captured manual exception. Event ID: ${eventId}`);
}

// 2. Test Unhandled Rejection (simulating a real crash)
console.log("⏳ Triggering unhandled exception in 1 second...");
setTimeout(() => {
  console.log("💥 Throwing unhandled error now.");
  throw new Error("Phalanx Diagnostic: Unhandled Exception Test");
}, 1000);

// Ensure data is sent before process exits
Sentry.flush(5000).then(() => {
  console.log("🏁 Sentry flush complete.");
});
