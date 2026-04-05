import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';
import { type IMatchManager } from '../src/match';

describe('POST /api/matches/:id/action', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let request: ReturnType<typeof supertest>;
  let matchManager: IMatchManager;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
    // @ts-expect-error test access to shared match manager
    matchManager = app.matchManager;
  });

  afterAll(async () => {
    await app.close();
  });

  it('applies an authenticated action and returns a TurnViewModel', async () => {
    const { matchId, playerId } = matchManager.createMatch('Alice', null);
    await matchManager.joinMatch(matchId, 'Bob', null);

    const response = await request
      .post(`/api/matches/${matchId}/action`)
      .set('x-phalanx-player-id', playerId)
      .send({
        type: 'forfeit',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      matchId,
      viewerIndex: 0,
      action: {
        type: 'forfeit',
        playerIndex: 0,
      },
    });
    expect(response.body.preState.phase).not.toBe('gameOver');
    expect(response.body.postState.phase).toBe('gameOver');
    expect(Array.isArray(response.body.events)).toBe(true);
    expect(Array.isArray(response.body.validActions)).toBe(true);
  });

  it('rejects action submission for non-participants', async () => {
    const { matchId } = matchManager.createMatch('Alice', null);
    await matchManager.joinMatch(matchId, 'Bob', null);

    const response = await request.post(`/api/matches/${matchId}/action`).send({
      type: 'forfeit',
      playerIndex: 0,
      timestamp: new Date().toISOString(),
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('UNAUTHORIZED_ACTION');
  });

  it('rejects spoofed playerIndex values', async () => {
    const { matchId, playerId } = matchManager.createMatch('Alice', null);
    await matchManager.joinMatch(matchId, 'Bob', null);

    const response = await request
      .post(`/api/matches/${matchId}/action`)
      .set('x-phalanx-player-id', playerId)
      .send({
        type: 'forfeit',
        playerIndex: 1,
        timestamp: new Date().toISOString(),
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('UNAUTHORIZED_ACTION');
  });

  it('ignores x-phalanx-player-id when a bearer token authenticates a different user', async () => {
    const aliceUserId = '11111111-1111-1111-1111-111111111111';
    const bobUserId = '22222222-2222-2222-2222-222222222222';
    const { matchId } = matchManager.createMatch('Alice', null, { userId: aliceUserId });
    const { playerId: bobPlayerId } = await matchManager.joinMatch(matchId, 'Bob', null, bobUserId);
    // @ts-expect-error test access to Fastify JWT helper
    const aliceToken = app.jwt.sign({ id: aliceUserId });

    const response = await request
      .post(`/api/matches/${matchId}/action`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .set('x-phalanx-player-id', bobPlayerId)
      .send({
        type: 'forfeit',
        playerIndex: 1,
        timestamp: new Date().toISOString(),
      });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('UNAUTHORIZED_ACTION');
  });

  it('returns 404 for unknown matches', async () => {
    const response = await request
      .post('/api/matches/00000000-0000-0000-0000-000000000000/action')
      .send({
        type: 'forfeit',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('MATCH_NOT_FOUND');
  });
});
