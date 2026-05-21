import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import 'dotenv/config';
import { randomBytes } from 'node:crypto';

const MCP_TRANSPORT = process.env.MCP_TRANSPORT ?? 'stdio';
const MCP_URL = process.env.MCP_URL ?? 'http://127.0.0.1:3000/sse';
const GAME_SERVER_URL = process.env.GAME_SERVER_URL ?? 'http://127.0.0.1:3001';
const BOT_TIER = process.env.BOT_TIER ?? 'soldier';
const MATCH_COUNT = parseInt(process.env.MATCH_COUNT ?? '5', 10);
const COHORT_MODE = process.env.COHORT_MODE === 'true';

async function createTransport() {
  if (MCP_TRANSPORT === 'stdio') {
    return new StdioClientTransport({
      command: 'node',
      args: ['--import', 'tsx/esm', '../../mcp/src/server.ts'],
      env: {
        ...process.env,
        TOOL_PROFILE: 'admin',
        DATABASE_URL: process.env.DATABASE_URL ?? '',
      },
    });
  } else {
    return new SSEClientTransport(new URL(MCP_URL));
  }
}

interface McpToolResponse {
  content: { type: string; text: string }[];
  isError?: boolean;
}

interface BotUser {
  id: string;
  gamertag: string;
  token: string;
}

async function registerBot(client: Client): Promise<BotUser> {
  const botId = randomBytes(4).toString('hex');
  const gamertag = `Bot_${botId}`;
  const email = `bot_${botId}@phalanxduel.local`;
  const password = 'botpassword123';

  console.log(`📝 Registering user: ${gamertag} (${email})...`);
  const regResult = (await client.callTool({
    name: 'user_register',
    arguments: { gamertag, email, password },
  })) as unknown as McpToolResponse;

  if (regResult.isError) {
    throw new Error(`Registration failed: ${JSON.stringify(regResult)}`);
  }

  const user = parseToolJson<BotUser>(regResult, { id: '', gamertag, token: '' });
  console.log(`✅ Registered: ${user.gamertag} (ID: ${user.id})`);
  return user;
}

interface MatchContext {
  matchId: string;
  playerId: string;
  token: string;
  playerIndex: number;
}

interface GameState {
  activePlayerIndex?: number;
  phase?: string;
  winnerIndex?: number;
  players?: { name?: string }[];
}

interface MatchSession {
  ctx: MatchContext;
  state: GameState;
}

interface LobbyMatch {
  matchId: string;
  creatorName: string;
  creatorUserId: string;
  joinable: boolean;
}

interface BotRecommendation {
  recommendedAction?: Record<string, unknown>;
}

