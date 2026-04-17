import './instrument.js';
import { buildApp } from './app.js';
import { checkPendingMigrations } from './db/check-migrations.js';
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { resolve } from 'node:path';

// Intercept daemon flag before doing anything else
if (process.argv.includes('--daemon')) {
  const outLog = resolve(process.cwd(), 'phalanx-server.out.log');
  const errLog = resolve(process.cwd(), 'phalanx-server.err.log');
  const out = openSync(outLog, 'a');
  const err = openSync(errLog, 'a');

  // Strip "--daemon" to prevent infinite spawning loop
  const args = process.argv.slice(1).filter((arg) => arg !== '--daemon');

  const command: string = process.argv[0] ?? 'node';
  const child = spawn(command, args, {
    detached: true,
    stdio: ['ignore', out, err],
    env: process.env,
  });

  child.unref();
  console.log(`Phalanx Duel server started in daemon mode (PID: ${child.pid})`);
  console.log(`STDOUT -> ${outLog}`);
  console.log(`STDERR -> ${errLog}`);
  process.exit(0);
}

async function main(): Promise<void> {
  await checkPendingMigrations();
  let app = await buildApp();
  const port = parseInt(process.env.PHALANX_SERVER_PORT ?? '3001', 10);
  const host = process.env.HOST ?? '0.0.0.0';

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
  const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGQUIT'];
  const reloadSignals = ['SIGHUP', 'SIGUSR2'];

  shutdownSignals.forEach((signal) => {
    process.on(
      signal,
      () =>
        void (async () => {
          app.log.info(`Received ${signal}, initiating graceful shutdown...`);

          try {
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
        })(),
    );
  });

  reloadSignals.forEach((signal) => {
    process.on(
      signal,
      () =>
        void (async () => {
          app.log.info(`Received ${signal}, initiating configuration reload...`);

          try {
            await app.close();
            app.log.info('Server closed. Reloading environment variables from configuration...');

            // Re-evaluate configuration manually
            const { loadAllEnvs } = await import('./loadEnv.js');
            loadAllEnvs();

            app = await buildApp();
            const port = parseInt(process.env.PHALANX_SERVER_PORT ?? '3001', 10);
            const host = process.env.HOST ?? '0.0.0.0';

            await app.listen({ port, host });
            app.log.info(`Phalanx Duel server re-listening on http://${host}:${port}`);
          } catch (err) {
            app.log.error(
              { error: err instanceof Error ? err.message : String(err) },
              'Error during configuration reload',
            );
            process.exit(1);
          }
        })(),
    );
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
    app.log.error({ reason }, 'Unhandled rejection, exiting');
    process.exit(1);
  });
}

main().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
