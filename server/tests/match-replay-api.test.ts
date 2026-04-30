import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';
import { type IMatchManager } from '../src/match';

const UNKNOWN_MATCH_ID = '00000000-0000-0000-0000-000000000000';

describe('public completed-match replay API', () => {
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

  async function createCompletedMatch() {
    const { matchId, playerId } = await matchManager.createMatch('Replay Alice', null);
    await matchManager.joinMatch(matchId, 'Replay Bob', null);
    await matchManager.handleAction(matchId, playerId, {
      type: 'forfeit',
      playerIndex: 0,
      timestamp: '2026-04-30T17:00:00.000Z',
    });
    return { matchId };
  }

  it('returns an unauthenticated ordered action log for completed matches', async () => {
    const { matchId } = await createCompletedMatch();

    const response = await request.get(`/api/matches/${matchId}/actions`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      matchId,
      engineVersion: expect.any(String),
      seed: expect.any(Number),
      startingLifepoints: expect.any(Number),
      player1Name: 'Replay Alice',
      player2Name: 'Replay Bob',
      totalActions: 1,
    });
    expect(response.body.actions).toHaveLength(1);
    expect(response.body.actions[0]).toMatchObject({
      sequenceNumber: expect.any(Number),
      type: 'forfeit',
      playerIndex: 0,
      timestamp: expect.any(String),
      stateHashBefore: expect.stringMatching(/^[0-9a-f]{64}$/),
      stateHashAfter: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('returns the initialized state at step 0 and the final state beyond the action count', async () => {
    const { matchId } = await createCompletedMatch();

    const step0 = await request.get(`/api/matches/${matchId}/replay?step=0`);
    const beyondFinal = await request.get(`/api/matches/${matchId}/replay?step=99`);

    expect(step0.status).toBe(200);
    expect(step0.body.phase).not.toBe('gameOver');
    expect(step0.body.turnNumber).toBe(0);

    expect(beyondFinal.status).toBe(200);
    expect(beyondFinal.body.phase).toBe('gameOver');
    expect(beyondFinal.body.outcome).toMatchObject({
      winnerIndex: 1,
      victoryType: 'forfeit',
    });
  });

  it('returns the state after N public actions', async () => {
    const { matchId } = await createCompletedMatch();

    const response = await request.get(`/api/matches/${matchId}/replay?step=1`);

    expect(response.status).toBe(200);
    expect(response.body.phase).toBe('gameOver');
    expect(response.body.outcome).toMatchObject({
      winnerIndex: 1,
      victoryType: 'forfeit',
    });
  });

  it('returns 404 for non-existent and non-completed matches', async () => {
    const active = await matchManager.createMatch('Still Playing Alice', null);
    await matchManager.joinMatch(active.matchId, 'Still Playing Bob', null);

    const missing = await request.get(`/api/matches/${UNKNOWN_MATCH_ID}/replay?step=0`);
    const incomplete = await request.get(`/api/matches/${active.matchId}/replay?step=0`);
    const incompleteActions = await request.get(`/api/matches/${active.matchId}/actions`);

    expect(missing.status).toBe(404);
    expect(incomplete.status).toBe(404);
    expect(incompleteActions.status).toBe(404);
  });
});
