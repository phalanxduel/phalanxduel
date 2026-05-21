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
interface ToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}
interface MatchCreateArgs {
  opponent: string;
  visibility: 'private' | 'public_open';
  seed?: number;
  serverUrl?: string;
  token?: string;
}
type WsOpponent = {
  opponent: 'bot-random' | 'bot-heuristic' | 'bot-mcts';
  botDifficulty?: 'easy' | 'medium' | 'hard';
} | null;

function textResult(text: string, isError?: true): ToolResult {
  return {
    content: [{ type: 'text', text }],
    ...(isError ? { isError } : {}),
  };
}

function messageError(msg: ServerMsg): string {
  return typeof msg.error === 'string' ? msg.error : 'Unknown error';
}

function connectWs(serverUrl: string): WebSocket {
  const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws';
  // Note: headers like Authorization are not consistently supported in all WS clients/proxy environments
  // so we prefer the explicit 'authenticate' message.
  // We provide an Origin header to satisfy the server's security policy when running in production mode.
  return new WebSocket(wsUrl, {
    headers: {
      Origin: 'http://localhost:3001',
    },
  });
}

async function authenticateWs(ws: WebSocket, token: string | undefined): Promise<void> {
  if (!token) return;
  const msgId = randomUUID();
  const promise = waitForMessages(ws, (msgs) => {
    const hasAck = msgs.some((m) => m.type === 'ack' && m.ackedMsgId === msgId);
    const hasAuth = hasType(msgs, 'authenticated');
    const hasError = hasType(msgs, 'auth_error');
    return (hasAck && hasAuth) || hasError;
  });
  sendJson(ws, { type: 'authenticate', msgId, token });
  const msgs = await promise;
  const error = findByType(msgs, 'auth_error');
  if (error) throw new Error(`WS Auth Failed: ${messageError(error)}`);
}

