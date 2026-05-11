import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  computeBotAction,
  getValidActions,
  simulateAttack,
  TIER_CONFIG,
} from '../../../engine/src/index.js';
import { evaluateState } from '../../../engine/src/mcts.js';
import type { GameState } from '@phalanxduel/shared';
import type { BotTier } from '../../../engine/src/index.js';

const BOT_TIERS = Object.keys(TIER_CONFIG) as BotTier[];

const GameStateSchema = z.record(z.string(), z.unknown());

type PlayerSlot = GameState['players'][number] | undefined;

function scoreLabel(score: number): string {
  if (score > 0.6) return 'Winning';
  if (score < 0.4) return 'Losing';
  return 'Balanced';
}

function playerBreakdown(player: PlayerSlot, opponent: PlayerSlot) {
  return {
    myLp: player?.lifepoints ?? 0,
    oppLp: opponent?.lifepoints ?? 0,
    myBfCards: player?.battlefield.filter(Boolean).length ?? 0,
    oppBfCards: opponent?.battlefield.filter(Boolean).length ?? 0,
    myHandSize: player?.hand.length ?? 0,
    oppHandSize: opponent?.hand.length ?? 0,
  };
}

export function registerEngineTools(server: McpServer): void {
  server.registerTool(
    'engine_valid_actions',
    {
      description:
        'List all valid actions for the active player in a game state. Returns moves with type and relevant fields.',
      inputSchema: {
        state: GameStateSchema.describe('A GameState object (from match replay or live match)'),
      },
    },
    ({ state }) => {
      try {
        const gs = state as unknown as GameState;
        const actions = getValidActions(gs, gs.activePlayerIndex);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  phase: gs.phase,
                  activePlayer: gs.activePlayerIndex,
                  validActions: actions,
                  count: actions.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'engine_simulate_attack',
    {
      description:
        'Preview the result of an attack action without committing it. Returns combat log steps, LP damage, and whether the attack triggers a winner.',
      inputSchema: {
        state: GameStateSchema.describe('Current GameState'),
        attackingColumn: z
          .number()
          .int()
          .min(0)
          .max(3)
          .describe('Column index of the attacker (0–3)'),
        playerIndex: z
          .number()
          .int()
          .min(0)
          .max(1)
          .describe('Index of the attacking player (0 or 1)'),
      },
    },
    ({ state, attackingColumn, playerIndex }) => {
      try {
        const gs = state as unknown as GameState;
        const action = {
          type: 'attack' as const,
          playerIndex: playerIndex as 0 | 1,
          attackingColumn,
          defendingColumn: attackingColumn,
          timestamp: '1970-01-01T00:00:00.000Z',
        };
        const preview = simulateAttack(gs, action);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  verdict: preview.verdict,
                  lpDamage: preview.resolution.outcome.breakthroughDamage,
                  modifiers: preview.resolution.modifiers,
                  outcome: preview.resolution.outcome,
                  explanation: preview.resolution.explanation,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'engine_bot_recommend',
    {
      description:
        "Get the bot's recommended action for a position. Pass `tier` to use a named difficulty (scout, grunt, soldier, veteran, destroyer, sentinel, blitz, champion) — this overrides strategy and mctsIterations. Legacy strategy/mctsIterations fields still work when tier is omitted.",
      inputSchema: {
        state: GameStateSchema.describe('Current GameState'),
        playerIndex: z.number().int().min(0).max(1).describe('Which player to advise (0 or 1)'),
        tier: z
          .enum(BOT_TIERS as [BotTier, ...BotTier[]])
          .optional()
          .describe(
            'Named bot difficulty tier. Overrides strategy and mctsIterations when provided.',
          ),
        strategy: z
          .enum(['random', 'heuristic', 'mcts'])
          .default('heuristic')
          .describe('Bot strategy (ignored when tier is set)'),
        seed: z.number().int().default(42).describe('RNG seed for determinism'),
        mctsIterations: z
          .number()
          .int()
          .min(10)
          .max(2000)
          .default(200)
          .describe('MCTS iterations (ignored when tier is set)'),
      },
    },
    ({ state, playerIndex, tier, strategy, seed, mctsIterations }) => {
      try {
        const gs = state as unknown as GameState;
        const action = computeBotAction(
          gs,
          playerIndex as 0 | 1,
          { strategy, seed, mctsIterations },
          undefined,
          tier,
        );
        const score = evaluateState(gs, playerIndex);
        const effectiveStrategy = tier ? TIER_CONFIG[tier].strategy : strategy;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  recommendedAction: action,
                  positionScore: score,
                  interpretation: scoreLabel(score) + ' position',
                  tier: tier ?? null,
                  strategy: effectiveStrategy,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    'engine_evaluate',
    {
      description:
        'Score a game position heuristically (0.0 = losing, 0.5 = balanced, 1.0 = winning) for a given player. Weights: LP 40%, battlefield 30%, hand 20%, economy 10%.',
      inputSchema: {
        state: GameStateSchema.describe('Current GameState'),
        playerIndex: z.number().int().min(0).max(1).describe('Player perspective (0 or 1)'),
      },
    },
    ({ state, playerIndex }) => {
      try {
        const gs = state as unknown as GameState;
        const score = evaluateState(gs, playerIndex);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  score,
                  interpretation: scoreLabel(score),
                  breakdown: playerBreakdown(gs.players[playerIndex], gs.players[1 - playerIndex]),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error: ${String(err)}` }],
          isError: true,
        };
      }
    },
  );
}
