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
        DATABASE_URL: process.env.DATABASE_URL!,
      },
    });
  } else {
    return new SSEClientTransport(new URL(MCP_URL));
  }
}

interface McpToolResponse {
  content: Array<{ type: string; text: string }>;
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

  const user = JSON.parse(regResult.content[0]?.text ?? '{}');
  console.log(`✅ Registered: ${user.gamertag} (ID: ${user.id})`);
  return user;
}

interface MatchContext {
  matchId: string;
  playerId: string;
  token: string;
  playerIndex: number;
}

async function playMatch(client: Client, ctx: MatchContext, initialState: any) {
  let currentState = initialState;
  let gameOver = false;
  let turns = 0;

  console.log(`🎮 Playing Match: ${ctx.matchId} (Index: ${ctx.playerIndex})`);

  while (!gameOver && turns < 200) {
    if (currentState.activePlayerIndex !== ctx.playerIndex) {
      console.log(`⏳ Waiting for opponent move...`);
      await new Promise((r) => setTimeout(r, 2000));

      const stateResult = (await client.callTool({
        name: 'match_join',
        arguments: { matchId: ctx.matchId, token: ctx.token },
      })) as unknown as McpToolResponse;

      if (!stateResult.isError) {
        const update = JSON.parse(stateResult.content[0]?.text ?? '{}');
        currentState = update.state;
        if (currentState.phase === 'gameOver') gameOver = true;
      }
      continue;
    }

    const recResult = (await client.callTool({
      name: 'engine_bot_recommend',
      arguments: { state: currentState, playerIndex: ctx.playerIndex, tier: 'champion' },
    })) as unknown as McpToolResponse;

    const recommendation = JSON.parse(recResult.content[0]?.text ?? '{}');
    const action = recommendation.recommendedAction;
    if (!action) break;

    const submitResult = (await client.callTool({
      name: 'action_submit',
      arguments: {
        matchId: ctx.matchId,
        playerId: ctx.playerId,
        action,
        token: ctx.token,
        serverUrl: GAME_SERVER_URL,
      },
    })) as unknown as McpToolResponse;

    if (submitResult.isError) {
      console.error('❌ Action failed:', submitResult);
      break;
    }

    const update = JSON.parse(submitResult.content[0]?.text ?? '{}');
    currentState = update.state;
    gameOver = update.gameOver;
    turns++;
  }

  return { state: currentState, turns };
}

async function orchestrateSession(client: Client, user: BotUser) {
  console.log(`🏠 Looking for match (Cohort: ${COHORT_MODE})...`);

  if (COHORT_MODE) {
    const lobbyResult = (await client.callTool({
      name: 'match_lobby',
      arguments: { serverUrl: GAME_SERVER_URL },
    })) as unknown as McpToolResponse;

    const lobby = JSON.parse(lobbyResult.content[0]?.text ?? '[]');
    const joinable = lobby.find(
      (m: any) => m.joinable && m.creatorName.startsWith('Bot_') && m.creatorUserId !== user.id,
    );

    if (joinable) {
      console.log(`🤝 Joining Bot Match: ${joinable.matchId} (Creator: ${joinable.creatorName})`);
      const joinResult = (await client.callTool({
        name: 'match_join',
        arguments: { matchId: joinable.matchId, token: user.token },
      })) as unknown as McpToolResponse;

      if (joinResult.isError) return null;
      const match = JSON.parse(joinResult.content[0]?.text ?? '{}');
      return { ctx: { ...match, token: user.token }, state: match.state };
    }
  }

  // Fallback or Host Mode
  console.log(`🏠 Creating Match (Opponent: ${COHORT_MODE ? 'human' : BOT_TIER})...`);
  const createResult = (await client.callTool({
    name: 'match_create',
    arguments: {
      opponent: COHORT_MODE ? 'human' : BOT_TIER,
      visibility: COHORT_MODE ? 'public_open' : 'private',
      token: user.token,
      serverUrl: GAME_SERVER_URL,
    },
  })) as unknown as McpToolResponse;

  if (createResult.isError) return null;
  const match = JSON.parse(createResult.content[0]?.text ?? '{}');
  let state = match.state;

  if (COHORT_MODE) {
    console.log(`⌛ Waiting for opponent to join match: ${match.matchId}`);
    let waitTurns = 0;
    while ((!state || state.phase === 'pending' || state.phase === 'waiting') && waitTurns < 30) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollResult = (await client.callTool({
        name: 'match_join',
        arguments: { matchId: match.matchId, token: user.token },
      })) as unknown as McpToolResponse;
      if (!pollResult.isError) {
        const update = JSON.parse(pollResult.content[0]?.text ?? '{}');
        state = update.state;
        if (state && state.phase !== 'pending' && state.phase !== 'waiting') break;
      }
      waitTurns++;
    }
    if (waitTurns >= 30) return null;
  }

  return { ctx: { ...match, token: user.token }, state };
}

async function runBot() {
  console.log(`🚀 Starting Autonomous Bot (Tier: ${BOT_TIER})`);
  const transport = await createTransport();
  const client = new Client({ name: 'autonomous-bot', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const user = await registerBot(client);
  const stats = { totalMatches: 0, totalTurns: 0 };

  for (let i = 0; i < MATCH_COUNT; i++) {
    console.log(`\n--- Session ${i + 1} / ${MATCH_COUNT} ---`);
    const session = await orchestrateSession(client, user);

    if (session) {
      const result = await playMatch(client, session.ctx, session.state);
      if (result) {
        stats.totalMatches++;
        stats.totalTurns += result.turns;
        if (result.state.phase === 'gameOver') {
          console.log(
            `🏁 Match Over. Winner: ${result.state.players[result.state.winnerIndex].name}`,
          );
        }
      }
    }
  }

  console.log(
    `\n--- FINAL STATS ---\nMatches: ${stats.totalMatches}\nAvg Turns: ${(stats.totalTurns / stats.totalMatches || 0).toFixed(1)}`,
  );
  await client.close();
}

runBot().catch(console.error);
