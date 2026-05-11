import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';

// Maps tier codenames (and legacy aliases) to the WS createMatch opponent + botDifficulty fields.
// The server resolves botDifficulty → mctsIterations (easy=100, medium=500, hard=2000).
const TIER_TO_WS: Record<
  string,
  {
    opponent: 'bot-random' | 'bot-heuristic' | 'bot-mcts';
    botDifficulty?: 'easy' | 'medium' | 'hard';
  }
> = {
  scout: { opponent: 'bot-random' },
  'bot-random': { opponent: 'bot-random' },
  grunt: { opponent: 'bot-heuristic' },
  'bot-heuristic': { opponent: 'bot-heuristic' },
  soldier: { opponent: 'bot-mcts', botDifficulty: 'easy' },
  'bot-mcts': { opponent: 'bot-mcts', botDifficulty: 'easy' },
  veteran: { opponent: 'bot-mcts', botDifficulty: 'medium' },
  destroyer: { opponent: 'bot-mcts', botDifficulty: 'medium' },
  sentinel: { opponent: 'bot-mcts', botDifficulty: 'medium' },
  blitz: { opponent: 'bot-mcts', botDifficulty: 'medium' },
  champion: { opponent: 'bot-mcts', botDifficulty: 'hard' },
};

const GAME_SERVER_URL = process.env.GAME_SERVER_URL;
const AGENT_TOKEN = process.env.AGENT_TOKEN;

const WS_TIMEOUT_MS = 15_000;

type ServerMsg = Record<string, unknown> & { type: string };

function connectWs(serverUrl: string): WebSocket {
  const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws';
  const headers: Record<string, string> = {};
  if (AGENT_TOKEN) headers.Authorization = `Bearer ${AGENT_TOKEN}`;
  return new WebSocket(wsUrl, { headers });
}

function waitForMessages(
  ws: WebSocket,
  predicate: (msgs: ServerMsg[]) => boolean,
  timeoutMs = WS_TIMEOUT_MS,
): Promise<ServerMsg[]> {
  return new Promise((resolve, reject) => {
    const collected: ServerMsg[] = [];
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`WS timeout after ${timeoutMs}ms. Collected: ${JSON.stringify(collected)}`));
    }, timeoutMs);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ServerMsg;
        collected.push(msg);
        if (predicate(collected)) {
          clearTimeout(timer);
          resolve(collected);
        }
      } catch {
        // ignore non-JSON frames
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    ws.on('close', (code, reason) => {
      clearTimeout(timer);
      reject(new Error(`WS closed unexpectedly: ${code} ${reason.toString()}`));
    });
  });
}

function sendJson(ws: WebSocket, payload: unknown): void {
  ws.send(JSON.stringify(payload));
}

function hasType(msgs: ServerMsg[], type: string): boolean {
  return msgs.some((m) => m.type === type);
}

function findByType(msgs: ServerMsg[], type: string): ServerMsg | undefined {
  return msgs.find((m) => m.type === type);
}

