import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === 'production') {
  console.warn('DATABASE_URL not set — auth features disabled, running in guest-only mode');
}

function tryConnect(url: string | undefined) {
  if (!url) return null;
  try {
    return postgres(url);
  } catch {
    return null;
  }
}

export const client = tryConnect(connectionString);
export const db = client ? drizzle(client, { schema }) : null;

export function isDbAvailable(): boolean {
  return db !== null;
}
