import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../server/src/db/schema.js';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required for the MCP server');
}

export const client = postgres(url);
export const db = drizzle(client, { schema });