export function registerGameplayTools(server: McpServer): void {
  server.registerTool(
    'match_create',
    {
      description:
        'Create a new match on the game server as the agent user. Returns matchId, playerId, and initial game state. Use playerId in subsequent action_submit calls. Accepts all 8 bot difficulty tiers (scout, grunt, soldier, veteran, destroyer, sentinel, blitz, champion) and legacy aliases (bot-random, bot-heuristic, bot-mcts). Requires GAME_SERVER_URL and AGENT_TOKEN env vars.',
      inputSchema: {
        opponent: z
          .enum([
            'scout',
            'grunt',
            'soldier',
            'veteran',
            'destroyer',
            'sentinel',
            'blitz',
            'champion',
            'bot-random',
            'bot-heuristic',
            'bot-mcts',
          ])
          .default('grunt')
          .describe('Bot difficulty tier or legacy strategy alias for player 2'),
        seed: z
          .number()
          .int()
          .optional()
          .describe(
            'RNG seed for reproducible matches (local/staging only — blocked in production)',
          ),
        serverUrl: z.string().url().optional().describe('Override GAME_SERVER_URL for this call'),
      },
    },
    async ({ opponent, seed, serverUrl }) => {
      const url = serverUrl ?? GAME_SERVER_URL;
      if (!url) {
        return {
          content: [{ type: 'text', text: 'GAME_SERVER_URL is not set' }],
          isError: true,
        };
      }

      const wsOpponent = TIER_TO_WS[opponent] ?? { opponent: 'bot-heuristic' as const };

      const ws = connectWs(url);
      try {
        await new Promise<void>((resolve, reject) => {
          ws.once('open', resolve);
          ws.once('error', reject);
        });

        const msgId = randomUUID();
        const waitPromise = waitForMessages(ws, (msgs) => {
          const hasCreated = hasType(msgs, 'matchCreated');
          const hasAck = msgs.some((m) => m.type === 'ack' && m.ackedMsgId === msgId);
          const hasState = hasType(msgs, 'gameState');
          return hasCreated && hasAck && hasState;
        });

        sendJson(ws, {
          type: 'createMatch',
          msgId,
          playerName: 'agent',
          opponent: wsOpponent.opponent,
          ...(wsOpponent.botDifficulty ? { botDifficulty: wsOpponent.botDifficulty } : {}),
          isAgent: true,
          ...(seed !== undefined ? { rngSeed: seed } : {}),
        });

        const msgs = await waitPromise;
        ws.close();

        const created = findByType(msgs, 'matchCreated');
        const stateMsg = findByType(msgs, 'gameState');
        const matchId = created?.matchId as string;
        const playerId = created?.playerId as string;
        const playerIndex = created?.playerIndex as number;
        const state = (stateMsg?.result as Record<string, unknown>)?.postState ?? stateMsg?.result;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ matchId, playerId, playerIndex, state }, null, 2),
            },
          ],
        };
      } catch (err) {
        ws.terminate();
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  server.registerTool(
    'action_submit',
    {
      description:
        'Submit a single action to a live match. Rejoins the match as the agent, submits the action, and returns the resulting game state. Use engine_valid_actions and engine_bot_recommend to determine the action first. Requires GAME_SERVER_URL and AGENT_TOKEN env vars.',
      inputSchema: {
        matchId: z.uuid().describe('Match ID returned by match_create'),
        playerId: z.string().describe('Player ID returned by match_create'),
        action: z
          .object({
            type: z.enum(['deploy', 'attack', 'pass', 'reinforce', 'forfeit']),
            playerIndex: z.number().int().min(0).max(1),
            timestamp: z.string().datetime().optional(),
            cardId: z.string().optional(),
            column: z.number().int().min(0).max(11).optional(),
            expectedSequenceNumber: z.number().int().min(0).optional(),
          })
          .describe('Action to submit'),
        serverUrl: z.string().url().optional().describe('Override GAME_SERVER_URL for this call'),
      },
    },
    async ({ matchId, playerId, action, serverUrl }) => {
      const url = serverUrl ?? GAME_SERVER_URL;
      if (!url) {
        return {
          content: [{ type: 'text', text: 'GAME_SERVER_URL is not set' }],
          isError: true,
        };
      }

      const ws = connectWs(url);
      try {
        await new Promise<void>((resolve, reject) => {
          ws.once('open', resolve);
          ws.once('error', reject);
        });

        // Rejoin to register this socket as an active match participant
        const rejoinMsgId = randomUUID();
        const rejoinPromise = waitForMessages(ws, (msgs) => {
          const hasJoined = hasType(msgs, 'matchJoined');
          const hasAck = msgs.some((m) => m.type === 'ack' && m.ackedMsgId === rejoinMsgId);
          return hasJoined && hasAck;
        });

        sendJson(ws, { type: 'rejoinMatch', msgId: rejoinMsgId, matchId, playerId });
        await rejoinPromise;

        // Submit the action
        const actionMsgId = randomUUID();
        const resolvedAction = {
          ...action,
          timestamp: action.timestamp ?? new Date().toISOString(),
        };

        const actionPromise = waitForMessages(ws, (msgs) => {
          const hasAck = msgs.some((m) => m.type === 'ack' && m.ackedMsgId === actionMsgId);
          const hasState = hasType(msgs, 'gameState');
          const hasError = hasType(msgs, 'actionError') || hasType(msgs, 'matchError');
          return (hasAck && hasState) || hasError;
        });

        sendJson(ws, { type: 'action', msgId: actionMsgId, matchId, action: resolvedAction });

        const msgs = await actionPromise;
        ws.close();

        const actionError = findByType(msgs, 'actionError') ?? findByType(msgs, 'matchError');
        if (actionError) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: actionError.error, code: actionError.code }, null, 2),
              },
            ],
            isError: true,
          };
        }

        const stateMsg = findByType(msgs, 'gameState');
        const state = (stateMsg?.result as Record<string, unknown>)?.postState ?? stateMsg?.result;
        const gameOver = (state as Record<string, unknown> | undefined)?.phase === 'gameOver';

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ matchId, gameOver, state }, null, 2),
            },
          ],
        };
      } catch (err) {
        ws.terminate();
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );
}
