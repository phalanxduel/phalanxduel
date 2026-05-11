import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { LadderService } from '../src/ladder.js';

describe('is_automated leaderboard exclusion', () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    it.skip('DATABASE_URL not set, skipping is_automated leaderboard integration tests');
    return;
  }

  const sql = postgres(connectionString, { max: 1 });

  const USER_ID = '00000000-0000-0000-0000-000000000099';
  const OPP_ID = '00000000-0000-0000-0000-000000000098';
  const MATCH_HUMAN_1 = '00000000-0000-0000-0000-000000000201';
  const MATCH_HUMAN_2 = '00000000-0000-0000-0000-000000000202';
  const MATCH_BOT = '00000000-0000-0000-0000-000000000203';

  beforeAll(async () => {
    await sql`
      INSERT INTO users (id, gamertag, gamertag_normalized, email, password_hash, elo)
      VALUES
        (${USER_ID}, 'TestUser99', 'testuser99', 'testuser99@example.invalid', 'x', 1000),
        (${OPP_ID},  'TestOpp98',  'testopp98',  'testopp98@example.invalid',  'x', 1000)
      ON CONFLICT (id) DO NOTHING
    `;

    const now = new Date().toISOString();
    const baseMatch = {
      config: '{}',
      action_history: '[]',
      transaction_log: '[]',
      status: 'completed' as const,
      outcome: JSON.stringify({ winnerIndex: 0 }),
      updated_at: now,
      created_at: now,
      visibility: 'private' as const,
    };

    await sql`
      INSERT INTO matches (id, player_1_id, player_2_id, config, action_history, transaction_log,
                           status, outcome, updated_at, created_at, visibility, is_automated)
      VALUES
        (${MATCH_HUMAN_1}, ${USER_ID}, ${OPP_ID}, ${baseMatch.config}, ${baseMatch.action_history},
         ${baseMatch.transaction_log}, ${baseMatch.status}, ${baseMatch.outcome},
         ${baseMatch.updated_at}, ${baseMatch.created_at}, ${baseMatch.visibility}, false),
        (${MATCH_HUMAN_2}, ${OPP_ID}, ${USER_ID}, ${baseMatch.config}, ${baseMatch.action_history},
         ${baseMatch.transaction_log}, ${baseMatch.status}, ${baseMatch.outcome},
         ${baseMatch.updated_at}, ${baseMatch.created_at}, ${baseMatch.visibility}, false),
        (${MATCH_BOT}, ${USER_ID}, ${OPP_ID}, ${baseMatch.config}, ${baseMatch.action_history},
         ${baseMatch.transaction_log}, ${baseMatch.status}, ${baseMatch.outcome},
         ${baseMatch.updated_at}, ${baseMatch.created_at}, ${baseMatch.visibility}, true)
      ON CONFLICT (id) DO NOTHING
    `;
  });

  afterAll(async () => {
    await sql`DELETE FROM matches WHERE id IN (${MATCH_HUMAN_1}, ${MATCH_HUMAN_2}, ${MATCH_BOT})`;
    await sql`DELETE FROM users WHERE id IN (${USER_ID}, ${OPP_ID})`;
    await sql.end();
  });

  it('computePlayerElo counts only non-automated completed matches', async () => {
    const service = new LadderService();
    const { matchCount } = await service.computePlayerElo(USER_ID, 'pvp');
    expect(matchCount).toBe(2);
  });

  it('automated match row is present in DB but excluded from Elo', async () => {
    const allRows = await sql<
      { id: string; is_automated: boolean }[]
    >`SELECT id, is_automated FROM matches WHERE id IN (${MATCH_HUMAN_1}, ${MATCH_HUMAN_2}, ${MATCH_BOT})`;

    expect(allRows).toHaveLength(3);
    expect(allRows.filter((r) => r.is_automated)).toHaveLength(1);

    const service = new LadderService();
    const { matchCount } = await service.computePlayerElo(USER_ID, 'pvp');
    expect(matchCount).toBe(2);
  });

  it('SELECT count WHERE is_automated IS NULL returns 0 for seeded rows', async () => {
    const result = await sql<{ count: string }[]>`
      SELECT count(*) FROM matches
      WHERE id IN (${MATCH_HUMAN_1}, ${MATCH_HUMAN_2}, ${MATCH_BOT})
        AND is_automated IS NULL
    `;
    expect(Number(result[0]?.count)).toBe(0);
  });
});