interface StateToolResult {
  state?: GameState;
  gameOver?: boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseToolJson<T>(result: McpToolResponse, fallback: T): T {
  return JSON.parse(result.content[0]?.text ?? JSON.stringify(fallback)) as T;
}

function getWinnerName(state: GameState): string {
  const winnerIndex = state.winnerIndex;
  if (winnerIndex === undefined) return 'unknown';
  return state.players?.[winnerIndex]?.name ?? 'unknown';
}

async function getMatchState(client: Client, ctx: MatchContext): Promise<GameState | undefined> {
  const stateResult = (await client.callTool({
    name: 'match_get_state',
    arguments: { matchId: ctx.matchId, playerId: ctx.playerId, token: ctx.token },
  })) as unknown as McpToolResponse;

  if (stateResult.isError) return undefined;
  return parseToolJson<StateToolResult>(stateResult, {}).state;
}

async function waitForOpponentMove(
  client: Client,
  ctx: MatchContext,
): Promise<GameState | undefined> {
  console.log(`⏳ Waiting for opponent move...`);
  await delay(2000);
  return getMatchState(client, ctx);
}

async function recommendAction(
  client: Client,
  currentState: GameState,
  playerIndex: number,
): Promise<Record<string, unknown> | undefined> {
  const recResult = (await client.callTool({
    name: 'engine_bot_recommend',
    arguments: { state: currentState, playerIndex, tier: 'champion' },
  })) as unknown as McpToolResponse;

  return parseToolJson<BotRecommendation>(recResult, {}).recommendedAction;
}

async function submitRecommendedAction(
  client: Client,
  ctx: MatchContext,
  action: Record<string, unknown>,
): Promise<McpToolResponse> {
  return (await client.callTool({
    name: 'action_submit',
    arguments: {
      matchId: ctx.matchId,
      playerId: ctx.playerId,
      action,
      token: ctx.token,
      serverUrl: GAME_SERVER_URL,
    },
  })) as unknown as McpToolResponse;
}

async function recoverAfterActionFailure(
  client: Client,
  ctx: MatchContext,
  submitResult: McpToolResponse,
): Promise<GameState | undefined> {
  console.error('❌ Action failed:', submitResult.content[0]?.text);
  return getMatchState(client, ctx);
}

async function playMatch(client: Client, ctx: MatchContext, initialState: GameState) {
  let currentState = initialState;
  let gameOver = false;
  let turns = 0;

  console.log(`🎮 Playing Match: ${ctx.matchId} (Index: ${ctx.playerIndex})`);

  while (!gameOver && turns < 200) {
    if (currentState.activePlayerIndex !== ctx.playerIndex) {
      currentState = (await waitForOpponentMove(client, ctx)) ?? currentState;
      if (currentState.phase === 'gameOver') gameOver = true;
      continue;
    }

    const action = await recommendAction(client, currentState, ctx.playerIndex);
    if (!action) {
      console.warn('⚠️ No action recommended. Passing.');
      await delay(1000);
      continue;
    }

    const submitResult = await submitRecommendedAction(client, ctx, action);
    if (submitResult.isError) {
      currentState = (await recoverAfterActionFailure(client, ctx, submitResult)) ?? currentState;
      continue;
    }

    const update = parseToolJson<StateToolResult>(submitResult, {});
    currentState = update.state ?? currentState;
    gameOver = update.gameOver ?? false;
    turns++;
  }

  return { state: currentState, turns };
}

function findJoinableBotMatch(lobby: LobbyMatch[], user: BotUser): LobbyMatch | undefined {
  return lobby.find(
    (match) =>
      match.joinable && match.creatorName.startsWith('Bot_') && match.creatorUserId !== user.id,
  );
}

async function joinExistingBotMatch(
  client: Client,
  user: BotUser,
): Promise<MatchSession | undefined> {
  const lobbyResult = (await client.callTool({
    name: 'match_lobby',
    arguments: { serverUrl: GAME_SERVER_URL },
  })) as unknown as McpToolResponse;

  const joinable = findJoinableBotMatch(parseToolJson<LobbyMatch[]>(lobbyResult, []), user);
  if (!joinable) return undefined;

  console.log(`🤝 Joining Bot Match: ${joinable.matchId} (Creator: ${joinable.creatorName})`);
  const joinResult = (await client.callTool({
    name: 'match_join',
    arguments: { matchId: joinable.matchId, token: user.token },
  })) as unknown as McpToolResponse;

  if (joinResult.isError) {
    console.error(`❌ Failed to join match ${joinable.matchId}:`, joinResult.content[0]?.text);
    return undefined;
  }

  const match = parseToolJson<MatchSession['ctx'] & { state: GameState }>(joinResult, {
    matchId: '',
    playerId: '',
    playerIndex: 0,
    token: user.token,
    state: {},
  });
  return { ctx: { ...match, token: user.token }, state: match.state };
}

async function createSessionMatch(
  client: Client,
  user: BotUser,
): Promise<(MatchContext & { state?: GameState }) | undefined> {
  const createResult = (await client.callTool({
    name: 'match_create',
    arguments: {
      opponent: COHORT_MODE ? 'human' : BOT_TIER,
      visibility: COHORT_MODE ? 'public_open' : 'private',
      token: user.token,
      serverUrl: GAME_SERVER_URL,
    },
  })) as unknown as McpToolResponse;

  if (createResult.isError) {
    console.error(`❌ Failed to create match:`, createResult.content[0]?.text);
    return undefined;
  }

  return parseToolJson<MatchContext & { state?: GameState }>(createResult, {
    matchId: '',
    playerId: '',
    playerIndex: 0,
    token: user.token,
  });
}

function isGameReady(state: GameState | undefined): boolean {
  return Boolean(state && state.phase !== 'pending' && state.phase !== 'waiting');
}

async function waitForCohortOpponent(
  client: Client,
  match: MatchContext & { state?: GameState },
  user: BotUser,
): Promise<GameState | undefined> {
  console.log(`⌛ Waiting for opponent to join match: ${match.matchId}`);
  let state = match.state;

  for (let waitTurns = 0; waitTurns < 30; waitTurns++) {
    if (isGameReady(state)) return state;
    await delay(5000);
    state =
      (await getMatchState(client, {
        ...match,
        token: user.token,
        playerIndex: match.playerIndex,
      })) ?? state;
  }

  return undefined;
}

async function orchestrateSession(client: Client, user: BotUser): Promise<MatchSession | null> {
  console.log(`🏠 Looking for match (Cohort: ${COHORT_MODE})...`);

  if (COHORT_MODE) {
    const joined = await joinExistingBotMatch(client, user);
    if (joined) return joined;
  }

  // Fallback or Host Mode
  console.log(`🏠 Creating Match (Opponent: ${COHORT_MODE ? 'human' : BOT_TIER})...`);
  const match = await createSessionMatch(client, user);
  if (!match) return null;

  const state = COHORT_MODE ? await waitForCohortOpponent(client, match, user) : match.state;
  if (!state) return null;

  return { ctx: { ...match, token: user.token }, state };
}

async function runBot() {
  console.log(`🚀 Starting Autonomous Bot (Tier: ${BOT_TIER})`);

  // Startup jitter to break synchronization
  await delay(Math.random() * 10000);

  const transport = await createTransport();
  const client = new Client({ name: 'autonomous-bot', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  console.log('✅ Connected to MCP Server');

  const user = await registerBot(client);
  const stats = { totalMatches: 0, totalTurns: 0 };

  for (let i = 0; i < MATCH_COUNT; i++) {
    console.log(`\n--- Session ${i + 1} / ${MATCH_COUNT} ---`);

    // Session jitter
    await delay(Math.random() * 5000);

    const session = await orchestrateSession(client, user);

    if (session) {
      const result = await playMatch(client, session.ctx, session.state);
      stats.totalMatches++;
      stats.totalTurns += result.turns;
      if (result.state.phase === 'gameOver') {
        console.log(`🏁 Match Over. Winner: ${getWinnerName(result.state)}`);
      }
    }
  }

  console.log(
    `\n--- FINAL STATS ---\nMatches: ${stats.totalMatches}\nAvg Turns: ${(stats.totalTurns / stats.totalMatches || 0).toFixed(1)}`,
  );
  await client.close();
}

runBot().catch(console.error);
