import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { SCHEMA_VERSION } from '@phalanxduel/shared';
import { db } from '../db.js';

interface BuildMetadata {
  readonly version: string;
  readonly buildNumber: string;
  readonly commitSha: string;
}

function readBuildMetadata(): BuildMetadata {
  const fallback: BuildMetadata = {
    version: SCHEMA_VERSION,
    buildNumber: 'dev',
    commitSha: 'unknown',
  };

  try {
    const metadataPath = join(
      dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      '..',
      '..',
      'build-metadata.json',
    );
    const parsed = JSON.parse(readFileSync(metadataPath, 'utf8')) as Partial<BuildMetadata>;
    return {
      version: parsed.version ?? fallback.version,
      buildNumber: parsed.buildNumber ?? fallback.buildNumber,
      commitSha: parsed.commitSha ?? fallback.commitSha,
    };
  } catch {
    return fallback;
  }
}

export function registerHealthRoutes(fastify: FastifyInstance): void {
  fastify.get('/health', async () => {
    const metadata = readBuildMetadata();
    return {
      status: 'ok',
      service: 'phalanx-admin',
      timestamp: new Date().toISOString(),
      version: metadata.version,
      build_id: metadata.buildNumber,
      commit_sha: metadata.commitSha,
      uptime_seconds: Math.floor(process.uptime()),
      region: process.env.FLY_REGION ?? 'local',
    };
  });

  fastify.get('/ready', async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return {
        ready: true,
        database: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return reply.status(503).send({
        ready: false,
        database: 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    }
  });
}
