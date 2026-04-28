/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU Affero General Public License v3.0.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';
import type { StateTransition } from '@phalanxduel/shared';

describe('Discovery Routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/cards/manifest', () => {
    it('returns 200 with all 52 cards', async () => {
      const response = await request.get('/api/cards/manifest');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(52);

      // Verify a sample card (Ace of Spades should be first in canonical order)
      const aceOfSpades = response.body[0];
      expect(aceOfSpades.suit).toBe('spades');
      expect(aceOfSpades.face).toBe('A');
      expect(aceOfSpades.value).toBe(1);
      expect(aceOfSpades.type).toBe('ace');
    });
  });

  describe('GET /api/rules/phases', () => {
    it('returns 200 with state machine transitions', async () => {
      const response = await request.get('/api/rules/phases');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify a sample transition
      const initialTransition = response.body.find(
        (t: StateTransition) => t.from === 'StartTurn' && t.trigger === 'system:init',
      );
      expect(initialTransition).toBeDefined();
      expect(initialTransition.to).toMatch(/DeploymentPhase|AttackPhase/);
    });
  });
});
