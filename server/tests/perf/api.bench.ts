import { bench, describe, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../src/app';

describe('API Performance', () => {
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

  bench('POST /api/matches/:id/action (forfeit)', async () => {
    // We need a match to act on. 
    // To measure "action" performance specifically, we should ideally reuse a match,
    // but the engine transitions state. For a pure "forfeit" bench, we'll create a match each time
    // or just accept the overhead of match creation for now as a "lifecycle" bench.
    
    // @ts-expect-error test access
    const { matchId, playerId } = await app.matchManager.createMatch('Alice', null);
    // @ts-expect-error test access
    await app.matchManager.joinMatch(matchId, 'Bob', null);

    await request
      .post(`/api/matches/${matchId}/action`)
      .set('x-phalanx-player-id', playerId)
      .send({
        type: 'forfeit',
        playerIndex: 0,
        timestamp: new Date().toISOString(),
      });
  });

  bench('GET /health', async () => {
    await request.get('/health');
  });
});
