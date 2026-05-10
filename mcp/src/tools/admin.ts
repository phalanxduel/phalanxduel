import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import OpenAI from 'openai';
import { db } from '../db.js';
import { matches, users, matchEmbeddings } from '../../../server/src/db/schema.js';
import { eq, lt, and, sql } from 'drizzle-orm';
import type { GameState } from '@phalanxduel/shared';
import { buildMatchSummary } from '../utils/matchSummary.js';
import type { MatchOutcome } from '../utils/matchSummary.js';

function envTag(): string {
  const host = (process.env.DATABASE_URL ?? '').replace(/.*@/, '').replace(/\/.*/, '');
  return `${process.env.APP_ENV ?? 'local'} (${host || 'unknown'})`;
}

async function embeddingStats(): Promise<{ embedded: number; totalCompleted: number }> {
  const rows = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE me.match_id IS NOT NULL)::int AS embedded,
      COUNT(*)::int AS total
    FROM matches m
    LEFT JOIN match_embeddings me ON me.match_id = m.id
    WHERE m.status = 'completed'
  `);
  const r = rows[0];
  return { embedded: Number(r?.embedded ?? 0), totalCompleted: Number(r?.total ?? 0) };
}

async function activityStats(): Promise<{ matches_24h: number; matches_7d: number }> {
  const rows = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS matches_24h,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS matches_7d
    FROM matches WHERE status = 'completed'
  `);
  const r = rows[0];
  return { matches_24h: Number(r?.matches_24h ?? 0), matches_7d: Number(r?.matches_7d ?? 0) };
}

export function registerAdminTools(server: McpServer): void {
  server.registerTool(
    'pipeline_status',
    {
      description:
        'System health snapshot: match pipeline stats, embedding coverage, player activity. Use to compare prod/staging/local environments.',
    },
    async () => {
      try {
        const [matchRows, emb, playerRows, activity] = await Promise.all([
          db.execute(sql`SELECT status, COUNT(*)::int AS count FROM matches GROUP BY status`),
          embeddingStats(),
          db.execute(sql`SELECT COUNT(*)::int AS count FROM users`),
          activityStats(),
        ]);

        const byStatus: Record<string, number> = {};
        for (const row of matchRows) byStatus[String(row.status)] = Number(row.count);
        const { embedded, totalCompleted } = emb;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  environment: envTag(),
                  matches: {
                    byStatus,
                    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
                  },
                  embeddings: {
                    embedded,
                    totalCompleted,
                    unembedded: totalCompleted - embedded,
                    coverage:
                      totalCompleted > 0
                        ? `${((embedded / totalCompleted) * 100).toFixed(1)}%`
                        : '0.0%',
                  },
                  players: { total: Number(playerRows[0]?.count ?? 0) },
                  activity,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  server.registerTool(
    'match_purge',
    {
      description:
        'Delete matches matching criteria. dryRun=true (default) counts only. Returns deleted count.',
      inputSchema: {
        status: z
          .enum(['cancelled', 'pending', 'active', 'completed'])
          .describe('Match status to target'),
        olderThanDays: z
          .number()
          .int()
          .min(1)
          .default(30)
          .describe('Only matches created more than this many days ago'),
        botOnly: z
          .boolean()
          .default(true)
          .describe('Restrict to bot matches (bot_strategy IS NOT NULL)'),
        dryRun: z.boolean().default(true).describe('Count only — do not delete'),
      },
    },
    async ({ status, olderThanDays, botOnly, dryRun }) => {
      try {
        const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
        const conditions = [
          eq(matches.status, status),
          lt(matches.createdAt, cutoff),
          ...(botOnly ? [sql`${matches.botStrategy} IS NOT NULL`] : []),
        ];
        const where = and(...conditions);
        const criteria = { status, olderThanDays, botOnly };

        if (dryRun) {
          const rows = await db.select({ id: matches.id }).from(matches).where(where);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ dryRun: true, wouldDelete: rows.length, criteria }, null, 2),
              },
            ],
          };
        }

        const deleted = await db.delete(matches).where(where).returning({ id: matches.id });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ deleted: deleted.length, criteria }, null, 2),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  server.registerTool(
    'bulk_embed',
    {
      description:
        'Generate OpenAI embeddings for completed matches that lack one. Processes in batches.',
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(20)
          .describe('Max matches to embed in this batch'),
      },
    },
    async ({ limit }) => {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY is required for bulk_embed');
        const openai = new OpenAI({ apiKey });

        const rows = await db
          .select({
            id: matches.id,
            player1Name: matches.player1Name,
            player2Name: matches.player2Name,
            botStrategy: matches.botStrategy,
            outcome: matches.outcome,
            actionHistory: matches.actionHistory,
            state: matches.state,
          })
          .from(matches)
          .where(
            and(
              eq(matches.status, 'completed'),
              sql`NOT EXISTS (SELECT 1 FROM match_embeddings me WHERE me.match_id = ${matches.id})`,
            ),
          )
          .limit(limit);

        let embedded = 0;
        let failed = 0;
        for (const row of rows) {
          try {
            const outcome = row.outcome as MatchOutcome;
            const actionCount = (row.actionHistory as unknown[]).length;
            const summary = buildMatchSummary({
              player1Name: row.player1Name,
              player2Name: row.player2Name,
              botStrategy: row.botStrategy,
              outcome,
              actionCount,
              gs: row.state as GameState | null,
            });
            const resp = await openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: summary,
            });
            const vector = resp.data[0]?.embedding;
            if (!vector) throw new Error('No embedding returned');
            await db
              .insert(matchEmbeddings)
              .values({
                matchId: row.id,
                embedding: vector,
                summary,
                metadata: {
                  winnerSuit: null,
                  turnCount: outcome?.turnNumber ?? actionCount,
                  isPvP: row.botStrategy == null,
                },
              })
              .onConflictDoNothing();
            embedded++;
          } catch {
            failed++;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { processed: rows.length, embedded, failed, batchLimit: limit },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  server.registerTool(
    'user_search',
    {
      description:
        'Search users by gamertag prefix. Returns admin-visible fields: id, email, elo, verification status.',
      inputSchema: {
        query: z.string().min(1).describe('Gamertag prefix to search for'),
        limit: z.number().int().min(1).max(50).default(20),
      },
    },
    async ({ query, limit }) => {
      try {
        const rows = await db
          .select({
            id: users.id,
            gamertag: users.gamertag,
            suffix: users.suffix,
            email: users.email,
            elo: users.elo,
            createdAt: users.createdAt,
            emailVerifiedAt: users.emailVerifiedAt,
          })
          .from(users)
          .where(sql`${users.gamertagNormalized} LIKE ${query.toLowerCase() + '%'}`)
          .limit(limit);

        const results = rows.map((r) => ({
          id: r.id,
          gamertag: r.suffix != null ? `${r.gamertag}#${r.suffix}` : r.gamertag,
          email: r.email,
          elo: r.elo,
          verified: r.emailVerifiedAt != null,
          createdAt: r.createdAt.toISOString(),
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ query, results, count: results.length }, null, 2),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );
}
