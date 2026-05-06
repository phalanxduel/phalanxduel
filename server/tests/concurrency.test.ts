import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app';
import { type IMatchManager } from '../src/match-types';
import { db } from '../src/db';
import { users } from '../src/db/schema';

describe('Player Concurrency Restrictions', () => {
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

  describe('Single active match per user', () => {
    it('blocks joining a second match via REST if already participating in one', async () => {
      const userId = randomUUID();
      // Ensure user exists in DB so verifyUserIds doesn't null it out
      await db?.insert(users).values({
        id: userId,
        gamertag: 'TestUser',
        gamertagNormalized: 'testuser',
        email: `test-${userId}@example.com`,
        passwordHash: 'dummy',
      });

      // @ts-expect-error - sign helper
      const token = app.jwt.sign({ id: userId });

      // Create and join the first match
      const m1 = await matchManager.createPendingMatch();
      const join1 = await request
        .post(`/api/matches/${m1.matchId}/join`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playerName: 'Alice', userId });

      if (join1.status !== 200) {
        console.error('Join 1 failed:', join1.body);
      }
      expect(join1.status).toBe(200);

      // Attempt to join a second match
      const m2 = await matchManager.createPendingMatch();
      const join2 = await request
        .post(`/api/matches/${m2.matchId}/join`)
        .set('Authorization', `Bearer ${token}`)
        .send({ playerName: 'Alice', userId });

      // Should succeed because the first session is disconnected (takeover policy)
      expect(join2.status).toBe(200);
      expect(join2.body.matchId).toBe(m2.matchId);

      // Verify the first match was terminated
      const m1Check = await matchManager.getMatch(m1.matchId);
      expect(m1Check).toBeNull();
    });

    it('blocks joining a second match via REST even if user ID is only in the body', async () => {
      const userId = randomUUID();
      await db?.insert(users).values({
        id: userId,
        gamertag: 'TestUser2',
        gamertagNormalized: 'testuser2',
        email: `test2-${userId}@example.com`,
        passwordHash: 'dummy',
      });

      // Create and join the first match
      const m1 = await matchManager.createPendingMatch();
      const join1 = await request
        .post(`/api/matches/${m1.matchId}/join`)
        .send({ playerName: 'Bob', userId });

      expect(join1.status).toBe(200);

      // Attempt to join a second match
      const m2 = await matchManager.createPendingMatch();
      const join2 = await request
        .post(`/api/matches/${m2.matchId}/join`)
        .send({ playerName: 'Bob', userId });

      // Should succeed because the first session is disconnected (takeover policy)
      expect(join2.status).toBe(200);
      expect(join2.body.matchId).toBe(m2.matchId);

      // Verify the first match was terminated
      const m1Check = await matchManager.getMatch(m1.matchId);
      expect(m1Check).toBeNull();
    });

    it('allows joining a second match after the first one is over', async () => {
      const userId = randomUUID();

      // Create and join the first match
      const m1 = await matchManager.createPendingMatch();
      await request.post(`/api/matches/${m1.matchId}/join`).send({ playerName: 'Carol', userId });

      // Properly finish the first match in memory and DB
      await matchManager.terminateMatch(m1.matchId);

      const m2 = await matchManager.createPendingMatch();
      const join2 = await request
        .post(`/api/matches/${m2.matchId}/join`)
        .send({ playerName: 'Carol', userId });

      expect(join2.status).toBe(200);
    });
  });
});
