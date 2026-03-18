import './instrument.js';
import { buildApp } from './app.js';
import { checkPendingMigrations } from './db/check-migrations.js';

async function main(): Promise<void> {
  await checkPendingMigrations();
  const app = await buildApp();
  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';

  await app.listen({ port, host });
  console.log(`Phalanx Duel server listening on http://${host}:${port}`);

  // ── Graceful Shutdown Handler ────────────────────────────────────
  // When the container receives SIGTERM (Kubernetes, Docker stop, Fly.io deploy),
  // close the server gracefully, allowing in-flight requests/WebSocket connections
  // to complete within a timeout window.
  //
  // Timeline:
  // 1. Signal received → Stop accepting NEW connections
  // 2. Close server → Wait for in-flight requests (30s timeout)
  // 3. Exit → Process terminates, container restarts
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, initiating graceful shutdown...`);

      try {
        // Stop accepting new connections and close the server
        // Existing WebSocket connections and HTTP requests get time to complete
        await app.close();

        app.log.info('Server closed successfully, all connections drained');
        process.exit(0);
      } catch (err) {
        app.log.error(
          { error: err instanceof Error ? err.message : String(err) },
          'Error during graceful shutdown',
        );
        process.exit(1);
      }
    });
  });

  // Handle uncaught exceptions → log and exit
  process.on('uncaughtException', (err) => {
    app.log.error(
      { error: err instanceof Error ? err.message : String(err) },
      'Uncaught exception, exiting',
    );
    process.exit(1);
  });

  // Handle unhandled promise rejections → log and exit
  process.on('unhandledRejection', (reason) => {
    app.log.error(
      { reason: reason instanceof Error ? reason.message : String(reason) },
      'Unhandled rejection, exiting',
    );
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
