import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { GameState, Action } from '@phalanxduel/shared';
import { getValidActions, simulateAttack } from '../../../engine/src/index.js';
import { evaluateState } from '../../../engine/src/mcts.js';

const ANALYSIS_PROVIDER = (process.env.ANALYSIS_PROVIDER ?? 'anthropic') as 'anthropic' | 'llama';
const LLAMA_BASE_URL = process.env.LLAMA_BASE_URL ?? 'http://127.0.0.1:8080/v1';
const LLAMA_MODEL = process.env.LLAMA_MODEL ?? 'local';

const anthropic = ANALYSIS_PROVIDER === 'anthropic' ? new Anthropic() : null;
const llamaClient =
  ANALYSIS_PROVIDER === 'llama'
    ? new OpenAI({ baseURL: LLAMA_BASE_URL, apiKey: 'llama-local' })
    : null;

async function runAnalysis(prompt: string, maxTokens = 1024): Promise<string> {
  if (ANALYSIS_PROVIDER === 'llama' && llamaClient) {
    const res = await llamaClient.chat.completions.create({
      model: LLAMA_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    return res.choices[0]?.message.content ?? '';
  }
  if (!anthropic) throw new Error('Anthropic client not initialised');
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: maxTokens,
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

// --- engine_llm_recommend helpers ---

function positionLabel(score: number): string {
  if (score > 0.6) return 'winning';
  if (score < 0.4) return 'losing';
  return 'balanced';
}

interface CardLike {
  suit: string;
  face: string;
}

function cardDesc(card: CardLike): string {
  return `${card.suit.charAt(0).toUpperCase()}${card.face}`;
}

// For DeploymentPhase, deduplicate to one action per unique card (first available column).
// Other phases return all actions as-is.
function candidateActions(gs: GameState, playerIndex: number): Action[] {
  const all = getValidActions(gs, playerIndex);
  if (gs.phase !== 'DeploymentPhase') return all;
  const seen = new Set<string>();
  return all.filter((a) => {
    if (a.type !== 'deploy') return true;
    if (seen.has(a.cardId)) return false;
    seen.add(a.cardId);
    return true;
  });
}

function describeAction(action: Action, gs: GameState, playerIndex: number): string {
  const player = gs.players[playerIndex];
  if (action.type === 'deploy') {
    const card = player?.hand.find((c) => c.id === action.cardId);
    const cd = card ? cardDesc(card) : action.cardId.slice(0, 8);
    return `deploy ${cd} → col ${action.column}`;
  }
  if (action.type === 'attack') {
    try {
      const preview = simulateAttack(gs, action);
      return `attack col${action.attackingColumn}: ${preview.verdict} (${preview.resolution.outcome.breakthroughDamage} LP dmg)`;
    } catch {
      return `attack col${action.attackingColumn}→col${action.defendingColumn}`;
    }
  }
  if (action.type === 'reinforce') {
    const card = player?.hand.find((c) => c.id === action.cardId);
    const cd = card ? cardDesc(card) : action.cardId.slice(0, 8);
    return `reinforce with ${cd}`;
  }
  return action.type;
}

function buildRecommendPrompt(gs: GameState, playerIndex: number, actions: Action[]): string {
  const me = gs.players[playerIndex];
  const opp = gs.players[1 - playerIndex];
  const score = evaluateState(gs, playerIndex);
  const actionList = actions
    .map((a, i) => `${i}: ${describeAction(a, gs, playerIndex)}`)
    .join('\n');

  return `You are playing Phalanx Duel as player ${playerIndex}. Choose the best action.

Position (${positionLabel(score)}, score ${score.toFixed(2)}):
Your LP: ${me?.lifepoints ?? 0} | Opp LP: ${opp?.lifepoints ?? 0}
Your BF: ${me?.battlefield.filter(Boolean).length ?? 0} cards | Opp BF: ${opp?.battlefield.filter(Boolean).length ?? 0} cards
Hand: ${me?.hand.length ?? 0} | Phase: ${gs.phase} | Turn: ${gs.turnNumber}

Suit bonuses: S=double dmg, H=heal, D=draw card, C=kill defender

Legal actions:
${actionList}

Reply with ONLY: {"actionIndex": <0-${actions.length - 1}>, "reasoning": "<one sentence>"}`;
}

function parseActionChoice(
  raw: string,
  actions: Action[],
): { action: Action; actionIndex: number; reasoning: string } | null {
  const m = /\{[\s\S]*?"actionIndex"[\s\S]*?\}/.exec(raw);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]) as { actionIndex?: unknown; reasoning?: unknown };
    const idx = typeof parsed.actionIndex === 'number' ? Math.floor(parsed.actionIndex) : -1;
    const action = actions[idx];
    if (!action) return null;
    return {
      action,
      actionIndex: idx,
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
    };
  } catch {
    return null;
  }
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
        if (state !== undefined && JSON.stringify(state).length > 256 * 1024) {
          return {
            content: [{ type: 'text', text: 'State payload exceeds 256 KB limit' }],
            isError: true,
          };
        }

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

  server.registerTool(
    'engine_llm_recommend',
    {
      description:
        'Use the configured LLM (local llama.cpp or Anthropic) to reason about the current position and recommend an action. Unlike engine_bot_recommend (MCTS/heuristic), this routes the decision through natural language reasoning. Returns the chosen action with a one-sentence explanation. Falls back to action index 0 if the LLM response cannot be parsed.',
      inputSchema: {
        state: GameStateSchema.describe('Current GameState'),
        playerIndex: z.number().int().min(0).max(1).describe('Which player to advise (0 or 1)'),
      },
    },
    async ({ state, playerIndex }) => {
      try {
        const gs = state as unknown as GameState;
        const actions = candidateActions(gs, playerIndex);
        if (actions.length === 0) {
          return {
            content: [{ type: 'text', text: 'No legal actions available' }],
            isError: true,
          };
        }

        const prompt = buildRecommendPrompt(gs, playerIndex, actions);
        const raw = await runAnalysis(prompt, 256);
        const parsed = parseActionChoice(raw, actions);

        const firstAction = actions[0];
        if (!firstAction) {
          return { content: [{ type: 'text', text: 'No legal actions available' }], isError: true };
        }
        const chosen = parsed ?? {
          action: firstAction,
          actionIndex: 0,
          reasoning: '(LLM response could not be parsed — using first legal action)',
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  recommendedAction: chosen.action,
                  actionIndex: chosen.actionIndex,
                  reasoning: chosen.reasoning,
                  provider: ANALYSIS_PROVIDER,
                  ...(parsed ? {} : { rawResponse: raw }),
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
