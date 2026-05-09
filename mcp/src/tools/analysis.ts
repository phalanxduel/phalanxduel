import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { db } from '../db.js';
import { matches, matchEmbeddings } from '../../../server/src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import type { GameState } from '@phalanxduel/shared';

const anthropic = new Anthropic();
const openai = new OpenAI();

const GameStateSchema = z.record(z.string(), z.unknown());

const FOCUS_INSTRUCTIONS: Record<string, string> = {
  full: 'Provide a comprehensive analysis covering opening, midgame, turning points, and conclusion.',
  turning_points: 'Identify the 2-3 key moments that decided the match outcome.',
  suit_strategy:
    'Analyze how each suit (spades/hearts/diamonds/clubs) was used and their tactical impact.',
  endgame: 'Focus on the final 10 turns and how the game was closed out.',
};

function buildAnalysisPrompt(gs: GameState, actionCount: number, focus: string): string {
  const playerSummary = gs.players.map((p) =>
    p
      ? {
          lp: p.lifepoints,
          handSize: p.hand.length,
          bfCards: p.battlefield.filter(Boolean).length,
          drawpileSize: p.drawpile.length,
        }
      : null,
  );
  const stateSnippet = JSON.stringify(
    { phase: gs.phase, turnNumber: gs.turnNumber, players: playerSummary, outcome: gs.outcome },
    null,
    2,
  );
  const instruction = FOCUS_INSTRUCTIONS[focus] ?? FOCUS_INSTRUCTIONS.full;
  return `You are a Phalanx Duel game analyst. Analyze this game state.

Game summary:
- Phase: ${gs.phase}
- Turn: ${gs.turnNumber ?? 'N/A'}
- Total actions: ${actionCount}
- Player 0 LP: ${gs.players[0]?.lifepoints ?? '?'}
- Player 1 LP: ${gs.players[1]?.lifepoints ?? '?'}
- Outcome: ${JSON.stringify(gs.outcome ?? 'in progress')}

Full state (abbreviated):
${stateSnippet}

${instruction}

Be concise and specific. Reference suit bonuses (spades=double LP damage, hearts=heal, diamonds=draw, clubs=kill bonus).`;
}

async function loadMatchState(
  matchId: string,
): Promise<{ gs: GameState | null; actionCount: number } | null> {
  const rows = await db
    .select({ state: matches.state, actionHistory: matches.actionHistory })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    gs: row.state as GameState | null,
    actionCount: (row.actionHistory as unknown[]).length,
  };
}

type MatchOutcome = {
  winnerIndex?: number | null;
  victoryType?: string | null;
  turnNumber?: number | null;
} | null;

interface MatchSummaryInput {
  player1Name: string | null;
  player2Name: string | null;
  botStrategy: string | null;
  outcome: MatchOutcome;
  actionCount: number;
  gs: GameState | null;
}

function outcomeStr(
  outcome: MatchOutcome,
  p1Name: string | null,
  p2Name: string | null,
  actionCount: number,
): string {
  if (outcome?.winnerIndex == null) return 'Match did not complete.';
  const winner = outcome.winnerIndex === 0 ? p1Name : outcome.winnerIndex === 1 ? p2Name : null;
  return `Winner: ${winner ?? 'unknown'} via ${outcome.victoryType ?? 'unknown'} in ${outcome.turnNumber ?? actionCount} turns.`;
}

function stateStr(gs: GameState | null): string[] {
  if (!gs) return [];
  const p0 = gs.players[0];
  const p1 = gs.players[1];
  return [
    `Final LP: P1=${p0?.lifepoints ?? 0}, P2=${p1?.lifepoints ?? 0}.`,
    `Cards remaining: P1 hand=${p0?.hand.length ?? 0}, P2 hand=${p1?.hand.length ?? 0}.`,
  ];
}

function buildMatchSummary(input: MatchSummaryInput): string {
  const { player1Name, player2Name, botStrategy, outcome, actionCount, gs } = input;
  const p2Label = player2Name ?? (botStrategy ? `Bot(${botStrategy})` : 'Player 2');
  return [
    `Match between ${player1Name ?? 'Player 1'} and ${p2Label}.`,
    outcomeStr(outcome, player1Name, player2Name, actionCount),
    ...stateStr(gs),
  ]
    .filter(Boolean)
    .join(' ');
}

export function registerAnalysisTools(server: McpServer): void {
  server.tool(
    'match_analyze',
    'Use Claude to analyze a completed match. Provide a game state or match ID and get a strategic breakdown: key turning points, suit usage, board control transitions, and play quality.',
    {
      matchId: z
        .string()
        .uuid()
        .optional()
        .describe('Match UUID to load from DB (or supply state directly)'),
      state: GameStateSchema.optional().describe('GameState JSON to analyze directly'),
      focus: z
        .enum(['full', 'turning_points', 'suit_strategy', 'endgame'])
        .default('full')
        .describe('Aspect to focus on'),
    },
    async ({ matchId, state, focus }) => {
      try {
        let gs: GameState | null = (state as GameState | null) ?? null;
        let actionCount = 0;

        if (!gs && matchId) {
          const loaded = await loadMatchState(matchId);
          if (!loaded)
            return {
              content: [{ type: 'text', text: `Match ${matchId} not found` }],
              isError: true,
            };
          gs = loaded.gs;
          actionCount = loaded.actionCount;
        }

        if (!gs)
          return {
            content: [{ type: 'text', text: 'No game state provided or found' }],
            isError: true,
          };

        const message = await anthropic.messages.create({
          model: 'claude-opus-4-7',
          max_tokens: 1024,
          messages: [{ role: 'user', content: buildAnalysisPrompt(gs, actionCount, focus) }],
        });
        const analysis = message.content[0]?.type === 'text' ? message.content[0].text : '';

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ matchId: matchId ?? 'inline', focus, analysis }, null, 2),
            },
          ],
        };
      } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'match_embed',
    'Generate an OpenAI embedding for a match and store it in the match_embeddings table. Enables semantic similarity search. Returns the generated summary.',
    { matchId: z.string().uuid().describe('Match UUID to embed') },
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
          return { content: [{ type: 'text', text: `Match ${matchId} not found` }], isError: true };

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

        const embeddingResponse = await openai.embeddings.create({
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

  server.tool(
    'match_find_similar',
    'Find matches semantically similar to a text query using pgvector cosine similarity search. Requires embeddings to have been generated via match_embed first.',
    {
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
    async ({ query, limit, maxDistance }) => {
      try {
        const embeddingResponse = await openai.embeddings.create({
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
