import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';
import { matches, users, playerRatings, matchEmbeddings } from '../../../server/src/db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';

export function registerDataTools(server: McpServer): void {
  server.registerTool(
    'match_list',
    {
      description:
        'List recent completed matches. Returns match IDs, player names, winner, turn count, and timestamps.',
      inputSchema: {
        limit: z.number().int().min(1).max(50).default(10).describe('Max results to return'),
        offset: z.number().int().min(0).default(0).describe('Pagination offset'),
        playerId: z.uuid().optional().describe('Filter to matches involving this user ID'),
        isAutomated: z
          .boolean()
          .optional()
          .describe('Filter by automated flag. Omit to return all matches.'),
      },
    },
    async ({ limit, offset, playerId, isAutomated }) => {
      try {
        const conditions = [eq(matches.status, 'completed')];
        if (playerId) {
          conditions.push(
            sql`(${matches.player1Id} = ${playerId} OR ${matches.player2Id} = ${playerId})`,
          );
        }
        if (isAutomated !== undefined) {
          conditions.push(eq(matches.isAutomated, isAutomated));
        }
        const where = conditions.length === 1 ? conditions[0] : and(...conditions);

        const rows = await db
          .select({
            id: matches.id,
            player1Name: matches.player1Name,
            player2Name: matches.player2Name,
            botStrategy: matches.botStrategy,
            isAutomated: matches.isAutomated,
            outcome: matches.outcome,
            createdAt: matches.createdAt,
            updatedAt: matches.updatedAt,
          })
          .from(matches)
          .where(where)
          .orderBy(desc(matches.updatedAt))
          .limit(limit)
          .offset(offset);

        const results = rows.map((row) => {
          const outcome = row.outcome as {
            winnerIndex?: number | null;
            victoryType?: string | null;
            turnNumber?: number | null;
          } | null;
          return {
            matchId: row.id,
            player1Name: row.player1Name,
            player2Name: row.player2Name,
            botStrategy: row.botStrategy,
            isAutomated: row.isAutomated,
            winnerIndex: outcome?.winnerIndex ?? null,
            victoryType: outcome?.victoryType ?? null,
            turnCount: outcome?.turnNumber ?? null,
            createdAt: row.createdAt.toISOString(),
            completedAt: row.updatedAt.toISOString(),
          };
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ matches: results, count: results.length }, null, 2),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  server.registerTool(
    'match_get',
    {
      description:
        'Fetch a single match by ID. Returns full game state, action history summary, outcome, and player info.',
      inputSchema: { matchId: z.uuid().describe('Match UUID') },
    },
    async ({ matchId }) => {
      try {
        const rows = await db
          .select({
            id: matches.id,
            player1Id: matches.player1Id,
            player2Id: matches.player2Id,
            player1Name: matches.player1Name,
            player2Name: matches.player2Name,
            botStrategy: matches.botStrategy,
            isAutomated: matches.isAutomated,
            status: matches.status,
            state: matches.state,
            outcome: matches.outcome,
            actionHistory: matches.actionHistory,
            createdAt: matches.createdAt,
            updatedAt: matches.updatedAt,
          })
          .from(matches)
          .where(eq(matches.id, matchId))
          .limit(1);

        const row = rows[0];
        if (!row) {
          return {
            content: [{ type: 'text', text: `Match ${matchId} not found` }],
            isError: true,
          };
        }

        const actionHist = row.actionHistory as unknown[];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  matchId: row.id,
                  status: row.status,
                  isAutomated: row.isAutomated,
                  player1: { id: row.player1Id, name: row.player1Name },
                  player2: { id: row.player2Id, name: row.player2Name, bot: row.botStrategy },
                  outcome: row.outcome,
                  actionCount: actionHist.length,
                  currentState: row.state,
                  createdAt: row.createdAt.toISOString(),
                  updatedAt: row.updatedAt.toISOString(),
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
    'leaderboard',
    {
      description:
        'Get the top-ranked players for a game mode. Returns rank, gamertag, ELO, wins/losses.',
      inputSchema: {
        mode: z
          .enum(['pvp', 'sp-random', 'sp-heuristic', 'sp-mcts'])
          .default('pvp')
          .describe('Game mode leaderboard to retrieve'),
        limit: z.number().int().min(1).max(100).default(20).describe('Number of players to return'),
      },
    },
    async ({ mode, limit }) => {
      try {
        const rows = await db
          .select({
            userId: playerRatings.userId,
            gamertag: users.gamertag,
            suffix: users.suffix,
            eloRating: playerRatings.eloRating,
            gamesPlayed: playerRatings.gamesPlayed,
            wins: playerRatings.wins,
            losses: playerRatings.losses,
            provisional: playerRatings.provisional,
          })
          .from(playerRatings)
          .innerJoin(users, eq(playerRatings.userId, users.id))
          .where(eq(playerRatings.mode, mode))
          .orderBy(desc(playerRatings.eloRating))
          .limit(limit);

        const rankings = rows.map((row, i) => ({
          rank: i + 1,
          userId: row.userId,
          gamertag: row.suffix ? `${row.gamertag}#${row.suffix}` : row.gamertag,
          elo: row.eloRating,
          gamesPlayed: row.gamesPlayed,
          wins: row.wins,
          losses: row.losses,
          winRate: row.gamesPlayed > 0 ? (row.wins / row.gamesPlayed).toFixed(3) : '0.000',
          provisional: row.provisional,
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ mode, rankings, count: rankings.length }, null, 2),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  server.registerTool(
    'match_embeddings_list',
    {
      description:
        'List matches that have vector embeddings (AI-generated summaries). Returns matchId, summary, and metadata.',
      inputSchema: {
        limit: z.number().int().min(1).max(50).default(10),
      },
    },
    async ({ limit }) => {
      try {
        const rows = await db
          .select({
            matchId: matchEmbeddings.matchId,
            summary: matchEmbeddings.summary,
            metadata: matchEmbeddings.metadata,
            createdAt: matchEmbeddings.createdAt,
          })
          .from(matchEmbeddings)
          .where(sql`${matchEmbeddings.embedding} IS NOT NULL`)
          .orderBy(desc(matchEmbeddings.createdAt))
          .limit(limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  embeddings: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
                  count: rows.length,
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
}
