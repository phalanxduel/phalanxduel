import { buildApp } from '../src/app.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
  // Build the app without binding to a port
  const app = await buildApp();
  await app.ready();

  // Extract the route tree from Fastify
  const routesText = app.printRoutes();

  const docPath = path.resolve(process.cwd(), '../docs/reference/api-routes.txt');

  // Ensure directory exists
  await fs.mkdir(path.dirname(docPath), { recursive: true });

  // Write to a text file
  await fs.writeFile(docPath, routesText, 'utf8');
  console.log(`✅ Routes dumped to ${docPath}`);

  await app.close();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to dump routes:', err);
    process.exit(1);
  });
