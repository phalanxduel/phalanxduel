import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import OpenAI from 'openai';
import { db } from '../db.js';
import { matches, matchEmbeddings } from '../../../server/src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { GameState } from '@phalanxduel/shared';
import { buildMatchSummary } from '../utils/matchSummary.js';
import type { MatchOutcome } from '../utils/matchSummary.js';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

export function registerEmbeddingTools(server: McpServer): void {
  server.registerTool(
    'match_embed',
    {
      description:
        'Generate an OpenAI embedding for a match and store it in the match_embeddings table. Enables semantic similarity search. Returns the generated summary.',
      inputSchema: { matchId: z.uuid().describe('Match UUID to embed') },
    },
    async ({ matchId }) => {
      try {
        const rows = await db
          .select({
            state: matches.state,
            player1Name: matches.player1Name,
            player2Name: matches.player2Name,
            botStrategy: matches.botStrategy,
            outcome: matches.outcome,
            actionHistory: matches.actionHistory,
          })
          .from(matches)
          .where(eq(matches.id, matchId))
          .limit(1);

        const row = rows[0];
        if (!row)
          return {
            content: [{ type: 'text', text: `Match ${matchId} not found` }],
            isError: true,
          };

        const gs = row.state as GameState | null;
        const outcome = row.outcome as MatchOutcome;
        const actionCount = (row.actionHistory as unknown[]).length;
        const summary = buildMatchSummary({
          player1Name: row.player1Name,
          player2Name: row.player2Name,
          botStrategy: row.botStrategy,
          outcome,
          actionCount,
          gs,
        });

        const embeddingResponse = await getOpenAI().embeddings.create({
          model: 'text-embedding-3-small',
          input: summary,
        });
        const vector = embeddingResponse.data[0]?.embedding;
        if (!vector) throw new Error('No embedding returned from OpenAI');

        const metadata = {
          winnerSuit: null,
          turnCount: outcome?.turnNumber ?? actionCount,
          isPvP: row.botStrategy == null,
        };

        await db
          .insert(matchEmbeddings)
          .values({ matchId, embedding: vector, summary, metadata })
          .onConflictDoUpdate({
            target: matchEmbeddings.matchId,
            set: { embedding: vector, summary, metadata },
          });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { matchId, summary, dimensions: vector.length, stored: true },
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
    'match_find_similar',
    {
      description:
        'Find matches semantically similar to a text query using pgvector cosine similarity search. Requires embeddings to have been generated via match_embed first.',
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe('Natural language description of the match pattern to search for'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(5)
          .describe('Number of similar matches to return'),
        maxDistance: z
          .number()
          .min(0)
          .max(2)
          .default(0.5)
          .describe('Maximum cosine distance (0=identical, 2=opposite). Lower = more similar.'),
      },
    },
    async ({ query, limit, maxDistance }) => {
      try {
        const embeddingResponse = await getOpenAI().embeddings.create({
          model: 'text-embedding-3-small',
          input: query,
        });
        const queryVector = embeddingResponse.data[0]?.embedding;
        if (!queryVector) throw new Error('No embedding returned from OpenAI');

        const vectorLiteral = `[${queryVector.join(',')}]`;
        const rows = await db.execute(sql`
          SELECT me.match_id, me.summary, me.metadata, me.created_at,
                 me.embedding <=> ${vectorLiteral}::vector AS distance
          FROM match_embeddings me
          WHERE me.embedding IS NOT NULL
            AND me.embedding <=> ${vectorLiteral}::vector < ${maxDistance}
          ORDER BY distance ASC
          LIMIT ${limit}
        `);

        const results = rows.map((r) => ({
          matchId: r.match_id,
          summary: r.summary,
          metadata: r.metadata,
          distance: Number(r.distance).toFixed(4),
          createdAt: r.created_at,
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
