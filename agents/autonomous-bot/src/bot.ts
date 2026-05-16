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

async function registerBot(client: Client) {
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

async function playMatch(client: Client, botTier: string) {
  const createResult = (await client.callTool({
    name: 'match_create',
    arguments: { opponent: botTier, serverUrl: GAME_SERVER_URL },
  })) as unknown as McpToolResponse;

  if (createResult.isError) {
    console.error('❌ Match creation failed:', createResult);
    return null;
  }

  const match = JSON.parse(createResult.content[0]?.text ?? '{}');
  console.log(`🎮 Match Created: ${match.matchId}`);

  let currentState = match.state;
  let gameOver = false;
  let turns = 0;

  while (!gameOver && turns < 200) {
    const recResult = (await client.callTool({
      name: 'engine_bot_recommend',
      arguments: {
        state: currentState,
        playerIndex: match.playerIndex,
        tier: 'champion',
      },
    })) as unknown as McpToolResponse;

    const recommendation = JSON.parse(recResult.content[0]?.text ?? '{}');
    const action = recommendation.recommendedAction;

    if (!action) break;

    const submitResult = (await client.callTool({
      name: 'action_submit',
      arguments: {
        matchId: match.matchId,
        playerId: match.playerId,
        action,
        serverUrl: GAME_SERVER_URL,
      },
    })) as unknown as McpToolResponse;

    if (submitResult.isError) break;

    const update = JSON.parse(submitResult.content[0]?.text ?? '{}');
    currentState = update.state;
    gameOver = update.gameOver;
    turns++;
  }

  return { state: currentState, turns };
}

async function runBot() {
  console.log(`🚀 Starting Autonomous Bot (Tier: ${BOT_TIER})`);
  const transport = await createTransport();
  const client = new Client({ name: 'autonomous-bot', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  console.log('✅ Connected to MCP Server');

  await registerBot(client);

  const stats = { wins: 0, losses: 0, totalTurns: 0, totalMatches: 0 };

  for (let i = 0; i < MATCH_COUNT; i++) {
    console.log(`\n--- Match ${i + 1} / ${MATCH_COUNT} ---`);
    const result = await playMatch(client, BOT_TIER);

    if (result) {
      stats.totalMatches++;
      stats.totalTurns += result.turns;
      const { state, turns } = result;

      if (state.phase === 'gameOver') {
        const winner = state.players[state.winnerIndex].name;
        console.log(`🏁 Match Over in ${turns} turns. Winner: ${winner}`);
      }
    }
  }

  console.log('\n--- FINAL STATS ---');
  console.log(`Total Matches: ${stats.totalMatches}`);
  console.log(`Avg Turns: ${(stats.totalTurns / stats.totalMatches).toFixed(1)}`);

  await client.close();
  console.log('\n👋 Bot finished.');
}

runBot().catch(console.error);
