import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString && process.env['NODE_ENV'] === 'production') {
  throw new Error('DATABASE_URL environment variable is required in production');
}

// For development, if no DATABASE_URL is provided, we can either fail or use a default
// but since we don't have a local pg setup yet, let's just export a way to initialize it.
export const client = connectionString ? postgres(connectionString) : null;
export const db = client ? drizzle(client, { schema }) : null;

export function isDbAvailable(): boolean {
  return db !== null;
}
