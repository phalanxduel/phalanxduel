import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { GameState } from '@phalanxduel/shared';

const ANALYSIS_PROVIDER = (process.env.ANALYSIS_PROVIDER ?? 'anthropic') as 'anthropic' | 'llama';
const LLAMA_BASE_URL = process.env.LLAMA_BASE_URL ?? 'http://127.0.0.1:8080/v1';
const LLAMA_MODEL = process.env.LLAMA_MODEL ?? 'local';

const anthropic = ANALYSIS_PROVIDER === 'anthropic' ? new Anthropic() : null;
const llamaClient =
  ANALYSIS_PROVIDER === 'llama'
    ? new OpenAI({ baseURL: LLAMA_BASE_URL, apiKey: 'llama-local' })
    : null;

async function runAnalysis(prompt: string): Promise<string> {
  if (ANALYSIS_PROVIDER === 'llama' && llamaClient) {
    const res = await llamaClient.chat.completions.create({
      model: LLAMA_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return res.choices[0]?.message.content ?? '';
  }
  if (!anthropic) throw new Error('Anthropic client not initialised');
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  return message.content[0]?.type === 'text' ? message.content[0].text : '';
}

const GameStateSchema = z.record(z.string(), z.unknown());

type FocusKey = 'full' | 'turning_points' | 'suit_strategy' | 'endgame';
const FOCUS_INSTRUCTIONS: Record<FocusKey, string> = {
  full: 'Provide a comprehensive analysis covering opening, midgame, turning points, and conclusion.',
  turning_points: 'Identify the 2-3 key moments that decided the match outcome.',
  suit_strategy:
    'Analyze how each suit (spades/hearts/diamonds/clubs) was used and their tactical impact.',
  endgame: 'Focus on the final 10 turns and how the game was closed out.',
};

function buildAnalysisPrompt(gs: GameState, actionCount: number, focus: FocusKey): string {
  const playerSummary = gs.players.map((p) => ({
    lp: p.lifepoints,
    handSize: p.hand.length,
    bfCards: p.battlefield.filter(Boolean).length,
    drawpileSize: p.drawpile.length,
  }));
  const stateSnippet = JSON.stringify(
    { phase: gs.phase, turnNumber: gs.turnNumber, players: playerSummary, outcome: gs.outcome },
    null,
    2,
  );
  return `You are a Phalanx Duel game analyst. Analyze this game state.

Game summary:
- Phase: ${gs.phase}
- Turn: ${gs.turnNumber}
- Total actions: ${actionCount}
- Player 0 LP: ${gs.players[0]?.lifepoints ?? '?'}
- Player 1 LP: ${gs.players[1]?.lifepoints ?? '?'}
- Outcome: ${JSON.stringify(gs.outcome ?? 'in progress')}

Full state (abbreviated):
${stateSnippet}

${FOCUS_INSTRUCTIONS[focus]}

Be concise and specific. Reference suit bonuses (spades=double LP damage, hearts=heal, diamonds=draw, clubs=kill bonus).`;
}

async function loadMatchState(
  matchId: string,
): Promise<{ gs: GameState | null; actionCount: number } | null> {
  const { db } = await import('../db.js');
  const { matches } = await import('../../../server/src/db/schema.js');
  const { eq } = await import('drizzle-orm');
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

export function registerAnalysisTools(server: McpServer): void {
  server.registerTool(
    'match_analyze',
    {
      description:
        'Analyze a completed match using the configured AI provider (Anthropic or local llama.cpp). Provide a game state or match ID and get a strategic breakdown: key turning points, suit usage, board control transitions, and play quality.',
      inputSchema: {
        matchId: z
          .uuid()
          .optional()
          .describe('Match UUID to load from DB (or supply state directly)'),
        state: GameStateSchema.optional().describe('GameState JSON to analyze directly'),
        focus: z
          .enum(['full', 'turning_points', 'suit_strategy', 'endgame'])
          .default('full')
          .describe('Aspect to focus on'),
      },
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

        const analysis = await runAnalysis(buildAnalysisPrompt(gs, actionCount, focus));

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
}