async function prepareWs(url: string, token: string | undefined): Promise<WebSocket> {
  const ws = connectWs(url);
  await new Promise<void>((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  if (token) {
    await authenticateWs(ws, token);
  }
  return ws;
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

function resolveWsOpponent(opponent: string): WsOpponent {
  if (opponent === 'human') return null;
  return TIER_TO_WS[opponent] ?? { opponent: 'bot-heuristic' as const };
}

function hasMatchCreateResponse(msgs: ServerMsg[], msgId: string, wsOpponent: WsOpponent): boolean {
  const hasCreated = hasType(msgs, 'matchCreated');
  const hasAck = msgs.some((m) => m.type === 'ack' && m.ackedMsgId === msgId);
  // For human matches, we don't get gameState immediately.
  const hasState = wsOpponent ? hasType(msgs, 'gameState') : true;
  const hasError = hasType(msgs, 'matchError');
  return (hasCreated && hasAck && hasState) || hasError;
}

function sendCreateMatch(
  ws: WebSocket,
  msgId: string,
  args: MatchCreateArgs,
  wsOpponent: WsOpponent,
): void {
  sendJson(ws, {
    type: 'createMatch',
    msgId,
    playerName: 'agent',
    opponent: wsOpponent?.opponent ?? undefined,
    ...(wsOpponent?.botDifficulty ? { botDifficulty: wsOpponent.botDifficulty } : {}),
    visibility: args.visibility,
    isAgent: true,
    ...(args.seed !== undefined ? { rngSeed: args.seed } : {}),
  });
}

function matchCreateSuccess(matchId: string, msgs: ServerMsg[]): ToolResult {
  const created = findByType(msgs, 'matchCreated');
  const stateMsg = findByType(msgs, 'gameState');
  const playerId = created?.playerId as string;
  const playerIndex = created?.playerIndex as number;
  const state = (stateMsg?.result as Record<string, unknown>)?.postState ?? stateMsg?.result;

  return textResult(JSON.stringify({ matchId, playerId, playerIndex, state }, null, 2));
}

async function createMatch(args: MatchCreateArgs): Promise<ToolResult> {
  const url = args.serverUrl ?? GAME_SERVER_URL;
  if (!url) return textResult('GAME_SERVER_URL is not set', true);

  const wsOpponent = resolveWsOpponent(args.opponent);
  let ws: WebSocket | undefined;

  try {
    ws = await prepareWs(url, args.token ?? AGENT_TOKEN);

    const msgId = randomUUID();
    const waitPromise = waitForMessages(ws, (msgs) =>
      hasMatchCreateResponse(msgs, msgId, wsOpponent),
    );

    sendCreateMatch(ws, msgId, args, wsOpponent);

    const msgs = await waitPromise;
    ws.close();

    const matchError = findByType(msgs, 'matchError');
    if (matchError) return textResult(`Match creation failed: ${messageError(matchError)}`, true);

    const created = findByType(msgs, 'matchCreated');
    return matchCreateSuccess(created?.matchId as string, msgs);
  } catch (err) {
    ws?.terminate();
    return textResult(`Error: ${String(err)}`, true);
  }
}

export function registerGameplayTools(server: McpServer): void {
  server.registerTool(
    'match_create',
    {
      description:
        'Create a new match on the game server as the agent user. Returns matchId, playerId, and initial game state. Use playerId in subsequent action_submit calls. Accepts all 8 bot difficulty tiers (scout, grunt, soldier, veteran, destroyer, sentinel, blitz, champion) and legacy aliases (bot-random, bot-heuristic, bot-mcts). Alternatively, set visibility to public_open and opponent to human to create a match for another agent to join. Requires GAME_SERVER_URL and AGENT_TOKEN env vars.',
      inputSchema: {
        opponent: z
          .enum([
            'human',
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
          .describe('Bot difficulty tier or legacy strategy alias for player 2, or "human"'),
        visibility: z
          .enum(['private', 'public_open'])
          .default('private')
          .describe('Visibility of the match in the lobby'),
        seed: z
          .number()
          .int()
          .optional()
          .describe(
            'RNG seed for reproducible matches (local/staging only — blocked in production)',
          ),
        serverUrl: z.string().url().optional().describe('Override GAME_SERVER_URL for this call'),
        token: z.string().optional().describe('Override AGENT_TOKEN for this call'),
      },
    },
    createMatch,
  );

  server.registerTool(
    'match_join',
    {
      description:
        'Join an existing match by ID. Returns matchId, playerId, and current game state. Requires GAME_SERVER_URL and AGENT_TOKEN env vars.',
      inputSchema: {
        matchId: z.uuid().describe('ID of the match to join'),
        serverUrl: z.string().url().optional().describe('Override GAME_SERVER_URL for this call'),
        token: z.string().optional().describe('Override AGENT_TOKEN for this call'),
      },
    },
    async ({ matchId, serverUrl, token }) => {
      const url = serverUrl ?? GAME_SERVER_URL;
      if (!url) {
        return {
          content: [{ type: 'text', text: 'GAME_SERVER_URL is not set' }],
          isError: true,
        };
      }

      let ws: WebSocket | undefined;
      try {
        ws = await prepareWs(url, token ?? AGENT_TOKEN);

        const msgId = randomUUID();
        const waitPromise = waitForMessages(ws, (msgs) => {
          const hasJoined = hasType(msgs, 'matchJoined');
          const hasAck = msgs.some((m) => m.type === 'ack' && m.ackedMsgId === msgId);
          const hasState = hasType(msgs, 'gameState');
          const hasError = hasType(msgs, 'matchError');
          return (hasJoined && hasAck && hasState) || hasError;
        });

        sendJson(ws, {
          type: 'joinMatch',
          msgId,
          matchId,
          playerName: 'agent',
        });

        const msgs = await waitPromise;
        ws.close();

        const matchError = findByType(msgs, 'matchError');
        if (matchError) {
          return {
            content: [{ type: 'text', text: `Match joining failed: ${messageError(matchError)}` }],
            isError: true,
          };
        }

        const joined = findByType(msgs, 'matchJoined');
        const stateMsg = findByType(msgs, 'gameState');
        const playerId = joined?.playerId as string;
        const playerIndex = joined?.playerIndex as number;
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
        ws?.terminate();
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );

  server.registerTool(
    'match_get_state',
    {
      description:
        'Get the latest state of a match. Uses rejoinMatch to connect without occupying a new seat. Requires GAME_SERVER_URL and AGENT_TOKEN env vars.',
      inputSchema: {
        matchId: z.uuid().describe('Match ID'),
        playerId: z.string().describe('Player ID (provided during match_create or match_join)'),
        serverUrl: z.string().url().optional().describe('Override GAME_SERVER_URL for this call'),
        token: z.string().optional().describe('Override AGENT_TOKEN for this call'),
      },
    },
    async ({ matchId, playerId, serverUrl, token }) => {
      const url = serverUrl ?? GAME_SERVER_URL;
      if (!url) {
        return {
          content: [{ type: 'text', text: 'GAME_SERVER_URL is not set' }],
          isError: true,
        };
      }

      let ws: WebSocket | undefined;
      try {
        ws = await prepareWs(url, token ?? AGENT_TOKEN);

        const msgId = randomUUID();
        const waitPromise = waitForMessages(ws, (msgs) => {
          const hasJoined = hasType(msgs, 'matchJoined');
          const hasAck = msgs.some((m) => m.type === 'ack' && m.ackedMsgId === msgId);
          const hasState = hasType(msgs, 'gameState');
          const hasError = hasType(msgs, 'matchError');
          return (hasJoined && hasAck && hasState) || hasError;
        });

        sendJson(ws, {
          type: 'rejoinMatch',
          msgId,
          matchId,
          playerId,
        });

        const msgs = await waitPromise;
        ws.close();

        const matchError = findByType(msgs, 'matchError');
        if (matchError) {
          return {
            content: [{ type: 'text', text: `Failed to get state: ${messageError(matchError)}` }],
            isError: true,
          };
        }

        const stateMsg = findByType(msgs, 'gameState');
        const state = (stateMsg?.result as Record<string, unknown>)?.postState ?? stateMsg?.result;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ matchId, state }, null, 2),
            },
          ],
        };
      } catch (err) {
        ws?.terminate();
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
        token: z.string().optional().describe('Override AGENT_TOKEN for this call'),
      },
    },
    async ({ matchId, playerId, action, serverUrl, token }) => {
      const url = serverUrl ?? GAME_SERVER_URL;
      if (!url) {
        return {
          content: [{ type: 'text', text: 'GAME_SERVER_URL is not set' }],
          isError: true,
        };
      }

      let ws: WebSocket | undefined;
      try {
        ws = await prepareWs(url, token ?? AGENT_TOKEN);

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
        ws?.terminate();
        return { content: [{ type: 'text', text: `Error: ${String(err)}` }], isError: true };
      }
    },
  );
}
