import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';
import { type IMatchManager } from '../src/match-types';

describe('REST matchmaking routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;
  let matchManager: IMatchManager;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
    // @ts-expect-error - test access to shared match manager
    matchManager = app.matchManager;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/matches/lobby', () => {
    it('lists joinable matches with open seat metadata', async () => {
      const { matchId } = await matchManager.createPendingMatch();

      const response = await request.get('/api/matches/lobby');

      expect(response.status).toBe(200);
      const entry = response.body.find((match: { matchId: string }) => match.matchId === matchId);
      expect(entry).toMatchObject({
        matchId,
        openSeat: 'P0',
        players: [],
        phase: null,
        turnNumber: null,
      });
      expect(entry.ageSeconds).toBeGreaterThanOrEqual(0);
      expect(entry.lastActivitySeconds).toBeGreaterThanOrEqual(0);
    });

    it('omits full matches from the lobby listing', async () => {
      const { matchId } = await matchManager.createPendingMatch();
      await matchManager.joinMatch(matchId, 'Alice', null);
      await matchManager.joinMatch(matchId, 'Bob', null);

      const response = await request.get('/api/matches/lobby');

      expect(response.status).toBe(200);
      expect(response.body.some((match: { matchId: string }) => match.matchId === matchId)).toBe(
        false,
      );
    });
  });

  describe('GET /api/spectator/matches', () => {
    it('returns waiting and active matches with spectator lobby shape', async () => {
      const waiting = await matchManager.createMatch('Waiting Alice', null);
      const active = await matchManager.createMatch('Active Alice', null);
      await matchManager.joinMatch(active.matchId, 'Active Bob', null);

      const response = await request.get('/api/spectator/matches');

      expect(response.status).toBe(200);
      const waitingEntry = response.body.find(
        (match: { matchId: string }) => match.matchId === waiting.matchId,
      );
      const activeEntry = response.body.find(
        (match: { matchId: string }) => match.matchId === active.matchId,
      );

      expect(waitingEntry).toMatchObject({
        matchId: waiting.matchId,
        status: 'waiting',
        phase: null,
        turnNumber: null,
        player1Name: 'Waiting Alice',
        player2Name: null,
        spectatorCount: 0,
      });
      expect(activeEntry).toMatchObject({
        matchId: active.matchId,
        status: 'active',
        player1Name: 'Active Alice',
        player2Name: 'Active Bob',
        spectatorCount: 0,
      });
      expect(typeof waitingEntry.createdAt).toBe('string');
      expect(typeof waitingEntry.updatedAt).toBe('string');
      expect(typeof activeEntry.phase).toBe('string');
      expect(typeof activeEntry.turnNumber).toBe('number');
    });

    it('filters waiting matches', async () => {
      const waiting = await matchManager.createMatch('Filter Waiting', null);
      const active = await matchManager.createMatch('Filter Active', null);
      await matchManager.joinMatch(active.matchId, 'Filter Bob', null);

      const response = await request.get('/api/spectator/matches?status=waiting');

      expect(response.status).toBe(200);
      expect(
        response.body.some((match: { matchId: string }) => match.matchId === waiting.matchId),
      ).toBe(true);
      expect(
        response.body.some((match: { matchId: string }) => match.matchId === active.matchId),
      ).toBe(false);
      expect(response.body.every((match: { status: string }) => match.status === 'waiting')).toBe(
        true,
      );
    });

    it('filters active matches', async () => {
      const waiting = await matchManager.createMatch('Active Filter Waiting', null);
      const active = await matchManager.createMatch('Active Filter Alice', null);
      await matchManager.joinMatch(active.matchId, 'Active Filter Bob', null);

      const response = await request.get('/api/spectator/matches?status=active');

      expect(response.status).toBe(200);
      expect(
        response.body.some((match: { matchId: string }) => match.matchId === active.matchId),
      ).toBe(true);
      expect(
        response.body.some((match: { matchId: string }) => match.matchId === waiting.matchId),
      ).toBe(false);
      expect(response.body.every((match: { status: string }) => match.status === 'active')).toBe(
        true,
      );
    });

    it('sorts active matches before waiting matches, then by updatedAt desc', async () => {
      const olderActive = await matchManager.createMatch('Older Active', null);
      await matchManager.joinMatch(olderActive.matchId, 'Older Active Bob', null);
      const newerActive = await matchManager.createMatch('Newer Active', null);
      await matchManager.joinMatch(newerActive.matchId, 'Newer Active Bob', null);
      const olderWaiting = await matchManager.createMatch('Older Waiting', null);
      const newerWaiting = await matchManager.createMatch('Newer Waiting', null);

      const olderActiveMatch = await matchManager.getMatch(olderActive.matchId);
      const newerActiveMatch = await matchManager.getMatch(newerActive.matchId);
      const olderWaitingMatch = await matchManager.getMatch(olderWaiting.matchId);
      const newerWaitingMatch = await matchManager.getMatch(newerWaiting.matchId);
      if (!olderActiveMatch || !newerActiveMatch || !olderWaitingMatch || !newerWaitingMatch) {
        throw new Error('Expected test matches');
      }
      olderActiveMatch.lastActivityAt = 1000;
      newerActiveMatch.lastActivityAt = 4000;
      olderWaitingMatch.lastActivityAt = 2000;
      newerWaitingMatch.lastActivityAt = 3000;

      const response = await request.get('/api/spectator/matches?status=all');
      const ids = new Set([
        olderActive.matchId,
        newerActive.matchId,
        olderWaiting.matchId,
        newerWaiting.matchId,
      ]);
      const orderedIds = response.body
        .filter((match: { matchId: string }) => ids.has(match.matchId))
        .map((match: { matchId: string }) => match.matchId);

      expect(orderedIds).toEqual([
        newerActive.matchId,
        olderActive.matchId,
        newerWaiting.matchId,
        olderWaiting.matchId,
      ]);
    });
  });

  describe('GET /api/matches/active', () => {
    it('returns unfinished matches for the authenticated player', async () => {
      const aliceUserId = '11111111-1111-1111-1111-111111111111';
      const bobUserId = '22222222-2222-2222-2222-222222222222';
      const { matchId, playerId } = await matchManager.createMatch('Alice', null, {
        userId: aliceUserId,
      });
      await matchManager.joinMatch(matchId, 'Bob', null, bobUserId);
      // @ts-expect-error - test access to Fastify JWT helper
      const token = app.jwt.sign({ id: aliceUserId });

      const response = await request
        .get('/api/matches/active')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const entry = response.body.find((match: { matchId: string }) => match.matchId === matchId);
      expect(entry).toMatchObject({
        matchId,
        playerId,
        playerIndex: 0,
        role: 'P0',
        opponentName: 'Bob',
        status: 'active',
        disconnected: false,
      });
    });

    it('returns 401 without authentication', async () => {
      const response = await request.get('/api/matches/active');
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/matches/:id/join', () => {
    it('joins an open match and returns player identity with role', async () => {
      const { matchId } = await matchManager.createPendingMatch();

      const response = await request.post(`/api/matches/${matchId}/join`).send({
        playerName: 'Alice',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        matchId,
        playerIndex: 0,
        role: 'P0',
      });
      expect(response.body.playerId).toMatch(/^[0-9a-fA-F-]{36}$/);
    });

    it('returns P1 when joining a match that already has a creator slot', async () => {
      const { matchId } = await matchManager.createMatch('Creator', null);

      const response = await request.post(`/api/matches/${matchId}/join`).send({
        playerName: 'Bob',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        matchId,
        playerIndex: 1,
        role: 'P1',
      });
    });

    it('returns 404 for an unknown match', async () => {
      const response = await request
        .post('/api/matches/00000000-0000-0000-0000-000000000000/join')
        .send({ playerName: 'Alice' });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('MATCH_NOT_FOUND');
    });

    it('returns 409 when the match is already full', async () => {
      const { matchId } = await matchManager.createPendingMatch();
      await matchManager.joinMatch(matchId, 'Alice', null);
      await matchManager.joinMatch(matchId, 'Bob', null);

      const response = await request.post(`/api/matches/${matchId}/join`).send({
        playerName: 'Carol',
      });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('MATCH_FULL');
    });
  });

  describe('POST /api/matches/:id/abandon', () => {
    it('forfeits an authenticated player from an active match', async () => {
      const aliceUserId = '33333333-3333-3333-3333-333333333333';
      const bobUserId = '44444444-4444-4444-4444-444444444444';
      const { matchId } = await matchManager.createMatch('Alice', null, { userId: aliceUserId });
      await matchManager.joinMatch(matchId, 'Bob', null, bobUserId);
      // @ts-expect-error - test access to Fastify JWT helper
      const token = app.jwt.sign({ id: aliceUserId });

      const response = await request
        .post(`/api/matches/${matchId}/abandon`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        status: 'forfeited',
        matchId,
      });

      const match = await matchManager.getMatch(matchId);
      expect(match?.state?.phase).toBe('gameOver');
      expect(match?.state?.outcome?.victoryType).toBe('forfeit');
    });

    it('returns 404 when the authenticated user is not a participant', async () => {
      const aliceUserId = '55555555-5555-5555-5555-555555555555';
      const otherUserId = '66666666-6666-6666-6666-666666666666';
      const { matchId } = await matchManager.createMatch('Alice', null, { userId: aliceUserId });
      await matchManager.joinMatch(matchId, 'Bob', null);
      // @ts-expect-error - test access to Fastify JWT helper
      const token = app.jwt.sign({ id: otherUserId });

      const response = await request
        .post(`/api/matches/${matchId}/abandon`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('MATCH_NOT_FOUND');
    });

    it('cancels a pending match without state (creator path)', async () => {
      const aliceEmail = `alice_${Date.now()}@example.com`;
      const regRes = await request.post('/api/auth/register').send({
        email: aliceEmail,
        gamertag: 'Alice',
        password: 'password123',
      });
      const aliceUserId = regRes.body.user.id;
      const token = regRes.body.token;

      const { matchId } = await matchManager.createMatch('Alice', null, { userId: aliceUserId });

      const response = await request
        .post(`/api/matches/${matchId}/abandon`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        status: 'forfeited',
        matchId,
      });

      // Match should be removed from memory
      const match = matchManager.getMatchSync(matchId);
      expect(match).toBeUndefined();
    });

    it('allows player 2 to cancel a match without state', async () => {
      const aliceEmail = `alice2_${Date.now()}@example.com`;
      const bobEmail = `bob2_${Date.now()}@example.com`;

      const regAlice = await request.post('/api/auth/register').send({
        email: aliceEmail,
        gamertag: 'Alice',
        password: 'password123',
      });
      const aliceUserId = regAlice.body.user.id;

      const regBob = await request.post('/api/auth/register').send({
        email: bobEmail,
        gamertag: 'Bob',
        password: 'password123',
      });
      const bobUserId = regBob.body.user.id;
      const bobToken = regBob.body.token;

      const { matchId } = await matchManager.createMatch('Alice', null, { userId: aliceUserId });
      await matchManager.joinMatch(matchId, 'Bob', null, bobUserId);

      const response = await request
        .post(`/api/matches/${matchId}/abandon`)
        .set('Authorization', `Bearer ${bobToken}`);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });
});
