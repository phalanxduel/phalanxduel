import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { computeBotAction, getValidActions, simulateAttack } from '../../../engine/src/index.js';
import { evaluateState } from '../../../engine/src/mcts.js';
import type { GameState } from '@phalanxduel/shared';

const GameStateSchema = z.record(z.string(), z.unknown());

export function registerEngineTools(server: McpServer): void {
  server.tool(
    'engine_valid_actions',
    'List all valid actions for the active player in a game state. Returns moves with type and relevant fields.',
    { state: GameStateSchema.describe('A GameState object (from match replay or live match)') },
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

  server.tool(
    'engine_simulate_attack',
    'Preview the result of an attack action without committing it. Returns combat log steps, LP damage, and whether the attack triggers a winner.',
    {
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

  server.tool(
    'engine_bot_recommend',
    'Get the bot\'s recommended action for a position. Uses heuristic strategy by default; pass "mcts" for deeper search.',
    {
      state: GameStateSchema.describe('Current GameState'),
      playerIndex: z.number().int().min(0).max(1).describe('Which player to advise (0 or 1)'),
      strategy: z
        .enum(['random', 'heuristic', 'mcts'])
        .default('heuristic')
        .describe('Bot strategy to use'),
      seed: z.number().int().default(42).describe('RNG seed for determinism'),
      mctsIterations: z
        .number()
        .int()
        .min(10)
        .max(2000)
        .default(200)
        .describe('MCTS iterations (only used when strategy=mcts)'),
    },
    ({ state, playerIndex, strategy, seed, mctsIterations }) => {
      try {
        const gs = state as unknown as GameState;
        const action = computeBotAction(gs, playerIndex as 0 | 1, {
          strategy,
          seed,
          mctsIterations,
        });
        const score = evaluateState(gs, playerIndex);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  recommendedAction: action,
                  positionScore: score,
                  interpretation:
                    score > 0.6
                      ? 'Winning position'
                      : score < 0.4
                        ? 'Losing position'
                        : 'Balanced position',
                  strategy,
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

  server.tool(
    'engine_evaluate',
    'Score a game position heuristically (0.0 = losing, 0.5 = balanced, 1.0 = winning) for a given player. Weights: LP 40%, battlefield 30%, hand 20%, economy 10%.',
    {
      state: GameStateSchema.describe('Current GameState'),
      playerIndex: z.number().int().min(0).max(1).describe('Player perspective (0 or 1)'),
    },
    ({ state, playerIndex }) => {
      try {
        const gs = state as unknown as GameState;
        const score = evaluateState(gs, playerIndex);
        const player = gs.players[playerIndex];
        const opponent = gs.players[1 - playerIndex];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  score,
                  interpretation: score > 0.6 ? 'Winning' : score < 0.4 ? 'Losing' : 'Balanced',
                  breakdown: {
                    myLp: player?.lifepoints ?? 0,
                    oppLp: opponent?.lifepoints ?? 0,
                    myBfCards: player?.battlefield.filter(Boolean).length ?? 0,
                    oppBfCards: opponent?.battlefield.filter(Boolean).length ?? 0,
                    myHandSize: player?.hand.length ?? 0,
                    oppHandSize: opponent?.hand.length ?? 0,
                  },
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
