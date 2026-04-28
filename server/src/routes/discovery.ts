/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import type { FastifyInstance } from 'fastify';
import { createDeck, STATE_MACHINE } from '@phalanxduel/engine';
import { CardManifestSchema, PhaseRulesSchema, ErrorResponseSchema } from '@phalanxduel/shared';
import { toJsonSchema } from '../utils/openapi.js';
import { traceHttpHandler, httpTraceContext } from '../tracing.js';

/**
 * Registers discovery routes for game entities and rules.
 * These endpoints allow clients to discover game mechanics without hardcoding.
 */
export function registerDiscoveryRoutes(app: FastifyInstance) {
  // GET /api/cards/manifest
  app.get(
    '/api/cards/manifest',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Card Manifest',
        description: 'Returns all possible cards in a standard deck and their deterministic stats.',
        response: {
          200: {
            description: 'A list of all cards in the manifest',
            ...toJsonSchema(CardManifestSchema),
          },
          500: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('getCardManifest', httpTraceContext(request, reply), () => {
        return createDeck();
      });
    },
  );

  // GET /api/rules/phases
  app.get(
    '/api/rules/phases',
    {
      schema: {
        tags: ['discovery'],
        summary: 'Rule Discovery: Phases',
        description: 'Returns the state machine transition table for game phases.',
        response: {
          200: {
            description: 'The canonical state machine transitions',
            ...toJsonSchema(PhaseRulesSchema),
          },
          500: toJsonSchema(ErrorResponseSchema),
        },
      },
    },
    async (request, reply) => {
      return traceHttpHandler('getPhaseRules', httpTraceContext(request, reply), () => {
        return STATE_MACHINE;
      });
    },
  );
}
