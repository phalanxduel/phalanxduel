/**
 * Copyright © 2026 Mike Hall
 * Licensed under the GNU General Public License v3.0.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';
import { MatchManager } from '../src/match';
import type { TurnViewModel } from '@phalanxduel/shared';

describe('Simulation Route', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;
  let matchManager: MatchManager;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
    // @ts-expect-error - reaching into app to get the same manager instance
    matchManager = app.matchManager;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /matches/:id/simulate', () => {
    it('returns 200 with ViewModel for a legal action', async () => {
      // 1. Create and initialize a match via MatchManager for deterministic setup
      const { matchId, playerId: p1Id } = matchManager.createMatch('Player 1', null);

      // We need a second player to initialize the game
      // @ts-expect-error - mock socket
      await matchManager.joinMatch(matchId, 'Player 2', null);

      const match = matchManager.getMatchSync(matchId)!;
      expect(match.state).toBeDefined();
      expect(match.state?.phase).toBe('DeploymentPhase');

      // 2. Simulate forfeit (always legal)
      const simulateRes = await request
        .post(`/matches/${matchId}/simulate`)
        .set('x-phalanx-player-id', p1Id)
        .send({
          type: 'forfeit',
          playerIndex: 0,
          reason: 'simulated',
          timestamp: new Date().toISOString(),
        });

      expect(simulateRes.status).toBe(200);
      const body = simulateRes.body as TurnViewModel;
      expect(body.matchId).toBe(matchId);
      expect(body.viewerIndex).toBe(0);
      expect(body.postState.phase).toBe('gameOver');
      // If playerIndex 0 forfeits, playerIndex 1 wins.
      expect(body.postState.outcome?.winnerIndex).toBe(1);

      // 3. Verify that the actual match is NOT finished
      expect(match.state?.phase).toBe('DeploymentPhase');
    });

    it('returns 403 if simulating for the opponent', async () => {
      const { matchId, playerId: p1Id } = matchManager.createMatch('Player 1', null);
      // @ts-expect-error - mock socket
      await matchManager.joinMatch(matchId, 'Player 2', null);

      // p1Id is Player 0
      const simulateRes = await request
        .post(`/matches/${matchId}/simulate`)
        .set('x-phalanx-player-id', p1Id)
        .send({
          type: 'forfeit',
          playerIndex: 1, // MALICIOUS: Player 0 trying to simulate for Player 1
          reason: 'malicious',
          timestamp: new Date().toISOString(),
        });

      expect(simulateRes.status).toBe(403);
      // @ts-expect-error - body structure
      expect(simulateRes.body.code).toBe('UNAUTHORIZED_SIMULATION_INDEX');
    });

    it('returns 400 for an illegal action', async () => {
      const { matchId, playerId: p1Id } = matchManager.createMatch('Player 1', null);
      // @ts-expect-error - mock socket
      await matchManager.joinMatch(matchId, 'Player 2', null);

      const simulateRes = await request
        .post(`/matches/${matchId}/simulate`)
        .set('x-phalanx-player-id', p1Id)
        .send({
          type: 'deploy', // Illegal because we don't provide cardId/position
          playerIndex: 0,
          timestamp: new Date().toISOString(),
        });

      expect(simulateRes.status).toBe(400);
      // It should be ILLEGAL_ACTION (from engine applyAction)
      // @ts-expect-error - body structure
      expect(simulateRes.body.code).toBe('ILLEGAL_ACTION');
    });

    it('returns 404 for non-existent match', async () => {
      const simulateRes = await request
        .post('/matches/00000000-0000-0000-0000-000000000000/simulate')
        .set('x-phalanx-player-id', '00000000-0000-0000-0000-000000000001')
        .send({
          type: 'forfeit',
          playerIndex: 0,
          timestamp: new Date().toISOString(),
        });

      expect(simulateRes.status).toBe(404);
    });
  });
});
