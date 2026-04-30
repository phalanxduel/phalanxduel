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

  async function createCompletedMatch(
    options: {
      player1Name?: string;
      player2Name?: string;
      player1UserId?: string;
      player2UserId?: string;
      completedAtMs?: number;
    } = {},
  ) {
    const { matchId, playerId } = await matchManager.createMatch(
      options.player1Name ?? 'Replay Alice',
      null,
      options.player1UserId ? { userId: options.player1UserId } : undefined,
    );
    await matchManager.joinMatch(
      matchId,
      options.player2Name ?? 'Replay Bob',
      null,
      options.player2UserId,
    );
    await matchManager.handleAction(matchId, playerId, {
      type: 'forfeit',
      playerIndex: 0,
      timestamp: '2026-04-30T17:00:00.000Z',
    });
    if (options.completedAtMs !== undefined) {
      const match = await matchManager.getMatch(matchId);
      if (!match) throw new Error('Expected completed match');
      match.lastActivityAt = options.completedAtMs;
    }
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

  it('returns paginated completed-match history sorted by completedAt descending', async () => {
    const older = await createCompletedMatch({
      player1Name: 'History Older',
      player2Name: 'History Older Bob',
      completedAtMs: Date.parse('2999-04-30T16:00:00.000Z'),
    });
    const newer = await createCompletedMatch({
      player1Name: 'History Newer',
      player2Name: 'History Newer Bob',
      completedAtMs: Date.parse('2999-04-30T16:10:00.000Z'),
    });

    const page1 = await request.get('/api/matches/history?page=1&pageSize=1');
    const page2 = await request.get('/api/matches/history?page=2&pageSize=1');

    expect(page1.status).toBe(200);
    expect(page1.body).toMatchObject({
      page: 1,
      pageSize: 1,
    });
    expect(page1.body.total).toBeGreaterThanOrEqual(2);
    expect(page1.body.matches[0]).toMatchObject({
      matchId: newer.matchId,
      player1Name: 'History Newer',
      player2Name: 'History Newer Bob',
      winnerName: 'History Newer Bob',
      totalTurns: expect.any(Number),
      completedAt: expect.any(String),
      durationMs: expect.any(Number),
    });
    expect(
      page2.body.matches.some((match: { matchId: string }) => match.matchId === older.matchId),
    ).toBe(true);
  });

  it('filters completed-match history by playerId', async () => {
    const targetUserId = '11111111-1111-1111-1111-111111111111';
    const otherUserId = '22222222-2222-2222-2222-222222222222';
    const target = await createCompletedMatch({
      player1Name: 'Filtered Alice',
      player2Name: 'Filtered Bob',
      player1UserId: targetUserId,
      completedAtMs: Date.parse('2999-04-30T16:20:00.000Z'),
    });
    await createCompletedMatch({
      player1Name: 'Filtered Other',
      player2Name: 'Filtered Other Bob',
      player1UserId: otherUserId,
      completedAtMs: Date.parse('2999-04-30T16:21:00.000Z'),
    });

    const response = await request.get(`/api/matches/history?playerId=${targetUserId}`);

    expect(response.status).toBe(200);
    expect(response.body.matches.map((match: { matchId: string }) => match.matchId)).toContain(
      target.matchId,
    );
    expect(
      response.body.matches.every((match: { player1Name: string; player2Name: string }) =>
        [match.player1Name, match.player2Name].some((name) => name.startsWith('Filtered')),
      ),
    ).toBe(true);
    expect(response.body.matches).toHaveLength(1);
  });
});
