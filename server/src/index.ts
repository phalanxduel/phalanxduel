import './instrument.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const app = await buildApp();
  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';

  await app.listen({ port, host });
  console.log(`Phalanx Duel server listening on http://${host}:${port}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
