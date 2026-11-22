/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 *
 * Documentation, specification, and canonical defaults routes:
 *   - GET /docs/asyncapi.yaml
 *   - GET /docs/library (and /docs/library/)
 *   - GET /api/defaults
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  DEFAULT_MATCH_PARAMS,
  MATCH_CONSTRAINTS,
  PROTOCOL_TIMING,
  SCHEMA_VERSION,
} from '@phalanxduel/shared';
import { withRouteAspect } from '../http-aspect.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoDocsRoot = resolve(__dirname, '../../../docs');

const DOCS_LIBRARY_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;";

export function registerDocsRoutes(app: FastifyInstance): void {
  // ── AsyncAPI specification ──────────────────────────────────────
  const asyncapiPath = resolve(repoDocsRoot, 'api/asyncapi.yaml');
  app.get('/docs/asyncapi.yaml', { schema: { hide: true } }, async (_request, reply) => {
    try {
      if (!existsSync(asyncapiPath)) {
        void reply.status(404);
        return { error: 'AsyncAPI spec not found', code: 'NOT_FOUND' };
      }
      const content = readFileSync(asyncapiPath, 'utf8');
      void reply.type('text/yaml');
      return content;
    } catch (err) {
      app.log.error(err, 'Failed to serve AsyncAPI spec');
      void reply.status(500);
      return { error: 'Internal Server Error', code: 'INTERNAL_SERVER_ERROR' };
    }
  });

  // ── Interactive Documentation & Architecture Library SPA ─────────
  const docsLibraryPath = resolve(repoDocsRoot, 'library/index.html');
  const serveDocsLibrary = async (_request: unknown, reply: FastifyReply) => {
    try {
      if (!existsSync(docsLibraryPath)) {
        void reply.status(404);
        return { error: 'Documentation library not found', code: 'NOT_FOUND' };
      }
      const content = readFileSync(docsLibraryPath, 'utf8');
      void reply
        .header('Content-Security-Policy', DOCS_LIBRARY_CSP)
        .type('text/html; charset=utf-8');
      return content;
    } catch (err) {
      app.log.error(err, 'Failed to serve Documentation Library SPA');
      void reply.status(500);
      return { error: 'Internal Server Error', code: 'INTERNAL_SERVER_ERROR' };
    }
  };
  app.get('/docs/library', { schema: { hide: true } }, serveDocsLibrary);
  app.get('/docs/library/', { schema: { hide: true } }, serveDocsLibrary);

  // ── Defaults endpoint ──────────────────────────────────────────────
  app.get(
    '/api/defaults',
    {
      schema: {
        tags: ['config'],
        summary: 'Default match parameters and constraints',
        description:
          'Returns the authoritative default configuration for new matches, including grid dimensions, hand sizes, and system constraints.',
        response: {
          200: {
            description: 'Default match parameters and metadata',
            type: 'object',
            properties: {
              specVersion: { type: 'string' },
              rows: { type: 'integer' },
              columns: { type: 'integer' },
              maxHandSize: { type: 'integer' },
              initialDraw: { type: 'integer' },
              modeClassicAces: { type: 'boolean' },
              modeClassicFaceCards: { type: 'boolean' },
              modeDamagePersistence: { type: 'string' },
              modeClassicDeployment: { type: 'boolean' },
              modeQuickStart: { type: 'boolean' },
              startingLifepoints: { type: 'integer' },
              initiative: {
                type: 'object',
                properties: {
                  deployFirst: { type: 'string' },
                  attackFirst: { type: 'string' },
                },
              },
              _meta: {
                type: 'object',
                properties: {
                  configSource: { type: 'string' },
                  versions: {
                    type: 'object',
                    properties: {
                      schemaVersion: { type: 'string' },
                      specVersion: { type: 'string' },
                      compatibility: {
                        type: 'object',
                        properties: {
                          wireFormat: { type: 'string' },
                          gameplay: { type: 'string' },
                        },
                      },
                    },
                  },
                  constraints: {
                    type: 'object',
                    properties: {
                      rows: {
                        type: 'object',
                        properties: { min: { type: 'integer' }, max: { type: 'integer' } },
                      },
                      columns: {
                        type: 'object',
                        properties: { min: { type: 'integer' }, max: { type: 'integer' } },
                      },
                      maxHandSize: {
                        type: 'object',
                        properties: {
                          min: { type: 'integer' },
                          note: { type: 'string' },
                        },
                      },
                      initialDraw: {
                        type: 'object',
                        properties: { note: { type: 'string' } },
                      },
                      startingLifepoints: {
                        type: 'object',
                        properties: { min: { type: 'integer' }, max: { type: 'integer' } },
                      },
                      totalSlots: {
                        type: 'object',
                        properties: { note: { type: 'string' } },
                      },
                    },
                  },
                  botStrategies: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  protocol: {
                    type: 'object',
                    properties: {
                      heartbeatIntervalMs: { type: 'integer' },
                      heartbeatTimeoutMs: { type: 'integer' },
                      initialReconnectDelayMs: { type: 'integer' },
                      maxReconnectDelayMs: { type: 'integer' },
                      reconnectWindowMs: { type: 'integer' },
                      publicOpenMatchTtlMs: { type: 'integer' },
                      publicLobbyExpiringMs: { type: 'integer' },
                      minSpectatorDelayTurns: { type: 'integer' },
                      defaultSpectatorDelayTurns: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    withRouteAspect({ operation: 'defaults' }, () => ({
      ...DEFAULT_MATCH_PARAMS,
      startingLifepoints: MATCH_CONSTRAINTS.startingLifepoints.default,
      _meta: {
        configSource: 'shared/src/schema.ts → DEFAULT_MATCH_PARAMS',
        versions: {
          schemaVersion: SCHEMA_VERSION,
          specVersion: DEFAULT_MATCH_PARAMS.specVersion,
          compatibility: {
            wireFormat: 'Use schemaVersion for API and wire-format compatibility checks.',
            gameplay: 'Use specVersion for deterministic rules and replay compatibility checks.',
          },
        },
        constraints: {
          rows: { min: MATCH_CONSTRAINTS.rows.min, max: MATCH_CONSTRAINTS.rows.max },
          columns: { min: MATCH_CONSTRAINTS.columns.min, max: MATCH_CONSTRAINTS.columns.max },
          maxHandSize: { min: MATCH_CONSTRAINTS.maxHandSize.min, note: 'must be <= columns' },
          initialDraw: { note: 'rows * columns + columns' },
          startingLifepoints: {
            min: MATCH_CONSTRAINTS.startingLifepoints.min,
            max: MATCH_CONSTRAINTS.startingLifepoints.max,
          },
          totalSlots: { note: `rows * columns <= ${MATCH_CONSTRAINTS.maxTotalSlots}` },
        },
        botStrategies: ['random', 'heuristic'],
        protocol: {
          heartbeatIntervalMs: PROTOCOL_TIMING.heartbeatIntervalMs,
          heartbeatTimeoutMs: PROTOCOL_TIMING.heartbeatTimeoutMs,
          initialReconnectDelayMs: PROTOCOL_TIMING.initialReconnectDelayMs,
          maxReconnectDelayMs: PROTOCOL_TIMING.maxReconnectDelayMs,
          reconnectWindowMs: PROTOCOL_TIMING.reconnectWindowMs,
          publicOpenMatchTtlMs: PROTOCOL_TIMING.publicOpenMatchTtlMs,
          publicLobbyExpiringMs: PROTOCOL_TIMING.publicLobbyExpiringMs,
          minSpectatorDelayTurns: PROTOCOL_TIMING.minSpectatorDelayTurns,
          defaultSpectatorDelayTurns: PROTOCOL_TIMING.defaultSpectatorDelayTurns,
        },
      },
    })),
  );
}
